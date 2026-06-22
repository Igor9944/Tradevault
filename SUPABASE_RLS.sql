-- =========================================================================
-- SQL Supabase : Création des tables et verrouillage de la sécurité (RLS)
-- Version unifiée, optimisée et 100% compatible avec l'application TradeVault.
-- A exécuter dans l'éditeur SQL de Supabase.
-- =========================================================================

-- 1. CRÉATION DU SCHÉMA ET DES TABLES UNIFIÉES

-- === PROFILES (Table centrale d'utilisateurs et de settings d'administration) ===
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    username TEXT,
    full_name TEXT,
    country TEXT,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    subscription_status TEXT DEFAULT 'pending', -- 'pending' | 'premium_active' | 'blocked'
    plan TEXT DEFAULT 'free', -- 'free' | 'pro'
    premium_expires_at TIMESTAMP WITH TIME ZONE,
    payment_proof TEXT,
    avatar_url TEXT,
    currency TEXT, -- Utilisé comme fallback pour stocker "prix|période" (ex: "30|3")
    wallet_trc20 TEXT, -- Adresse ERC20/TRC20 personnalisée de l'admin
    wallet_bep20 TEXT, -- Adresse BEP20/BSC personnalisée de l'admin
    subscription_price NUMERIC DEFAULT 30,
    subscription_duration_days INT DEFAULT 90,
    admin_emails TEXT[] DEFAULT '{}'::text[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index pour accélérer les recherches d'email et de statut
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- === TRADING_ACCOUNTS (Comptes de trading de l'utilisateur) ===
CREATE TABLE IF NOT EXISTS public.trading_accounts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    account_type TEXT DEFAULT 'personal', -- 'personal' | 'prop_firm' | 'demo'
    capital NUMERIC,
    target NUMERIC,
    daily_loss NUMERIC,
    global_loss NUMERIC,
    challenge_status TEXT DEFAULT 'active', -- 'active' | 'passed' | 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_trading_accounts_user ON public.trading_accounts(user_id);

-- === TRADES (Transactions enregistrées dans le journal) ===
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    pair TEXT NOT NULL,
    direction TEXT NOT NULL, -- 'BUY' | 'SELL'
    status TEXT, -- 'WIN' | 'LOSS' | 'BREAKEVEN'
    entry NUMERIC,
    exit NUMERIC,
    lots NUMERIC DEFAULT 0.01,
    fees NUMERIC DEFAULT 0,
    pnl NUMERIC DEFAULT 0,
    setup TEXT,
    mindset TEXT,
    notes TEXT,
    screenshot_url TEXT,
    emotion TEXT,
    session TEXT,
    rr_ratio NUMERIC,
    risk_percent NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_trades_user ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_account ON public.trades(account_id);

-- === CHALLENGES (Objectifs d'évaluation spécifiques) ===
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    capital NUMERIC,
    target NUMERIC,
    daily_loss NUMERIC,
    global_loss NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_challenges_user ON public.challenges(user_id);

-- === PAYMENT_REQUESTS (Preuves d'abonnement et de renouvellements) ===
CREATE TABLE IF NOT EXISTS public.payment_requests (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC,
    screenshot_url TEXT,
    network TEXT DEFAULT 'TRC20', -- 'TRC20' | 'BEP20'
    status TEXT DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    type TEXT DEFAULT 'registration', -- 'registration' | 'renewal'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_user ON public.payment_requests(user_id);


-- 2. FONCTIONS AUXILIAIRES ET TRIGGERS APPLICATIFS

-- Helper Function pour déterminer si l'appelant est Administrateur
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger Function pour créer automatiquement le profil après identification auth.users
-- SÉCURITÉ : aucun email en dur. L'admin est accordé une seule fois manuellement
-- en base (UPDATE profiles SET role='admin') sur un compte déjà existant, jamais
-- automatiquement à l'inscription -- ces emails sont publics dans ce repo.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  user_email := COALESCE(new.email, new.raw_user_meta_data->>'email');
  INSERT INTO public.profiles (id, email, username, full_name, role, status, subscription_status, plan, created_at)
  VALUES (
    new.id,
    user_email,
    split_part(user_email, '@', 1),
    split_part(user_email, '@', 1),
    'user',
    'pending',
    'pending',
    'free',
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN new;
END;
$$;

-- Liaison sécurisée du trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- === ADMIN_SETTINGS (Table dédiée, ligne unique id=1) ===
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id INT PRIMARY KEY DEFAULT 1,
    notification_emails TEXT DEFAULT 'igorrose2003@gmail.com,toshirohitsugayaonyx@gmail.com',
    usdt_trc20_address TEXT DEFAULT 'TN2YxKp9vR3mHqL7bF8cD2eA5wJ6sT4uV',
    usdt_bep20_address TEXT DEFAULT '0x7a3B5c9D2eF1a4B6c8D0e2F4a6B8c0D2e4F6a8B0',
    subscription_price NUMERIC DEFAULT 30,
    subscription_duration_months INT DEFAULT 3,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT col_id_check CHECK (id = 1)
);


-- 3. VERROUILLAGE SÉCURITÉ RLS

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;


-- 4. DÉCLARATION DES POLITIQUES D'ACCÈS SÉCURISÉES (POLICIES)

-- === PROFILES ===
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can completely manage profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can completely manage profiles" ON public.profiles FOR ALL USING (public.is_admin());
-- Permettre aux invités ou nouveaux inscrits de créer leur propre profil
CREATE POLICY "Enable insert for authenticated users only" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- === TRADING_ACCOUNTS ===
DROP POLICY IF EXISTS "Users can view own accounts" ON public.trading_accounts;
DROP POLICY IF EXISTS "Users can insert own accounts" ON public.trading_accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON public.trading_accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON public.trading_accounts;
DROP POLICY IF EXISTS "Admin can completely manage accounts" ON public.trading_accounts;

CREATE POLICY "Users can view own accounts" ON public.trading_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON public.trading_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON public.trading_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON public.trading_accounts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admin can completely manage accounts" ON public.trading_accounts FOR ALL USING (public.is_admin());

-- === TRADES ===
DROP POLICY IF EXISTS "Users can view own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can insert own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can update own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can delete own trades" ON public.trades;
DROP POLICY IF EXISTS "Admin can completely manage trades" ON public.trades;

CREATE POLICY "Users can view own trades" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trades" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trades" ON public.trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trades" ON public.trades FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admin can completely manage trades" ON public.trades FOR ALL USING (public.is_admin());

-- === CHALLENGES ===
DROP POLICY IF EXISTS "Users can view own challenges" ON public.challenges;
DROP POLICY IF EXISTS "Users can insert own challenges" ON public.challenges;
DROP POLICY IF EXISTS "Users can update own challenges" ON public.challenges;
DROP POLICY IF EXISTS "Users can delete own challenges" ON public.challenges;
DROP POLICY IF EXISTS "Admin can completely manage challenges" ON public.challenges;

CREATE POLICY "Users can view own challenges" ON public.challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own challenges" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own challenges" ON public.challenges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own challenges" ON public.challenges FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admin can completely manage challenges" ON public.challenges FOR ALL USING (public.is_admin());

-- === PAYMENT_REQUESTS ===
DROP POLICY IF EXISTS "Users can view own payments" ON public.payment_requests;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payment_requests;
DROP POLICY IF EXISTS "Admin can completely manage payments" ON public.payment_requests;

CREATE POLICY "Users can view own payments" ON public.payment_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON public.payment_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can completely manage payments" ON public.payment_requests FOR ALL USING (public.is_admin());

-- === ADMIN_SETTINGS ===
DROP POLICY IF EXISTS "Enable read access for all auth users" ON public.admin_settings;
CREATE POLICY "Enable read access for all auth users" ON public.admin_settings FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admin can completely manage admin_settings" ON public.admin_settings;
CREATE POLICY "Admin can completely manage admin_settings" ON public.admin_settings FOR ALL USING (public.is_admin());

-- Insertion initiale des paramètres admin par défaut
INSERT INTO public.admin_settings (id, notification_emails, usdt_trc20_address, usdt_bep20_address, subscription_price, subscription_duration_months)
VALUES (1, 'igorrose2003@gmail.com,toshirohitsugayaonyx@gmail.com', 'TN2YxKp9vR3mHqL7bF8cD2eA5wJ6sT4uV', '0x7a3B5c9D2eF1a4B6c8D0e2F4a6B8c0D2e4F6a8B0', 30, 3)
ON CONFLICT (id) DO NOTHING;

