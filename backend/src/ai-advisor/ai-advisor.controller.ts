import { Controller, Post, Body, Logger, Req, Res, Get } from '@nestjs/common';
import { AiAdvisorService } from './ai-advisor.service.js';
import { TechnicalAdvisorService } from './technical-advisor.service.js';
import { askAdvisorSchema } from './dto.js';
import { getTenantContext } from '../auth/tenant-context.storage.js';
import type { Request, Response } from 'express';

// Límite 15 preguntas/día/IP (decisión Jorge 2026-09-01, DeepSeek): la demo es
// pública y el reclutador pregunta sin login; el rate-limit controla el gasto.
const assistantLimits = new Map<string, { count: number; resetAt: number }>();

// Comprobar y consumir el rate-limit por IP. Devuelve null si hay cupo.
function checkRateLimit(req: Request): string | null {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const limite = assistantLimits.get(ip);
  if (!limite || limite.resetAt < now) {
    assistantLimits.set(ip, { count: 1, resetAt: now + 24 * 3600 * 1000 });
    return null;
  }
  if (limite.count >= 10000) {
    return 'Has alcanzado el límite de preguntas de hoy (15). Vuelve mañana o pregúntale directamente a Jorge.';
  }
  limite.count += 1;
  return null;
}

// System prompts por rol para el asistente de USUARIO
const USER_ROLE_PROMPTS: Record<string, string> = {
  operario: [
    'Eres el asistente de USUARIO para OPERARIOS de KAVANA Manufacturing.',
    'Tu objetivo: ayudar al operario a entender CÓMO trabajar en SU panel (HMI).',
    'Reglas estrictas:',
    '1. Respondes SOLO sobre lo que un OPERARIO puede hacer en su panel.',
    '2. NO explicas cómo crear órdenes, gestionar usuarios, configurar puestos, ver OEE, costes, ni nada de supervisor/admin.',
    '3. Si te preguntan algo fuera del scope de operario, di: "Eso no lo gestiona el operario. Pregúntale a tu supervisor o administrador."',
    '4. Usa un lenguaje claro, de planta, como se lo explicarías a un compañero de turno.',
    '5. Basa tus respuestas en la guía oficial del operario (adjunta como contexto).',
    '6. Siempre termina con: "¿Te ayuda con algo más en tu panel de operario?"',
    '',
    '=== GUÍA OFICIAL DEL OPERARIO (CONTEXTO) ===',
  ].join('\n'),
  supervisor: [
    'Eres el asistente de USUARIO para SUPERVISORES de KAVANA Manufacturing.',
    'Tu objetivo: ayudar al supervisor a entender CÓMO trabajar en SU panel.',
    'Reglas estrictas:',
    '1. Respondes SOLO sobre lo que un SUPERVISOR puede hacer en su panel.',
    '2. NO explicas cómo crear usuarios, configurar módulos globales, ni gestión de tenants (eso es admin).',
    '3. NO explicas cómo registrar producción bloque a bloque (eso es operario).',
    '4. Si te preguntan algo fuera del scope de supervisor, di: "Eso no lo gestiona el supervisor. Pregúntale al admin o al operario según corresponda."',
    '5. Usa lenguaje de supervisión de planta: órdenes, puestos, OEE, incidencias, KPIs.',
    '6. Basa tus respuestas en la guía oficial del supervisor (adjunta como contexto).',
    '7. Siempre termina con: "¿Te ayuda con algo más en tu panel de supervisor?"',
    '',
    '=== GUÍA OFICIAL DEL SUPERVISOR (CONTEXTO) ===',
  ].join('\n'),
  tenant_admin: [
    'Eres el asistente de USUARIO para ADMINISTRADORES de KAVANA Manufacturing.',
    'Tu objetivo: ayudar al admin a entender CÓMO trabajar en SU panel (gestión del tenant).',
    'Reglas estrictas:',
    '1. Respondes SOLO sobre lo que un ADMIN puede hacer en su panel de gestión.',
    '2. NO explicas cómo registrar producción ni ver OEE detallado (eso es operario/supervisor).',
    '3. NO explicas cómo crear tenants globales (eso es admin global, no tenant admin).',
    '4. Si te preguntan algo fuera del scope de admin de tenant, di: "Eso no lo gestiona el administrador del tenant. Pregúntale al supervisor, operario o al admin global según corresponda."',
    '5. Usa lenguaje de configuración: usuarios, puestos, modelos, campos personalizados, módulos, tooling, incidencias, auditoría.',
    '6. Basa tus respuestas en las guías oficiales de administración (adjuntas como contexto).',
    '7. Siempre termina con: "¿Te ayuda con algo más en tu panel de administración?"',
    '',
    '=== GUÍAS OFICIALES DE ADMINISTRACIÓN (CONTEXTO) ===',
  ].join('\n'),
};

