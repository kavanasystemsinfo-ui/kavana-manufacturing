# Guía de Contribución para [NOMBRE_DEL_PROYECTO]

## Filosofía de Desarrollo
Este proyecto sigue principios rigurosos de **TDD (Test-Driven Development)** y **YAGNI (You Aren't Gonna Need It)** para mantener el código mínimamente viable, enfocado en el negocio y fácil de mantener. No seguimos estas metodologías como teoría, sino como práctica diaria que garantiza calidad y velocidad.

## Flujo de Trabajo Obligatorio

### 1. ESCRIBE LA PRUEBA PRIMERO (ROJO)
Antes de escribir cualquier línea de código de producción, escribe una prueba que falle claramente y que verifique un comportamiento específico del negocio.

### 2. IMPLEMENTA HASTA PASAR (VERDE)
Escribe solo el código necesario para hacer que la prueba pase. No agregues funcionalidad extra, no refactorices todavía.

### 3. REFACTORIZA SOLO SI MEJORA CLARIDAD O ELIMINA DUPLICACIÓN (YAGNI)
Después de que la prueba pase, pregúntate:
- ¿Este refactor hace el código más legible para otro desarrollador?
- ¿Elimina duplicación real (no hipotética)?
- ¿Agrega valor inmediato o es solo "porque podría ser útil en el futuro"?

### 4. COMMITS SIGNIFICATIVOS
Cada commit debe responder a la pregunta: *"¿Qué problema específico de negocio resuelve este cambio?"*

**Buenos ejemplos:**
- `feat: agregar validación de horarios límite`
- `fix: corregir cálculo de distancia en haversine`
- `docs: actualizar roadmap con nueva funcionalidad`

**Malos ejemplos:**
- `fix: bug`
- `update: código`
- `wip: trabajando en X`

### 5. ANTES DE HACER PUSH
- Ejecuta todos los tests del proyecto
- Verifica que no haya errores de tipo/lint
- Pregúntate: "Si tuviera que explicar este cambio a un consultor IT en 2 minutos, ¿qué le diría?"

## Estructura de Commits
```
tipo(campo): descripción corta

[opcional] cuerpo más detallado

[opcional] footer con referencias a issues
```

**Tipos permitidos:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato (no afectan el código)
- `refactor`: Refactorización de código
- `test`: Agregar o modificar tests
- `chore`: Tareas de mantenimiento

## Reglas de Código

### Nomenclatura
- Variables y funciones: `camelCase` o `snake_case` según el lenguaje
- Clases: `PascalCase`
- Constantes: `UPPER_SNAKE_CASE`
- Archivos: `kebab-case` o `snake_case` según el lenguaje

### Funciones
- Máximo 30 líneas por función
- Máximo 3 parámetros (usar objeto si se necesitan más)
- Una responsabilidad por función

### Archivos
- Máximo 300 líneas por archivo
- Un archivo = Un módulo/compuesto/clase principal

## Revisión de Código
- Todo código debe ser revisado antes de merge
- Al menos 1 aprobación requerida
- Tests deben pasar
- Documentación actualizada si aplica

## Preguntas Frecuentes

### ¿Por qué TDD?
- Detecta bugs temprano
- Documenta comportamiento esperado
- Facilita refactorizaciones
- Reduce tiempo de depuración

### ¿Por qué YAGNI?
- Evita sobreingeniería
- Reduce deuda técnica
- Acelera entrega de valor
- Mantén el código simple

### ¿Cuándo refactorizar?
- Solo después de tener tests verdes
- Solo si mejora claridad o elimina duplicación real
- Nunca "por si acaso" o "para el futuro"
