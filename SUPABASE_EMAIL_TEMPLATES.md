# 🌟 Modèles d'E-mails Premium pour Supabase Auth - TradeVault Pro

Voici les modèles d'e-mails HTML hautement personnalisés et optimisés visuellement pour correspondre à l'identité visuelle sombre, moderne et ultra-professionnelle de **TradeVault Pro**.

Vous pouvez copier et coller ces codes directement dans votre console **Supabase** sous :
👉 **Project Dashboard -> Authentication -> Email Templates**

---

## 1. Confirmer l'inscription (Confirm Sign Up)

### Sujet (Subject) :
```text
🎯 Activez votre accès de trading sur TradeVault Pro
```

### Corps HTML (HTML Body) :
```html
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #1e293b; border-radius: 16px; background-color: #0b0f19; color: #f1f5f9; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
  <!-- En-tête -->
  <div style="text-align: center; margin-bottom: 25px;">
    <div style="display: inline-block; padding: 8px 16px; background-color: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 99px;">
      <span style="font-size: 11px; font-weight: bold; letter-spacing: 2px; color: #6366f1; text-transform: uppercase;">TRADEVAULT PRO</span>
    </div>
  </div>

  <h2 style="color: #ffffff; margin-top: 0; font-size: 22px; text-align: center; font-weight: 800; letter-spacing: -0.5px;">Bienvenue dans l'Élite du Trading ! ⚡</h2>
  
  <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; text-align: center; margin-bottom: 24px;">
    Bienvenue {{user_name}}, merci d'avoir initié votre inscription sur TradeVault Pro. Pour valider définitivement votre compte trader et débloquer vos accès, veuillez confirmer votre adresse e-mail.
  </p>

  <!-- Bouton d'action -->
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 13px; font-weight: bold; border-radius: 12px; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4); transition: all 0.2s ease-in-out;">
      Confirmer mon Adresse E-mail
    </a>
  </div>

  <div style="background-color: #151c2c; border: 1px solid #1e293b; padding: 15px; border-radius: 12px; margin-top: 25px;">
    <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5;">
      💡 **Lien alternatif :** Si le bouton ne fonctionne pas, copiez-collez l'adresse suivante dans votre navigateur :
      <br/>
      <span style="color: #6366f1; font-family: monospace; word-break: break-all;">{{ .ConfirmationURL }}</span>
    </p>
  </div>

  <hr style="border: none; border-top: 1px solid #1e293b; margin: 30px 0;" />
  <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0; line-height: 1.5;">
    Cet e-mail est destiné exclusivement à la confirmation de votre adresse de connexion. Si vous n'avez pas initié cette demande, veuillez ignorer ce message en toute sécurité.
  </p>
</div>
```

---

## 2. Réinitialiser le mot de passe (Reset Password)

### Sujet (Subject) :
```text
🔒 Réinitialisez votre mot de passe TradeVault Pro
```

### Corps HTML (HTML Body) :
```html
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #1e293b; border-radius: 16px; background-color: #0b0f19; color: #f1f5f9; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
  <!-- En-tête -->
  <div style="text-align: center; margin-bottom: 25px;">
    <div style="display: inline-block; padding: 8px 16px; background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 99px;">
      <span style="font-size: 11px; font-weight: bold; letter-spacing: 2px; color: #ef4444; text-transform: uppercase;">SÉCURITÉ</span>
    </div>
  </div>

  <h2 style="color: #ffffff; margin-top: 0; font-size: 22px; text-align: center; font-weight: 800; letter-spacing: -0.5px;">Demande de Réinitialisation 🔒</h2>
  
  <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; text-align: center; margin-bottom: 24px;">
    Vous avez demandé de réinitialiser le mot de passe de votre compte de trading TradeVault Pro. Cliquez sur le lien sécurisé ci-dessous pour choisir votre nouveau mot de passe.
  </p>

  <!-- Bouton d'action -->
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 13px; font-weight: bold; border-radius: 12px; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3); transition: all 0.2s; font-family: sans-serif;">
      Définir un Nouveau Mot de Passe
    </a>
  </div>

  <div style="background-color: #151c2c; border: 1px solid #1e293b; padding: 15px; border-radius: 12px; margin-top: 25px;">
    <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5;">
      🛡️ **Note de sécurité :** Ce lien de réinitialisation expirera à court terme. Si vous n'êtes pas à l'origine de cette demande, contactez immédiatement notre équipe d'administration.
    </p>
  </div>

  <hr style="border: none; border-top: 1px solid #1e293b; margin: 30px 0;" />
  <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0; line-height: 1.5;">
    Propulsé en toute sécurité par la suite technique TradeVault Pro.
  </p>
</div>
```

