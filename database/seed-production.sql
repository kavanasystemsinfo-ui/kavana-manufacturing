-- ============================================================================
-- Kavana Manufacturing — Seed completo para producción (Neon)
-- ============================================================================

-- Ya existe tenant 1 (Kavana Demo) de seeds anteriores
-- Esta sección añade datos de demo realistas adicionales

-- Puestos de trabajo adicionales
INSERT INTO workstations (id, tenant_id, name, code, status) VALUES
  ('55555555-5555-5555-5555-555555555555', 1, 'Línea C', 'LN-C', 'active'),
  ('66666666-6666-6666-6666-666666666666', 1, 'Línea D', 'LN-D', 'maintenance'),
  ('77777777-7777-7777-7777-777777777777', 1, 'Troqueladora', 'TR-01', 'active'),
  ('88888888-8888-8888-8888-888888888888', 1, 'Cizalla', 'CZ-01', 'active')
ON CONFLICT (id) DO NOTHING;

-- Modelos de fabricación
INSERT INTO manufacturing_models (id, tenant_id, name, unit_of_measure, target_rate) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 'Angulo 30x30x3', 'm/h', 40),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, 'Angulo 40x40x4', 'm/h', 35),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 1, 'Pletina 50x5', 'm/h', 60),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 1, 'Cuadrado 15x15', 'm/h', 45),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1, 'Redondo 20mm', 'm/h', 50)
ON CONFLICT (id) DO NOTHING;

-- Utillajes (toolings)
INSERT INTO toolings (tenant_id, id, code, name, type, location, status, current_cycles, max_cycles, warning_pct, cycles_per_piece, notes) VALUES
  (1, 'a0000001-0000-0000-0000-000000000001', 'TR-001', 'Troquel Angulo 30', 'troquel', 'Estante A1', 'activo', 15000, 200000, 80, 0.5, 'Troquel principal para angulo 30x30'),
  (1, 'a0000001-0000-0000-0000-000000000002', 'TR-002', 'Troquel Angulo 40', 'troquel', 'Estante A2', 'activo', 82000, 200000, 80, 0.5, 'Cambio programado pronto'),
  (1, 'a0000001-0000-0000-0000-000000000003', 'MZ-001', 'Molde Pletina 50', 'molde', 'Estante B1', 'activo', 45000, 150000, 85, 0.3, ''),
  (1, 'a0000001-0000-0000-0000-000000000004', 'MZ-002', 'Molde Cuadrado 15', 'molde', 'Estante B2', 'mantenimiento', 120000, 150000, 85, 0.3, 'En mantenimiento preventivo'),
  (1, 'a0000001-0000-0000-0000-000000000005', 'DC-001', 'Disco Corte 300mm', 'utilaje', 'Cajon C1', 'activo', 200, 10000, 90, 0.01, '')
ON CONFLICT (id) DO NOTHING;

-- Incidencias de ejemplo
INSERT INTO incidencias (tenant_id, workstation_id, reported_by, type, severity, title, description, status) VALUES
  (1, '77777777-7777-7777-7777-777777777777', 'operario', 'mantenimiento', 'alta', 'Ruido anómalo en troqueladora', 'La TR-01 hace un ruido metálico al superar 80 piezas/minuto. Revisar rodamientos.', 'abierto'),
  (1, '55555555-5555-5555-5555-555555555555', 'admin', 'calidad', 'media', 'Angulos 30x30 con rebaba', 'Último lote de angulos 30x30 presenta rebaba excesiva en el corte. Revisar afilado.', 'en_progreso'),
  (1, NULL, 'supervisor', 'seguridad', 'critica', 'Falta EPP en linea C', 'Operarios de línea C no usan guantes de protección. Riesgo de corte.', 'resuelto')
ON CONFLICT DO NOTHING;
