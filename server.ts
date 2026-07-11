import 'dotenv/config';
import express from "express";
import cors from "cors";
import path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// ─── App ──────────────────────────────────────────────────────────────────────
export const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL        = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY   = process.env.VITE_SUPABASE_ANON_KEY || "";
const SERVICE_ROLE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const PORT                = parseInt(process.env.PORT || "3000", 10); // Bound to PORT 3000

// Log buffer for admin panel
export const logBuffer: { timestamp: string, message: string }[] = [];
const MAX_LOGS = 50;

export function addLog(message: string) {
  const logEntry = { timestamp: new Date().toISOString(), message };
  logBuffer.unshift(logEntry);
  if (logBuffer.length > MAX_LOGS) logBuffer.pop();
  console.log(`[LOG] ${message}`);
}

// ─── Rate Limiting (in-memory, resets on cold start) ─────────────────────────
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(identifier: string, action: string, max: number, windowMs: number) {
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

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  signIn:   { max: 5,  windowMs: 15 * 60 * 1000 },
  signUp:   { max: 3,  windowMs: 60 * 60 * 1000 },
  default:  { max: 60, windowMs: 60 * 1000 },
};

// ─── Logging interne & audit ──────────────────────────────────────────────────
async function logAudit(sb: SupabaseClient | null, userId: string, action: string, details: any = {}) {
  addLog(`[AUDIT] Action: ${action} | User: ${userId} | Details: ${JSON.stringify(details)}`);
  if (!sb || !userId) return;
  try {
    await sb.from('audit_logs').insert({
      user_id: userId,
      action,
      details: JSON.stringify(details),
      created_at: new Date().toISOString()
    });
  } catch (_) {}
}

// ─── Supabase Service Client ──────────────────────────────────────────────────
let serverSupabase: SupabaseClient | null = null;
let dbOnline = false;
let dbReachabilityPromise: Promise<void> | null = null;

async function initSupabase() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.warn("[SERVER] ⚠️  Vars Supabase manquantes — mode dégradé");
    return;
  }
  serverSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  dbReachabilityPromise = (async () => {
    try {
      const { error } = await serverSupabase!.from("profiles").select("id").limit(1);
      dbOnline = !error;
      console.info(dbOnline
        ? "[SERVER] ✅ Supabase connecté"
        : `[SERVER] ⚠️  Supabase injoignable: ${error?.message}`
      );
    } catch { dbOnline = false; }
  })();
  await dbReachabilityPromise;
}

// Emergency users removed for security

// In-memory fallback removed for security

// ─── Dynamic Robust Email Sender ──────────────────────────────────────────────
export async function sendEmail(to: string, subject: string, html: string) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "TradeVault <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      });
      addLog(`[EMAIL] Envoyé via Resend à ${to}`);
      return;
    } catch (e: any) {
      console.warn("[EMAIL] Échec d'envoi via Resend, tentative fallback...", e.message);
    }
  }


  addLog(`[EMAIL SIMULATION] Destinataire: ${to} | Sujet: "${subject}"`);
}

async function triggerEmailsOnSignup(
  username: string, email: string,
  screenshot: string, amount: number, network: string
) {
  const adminHtml = `<h2>Nouveau compte en attente</h2>
                     <p><b>Email :</b> ${email}</p>
                     <p><b>Montant :</b> ${amount} USDT (${network})</p>
                     <p><b>Preuve :</b> <a href="${screenshot}">Voir screenshot</a></p>`;

  const userHtml = `<h2>Bonjour ${username},</h2>
                    <p>Ton inscription a bien été reçue. Ton compte sera activé après validation de ton paiement (sous 24h).</p>
                    <p>— Équipe TradeVault</p>`;

  const NOTIF_EMAIL = process.env.ADMIN_NOTIF_EMAIL || "tradonyx@vault.com";
  await sendEmail(NOTIF_EMAIL, `[TradeVault] Nouvelle inscription — ${username}`, adminHtml);
  await sendEmail(email, "TradeVault — Inscription reçue ✅", userHtml);
}

