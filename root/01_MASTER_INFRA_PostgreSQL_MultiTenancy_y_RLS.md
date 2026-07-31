Este manual técnico constituye la especificación de ingeniería definitiva para el motor de aislamiento de Kavana Manufacturing, fundamentado en el análisis exhaustivo de las fuentes técnicas y la documentación interna del motor PostgreSQL 16.
1. ARQUITECTURA DE ESQUEMA COMPARTIDO (SHARED-SCHEMA)
La arquitectura de esquema compartido es el modelo de multi-tenencia donde todos los inquilinos coexisten en una única base de datos lógica, compartiendo tablas y relaciones, diferenciados únicamente por una columna de aislamiento, típicamente tenant_id.

    Ventajas de Ingeniería y Escalabilidad:
        Densidad de Inquilinos: Permite escalar a miles de inquilinos sin incurrir en el "bloqueo de catálogo". A diferencia del modelo de esquema por inquilino, donde cada tabla e índice adicional consume entradas en pg_class y pg_attribute, el esquema compartido mantiene un catálogo delgado, evitando que el planificador de consultas se degrade al consultar metadatos masivos.
        Simplicidad de Ciclo de Vida: Las migraciones de esquema se ejecutan una sola vez para todos los inquilinos, eliminando el riesgo de deriva de esquema (schema drift) y reduciendo el tiempo de despliegue de horas a segundos.
        Eficiencia de Recursos: Maximiza el uso del buffer cache y el pool de conexiones. En modelos de base de datos por inquilino, cada base de datos requiere su propio pool en PgBouncer, lo que agota rápidamente el límite de max_connections del servidor.
    Inconvenientes y Riesgos Críticos:
        Fragilidad del Filtrado Manual: Depender de cláusulas WHERE tenant_id = ? en la capa de aplicación es un "punto único de falla" humano. Un solo error en un comando de gestión, tarea de Celery o consulta SQL cruda resulta en una fuga masiva de datos (IDOR).
        Efecto "Noisy Neighbor" (Vecino Ruidoso): Al compartir recursos físicos (CPU, E/S de disco), una consulta costosa de un inquilino degrada el rendimiento de todos los demás.
        Presión de Vacuum: Las operaciones masivas de DELETE o UPDATE generan una acumulación de tuplas muertas (bloat) que afecta el rendimiento global de la tabla compartida.

2. IMPLEMENTACIÓN PASO A PASO DE RLS
Para Kavana Manufacturing, el aislamiento debe ser Fail-Closed (cerrado por defecto): si no hay un inquilino definido, el sistema debe devolver cero filas en lugar de todas.
Paso A: Definición de la Infraestructura de Inquilinos
Se recomienda el uso de BIGINT para el tenant_id por ser más compacto y rápido de comparar que identificadores de texto.

CREATE TABLE tenants (
    tenant_id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'trial'))
);

CREATE TABLE client_data (
    id BIGSERIAL,
    tenant_id BIGINT NOT NULL REFERENCES tenants(tenant_id),
    payload TEXT,
    PRIMARY KEY (tenant_id, id)
);

Paso B: Configuración del Contexto de Sesión (GUC)
Utilizaremos variables de configuración unificada (GUC) para inyectar la identidad del inquilino en la transacción actual.

-- Función wrapper optimizada para extraer el contexto
CREATE OR REPLACE FUNCTION get_current_tenant() 
RETURNS BIGINT AS $$
    -- missing_ok = true es vital para permitir flujos no autenticados sin abortar transacciones
    SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::BIGINT;
$$ LANGUAGE sql STABLE LEAKPROOF;

    STABLE: Indica que el resultado no cambia dentro de una misma consulta, permitiendo optimizaciones del planificador.
    LEAKPROOF: Certifica que la función no revela datos de filas invisibles a través de errores o canales laterales, permitiendo que el optimizador la ejecute antes que otros filtros menos seguros.

Paso C: Activación de Seguridad de Confianza Cero
El propietario de la tabla debe estar sujeto a las políticas para evitar fugas si la aplicación se conecta con credenciales administrativas.

ALTER TABLE client_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_data FORCE ROW LEVEL SECURITY;

Paso D: Declaración de Políticas de Aislamiento
Se deben cubrir todas las operaciones (SELECT, INSERT, UPDATE, DELETE).

