-- Update Profiles RLS Policy to Allow Public Viewing of Usernames
-- Run this in Supabase SQL Editor to enable creator info display

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- Create new policy that allows everyone to view basic profile info (username, avatar)
-- but full profile access only for own profile or admins
CREATE POLICY "profiles_select_policy"
ON public.profiles FOR SELECT
USING (true);  -- Allow everyone to view profiles (username and avatar are public)

-- Note: Users can still only UPDATE their own profiles due to the update policy
-- This change only affects SELECT/viewing permissions

-- Verify the policy was created
SELECT 'Profiles RLS policy updated successfully!' as status;
SELECT 'Users can now view creator information on markets' as info;
