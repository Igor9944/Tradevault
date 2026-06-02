import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

let isSupabaseOnline: boolean | null = null;

// Custom pre-flight fetch interceptor to gracefully avoid unneeded direct client console network errors
const customSupabaseFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (isSupabaseOnline === false) {
    throw new TypeError("Failed to fetch");
  }

  try {
    const response = await fetch(input, init);
    if (response.status === 502 || response.status === 504) {
      isSupabaseOnline = false;
      throw new TypeError("Failed to fetch");
    }
    isSupabaseOnline = true;
    return response;
  } catch (err) {
    isSupabaseOnline = false;
    throw new TypeError("Failed to fetch");
  }
};

if (!supabaseUrl || !supabaseAnonKey) {
  isSupabaseOnline = false;
  console.warn("⚠️ [TradeVault Pro] Warning: Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing. Running in local fallback mode.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customSupabaseFetch
  }
});