// ─── Principal Proxy ──────────────────────────────────────────────────────────
app.post("/api/supabase/proxy", async (req: express.Request, res: express.Response) => {
  try {
    const { action, arguments: args = {} } = req.body;

    // Identifier pour rate limiting
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    const limitCfg = RATE_LIMITS[action] || RATE_LIMITS.default;
    const rl = checkRateLimit(ip, action, limitCfg.max, limitCfg.windowMs);

    if (!rl.allowed) {
      res.setHeader('Retry-After', rl.retryAfter || 60);
      return res.status(429).json({
        success: false,
        error: `Trop de tentatives. Réessaie dans ${rl.retryAfter || 60}s.`
      });
    }

    if (dbReachabilityPromise) await dbReachabilityPromise;

    // Mode dégradé complet
    if (!serverSupabase || !dbOnline) {
      return res.status(503).json({ success: false, error: "Service indisponible – veuillez réessayer plus tard." });
    }

    // ── Vérification admin pour actions sensibles ────────────────────────────
    const ADMIN_ONLY = new Set([
      "updateUserRole", "adminLoadAllUsers", "adminDeleteUser",
      "adminUpdateUser", "adminLoadAllPayments", "savePayment",
      "adminGetStats", "adminUpdateSettings", "adminCreateAnnouncement",
    ]);

    let adminUserId: string | null = null;
    if (ADMIN_ONLY.has(action)) {
      const token = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7) : null;

      if (!token) return res.status(401).json({ success: false, error: "Authentification requise." });

      const { data: caller, error: callerErr } = await serverSupabase.auth.getUser(token);
      if (callerErr || !caller?.user)
        return res.status(401).json({ success: false, error: "Session invalide." });

      const { data: prof } = await serverSupabase
        .from("profiles").select("role").eq("id", caller.user.id).maybeSingle();
      if (prof?.role !== "admin")
        return res.status(403).json({ success: false, error: "Accès admin requis." });

      adminUserId = caller.user.id;
    }

    // ── Switch actions ───────────────────────────────────────────────────────
    switch (action) {

      // ── signIn ─────────────────────────────────────────────────────────────
      case "signIn": {
        const { email, password } = args;
        let authData: any = null;
        let authError: any = null;

        try {
          const r = await serverSupabase.auth.signInWithPassword({ email, password });
          authData = r.data;
          authError = r.error;
        } catch (e) { authError = e; }

        if (authError) {
          const msg = authError.message || String(authError);
          // Mauvais credentials → retourner l'erreur directement
          if (msg.toLowerCase().includes("invalid login credentials")) {
            return res.json({ success: false, error: "Identifiants invalides." });
          }
          // Supabase indisponible → retour d'erreur
          return res.json({ success: false, error: "Service d’authentification temporairement indisponible. Veuillez réessayer plus tard." });
        }

        const userId = authData.user?.id;
        if (!userId) return res.json({ success: false, error: "ID utilisateur non récupéré." });

        const { data: profile } = await serverSupabase
          .from("profiles").select("*").eq("id", userId).maybeSingle();

        return res.json({
          success: true,
          source: "supabase",
          user: {
            id: userId,
            email: authData.user.email || email,
            username: profile?.username || profile?.full_name || email.split("@")[0],
            role: profile?.role || "user",
            status: profile?.status || "pending",
            subscription_status: profile?.subscription_status || "pending",
            plan: profile?.plan || "free",
            premium_expires_at: profile?.premium_expires_at || null,
            paid: profile?.subscription_status === "premium_active",
            paidUntil: profile?.premium_expires_at || null,
            avatar: profile?.avatar_url || undefined,
            country: profile?.country || "TG",
            createdAt: profile?.created_at || new Date().toISOString(),
          }
        });
      }

      // ── signUp ─────────────────────────────────────────────────────────────
      case "signUp": {
        const { email, password, username, country, paymentScreenshot, selectedNetwork, subscriptionPrice, regAvatar } = args;

        const { data: authData, error: authError } = await serverSupabase.auth.signUp({ email, password });
        if (authError) {
          // Supabase indisponible → retour d'erreur
          return res.json({ success: false, error: "Service d’inscription temporairement indisponible. Veuillez réessayer plus tard." });
        }

        const userId = authData.user?.id;
        if (!userId) return res.json({ success: false, error: "Erreur ID auth." });

        await serverSupabase.from("profiles").upsert({
          id: userId, email,
          full_name: username?.trim(),
          username: username?.trim(),
          country: country || "TG",
          avatar_url: regAvatar || null,
          status: "pending",
          role: "user",
          subscription_status: "pending",
          plan: "free",
          premium_expires_at: null,
          payment_proof: paymentScreenshot,
          created_at: new Date().toISOString(),
        });

        await serverSupabase.from("payment_requests").insert({
          id: randomUUID(),
          user_id: userId,
          amount: subscriptionPrice || 30,
          screenshot_url: paymentScreenshot,
          network: selectedNetwork || "TRC20",
          status: "pending",
          type: "registration",
          created_at: new Date().toISOString(),
        });

        await triggerEmailsOnSignup(username?.trim(), email, paymentScreenshot, subscriptionPrice || 30, selectedNetwork || "TRC20");

        return res.json({
          success: true,
          user: {
            id: userId, email, username: username?.trim(), country,
            paid: false, paidUntil: null, status: "pending",
            avatar: regAvatar || undefined, createdAt: new Date().toISOString(),
          }
        });
      }

      // ── adminLoadAllUsers ──────────────────────────────────────────────────
      case "adminLoadAllUsers": {
        const { data, error } = await serverSupabase
          .from("profiles")
          .select("id,email,username,role,status,subscription_status,plan,premium_expires_at,created_at,country,payment_proof,avatar_url")
          .order("created_at", { ascending: false });
        if (error) return res.json({ success: false, error: error.message });
        return res.json({ success: true, users: data });
      }

      // ── adminLoadAllPayments ───────────────────────────────────────────────
      case "adminLoadAllPayments": {
        const { data, error } = await serverSupabase
          .from("payment_requests")
          .select("*, profiles(email,username)")
          .order("created_at", { ascending: false });
        if (error) return res.json({ success: false, error: error.message });
        return res.json({ success: true, payments: data });
      }

      // ── updateUserRole / adminUpdateUser ───────────────────────────────────
      case "updateUserRole":
      case "adminUpdateUser": {
        const { userId, updates, role, status, subscription_status, plan, premium_expires_at } = args;
        const payload = updates || { role, status, subscription_status, plan, premium_expires_at };
        const { error } = await serverSupabase
          .from("profiles")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", userId);
        if (error) return res.json({ success: false, error: error.message });
        return res.json({ success: true });
      }

      // ── adminDeleteUser ────────────────────────────────────────────────────
      case "adminDeleteUser": {
        const { userId } = args;
        await serverSupabase.from("profiles").delete().eq("id", userId);
        await serverSupabase.auth.admin.deleteUser(userId);
        return res.json({ success: true });
      }

      // ── savePayment ────────────────────────────────────────────────────────
      case "savePayment": {
        const { paymentId, status } = args;
        const { error } = await serverSupabase
          .from("payment_requests")
          .update({ status, updated_at: new Date().toISOString() })
          .eq("id", paymentId);

        // Si approuvé → activer subscription
        if (status === "approved" && !error) {
          const { data: pr } = await serverSupabase
            .from("payment_requests").select("user_id").eq("id", paymentId).maybeSingle();
          if (pr?.user_id) {
            await serverSupabase.from("profiles").update({
              subscription_status: "premium_active",
              status: "approved",
              plan: "pro",
              premium_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            }).eq("id", pr.user_id);
          }
        }
        if (error) return res.json({ success: false, error: error.message });
        return res.json({ success: true });
      }

      // ── adminGetStats ──────────────────────────────────────────────────────
      case "adminGetStats": {
        const [users, payments, trades, accounts] = await Promise.all([
          serverSupabase.from("profiles").select("id,subscription_status,created_at"),
          serverSupabase.from("payment_requests").select("id,status,amount,created_at"),
          serverSupabase.from("trades").select("id,created_at"),
          serverSupabase.from("trading_accounts").select("id,type").eq("is_active", true),
        ]);
        const now = new Date();
        const thisMonth = users.data?.filter(x => new Date(x.created_at).getMonth() === now.getMonth()).length || 0;
        return res.json({
          success: true,
          stats: {
            totalUsers: users.data?.length || 0,
            activeUsers: users.data?.filter(u => u.subscription_status === "premium_active").length || 0,
            newThisMonth: thisMonth,
            pendingPayments: payments.data?.filter(p => p.status === "pending").length || 0,
            totalRevenue: payments.data?.filter(p => p.status === "approved")
              .reduce((s, p) => s + Number(p.amount), 0) || 0,
            totalTrades: trades.data?.length || 0,
            totalAccounts: accounts.data?.length || 0,
            propFirmAccounts: accounts.data?.filter(x => x.type === 'prop_firm').length || 0,
          },
        });
      }

      // ── loadUserData ───────────────────────────────────────────────────────
      case "loadUserData": {
        const { userId } = args;
        const [profile, accounts, trades, challenges, payments, settings] = await Promise.all([
          serverSupabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
          serverSupabase.from('trading_accounts').select('*').eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: true }),
          serverSupabase.from('trades').select('*').eq('user_id', userId).order('trade_date', { ascending: false }).limit(500),
          serverSupabase.from('challenges').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          serverSupabase.from('payment_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          serverSupabase.from('public_config').select('*').single(),
        ]);
        return res.json({
          success: true,
          profile: profile.data,
          accounts: (accounts.data || []).map((a: any) => ({ ...a, account_type: a.type })),
          trades: trades.data || [],
          challenges: challenges.data || [],
          payments: payments.data || [],
          settings: settings.data || {},
        });
      }

      // ── loadUserAccounts ───────────────────────────────────────────────────
      case "loadUserAccounts": {
        const { userId } = args;
        const { data, error } = await serverSupabase
          .from('trading_accounts').select('*')
          .eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: true });
        if (error) return res.json({ success: false, error: error.message });
        return res.json({ success: true, accounts: (data || []).map((a: any) => ({ ...a, account_type: a.type })) });
      }

      // ── saveAccount ────────────────────────────────────────────────────────
      case "saveAccount": {
        const { account, userId } = args;
        const { account_type, account_type_app, ...payload } = account;
        const { error } = await serverSupabase.from('trading_accounts').upsert(
          { ...payload, user_id: userId, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        );
        if (error) return res.json({ success: false, error: error.message });
        return res.json({ success: true });
      }

      // ── deleteAccount ──────────────────────────────────────────────────────
      case "deleteAccount": {
        const { accountId, userId } = args;
        const { error } = await serverSupabase.from('trading_accounts')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', accountId).eq('user_id', userId);
        if (error) return res.json({ success: false, error: error.message });
        return res.json({ success: true });
      }

      // ── getAccountStats ────────────────────────────────────────────────────
      case "getAccountStats": {
        const { accountId } = args;
        const { data, error } = await serverSupabase.rpc('get_account_stats', { p_account_id: accountId });
        if (error) return res.json({ success: false, error: error.message });
        return res.json({ success: true, stats: data });
      }

      // ── loadTrades ─────────────────────────────────────────────────────────
      case "loadTrades": {
        const { accountId, userId, page = 0, pageSize = 50 } = args;
        const from = page * pageSize;
        let q = serverSupabase.from('trades').select('*').eq('user_id', userId)
          .order('trade_date', { ascending: false }).order('created_at', { ascending: false })
          .range(from, from + pageSize - 1);
        if (accountId) q = q.eq('account_id', accountId);
        const { data, error } = await q;
        if (error) return res.json({ success: false, error: error.message });
        return res.json({ success: true, trades: data || [] });
      }

      // ── saveTrade ──────────────────────────────────────────────────────────
      case "saveTrade": {
        const { trade, userId } = args;
        const payload = {
          ...trade, user_id: userId,
          trade_date: trade.trade_date || trade.date || new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
          created_at: trade.created_at || new Date().toISOString(),
        };
        const { data, error } = await serverSupabase.from('trades').upsert(payload, { onConflict: 'id' }).select().single();
        if (error) return res.json({ success: false, error: error.message });
        return res.json({ success: true, trade: data });
      }

      // ── deleteTrade ────────────────────────────────────────────────────────
      case "deleteTrade": {
        const { tradeId, userId } = args;
        const { error } = await serverSupabase.from('trades').delete().eq('id', tradeId).eq('user_id', userId);
        if (error) return res.json({ success: false, error: error.message });
        return res.json({ success: true });
      }

      // ── loadNotifications ──────────────────────────────────────────────────
      case "loadNotifications": {
        const { userId } = args;
        const { data } = await serverSupabase.from('notifications').select('*')
          .eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
        return res.json({ success: true, notifications: data || [] });
      }

      // ── markNotificationsRead ──────────────────────────────────────────────
      case "markNotificationsRead": {
        const { userId, notifId } = args;
        const q = serverSupabase.from('notifications').update({ read_at: new Date().toISOString() });
        if (notifId) q.eq('id', notifId); else q.eq('user_id', userId).is('read_at', null);
        await q;
        return res.json({ success: true });
      }

      // ── adminUpdateSettings ────────────────────────────────────────────────
      case "adminUpdateSettings": {
        const { settings } = args;
        const allowed = ['subscription_price','usdt_trc20_address','usdt_bep20_address',
          'notification_emails','ftmo_profit_target','ftmo_daily_loss','ftmo_max_loss',
          'maintenance_mode','support_email'];
        const filtered = Object.fromEntries(Object.entries(settings).filter(([k]) => allowed.includes(k)));
        const { error } = await serverSupabase.from('admin_settings').update({ ...filtered, updated_at: new Date().toISOString() }).eq('id', 1);
        if (error) return res.json({ success: false, error: error.message });
        await logAudit(serverSupabase, adminUserId!, 'update_settings', filtered);
        return res.json({ success: true });
      }

      // ── adminCreateAnnouncement ────────────────────────────────────────────
      case "adminCreateAnnouncement": {
        const { title, content, type, target_role, pinned, expires_at } = args;
        const { data, error } = await serverSupabase.from('announcements').insert({
          title, content, type: type || 'info', target_role: target_role || 'all',
          pinned: pinned || false, expires_at, is_active: true,
          created_by: adminUserId, published_at: new Date().toISOString(), created_at: new Date().toISOString()
        }).select().single();
        if (error) return res.json({ success: false, error: error.message });
        return res.json({ success: true, announcement: data });
      }

      // ── health ─────────────────────────────────────────────────────────────
      case "health":
        return res.json({ success: true, dbOnline, version: "3.1.0", ts: new Date().toISOString() });

      default:
        return res.status(400).json({ success: false, error: `Action inconnue: ${action}` });
    }

  } catch (err: any) {
    console.error("[PROXY_ERROR]", err);
    res.status(500).json({ success: false, error: err.message || "Erreur interne." });
  }
});

