# Decisiones de Arquitectura — AI Platform (Kavana Manufacturing v3.1)

> **Propósito:** este documento existe para responder las preguntas difíciles que un Staff Engineer o CTO haría en una entrevista técnica. No enumera tecnologías — explica el *porqué* de cada decisión.

---

## 1. ¿Por qué BullMQ + Redis y no Kafka / RabbitMQ / SQS?

**Decisión:** BullMQ sobre Redis. **No es la opción más escalable, es la correcta para este dominio.**

| Criterio | BullMQ + Redis | Kafka | RabbitMQ | SQS |
|----------|:---:|:---:|:---:|:---:|
| Overhead operacional | Mínimo (Redis ya en stack) | Alto (Zookeeper/KRaft, tópicos, particiones) | Medio (clustering, plugins) | Cero (managed) |
| Latencia | <5ms | 10-50ms | 1-5ms | 10-100ms |
| Retention | Configurable (por defecto 24h completados) | Infinita (log inmutable) | Ack + TTL | 14 días máx |
| Caso de uso | Jobs efímeros (<24h) | Event sourcing, streaming | RPC, tareas asíncronas | Decoupling cloud |

**Razonamiento:** No necesitamos streaming de eventos ni retention infinita. Los jobs del MES son efímeros: un recálculo de OEE tarda segundos, una exportación de informe se descarga una vez, y la ingestión de documentos indexa y termina. Kafka añadiría complejidad operacional (particiones, consumidores, offsets) sin beneficio para este dominio. Redis ya está en el stack como caché de sesiones — reutilizarlo como broker de mensajes elimina un servicio adicional.

**Cuándo migraríamos a Kafka:** si necesitáramos event sourcing (ej: reconstruir el estado de una orden desde eventos inmutables) o si el volumen superara ~10k jobs/segundo sostenido.

---

## 2. ¿Por qué OpenAI-compatible como interfaz y no una abstracción propia?

**Decisión:** todos los providers (NVIDIA, vLLM, Ollama, OpenRouter, OpenAI) exponen el mismo contrato REST `POST /v1/chat/completions`. No creamos una abstracción — usamos la que ya existe.

```typescript
// El contrato es idéntico para los 5 providers:
const client = new OpenAI({ apiKey, baseUrl }); // baseUrl cambia, el resto no
const response = await client.chat.completions.create({
  model,       // "meta/llama-3.1-8b-instruct" o "llama3.1:8b" o "gpt-4o-mini"
  messages,    // [{ role: "system", ... }, { role: "user", ... }]
  temperature,
  max_tokens,
});
```

**Ventajas de no crear una abstracción propia:**
- **Cero vendor lock-in:** cambiar de OpenAI a Ollama es cambiar `baseUrl` y `model`.
- **Sin curva de aprendizaje:** cualquier dev que conozca la API de OpenAI puede añadir un provider nuevo en 3 líneas.
- **Testing:** podemos mockear un solo cliente en lugar de N adapters distintos.

**El cost-tracking es la única capa específica por provider** (`cost-tracking.ts` mapea `model → precio por token`). Si un provider nuevo no está en la tabla, el coste se reporta como $0 con un warning en logs — nunca bloquea la funcionalidad.

---

## 3. ¿Cómo se garantiza idempotencia?

**Dos capas:**

1. **BullMQ jobId determinista:** cada job se identifica con un string único generado a partir de los parámetros de negocio. Ejemplo:
   ```
   oee-recalc:{tenantId}:{workstationId}:{timestamp}
   ```
   BullMQ descarta automáticamente jobs con el mismo `jobId` si ya existe uno pendiente o en progreso. Esto evita duplicados por doble envío desde el frontend o reintentos de red.

2. **SQL con constraint UNIQUE:** las operaciones de escritura usan `ON CONFLICT DO NOTHING` o `ON CONFLICT DO UPDATE`. Ejemplo en el pipeline de ingestión:
   ```sql
   INSERT INTO ai_context_chunks (tenant_id, document_id, chunk_index, content)
   VALUES ($1, $2, $3, $4)
   ON CONFLICT (tenant_id, document_id, chunk_index) DO NOTHING
   ```
   Si el mismo chunk llega dos veces, la base de datos lo ignora.

