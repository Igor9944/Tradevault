-- Copiez-collez ce code dans l'éditeur SQL de votre dashboard Supabase (SQL Editor) et cliquez sur "Run".

-- 1. Table users (extension de l'authentification)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  username TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  paid BOOLEAN DEFAULT false,
  paid_until TIMESTAMP WITH TIME ZONE,
  country TEXT DEFAULT 'FR',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table accounts (portefeuilles)
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('personal', 'propfirm')),
  capital NUMERIC,
  target NUMERIC,
  daily_loss NUMERIC,
  global_loss NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table trades (historique de trades)
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  pair TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('LONG', 'SHORT')),
  status TEXT CHECK (status IN ('WIN', 'LOSS', 'BE')),
  pnl NUMERIC NOT NULL,
  setup TEXT,
  screenshot_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table challenges (statistiques propfirm)
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  capital NUMERIC NOT NULL,
  target NUMERIC NOT NULL,
  daily_loss NUMERIC NOT NULL,
  global_loss NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table payments (gestion des paiements et renouvellements anticipés)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  amount NUMERIC NOT NULL,
  proof_file_url TEXT,
  proof_url TEXT,
  network TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- 6. Table profiles (authentification et audit additionnel)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  payment_proof TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sécurité Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Politiques de base (chaque utilisateur voit uniquement ses propres données)
DROP POLICY IF EXISTS "Les utilisateurs voient leurs propres infos" ON public.users;
CREATE POLICY "Les utilisateurs voient leurs propres infos" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Les utilisateurs modifient leurs propres infos" ON public.users;
CREATE POLICY "Les utilisateurs modifient leurs propres infos" ON public.users FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Les utilisateurs gèrent leurs profils" ON public.profiles;
DROP POLICY IF EXISTS "Les utilisateurs gèrent leurs profils" ON profiles;
CREATE POLICY "Les utilisateurs gèrent leurs profils" ON public.profiles FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Les utilisateurs gèrent leurs comptes" ON public.accounts;
CREATE POLICY "Les utilisateurs gèrent leurs comptes" ON public.accounts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les utilisateurs gèrent leurs trades" ON public.trades;
CREATE POLICY "Les utilisateurs gèrent leurs trades" ON public.trades FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les utilisateurs gèrent leurs challenges" ON public.challenges;
CREATE POLICY "Les utilisateurs gèrent leurs challenges" ON public.challenges FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les utilisateurs voient et créent leurs paiements" ON public.payments;
CREATE POLICY "Les utilisateurs voient et créent leurs paiements" ON public.payments FOR ALL USING (auth.uid() = user_id);

-- Gérer automatiquement la création d'un profil après l'inscription (Trigger Supabase Auth)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
