-- ====================================================================
-- SCRIPT MAESTRO DE MIGRACIÓN COMPLETA — GUISELA LABORATORIO DENTAL
-- ====================================================================
-- Este script crea la base de datos 100% limpia y completa en tu nuevo
-- proyecto de Supabase.
-- Incluye:
-- 1. Extensiones y Enums
-- 2. Tablas Principales (profiles, doctores, pedidos, estaciones, etc.)
-- 3. Tabla Anti-Fraude (auditoria_pedidos)
-- 4. Sistema de Control de Asistencia Biométrica & GPS (configuracion_taller, asistencia_horarios)
-- 5. Triggers de automatización
-- 6. Estaciones y configuración por defecto
-- ====================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TIPOS ENUM
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'secretaria', 'doctor', 'tecnico');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE pedido_estado AS ENUM (
      'pendiente_revision', 
      'pendiente', 
      'en_proceso', 
      'finalizado', 
      'entregado', 
      'rechazado', 
      'devuelto'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE paciente_genero AS ENUM ('H', 'M');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE archivo_tipo AS ENUM ('modelo_3d_link', 'imagen', 'documento', 'otro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estacion_estado AS ENUM ('pendiente', 'en_proceso', 'completado', 'devuelto');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLA: profiles (Vinculada a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre character varying NOT NULL,
  telefono character varying,
  rol user_role NOT NULL DEFAULT 'tecnico',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Trigger para updated_at en profiles
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

-- Trigger para auto-crear profile cuando un usuario se registra en auth.users (Ultra-seguro)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
DECLARE
  v_rol public.user_role := 'tecnico';
  v_raw_rol text;
  v_nombre text;
BEGIN
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    v_raw_rol := NEW.raw_user_meta_data->>'rol';
    IF v_raw_rol IN ('admin', 'secretaria', 'doctor', 'tecnico') THEN
      v_rol := v_raw_rol::public.user_role;
    END IF;
  END IF;

  v_nombre := COALESCE(
    NEW.raw_user_meta_data->>'nombre',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'Usuario'
  );

  INSERT INTO public.profiles (id, nombre, rol)
  VALUES (NEW.id, v_nombre, v_rol)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. TABLA: doctores
CREATE TABLE IF NOT EXISTS public.doctores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  nombre character varying,
  telefono character varying,
  clinica character varying,
  especialidad character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT doctores_pkey PRIMARY KEY (id)
);

-- 5. TABLA: pedidos
CREATE TABLE IF NOT EXISTS public.pedidos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  doctor_id uuid REFERENCES public.doctores(id) ON DELETE SET NULL,
  doctor_nombre character varying,
  doctor_telefono character varying,
  paciente_nombre character varying NOT NULL,
  paciente_edad integer,
  paciente_genero paciente_genero,
  paciente_telefono character varying,
  trabajo_realizar character varying,
  pieza_numero character varying,
  color_pieza character varying,
  colimetro character varying,
  numero_caja character varying(2) DEFAULT '00',
  numero_requerimiento character varying,
  observaciones text,
  estado character varying NOT NULL DEFAULT 'pendiente_revision',
  modelo_3d_link text,
  anticipo numeric(10,2) DEFAULT 0.00,
  total numeric(10,2) DEFAULT 0.00,
  revisado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revisado_en timestamp with time zone,
  motivo_rechazo text,
  fecha_creacion timestamp with time zone DEFAULT now(),
  fecha_ingreso date DEFAULT CURRENT_DATE,
  hora_ingreso time without time zone DEFAULT CURRENT_TIME,
  fecha_entrega timestamp with time zone,
  hora_entrega time without time zone,
  numero_nota_entrega character varying,
  CONSTRAINT pedidos_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON public.pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_doctor ON public.pedidos(doctor_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON public.pedidos(fecha_creacion DESC);

-- 6. TABLA: estaciones
CREATE TABLE IF NOT EXISTS public.estaciones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre character varying NOT NULL,
  orden integer NOT NULL,
  tiempo_estimado_horas integer DEFAULT 2,
  descripcion text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT estaciones_pkey PRIMARY KEY (id)
);

-- 7. TABLA: historial_estaciones (Trazabilidad en taller)
CREATE TABLE IF NOT EXISTS public.historial_estaciones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES public.estaciones(id) ON DELETE RESTRICT,
  tecnico_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  fecha_inicio timestamp with time zone DEFAULT now(),
  fecha_fin timestamp with time zone,
  estado estacion_estado NOT NULL DEFAULT 'pendiente',
  comentarios text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT historial_estaciones_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_historial_pedido ON public.historial_estaciones(pedido_id);
CREATE INDEX IF NOT EXISTS idx_historial_estacion ON public.historial_estaciones(estacion_id);
CREATE INDEX IF NOT EXISTS idx_historial_tecnico ON public.historial_estaciones(tecnico_id);

-- 8. TABLA: archivos
CREATE TABLE IF NOT EXISTS public.archivos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  tipo archivo_tipo NOT NULL DEFAULT 'otro',
  url_archivo text NOT NULL,
  descripcion character varying,
  fecha_subida timestamp with time zone DEFAULT now(),
  CONSTRAINT archivos_pkey PRIMARY KEY (id)
);

