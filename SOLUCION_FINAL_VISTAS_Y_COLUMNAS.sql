-- ====================================================================
-- SCRIPT MAESTRO DE AJUSTE TOTAL — GUISELA LABORATORIO DENTAL
-- ====================================================================
-- Este script ejecuta TODO de una sola vez:
-- 1. Limpia los clones de estaciones y deja exactamente las 5 oficiales.
-- 2. Asegura las columnas faltantes (descripcion, creado_por).
-- 3. Crea las 2 vistas requeridas (vw_dashboard_resumen, vw_tracking_pedidos).
-- 4. Crea las funciones RPC de taller con 'LANGUAGE plpgsql' explícito.
-- 5. Trigger para asignar automáticamente la primera estación.
-- ====================================================================

-- 1. AGREGAR COLUMNAS FALTANTES
ALTER TABLE public.estaciones ADD COLUMN IF NOT EXISTS descripcion text;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS creado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.auditoria ADD COLUMN IF NOT EXISTS tabla text;
ALTER TABLE public.auditoria ADD COLUMN IF NOT EXISTS usuario uuid;
ALTER TABLE public.auditoria ADD COLUMN IF NOT EXISTS tabla_afectada text;
ALTER TABLE public.auditoria ADD COLUMN IF NOT EXISTS usuario_id uuid;


-- 2. LIMPIAR CLONES DE ESTACIONES (DEJAR EXACTAMENTE LAS 5 OFICIALES)
DO $$
DECLARE
  r RECORD;
  v_kept_id uuid;
BEGIN
  -- Por cada nombre oficial, conservar la que TIENE datos y borrar la vacía
  FOR r IN (
    SELECT nombre,
           (SELECT e.id FROM public.estaciones e 
            WHERE e.nombre = sub.nombre 
            ORDER BY (SELECT count(*) FROM public.historial_estaciones h WHERE h.estacion_id = e.id) DESC, e.created_at ASC 
            LIMIT 1) AS id_a_conservar
    FROM (SELECT DISTINCT nombre FROM public.estaciones) sub
  ) LOOP
    v_kept_id := r.id_a_conservar;

    IF v_kept_id IS NOT NULL THEN
      UPDATE public.historial_estaciones
      SET estacion_id = v_kept_id
      WHERE estacion_id IN (SELECT id FROM public.estaciones WHERE nombre = r.nombre AND id <> v_kept_id);

      UPDATE public.tecnico_estacion
      SET estacion_id = v_kept_id
      WHERE estacion_id IN (SELECT id FROM public.estaciones WHERE nombre = r.nombre AND id <> v_kept_id);

      DELETE FROM public.estaciones
      WHERE nombre = r.nombre AND id <> v_kept_id;
    END IF;
  END LOOP;

  -- Borrar cualquier estación fuera de las 5 oficiales
  DELETE FROM public.historial_estaciones WHERE estacion_id IN (
    SELECT id FROM public.estaciones 
    WHERE nombre NOT IN (
      'Recepción & Digitalización CAD 3D',
      'Fresado Robótico & Sinterizado',
      'Estratificación Cerámica & Arte',
      'Terminado, Glaseado & Pulido',
      'Control de Calidad Final & Empaque'
    )
  );
  DELETE FROM public.tecnico_estacion WHERE estacion_id IN (
    SELECT id FROM public.estaciones 
    WHERE nombre NOT IN (
      'Recepción & Digitalización CAD 3D',
      'Fresado Robótico & Sinterizado',
      'Estratificación Cerámica & Arte',
      'Terminado, Glaseado & Pulido',
      'Control de Calidad Final & Empaque'
    )
  );
  DELETE FROM public.estaciones 
  WHERE nombre NOT IN (
    'Recepción & Digitalización CAD 3D',
    'Fresado Robótico & Sinterizado',
    'Estratificación Cerámica & Arte',
    'Terminado, Glaseado & Pulido',
    'Control de Calidad Final & Empaque'
  );

  -- Asignar orden estricto del 1 al 5
  UPDATE public.estaciones SET orden = 1, tiempo_estimado_horas = 2,
    descripcion = 'Recepción y calibración de escaneos STL y diseño digital CAD 3D.'
  WHERE nombre = 'Recepción & Digitalización CAD 3D';

  UPDATE public.estaciones SET orden = 2, tiempo_estimado_horas = 4,
    descripcion = 'Fresado computarizado en Zirconio/PMMA y sinterizado térmico a 1500°C.'
  WHERE nombre = 'Fresado Robótico & Sinterizado';

  UPDATE public.estaciones SET orden = 3, tiempo_estimado_horas = 4,
    descripcion = 'Estratificación cerámica artística, caracterización y microtextura.'
  WHERE nombre = 'Estratificación Cerámica & Arte';

  UPDATE public.estaciones SET orden = 4, tiempo_estimado_horas = 2,
    descripcion = 'Cocción de glaseado a alta temperatura y pulido mecánico fino.'
  WHERE nombre = 'Terminado, Glaseado & Pulido';

  UPDATE public.estaciones SET orden = 5, tiempo_estimado_horas = 1,
    descripcion = 'Control de calidad final, ajuste marginal y empaque sellado.'
  WHERE nombre = 'Control de Calidad Final & Empaque';

  -- Candado definitivo
  ALTER TABLE public.estaciones DROP CONSTRAINT IF EXISTS uq_estaciones_nombre;
  ALTER TABLE public.estaciones ADD CONSTRAINT uq_estaciones_nombre UNIQUE (nombre);

  ALTER TABLE public.estaciones DROP CONSTRAINT IF EXISTS uq_estaciones_orden;
  ALTER TABLE public.estaciones ADD CONSTRAINT uq_estaciones_orden UNIQUE (orden);
