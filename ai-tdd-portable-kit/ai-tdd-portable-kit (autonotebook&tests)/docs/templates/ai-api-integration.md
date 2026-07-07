# Template: Integración con APIs de IA

## Descripción
Esta plantilla documenta cómo integrar APIs de IA (OpenRouter, OpenAI, Anthropic, etc.) en tu proyecto.

## Proveedores de IA Soportados

### OpenRouter (Recomendado para Empezar)
- **Ventajas:** Acceso a múltiples modelos, precios competitivos, API compatible con OpenAI
- **URL:** https://openrouter.ai
- **Modelos populares:** GPT-4, Claude, Gemini, Llama

### OpenAI
- **Ventajas:** Modelos potentes, buena documentación
- **URL:** https://api.openai.com

### Anthropic (Claude)
- **Ventajas:** Excelente razonamiento, contextos largos
- **URL:** https://api.anthropic.com

## Requisitos Previos

### Variables de Entorno
```bash
# .env
OPENROUTER_API_KEY=tu_api_key_aqui
OPENROUTER_MODEL=google/gemini-flash-1.5
# Opcional: para otros proveedores
OPENAI_API_KEY=tu_api_key_aqui
ANTHROPIC_API_KEY=tu_api_key_aqui
```

### Dependencias
```txt
# requirements.txt
httpx>=0.25.0
python-dotenv>=1.0.0
```

## Estructura Base

### Cliente de IA Genérico
```python
import os
import httpx
from typing import Optional

class AIClient:
    def __init__(self, provider: str = "openrouter"):
        self.provider = provider
        self.api_key = self._get_api_key()
        self.base_url = self._get_base_url()
        self.model = self._get_default_model()
    
    def _get_api_key(self) -> str:
        if self.provider == "openrouter":
            return os.getenv("OPENROUTER_API_KEY", "")
        elif self.provider == "openai":
            return os.getenv("OPENAI_API_KEY", "")
        elif self.provider == "anthropic":
            return os.getenv("ANTHROPIC_API_KEY", "")
        raise ValueError(f"Proveedor no soportado: {self.provider}")
    
    def _get_base_url(self) -> str:
        if self.provider == "openrouter":
            return "https://openrouter.ai/api/v1/chat/completions"
        elif self.provider == "openai":
            return "https://api.openai.com/v1/chat/completions"
        elif self.provider == "anthropic":
            return "https://api.anthropic.com/v1/messages"
        raise ValueError(f"Proveedor no soportado: {self.provider}")
    
    def _get_default_model(self) -> str:
        if self.provider == "openrouter":
            return os.getenv("OPENROUTER_MODEL", "google/gemini-flash-1.5")
        elif self.provider == "openai":
            return "gpt-4"
        elif self.provider == "anthropic":
            return "claude-3-sonnet-20240229"
        return ""
    
    async def chat(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.0,
            "max_tokens": 1000
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(self.base_url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
```

## Casos de Uso Comunes

### 1. Extracción de Datos de Texto
```python
async def extract_structured_data(text: str) -> dict:
    ai = AIClient("openrouter")
    
    prompt = f"""
Extrae los datos estructurados del siguiente texto y devuelve un JSON.
Texto:
{text}
"""
    
    system_prompt = "Eres un asistente que extrae datos estructurados de texto."
    
    response = await ai.chat(prompt, system_prompt)
    
    # Parsear JSON de la respuesta
    import json
    import re
    json_match = re.search(r'\{.*\}', response, re.DOTALL)
    if json_match:
        return json.loads(json_match.group(0))
    return {}
```

### 2. Clasificación de Texto
```python
async def classify_text(text: str, categories: list[str]) -> str:
    ai = AIClient("openrouter")
    
    categories_str = ", ".join(categories)
    prompt = f"""
Clasifica el siguiente texto en una de estas categorías: {categories_str}
Texto: {text}
Responde solo con la categoría.
"""
    
    return await ai.chat(prompt)
```

