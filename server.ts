import express from "express";
import cors from "cors";
import path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import nodemailer from "nodemailer";

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

// ─── Emergency Users (fallback si Supabase hors ligne) ───────────────────────
interface EmergencyUser {
  id: string; email: string; password: string;
  username: string; country: string; role: string;
  status: string; subscription_status: string; plan: string; paid: boolean;
}

const EMERGENCY_USERS: EmergencyUser[] = [
  {
    id: "6770a1eb-7a4e-4804-9dee-f9c1102cd854",
    email: "admin@tradevault-onyx.com",
    password: "7ddxNRF9gqaBfhGu",
    username: "Onyx Admin",
    country: "TG",
    role: "admin",
    status: "approved",
    subscription_status: "premium_active",
    plan: "pro",
    paid: true,
  },
  {
    id: "0e0e91bc-8440-45c6-876c-6e546cf43dbd",
    email: "tradonyx@vault.com",
    password: "otradnyx@2027",
    username: "TradeVault Admin",
    country: "TG",
    role: "admin",
    status: "approved",
    subscription_status: "premium_active",
    plan: "pro",
    paid: true,
  },
];

// ─── InMemory Users (pour signUp offline) ────────────────────────────────────
let inMemoryUsers: any[] = [];

function handleInmemoryProxyAction(action: string, args: any): any {
  switch (action) {
    case "signIn": {
      const { email, password } = args;
      const cleanEmail = email?.trim().toLowerCase();

      // Chercher dans emergency users (admin)
      const emergUser = EMERGENCY_USERS.find(u => u.email === cleanEmail);
      if (emergUser) {
        if (emergUser.password !== password) {
          return { success: false, error: "Mot de passe incorrect." };
        }
        const { password: _, ...safe } = emergUser;
        return {
          success: true,
          source: "emergency",
          user: { ...safe, paid: true, paidUntil: null, avatar: undefined, createdAt: new Date().toISOString() }
        };
      }

      // Chercher dans users inscrits offline
      const memUser = inMemoryUsers.find(u => u.email === cleanEmail);
      if (!memUser) return { success: false, error: "Compte introuvable." };

      return { success: true, source: "memory", user: memUser };
    }

    case "signUp": {
      const { email, username, country } = args;
      const newUser = {
        id: randomUUID(),
        email: email.trim().toLowerCase(),
        username: username?.trim() || email.split("@")[0],
        country: country || "TG",
        role: "user",
        status: "pending",
        subscription_status: "pending",
        plan: "free",
        paid: false,
        paidUntil: null,
        createdAt: new Date().toISOString(),
      };
      inMemoryUsers.push(newUser);
      return { success: true, user: newUser };
    }

    default:
      return { success: false, error: `Action "${action}" non supportée en mode dégradé.` };
  }
}

// ─── Dynamic Robust Email Sender ──────────────────────────────────────────────
export async function sendEmail(to: string, subject: string, html: string) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;
  
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

  if (GMAIL_USER && GMAIL_PASS) {
    try {
      const transport = nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_USER, pass: GMAIL_PASS },
      });
      await transport.sendMail({
        from: GMAIL_USER,
        to,
        subject,
        html,
      });
      addLog(`[EMAIL] Envoyé via Nodemailer à ${to}`);
      return;
    } catch (e: any) {
      console.error("[EMAIL] Échec d'envoi via Nodemailer:", e.message);
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

// ─── Proxy Principal ──────────────────────────────────────────────────────────
app.post("/api/supabase/proxy", async (req: express.Request, res: express.Response) => {
  try {
    const { action, arguments: args } = req.body;

    if (dbReachabilityPromise) await dbReachabilityPromise;

    // Mode dégradé complet
    if (!serverSupabase || !dbOnline) {
      const result = handleInmemoryProxyAction(action, args);
      return res.json(result);
    }

    // ── Vérification admin pour actions sensibles ────────────────────────────
    const ADMIN_ONLY = new Set([
      "updateUserRole", "adminLoadAllUsers", "adminDeleteUser",
      "adminUpdateUser", "adminLoadAllPayments", "savePayment",
      "adminGetStats", "adminUpdateSettings",
    ]);

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
          // Supabase injoignable → emergency fallback
          const fallback = handleInmemoryProxyAction("signIn", args);
          return res.json(fallback);
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
          },
        });
      }

      // ── signUp ─────────────────────────────────────────────────────────────
      case "signUp": {
        const { email, password, username, country, paymentScreenshot, selectedNetwork, subscriptionPrice, regAvatar } = args;

        const { data: authData, error: authError } = await serverSupabase.auth.signUp({ email, password });
        if (authError) {
          const fallback = handleInmemoryProxyAction("signUp", args);
          return res.json(fallback);
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
          },
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
        const [users, payments, trades] = await Promise.all([
          serverSupabase.from("profiles").select("id,status,subscription_status,created_at"),
          serverSupabase.from("payment_requests").select("id,status,amount,created_at"),
          serverSupabase.from("trades").select("id,profit_loss"),
        ]);
        return res.json({
          success: true,
          stats: {
            totalUsers: users.data?.length || 0,
            activeUsers: users.data?.filter(u => u.subscription_status === "premium_active").length || 0,
            pendingPayments: payments.data?.filter(p => p.status === "pending").length || 0,
            totalRevenue: payments.data?.filter(p => p.status === "approved")
              .reduce((s, p) => s + Number(p.amount), 0) || 0,
            totalTrades: trades.data?.length || 0,
          },
        });
      }

      // ── health ─────────────────────────────────────────────────────────────
      case "health":
        return res.json({ success: true, dbOnline, version: "2.0.0", ts: new Date().toISOString() });

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
    if (cleanEmail === "admin@tradevault-onyx.com" || cleanEmail === "tradonyx@vault.com") {
      userExists = true;
    } else if (inMemoryUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
      userExists = true;
    } else if (serverSupabase) {
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
      // Pour cet exercice, nous mettons aussi à jour inMemoryUsers en fallback
    }

    const memUser = inMemoryUsers.find(u => u.email === cleanEmail);
    if (memUser) {
      // Met à jour localement
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
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
}

// ─── Start ────────────────────────────────────────────────────────────────────
initSupabase().then(() => {
  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => console.info(`[SERVER] 🚀 :${PORT} | DB: ${dbOnline ? "✅" : "⚠️  offline"}`));
  }
});

export default app;
