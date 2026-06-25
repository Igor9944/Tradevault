import { supabase } from '../lib/supabase';
import { User, Trade, Account, Challenge, PaymentRequest } from '../types';
import { safeLocalStorage, safeSessionStorage } from './safeStorage';

const dummyUrl = "https://placeholder-project.supabase.co";
const dummyKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE1Nzg4OTk2MDAsImV4cCI6MTg5NDQ1OTYwMH0.placeholder";

let rawSyncUrl = import.meta.env.VITE_SUPABASE_URL || dummyUrl;
if (rawSyncUrl && rawSyncUrl.includes('supabase.com/dashboard/project/')) {
  const match = rawSyncUrl.match(/project\/([a-z0-9]+)/);
  if (match) {
    rawSyncUrl = `https://${match[1]}.supabase.co`;
  }
} else if (rawSyncUrl && !rawSyncUrl.startsWith('http')) {
  rawSyncUrl = `https://${rawSyncUrl}.supabase.co`;
}
const supabaseUrl = rawSyncUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || dummyKey;
let isSupabaseOnline: boolean | null = null;

/**
 * Fast client-side connection pre-flight check to see if we can reach Supabase.
 * Returns false immediately if credentials are empty, and caches negative connection responses
 * to avoid console noise or delays.
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  if (isSupabaseOnline === false) return false;
  if (supabaseUrl === dummyUrl || supabaseAnonKey === dummyKey) {
    isSupabaseOnline = false;
    return false;
  }
  if (isSupabaseOnline === true) return true;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: { 'apikey': supabaseAnonKey },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok || res.status === 401 || res.status === 400 || res.status === 404) {
      isSupabaseOnline = true;
      return true;
    }
    isSupabaseOnline = false;
    return false;
  } catch (err) {
    isSupabaseOnline = false;
    return false;
  }
}

// Deterministic UUID validator & mapper to prevent Postgres insert errors
export function ensureUUID(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) {
    return id;
  }
  if (id === 'personal') {
    return '00000000-0000-4000-8000-000000000000';
  }
  if (id === 'ftmo-100k' || id === 'ftmo-100k-challenge') {
    return '11111111-1111-4111-9111-111111111111';
  }
  // Clean fallback UUID mapping
  const cleaned = id.replace(/[^0-9a-f]/gi, '');
  const padded = cleaned.padEnd(12, '0').slice(0, 12);
  return `22222222-2222-4222-a222-${padded}`;
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Client-side helper to hit the safe server-side Supabase proxy
async function invokeProxy(action: string, args: any): Promise<any> {
  const response = await fetch('/api/supabase/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action, arguments: args })
  });
  if (!response.ok) {
    throw new Error(`Server proxy error: ${response.statusText}`);
  }
  return response.json();
}

// Helper to resolve currently logged-in user ID
function getCurrentUserId(): string {
  const savedUser = safeSessionStorage.getItem('tv_current_user') || safeLocalStorage.getItem('tv_current_user');
  if (savedUser) {
    try {
      const u = JSON.parse(savedUser);
      return u.id;
    } catch (e) {
      // ignore
    }
  }
  return '00000000-0000-4000-8000-000000000000';
}

/**
 * Register a user via Supabase Auth and write profile details to `public.users` table
 */
export async function signUpWithSupabase(
  regUsername: string,
  regEmail: string,
  regPassword: string,
  regCountry: string,
  paymentScreenshot: string,
  selectedNetwork: string,
  subscriptionPrice: number,
  regAvatar: string | null
): Promise<{ success: boolean; user?: User; error?: string }> {
  const email = regEmail.trim().toLowerCase();

  try {
    const isOnline = await checkSupabaseConnection();
    if (!isOnline) {
      throw new TypeError("Failed to fetch");
    }

    // 1. Try direct client database call
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: regPassword,
    });

    if (authError) {
      throw authError;
    }

    const userId = authData.user?.id;
    if (!userId) {
      throw new Error("Erreur lors de la récupération de l'identifiant utilisateur.");
    }

    // 2. Créer le profil dans public.profiles (table active, source unique)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name: regUsername.trim(),
        username: regUsername.trim(),
        country: regCountry,
        avatar_url: regAvatar || null,
        status: 'pending',
        role: 'user',
        subscription_status: 'pending',
        plan: 'free',
        premium_expires_at: null,
        payment_proof: paymentScreenshot,
        created_at: new Date().toISOString()
      });

    if (profileError) {
      console.warn("Profile upsert warning in signup:", profileError);
    }

    // 3. Enregistrer la demande de paiement dans public.payment_requests
    const { error: paymentError } = await supabase
      .from('payment_requests')
      .insert({
        id: generateUUID(),
        user_id: userId,
        amount: subscriptionPrice,
        screenshot_url: paymentScreenshot,
        network: selectedNetwork,
        status: 'pending',
        type: 'registration',
        created_at: new Date().toISOString()
      });

    if (paymentError) {
      console.warn("Payment request log warning in signup:", paymentError);
    }

    const newUser: User = {
      id: userId,
      username: regUsername.trim(),
      email,
      country: regCountry,
      paid: false,
      paid_until: null,
      created_at: new Date().toISOString(),
      payment_proof: paymentScreenshot,
      status: 'pending',
      role: 'user',
      subscription_status: 'pending',
      plan: 'free',
      premium_expires_at: null,
      avatar_url: regAvatar || undefined
    };

    return { success: true, user: newUser };
  } catch (clientErr: any) {
    console.warn("[CLIENT_ROUTING] signUpWithSupabase client call failed. Routing through Server Proxy...", clientErr);
    try {
      const res = await invokeProxy("signUp", {
        email,
        password: regPassword,
        username: regUsername,
        country: regCountry,
        paymentScreenshot,
        selectedNetwork,
        subscriptionPrice,
        regAvatar
      });
      return res;
    } catch (proxyErr: any) {
      console.error("Proxy signUp failed:", proxyErr);
      return { success: false, error: proxyErr.message || String(proxyErr) };
    }
  }
}

