-- Fix RLS Policies - Prevent 500 Errors
-- Run this in Supabase SQL Editor AFTER fix-profile-500-error.sql

-- ====================================
-- STEP 1: Check current RLS policies
-- ====================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- ====================================
-- STEP 2: Drop all existing policies
-- ====================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- ====================================
-- STEP 3: Create simple, safe policies
-- ====================================

-- Policy 1: Users can view their own profile
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Policy 2: Admins can view all profiles
CREATE POLICY "profiles_select_admin"
ON public.profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Policy 3: Users can update their own profile (but not role)
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

-- Policy 4: Admins can update any profile
CREATE POLICY "profiles_update_admin"
ON public.profiles FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Policy 5: Admins can delete profiles
CREATE POLICY "profiles_delete_admin"
ON public.profiles FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- ====================================
-- STEP 4: Verify policies created
-- ====================================
SELECT
    policyname as "Policy Name",
    cmd as "Command",
    CASE
        WHEN roles = '{public}' THEN 'public'
        ELSE roles::text
    END as "Roles"
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- Expected: 5 policies
-- profiles_select_own - SELECT
-- profiles_select_admin - SELECT
-- profiles_update_own - UPDATE
-- profiles_update_admin - UPDATE
-- profiles_delete_admin - DELETE

-- ====================================
-- STEP 5: Test policy with your user
-- ====================================
-- This should return your profile
SELECT * FROM profiles WHERE id = auth.uid();
