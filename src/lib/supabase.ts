// src/lib/supabase.ts — Fix critique isSupabaseOnline
import { createClient } from '@supabase/supabase-js';
import { safeLocalStorage } from '../utils/safeStorage';

const dummyUrl = 'https://placeholder-project.supabase.co';
const dummyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Affiche un écran d'erreur lisible au lieu de crasher silencieusement
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="
        min-height:100vh;
        display:flex;
        align-items:center;
        justify-content:center;
        background:#0a0a0a;
        color:#fff;
        font-family:system-ui,sans-serif;
        text-align:center;
        padding:2rem;
      ">
        <div>
          <div style="font-size:2rem;margin-bottom:1rem">⚠️</div>
          <h1 style="color:#f87171;margin-bottom:.5rem">Configuration manquante</h1>
          <p style="color:#9ca3af;max-width:420px">
            Les variables <code style="color:#fbbf24">VITE_SUPABASE_URL</code> et
            <code style="color:#fbbf24">VITE_SUPABASE_ANON_KEY</code> ne sont pas définies.
          </p>
          <p style="color:#6b7280;font-size:.85rem;margin-top:1rem">
            Vercel → Settings → Environment Variables
          </p>
        </div>
      </div>
    `
  }
  // Lance quand même createClient avec des strings vides
  // pour éviter un crash TypeScript — l'app s'arrête sur l'écran d'erreur
}

// Valeurs fallback pour éviter le crash au démarrage
const url = SUPABASE_URL || 'https://placeholder.supabase.co';
const key = SUPABASE_ANON_KEY || 'placeholder-anon-key';

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

const isMissingEnv = SUPABASE_URL === dummyUrl || SUPABASE_ANON_KEY === dummyKey;
if (isMissingEnv) {
  isSupabaseOnline = false;
  console.warn('⚠️ [TradeVault] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquantes.');
}

export const supabase = createClient(url, key, {
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
export { isSupabaseOnline };