import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_token";

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn("⚠️ [TradeVault Pro] Warning: Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing. Running in local fallback mode.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
