import { supabase } from '../lib/supabase';
import { User, Trade, Account, Challenge, PaymentRequest } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
let isSupabaseOnline: boolean | null = null;

/**
 * Fast client-side connection pre-flight check to see if we can reach Supabase.
 * Returns false immediately if credentials are empty, and caches negative connection responses
 * to avoid console noise or delays.
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  if (isSupabaseOnline === false) return false;
  if (!supabaseUrl || !supabaseAnonKey) {
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
  const savedUser = sessionStorage.getItem('tv_current_user') || localStorage.getItem('tv_current_user');
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

    // 2. Insert profile
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email,
        username: regUsername.trim(),
        country: regCountry,
        avatar_url: regAvatar || null,
        status: 'pending',
        paid: false,
        created_at: new Date().toISOString()
      });

    if (profileError) {
      console.warn("Profil update warning in signup:", profileError);
    }

    // 3. Store payment
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        id: generateUUID(),
        user_id: userId,
        amount: subscriptionPrice,
        proof_file_url: paymentScreenshot,
        network: selectedNetwork,
        status: 'pending'
      });

    if (paymentError) {
      console.warn("Payment log warning in signup:", paymentError);
    }

    const newUser: User = {
      id: userId,
      username: regUsername.trim(),
      email,
      country: regCountry,
      paid: false,
      paidUntil: null,
      createdAt: new Date().toISOString(),
      paymentScreenshot,
      status: 'pending',
      avatar: regAvatar || undefined
    };

    return { success: true, user: newUser };
  } catch (clientErr: any) {
    const isNetworkError = clientErr.message?.includes('fetch') || String(clientErr).includes('fetch') || clientErr.name === 'TypeError';
    if (isNetworkError) {
      console.warn("[CLIENT_BLOCKED] signUpWithSupabase failed. Routing through Server Proxy...");
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
        return { success: false, error: proxyErr.message || String(proxyErr) };
      }
    }
    console.error("SignUpWithSupabase error:", clientErr);
    return { success: false, error: clientErr.message || String(clientErr) };
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

    // 2. Fetch public user profile record
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error("Error loaded profile from public.users:", profileError);
    }

    const user: User = {
      id: userId,
      username: profile?.username || authData.user.email?.split('@')[0] || 'Trader',
      email: authData.user.email || email,
      country: profile?.country || 'FR',
      paid: profile?.paid ?? false,
      paidUntil: profile?.paid_until || null,
      status: profile?.status || 'approved', // fallback default
      avatar: profile?.avatar_url || undefined,
      createdAt: profile?.created_at || new Date().toISOString()
    };

    return { success: true, user };
  } catch (clientErr: any) {
    const isNetworkError = clientErr.message?.includes('fetch') || String(clientErr).includes('fetch') || clientErr.name === 'TypeError';
    if (isNetworkError) {
      console.warn("[CLIENT_BLOCKED] signInWithSupabase failed. Routing through Server Proxy...");
      try {
        const res = await invokeProxy("signIn", { email, password: passwordInput });
        return res;
      } catch (proxyErr: any) {
        return { success: false, error: proxyErr.message || String(proxyErr) };
      }
    }
    console.error("SignInWithSupabase exception:", clientErr);
    return { success: false, error: clientErr.message || String(clientErr) };
  }
}

/**
 * Sync user profile to DB (e.g. state changes)
 */
