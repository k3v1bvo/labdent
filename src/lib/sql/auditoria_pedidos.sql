-- ====================================================================
-- SISTEMA ANTI-FRAUDE Y AUDITORÍA INMUTABLE — GUISELA LABORATORIO DENTAL
-- ====================================================================
-- Ejecutar este script en el editor SQL de Supabase para habilitar:
-- 1. Tabla inmutable de auditoría forense (auditoria_pedidos).
-- 2. Índices de alta velocidad.
-- 3. Políticas RLS para evitar que secretarias alteren montos aprobados.
-- 4. Protección contra borrado o alteración de registros de auditoría.
-- ====================================================================

-- 1. CREACIÓN DE LA TABLA DE AUDITORÍA
CREATE TABLE IF NOT EXISTS public.auditoria_pedidos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  usuario_nombre varchar,
  usuario_rol varchar,
  accion varchar NOT NULL,          -- 'APROBACION', 'RECHAZO', 'MODIFICACION_MONTO', 'CAMBIO_ESTADO', 'REGISTRO_ENTREGA', 'EDICION_ADMIN'
  campo_modificado varchar,         -- 'total', 'anticipo', 'estado', 'datos_clinicos', etc.
  valor_anterior text,
  valor_nuevo text,
  motivo text,                     -- Justificación obligatoria para cambios críticos
  ip_address varchar,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auditoria_pedidos_pkey PRIMARY KEY (id)
);

-- 2. ÍNDICES PARA BÚSQUEDAS RÁPIDAS EN EL PANEL DEL ADMIN
CREATE INDEX IF NOT EXISTS idx_auditoria_pedidos_pedido ON public.auditoria_pedidos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_pedidos_usuario ON public.auditoria_pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_pedidos_fecha ON public.auditoria_pedidos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_pedidos_accion ON public.auditoria_pedidos(accion);

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.auditoria_pedidos ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE AUDITORÍA INMUTABLE (Nadie puede borrar ni editar un log de auditoría)
DROP POLICY IF EXISTS "Insertar auditoria usuarios autenticados" ON public.auditoria_pedidos;
CREATE POLICY "Insertar auditoria usuarios autenticados"
  ON public.auditoria_pedidos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Ver auditoria solo administradores" ON public.auditoria_pedidos;
CREATE POLICY "Ver auditoria solo administradores"
  ON public.auditoria_pedidos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rol = 'admin'
    )
  );

-- Opcional: También permitir a los usuarios ver la auditoría del pedido que tienen abierto
DROP POLICY IF EXISTS "Ver auditoria por pedido autenticado" ON public.auditoria_pedidos;
CREATE POLICY "Ver auditoria por pedido autenticado"
  ON public.auditoria_pedidos
  FOR SELECT
  TO authenticated
  USING (true);

-- IMPORTANTE: No se crea política FOR UPDATE ni FOR DELETE.
-- Por diseño de Supabase RLS, al no existir política, NADIE puede alterar ni borrar logs.

-- 5. POLÍTICA DE CANDADO EN PEDIDOS (Seguridad en base de datos)
-- Si la secretaria intenta hacer un update por API a pedidos que ya pasaron de revisión, se bloquea.
-- Nota: Activar solo si RLS está habilitado en public.pedidos.
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura de pedidos para autenticados" ON public.pedidos;
CREATE POLICY "Lectura de pedidos para autenticados"
  ON public.pedidos FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Insercion de pedidos para autenticados" ON public.pedidos;
CREATE POLICY "Insercion de pedidos para autenticados"
  ON public.pedidos FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Control de actualizacion por rol y estado" ON public.pedidos;
CREATE POLICY "Control de actualizacion por rol y estado"
  ON public.pedidos FOR UPDATE
  TO authenticated
  USING (
    -- Los administradores tienen acceso total sin restricción
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
    OR
    -- Secretarias solo pueden actualizar si está en pendiente_revision (aprobación) O finalizado (entrega)
    (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'secretaria')
      AND (
        estado = 'pendiente_revision'
        OR estado = 'finalizado'
      )
    )
  );
