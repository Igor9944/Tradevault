// src/lib/supabase.ts — v2.1 — 2026-07-12
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  ?? '';
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

let _client: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON) {
  _client = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      persistSession:     true,
      storageKey:         'tv_session_v2',
      autoRefreshToken:   true,
      detectSessionInUrl: true,
    },
  });
} else {
  console.warn(
    '[TradeVault] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing – limited functionality'
  );
}

export const supabase         = _client;
export const isSupabaseOnline = _client !== null;