// ─── Health REST ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, dbOnline, ts: new Date().toISOString() });
});

// ─── Additional Legacy Support Routes ─────────────────────────────────────────

// In-memory OTP storage for password resets
const otpStorage = new Map<string, { code: string; expires: number }>();

app.get("/api/admin/logs", (req, res) => {
  res.json({ success: true, logs: logBuffer });
});

app.post("/api/auth/forgot-password-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Adresse e-mail requise." });
    }
    const cleanEmail = email.trim().toLowerCase();

    let userExists = false;
    if (serverSupabase) {
      try {
        const { data } = await serverSupabase
          .from('profiles')
          .select('email')
          .eq('email', cleanEmail)
          .maybeSingle();
        if (data && data.email) {
          userExists = true;
        }
      } catch (err) {
        console.warn("[OTP_LOOKUP] Failed to query Supabase for recovery email:", err);
      }
    }

    if (!userExists) {
      return res.json({ success: false, error: "Cette adresse e-mail ne correspond à aucun compte enregistré." });
    }

    const code = Math.floor(1000000 + Math.random() * 9000000).toString();
    otpStorage.set(cleanEmail, { code, expires: Date.now() + 15 * 60 * 1000 });

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #1e293b; background-color: #0b0f19; color: #f1f5f9;">
        <h2 style="color: #ffffff; text-align: center;">Accès Instantané ⚡</h2>
        <p style="text-align: center; color: #94a3b8;">Saisissez le code OTP à usage unique ci-dessous pour modifier votre mot de passe :</p>
        <div style="background-color: #151c2c; border: 1.5px dashed #00ff9c; padding: 18px; border-radius: 12px; text-align: center; margin: 25px 0;">
          <span style="font-size: 36px; font-weight: 900; letter-spacing: 6px; color: #00ff9c;">${code}</span>
        </div>
      </div>
    `;

    addLog(`[OTP_RESET] Code OTP généré pour ${cleanEmail}`);
    await sendEmail(cleanEmail, "🔑 Code de connexion sécurisé TradeVault Pro", emailHtml);

    return res.json({
      success: true,
      message: "Un code OTP a été envoyé à votre adresse e-mail avec succès."
    });
  } catch (err: any) {
    console.error("Forgot password OTP endpoint error:", err);
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

app.post("/api/auth/reset-password-otp-verify", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, error: "Tous les champs sont requis." });
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    const record = otpStorage.get(cleanEmail);
    if (!record) {
      return res.json({ success: false, error: "Aucun code demandé pour cette adresse e-mail." });
    }
    if (record.code !== cleanOtp) {
      return res.json({ success: false, error: "Code OTP invalide." });
    }
    if (record.expires < Date.now()) {
      otpStorage.delete(cleanEmail);
      return res.json({ success: false, error: "Le code OTP a expiré." });
    }

    otpStorage.delete(cleanEmail);

    // Si Supabase est actif, tenter de modifier le password en DB
    if (serverSupabase) {
      try {
        await serverSupabase.auth.updateUser({
          password: newPassword
        });
      } catch (err) {
        console.error("Error updating password via Supabase auth:", err);
        return res.status(500).json({ success: false, error: "Erreur lors de la mise à jour du mot de passe." });
      }
    }

    return res.json({ success: true, message: "Mot de passe réinitialisé avec succès." });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/notify/signup", async (req, res) => {
  res.json({ success: true });
});

app.post("/api/notify/approve", async (req, res) => {
  try {
    const { email, username } = req.body;
    const html = `<h2>Félicitations ${username}!</h2><p>Ton compte TradeVault a été activé !</p>`;
    await sendEmail(email, "Félicitations ! Votre accès TradeVault Pro est activé 🚀", html);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/notify/renewal-request", async (req, res) => {
  res.json({ success: true });
});

app.post("/api/notify/renewal-approve", async (req, res) => {
  res.json({ success: true });
});

app.post("/api/webhooks/supabase", async (req, res) => {
  res.json({ success: true });
});

app.post("/api/cron/check-renewals", async (req, res) => {
  res.json({ success: true });
});

// ─── Static (production) ──────────────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  app.use(express.static(__dirname));
  app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "index.html")));
}

// ─── Start ────────────────────────────────────────────────────────────────────
initSupabase().then(() => {
  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => console.info(`[SERVER] 🚀 :${PORT} | DB: ${dbOnline ? "✅" : "⚠️  offline"}`));
  }
});

export default app;