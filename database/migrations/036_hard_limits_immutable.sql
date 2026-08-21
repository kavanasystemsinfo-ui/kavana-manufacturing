-- Migration 036: hard_limits inmutable a nivel de BD
--
-- Hasta ahora la inmutabilidad de hard_limits se defendía solo en el
-- servicio (comparación JSON antes/después del UPDATE). Cualquier ruta de
-- código nueva que toque la tabla tenants sin ese check podría mutar los
-- límites duros del plan. Este trigger lo impide en la BD: solo el rol
-- con privilegio de bypass (kavana_admin, para operaciones globales del
-- super admin) puede cambiarlos.

CREATE OR REPLACE FUNCTION prevent_hard_limits_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE'
       AND OLD.hard_limits IS DISTINCT FROM NEW.hard_limits
       AND NOT pg_has_role(current_user, 'kavana_admin', 'MEMBER')
       AND current_user NOT IN ('postgres', 'kavana_owner') THEN
        RAISE EXCEPTION 'hard_limits es inmutable: solo operaciones globales pueden modificarlo'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_hard_limits_mutation ON tenants;
CREATE TRIGGER trg_prevent_hard_limits_mutation
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION prevent_hard_limits_mutation();
