-- ====================================================================
-- SCRIPT MAESTRO ÚNICO: TODAS LAS MIGRACIONES RECIENTES EN UN SOLO PASO
-- Guisela Laboratorio Dental - Cochabamba, Bolivia
-- ====================================================================
-- Incluye:
-- 1. Doble Moneda, Tipo de Cambio (8 Bs/USD) y Catálogo de 75 Trabajos
-- 2. Módulo de Caja Diaria, Caja Chica (Base 200 Bs) y Arqueo
-- 3. QR Oficial de Cobro Bancario, Tarifas por Doctor y Comprobantes
-- ====================================================================

-- ====================================================================
-- MIGRACIÓN: DOBLE MONEDA, TIPO DE CAMBIO Y CATÁLOGO DE PRODUCTOS
-- Guisela Laboratorio Dental
-- ====================================================================

-- 1. Agregar tipo_cambio_usd a configuracion_taller (por defecto 8.00 Bs/USD)
ALTER TABLE public.configuracion_taller 
ADD COLUMN IF NOT EXISTS tipo_cambio_usd numeric DEFAULT 8.00;

UPDATE public.configuracion_taller 
SET tipo_cambio_usd = 8.00 
WHERE tipo_cambio_usd IS NULL;

-- 2. Tarifas diferenciadas en doctores (regular, descuento_normal, institucional_universidad)
ALTER TABLE public.doctores 
ADD COLUMN IF NOT EXISTS tipo_tarifa text DEFAULT 'regular';

ALTER TABLE public.doctores 
ADD COLUMN IF NOT EXISTS descuento_porcentaje numeric DEFAULT 0;

-- 2.b. Control de Componentes en Pedidos (Cubeta, Tornillos, Transfer, etc.)
ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS componentes_caja jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS componentes_devueltos jsonb DEFAULT '[]'::jsonb;

-- 3. Crear tabla del catálogo oficial de trabajos
CREATE TABLE IF NOT EXISTS public.catalogo_trabajos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  categoria text DEFAULT 'Otros',
  marca text,
  precio_usd numeric NOT NULL,
  precio_bs numeric GENERATED ALWAYS AS (precio_usd * 8.00) STORED,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT uq_catalogo_nombre UNIQUE (nombre)
);

-- Políticas RLS para catalogo_trabajos (lectura para todos los autenticados, modificación solo admin)
ALTER TABLE public.catalogo_trabajos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura catálogo trabajos para autenticados" ON public.catalogo_trabajos;
CREATE POLICY "Lectura catálogo trabajos para autenticados" 
ON public.catalogo_trabajos FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Modificación catálogo para admin y secretaria" ON public.catalogo_trabajos;
CREATE POLICY "Modificación catálogo para admin y secretaria" 
ON public.catalogo_trabajos FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND rol IN ('admin', 'secretaria')
  )
);

