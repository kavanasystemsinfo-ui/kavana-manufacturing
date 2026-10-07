-- ============================================================================
-- Seed demo data for TODAY - makes the dashboard feel alive
-- ============================================================================
-- Run against the demo database (Neon/Render) to add production activity
-- for the current day so charts and KPIs show realistic data.
-- ============================================================================

-- 1. Ensure we have workstations (use existing ones or create if missing)
-- Check existing workstations for tenant 1 (demo)
DO $$
DECLARE
    ws_count int;
BEGIN
    SELECT COUNT(*) INTO ws_count FROM workstations WHERE tenant_id = 1;
    IF ws_count = 0 THEN
        -- Create default workstations if none exist
        INSERT INTO workstations (tenant_id, code, name, status, state) VALUES
        (1, 'WS-01', 'Línea de Frituras 1', 'active', 'running'),
        (1, 'WS-02', 'Línea de Frituras 2', 'active', 'running'),
        (1, 'WS-03', 'Línea de Horneado 1', 'active', 'idle'),
        (1, 'WS-04', 'Envase y Empaque 1', 'active', 'running'),
        (1, 'WS-05', 'Envase y Empaque 2', 'active', 'idle'),
        (1, 'WS-06', 'Mezcla y Dosificación', 'active', 'running'),
        (1, 'WS-07', 'Control Calidad', 'active', 'idle'),
        (1, 'WS-08', 'Mantenimiento Preventivo', 'maintenance', 'stopped'),
        (1, 'WS-09', 'Línea de Snacks 1', 'active', 'running'),
        (1, 'WS-10', 'Línea de Snacks 2', 'active', 'changeover');
    END IF;
END $$;

-- 2. Ensure manufacturing models exist
DO $$
DECLARE
    model_count int;
BEGIN
    SELECT COUNT(*) INTO model_count FROM manufacturing_models WHERE tenant_id = 1;
    IF model_count = 0 THEN
        INSERT INTO manufacturing_models (tenant_id, name, unit_of_measure, target_rate) VALUES
        (1, 'Papas Fritas Clásicas 150g', 'bolsas/h', 2500),
        (1, 'Papas Fritas BBQ 150g', 'bolsas/h', 2200),
        (1, 'Chips de Maíz Natural 120g', 'bolsas/h', 3000),
        (1, 'Snacks Horneados Integral 100g', 'bolsas/h', 1800),
        (1, 'Palitos de Maíz 100g', 'bolsas/h', 2800),
        (1, 'Tortilla Chips Nacho 200g', 'bolsas/h', 2000),
        (1, 'Vegetable Chips Mix 100g', 'bolsas/h', 1500),
        (1, 'Papas Onduladas Sal 150g', 'bolsas/h', 2400),
        (1, 'Mini Snacks Queso 80g', 'bolsas/h', 3200),
        (1, 'Papas Fritas Gourmet 180g', 'bolsas/h', 1600);
    END IF;
END $$;

-- 3. Get references for seeding
DO $$
DECLARE
    v_model_id uuid;
    v_ws_id uuid;
    v_order_id uuid;
    v_supervisor_id uuid;
    v_operator_ids uuid[];
    v_ws_codes text[];
    v_model_names text[];
    i int;
    v_shift_start timestamp := date_trunc('day', now()) + interval '6 hours'; -- 06:00 shift start
    v_now timestamp := now();
    v_elapsed_hours numeric := EXTRACT(EPOCH FROM (v_now - v_shift_start)) / 3600;
    v_produced int;
    v_target int;
    v_status text;
    v_order_code text;
