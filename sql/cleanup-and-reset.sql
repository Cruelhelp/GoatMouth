-- GoatMouth - Complete Database Cleanup and Reset
-- This will DROP all existing tables and recreate them fresh
-- WARNING: This will delete ALL data. Use with caution.

-- ====================================
-- STEP 1: Drop all triggers
-- ====================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at_markets ON public.markets;
DROP TRIGGER IF EXISTS set_updated_at_positions ON public.positions;

-- ====================================
-- STEP 2: Drop all functions
-- ====================================
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

-- ====================================
-- STEP 3: Drop all policies (if tables exist)
-- ====================================
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies for profiles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles';
    END LOOP;

    -- Drop all policies for markets
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'markets' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.markets';
    END LOOP;

    -- Drop all policies for bets
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bets' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.bets';
    END LOOP;

    -- Drop all policies for positions
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'positions' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.positions';
    END LOOP;

    -- Drop all policies for transactions
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'transactions' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.transactions';
    END LOOP;
END $$;

-- ====================================
-- STEP 4: Drop all tables (CASCADE to remove dependencies)
-- ====================================
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.positions CASCADE;
DROP TABLE IF EXISTS public.bets CASCADE;
DROP TABLE IF EXISTS public.markets CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ====================================
-- Cleanup complete - ready for fresh schema
-- ====================================
SELECT 'Database cleaned. You can now run database-schema.sql' as status;
