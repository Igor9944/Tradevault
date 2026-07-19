import { createClient } from '@supabase/supabase-js'

const URL  = import.meta.env.VITE_SUPABASE_URL
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!URL || !ANON) {
  console.error('[TradeVault] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquant')
}

export const supabase = createClient(
  URL  ?? 'https://placeholder.supabase.co',
  ANON ?? 'placeholder',
  { auth: { persistSession: true, storageKey: 'tv_session_v2', autoRefreshToken: true, detectSessionInUrl: true } }
)

export const isSupabaseOnline = !!(URL && ANON)
