import { createClient } from '@supabase/supabase-js';
import { safeLocalStorage } from '../utils/safeStorage';

const dummyUrl = "https://placeholder-project.supabase.co";
const dummyKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE1Nzg4OTk2MDAsImV4cCI6MTg5NDQ1OTYwMH0.placeholder";

let rawUrl = import.meta.env.VITE_SUPABASE_URL || dummyUrl;
if (rawUrl && rawUrl.includes('supabase.com/dashboard/project/')) {
  const match = rawUrl.match(/project\/([a-z0-9]+)/);
  if (match) {
    rawUrl = `https://${match[1]}.supabase.co`;
  }
} else if (rawUrl && !rawUrl.startsWith('http')) {
  // Assume it's just the project reference string
  rawUrl = `https://${rawUrl}.supabase.co`;
}
const supabaseUrl = rawUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || dummyKey;

let isSupabaseOnline: boolean | null = null;

// Custom pre-flight fetch interceptor to gracefully avoid unneeded direct client console network errors
const customSupabaseFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (isSupabaseOnline === false) {
    // Return a mock response instead of throwing to prevent app crash
    return new Response(JSON.stringify({ error: "Supabase is offline (cached state)" }), { 
      status: 503, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    const response = await fetch(input, init);
    if (response.status === 502 || response.status === 504) {
      isSupabaseOnline = false;
      return new Response(JSON.stringify({ error: "Supabase gateway error" }), { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    isSupabaseOnline = true;
    return response;
  } catch (err) {
    isSupabaseOnline = false;
    // Catch network errors and return mock response instead of re-throwing
    console.warn("[Supabase] Fetch intercepted failure:", err);
    return new Response(JSON.stringify({ error: "Network error during fetch" }), { 
      status: 503, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
};

if (supabaseUrl === dummyUrl || supabaseAnonKey === dummyKey) {
  isSupabaseOnline = false;
  console.warn("⚠️ [TradeVault Pro] Warning: Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing. Running in local fallback mode.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeLocalStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: customSupabaseFetch
  }
});
