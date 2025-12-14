-- QUICK FIX - Run these one at a time in Supabase SQL Editor

-- ====================================
-- STEP 1: Disable RLS temporarily to diagnose
-- ====================================
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ====================================
-- STEP 2: Check if profile exists
-- ====================================
SELECT COUNT(*) as profile_count
FROM profiles
WHERE id = '269f42b5-016f-4476-9cef-9d2f189ca240';

-- If count is 0, run STEP 3
-- If count is 1, skip to STEP 4

-- ====================================
-- STEP 3: Create the missing profile
-- ====================================
INSERT INTO profiles (id, username, balance, role)
VALUES (
    '269f42b5-016f-4476-9cef-9d2f189ca240',
    'test',
    1000.00,
    'user'
)
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    balance = 1000.00,
    role = 'user';

-- ====================================
-- STEP 4: Verify profile exists now
-- ====================================
SELECT * FROM profiles WHERE id = '269f42b5-016f-4476-9cef-9d2f189ca240';

-- Should return 1 row with your profile

-- ====================================
-- STEP 5: Re-enable RLS
-- ====================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ====================================
-- STEP 6: Drop ALL existing policies
-- ====================================
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
DROP POLICY IF EXISTS "admins_update_profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- ====================================
-- STEP 7: Create SIMPLE policies that work
-- ====================================

-- Allow authenticated users to read their own profile
CREATE POLICY "allow_select_own"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow authenticated users to update their own profile
CREATE POLICY "allow_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- ====================================
-- DONE! Test in your browser now
-- ====================================
