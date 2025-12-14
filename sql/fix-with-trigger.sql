-- COMPLETE FIX: Use Database Trigger for Profile Creation
-- This bypasses RLS issues entirely

-- ====================================
-- STEP 1: Temporarily disable RLS on profiles
-- ====================================
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ====================================
-- STEP 2: Create trigger function
-- ====================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, username, balance, role)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        1000.00,
        'user'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================
-- STEP 3: Create trigger
-- ====================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================
-- STEP 4: Re-enable RLS
-- ====================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ====================================
-- STEP 5: Drop all existing policies
-- ====================================
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
END $$;

-- ====================================
-- STEP 6: Create simple policies
-- ====================================

-- Users can view their own profile, admins can view all
CREATE POLICY "profiles_select_policy"
ON profiles FOR SELECT
USING (
    auth.uid() = id
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Users can update their own profile
CREATE POLICY "profiles_update_policy"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Only admins can delete profiles
CREATE POLICY "profiles_delete_policy"
ON profiles FOR DELETE
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ====================================
-- VERIFY
-- ====================================
SELECT 'Trigger created:' as status, tgname
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

SELECT 'Policies created:' as status, policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
