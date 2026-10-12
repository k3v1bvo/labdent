-- ====================================================================
-- SCRIPT COMPLETO DE BASE DE DATOS PARA SUPABASE - LABDENT
-- Ejecutar en el SQL Editor de tu proyecto de Supabase
-- ====================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TIPOS ENUM (si ya existen, se ignoran o se crean)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'secretaria', 'doctor', 'tecnico');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE pedido_estado AS ENUM ('pendiente', 'en_revision', 'rechazado', 'en_proceso', 'finalizado', 'entregado', 'devuelto');
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

-- 3. TABLA: profiles (vinculada a auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre character varying NOT NULL,
  telefono character varying,
  rol user_role NOT NULL DEFAULT 'tecnico',
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
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
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Trigger para auto-crear perfil al registrarse en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'rol')::user_role, 'tecnico')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. TABLA: doctores
CREATE TABLE IF NOT EXISTS public.doctores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinica character varying,
  especialidad character varying,
  created_at timestamp without time zone DEFAULT now()
);

-- 5. TABLA: pedidos
CREATE TABLE IF NOT EXISTS public.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_requerimiento character varying UNIQUE,
  fecha_ingreso date,
  hora_ingreso time without time zone,
  fecha_creacion timestamp without time zone DEFAULT now(),
  fecha_entrega timestamp without time zone,
  hora_entrega time without time zone,
  numero_nota_entrega text,
  numero_caja character varying DEFAULT '00',

  doctor_id uuid REFERENCES public.doctores(id) ON DELETE SET NULL,
  doctor_nombre character varying,
  doctor_telefono character varying,

  paciente_nombre character varying NOT NULL,
  paciente_telefono character varying,
  paciente_genero paciente_genero DEFAULT 'M',

  trabajo_realizar text,
  pieza_numero character varying,
  piezas text,
  color_pieza character varying,
  colimetro character varying,

  observaciones text,
  modelo_3d_link text,
  anticipo numeric DEFAULT 0,
  total numeric DEFAULT 0,

  estado pedido_estado DEFAULT 'pendiente',
  revisado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revisado_en timestamp with time zone,
  motivo_rechazo text,
  creado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 6. TABLA: estaciones
CREATE TABLE IF NOT EXISTS public.estaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre character varying NOT NULL,
  orden integer NOT NULL,
  descripcion text
);

-- 7. TABLA: historial_estaciones
CREATE TABLE IF NOT EXISTS public.historial_estaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES public.estaciones(id),
  tecnico_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  fecha_inicio timestamp without time zone DEFAULT now(),
  fecha_fin timestamp without time zone,
  estado estacion_estado DEFAULT 'pendiente',
  comentarios text
);

-- 8. TABLA: archivos
CREATE TABLE IF NOT EXISTS public.archivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  tipo archivo_tipo NOT NULL DEFAULT 'documento',
  url_archivo text NOT NULL,
  descripcion text,
  subido_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  fecha_subida timestamp without time zone DEFAULT now()
);

-- 9. TABLA: auditoria
CREATE TABLE IF NOT EXISTS public.auditoria (
  id bigserial PRIMARY KEY,
  accion text,
  tabla text,
  usuario uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  fecha timestamp without time zone DEFAULT now(),
  detalles jsonb
);

-- 10. TABLA: notificaciones
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  mensaje text NOT NULL,
  emisor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  receptor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  pedido_id uuid REFERENCES public.pedidos(id) ON DELETE CASCADE,
  leida boolean DEFAULT false,
  creada_en timestamp without time zone DEFAULT now()
);