CREATE POLICY tenant_isolation_policy ON client_data
    FOR ALL
    TO public
    USING (tenant_id = get_current_tenant())
    WITH CHECK (tenant_id = get_current_tenant());

    USING: Actúa como un filtro invisible para lecturas y eliminaciones.
    WITH CHECK: Actúa como una restricción de integridad para impedir que un inquilino inserte datos con el ID de otro.

3. CASOS DE ESQUINA (EDGE CASES) Y CONSULTAS COMPLEJAS
El motor de RLS de Postgres actúa como un Query Rewriter, inyectando automáticamente la política antes de la ejecución física.

    JOINs Multi-tabla: Al unir tabla_a y tabla_b, Postgres aplica de forma independiente las políticas de cada tabla antes de realizar el JOIN. Si ambas tienen RLS habilitado, el aislamiento se mantiene incluso en consultas de agregación complejas.
    Integridad Referencial y Eliminaciones en Cascada: Los disparadores de claves foráneas (ON DELETE CASCADE) operan a nivel de sistema y omiten RLS de forma deliberada para evitar registros huérfanos. Esto significa que una eliminación en la tabla padre purgará registros hijos independientemente de la visibilidad del usuario actual.
    Condiciones de Carrera en Subconsultas: En el modo READ COMMITTED, una subconsulta dentro de una política puede leer una versión antigua de una fila (snapshot inicial), mientras que la consulta principal lee una fila actualizada. Para evitar filtraciones accidentales por desactualización de permisos, se debe usar SELECT ... FOR SHARE dentro de las funciones de política.
    Vulnerabilidad de ID Únicos Globales: Un índice UNIQUE global filtrará información: si un usuario intenta insertar un valor que ya existe en otro inquilino, recibirá un error de "clave duplicada", confirmando la existencia de datos ajenos. La solución es incluir siempre el tenant_id en la restricción de unicidad: UNIQUE (tenant_id, remote_id).

4. PLANES DE EJECUCIÓN Y OPTIMIZACIÓN DE ÍNDICES
La adopción de RLS introduce una penalización latente en el tiempo de planificación y puede invalidar índices existentes si no se estructuran correctamente.

    La Regla de la Columna Líder: Todo índice en una tabla RLS debe comenzar con la columna de aislamiento (tenant_id). Un índice sobre (id) forzará un Sequential Scan masivo porque Postgres necesita filtrar primero por tenant_id para garantizar la seguridad.
    Estructura de Clave Primaria para Kavana Manufacturing:
        Patrón A (Prioridad del Inquilino): PRIMARY KEY (tenant_id, id). Es la estructura óptima. Mejora las lecturas en un 1.7x y las eliminaciones en cascada hasta 57x comparado con índices simples, al permitir búsquedas directas en el árbol B-Tree que satisfacen tanto la seguridad como la búsqueda de entidad.
    Forzar Index-Only Scans: Utilizando la cláusula INCLUDE, se pueden crear índices de cobertura que eliminen los "Heap Fetches" (lecturas de disco al montón de datos).

CREATE INDEX idx_client_data_coverage 
ON client_data (tenant_id, id) 
INCLUDE (payload);

    Optimización InitPlan vs SubPlan: Si una política llama a una función para validar permisos complejos (ej. check_user_permission()), Postgres puede ejecutar esa función por cada fila evaluada, lo que destruye el rendimiento. La técnica de la subconsulta (InitPlan): Envolver la función en un SELECT dentro de la política obliga a Postgres a ejecutarla una sola vez al inicio de la consulta y cachear el resultado.

-- Política de alto rendimiento con InitPlan
CREATE POLICY optimized_policy ON client_data
    FOR SELECT
    USING (
        tenant_id = (SELECT get_current_tenant())
    );

    Funciones LEAKPROOF y Empuje de Filtros: Si una función de usuario no es LEAKPROOF, el optimizador no puede usar escaneos de índice GIN o B-Tree en cláusulas WHERE complejas porque teme que la función vea datos prohibidos antes de que el filtro RLS se aplique. Marcar funciones de búsqueda como LEAKPROOF es mandatorio para restaurar el rendimiento de los índices en consultas de texto completo o búsquedas vectoriales