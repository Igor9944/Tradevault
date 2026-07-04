/**
 * supabaseSync.ts — TradeVault
 * Stratégie : Supabase PRIMARY → Proxy Express FALLBACK → InMemory EMERGENCY
 * Session persistée via Supabase Auth + localStorage chiffré
 */

import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const PROXY_URL = '/api/supabase/proxy';
const SESSION_KEY = 'tv_session_v2';

import { User as AppUser } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type User = AppUser;

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session | null;
  error?: string;
}

// ─── Client Supabase Singleton ────────────────────────────────────────────────

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[SUPABASE] Variables env manquantes — mode dégradé');
    return null;
  }
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,           // ← Persiste la session dans localStorage
        autoRefreshToken: true,         // ← Refresh JWT automatique
        detectSessionInUrl: true,
        storageKey: SESSION_KEY,
      },
    });
  }
  return _supabase;
}

export const supabase = getSupabase();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function profileToUser(profile: Record<string, any>, email: string): User {
  return {
    id: profile.id,
    email: profile.email || email,
    username: profile.username || profile.full_name || email.split('@')[0],
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
}

async function invokeProxy(action: string, args: Record<string, any>): Promise<any> {
  const sb = getSupabase();
  const session = sb ? (await sb.auth.getSession()).data.session : null;

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify({ action, arguments: args }),
  });

  if (!res.ok) {
    throw new Error(`Proxy HTTP ${res.status}`);
  }
  return res.json();
}

// ─── AUTH : Sign In ───────────────────────────────────────────────────────────

export async function signInWithSupabase(
  emailInput: string,
  passwordInput: string
): Promise<AuthResult> {
  const cleanEmail = emailInput.trim().toLowerCase();
  const sb = getSupabase();

  // ── Étape 1 : Supabase SDK direct (PRIMARY) ──────────────────────────────
  if (sb) {
    try {
      const { data: authData, error: authError } = await sb.auth.signInWithPassword({
        email: cleanEmail,
        password: passwordInput,
      });

      if (!authError && authData?.user && authData?.session) {
        // Charger profil
        const { data: profile, error: profileErr } = await sb
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (!profileErr && profile) {
          console.info('[AUTH] ✅ Supabase direct OK');
          return {
            success: true,
            user: profileToUser(profile, cleanEmail),
            session: authData.session,
          };
        }
      }

      // Si erreur claire (mauvais mdp), ne pas essayer le fallback
      if (authError?.message?.toLowerCase().includes('invalid login credentials')) {
        return { success: false, error: 'Identifiants invalides.' };
      }
    } catch (clientErr) {
      console.warn('[AUTH] SDK direct failed, routing to proxy...', clientErr);
    }
  }

  // ── Étape 2 : Proxy Express (FALLBACK réseau) ─────────────────────────────
  try {
    const res = await invokeProxy('signIn', { email: cleanEmail, password: passwordInput });

    if (res.success && res.user) {
      console.info('[AUTH] ✅ Proxy fallback OK');
      // Persister user minimal dans sessionStorage en cas de déconnexion
      sessionStorage.setItem(SESSION_KEY + '_fallback', JSON.stringify({
        user: res.user,
        timestamp: Date.now(),
      }));
      return {
        success: true,
        user: res.user as User,
        session: null, // pas de JWT Supabase en fallback
      };
    }
    return { success: false, error: res.error || 'Identifiants invalides.' };
  } catch (proxyErr: any) {
    console.error('[AUTH] Proxy failed:', proxyErr);
    return {
      success: false,
      error: 'Serveur inaccessible. Vérifiez votre connexion.',
    };
  }
}

// ─── AUTH : Sign Out ─────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const sb = getSupabase();

  // Nettoyer fallback
  sessionStorage.removeItem(SESSION_KEY + '_fallback');

  if (sb) {
    try {
      await sb.auth.signOut();
    } catch (e) {
      console.warn('[AUTH] signOut error:', e);
    }
  }
}

// ─── AUTH : Restaurer session au chargement ───────────────────────────────────