-- 9. TABLA: auditoria (movimientos de taller)
CREATE TABLE IF NOT EXISTS public.auditoria (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  accion character varying NOT NULL,
  tabla_afectada character varying NOT NULL,
  registro_id uuid,
  detalles jsonb,
  fecha timestamp with time zone DEFAULT now(),
  CONSTRAINT auditoria_pkey PRIMARY KEY (id)
);

-- 10. TABLA ANTI-FRAUDE: auditoria_pedidos (Registro Forense Inmutable)
CREATE TABLE IF NOT EXISTS public.auditoria_pedidos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  usuario_nombre varchar,
  usuario_rol varchar,
  accion varchar NOT NULL,          -- 'APROBACION', 'RECHAZO', 'MODIFICACION_MONTO', 'CAMBIO_ESTADO', 'REGISTRO_ENTREGA', 'EDICION_ADMIN'
  campo_modificado varchar,         -- 'total', 'anticipo', 'estado', etc.
  valor_anterior text,
  valor_nuevo text,
  motivo text,                     -- Justificación obligatoria para cambios críticos
  ip_address varchar,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auditoria_pedidos_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_auditoria_pedidos_pedido ON public.auditoria_pedidos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_pedidos_usuario ON public.auditoria_pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_pedidos_fecha ON public.auditoria_pedidos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_pedidos_accion ON public.auditoria_pedidos(accion);

-- 11. SISTEMA DE ASISTENCIA: configuracion_taller (Geocerca 100m, Horarios, Almuerzo)
CREATE TABLE IF NOT EXISTS public.configuracion_taller (
  id integer PRIMARY KEY DEFAULT 1,
  taller_nombre varchar DEFAULT 'Guisela Laboratorio Dental',
  latitud numeric(10, 7) DEFAULT -16.4955000,   -- Coordenadas GPS del laboratorio
  longitud numeric(10, 7) DEFAULT -68.1336000,
  radio_tolerancia_metros integer DEFAULT 100,  -- Máximo 100 metros de distancia
  hora_entrada time DEFAULT '08:30:00',
  tolerancia_entrada_minutos integer DEFAULT 20, -- 20 minutos de tolerancia
  hora_salida time DEFAULT '18:30:00',
  duracion_almuerzo_minutos integer DEFAULT 60,  -- 1 hora reglamentaria de almuerzo
  tolerancia_almuerzo_minutos integer DEFAULT 10, -- 10 minutos de margen para regresar
  updated_at timestamptz DEFAULT now()
);

