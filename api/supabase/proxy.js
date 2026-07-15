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
  entry.count++;
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
      auth: { autoRefreshToken: false, persistSession: false }
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
  const allowedOrigins = [
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
      if (!sb) return res.json({ success: false, error: 'Service indisponible – veuillez réessayer plus tard.' });
      try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.toLowerCase().includes('invalid login'))
            return res.json({ success: false, error: 'Identifiants invalides.' });
          return res.json({ success: false, error: 'Service indisponible – veuillez réessayer plus tard.' });
        }
        const { data: profile } = await sb.from('profiles').select('*').eq('id', data.user.id).maybeSingle();

        // Handle subscription expiration and reminders
        const now = new Date();
        const expiryDate = profile.premium_expires_at ? new Date(profile.premium_expires_at) : null;

        // Check if expired
        if (profile.subscription_status === 'premium_active' && expiryDate && expiryDate < now) {
          // Update status to expired
          await sb.from('profiles').update({
            subscription_status: 'expired',
            updated_at: new Date().toISOString()
          }).eq('id', data.user.id);

          // Send expiration email (check if already sent today to avoid spamming)
          const lastEmailSent = profile.email_expired_at ? new Date(profile.email_expired_at) : null;
          const shouldSendEmail = !lastEmailSent || (now - lastEmailSent) > (24 * 60 * 60 * 1000); // 24 hours

          if (shouldSendEmail) {
            const expiryFormatted = expiryDate.toLocaleDateString('fr-FR');
            const expiredHtml = emailHtml(`<h2 style="color:#ef4444;margin:0 0 16px;">Accès expiré 🔒</h2><p style="color:#888;font-size:14px;">Bonjour <strong style="color:#fff;">${profile.username||profile.email.split('@')[0]}</strong>, votre abonnement a expiré le <strong style="color:#ef4444;">${expiryFormatted}</strong>. Votre accès est temporairement suspendu.</p><br/><a href="${APP_URL}" style="background:#ef4444;color:#ffffff;font-weight:800;padding:12px 24px;border-radius:12px;text-decoration:none;display:inline-block;">Renouveler et débloquer l'accès</a>`);
            await sendEmail(profile.email, '🔒 Votre accès TradeVault a expiré', expiredHtml);

            // Update email sent timestamp
            await sb.from('profiles').update({
              email_expired_at: new Date().toISOString()
            }).eq('id', data.user.id);
          }

          return res.json({
            success: false,
            error: 'Votre abonnement a expiré. Renouvelez pour accéder.',
            subscription_status: 'expired'
          });
        }

        // Send renewal reminder (J-7)
        if (profile.subscription_status === 'premium_active' && expiryDate) {
          const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
          if (daysLeft > 0 && daysLeft <= 7) {
            // Check if reminder already sent today to avoid spamming
            const lastReminderSent = profile.email_reminder_at ? new Date(profile.email_reminder_at) : null;
            const shouldSendReminder = !lastReminderSent || (now - lastReminderSent) > (24 * 60 * 60 * 1000); // 24 hours

            if (shouldSendReminder) {
              const reminderHtml = emailReminderExpiry(profile.username||profile.email.split('@')[0], daysLeft, expiryDate, APP_URL, profile.subscription_price);
              await sendEmail(profile.email, '⏳ Votre abonnement TradeVault expire bientôt', reminderHtml);

              // Update reminder sent timestamp
              await sb.from('profiles').update({
                email_reminder_at: new Date().toISOString()
              }).eq('id', data.user.id);
            }
          }
        }

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

    // ══════════════════════════════════════════════════════════════════════════
    // DATA ACTIONS
    // ══════════════════════════════════════════════════════════════════════════

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

    if (action === 'deleteAccount') {
      const { accountId, userId } = args;
      if (!sb) return res.json({ success: false, error: 'Service indisponible – veuillez réessayer plus tard.' });
      const { error } = await sb.from('trading_accounts')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', accountId).eq('user_id', userId);
      if (error) return res.json({ success: false, error: error.message });
      return res.json({ success: true });
    }

    if (action === 'getAccountStats') {
      const { accountId } = args;
      if (!sb) return res.json({ success: false, error: 'Service indisponible – veuillez réessayer plus tard.' });
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
      if (!sb) return res.json({ success: false, error: 'Service indisponible – veuillez réessayer plus tard.' });
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
      if (!sb) return res.json({ success: false, error: 'Service indisponible – veuillez réessayer plus tard.' });
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
        // Enhanced email logic based on user's current status
        try {
          const { data: pReq } = await sb.from('payment_requests').select('user_id,status').eq('id', paymentId).maybeSingle();
          if (pReq?.user_id) {
            const { data: prof } = await sb.from('profiles').select('email,username,subscription_status,premium_expires_at,status').eq('id', pReq.user_id).maybeSingle();
            if (prof?.email) {
              const expiryDate = new Date();
              expiryDate.setDate(expiryDate.getDate() + 30); // 30 days from now
              const expDateFormatted = expiryDate.toLocaleDateString('fr-FR');

              // Determine email type based on user's current status
              let emailSubject, emailHtmlContent;

              if (prof.subscription_status === 'pending' || prof.status === 'pending') {
                // First-time approval
                emailSubject = '🎉 TradeVault PRO — Accès activé !';
                const expiryDate = new Date();
                // Get subscription duration from settings (default to 3 months)
                const { data: settings } = await sb.from('admin_settings')
                  .select('subscription_duration_months')
                  .eq('id', 1)
                  .single();
                const durationMonths = (settings && settings.subscription_duration_months) || 3;
                expiryDate.setMonth(expiryDate.getMonth() + durationMonths);
                const expDateFormatted = expiryDate.toLocaleDateString('fr-FR');
                emailHtmlContent = emailHtml(`<h2 style="color:#00FF9C;margin:0 0 16px;">Compte activé 🎉</h2><p style="color:#888;font-size:14px;">Bonjour <strong style="color:#fff;">${prof.username||prof.email.split('@')[0]}</strong>, votre compte a été validé par notre équipe.</p><p style="color:#888;font-size:14px;">Vous pouvez maintenant vous connecter et accéder à toutes les fonctionnalités de TradeVault PRO.</p><p style="color:#888;font-size:14px;">Date d'expiration : <strong style="color:#00FF9C;">${expDateFormatted}</strong></p><br/><a href="${APP_URL}" style="background:#00FF9C;color:#000;font-weight:800;padding:12px 24px;border-radius:12px;text-decoration:none;display:inline-block;">Se connecter maintenant</a>`);
              } else if (prof.subscription_status === 'expired') {
                // Unblocking after expiration
                emailSubject = '🔓 Accès rétabli — TradeVault PRO';
                const expiryDate = new Date();
                // Get subscription duration from settings (default to 3 months)
                const { data: settings } = await sb.from('admin_settings')
                  .select('subscription_duration_months')
                  .eq('id', 1)
                  .single();
                const durationMonths = (settings && settings.subscription_duration_months) || 3;
                expiryDate.setMonth(expiryDate.getMonth() + durationMonths);
                const expDateFormatted = expiryDate.toLocaleDateString('fr-FR');
                emailHtmlContent = emailHtml(`<h2 style="color:#10b981;margin:0 0 16px;">Accès rétabli 🔓</h2><p style="color:#888;font-size:14px;">Bonjour <strong style="color:#fff;">${prof.username||prof.email.split('@')[0]}</strong>,</p><p style="color:#888;font-size:14px;">Votre accès a été rétabli avec succès !</p><p style="color:#888;font-size:14px;">Nouvelle date d'expiration : <strong style="color:#00FF9C;">${expDateFormatted}</strong></p><br/><a href="${APP_URL}" style="background:#10b981;color:#000;font-weight:800;padding:12px 24px;border-radius:12px;text-decoration:none;display:inline-block;">Se connecter maintenant</a>`);
              } else {
                // Renewal (already active)
                emailSubject = '✅ Abonnement renouvelé — TradeVault PRO';
                // Get current expiry date to show extension
                const currentExpiry = prof.premium_expires_at ? new Date(prof.premium_expires_at) : new Date();
                // Get subscription duration from settings (default to 3 months)
                const { data: settings } = await sb.from('admin_settings')
                  .select('subscription_duration_months')
                  .eq('id', 1)
                  .single();
                const durationMonths = (settings && settings.subscription_duration_months) || 3;
                const newExpiry = new Date(currentExpiry.getTime() + (durationMonths * 30 * 24 * 60 * 60 * 1000)); // Add months (approx 30 days/month)
                const newExpDateFormatted = newExpiry.toLocaleDateString('fr-FR');
                emailHtmlContent = emailHtml(`<h2 style="color:#00FF9C;margin:0 0 16px;">Abonnement renouvelé ✅</h2><p style="color:#888;font-size:14px;">Bonjour <strong style="color:#fff;">${prof.username||prof.email.split('@')[0]}</strong>,</p><p style="color:#888;font-size:14px;">Votre abonnement a été renouvelé avec succès.</p><p style="color:#888;font-size:14px;">Nouvelle date d'expiration : <strong style="color:#00FF9C;">${newExpDateFormatted}</strong></p><p style="color:#888;font-size:14px;">Votre accès continue sans interruption.</p><br/><a href="${APP_URL}" style="background:#00FF9C;color:#000;font-weight:800;padding:12px 24px;border-radius:12px;text-decoration:none;display:inline-block;">Accéder à TradeVault</a>`);
              }

              await sendEmail(prof.email, emailSubject, emailHtmlContent);
            }
          }
        } catch(emailErr) { console.warn('[EMAIL] approve:', emailErr.message); }
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
