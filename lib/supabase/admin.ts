import { createClient } from "@supabase/supabase-js";

// Client service role — bypass RLS, uniquement pour les Server Actions admin
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
