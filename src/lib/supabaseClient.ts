import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://ofrrpkajnkfqvqdmonpo.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mcnJwa2FqbmtmcXZxZG1vbnBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NjgwMTcsImV4cCI6MjEwNzM0NDAxN30.yHu1nxfhycZ4awuDCknTkhzaKFjbbVTQmu5cZyzs5zE";

// ✅ Cliente Supabase listo para usar en cualquier componente
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
