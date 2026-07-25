# 🌟 Modèles d'E-mails Premium pour Supabase Auth - TradeVault

Voici les modèles d'e-mails HTML hautement personnalisés, optimisés visuellement pour correspondre à l'identité visuelle sombre, moderne et ultra-professionnelle de **TradeVault** (fond noir abysse, lignes épurées et accents vert néon `#00FF9C`).

Vous pouvez copier et coller ces codes directement dans votre console **Supabase** sous la section :
👉 **Project Dashboard -> Authentication -> Email Templates**

---

## 1. Confirmer l'inscription (Confirm sign up)

### 🎯 Objet (Subject) :
```text
🎯 Activez votre accès de trading sur TradeVault
```

### 💻 Corps HTML (HTML Body) :
```html
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 30px; border: 1px solid #1f2937; border-radius: 20px; background-color: #050505; color: #f3f4f6; box-shadow: 0 20px 40px rgba(0,0,0,0.85);">
  <!-- Logo En-tête -->
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="display: inline-block; padding: 8px 20px; background-color: rgba(0, 255, 156, 0.05); border: 1px solid rgba(0, 255, 156, 0.15); border-radius: 99px;">
      <span style="font-size: 11px; font-weight: bold; letter-spacing: 3px; color: #00FF9C; text-transform: uppercase; font-family: monospace;">TRADEVAULT</span>
    </div>
  </div>

  <h2 style="color: #ffffff; margin-top: 0; font-size: 22px; text-align: center; font-weight: 800; letter-spacing: -0.5px;">Bienvenue parmi les Traders Elite ! ⚡</h2>
  
  <p style="font-size: 14px; line-height: 1.6; color: #9ca3af; text-align: center; margin-bottom: 30px;">
    Merci d'avoir initié votre profil sur la plateforme de suivi TradeVault. Pour activer définitivement votre compte et accéder à votre tableau de bord, veuillez valider votre adresse e-mail.
  </p>

  <!-- Bouton d'action -->
  <div style="text-align: center; margin: 35px 0;">
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #00FF9C; color: #000000; text-decoration: none; padding: 15px 35px; font-size: 13px; font-weight: 900; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 255, 156, 0.35); transition: all 0.2s ease-in-out; text-transform: uppercase; letter-spacing: 0.5px;">
      Confirmer mon Adresse E-mail
    </a>
  </div>

  <div style="background-color: #0f0f10; border: 1px solid #1f2937; padding: 18px; border-radius: 12px; margin-top: 30px;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.6; font-family: monospace;">
      💡 <strong>Lien alternatif :</strong> Si le bouton ne fonctionne pas, copiez-collez l'adresse suivante dans votre navigateur :
      <br/>
      <span style="color: #00FF9C; word-break: break-all; display: block; margin-top: 8px;">{{ .ConfirmationURL }}</span>
    </p>
  </div>

  <hr style="border: none; border-top: 1px solid #1f2937; margin: 35px 0;" />
  
  <!-- Pied de page -->
  <p style="font-size: 11px; color: #6b7280; text-align: center; margin: 0; line-height: 1.6;">
    Des questions ? Écrivez au support à : <a href="mailto:igorrose2003@gmail.com" style="color: #00FF9C; text-decoration: none; font-weight: bold;">igorrose2003@gmail.com</a><br/>
    Si vous n'avez pas initié cette inscription, ignorez ce message en toute sécurité.
  </p>
</div>
```

---

## 2. Inviter un utilisateur (Invite user)

### 🎯 Objet (Subject) :
```text
📨 Invitation privée : Rejoignez l'élite TradeVault
```

