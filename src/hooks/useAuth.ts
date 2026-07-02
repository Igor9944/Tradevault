import { useState, useEffect } from 'react';
import { User } from '../types';
import { safeLocalStorage, safeSessionStorage } from '../utils/safeStorage';
import { signInWithSupabase } from '../utils/supabaseSync';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = safeSessionStorage.getItem('tv_current_user') || safeLocalStorage.getItem('tv_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Sync with storage changes
    const handleStorageChange = () => {
      const saved = safeSessionStorage.getItem('tv_current_user') || safeLocalStorage.getItem('tv_current_user');
      setUser(saved ? JSON.parse(saved) : null);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (emailInput: string, passwordInput: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await signInWithSupabase(emailInput, passwordInput);
      if (res.success && res.user) {
        setUser(res.user);
        safeSessionStorage.setItem('tv_current_user', JSON.stringify(res.user));
        safeLocalStorage.setItem('tv_current_user', JSON.stringify(res.user));
        return { success: true, user: res.user };
      } else {
        setError(res.error || 'Erreur de connexion');
        return { success: false, error: res.error };
      }
    } catch (err: any) {
      const msg = err.message || String(err);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signout failed, clearing storage anyway.');
    }
    safeSessionStorage.removeItem('tv_current_user');
    safeLocalStorage.removeItem('tv_current_user');
    setUser(null);
    setLoading(false);
  };

  return {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  };
}