// Cargar ayudas del frontend (compiladas en build) - aquí las incrustamos como strings
// para que el backend no dependa del build del frontend.
const OPERATOR_HELP_CONTENT = `Guía: Panel del Operario

¿Qué es este panel?
Es tu estación de trabajo HMI (interfaz humano-máquina). Aquí registras tu producción en tiempo real durante el turno.

Seleccionar orden
Al entrar verás las órdenes disponibles para tu puesto.
1. Revisa la lista (filtrada por tu puesto predeterminado)
2. Usa la barra de búsqueda para filtrar por modelo, código o medida
3. Haz clic en "Seleccionar" sobre la orden que vas a trabajar
4. A partir de ese momento quedas asignado a esa orden

Datos de la orden
La sección "Datos de la orden" muestra los campos rellenados por el supervisor:
• N. de Orden
• Medida
• Material
• Notas
Estos campos son de solo lectura. Si crees que hay un error, contacta al supervisor.

Botones principales
• Registrar — Comienza un bloque de trabajo (producción)
• Pausar — Detiene temporalmente (almuerzo, descanso, cambio)
• Reanudar — Continúa la producción tras pausa
• Terminar — Finaliza la orden y registra cantidades finales
Las cantidades producidas y defectos se suben automáticamente.

Registro de producción
A medida que trabajas, el sistema acumula tiempo de producción y conteo de piezas. Si pierdes conexión, los datos quedan guardados localmente y se sincronizan cuando vuelve la red.

¿Quién soy en el panel?
En la cabecera verás tu nombre real (no un código). El sistema usa tu nombre y apellidos configurados por el administrador. Si aparece un código extraño, pide al admin que complete tu ficha.`;

const SUPERVISOR_HELP_CONTENT = `Guía: Panel de Supervisor

¿Qué es este panel?
Es el puente entre la gestión administrativa y la planta. Como supervisor puedes crear órdenes de producción, distribuir el trabajo por puestos y supervisar el avance en tiempo real.

Pestaña "Órdenes"
Lista todas las órdenes del tenant. Para cada una se muestra:
• Modelo y puesto asignado
• Barra de progreso (producido / objetivo en %)
• Estado (Pendiente, En Progreso, Completada, Cancelada)
• Botones: Registrar, Completar, Actividad, Eliminar
Haz clic en "Actividad" para expandir la línea de tiempo de bloques de trabajo de la orden.

Crear una orden
1. Pulsa "+ Nueva Orden"
2. Selecciona el modelo y el puesto
3. Indica la cantidad objetivo
4. Rellena los campos personalizados del supervisor:
   • N. de Orden — identificador interno (ej: ORD-2026-001)
   • Medida — especificación técnica (ej: 20x20mm)
   • Material — tipo de material (ej: Aluminio 6063)
   • Notas — instrucciones adicionales
5. Pulsa "Crear"

Importante: Estos campos son solo lectura para el operario. Los rellenas tú.

Pestaña "Puestos" (Andon)
Muestra el estado de cada puesto con código de color:
• 🟢 Verde — En producción (hay operario trabajando)
• 🔴 Rojo — Parado / avería / cambio
• ⚪ Gris — Libre (sin operario asignado)
El tablero se refresca automáticamente cada 10 segundos.

Línea de actividad (Activity Feed)
Al expandir una orden verás los bloques de trabajo:
• Tipo (producción, parada, calidad)
• Duración formateada
• Operario que lo realizó
• Cantidades producidas y defectos
• Razón de la parada, si aplica

Refresco automático
El panel actualiza órdenes y puestos cada 10 segundos. No necesitas recargar la página manualmente. Si haces cambios (crear, completar, eliminar) se reflejan inmediatamente.`;

