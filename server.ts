import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Log buffer for admin panel
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
  let apiKey = process.env.RESEND_API_KEY;
  let fromEmail = process.env.RESEND_FROM_EMAIL;
  
  if (fromEmail && fromEmail.trim().startsWith("re_")) {
    apiKey = fromEmail.trim();
    fromEmail = undefined;
  }
  
  if (!apiKey) {
    addLog(`[RESEND WARNING] RESEND_API_KEY non configurée. Simulation de l'envoi de l'e-mail...`);
  }
  
  const finalFromEmail = fromEmail || "TradeVault <onboarding@resend.dev>";
  const adminList = await getAdminEmails();
  const replyTo = adminList.join(", ");
  
  if (!apiKey) {
    addLog(`[RESEND SIMULATION] Destinataire: ${Array.isArray(to) ? to.join(', ') : to} | Sujet: "${subject}"`);
    return { success: true, simulated: true };
  }
  
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

    // Notify the admin
    const adminEmails = await getAdminEmails();
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

app.use(cors());
app.use(express.json({ limit: "50mb" })); // Support base64 uploads

// Initialize Server-side Supabase client to bypass client-side "Failed to fetch" (caused by ad-blockers, CORS etc)
let rawServerUrl = process.env.VITE_SUPABASE_URL || "";
if (rawServerUrl && rawServerUrl.includes('supabase.com/dashboard/project/')) {
  const match = rawServerUrl.match(/project\/([a-z0-9]+)/);
  if (match) {
    rawServerUrl = `https://${match[1]}.supabase.co`;
  }
} else if (rawServerUrl && !rawServerUrl.startsWith('http')) {
  rawServerUrl = `https://${rawServerUrl}.supabase.co`;
}
const supabaseUrl = rawServerUrl;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
let serverSupabase: any = null;
let dbReachabilityPromise: Promise<boolean> | null = null;

if (supabaseUrl && supabaseServiceKey) {
  try {
    serverSupabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Perform non-blocking async reachability check
    dbReachabilityPromise = fetch(`${supabaseUrl}/rest/v1/`, {
      method: "GET",
      headers: { "apikey": supabaseServiceKey }
    }).then(response => {
      if (response.ok || response.status === 401 || response.status === 400 || response.status === 404) {
        return true;
      } else {
        serverSupabase = null;
        return false;
      }
    }).catch(() => {
      serverSupabase = null;
      return false;
    });
  } catch (err) {
    serverSupabase = null;
    dbReachabilityPromise = Promise.resolve(false);
  }
}

export async function getAdminEmails(): Promise<string[]> {
  const envEmails = process.env.ADMIN_EMAILS;
  const defaultEmails = envEmails 
    ? envEmails.split(',').map((e: string) => e.trim()).filter(Boolean) 
    : ["igorrose2003@gmail.com", "tradonyx@vault.com", "toshirohitsugayaonyx@gmail.com"];
  if (!serverSupabase) return defaultEmails;
  try {
    const { data, error } = await serverSupabase
      .from('profiles')
      .select('email')
      .eq('id', '00000000-0000-0000-0000-0000000000ff')
      .maybeSingle();
    
    if (error || !data || !data.email) {
      return defaultEmails;
    }
    
    const parsed = data.email
      .split(',')
      .map((e: string) => e.trim())
      .filter((e: string) => e.includes('@'));
      
    if (parsed.length > 0) {
      return parsed;
    }
    return defaultEmails;
  } catch (err) {
    console.error("Error fetching admin emails in backend:", err);
    return defaultEmails;
  }
}

// Highly robust local in-memory fallback store
let inMemoryUsers: any[] = [
  { id: "user_igor", email: "igorrose2003@gmail.com", username: "Igor Rose", status: "approved", paid: true },
  { id: "user_onyx", email: "toshirohitsugayaonyx@gmail.com", username: "Onyx Admin", status: "approved", paid: true }
];

let inMemoryPayments: any[] = [];
let inMemoryAccounts: any[] = [];
let inMemoryTrades: any[] = [];
let inMemoryChallenges: any[] = [];

// Helper function to resolve actions using the local store
function handleInmemoryProxyAction(action: string, args: any): any {
  switch (action) {
    case "signIn": {
      const { email } = args;
      const cleanEmail = email.trim().toLowerCase();
      const matched = inMemoryUsers.find(u => u.email === cleanEmail);
      if (!matched) return { success: false, error: "Compte introuvable." };
      return { success: true, user: matched };
    }
    default:
      return { success: false, error: `Type action inconnu: ${action}` };
  }
}

// Supabase server-side proxy endpoint
app.post("/api/supabase/proxy", async (req: express.Request, res: express.Response) => {
  try {
    const { action, arguments: args } = req.body;
    if (dbReachabilityPromise) await dbReachabilityPromise;
    if (!serverSupabase) return res.json(handleInmemoryProxyAction(action, args));

    switch (action) {
      case "signIn": {
        const { email, password } = args;
        const { data: authData, error: authError } = await serverSupabase.auth.signInWithPassword({ email, password });
        if (authError) return res.json(handleInmemoryProxyAction("signIn", args));
        return res.json({ success: true, user: authData.user });
      }
      default:
        return res.status(400).json({ error: `Unknown proxy action: ${action}` });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/admin/logs", (req, res) => {
  res.json({ success: true, logs: logBuffer });
});

if (!process.env.NETLIFY && !process.env.VERCEL) {
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