**Lo que NO hacemos:** no usamos idempotency keys a nivel de API HTTP porque no hay operaciones de pago ni mutaciones irreversibles. Si un job se duplica, el coste es un log de advertencia y un ciclo de CPU desperdiciado, no una inconsistencia de datos.

---

## 4. ¿Qué ocurre si un worker muere?

**BullMQ maneja esto automáticamente** mediante el mecanismo de `stalled jobs`:

1. Un worker toma un job y empieza a procesarlo.
2. Cada N segundos (configurable), el worker envía un heartbeat a Redis.
3. Si el worker muere (crash, OOM, kill -9), el heartbeat se interrumpe.
4. Tras un timeout (`stalledInterval`, por defecto 30s), BullMQ marca el job como `stalled` y lo reencola para otro worker.

**En Kubernetes:** si un pod worker muere, el Deployment lo reemplaza automáticamente (`replicas: 2` mínimo). El nuevo worker toma los jobs stalled sin intervención manual.

**Estrategia de reintentos:** 3 intentos con backoff exponencial (1s → 2s → 4s). Si los 3 fallan, el job se mueve a la cola `failed` con retención de 7 días para diagnóstico.

**Lo que NO tenemos aún (y es deliberado):** no hay Dead Letter Queue (DLQ) separada porque el volumen actual no lo justifica. Implementaríamos una DLQ cuando:
- El volumen de fallos supere ~50 jobs/día
- Necesitemos reprocesamiento manual con UI
- Un cliente requiera SLA de entrega garantizada

---

## 5. ¿Cómo se versiona el contexto RAG (reproducibilidad)?

**Decisión:** SHA-256 del bundle completo de contexto, no de embeddings individuales. El versionado es a nivel de *respuesta*, no de *documento*.

```typescript
const cv = versionContext({
  tenantId: ctx.tenantId,
  contextJSON: JSON.stringify(bundle),  // órdenes + OEE + calidad + workblocks
  orderCount: orders.length,
  oeeRecordCount: oee.length,
  qualityRecordCount: quality.length,
  workblockCount: wb.length,
});
// → { hash: "a3f2b1c8d9e0", generatedAt: "2026-07-19T...", ... }
```

Cada respuesta del AI Advisor incluye el hash del contexto exacto que se usó para generarla. Esto permite responder preguntas como "¿por qué el modelo dijo esto hace 3 días?" — se recupera el hash de la respuesta, se busca si el contexto cambió en ese periodo, y se determina si la diferencia en la respuesta se debe al modelo o a los datos.

**¿Por qué no versionar embeddings individuales?** Porque no usamos embeddings precomputados con ChromaDB/Pinecone. El contexto se genera *en el momento* desde SQL contra datos vivos. Versionar el bundle completo es más simple y suficiente para trazabilidad.

**Cuándo añadiríamos versionado de embeddings:** si migramos a un pipeline de ingestión batch con embeddings precomputados (ej: `text-embedding-3-small` sobre manuales), entonces sí versionaríamos el modelo de embedding + el chunk + el timestamp.

---

## 6. ¿Cómo se evita vendor lock-in?

**Tres capas de defensa:**

| Capa | Mecanismo | Coste de cambio |
|------|-----------|-----------------|
| **API de inferencia** | Contrato OpenAI-compatible (5 providers lo implementan) | Cambiar `LLM_PROVIDER` + `LLM_BASE_URL` |
| **Observabilidad** | OpenTelemetry (estándar CNCF, no propietario) | Cero — cualquier backend OTLP sirve |
| **Métricas** | Prometheus (estándar CNCF) | Cero — cualquier TSDB compatible |

**Ejemplo concreto:** si mañana NVIDIA duplica sus precios, cambiar a Ollama local es:
```bash
LLM_PROVIDER=ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3.1:8b
```
Ni una línea de código cambia. La interfaz es el contrato REST de OpenAI, no una abstracción propietaria.

---

## 7. ¿Cómo se monitoriza la degradación del retrieval?

**Dos mecanismos complementarios:**

1. **Evaluación offline** (`eval/advisor_eval.ts`):
   - 6 preguntas de operarios reales con ground truth manual
   - Métricas `recall@k` y `precision@k` sobre el contexto recuperado
   - Ejecutable en CI (`npm run eval:advisor`)
   - Si el recall cae por debajo del 50%, el pipeline falla

2. **Métricas online** (OpenTelemetry → Prometheus → Grafana):
   - `llm_prompt_latency_ms` — si el contexto es más grande, la latencia sube
   - `llm_prompt_status_total{status="error"}` — si el contexto está vacío, el modelo responde "no tengo información"
   - `context_version.hash` en el span — permite correlar cambios en el contexto con cambios en la calidad de respuesta

**Lo que NO hacemos:** no medimos `answer relevance` ni `faithfulness` automáticos con un LLM juez. Es deliberado — añadiría latencia y coste a cada request. Lo haríamos offline en un pipeline de evaluación semanal.

---

## 8. ¿Cómo se escalaría a 100 workers?

**La arquitectura actual lo permite sin cambios de código:**

```yaml
# k8s/manifests.yaml
spec:
  replicas: 100  # ← único cambio necesario
```

**Por qué funciona:** cada worker es stateless. Lee jobs de Redis (BullMQ), consulta PostgreSQL con RLS (tenant context en el job), y devuelve el resultado. No hay estado compartido entre workers — Redis actúa como punto de coordinación.

**Cuellos de botella al escalar:**
1. **Redis** — con 100 workers compitiendo por jobs, Redis puede saturarse. Mitigación: Redis Cluster o aumentar `concurrency` por worker (procesar N jobs en paralelo en vez de 1 worker por job).
2. **PostgreSQL** — con 100 workers ejecutando queries simultáneas, el pool de conexiones se agota. Mitigación: PgBouncer en modo transaction pooling.
3. **BullMQ** — el algoritmo de round-robin de BullMQ escala bien hasta ~1000 workers sin degradación apreciable.

---

## 9. ¿Cómo se elige automáticamente el proveedor más barato?

**Hoy no se hace (y es deliberado).** La selección de provider es explícita vía `LLM_PROVIDER`. Esto es correcto para un sistema donde el operador humano (tú) decide qué modelo usar basado en:
- Coste vs calidad percibida
- Latencia aceptable (local <10ms, cloud ~500ms)
- Compliance (datos sensibles → on-premise)

**Cómo lo implementaríamos si fuera necesario:**
1. Añadir un `router` que consulte el pricing de `cost-tracking.ts` para cada provider
2. Añadir una cola de benchmarks que evalúe periódicamente la calidad de cada modelo contra el conjunto de eval
3. El router selecciona el provider con mejor relación calidad/coste dentro de un presupuesto diario configurable

**Por qué no ahora:** añadiría complejidad prematura. La decisión de "¿qué modelo uso?" la toma un humano con criterio, no un algoritmo con heurísticas. Para una fábrica con 3 líneas de producción, esto es suficiente.

---

## 10. Retos que sí abordamos pero que podrían escalar

| Reto | Estado actual | Trigger para escalar |
|------|--------------|---------------------|
| **DLQ** | No implementada (usamos `failed` queue de BullMQ) | >50 fallos/día o cliente con SLA |
| **Rolling deployments** | Manifiestos k8s listos, no probados en clúster real | Primer despliegue en producción |
| **Caché de embeddings** | No aplica (contexto SQL en vivo) | Si migramos a embeddings precomputados |
| **A/B testing de prompts** | No implementado | Cuando tengamos >2 variantes de prompt compitiendo |
| **Rate limiting por tenant** | No implementado (confiamos en RLS) | Si un tenant satura el LLM con consultas |

---

## Principios que guían todas las decisiones

1. **Simple sobre completo.** Elegimos BullMQ, no Kafka. Elegimos contrato REST, no abstracción propia. Cada decisión reduce superficie en lugar de expandirla.

2. **Observable por defecto.** Cada llamada al LLM, cada job encolado, cada error — todo genera métricas y spans. No hay "modo debug" que activar.

3. **Cambiable sin reescribir.** Cambiar de proveedor de IA es una variable de entorno. Cambiar de broker de mensajes requeriría reescribir los processors, pero el contrato de `QueueService` aislaría al resto del sistema.

4. **Lo no implementado es deliberado.** No es un bug, es una decisión consciente documentada aquí. Cada "no" tiene un trigger documentado para convertirse en "sí".