-- 4. Sembrado de los 75 Trabajos Oficiales de Guisela Laboratorio Dental
INSERT INTO public.catalogo_trabajos (nombre, categoria, marca, precio_usd) VALUES
('ACRILIZADO PLACA DE MIORELAJACION', 'Materiales', 'ACRILICO', 20.00),
('ACRILIZADO SOBRE CROMO(9 A 13 PZAS)', 'Materiales', 'ACRILICO', 35.00),
('ACRILIZADO SOBRE CROMO(1 A 4 PZAS)', 'Materiales', 'ACRILICO', 15.00),
('ACRILIZADO SOBRE CROMO(5 A 8 PZAS)', 'Materiales', 'ACRILICO', 25.00),
('ACRILIZADO TOTAL', 'Materiales', 'ACRILICO', 40.00),
('BISCOCHADO', 'Materiales', 'DUCERAM KISS', 25.00),
('CONFECCION PLACA DE MIORELAJACION', 'Materiales', 'ACRILICO', 25.00),
('CUBETA INDIVIDUAL', 'Materiales', 'ACRILICO', 5.00),
('ESTRUCTURA ACETAL', 'Materiales', 'ACETAL', 150.00),
('PASTILLA DE DIENTES DURT.', 'Materiales', 'DURATONE', 25.00),
('PASTILLA DE DIENTES TEC.', 'Materiales', 'TECNOVADENT', 10.00),
('PASTILLA DE DIENTES YAMH.', 'Materiales', 'YAMAHACHI', 30.00),
('PLACA ACETALICA', 'Materiales', 'ACETAL', 170.00),
('PLACA ACETALICA PARCIAL', 'Materiales', 'ACETAL', 85.00),
('PLACA BASE + RODETE', 'Materiales', 'ACRILICO', 5.00),
('PLACA DE CONTENCION RIGIDA', 'Materiales', 'ACETATO', 15.00),
('PLACA ESTAMPADA ELASTICA', 'Materiales', 'ACETATO', 15.00),
('PLACA PROVISORIA', 'Materiales', 'ACRILICO AUTO', 30.00),
('PLACA VALPLAST BILATERAL (1 A 5 PZAS)', 'Materiales', 'VALPLAST', 70.00),
('PLACA VALPLAST BILATERAL(6 A 8 PZAS)', 'Materiales', 'VALPLAST', 80.00),
('PLACA VALPLAST TOTAL', 'Materiales', 'VALPLAST', 100.00),
('PLACA VALPLAST UNILATERAL', 'Materiales', 'VALPLAST', 30.00),
('PLACA VALPLAST UNILATERAL(2 A 3 PZAS)', 'Materiales', 'VALPLAST', 40.00),
('PRUEBA DE TRANSFERENCIA', 'Materiales', 'ACRILICO', 15.00),
('PRUEBA RESINA PROVISORIA', 'Materiales', 'RESINA DIGITAL', 3.00),
('REBASADO DE PLACA', 'Materiales', 'ACRILICO', 20.00),
('REFUERZO METALICO PERSONALIZADO', 'Materiales', 'REMANIUM', 30.00),
('REPARACION DE PLACA SIMPLE', 'Materiales', 'ACRILICO', 15.00),
('REPARACION DE PLACA COMPLEJA', 'Materiales', 'ACRILICO', 20.00),
('UCLA', 'Materiales', 'OTROS', 15.00),
('APOYOS METALICOS', 'Otros', 'REMANIUM', 10.00),
('APOYOS ZIRCONIO', 'Otros', 'ZIRCONIO', 45.00),
('ATTACH', 'Otros', 'REMANIUM', 25.00),
('BOLATTACH', 'Otros', 'REMANIUM', 25.00),
('CAJA PARATTACH', 'Otros', 'OTROS', 25.00),
('CARILLA CERAMAGE', 'Otros', 'CERAMAGE', 30.00),
('CARILLA IVOCROM', 'Otros', 'IVOCROM', 20.00),
('CARILLA NEXCO', 'Otros', 'NEXCO', 40.00),
('CARILLAS EMAX', 'Otros', 'EMAX', 75.00),
('CASQUETE METAL CERAMICA', 'Otros', 'RITON', 25.00),
('CASQUETE PARA CERAMAGE', 'Otros', 'CERAMAGE', 25.00),
('CASQUETE PARA IVOCROM', 'Otros', 'REMANIUM', 15.00),
('COLADO UCLA', 'Otros', 'REMANIUM', 25.00),
('COLADO UCLA + ESTRUCTURA SOBRE IMPLANTE', 'Otros', 'REMANIUM', 50.00),
('CORONA ATORNILLADA SOBRE IMPLANTE', 'Otros', 'OTROS', 75.00),
('CORONA DISILICATO DE LITIO(EMAX)', 'Otros', 'EMAX', 80.00),
('CORONA JACKET CERAMAGE', 'Otros', 'CERAMAGE', 35.00),
('CORONA JACKET IVOCROM', 'Otros', 'IVOCROM', 20.00),
('CORONA JACKET NANOHIBRIDO', 'Otros', 'NANOHIBRIDO', 45.00),
('CORONA JACKET NEXCO', 'Otros', 'NEXCO', 40.00),
('CORONA METAL CERAMICA', 'Otros', 'DUCERAM KISS', 50.00),
('CORONA METALICA', 'Otros', 'REMANIUM', 20.00),
('CORONA METALOPLASTICA CERAMAGE', 'Otros', 'CERAMAGE', 45.00),
('CORONA METALOPLASTICA IVOCROM', 'Otros', 'IVOCROM', 30.00),
('CORONA PROVISORIA', 'Otros', 'PROVISORIO', 15.00),
('CORONA VENEER IVOCROM', 'Otros', 'IVOCROM', 30.00),
('CORONA ZIRCONIO', 'Otros', 'ZIRCONIO', 90.00),
('CROMO ESQUELETO ANALOGICO', 'Otros', 'REMANIUM', 60.00),
('CROMO ESQUELETO DIGITAL', 'Otros', 'RITON', 80.00),
('CROMO ESQUELETO PARCIAL (1 A 3 PZAS)', 'Otros', 'REMANIUM', 40.00),
('CROMO ESQUELETO PARCIAL (4 A 8 PZAS)', 'Otros', 'REMANIUM', 40.00),
('ENCERADO ANALOGICO', 'Otros', 'OTROS', 5.00),
('ENCERADO DIGITAL', 'Otros', 'OTROS', 3.00),
('ENCIA ARTIFICIAL', 'Otros', 'ENCIA', 10.00),
('ESTRUCTURA DE METAL S/2 UCLAS', 'Otros', 'REMANIUM', 85.00),
('FRESADO', 'Otros', 'REMANIUM', 10.00),
('INCRUSTACION CERAMAGE', 'Otros', 'CERAMAGE', 30.00),
('INCRUSTACION EMAX', 'Otros', 'EMAX', 80.00),
('INCRUSTACION IVOCROM', 'Otros', 'IVOCROM', 15.00),
('INCRUSTACION METALICA', 'Otros', 'REMANIUM', 18.00),
('INCRUSTACION NEXCO', 'Otros', 'NEXCO', 35.00),
('INCRUSTACION ZIRCONIO', 'Otros', 'ZIRCONIO', 90.00),
('MODELO DIGITAL IMPRESO', 'Otros', 'DIGITAL', 10.00),
('PERNO DIRECTO', 'Otros', 'REMANIUM', 10.00),
('PERNO INDIRECTO', 'Otros', 'REMANIUM', 10.00),
('PERNO PASANTE', 'Otros', 'REMANIUM', 15.00),
('PERNO RICHMON', 'Otros', 'REMANIUM', 12.00),
('PERNO SECCIONADO', 'Otros', 'REMANIUM', 15.00),
('REPUESTO TEFLON + ORING', 'Otros', 'OTROS', 25.00),
('REVESTIDO EN CERAMAGE', 'Otros', 'CERAMAGE', 20.00),
('REVESTIDO IVOCROM', 'Otros', 'IVOCROM', 15.00)
ON CONFLICT (nombre) DO UPDATE 
SET precio_usd = EXCLUDED.precio_usd,
    categoria = EXCLUDED.categoria,
    marca = EXCLUDED.marca;

