-- Add email column to profiles table for easier admin access
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Create unique index on email
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Update existing profiles with email from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- Update the handle_new_user trigger to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email, balance, role)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        new.email,
        1000.00,
        'user'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = new.email;
    RETURN new;
EXCEPTION
    WHEN unique_violation THEN
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
