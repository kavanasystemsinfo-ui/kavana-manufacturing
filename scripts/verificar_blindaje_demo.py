#!/usr/bin/env python3
"""Verifica contra la demo real (nginx :8080 → backend :3001 → Postgres local)
el alcance nuevo del blindaje: DELETE bloqueado, movimiento de estado permitido.

Uso: python3 verificar_blindaje_demo.py
No imprime credenciales ni tokens.
"""
import json
import urllib.error
import urllib.request

BASE = "http://localhost:8080"
ORIGIN = "http://localhost:8080"
USUARIO = {"subdomain": "demo", "username": "047", "password": "kavana"}

resultados: list[tuple[bool, str]] = []


def call(method, path, token=None, body=None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Origin", ORIGIN)
    if token:
        req.add_header("Authorization", "Bearer " + token)
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, data, timeout=20) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def check(ok: bool, descripcion: str, detalle: str = "") -> None:
    resultados.append((ok, f"{descripcion}{(' · ' + detalle) if detalle else ''}"))


# 1. Login real por la puerta del navegador (con Origin, que curl no manda por defecto)
status, texto = call("POST", "/api/v1/auth/login-by-tenant", body=USUARIO)
check(status == 200 or status == 201, "login del supervisor por la demo", f"HTTP {status}")
if status not in (200, 201):
    print("LOGIN FALLIDO:", texto[:300])
    raise SystemExit(1)
token = json.loads(texto)["token"]

# 2. Datos reales del tenant demo
status, texto = call("GET", "/api/v1/orders?status=in_progress&limit=1", token)
check(status == 200, "GET /orders con filtro en servidor", f"HTTP {status}")
orden = json.loads(texto)[0]
orden_id, estado_original = orden["id"], orden["status"]

status, texto = call("GET", "/api/v1/incidencias", token)
inc = json.loads(texto)[0]
inc_id, inc_estado_original = inc["id"], inc["status"]

status, texto = call("GET", "/api/v1/workstations", token)
puesto = json.loads(texto)[0]
puesto_id, puesto_nombre = puesto["id"], puesto["name"]

# 3. Mover el ESTADO de una orden: ahora debe persistir
status, _ = call("PUT", f"/api/v1/orders/{orden_id}", token, {"status": "completed"})
check(status == 200, "PUT /orders/:id (mover estado) permitido", f"HTTP {status}")
status, texto = call("GET", f"/api/v1/orders/{orden_id}", token)
check(json.loads(texto)["status"] == "completed", "el cambio de estado PERSISTE en la base")
call("PUT", f"/api/v1/orders/{orden_id}", token, {"status": estado_original})

# 4. Borrar una orden sigue blindado
status, texto = call("DELETE", f"/api/v1/orders/{orden_id}", token)
check(status == 403 and "Demo de solo lectura" in texto, "DELETE /orders/:id bloqueado", f"HTTP {status}")

# 5. Mover el ESTADO de una incidencia: ahora debe persistir
status, _ = call("PUT", f"/api/v1/incidencias/{inc_id}", token, {"status": "resuelto"})
check(status == 200, "PUT /incidencias/:id (mover estado) permitido", f"HTTP {status}")
status, texto = call("GET", "/api/v1/incidencias", token)
actual = next(i["status"] for i in json.loads(texto) if i["id"] == inc_id)
check(actual == "resuelto", "el cambio de estado de la incidencia PERSISTE")
call("PUT", f"/api/v1/incidencias/{inc_id}", token, {"status": inc_estado_original})

# 6. Borrar una incidencia del histórico: el agujero que había
status, texto = call("DELETE", f"/api/v1/incidencias/{inc_id}", token)
check(status == 403 and "Demo de solo lectura" in texto, "DELETE /incidencias/:id bloqueado", f"HTTP {status}")

# 7. El catálogo sigue cerrado a ediciones
status, texto = call("PUT", f"/api/v1/workstations/{puesto_id}", token, {"name": puesto_nombre + " (visitante)"})
check(status == 403, "PUT /workstations/:id (catálogo) sigue bloqueado", f"HTTP {status}")

# 8. La ficha sigue viva
status, _ = call("GET", "/api/v1/orders?limit=1", token)
check(status == 200, "la demo sigue sirviendo datos tras los cambios", f"HTTP {status}")

print("\nRESULTADO")
for ok, descripcion in resultados:
    print(f"  {'OK ' if ok else 'FALLO'} {descripcion}")
print(f"\n{sum(1 for ok, _ in resultados if ok)}/{len(resultados)} comprobaciones en verde")
raise SystemExit(0 if all(ok for ok, _ in resultados) else 1)