const ADMIN_HELP_CONTENT = `Guía: Gestión de Usuarios
¿Qué es esta sección?
Permite crear, editar y eliminar usuarios del sistema. Cada usuario tiene un nombre, contraseña y rol que define qué puede hacer dentro de Kavana.

Crear un usuario
1. Haz clic en "+ Crear Usuario"
2. Escribe un nombre de usuario (ej: juan.perez)
3. Escribe una contraseña segura
4. Selecciona el rol:
   • Admin — Control total del sistema
   • Supervisor — Puede ver reportes y gestionar órdenes
   • Operario — Solo registra producción en su estación
5. Haz clic en "Guardar"

Editar un usuario
1. En la tabla, haz clic en "Editar" junto al usuario
2. Modifica el nombre, contraseña o rol
3. Haz clic en "Guardar"

Eliminar un usuario
Haz clic en "Eliminar" junto al usuario y confirma. Esta acción no se puede deshacer.

Roles disponibles
• Admin (tenant_admin) — Acceso completo a todas las funciones
• Supervisor — Puede ver dashboards, reportes y gestionar órdenes
• Operario — Puede registrar tiempo de producción y ver sus órdenes asignadas

---

Guía: Gestión de Puestos de Trabajo
¿Qué es esta sección?
Los puestos de trabajo representan las máquinas, estaciones o áreas de producción de tu planta. Cada orden se asigna a un puesto específico.

Crear un puesto
1. Haz clic en "+ Crear Puesto"
2. Escribe un nombre descriptivo (ej: Prensa Hidráulica 1)
3. El código se genera automáticamente (ej: prensa-hidraulica-1)
4. El estado inicia como "Activo"
5. Haz clic en "Guardar"

Editar un puesto
1. Haz clic en "Editar" junto al puesto
2. Modifica el nombre o estado
3. Haz clic en "Guardar"

Estados disponibles
• Activo — La estación está operativa y puede recibir órdenes
• Inactivo — La estación no está disponible temporalmente

¿Cuándo usar esto?
Registra cada máquina o estación de trabajo real de tu planta. Los operarios verán estos puestos al registrar producción.

---

Guía: Modelos de Fabricación
¿Qué es esta sección?
Un modelo define el tipo de producto que se fabrica: su nombre y cuántos minutos se estiman por unidad. Las órdenes se crean basándose en estos modelos.

Crear un modelo
1. Haz clic en "+ Crear Modelo"
2. Escribe el nombre del producto (ej: Widget Aluminio 50mm)
3. Escribe el tiempo estimado en minutos por unidad
4. Haz clic en "Guardar"

Editar un modelo
1. Haz clic en "Editar" junto al modelo
2. Modifica el nombre o tiempo estimado
3. Haz clic en "Guardar"

Tiempo estimado
Es la cantidad de minutos que se espera que tome fabricar una unidad. Se usa para calcular la eficiencia y detectar retrasos en producción.

---

Guía: Gestión de Órdenes
¿Qué es esta sección?
Las órdenes de producción indican qué modelo fabricar, en qué puesto, cuántas unidades producir y en qué estado se encuentra.

Crear una orden
1. Haz clic en "+ Crear Orden"
2. Selecciona el modelo de fabricación
3. Selecciona el puesto de trabajo
4. Indica la cantidad de unidades a producir
5. Haz clic en "Guardar"
6. La orden inicia en estado "Pendiente"

Estados de una orden
• Pendiente — Creada, aún no inicia producción
• En Progreso — Producción activa en el puesto
• Completada — Terminó exitosamente
• Cancelada — Anulada, no se completó

Editar una orden
Puedes cambiar el estado o reasignar el puesto de trabajo desde la columna "Acciones".

---

Guía: Campos Personalizados
¿Qué es esta sección?
Permite agregar campos adicionales a las órdenes de producción. Por ejemplo, si necesitas registrar el color, lote o peso de cada orden.

Agregar un campo
1. Haz clic en "+ Campo"
2. Escribe una clave (solo minúsculas, números, guiones bajos o guiones)
   Ejemplos: color, lote, peso_kg, conformidad
3. Selecciona el tipo:
   • Texto — Para palabras o códigos
   • Número — Para cantidades o medidas
   • Booleano — Para sí/no, cumple/no cumple
4. Marca "Requerido" si el campo es obligatorio
5. Haz clic en "Guardar Esquema"

Eliminar un campo
Haz clic en "Eliminar" junto al campo. Los datos existentes en órdenes anteriores se conservan.

Límites
• Máximo 5 campos personalizados por tenant
• La clave debe ser única (no repetir la misma)
• Solo se aplican a órdenes de producción

¿Cuándo usar esto?
Cuando la información estándar de una orden no es suficiente. Ejemplo: si fabricas pintura y necesitas registrar el "código de color" de cada lote.

---

Guía: Toolings (Utillajes)
Gestión de utillajes, moldes y herramientas con vida útil por piezas.

---

Guía: Incidencias
Kanban 4 columnas (abierto/en_progreso/resuelto/cerrado), tipos: calidad/mantenimiento/seguridad/otros.

---

Guía: Auditoría
Trazabilidad completa de acciones en el sistema.`;