-- 11. TABLA: tecnico_estacion
CREATE TABLE IF NOT EXISTS public.tecnico_estacion (
  tecnico_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  estacion_id uuid NOT NULL REFERENCES public.estaciones(id) ON DELETE CASCADE,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ====================================================================
-- DATOS INICIALES (ESTACIONES)
-- ====================================================================
INSERT INTO public.estaciones (id, nombre, orden, descripcion)
SELECT gen_random_uuid(), 'Moldeado', 1, 'Creación del molde físico'
WHERE NOT EXISTS (SELECT 1 FROM public.estaciones WHERE nombre = 'Moldeado');

INSERT INTO public.estaciones (id, nombre, orden, descripcion)
SELECT gen_random_uuid(), 'Escaneo 3D', 2, 'Escaneo del modelo físico'
WHERE NOT EXISTS (SELECT 1 FROM public.estaciones WHERE nombre = 'Escaneo 3D');

INSERT INTO public.estaciones (id, nombre, orden, descripcion)
SELECT gen_random_uuid(), 'Modelado Digital', 3, 'Ajuste del modelo digital según ficha técnica'
WHERE NOT EXISTS (SELECT 1 FROM public.estaciones WHERE nombre = 'Modelado Digital');

INSERT INTO public.estaciones (id, nombre, orden, descripcion)
SELECT gen_random_uuid(), 'Fresado', 4, 'Fabricación de la pieza física'
WHERE NOT EXISTS (SELECT 1 FROM public.estaciones WHERE nombre = 'Fresado');

INSERT INTO public.estaciones (id, nombre, orden, descripcion)
SELECT gen_random_uuid(), 'Pulido y Control', 5, 'Acabado y control final antes de entrega'
WHERE NOT EXISTS (SELECT 1 FROM public.estaciones WHERE nombre = 'Pulido y Control');

-- ====================================================================
-- VISTAS (VIEWS)
-- ====================================================================

-- 1. Resumen de Dashboard
CREATE OR REPLACE VIEW public.vw_dashboard_resumen AS
SELECT 
  COUNT(*) FILTER (WHERE estado = 'pendiente') AS pedidos_pendientes,
  COUNT(*) FILTER (WHERE estado = 'en_proceso') AS pedidos_en_proceso,
  COUNT(*) FILTER (WHERE estado = 'finalizado') AS pedidos_finalizados,
  COUNT(*) FILTER (WHERE estado = 'entregado') AS pedidos_entregados,
  ROUND(AVG(EXTRACT(EPOCH FROM (fecha_entrega - fecha_creacion)) / 3600), 2) AS tiempo_promedio_horas,
  COALESCE(SUM(total), 0) AS ingresos_totales,
  DATE_TRUNC('day', fecha_creacion) AS fecha
FROM public.pedidos
GROUP BY fecha
ORDER BY fecha DESC;

-- 2. Vista de Seguimiento / Tracking
CREATE OR REPLACE VIEW public.vw_tracking_pedidos AS
WITH ult_historial AS (
  SELECT DISTINCT ON (pedido_id)
    h.id AS historial_id,
    h.pedido_id,
    h.estacion_id,
    e.nombre AS estacion_actual,
    h.estado::text AS estado_estacion,
    h.fecha_inicio,
    h.fecha_fin,
    h.tecnico_id
  FROM public.historial_estaciones h
  LEFT JOIN public.estaciones e ON e.id = h.estacion_id
  ORDER BY h.pedido_id, h.fecha_inicio DESC NULLS LAST, h.id DESC
)
SELECT 
  p.id AS pedido_id,
  p.paciente_nombre,
  p.doctor_nombre,
  p.numero_requerimiento,
  p.trabajo_realizar,
  p.pieza_numero,
  p.color_pieza,
  p.colimetro,
  p.numero_caja,
  p.observaciones,
  p.estado::text AS estado_pedido,
  COALESCE(uh.estacion_actual, 'Sin asignar') AS estacion_actual,
  COALESCE(uh.estado_estacion, 'pendiente') AS estado_estacion,
  uh.fecha_inicio,
  uh.fecha_fin
FROM public.pedidos p
LEFT JOIN ult_historial uh ON uh.pedido_id = p.id;

-- ====================================================================
-- FUNCIONES RPC
-- ====================================================================

-- 1. Cambiar estación activa del técnico
CREATE OR REPLACE FUNCTION rpc_cambiar_estacion(p_nueva_estacion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  INSERT INTO public.tecnico_estacion (tecnico_id, estacion_id, updated_at)
  VALUES (v_user_id, p_nueva_estacion_id, NOW())
  ON CONFLICT (tecnico_id)
  DO UPDATE SET estacion_id = EXCLUDED.estacion_id, updated_at = NOW();
END;
$$;

-- 2. Tomar tarea en estación
CREATE OR REPLACE FUNCTION rpc_tomar_tarea(p_historial_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_pedido_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  UPDATE public.historial_estaciones
  SET tecnico_id = v_user_id,
      estado = 'en_proceso',
      fecha_inicio = NOW()
  WHERE id = p_historial_id
  RETURNING pedido_id INTO v_pedido_id;

  IF v_pedido_id IS NOT NULL THEN
    UPDATE public.pedidos
    SET estado = 'en_proceso'
    WHERE id = v_pedido_id AND estado = 'pendiente';
  END IF;
END;
$$;

-- 3. Soltar tarea
CREATE OR REPLACE FUNCTION rpc_soltar_tarea(p_historial_id uuid, p_comentario text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.historial_estaciones
  SET tecnico_id = NULL,
      estado = 'pendiente',
      comentarios = CASE 
        WHEN p_comentario IS NOT NULL AND p_comentario <> '' THEN 
          COALESCE(comentarios || E'\n', '') || '[Soltada]: ' || p_comentario
        ELSE comentarios
      END
  WHERE id = p_historial_id;
END;
$$;

-- 4. Completar estación y avanzar automáticamente a la siguiente
CREATE OR REPLACE FUNCTION rpc_completar_y_avanzar(p_historial_id uuid, p_comentario text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pedido_id uuid;
  v_estacion_actual_id uuid;
  v_orden_actual int;
  v_siguiente_estacion RECORD;
  v_user_id uuid := auth.uid();
BEGIN
  -- Obtener datos de la etapa actual
  SELECT h.pedido_id, h.estacion_id, e.orden
  INTO v_pedido_id, v_estacion_actual_id, v_orden_actual
  FROM public.historial_estaciones h
  JOIN public.estaciones e ON e.id = h.estacion_id
  WHERE h.id = p_historial_id;

  IF v_pedido_id IS NULL THEN
    RAISE EXCEPTION 'Registro no encontrado en historial de estaciones';
  END IF;

  -- Marcar actual como completado
  UPDATE public.historial_estaciones
  SET estado = 'completado',
      fecha_fin = NOW(),
      tecnico_id = COALESCE(tecnico_id, v_user_id),
      comentarios = CASE 
        WHEN p_comentario IS NOT NULL AND p_comentario <> '' THEN 
          COALESCE(comentarios || E'\n', '') || p_comentario
        ELSE comentarios
      END
  WHERE id = p_historial_id;

  -- Buscar siguiente estación por orden
  SELECT id, nombre, orden
  INTO v_siguiente_estacion
  FROM public.estaciones
  WHERE orden > v_orden_actual
  ORDER BY orden ASC
  LIMIT 1;

  IF v_siguiente_estacion.id IS NOT NULL THEN
    INSERT INTO public.historial_estaciones (pedido_id, estacion_id, estado, fecha_inicio, comentarios)
    VALUES (v_pedido_id, v_siguiente_estacion.id, 'pendiente', NOW(), 'Avanzado a ' || v_siguiente_estacion.nombre);

    UPDATE public.pedidos
    SET estado = 'en_proceso'
    WHERE id = v_pedido_id;
  ELSE
    -- Última estación completada
    UPDATE public.pedidos
    SET estado = 'finalizado',
        fecha_entrega = COALESCE(fecha_entrega, NOW())
    WHERE id = v_pedido_id;
  END IF;

  -- Auditoría
  INSERT INTO public.auditoria (tabla, accion, usuario, detalles)
  VALUES ('historial_estaciones', 'COMPLETAR_Y_AVANZAR', v_user_id, jsonb_build_object('pedido_id', v_pedido_id, 'historial_id', p_historial_id, 'comentario', p_comentario));
END;
$$;

-- 5. Avanzar estación manualmente (Admin/Tracking)
CREATE OR REPLACE FUNCTION avanzar_estacion(
  p_pedido_id uuid,
  p_estacion_id uuid,
  p_tecnico_id uuid,
  p_comentario text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Cerrar estaciones pendientes o en proceso
  UPDATE public.historial_estaciones
  SET estado = 'completado',
      fecha_fin = NOW()
  WHERE pedido_id = p_pedido_id AND estado IN ('pendiente', 'en_proceso');

  -- Insertar la nueva estación
  INSERT INTO public.historial_estaciones (pedido_id, estacion_id, tecnico_id, estado, fecha_inicio, comentarios)
  VALUES (p_pedido_id, p_estacion_id, p_tecnico_id, 'pendiente', NOW(), p_comentario);

  UPDATE public.pedidos
  SET estado = 'en_proceso'
  WHERE id = p_pedido_id;

  INSERT INTO public.auditoria (tabla, accion, usuario, detalles)
  VALUES ('historial_estaciones', 'AVANZAR_ESTACION_ADMIN', p_tecnico_id, jsonb_build_object('pedido_id', p_pedido_id, 'estacion_id', p_estacion_id, 'comentario', p_comentario));
END;
$$;

-- ====================================================================
-- TRIGGER: ASIGNAR AUTOMÁTICAMENTE LA PRIMERA ESTACIÓN AL CREAR PEDIDO
-- ====================================================================
CREATE OR REPLACE FUNCTION trg_crear_primera_estacion()
RETURNS TRIGGER AS $$
DECLARE
  v_primera_estacion_id uuid;
BEGIN
  IF NEW.estado = 'pendiente' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.estado <> 'pendiente')) THEN
    IF NOT EXISTS (SELECT 1 FROM public.historial_estaciones WHERE pedido_id = NEW.id) THEN
      SELECT id INTO v_primera_estacion_id FROM public.estaciones ORDER BY orden ASC LIMIT 1;
      IF v_primera_estacion_id IS NOT NULL THEN
        INSERT INTO public.historial_estaciones (pedido_id, estacion_id, estado, fecha_inicio, comentarios)
        VALUES (NEW.id, v_primera_estacion_id, 'pendiente', NOW(), 'Ingreso a producción');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pedidos_primera_estacion ON public.pedidos;
CREATE TRIGGER trg_pedidos_primera_estacion
AFTER INSERT OR UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION trg_crear_primera_estacion();

-- ====================================================================
-- PERMISOS Y ROW LEVEL SECURITY (RLS)
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_estaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecnico_estacion ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para desarrollo/pruebas
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "profiles_modify_all" ON public.profiles;
CREATE POLICY "profiles_modify_all" ON public.profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "doctores_all" ON public.doctores;
CREATE POLICY "doctores_all" ON public.doctores FOR ALL USING (true);

DROP POLICY IF EXISTS "pedidos_all" ON public.pedidos;
CREATE POLICY "pedidos_all" ON public.pedidos FOR ALL USING (true);

DROP POLICY IF EXISTS "estaciones_all" ON public.estaciones;
CREATE POLICY "estaciones_all" ON public.estaciones FOR ALL USING (true);

DROP POLICY IF EXISTS "historial_estaciones_all" ON public.historial_estaciones;
CREATE POLICY "historial_estaciones_all" ON public.historial_estaciones FOR ALL USING (true);

DROP POLICY IF EXISTS "archivos_all" ON public.archivos;
CREATE POLICY "archivos_all" ON public.archivos FOR ALL USING (true);

DROP POLICY IF EXISTS "auditoria_all" ON public.auditoria;
CREATE POLICY "auditoria_all" ON public.auditoria FOR ALL USING (true);

DROP POLICY IF EXISTS "notificaciones_all" ON public.notificaciones;
CREATE POLICY "notificaciones_all" ON public.notificaciones FOR ALL USING (true);

DROP POLICY IF EXISTS "tecnico_estacion_all" ON public.tecnico_estacion;
CREATE POLICY "tecnico_estacion_all" ON public.tecnico_estacion FOR ALL USING (true);

-- Habilitar Realtime para las tablas requeridas por la aplicación
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.historial_estaciones;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