export async function restoreSession(): Promise<AuthResult> {
  const sb = getSupabase();

  // 1. Tenter restauration Supabase (token stocké automatiquement)
  if (sb) {
    try {
      const { data: { session } } = await sb.auth.getSession();

      if (session?.user) {
        const { data: profile } = await sb
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile) {
          console.info('[SESSION] ✅ Session Supabase restaurée');
          return {
            success: true,
            user: profileToUser(profile, session.user.email || ''),
            session,
          };
        }
      }
    } catch (e) {
      console.warn('[SESSION] restore failed:', e);
    }
  }

  // 2. Fallback : session temporaire (durée max 8h)
  const fallbackRaw = sessionStorage.getItem(SESSION_KEY + '_fallback');
  if (fallbackRaw) {
    try {
      const fallback = JSON.parse(fallbackRaw);
      const age = Date.now() - (fallback.timestamp || 0);
      if (age < 8 * 60 * 60 * 1000) {
        console.info('[SESSION] ⚡ Session fallback restaurée (expires in', Math.round((8 * 60 * 60 * 1000 - age) / 60000), 'min)');
        return { success: true, user: fallback.user };
      }
    } catch (e) {
      sessionStorage.removeItem(SESSION_KEY + '_fallback');
    }
  }

  return { success: false, error: 'Aucune session active.' };
}

// ─── AUTH : Google OAuth ──────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<AuthResult & { url?: string }> {
  const sb = getSupabase();
  if (!sb) return { success: false, error: 'Supabase non disponible.' };

  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
      skipBrowserRedirect: true,
    },
  });

  if (error) return { success: false, error: error.message };
  return { success: true, url: data?.url || undefined };
}

// ─── LISTENER : Changements de session ───────────────────────────────────────

export function onAuthStateChange(
  callback: (user: User | null) => void
): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};

  const { data: { subscription } } = sb.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        sessionStorage.removeItem(SESSION_KEY + '_fallback');
        callback(null);
        return;
      }

      if (session?.user) {
        try {
          const { data: profile } = await sb
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile) {
            callback(profileToUser(profile, session.user.email || ''));
          }
        } catch (e) {
          console.error('[AUTH_CHANGE]', e);
        }
      }
    }
  );

  return () => subscription.unsubscribe();
}

// ─── DATA : Charger profil utilisateur ───────────────────────────────────────

export async function loadUserProfile(userId: string): Promise<User | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data: profile, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) return null;
  return profileToUser(profile, profile.email || '');
}

// ─── DATA : Sync locale → Supabase ───────────────────────────────────────────

export async function syncToSupabase<T extends Record<string, any>>(
  table: string,
  data: T,
  userId: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  const sb = getSupabase();
  if (!sb) {
    // Stocker en attente de synchro
    const pending = JSON.parse(localStorage.getItem('tv_pending_sync') || '[]');
    pending.push({ table, data, userId, timestamp: Date.now() });
    localStorage.setItem('tv_pending_sync', JSON.stringify(pending));
    return { success: true, data }; // optimistic
  }

  const { data: result, error } = await sb
    .from(table)
    .upsert({ ...data, user_id: userId })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: result as T };
}

// ─── DATA : Vider la queue de synchro en attente ─────────────────────────────

export async function flushPendingSync(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const pending = JSON.parse(localStorage.getItem('tv_pending_sync') || '[]');
  if (!pending.length) return;

  const done: number[] = [];

  for (let i = 0; i < pending.length; i++) {
    const { table, data, userId } = pending[i];
    try {
      const { error } = await sb
        .from(table)
        .upsert({ ...data, user_id: userId });
      if (!error) done.push(i);
    } catch (e) {
      console.warn('[SYNC_FLUSH] Failed for', table, e);
    }
  }

  const remaining = pending.filter((_: any, i: number) => !done.includes(i));
  localStorage.setItem('tv_pending_sync', JSON.stringify(remaining));
  if (done.length > 0) {
    console.info(`[SYNC_FLUSH] ✅ ${done.length} opération(s) synchronisée(s)`);
  }
}