---

## 3. Lien magique ou OTP (Magic Link / OTP)

### Sujet (Subject) :
```text
🔑 Code de connexion sécurisé TradeVault Pro
```

### Corps HTML (HTML Body) :
```html
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #1e293b; border-radius: 16px; background-color: #0b0f19; color: #f1f5f9; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
  <!-- En-tête -->
  <div style="text-align: center; margin-bottom: 25px;">
    <div style="display: inline-block; padding: 8px 16px; background-color: rgba(0, 255, 156, 0.1); border: 1px solid rgba(0, 255, 156, 0.2); border-radius: 99px;">
      <span style="font-size: 11px; font-weight: bold; letter-spacing: 2px; color: #00ff9c; text-transform: uppercase;">CONNEXION UNIQUE</span>
    </div>
  </div>

  <h2 style="color: #ffffff; margin-top: 0; font-size: 22px; text-align: center; font-weight: 800; letter-spacing: -0.5px;">Accès Instantané ⚡</h2>
  
  <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; text-align: center; margin-bottom: 24px;">
    Utilisez le lien magique ou saisissez le code OTP à usage unique ci-dessous pour accéder directement à votre espace de trading TradeVault :
  </p>

  <!-- Bloc de Code OTP -->
  <div style="background-color: #151c2c; border: 1.5px dashed #00ff9c; padding: 18px; border-radius: 12px; text-align: center; margin: 25px 0;">
    <span style="font-size: 36px; font-weight: 900; letter-spacing: 6px; color: #00ff9c; font-family: 'Courier New', monospace;">{{ .Token }}</span>
    <p style="font-size: 11px; color: #64748b; margin: 8px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Saisissez ce code de vérification</p>
  </div>

  <div style="text-align: center; margin: 25px 0;">
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #1e293b; color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 13px; font-weight: bold; border-radius: 10px; border: 1px solid #334155; transition: all 0.2s;">
      Ou cliquez ici pour vous connecter directement
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #1e293b; margin: 30px 0;" />
  <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0; line-height: 1.5;">
    Ce code temporaire n'est valable que pour une durée de 15 minutes.
  </p>
</div>
```

---

## 4. Changement d'adresse e-mail (Change Email)

### Sujet (Subject) :
```text
🔄 Confirmation du changement d'adresse e-mail
```

### Corps HTML (HTML Body) :
```html
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #1e293b; border-radius: 16px; background-color: #0b0f19; color: #f1f5f9; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
  <!-- En-tête -->
  <div style="text-align: center; margin-bottom: 25px;">
    <div style="display: inline-block; padding: 8px 16px; background-color: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 99px;">
      <span style="font-size: 11px; font-weight: bold; letter-spacing: 2px; color: #6366f1; text-transform: uppercase;">MAINTENANCE COMPTE</span>
    </div>
  </div>

  <h2 style="color: #ffffff; margin-top: 0; font-size: 22px; text-align: center; font-weight: 800; letter-spacing: -0.5px;">Changement d'E-mail 🔄</h2>
  
  <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; text-align: center; margin-bottom: 24px;">
    Une demande de changement d'adresse e-mail pour votre compte TradeVault Pro a été initiée. Veuillez confirmer votre nouvelle adresse de connexion en cliquant ci-dessous.
  </p>

  <!-- Bouton d'action -->
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 13px; font-weight: bold; border-radius: 12px; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3); transition: all 0.2s;">
      Confirmer mon Nouvel E-mail
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #1e293b; margin: 30px 0;" />
  <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0; line-height: 1.5;">
    Vos paramètres de sécurité ne seront mis à jour qu'une fois la confirmation complétée.
  </p>
</div>
```

---

## 5. Invitation d'utilisateur (Invite User)

### Sujet (Subject) :
```text
📨 Vous êtes invité à rejoindre TradeVault Pro
```

