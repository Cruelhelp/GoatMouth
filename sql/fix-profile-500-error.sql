-- Fix 500 Error - Profile Creation Issue
-- Run this in Supabase SQL Editor

-- ====================================
-- STEP 1: Check if profile exists for this user
-- ====================================
SELECT
    u.id,
    u.email,
    u.created_at as user_created,
    p.id as profile_id,
    p.username,
    p.balance,
    p.role
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email = 'clisenpei@gmail.com';

-- If profile_id is NULL, the profile was never created

-- ====================================
-- STEP 2: Check trigger function
-- ====================================
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- ====================================
-- STEP 3: Manually create missing profile
-- ====================================
-- Run this if the profile doesn't exist
INSERT INTO profiles (id, username, balance, role)
SELECT
    u.id,
    COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
    1000.00,
    'user'
FROM auth.users u
WHERE u.email = 'clisenpei@gmail.com'
AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = u.id);

-- ====================================
-- STEP 4: Verify profile was created
-- ====================================
SELECT
    p.id,
    p.username,
    p.balance,
    p.role,
    u.email
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'clisenpei@gmail.com';

-- ====================================
-- STEP 5: Fix trigger to prevent future issues
-- ====================================
-- Drop and recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, username, balance, role)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        1000.00,
        'user'
    )
    ON CONFLICT (id) DO NOTHING; -- Prevent duplicate key errors
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE WARNING 'Failed to create profile for user %: %', new.id, SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================
-- STEP 6: Create profiles for any existing users without them
-- ====================================
INSERT INTO profiles (id, username, balance, role)
SELECT
    u.id,
    COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
    1000.00,
    'user'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = u.id)
ON CONFLICT (id) DO NOTHING;

-- ====================================
-- VERIFICATION
-- ====================================
-- Should show all users with their profiles
SELECT
    u.email,
    u.created_at as signed_up,
    p.username,
    p.balance,
    p.role,
    CASE
        WHEN p.id IS NULL THEN '❌ NO PROFILE'
        ELSE '✅ HAS PROFILE'
    END as status
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at DESC;
