/**
 * useAuth.ts — Hook de gestion d'authentification TradeVault
 * Optimized version with caching and improved performance
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
  loadUserProfile,
} from '../utils/supabaseSync';
import { clientCache } from '../utils/cacheUtils';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  profileLoading: boolean; // Separate loading state for profile
}

interface UseAuth extends AuthState {
  signIn: (email: string, password: string) => Promise<boolean>;
  signInGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

/**
 * Optimized auth hook with profile caching
 */
export function useAuth(): UseAuth {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,   // true au démarrage → restauration session
    error: null,
    isOnline: navigator.onLine,
    profileLoading: false,
  });

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const syncFlushed = useRef(false);
  const authCheckInProgress = useRef(false);

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
    mountedRef.current = true;

    async function initializeAuth() {
      if (authCheckInProgress.current) return;
      authCheckInProgress.current = true;

      try {
        setState(s => ({ ...s, loading: true, error: null }));

        const result = await restoreSession();
        if (mountedRef.current) {
          setState(s => ({
            ...s,
            loading: false,
            user: result.success ? result.user || null : null,
          }));

          // Load user profile if we have a user
          if (result.success && result.user) {
            await loadUserProfileWithCache(result.user.id);
          }
        }
      } catch (e) {
        if (mountedRef.current) {
          setState(s => ({ ...s, loading: false, error: 'Erreur lors de l\'initialisation de l\'authentification.' }));
        }
      } finally {
        if (mountedRef.current) {
          authCheckInProgress.current = false;
        }
      }
    }

    initializeAuth();

    // Écouter les changements Supabase Auth (refresh token, etc.)
    const unsub = onAuthStateChange(async (user) => {
      if (!mountedRef.current) return;

      // Prevent multiple concurrent auth checks
      if (authCheckInProgress.current) return;
      authCheckInProgress.current = true;

      try {
        setState(s => ({ ...s, loading: true, error: null }));

        if (user) {
          setState(s => ({ ...s, user }));
          await loadUserProfileWithCache(user.id);
        } else {
          setState(s => ({ ...s, user: null }));
          // Clear profile cache on sign out
          const cacheKey = `user_profile_${state.user?.id || 'unknown'}`;
          clientCache.delete(cacheKey);
        }
      } catch (e) {
        console.warn('Auth state change error:', e);
        if (mountedRef.current) {
          setState(s => ({ ...s, loading: false, error: 'Erreur lors de la mise à jour de l\'authentification.' }));
        }
      } finally {
        if (mountedRef.current) {
          authCheckInProgress.current = false;
        }
      }
    });

    return () => {
      mountedRef.current = false;
      unsub();
    };
  }, []);

  // Cache user profile to reduce redundant calls
  const loadUserProfileWithCache = useCallback(async (userId: string) => {
    if (!userId) return;

    try {
      // Check cache first (cache for 5 minutes)
      const cacheKey = `user_profile_${userId}`;
      const cachedProfile = clientCache.get<{ profile: any; email: string }>(cacheKey);

      if (cachedProfile !== null) {
        const { profile, email } = cachedProfile;
        if (profile) {
          const userObj = {
            id: profile.id,
            email: profile.email || email,
            username: profile.username || email.split('@')[0],
            role: (profile.role as User['role']) || 'user',
            status: (profile.status as User['status']) || 'pending',
            subscription_status: (profile.subscription_status as User['subscription_status']) || 'pending',
            plan: (profile.plan as User['plan']) || 'free',
            premium_expires_at: profile.premium_expires_at || null,
            paid: profile.subscription_status === 'premium_active',
            paid_until: profile.premium_expires_at || null,
            avatar_url: profile.avatar_url || undefined,
            country: profile.country || 'TG',
            created_at: profile.created_at || new Date().toISOString(),
            google_linked: profile.google_linked || false,
            google_email: profile.google_email || '',
            currency: profile.currency || 'USD'
          };

          setState(s => ({ ...s, user: userObj }));
          return;
        }
      }

      // Fetch fresh profile
      setState(s => ({ ...s, profileLoading: true }));
      const profile = await loadUserProfile(userId);

      if (profile && mountedRef.current) {
        // Cache the profile
        const cacheKey = `user_profile_${userId}`;
        clientCache.set(cacheKey, { profile, email: profile.email || '' }, 5 * 60 * 1000);

        const userObj = {
          id: profile.id,
          email: profile.email || '',
          username: profile.username || (profile.email || '').split('@')[0],
          role: (profile.role as User['role']) || 'user',
          status: (profile.status as User['status']) || 'pending',
          subscription_status: (profile.subscription_status as User['subscription_status']) || 'pending',
          plan: (profile.plan as User['plan']) || 'free',
          premium_expires_at: profile.premium_expires_at || null,
          paid: profile.subscription_status === 'premium_active',
          paid_until: profile.premium_expires_at || null,
          avatar_url: profile.avatar_url || undefined,
          country: profile.country || 'TG',
          created_at: profile.created_at || new Date().toISOString(),
          google_linked: profile.google_linked || false,
          google_email: profile.google_email || '',
          currency: profile.currency || 'USD'
        };

        setState(s => ({ ...s, user: userObj, profileLoading: false }));
      } else if (mountedRef.current) {
        setState(s => ({ ...s, profileLoading: false }));
      }
    } catch (error) {
      console.warn('Failed to load user profile:', error);
      if (mountedRef.current) {
        setState(s => ({ ...s, profileLoading: false }));
      }
    }
  }, []);

  // ── Sign In ───────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    // Prevent multiple concurrent sign ins
    if (authCheckInProgress.current) return false;
    authCheckInProgress.current = true;

    try {
      setState(s => ({ ...s, loading: true, error: null, profileLoading: true }));

      const result = await signInWithSupabase(email, password);

      if (result.success && result.user) {
        // Load user profile with caching
        await loadUserProfileWithCache(result.user.id);

        setState(s => ({
          ...s,
          loading: false,
          profileLoading: false,
          user: null,
          error: null,
        }));
      } else {
        setState(s => ({
          ...s,
          loading: false,
          profileLoading: false,
          user: null,
          error: result.success ? null : (result.error || 'Erreur de connexion.'),
        }));
      }

      return result.success;
    } catch (error: any) {
      console.error('Sign in error:', error);
      setState(s => ({
        ...s,
        loading: false,
        profileLoading: false,
        user: null,
        error: 'Erreur lors de la connexion. Veuillez réessayer.',
      }));
      return false;
    } finally {
      authCheckInProgress.current = false;
    }
  }, [loadUserProfileWithCache]);

  // ── Sign In Google ────────────────────────────────────────────────────────
  const signInGoogle = useCallback(async (): Promise<boolean> => {
    // Prevent multiple concurrent sign ins
    if (authCheckInProgress.current) return false;
    authCheckInProgress.current = true;

    try {
      setState(s => ({ ...s, loading: true, error: null, profileLoading: true }));

      const result = await signInWithGoogle();

      if (result.success && result.user) {
        // Load user profile with caching
        await loadUserProfileWithCache(result.user.id);

        setState(s => ({
          ...s,
          loading: false,
          profileLoading: false,
          user: null,
          error: null,
        }));
      } else {
        setState(s => ({
          ...s,
          loading: false,
          profileLoading: false,
          user: null,
          error: result.success ? null : (result.error || 'Erreur Google.'),
        }));
      }

      return result.success;
    } catch (error: any) {
      console.error('Google sign in error:', error);
      setState(s => ({
        ...s,
        loading: false,
        profileLoading: false,
        user: null,
        error: 'Erreur lors de la connexion avec Google. Veuillez réessayer.',
      }));
      return false;
    } finally {
      authCheckInProgress.current = false;
    }
  }, [loadUserProfileWithCache]);

  // ── Sign Out ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    await authSignOut();

    // Clear user profile cache
    const cacheKey = `user_profile_${state.user?.id || 'unknown'}`;
    clientCache.delete(cacheKey);

    setState({ user: null, loading: false, error: null, isOnline: navigator.onLine, profileLoading: false });
  }, []);

  // ── Clear Error ───────────────────────────────────────────────────────────
  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }));
  }, []);

  // ── Refresh user (ex: après update profil) ────────────────────────────────
  const refreshUser = useCallback(async () => {
    if (!state.user?.id) return;

    // Prevent multiple concurrent refreshes
    if (authCheckInProgress.current) return;
    authCheckInProgress.current = true;

    try {
      setState(s => ({ ...s, loading: true, error: null, profileLoading: true }));

      // Clear cache to force fresh data
      const cacheKey = `user_profile_${state.user.id}`;
      clientCache.delete(cacheKey);

      const result = await restoreSession();
      if (result.success && result.user) {
        // Load fresh user profile
        await loadUserProfileWithCache(result.user.id);

        setState(s => ({
          ...s,
          loading: false,
          profileLoading: false,
          user: null,
          error: null,
        }));
      } else {
        setState(s => ({
          ...s,
          loading: false,
          profileLoading: false,
          user: null,
        }));
      }
    } catch (error: any) {
      console.error('Refresh user error:', error);
      setState(s => ({
        ...s,
        loading: false,
        profileLoading: false,
        error: 'Erreur lors du rafraîchissement de l\'utilisateur.',
      }));
    } finally {
      authCheckInProgress.current = false;
    }
  }, [state.user?.id, loadUserProfileWithCache]);

  return { ...state, signIn, signInGoogle, signOut, clearError, refreshUser };
}