BEGIN
    -- Get supervisor user
    SELECT id INTO v_supervisor_id FROM users WHERE tenant_id = 1 AND username = '047' LIMIT 1;
    
    -- Get operator users for production blocks
    SELECT array_agg(id) INTO v_operator_ids 
    FROM users WHERE tenant_id = 1 AND role = 'operario' AND is_active = true;
    
    -- Get workstations
    SELECT array_agg(id) INTO v_ws_ids FROM workstations WHERE tenant_id = 1 AND status = 'active';
    SELECT array_agg(code) INTO v_ws_codes FROM workstations WHERE tenant_id = 1 AND status = 'active';
    
    -- Get models
    SELECT array_agg(id) INTO v_model_ids FROM manufacturing_models WHERE tenant_id = 1;
    SELECT array_agg(name) INTO v_model_names FROM manufacturing_models WHERE tenant_id = 1;
    
    -- If no operators, create some
    IF v_operator_ids IS NULL OR array_length(v_operator_ids, 1) = 0 THEN
        -- Create default operators
        INSERT INTO users (tenant_id, username, password_hash, role, first_name, is_active)
        SELECT 1, v.uname, v.phash, 'operario', v.fname, true
        FROM (VALUES
            ('op1', 'scrypt:demo1:hash1', 'Operario 1'),
            ('op2', 'scrypt:demo2:hash2', 'Operario 2'),
            ('op3', 'scrypt:demo3:hash3', 'Operario 3'),
            ('op4', 'scrypt:demo4:hash4', 'Operario 4'),
            ('op5', 'scrypt:demo5:hash5', 'Operario 5')
        ) AS v(uname, phash, fname)
        WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.tenant_id = 1 AND u.username = v.uname)
        RETURNING id INTO v_operator_ids;
        
        SELECT array_agg(id) INTO v_operator_ids FROM users WHERE tenant_id = 1 AND role = 'operario';
    END IF;
    
    -- Refresh workstation IDs
    SELECT array_agg(id), array_agg(code) INTO v_ws_ids, v_ws_codes 
    FROM workstations WHERE tenant_id = 1 AND status = 'active';
    
    -- Create orders for TODAY across all active workstations
    FOR i IN 1..array_length(v_ws_ids, 1) LOOP
        v_ws_id := v_ws_ids[i];
        v_model_id := v_model_ids[1 + (i % array_length(v_model_ids, 1))];
        
        -- Determine order status based on elapsed shift time
        IF v_elapsed_hours < 1 THEN
            v_status := 'pending';
            v_produced := 0;
        ELSIF v_elapsed_hours < 3 THEN
            v_status := 'in_progress';
            v_produced := floor(random() * 500 + 200)::int;
        ELSIF v_elapsed_hours < 6 THEN
            v_status := 'in_progress';
            v_produced := floor(random() * 1500 + 1000)::int;
        ELSIF v_elapsed_hours < 7.5 THEN
            v_status := CASE WHEN random() < 0.7 THEN 'in_progress' ELSE 'completed' END;
            v_produced := floor(random() * 2500 + 2000)::int;
        ELSE
            v_status := 'completed';
            v_produced := floor(random() * 3000 + 2500)::int;
        END IF;
        
        v_target := 500 + (i * 200)::int + floor(random() * 500)::int;
        v_order_code := 'PROD-' || to_char(now(), 'YYMMDD') || '-' || LPAD(i::text, 2, '0');
        
        -- Insert order for today
        INSERT INTO orders (tenant_id, code, quantity, workstation_id, model_id, status, created_by, produced_quantity, defect_quantity, custom_fields, created_at)
        SELECT 1, v_order_code, v_target, v_ws_id, v_model_id, v_status, v_supervisor_id, 
               LEAST(v_produced, v_target), floor(random() * 50)::int, '{}'::jsonb, v_shift_start + interval '30 minutes'
        WHERE NOT EXISTS (SELECT 1 FROM orders WHERE tenant_id = 1 AND code = v_order_code);
        
        -- Get the order ID
        SELECT id INTO v_order_id FROM orders WHERE tenant_id = 1 AND code = v_order_code;
        
        -- Create production work blocks for this order (simulate shift activity)
        IF v_status IN ('in_progress', 'completed') THEN
            -- Running block 1: Start of shift
            INSERT INTO production_work_blocks (
                tenant_id, id, order_id, workstation_id, operator_id,
                client_event_id, type, start_time, end_time, downtime_reason,
                produced_quantity, defect_quantity, observations, is_offline_event,
                client_device_id, version, event_fingerprint
            ) VALUES (
                1, gen_random_uuid(), v_order_id, v_ws_id, v_operator_ids[1 + (i % array_length(v_operator_ids, 1))],
                gen_random_uuid(), 'produccion', 
                v_shift_start, 
                v_shift_start + interval '2 hours',
                NULL,
                floor(v_target * 0.3)::int, floor(random() * 20)::int,
                'Inicio de turno - arranque de línea', false,
                'demo-device-' || i, 1, md5(random()::text || clock_timestamp()::text)
            ) ON CONFLICT (tenant_id, event_fingerprint) DO NOTHING;
            
            -- Running block 2: Mid shift
            INSERT INTO production_work_blocks (
                tenant_id, id, order_id, workstation_id, operator_id,
                client_event_id, type, start_time, end_time, downtime_reason,
                produced_quantity, defect_quantity, observations, is_offline_event,
                client_device_id, version, event_fingerprint
            ) VALUES (
                1, gen_random_uuid(), v_order_id, v_ws_id, v_operator_ids[1 + ((i+1) % array_length(v_operator_ids, 1))],
                gen_random_uuid(), 'produccion',
                v_shift_start + interval '2 hours 15 minutes',
                v_shift_start + interval '4 hours 30 minutes',
                NULL,
                floor(v_target * 0.4)::int, floor(random() * 30)::int,
                'Producción estable', false,
                'demo-device-' || i, 1, md5(random()::text || clock_timestamp()::text)
            ) ON CONFLICT (tenant_id, event_fingerprint) DO NOTHING;
            
            -- Possible downtime block
            IF random() < 0.3 THEN
                INSERT INTO production_work_blocks (
                    tenant_id, id, order_id, workstation_id, operator_id,
                    client_event_id, type, start_time, end_time, downtime_reason,
                    produced_quantity, defect_quantity, observations, is_offline_event,
                    client_device_id, version, event_fingerprint
                ) VALUES (
                    1, gen_random_uuid(), v_order_id, v_ws_id, v_operator_ids[1 + ((i+2) % array_length(v_operator_ids, 1))],
                    gen_random_uuid(), 'parada',
                    v_shift_start + interval '4 hours 45 minutes',
                    v_shift_start + interval '5 hours 15 minutes',
                    CASE floor(random() * 3)::int 
                        WHEN 0 THEN 'cambio_formato' 
                        WHEN 1 THEN 'mantenimiento_menor' 
                        ELSE 'falta_material' END,
                    0, 0,
                    'Parada planificada/no planificada', false,
                    'demo-device-' || i, 1, md5(random()::text || clock_timestamp()::text)
                ) ON CONFLICT (tenant_id, event_fingerprint) DO NOTHING;
            END IF;
            
            -- Running block 3: End of shift (if completed or late in_progress)
            IF v_elapsed_hours > 5 OR v_status = 'completed' THEN
                INSERT INTO production_work_blocks (
                    tenant_id, id, order_id, workstation_id, operator_id,
                    client_event_id, type, start_time, end_time, downtime_reason,
                    produced_quantity, defect_quantity, observations, is_offline_event,
                    client_device_id, version, event_fingerprint
                ) VALUES (
                    1, gen_random_uuid(), v_order_id, v_ws_id, v_operator_ids[1 + ((i+3) % array_length(v_operator_ids, 1))],
                    gen_random_uuid(), 'produccion',
                    v_shift_start + interval '5 hours 30 minutes',
                    LEAST(v_shift_start + interval '8 hours', v_now),
                    NULL,
                    floor(v_target * 0.3)::int, floor(random() * 15)::int,
                    'Cierre de turno', false,
                    'demo-device-' || i, 1, md5(random()::text || clock_timestamp()::text)
                ) ON CONFLICT (tenant_id, event_fingerprint) DO NOTHING;
            END IF;
        END IF;
    END LOOP;
    
    -- Update workstation statuses to reflect current activity
    FOR i IN 1..array_length(v_ws_ids, 1) LOOP
        v_ws_id := v_ws_ids[i];
        
        -- Determine current status based on time and randomness
        UPDATE workstations SET
            state = CASE 
                WHEN v_elapsed_hours < 1 THEN 'idle'
                WHEN v_elapsed_hours > 7.5 AND random() < 0.5 THEN 'idle'
                WHEN random() < 0.6 THEN 'running'
                WHEN random() < 0.8 THEN 'idle'
                ELSE 'changeover'
            END,
            last_block_type = CASE WHEN random() < 0.7 THEN 'produccion' ELSE 'parada' END,
            last_block_start = CASE WHEN random() < 0.5 THEN v_shift_start + interval '1 hour' ELSE v_shift_start + interval '4 hours' END,
            last_block_end = v_now - interval '5 minutes',
            operator_name = (SELECT first_name FROM users WHERE id = v_operator_ids[1 + (i % array_length(v_operator_ids, 1))]),
            updated_at = v_now
        WHERE id = v_ws_id;
    END LOOP;
    
    RAISE NOTICE 'Demo data for today seeded successfully. Shift elapsed: % hours', v_elapsed_hours;
