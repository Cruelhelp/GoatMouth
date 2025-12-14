-- Check User Status - mcneilruel@gmail.com
-- Run this in Supabase SQL Editor

-- ====================================
-- Check if user exists in auth.users
-- ====================================
SELECT
    id,
    email,
    email_confirmed_at,
    created_at,
    updated_at,
    last_sign_in_at,
    CASE
        WHEN email_confirmed_at IS NULL THEN '❌ EMAIL NOT VERIFIED'
        ELSE '✅ EMAIL VERIFIED'
    END as verification_status,
    CASE
        WHEN banned_until IS NOT NULL THEN '🚫 ACCOUNT BANNED'
        ELSE '✅ ACCOUNT ACTIVE'
    END as account_status
FROM auth.users
WHERE email = 'mcneilruel@gmail.com';

-- ====================================
-- Check if profile exists
-- ====================================
SELECT
    p.id,
    p.username,
    p.balance,
    p.role,
    u.email,
    CASE
        WHEN p.id IS NULL THEN '❌ NO PROFILE'
        ELSE '✅ HAS PROFILE'
    END as profile_status
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email = 'mcneilruel@gmail.com';

-- ====================================
-- If user doesn't exist, you need to sign up first
-- If email is not verified, check your email inbox
-- If profile doesn't exist, run the profile creation below
-- ====================================

-- Create profile if missing (only run if profile doesn't exist)
INSERT INTO profiles (id, username, balance, role)
SELECT
    u.id,
    'mcneilruel',
    1000.00,
    'admin'  -- Making you admin
FROM auth.users u
WHERE u.email = 'mcneilruel@gmail.com'
AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = u.id)
ON CONFLICT (id) DO UPDATE SET
    role = 'admin';  -- Upgrade to admin if already exists
