/**
 * api/supabase/proxy.js — TradeVault v3.1 FINAL
 * Rate limiting + Auth + All actions + Email notifications
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const ADMIN_EMAIL = process.env.ADMIN_NOTIF_EMAIL || 'igorrose2003@gmail.com';
const APP_URL = process.env.APP_URL || 'https://tradevault-silk.vercel.app';

// ─── Email Helpers ───────────────────────────────────────────────────────────
function emailHtml(contentHtml) {
  return `
    <div style="background-color:#050505;color:#f1f5f9;font-family:sans-serif;padding:40px 20px;text-align:center;">
      <div style="max-width:600px;margin:0 auto;background-color:#0d0d0d;border:1px solid #1f2937;border-radius:16px;padding:32px;text-align:left;">
        <h1 style="font-size:24px;font-weight:900;color:#fff;margin:0 0 20px;font-family:'Space Grotesk',sans-serif;">TRADE<span style="color:#00FF9C;">VAULT</span></h1>
        ${contentHtml}
        <hr style="border:0;border-top:1px solid #1f2937;margin:32px 0;" />
        <p style="color:#475569;font-size:11px;font-family:monospace;margin:0;">Track log PRO v1.2 • © 2026 TradeVault</p>
      </div>
    </div>
  `;
}

async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY) {
    console.warn('[EMAIL] Skipping send: RESEND_API_KEY is not configured.');
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'TradeVault <onboarding@resend.dev>',
        to: [to],
        subject: subject,
        html: html
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[EMAIL] Resend error:', errText);
    }
  } catch (err) {
    console.error('[EMAIL] Failed to send email via Resend:', err.message);
  }
}

// ─── Email Templates ─────────────────────────────────────────────────────────────
function emailAccountApproved(username, loginUrl, expiryDate) {
  const expDate = expiryDate ? new Date(expiryDate).toLocaleDateString('fr-FR') : 'N/A';
  return emailHtml(`
    <h2 style="color:#00FF9C;margin:0 0 16px;">Compte activé 🎉</h2>
    <p style="color:#888;font-size:14px;">Bonjour <strong style="color:#fff;">${username}</strong>, votre compte a été validé par notre équipe.</p>
    <p style="color:#888;font-size:14px;">Vous pouvez maintenant vous connecter et accéder à toutes les fonctionnalités de TradeVault PRO.</p>
    <p style="color:#888;font-size:14px;">Date d'expiration : <strong style="color:#00FF9C;">${expDate}</strong></p>
    <br/>
    <a href="${APP_URL}" style="background:#00FF9C;color:#000;font-weight:800;padding:12px 24px;border-radius:12px;text-decoration:none;display:inline-block;">Se connecter maintenant</a>
  `);
}

function emailAccessExpired(username, renewalUrl, subscriptionPrice) {
  return emailHtml(`
    <h2 style="color:#ef4444;margin:0 0 16px;">Accès expiré 🔒</h2>
    <p style="color:#888;font-size:14px;">Bonjour <strong style="color:#fff;">${username}</strong>,</p>
    <p style="color:#888;font-size:14px;">Votre abonnement a expiré. Votre accès est temporairement suspendu.</p>
    <p style="color:#888;font-size:14px;">Envoyez votre paiement pour rétablir votre accès immédiatement.</p>
    <p style="color:#888;font-size:14px;">Montant : <strong style="color:#00FF9C;">${subscriptionPrice} USDT</strong></p>
    <br/>
    <a href="${APP_URL}" style="background:#ef4444;color:#ffffff;font-weight:800;padding:12px 24px;border-radius:12px;text-decoration:none;display:inline-block;">Renouveler et débloquer l'accès</a>
  `);
}

function emailAccessUnblocked(username, loginUrl, newExpiryDate) {
  const expDate = newExpiryDate ? new Date(newExpiryDate).toLocaleDateString('fr-FR') : 'N/A';
  return emailHtml(`
    <h2 style="color:#10b981;margin:0 0 16px;">Accès rétabli 🔓</h2>
    <p style="color:#888;font-size:14px;">Bonjour <strong style="color:#fff;">${username}</strong>,</p>
    <p style="color:#888;font-size:14px;">Votre accès a été rétabli avec succès !</p>
    <p style="color:#888;font-size:14px;">Vous pouvez vous reconnecter dès maintenant.</p>
    <p style="color:#888;font-size:14px;">Nouvelle date d'expiration : <strong style="color:#00FF9C;">${expDate}</strong></p>
    <br/>
    <a href="${APP_URL}" style="background:#10b981;color:#000;font-weight:800;padding:12px 24px;border-radius:12px;text-decoration:none;display:inline-block;">Se connecter maintenant</a>
  `);
}

function emailSubscriptionRenewed(username, newExpiryDate, loginUrl) {
  const expDate = newExpiryDate ? new Date(newExpiryDate).toLocaleDateString('fr-FR') : 'N/A';
  return emailHtml(`
    <h2 style="color:#00FF9C;margin:0 0 16px;">Abonnement renouvelé ✅</h2>
    <p style="color:#888;font-size:14px;">Bonjour <strong style="color:#fff;">${username}</strong>,</p>
    <p style="color:#888;font-size:14px;">Votre abonnement a été renouvelé avec succès.</p>
    <p style="color:#888;font-size:14px;">Nouvelle date d'expiration : <strong style="color:#00FF9C;">${expDate}</strong></p>
    <p style="color:#888;font-size:14px;">Votre accès continue sans interruption.</p>
    <br/>
    <a href="${APP_URL}" style="background:#00FF9C;color:#000;font-weight:800;padding:12px 24px;border-radius:12px;text-decoration:none;display:inline-block;">Accéder à TradeVault</a>
  `);
}

function emailReminderExpiry(username, daysLeft, expiryDate, renewalUrl, subscriptionPrice) {
  const expDate = expiryDate ? new Date(expiryDate).toLocaleDateString('fr-FR') : 'N/A';
  const amountToDisplay = subscriptionPrice || 30; // Fallback to 30 if not set
  return emailHtml(`
    <h2 style="color:#f59e0b;margin:0 0 16px;">Rappel d'expiration ⏳</h2>
    <p style="color:#888;font-size:14px;">Bonjour <strong style="color:#fff;">${username}</strong>,</p>
    <p style="color:#888;font-size:14px;">Votre abonnement expire le <strong style="color:#00FF9C;">${expDate}</strong> (dans ${daysLeft} jour(s)).</p>
    <p style="color:#888;font-size:14px;">Pour éviter toute interruption, renouvelez dès maintenant.</p>
    <p style="color:#888;font-size:14px;">Montant : <strong style="color:#00FF9C;">${amountToDisplay} USDT</strong></p>
    <br/>
    <a href="${APP_URL}" style="background:#f59e0b;color:#000;font-weight:800;padding:12px 24px;border-radius:12px;text-decoration:none;display:inline-block;">Renouveler mon abonnement</a>
  `);
}

function emailNewSignup(username, email, country, network, amount, adminUrl) {
  return emailHtml(`
    <h2 style="color:#fff;margin:0 0 16px;">Inscription reçue ✅</h2>
    <p style="color:#888;font-size:14px;">Bonjour <strong style="color:#fff;">${username}</strong>, ton inscription a été reçue. Ton compte sera activé sous 24-48h.</p>
    <br/>
    <a href="${APP_URL}" style="background:#00FF9C;color:#000;font-weight:800;padding:12px 24px;border-radius:12px;text-decoration:none;display:inline-block;">Accéder au portail →</a>
  `);
}

function emailRenewalRequest(username, email, network, amount, isExpired, expiryDate) {
  const expDate = expiryDate ? new Date(expiryDate).toLocaleDateString('fr-FR') : 'N/A';
  const statusText = isExpired ? 'EXPIRÉ' : 'ACTIF';
  return emailHtml(`
    <h2 style="color:#FFB347;margin:0 0 16px;">${isExpired ? '🔄 Renouvellement (EXPIRÉ)' : '🔄 Renouvellement en attente'} : ${username}</h2>
    <p style="color:#888;">
      Nom : <strong style="color:#fff;">${username}</strong><br/>
      Email : <strong style="color:#fff;">${email}</strong><br/>
      Type : Renouvellement (compte ${statusText})<br/>
      ${!isExpired ? 'Statut actuel : actif jusqu\'au ' + expDate + '<br/>' : ''}
      Montant : <strong style="color:#00FF9C;">${amount} USDT</strong><br/>
      Réseau : <strong style="color:#00FF9C;">${network}</strong><br/>
      Preuve paiement : [screenshot]
    </p>
    <br/>
    <a href="${APP_URL}" style="background:#FFB347;color:#000;font-weight:800;padding:12px 24px;border-radius:12px;text-decoration:none;display:inline-block;">Valider →</a>
  `);
}

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
  element.count++;
  return { allowed: true, remaining: max - entry.count };
}

const RATE_LIMITS = {
  signIn:   { max: 5,  windowMs: 15 * 60 * 1000 },
  signUp:   { max: 3,  windowMs: 60 * 60 * 1000 },
  default:  { max: 60, windowMs: 60 * 1000 },
};

// Emergency fallback removed for security

// ─── Supabase client ──────────────────────────────────────────────────────────
function getSB() {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    return createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch (e) {
    console.error('[PROXY] createClient:', e.message);
    return null;
  }
}

// ─── Admin guard ──────────────────────────────────────────────────────────────
async function requireAdmin(sb, authHeader) {
  if (!sb) return { ok: false, status: 503, error: 'Service indisponible – veuillez réessayer plus tard.' };
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
  // === ENV GUARD (patch v3.2b) ===
  const REQUIRED_ENV = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'VITE_SUPABASE_ANON_KEY'
  ]

  // Vérifie les env vars au premier appel
  const missing = REQUIRED_ENV.filter(k => !process.env[k])
  if (missing.length > 0) {
    console.error('[proxy] Missing env vars:', missing)
    return res.status(503).json({
      error: 'Server misconfigured',
      missing,
      hint: 'Add these variables in Vercel Dashboard → Settings → Environment Variables'
    })
  }
  // Read allowed origins from env var, fallback to hardcoded defaults
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map(origin => origin.trim()).filter(Boolean)
    : [
        'https://tradevault-silk.vercel.app',
        'http://localhost:5173',
      ];
  const origin = req.headers.origin || '';
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '');
  }
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
    if (!action) return res.json({ success: false, error: 'Action manquante.' });

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

    // ═══════════════════════════════════════════════════════════════════════════════
    // AUTH ACTIONS
    // ══════════════════════════════════════════════════════════════════════════════

    if (action === 'signIn') {
      const { email, password } = args;
      if (!email || !password) return res.json({ success: false, error: 'Champs requis.' });
      if (!sb) return res.json({ success: false, error: 'Service indisponible – veuillez réessayer plus tard.' });
      try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.toLowerCase().includes('invalid login'))
            return res.json({ success: false, error: 'Identifiants invalides.' });
          return res.json({ success: false, error: 'Service indisponible – veuillez réessayer plus tard.' });
        }
        const { data: profile } = await sb.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
        if (!profile) return res.json({ success: false, error: 'Proutil non trouvé.' });
        return res.json({
          success: true,
          user: {
            id: data.user.id,
            email: data.user.email,
            username: profile.username || profile.full_name || email.split('@')[0],
            role: profile.role || 'user',
            status: profile.status || 'pending',
            subscription_status: profile.subscription_status || 'pending',
            plan: profile.plan || 'free',
            premium_expires_at: profile.premium_expires_at || null,
            paid: profile.subscription_status === 'premium_active',
            paidUntil: profile.premium_expires_at || null,
            avatar: profile.avatar_url || undefined,
            country: profile.country || 'TG',
            createdAt: profile.created_at || new Date().toISOString(),
          }
        });
      } catch (e) { return res.json({ success: false, error: 'Service indisponible – veuillez réessayer plus tard.' }); }
    }

    if (action === 'signUp') {
      const { email, password, username, country, paymentScreenshot, selectedNetwork, subscriptionPrice } = args;
      if (!sb) return res.json({ success: false, error: 'Service indisponible – veuillez réessayer plus tard.' });
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
      // Emails notifications
      const uName = username?.trim() || email.split('@')[0];
      const signupHtml = emailNewSignup(uName, email, country || 'TG', selectedNetwork || 'TRC20', subscriptionPrice || 30, 'https://tradevault-silk.vercel.app');
      sendEmail(email, '✅ TradeVault — Inscription reçue', signupHtml).catch(()=>{});
      const adminHtml = emailHtml(`<h2 style="color:#FFB347;margin:0 0 16px;">Nouvelle inscription ⚡</h2><p style="color:#888;">Email: <strong style="color:#fff;">${email}</strong><br/>Montant: <strong style="color:#00FF9C;">${subscriptionPrice||30} USDT (${selectedNetwork||'TRC20'})</strong></p>${paymentScreenshot?`<br/><a href="${paymentScreenshot}" style="color:#00FF9C;">📎 Voir preuve</a>`:''}<br/><br/><a href="https://tradevault-silk.vercel.app" style="background:#FFB347;color:#000;font-weight:800;padding:12px 24px;border-radius:12px;text-decoration:none;display:inline-block;">Valider →</a>`);
      sendEmail(ADMIN_EMAIL, `⚡ Nouveau compte : ${uName} — ${subscriptionPrice||30} USDT`, adminHtml).catch(()=>{});
      return res.json({ success: true, user: { id: userId, email, username: username?.trim(), country, paid: false, status: 'pending', createdAt: new Date().toISOString() } });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // DATA ACTIONS
    // ══════════════════════════════════════════════════════════════════════════════

    if (action === 'loadUserData') {
      const { userId } = args;
      if (!sb) return res.json({ success: false, error: 'Service indisponible – veuillez réessayer plus tard.' });
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
      if (!sb) return res.json({ success: false, error: 'Service indisponible – veuillez réessayer plus tard.' });
      const { account_type, account_type_app, ...payload } = account;
      const { error } = await sb.from('trading_accounts').upsert(
        { ...payload, user_id: userId, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );
      if (error) return res.json({ success: false, error: error.message });
      return res.json({ success: true });
    }

    if (action === 'getAccounts') {
      const { userId } = args;
      if (!sb) return res.json({ success: false, error: 'Service indisponible – veuillez réessayer plus tard.' });
      const { data, error } = await sb.from('trading_accounts').select('*')
        .eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: true });
      if (error) return res.json({ success: false, error: error.message });
      return res.json({ success: true, accounts: (data || []).map(a => ({ ...a, account_type: a.type })) });
    }

    if (action === 'createAccount') {
      const { name, type, broker, capital = 0 } = args;
      if (!sb) return res.json({ success: false, error: 'Service indisponible – veuillez réessayer plus tard.' });

      // Validation
      if (!name?.trim()) return res.json({ success: false, error: 'name required' });
      const validTypes = ['personal', 'prop_firm', 'demo'];
      if (!validTypes.includes(type))
        return res.json({ success: false, error: `type must be one of: ${validTypes.join('|')}` });

      const { data, error } = await sb.from('trading_accounts').insert({
        user_id: userId,
        name: name.trim(),
        type,
        broker: broker || 'Manual',
        capital: Number(capital) || 0,
        starting_balance: Number(capital) || 0,
        current_balance: Number(capital) || 0,
        is_active: true,
        is_default: false,
      }).select().single();

      if (error) return res.json({ success: false, error: error.message });
      return res.json({ success: true, account: data });
    }

    if (action === 'updateAccount') {
      const { id, name, type, broker, capital } = args;
      if (!sb) return res.json({ success: false, error: 'Service indisponible – veuillez réessayer plus tard.' });
      if (!id) return res.json({ success: false, error: 'id required' });

      const patch = {};
      if (name !== undefined)    patch.name    = String(name).trim();
      if (type !== undefined)    patch.type    = type;
      if (broker !== undefined)  patch.broker  = broker;
      if (capital !== undefined) {
        patch.capital = Number(capital) || 0;
        patch.starting_balance = Number(capital) || 0;
      }
      patch.updated_at = new Date().toISOString();

      const { data, error } = await sb.from('trading_accounts')
        .update(patch)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) return res.json({ success: false, error: error.message });
      return res.json({ success: true, account: data });
    }

    if (action === 'deleteAccount') {
      const { id } = args;
      if (!sb) return res.json({ success: false, error: 'Service indisponible – veuillez réessayer plus tard.' });
      if (!id) return res.json({ success: false, error: 'id required' });

      const { error } = await sb.from('trading_accounts')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) return res.json({ success: false, error: error.message });
      return res.json({ success: true, deleted: true, id });
    }

    if (action === 'createTrade') {
      const {
        accountId,
        symbol,
        side,
        entry_price,
        exit_price,
        size_lots,
        profit_loss,
        trade_date,
        execution_time_entry,
        execution_time_exit,
        session,
        emotion,
        setup,
        notes,
        screenshot_urls = [],
        rr_ratio,
        risk_percent,
        grade,
        tags = [],
        userId  // Added this - was missing in patch but clearly needed
      } = args;
      if (!sb) return res.json({ success: false, error: 'Service indisponible – veuillez réessayer plus tard.' });

      // Validation
      if (!accountId) return res.json({ success: false, error: 'accountId required' });
      if (!symbol)    return res.json({ success: false, error: 'symbol required' });
      if (!side || !['buy','sell'].includes(side))
        return res.json({ success: false, error: "side must be 'buy' or 'sell'" });

      const result = profit_loss > 0 ? 'WIN' : profit_loss < 0 ? 'LOSS' : 'BE';

      const { data, error } = await sb.from('trades').insert({
        account_id: accountId,
        user_id: userId,
        symbol,
        side,
        entry_price: entry_price ? Number(entry_price) : null,
        exit_price:  exit_price  ? Number(exit_price)  : null,
        size_lots:   size_lots   ? Number(size_lots)   : null,
        profit_loss: Number(profit_loss) || 0,
        execution_time_entry: execution_time_entry || new Date().toISOString(),
        execution_time_exit:  execution_time_exit  || null,
        trade_date:   trade_date || new Date().toISOString().split('T')[0],
        session:      session  || null,
        emotion:      emotion  || null,
        setup:        setup    || null,
        notes:        notes    || null,
        screenshot_urls: Array.isArray(screenshot_urls) ? screenshot_urls : [],
        rr_ratio:     rr_ratio     ? Number(rr_ratio)     : null,
        risk_percent: risk_percent ? Number(risk_percent) : null,
        grade:        grade || null,
        tags:         Array.isArray(tags) ? tags : [],
        result,
      }).select().single();

      if (error) return res.json({ success: false, error: error.message });
      return res.json({ success: true, trade: data });
    }

    if (action === 'updateTrade') {
      const { id, accountId, symbol, side, entry_price, exit_price, size_lots, profit_loss, trade_date, execution_time_entry, execution_time_exit, session, emotion, setup, notes, screenshot_urls, rr_ratio, risk_percent, grade, tags, userId } = args;
      if (!sb) return res.json({ success: false, error: 'Service indisponible – veuillez réessayer plus tard.' });
      if (!id) return res.json({ success: false, error: 'id required' });
      if (!userId) return res.json({ success: false, error: 'userId required' });

      const result = profit_loss > 0 ? 'WIN' : profit_loss < 0 ? 'LOSS' : 'BE';

      const { data, error } = await sb.from('trades')
        .update({
          account_id: accountId,
          symbol: symbol,
          side: side,
          entry_price: entry_price ? Number(entry_price) : null,
          exit_price:  exit_price  ? Number(exit_price)  : null,
          size_lots:   size_lots   ? Number(size_lots)   : null,
          profit_loss: Number(profit_loss) || 0,
          execution_time_entry: execution_time_entry || new Date().toISOString(),
          execution_time_exit:  execution_time_exit  || null,
          trade_date:   trade_date || new Date().toISOString().split('T')[0],
          session:      session  || null,
          emotion:      emotion  || null,
          setup:        setup    || null,
          notes:        notes    || null,
          screenshot_urls: Array.isArray(screenshot_urls) ? screenshot_urls : [],
          rr_ratio:     rr_ratio     ? Number(rr_ratio)     : null,
          risk_percent: risk_percent ? Number(risk_percent) : null,
          grade:        grade || null,
          tags:         Array.isArray(tags) ? tags : [],
          result:       result
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) return res.json({ success: false, error: error.message });
      return res.json({ success: true, trade: data });
    }

    if (action === 'getTradesByAccount') {
      const { accountId, page = 1, limit = 50, userId } = args; // Added userId
      if (!sb) return res.json({ success: false, error: 'Service indisponible – veuillez réessayer plus tard.' });
      if (!accountId) return res.json({ success: false, error: 'accountId required' });
      const from = (Number(page) - 1) * Number(limit);
      const { data, error, count } = await sb.from('trades')
        .select('*', { count: 'exact' })
        .eq('account_id', accountId)
        .eq('user_id', userId)
        .order('trade_date', { ascending: false })
        .range(from, from + Number(limit) - 1);
      if (error) return res.json({ success: false, error: error.message });
      return res.json({
        success: true,
        trades: data || [],
        count: count || 0
      });
    }

    if (action === 'deleteTrade') {
      const { id, userId } = args; // Added userId
      if (!sb) return res.json({ success: false, error: 'Service indisponible – veuillez réessayer plus tard.' });
      if (!id) return res.json({ success: false, error: 'id required' });

      const { error } = await sb.from('trades')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) return res.json({ success: false, error: error.message });
      return res.json({ success: true, deleted: true, id });
    }

    if (action === 'getAccountStats') {
      const { accountId } = args;
      if (!sb) return res.json({ success: false, error: 'Service indisponible – veuillez réessayer plus tard.' });
      if (!accountId) return res.json({ success: false, error: 'accountId required' });
      const { data, error } = await sb.rpc('get_account_stats', { p_account_id: accountId });
      if (error) return res.json({ success: false, error: error.message });
      return res.json({ success: true, stats: data });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // ADMIN ACTIONS
    // ══════════════════════════════════════════════════════════════════════════════

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

    if (action === 'adminDeleteUser') {
      const { userId } = args;
      await sb.from('profiles').delete().eq('id', userId);
      await sb.auth.admin.deleteUser(userId).catch(() => {});
      await logAudit(sb, adminUserId, 'delete_user', { targetId: userId });
      return res.json({ success: true });
    }

    if (action === 'adminUpdateUser') {
      const { userId, updates, role, status, subscription_status, plan, premium_expires_at } = args;
      const payload = updates || { role, status, subscription_status, plan, premium_expires_at };
      const { error } = await sb.from('profiles')
        .update({ ...payload, updated_at: new Date().toISOString() }).eq('id', userId);
      if (error) return res.json({ success: false, error: error.message });
      await logAudit(sb, adminUserId, 'update_user', { targetId: userId, changes: payload });
      return res.json({ success: true });
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