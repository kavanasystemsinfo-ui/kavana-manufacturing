export const SUPERVISOR_HELP = {
  title: 'Guía: Panel de Supervisor',
  sections: [
    {
      title: '¿Qué es este panel?',
      content: 'Es el puente entre la gestión administrativa y la planta. Comme supervisor puedes crear órdenes de producción, distribuir el trabajo por puestos y supervisar el avance en tiempo real.',
    },
    {
      title: 'Pestaña "Órdenes"',
      content: `Lista todas las órdenes del tenant. Para cada una se muestra:
• Modelo y puesto asignado
• Barra de progreso (producido / objetivo en %)
• Estado (Pendiente, En Progreso, Completada, Cancelada)
• Botones: Iniciar, Completar, Actividad, Eliminar
Haz clic en "Actividad" para expandir la línea de tiempo de bloques de trabajo de la orden.`,
    },
    {
      title: 'Crear una orden',
      content: `1. Pulsa "+ Nueva Orden"
2. Selecciona el modelo y el puesto
3. Indica la cantidad objetivo
4. Rellena los campos personalizados del supervisor:
   • N. de Orden — identificador interno (ej: ORD-2026-001)
   • Medida — especificación técnica (ej: 20x20mm)
   • Material — tipo de material (ej: Aluminio 6063)
   • Notas — instrucciones adicionales
5. Pulsa "Crear"

Importante: Estos campos son solo lectura para el operario. Los rellenas tú.`,
    },
    {
      title: 'Pestaña "Puestos" (Andon)',
      content: `Muestra el estado de cada puesto con código de color:
• 🟢 Verde — En producción (hay operario trabajando)
• 🔴 Rojo — Parado / avería / cambio
• ⚪ Gris — Libre (sin operario asignado)
El tablero se refresca automáticamente cada 10 segundos.`,
    },
    {
      title: 'Línea de actividad (Activity Feed)',
      content: `Al expandir una orden verás los bloques de trabajo:
• Tipo (producción, parada, calidad)
• Duración formateada
• Operario que lo realizó
• Cantidades producidas y defectos
• Razón de la parada, si aplica`,
    },
    {
      title: 'Refresco automático',
      content: 'El panel actualiza órdenes y puestos cada 10 segundos. No necesitas recargar la página manualmente. Si haces cambios (crear, completar, eliminar) se reflejan inmediatamente.',
    },
  ],
};

export const OPERATOR_HELP = {
  title: 'Guía: Panel del Operario',
  sections: [
    {
      title: '¿Qué es este panel?',
      content: 'Es tu estación de trabajo HMI (interfaz humano-máquina). Aquí registras tu producción en tiempo real durante el turno.',
    },
    {
      title: 'Seleccionar orden',
      content: `Al entrar verás las órdenes disponibles para tu puesto.
1. Revisa la lista (filtrada por tu puesto predeterminado)
2. Usa la barra de búsqueda para filtrar por modelo, código o medida
3. Haz clic en "Seleccionar" sobre la orden que vas a trabajar
4. A partir de ese momento quedas asignado a esa orden`,
    },
    {
      title: 'Datos de la orden',
      content: `La sección "Datos de la orden" muestra los campos rellenados por el supervisor:
• N. de Orden
• Medida
• Material
• Notas
Estos campos son de solo lectura. Si crees que hay un error, contacta al supervisor.`,
    },
    {
      title: 'Botones principales',
      content: `• Iniciar — Comienza un bloque de trabajo (producción)
• Pausar — Detiene temporalmente (almuerzo, descanso, cambio)
• Reanudar — Continúa la producción tras pausa
• Terminar — Finaliza la orden y registra cantidades finales
Las cantidades producidas y defectos se suben automáticamente.`,
    },
    {
      title: 'Registro de producción',
      content: 'A medida que trabajas, el sistema acumula tiempo de producción y conteo de piezas. Si pierdes conexión, los datos quedan guardados localmente y se sincronizan cuando vuelve la red.',
    },
    {
      title: '¿Quién soy en el panel?',
      content: 'En la cabecera verás tu nombre real (no un código). El sistema usa tu nombre y apellidos configurados por el administrador. Si aparece un código extraño, pide al admin que complete tu ficha.',
    },
  ],
};