/**
 * Login with Supabase Auth, load custom user profile status
 */
export async function signInWithSupabase(
  emailInput: string,
  passwordInput: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  const email = emailInput.trim().toLowerCase();

  try {
    const isOnline = await checkSupabaseConnection();
    if (!isOnline) {
      throw new TypeError("Failed to fetch");
    }

    // 1. Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: passwordInput,
    });

    if (authError) {
      throw authError;
    }

    const userId = authData.user?.id;
    if (!userId) {
      throw new Error("Authentification réussie mais identifiant introuvable.");
    }

    // 2. Fetch public user profile record primarily from public.profiles
    let profile: any = null;
    let profileError: any = null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, 
          email, 
          full_name, 
          username, 
          role, 
          status, 
          subscription_status, 
          plan, 
          premium_expires_at, 
          avatar_url, 
          country, 
          created_at
        `)
        .eq('id', userId)
        .maybeSingle();
      
      if (!error && data) {
        profile = data;
      } else {
        profileError = error;
      }
    } catch (e) {
      profileError = e;
    }

    if (profileError && !profile) {
      console.error("Error loaded profile from public.profiles:", profileError);
    }

    const user: User = {
      id: userId,
      username: profile?.username || profile?.full_name || authData.user.email?.split('@')[0] || 'Trader',
      email: authData.user.email || email,
      country: profile?.country || 'FR',
      paid: profile?.subscription_status === 'premium_active', // legacy field mapped for compatibility
      paid_until: profile?.premium_expires_at || null, // legacy field mapped
      status: (profile?.status || 'pending') as 'approved' | 'pending' | 'rejected',
      role: (profile?.role || 'user') as 'admin' | 'user',
      subscription_status: (profile?.subscription_status || 'pending') as 'pending' | 'premium_active' | 'blocked',
      plan: (profile?.plan || 'free') as 'free' | 'pro',
      premium_expires_at: profile?.premium_expires_at || null,
      avatar_url: profile?.avatar_url || undefined,
      created_at: profile?.created_at || new Date().toISOString()
    };

    return { success: true, user };
  } catch (clientErr: any) {
    console.warn("[CLIENT_ROUTING] signInWithSupabase client call failed. Routing through Server Proxy...", clientErr);
    try {
      const res = await invokeProxy("signIn", { email, password: passwordInput });
      return res;
    } catch (proxyErr: any) {
      console.error("Proxy signIn failed:", proxyErr);
      return { success: false, error: proxyErr.message || String(proxyErr) };
    }
  }
}

/**
 * Fetch latest user profile from public profiles table
 */
export async function fetchUserProfile(userId: string): Promise<User | null> {
  try {
    const isOnline = await checkSupabaseConnection();
    if (!isOnline) return null;
    let profile: any = null;
    let error: any = null;
    try {
      const { data, error: uError } = await supabase
        .from('profiles')
        .select(`
          id, 
          email, 
          full_name, 
          username, 
          role, 
          status, 
          subscription_status, 
          plan, 
          premium_expires_at, 
          avatar_url, 
          country, 
          created_at
        `)
        .eq('id', ensureUUID(userId))
        .maybeSingle();
      if (!uError && data) {
        profile = data;
      } else {
        error = uError;
      }
    } catch (e) {
      error = e;
    }

    if (error || !profile) return null;

    return {
      id: userId,
      username: profile.username || profile.full_name || 'Trader',
      email: profile.email || '',
      country: profile.country || 'FR',
      paid: profile.subscription_status === 'premium_active',
      paid_until: profile.premium_expires_at || null,
      created_at: profile.created_at || new Date().toISOString(),
      status: (profile.status || 'pending') as 'approved' | 'pending' | 'rejected',
      role: (profile.role || 'user') as 'admin' | 'user',
      subscription_status: (profile.subscription_status || 'pending') as 'pending' | 'premium_active' | 'blocked',
      plan: (profile.plan || 'free') as 'free' | 'pro',
      premium_expires_at: profile.premium_expires_at || null,
      avatar_url: profile.avatar_url || null,
      currency: profile.currency || 'USD'
    };
  } catch (err) {
    console.warn("fetchUserProfile error:", err);
    return null;
  }
}

/**
 * Administrative settings structures
 */
export interface AdminSettings {
  adminEmails: string;
  adminWalletTRC20: string;
  adminWalletBEP20: string;
  subscriptionPrice: number;
  subscriptionPeriod: number;
}

/**
 * Load global system settings from public.admin_settings (table dédiée, ligne unique id=1)
 */
export async function loadAdminSettings(): Promise<AdminSettings | null> {
  try {
    const isOnline = await checkSupabaseConnection();
    if (!isOnline) return null;
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error || !data) return null;

    return {
      adminEmails: data.notification_emails || 'igorrose2003@gmail.com,toshirohitsugayaonyx@gmail.com',
      adminWalletTRC20: data.usdt_trc20_address || 'TN2YxKp9vR3mHqL7bF8cD2eA5wJ6sT4uV',
      adminWalletBEP20: data.usdt_bep20_address || '0x7a3B5c9D2eF1a4B6c8D0e2F4a6B8c0D2e4F6a8B0',
      subscriptionPrice: data.subscription_price ? parseFloat(data.subscription_price) : 30,
      subscriptionPeriod: data.subscription_duration_months ?? 3
    };
  } catch (err) {
    console.warn("loadAdminSettings error:", err);
    return null;
  }
}

/**
 * Save global system settings to public.admin_settings (table dédiée, ligne unique id=1)
 */
export async function saveAdminSettings(settings: AdminSettings): Promise<void> {
  try {
    const isOnline = await checkSupabaseConnection();
    if (!isOnline) return;

    const { error } = await supabase.from('admin_settings').upsert({
      id: 1,
      notification_emails: settings.adminEmails,
      usdt_trc20_address: settings.adminWalletTRC20,
      usdt_bep20_address: settings.adminWalletBEP20,
      subscription_price: settings.subscriptionPrice,
      subscription_duration_months: settings.subscriptionPeriod,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
  } catch (err) {
    console.warn("saveAdminSettings error:", err);
  }
}

/**
 * Sync user profile to DB (e.g. state changes)
 */
export async function syncUserProfile(user: User): Promise<void> {
  const uId = ensureUUID(user.id);
  const profileRow = {
    id: uId,
    email: user.email,
    full_name: user.username,
    username: user.username,
    country: user.country,
    status: user.status,
    role: user.role || 'user',
    subscription_status: user.subscription_status || 'pending',
    plan: user.plan || 'free',
    premium_expires_at: user.premium_expires_at || null,
    avatar_url: user.avatar_url || null,
    payment_proof: user.payment_proof || null,
    created_at: user.created_at || new Date().toISOString()
  };

  try {
    const isOnline = await checkSupabaseConnection();
    if (!isOnline) {
      console.warn("Offline mode: Profile saved to local storage only.");
      return;
    }

    const { error } = await supabase.from('profiles').upsert(profileRow);
    if (error) {
      console.warn("syncUserProfile profiles upsert error:", error);
    }
  } catch (err: any) {
    console.warn("[CLIENT_ROUTING] syncUserProfile failed, routing to proxy:", err);
    try {
      await invokeProxy("syncUserProfile", { profile: profileRow });
    } catch (proxyErr) {
      console.error("Proxy syncUserProfile failed:", proxyErr);
    }
  }
}

/**
 * Patch a specific set of fields for a user profile
 */
export async function patchUserProfile(userId: string, updates: Partial<User>): Promise<void> {
  const safeId = ensureUUID(userId);
  try {
    const isOnline = await checkSupabaseConnection();
    if (!isOnline) return;

    const profileUpdates: any = {};
    if ('email' in updates) profileUpdates.email = updates.email;
    if ('username' in updates) { profileUpdates.full_name = updates.username; profileUpdates.username = updates.username; }
    if ('country' in updates) profileUpdates.country = updates.country;
    if ('status' in updates) profileUpdates.status = updates.status;
    if ('role' in updates) profileUpdates.role = updates.role;
    if ('subscription_status' in updates) profileUpdates.subscription_status = updates.subscription_status;
    if ('plan' in updates) profileUpdates.plan = updates.plan;
    if ('premium_expires_at' in updates) profileUpdates.premium_expires_at = updates.premium_expires_at;
    if ('avatar_url' in updates) profileUpdates.avatar_url = updates.avatar_url;
    if ('payment_proof' in updates) profileUpdates.payment_proof = updates.payment_proof;

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabase.from('profiles').update(profileUpdates).eq('id', safeId);
      if (error) {
        console.warn("patchUserProfile profiles update error:", error);
      }
    }
  } catch (err) {
    console.warn("patchUserProfile failed, routing to proxy...", err);
    try {
      await invokeProxy("patchUserProfile", { userId, updates });
    } catch (proxyErr) {
      console.error("Proxy patchUserProfile failed:", proxyErr);
    }
  }
}

/**
 * Fetch all workspace entities (Accounts, Trades, Challenges, Payments) from Supabase
 */
export async function loadUserDataFromSupabase(userId: string): Promise<{
  accounts: Account[];
  trades: Trade[];
  challenges: Challenge[];
  paymentRequests: PaymentRequest[];
}> {
  const safeUserId = ensureUUID(userId);
  let accountsRaw: any[] = [];
  let tradesRaw: any[] = [];
  let challengesRaw: any[] = [];
  let paymentsRaw: any[] = [];

  try {
    try {
      const { data: aData } = await supabase.from('trading_accounts').select('*').eq('user_id', safeUserId);
      const { data: tData } = await supabase.from('trades').select('*').eq('user_id', safeUserId);
      const { data: cData } = await supabase.from('challenges').select('*').eq('user_id', safeUserId);
      const { data: pData } = await supabase.from('payment_requests').select('*').eq('user_id', safeUserId);

      accountsRaw = aData || [];
      tradesRaw = tData || [];
      challengesRaw = cData || [];
      paymentsRaw = pData || [];
    } catch (clientErr: any) {
      console.warn("[CLIENT_ROUTING] Direct Supabase load failed. Routing to Server Proxy...", clientErr);
      try {
        const res = await invokeProxy("loadUserData", { userId: safeUserId }); 
        if (res.success && res.data) {
          accountsRaw = res.data.accountsRaw || [];
          tradesRaw = res.data.tradesRaw || [];
          challengesRaw = res.data.challengesRaw || [];
          paymentsRaw = res.data.paymentsRaw || [];
        }
      } catch (proxyErr) {
        console.error("Proxy loadUserData failed:", proxyErr);
        throw clientErr;
      }
    }

    // Map DB items back to Frontend structure
    const accounts: Account[] = (accountsRaw || []).map(a => ({
      id: a.id,
      user_id: a.user_id || safeUserId,
      name: a.name,
      account_type: (a.account_type || (a.type === 'propfirm' ? 'prop_firm' : a.type)) as 'personal' | 'prop_firm' | 'demo',
      capital: a.capital ? Number(a.capital) : undefined,
      target: a.target ? Number(a.target) : undefined,
      daily_loss: a.daily_loss ? Number(a.daily_loss) : undefined,
      global_loss: a.global_loss ? Number(a.global_loss) : undefined,
      challenge_status: a.challenge_status,
      created_at: a.created_at
    }));

    if (accounts.length === 0) {
      accounts.push({ id: ensureUUID('personal'), user_id: safeUserId, name: 'Compte Personnel', account_type: 'personal', created_at: new Date().toISOString() });
      accounts.push({
        id: ensureUUID('ftmo-100k'),
        user_id: safeUserId,
        name: 'Compte FTMO 100k',
        account_type: 'prop_firm',
        capital: 100000,
        target: 8,
        daily_loss: 5,
        global_loss: 10,
        created_at: new Date().toISOString()
      });
    }

    const trades: Trade[] = (tradesRaw || []).map(t => ({
      id: t.id,
      account_id: t.account_id,
      user_id: t.user_id || safeUserId,
      date: t.date,
      pair: t.pair,
      side: (t.direction || 'BUY') as 'BUY' | 'SELL',
      entry: 0, 
      exit: 0,
      lots: 0.1,
      fees: 0,
      pnl: t.pnl ? Number(t.pnl) : 0,
      setup: t.setup || '',
      mindset: '',
      notes: '',
      screenshot_url: t.screenshot_url || undefined,
      emotion: t.emotion,
      session: t.session,
      rr_ratio: t.rr_ratio ? Number(t.rr_ratio) : undefined,
      risk_percent: t.risk_percent ? Number(t.risk_percent) : undefined,
      created_at: t.created_at || t.date
    }));

    const challenges: Challenge[] = (challengesRaw || []).map(c => ({
      id: c.id,
      account_id: c.account_id,
      user_id: c.user_id || safeUserId,
      name: c.name,
      capital: c.capital ? Number(c.capital) : 100000,
      target: c.target ? Number(c.target) : 8,
      daily_loss: c.daily_loss ? Number(c.daily_loss) : 5,
      global_loss: c.global_loss ? Number(c.global_loss) : 10,
      created_at: c.created_at || new Date().toISOString()
    }));

    if (challenges.length === 0) {
      challenges.push({
        id: ensureUUID('ftmo-100k-challenge'),
        account_id: ensureUUID('ftmo-100k'),
        user_id: safeUserId,
        name: 'Compte FTMO 100k',
        capital: 100000,
        target: 8,
        daily_loss: 5,
        global_loss: 10,
        created_at: new Date().toISOString()
      });
    }

    const paymentRequests: PaymentRequest[] = (paymentsRaw || []).map(p => ({
      id: p.id,
      user_id: p.user_id,
      username: '',
      email: '',
      amount: p.amount ? Number(p.amount) : 30,
      network: (p.network || 'TRC20') as 'TRC20' | 'BEP20',
      payment_proof: p.screenshot_url || p.proof_file_url || p.payment_proof || '',
      status: (p.status || 'pending') as 'pending' | 'approved' | 'rejected',
      created_at: p.created_at || p.payment_date || new Date().toISOString()
    }));

    return { accounts, trades, challenges, paymentRequests };
  } catch (err) {
    console.error("loadUserDataFromSupabase error:", err);
    return {
      accounts: [
        { id: ensureUUID('personal'), user_id: safeUserId, name: 'Compte Personnel', account_type: 'personal', created_at: new Date().toISOString() },
        { id: ensureUUID('ftmo-100k'), user_id: safeUserId, name: 'Compte FTMO 100k', account_type: 'prop_firm', capital: 100000, target: 8, daily_loss: 5, global_loss: 10, created_at: new Date().toISOString() }
      ],
      trades: [],
      challenges: [
        {
          id: ensureUUID('ftmo-100k-challenge'),
          account_id: ensureUUID('ftmo-100k'),
          user_id: safeUserId,
          name: 'Compte FTMO 100k',
          capital: 100000,
          target: 8,
          daily_loss: 5,
          global_loss: 10,
          created_at: new Date().toISOString()
        }
      ],
      paymentRequests: []
    };
  }
}

/**
 * Save / Update single entities
 */
export async function saveAccountToSupabase(userId: string, account: Account): Promise<void> {
  const safeUserId = ensureUUID(userId);
  const safeId = ensureUUID(account.id);
  const row = {
    id: safeId,
    user_id: safeUserId,
    name: account.name,
    type: account.account_type,
    capital: account.capital || null,
    target: account.target || null,
    daily_loss: account.daily_loss || null,
    global_loss: account.global_loss || null,
    challenge_status: account.challenge_status || 'not_started'
  };

  try {
    await supabase.from('trading_accounts').upsert(row);
  } catch (err: any) {
    console.warn("[CLIENT_ROUTING] saveAccountToSupabase client call failed. Routing through proxy...", err);
    try {
      await invokeProxy("saveAccount", { row });
    } catch (proxyErr) {
      console.error("Proxy saveAccount failed:", proxyErr);
    }
  }
}

export async function deleteAccountFromSupabase(accountId: string): Promise<void> {
  const safeId = ensureUUID(accountId);
  const userId = getCurrentUserId();
  try {
    await supabase.from('trading_accounts').delete().eq('id', safeId);
  } catch (err: any) {
    console.warn("[CLIENT_ROUTING] deleteAccountFromSupabase client call failed. Routing through proxy...", err);
    try {
      await invokeProxy("deleteAccount", { userId, accountId: safeId });
    } catch (proxyErr) {
      console.error("Proxy deleteAccount failed:", proxyErr);
    }
  }
}

export async function saveTradeToSupabase(userId: string, trade: Trade): Promise<void> {
  const safeUserId = ensureUUID(userId);
  const safeId = ensureUUID(trade.id);
  const safeAccId = ensureUUID(trade.account_id);
  const row = {
    id: safeId,
    user_id: safeUserId,
    account_id: safeAccId,
    date: trade.date,
    pair: trade.pair,
    direction: trade.side,
    status: trade.pnl > 0 ? 'WIN' : (trade.pnl < 0 ? 'LOSS' : 'BE'),
    pnl: trade.pnl,
    setup: trade.setup || null,
    screenshot_url: trade.screenshot_url || null,
    emotion: trade.emotion || null,
    session: trade.session || null,
    rr_ratio: trade.rr_ratio || null,
    risk_percent: trade.risk_percent || null
  };

  try {
    await supabase.from('trades').upsert(row);
  } catch (err: any) {
    console.warn("[CLIENT_ROUTING] saveTradeToSupabase client call failed. Routing through proxy...", err);
    try {
      await invokeProxy("saveTrade", { row });
    } catch (proxyErr) {
      console.error("Proxy saveTrade failed:", proxyErr);
    }
  }
}

export async function deleteTradeFromSupabase(tradeId: string): Promise<void> {
  const safeId = ensureUUID(tradeId);
  const userId = getCurrentUserId();
  try {
    await supabase.from('trades').delete().eq('id', safeId);
  } catch (err: any) {
    console.warn("[CLIENT_ROUTING] deleteTradeFromSupabase client call failed. Routing through proxy...", err);
    try {
      await invokeProxy("deleteTrade", { userId, tradeId: safeId });
    } catch (proxyErr) {
      console.error("Proxy deleteTrade failed:", proxyErr);
    }
  }
}

export async function saveChallengeToSupabase(userId: string, challenge: Challenge): Promise<void> {
  const safeUserId = ensureUUID(userId);
  const safeId = ensureUUID(challenge.id);
  const safeAccId = ensureUUID(challenge.account_id);
  const row = {
    id: safeId,
    user_id: safeUserId,
    account_id: safeAccId,
    name: challenge.name,
    capital: challenge.capital,
    target: challenge.target,
    daily_loss: challenge.daily_loss,
    global_loss: challenge.global_loss
  };

  try {
    await supabase.from('challenges').upsert(row);
  } catch (err: any) {
    console.warn("[CLIENT_ROUTING] saveChallengeToSupabase client call failed. Routing through proxy...", err);
    try {
      await invokeProxy("saveChallenge", { row });
    } catch (proxyErr) {
      console.error("Proxy saveChallenge failed:", proxyErr);
    }
  }
}

export async function deleteChallengeFromSupabase(challengeId: string): Promise<void> {
  const safeId = ensureUUID(challengeId);
  const userId = getCurrentUserId();
  try {
    await supabase.from('challenges').delete().eq('id', safeId);
  } catch (err: any) {
    console.warn("[CLIENT_ROUTING] deleteChallengeFromSupabase client call failed. Routing through proxy...", err);
    try {
      await invokeProxy("deleteChallenge", { userId, challengeId: safeId });
    } catch (proxyErr) {
      console.error("Proxy deleteChallenge failed:", proxyErr);
    }
  }
}

export async function savePaymentToSupabase(userId: string, payment: PaymentRequest): Promise<void> {
  const safeId = ensureUUID(payment.id);
  const row = {
    status: payment.status
  };

  try {
    await supabase.from('payment_requests').update(row).eq('id', safeId);
  } catch (err: any) {
    console.error("savePaymentToSupabase update error:", err);
  }
}

export async function registerPayment(userId: string, amount: number, proofUrl: string): Promise<boolean> {
  const safeId = ensureUUID(userId);
  try {
    const res = await invokeProxy("registerPayment", { userId: safeId, amount, proofUrl });
    return !!(res && res.success);
  } catch (err: any) {
    console.warn("[CLIENT_ROUTING] registerPayment client call failed. Routing through proxy...", err);
    try {
      const { count: priorPaymentsCount } = await supabase
        .from('payment_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', safeId);
      const paymentType = (priorPaymentsCount && priorPaymentsCount > 0) ? 'renewal' : 'registration';

      const { error } = await supabase
        .from('payment_requests')
        .insert([{
          id: generateUUID(),
          user_id: safeId,
          amount: amount,
          screenshot_url: proofUrl,
          network: 'TRC20',
          status: 'pending',
          type: paymentType,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        console.error("Erreur paiement client insert failed :", error.message);
        return false;
      }
      return true;
    } catch (fallbackErr) {
      console.error("registerPayment direct DB insert failed:", fallbackErr);
      return false;
    }
  }
}

/**
 * Load all user accounts from DB for admin use
 */
export async function adminLoadAllUsersFromSupabase(): Promise<User[]> {
  try {
    let data: any[] = [];
    try {
      const { data: directData, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      data = directData || [];
    } catch (clientErr: any) {
      console.warn("[CLIENT_ROUTING] adminLoadAllUsersFromSupabase client call failed. Routing through proxy...", clientErr);
      try {
        const res = await invokeProxy("adminLoadAllUsers", {});
        if (res.success && res.data) {
          data = res.data;
        }
      } catch (proxyErr) {
        console.error("Proxy adminLoadAllUsers failed:", proxyErr);
        throw clientErr;
      }
    }

    return (data || []).map(p => ({
      id: p.id,
      username: p.username || p.full_name || 'Trader',
      email: p.email,
      country: p.country || 'FR',
      paid: p.subscription_status === 'premium_active',
      paid_until: p.premium_expires_at || null,
      status: (p.status || 'pending') as 'pending' | 'approved' | 'rejected',
      role: (p.role || 'user') as 'admin' | 'user',
      subscription_status: (p.subscription_status || 'pending') as 'pending' | 'premium_active' | 'blocked',
      plan: (p.plan || 'free') as 'free' | 'pro',
      premium_expires_at: p.premium_expires_at || null,
      avatar_url: p.avatar_url || undefined,
      payment_proof: p.payment_proof || undefined,
      created_at: p.created_at || new Date().toISOString()
    }));
  } catch (err) {
    console.error("adminLoadAllUsersFromSupabase error:", err);
    return [];
  }
}

export async function updateUserRole(targetUserId: string, newRole: 'admin' | 'user'): Promise<boolean> {
  const safeId = ensureUUID(targetUserId);
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', safeId);
    if (error) {
      throw error;
    }
    return true;
  } catch (err: any) {
    console.warn("[CLIENT_ROUTING] updateUserRole client call failed. Routing through proxy...", err);
    try {
      const res = await invokeProxy("updateUserRole", { targetUserId: safeId, role: newRole });
      return !!res.success;
    } catch (proxyErr) {
      console.error("Proxy updateUserRole failed:", proxyErr);
      return false;
    }
  }
}

export async function adminDeleteUserFromSupabase(userId: string): Promise<boolean> {
  const safeId = ensureUUID(userId);
  try {
    try {
      // Manually cascade deletes
      await supabase.from('payment_requests').delete().eq('user_id', safeId);
      await supabase.from('trades').delete().eq('user_id', safeId);
      await supabase.from('challenges').delete().eq('user_id', safeId);
      await supabase.from('trading_accounts').delete().eq('user_id', safeId);

      const { error } = await supabase.from('profiles').delete().eq('id', safeId);
      if (error) throw error;
    } catch (clientErr: any) {
      console.warn("[CLIENT_ROUTING] adminDeleteUserFromSupabase client call failed. Routing through proxy...", clientErr);
      try {
        const res = await invokeProxy("adminDeleteUser", { userId: safeId });
        return res.success;
      } catch (proxyErr) {
        console.error("Proxy adminDeleteUser failed:", proxyErr);
        throw clientErr;
      }
    }
    return true;
  } catch (err) {
    console.error("adminDeleteUserFromSupabase error:", err);
    return false;
  }
}

export async function adminUpdateUserFromSupabase(
  userId: string, 
  updatedFields: { username: string; email: string; status: 'pending' | 'approved' | 'rejected' }
): Promise<boolean> {
  const safeId = ensureUUID(userId);
  const row = {
    username: updatedFields.username,
    full_name: updatedFields.username,
    email: updatedFields.email,
    status: updatedFields.status
  };
  try {
    try {
      const { error } = await supabase.from('profiles').update(row).eq('id', safeId);
      if (error) throw error;
    } catch (clientErr: any) {
      console.warn("[CLIENT_ROUTING] adminUpdateUserFromSupabase client call failed. Routing through proxy...", clientErr);
      try {
        const res = await invokeProxy("adminUpdateUser", { userId: safeId, ...row });
        return res.success;
      } catch (proxyErr) {
        console.error("Proxy adminUpdateUser failed:", proxyErr);
        throw clientErr;
      }
    }
    return true;
  } catch (err) {
    console.error("adminUpdateUserFromSupabase error:", err);
    return false;
  }
}

/**
 * Load all payments raw from DB
 */
export async function adminLoadAllPaymentsFromSupabase(): Promise<PaymentRequest[]> {
  try {
    let payments: any[] = [];
    try {
      const { data: directData, error } = await supabase
        .from('payment_requests')
        .select(`
          *,
          profiles (
            email,
            username,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      payments = directData || [];
    } catch (clientErr: any) {
      console.warn("[CLIENT_ROUTING] adminLoadAllPaymentsFromSupabase client call failed. Routing through proxy...", clientErr);
      try {
        const res = await invokeProxy("adminLoadAllPayments", {});
        if (res.success && res.data) {
          payments = res.data;
        }
      } catch (proxyErr) {
        console.error("Proxy adminLoadAllPayments failed:", proxyErr);
        throw clientErr;
      }
    }

    return (payments || []).map(p => {
      const u = p.profiles || {};
      return {
        id: p.id,
        user_id: p.user_id,
        username: u.username || u.full_name || 'Trader',
        email: u.email || 'trader@example.com',
        amount: p.amount ? Number(p.amount) : 30,
        network: (p.network || 'TRC20') as 'TRC20' | 'BEP20',
        payment_proof: p.screenshot_url || p.proof_file_url || p.payment_proof || '',
        status: (p.status || 'pending') as 'pending' | 'approved' | 'rejected',
        created_at: p.created_at || p.payment_date || new Date().toISOString()
      };
    });
  } catch (err) {
    console.error("adminLoadAllPaymentsFromSupabase error:", err);
    return [];
  }
}

