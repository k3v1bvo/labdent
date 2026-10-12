-- =====================================================
-- SCHEMA: Sistema de Gestión Integral - Laboratorio Dental
-- Base de datos PostgreSQL para Supabase
-- Autor: Proyecto GPT (Next.js 15 + Supabase)
-- Fecha: 2025-11-03
-- =====================================================

CREATE TYPE user_role AS ENUM ('admin', 'secretaria', 'doctor', 'tecnico');
CREATE TYPE pedido_estado AS ENUM ('pendiente', 'en_proceso', 'finalizado', 'entregado', 'devuelto');
CREATE TYPE paciente_genero AS ENUM ('H', 'M');
CREATE TYPE archivo_tipo AS ENUM ('modelo_3d_link', 'imagen', 'documento', 'otro');
CREATE TYPE estacion_estado AS ENUM ('pendiente', 'en_proceso', 'completado', 'devuelto');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(20),
  rol user_role NOT NULL DEFAULT 'tecnico',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TABLE public.doctores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinica VARCHAR(120),
  especialidad VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_nombre VARCHAR(100) NOT NULL,
  paciente_genero paciente_genero NOT NULL,
  piezas TEXT,
  observaciones TEXT,
  doctor_id UUID REFERENCES public.doctores(id) ON DELETE SET NULL,
  estado pedido_estado DEFAULT 'pendiente',
  modelo_3d_link TEXT,
  anticipo NUMERIC(10,2),
  total NUMERIC(10,2),
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_entrega TIMESTAMP,
  creado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.estaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(50) NOT NULL,
  orden INT NOT NULL,
  descripcion TEXT
);

CREATE TABLE public.historial_estaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  estacion_id UUID NOT NULL REFERENCES public.estaciones(id),
  tecnico_id UUID REFERENCES public.profiles(id),
  fecha_inicio TIMESTAMP DEFAULT NOW(),
  fecha_fin TIMESTAMP,
  estado estacion_estado DEFAULT 'pendiente',
  comentarios TEXT
);

CREATE TABLE public.archivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  tipo archivo_tipo NOT NULL DEFAULT 'documento',
  url_archivo TEXT NOT NULL,
  descripcion TEXT,
  subido_por UUID REFERENCES public.profiles(id),
  fecha_subida TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.auditoria (
  id BIGSERIAL PRIMARY KEY,
  accion TEXT,
  tabla TEXT,
  usuario UUID REFERENCES public.profiles(id),
  fecha TIMESTAMP DEFAULT NOW(),
  detalles JSONB
);

CREATE OR REPLACE FUNCTION registrar_auditoria()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.auditoria(tabla, accion, usuario, detalles)
  VALUES (TG_TABLE_NAME, TG_OP, auth.uid(), row_to_json(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_pedidos
AFTER INSERT OR UPDATE OR DELETE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

CREATE OR REPLACE VIEW public.vw_dashboard_resumen AS
SELECT 
  COUNT(*) FILTER (WHERE estado = 'pendiente') AS pedidos_pendientes,
  COUNT(*) FILTER (WHERE estado = 'en_proceso') AS pedidos_en_proceso,
  COUNT(*) FILTER (WHERE estado = 'finalizado') AS pedidos_finalizados,
  COUNT(*) FILTER (WHERE estado = 'entregado') AS pedidos_entregados,
  ROUND(AVG(EXTRACT(EPOCH FROM (fecha_entrega - fecha_creacion)) / 3600),2) AS tiempo_promedio_horas,
  SUM(total) AS ingresos_totales,
  DATE_TRUNC('day', fecha_creacion) AS fecha
FROM public.pedidos
GROUP BY fecha
ORDER BY fecha DESC;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_estaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cada usuario ve su perfil" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin full access profiles" ON public.profiles
  FOR ALL USING (
    EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.rol = 'admin')
  );

CREATE POLICY "Secretaria crea pedidos" ON public.pedidos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.rol IN ('admin','secretaria'))
  );

CREATE POLICY "Doctor ve sus pedidos" ON public.pedidos
  FOR SELECT USING (
    doctor_id IN (
      SELECT d.id FROM public.doctores d WHERE d.profile_id = auth.uid()
    )
  );

CREATE POLICY "Técnico accede a su trabajo" ON public.historial_estaciones
  FOR SELECT USING (tecnico_id = auth.uid());

CREATE POLICY "Admin full access pedidos" ON public.pedidos
  FOR ALL USING (
    EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.rol = 'admin')
  );

INSERT INTO public.estaciones (id, nombre, orden, descripcion)
VALUES
  (gen_random_uuid(), 'Moldeado', 1, 'Creación del molde físico'),
  (gen_random_uuid(), 'Escaneo 3D', 2, 'Escaneo del modelo físico'),
  (gen_random_uuid(), 'Modelado Digital', 3, 'Ajuste del modelo digital según ficha técnica'),
  (gen_random_uuid(), 'Fresado', 4, 'Fabricación de la pieza física'),
  (gen_random_uuid(), 'Pulido y Control', 5, 'Acabado y control final antes de entrega');
