-- ====================================================================
-- ACTUALIZACIÓN DE TRIGGER: ROL POR DEFECTO DOCTOR PARA GOOGLE OAUTH
-- ====================================================================
-- Ejecuta este script en el SQL Editor de tu Dashboard de Supabase.
-- Garantiza que cualquier usuario nuevo registrado con Google o formulario
-- se cree automáticamente con rol 'doctor' y registro en la tabla 'doctores'.
-- Los roles de 'tecnico', 'secretaria' o 'admin' solo pueden ser otorgados
-- manualmente por el Administrador desde /dashboard/admin/users.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
DECLARE
  v_rol public.user_role := 'doctor';
  v_raw_rol text;
  v_nombre text;
BEGIN
  -- Si viene un rol explícito en la metadata (por ejemplo creado por admin), respetarlo
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    v_raw_rol := NEW.raw_user_meta_data->>'rol';
    IF v_raw_rol IN ('admin', 'secretaria', 'doctor', 'tecnico') THEN
      v_rol := v_raw_rol::public.user_role;
    END IF;
  END IF;

  v_nombre := COALESCE(
    NEW.raw_user_meta_data->>'nombre',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'Doctor'
  );

  -- 1. Insertar o actualizar en profiles (preservando si ya es admin o secretaria)
  INSERT INTO public.profiles (id, nombre, rol)
  VALUES (NEW.id, v_nombre, v_rol)
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    rol = CASE 
      WHEN profiles.rol IN ('admin', 'secretaria') THEN profiles.rol
      ELSE EXCLUDED.rol 
    END;

  -- 2. Si es doctor, garantizar que exista en la tabla doctores
  IF v_rol = 'doctor' THEN
    INSERT INTO public.doctores (profile_id, nombre, clinica, especialidad)
    VALUES (
      NEW.id,
      v_nombre,
      COALESCE(NEW.raw_user_meta_data->>'clinica', 'Clínica Dr(a). ' || v_nombre),
      COALESCE(NEW.raw_user_meta_data->>'especialidad', 'Rehabilitación Oral')
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Asegurar que el trigger esté activo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Reparar usuarios existentes creados por Google que hayan quedado erróneamente como 'tecnico' sin estación asignada
UPDATE public.profiles p
SET rol = 'doctor'
WHERE p.rol = 'tecnico'
  AND NOT EXISTS (
    SELECT 1 FROM public.tecnico_estacion te WHERE te.tecnico_id = p.id
  )
  AND p.id NOT IN (
    SELECT id FROM auth.users WHERE email = 'tecnico@labdent.com'
  );

-- Asegurar que todos los perfiles con rol 'doctor' tengan su fila en public.doctores
INSERT INTO public.doctores (profile_id, nombre, clinica, especialidad)
SELECT 
  p.id, 
  p.nombre, 
  'Clínica Dr(a). ' || COALESCE(p.nombre, 'Doctor'), 
  'Rehabilitación Oral'
FROM public.profiles p
WHERE p.rol = 'doctor'
  AND NOT EXISTS (
    SELECT 1 FROM public.doctores d WHERE d.profile_id = p.id
  );