### 3. Generación de Contenido
```python
async def generate_content(topic: str, style: str = "profesional") -> str:
    ai = AIClient("openrouter")
    
    prompt = f"""
Genera contenido sobre: {topic}
Estilo: {style}
Longitud: 200-300 palabras
"""
    
    return await ai.chat(prompt)
```

### 4. Resumen de Documentos
```python
async def summarize_document(text: str, max_length: int = 200) -> str:
    ai = AIClient("openrouter")
    
    prompt = f"""
Resume el siguiente documento en máximo {max_length} palabras:
{text}
"""
    
    return await ai.chat(prompt)
```

## Manejo de Errores

### Clase de Errores Personalizada
```python
class AIAPIError(Exception):
    def __init__(self, message: str, status_code: int = None, provider: str = None):
        self.message = message
        self.status_code = status_code
        self.provider = provider
        super().__init__(self.message)

class RateLimitError(AIAPIError):
    pass

class AuthenticationError(AIAPIError):
    pass
```

### Manejo de Errores en Cliente
```python
async def chat_with_error_handling(self, prompt: str, system_prompt: Optional[str] = None) -> str:
    try:
        return await self.chat(prompt, system_prompt)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            raise RateLimitError("Límite de velocidad alcanzado", 429, self.provider)
        elif e.response.status_code == 401:
            raise AuthenticationError("API key inválida", 401, self.provider)
        raise AIAPIError(f"Error HTTP: {e.response.status_code}", e.response.status_code, self.provider)
    except Exception as e:
        raise AIAPIError(f"Error inesperado: {str(e)}", provider=self.provider)
```

## Rate Limiting

### Estrategia de Reintentos
```python
import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry=retry_if_exception_type(RateLimitError)
)
async def chat_with_retry(ai_client: AIClient, prompt: str) -> str:
    return await ai_client.chat_with_error_handling(prompt)
```

### Control de Costos
```python
class CostTracker:
    def __init__(self, budget_limit: float = 10.0):
        self.budget_limit = budget_limit
        self.total_cost = 0.0
    
    def estimate_cost(self, tokens: int, model: str) -> float:
        # Precios aproximados por 1K tokens
        prices = {
            "gpt-4": 0.03,
            "gpt-3.5-turbo": 0.002,
            "claude-3-sonnet": 0.015,
            "gemini-flash": 0.001
        }
        return (tokens / 1000) * prices.get(model, 0.01)
    
    def can_afford(self, estimated_tokens: int, model: str) -> bool:
        cost = self.estimate_cost(estimated_tokens, model)
        return (self.total_cost + cost) <= self.budget_limit
```

## Seguridad

### Prácticas Seguras
1. **No Hardcodear API Keys:** Usar variables de entorno
2. **Rate Limiting:** Implementar límites de velocidad
3. **Validación de Input:** Sanitizar datos antes de enviar a IA
4. **Logging:** Registrar uso para auditoría
5. **Costos:** Monitorear gasto y establecer límites

### Ejemplo de Variables de Entorno Seguras
```bash
# Nunca commitear este archivo
# .env (agregar a .gitignore)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=google/gemini-flash-1.5
AI_BUDGET_LIMIT=10.00
AI_RATE_LIMIT_PER_MINUTE=60
```

## Pruebas

### Mock del Cliente IA
```python
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_extract_data():
    with patch('httpx.AsyncClient.post') as mock_post:
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": '{"nombre": "Juan"}'}}]
        }
        mock_post.return_value = mock_response
        
        ai = AIClient("openrouter")
        result = await ai.chat("Extrae el nombre del texto: Juan Pérez")
        
        assert "Juan" in result
```

## Checklist de Implementación
- [ ] API key configurada en variables de entorno
- [ ] Cliente IA creado con manejo de errores
- [ ] Rate limiting implementado
- [ ] Control de costos configurado
- [ ] Validación de input
- [ ] Logging de uso
- [ ] Pruebas unitarias con mocks
- [ ] Pruebas de integración
- [ ] Documentación de API
- [ ] Límites de presupuesto configurados
