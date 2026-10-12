import { supabase } from "./supabaseClient";

/**
 * Obtiene el usuario autenticado y su perfil asociado en la tabla 'profiles'
 */
export async function getUserProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { user: null, profile: null, error: userError };
  }

  // Consultar la tabla 'profiles' vinculada por el ID del usuario
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return { user, profile: null, error: profileError };
  }

  return { user, profile, error: null };
}