### 💻 Corps HTML (HTML Body) :
```html
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 30px; border: 1px solid #1f2937; border-radius: 20px; background-color: #050505; color: #f3f4f6; box-shadow: 0 20px 40px rgba(0,0,0,0.85);">
  <!-- Logo En-tête -->
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="display: inline-block; padding: 8px 20px; background-color: rgba(0, 255, 156, 0.05); border: 1px solid rgba(0, 255, 156, 0.15); border-radius: 99px;">
      <span style="font-size: 11px; font-weight: bold; letter-spacing: 3px; color: #00FF9C; text-transform: uppercase; font-family: monospace;">INVITATION EXCLUSIVE</span>
    </div>
  </div>

  <h2 style="color: #ffffff; margin-top: 0; font-size: 22px; text-align: center; font-weight: 800; letter-spacing: -0.5px;">Accès Trader Privé Activable ! 🎉</h2>
  
  <p style="font-size: 14px; line-height: 1.6; color: #9ca3af; text-align: center; margin-bottom: 30px;">
    L'administrateur de <strong>TradeVault</strong> vous a invité à rejoindre le portail de suivi en tant que Trader VIP. Acceptez simplement cette invitation ci-dessous pour activer vos accès et définir votre mot de passe.
  </p>

  <!-- Bouton d'action -->
  <div style="text-align: center; margin: 35px 0;">
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #00FF9C; color: #000000; text-decoration: none; padding: 15px 35px; font-size: 13px; font-weight: 900; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 255, 156, 0.35); transition: all 0.2s ease-in-out; text-transform: uppercase; letter-spacing: 0.5px;">
      Accepter l'Invitation
    </a>
  </div>

  <div style="background-color: #0f0f10; border: 1px solid #1f2937; padding: 18px; border-radius: 12px; margin-top: 30px;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.6; font-family: monospace;">
      💡 <strong>Note :</strong> Ce lien d'invitation est strictement personnel. Ne le partagez pas pour garantir la sécurité de votre futur portefeuille de trading.
    </p>
  </div>

  <hr style="border: none; border-top: 1px solid #1f2937; margin: 35px 0;" />
  
  <!-- Pied de page -->
  <p style="font-size: 11px; color: #6b7280; text-align: center; margin: 0; line-height: 1.6;">
    Support technique : <a href="mailto:igorrose2003@gmail.com" style="color: #00FF9C; text-decoration: none; font-weight: bold;">igorrose2003@gmail.com</a><br/>
    © 2026 TradeVault — Tous droits réservés.
  </p>
</div>
```

---

## 3. Lien magique ou OTP (Magic link or OTP)

### 🎯 Objet (Subject) :
```text
🔑 Votre code de connexion sécurisé TradeVault
```

### 💻 Corps HTML (HTML Body) :
```html
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 30px; border: 1px solid #1f2937; border-radius: 20px; background-color: #050505; color: #f3f4f6; box-shadow: 0 20px 40px rgba(0,0,0,0.85);">
  <!-- Logo En-tête -->
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="display: inline-block; padding: 8px 20px; background-color: rgba(0, 255, 156, 0.05); border: 1px solid rgba(0, 255, 156, 0.15); border-radius: 99px;">
      <span style="font-size: 11px; font-weight: bold; letter-spacing: 3px; color: #00FF9C; text-transform: uppercase; font-family: monospace;">CONNEXION INSTANTANÉE</span>
    </div>
  </div>

  <h2 style="color: #ffffff; margin-top: 0; font-size: 22px; text-align: center; font-weight: 800; letter-spacing: -0.5px;">Accès Sécurisé ⚡</h2>
  
  <p style="font-size: 14px; line-height: 1.6; color: #9ca3af; text-align: center; margin-bottom: 24px;">
    Pour vous connecter de manière sécurisée et rapide, veuillez utiliser le code OTP unique à 6 chiffres ci-dessous :
  </p>

  <!-- Zone de Code OTP -->
  <div style="background-color: #0a0b0d; border: 1.5px dashed #00FF9C; padding: 22px; border-radius: 14px; text-align: center; margin: 30px 0;">
    <span style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #00FF9C; font-family: 'Courier New', Courier, monospace;">{{ .Token }}</span>
    <p style="font-size: 11px; color: #6b7280; margin: 8px 0 0 0; text-transform: uppercase; letter-spacing: 1.5px; font-weight: bold;">Saisissez ce code unique d'accès</p>
  </div>

  <div style="text-align: center; margin: 25px 0;">
    <p style="font-size: 13px; color: #9ca3af; margin-bottom: 12px;">Ou cliquez directement sur la connexion sans mot de passe :</p>
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 26px; font-size: 12px; font-weight: bold; border-radius: 10px; border: 1px solid #1f2937; transition: all 0.2s;">
      Connexion en un clic
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #1f2937; margin: 35px 0;" />
  
  <!-- Pied de page -->
  <p style="font-size: 11px; color: #6b7280; text-align: center; margin: 0; line-height: 1.6;">
    Ce code temporaire à usage unique expirera dans 15 minutes.<br/>
    Besoin d'aide ? Contactez notre administrateur : <a href="mailto:igorrose2003@gmail.com" style="color: #00FF9C; text-decoration: none;">igorrose2003@gmail.com</a>
  </p>
</div>
```