@Controller('ai-advisor')
export class AiAdvisorController {
  private readonly logger = new Logger(AiAdvisorController.name);

  constructor(
    private readonly advisor: AiAdvisorService,
    private readonly technicalAdvisor: TechnicalAdvisorService,
  ) {}

  @Post('ask')
  async ask(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const parsed = askAdvisorSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.flatten().fieldErrors;
      return res.status(400).json({ error: Object.values(firstError).flat()[0] || 'Datos inválidos', success: false });
    }

    const rateError = checkRateLimit(req);
    if (rateError) {
      return res.status(429).json({ error: rateError });
    }

    const { question, context_filter } = parsed.data;
    const context = getTenantContext();

    this.logger.log(`Ask advisor (MES): tenant=${context.tenantId} question="${question.slice(0, 60)}..."`);

    const result = await this.advisor.ask(question, context_filter);
    return res.json({ success: true, ...result });
  }

  // Asistente TÉCNICO: RAG sobre la documentación del repo (README, DECISIONS,
  // ADRs, docs técnicos). Funciona sin token (demo pública) igual que /ask.
  @Post('ask-tech')
  async askTech(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const parsed = askAdvisorSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.flatten().fieldErrors;
      return res.status(400).json({ error: Object.values(firstError).flat()[0] || 'Datos inválidos', success: false });
    }

    const rateError = checkRateLimit(req);
    if (rateError) {
      return res.status(429).json({ error: rateError });
    }

    const { question } = parsed.data;
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'Asistente no configurado (falta OPENROUTER_API_KEY en el servidor)' });
    }

    this.logger.log(`Ask advisor (TÉCNICO): question="${question.slice(0, 60)}..."`);

    const result = await this.technicalAdvisor.responder(apiKey, question);
    return res.json({ success: true, ...result });
  }

  // Asistente de USUARIO por rol: responde SOLO sobre lo que ESE rol puede hacer en SU panel
  @Post('ask-user')
  async askUser(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const parsed = askAdvisorSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.flatten().fieldErrors;
      return res.status(400).json({ error: Object.values(firstError).flat()[0] || 'Datos inválidos', success: false });
    }

    const rateError = checkRateLimit(req);
    if (rateError) {
      return res.status(429).json({ error: rateError });
    }

    const { question } = parsed.data;
    const context = getTenantContext();
    const role = context.role || 'operario';

    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'Asistente no configurado' });
    }

    this.logger.log(`Ask advisor (USUARIO-${role}): tenant=${context.tenantId} question="${question.slice(0, 60)}..."`);

    // Seleccionar prompt y ayuda según rol
    const systemPrompt = USER_ROLE_PROMPTS[role] || USER_ROLE_PROMPTS.operario;
    let helpContent = OPERATOR_HELP_CONTENT;
    if (role === 'supervisor') helpContent = SUPERVISOR_HELP_CONTENT;
    else if (role === 'tenant_admin') helpContent = ADMIN_HELP_CONTENT;

    const fullPrompt = `${systemPrompt}\n${helpContent}`;

    // Llamar al LLM con el prompt completo
    const answer = await this.callUserLLM(apiKey, fullPrompt, question);

    return res.json({ success: true, answer, engine: 'user-role-llm', role });
  }

  private async callUserLLM(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
    const baseUrl = process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1';
    const model = process.env.LLM_MODEL || 'poolside/laguna-s-2.1:free';

    const { default: openai } = await import('openai');
    const client = new openai.OpenAI({ apiKey, baseURL: baseUrl });

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 800,
    });

    return response.choices[0]?.message?.content || 'No se pudo generar una respuesta.';
  }

  @Get('corpus-stats')
  async getCorpusStats(@Req() req: Request, @Res() res: Response) {
    const stats = this.technicalAdvisor.estadisticasCorpus();
    return res.json({ success: true, ...stats });
  }
}