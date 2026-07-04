/**
 * api/supabase/proxy.js — TradeVault v3.1 FINAL
 * Rate limiting + Auth + All actions + Emergency fallback
 */
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// ─── Rate Limiting (in-memory, resets on cold start) ─────────────────────────
const rateLimitStore = new Map();
function checkRateLimit(identifier, action, max, windowMs) {
  const key = `${identifier}:${action}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }
  if (entry.count >= max) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { allowed: true, remaining: max - entry.count };
}

const RATE_LIMITS = {
  signIn:   { max: 5,  windowMs: 15 * 60 * 1000 },
  signUp:   { max: 3,  windowMs: 60 * 60 * 1000 },
  default:  { max: 60, windowMs: 60 * 1000 },
};

// ─── Emergency fallback ───────────────────────────────────────────────────────
function hash(pwd) {
  return crypto.createHash('sha256').update(pwd + 'tv_salt_2027').digest('hex');
}
const EMERGENCY = [
  { id: '6770a1eb-7a4e-4804-9dee-f9c1102cd854', email: 'admin@tradevault-onyx.com',
    passwordHash: hash('7ddxNRF9gqaBfhGu'), username: 'Onyx Admin',
    role: 'admin', status: 'approved', subscription_status: 'premium_active', plan: 'pro', paid: true, country: 'TG' },
  { id: '0e0e91bc-8440-45c6-876c-6e546cf43dbd', email: 'tradonyx@vault.com',
    passwordHash: hash('otradnyx@2027'), username: 'TradeVault Admin',
    role: 'admin', status: 'approved', subscription_status: 'premium_active', plan: 'pro', paid: true, country: 'TG' },
];

function emergencySignIn(email, password) {
  const u = EMERGENCY.find(x => x.email === email.trim().toLowerCase());
  if (!u) return { success: false, error: 'Compte introuvable.' };
  if (u.passwordHash !== hash(password)) return { success: false, error: 'Mot de passe incorrect.' };
  const { passwordHash: _, ...safe } = u;
  return { success: true, source: 'emergency', user: { ...safe, paidUntil: null, avatar: undefined, createdAt: new Date().toISOString() } };
}

// ─── Supabase client ──────────────────────────────────────────────────────────
function getSB() {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    return createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  } catch (e) {
    console.error('[PROXY] createClient:', e.message);
    return null;
  }
}

// ─── Admin guard ──────────────────────────────────────────────────────────────
async function requireAdmin(sb, authHeader) {
  if (!sb) return { ok: false, status: 503, error: 'DB indisponible.' };
  const token = (authHeader || '').replace('Bearer ', '');
  if (!token) return { ok: false, status: 401, error: 'Auth requise.' };
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return { ok: false, status: 401, error: 'Session invalide.' };
  const { data: p } = await sb.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  if (p?.role !== 'admin') return { ok: false, status: 403, error: 'Accès admin requis.' };
  return { ok: true, userId: data.user.id };
}

// ─── Logging interne ──────────────────────────────────────────────────────────
async function logAudit(sb, userId, action, details = {}) {
  if (!sb || !userId) return;
  try {
    await sb.from('audit_logs').insert({
      user_id: userId, action,
      details: JSON.stringify(details),
      created_at: new Date().toISOString()
    });
  } catch (_) {}
}

// ─── Main handler ─────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return res.json({ ok: true, version: '3.1.0', ts: new Date().toISOString() });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { action, arguments: args = {} } = body;
    if (!action) return res.status(400).json({ success: false, error: 'Action manquante.' });

    // Identifier pour rate limiting
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection?.remoteAddress || 'unknown';
    const limitCfg = RATE_LIMITS[action] || RATE_LIMITS.default;
    const rl = checkRateLimit(ip, action, limitCfg.max, limitCfg.windowMs);

    if (!rl.allowed) {
      res.setHeader('Retry-After', rl.retryAfter || 60);
      return res.status(429).json({
        success: false,
        error: `Trop de tentatives. Réessaie dans ${rl.retryAfter || 60}s.`
      });
    }

    const sb = getSB();

    const ADMIN_ACTIONS = new Set([
      'adminLoadAllUsers','adminDeleteUser','adminUpdateUser',
      'adminLoadAllPayments','updateUserRole','savePayment',
      'adminGetStats','adminCreateAnnouncement','adminUpdateSettings'
    ]);

    let adminUserId = null;
    if (ADMIN_ACTIONS.has(action)) {
      const guard = await requireAdmin(sb, req.headers.authorization);
      if (!guard.ok) return res.status(guard.status).json({ success: false, error: guard.error });
      adminUserId = guard.userId;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // AUTH ACTIONS
    // ══════════════════════════════════════════════════════════════════════════

    if (action === 'signIn') {
      const { email, password } = args;
      if (!email || !password) return res.json({ success: false, error: 'Champs requis.' });
      if (!sb) return res.json(emergencySignIn(email, password));
      try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.toLowerCase().includes('invalid login'))
            return res.json({ success: false, error: 'Identifiants invalides.' });
          return res.json(emergencySignIn(email, password));
        }
        const { data: profile } = await sb.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
        await sb.from('profiles').update({
          last_login_at: new Date().toISOString(),
          login_count: (profile?.login_count || 0) + 1
        }).eq('id', data.user.id);
        return res.json({
          success: true, source: 'supabase',
          user: {
            id: data.user.id, email: data.user.email,
            username: profile?.username || profile?.full_name || email.split('@')[0],
            role: profile?.role || 'user', status: profile?.status || 'pending',
            subscription_status: profile?.subscription_status || 'pending',
            plan: profile?.plan || 'free', premium_expires_at: profile?.premium_expires_at || null,
            paid: profile?.subscription_status === 'premium_active',
            paidUntil: profile?.premium_expires_at || null,
            avatar: profile?.avatar_url || undefined, country: profile?.country || 'TG',
            createdAt: profile?.created_at || new Date().toISOString(),
          }
        });
      } catch (e) { return res.json(emergencySignIn(email, password)); }
    }

    if (action === 'signUp') {
      const { email, password, username, country, paymentScreenshot, selectedNetwork, subscriptionPrice } = args;
      if (!sb) return res.json({ success: false, error: 'Service indisponible.' });
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) return res.json({ success: false, error: error.message });
      const userId = data.user?.id;
      if (!userId) return res.json({ success: false, error: 'ID auth non récupéré.' });
      await sb.from('profiles').upsert({
        id: userId, email, username: username?.trim(), country: country || 'TG',
        status: 'pending', role: 'user', subscription_status: 'pending', plan: 'free',
        payment_proof: paymentScreenshot, created_at: new Date().toISOString()
      });
      await sb.from('payment_requests').insert({
        user_id: userId, amount: subscriptionPrice || 30,
        screenshot_url: paymentScreenshot, network: selectedNetwork || 'TRC20',
        status: 'pending', type: 'registration', created_at: new Date().toISOString()
      });
      return res.json({ success: true, user: { id: userId, email, username: username?.trim(), country, paid: false, status: 'pending', createdAt: new Date().toISOString() } });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DATA ACTIONS
    // ══════════════════════════════════════════════════════════════════════════

    if (action === 'loadUserData') {
      const { userId } = args;
      if (!sb) return res.json({ success: false, error: 'DB non disponible.' });
      const [profile, accounts, trades, challenges, payments, settings] = await Promise.all([
        sb.from('profiles').select('*').eq('id', userId).maybeSingle(),
        sb.from('trading_accounts').select('*').eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: true }),
        sb.from('trades').select('*').eq('user_id', userId).order('trade_date', { ascending: false }).limit(500),
        sb.from('challenges').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        sb.from('payment_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        sb.from('public_config').select('*').single(),
      ]);
      return res.json({
        success: true,
        profile: profile.data,
        accounts: (accounts.data || []).map(a => ({ ...a, account_type: a.type })),
        trades: trades.data || [],
        challenges: challenges.data || [],
        payments: payments.data || [],
        settings: settings.data || {},
      });
    }

    if (action === 'loadUserAccounts') {
      const { userId } = args;
      if (!sb) return res.json({ success: false, accounts: [] });
      const { data, error } = await sb.from('trading_accounts').select('*')
        .eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: true });
      if (error) return res.json({ success: false, error: error.message });
      return res.json({ success: true, accounts: (data || []).map(a => ({ ...a, account_type: a.type })) });
    }

    if (action === 'saveAccount') {
      const { account, userId } = args;
      if (!sb) return res.json({ success: false, error: 'DB non disponible.' });
      const { account_type, account_type_app, ...payload } = account;
      const { error } = await sb.from('trading_accounts').upsert(
        { ...payload, user_id: userId, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );
      if (error) return res.json({ success: false, error: error.message });
      return res.json({ success: true });
    }

    if (action === 'deleteAccount') {
      const { accountId, userId } = args;
      if (!sb) return res.json({ success: false, error: 'DB non disponible.' });
      const { error } = await sb.from('trading_accounts')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', accountId).eq('user_id', userId);
      if (error) return res.json({ success: false, error: error.message });
      return res.json({ success: true });
    }

    if (action === 'getAccountStats') {
      const { accountId } = args;
      if (!sb) return res.json({ success: false, error: 'DB non disponible.' });
      const { data, error } = await sb.rpc('get_account_stats', { p_account_id: accountId });
      if (error) return res.json({ success: false, error: error.message });
      return res.json({ success: true, stats: data });
    }

    if (action === 'loadTrades') {
      const { accountId, userId, page = 0, pageSize = 50 } = args;
      if (!sb) return res.json({ success: false, trades: [] });
      const from = page * pageSize;
      let q = sb.from('trades').select('*').eq('user_id', userId)
        .order('trade_date', { ascending: false }).order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);
      if (accountId) q = q.eq('account_id', accountId);
      const { data, error } = await q;
      if (error) return res.json({ success: false, error: error.message });
      return res.json({ success: true, trades: data || [] });
    }

    if (action === 'saveTrade') {
      const { trade, userId } = args;
      if (!sb) return res.json({ success: false, error: 'DB non disponible.' });
      const payload = {
        ...trade, user_id: userId,
        trade_date: trade.trade_date || trade.date || new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
        created_at: trade.created_at || new Date().toISOString(),
      };
      const { data, error } = await sb.from('trades').upsert(payload, { onConflict: 'id' }).select().single();
      if (error) return res.json({ success: false, error: error.message });
      return res.json({ success: true, trade: data });
    }

    if (action === 'deleteTrade') {
      const { tradeId, userId } = args;
      if (!sb) return res.json({ success: false, error: 'DB non disponible.' });
      const { error } = await sb.from('trades').delete().eq('id', tradeId).eq('user_id', userId);
      if (error) return res.json({ success: false, error: error.message });
      return res.json({ success: true });
    }

    if (action === 'loadNotifications') {
      const { userId } = args;
      if (!sb) return res.json({ success: false, notifications: [] });
      const { data } = await sb.from('notifications').select('*')
        .eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
      return res.json({ success: true, notifications: data || [] });
    }

    if (action === 'markNotificationsRead') {
      const { userId, notifId } = args;
      if (!sb) return res.json({ success: true });
      const q = sb.from('notifications').update({ read_at: new Date().toISOString() });
      if (notifId) q.eq('id', notifId); else q.eq('user_id', userId).is('read_at', null);
      await q;
      return res.json({ success: true });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ADMIN ACTIONS
    // ══════════════════════════════════════════════════════════════════════════

    if (action === 'adminLoadAllUsers') {
      const { data, error } = await sb.from('profiles')
        .select('id,email,username,role,status,subscription_status,plan,premium_expires_at,created_at,country,payment_proof,avatar_url,login_count,last_login_at,kyc_status')
        .order('created_at', { ascending: false });
      if (error) return res.json({ success: false, error: error.message });
      return res.json({ success: true, users: data });
    }

    if (action === 'adminLoadAllPayments') {
      const { data, error } = await sb.from('payment_requests')
        .select('*, profiles(email,username)').order('created_at', { ascending: false });
      if (error) return res.json({ success: false, error: error.message });
      return res.json({ success: true, payments: data });
    }

    if (action === 'updateUserRole' || action === 'adminUpdateUser') {
      const { userId, updates, role, status, subscription_status, plan, premium_expires_at } = args;
      const payload = updates || { role, status, subscription_status, plan, premium_expires_at };
      const { error } = await sb.from('profiles')
        .update({ ...payload, updated_at: new Date().toISOString() }).eq('id', userId);
      if (error) return res.json({ success: false, error: error.message });
      await logAudit(sb, adminUserId, 'update_user', { targetId: userId, changes: payload });
      return res.json({ success: true });
    }

    if (action === 'adminDeleteUser') {
      const { userId } = args;
      await sb.from('profiles').delete().eq('id', userId);
      await sb.auth.admin.deleteUser(userId).catch(() => {});
      await logAudit(sb, adminUserId, 'delete_user', { targetId: userId });
      return res.json({ success: true });
    }

    if (action === 'savePayment') {
      const { paymentId, status } = args;
      if (status === 'approved') {
        const { data } = await sb.rpc('approve_payment', { p_payment_id: paymentId, p_admin_id: adminUserId });
        return res.json(data || { success: true });
      }
      await sb.from('payment_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', paymentId);
      await logAudit(sb, adminUserId, `payment_${status}`, { paymentId });
      return res.json({ success: true });
    }

    if (action === 'adminGetStats') {
      const [u, p, t, a] = await Promise.all([
        sb.from('profiles').select('id,subscription_status,created_at'),
        sb.from('payment_requests').select('id,status,amount,created_at'),
        sb.from('trades').select('id,created_at'),
        sb.from('trading_accounts').select('id,type').eq('is_active', true),
      ]);
      const now = new Date();
      const thisMonth = u.data?.filter(x => new Date(x.created_at).getMonth() === now.getMonth()).length || 0;
      return res.json({ success: true, stats: {
        totalUsers:       u.data?.length || 0,
        activeUsers:      u.data?.filter(x => x.subscription_status === 'premium_active').length || 0,
        newThisMonth:     thisMonth,
        pendingPayments:  p.data?.filter(x => x.status === 'pending').length || 0,
        totalRevenue:     p.data?.filter(x => x.status === 'approved').reduce((s, x) => s + Number(x.amount), 0) || 0,
        totalTrades:      t.data?.length || 0,
        totalAccounts:    a.data?.length || 0,
        propFirmAccounts: a.data?.filter(x => x.type === 'prop_firm').length || 0,
      }});
    }

    if (action === 'adminUpdateSettings') {
      const { settings } = args;
      const allowed = ['subscription_price','usdt_trc20_address','usdt_bep20_address',
        'notification_emails','ftmo_profit_target','ftmo_daily_loss','ftmo_max_loss',
        'maintenance_mode','support_email'];
      const filtered = Object.fromEntries(Object.entries(settings).filter(([k]) => allowed.includes(k)));
      const { error } = await sb.from('admin_settings').update({ ...filtered, updated_at: new Date().toISOString() }).eq('id', 1);
      if (error) return res.json({ success: false, error: error.message });
      await logAudit(sb, adminUserId, 'update_settings', filtered);
      return res.json({ success: true });
    }

    if (action === 'adminCreateAnnouncement') {
      const { title, content, type, target_role, pinned, expires_at } = args;
      const { data, error } = await sb.from('announcements').insert({
        title, content, type: type || 'info', target_role: target_role || 'all',
        pinned: pinned || false, expires_at, is_active: true,
        created_by: adminUserId, published_at: new Date().toISOString(), created_at: new Date().toISOString()
      }).select().single();
      if (error) return res.json({ success: false, error: error.message });
      return res.json({ success: true, announcement: data });
    }

    if (action === 'health') {
      return res.json({ success: true, dbOnline: !!sb, version: '3.1.0', ts: new Date().toISOString() });
    }

    return res.status(400).json({ success: false, error: `Action inconnue: ${action}` });

  } catch (err) {
    console.error('[PROXY_500]', err.message);
    return res.status(500).json({ success: false, error: 'Erreur interne: ' + err.message });
  }
};
