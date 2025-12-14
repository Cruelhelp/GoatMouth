-- Fix All Tables - Prevent 400 Errors
-- Run this ENTIRE script in Supabase SQL Editor

-- ====================================
-- MARKETS TABLE
-- ====================================
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

ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "markets_select_all" ON markets;
CREATE POLICY "markets_select_all"
ON public.markets FOR SELECT
TO authenticated
USING (true);

-- ====================================
-- BETS TABLE
-- ====================================
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

ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bets_select_own" ON bets;
DROP POLICY IF EXISTS "bets_select_admin" ON bets;
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

-- ====================================
-- POSITIONS TABLE
-- ====================================
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

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "positions_select_own" ON positions;
DROP POLICY IF EXISTS "positions_select_admin" ON positions;
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

-- ====================================
-- Add sample markets for testing
-- ====================================
INSERT INTO markets (title, description, category, end_date, yes_price, no_price, total_volume) VALUES
('Will Bitcoin reach $100k by end of 2025?', 'Market resolves YES if Bitcoin (BTC) reaches or exceeds $100,000 USD on any major exchange before December 31, 2025, 11:59 PM UTC.', 'Crypto', '2025-12-31 23:59:00+00', 0.6500, 0.3500, 15420.50),
('Will AI replace 10% of software jobs by 2026?', 'Market resolves YES if credible research shows that AI has directly replaced at least 10% of software engineering positions by January 1, 2026.', 'Technology', '2026-01-01 00:00:00+00', 0.4200, 0.5800, 8750.25),
('Will SpaceX land humans on Mars by 2030?', 'Market resolves YES if SpaceX successfully lands at least one human on the surface of Mars before December 31, 2030.', 'Science', '2030-12-31 23:59:00+00', 0.2800, 0.7200, 22100.00)
ON CONFLICT DO NOTHING;

-- ====================================
-- VERIFICATION
-- ====================================
SELECT
    'All tables ready!' as status,
    (SELECT COUNT(*) FROM profiles) as profiles_count,
    (SELECT COUNT(*) FROM markets) as markets_count,
    (SELECT COUNT(*) FROM bets) as bets_count,
    (SELECT COUNT(*) FROM positions) as positions_count,
    (SELECT COUNT(*) FROM transactions) as transactions_count;
