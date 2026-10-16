import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://ofrrpkajnkfqvqdmonpo.supabase.co";

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mcnJwa2FqbmtmcXZxZG1vbnBvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTc2ODAxNywiZXhwIjoyMTA3MzQ0MDE3fQ.Ek0B2rdqG_eE5ZQpY-cw6IEEAlnvZM3WtvQd5tw8COw";

// Cliente administrativo de Supabase con Service Role Key (Solo para Server Components y API Routes)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
