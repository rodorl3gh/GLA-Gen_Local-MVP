import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Client for public operations (anon key — safe for browser)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (service role — bypasses RLS)
export function getSupabaseAdmin() {
  if (typeof window !== "undefined") {
    throw new Error("Admin client cannot be used in browser");
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}
