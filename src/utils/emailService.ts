/**
 * emailService.ts — TradeVault Email System via Resend
 * Triggers: signup · payment_approved · payment_rejected · welcome · expiry
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL     = process.env.RESEND_FROM_EMAIL || 'TradeVault <noreply@tradevault.app>';
const ADMIN_EMAIL    = process.env.ADMIN_NOTIF_EMAIL || 'tradonyx@vault.com';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailPayload {
  to:      string | string[];
  subject: string;
  html:    string;
  replyTo?: string;
}

// ─── Core sender ──────────────────────────────────────────────────────────────

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('[EMAIL] RESEND_API_KEY manquant — email ignoré');
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:     FROM_EMAIL,
        to:       Array.isArray(payload.to) ? payload.to : [payload.to],
        subject:  payload.subject,
        html:     payload.html,
        reply_to: payload.replyTo,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[EMAIL] Resend error:', res.status, err);
      return false;
    }
    console.info('[EMAIL] ✅ Envoyé à:', payload.to);
    return true;
  } catch (e: any) {
    console.error('[EMAIL] Exception:', e.message);
    return false;
  }
}

// ─── HTML template base ───────────────────────────────────────────────────────

function baseTemplate(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#050505;font-family:'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;min-height:100vh;">
  <tr><td align="center" style="padding:40px 20px;">
    <table width="100%" style="max-width:560px;">

      <!-- Header -->
      <tr><td style="padding-bottom:32px;text-align:center;">
        <span style="font-size:22px;font-weight:900;letter-spacing:-1px;">
          <span style="color:#ffffff;">TRADE</span><span style="color:#00FF9C;">VAULT</span>
        </span>
      </td></tr>

      <!-- Card -->
      <tr><td style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:32px;">
        ${content}
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding-top:24px;text-align:center;">
        <p style="color:#3f3f3f;font-size:11px;margin:0;">
          TradeVault · Journal de trading professionnel<br/>
          <a href="https://tradevault-silk.vercel.app" style="color:#00FF9C;text-decoration:none;">tradevault-silk.vercel.app</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ─── Email 1 : Inscription reçue (user) ──────────────────────────────────────

export async function sendSignupConfirmation(username: string, email: string): Promise<boolean> {
  const content = `
    <h2 style="color:#ffffff;font-size:20px;font-weight:800;margin:0 0 8px;">
      Inscription reçue ✅
    </h2>
    <p style="color:#888;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Bonjour <strong style="color:#fff;">${username}</strong>,<br/>
      ton inscription a bien été reçue. Ton compte sera activé dès validation de ton paiement.
    </p>
    <div style="background:rgba(0,255,156,0.06);border:1px solid rgba(0,255,156,0.2);border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="color:#00FF9C;font-size:13px;margin:0;font-weight:600;">⏳ Délai de validation : 24-48h</p>
      <p style="color:#888;font-size:12px;margin:4px 0 0;">Tu recevras un email dès que ton accès est activé.</p>
    </div>
    <a href="https://tradevault-silk.vercel.app" style="display:inline-block;background:#00FF9C;color:#000;font-weight:800;font-size:13px;padding:12px 24px;border-radius:12px;text-decoration:none;">
      Accéder au portail →
    </a>`;
  return sendEmail({ to: email, subject: '✅ TradeVault — Inscription reçue', html: baseTemplate(content, 'Inscription reçue') });
}

// ─── Email 2 : Paiement approuvé (user) ──────────────────────────────────────

export async function sendPaymentApproved(username: string, email: string, expiresAt: string): Promise<boolean> {
  const expDate = new Date(expiresAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const content = `
    <h2 style="color:#00FF9C;font-size:20px;font-weight:800;margin:0 0 8px;">
      Paiement validé 🎉
    </h2>
    <p style="color:#888;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Bonjour <strong style="color:#fff;">${username}</strong>,<br/>
      ton paiement a été approuvé. Ton accès <strong style="color:#00FF9C;">TradeVault PRO</strong> est maintenant actif.
    </p>
    <div style="background:rgba(0,255,156,0.06);border:1px solid rgba(0,255,156,0.2);border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="color:#fff;font-size:13px;margin:0;font-weight:600;">📅 Accès valide jusqu'au ${expDate}</p>
      <p style="color:#888;font-size:12px;margin:4px 0 0;">Journal illimité · Comptes illimités · Statistiques avancées</p>
    </div>
    <a href="https://tradevault-silk.vercel.app" style="display:inline-block;background:#00FF9C;color:#000;font-weight:800;font-size:13px;padding:12px 24px;border-radius:12px;text-decoration:none;">
      Accéder à mon journal →
    </a>`;
  return sendEmail({ to: email, subject: '🎉 TradeVault PRO — Accès activé !', html: baseTemplate(content, 'Paiement validé') });
}

// ─── Email 3 : Paiement rejeté (user) ────────────────────────────────────────

export async function sendPaymentRejected(username: string, email: string, reason?: string): Promise<boolean> {
  const content = `
    <h2 style="color:#ff6b6b;font-size:20px;font-weight:800;margin:0 0 8px;">
      Paiement non validé ❌
    </h2>
    <p style="color:#888;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Bonjour <strong style="color:#fff;">${username}</strong>,<br/>
      ton paiement n'a pas pu être validé.
      ${reason ? `<br/>Motif : <em style="color:#ffa0a0;">${reason}</em>` : ''}
    </p>
    <div style="background:rgba(255,107,107,0.06);border:1px solid rgba(255,107,107,0.2);border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="color:#ffa0a0;font-size:13px;margin:0;font-weight:600;">Que faire ?</p>
      <ul style="color:#888;font-size:12px;margin:8px 0 0;padding-left:16px;line-height:1.8;">
        <li>Vérifier que ta preuve de paiement est lisible</li>
        <li>S'assurer que le montant est correct</li>
        <li>Soumettre une nouvelle demande</li>
      </ul>
    </div>
    <a href="https://tradevault-silk.vercel.app" style="display:inline-block;background:rgba(255,255,255,0.1);color:#fff;font-weight:700;font-size:13px;padding:12px 24px;border-radius:12px;text-decoration:none;border:1px solid rgba(255,255,255,0.15);">
      Soumettre à nouveau →
    </a>`;
  return sendEmail({ to: email, subject: '❌ TradeVault — Paiement non validé', html: baseTemplate(content, 'Paiement rejeté') });
}

// ─── Email 4 : Nouvelle inscription (admin) ───────────────────────────────────

export async function sendAdminNewSignup(username: string, email: string, amount: number, network: string, screenshotUrl?: string): Promise<boolean> {
  const content = `
    <h2 style="color:#FFB347;font-size:20px;font-weight:800;margin:0 0 8px;">
      Nouvelle inscription ⚡
    </h2>
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
      <tr><td style="color:#888;font-size:12px;padding:6px 0;">Utilisateur</td><td style="color:#fff;font-size:13px;font-weight:600;">${username}</td></tr>
      <tr><td style="color:#888;font-size:12px;padding:6px 0;">Email</td><td style="color:#fff;font-size:13px;">${email}</td></tr>
      <tr><td style="color:#888;font-size:12px;padding:6px 0;">Montant</td><td style="color:#00FF9C;font-size:13px;font-weight:700;">${amount} USDT (${network})</td></tr>
    </table>
    ${screenshotUrl ? `<a href="${screenshotUrl}" style="display:inline-block;background:rgba(0,255,156,0.1);color:#00FF9C;font-size:12px;padding:8px 16px;border-radius:8px;text-decoration:none;border:1px solid rgba(0,255,156,0.3);margin-bottom:20px;">📎 Voir la preuve de paiement</a>` : ''}
    <br/>
    <a href="https://tradevault-silk.vercel.app" style="display:inline-block;background:#FFB347;color:#000;font-weight:800;font-size:13px;padding:12px 24px;border-radius:12px;text-decoration:none;">
      Valider dans l'admin →
    </a>`;
  return sendEmail({ to: ADMIN_EMAIL, subject: `⚡ TradeVault — Nouveau compte : ${username}`, html: baseTemplate(content, 'Nouvelle inscription') });
}

// ─── Email 5 : Expiration abonnement (user) ───────────────────────────────────

export async function sendSubscriptionExpiring(username: string, email: string, daysLeft: number): Promise<boolean> {
  const content = `
    <h2 style="color:#FFB347;font-size:20px;font-weight:800;margin:0 0 8px;">
      Ton accès expire bientôt ⏰
    </h2>
    <p style="color:#888;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Bonjour <strong style="color:#fff;">${username}</strong>,<br/>
      ton accès <strong style="color:#00FF9C;">TradeVault PRO</strong> expire dans
      <strong style="color:#FFB347;">${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong>.
    </p>
    <div style="background:rgba(255,179,71,0.06);border:1px solid rgba(255,179,71,0.2);border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="color:#FFB347;font-size:13px;margin:0;font-weight:600;">⚠️ Renouvelle maintenant pour ne pas perdre l'accès</p>
      <p style="color:#888;font-size:12px;margin:4px 0 0;">Tes données et ton historique sont conservés.</p>
    </div>
    <a href="https://tradevault-silk.vercel.app" style="display:inline-block;background:#FFB347;color:#000;font-weight:800;font-size:13px;padding:12px 24px;border-radius:12px;text-decoration:none;">
      Renouveler mon accès →
    </a>`;
  return sendEmail({ to: email, subject: `⏰ TradeVault — Accès expire dans ${daysLeft}j`, html: baseTemplate(content, 'Expiration abonnement') });
}

// ─── Batch : vérifier les expirations ────────────────────────────────────────

export async function checkAndNotifyExpirations(profiles: Array<{ email: string; username: string; premium_expires_at: string | null }>): Promise<void> {
  const now = Date.now();
  for (const p of profiles) {
    if (!p.premium_expires_at) continue;
    const exp     = new Date(p.premium_expires_at).getTime();
    const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    if (daysLeft === 7 || daysLeft === 3 || daysLeft === 1) {
      await sendSubscriptionExpiring(p.username || p.email.split('@')[0], p.email, daysLeft);
    }
  }
}
