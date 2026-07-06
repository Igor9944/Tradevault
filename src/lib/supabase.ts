// src/lib/supabase.ts — Fix critique isSupabaseOnline
import { createClient } from '@supabase/supabase-js';
import { safeLocalStorage } from '../utils/safeStorage';

const dummyUrl = 'https://placeholder-project.supabase.co';
const dummyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

let rawUrl = import.meta.env.VITE_SUPABASE_URL || dummyUrl;
if (rawUrl?.includes('supabase.com/dashboard/project/')) {
  const match = rawUrl.match(/project\/([a-z0-9]+)/);
  if (match) rawUrl = `https://${match[1]}.supabase.co`;
} else if (rawUrl && !rawUrl.startsWith('http')) {
  rawUrl = `https://${rawUrl}.supabase.co`;
}

const supabaseUrl     = rawUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || dummyKey;

// ─── Fix : isSupabaseOnline ne passe plus à false sur 401/403 ─────────────────
// Un 401 = mauvais credentials (service UP), pas une panne réseau
let isSupabaseOnline: boolean | null = null;
let consecutiveNetworkErrors = 0;
const MAX_NETWORK_ERRORS = 3;

const customSupabaseFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  // Si trop d'erreurs réseau consécutives → court-circuit
  if (isSupabaseOnline === false && consecutiveNetworkErrors >= MAX_NETWORK_ERRORS) {
    throw new TypeError('Failed to fetch');
  }

  try {
    const response = await fetch(input, init);

    // ← FIX : 401/403 = service OK, pas une panne
    if (response.status === 401 || response.status === 403) {
      isSupabaseOnline = true;
      consecutiveNetworkErrors = 0;
      return response; // retourner la réponse normalement
    }

    // Vraies pannes réseau
    if (response.status === 502 || response.status === 504) {
      consecutiveNetworkErrors++;
      if (consecutiveNetworkErrors >= MAX_NETWORK_ERRORS) {
        isSupabaseOnline = false;
      }
      throw new TypeError('Failed to fetch');
    }

    isSupabaseOnline = true;
    consecutiveNetworkErrors = 0;
    return response;
  } catch (err) {
    // Erreur réseau réelle (pas une réponse HTTP)
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      consecutiveNetworkErrors++;
      if (consecutiveNetworkErrors >= MAX_NETWORK_ERRORS) {
        isSupabaseOnline = false;
      }
    }
    throw err;
  }
};

const isMissingEnv = supabaseUrl === dummyUrl || supabaseAnonKey === dummyKey;
if (isMissingEnv) {
  isSupabaseOnline = false;
  console.warn('⚠️ [TradeVault] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquantes.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage:          safeLocalStorage,
    persistSession:   true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey:       'tv_session_v2',
  },
  global: {
    fetch: customSupabaseFetch,
  },
});

export const isSupabaseConfigured = !isMissingEnv;
