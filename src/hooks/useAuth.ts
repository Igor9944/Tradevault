/**
 * useAuth.ts — Hook de gestion d'authentification TradeVault
 * Session persistée, restaurée automatiquement, sync Supabase
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  signInWithSupabase,
  signInWithGoogle,
  signOut as authSignOut,
  restoreSession,
  onAuthStateChange,
  flushPendingSync,
  User,
} from '../utils/supabaseSync';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isOnline: boolean;
}

interface UseAuth extends AuthState {
  signIn: (email: string, password: string) => Promise<boolean>;
  signInGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

export function useAuth(): UseAuth {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,   // true au démarrage → restauration session
    error: null,
    isOnline: navigator.onLine,
  });

  const syncFlushed = useRef(false);

  // ── Écoute connectivité ──────────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setState(s => ({ ...s, isOnline: true }));
      // Flush les opérations en attente dès reconnexion
      if (!syncFlushed.current) {
        syncFlushed.current = true;
        flushPendingSync().finally(() => { syncFlushed.current = false; });
      }
    };
    const handleOffline = () => setState(s => ({ ...s, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Restauration session au montage ──────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function restore() {
      try {
        const result = await restoreSession();
        if (mounted) {
          setState(s => ({
            ...s,
            user: result.success ? result.user || null : null,
            loading: false,
          }));
        }
      } catch (e) {
        if (mounted) setState(s => ({ ...s, loading: false }));
      }
    }

    restore();

    // Écouter les changements Supabase Auth (refresh token, etc.)
    const unsub = onAuthStateChange(user => {
      if (mounted) setState(s => ({ ...s, user }));
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  // ── Sign In ───────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    setState(s => ({ ...s, loading: true, error: null }));

    const result = await signInWithSupabase(email, password);

    setState(s => ({
      ...s,
      loading: false,
      user: result.success ? result.user || null : null,
      error: result.success ? null : (result.error || 'Erreur de connexion.'),
    }));

    return result.success;
  }, []);

  // ── Sign In Google ────────────────────────────────────────────────────────
  const signInGoogle = useCallback(async (): Promise<boolean> => {
    setState(s => ({ ...s, loading: true, error: null }));
    const result = await signInWithGoogle();
    if (!result.success) {
      setState(s => ({ ...s, loading: false, error: result.error || 'Erreur Google.' }));
    }
    return result.success;
  }, []);

  // ── Sign Out ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    await authSignOut();
    setState({ user: null, loading: false, error: null, isOnline: navigator.onLine });
  }, []);

  // ── Clear Error ───────────────────────────────────────────────────────────
  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }));
  }, []);

  // ── Refresh user (ex: après update profil) ────────────────────────────────
  const refreshUser = useCallback(async () => {
    if (!state.user?.id) return;
    const result = await restoreSession();
    if (result.success && result.user) {
      setState(s => ({ ...s, user: result.user || null }));
    }
  }, [state.user?.id]);

  return { ...state, signIn, signInGoogle, signOut, clearError, refreshUser };
}
