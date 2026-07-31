import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials are missing. Please define VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your environment.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
