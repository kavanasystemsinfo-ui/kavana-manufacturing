@echo off
echo ========================================
echo   Kavana V3 - Database Migration
echo ========================================

for %%f in (migrations\*.sql) do (
    echo Ejecutando %%f ...
    docker cp "%%f" kavana_v3_db:/tmp/migration.sql
    docker exec kavana_v3_db psql -U kavana -d kavana_v3 -f /tmp/migration.sql
    echo.
)

echo ========================================
echo   Migraciones completadas
echo ========================================
