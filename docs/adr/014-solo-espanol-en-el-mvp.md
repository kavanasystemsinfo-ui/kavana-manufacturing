# ADR-014: Solo español en el MVP

**Estado**: Aceptada (2026-11-02)
**Contexto**: Fase 5 del rediseño del panel de operario (móvil, tableta, inglés, cierre de turno).
**Revisar si**: aparece un cliente con operarios que no leen español, una planta fuera de España o una demo dirigida a un público internacional.

## Contexto

Todos los textos del panel están escritos directamente en español dentro del código. Ofrecer una versión en inglés supone sacar cada texto a un diccionario, mantener dos versiones de cada frase nueva y revisar que no queden textos a medias, en este panel y después en supervisor y administrador. No hay ninguna librería de idiomas montada, solo formato de fechas y números.

## Decisión

**El producto es para público español y no tendrá multi-idioma en el MVP.** Se descarta la versión en inglés.

## Consecuencias

- Se evita un coste de mantenimiento permanente sin retorno para el público objetivo.
- Los textos se siguen escribiendo en español directamente en los componentes.
- El esfuerzo se dedica a que el lenguaje sea corriente y entendible para quien no usa ordenador a diario (ver ADR-013, punto 4).
