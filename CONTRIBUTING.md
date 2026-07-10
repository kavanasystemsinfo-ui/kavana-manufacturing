# Contributing a Kavana Manufacturing

Guía para contribuidores al proyecto Kavana MES SaaS.

## Estado del documento

- **Última actualización:** 2026-07-07. Unificación completada, guías en todos los paneles, type casting hardening, Graphify integrado.

---

## Filosofía de Desarrollo

### TDD (Test-Driven Development)

Kavana sigue TDD estricto: **test primero, código después**.

```
1. Escribir test que falle (RED)
2. Escribir código mínimo para que pase (GREEN)
3. Refactorizar sin romper tests (REFACTOR)
```

**Por qué:** Los tests son documentación viva del comportamiento. Sin tests, refactoring es adivinanza.

### YAGNI (You Aren't Gonna Need It)

No implementar funcionalidad hasta que sea necesaria. 

**Ejemplo:** No crear un servicio de cache hasta que haya un problema de performance medido.

---

## Flujo de Trabajo

### 1. Antes de Empezar

```bash
# Instalar dependencias
npm install

# Verificar que todo pase
npm run test
npm run lint
```

### 2. Crear Feature Branch

```bash
git checkout -b feature/nombre-descriptivo
# Ejemplo: git checkout -b feature/offline-sync-fifo
```

### 3. Ciclo TDD

```bash
# Ejecutar tests en watch mode
npm run test:watch

# Para backend (NestJS)
cd backend && npm run test:watch

# Para frontend (React)
cd frontend && npm run test:watch
```

### 4. Documentation Loop (OBLIGATORIO)

**Regla:** Un cambio sin documentación es un cambio incompleto. La documentación es parte del código, no un adicionado.

Después de cada cambio de código que pase tests, actualizar documentación en este orden exacto:

1. `docs/roadmap.md` — Actualizar estado de fase y conteo de tests.
2. `docs/decisions-log.md` — Si se tomó una decisión técnica (nueva arquitectura, elección de librería, trade-off).
3. `docs/technical/XX_<doc-afectado>.md` — El documento técnico afectado por el cambio.
4. `docs/audit/changelog.md` — Si es funcionalidad nueva o cambio significativo.
5. `docs/commercial/*.md` — Si el cambio afecta valor de negocio o presentación del portfolio.
6. `CONTRIBUTING.md` — Si se introdujeron nuevas convenciones.

**Checklist de documentación:**
- [ ] ¿Qué cambié? (descripción concisa)
- [ ] ¿Por qué lo cambié? (contexto de negocio/técnico)
- [ ] ¿Qué tests agregué/modifiqué?
- [ ] ¿Cómo valido el cambio? (comandos de verificación)
- [ ] ¿Qué riesgos pendientes quedan?

### 5. Commits Convencionales

Usar [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: agregar sync FIFO para bloques offline
fix: corregir timeout de AbortController a 4s
test: agregar tests para FeatureGuard
docs: actualizar ADR-003 con justificación de timeout
refactor: extraer sync logic a servicio separado
```

**Formato:** `<type>(<scope>): <description>`

| Type | Descripción |
|------|-------------|
| `feat` | Nueva funcionalidad |
| `fix` | Bug fix |
| `test` | Agregar o modificar tests |
| `docs` | Documentación |
| `refactor` | Refactoring sin cambio de comportamiento |
| `chore` | Tareas de mantenimiento |

### 5. Pull Request

```bash
git push origin feature/nombre-descriptivo
# Abrir PR con:
# - Título descriptivo
# - Descripción del cambio
# - Reference a ADR si aplica
# - Tests pasando
```

---

## Convenciones de Código

### Backend (NestJS + Prisma)

```typescript
// ✅ Bien — Controlador con @Inject() explícito
@Controller('users')
export class UsersController {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
  ) {}
}

// ✅ Bien — Servicio inyectable
@Injectable()
export class ProductionService {
  constructor(private prisma: PrismaService) {}

  async getOrder(id: string, tenantId: string) {
    return this.prisma.core_orders.findFirst({
      where: { id, tenant_id: tenantId }
    });
  }
}

// ❌ Mal — Controlador sin @Inject() (falla bajo tsx watch)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}

// ❌ Mal — Servicio sin inyección de dependencias
export class ProductionService {
  getOrder(id) {
    return db.query(`SELECT * FROM orders WHERE id = ${id}`);
  }
}
```

**⚠️ REGLA OBLIGATORIA para controladores:** `tsx watch` (runtime de desarrollo) no emite `emitDecoratorMetadata`. Todos los controladores NestJS DEBEN usar `@Inject(ServiceClass)` explícito en el constructor. Ver `docs/decisions-log.md` para detalles.

### Frontend (React + Tailwind)

```tsx
// ✅ Bien
const HMIButton = ({ onClick, children }: Props) => (
  <button
    onClick={onClick}
    className="min-h-[64px] min-w-[64px] bg-blue-600 ..."
  >
    {children}
  </button>
);

// ❌ Mal
const HMIButton = (props) => (
  <button onClick={props.onClick} className="btn">
    {props.children}
  </button>
)
```

### Testing

```typescript
// ✅ Bien - Test de comportamiento
it('debe rechazar acceso si tenant no tiene feature habilitada', async () => {
  const guard = new FeatureGuard(mockPrisma);
  mockPrisma.tenant_features.findUnique.mockResolvedValue({
    features: { mes: false }
  });

  const result = await guard.canActivate(mockContext);

  expect(result).toBe(false);
});