END $$;

-- 4. Add a few quality incidents for today
DO $$
DECLARE
    v_user_id uuid;
    v_ws_id uuid;
BEGIN
    SELECT id INTO v_user_id FROM users WHERE tenant_id = 1 AND role = 'supervisor' LIMIT 1;
    SELECT id INTO v_ws_id FROM workstations WHERE tenant_id = 1 AND status = 'active' ORDER BY random() LIMIT 1;
    
    INSERT INTO incidencias (tenant_id, reported_by, type, title, description, status, workstation_id, created_at)
    SELECT 1, v_user_id, 'calidad', 'Variación en peso de bolsa', 'Peso fuera de tolerancia ±2g en lote actual', 'abierto', v_ws_id, now() - interval '2 hours'
    WHERE NOT EXISTS (SELECT 1 FROM incidencias WHERE tenant_id = 1 AND title = 'Variación en peso de bolsa');
    
    INSERT INTO incidencias (tenant_id, reported_by, type, title, description, status, workstation_id, created_at)
    SELECT 1, v_user_id, 'mantenimiento', 'Cambio de cuchillas programado', 'Cambio preventivo cada 500h de operación', 'en_progreso', v_ws_id, now() - interval '4 hours'
    WHERE NOT EXISTS (SELECT 1 FROM incidencias WHERE tenant_id = 1 AND title = 'Cambio de cuchillas programado');
    
    INSERT INTO incidencias (tenant_id, reported_by, type, title, description, status, workstation_id, created_at)
    SELECT 1, v_user_id, 'seguridad', 'Revisión guardas de seguridad', 'Inspección mensual de protecciones', 'cerrado', v_ws_id, now() - interval '1 day'
    WHERE NOT EXISTS (SELECT 1 FROM incidencias WHERE tenant_id = 1 AND title = 'Revisión guardas de seguridad');
END $$;

-- 5. Verify the seeded data
SELECT 
    'orders_today' AS metric,
    COUNT(*) AS count
FROM orders 
WHERE tenant_id = 1 AND created_at >= date_trunc('day', now())
UNION ALL
SELECT 
    'orders_in_progress' AS metric,
    COUNT(*) AS count
FROM orders 
WHERE tenant_id = 1 AND status = 'in_progress' AND created_at >= date_trunc('day', now())
UNION ALL
SELECT 
    'orders_completed' AS metric,
    COUNT(*) AS count
FROM orders 
WHERE tenant_id = 1 AND status = 'completed' AND created_at >= date_trunc('day', now())
UNION ALL
SELECT 
    'production_blocks_today' AS metric,
    COUNT(*) AS count
FROM production_work_blocks 
WHERE tenant_id = 1 AND start_time >= date_trunc('day', now())
UNION ALL
SELECT 
    'workstations_active' AS metric,
    COUNT(*) AS count
FROM workstations 
WHERE tenant_id = 1 AND status = 'active'
UNION ALL
SELECT 
    'incidencias_today' AS metric,
    COUNT(*) AS count
FROM incidencias 
WHERE tenant_id = 1 AND created_at >= date_trunc('day', now());