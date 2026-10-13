-- ====================================================================
-- CREACIÓN DE USUARIOS INICIALES (DEMO / PRODUCCIÓN) — GUISELA LAB
-- ====================================================================
-- Este script crea los 4 usuarios iniciales directamente en auth.users
-- con correos y contraseñas listos para iniciar sesión en la web.
--
-- Contraseñas configuradas:
-- Admin:        admin@labdent.com       / Admin1234!
-- Secretaría:   secretaria@labdent.com  / Secre1234!
-- Doctor:       doctor@labdent.com      / Doctor1234!
-- Técnico:      tecnico@labdent.com     / Tecnico1234!
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  v_admin_id uuid := '11111111-1111-1111-1111-111111111111';
  v_secre_id uuid := '22222222-2222-2222-2222-222222222222';
  v_doc_id   uuid := '33333333-3333-3333-3333-333333333333';
  v_tec_id   uuid := '44444444-4444-4444-4444-444444444444';
  v_estacion_1 uuid;
BEGIN

  -- 1. CREAR / ACTUALIZAR ADMIN (admin@labdent.com)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_admin_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@labdent.com',
    crypt('Admin1234!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nombre":"Administrador Guisela","rol":"admin"}'::jsonb,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    encrypted_password = crypt('Admin1234!', gen_salt('bf')),
    email_confirmed_at = now();

  INSERT INTO public.profiles (id, nombre, rol, telefono)
  VALUES (v_admin_id, 'Administrador Guisela', 'admin', '70011223')
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    rol = 'admin';


  -- 2. CREAR / ACTUALIZAR SECRETARÍA (secretaria@labdent.com)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_secre_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'secretaria@labdent.com',
    crypt('Secre1234!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nombre":"Secretaría Recepción","rol":"secretaria"}'::jsonb,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    encrypted_password = crypt('Secre1234!', gen_salt('bf')),
    email_confirmed_at = now();

  INSERT INTO public.profiles (id, nombre, rol, telefono)
  VALUES (v_secre_id, 'Secretaría Recepción', 'secretaria', '70022334')
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    rol = 'secretaria';


  -- 3. CREAR / ACTUALIZAR DOCTOR (doctor@labdent.com)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_doc_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'doctor@labdent.com',
    crypt('Doctor1234!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nombre":"Dr. Carlos Mendoza","rol":"doctor"}'::jsonb,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    encrypted_password = crypt('Doctor1234!', gen_salt('bf')),
    email_confirmed_at = now();

  INSERT INTO public.profiles (id, nombre, rol, telefono)
  VALUES (v_doc_id, 'Dr. Carlos Mendoza', 'doctor', '70033445')
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    rol = 'doctor';

  -- Registrar en tabla pública doctores para vinculación clínica
  INSERT INTO public.doctores (profile_id, nombre, clinica, especialidad, telefono)
  VALUES (v_doc_id, 'Dr. Carlos Mendoza', 'Clínica Dental Estética', 'Rehabilitación Oral & Prótesis', '70033445')
  ON CONFLICT DO NOTHING;


  -- 4. CREAR / ACTUALIZAR TÉCNICO (tecnico@labdent.com)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_tec_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'tecnico@labdent.com',
    crypt('Tecnico1234!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nombre":"Técnico Juan Pérez","rol":"tecnico"}'::jsonb,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    encrypted_password = crypt('Tecnico1234!', gen_salt('bf')),
    email_confirmed_at = now();

  INSERT INTO public.profiles (id, nombre, rol, telefono)
  VALUES (v_tec_id, 'Técnico Juan Pérez', 'tecnico', '70044556')
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    rol = 'tecnico';

  -- Asignar técnico a la estación 1 (Recepción & Digitalización CAD 3D) si existe
  SELECT id INTO v_estacion_1 FROM public.estaciones ORDER BY orden ASC LIMIT 1;
  IF v_estacion_1 IS NOT NULL THEN
    INSERT INTO public.tecnico_estacion (tecnico_id, estacion_id)
    VALUES (v_tec_id, v_estacion_1)
    ON CONFLICT (tecnico_id) DO UPDATE SET estacion_id = EXCLUDED.estacion_id;
  END IF;

END $$;
