import {createClient} from '@supabase/supabase-js';
const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: any = null;
let isSupabaseOnline = false;

if (!URL || !ANON) {
  console.warn('[TradeVault] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing – limited functionality');
} else {
  supabase = createClient(URL, ANON, {
    auth: {persistSession:true, storageKey:'tv_session_v2', autoRefreshToken:true, detectSessionInUrl:true}
  });
  isSupabaseOnline = true;
}

export { supabase, isSupabaseOnline };