/**
 * Triggers Google OAuth sign-in flow.
 * Configured as bypass-iframe popup support.
 */
export async function signInWithGoogle(): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        skipBrowserRedirect: true,
      }
    });

    if (error) {
      throw error;
    }

    if (!data || !data.url) {
      throw new Error("Impossible de générer l'URL d'authentification Google.");
    }

    return { success: true, url: data.url };
  } catch (err: any) {
    console.error("Error initiating Google sign-in:", err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Triggers GitHub OAuth sign-in flow.
 * Configured as bypass-iframe popup support.
 */
export async function signInWithGitHub(): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/`,
        skipBrowserRedirect: true,
      }
    });

    if (error) {
      throw error;
    }

    if (!data || !data.url) {
      throw new Error("Impossible de générer l'URL d'authentification GitHub.");
    }

    return { success: true, url: data.url };
  } catch (err: any) {
    console.error("Error initiating GitHub sign-in:", err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Processes a Supabase OAuth auth session to load or dynamically create user profiles.
 */
export async function handleSupabaseSession(session: any): Promise<{ success: boolean; user?: User; error?: string }> {
  if (!session || !session.user) {
    return { success: false, error: "Aucune session utilisateur active décelée." };
  }

  const authUser = session.user;
  const userId = authUser.id;
  const userEmail = authUser.email || '';

  try {
    // Check if public profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.warn("Public users lookup error, might need server-proxy fallback:", profileError);
    }

    let user: User;

    if (profile) {
      user = {
        id: userId,
        username: profile.username || profile.full_name || authUser.user_metadata?.full_name || userEmail.split('@')[0] || 'Trader',
        email: userEmail || profile.email,
        country: profile.country || 'FR',
        paid: profile.subscription_status === 'premium_active',
        paid_until: profile.premium_expires_at || null,
        status: (profile.status || 'pending') as 'approved' | 'pending' | 'rejected',
        role: (profile.role || 'user') as 'admin' | 'user',
        subscription_status: (profile.subscription_status || 'pending') as 'pending' | 'premium_active' | 'blocked',
        plan: (profile.plan || 'free') as 'free' | 'pro',
        premium_expires_at: profile.premium_expires_at || null,
        avatar_url: profile.avatar_url || authUser.user_metadata?.avatar_url || undefined,
        created_at: profile.created_at || new Date().toISOString()
      };
    } else {
      // First-time Google user: create dynamic pending profile record in DB
      // Note: By default, newly connected Google accounts are pending and not paid.
      // They are redirected to the onboarding payment checkout page to submit their payment proof.
      const newProfile = {
        id: ensureUUID(userId),
        email: userEmail,
        username: authUser.user_metadata?.full_name || userEmail.split('@')[0] || 'Trader',
        full_name: authUser.user_metadata?.full_name || userEmail.split('@')[0] || 'Trader',
        country: 'FR',
        status: 'pending',
        role: 'user',
        subscription_status: 'pending',
        plan: 'free',
        premium_expires_at: null,
        avatar_url: authUser.user_metadata?.avatar_url || null,
        created_at: new Date().toISOString()
      };

      try {
        await supabase.from('profiles').upsert(newProfile);
      } catch (insertErr) {
        console.warn("Client-side insert failed, routing through proxy:", insertErr);
        await invokeProxy("syncUserProfile", { profile: newProfile });
      }

      user = {
        id: userId,
        username: newProfile.username,
        email: newProfile.email,
        country: newProfile.country,
        paid: false,
        paid_until: null,
        status: 'pending',
        role: 'user',
        subscription_status: 'pending',
        plan: 'free',
        premium_expires_at: null,
        avatar_url: newProfile.avatar_url || authUser.user_metadata?.avatar_url || undefined,
        created_at: newProfile.created_at
      };
    }

    return { success: true, user };
  } catch (err: any) {
    console.error("handleSupabaseSession error:", err);
    return { success: false, error: err.message || String(err) };
  }
}
