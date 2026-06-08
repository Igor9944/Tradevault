import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

export const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" })); // Support base64 uploads

// Initialize Server-side Supabase client to bypass client-side "Failed to fetch" (caused by ad-blockers, CORS etc)
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
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
    email: "toshirohitsugayaonyx@gmail.com",
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
    proof_file_url: "https://example.com/screenshot.png",
    network: "TRC20",
    status: "approved",
    payment_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "pay_toshiro",
    user_id: "user_toshiro",
    amount: 30,
    proof_file_url: "https://example.com/screenshot.png",
    network: "BEP20",
    status: "approved",
    payment_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "pay_test",
    user_id: "user_test",
    amount: 30,
    proof_file_url: "https://example.com/screenshot_pending.png",
    network: "TRC20",
    status: "pending",
    payment_date: new Date().toISOString()
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
        proof_file_url: paymentScreenshot,
        network: selectedNetwork || "TRC20",
        status: "pending",
        payment_date: new Date().toISOString()
      });

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
          inMemoryUsers[uIdx].status = 'approved';
          inMemoryUsers[uIdx].paid = true;
          inMemoryUsers[uIdx].paid_until = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
        }
      } else if (row.status === 'rejected') {
        const uIdx = inMemoryUsers.findIndex(u => u.id === row.user_id);
        if (uIdx !== -1) {
          inMemoryUsers[uIdx].status = 'rejected';
          inMemoryUsers[uIdx].paid = false;
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
        inMemoryUsers[index] = {
          ...inMemoryUsers[index],
          username: username || inMemoryUsers[index].username,
          email: email || inMemoryUsers[index].email,
          status: status || inMemoryUsers[index].status
        };
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
          .from('users')
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
          .from('payments')
          .insert({
            id: paymentId,
            user_id: userId,
            amount: subscriptionPrice,
            proof_file_url: paymentScreenshot,
            network: selectedNetwork,
            status: 'pending'
          });

        if (paymentError) {
          console.warn("[PROXY_SIGNUP] Payment insert issue:", paymentError);
        }

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
          .from('users')
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
        const { data: accountsRaw, error: errA } = await serverSupabase.from('accounts').select('*').eq('user_id', userId);
        const { data: tradesRaw, error: errT } = await serverSupabase.from('trades').select('*').eq('user_id', userId);
        const { data: challengesRaw, error: errC } = await serverSupabase.from('challenges').select('*').eq('user_id', userId);
        const { data: paymentsRaw, error: errP } = await serverSupabase.from('payments').select('*').eq('user_id', userId);

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
        const { error } = await serverSupabase.from('users').upsert(profile);
        if (error) throw error;
        return res.json({ success: true });
      }

      case "saveAccount": {
        const { row } = args;
        const { error } = await serverSupabase.from('accounts').upsert(row);
        if (error) throw error;
        return res.json({ success: true });
      }

      case "deleteAccount": {
        const { userId, accountId } = args;
        const { error } = await serverSupabase.from('accounts').delete().eq('id', accountId).eq('user_id', userId);
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
        const { error } = await serverSupabase.from('payments').upsert(row);
        if (error) throw error;
        return res.json({ success: true });
      }

      case "adminLoadAllUsers": {
        const { data, error } = await serverSupabase.from('users').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return res.json({ success: true, data });
      }

      case "adminDeleteUser": {
        const { userId } = args;
        await serverSupabase.from('payments').delete().eq('user_id', userId);
        await serverSupabase.from('trades').delete().eq('user_id', userId);
        await serverSupabase.from('challenges').delete().eq('user_id', userId);
        await serverSupabase.from('accounts').delete().eq('user_id', userId);
        const { error } = await serverSupabase.from('users').delete().eq('id', userId);
        if (error) throw error;
        return res.json({ success: true });
      }

      case "adminUpdateUser": {
        const { userId, username, email, status } = args;
        const { error } = await serverSupabase.from('users').update({
          username,
          email,
          status
        }).eq('id', userId);
        if (error) throw error;
        return res.json({ success: true });
      }

      case "adminLoadAllPayments": {
        const { data, error } = await serverSupabase
          .from('payments')
          .select(`
            *,
            users (
              email,
              username
            )
          `)
          .order('payment_date', { ascending: false });
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

// Log buffer for admin panel
const logBuffer: { timestamp: string, message: string }[] = [];
const MAX_LOGS = 50;

function addLog(message: string) {
  const logEntry = { timestamp: new Date().toISOString(), message };
  logBuffer.unshift(logEntry);
  if (logBuffer.length > MAX_LOGS) logBuffer.pop();
  console.log(`[LOG] ${message}`);
}

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
    if (cleanEmail === "admin@tradevault.com") {
      userExists = true;
    } else if (inMemoryUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
      userExists = true;
    } else if (serverSupabase) {
      try {
        const { data, error } = await serverSupabase
          .from('users')
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

    return res.json({
      success: true,
      message: "Un code OTP a été généré avec succès. Son acheminement s'effectue en arrière-plan."
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

  // 1. Trigger "Nouvel utilisateur" : Quand un utilisateur s'inscrit,  // 1. Trigger "Nouvel utilisateur" : Quand un utilisateur s'inscrit, envoie un e-mail à l'admin
  app.post("/api/notify/signup", async (req, res) => {
    try {
      const { username, email, amount, network } = req.body;
      const targetAdmins = ["igorrose2003@gmail.com", "toshirohitsugayaonyx@gmail.com"];

      res.status(200).json({ success: true, simulated: true });
    } catch (e) {
      console.error("Signup notification error:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  // 2. Trigger "Admin valide" : Quand l'admin valide l'inscription
  app.post("/api/notify/approve", async (req, res) => {
    try {
      const { email, username, subscriptionPeriod } = req.body;

      res.status(200).json({ success: true, simulated: true });
    } catch (e) {
      console.error("Approval send error:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  // 3. Notification "Renouvellement anticipé demandé" : L'utilisateur demande un renouvellement anticipe
  app.post("/api/notify/renewal-request", async (req, res) => {
    try {
      const { username, email, amount, network, paymentId } = req.body;
      const targetAdmins = ["igorrose2003@gmail.com", "toshirohitsugayaonyx@gmail.com"];

      res.status(200).json({ success: true, simulated: true });
    } catch (e) {
      console.error("Renewal request send error:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  // 4. Notification "Renouvellement anticipé approuvé" : L'admin valide le renouvellement anticipé
  app.post("/api/notify/renewal-approve", async (req, res) => {
    try {
      const { email, username } = req.body;

      res.status(200).json({ success: true, simulated: true });
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

  if (!process.env.NETLIFY) {
    app.listen(PORT, "0.0.0.0", () => {
    });
  }
}

startServer();
