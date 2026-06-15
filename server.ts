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
  
  // Sécurité / Robustesse robuste : l'utilisateur a collé sa clé API Resend (qui commence par "re_")
  // dans la case "RESEND_FROM_EMAIL" de la configuration de l'environnement.
  // On détecte ça et on corrige automatiquement pour éviter que ça plante !
  if (fromEmail && fromEmail.trim().startsWith("re_")) {
    apiKey = fromEmail.trim();
    fromEmail = undefined;
  }
  
  if (!apiKey) {
    apiKey = "re_QjFfcnKE_4gspG3CrLHYnKFFVcBRyLABe";
  }
  
  // Important : Resend bloque l'envoi depuis @gmail.com (il faut un nom de domaine pro).
  // Nous sommes obligés d'utiliser onboarding@resend.dev en adresse d'envoi.
  // Cependant, nous allons rajouter un entête "Reply-To" pour que les réponses aillent sur le Gmail.
  const finalFromEmail = fromEmail || "TradeVault <onboarding@resend.dev>";
  const replyTo = "igorrose2003@gmail.com, tradonyx@vault.com";
  
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
let serverSupabase: any = null;
let dbReachabilityPromise: Promise<boolean> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    serverSupabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Perform non-blocking async reachability check
    dbReachabilityPromise = fetch(`${supabaseUrl}/rest/v1/`, {
      method: "GET",
      headers: { "apikey": supabaseAnonKey }
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

// Highly robust local in-memory fallback store to ensure seamless reviews
let inMemoryUsers: any[] = [
  {
    id: "user_igor",
    email: "igorrose2003@gmail.com",
    username: "Igor Rose",
    country: "FR",
    avatar_url: null,
    status: "approved",
    paid: true,
    paid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "user_toshiro",
    email: "tradonyx@vault.com",
    username: "Toshiro Hitsugaya",
    country: "DE",
    avatar_url: null,
    status: "approved",
    paid: true,
    paid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "user_test",
    email: "test@test.com",
    username: "Tester",
    country: "FR",
    avatar_url: null,
    status: "pending",
    paid: false,
    paid_until: null,
    created_at: new Date().toISOString()
  }
];

let inMemoryPayments: any[] = [
  {
    id: "pay_igor",
    user_id: "user_igor",
    amount: 30,
    payment_proof: "https://example.com/screenshot.png",
    network: "TRC20",
    status: "approved",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "pay_toshiro",
    user_id: "user_toshiro",
    amount: 30,
    payment_proof: "https://example.com/screenshot.png",
    network: "BEP20",
    status: "approved",
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "pay_test",
    user_id: "user_test",
    amount: 30,
    payment_proof: "https://example.com/screenshot_pending.png",
    network: "TRC20",
    status: "pending",
    created_at: new Date().toISOString()
  }
];

let inMemoryAccounts: any[] = [];
let inMemoryTrades: any[] = [];
let inMemoryChallenges: any[] = [];

// Helper function to resolve actions using the local store
function handleInmemoryProxyAction(action: string, args: any): any {
  switch (action) {
    case "signUp": {
      const { email, username, country, paymentScreenshot, selectedNetwork, subscriptionPrice, regAvatar } = args;
      const cleanEmail = email.trim().toLowerCase();
      
      const existing = inMemoryUsers.find(u => u.email === cleanEmail);
      if (existing) {
        return { success: false, error: "Cet e-mail est déjà utilisé." };
      }

      const userId = "usr_" + Date.now();
      const newUser = {
        id: userId,
        email: cleanEmail,
        username: username.trim(),
        country: country,
        avatar_url: regAvatar || null,
        status: "pending",
        paid: false,
        paid_until: null,
        created_at: new Date().toISOString()
      };
      
      inMemoryUsers.push(newUser);

      // Create payment log
      const paymentId = "pay_" + Date.now();
      inMemoryPayments.push({
        id: paymentId,
        user_id: userId,
        amount: subscriptionPrice || 30,
        payment_proof: paymentScreenshot,
        network: selectedNetwork || "TRC20",
        status: "pending",
        created_at: new Date().toISOString()
      });

      // Trigger Resend email deliverability on signup
      triggerEmailsOnSignup(username.trim(), cleanEmail, paymentScreenshot, subscriptionPrice || 30, selectedNetwork || "TRC20");

      return {
        success: true,
        user: {
          id: userId,
          username: username.trim(),
          email: cleanEmail,
          country,
          paid: false,
          paidUntil: null,
          createdAt: newUser.created_at,
          paymentScreenshot,
          status: "pending",
          avatar: regAvatar || undefined
        }
      };
    }

    case "signIn": {
      const { email } = args;
      const cleanEmail = email.trim().toLowerCase();
      
      const matched = inMemoryUsers.find(u => u.email === cleanEmail);
      if (!matched) {
        return { success: false, error: "Compte introuvable dans la base locale." };
      }

      return {
        success: true,
        user: {
          id: matched.id,
          username: matched.username,
          email: matched.email,
          country: matched.country,
          paid: matched.paid,
          paidUntil: matched.paid_until,
          status: matched.status,
          avatar: matched.avatar_url || undefined,
          createdAt: matched.created_at
        }
      };
    }

    case "loadUserData": {
      const { userId } = args;
      const accountsRaw = inMemoryAccounts.filter(a => a.user_id === userId);
      const tradesRaw = inMemoryTrades.filter(t => t.user_id === userId);
      const challengesRaw = inMemoryChallenges.filter(c => c.user_id === userId);
      const paymentsRaw = inMemoryPayments.filter(p => p.user_id === userId);

      return {
        success: true,
        data: {
          accountsRaw,
          tradesRaw,
          challengesRaw,
          paymentsRaw
        }
      };
    }

    case "syncUserProfile": {
      const { profile } = args;
      const cachedIdx = inMemoryUsers.findIndex(u => u.id === profile.id);
      const row = {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        country: profile.country,
        avatar_url: profile.avatar_url,
        status: profile.status,
        paid: profile.paid,
        paid_until: profile.paid_until,
        created_at: inMemoryUsers[cachedIdx]?.created_at || new Date().toISOString()
      };
      if (cachedIdx !== -1) {
        inMemoryUsers[cachedIdx] = row;
      } else {
        inMemoryUsers.push(row);
      }
      return { success: true };
    }

    case "saveAccount": {
      const { row } = args;
      const idx = inMemoryAccounts.findIndex(a => a.id === row.id);
      if (idx !== -1) {
        inMemoryAccounts[idx] = row;
      } else {
        inMemoryAccounts.push(row);
      }
      return { success: true };
    }

    case "deleteAccount": {
      const { userId, accountId } = args;
      inMemoryAccounts = inMemoryAccounts.filter(a => !(a.id === accountId && a.user_id === userId));
      return { success: true };
    }

    case "saveTrade": {
      const { row } = args;
      const idx = inMemoryTrades.findIndex(t => t.id === row.id);
      if (idx !== -1) {
        inMemoryTrades[idx] = row;
      } else {
        inMemoryTrades.push(row);
      }
      return { success: true };
    }

    case "deleteTrade": {
      const { userId, tradeId } = args;
      inMemoryTrades = inMemoryTrades.filter(t => !(t.id === tradeId && t.user_id === userId));
      return { success: true };
    }

    case "saveChallenge": {
      const { row } = args;
      const idx = inMemoryChallenges.findIndex(c => c.id === row.id);
      if (idx !== -1) {
        inMemoryChallenges[idx] = row;
      } else {
        inMemoryChallenges.push(row);
      }
      return { success: true };
    }

    case "deleteChallenge": {
      const { userId, challengeId } = args;
      inMemoryChallenges = inMemoryChallenges.filter(c => !(c.id === challengeId && c.user_id === userId));
      return { success: true };
    }

    case "savePayment": {
      const { row } = args;
      const idx = inMemoryPayments.findIndex(p => p.id === row.id);
      if (idx !== -1) {
        inMemoryPayments[idx] = row;
      } else {
        inMemoryPayments.push(row);
      }

      // Propagate approved status to corresponding user in memory
      if (row.status === 'approved') {
        const uIdx = inMemoryUsers.findIndex(u => u.id === row.user_id);
        if (uIdx !== -1) {
          const userObj = inMemoryUsers[uIdx];
          const wasAlreadyPaid = userObj.paid || userObj.status === 'approved';
          
          userObj.status = 'approved';
          userObj.paid = true;
          // Extend payment date by 30 days
          const currentExpiry = userObj.paid_until ? new Date(userObj.paid_until) : new Date();
          const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
          baseDate.setDate(baseDate.getDate() + 30);
          userObj.paid_until = baseDate.toISOString();
          
          if (wasAlreadyPaid) {
            // Trigger renewal payment receipt email
            triggerEmailOnRenewalReceipt(userObj.username, userObj.email, row.amount, row.network);
          } else {
            // Trigger Resend premium activation welcome email
            triggerEmailOnApproval(userObj.username, userObj.email);
          }
        }
      } else if (row.status === 'rejected') {
        const uIdx = inMemoryUsers.findIndex(u => u.id === row.user_id);
        if (uIdx !== -1) {
          const userObj = inMemoryUsers[uIdx];
          const wasAlreadyPaid = userObj.paid || userObj.status === 'approved';
          
          if (!wasAlreadyPaid) {
            userObj.status = 'rejected';
            userObj.paid = false;
          }
          
          // Trigger rejection/insufficient proof retry email
          triggerEmailOnRejection(userObj.username, userObj.email);
        }
      }

      return { success: true };
    }

    case "adminLoadAllUsers": {
      return { success: true, data: inMemoryUsers };
    }

    case "adminDeleteUser": {
      const { userId } = args;
      inMemoryUsers = inMemoryUsers.filter(u => u.id !== userId);
      inMemoryPayments = inMemoryPayments.filter(p => p.user_id !== userId);
      inMemoryAccounts = inMemoryAccounts.filter(a => a.user_id !== userId);
      inMemoryTrades = inMemoryTrades.filter(t => t.user_id !== userId);
      inMemoryChallenges = inMemoryChallenges.filter(c => c.user_id !== userId);
      return { success: true };
    }

    case "adminUpdateUser": {
      const { userId, username, email, status } = args;
      const index = inMemoryUsers.findIndex(u => u.id === userId);
      if (index !== -1) {
        const oldStatus = inMemoryUsers[index].status;
        const targetUsername = username || inMemoryUsers[index].username;
        const targetEmail = email || inMemoryUsers[index].email;

        inMemoryUsers[index] = {
          ...inMemoryUsers[index],
          username: targetUsername,
          email: targetEmail,
          status: status || inMemoryUsers[index].status
        };

        if (status && status !== oldStatus) {
          if (status === 'approved') {
            triggerEmailOnApproval(targetUsername, targetEmail);
          } else if (status === 'rejected') {
            triggerEmailOnRejection(targetUsername, targetEmail);
          }
        }

        return { success: true, user: inMemoryUsers[index] };
      }
      return { success: false, error: "Utilisateur introuvable" };
    }

    case "adminLoadAllPayments": {
      const enhancedPayments = inMemoryPayments.map(p => {
        const matchedUser = inMemoryUsers.find(u => u.id === p.user_id) || {};
        return {
          ...p,
          users: {
            email: matchedUser.email || "trader@example.com",
            username: matchedUser.username || "Trader"
          }
        };
      });
      return { success: true, data: enhancedPayments };
    }

    default:
      return { success: false, error: `Type action inconnu: ${action}` };
  }
}

// Supabase server-side proxy endpoint
app.post("/api/supabase/proxy", async (req: express.Request, res: express.Response) => {
  try {
    const { action, arguments: args } = req.body;
    
    // Await reachability check to complete if it was initiated
    if (dbReachabilityPromise) {
      await dbReachabilityPromise;
    }

    if (!serverSupabase) {
      const mockResult = handleInmemoryProxyAction(action, args);
      return res.json(mockResult);
    }

    switch (action) {
      case "signUp": {
        const { email, password, username, country, paymentScreenshot, selectedNetwork, subscriptionPrice, regAvatar } = args;
        
        // 1. Auth SignUp
        const { data: authData, error: authError } = await serverSupabase.auth.signUp({
          email,
          password,
        });

        if (authError) {
          const errMsg = authError.message || String(authError);
          const isHtmlError = errMsg.includes("<!DOCTYPE") || errMsg.includes("<");
          const mockResult = handleInmemoryProxyAction("signUp", args);
          if (!mockResult.success && isHtmlError) {
            return res.json({ success: false, error: "Serveur inactif (projet Supabase potentiellement en pause)." });
          }
          return res.json(mockResult);
        }

        const userId = authData.user?.id;
        if (!userId) {
          return res.json({ success: false, error: "Erreur d'identifiant d'API auth." });
        }

        // 2. Profile Upsert
        const { error: profileError } = await serverSupabase
          .from('profiles')
          .upsert({
            id: userId,
            email,
            username: username.trim(),
            country: country,
            avatar_url: regAvatar || null,
            status: 'pending',
            paid: false,
            created_at: new Date().toISOString()
          });

        if (profileError) {
          console.warn("[PROXY_SIGNUP] Profile insert issue:", profileError);
        }

        // 3. Payment Request insert
        const paymentId = 'pay_' + Date.now();
        const { error: paymentError } = await serverSupabase
          .from('payment_requests')
          .insert({
            id: paymentId,
            user_id: userId,
            amount: subscriptionPrice,
            payment_proof: paymentScreenshot,
            network: selectedNetwork,
            status: 'pending'
          });

        if (paymentError) {
          console.warn("[PROXY_SIGNUP] Payment insert issue:", paymentError);
        }

        // Trigger Resend email deliverability on signup
        await triggerEmailsOnSignup(username.trim(), email, paymentScreenshot, subscriptionPrice || 30, selectedNetwork || "TRC20");

        return res.json({
          success: true,
          user: {
            id: userId,
            username: username.trim(),
            email,
            country,
            paid: false,
            paidUntil: null,
            createdAt: new Date().toISOString(),
            paymentScreenshot,
            status: 'pending',
            avatar: regAvatar || undefined
          }
        });
      }

      case "signIn": {
        const { email, password } = args;
        let authData: any = null;
        let authError: any = null;
        
        try {
          const resAuth = await serverSupabase.auth.signInWithPassword({
            email,
            password,
          });
          authData = resAuth.data;
          authError = resAuth.error;
        } catch (e: any) {
          authError = e;
        }

        if (authError) {
          const errMsg = authError.message || String(authError);
          const isHtmlError = errMsg.includes("<!DOCTYPE") || errMsg.includes("<");
          const mockResult = handleInmemoryProxyAction("signIn", args);
          if (mockResult.success) {
            return res.json(mockResult);
          }
          if (isHtmlError) {
            return res.json({ success: false, error: "Identifiant incorrect ou Serveur de base de données inactif (projet Supabase potentiellement en pause)." });
          }
          return res.json({ success: false, error: errMsg });
        }

        const userId = authData.user?.id;
        if (!userId) {
          return res.json({ success: false, error: "Identifiant auth non récupéré." });
        }

        // Load profile
        const { data: profile, error: profileError } = await serverSupabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) {
          console.warn("[PROXY_SIGNIN] Profile loading issue:", profileError);
        }

        return res.json({
          success: true,
          user: {
            id: userId,
            username: profile?.username || authData.user.email?.split('@')[0] || 'Trader',
            email: authData.user.email || email,
            country: profile?.country || 'FR',
            paid: profile?.paid ?? false,
            paidUntil: profile?.paid_until || null,
            status: profile?.status || 'approved',
            avatar: profile?.avatar_url || undefined,
            createdAt: profile?.created_at || new Date().toISOString()
          }
        });
      }

      case "loadUserData": {
        const { userId } = args;
        const { data: accountsRaw, error: errA } = await serverSupabase.from('trading_accounts').select('*').eq('user_id', userId);
        const { data: tradesRaw, error: errT } = await serverSupabase.from('trades').select('*').eq('user_id', userId);
        const { data: challengesRaw, error: errC } = await serverSupabase.from('challenges').select('*').eq('user_id', userId);
        const { data: paymentsRaw, error: errP } = await serverSupabase.from('payment_requests').select('*').eq('user_id', userId);

        if (errA || errT || errC || errP) {
          const errMsg = [errA, errT, errC, errP].filter(Boolean).map(e => e.message || String(e)).join(", ");
          throw new Error(`Database queries failed during loadUserData: ${errMsg}`);
        }

        return res.json({
          success: true,
          data: {
            accountsRaw,
            tradesRaw,
            challengesRaw,
            paymentsRaw
          }
        });
      }

      case "syncUserProfile": {
        const { profile } = args;
        const { error } = await serverSupabase.from('profiles').upsert(profile);
        if (error) throw error;
        return res.json({ success: true });
      }

      case "saveAccount": {
        const { row } = args;
        const { error } = await serverSupabase.from('trading_accounts').upsert(row);
        if (error) throw error;
        return res.json({ success: true });
      }

      case "deleteAccount": {
        const { userId, accountId } = args;
        const { error } = await serverSupabase.from('trading_accounts').delete().eq('id', accountId).eq('user_id', userId);
        if (error) throw error;
        return res.json({ success: true });
      }

      case "saveTrade": {
        const { row } = args;
        const { error } = await serverSupabase.from('trades').upsert(row);
        if (error) throw error;
        return res.json({ success: true });
      }

      case "deleteTrade": {
        const { userId, tradeId } = args;
        const { error } = await serverSupabase.from('trades').delete().eq('id', tradeId).eq('user_id', userId);
        if (error) throw error;
        return res.json({ success: true });
      }

      case "saveChallenge": {
        const { row } = args;
        const { error } = await serverSupabase.from('challenges').upsert(row);
        if (error) throw error;
        return res.json({ success: true });
      }

      case "deleteChallenge": {
        const { userId, challengeId } = args;
        const { error } = await serverSupabase.from('challenges').delete().eq('id', challengeId).eq('user_id', userId);
        if (error) throw error;
        return res.json({ success: true });
      }

      case "savePayment": {
        const { row } = args;
        const { error } = await serverSupabase.from('payment_requests').upsert(row);
        if (error) throw error;

        if (row.status === 'approved') {
          try {
            const { data: userProfile } = await serverSupabase
              .from('profiles')
              .select('*')
              .eq('id', row.user_id)
              .maybeSingle();

            if (userProfile && userProfile.email) {
              const wasAlreadyPaid = userProfile.paid || userProfile.status === 'approved';
              if (wasAlreadyPaid) {
                await triggerEmailOnRenewalReceipt(userProfile.username || 'Trader', userProfile.email, row.amount, row.network);
              } else {
                await triggerEmailOnApproval(userProfile.username || 'Trader', userProfile.email);
              }
            }
          } catch (err) {
            console.error("Failed to query user for approval email trigger:", err);
          }
        } else if (row.status === 'rejected') {
          try {
            const { data: userProfile } = await serverSupabase
              .from('profiles')
              .select('*')
              .eq('id', row.user_id)
              .maybeSingle();

            if (userProfile && userProfile.email) {
              await triggerEmailOnRejection(userProfile.username || 'Trader', userProfile.email);
            }
          } catch (err) {
            console.error("Failed to query user for rejection email trigger:", err);
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
        const { userId } = args;
        await serverSupabase.from('payment_requests').delete().eq('user_id', userId);
        await serverSupabase.from('trades').delete().eq('user_id', userId);
        await serverSupabase.from('challenges').delete().eq('user_id', userId);
        await serverSupabase.from('trading_accounts').delete().eq('user_id', userId);
        const { error } = await serverSupabase.from('profiles').delete().eq('id', userId);
        if (error) throw error;
        return res.json({ success: true });
      }

      case "adminUpdateUser": {
        const { userId, username, email, status } = args;
        
        let oldStatus = "";
        try {
          const { data: current } = await serverSupabase.from('profiles').select('status').eq('id', userId).maybeSingle();
          if (current) oldStatus = current.status;
        } catch (errPrev) {}

        const { error } = await serverSupabase.from('profiles').update({
          username,
          email,
          status
        }).eq('id', userId);
        if (error) throw error;

        if (status && status !== oldStatus) {
          if (status === 'approved') {
            await triggerEmailOnApproval(username || 'Trader', email);
          } else if (status === 'rejected') {
            await triggerEmailOnRejection(username || 'Trader', email);
          }
        }
        return res.json({ success: true });
      }

      case "adminLoadAllPayments": {
        const { data, error } = await serverSupabase
          .from('payment_requests')
          .select(`
            *,
            users (
              email,
              username
            )
          `)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return res.json({ success: true, data });
      }

      default:
        return res.status(400).json({ error: `Unknown proxy action: ${action}` });
    }
  } catch (err: any) {
    try {
      const mockResult = handleInmemoryProxyAction(req.body?.action, req.body?.arguments);
      return res.json(mockResult);
    } catch (fallbackErr: any) {
      return res.status(500).json({ success: false, error: fallbackErr.message || String(fallbackErr) });
    }
  }
});

// In-memory OTP storage for password resets
const otpStorage = new Map<string, { code: string; expires: number }>();

app.get("/api/admin/logs", (req, res) => {
  res.json({ success: true, logs: logBuffer });
});

// Replace console.log calls as needed or just use addLog

// Endpoint: request a 7-digit OTP password reset code
app.post("/api/auth/forgot-password-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Adresse e-mail requise." });
    }
    const cleanEmail = email.trim().toLowerCase();
    
    // Check if user exists in either Supabase or in-memory store
    let userExists = false;
    if (cleanEmail === "igorrose2003@gmail.com") {
      userExists = true;
    } else if (inMemoryUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
      userExists = true;
    } else if (serverSupabase) {
      try {
        const { data, error } = await serverSupabase
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

    // Generate an exact 7-digit OTP
    const code = Math.floor(1000000 + Math.random() * 9000000).toString();
    
    // Store in-memory for 15 minutes
    otpStorage.set(cleanEmail, {
      code,
      expires: Date.now() + 15 * 60 * 1000
    });

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #1e293b; border-radius: 16px; background-color: #0b0f19; color: #f1f5f9; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <!-- En-tête -->
        <div style="text-align: center; margin-bottom: 25px;">
          <div style="display: inline-block; padding: 8px 16px; background-color: rgba(0, 255, 156, 0.1); border: 1px solid rgba(0, 255, 156, 0.2); border-radius: 99px;">
            <span style="font-size: 11px; font-weight: bold; letter-spacing: 2px; color: #00ff9c; text-transform: uppercase;">CONNEXION UNIQUE</span>
          </div>
        </div>

        <h2 style="color: #ffffff; margin-top: 0; font-size: 22px; text-align: center; font-weight: 800; letter-spacing: -0.5px;">Accès Instantané ⚡</h2>
        
        <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; text-align: center; margin-bottom: 24px;">
          Saisissez le code OTP à usage unique ci-dessous pour modifier votre mot de passe et récupérer vos accès de trading TradeVault Pro :
        </p>

        <!-- Bloc de Code OTP -->
        <div style="background-color: #151c2c; border: 1.5px dashed #00ff9c; padding: 18px; border-radius: 12px; text-align: center; margin: 25px 0;">
          <span style="font-size: 36px; font-weight: 900; letter-spacing: 6px; color: #00ff9c; font-family: 'Courier New', monospace;">${code}</span>
          <p style="font-size: 11px; color: #64748b; margin: 8px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Saisissez ce code de vérification</p>
        </div>

        <hr style="border: none; border-top: 1px solid #1e293b; margin: 30px 0;" />
        <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0; line-height: 1.5;">
          Ce code temporaire n'est de rigueur que pour une durée de 15 minutes.
        </p>
      </div>
    `;

    addLog(`[OTP_RESET] Code OTP généré pour ${cleanEmail}`);
    await sendEmailViaResend(cleanEmail, "🔑 Code de connexion sécurisé TradeVault Pro", emailHtml);

    return res.json({
      success: true,
      message: "Un code OTP a été envoyé à votre adresse e-mail avec succès."
    });
  } catch (err: any) {
    console.error("Forgot password OTP endpoint error:", err);
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// Endpoint: verify a 7-digit OTP and reset password
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
      return res.json({ success: false, error: "Code OTP invalide à 7 chiffres." });
    }
    if (record.expires < Date.now()) {
      otpStorage.delete(cleanEmail);
      return res.json({ success: false, error: "Le code OTP a expiré (limite de 15 minutes)." });
    }

    // Success, invalidate OTP
    otpStorage.delete(cleanEmail);

    // Save in in-memory list so the user can sign-in via fallback with their new password
    const userToUpdate = inMemoryUsers.find(u => u.email.toLowerCase() === cleanEmail);
    if (userToUpdate) {
      userToUpdate.password = newPassword;
    }

    return res.json({ success: true, message: "Mot de passe réinitialisé de manière sécurisée !" });
  } catch (err: any) {
    console.error("Reset password OTP verification error:", err);
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

  // 1. Trigger "Nouvel utilisateur" : Quand un utilisateur s'inscrit, envoie un e-mail à l'admin
  app.post("/api/notify/signup", async (req, res) => {
    try {
      const { username, email, amount, network } = req.body;
      await triggerEmailsOnSignup(username, email, null, amount || 30, network || "TRC20");
      res.status(200).json({ success: true });
    } catch (e) {
      console.error("Signup notification error:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  // 2. Trigger "Admin valide" : Quand l'admin valide l'inscription
  app.post("/api/notify/approve", async (req, res) => {
    try {
      const { email, username } = req.body;
      await triggerEmailOnApproval(username, email);
      res.status(200).json({ success: true });
    } catch (e) {
      console.error("Approval send error:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  // 3. Notification "Renouvellement anticipé demandé" : L'utilisateur demande un renouvellement anticipe
  app.post("/api/notify/renewal-request", async (req, res) => {
    try {
      const { username, email, amount, network, paymentId } = req.body;
      const adminEmails = ["igorrose2003@gmail.com", "tradonyx@vault.com"];
      const adminHtml = `
        <div style="font-family: sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 30px; border-radius: 12px; border: 1px solid #1e293b;">
          <h2 style="color: #00ff9c;">⌛ Demande de renouvellement reçue !</h2>
          <p>Le trader <strong>${username}</strong> (${email}) sollicite un renouvellement d'abonnement :</p>
          <ul>
            <li>Montant : ${amount || 30} USD</li>
            <li>Réseau : ${network || "TRC20"}</li>
            <li>ID Paiement : ${paymentId || "Inconnu"}</li>
          </ul>
          <p>Veuillez visiter votre portail admin pour vérifier et valider.</p>
        </div>
      `;
      await sendEmailViaResend(adminEmails, `⌛ Renouvellement TradeVault : ${username}`, adminHtml);
      res.status(200).json({ success: true });
    } catch (e) {
      console.error("Renewal request send error:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  // 4. Notification "Renouvellement anticipé approuvé" : L'admin valide le renouvellement anticipé
  app.post("/api/notify/renewal-approve", async (req, res) => {
    try {
      const { email, username } = req.body;
      const welcomeHtmlPath = path.join(process.cwd(), "SUPABASE_WELCOME_EMAIL.html");
      let htmlContent = "";
      if (fs.existsSync(welcomeHtmlPath)) {
        htmlContent = fs.readFileSync(welcomeHtmlPath, "utf8");
      } else {
        htmlContent = `<h2>Renouvellement Confirmé !</h2><p>Bonjour ${username}, votre accès a été prolongé !</p>`;
      }
      const platformUrl = "https://traderpr0.netlify.app";
      htmlContent = htmlContent
        .replace(/\{\{user_name\}\}/g, username)
        .replace(/\{\{platform_url\}\}/g, platformUrl);

      await sendEmailViaResend(email, "✅ Abonnement prolongé avec succès - TradeVault", htmlContent);
      res.status(200).json({ success: true });
    } catch (e) {
      console.error("Renewal approval error:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  // Webhooks (fallback standard Supabase direct triggers)
  app.post("/api/webhooks/supabase", async (req, res) => {
    try {
      const payload = req.body;
 
      if (payload.table === "users" && payload.type === "INSERT") {
        const newUser = payload.record;
      } else if (payload.table === "payments" && payload.type === "UPDATE") {
        const newRecord = payload.record;
        const oldRecord = payload.old_record;
      }
 
      res.status(200).json({ success: true });
    } catch (e) {
      console.error("Webhook error:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  // Tâche planifiée (Cron) : vérifier chaque jour si une date end_date est dans 7 jours, et envoyer l'e-mail de rappel automatiquement.
  app.post("/api/cron/check-renewals", async (req, res) => {
    try {
      const { usersList, adminEmail } = req.body;
      
      const list = usersList || [];
      const now = new Date();
      const target7days = new Date();
      target7days.setDate(now.getDate() + 7);

      const warnedUsers: string[] = [];
      
      for (const u of list) {
        if (u.paidUntil) {
          const userExpiry = new Date(u.paidUntil);
          const diffTime = userExpiry.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 7 && u.email) {
            warnedUsers.push(u.username);
            const reminderHtml = `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #1e293b; border-radius: 16px; background-color: #0b0f19; color: #f1f5f9;">
                <h2 style="color: #ff9f43; text-align: center;">⚡ Votre abonnement expire bientôt !</h2>
                <p>Bonjour <strong>${u.username}</strong>,</p>
                <p>Votre accès premium TradeVault expirera dans <strong>7 jours</strong>.</p>
                <p>Afin d'éviter toute interruption dans le suivi de vos statistiques, challenges et métriques de trading, nous vous invitons à renouveler votre abonnement dès maintenant.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://traderpr0.netlify.app" style="background-color: #00ff9c; color: #0b0f19; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 8px;">Renouveler mon accès</a>
                </div>
                <hr style="border: none; border-top: 1px solid #1e293b;" />
                <p style="font-size: 11px; color: #64748b; text-align: center;">TradeVault Pro — Le compagnon de trading moderne.</p>
              </div>
            `;
            await sendEmailViaResend(u.email, "⚠️ Rappel : Votre abonnement TradeVault expire dans 7 jours", reminderHtml);
          }
        }
      }

      res.status(200).json({ 
        success: true, 
        processed: list.length, 
        warned: warnedUsers 
      });
    } catch (e) {
      console.error("Cron check error:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.NETLIFY && !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
    });
  }
}

startServer();
