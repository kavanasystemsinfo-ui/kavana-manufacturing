-- 040: el historial de auditoría registra QUIÉN hizo el cambio
--
-- El disparador de la 005 insertaba actor_user_id = NULL siempre, así que la
-- auditoría decía qué y cuándo, pero nunca quién: todos los cambios salían como
-- sistema, incluidos los hechos desde la pantalla de administración.
--
-- Ahora el autor se lee de la variable de sesión `app.actor_user_id`, que pone el
-- servicio dentro de la misma transacción que el UPDATE. Se usa una variable de
-- sesión y no un parámetro del disparador porque el UPDATE sobre `tenants` no
-- tiene forma de transportar el usuario, y así el cambio queda auditado con su
-- autor aunque lo haga cualquier código, no solo el servicio actual.
--
-- Si la variable no está puesta (SQL directo, migraciones, scripts de
-- mantenimiento), el autor queda NULL y el cambio se registra igual. Es
-- preferible a rechazar la actualización por un dato que falta.

CREATE OR REPLACE FUNCTION audit_tenant_config_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_actor UUID;
BEGIN
    -- El valor llega como texto: puede faltar, venir vacío o no ser un UUID.
    -- Ninguno de esos casos debe impedir el UPDATE, así que un valor ilegible se
    -- trata como "sin autor" en lugar de propagar el error.
    BEGIN
        v_actor := NULLIF(current_setting('app.actor_user_id', true), '')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
        v_actor := NULL;
    END;

    IF OLD.feature_matrix IS DISTINCT FROM NEW.feature_matrix THEN
        INSERT INTO tenant_config_audit (
            tenant_id,
            actor_user_id,
            action,
            previous_value,
            new_value,
            metadata
        )
        VALUES (
            NEW.id,
            v_actor,
            'feature_matrix',
            OLD.feature_matrix,
            NEW.feature_matrix,
            jsonb_build_object('reason', 'tenant configuration change')
        );
    END IF;

    IF OLD.custom_fields_schema IS DISTINCT FROM NEW.custom_fields_schema THEN
        INSERT INTO tenant_config_audit (
            tenant_id,
            actor_user_id,
            action,
            previous_value,
            new_value,
            metadata
        )
        VALUES (
            NEW.id,
            v_actor,
            'custom_fields_schema',
            OLD.custom_fields_schema,
            NEW.custom_fields_schema,
            jsonb_build_object('reason', 'tenant configuration change')
        );
    END IF;

    IF OLD.hard_limits IS DISTINCT FROM NEW.hard_limits THEN
        INSERT INTO tenant_config_audit (
            tenant_id,
            actor_user_id,
            action,
            previous_value,
            new_value,
            metadata
        )
        VALUES (
            NEW.id,
            v_actor,
            'hard_limits',
            OLD.hard_limits,
            NEW.hard_limits,
            jsonb_build_object('reason', 'tenant configuration change')
        );
    END IF;

    RETURN NEW;
END;
$$;