// ─── BACKWARD COMPATIBILITY HELPERS ──────────────────────────────────────────

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function ensureUUID(id: string | null | undefined): string {
  if (!id || id.length < 10) return generateUUID();
  return id;
}

export async function syncUserProfile(user: User): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from('profiles').upsert({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status,
    subscription_status: user.subscription_status,
    plan: user.plan,
    premium_expires_at: user.premium_expires_at,
    country: user.country,
    avatar_url: user.avatar_url || (user as any).avatar,
    updated_at: new Date().toISOString()
  });
}

export async function patchUserProfile(userId: string, updates: Partial<User>): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const dbUpdates: any = {};
  if (updates.username !== undefined) dbUpdates.username = updates.username;
  if (updates.role !== undefined) dbUpdates.role = updates.role;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.subscription_status !== undefined) dbUpdates.subscription_status = updates.subscription_status;
  if (updates.plan !== undefined) dbUpdates.plan = updates.plan;
  if (updates.premium_expires_at !== undefined) dbUpdates.premium_expires_at = updates.premium_expires_at;
  if (updates.country !== undefined) dbUpdates.country = updates.country;
  
  const avatarVal = updates.avatar_url !== undefined ? updates.avatar_url : (updates as any).avatar;
  if (avatarVal !== undefined) dbUpdates.avatar_url = avatarVal;

  await sb.from('profiles').update(dbUpdates).eq('id', userId);
}

export async function fetchUserProfile(userId: string): Promise<User | null> {
  return loadUserProfile(userId);
}

export async function saveAccountToSupabase(userId: string, account: any): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from('trading_accounts').upsert({
    id: ensureUUID(account.id),
    user_id: userId,
    name: account.name || 'Default',
    broker: account.broker || account.prop_firm_name || 'Manual',
    type: account.account_type === 'prop_firm' ? 'funded' : 'personal',
    starting_balance: account.capital || account.starting_balance || 1000,
    current_balance: account.balance || account.current_balance || 1000,
    currency: account.currency || 'USD',
    is_active: true,
    created_at: account.created_at || new Date().toISOString()
  });
}

export async function deleteAccountFromSupabase(accountId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from('trading_accounts').delete().eq('id', accountId);
}

export async function saveTradeToSupabase(userId: string, trade: any): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from('trades').upsert({
    id: ensureUUID(trade.id),
    user_id: userId,
    account_id: trade.account_id || trade.accountId,
    symbol: trade.pair || trade.symbol || 'EURUSD',
    side: (trade.type || trade.side || 'buy').toLowerCase(),
    entry_price: trade.entry || trade.entry_price || 0,
    exit_price: trade.exit || trade.exit_price || 0,
    size_lots: trade.lots || trade.size_lots || 0.1,
    profit_loss: trade.pnl || trade.profit_loss || 0,
    fees: trade.fees || 0,
    commission: trade.commission || 0,
    execution_time_entry: trade.created_at || new Date().toISOString(),
    trade_date: trade.date || trade.trade_date || new Date().toISOString().split('T')[0],
    notes: trade.notes || '',
    session: trade.session || '',
    setup: trade.setup || '',
    emotion: trade.emotion || '',
    mindset: trade.mindset || ''
  });
}

export async function deleteTradeFromSupabase(tradeId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from('trades').delete().eq('id', tradeId);
}

export async function saveChallengeToSupabase(userId: string, challenge: any): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from('challenges').upsert({
    id: ensureUUID(challenge.id),
    user_id: userId,
    account_id: challenge.account_id || challenge.accountId,
    name: challenge.name || 'Challenge',
    capital: challenge.capital || 100000,
    target: challenge.target || 10,
    daily_loss: challenge.daily_loss || 5,
    global_loss: challenge.global_loss || 10,
    status: challenge.status || 'ongoing',
    created_at: challenge.created_at || new Date().toISOString()
  });
}

export async function deleteChallengeFromSupabase(challengeId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from('challenges').delete().eq('id', challengeId);
}

