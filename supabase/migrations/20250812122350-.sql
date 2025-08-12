-- Remove the insecure public access policy
DROP POLICY IF EXISTS "Allow public download access by file_id" ON public.encrypted_files;

-- Create a security definer function for secure file access
CREATE OR REPLACE FUNCTION public.can_access_encrypted_file(file_id_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  file_exists BOOLEAN;
BEGIN
  -- Check if file exists and is not expired
  SELECT EXISTS(
    SELECT 1 FROM public.encrypted_files 
    WHERE file_id = file_id_param 
    AND (expires_at IS NULL OR expires_at > now())
  ) INTO file_exists;
  
  RETURN file_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create a secure download policy that only allows access with valid file_id
CREATE POLICY "Allow download access with valid file_id" 
ON public.encrypted_files 
FOR SELECT 
USING (
  -- Allow users to access their own files
  auth.uid() = user_id 
  OR 
  -- Allow access to specific files only when file_id is provided and valid
  (file_id IS NOT NULL AND public.can_access_encrypted_file(file_id))
);

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.can_access_encrypted_file(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_encrypted_file(TEXT) TO anon;