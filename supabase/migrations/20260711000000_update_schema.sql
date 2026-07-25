-- Copiez-collez ce code dans l'éditeur SQL de votre dashboard Supabase (SQL Editor) et cliquez sur "Run".

-- 1. Table profiles (utilisateurs étendus)
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index pour accélérer les recherches d'email et de statut
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- 2. Table trading_accounts (comptes de trading)
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

-- 3. Table trades (transactions enregistrées)
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

-- 4. Table challenges (objectifs d'évaluation spécifiques)
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

-- 5. Table payment_requests (preuves d'abonnement et de renouvellements)
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

-- 6. Table admin_settings (configuration globale, ligne unique id=1)
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

-- Sécurité Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Politiques d'accès pour profiles
DROP POLICY IF EXISTS "Les utilisateurs voient leurs propres profils" ON public.profiles;
CREATE POLICY "Les utilisateurs voient leurs propres profils" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Les utilisateurs modifient leurs propres profils" ON public.profiles;
CREATE POLICY "Les utilisateurs modifient leurs propres profils" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Les admins voient tous les profils" ON public.profiles;
CREATE POLICY "Les admins voient tous les profils" ON public.profiles FOR SELECT USING (public.is_admin());

-- Politiques d'accès pour trading_accounts
DROP POLICY IF EXISTS "Les utilisateurs voient leurs propres comptes" ON public.trading_accounts;
CREATE POLICY "Les utilisateurs voient leurs propres comptes" ON public.trading_accounts FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les utilisateurs gèrent leurs propres comptes" ON public.trading_accounts;
CREATE POLICY "Les utilisateurs gèrent leurs propres comptes" ON public.trading_accounts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les admins gèrent tous les comptes" ON public.trading_accounts;
CREATE POLICY "Les admins gèrent tous les comptes" ON public.trading_accounts FOR ALL USING (public.is_admin());

-- Politiques d'accès pour trades
DROP POLICY IF EXISTS "Les utilisateurs voient leurs propres trades" ON public.trades;
CREATE POLICY "Les utilisateurs voient leurs propres trades" ON public.trades FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les utilisateurs gèrent leurs propres trades" ON public.trades;
CREATE POLICY "Les utilisateurs gèrent leurs propres trades" ON public.trades FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les admins gèrent tous les trades" ON public.trades;
CREATE POLICY "Les admins gèrent tous les trades" ON public.trades FOR ALL USING (public.is_admin());

-- Politiques d'accès pour challenges
DROP POLICY IF EXISTS "Les utilisateurs voient leurs propres challenges" ON public.challenges;
CREATE POLICY "Les utilisateurs voient leurs propres challenges" ON public.challenges FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les utilisateurs gèrent leurs propres challenges" ON public.challenges;
CREATE POLICY "Les utilisateurs gèrent leurs propres challenges" ON public.challenges FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les admins gèrent tous les challenges" ON public.challenges;
CREATE POLICY "Les admins gèrent tous les challenges" ON public.challenges FOR ALL USING (public.is_admin());

-- Politiques d'accès pour payment_requests
DROP POLICY IF EXISTS "Les utilisateurs voient leurs propres paiements" ON public.payment_requests;
CREATE POLICY "Les utilisateurs voient leurs propres paiements" ON public.payment_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les utilisateurs gèrent leurs propres paiements" ON public.payment_requests;
CREATE POLICY "Les utilisateurs gèrent leurs propres paiements" ON public.payment_requests FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les admins voient tous les paiements" ON public.payment_requests;
CREATE POLICY "Les admins voient tous les paiements" ON public.payment_requests FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Les admins gèrent tous les paiements" ON public.payment_requests;
CREATE POLICY "Les admins gèrent tous les paiements" ON public.payment_requests FOR ALL USING (public.is_admin());

-- Politique d'accès pour admin_settings (lecture publique, écriture admin uniquement)
DROP POLICY IF EXISTS "Tout le monde lit les paramètres admin" ON public.admin_settings;
CREATE POLICY "Tout le monde lit les paramètres admin" ON public.admin_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Seuls les admins modifient les paramètres admin" ON public.admin_settings;
CREATE POLICY "Seuls les admins modifient les paramètres admin" ON public.admin_settings FOR ALL USING (public.is_admin());

-- Gérer automatiquement la création d'un profil après l'inscription (Trigger Supabase Auth)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
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
  INSERT INTO public.profiles (id, email, username, full_name, role, status, subscription_status, plan, created_at, updated_at)
  VALUES (
    new.id,
    user_email,
    split_part(user_email, '@', 1),
    split_part(user_email, '@', 1),
    'user',
    'pending',
    'pending',
    'free',
    timezone('utc'::text, now()),
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

-- Fonction auxiliaire pour déterminer si l'appelant est administrateur
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql;