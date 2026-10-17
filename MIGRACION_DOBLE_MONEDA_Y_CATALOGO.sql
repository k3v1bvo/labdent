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