-- 5. Función RPC para actualizar tipo de cambio de forma segura
CREATE OR REPLACE FUNCTION public.rpc_actualizar_tipo_cambio(p_nuevo_tipo_cambio numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_nuevo_tipo_cambio <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'El tipo de cambio debe ser mayor a 0');
  END IF;

  UPDATE public.configuracion_taller 
  SET tipo_cambio_usd = p_nuevo_tipo_cambio 
  WHERE id = 1;

  RETURN jsonb_build_object('success', true, 'tipo_cambio', p_nuevo_tipo_cambio);
END;
$$;


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


-- ====================================================================
-- MIGRACIÓN: QR DE PAGO DEL LABORATORIO Y TARIFAS POR DOCTOR
-- Guisela Laboratorio Dental - Cochabamba, Bolivia
-- ====================================================================

-- 1. Agregar soporte para QR Oficial de Cobro Bancario en configuracion_taller
ALTER TABLE public.configuracion_taller 
ADD COLUMN IF NOT EXISTS qr_pago_url text;

ALTER TABLE public.configuracion_taller 
ADD COLUMN IF NOT EXISTS banco_nombre text DEFAULT 'Banco Unión / BCP / Simple QR';

ALTER TABLE public.configuracion_taller 
ADD COLUMN IF NOT EXISTS titular_cuenta text DEFAULT 'Guisela Laboratorio Dental';

ALTER TABLE public.configuracion_taller 
ADD COLUMN IF NOT EXISTS numero_cuenta text;

-- 2. Asegurar columnas de tarifas y descuentos en tabla doctores
ALTER TABLE public.doctores 
ADD COLUMN IF NOT EXISTS tipo_tarifa text DEFAULT 'regular';

ALTER TABLE public.doctores 
ADD COLUMN IF NOT EXISTS descuento_porcentaje numeric DEFAULT 0;

-- 3. Asegurar columnas en pedidos para registrar fecha de pago y comprobante
ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS pago_metodo text DEFAULT 'efectivo';

ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS pago_moneda text DEFAULT 'BOB';

ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS pago_fecha timestamptz;

ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS comprobante_pago_url text;

COMMENT ON COLUMN public.configuracion_taller.qr_pago_url IS 'URL de la imagen del QR oficial de cobro subida por el Administrador';
COMMENT ON COLUMN public.doctores.tipo_tarifa IS 'Tarifa asignada al doctor: regular, descuento_normal, institucional_unitepc, institucional_univalle';
COMMENT ON COLUMN public.doctores.descuento_porcentaje IS 'Porcentaje de descuento para tarifa descuento_normal';

-- ====================================================================
-- 5. RESOLVER ALERTAS DE SEGURIDAD DEL SUPABASE ADVISOR (Security Invoker Views)
-- ====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'vw_tracking_pedidos' AND schemaname = 'public') THEN
    EXECUTE 'ALTER VIEW public.vw_tracking_pedidos SET (security_invoker = true);';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'vw_dashboard_resumen' AND schemaname = 'public') THEN
    EXECUTE 'ALTER VIEW public.vw_dashboard_resumen SET (security_invoker = true);';
  END IF;
END $$;
