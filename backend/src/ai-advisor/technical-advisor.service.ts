// Asistente TÉCNICO de KAVANA Manufacturing (RAG sobre la documentación real del repo).
// - Indexa en memoria README, DECISIONS, SECURITY, ADRs y docs técnicos.
// - Búsqueda TF-IDF simple (sin embeddings ni coste).
// - Llama a OpenRouter: deepseek/deepseek-chat principal, fallback gpt-oss-20b:free.
// - Regla de honestidad: solo responde con lo documentado; si no lo sabe, lo dice.
// (Mismo patrón que RouteAI/Warehouse; separado del asistente MES que consulta
//  datos vivos de producción.)

import { Injectable, Logger } from '@nestjs/common';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

const MODELO_PRO = process.env.ASSISTANT_MODEL_PRO || process.env.LLM_MODEL || 'deepseek-chat';
const MODELO_FREE = process.env.ASSISTANT_MODEL_FREE || process.env.LLM_MODEL || 'deepseek-chat';
// Base URL del proveedor (OpenRouter por defecto; DeepSeek: https://api.deepseek.com/v1)
const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1';

@Injectable()
export class TechnicalAdvisorService {
  private readonly logger = new Logger(TechnicalAdvisorService.name);
  private _indice: { chunks: Chunk[]; vectores: Map<string, number>[] } | null = null;

