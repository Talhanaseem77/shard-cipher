-- CRITICAL SECURITY FIX: Remove overly permissive file access policy
-- This policy allows public access to file metadata through can_access_encrypted_file function
-- which exposes file paths, sizes, and download counts to unauthorized users

-- Drop the problematic policy that allows public access
DROP POLICY IF EXISTS "Allow download access with valid file_id" ON public.encrypted_files;

-- Create a more restrictive policy that only allows metadata access to file owners
-- For shared file downloads, the download function should handle access control internally
CREATE POLICY "Users can only view their own file metadata" 
ON public.encrypted_files 
FOR SELECT 
USING (auth.uid() = user_id);

-- Update the can_access_encrypted_file function to be more secure
-- It should only check file validity without exposing metadata to unauthorized users
CREATE OR REPLACE FUNCTION public.can_access_encrypted_file(file_id_param text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  file_exists BOOLEAN;
  file_owner_id UUID;
BEGIN
  -- Check if file exists and get owner info (without exposing metadata)
  SELECT EXISTS(
    SELECT 1 FROM public.encrypted_files 
    WHERE file_id = file_id_param 
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_downloads IS NULL OR download_count < max_downloads)
  ), user_id INTO file_exists, file_owner_id
  FROM public.encrypted_files 
  WHERE file_id = file_id_param;
  
  -- Only allow access if user is the owner OR this is a valid shared file
  -- For shared files, we just verify the file exists and is valid
  IF file_exists THEN
    -- Log access attempt for security monitoring (only for valid files)
    INSERT INTO public.encrypted_audit_logs (
      user_id,
      log_type,
      encrypted_log_entry,
      ip_address
    ) VALUES (
      COALESCE(auth.uid(), file_owner_id),
      'file_access_attempt',
      encrypt_text(jsonb_build_object(
        'file_id', file_id_param,
        'action', 'access_check',
        'result', 'allowed',
        'requesting_user', auth.uid(),
        'file_owner', file_owner_id,
        'timestamp', now()
      )::text, 'audit_key_placeholder'),
      inet_client_addr()
    );
  END IF;
  
  -- Return true only if file exists and is valid
  -- The actual metadata access is now controlled by RLS policies
  RETURN file_exists;
END;
$function$;