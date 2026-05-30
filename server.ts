import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

export const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" })); // Support base64 uploads

  // 1. Trigger "Nouvel utilisateur" : Quand un utilisateur s'inscrit, envoie un e-mail à l'admin
  app.post("/api/notify/signup", async (req, res) => {
    try {
      const { username, email, adminEmail, amount, network } = req.body;
      const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");
      const fromEmail = "TradeVault Pro <onboarding@resend.dev>";
      const targetAdmin = adminEmail || "igorrose2003@gmail.com";

      console.log(`[API_SIGNUP] Sending registration alert email to Admin: ${targetAdmin} for user: ${username} (${email})`);

      if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is not defined. Email logged to terminal.");
        return res.json({ 
          success: true, 
          simulated: true, 
          message: `[SIMULATED] Email sent to admin: ${targetAdmin}. Subject: "Nouvelle inscription: ${username}"` 
        });
      }

      await resend.emails.send({
        from: fromEmail,
        to: [targetAdmin],
        subject: `[TradeVault Pro] Nouvelle Inscription en attente - ${username}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
            <h2 style="color: #6366f1; margin-top: 0;">Nouveau Trader Inscrit</h2>
            <p>Bonjour,</p>
            <p>Un nouvel utilisateur vient de créer un compte et attend votre approbation manuelle :</p>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Nom de trader:</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${username}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Adresse e-mail:</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Type de paiement:</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">USDT ${network || "TRC20"}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Montant payé:</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">$${amount || "30.00"}</td>
              </tr>
            </table>
            <p>Veuillez vous connecter à l'espace <strong>Administration TradeVault</strong> pour auditer la transaction et valider les accès.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 11px; color: #64748b; font-style: italic;">Ceci est une notification automatisée de TradeVault Pro.</p>
          </div>
        `
      });

      res.status(200).json({ success: true, simulated: false });
    } catch (e) {
      console.error("Signup notification error:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  // 2. Trigger "Admin valide" : Quand l'admin valide l'inscription
  app.post("/api/notify/approve", async (req, res) => {
    try {
      const { email, username, subscriptionPeriod } = req.body;
      const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");
      const fromEmail = "TradeVault Pro <onboarding@resend.dev>";

      console.log(`[API_APPROVE] Sending approval welcome email to user: ${email}`);

      if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is not defined. Email logged to terminal.");
        return res.json({ 
          success: true, 
          simulated: true, 
          message: `[SIMULATED] Welcome Email sent to: ${email}.` 
        });
      }

      await resend.emails.send({
        from: fromEmail,
        to: [email],
        subject: "Félicitations - Accès TradeVault Pro Validé !",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #0f172a; color: #f1f5f9;">
            <h2 style="color: #60a5fa; margin-top: 0; font-size: 22px;">Accès Premium Activé ! 🚀</h2>
            <p>Bonjour <strong>${username}</strong>,</p>
            <p>Nous avons d'excellentes nouvelles ! L'administrateur a vérifié votre preuve de versement et validé votre abonnement Premium.</p>
            <div style="background-color: #1e293b; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; font-size: 14px; color: #60a5fa;">Détails de votre offre :</p>
              <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
                <li>Accès complet au Journal de Trading et Dashboard</li>
                <li>Statistiques avancées de rentabilité (Winrate, Profit Factor)</li>
                <li>Suivi dédié et trackers de challenges Propfirm</li>
                <li><strong>Durée créditée :</strong> ${subscriptionPeriod || "3"} mois complets d'accès</li>
              </ul>
            </div>
            <p>Vous pouvez maintenant vous connecter à votre espace membre premium pour tracker vos analyses quotidiennes.</p>
            <p style="font-size: 13px; color: #94a3b8;">Rappel : Pensez à renouveler votre abonnement avant son expiration pour conserver vos historiques.</p>
            <hr style="border: none; border-top: 1px solid #334155; margin: 25px 0;" />
            <p style="font-size: 11px; color: #64748b; font-style: italic; text-align: center;">Propulsé par TradeVault Pro Technology.</p>
          </div>
        `
      });

      res.status(200).json({ success: true, simulated: false });
    } catch (e) {
      console.error("Approval send error:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  // 3. Notification "Renouvellement anticipé demandé" : L'utilisateur demande un renouvellement anticipe
  app.post("/api/notify/renewal-request", async (req, res) => {
    try {
      const { username, email, adminEmail, amount, network, paymentId } = req.body;
      const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");
      const fromEmail = "TradeVault Pro <onboarding@resend.dev>";
      const targetAdmin = adminEmail || "igorrose2003@gmail.com";

      console.log(`[API_RENEW_REQ] Sending renewal warning to Admin: ${targetAdmin} from ${username}`);

      if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is not defined. Email logged to terminal.");
        return res.json({ 
          success: true, 
          simulated: true, 
          message: `[SIMULATED] Renewal Request Email sent to admin: ${targetAdmin}. User: ${username}` 
        });
      }

      await resend.emails.send({
        from: fromEmail,
        to: [targetAdmin],
        subject: `[TradeVault Pro] Demande de Renouvellement Anticipé - ${username}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #fbbf24; border-radius: 12px; background-color: #fefdf0;">
            <h2 style="color: #b45309; margin-top: 0;">Demande de Renouvellement Anticipé</h2>
            <p>Bonjour,</p>
            <p>Le trader suivant a soumis un abonnement de renouvellement anticipé :</p>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #fef3c7; font-weight: bold;">Trader d'accès:</td>
                <td style="padding: 8px; border-bottom: 1px solid #fef3c7;">${username} (${email})</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #fef3c7; font-weight: bold;">Identifiant paiement:</td>
                <td style="padding: 8px; border-bottom: 1px solid #fef3c7; font-family: monospace;">${paymentId}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #fef3c7; font-weight: bold;">Réseau:</td>
                <td style="padding: 8px; border-bottom: 1px solid #fef3c7;">USDT ${network}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #fef3c7; font-weight: bold;">Montant:</td>
                <td style="padding: 8px; border-bottom: 1px solid #fef3c7;">$${amount}</td>
              </tr>
            </table>
            <p>La preuve de paiement (capture d'écran) est disponible sur votre tableau d'administration pour audit immédiat.</p>
            <p>Une fois validé, cliquez sur "Confirmer le renouvellement" pour prolonger les accès de cet utilisateur de 30 jours.</p>
          </div>
        `
      });

      res.status(200).json({ success: true, simulated: false });
    } catch (e) {
      console.error("Renewal request send error:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  // 4. Notification "Renouvellement anticipé approuvé" : L'admin valide le renouvellement anticipé
  app.post("/api/notify/renewal-approve", async (req, res) => {
    try {
      const { email, username } = req.body;
      const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");
      const fromEmail = "TradeVault Pro <onboarding@resend.dev>";

      console.log(`[API_RENEW_APP] Sending renewal approval welcome email to user: ${email}`);

      if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is not defined. Email logged to terminal.");
        return res.json({ 
          success: true, 
          simulated: true, 
          message: `[SIMULATED] Renewal Welcome dynamic email sent to: ${email}.` 
        });
      }

      await resend.emails.send({
        from: fromEmail,
        to: [email],
        subject: "Confirmation - Votre renouvellement d'abonnement est validé !",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; padding: 25px; border: 1px solid #059669; border-radius: 12px; background-color: #ecfdf5; color: #065f46;">
            <h2 style="color: #059669; margin-top: 0;">Abonnement Renouvelé ! 🎉</h2>
            <p>Bonjour <strong>${username}</strong>,</p>
            <p>Votre preuve de versement anticipé a été auditée et validée par notre administrateur.</p>
            <p style="font-size: 15px; font-weight: bold;">Votre abonnement PRO a été prolongé avec succès de <strong>30 jours supplémentaires</strong> !</p>
            <p>Nous vous remercions pour votre fidélité continue à TradeVault Pro. Votre historique de trades et trackers de challenges restent entièrement sauvegardés et sécurisés.</p>
            <p>Bons trades à vous sur les marchés !</p>
            <hr style="border: none; border-top: 1px solid #a7f3d0; margin: 20px 0;" />
            <p style="font-size: 11px; color: #047857; font-style: italic; text-align: center;">TradeVault Pro - Tracker intelligent pour Traders Ambitieux.</p>
          </div>
        `
      });

      res.status(200).json({ success: true, simulated: false });
    } catch (e) {
      console.error("Renewal approval error:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  // Webhooks (fallback standard Supabase direct triggers)
  app.post("/api/webhooks/supabase", async (req, res) => {
    try {
      const payload = req.body;
      const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");
      const adminEmail = "igorrose2003@gmail.com";
      const fromEmail = "TradeVault Pro <onboarding@resend.dev>";

      if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is not defined. Skipping actual email.");
        return res.json({ success: true, message: "Webhook received but email skipped (no API key)." });
      }

      if (payload.table === "users" && payload.type === "INSERT") {
        const newUser = payload.record;
        if (newUser && newUser.email) {
          await resend.emails.send({
            from: fromEmail,
            to: [adminEmail],
            subject: "Nouvel utilisateur sur TradeVault Pro",
            html: `<p>Un nouvel utilisateur s'est inscrit : ${newUser.email}</p>`,
          });
        }
      } else if (payload.table === "payments" && payload.type === "UPDATE") {
        const newRecord = payload.record;
        const oldRecord = payload.old_record;
        if (newRecord.status === "approved" && oldRecord.status !== "approved") {
          console.log(`Payment approved for user ID: ${newRecord.user_id}`);
        }
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
      const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");
      const fromEmail = "TradeVault Pro <onboarding@resend.dev>";
      
      const list = usersList || [];
      const now = new Date();
      const target7days = new Date();
      target7days.setDate(now.getDate() + 7);

      const target7daysString = target7days.toDateString();
      const warnedUsers: string[] = [];

      console.log(`[CRON_CHECK] Executing daily subscription renewal check for ${list.length} users...`);

      for (const u of list) {
        if (u.paidUntil) {
          const userExpiry = new Date(u.paidUntil);
          // Check if difference in days is approximately 7
          const diffTime = userExpiry.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 7 && u.email) {
            warnedUsers.push(u.username);
            console.log(`Triggering 7-day renewal reminder email for ${u.username} (${u.email})`);

            if (process.env.RESEND_API_KEY) {
              await resend.emails.send({
                from: fromEmail,
                to: [u.email],
                subject: "[Rappel] Votre accès TradeVault Pro prend fin dans 7 jours",
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; padding: 25px; border: 1px solid #f59e0b; border-radius: 12px; background-color: #fffbeb; color: #78350f;">
                    <h2 style="color: #d97706; margin-top:0;">Votre Abonnement TradeVault Pro expire bientôt ! ⏳</h2>
                    <p>Bonjour <strong>${u.username}</strong>,</p>
                    <p>Nous vous informons que votre accès d'abonnement d'accès à <strong>TradeVault Pro</strong> expire dans exactement 7 jours le <strong>${userExpiry.toLocaleDateString()}</strong>.</p>
                    <p>Pour éviter toute coupure de service et continuer de tracker vos trades proprement sans perdre de données, nous vous invitons à lancer dès aujourd'hui un **renouvellement anticipé** depuis votre tableau de bord.</p>
                    <div style="background-color: #fabf2c/20; padding: 12px; border-radius: 8px; margin: 15px 0; border: 1px solid #f59e0b/30;">
                      <p style="margin: 0; font-weight: bold;">Comment procéder :</p>
                      <ol style="margin: 5px 0 0 0; padding-left: 20px; font-size:12px;">
                        <li>Connectez-vous sur votre tableau de bord TradeVault Pro.</li>
                        <li>Cliquez sur le badge ou l'option "Renouvellement Anticipé" en bas du menu latéral.</li>
                        <li>Suivez les instructions de transfert sécurisé pour prolonger votre accès de 30 jours.</li>
                      </ol>
                    </div>
                    <p>À très vite sur la plateforme !</p>
                    <hr style="border: none; border-top: 1px solid #fcd34d; margin: 20px 0;" />
                    <p style="font-size: 10px; color: #b45309; text-align: center;">Infrastructures TradeVault - Tous droits réservés.</p>
                  </div>
                `
              });
            }
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
    const vite = await createViteServer({
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
      console.log(`Server running on http://localhost:${PORT}`);
      console.log("Supabase Webhook URL: [APP_URL]/api/webhooks/supabase");
    });
  }
}

startServer();