  cargarCorpus(): Chunk[] {
    const fuentes = [
      'README.md',
      'DECISIONS.md',
      'SECURITY.md',
    ];
    const adrDir = path.join(REPO_ROOT, 'docs/adr');
    const techDir = path.join(REPO_ROOT, 'docs/technical');
    try {
      for (const f of readdirSync(adrDir).filter((f) => f.endsWith('.md') && !f.toLowerCase().includes('template')).sort()) fuentes.push(`docs/adr/${f}`);
      for (const f of readdirSync(techDir).filter((f) => f.endsWith('.md') && !f.toLowerCase().includes('template')).sort()) fuentes.push(`docs/technical/${f}`);
    } catch {
      // docs/adr o docs/technical pueden no existir; se ignoran
    }

    const chunks: Chunk[] = [];
    for (const rel of fuentes) {
      const abs = path.join(REPO_ROOT, rel);
      if (!existsSync(abs)) continue;
      const texto = readFileSync(abs, 'utf8');
      const secciones = texto.split(/\n(?=#{1,3} )/);
      for (const sec of secciones) {
        const titulo = (sec.match(/^#{1,3} (.+)$/m) || [null, rel])[1];
        if (sec.trim().length < 60) continue;
        chunks.push({ fuente: rel, titulo: titulo.trim(), texto: sec.trim().slice(0, 6000) });
      }
    }
    return chunks;
  }

  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private tokenizar(texto: string): string[] {
    return this.normalizar(texto.toLowerCase())
      .replace(/[^a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  }

  private construirIndice(chunks: Chunk[]) {
    const df = new Map<string, number>();
    for (const c of chunks) {
      for (const t of new Set(this.tokenizar(c.texto))) df.set(t, (df.get(t) || 0) + 1);
    }
    const N = chunks.length;
    const idf = new Map<string, number>();
    for (const [t, d] of df) idf.set(t, Math.log(1 + N / d));

    const vectores = chunks.map((c) => {
      const tf = new Map<string, number>();
      for (const t of this.tokenizar(c.texto)) tf.set(t, (tf.get(t) || 0) + 1);
      const vec = new Map<string, number>();
      for (const [t, n] of tf) vec.set(t, n * (idf.get(t) || 0));
      return vec;
    });
    return { chunks, vectores };
  }

  private getIndice() {
    if (!this._indice) this._indice = this.construirIndice(this.cargarCorpus());
    return this._indice;
  }

  private buscar(pregunta: string, top = 6) {
    const indice = this.getIndice();
    const qVec = new Map<string, number>();
    for (const t of this.tokenizar(pregunta)) qVec.set(t, (qVec.get(t) || 0) + 1);
    const scored = indice.vectores
      .map((vec, i) => ({ i, score: similitud(qVec, vec) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, top);
    return scored.map(({ i, score }) => ({ ...indice.chunks[i], score }));
  }

  private esCompleja(pregunta: string): boolean {
    const q = pregunta.toLowerCase();
    const senales = [
      'compara', 'diferencia', 'por qué no', 'por que no', 'alternativas',
      'tradeoff', 'desventaja', 'ventaja', 'decidiste', 'elegiste', 'descartaste',
      'cómo resolverías', 'cómo harías', 'mejoraría', 'cambiarías', 'evolucionaría',
      'arquitectura', 'diseño', 'escalabilidad', 'seguridad', 'multi-tenant',
    ];
    return senales.some((s) => q.includes(s));
  }

  private async llamarOpenRouter(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://www.kavanasystems.com/manufacturing/',
        'X-Title': 'KAVANA Manufacturing Technical Assistant',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 900,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter ${res.status}: ${err.slice(0, 300)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }

  async responder(
    apiKey: string,
    pregunta: string
  ): Promise<{ respuesta: string; fuentes: string[]; modelo: string | null }> {
    if (!apiKey) throw new Error('OPENROUTER_API_KEY no configurada');

    // Detectar saludos simples para responder de forma natural sin LLM
    const saludo = this.detectarSaludo(pregunta);
    if (saludo) {
      return {
        respuesta: saludo,
        fuentes: [],
        modelo: null,
      };
    }

    const docs = this.buscar(pregunta);

    if (docs.length === 0) {
      return {
        respuesta: this.generarRespuestaSinResultados(pregunta),
        fuentes: [],
        modelo: null,
      };
    }

    const contexto = docs
      .map((d) => `[FUENTE: ${d.fuente} — ${d.titulo}]\n${d.texto}`)
      .join('\n\n---\n\n');

    const systemPrompt = [
      'Eres el asistente técnico de KAVANA Manufacturing, un MES (Sistema de Ejecución de Manufactura) offline-first multi-tenant.',
      'Tu objetivo es ayudar a usuarios (reclutadores, clientes, operarios) a entender el proyecto de forma clara y útil.',
      'Reglas:',
      '- Responde en español, claro y directo, como explicaría el desarrollador el proyecto.',
      '- Si el contexto contiene información relevante, úsala para responder con tus palabras y apóyate en los datos.',
      '- Si el contexto NO contiene información específica sobre la pregunta, pero puedes inferir algo razonable del contexto general del proyecto, hazlo y sé transparente sobre los límites.',
      '- Si realmente no tienes nada que decir basado en lo que conoces del proyecto, di: "Perdón, no tengo esa información en la documentación del proyecto. Pero puedo ayudarte con otras preguntas sobre cómo funciona Kavana Manufacturing, su arquitectura, o cómo desplegarlo. ¿Te gustaría que intente con otra pregunta?"',
      '- NUNCA inventes datos, métricas, nombres de archivos o decisiones que no estén en el contexto o que no puedan inferirse razonablemente.',
      '- Siempre termina tus respuestas útiles con una invitación a hacer más preguntas: "¿Te gustaría saber más sobre algún aspecto específico?"',
      '- Solo añade la línea "Ver: [fuente1, fuente2]" al final cuando hayas respondido usando el contexto directamente. Si inferiste o no usaste contexto, no añadas fuentes.',
    ].join('\n');

    const userPrompt = [
      `PREGUNTA DEL RECLUTADOR:\n${pregunta}\n`,
      `CONTEXTO (documentación del proyecto):\n${contexto}`,
    ].join('\n\n');

    let model = this.esCompleja(pregunta) ? MODELO_PRO : MODELO_FREE;
    let respuesta: string;
    try {
      respuesta = await this.llamarOpenRouter(apiKey, model, systemPrompt, userPrompt);
    } catch (err) {
      // Si el modelo gratuito falla (rate limit), reintentar con el de pago
      if (model === MODELO_FREE) {
        try {
          model = MODELO_PRO;
          respuesta = await this.llamarOpenRouter(apiKey, model, systemPrompt, userPrompt);
        } catch (err2) {
          throw new Error(`Fallo al llamar a OpenRouter: ${(err2 as Error).message}`);
        }
      } else {
        throw err;
      }
    }

    return {
      respuesta,
      fuentes: [...new Set(docs.map((d) => d.fuente))],
      modelo: model,
    };
  }

  private detectarSaludo(pregunta: string): string | null {
    const texto = pregunta.trim().toLowerCase();
    const saludos = ['hola', 'buenas', 'buenos días', 'buenas tardes', 'buenas noches', 'qué tal', 'que tal', 'hello', 'hi'];
    const esSaludo = saludos.some(s => texto === s || texto.startsWith(s + ' ') || texto.endsWith(' ' + s));
    
    if (esSaludo) {
      return '¡Hola! Soy el asistente técnico de Kavana Manufacturing, un MES SaaS multi-tenant para plantas industriales. Puedes preguntarme sobre:\n\n' +
        '• **Qué es y para qué sirve** el proyecto (arquitectura, stack, problemas que resuelve)\n' +
        '• **Cómo funciona** offline-first, RLS multi-tenant, feature flags, sincronización\n' +
        '• **Decisiones técnicas** documentadas en ADRs (por qué NestJS, PostgreSQL, Dexie, etc.)\n' +
        '• **Cómo desplegarlo** o ejecutarlo en local (Docker, variables de entorno, CI/CD)\n' +
        '• **Detalles de dominio** (órdenes, bloques de trabajo, incidencias, OEE, quality)\n\n' +
        '¿Sobre qué te gustaría saber más?';
    }
    return null;
  }

  private generarRespuestaSinResultados(pregunta: string): string {
    const texto = pregunta.toLowerCase();
    
    // Sugerencias según tipo de pregunta
    if (texto.includes('precio') || texto.includes('coste') || texto.includes('licencia') || texto.includes('vender')) {
      return 'Esa información no está en la documentación técnica del proyecto. Kavana Manufacturing es un proyecto de portfolio/demo abierto (MIT), no un producto comercial con precios publicados.\n\n' +
        'Puedo contarte sobre la arquitectura, el stack, cómo funciona offline-first, o cómo desplegarlo tú mismo. ¿Te interesa algún aspecto técnico?';
    }
    
    if (texto.includes('jorge') || texto.includes('creador') || texto.includes('autor') || texto.includes('contacto')) {
      return 'Jorge Adán es el arquitecto y creador de Kavana Manufacturing. Las decisiones de arquitectura, producto y dominio son suyas; la IA actuó como copiloto de implementación.\n\n' +
        'Si quieres contactar con él, su perfil está en el README del proyecto. Mientras tanto, puedo explicarte cualquier aspecto técnico del MES. ¿Por dónde empezamos?';
    }
    
    // Respuesta genérica con sugerencias basadas en lo que SÍ hay en docs
    return 'Perdón, no tengo esa información específica en la documentación del proyecto. Pero como conozco bien Kavana Manufacturing, te sugiero estas preguntas que sí puedo responder con detalle:\n\n' +
      '• "¿Cómo funciona la arquitectura offline-first con Dexie.js y sincronización FIFO?"\n' +
      '• "¿Por qué RLS multi-tenant en lugar de schema-per-tenant?"\n' +
      '• "¿Cómo se activan features por cliente sin nuevos deploys?"\n' +
      '• "¿Qué stack usa el frontend HMI para operarios con guantes?"\n' +
      '• "¿Cómo se modelan órdenes, bloques de trabajo e incidencias?"\n' +
      '• "¿Cómo desplegar en local con Docker Compose?"\n\n' +
      '¿Te gustaría que profundice en alguno de estos temas o tienes otra pregunta?';
  }

  estadisticasCorpus(): { chunks: number; fuentes: number } {
    const idx = this.getIndice();
    return { chunks: idx.chunks.length, fuentes: new Set(idx.chunks.map((c) => c.fuente)).size };
  }
}

interface Chunk {
  fuente: string;
  titulo: string;
  texto: string;
}

function similitud(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, na = 0, nb = 0;
  for (const [t, v] of a) { dot += v * (b.get(t) || 0); na += v * v; }
  for (const v of b.values()) nb += v * v;
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

const STOPWORDS: Set<string> = new Set([]);
