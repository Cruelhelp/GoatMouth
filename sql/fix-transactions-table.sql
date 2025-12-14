-- Fix Transactions Table - 400 Error
-- Run in Supabase SQL Editor

-- ====================================
-- Check if transactions table exists
-- ====================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'transactions';

-- ====================================
-- Create transactions table if missing
-- ====================================
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
-- Create indexes
-- ====================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- ====================================
-- Enable RLS
-- ====================================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ====================================
-- Drop existing policies
-- ====================================
DROP POLICY IF EXISTS "transactions_select_policy" ON transactions;
DROP POLICY IF EXISTS "transactions_insert_policy" ON transactions;
DROP POLICY IF EXISTS "allow_select_own_transactions" ON transactions;
DROP POLICY IF EXISTS "allow_insert_own_transactions" ON transactions;
DROP POLICY IF EXISTS "allow_admin_select_transactions" ON transactions;

-- ====================================
-- Create simple RLS policies
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

-- Users can insert their own transactions (via API)
CREATE POLICY "transactions_insert_own"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ====================================
-- Verify setup
-- ====================================
SELECT
    'Transactions table ready' as status,
    COUNT(*) as transaction_count
FROM public.transactions;

-- Check policies
SELECT
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY policyname;