-- Insertar configuración inicial si no existe
INSERT INTO public.configuracion_taller (id, taller_nombre, radio_tolerancia_metros, tolerancia_entrada_minutos, duracion_almuerzo_minutos, tolerancia_almuerzo_minutos)
VALUES (1, 'Guisela Laboratorio Dental', 100, 20, 60, 10)
ON CONFLICT (id) DO NOTHING;

-- 12. SISTEMA DE ASISTENCIA: asistencia_horarios (Marcaciones con Foto Selfie y GPS)
CREATE TABLE IF NOT EXISTS public.asistencia_horarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usuario_nombre varchar,
  usuario_rol varchar,
  tipo varchar NOT NULL,            -- 'ENTRADA', 'SALIDA_ALMUERZO', 'REGRESO_ALMUERZO', 'SALIDA_JORNADA'
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  hora time NOT NULL DEFAULT CURRENT_TIME,
  latitud numeric(10, 7),
  longitud numeric(10, 7),
  distancia_metros numeric(10, 2),
  foto_selfie_url text,            -- Foto en vivo tomada con la cámara
  estado varchar NOT NULL DEFAULT 'A_TIEMPO', -- 'A_TIEMPO', 'TARDANZA', 'FUERA_DE_RANGO', 'ALMUERZO_EXCESO'
  minutos_retraso integer DEFAULT 0,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT asistencia_horarios_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_asistencia_usuario ON public.asistencia_horarios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_asistencia_fecha ON public.asistencia_horarios(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_asistencia_tipo ON public.asistencia_horarios(tipo);

-- 13. ESTACIONES POR DEFECTO
INSERT INTO public.estaciones (nombre, orden, tiempo_estimado_horas)
SELECT 'Recepción & Digitalización CAD 3D', 1, 2
WHERE NOT EXISTS (SELECT 1 FROM public.estaciones WHERE orden = 1);

INSERT INTO public.estaciones (nombre, orden, tiempo_estimado_horas)
SELECT 'Fresado Robótico & Sinterizado', 2, 4
WHERE NOT EXISTS (SELECT 1 FROM public.estaciones WHERE orden = 2);

INSERT INTO public.estaciones (nombre, orden, tiempo_estimado_horas)
SELECT 'Estratificación Cerámica & Arte', 3, 4
WHERE NOT EXISTS (SELECT 1 FROM public.estaciones WHERE orden = 3);

INSERT INTO public.estaciones (nombre, orden, tiempo_estimado_horas)
SELECT 'Terminado, Glaseado & Pulido', 4, 2
WHERE NOT EXISTS (SELECT 1 FROM public.estaciones WHERE orden = 4);

INSERT INTO public.estaciones (nombre, orden, tiempo_estimado_horas)
SELECT 'Control de Calidad Final & Empaque', 5, 1
WHERE NOT EXISTS (SELECT 1 FROM public.estaciones WHERE orden = 5);

-- 14. TABLA: notificaciones (Alertas en Tiempo Real por Rol)
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,               -- 'admin', 'secretaria', 'doctor', 'tecnico'
  mensaje text NOT NULL,
  emisor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  receptor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  pedido_id uuid REFERENCES public.pedidos(id) ON DELETE CASCADE,
  leida boolean DEFAULT false,
  creada_en timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_receptor ON public.notificaciones(receptor_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_tipo ON public.notificaciones(tipo);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON public.notificaciones(leida);

-- 15. TABLA: tecnico_estacion (Asignación de Técnicos a Estaciones de Trabajo)
CREATE TABLE IF NOT EXISTS public.tecnico_estacion (
  tecnico_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES public.estaciones(id) ON DELETE CASCADE,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 16. TRIGGERS DE NOTIFICACIONES AUTOMÁTICAS POR ROL

-- A. Notificar cambios en pedidos a Doctores, Secretarias y Administradores
CREATE OR REPLACE FUNCTION trg_notificar_cambios_pedido()
RETURNS TRIGGER AS $$
DECLARE
  v_dest RECORD;
BEGIN
  -- 1. Cuando un Doctor crea un pedido en revisión -> Notificar a Admin y Secretaria
  IF (TG_OP = 'INSERT' AND (NEW.estado::text IN ('pendiente_revision', 'en_revision'))) THEN
    FOR v_dest IN (SELECT id FROM public.profiles WHERE rol IN ('admin', 'secretaria')) LOOP
      INSERT INTO public.notificaciones (tipo, receptor_id, emisor_id, pedido_id, mensaje)
      VALUES (
        'secretaria',
        v_dest.id,
        NEW.revisado_por,
        NEW.id,
        '🔔 Nuevo pedido #' || COALESCE(NEW.numero_requerimiento, 'S/N') || ' recibido de Dr. ' || COALESCE(NEW.doctor_nombre, 'Doctor') || ' para revisión.'
      );
    END LOOP;
  END IF;

  -- 2. Cuando el pedido pasa de revisión a 'pendiente' (Aprobado y enviado a taller) -> Notificar al Doctor
  IF (TG_OP = 'UPDATE' AND (OLD.estado::text IN ('pendiente_revision', 'en_revision')) AND NEW.estado::text = 'pendiente') THEN
    IF NEW.doctor_id IS NOT NULL THEN
      FOR v_dest IN (SELECT profile_id FROM public.doctores WHERE id = NEW.doctor_id AND profile_id IS NOT NULL) LOOP
        INSERT INTO public.notificaciones (tipo, receptor_id, emisor_id, pedido_id, mensaje)
        VALUES (
          'doctor',
          v_dest.profile_id,
          NEW.revisado_por,
          NEW.id,
          '✅ Su pedido #' || COALESCE(NEW.numero_requerimiento, 'S/N') || ' (Paciente: ' || NEW.paciente_nombre || ') fue aprobado e ingresó a producción en taller.'
        );
      END LOOP;
    END IF;
  END IF;

  -- 3. Cuando el pedido es Rechazado -> Notificar al Doctor con motivo
  IF (TG_OP = 'UPDATE' AND NEW.estado::text = 'rechazado' AND OLD.estado::text <> 'rechazado') THEN
    IF NEW.doctor_id IS NOT NULL THEN
      FOR v_dest IN (SELECT profile_id FROM public.doctores WHERE id = NEW.doctor_id AND profile_id IS NOT NULL) LOOP
        INSERT INTO public.notificaciones (tipo, receptor_id, emisor_id, pedido_id, mensaje)
        VALUES (
          'doctor',
          v_dest.profile_id,
          NEW.revisado_por,
          NEW.id,
          '⚠️ Pedido #' || COALESCE(NEW.numero_requerimiento, 'S/N') || ' observado: ' || COALESCE(NEW.motivo_rechazo, 'Revise los detalles con el laboratorio.')
        );
      END LOOP;
    END IF;
  END IF;

  -- 4. Cuando el pedido finaliza -> Notificar al Doctor y a Secretaría
  IF (TG_OP = 'UPDATE' AND NEW.estado::text = 'finalizado' AND OLD.estado::text <> 'finalizado') THEN
    IF NEW.doctor_id IS NOT NULL THEN
      FOR v_dest IN (SELECT profile_id FROM public.doctores WHERE id = NEW.doctor_id AND profile_id IS NOT NULL) LOOP
        INSERT INTO public.notificaciones (tipo, receptor_id, pedido_id, mensaje)
        VALUES (
          'doctor',
          v_dest.profile_id,
          NEW.id,
          '🎉 Su trabajo #' || COALESCE(NEW.numero_requerimiento, 'S/N') || ' (' || NEW.paciente_nombre || ') ha finalizado y está listo para entrega.'
        );
      END LOOP;
    END IF;
    FOR v_dest IN (SELECT id FROM public.profiles WHERE rol IN ('admin', 'secretaria')) LOOP
      INSERT INTO public.notificaciones (tipo, receptor_id, pedido_id, mensaje)
      VALUES (
        'secretaria',
        v_dest.id,
        NEW.id,
        '📦 Pedido #' || COALESCE(NEW.numero_requerimiento, 'S/N') || ' finalizado en taller. Listo para empaque y cobro.'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notificaciones_pedidos ON public.pedidos;
CREATE TRIGGER trg_notificaciones_pedidos
AFTER INSERT OR UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION trg_notificar_cambios_pedido();

-- B. Trigger para historial_estaciones: Notifica a los técnicos de la estación cuando entra trabajo
CREATE OR REPLACE FUNCTION trg_notificar_estacion_tecnico()
RETURNS TRIGGER AS $$
DECLARE
  v_nombre_estacion text;
  v_num_req text;
  v_tec RECORD;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.estado::text = 'pendiente' AND NEW.tecnico_id IS NULL) THEN
    SELECT nombre INTO v_nombre_estacion FROM public.estaciones WHERE id = NEW.estacion_id;
    SELECT numero_requerimiento INTO v_num_req FROM public.pedidos WHERE id = NEW.pedido_id;

    FOR v_tec IN (SELECT tecnico_id FROM public.tecnico_estacion WHERE estacion_id = NEW.estacion_id) LOOP
      INSERT INTO public.notificaciones (tipo, receptor_id, pedido_id, mensaje)
      VALUES (
        'tecnico',
        v_tec.tecnico_id,
        NEW.pedido_id,
        '🛠️ Orden #' || COALESCE(v_num_req, 'S/N') || ' disponible para trabajar en tu estación (' || COALESCE(v_nombre_estacion, 'Taller') || ').'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notificaciones_estaciones ON public.historial_estaciones;
CREATE TRIGGER trg_notificaciones_estaciones
AFTER INSERT ON public.historial_estaciones
FOR EACH ROW EXECUTE FUNCTION trg_notificar_estacion_tecnico();

-- 17. HABILITACIÓN DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_estaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencia_horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_taller ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecnico_estacion ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para desarrollo/producción (Idempotente: Drop if exists)
DROP POLICY IF EXISTS "Acceso autenticados profiles" ON public.profiles;
CREATE POLICY "Acceso autenticados profiles" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso autenticados doctores" ON public.doctores;
CREATE POLICY "Acceso autenticados doctores" ON public.doctores FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso autenticados pedidos" ON public.pedidos;
CREATE POLICY "Acceso autenticados pedidos" ON public.pedidos FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso autenticados estaciones" ON public.estaciones;
CREATE POLICY "Acceso autenticados estaciones" ON public.estaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso autenticados historial" ON public.historial_estaciones;
CREATE POLICY "Acceso autenticados historial" ON public.historial_estaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Insertar auditoria autenticados" ON public.auditoria_pedidos;
CREATE POLICY "Insertar auditoria autenticados" ON public.auditoria_pedidos FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Ver auditoria autenticados" ON public.auditoria_pedidos;
CREATE POLICY "Ver auditoria autenticados" ON public.auditoria_pedidos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Acceso autenticados asistencia" ON public.asistencia_horarios;
CREATE POLICY "Acceso autenticados asistencia" ON public.asistencia_horarios FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso autenticados configuracion" ON public.configuracion_taller;
CREATE POLICY "Acceso autenticados configuracion" ON public.configuracion_taller FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso autenticados notificaciones" ON public.notificaciones;
CREATE POLICY "Acceso autenticados notificaciones" ON public.notificaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso autenticados tecnico_estacion" ON public.tecnico_estacion;
CREATE POLICY "Acceso autenticados tecnico_estacion" ON public.tecnico_estacion FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 18. HABILITACIÓN DE REALTIME EN SUPABASE
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ====================================================================
-- FIN DEL SCRIPT MAESTRO DE MIGRACIÓN
-- ====================================================================

