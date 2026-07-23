# Kavana Engineering Standard

*Filosofía interna de desarrollo de software en Kavana Systems.*

---

## 1. Principios Fundamentales

### 1.1. El problema primero, la tecnología después
Ninguna decisión técnica se toma sin antes responder:  
**¿Qué problema de negocio resuelve esto?**

### 1.2. Las decisiones son humanas, la IA ejecuta
El arquitecto diseña y decide. La IA actúa como par de programación.

### 1.3. Documentar es construir infraestructura
Un módulo sin ADR no está terminado. Una decisión sin alternativas no está justificada.

### 1.4. Transparencia total
✅ Lo implementado · 🚧 Lo pendiente · ❌ Lo descartado — todo visible.

---

## 2. Estructura del Repositorio

```
/
├── backend/               # API / lógica de negocio
├── frontend/              # Interfaz de usuario
├── docs/
│   ├── adr/               # ADRs
│   ├── commercial/        # Documentación de negocio
│   ├── technical/         # Documentación técnica
│   ├── HISTORY.md         # Evolución del proyecto
│   └── METRICS.md         # Métricas de código
├── database/              # Migraciones + seeds
├── .github/workflows/     # CI/CD
├── README.md              # Portal de entrada
├── SECURITY.md
├── CONTRIBUTING.md
└── LICENSE
```

---

## 3. README — Portal de entrada

Debe responder en 30 segundos:
1. **Problema** que resuelve
2. **Solución** (arquitectura en 60s)
3. **Stack** (por qué cada tecnología)
4. **Estado real** (✅ y 🚧)
5. **Cómo ejecutar**

---

## 4. ADR — Architectural Decision Records

Cada ADR debe incluir:
- **Contexto** → **Alternativas evaluadas** (≥2) → **Decisión** → **Consecuencias**

Nunca documentes solo lo que hiciste. Documenta **por qué**.

---

## 5. Calidad

- TDD: tests antes del código
- Commits convencionales: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- CI/CD obligatorio (GitHub Actions)
- Sin secrets en el repo (`.env.example`)
- Cobertura mínima 80% en lógica de negocio

---

## 6. Arquitectura SaaS

- **Multi-tenancy con RLS** (no schema-per-tenant)
- **Feature flags** como producto (JSONB, activación sin deploy)
- **Offline-first** como requisito, no añadido

---

## 7. Portfolio

- Rama `portfolio` sin tooling de IA
- `HISTORY.md` con evolución
- `METRICS.md` con datos reales
- Transparencia sobre lo implementado vs pendiente
- GitHub Releases versionadas

---

## 8. Checklist de Publicación

- [ ] README actualizado (problema → solución → stack → estado)
- [ ] Tests verdes
- [ ] Enlaces válidos
- [ ] ADRs documentados
- [ ] SECURITY.md + LICENSE + .env.example
- [ ] Rama `portfolio` limpia
- [ ] GitHub Releases creadas

---

*Este estándar es vivo. Se actualiza con cada proyecto.*

*Kavana Systems — Ingeniería con criterio.*
