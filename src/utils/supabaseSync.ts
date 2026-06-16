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

export async function checkSupabaseConnection(): Promise<boolean> {
  if (isSupabaseOnline === false) return false;
  if (supabaseUrl === dummyUrl || supabaseAnonKey === dummyKey) {
    isSupabaseOnline = false;
    return false;
  }
  if (isSupabaseOnline === true) return true;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
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

export function ensureUUID(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  if (id === 'personal') return '00000000-0000-4000-8000-000000000000';
  if (id === 'ftmo-100k' || id === 'ftmo-100k-challenge') return '11111111-1111-4111-9111-111111111111';
  const cleaned = id.replace(/[^0-9a-f]/gi, '').padEnd(12, '0').slice(0, 12);
  return `22222222-2222-4222-a222-${cleaned}`;
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function invokeProxy(action: string, args: any): Promise<any> {
  const response = await fetch('/api/supabase/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, arguments: args })
  });
  if (!response.ok) throw new Error(`Server proxy error: ${response.statusText}`);
  return response.json();
}

function getCurrentUserId(): string {
  const savedUser = safeSessionStorage.getItem('tv_current_user') || safeLocalStorage.getItem('tv_current_user');
  if (savedUser) {
    try { return JSON.parse(savedUser).id; } catch (e) {}
  }
  return '00000000-0000-4000-8000-000000000000';
}

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
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password: regPassword });
    if (authError) throw authError;
    const userId = authData.user?.id;
    if (!userId) throw new Error("Erreur récupération ID.");
    await supabase.from('profiles').upsert({
      id: userId, email, username: regUsername.trim(), country: regCountry, avatar_url: regAvatar, status: 'pending'
    });
    await supabase.from('payment_requests').insert({
      id: generateUUID(), user_id: userId, amount: subscriptionPrice, screenshot_url: paymentScreenshot, network: selectedNetwork, status: 'pending'
    });
    return { success: true, user: { id: userId, username: regUsername.trim(), email, country: regCountry, paid: false, paid_until: null, created_at: new Date().toISOString(), status: 'pending', avatar_url: regAvatar || undefined } };
  } catch (err: any) {
    return invokeProxy("signUp", { email, password: regPassword, username: regUsername, country: regCountry, paymentScreenshot, selectedNetwork, subscriptionPrice, regAvatar });
  }
}

export async function signInWithSupabase(emailInput: string, passwordInput: string): Promise<{ success: boolean; user?: User; error?: string }> {
  const email = emailInput.trim().toLowerCase();
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password: passwordInput });
    if (authError) throw authError;
    const userId = authData.user?.id;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    return { success: true, user: {
      id: userId!,
      username: profile?.username || authData.user!.email?.split('@')[0] || 'Trader',
      email: authData.user!.email || email,
      country: profile?.country || 'FR',
      paid: profile?.plan === 'pro' || profile?.paid === true,
      paid_until: profile?.premium_expires_at || profile?.paid_until || null,
      status: profile?.status || 'approved',
      avatar_url: profile?.avatar_url || undefined,
      created_at: profile?.created_at || new Date().toISOString()
    }};
  } catch (err: any) {
    return invokeProxy("signIn", { email, password: passwordInput });
  }
}

export async function fetchUserProfile(userId: string): Promise<User | null> {
  try {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', ensureUUID(userId)).maybeSingle();
    if (!profile) return null;
    return {
      id: userId, username: profile.username || 'Trader', email: profile.email || '', country: profile.country || 'FR',
      paid: profile.plan === 'pro' || profile.paid === true, paid_until: profile.premium_expires_at || profile.paid_until || null,
      created_at: profile.created_at || new Date().toISOString(), status: profile.status || 'approved', avatar_url: profile.avatar_url, currency: profile.currency || 'USD'
    };
  } catch (err) { return null; }
}

export async function syncUserProfile(user: User): Promise<void> {
  const profile = { id: ensureUUID(user.id), email: user.email, username: user.username, country: user.country, status: user.status, avatar_url: user.avatar_url || null, plan: user.paid ? 'pro' : 'free', updated_at: new Date().toISOString() };
  try { await supabase.from('profiles').upsert(profile); } catch (err) { await invokeProxy("syncUserProfile", { profile }); }
}

export async function loadUserDataFromSupabase(userId: string): Promise<{ accounts: Account[]; trades: Trade[]; challenges: Challenge[]; paymentRequests: PaymentRequest[]; }> {
  const safeUserId = ensureUUID(userId);
  try {
    const { data: aData } = await supabase.from('trading_accounts').select('*').eq('user_id', safeUserId);
    const { data: tData } = await supabase.from('trades').select('*').eq('user_id', safeUserId);
    const { data: cData } = await supabase.from('challenges').select('*').eq('user_id', safeUserId);
    const { data: pData } = await supabase.from('payment_requests').select('*').eq('user_id', safeUserId);
    
    return {
      accounts: (aData || []).map(a => ({ id: a.id, user_id: a.user_id, name: a.name, account_type: a.type, capital: a.starting_balance ? Number(a.starting_balance) : undefined, created_at: a.created_at })),
      trades: (tData || []).map(t => ({
        id: t.id, account_id: t.account_id, user_id: t.user_id, date: t.trade_date || t.execution_time_entry || t.created_at, pair: t.symbol || '', side: (t.side || 'buy').toUpperCase() as 'BUY' | 'SELL',
        entry: Number(t.entry_price || 0), exit: Number(t.exit_price || 0), lots: Number(t.size_lots || 0.1), fees: Number(t.fees || 0), pnl: Number(t.profit_loss || 0),
        setup: t.setup || '', mindset: t.mindset || '', notes: t.notes || '', screenshot_url: t.screenshot_urls?.[0], emotion: t.emotion, session: t.session, rr_ratio: t.rr_ratio ? Number(t.rr_ratio) : undefined, risk_percent: t.risk_percent ? Number(t.risk_percent) : undefined, created_at: t.created_at
      })),
      challenges: (cData || []).map(c => ({ id: c.id, account_id: c.account_id, user_id: c.user_id, name: c.name, capital: Number(c.capital || 100000), target: Number(c.profit_target_pct || 8), daily_loss: Number(c.daily_dd_pct || 5), global_loss: Number(c.total_dd_pct || 10), created_at: c.created_at })),
      paymentRequests: (pData || []).map(p => ({ id: p.id, user_id: p.user_id, username: '', email: '', amount: Number(p.amount || 30), network: p.network, payment_proof: p.screenshot_url || '', status: p.status, created_at: p.created_at }))
    };
  } catch (err) { return { accounts: [], trades: [], challenges: [], paymentRequests: [] }; }
}