END $$;


-- 3. VISTA: RESUMEN DE DASHBOARD (Soluciona 404 vw_dashboard_resumen)
DROP VIEW IF EXISTS public.vw_dashboard_resumen CASCADE;
CREATE VIEW public.vw_dashboard_resumen AS
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

GRANT SELECT ON public.vw_dashboard_resumen TO authenticated, anon;


-- 4. VISTA: SEGUIMIENTO EN VIVO (Soluciona 404 vw_tracking_pedidos)
DROP VIEW IF EXISTS public.vw_tracking_pedidos CASCADE;
CREATE VIEW public.vw_tracking_pedidos AS
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

GRANT SELECT ON public.vw_tracking_pedidos TO authenticated, anon;


-- 5. FUNCIONES RPC DE TALLER CON 'LANGUAGE plpgsql' ANTES DE AS $$

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
  SELECT h.pedido_id, h.estacion_id, e.orden
  INTO v_pedido_id, v_estacion_actual_id, v_orden_actual
  FROM public.historial_estaciones h
  JOIN public.estaciones e ON e.id = h.estacion_id
  WHERE h.id = p_historial_id;

  IF v_pedido_id IS NULL THEN
    RAISE EXCEPTION 'Registro no encontrado en historial de estaciones';
  END IF;

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
    UPDATE public.pedidos
    SET estado = 'finalizado',
        fecha_entrega = COALESCE(fecha_entrega, NOW())
    WHERE id = v_pedido_id;
  END IF;

  BEGIN
    INSERT INTO public.auditoria (tabla, tabla_afectada, accion, usuario, usuario_id, detalles)
    VALUES ('historial_estaciones', 'historial_estaciones', 'COMPLETAR_Y_AVANZAR', v_user_id, v_user_id, jsonb_build_object('pedido_id', v_pedido_id, 'historial_id', p_historial_id, 'comentario', p_comentario));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;

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
  UPDATE public.historial_estaciones
  SET estado = 'completado',
      fecha_fin = NOW()
  WHERE pedido_id = p_pedido_id AND estado IN ('pendiente', 'en_proceso');

  INSERT INTO public.historial_estaciones (pedido_id, estacion_id, tecnico_id, estado, fecha_inicio, comentarios)
  VALUES (p_pedido_id, p_estacion_id, p_tecnico_id, 'pendiente', NOW(), p_comentario);

  UPDATE public.pedidos
  SET estado = 'en_proceso'
  WHERE id = p_pedido_id;

  BEGIN
    INSERT INTO public.auditoria (tabla, tabla_afectada, accion, usuario, usuario_id, detalles)
    VALUES ('historial_estaciones', 'historial_estaciones', 'AVANZAR_ESTACION_ADMIN', p_tecnico_id, p_tecnico_id, jsonb_build_object('pedido_id', p_pedido_id, 'estacion_id', p_estacion_id, 'comentario', p_comentario));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;

-- 6. TRIGGER DE ENTRADA A PRODUCCIÓN
CREATE OR REPLACE FUNCTION trg_crear_primera_estacion()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
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
$$;

DROP TRIGGER IF EXISTS trg_pedidos_primera_estacion ON public.pedidos;
CREATE TRIGGER trg_pedidos_primera_estacion
AFTER INSERT OR UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION trg_crear_primera_estacion();

-- 7. RECARGAR CACHÉ DE POSTGREST
NOTIFY pgrst, 'reload config';