export const GLOBAL_ADMIN_HELP = {
  title: 'Guía: Admin Global Kavana',
  sections: [
    {
      title: '¿Qué es este panel?',
      content: 'Es la consola de gestión multi-tenant de Kavana. Solo accesible desde admin@kavana.local. Permite crear y configurar empresas (tenants), activar/desactivar módulos y ver estadísticas globales.',
    },
    {
      title: 'Crear un cliente (tenant)',
      content: `1. Pulsa "+ Nuevo Cliente"
2. Rellena:
   • Nombre de la empresa
   • Subdominio (ej: acme → acme.kavana.app)
   • Nombre de usuario del admin del cliente
   • Contraseña inicial del admin
3. Pulsa "Crear"
4. Se crea en una sola transacción: tenant + admin + subnet

El cliente puede iniciar sesión en {subdominio}.kavana.app con las credenciales creadas.`,
    },
    {
      title: 'Activar / Desactivar módulos',
      content: `Cada tenant tiene módulos opt-in:
• core_mes — Siempre activo (base)
• oee_monitoring — Monitoreo OEE
• quality_assurance — Control de calidad
• cost_management — Gestión de costes
Pulsa "Toggle módulos" sobre un tenant y activa/desactiva según el contrato.`,
    },
    {
      title: 'Estadísticas por tenant',
      content: 'Cada tarjeta muestra número de usuarios, puestos y módulos activos. Usa esto para auditar uso y planificar onboarding.',
    },
    {
      title: 'Eliminar un tenant',
      content: 'Pulsa "Eliminar" sobre un cliente. Esta acción es destructiva y elimina todos sus datos. Úsala solo si el cliente ha solicitado baja confirmada. Requiere confirmación.',
    },
  ],
};

export const USERS_HELP = {
  title: 'Guía: Gestión de Usuarios',
  sections: [
    {
      title: '¿Qué es esta sección?',
      content: 'Permite crear, editar y eliminar usuarios del sistema. Cada usuario tiene un nombre, contraseña y rol que define qué puede hacer dentro de Kavana.',
    },
    {
      title: 'Crear un usuario',
      content: `1. Haz clic en "+ Crear Usuario"
2. Escribe un nombre de usuario (ej: juan.perez)
3. Escribe una contraseña segura
4. Selecciona el rol:
   • Admin — Control total del sistema
   • Supervisor — Puede ver reportes y gestionar órdenes
   • Operario — Solo registra producción en su estación
5. Haz clic en "Guardar"`,
    },
    {
      title: 'Editar un usuario',
      content: `1. En la tabla, haz clic en "Editar" junto al usuario
2. Modifica el nombre, contraseña o rol
3. Haz clic en "Guardar"`,
    },
    {
      title: 'Eliminar un usuario',
      content: 'Haz clic en "Eliminar" junto al usuario y confirma. Esta acción no se puede deshacer.',
    },
    {
      title: 'Roles disponibles',
      content: `• Admin (tenant_admin) — Acceso completo a todas las funciones
• Supervisor — Puede ver dashboards, reportes y gestionar órdenes
• Operario — Puede registrar tiempo de producción y ver sus órdenes asignadas`,
    },
  ],
};

export const WORKSTATIONS_HELP = {
  title: 'Guía: Gestión de Puestos de Trabajo',
  sections: [
    {
      title: '¿Qué es esta sección?',
      content: 'Los puestos de trabajo representan las máquinas, estaciones o áreas de producción de tu planta. Cada orden se asigna a un puesto específico.',
    },
    {
      title: 'Crear un puesto',
      content: `1. Haz clic en "+ Crear Puesto"
2. Escribe un nombre descriptivo (ej: Prensa Hidráulica 1)
3. El código se genera automáticamente (ej: prensa-hidraulica-1)
4. El estado inicia como "Activo"
5. Haz clic en "Guardar"`,
    },
    {
      title: 'Editar un puesto',
      content: `1. Haz clic en "Editar" junto al puesto
2. Modifica el nombre o estado
3. Haz clic en "Guardar"`,
    },
    {
      title: 'Estados disponibles',
      content: `• Activo — La estación está operativa y puede recibir órdenes
• Inactivo — La estación no está disponible temporalmente`,
    },
    {
      title: '¿Cuándo usar esto?',
      content: 'Registra cada máquina o estación de trabajo real de tu planta. Los operarios verán estos puestos al registrar producción.',
    },
  ],
};