export async function savePaymentToSupabase(userId: string, payment: any): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from('payment_requests').upsert({
    id: ensureUUID(payment.id),
    user_id: userId,
    amount: payment.amount || 30,
    screenshot_url: payment.screenshot_url || payment.screenshot || '',
    network: payment.network || 'TRC20',
    status: payment.status || 'pending',
    type: payment.type || 'registration',
    created_at: payment.created_at || new Date().toISOString()
  });
}

export async function registerPayment(userId: string, amount: number, screenshot: string, network: string = 'TRC20', type: string = 'registration'): Promise<any> {
  const sb = getSupabase();
  if (!sb) return { success: false };
  const { data, error } = await sb.from('payment_requests').insert({
    id: generateUUID(),
    user_id: userId,
    amount,
    screenshot_url: screenshot,
    network,
    status: 'pending',
    type,
    created_at: new Date().toISOString()
  }).select().single();
  return { success: !error, data };
}

export async function adminLoadAllUsersFromSupabase(): Promise<any[]> {
  const res = await invokeProxy('adminLoadAllUsers', {});
  return res.success ? res.users || [] : [];
}

export async function adminLoadAllPaymentsFromSupabase(): Promise<any[]> {
  const res = await invokeProxy('adminLoadAllPayments', {});
  return res.success ? res.payments || [] : [];
}

export async function adminDeleteUserFromSupabase(userId: string): Promise<boolean> {
  const res = await invokeProxy('adminDeleteUser', { userId });
  return !!res.success;
}

export async function adminUpdateUserFromSupabase(userId: string, updates: any): Promise<boolean> {
  const res = await invokeProxy('adminUpdateUser', { userId, updates });
  return !!res.success;
}

export async function handleSupabaseSession(session?: any): Promise<any> {
  const sb = getSupabase();
  if (!sb) return { success: false, error: 'Supabase non disponible.' };

  const targetSession = session || (await sb.auth.getSession()).data.session;
  if (!targetSession?.user) {
    return { success: false, error: 'Aucune session active.' };
  }

  try {
    const { data: profile } = await sb
      .from('profiles')
      .select('*')
      .eq('id', targetSession.user.id)
      .maybeSingle();

    if (profile) {
      return {
        success: true,
        user: profileToUser(profile, targetSession.user.email || ''),
        session: targetSession,
      };
    }
  } catch (e) {
    console.warn('[handleSupabaseSession] failed to load profile:', e);
  }

  return { success: false, error: 'Profil non trouvé.' };
}

export async function signUpWithSupabase(
  emailInput: string, passwordInput: string, usernameInput: string,
  countryInput: string, paymentScreenshot: string, selectedNetwork: string,
  subscriptionPrice: number, regAvatar: string
): Promise<AuthResult> {
  const res = await invokeProxy('signUp', {
    email: emailInput,
    password: passwordInput,
    username: usernameInput,
    country: countryInput,
    paymentScreenshot,
    selectedNetwork,
    subscriptionPrice,
    regAvatar
  });
  return res;
}

export async function loadAdminSettings(): Promise<any> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from('admin_settings').select('*').maybeSingle();
  return data;
}

export async function saveAdminSettings(settings: any): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from('admin_settings').upsert({ id: 1, ...settings });
}

export async function loadUserDataFromSupabase(userId: string): Promise<any> {
  const sb = getSupabase();
  if (!sb) return null;
  const [accs, trds, chs, pay] = await Promise.all([
    sb.from('trading_accounts').select('*').eq('user_id', userId).eq('is_active', true),
    sb.from('trades').select('*').eq('user_id', userId),
    sb.from('challenges').select('*').eq('user_id', userId),
    sb.from('payment_requests').select('*').eq('user_id', userId)
  ]);
  return {
    accounts: accs.data || [],
    trades: trds.data || [],
    challenges: chs.data || [],
    payments: pay.data || []
  };
}

export async function updateUserRole(userId: string, role?: string, status?: string, subscription_status?: string, plan?: string, premium_expires_at?: string | null): Promise<boolean> {
  const res = await invokeProxy('updateUserRole', { userId, role, status, subscription_status, plan, premium_expires_at });
  return !!res.success;
}

export default supabase;

