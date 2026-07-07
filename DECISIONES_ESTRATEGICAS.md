# DECISIONES ESTRATÉGICAS - KAVANA V3

## 2026-06-24: Refactorización a Bloques de Trabajo Retrospectivos

**Contexto:**
El modelo de datos original para el registro de tiempos (Fase 3) se basaba en una máquina de estados estricta en tiempo real. El operario pulsaba un botón de "Iniciar", luego "Pausar" o "Terminar". 

**Problema:**
En la realidad del suelo de fábrica (MES Industrial), los operarios muchas veces no interactúan con el sistema en tiempo real. Registrar un evento a posteriori rompía la lógica FIFO de la máquina de estados y requería una complejidad técnica enorme para reordenar eventos.

**Decisión:**
Se abandona la máquina de estados en tiempo real. 
Adoptamos un enfoque de recolección de datos asíncrono y retrospectivo mediante "Bloques de Trabajo" (`work_blocks`).
- Un registro ya no es un "evento" (start/stop), sino un rango de tiempo (`start_time`, `end_time`) con su producción y mermas.
- El HMI offline-first pasa de tener botones gigantes a un formulario limpio.
- El sistema es más tolerante a retrasos, a trabajos de múltiples operarios simultáneos y a la carga manual de datos del turno anterior.

**Regla de Negocio Crítica:**
Para mantener la integridad, el backend aplica una validación estricta de solapamiento: un mismo operario (`operator_id`) NO puede tener dos bloques de trabajo que se solapen en el tiempo, sin importar en qué orden de producción esté trabajando.

**Impacto:**
- Simplifica la base de datos (desaparece `production_time_logs` y nace `production_work_blocks`).
- Simplifica la máquina de estados del backend (solo gestionamos `pendiente`, `en_produccion`, `completada`).
- Prepara Kavana V3 para su integración futura con ERPs y PLCs que vuelcan datos en bloque.

## 2026-06-25: Renderizado Dinámico de Custom Fields — Separación de Responsabilidades

**Contexto:**
La Fase 5.4 requería que el HMI del operario mostrara los campos personalizados definidos por el administrador del tenant (ej. "Grosor Bobina", "Color Lacado"). La primera implementación tenía datos mockeados ("12.5" / "Acero Galva") y usaba `any` en el store.

**Problema:**
Mezclar la lógica de cruce (schema del admin vs. valores de la orden) dentro del componente React ensuciaría el JSX, haría imposible testear la lógica sin montar un componente, y el uso de `any` en un store global abría la puerta a errores silenciosos en runtime.

**Decisión:**
1. **Tipado fuerte:** Se creó la interfaz `ProductionOrder` con `custom_fields?: Record<string, any>`, eliminando `any` del estado global del store.
2. **Pure function extractor:** Se extrajo la lógica de cruce a `utils/customFieldsMapper.ts` (`mapCustomFieldsToUI`), una función pura 100% testeable sin dependencias de React.
3. **Fallback resiliente:** Si un administrador borra un campo del schema mientras hay órdenes pendientes, el sistema NUNCA oculta el dato. Capitaliza la key cruda (ej. `grosor_bobina` → "Grosor bobina") y sigue mostrando el valor al operario. Ocultar datos en un MES industrial podría causar un error de fabricación.
4. **Selectores Zustand optimizados:** Se usan selectores específicos (`state => state.activeOrder?.custom_fields`) para evitar re-renders innecesarios en la tablet del operario.

**Regla de Negocio Crítica:**
Los valores de `custom_fields` de una orden son inmutables desde el punto de vista del operario. Solo el administrador puede modificar el schema global, y los valores ya guardados en órdenes existentes permanecen intactos.

**Impacto:**
- Fase 5.4 completada al 100%.
- 12 tests unitarios en verde (4 suites: client, hmi-store, local-db, customFieldsMapper).
- El ciclo completo Admin → Backend → HMI de Custom Fields queda cerrado y blindado.
