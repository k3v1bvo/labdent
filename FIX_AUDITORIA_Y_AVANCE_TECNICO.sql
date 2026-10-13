-- ====================================================================
-- FIX INMEDIATO: TABLA AUDITORIA Y FUNCIONES DE AVANCE DE TALLER
-- Ejecuta este script en Supabase SQL Editor para desbloquear el avance
-- ====================================================================

-- 1. Agregar columnas para soportar cualquier variante en auditoria
ALTER TABLE public.auditoria ADD COLUMN IF NOT EXISTS tabla text;
ALTER TABLE public.auditoria ADD COLUMN IF NOT EXISTS usuario uuid;
ALTER TABLE public.auditoria ADD COLUMN IF NOT EXISTS tabla_afectada text;
ALTER TABLE public.auditoria ADD COLUMN IF NOT EXISTS usuario_id uuid;

-- 2. Actualizar rpc_completar_y_avanzar con protección anti-fallos
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
  -- Obtener información de la tarea actual
  SELECT h.pedido_id, h.estacion_id, e.orden
  INTO v_pedido_id, v_estacion_actual_id, v_orden_actual
  FROM public.historial_estaciones h
  JOIN public.estaciones e ON e.id = h.estacion_id
  WHERE h.id = p_historial_id;

  IF v_pedido_id IS NULL THEN
    RAISE EXCEPTION 'Registro no encontrado en historial de estaciones';
  END IF;

  -- Marcar estación actual como completada
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

  -- Buscar la siguiente estación en la secuencia
  SELECT id, nombre, orden
  INTO v_siguiente_estacion
  FROM public.estaciones
  WHERE orden > v_orden_actual
  ORDER BY orden ASC
  LIMIT 1;

  -- Si hay siguiente estación, avanzar la orden a ella
  IF v_siguiente_estacion.id IS NOT NULL THEN
    INSERT INTO public.historial_estaciones (pedido_id, estacion_id, estado, fecha_inicio, comentarios)
    VALUES (v_pedido_id, v_siguiente_estacion.id, 'pendiente', NOW(), 'Avanzado a ' || v_siguiente_estacion.nombre);

    UPDATE public.pedidos
    SET estado = 'en_proceso'
    WHERE id = v_pedido_id;
  ELSE
    -- Última estación completada -> Pedido Finalizado listo para entrega
    UPDATE public.pedidos
    SET estado = 'finalizado',
        fecha_entrega = COALESCE(fecha_entrega, NOW())
    WHERE id = v_pedido_id;
  END IF;

  -- Registro de auditoría blindado: NUNCA interrumpe la producción si ocurre un error
  BEGIN
    INSERT INTO public.auditoria (tabla, tabla_afectada, accion, usuario, usuario_id, detalles)
    VALUES (
      'historial_estaciones',
      'historial_estaciones',
      'COMPLETAR_Y_AVANZAR',
      v_user_id,
      v_user_id,
      jsonb_build_object('pedido_id', v_pedido_id, 'historial_id', p_historial_id, 'comentario', p_comentario)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;

-- 3. Actualizar avanzar_estacion también con protección
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
    VALUES (
      'historial_estaciones',
      'historial_estaciones',
      'AVANZAR_ESTACION_ADMIN',
      p_tecnico_id,
      p_tecnico_id,
      jsonb_build_object('pedido_id', p_pedido_id, 'estacion_id', p_estacion_id, 'comentario', p_comentario)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;
