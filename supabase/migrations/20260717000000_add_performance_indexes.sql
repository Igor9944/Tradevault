-- Copiez-collez ce code dans l'éditeur SQL de votre dashboard Supabase (SQL Editor) et cliquez sur "Run".
-- Migration pour ajouter des index de performance supplémentaires

-- 1. Index composés pour les trades (optimiser les requêtes avec filtres et tri)
-- Pour les requêtes utilsant user_id + account_id + ordre par trade_date/created_at
CREATE INDEX IF NOT EXISTS idx_trades_user_account_date ON public.trades(user_id, account_id, trade_date DESC, created_at DESC);

-- Index pour les requêtes par user_id seul avec tri
CREATE INDEX IF NOT EXISTS idx_trades_user_date ON public.trades(user_id, trade_date DESC, created_at DESC);

-- Index pour les requêtes par account_id seul avec tri
CREATE INDEX IF NOT EXISTS idx_trades_account_date ON public.trades(account_id, trade_date DESC, created_at DESC);

-- 2. Index composés pour trading_accounts (optimiser les requêtes avec filtres)
-- Pour les requêtes utilsant user_id + is_active + ordre par created_at
CREATE INDEX IF NOT EXISTS idx_trading_accounts_user_active ON public.trading_accounts(user_id, is_active, created_at);

-- Index pour is_active seul (utile pour filtrer les comptes actifs)
CREATE INDEX IF NOT EXISTS idx_trading_accounts_active ON public.trading_accounts(is_active);

-- 3. Index composés pour payment_requests (optimiser les requêtes admin)
-- Pour les requêtes utilsant status + type + ordre par created_at
CREATE INDEX IF NOT EXISTS idx_payment_requests_status_type ON public.payment_requests(status, type, created_at DESC);

-- Index pour les requêtes par user_id avec statut
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_status ON public.payment_requests(user_id, status, created_at DESC);

-- 4. Index composés pour profiles (optimiser les requêtes admin)
-- Pour les requêtes utilsant role + subscription_status + ordre par created_at
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles(role, subscription_status, created_at DESC);

-- Index pour les recherches d'email (déjà présent mais on renforce)
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles(LOWER(email));

-- 5. Index pour la fonction is_admin (si elle n'est pas déjà optimisée)
-- Cette fonction cherche par id = auth.uid() AND role = 'admin'
-- Comme id est déjà la clé primaire, cet index n'est probablement pas nécessaire
-- mais on peut ajouter un index sur role pour accélérer les recherches par rôle
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 6. Index pour les challenges (optimiser les requêtes utilisateur)
CREATE INDEX IF NOT EXISTS idx_challenges_user_active ON public.challenges(user_id, challenge_status);

COMMENT ON INDEX public.idx_trades_user_account_date IS 'Index composite pour optimiser les requêtes de trades par utilisateur et compte avec tri par date';
COMMENT ON INDEX public.idx_trades_user_date IS 'Index composite pour optimiser les requêtes de trades par utilisateur avec tri par date';
COMMENT ON INDEX public.idx_trades_account_date IS 'Index composite pour optimiser les requêtes de trades par compte avec tri par date';
COMMENT ON INDEX public.idx_trading_accounts_user_active IS 'Index composite pour optimiser les requêtes de comptes par utilisateur et statut actif';
COMMENT ON INDEX public.idx_trading_accounts_active IS 'Index pour accélérer le filtrage des comptes actifs';
COMMENT ON INDEX public.idx_payment_requests_status_type IS 'Index composite pour optimiser les requêtes de paiements par statut et type';
COMMENT ON INDEX public.idx_payment_requests_user_status IS 'Index composite pour optimiser les requêtes de paiements par utilisateur et statut';
COMMENT ON INDEX public.idx_profiles_role_status IS 'Index composite pour optimiser les requêtes de profils par rôle et statut d\'abonnement';
COMMENT ON INDEX public.idx_profiles_email_lower IS 'Index pour accélérer les recherches d\'email en insensible à la casse';
COMMENT ON INDEX public.idx_profiles_role IS 'Index pour accélérer les recherches par rôle';
COMMENT ON INDEX public.idx_challenges_user_active IS 'Index composite pour optimiser les requêtes de challenges par utilisateur et statut';