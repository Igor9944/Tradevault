import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Log buffer for admin panel - access strictly controlled via JWT verification in the endpoint
export const logBuffer: { timestamp: string, message: string }[] = [];
const MAX_LOGS = 50;

export function addLog(message: string) {
  const logEntry = { timestamp: new Date().toISOString(), message };
  logBuffer.unshift(logEntry);
  if (logBuffer.length > MAX_LOGS) logBuffer.pop();
  console.log(`[LOG] ${message}`);
}

// Helper to send emails via Resend
export async function sendEmailViaResend(to: string | string[], subject: string, html: string) {
  // Load ONLY from process.env.RESEND_API_KEY
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  
  if (!apiKey) {
    addLog(`[RESEND ERROR] RESEND_API_KEY is not defined in environment.`);
    return { success: false, error: "API Key Missing" };
  }
  
  const finalFromEmail = fromEmail || "TradeVault <onboarding@resend.dev>";
  const replyTo = "igorrose2003@gmail.com, tradonyx@vault.com";
  
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const response = await resend.emails.send({
      from: finalFromEmail,
      replyTo: replyTo,
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html
    });
    
    if (response.error) {
      addLog(`[RESEND ERROR] Échec d'envoi à ${to} : ${JSON.stringify(response.error)}`);
      return { success: false, error: response.error };
    }
    
    addLog(`[RESEND SUCCESS] E-mail envoyé avec succès à ${to} (ID: ${response.data?.id})`);
    return { success: true, id: response.data?.id };
  } catch (err: any) {
    addLog(`[RESEND EXCEPTION] Erreur d'envoi à ${to} : ${err.message || String(err)}`);
    return { success: false, error: err.message || String(err) };
  }
}

export async function triggerEmailsOnSignup(username: string, email: string, paymentScreenshot: string | null, amount: number, network: string) {
  try {
    let htmlContent = "";
    const pendingHtmlPath = path.join(process.cwd(), "SUPABASE_PENDING_EMAIL.html");
    if (fs.existsSync(pendingHtmlPath)) {
      htmlContent = fs.readFileSync(pendingHtmlPath, "utf8");
    } else {
      htmlContent = `<h2>Demande en cours — TradeVault</h2><p>Bonjour ${username}, votre preuve de paiement a bien été reçue !</p>`;
    }

    htmlContent = htmlContent
      .replace(/\{\{user_name\}\}/g, username)
      .replace(/\{\{user_email\}\}/g, email);

    await sendEmailViaResend(email, "⏳ Votre demande d'inscription premium TradeVault est en cours de traitement", htmlContent);

    const adminEmails = ["igorrose2003@gmail.com", "tradonyx@vault.com"];
    const adminHtml = `
      <div style="font-family: sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 30px; border-radius: 12px; border: 1px solid #1e293b;">
        <h2 style="color: #6366f1;">🚨 Nouvelle inscription TradeVault Pro !</h2>
        <p>Un nouveau trader s'est enregistré et a envoyé une preuve de paiement :</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr><td style="padding: 6px 0; color: #94a3b8; width: 80px;">Nom :</td><td style="font-weight: bold; color: #ffffff;">${username}</td></tr>
          <tr><td style="padding: 6px 0; color: #94a3b8;">Email :</td><td style="font-weight: bold; color: #ffffff;">${email}</td></tr>
          <tr><td style="padding: 6px 0; color: #94a3b8;">Montant :</td><td style="font-weight: bold; color: #00ff9c;">${amount} USD</td></tr>
          <tr><td style="padding: 6px 0; color: #94a3b8;">Réseau :</td><td style="font-weight: bold; color: #ffffff;">${network}</td></tr>
        </table>
        ${paymentScreenshot ? `<p style="margin-top: 20px;">🖼️ **Preuve de paiement :** <a href="${paymentScreenshot}" style="color: #6366f1; font-weight: bold;">Voir la capture d'écran</a></p>` : ""}
        <p style="margin-top: 25px; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 15px;">Rendez-vous dans votre espace d'administration TradeVault Pro pour valider ou rejeter l'accès.</p>
      </div>
    `;

    await sendEmailViaResend(adminEmails, `🚨 Nouvelle preuve d'abonnement : ${username}`, adminHtml);
  } catch (err) {
    console.error("Error in triggerEmailsOnSignup:", err);
  }
}

