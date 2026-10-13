-- ====================================================================
-- SCRIPT DE POBLADO DE DATOS REALISTAS — GUISELA LABORATORIO DENTAL
-- ====================================================================
-- Este script llena la base de datos con:
-- 1. Las 5 Estaciones Oficiales de Taller Dental.
-- 2. Asignación de Técnicos a Estaciones.
-- 3. Órdenes dentales realistas en diferentes estados de producción.
-- 4. Trazabilidad en historial_estaciones (CAD, Fresado, Cerámica).
-- 5. Registros de auditoría anti-fraude.
-- 6. Marcaciones de asistencia con geocerca GPS.
-- ====================================================================

DO $$
DECLARE
  v_admin_id uuid;
  v_secre_id uuid;
  v_doc_id uuid;
  v_tec_id uuid;
  v_doctor_tabla_id uuid;

  v_est1 uuid;
  v_est2 uuid;
  v_est3 uuid;
  v_est4 uuid;
  v_est5 uuid;

  v_ped1 uuid := gen_random_uuid();
  v_ped2 uuid := gen_random_uuid();
  v_ped3 uuid := gen_random_uuid();
  v_ped4 uuid := gen_random_uuid();
BEGIN

  -- 1. OBTENER IDs DE USUARIOS REGISTRADOS
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@labdent.com' LIMIT 1;
  SELECT id INTO v_secre_id FROM auth.users WHERE email = 'secretaria@labdent.com' LIMIT 1;
  SELECT id INTO v_doc_id   FROM auth.users WHERE email = 'doctor@labdent.com' LIMIT 1;
  SELECT id INTO v_tec_id   FROM auth.users WHERE email = 'tecnico@labdent.com' LIMIT 1;

  -- Fallbacks si no existen
  v_admin_id := COALESCE(v_admin_id, (SELECT id FROM public.profiles WHERE rol = 'admin' LIMIT 1));
  v_doc_id   := COALESCE(v_doc_id, v_admin_id);
  v_secre_id := COALESCE(v_secre_id, v_admin_id);
  v_tec_id   := COALESCE(v_tec_id, v_admin_id);

  -- 2. ASEGURAR QUE LAS 5 ESTACIONES OFICIALES EXISTAN
  INSERT INTO public.estaciones (nombre, orden, tiempo_estimado_horas)
  VALUES ('Recepción & Digitalización CAD 3D', 1, 2)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.estaciones (nombre, orden, tiempo_estimado_horas)
  VALUES ('Fresado Robótico & Sinterizado', 2, 4)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.estaciones (nombre, orden, tiempo_estimado_horas)
  VALUES ('Estratificación Cerámica & Arte', 3, 4)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.estaciones (nombre, orden, tiempo_estimado_horas)
  VALUES ('Terminado, Glaseado & Pulido', 4, 2)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.estaciones (nombre, orden, tiempo_estimado_horas)
  VALUES ('Control de Calidad Final & Empaque', 5, 1)
  ON CONFLICT DO NOTHING;

  -- Obtener UUIDs de las 5 estaciones
  SELECT id INTO v_est1 FROM public.estaciones WHERE orden = 1 LIMIT 1;
  SELECT id INTO v_est2 FROM public.estaciones WHERE orden = 2 LIMIT 1;
  SELECT id INTO v_est3 FROM public.estaciones WHERE orden = 3 LIMIT 1;
  SELECT id INTO v_est4 FROM public.estaciones WHERE orden = 4 LIMIT 1;
  SELECT id INTO v_est5 FROM public.estaciones WHERE orden = 5 LIMIT 1;

  -- 3. ASIGNAR TÉCNICO A ESTACIÓN 1 (Digitalización CAD)
  IF v_tec_id IS NOT NULL AND v_est1 IS NOT NULL THEN
    INSERT INTO public.tecnico_estacion (tecnico_id, estacion_id)
    VALUES (v_tec_id, v_est1)
    ON CONFLICT (tecnico_id) DO UPDATE SET estacion_id = EXCLUDED.estacion_id;
  END IF;

  -- 4. REGISTRAR O VINCULAR DOCTOR
  SELECT id INTO v_doctor_tabla_id FROM public.doctores WHERE profile_id = v_doc_id LIMIT 1;
  IF v_doctor_tabla_id IS NULL THEN
    INSERT INTO public.doctores (profile_id, nombre, clinica, especialidad, telefono)
    VALUES (v_doc_id, 'Dr. Carlos Mendoza', 'Clínica Dental Estética', 'Rehabilitación Oral & Prótesis', '70033445')
    RETURNING id INTO v_doctor_tabla_id;
  END IF;

  -- 5. INSERTAR PEDIDOS DE PRUEBA REALISTAS

  -- Pedido 1: EN PROCESO (Corona Zirconio, pasando de estación 1 a estación 2)
  INSERT INTO public.pedidos (
    id, doctor_id, doctor_nombre, doctor_telefono, paciente_nombre, paciente_edad,
    paciente_genero, trabajo_realizar, pieza_numero, color_pieza, colimetro,
    numero_caja, numero_requerimiento, estado, observaciones, anticipo, total,
    revisado_por, revisado_en, fecha_creacion, fecha_ingreso, fecha_entrega
  ) VALUES (
    v_ped1, v_doctor_tabla_id, 'Dr. Carlos Mendoza', '70033445', 'Valeria Gómez Rocha', 34,
    'M', 'Corona Zirconio Multicapa Monolítico', '11', 'A2', 'Vita Classical',
    '01', 'ORD-2026-001', 'en_proceso', 'Llegada de escaneo intraoral STL. Alta estética solicitada para sector anterosuperior.',
    200.00, 450.00, v_secre_id, now() - interval '2 days', now() - interval '2 days', CURRENT_DATE - 2, now() + interval '3 days'
  ) ON CONFLICT DO NOTHING;

  -- Pedido 2: PENDIENTE EN TALLER (Puente E.max 3 piezas listo para ingresar a CAD)
  INSERT INTO public.pedidos (
    id, doctor_id, doctor_nombre, doctor_telefono, paciente_nombre, paciente_edad,
    paciente_genero, trabajo_realizar, pieza_numero, color_pieza, colimetro,
    numero_caja, numero_requerimiento, estado, observaciones, anticipo, total,
    revisado_por, revisado_en, fecha_creacion, fecha_ingreso, fecha_entrega
  ) VALUES (
    v_ped2, v_doctor_tabla_id, 'Dr. Carlos Mendoza', '70033445', 'Roberto Mamani Flores', 48,
    'H', 'Puente Disilicato de Litio E.max (3 U)', '24, 25, 26', 'BL2', 'Ivoclar Bleach',
    '02', 'ORD-2026-002', 'pendiente', 'Ajuste marginal estricto, oclusión protegida.',
    350.00, 900.00, v_secre_id, now() - interval '1 day', now() - interval '1 day', CURRENT_DATE - 1, now() + interval '4 days'
  ) ON CONFLICT DO NOTHING;

  -- Pedido 3: PENDIENTE DE REVISIÓN (Nuevo pedido enviado por doctor desde su panel)
  INSERT INTO public.pedidos (
    id, doctor_id, doctor_nombre, doctor_telefono, paciente_nombre, paciente_edad,
    paciente_genero, trabajo_realizar, pieza_numero, color_pieza, colimetro,
    numero_caja, numero_requerimiento, estado, observaciones, anticipo, total,
    fecha_creacion, fecha_ingreso, fecha_entrega
  ) VALUES (
    v_ped3, v_doctor_tabla_id, 'Dr. Carlos Mendoza', '70033445', 'Lucía Paredes Silva', 29,
    'M', 'Incrustación Onlay Disilicato de Litio', '36', 'A3', 'Vita 3D Master',
    '00', 'ORD-2026-003', 'pendiente_revision', 'Revisar margen subgingival en modelo de yeso enviado por mensajería.',
    0.00, 280.00, now(), CURRENT_DATE, now() + interval '5 days'
  ) ON CONFLICT DO NOTHING;

  -- Pedido 4: FINALIZADO (Carillas Cerámicas listas para retiro y cobro)
  INSERT INTO public.pedidos (
    id, doctor_id, doctor_nombre, doctor_telefono, paciente_nombre, paciente_edad,
    paciente_genero, trabajo_realizar, pieza_numero, color_pieza, colimetro,
    numero_caja, numero_requerimiento, estado, observaciones, anticipo, total,
    revisado_por, revisado_en, fecha_creacion, fecha_ingreso, fecha_entrega,
    numero_nota_entrega
  ) VALUES (
    v_ped4, v_doctor_tabla_id, 'Dr. Carlos Mendoza', '70033445', 'Mariana Beltrán Morales', 31,
    'M', 'Diseño de Sonrisa - 6 Carillas Cerámicas', '13 a 23', 'OM1', 'Bleach E.max',
    '03', 'ORD-2026-004', 'finalizado', 'Glaseado natural con textura micro-estratificada. Inspección final aprobada 100%.',
    1200.00, 2400.00, v_secre_id, now() - interval '5 days', now() - interval '5 days', CURRENT_DATE - 5, now() - interval '1 hour',
    'NE-2026-042'
  ) ON CONFLICT DO NOTHING;

  -- 6. INSERTAR HISTORIAL DE ESTACIONES (Trazabilidad Taller)
  -- Para Pedido 1: Estación 1 completada, Estación 2 en proceso
  INSERT INTO public.historial_estaciones (pedido_id, estacion_id, tecnico_id, fecha_inicio, fecha_fin, estado, comentarios)
  VALUES 
    (v_ped1, v_est1, v_tec_id, now() - interval '2 days', now() - interval '1 day', 'completado', 'Escaneo 3D calibrado y diseño de anatomía oclusal terminado en Exocad.'),
    (v_ped1, v_est2, v_tec_id, now() - interval '1 day', NULL, 'en_proceso', 'Iniciando disco de Zirconio multicapa en fresadora de 5 ejes.')
  ON CONFLICT DO NOTHING;

  -- Para Pedido 2: En cola en Estación 1
  INSERT INTO public.historial_estaciones (pedido_id, estacion_id, tecnico_id, fecha_inicio, fecha_fin, estado, comentarios)
  VALUES 
    (v_ped2, v_est1, NULL, now() - interval '5 hours', NULL, 'pendiente', 'Orden aprobada por secretaría. Lista para asignación técnica.')
  ON CONFLICT DO NOTHING;

  -- Para Pedido 4: Las 5 estaciones completadas
  INSERT INTO public.historial_estaciones (pedido_id, estacion_id, tecnico_id, fecha_inicio, fecha_fin, estado, comentarios)
  VALUES 
    (v_ped4, v_est1, v_tec_id, now() - interval '5 days', now() - interval '4 days', 'completado', 'Diseño 3D digital verificado.'),
    (v_ped4, v_est2, v_tec_id, now() - interval '4 days', now() - interval '3 days', 'completado', 'Fresado de bloques E.max sin imperfecciones.'),
    (v_ped4, v_est3, v_tec_id, now() - interval '3 days', now() - interval '2 days', 'completado', 'Estratificación con polvos cerámicos y textura labial.'),
    (v_ped4, v_est4, v_tec_id, now() - interval '2 days', now() - interval '1 day', 'completado', 'Glaseado en horno a 840°C y pulido mecánico.'),
    (v_ped4, v_est5, v_admin_id, now() - interval '1 day', now() - interval '2 hours', 'completado', 'Control de ajuste bajo microscopio y empaque sellado.')
  ON CONFLICT DO NOTHING;

  -- 7. INSERTAR AUDITORÍA ANTI-FRAUDE DE EJEMPLO
  INSERT INTO public.auditoria_pedidos (pedido_id, usuario_id, usuario_nombre, usuario_rol, accion, campo_modificado, valor_anterior, valor_nuevo, motivo)
  VALUES 
    (v_ped1, v_secre_id, 'Secretaría Recepción', 'secretaria', 'APROBACION', 'estado', 'pendiente_revision', 'en_proceso', 'Anticipo verificado en caja chica.'),
    (v_ped4, v_admin_id, 'Administrador Guisela', 'admin', 'REGISTRO_ENTREGA', 'numero_nota_entrega', NULL, 'NE-2026-042', 'Entrega formal al mensajero de la clínica.');

  -- 8. INSERTAR ASISTENCIA DE PRUEBA
  IF v_tec_id IS NOT NULL THEN
    INSERT INTO public.asistencia_horarios (
      usuario_id, usuario_nombre, usuario_rol, tipo, fecha, hora,
      latitud, longitud, distancia_metros, estado, minutos_retraso, observaciones
    ) VALUES 
      (v_tec_id, 'Técnico Juan Pérez', 'tecnico', 'ENTRADA', CURRENT_DATE, '08:24:00', -16.495510, -68.133610, 12.5, 'A_TIEMPO', 0, 'Marcación biométrica en puerta principal taller.'),
      (v_tec_id, 'Técnico Juan Pérez', 'tecnico', 'SALIDA_ALMUERZO', CURRENT_DATE, '12:30:00', -16.495505, -68.133605, 8.2, 'A_TIEMPO', 0, 'Inicio horario reglamentario almuerzo.');
  END IF;

END $$;
