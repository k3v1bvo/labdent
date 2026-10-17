-- ====================================================================
-- MIGRACIÓN OFICIAL: MÓDULO DE CAJA DIARIA, CAJA CHICA Y PAGOS (BS / USD / QR)
-- ====================================================================
-- Este script crea las tablas de control financiero diario para
-- Guisela Laboratorio Dental:
-- 1. caja_sesiones: Apertura (base 200 Bs), estado diaria, arqueo y cierre
-- 2. caja_movimientos: Cobros por pedidos (anticipos/saldos), gastos menores
--    de taller (caja chica con recibo), y desglose por método (efectivo/QR)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.caja_sesiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL DEFAULT current_date,
  monto_apertura_bs numeric(12,2) NOT NULL DEFAULT 200.00,
  monto_apertura_usd numeric(12,2) NOT NULL DEFAULT 0.00,
  abierta_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  abierta_por_nombre text,
  hora_apertura timestamptz NOT NULL DEFAULT now(),
  estado text NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
  
  -- Campos de Cierre y Arqueo
  monto_cierre_efectivo_bs numeric(12,2),
  monto_cierre_efectivo_usd numeric(12,2),
  monto_cierre_qr_bs numeric(12,2),
  monto_cierre_gastos_bs numeric(12,2),
  saldo_teorico_bs numeric(12,2),
  saldo_real_bs numeric(12,2),
  diferencia_bs numeric(12,2),
  cerrada_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  cerrada_por_nombre text,
  hora_cierre timestamptz,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.caja_movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id uuid REFERENCES public.caja_sesiones(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  origen text NOT NULL CHECK (origen IN ('pedido_anticipo', 'pedido_saldo', 'gasto_caja_chica', 'ingreso_manual', 'ajuste')),
  metodo_pago text NOT NULL CHECK (metodo_pago IN ('efectivo', 'qr_transferencia', 'tarjeta', 'otro')),
  moneda text NOT NULL CHECK (moneda IN ('BOB', 'USD')),
  monto numeric(12,2) NOT NULL CHECK (monto > 0),
  monto_bs_equivalente numeric(12,2) NOT NULL DEFAULT 0,
  tipo_cambio numeric(8,2) NOT NULL DEFAULT 8.00,
  concepto text NOT NULL,
  numero_recibo text,
  comprobante_url text,
  pedido_id uuid REFERENCES public.pedidos(id) ON DELETE SET NULL,
  numero_requerimiento text,
  registrado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  registrado_por_nombre text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_caja_sesiones_fecha ON public.caja_sesiones(fecha);
CREATE INDEX IF NOT EXISTS idx_caja_sesiones_estado ON public.caja_sesiones(estado);
CREATE INDEX IF NOT EXISTS idx_caja_movimientos_sesion ON public.caja_movimientos(sesion_id);
CREATE INDEX IF NOT EXISTS idx_caja_movimientos_tipo ON public.caja_movimientos(tipo);
CREATE INDEX IF NOT EXISTS idx_caja_movimientos_pedido ON public.caja_movimientos(pedido_id);

-- Habilitar RLS
ALTER TABLE public.caja_sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_movimientos ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para admin y secretaria
DROP POLICY IF EXISTS "caja_sesiones_select_all" ON public.caja_sesiones;
CREATE POLICY "caja_sesiones_select_all" ON public.caja_sesiones
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "caja_sesiones_insert_staff" ON public.caja_sesiones;
CREATE POLICY "caja_sesiones_insert_staff" ON public.caja_sesiones
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "caja_sesiones_update_staff" ON public.caja_sesiones;
CREATE POLICY "caja_sesiones_update_staff" ON public.caja_sesiones
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "caja_movimientos_select_all" ON public.caja_movimientos;
CREATE POLICY "caja_movimientos_select_all" ON public.caja_movimientos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "caja_movimientos_insert_staff" ON public.caja_movimientos;
CREATE POLICY "caja_movimientos_insert_staff" ON public.caja_movimientos
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "caja_movimientos_update_staff" ON public.caja_movimientos;
CREATE POLICY "caja_movimientos_update_staff" ON public.caja_movimientos
  FOR UPDATE USING (true);
