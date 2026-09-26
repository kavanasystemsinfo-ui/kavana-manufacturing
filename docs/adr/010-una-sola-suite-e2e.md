# ADR-010: Una sola suite E2E, la que prueba la aplicación real

**Fecha:** 2026-09-23
**Estado:** Aceptado
**Contexto:** Pruebas end-to-end

## Contexto

Convivían dos suites E2E:

- `e2e/` en la raíz: mockeaba la API, **no la ejecutaba el CI**, y sin embargo era
  la que apuntaba el script `test:e2e` de la raíz.
- `frontend/e2e/`: va contra backend, frontend y base de datos reales, y es la que
  corre el job `e2e` del CI.

Dos verdades: quien ejecutaba el script creía haber validado la aplicación, y
había validado dobles.

## Decisión

Quedarse con la suite que prueba la aplicación real, **portar** antes lo único que
aportaba la otra (que el tema moderno pinte de verdad y que el administrador entre
y vea su panel), borrar la vieja y apuntar el script de la raíz a la que se
ejecuta en el CI.

La lógica de UI aislada se prueba donde corresponde: tests de componente con jsdom
y funciones puras, no con una copia de la aplicación.

## Alternativas evaluadas

| Alternativa | Pros | Contras | Decisión |
|---|---|---|---|
| Mantener las dos | Cobertura aparente | Ya causó confusión sobre qué valida el CI | Descartada |
| Convertir la de mocks en tests de componente | Cubre UI aislada | Es otro trabajo y ya hay tests de componente donde aportan | Descartada |
| Borrar la vieja y portar lo que valía | Un único punto de entrada | Se pierden casos con datos falsos que nadie ejecutaba | **Elegida** |

## Consecuencias

**Positivas:** lo que ejecuta el script es exactamente lo que valida el CI; un solo
sitio donde añadir un flujo; los tests que quedan afirman cosas sobre la aplicación
de verdad.

**Negativas:** los E2E son más lentos que unos con mocks (≈45 s la suite completa)
y necesitan una base de datos, que el CI levanta efímera.

**Señal de revisión:** si alguien añade un `e2e/` nuevo en la raíz, o si un test
empieza a mockear la API para pasar.

## Archivos

- `frontend/playwright.config.ts`
- `frontend/e2e/`: suite única
- `package.json`: script `test:e2e`
- `.github/workflows/ci.yml`: job `e2e`
