-- =========================================================================
-- SQL Supabase : Création des tables et verrouillage de la sécurité (RLS)
-- A exécuter dans l'éditeur SQL de Supabase.
-- =========================================================================

-- 1. CRÉATION DES TABLES

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT,
    email TEXT,
    country TEXT,
    paid BOOLEAN DEFAULT false,
    paid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    payment_screenshot TEXT,
    status TEXT DEFAULT 'pending',
    avatar_url TEXT,
    google_linked BOOLEAN DEFAULT false,
    google_email TEXT
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    status TEXT DEFAULT 'pending',
    payment_proof TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    capital NUMERIC,
    target NUMERIC,
    daily_loss NUMERIC,
    global_loss NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    pair TEXT NOT NULL,
    direction TEXT NOT NULL,
    status TEXT,
    entry NUMERIC,
    exit NUMERIC,
    lots NUMERIC,
    fees NUMERIC DEFAULT 0,
    pnl NUMERIC,
    setup TEXT,
    mindset TEXT,
    notes TEXT,
    screenshot_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    capital NUMERIC,
    target NUMERIC,
    daily_loss NUMERIC,
    global_loss NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC,
    network TEXT,
    proof_file_url TEXT,
    status TEXT DEFAULT 'pending',
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. ACTIVATION DE LA SECURITE RLS (Row Level Security)

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 3. DECLARATION DES POLITIQUES (POLICIES)

-- === USERS ===
CREATE POLICY "Users can view own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own data" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can completely manage users" ON public.users FOR ALL USING (auth.jwt() ->> 'email' IN ('tradonyx@vault.com', 'igorrose2003@gmail.com', 'toshirohitsugayaonyx@gmail.com'));

-- === PROFILES ===
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can completely manage profiles" ON public.profiles FOR ALL USING (auth.jwt() ->> 'email' IN ('tradonyx@vault.com', 'igorrose2003@gmail.com', 'toshirohitsugayaonyx@gmail.com'));

-- === ACCOUNTS ===
CREATE POLICY "Users can view own accounts" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON public.accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON public.accounts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admin can completely manage accounts" ON public.accounts FOR ALL USING (auth.jwt() ->> 'email' IN ('tradonyx@vault.com', 'igorrose2003@gmail.com', 'toshirohitsugayaonyx@gmail.com'));

-- === TRADES ===
CREATE POLICY "Users can view own trades" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trades" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trades" ON public.trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trades" ON public.trades FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admin can completely manage trades" ON public.trades FOR ALL USING (auth.jwt() ->> 'email' IN ('tradonyx@vault.com', 'igorrose2003@gmail.com', 'toshirohitsugayaonyx@gmail.com'));

-- === CHALLENGES ===
CREATE POLICY "Users can view own challenges" ON public.challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own challenges" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own challenges" ON public.challenges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own challenges" ON public.challenges FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admin can completely manage challenges" ON public.challenges FOR ALL USING (auth.jwt() ->> 'email' IN ('tradonyx@vault.com', 'igorrose2003@gmail.com', 'toshirohitsugayaonyx@gmail.com'));

-- === PAYMENTS ===
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can completely manage payments" ON public.payments FOR ALL USING (auth.jwt() ->> 'email' IN ('tradonyx@vault.com', 'igorrose2003@gmail.com', 'toshirohitsugayaonyx@gmail.com'));
