# ADR-006: Coste cero y modelos gratuitos como decisión explícita

**Estado:** ✅ Implementado · **Fecha:** 2026-09-17 · **Relacionado:** [ADR-001](001-shared-schema-multi-tenant-rls.md) (arquitectura y aislamiento)

## Contexto

Kavana Manufacturing es una demo de portafolio con **un solo usuario real: su autor**. Tiene dos asistentes distintos y con coste distinto:

1. **Asistente técnico** (`ai-advisor/technical-advisor.service.ts`): RAG sobre la documentación del repositorio. La recuperación es **TF-IDF en memoria** (sin embeddings ni base vectorial, coste 0) y solo el paso de redactar la respuesta usa un modelo de lenguaje.
2. **AI Advisor del MES** (`ai-advisor/ai-advisor.service.ts`): selecciona proveedor por configuración (`LLM_PROVIDER`, con mapa de claves por proveedor: openrouter, deepseek, openai, nvidia, ollama, vllm).

El código de ambos ya traía por defecto OpenRouter con modelos gratuitos, pero **producción lo sobreescribía** con `LLM_PROVIDER=deepseek`, `LLM_BASE_URL=https://api.deepseek.com/v1` y `LLM_MODEL=deepseek-chat`. Es decir: la demo pagaba por pregunta simplemente porque la configuración del servicio contradecía el valor por defecto del código. Latencia medida con una pregunta real sobre la documentación: **36,4 segundos**.

## Decisión

1. Los asistentes usan una **variante gratuita** de OpenRouter: `nvidia/nemotron-3-super-120b-a12b:free`, con `LLM_PROVIDER=openrouter`, `LLM_BASE_URL=https://openrouter.ai/api/v1` y `LLM_MODEL` / `LLM_MODEL_FREE` / `ASSISTANT_MODEL_PRO` / `ASSISTANT_MODEL_FREE` apuntando a ese modelo.
2. **La elección de proveedor y modelo vive en configuración, no en código.** El mapa de proveedores del `ai-advisor` ya soporta varios; cambiar de proveedor es cambiar variables.
3. La clave de DeepSeek se **retira del servicio y se guarda** en el almacén de secretos del titular (no se pierde): volver a usar el proveedor de pago es volver a poner dos variables y la clave.
4. La comprobación se hace contra el endpoint vivo (`POST /ai-advisor/ask-tech`), no contra el código: lo que importa es que la demo responda.

## Alternativas evaluadas

| Alternativa | A favor | En contra | Veredicto |
|---|---|---|---|
| DeepSeek de pago (lo que había) | Modelo sólido en español, razonamiento multi-paso, saldo disponible | Coste por pregunta y **36,4 s** de latencia medida en la demo | Descartado para una demo personal; es la elección con presupuesto |
| Modelo autoalojado (Ollama / vLLM) | Coste 0 y los datos no salen del servidor; el código ya lo soporta (`LLM_PROVIDER=ollama`) | El plan gratuito de Render no tiene CPU/RAM para servirlo; complica el despliegue | Aplazado; es la ruta natural si hay datos sensibles |
| Otros proveedores del mapa (nvidia, openai) | Alternativas de calidad | Requieren cuenta y clave nuevas, y siguen siendo de pago o con cuota propia | No aportan nada hoy |
| Variante gratuita en OpenRouter | Coste 0, ya era el valor por defecto del código, latencia mucho menor | Cuota diaria, disponibilidad variable, los prompts pueden registrarse | **Elegido** |

## Consecuencias

**Medido, no estimado:** con la variante gratuita la misma pregunta pasa de **36,4 s a 11,3 s** y el coste de IA del proyecto es **0 €**. La recuperación de contexto ya era gratis por diseño (TF-IDF en memoria).

**Límites asumidos:** cuota de 1.000 peticiones al día en la cuenta actual; los `429` del proveedor de origen son posibles y hoy no hay modelo de respaldo automático en la cadena; los modelos gratuitos pueden registrar los prompts, así que **esta demo no debe usarse con datos de cliente**. El asistente solo responde con la documentación del repositorio y dice que no lo sabe cuando la respuesta no está documentada.

**Efecto colateral positivo documentado:** el mismo cambio deja el MES apuntando a OpenRouter, lo que hace que las variables `LLM_*` sean coherentes con el valor por defecto del código. Un servicio que contradice a su propio código por configuración es una trampa que se descubre siempre tarde; este ADR lo deja escrito.

## Señal de revisión

Se revisa si el proyecto pasa a tener usuarios reales, si entran datos de cliente, si la cuota diaria deja de cubrir el uso o si la latencia empeora. En los cuatro casos el cambio es de configuración y de plan, no de arquitectura.