export async function saveTradeToSupabase(userId: string, trade: Trade): Promise<void> {
  const row = {
    id: ensureUUID(trade.id), user_id: ensureUUID(userId), account_id: ensureUUID(trade.account_id), symbol: trade.pair, side: trade.side.toLowerCase(), entry_price: trade.entry, exit_price: trade.exit,
    size_lots: trade.lots, profit_loss: trade.pnl, execution_time_entry: trade.date, trade_date: trade.date.split('T')[0], result: trade.pnl > 0 ? 'WIN' : (trade.pnl < 0 ? 'LOSS' : 'BE'),
    setup: trade.setup || null, notes: trade.notes || null, screenshot_urls: trade.screenshot_url ? [trade.screenshot_url] : [], emotion: trade.emotion || null, session: trade.session || null,
    rr_ratio: trade.rr_ratio || null, risk_percent: trade.risk_percent || null, fees: trade.fees || 0, mindset: trade.mindset || null, updated_at: new Date().toISOString()
  };
  try { await supabase.from('trades').upsert(row); } catch (err) { await invokeProxy("saveTrade", { row }); }
}

export async function deleteTradeFromSupabase(tradeId: string): Promise<void> {
  try { await supabase.from('trades').delete().eq('id', ensureUUID(tradeId)); } catch (err) { await invokeProxy("deleteTrade", { tradeId: ensureUUID(tradeId) }); }
}

export async function saveAccountToSupabase(userId: string, account: Account): Promise<void> {
  const row = { id: ensureUUID(account.id), user_id: ensureUUID(userId), name: account.name, type: account.account_type, starting_balance: account.capital || null, updated_at: new Date().toISOString() };
  try { await supabase.from('trading_accounts').upsert(row); } catch (err) { await invokeProxy("saveAccount", { row }); }
}

export async function deleteAccountFromSupabase(accountId: string): Promise<void> {
  try { await supabase.from('trading_accounts').delete().eq('id', ensureUUID(accountId)); } catch (err) { await invokeProxy("deleteAccount", { accountId: ensureUUID(accountId) }); }
}

export async function saveChallengeToSupabase(userId: string, challenge: Challenge): Promise<void> {
  const row = { id: ensureUUID(challenge.id), user_id: ensureUUID(userId), account_id: ensureUUID(challenge.account_id), name: challenge.name, capital: challenge.capital, profit_target_pct: challenge.target, daily_dd_pct: challenge.daily_loss, total_dd_pct: challenge.global_loss, updated_at: new Date().toISOString() };
  try { await supabase.from('challenges').upsert(row); } catch (err) { await invokeProxy("saveChallenge", { row }); }
}

export async function deleteChallengeFromSupabase(challengeId: string): Promise<void> {
  try { await supabase.from('challenges').delete().eq('id', ensureUUID(challengeId)); } catch (err) { await invokeProxy("deleteChallenge", { challengeId: ensureUUID(challengeId) }); }
}

export async function adminLoadAllUsersFromSupabase(): Promise<User[]> {
  const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  return (data || []).map(p => ({ id: p.id, username: p.username || 'Trader', email: p.email, country: p.country || 'FR', paid: p.plan === 'pro' || p.paid === true, paid_until: p.premium_expires_at || p.paid_until || null, status: p.status || 'pending', avatar_url: p.avatar_url || undefined, created_at: p.created_at || new Date().toISOString() }));
}

export async function adminLoadAllPaymentsFromSupabase(): Promise<PaymentRequest[]> {
  const { data } = await supabase.from('payment_requests').select('*, profiles(email, username)').order('created_at', { ascending: false });
  return (data || []).map(p => ({ id: p.id, user_id: p.user_id, username: p.profiles?.username || 'Trader', email: p.profiles?.email || '', amount: Number(p.amount || 30), network: p.network, payment_proof: p.screenshot_url || '', status: p.status, created_at: p.created_at }));
}

export async function adminDeleteUserFromSupabase(userId: string): Promise<boolean> {
  try { await supabase.from('profiles').delete().eq('id', ensureUUID(userId)); return true; } catch (err) { return false; }
}

export async function adminUpdateUserFromSupabase(userId: string, fields: any): Promise<boolean> {
  try { await supabase.from('profiles').update(fields).eq('id', ensureUUID(userId)); return true; } catch (err) { return false; }
}

export async function loadAdminSettings() { return null; }
export async function saveAdminSettings(s: any) {}
export async function savePaymentToSupabase(u: string, p: any) {}
export async function handleSupabaseSession(s: any): Promise<any> { return { success: false }; }
export async function signInWithGoogle(): Promise<any> { return { success: false }; }
