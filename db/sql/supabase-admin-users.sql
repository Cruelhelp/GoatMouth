-- =====================================================
-- GoatMouth Profiles Sync + Admin User Listing Support
-- Run in Supabase SQL editor.
-- =====================================================

-- Ensure basic profile fields exist
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create or replace a trigger to keep profiles in sync with auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, role, balance, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        'user',
        0,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = COALESCE(EXCLUDED.username, public.profiles.username),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_new_user();

-- Backfill missing profiles for existing auth users
INSERT INTO public.profiles (id, email, username, role, balance, created_at, updated_at)
SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
    'user',
    0,
    u.created_at,
    NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Fill missing email/username for existing profiles
UPDATE public.profiles p
SET
    email = COALESCE(p.email, u.email),
    username = COALESCE(p.username, u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
    updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.username IS NULL);

-- Enable RLS and add policies if missing
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Replace any existing recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'is_admin'
          AND pronamespace = 'public'::regnamespace
    ) THEN
        CREATE FUNCTION public.is_admin()
        RETURNS boolean
        LANGUAGE sql
        SECURITY DEFINER
        SET search_path = public
        AS $fn$
            SELECT EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.role = 'admin'
            );
        $fn$;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'profiles'
          AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile"
            ON public.profiles
            FOR SELECT
            USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'profiles'
          AND policyname = 'Admins can view all profiles'
    ) THEN
        CREATE POLICY "Admins can view all profiles"
            ON public.profiles
            FOR SELECT
            USING (public.is_admin());
    END IF;
END $$;
