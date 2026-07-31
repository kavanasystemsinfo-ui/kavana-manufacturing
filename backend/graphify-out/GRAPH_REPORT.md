# Graph Report - backend  (2026-07-07)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 470 nodes · 991 edges · 18 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.7)
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
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]

## God Nodes (most connected - your core abstractions)
1. `getTenantContext()` - 41 edges
2. `tenantQuery()` - 32 edges
3. `TenantCapabilitiesService` - 22 edges
4. `CoreMesProductionService` - 20 edges
5. `postgresPool` - 20 edges
6. `OrdersService` - 14 edges
7. `CoreMesProductionController` - 13 edges
8. `GlobalAdminService` - 13 edges
9. `OrdersController` - 13 edges
10. `UsersService` - 13 edges

## Surprising Connections (you probably didn't know these)
- `bootstrap()` --indirect_call--> `AppModule`  [INFERRED]
  src/main.ts → src/app.module.ts
- `tenantQuery()` --calls--> `getTenantContext()`  [EXTRACTED]
  src/db/tenant-query.ts → src/auth/tenant-context.storage.ts
- `CacheEntry` --references--> `TenantCapabilities`  [EXTRACTED]
  src/tenant-capabilities/capabilities-cache.ts → src/tenant-capabilities/capabilities.interface.ts
- `JwtPayload` --references--> `KavanaRole`  [EXTRACTED]
  src/auth/jwt-payload.interface.ts → src/auth/tenant-context.interface.ts
- `withTenantTransaction()` --calls--> `getTenantContext()`  [EXTRACTED]
  src/db/withTenantTransaction.ts → src/auth/tenant-context.storage.ts

## Import Cycles
- None detected.

## Communities (18 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (29): CostController, Body, Controller, Get, Param, Post, RequireFeature, CostEntry (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (23): getTenantContext(), CoreMesProductionController, Body, Controller, Get, Inject, Param, Patch (+15 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (32): Catch, Global, AppModule, Module, jwtService, { verifyBearerTokenMock }, TenantContextMiddleware, Injectable (+24 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (17): mockTenantQuery, tenantQuery(), CreateOrderDto, CreateOrderDtoSchema, UpdateOrderDto, UpdateOrderDtoSchema, OrdersController, Body (+9 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (19): RequireRole, JwtPayload, JwtServiceWrapper, Injectable, RequireRole(), RolesGuard, mockGetTenantContext, Inject (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (17): GlobalAdminController, Body, Controller, Delete, Get, Inject, Param, Patch (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (16): Inject, { mockQuery }, cache, CacheEntry, clearAllCachedCapabilities(), getCachedCapabilities(), invalidateCachedCapabilities(), setCachedCapabilities() (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (16): CreateManufacturingModelDto, CreateManufacturingModelDtoSchema, unitOfMeasureEnum, UpdateManufacturingModelDto, UpdateManufacturingModelDtoSchema, ManufacturingModelsController, Body, Controller (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (15): CreateUserDto, CreateUserDtoSchema, UpdateUserDto, UpdateUserDtoSchema, Body, Controller, Delete, Get (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (15): CreateWorkstationDto, CreateWorkstationDtoSchema, UpdateWorkstationDto, UpdateWorkstationDtoSchema, Body, Controller, Delete, Get (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (29): dependencies, dotenv, jsonwebtoken, @nestjs/common, @nestjs/core, @nestjs/platform-express, pg, reflect-metadata (+21 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (11): AuthLoginController, Body, Controller, Get, Inject, Param, Post, AuthLoginModule (+3 more)

### Community 12 - "Community 12"
Cohesion: 0.23
Nodes (6): Query, OeeController, Controller, Get, Param, RequireFeature

## Knowledge Gaps
- **46 isolated node(s):** `name`, `version`, `private`, `description`, `type` (+41 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getTenantContext()` connect `Community 1` to `Community 0`, `Community 3`, `Community 4`, `Community 6`, `Community 12`?**
  _High betweenness centrality (0.212) - this node is a cross-community bridge._
- **Why does `tenantQuery()` connect `Community 3` to `Community 8`, `Community 1`, `Community 9`, `Community 7`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Why does `postgresPool` connect `Community 0` to `Community 1`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 11`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _46 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.061016949152542375 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0977891156462585 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05537098560354374 - nodes in this community are weakly interconnected._