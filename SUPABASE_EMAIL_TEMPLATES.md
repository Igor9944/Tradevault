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
    Merci d'avoir initié votre inscription sur TradeVault Pro. Pour valider définitivement votre compte trader et débloquer vos accès, veuillez confirmer votre adresse e-mail.
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
