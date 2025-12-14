-- GoatMouth Prediction Market - Complete Database Schema
-- Run this entire script in Supabase SQL Editor

-- ====================================
-- STEP 1: Enable necessary extensions
-- ====================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================
-- STEP 2: Create tables
-- ====================================

-- Profiles table (user data)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    balance DECIMAL(10, 2) DEFAULT 1000.00 NOT NULL,
    role TEXT DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'admin')),
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Markets table
CREATE TABLE IF NOT EXISTS public.markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'closed', 'resolved', 'cancelled')),
    resolved_outcome TEXT CHECK (resolved_outcome IN ('yes', 'no', 'invalid')),
    resolution_date TIMESTAMP WITH TIME ZONE,
    yes_price DECIMAL(5, 4) DEFAULT 0.5000 NOT NULL CHECK (yes_price >= 0 AND yes_price <= 1),
    no_price DECIMAL(5, 4) DEFAULT 0.5000 NOT NULL CHECK (no_price >= 0 AND no_price <= 1),
    total_volume DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Bets table
CREATE TABLE IF NOT EXISTS public.bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    outcome TEXT NOT NULL CHECK (outcome IN ('yes', 'no')),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    price DECIMAL(5, 4) NOT NULL CHECK (price > 0 AND price <= 1),
    potential_return DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'matched', 'cancelled', 'settled')),
    payout DECIMAL(10, 2) DEFAULT 0.00,
    settled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Positions table (aggregated user positions per market)
CREATE TABLE IF NOT EXISTS public.positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
    outcome TEXT NOT NULL CHECK (outcome IN ('yes', 'no')),
    shares DECIMAL(12, 4) NOT NULL DEFAULT 0,
    avg_price DECIMAL(5, 4) NOT NULL,
    total_invested DECIMAL(10, 2) NOT NULL DEFAULT 0,
    current_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(user_id, market_id, outcome)
);

-- Transactions table (audit trail)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('bet', 'payout', 'deposit', 'withdrawal', 'refund')),
    amount DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ====================================
-- STEP 3: Create indexes for performance
-- ====================================

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

CREATE INDEX IF NOT EXISTS idx_markets_status ON public.markets(status);
CREATE INDEX IF NOT EXISTS idx_markets_category ON public.markets(category);
CREATE INDEX IF NOT EXISTS idx_markets_end_date ON public.markets(end_date);
CREATE INDEX IF NOT EXISTS idx_markets_created_by ON public.markets(created_by);

CREATE INDEX IF NOT EXISTS idx_bets_user_id ON public.bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_market_id ON public.bets(market_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON public.bets(status);

CREATE INDEX IF NOT EXISTS idx_positions_user_id ON public.positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_market_id ON public.positions(market_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

-- ====================================
-- STEP 4: Enable Row Level Security
-- ====================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ====================================
-- STEP 5: Create RLS Policies
-- ====================================

-- PROFILES POLICIES
-- Users can view their own profile, admins can view all
CREATE POLICY "profiles_select_policy"
ON public.profiles FOR SELECT
USING (
    auth.uid() = id
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Users can update their own profile (non-admin fields only)
CREATE POLICY "profiles_update_policy"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id
    AND (role = (SELECT role FROM public.profiles WHERE id = auth.uid()))  -- Prevent role escalation
);

-- Admins can update any profile
CREATE POLICY "admins_update_profiles"
ON public.profiles FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Only admins can delete profiles
CREATE POLICY "profiles_delete_policy"
ON public.profiles FOR DELETE
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- MARKETS POLICIES
-- Anyone can view active markets
CREATE POLICY "markets_select_policy"
ON public.markets FOR SELECT
USING (true);

-- Authenticated users can create markets
CREATE POLICY "markets_insert_policy"
ON public.markets FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Market creators and admins can update markets
CREATE POLICY "markets_update_policy"
ON public.markets FOR UPDATE
USING (
    created_by = auth.uid()
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Only admins can delete markets
CREATE POLICY "markets_delete_policy"
ON public.markets FOR DELETE
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- BETS POLICIES
-- Users can view their own bets, admins can view all
CREATE POLICY "bets_select_policy"
ON public.bets FOR SELECT
USING (
    user_id = auth.uid()
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Authenticated users can create bets
CREATE POLICY "bets_insert_policy"
ON public.bets FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending bets
CREATE POLICY "bets_update_policy"
ON public.bets FOR UPDATE
USING (user_id = auth.uid() AND status = 'pending');

-- Admins can update any bet
CREATE POLICY "admins_update_bets"
ON public.bets FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- POSITIONS POLICIES
-- Users can view their own positions, admins can view all
CREATE POLICY "positions_select_policy"
ON public.positions FOR SELECT
USING (
    user_id = auth.uid()
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- System can insert positions (via API)
CREATE POLICY "positions_insert_policy"
ON public.positions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- System can update positions
CREATE POLICY "positions_update_policy"
ON public.positions FOR UPDATE
USING (user_id = auth.uid());

-- TRANSACTIONS POLICIES
-- Users can view their own transactions, admins can view all
CREATE POLICY "transactions_select_policy"
ON public.transactions FOR SELECT
USING (
    user_id = auth.uid()
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- System can insert transactions
CREATE POLICY "transactions_insert_policy"
ON public.transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ====================================
-- STEP 6: Create trigger for automatic profile creation
-- ====================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, username, balance, role)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        1000.00,
        'user'
    );
    RETURN new;
EXCEPTION
    WHEN unique_violation THEN
        -- Profile already exists, skip
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================
-- STEP 7: Create updated_at triggers
-- ====================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
    new.updated_at = TIMEZONE('utc', NOW());
    RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_markets
    BEFORE UPDATE ON public.markets
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_positions
    BEFORE UPDATE ON public.positions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================
-- VERIFICATION
-- ====================================

-- Check tables
SELECT 'Tables created:' as status, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'markets', 'bets', 'positions', 'transactions')
ORDER BY table_name;

-- Check RLS is enabled
SELECT 'RLS enabled:' as status, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'markets', 'bets', 'positions', 'transactions')
ORDER BY tablename;

-- Check policies
SELECT 'Policies created:' as status, tablename, policyname
FROM pg_policies
WHERE tablename IN ('profiles', 'markets', 'bets', 'positions', 'transactions')
ORDER BY tablename, policyname;

-- Check trigger
SELECT 'Trigger created:' as status, tgname
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