export async function syncUserProfile(user: User): Promise<void> {
  const profile = {
    id: ensureUUID(user.id),
    email: user.email,
    username: user.username,
    country: user.country,
    status: user.status,
    paid: user.paid,
    paid_until: user.paidUntil,
    avatar_url: user.avatar || null
  };

  try {
    await supabase.from('users').upsert(profile);
    try {
      // Keep 'profiles' table in sync for approval and status changes
      await supabase.from('profiles').upsert({
        id: ensureUUID(user.id),
        full_name: user.username,
        email: user.email,
        status: user.status,
        payment_proof: user.paymentScreenshot || null,
        created_at: user.createdAt
      });
    } catch (profErr) {
      console.warn("Profiles table double sync failed (ignored):", profErr);
    }
  } catch (err: any) {
    const isNetworkError = err.message?.includes('fetch') || String(err).includes('fetch') || err.name === 'TypeError';
    if (isNetworkError) {
      console.warn("[CLIENT_BLOCKED] syncUserProfile failed. Routing through Server Proxy...");
      try {
        await invokeProxy("syncUserProfile", { profile });
      } catch (proxyErr) {
        console.error("Proxy syncUserProfile failed:", proxyErr);
      }
    } else {
      console.error("syncUserProfile failed:", err);
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
      const { data: aData } = await supabase.from('accounts').select('*').eq('user_id', safeUserId);
      const { data: tData } = await supabase.from('trades').select('*').eq('user_id', safeUserId);
      const { data: cData } = await supabase.from('challenges').select('*').eq('user_id', safeUserId);
      const { data: pData } = await supabase.from('payments').select('*').eq('user_id', safeUserId);

      accountsRaw = aData || [];
      tradesRaw = tData || [];
      challengesRaw = cData || [];
      paymentsRaw = pData || [];
    } catch (clientErr: any) {
      const isNetworkError = clientErr.message?.includes('fetch') || String(clientErr).includes('fetch') || clientErr.name === 'TypeError';
      if (isNetworkError) {
        console.warn("[CLIENT_BLOCKED] Direct Supabase load failed. Routing to Server Proxy...");
        const res = await invokeProxy("loadUserData", { userId: safeUserId });
        if (res.success && res.data) {
          accountsRaw = res.data.accountsRaw || [];
          tradesRaw = res.data.tradesRaw || [];
          challengesRaw = res.data.challengesRaw || [];
          paymentsRaw = res.data.paymentsRaw || [];
        }
      } else {
        throw clientErr;
      }
    }

    // Map DB items back to Frontend structure
    const accounts: Account[] = (accountsRaw || []).map(a => ({
      id: a.id,
      name: a.name,
      type: a.type as 'personal' | 'propfirm',
      capital: a.capital ? Number(a.capital) : undefined,
      target: a.target ? Number(a.target) : undefined,
      dailyLoss: a.daily_loss ? Number(a.daily_loss) : undefined,
      globalLoss: a.global_loss ? Number(a.global_loss) : undefined
    }));

    if (accounts.length === 0) {
      accounts.push({ id: ensureUUID('personal'), name: 'Compte Personnel', type: 'personal' });
      accounts.push({
        id: ensureUUID('ftmo-100k'),
        name: 'Compte FTMO 100k',
        type: 'propfirm',
        capital: 100000,
        target: 8,
        dailyLoss: 5,
        globalLoss: 10
      });
    }

    const trades: Trade[] = (tradesRaw || []).map(t => ({
      id: t.id,
      accountId: t.account_id,
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
      screenshot: t.screenshot_url || undefined,
      createdAt: t.created_at || t.date
    }));

    const challenges: Challenge[] = (challengesRaw || []).map(c => ({
      id: c.id,
      accountId: c.account_id,
      name: c.name,
      capital: c.capital ? Number(c.capital) : 100000,
      target: c.target ? Number(c.target) : 8,
      dailyLoss: c.daily_loss ? Number(c.daily_loss) : 5,
      globalLoss: c.global_loss ? Number(c.global_loss) : 10,
      createdAt: c.created_at || new Date().toISOString()
    }));

    if (challenges.length === 0) {
      challenges.push({
        id: ensureUUID('ftmo-100k-challenge'),
        accountId: ensureUUID('ftmo-100k'),
        name: 'Compte FTMO 100k',
        capital: 100000,
        target: 8,
        dailyLoss: 5,
        globalLoss: 10,
        createdAt: new Date().toISOString()
      });
    }

    const paymentRequests: PaymentRequest[] = (paymentsRaw || []).map(p => ({
      id: p.id,
      userId: p.user_id,
      username: '',
      email: '',
      amount: p.amount ? Number(p.amount) : 30,
      network: (p.network || 'TRC20') as 'TRC20' | 'BEP20',
      proofScreenshot: p.proof_file_url || '',
      status: (p.status || 'pending') as 'pending' | 'approved' | 'rejected',
      createdAt: p.payment_date || new Date().toISOString()
    }));

    return { accounts, trades, challenges, paymentRequests };
  } catch (err) {
    console.error("loadUserDataFromSupabase error:", err);
    return {
      accounts: [
        { id: ensureUUID('personal'), name: 'Compte Personnel', type: 'personal' },
        { id: ensureUUID('ftmo-100k'), name: 'Compte FTMO 100k', type: 'propfirm', capital: 100000, target: 8, dailyLoss: 5, globalLoss: 10 }
      ],
      trades: [],
      challenges: [
        {
          id: ensureUUID('ftmo-100k-challenge'),
          accountId: ensureUUID('ftmo-100k'),
          name: 'Compte FTMO 100k',
          capital: 100000,
          target: 8,
          dailyLoss: 5,
          globalLoss: 10,
          createdAt: new Date().toISOString()
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
    type: account.type,
    capital: account.capital || null,
    target: account.target || null,
    daily_loss: account.dailyLoss || null,
    global_loss: account.globalLoss || null
  };

  try {
    await supabase.from('accounts').upsert(row);
  } catch (err: any) {
    const isNetworkError = err.message?.includes('fetch') || String(err).includes('fetch') || err.name === 'TypeError';
    if (isNetworkError) {
      console.warn("[CLIENT_BLOCKED] saveAccountToSupabase failed. Routing through proxy...");
      try {
        await invokeProxy("saveAccount", { row });
      } catch (proxyErr) {
        console.error("Proxy saveAccount failed:", proxyErr);
      }
    } else {
      console.error("saveAccountToSupabase error:", err);
    }
  }
}

export async function deleteAccountFromSupabase(accountId: string): Promise<void> {
  const safeId = ensureUUID(accountId);
  const userId = getCurrentUserId();
  try {
    await supabase.from('accounts').delete().eq('id', safeId);
  } catch (err: any) {
    const isNetworkError = err.message?.includes('fetch') || String(err).includes('fetch') || err.name === 'TypeError';
    if (isNetworkError) {
      console.warn("[CLIENT_BLOCKED] deleteAccountFromSupabase failed. Routing through proxy...");
      try {
        await invokeProxy("deleteAccount", { userId, accountId: safeId });
      } catch (proxyErr) {
        console.error("Proxy deleteAccount failed:", proxyErr);
      }
    } else {
      console.error("deleteAccountFromSupabase error:", err);
    }
  }
}

export async function saveTradeToSupabase(userId: string, trade: Trade): Promise<void> {
  const safeUserId = ensureUUID(userId);
  const safeId = ensureUUID(trade.id);
  const safeAccId = ensureUUID(trade.accountId);
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
    screenshot_url: trade.screenshot || null
  };

  try {
    await supabase.from('trades').upsert(row);
  } catch (err: any) {
    const isNetworkError = err.message?.includes('fetch') || String(err).includes('fetch') || err.name === 'TypeError';
    if (isNetworkError) {
      console.warn("[CLIENT_BLOCKED] saveTradeToSupabase failed. Routing through proxy...");
      try {
        await invokeProxy("saveTrade", { row });
      } catch (proxyErr) {
        console.error("Proxy saveTrade failed:", proxyErr);
      }
    } else {
      console.error("saveTradeToSupabase error:", err);
    }
  }
}

export async function deleteTradeFromSupabase(tradeId: string): Promise<void> {
  const safeId = ensureUUID(tradeId);
  const userId = getCurrentUserId();
  try {
    await supabase.from('trades').delete().eq('id', safeId);
  } catch (err: any) {
    const isNetworkError = err.message?.includes('fetch') || String(err).includes('fetch') || err.name === 'TypeError';
    if (isNetworkError) {
      console.warn("[CLIENT_BLOCKED] deleteTradeFromSupabase failed. Routing through proxy...");
      try {
        await invokeProxy("deleteTrade", { userId, tradeId: safeId });
      } catch (proxyErr) {
        console.error("Proxy deleteTrade failed:", proxyErr);
      }
    } else {
      console.error("deleteTradeFromSupabase error:", err);
    }
  }
}

export async function saveChallengeToSupabase(userId: string, challenge: Challenge): Promise<void> {
  const safeUserId = ensureUUID(userId);
  const safeId = ensureUUID(challenge.id);
  const safeAccId = ensureUUID(challenge.accountId);
  const row = {
    id: safeId,
    user_id: safeUserId,
    account_id: safeAccId,
    name: challenge.name,
    capital: challenge.capital,
    target: challenge.target,
    daily_loss: challenge.dailyLoss,
    global_loss: challenge.globalLoss
  };

  try {
    await supabase.from('challenges').upsert(row);
  } catch (err: any) {
    const isNetworkError = err.message?.includes('fetch') || String(err).includes('fetch') || err.name === 'TypeError';
    if (isNetworkError) {
      console.warn("[CLIENT_BLOCKED] saveChallengeToSupabase failed. Routing through proxy...");
      try {
        await invokeProxy("saveChallenge", { row });
      } catch (proxyErr) {
        console.error("Proxy saveChallenge failed:", proxyErr);
      }
    } else {
      console.error("saveChallengeToSupabase error:", err);
    }
  }
}

export async function deleteChallengeFromSupabase(challengeId: string): Promise<void> {
  const safeId = ensureUUID(challengeId);
  const userId = getCurrentUserId();
  try {
    await supabase.from('challenges').delete().eq('id', safeId);
  } catch (err: any) {
    const isNetworkError = err.message?.includes('fetch') || String(err).includes('fetch') || err.name === 'TypeError';
    if (isNetworkError) {
      console.warn("[CLIENT_BLOCKED] deleteChallengeFromSupabase failed. Routing through proxy...");
      try {
        await invokeProxy("deleteChallenge", { userId, challengeId: safeId });
      } catch (proxyErr) {
        console.error("Proxy deleteChallenge failed:", proxyErr);
      }
    } else {
      console.error("deleteChallengeFromSupabase error:", err);
    }
  }
}

export async function savePaymentToSupabase(userId: string, payment: PaymentRequest): Promise<void> {
  const safeId = ensureUUID(payment.id);
  const row = {
    status: payment.status
  };

  try {
    await supabase.from('payments').update(row).eq('id', safeId);
  } catch (err: any) {
    console.error("savePaymentToSupabase update error:", err);
  }
}

export async function registerPayment(userId: string, amount: number, proofUrl: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('payments')
      .insert([{
        user_id: ensureUUID(userId),
        amount: amount,
        proof_url: proofUrl,
        status: 'pending'
      }]);

    if (error) {
      console.error("Erreur paiement :", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Erreur paiement exception :", err);
    return false;
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
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      data = directData || [];
    } catch (clientErr: any) {
      const isNetworkError = clientErr.message?.includes('fetch') || String(clientErr).includes('fetch') || clientErr.name === 'TypeError';
      if (isNetworkError) {
        console.warn("[CLIENT_BLOCKED] adminLoadAllUsersFromSupabase failed. Routing through proxy...");
        const res = await invokeProxy("adminLoadAllUsers", {});
        if (res.success && res.data) {
          data = res.data;
        }
      } else {
        throw clientErr;
      }
    }

    return (data || []).map(p => ({
      id: p.id,
      username: p.username || 'Trader',
      email: p.email,
      country: p.country || 'FR',
      paid: p.paid || false,
      paidUntil: p.paid_until || null,
      status: (p.status || 'pending') as 'pending' | 'approved' | 'rejected',
      avatar: p.avatar_url || undefined,
      createdAt: p.created_at || new Date().toISOString()
    }));
  } catch (err) {
    console.error("adminLoadAllUsersFromSupabase error:", err);
    return [];
  }
}

/**
 * Admin action to delete a user profile
 */
export async function adminDeleteUserFromSupabase(userId: string): Promise<boolean> {
  const safeId = ensureUUID(userId);
  try {
    try {
      const { error } = await supabase.from('users').delete().eq('id', safeId);
      if (error) throw error;
    } catch (clientErr: any) {
      const isNetworkError = clientErr.message?.includes('fetch') || String(clientErr).includes('fetch') || clientErr.name === 'TypeError';
      if (isNetworkError) {
        console.warn("[CLIENT_BLOCKED] adminDeleteUserFromSupabase failed. Routing through proxy...");
        const res = await invokeProxy("adminDeleteUser", { userId: safeId });
        return res.success;
      } else {
        throw clientErr;
      }
    }
    return true;
  } catch (err) {
    console.error("adminDeleteUserFromSupabase error:", err);
    return false;
  }
}

/**
 * Admin action to update a user profile
 */
export async function adminUpdateUserFromSupabase(
  userId: string, 
  updatedFields: { username: string; email: string; status: 'pending' | 'approved' | 'rejected' }
): Promise<boolean> {
  const safeId = ensureUUID(userId);
  const row = {
    username: updatedFields.username,
    email: updatedFields.email,
    status: updatedFields.status
  };
  try {
    try {
      const { error } = await supabase.from('users').update(row).eq('id', safeId);
      if (error) throw error;
    } catch (clientErr: any) {
      const isNetworkError = clientErr.message?.includes('fetch') || String(clientErr).includes('fetch') || clientErr.name === 'TypeError';
      if (isNetworkError) {
        console.warn("[CLIENT_BLOCKED] adminUpdateUserFromSupabase failed. Routing through proxy...");
        const res = await invokeProxy("adminUpdateUser", { userId: safeId, ...row });
        return res.success;
      } else {
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
        .from('payments')
        .select(`
          *,
          users (
            email,
            username
          )
        `)
        .order('payment_date', { ascending: false });

      if (error) {
        throw error;
      }
      payments = directData || [];
    } catch (clientErr: any) {
      const isNetworkError = clientErr.message?.includes('fetch') || String(clientErr).includes('fetch') || clientErr.name === 'TypeError';
      if (isNetworkError) {
        console.warn("[CLIENT_BLOCKED] adminLoadAllPaymentsFromSupabase failed. Routing through proxy...");
        const res = await invokeProxy("adminLoadAllPayments", {});
        if (res.success && res.data) {
          payments = res.data;
        }
      } else {
        throw clientErr;
      }
    }

    return (payments || []).map(p => {
      const u = p.users || {};
      return {
        id: p.id,
        userId: p.user_id,
        username: u.username || 'Trader',
        email: u.email || 'trader@example.com',
        amount: p.amount ? Number(p.amount) : 30,
        network: (p.network || 'TRC20') as 'TRC20' | 'BEP20',
        proofScreenshot: p.proof_file_url || '',
        status: (p.status || 'pending') as 'pending' | 'approved' | 'rejected',
        createdAt: p.payment_date || new Date().toISOString()
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
      .from('users')
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
        username: profile.username || authUser.user_metadata?.full_name || userEmail.split('@')[0] || 'Trader',
        email: userEmail || profile.email,
        country: profile.country || 'FR',
        paid: profile.paid ?? false,
        paidUntil: profile.paid_until || null,
        status: (profile.status || 'approved') as 'approved' | 'pending' | 'rejected',
        avatar: profile.avatar_url || authUser.user_metadata?.avatar_url || undefined,
        createdAt: profile.created_at || new Date().toISOString()
      };
    } else {
      // First-time Google user: create dynamic pending profile record in DB
      // Note: By default, newly connected Google accounts are pending and not paid.
      // They are redirected to the onboarding payment checkout page to submit their payment proof.
      const newProfile = {
        id: ensureUUID(userId),
        email: userEmail,
        username: authUser.user_metadata?.full_name || userEmail.split('@')[0] || 'Trader',
        country: 'FR',
        status: 'pending',
        paid: false,
        paid_until: null,
        avatar_url: authUser.user_metadata?.avatar_url || null,
        created_at: new Date().toISOString()
      };

      try {
        await supabase.from('users').upsert(newProfile);
        try {
          // Double sync into 'profiles' table for compatibility as described in the DB guidelines
          await supabase.from('profiles').upsert({
            id: ensureUUID(userId),
            full_name: newProfile.username,
            email: userEmail,
            status: 'pending',
            payment_proof: null,
            created_at: newProfile.created_at
          });
        } catch (profilesErr) {
          console.warn("Profiles table double sync ignored:", profilesErr);
        }
      } catch (insertErr) {
        console.warn("Client-side insert failed, routing through proxy:", insertErr);
        await invokeProxy("syncUserProfile", { profile: newProfile });
      }

      user = {
        id: userId,
        username: newProfile.username,
        email: newProfile.email,
        country: newProfile.country,
        paid: newProfile.paid,
        paidUntil: newProfile.paid_until,
        status: newProfile.status as 'approved' | 'pending' | 'rejected',
        avatar: newProfile.avatar_url || undefined,
        createdAt: newProfile.created_at
      };
    }

    return { success: true, user };
  } catch (err: any) {
    console.error("handleSupabaseSession error:", err);
    return { success: false, error: err.message || String(err) };
  }
}