### Corps HTML (HTML Body) :
```html
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #1e293b; border-radius: 16px; background-color: #0b0f19; color: #f1f5f9; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
  <!-- En-tête -->
  <div style="text-align: center; margin-bottom: 25px;">
    <div style="display: inline-block; padding: 8px 16px; background-color: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 99px;">
      <span style="font-size: 11px; font-weight: bold; letter-spacing: 2px; color: #6366f1; text-transform: uppercase;">INVITATION EXCLUSIVE</span>
    </div>
  </div>

  <h2 style="color: #ffffff; margin-top: 0; font-size: 22px; text-align: center; font-weight: 800; letter-spacing: -0.5px;">Invitation exclusive reçue ! 🎉</h2>
  
  <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; text-align: center; margin-bottom: 24px;">
    L'administrateur de TradeVault Pro vous a invité à rejoindre le portail d'investissement privé en tant que Trader VIP. Acceptez simplement cette invitation pour configurer vos informations d'accès.
  </p>

  <!-- Bouton d'action -->
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 13px; font-weight: bold; border-radius: 12px; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4); transition: all 0.2s;">
      Accepter l'Invitation
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #1e293b; margin: 30px 0;" />
  <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0; line-height: 1.5;">
    Bienvenue à bord !
  </p>
</div>
```

---

## 6. Demande d'inscription en attente (Custom Template pour l'Edge Function "send-email")

Comme Supabase n'envoie par défaut que des e-mails d'authentification, les e-mails transactionnels (comme cet e-mail de confirmation d'attente lors de l'upload de preuve de paiement) doivent être gérés via une **Supabase Edge Function** appelée `send-email`.

### Sujet (Subject) :
```text
⏳ Votre demande d'inscription premium TradeVault est en cours de traitement
```

### Corps HTML (HTML Body) :
```html
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Demande en cours — TradeVault</title>
</head>
<body style="margin:0;padding:0;background-color:#0d1117;font-family:'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d1117;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-collapse:collapse;">

      <!-- HEADER -->
      <tr>
        <td style="background:linear-gradient(135deg,#0a1628,#0d2137);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;border-bottom:2px solid #00c896;">
          <div style="color:#00c896;font-size:24px;font-weight:700;letter-spacing:3px;font-family:'Trebuchet MS',sans-serif;">TRADEVAULT</div>
          <div style="color:#4a9ebe;font-size:10px;letter-spacing:3px;margin-top:4px;font-family:monospace;text-transform:uppercase;">GLOBAL FINANCIAL SERVICES</div>
        </td>
      </tr>

      <!-- BADGE -->
      <tr>
        <td style="background:#0d1f2d;padding:24px 40px 0;text-align:center;">
          <div style="background:rgba(245,158,11,0.15);color:#f59e0b;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:8px 20px;display:inline-block;border:1px solid rgba(245,158,11,0.3);border-radius:20px;font-family:monospace;">
            ⏳ Demande en cours de vérification
          </div>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td style="background:#0d1f2d;padding:24px 40px 36px;">

          <!-- Icône centrale -->
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;width:72px;height:72px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:50%;line-height:72px;font-size:32px;text-align:center;box-shadow:0 8px 24px rgba(245,158,11,0.25);">⏳</div>
          </div>

          <p style="color:#8b9db5;font-size:14px;margin:0 0 6px;font-family:sans-serif;">Bonjour <strong style="color:#e0eaf5;">{{user_name}}</strong>,</p>

          <p style="color:#c8d8e8;font-size:16px;font-weight:600;margin:0 0 16px;font-family:sans-serif;">
            Votre demande d'inscription a bien été reçue !
          </p>

          <p style="color:#8b9db5;font-size:14px;line-height:1.8;margin:0 0 28px;font-family:sans-serif;">
            Nous avons bien reçu votre preuve de paiement. Notre équipe va vérifier votre dossier et activer vos accès de trading premium sous les <strong style="color:#f59e0b;">5 prochaines minutes</strong>.
          </p>

          <!-- Status box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1628;border-radius:12px;border:1px solid rgba(245,158,11,0.15);margin-bottom:28px;border-collapse:collapse;">
            <tr>
              <td style="padding:20px 24px;">

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #1a3040;">
                      <span style="color:#4a9ebe;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-family:monospace;">Statut</span>
                      <span style="float:right;background:rgba(245,158,11,0.1);color:#f59e0b;font-size:11px;font-weight:600;padding:3px 12px;border-radius:20px;border:1px solid rgba(245,158,11,0.25);font-family:monospace;">⏳ En attente</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #1a3040;">
                      <span style="color:#4a9ebe;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-family:monospace;">Email enregistré</span>
                      <span style="float:right;color:#e0eaf5;font-size:13px;font-family:sans-serif;">{{user_email}}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;">
                      <span style="color:#4a9ebe;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-family:monospace;">Délai estimé</span>
                      <span style="float:right;color:#00c896;font-size:13px;font-weight:600;font-family:sans-serif;">~5 minutes</span>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>
          </table>

          <!-- Message étapes -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1e12;border-radius:12px;border:1px solid rgba(0,200,150,0.15);margin-bottom:28px;border-collapse:collapse;">
            <tr>
              <td style="padding:18px 24px;">
                <p style="color:#00c896;font-size:13px;font-weight:700;margin:0 0 8px;font-family:sans-serif;text-transform:uppercase;letter-spacing:1px;">📋 Prochaines étapes</p>
                <div style="color:#6a9a7a;font-size:13px;line-height:1.8;font-family:sans-serif;">
                  1️⃣ Audit de la capture de paiement envoyée par notre système.<br>
                  2️⃣ Validation et activation de votre compte par l'administration.<br>
                  3️⃣ Réception d'un e-mail de confirmation d'accès.<br>
                  4️⃣ Connexion instantanée sur votre espace de trading.
                </div>
              </td>
            </tr>
          </table>

          <p style="color:#4a6080;font-size:13px;line-height:1.6;text-align:center;margin:0;font-family:sans-serif;">
            Des questions ou besoin d'assistance ? Contactez-nous à :<br>
            <a href="mailto:tradonyx@vault.com" style="color:#00c896;text-decoration:none;font-weight:bold;">tradonyx@vault.com</a>
          </p>

        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#080e18;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;border-top:1px solid #1a3040;">
          <p style="color:#3a5068;font-size:12px;margin:0 0 4px;font-family:sans-serif;">TradeVault Global Financial Services</p>
          <p style="color:#2a3848;font-size:11px;margin:0;font-family:sans-serif;">© 2026 TradeVault — Cet e-mail est généré automatiquement par nos services.</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>
```

