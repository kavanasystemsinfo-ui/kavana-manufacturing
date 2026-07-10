# Graph Report - frontend  (2026-07-07)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 266 nodes · 574 edges · 17 communities (14 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `eee3bac1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]

## God Nodes (most connected - your core abstractions)
1. `callApiWithTimeout()` - 47 edges
2. `ThemeToggle()` - 15 edges
3. `useThemeStore` - 15 edges
4. `useHmiStore` - 14 edges
5. `fetchCapabilities()` - 12 edges
6. `listWorkstations()` - 10 edges
7. `HelpModal()` - 9 edges
8. `listOrders()` - 8 edges
9. `TenantCapabilities` - 7 edges
10. `triggerSyncEngine()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `getTenant()` --calls--> `callApiWithTimeout()`  [EXTRACTED]
  src/api/admin-entities.ts → src/api/client.ts
- `Props` --references--> `ActivityBlock`  [EXTRACTED]
  src/components/ActivityFeed.tsx → src/api/supervisor.ts
- `WorkstationsTab()` --calls--> `listWorkstations()`  [EXTRACTED]
  src/AdminPanel.tsx → src/api/admin-entities.ts
- `OrdersTab()` --calls--> `listOrders()`  [EXTRACTED]
  src/AdminPanel.tsx → src/api/admin-entities.ts
- `ModulesTab()` --calls--> `fetchCapabilities()`  [EXTRACTED]
  src/AdminPanel.tsx → src/api/admin-entities.ts

## Import Cycles
- None detected.

## Communities (17 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (59): AdminPanel(), CustomFieldsTab(), EditableField, ModelsTab(), OrdersTab(), Tab, UsersTab(), WorkstationsTab() (+51 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (27): ModulesTab(), fetchCapabilities(), HEADERS, TenantCapabilities, toggleModuleCapability(), updateCustomFieldsSchema(), ModulesTab(), ClassicTenantAdminPanel() (+19 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (27): dependencies, dexie, react, react-dom, zustand, description, devDependencies, autoprefixer (+19 more)

### Community 3 - "Community 3"
Cohesion: 0.16
Nodes (23): callApiWithTimeout(), ActivityBlock, createManufacturingModel(), createOrder(), createUser(), createWorkstation(), deleteOrder(), fetchManufacturingModels() (+15 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (18): App(), AuthState, getInitialAuth(), OeeByWorkstation, OeeDashboard(), OeeSummary, QualityDashboard(), ThemeToggle() (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (19): createTenant(), deleteTenant(), getTenantStats(), GlobalTenant, listTenants(), TenantStats, toggleTenantModule(), updateTenant() (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (18): ClassicSupervisorPanel(), statusColors, statusLabels, Tab, ActivityFeed(), formatDuration(), formatTime(), Props (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (12): ClassicOperatorPanel(), statusLabels, HelpModal(), HelpModalProps, HelpSection, OPERATOR_HELP, onlineBadgeClass(), OperatorPanel() (+4 more)

## Knowledge Gaps
- **73 isolated node(s):** `name`, `version`, `private`, `description`, `type` (+68 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `callApiWithTimeout()` connect `Community 3` to `Community 0`, `Community 1`, `Community 4`, `Community 5`, `Community 7`?**
  _High betweenness centrality (0.165) - this node is a cross-community bridge._
- **Why does `ThemeToggle()` connect `Community 4` to `Community 0`, `Community 1`, `Community 5`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Why does `HelpModal()` connect `Community 7` to `Community 0`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _73 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07403846153846154 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09358974358974359 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._