// ❌ Mal - Test de implementación
it('debe llamar findUnique', async () => {
  await guard.canActivate(mockContext);
  expect(mockPrisma.tenant_features.findUnique).toHaveBeenCalled();
});
```

---

## Estructura del Proyecto

```
kavana-v3/
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── auth/              # JWT, roles, tenant context
│   │   ├── core-mes-production/ # Lógica de producción
│   │   ├── tenant-capabilities/ # Feature flags
│   │   └── prisma/            # Schema y migraciones
│   └── test/
├── frontend/                   # React HMI
│   ├── src/
│   │   ├── components/
│   │   │   └── operator/      # Componentes HMI
│   │   ├── store/             # Zustand state
│   │   └── lib/               # Dexie.js DB
│   └── __tests__/
├── docs/
│   ├── adr/                   # Architectural Decision Records
│   ├── technical/             # Documentación técnica
│   └── commercial/            # Documentación de negocio
└── KAVANA_RULES.md            # Reglas del proyecto
```

---

## Reglas Críticas

### Seguridad

1. **Nunca hardcodear secrets** — Usar variables de entorno
2. **RLS siempre activo** — Nunca deshabilitar en producción
3. **Mock tokens solo en dev** — `ALLOW_MOCK_AUTH=false` en producción

### Offline-First

1. **Nunca perder datos** — Todo se almacena local primero
2. **Sync FIFO** — Respetar orden de `timestamp`
3. **AbortController 4s** — No bloquear UI

### UX HMI

1. **Touch targets ≥ 64px** — Mínimo para guantes industriales
2. **Feedback visual** — Confirmar cada acción
3. **Sin dependencia de audio** — Alertas visuales siempre

---

## Testing

### Comandos Útiles

```bash
# Tests completos
npm run test

# Tests de backend
cd backend && npm run test

# Tests de frontend
cd frontend && npm run test

# Coverage
npm run test:coverage

# Lint
npm run lint

# Typecheck
npm run typecheck
```

### Cobertura Esperada

- **Auth/Roles/Tenant:** 100%
- **Core Business Logic:** 90%+
- **UI Components:** 80%+
- **Utilities:** 95%+

---

## Convenciones de Código

### Sistema de Temas Dual

Kavana soporta dos estilos visuales: **Clásico ERP** y **Moderno Kavana**.

**Reglas para nuevos componentes:**
1. Crear variante moderna en `NombrePanel.tsx`
2. Crear variante clásica en `ClassicNombrePanel.tsx`
3. Ambas variantes usan el mismo Zustand store
4. Routing en `App.tsx` selecciona variante según `localStorage.getItem('kavana_theme')`

**Estilo Clásico ERP:**
- Tablas HTML estándar (`<table>`, `<thead>`, `<tbody>`)
- Fondos claros (`bg-slate-50`, `bg-white`)
- Bordes sutiles (`border-slate-200`)
- Badges de estado con colores semánticos
- Botones estándar (`bg-blue-600 text-white`)

**Estilo Moderno Kavana:**
- Tarjetas con bordes redondeados (`rounded-2xl`)
- Fondos oscuros (`bg-kavana-dark`, `bg-kavana-panel`)
- Gradientres sutiles (`bg-gradient-to-br`)
- Toggle switches para estados
- Acentos naranja (`bg-kavana-orange`)

**Ejemplo:**
```tsx
// ClassicnombrePanel.tsx
export function ClassicNombrePanel() {
  return (
    <div className="min-h-screen bg-slate-50">
      <table className="min-w-full divide-y divide-slate-200">
        {/* Contenido tabla */}
      </table>
    </div>
  );
}

// NombrePanel.tsx
export function NombrePanel() {
  return (
    <div className="min-h-screen bg-kavana-dark">
      <div className="rounded-2xl bg-kavana-panel">
        {/* Contenido tarjetas */}
      </div>
    </div>
  );
}
```

### Naming de Archivos

- `NombrePanel.tsx` → Variante moderna
- `ClassicNombrePanel.tsx` → Variante clásica
- `store/hmi-store.ts` → Store compartido
- `api/client.ts` → Cliente API con timeout 4s

---

## Documentación

### ADR (Architectural Decision Records)

Para decisiones arquitectónicas significativas, crear ADR en `docs/adr/`:

```markdown
# ADR-XXX: Título

**Status:** Aceptada/Rechazada/Deprecated
**Fecha:** YYYY-MM
**Decisor:** Nombre

## Contexto
## Opciones Evaluadas
## Decisión
## Consecuencias
```

### Decisions Log

Actualizar `docs/decisions-log.md` con cada decisión significativa, incluyendo:
- Qué se decidió
- Por qué se decidió
- Qué se aprendió

---

## Preguntas Frecuentes

### ¿Cuándo usar RLS vs lógica de aplicación?

**RLS siempre.** La lógica de aplicación es frágil (depende de que el código esté bien). RLS es enforcement a nivel de DB.

### ¿Cuándo crear un nuevo ADR?

Cuando la decisión:
1. Afecta la arquitectura general
2. Tiene alternativas significativas
3. Tiene consecuencias a largo plazo

### ¿Cómo manejar conflictos de merge?

1. `git fetch origin`
2. `git rebase origin/main`
3. Resolver conflictos
4. `git push origin feature/branch`

---

## Contacto

- **Lead Developer:** Jorge Luis Parra
- **Documentación:** `docs/`
- **Issues:** GitHub Issues