---

## 4. Changer d'adresse e-mail (Change email address)

### 🎯 Objet (Subject) :
```text
🔄 Validez votre nouvelle adresse e-mail sur TradeVault
```

### 💻 Corps HTML (HTML Body) :
```html
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 30px; border: 1px solid #1f2937; border-radius: 20px; background-color: #050505; color: #f3f4f6; box-shadow: 0 20px 40px rgba(0,0,0,0.85);">
  <!-- Logo En-tête -->
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="display: inline-block; padding: 8px 20px; background-color: rgba(0, 255, 156, 0.05); border: 1px solid rgba(0, 255, 156, 0.15); border-radius: 99px;">
      <span style="font-size: 11px; font-weight: bold; letter-spacing: 3px; color: #00FF9C; text-transform: uppercase; font-family: monospace;">SÉCURITÉ DU COMPTE</span>
    </div>
  </div>

  <h2 style="color: #ffffff; margin-top: 0; font-size: 22px; text-align: center; font-weight: 800; letter-spacing: -0.5px;">Changement de Courriel d'Accès d'Élite 🔄</h2>
  
  <p style="font-size: 14px; line-height: 1.6; color: #9ca3af; text-align: center; margin-bottom: 30px;">
    Vous avez initié un changement d'adresse de connexion pour votre portefeuille utilisateur. Veuillez confirmer cette modification afin que votre compte TradeVault reste accessible en toute sécurité.
  </p>

  <!-- Bouton d'action -->
  <div style="text-align: center; margin: 35px 0;">
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #00FF9C; color: #000000; text-decoration: none; padding: 15px 35px; font-size: 13px; font-weight: 900; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 255, 156, 0.35); transition: all 0.2s ease-in-out; text-transform: uppercase; letter-spacing: 0.5px;">
      Valider cette Nouvelle Adresse
    </a>
  </div>

  <div style="background-color: #0f0f10; border: 1px solid #1f2937; padding: 18px; border-radius: 12px; margin-top: 30px;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.6; font-family: monospace;">
      ⚠️ <strong>Attention :</strong> Tant que vous ne validez pas ce changement via l'ancien et le nouvel e-mail (selon vos paramètres de double confirmation), votre ancienne boîte de réception recevra toujours vos notifications TradeVault.
    </p>
  </div>

  <hr style="border: none; border-top: 1px solid #1f2937; margin: 35px 0;" />
  
  <!-- Pied de page -->
  <p style="font-size: 11px; color: #6b7280; text-align: center; margin: 0; line-height: 1.6;">
    Une question ou un doute ? Contactez immédiatement <a href="mailto:igorrose2003@gmail.com" style="color: #00FF9C; text-decoration: none;">igorrose2003@gmail.com</a>
  </p>
</div>
```

---

## 5. Réinitialiser le mot de passe (Reset password)

### 🎯 Objet (Subject) :
```text
🔒 Réinitialisation de votre mot de passe TradeVault
```

