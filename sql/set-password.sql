-- Set Password for mcneilruel@gmail.com
-- Run in Supabase SQL Editor

-- ====================================
-- Set password to: Mastermind@12345
-- Also verify email automatically
-- ====================================
UPDATE auth.users
SET
    encrypted_password = crypt('Mastermind@12345', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),  -- Verify if not already
    updated_at = NOW()
WHERE email = 'mcneilruel@gmail.com';

-- ====================================
-- Verify it worked
-- ====================================
SELECT
    email,
    CASE
        WHEN email_confirmed_at IS NULL THEN '❌ NOT VERIFIED'
        ELSE '✅ VERIFIED on ' || email_confirmed_at::text
    END as verification_status,
    '✅ Password updated to: Mastermind@12345' as password_status,
    updated_at as last_updated
FROM auth.users
WHERE email = 'mcneilruel@gmail.com';

-- ====================================
-- Make you admin (if not already)
-- ====================================
UPDATE profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'mcneilruel@gmail.com');

-- ====================================
-- Final verification
-- ====================================
SELECT
    u.email,
    p.username,
    p.balance,
    p.role,
    '✅ Ready to login!' as status
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE u.email = 'mcneilruel@gmail.com';
