-- Copiez-collez ce code dans l'éditeur SQL de votre dashboard Supabase (SQL Editor) et cliquez sur "Run".
-- Migration pour ajouter les colonnes manquantes identifiées lors du débogage

-- 1. Ajout des colonnes manquantes à la table profiles pour le suivi des emails
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_expired_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS email_reminder_at TIMESTAMP WITH TIME ZONE;

-- 2. Ajout des colonnes manquantes à la table admin_settings pour la configuration complète
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS ftmo_profit_target INTEGER DEFAULT 10,  -- Pour cent (ex: 10 = 10%)
  ADD COLUMN IF NOT EXISTS ftmo_daily_loss NUMERIC DEFAULT 5.0,   -- Pour cent (ex: 5.0 = 5%)
  ADD COLUMN IF NOT EXISTS ftmo_max_loss NUMERIC DEFAULT 10.0,    -- Pour cent (ex: 10.0 = 10%)
  ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS support_email TEXT DEFAULT 'support@tradevault.example.com';

-- 3. Standardisation de la durée d'abonnement : suppression de subscription_duration_days
--    et utilisation de subscription_duration_months (plus intuitif)
-- Note : Si subscription_duration_days existe déjà suite à la migration initiale,
--        nous la conservons mais ne l'utilisons pas dans le code pour éviter les conflits
--        Dans un futur nettoyage, cette colonne pourrait être supprimée après migration des données

-- 4. Mise à jour de la documentation du statut subscription_status pour inclure 'expired'
--    (Cette mise à jour est documentaire uniquement - aucun changement de schéma requis)
COMMENT ON COLUMN public.profiles.subscription_status IS
  '''pending' | 'premium_active' | 'expired' | 'blocked'';

-- 5. Insertion des valeurs par défaut pour les nouvelles colonnes si la ligne admin_settings n'existe pas encore
INSERT INTO public.admin_settings (id, notification_emails, usdt_trc20_address, usdt_bep20_address,
                                 subscription_price, subscription_duration_months,
                                 ftmo_profit_target, ftmo_daily_loss, ftmo_max_loss,
                                 maintenance_mode, support_email, updated_at)
VALUES (1, 'igorrose2003@gmail.com,toshirohitsugayaonyx@gmail.com', 'TN2YxKp9vR3mHqL7bF8cD2eA5wJ6sT4uV',
        '0x7a3B5c9D2eF1a4B6c8D0e2F4a6B8c0D2e4F6a8B0', 30, 3, 10, 5.0, 10.0,
        false, 'support@tradevault.example.com', timezone('utc'::text, now()))
ON CONFLICT (id) DO UPDATE SET
  ftmo_profit_target = EXCLUDED.ftmo_profit_target,
  ftmo_daily_loss = EXCLUDED.ftmo_daily_loss,
  ftmo_max_loss = EXCLUDED.ftmo_max_loss,
  maintenance_mode = EXCLUDED.maintenance_mode,
  support_email = EXCLUDED.support_email,
  updated_at = timezone('utc'::text, now());