### 💻 Corps HTML (HTML Body) :
```html
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 30px; border: 1px solid #1f2937; border-radius: 20px; background-color: #050505; color: #f3f4f6; box-shadow: 0 20px 40px rgba(0,0,0,0.85);">
  <!-- Logo En-tête -->
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="display: inline-block; padding: 8px 20px; background-color: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 99px;">
      <span style="font-size: 11px; font-weight: bold; letter-spacing: 2px; color: #ef4444; text-transform: uppercase; font-family: monospace;">SÉCURITÉ CRITIQUE</span>
    </div>
  </div>

  <h2 style="color: #ffffff; margin-top: 0; font-size: 22px; text-align: center; font-weight: 800; letter-spacing: -0.5px;">Demande de Récupération 🔒</h2>
  
  <p style="font-size: 14px; line-height: 1.6; color: #9ca3af; text-align: center; margin-bottom: 30px;">
    Une demande de réinitialisation de votre mot de passe d'accès sécurisé à TradeVault a été initiée. Pour enregistrer votre nouvelle clé de sécurité, veuillez poursuivre avec le lien ci-dessous.
  </p>

  <!-- Bouton d'action -->
  <div style="text-align: center; margin: 35px 0;">
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 15px 35px; font-size: 13px; font-weight: 900; border-radius: 12px; box-shadow: 0 4px 20px rgba(239, 68, 68, 0.35); transition: all 0.2s; text-transform: uppercase;">
      Changer de Mot de passe
    </a>
  </div>

  <div style="background-color: #0f0f10; border: 1px solid #1f2937; padding: 18px; border-radius: 12px; margin-top: 30px;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.6; font-family: monospace;">
      🛡️ <strong>Note de sécurité :</strong> Si vous n'avez pas demandé ce changement de clé d'accès sécurisé, veuillez ignorer cet e-mail. Vos identifiants resteront totalement intacts et sécurisés.
    </p>
  </div>

  <hr style="border: none; border-top: 1px solid #1f2937; margin: 35px 0;" />
  
  <!-- Pied de page -->
  <p style="font-size: 11px; color: #6b7280; text-align: center; margin: 0; line-height: 1.6;">
    TradeVault SecOps — Support actif à : <a href="mailto:igorrose2003@gmail.com" style="color: #ef4444; text-decoration: none; font-weight: bold;">igorrose2003@gmail.com</a>
  </p>
</div>
```

---

## 6. Réauthentification (Reauthentication)

### 🎯 Objet (Subject) :
```text
🛡️ Code de sécurité pour votre opération sensible TradeVault
```

### 💻 Corps HTML (HTML Body) :
```html
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 30px; border: 1px solid #1f2937; border-radius: 20px; background-color: #050505; color: #f3f4f6; box-shadow: 0 20px 40px rgba(0,0,0,0.85);">
  <!-- Logo En-tête -->
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="display: inline-block; padding: 8px 20px; background-color: rgba(0, 255, 156, 0.05); border: 1px solid rgba(0, 255, 156, 0.15); border-radius: 99px;">
      <span style="font-size: 11px; font-weight: bold; letter-spacing: 3px; color: #00FF9C; text-transform: uppercase; font-family: monospace;">RÉAUTHENTIFICATION RECONNAISSANCE</span>
    </div>
  </div>

  <h2 style="color: #ffffff; margin-top: 0; font-size: 22px; text-align: center; font-weight: 800; letter-spacing: -0.5px;">Confirmez Votre Identité 🛡️</h2>
  
  <p style="font-size: 14px; line-height: 1.6; color: #9ca3af; text-align: center; margin-bottom: 24px;">
    Vous tentez d'effectuer une opération sensible (changement de profil, suppression ou modification critique de paramètre de compte). Veuillez entrer le code de validation de sécurité suivant :
  </p>

  <!-- Zone de Code OTP -->
  <div style="background-color: #0a0b0d; border: 1.5px dashed #00FF9C; padding: 22px; border-radius: 14px; text-align: center; margin: 30px 0;">
    <span style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #00FF9C; font-family: 'Courier New', Courier, monospace;">{{ .Token }}</span>
    <p style="font-size: 11px; color: #6b7280; margin: 8px 0 0 0; text-transform: uppercase; letter-spacing: 1.5px; font-weight: bold;">Saisissez ce code temporaire</p>
  </div>

  <hr style="border: none; border-top: 1px solid #1f2937; margin: 35px 0;" />
  
  <!-- Pied de page -->
  <p style="font-size: 11px; color: #6b7280; text-align: center; margin: 0; line-height: 1.6;">
    Ce code temporaire n'est valable que pour 15 minutes.<br/>
    Si vous n'êtes pas à l'origine de cette action administrative, sécurisez immédiatement votre mot de passe ou contactez-nous : <a href="mailto:igorrose2003@gmail.com" style="color: #00FF9C; text-decoration: none;">igorrose2003@gmail.com</a>
  </p>
</div>
```
