import { supabase } from '../lib/supabase';
import { User, Trade, Account, Challenge, PaymentRequest } from '../types';

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
  try {
    const email = regEmail.trim().toLowerCase();
    
    // 1. Register with local auth instance of Supabase
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

    // 2. Insert or update standard profile data into `public.users` table
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

    // 3. Store payment information in `public.payments`
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
  } catch (err: any) {
    console.error("SignUpWithSupabase error:", err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Login with Supabase Auth, load custom user profile status
 */
export async function signInWithSupabase(
  emailInput: string,
  passwordInput: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const email = emailInput.trim().toLowerCase();

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
  } catch (err: any) {
    console.error("SignInWithSupabase exception:", err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Sync user profile to DB (e.g. state changes)
 */
export async function syncUserProfile(user: User): Promise<void> {
  try {
    await supabase.from('users').upsert({
      id: ensureUUID(user.id),
      email: user.email,
      username: user.username,
      country: user.country,
      status: user.status,
      paid: user.paid,
      paid_until: user.paidUntil,
      avatar_url: user.avatar || null
    });
  } catch (err) {
    console.error("syncUserProfile failed:", err);
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
  try {
    const safeUserId = ensureUUID(userId);

    // Fetch accounts
    const { data: accountsRaw } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', safeUserId);

    // Fetch trades
    const { data: tradesRaw } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', safeUserId);

    // Fetch challenges
    const { data: challengesRaw } = await supabase
      .from('challenges')
      .select('*')
      .eq('user_id', safeUserId);

    // Fetch payments
    const { data: paymentsRaw } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', safeUserId);

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
      accounts: [{ id: ensureUUID('personal'), name: 'Compte Personnel', type: 'personal' }],
      trades: [],
      challenges: [],
      paymentRequests: []
    };
  }
}

/**
 * Save / Update single entities
 */
export async function saveAccountToSupabase(userId: string, account: Account): Promise<void> {
  try {
    const safeUserId = ensureUUID(userId);
    const safeId = ensureUUID(account.id);

    await supabase
      .from('accounts')
      .upsert({
        id: safeId,
        user_id: safeUserId,
        name: account.name,
        type: account.type,
        capital: account.capital || null,
        target: account.target || null,
        daily_loss: account.dailyLoss || null,
        global_loss: account.globalLoss || null
      });
  } catch (err) {
    console.error("saveAccountToSupabase error:", err);
  }
}

export async function deleteAccountFromSupabase(accountId: string): Promise<void> {
  try {
    await supabase.from('accounts').delete().eq('id', ensureUUID(accountId));
  } catch (err) {
    console.error("deleteAccountFromSupabase error:", err);
  }
}

export async function saveTradeToSupabase(userId: string, trade: Trade): Promise<void> {
  try {
    const safeUserId = ensureUUID(userId);
    const safeId = ensureUUID(trade.id);
    const safeAccId = ensureUUID(trade.accountId);

    await supabase
      .from('trades')
      .upsert({
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
      });
  } catch (err) {
    console.error("saveTradeToSupabase error:", err);
  }
}

export async function deleteTradeFromSupabase(tradeId: string): Promise<void> {
  try {
    await supabase.from('trades').delete().eq('id', ensureUUID(tradeId));
  } catch (err) {
    console.error("deleteTradeFromSupabase error:", err);
  }
}

export async function saveChallengeToSupabase(userId: string, challenge: Challenge): Promise<void> {
  try {
    const safeUserId = ensureUUID(userId);
    const safeId = ensureUUID(challenge.id);
    const safeAccId = ensureUUID(challenge.accountId);

    await supabase
      .from('challenges')
      .upsert({
        id: safeId,
        user_id: safeUserId,
        account_id: safeAccId,
        name: challenge.name,
        capital: challenge.capital,
        target: challenge.target,
        daily_loss: challenge.dailyLoss,
        global_loss: challenge.globalLoss
      });
  } catch (err) {
    console.error("saveChallengeToSupabase error:", err);
  }
}

export async function deleteChallengeFromSupabase(challengeId: string): Promise<void> {
  try {
    await supabase.from('challenges').delete().eq('id', ensureUUID(challengeId));
  } catch (err) {
    console.error("deleteChallengeFromSupabase error:", err);
  }
}

export async function savePaymentToSupabase(userId: string, payment: PaymentRequest): Promise<void> {
  try {
    const safeUserId = ensureUUID(userId);
    const safeId = ensureUUID(payment.id);

    await supabase
      .from('payments')
      .upsert({
        id: safeId,
        user_id: safeUserId,
        amount: payment.amount,
        proof_file_url: payment.proofScreenshot,
        network: payment.network,
        status: payment.status
      });
  } catch (err) {
    console.error("savePaymentToSupabase error:", err);
  }
}

/**
 * Load all user accounts from DB for admin use
 */
export async function adminLoadAllUsersFromSupabase(): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
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
 * Load all payments raw from DB
 */
export async function adminLoadAllPaymentsFromSupabase(): Promise<PaymentRequest[]> {
  try {
    const { data: payments, error } = await supabase
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
