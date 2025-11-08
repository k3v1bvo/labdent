import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Usamos un patrón Singleton: se crea una sola vez
let supabase: SupabaseClient;

if (!globalThis.supabase) {
  globalThis.supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: { apikey: supabaseAnonKey },
    },
  });
}

supabase = globalThis.supabase;

export { supabase };
