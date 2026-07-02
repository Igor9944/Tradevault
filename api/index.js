const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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
  return { success: true, source: 'emergency', user: { ...safe, paid: true, paidUntil: null, avatar: undefined, createdAt: new Date().toISOString() } };
}

async function handleSignIn(sb, email, password) {
  if (!sb) return emergencySignIn(email, password);
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.toLowerCase().includes('invalid login')) return { success: false, error: 'Identifiants invalides.' };
      return emergencySignIn(email, password);
    }
    const { data: profile } = await sb.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
    return {
      success: true, source: 'supabase',
      user: {
        id: data.user.id, email: data.user.email,
        username: profile?.username || profile?.full_name || email.split('@')[0],
        role: profile?.role || 'user', status: profile?.status || 'pending',
        subscription_status: profile?.subscription_status || 'pending',
        plan: profile?.plan || 'free',
        premium_expires_at: profile?.premium_expires_at || null,
        paid: profile?.subscription_status === 'premium_active',
        paidUntil: profile?.premium_expires_at || null,
        avatar: profile?.avatar_url || undefined,
        country: profile?.country || 'TG',
        createdAt: profile?.created_at || new Date().toISOString(),
      }
    };
  } catch (e) {
    return emergencySignIn(email, password);
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return res.json({ ok: true, ts: new Date().toISOString() });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, arguments: args = {} } = req.body || {};
  const sb = (SUPABASE_URL && SERVICE_KEY)
    ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
    : null;

  const ADMIN_ACTIONS = new Set(['adminLoadAllUsers','adminDeleteUser','adminUpdateUser','adminLoadAllPayments','updateUserRole','savePayment','adminGetStats']);

  if (ADMIN_ACTIONS.has(action)) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (sb) {
      const { data, error } = await sb.auth.getUser(token);
      if (error || !data?.user) return res.status(401).json({ success: false, error: 'Session invalide.' });
      const { data: p } = await sb.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      if (p?.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès admin requis.' });
    }
  }

  try {
    switch (action) {
      case 'signIn': return res.json(await handleSignIn(sb, args.email, args.password));

      case 'signUp': {
        if (!sb) return res.json({ success: false, error: 'DB non disponible.' });
        const { email, password, username, country, paymentScreenshot, selectedNetwork, subscriptionPrice } = args;
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) return res.json({ success: false, error: error.message });
        const userId = data.user?.id;
        await sb.from('profiles').upsert({ id: userId, email, username: username?.trim(), country: country||'TG', status: 'pending', role: 'user', subscription_status: 'pending', plan: 'free', payment_proof: paymentScreenshot, created_at: new Date().toISOString() });
        await sb.from('payment_requests').insert({ user_id: userId, amount: subscriptionPrice||30, screenshot_url: paymentScreenshot, network: selectedNetwork||'TRC20', status: 'pending', type: 'registration', created_at: new Date().toISOString() });
        return res.json({ success: true, user: { id: userId, email, username: username?.trim(), country, paid: false, status: 'pending', createdAt: new Date().toISOString() } });
      }

      case 'adminLoadAllUsers': {
        if (!sb) return res.json({ success: false, error: 'DB non disponible.' });
        const { data, error } = await sb.from('profiles').select('id,email,username,role,status,subscription_status,plan,premium_expires_at,created_at,country,payment_proof,avatar_url').order('created_at', { ascending: false });
        if (error) return res.json({ success: false, error: error.message });
        return res.json({ success: true, users: data });
      }

      case 'adminLoadAllPayments': {
        if (!sb) return res.json({ success: false, error: 'DB non disponible.' });
        const { data, error } = await sb.from('payment_requests').select('*, profiles(email,username)').order('created_at', { ascending: false });
        if (error) return res.json({ success: false, error: error.message });
        return res.json({ success: true, payments: data });
      }

      case 'updateUserRole':
      case 'adminUpdateUser': {
        if (!sb) return res.json({ success: false, error: 'DB non disponible.' });
        const { userId, updates, role, status, subscription_status, plan, premium_expires_at } = args;
        const payload = updates || { role, status, subscription_status, plan, premium_expires_at };
        const { error } = await sb.from('profiles').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', userId);
        if (error) return res.json({ success: false, error: error.message });
        return res.json({ success: true });
      }

      case 'savePayment': {
        if (!sb) return res.json({ success: false, error: 'DB non disponible.' });
        const { paymentId, status } = args;
        await sb.from('payment_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', paymentId);
        if (status === 'approved') {
          const { data: pr } = await sb.from('payment_requests').select('user_id').eq('id', paymentId).maybeSingle();
          if (pr?.user_id) await sb.from('profiles').update({ subscription_status: 'premium_active', status: 'approved', plan: 'pro', premium_expires_at: new Date(Date.now() + 30*24*60*60*1000).toISOString(), updated_at: new Date().toISOString() }).eq('id', pr.user_id);
        }
        return res.json({ success: true });
      }

      case 'adminGetStats': {
        if (!sb) return res.json({ success: false, error: 'DB non disponible.' });
        const [u, p, t] = await Promise.all([
          sb.from('profiles').select('id,subscription_status'),
          sb.from('payment_requests').select('id,status,amount'),
          sb.from('trades').select('id'),
        ]);
        return res.json({ success: true, stats: {
          totalUsers: u.data?.length||0,
          activeUsers: u.data?.filter(x => x.subscription_status==='premium_active').length||0,
          pendingPayments: p.data?.filter(x => x.status==='pending').length||0,
          totalRevenue: p.data?.filter(x => x.status==='approved').reduce((s,x)=>s+Number(x.amount),0)||0,
          totalTrades: t.data?.length||0,
        }});
      }

      case 'health': return res.json({ success: true, dbOnline: !!sb, ts: new Date().toISOString() });
      default: return res.status(400).json({ success: false, error: `Action inconnue: ${action}` });
    }
  } catch (err) {
    console.error('[PROXY]', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur interne.' });
  }
};
