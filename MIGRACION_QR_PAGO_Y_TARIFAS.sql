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
