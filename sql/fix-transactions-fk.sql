-- Fix Transactions Foreign Key for Profile Join
-- Run in Supabase SQL Editor

-- ====================================
-- Drop existing transactions table and recreate with correct FK
-- ====================================
DROP TABLE IF EXISTS public.transactions CASCADE;

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,  -- Changed to reference profiles
    type TEXT NOT NULL CHECK (type IN ('bet', 'payout', 'deposit', 'withdrawal', 'refund')),
    amount DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ====================================
-- Create indexes
-- ====================================
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);

-- ====================================
-- Enable RLS
-- ====================================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ====================================
-- Create RLS policies
-- ====================================

-- Users can view their own transactions
CREATE POLICY "transactions_select_own"
ON public.transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all transactions
CREATE POLICY "transactions_select_admin"
ON public.transactions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Users can insert their own transactions
CREATE POLICY "transactions_insert_own"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ====================================
-- Do the same for bets and positions
-- ====================================

-- Fix bets table
DROP TABLE IF EXISTS public.bets CASCADE;

CREATE TABLE public.bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,  -- Changed to reference profiles
    outcome TEXT NOT NULL CHECK (outcome IN ('yes', 'no')),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    price DECIMAL(5, 4) NOT NULL CHECK (price > 0 AND price <= 1),
    potential_return DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'matched', 'cancelled', 'settled')),
    payout DECIMAL(10, 2) DEFAULT 0.00,
    settled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX idx_bets_user_id ON public.bets(user_id);
CREATE INDEX idx_bets_market_id ON public.bets(market_id);
CREATE INDEX idx_bets_status ON public.bets(status);

ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bets_select_own"
ON public.bets FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "bets_select_admin"
ON public.bets FOR SELECT
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "bets_insert_own"
ON public.bets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix positions table
DROP TABLE IF EXISTS public.positions CASCADE;

CREATE TABLE public.positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,  -- Changed to reference profiles
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

CREATE INDEX idx_positions_user_id ON public.positions(user_id);
CREATE INDEX idx_positions_market_id ON public.positions(market_id);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "positions_select_own"
ON public.positions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "positions_select_admin"
ON public.positions FOR SELECT
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "positions_insert_own"
ON public.positions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "positions_update_own"
ON public.positions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- ====================================
-- Verification
-- ====================================
SELECT
    'Tables fixed!' as status,
    'Now transactions, bets, and positions reference profiles table' as note;

-- Test the join that was failing
SELECT
    t.id,
    t.type,
    t.amount,
    p.username
FROM transactions t
LEFT JOIN profiles p ON p.id = t.user_id
LIMIT 1;
