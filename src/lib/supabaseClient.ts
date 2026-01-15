import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ✅ Cliente Supabase listo para usar en cualquier componente
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
