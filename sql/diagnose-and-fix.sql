-- DIAGNOSTIC AND COMPLETE FIX SCRIPT
-- Run this ENTIRE script in Supabase SQL Editor

-- ====================================
-- STEP 1: DIAGNOSTIC - Check current state
-- ====================================

-- Check if role column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'role';

-- Check current policies on profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';

-- ====================================
-- STEP 2: COMPLETE RESET AND FIX
-- ====================================

-- Add role column if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Update existing rows
UPDATE profiles SET role = 'user' WHERE role IS NULL;

-- Add constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_role_check'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));
    END IF;
END $$;

-- Make role NOT NULL
ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ====================================
-- STEP 3: DROP ALL EXISTING POLICIES
-- ====================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
END $$;

-- ====================================
-- STEP 4: CREATE CORRECT POLICIES
-- ====================================

-- Policy 1: Allow users to INSERT their own profile during signup
CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
TO public
WITH CHECK (auth.uid() = id);

-- Policy 2: Allow users to view their own profile OR admins to view all
CREATE POLICY "Users can view profiles"
ON profiles
FOR SELECT
TO public
USING (
    auth.uid() = id
    OR
    EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
);

-- Policy 3: Allow users to UPDATE their own profile
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO public
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 4: Allow admins to UPDATE any profile
CREATE POLICY "Admins can update any profile"
ON profiles
FOR UPDATE
TO public
USING (
    EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
);

-- ====================================
-- STEP 5: VERIFY POLICIES CREATED
-- ====================================

SELECT
    policyname as "Policy Name",
    cmd as "Command",
    CASE
        WHEN roles = '{public}' THEN 'public'
        WHEN roles = '{authenticated}' THEN 'authenticated'
        ELSE roles::text
    END as "Roles"
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- ====================================
-- EXPECTED OUTPUT
-- ====================================
-- You should see 4 policies:
-- 1. "Users can insert own profile" - INSERT - public
-- 2. "Users can view profiles" - SELECT - public
-- 3. "Users can update own profile" - UPDATE - public
-- 4. "Admins can update any profile" - UPDATE - public