---

## 🎯 Comment intégrer ce modèle dans votre Supabase ?

Dans Supabase, vous disposez de deux moyens simples pour configurer et envoyer cet e-mail transactionnel de manière automatisée :

### Méthode A : Via une Edge Function Supabase (Recommandé)

1. **Création de la fonction** :
   Créez une Edge Function nommée `send-email` dans votre console Supabase ou via la CLI :
   ```bash
   supabase functions new send-email
   ```

2. **Écriture du code de la fonction (Resend ou autre service SMTP)** :
   Utilisez un service d'envoi d'e-mail gratuit comme **Resend** ou votre propre relais SMTP. Voici le code à implémenter :
   ```typescript
   import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

   const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

   serve(async (req) => {
     if (req.method === 'OPTIONS') {
       return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
     }

     const { type, user, paymentProof } = await req.json()

     if (type === 'new_user') {
       // Définir le code HTML ci-dessus en remplaçant les valeurs dynamiques :
       let html = `... METTRE LE CODE HTML DU MODÈLE CI-DESSUS ...`
       html = html.replace('{{user_name}}', user.name)
       html = html.replace('{{user_email}}', user.email)

       // 1. Envoi de l'e-mail de confirmation au Trader
       await fetch('https://api.resend.com/emails', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${RESEND_API_KEY}`
         },
         body: JSON.stringify({
           from: 'TradeVault Pro <noreply@tradevaultpro.com>',
           to: [user.email],
           subject: '⏳ Votre demande d\'inscription premium TradeVault est en cours',
           html: html
         })
       })

       // 2. Envoi de l'alerte à l'Admin avec preuve de paiement
       await fetch('https://api.resend.com/emails', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${RESEND_API_KEY}`
         },
         body: JSON.stringify({
           from: 'System TradeVault <system@tradevaultpro.com>',
           to: ['tradonyx@vault.com'],
           subject: `🚨 Nouvelle preuve d'abonnement : ${user.name}`,
           html: `<p>Un nouveau trader s'est inscrit : <strong>${user.name}</strong> (${user.email})</p>
                  <p>Preuve jointe : <a href="${paymentProof}">${paymentProof}</a></p>`
         })
       })
     }

     return new Response(JSON.stringify({ success: true }), {
       headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
     })
   })
   ```

### Méthode B : Via les Webhooks de Base de Données Supabase (Database Webhooks)

Supabase permet de déclencher l'envoi d'e-mails à chaque fois qu'une nouvelle ligne est créée dans la table `profiles` ou `payments` avec le statut `pending` :
1. Allez dans **Database -> Webhooks** dans votre console Supabase.
2. Créez un Webhook déclenché lors d'une opération `INSERT` sur la table `profiles`.
---

## 7. E-mail de bienvenue après approbation (Account Approved)

### Sujet (Subject) :
```text
🚀 Bienvenue au TradeVault — Accès Premium Activé
```

### Corps HTML (HTML Body) :
```html
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bienvenue Premium — TradeVault</title>
</head>
<body style="margin:0;padding:0;background-color:#0d1117;font-family:'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d1117;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-collapse:collapse;">

      <!-- HEADER -->
      <tr>
        <td style="background:linear-gradient(135deg,#0a1628,#0d2137);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;border-bottom:2px solid #00c896;">
          <div style="color:#00c896;font-size:24px;font-weight:700;letter-spacing:3px;font-family:'Trebuchet MS',sans-serif;">TRADEVAULT</div>
          <div style="color:#4a9ebe;font-size:10px;letter-spacing:3px;margin-top:4px;font-family:monospace;text-transform:uppercase;">GLOBAL FINANCIAL SERVICES</div>
        </td>
      </tr>

      <!-- BADGE -->
      <tr>
        <td style="background:#0d1f2d;padding:24px 40px 0;text-align:center;">
          <div style="background:rgba(0,200,150,0.15);color:#00c896;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:8px 20px;display:inline-block;border:1px solid rgba(0,200,150,0.3);border-radius:20px;font-family:monospace;">
            🚀 Accès Premium Activé
          </div>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td style="background:#0d1f2d;padding:24px 40px 36px;">

          <!-- Icône centrale -->
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;width:72px;height:72px;background:linear-gradient(135deg,#00c896,#007f5f);border-radius:50%;line-height:72px;font-size:32px;text-align:center;box-shadow:0 8px 24px rgba(0,200,150,0.25);">🎉</div>
          </div>

          <p style="color:#8b9db5;font-size:14px;margin:0 0 6px;font-family:sans-serif;">Bonjour <strong style="color:#e0eaf5;">{{user_name}}</strong>,</p>

          <p style="color:#c8d8e8;font-size:18px;font-weight:600;margin:0 0 16px;font-family:sans-serif;">
            Bienvenue dans le cercle restreint de TradeVault !
          </p>

          <p style="color:#8b9db5;font-size:14px;line-height:1.8;margin:0 0 28px;font-family:sans-serif;">
            Nous avons le plaisir de vous informer que votre compte a été approuvé avec succès. Vous bénéficiez désormais d'un accès total à notre plateforme de trading premium.
          </p>

          <!-- Action Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td align="center">
                <a href="{{platform_url}}" style="background:#00c896;color:#0d1117;font-size:14px;font-weight:700;text-decoration:none;padding:16px 32px;border-radius:8px;display:inline-block;letter-spacing:1px;font-family:sans-serif;">
                  COMMENCER À TRADER MAINTENANT
                </a>
              </td>
            </tr>
          </table>

          <!-- Support Note -->
          <p style="color:#4a6080;font-size:13px;line-height:1.6;text-align:center;margin:0;font-family:sans-serif;">
            Des questions ou besoin d'assistance ? Contactez-nous à :<br>
            <a href="mailto:tradonyx@vault.com" style="color:#00c896;text-decoration:none;font-weight:bold;">tradonyx@vault.com</a>
          </p>

        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#080e18;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;border-top:1px solid #1a3040;">
          <p style="color:#3a5068;font-size:12px;margin:0 0 4px;font-family:sans-serif;">TradeVault Global Financial Services</p>
          <p style="color:#2a3848;font-size:11px;margin:0;font-family:sans-serif;">© 2026 TradeVault — Accès sécurisé et restreint.</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>
```

### 🧠 Logique de déclenchement :
Intégrez cet envoi dans votre `Edge Function send-email` ou votre déclencheur SQL (trigger) :
```typescript
if (type === 'account_approved') {
  // Remplacer {{user_name}} par user.name
  // Remplacer {{platform_url}} par 'https://traderpr0.netlify.app'
  // Envoyer via Resend / SMTP
}
```

