-- Fix security issue: Restrict profiles table to only allow users to view their own profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create new secure policy that only allows users to see their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Since other users' profiles may need to be visible in some contexts (like public user directories),
-- we can create a function to get public profile info without exposing sensitive data
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_user_id uuid)
RETURNS TABLE(id uuid, full_name text, avatar_url text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url
  FROM public.profiles p
  WHERE p.user_id = profile_user_id;
$$;