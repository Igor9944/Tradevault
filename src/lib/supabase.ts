import {createClient} from '@supabase/supabase-js';
const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!URL || !ANON) {
  console.warn('[TradeVault] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing – limited functionality');
  export const supabase = null as any;
  export const isSupabaseOnline = false;
} else {
  export const supabase = createClient(URL, ANON, {
    auth: {persistSession:true, storageKey:'tv_session_v2', autoRefreshToken:true, detectSessionInUrl:true}
  });
  export const isSupabaseOnline = true;
}