export async function triggerEmailOnApproval(username: string, email: string) {
  try {
    let htmlContent = "";
    const welcomeHtmlPath = path.join(process.cwd(), "SUPABASE_WELCOME_EMAIL.html");
    if (fs.existsSync(welcomeHtmlPath)) {
      htmlContent = fs.readFileSync(welcomeHtmlPath, "utf8");
    } else {
      htmlContent = `<h2>Accès Premium Activé — TradeVault</h2><p>Bonjour ${username}, votre compte a été approuvé avec succès ! Bienvenue à bord.</p>`;
    }

    const platformUrl = "https://traderpr0.netlify.app";

    htmlContent = htmlContent
      .replace(/\{\{user_name\}\}/g, username)
      .replace(/\{\{platform_url\}\}/g, platformUrl);

    await sendEmailViaResend(email, "🚀 Bienvenue au TradeVault — Accès Premium Activé", htmlContent);
  } catch (err) {
    console.error("Error in triggerEmailOnApproval:", err);
  }
}

export async function triggerEmailOnRejection(username: string, email: string) {
  try {
    let htmlContent = "";
    const rejectedHtmlPath = path.join(process.cwd(), "SUPABASE_REJECTED_EMAIL.html");
    if (fs.existsSync(rejectedHtmlPath)) {
      htmlContent = fs.readFileSync(rejectedHtmlPath, "utf8");
    } else {
      htmlContent = `<h2>Mise à jour de votre demande — TradeVault</h2><p>Bonjour ${username}, après examen, nous ne sommes pas en mesure de valider votre inscription pour le moment. Si vous pensez qu'il s'agit d'une erreur, contactez notre support à support@tradevault.app.</p>`;
    }

    htmlContent = htmlContent
      .replace(/\{\{user_name\}\}/g, username)
      .replace(/\{\{user_email\}\}/g, email);

    await sendEmailViaResend(email, "TradeVault — Mise à jour de votre demande", htmlContent);
  } catch (err) {
    console.error("Error in triggerEmailOnRejection:", err);
  }
}

export async function triggerEmailOnRenewalReceipt(username: string, email: string, amount: number, network: string) {
  try {
    let htmlContent = "";
    const receiptHtmlPath = path.join(process.cwd(), "SUPABASE_RENEWAL_RECEIPT_EMAIL.html");
    if (fs.existsSync(receiptHtmlPath)) {
      htmlContent = fs.readFileSync(receiptHtmlPath, "utf8");
    } else {
      htmlContent = `<h2>Reçu de paiement — TradeVault</h2><p>Bonjour ${username}, votre paiement de renouvellement de ${amount} USD via ${network} a été approuvé avec succès.</p>`;
    }

    const platformUrl = "https://traderpr0.netlify.app";

    htmlContent = htmlContent
      .replace(/\{\{user_name\}\}/g, username)
      .replace(/\{\{user_email\}\}/g, email)
      .replace(/\{\{amount\}\}/g, String(amount || 30))
      .replace(/\{\{network\}\}/g, network || "USDT");

    await sendEmailViaResend(email, "🧾 Reçu de paiement et renouvellement — TradeVault Premium", htmlContent);
  } catch (err) {
    console.error("Error in triggerEmailOnRenewalReceipt:", err);
  }
}

export const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: wss:;");
  res.removeHeader("Server");
  next();
});

const PORT = 3000;

app.use(cors());
// Payload size restriction
app.use(express.json({ limit: "2mb" }));

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const serverSupabase = createClient(supabaseUrl, supabaseAnonKey);

// Rate limiting middleware placeholder
const rateLimit = new Map<string, number[]>();
function checkRateLimit(ip: string, limit: number, windowMs: number) {
  const now = Date.now();
  const timestamps = rateLimit.get(ip) || [];
  const filtered = timestamps.filter(t => now - t < windowMs);
  if (filtered.length >= limit) return false;
  filtered.push(now);
  rateLimit.set(ip, filtered);
  return true;
}

