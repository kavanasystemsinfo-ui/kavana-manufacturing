# Simulador de la demo de Manufacturing (SnackPro)

La demo pública (tenant 100, base `kavana_mes`) se mantiene "viva" con un simulador
sin IA, determinista y que se puede relanzar las veces que haga falta.

## Calendario de planta (hora de Madrid)

- **Jornada del día D (lunes a viernes)**: de las 22:00 de D-1 a las 22:00 de D, en tres turnos:
  Noche 22:00-06:00 (pertenece al día en que termina), Mañana 06:00-14:00, Tarde 14:00-22:00.
- La semana empieza el **domingo a las 22:00** y acaba el **viernes a las 22:00**. No hay noche de viernes.
- **Sábados de refuerzo**: 1 o 2 al mes, solo mañana (06:00-14:00) y con menos puestos. Los elige una
  semilla del mes, así que son siempre los mismos para un mes dado.
- Resto del fin de semana: planta cerrada, sin datos.

La lógica vive dos veces: `frontend/src/utils/planta-calendario.ts` (pantalla) y
`scripts/planta-calendario.cjs` (simulador). `planta-calendario.spec.ts` comprueba que dan lo mismo
durante un año entero; si cambias una, cambia la otra.

## Qué hace el cron

`5 * * * *` en el VPS (UTC) ejecuta `simulate_manufacturing_daily.sh`, que lanza
`simulate-manufacturing-demo.cjs` (desplegado como `simulate-daily-manufacturing.cjs` en
`/root/.hermes/profiles/kavana/scripts/manufacturing-sim/`, junto a `db.cjs` y `planta-calendario.cjs`):

1. Retira la actividad del simulador de los últimos 3 días que caiga fuera del calendario.
2. Caduca las órdenes de visitantes (24 h) y cierra las órdenes en curso de jornadas anteriores.
3. Regenera la **jornada en curso** hasta "ahora" (borra y vuelve a crear las órdenes y partes que
   creó el simulador en esa jornada). Con la planta cerrada no genera nada.
   Hasta 90 minutos después del fin de la jornada la deja completa.

Los partes de cada puesto salen de repartir cada turno entre los puestos de un mismo operario (la tabla
tiene una restricción de exclusión por operario y rango horario).

## Uso a mano

```bash
export PGHOST=... PGPASSWORD=... PGDATABASE=kavana_mes
node simulate-daily-manufacturing.cjs                 # jornada en curso
node simulate-daily-manufacturing.cjs 2026-11-13      # regenerar una jornada entera
node simulate-daily-manufacturing.cjs --limpiar=10    # además, revisar 10 días atrás por datos fuera de calendario
tail -50 /var/log/manufacturing-demo-daily.log        # ver las últimas ejecuciones
```

`scripts/simulate-daily-manufacturing.cjs` (planta solar, tenant 1) es el simulador antiguo y no corre en el VPS.

## La pestaña "Línea en vivo"

Lee los partes reales de cada puesto con `GET /oee/live-timeline?startDate&endDate` (un turno) y el OEE
con `GET /oee/workstations`. No inventa nada: lo que no tiene parte se pinta como "sin parte registrado".
La franja llega hasta el último dato disponible; el simulador de la demo lo avanza cada hora.