export const MODELS_HELP = {
  title: 'Guía: Modelos de Fabricación',
  sections: [
    {
      title: '¿Qué es esta sección?',
      content: 'Un modelo define el tipo de producto que se fabrica: su nombre y cuántos minutos se estiman por unidad. Las órdenes se crean basándose en estos modelos.',
    },
    {
      title: 'Crear un modelo',
      content: `1. Haz clic en "+ Crear Modelo"
2. Escribe el nombre del producto (ej: Widget Aluminio 50mm)
3. Escribe el tiempo estimado en minutos por unidad
4. Haz clic en "Guardar"`,
    },
    {
      title: 'Editar un modelo',
      content: `1. Haz clic en "Editar" junto al modelo
2. Modifica el nombre o tiempo estimado
3. Haz clic en "Guardar"`,
    },
    {
      title: 'Tiempo estimado',
      content: 'Es la cantidad de minutos que se espera que tome fabricar una unidad. Se usa para calcular la eficiencia y detectar retrasos en producción.',
    },
  ],
};

export const ORDERS_HELP = {
  title: 'Guía: Gestión de Órdenes',
  sections: [
    {
      title: '¿Qué es esta sección?',
      content: 'Las órdenes de producción indican qué modelo fabricar, en qué puesto, cuántas unidades producir y en qué estado se encuentra.',
    },
    {
      title: 'Crear una orden',
      content: `1. Haz clic en "+ Crear Orden"
2. Selecciona el modelo de fabricación
3. Selecciona el puesto de trabajo
4. Indica la cantidad de unidades a producir
5. Haz clic en "Guardar"
6. La orden inicia en estado "Pendiente"`,
    },
    {
      title: 'Estados de una orden',
      content: `• Pendiente — Creada, aún no inicia producción
• En Progreso — Producción activa en el puesto
• Completada — Terminó exitosamente
• Cancelada — Anulada, no se completó`,
    },
    {
      title: 'Editar una orden',
      content: 'Puedes cambiar el estado o reasignar el puesto de trabajo desde la columna "Acciones".',
    },
  ],
};

export const MODULES_HELP = {
  title: 'Guía: Módulos del Sistema',
  sections: [
    {
      title: '¿Qué es esta sección?',
      content: 'Kavana funciona por módulos. Cada módulo es un conjunto de funcionalidades que se pueden activar o desactivar según lo que necesites.',
    },
    {
      title: 'Módulos disponibles',
      content: `• core_mes — El módulo base. Siempre activo. Incluye producción básica, órdenes y reportes.
• oee_monitoring — Monitoreo de Eficiencia de Equipos (OEE). Mide disponibilidad, rendimiento y calidad.
• cost_management — Gestión de costos de producción, monedas e integración con ERP.
• quality_assurance — Control de calidad, muestreo automatizado y cumplimiento ISO.`,
    },
    {
      title: 'Activar / Desactivar un módulo',
      content: `1. Busca el módulo que quieres cambiar
2. Usa el interruptor (toggle) a la derecha
3. El cambio se aplica inmediatamente
4. Nota: core_mes no se puede desactivar`,
    },
    {
      title: '¿Qué pasa si desactivo un módulo?',
      content: 'Las funcionalidades de ese módulo desaparecen de la interfaz. Los datos no se eliminan, solo se ocultan. Si lo vuelves a activar, todo vuelve a aparecer.',
    },
  ],
};

export const CUSTOM_FIELDS_HELP = {
  title: 'Guía: Campos Personalizados',
  sections: [
    {
      title: '¿Qué es esta sección?',
      content: 'Permite agregar campos adicionales a las órdenes de producción. Por ejemplo, si necesitas registrar el color, lote o peso de cada orden.',
    },
    {
      title: 'Agregar un campo',
      content: `1. Haz clic en "+ Campo"
2. Escribe una clave (solo minúsculas, números, guiones bajos o guiones)
   Ejemplos: color, lote, peso_kg, conformidad
3. Selecciona el tipo:
   • Texto — Para palabras o códigos
   • Número — Para cantidades o medidas
   • Booleano — Para sí/no, cumple/no cumple
4. Marca "Requerido" si el campo es obligatorio
5. Haz clic en "Guardar Esquema"`,
    },
    {
      title: 'Eliminar un campo',
      content: 'Haz clic en "Eliminar" junto al campo. Los datos existentes en órdenes anteriores se conservan.',
    },
    {
      title: 'Límites',
      content: `• Máximo 5 campos personalizados por tenant
• La clave debe ser única (no repetir la misma)
• Solo se aplican a órdenes de producción`,
    },
    {
      title: '¿Cuándo usar esto?',
      content: 'Cuando la información estándar de una orden no es suficiente. Ejemplo: si fabricas pintura y necesitas registrar el "código de color" de cada lote.',
    },
  ],
};
