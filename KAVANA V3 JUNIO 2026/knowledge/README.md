# Knowledge Base KAVANA

Esta carpeta está pensada para centralizar documentos técnicos externos, especialmente documentos generados con NotebookLM u otras fuentes de contexto.

## Objetivo

Evitar que la IA tenga que buscar información dispersa. Todo documento relevante debe quedar indexado aquí.

## Estructura recomendada

```text
knowledge/
├── README.md
├── CONTEXT_SOURCES.md
├── NOTEBOOK_CONTEXT_INDEX.md
├── notebook/
│   └── README.md
└── technical/
    └── README.md
```

## Regla de uso

Cuando se cree o se reciba un documento técnico nuevo:

1. Guardarlo en `knowledge/notebook/` o `knowledge/technical/`.
2. Añadir una entrada en [`NOTEBOOK_CONTEXT_INDEX.md`](NOTEBOOK_CONTEXT_INDEX.md).
3. Actualizar [`CONTEXT_SOURCES.md`](CONTEXT_SOURCES.md).
4. Si afecta a reglas de negocio, actualizar [`DOMAIN_KNOWLEDGE_MAP.md`](../DOMAIN_KNOWLEDGE_MAP.md).
5. Si afecta a activos reutilizables, actualizar [`REUSABLE_ASSETS.md`](../REUSABLE_ASSETS.md).
