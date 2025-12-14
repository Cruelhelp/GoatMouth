-- Make mcneilruel@gmail.com an admin

UPDATE profiles
SET role = 'admin'
WHERE id = (
    SELECT id
    FROM auth.users
    WHERE email = 'mcneilruel@gmail.com'
);

-- Verify
SELECT p.username, p.role, u.email
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'mcneilruel@gmail.com';