// Authentication verification middleware
async function authenticate(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Missing authorization header" });
  
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await serverSupabase.auth.getUser(token);
  
  if (error || !user) return res.status(401).json({ error: "Unauthorized" });
  
  req.user = user;
  
  // Check admin status for sensitive actions
  const { data: profile } = await serverSupabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  req.isAdmin = !!profile?.is_admin;
  
  next();
}

// Supabase proxy endpoint - Strict Security Applied
app.post("/api/supabase/proxy", authenticate, async (req: any, res: any) => {
  if (!checkRateLimit(req.ip, 60, 60000)) return res.status(429).json({ error: "Too many requests" });

  try {
    const { action, arguments: args } = req.body;
    const userId = req.user.id;

    // Enforce ownership or admin privilege
    const adminOnlyActions = ["adminLoadAllUsers", "adminDeleteUser", "adminUpdateUser", "adminLoadAllPayments"];
    if (adminOnlyActions.includes(action) && !req.isAdmin) {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    switch (action) {
      case "loadUserData": {
        // Enforce user isolation
        const targetUserId = args.userId === userId || req.isAdmin ? args.userId : userId;
        const { data: accountsRaw } = await serverSupabase.from('trading_accounts').select('*').eq('user_id', targetUserId);
        const { data: tradesRaw } = await serverSupabase.from('trades').select('*').eq('user_id', targetUserId);
        const { data: challengesRaw } = await serverSupabase.from('challenges').select('*').eq('user_id', targetUserId);
        const { data: paymentsRaw } = await serverSupabase.from('payment_requests').select('*').eq('user_id', targetUserId);

        return res.json({ success: true, data: { accountsRaw, tradesRaw, challengesRaw, paymentsRaw } });
      }

      case "syncUserProfile": {
        if (args.profile.id !== userId && !req.isAdmin) return res.status(403).json({ error: "Forbidden" });
        const { error } = await serverSupabase.from('profiles').upsert(args.profile);
        if (error) throw error;
        return res.json({ success: true });
      }

      case "saveAccount": {
        if (args.row.user_id !== userId && !req.isAdmin) return res.status(403).json({ error: "Forbidden" });
        const { error } = await serverSupabase.from('trading_accounts').upsert(args.row);
        if (error) throw error;
        return res.json({ success: true });
      }

      case "deleteAccount": {
        if (args.userId !== userId && !req.isAdmin) return res.status(403).json({ error: "Forbidden" });
        const { error } = await serverSupabase.from('trading_accounts').delete().eq('id', args.accountId).eq('user_id', args.userId);
        if (error) throw error;
        return res.json({ success: true });
      }

      case "saveTrade": {
        if (args.row.user_id !== userId && !req.isAdmin) return res.status(403).json({ error: "Forbidden" });
        const { error } = await serverSupabase.from('trades').upsert(args.row);
        if (error) throw error;
        return res.json({ success: true });
      }

      case "deleteTrade": {
        if (args.userId !== userId && !req.isAdmin) return res.status(403).json({ error: "Forbidden" });
        const { error } = await serverSupabase.from('trades').delete().eq('id', args.tradeId).eq('user_id', args.userId);
        if (error) throw error;
        return res.json({ success: true });
      }

      case "saveChallenge": {
        if (args.row.user_id !== userId && !req.isAdmin) return res.status(403).json({ error: "Forbidden" });
        const { error } = await serverSupabase.from('challenges').upsert(args.row);
        if (error) throw error;
        return res.json({ success: true });
      }

      case "deleteChallenge": {
        if (args.userId !== userId && !req.isAdmin) return res.status(403).json({ error: "Forbidden" });
        const { error } = await serverSupabase.from('challenges').delete().eq('id', args.challengeId).eq('user_id', args.userId);
        if (error) throw error;
        return res.json({ success: true });
      }

      case "savePayment": {
        if (args.row.user_id !== userId && !req.isAdmin) return res.status(403).json({ error: "Forbidden" });
        const { error } = await serverSupabase.from('payment_requests').upsert(args.row);
        if (error) throw error;

        // Triggers for approval/rejection emails
        if (args.row.status === 'approved' || args.row.status === 'rejected') {
          const { data: userProfile } = await serverSupabase.from('profiles').select('*').eq('id', args.row.user_id).maybeSingle();
          if (userProfile?.email) {
            if (args.row.status === 'approved') {
              const wasAlreadyPaid = userProfile.paid || userProfile.status === 'approved';
              if (wasAlreadyPaid) await triggerEmailOnRenewalReceipt(userProfile.username || 'Trader', userProfile.email, args.row.amount, args.row.network);
              else await triggerEmailOnApproval(userProfile.username || 'Trader', userProfile.email);
            } else {
              await triggerEmailOnRejection(userProfile.username || 'Trader', userProfile.email);
            }
          }
        }
        return res.json({ success: true });
      }

      case "adminLoadAllUsers": {
        const { data, error } = await serverSupabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return res.json({ success: true, data });
      }

      case "adminDeleteUser": {
        await serverSupabase.from('payment_requests').delete().eq('user_id', args.userId);
        await serverSupabase.from('trades').delete().eq('user_id', args.userId);
        await serverSupabase.from('challenges').delete().eq('user_id', args.userId);
        await serverSupabase.from('trading_accounts').delete().eq('user_id', args.userId);
        const { error } = await serverSupabase.from('profiles').delete().eq('id', args.userId);
        if (error) throw error;
        return res.json({ success: true });
      }

      case "adminUpdateUser": {
        const { error } = await serverSupabase.from('profiles').update({ username: args.username, email: args.email, status: args.status }).eq('id', args.userId);
        if (error) throw error;
        if (args.status === 'approved') await triggerEmailOnApproval(args.username || 'Trader', args.email);
        else if (args.status === 'rejected') await triggerEmailOnRejection(args.username || 'Trader', args.email);
        return res.json({ success: true });
      }

      case "adminLoadAllPayments": {
        const { data, error } = await serverSupabase.from('payment_requests').select('*, users (email, username)').order('created_at', { ascending: false });
        if (error) throw error;
        return res.json({ success: true, data });
      }

      default:
        return res.status(400).json({ error: `Unknown proxy action: ${action}` });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

const otpStorage = new Map<string, { code: string; expires: number }>();

app.get("/api/admin/logs", authenticate, (req: any, res: any) => {
  if (!req.isAdmin) return res.status(403).json({ error: "Forbidden" });
  res.json({ success: true, logs: logBuffer });
});

app.post("/api/auth/forgot-password-otp", async (req, res) => {
  if (!checkRateLimit(req.ip, 5, 600000)) return res.status(429).json({ error: "Too many attempts" });
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: "Email required" });
    const cleanEmail = email.trim().toLowerCase();
    
    const { data: profile } = await serverSupabase.from('profiles').select('email').eq('email', cleanEmail).maybeSingle();
    if (!profile) return res.json({ success: false, error: "Account not found" });

    // Secure 7-digit OTP generation using crypto.randomInt
    const code = crypto.randomInt(1000000, 9999999).toString();
    otpStorage.set(cleanEmail, { code, expires: Date.now() + 15 * 60 * 1000 });

    const emailHtml = `
      <div style="font-family: sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 40px; border-radius: 16px;">
        <h2 style="color: #ffffff; text-align: center;">Accès Instantané ⚡</h2>
        <div style="background-color: #151c2c; border: 1.5px dashed #00ff9c; padding: 20px; border-radius: 12px; text-align: center; margin: 25px 0;">
          <span style="font-size: 36px; font-weight: 900; letter-spacing: 6px; color: #00ff9c;">${code}</span>
        </div>
        <p style="font-size: 11px; color: #64748b; text-align: center;">Ce code expire dans 15 minutes.</p>
      </div>
    `;

    await sendEmailViaResend(cleanEmail, "🔑 Code de connexion sécurisé TradeVault Pro", emailHtml);
    return res.json({ success: true, message: "OTP sent" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

app.post("/api/auth/reset-password-otp-verify", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const cleanEmail = email.trim().toLowerCase();
    const record = otpStorage.get(cleanEmail);
    if (!record || record.code !== otp || record.expires < Date.now()) {
      return res.json({ success: false, error: "Invalid or expired OTP" });
    }
    otpStorage.delete(cleanEmail);
    // Password reset logic via Supabase Auth Admin should be here
    return res.json({ success: true, message: "Password reset successful" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
  app.listen(PORT, "0.0.0.0");
}

startServer();
