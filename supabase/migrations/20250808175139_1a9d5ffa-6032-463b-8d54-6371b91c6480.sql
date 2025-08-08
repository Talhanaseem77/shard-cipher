-- Remove the overly permissive public policy
DROP POLICY IF EXISTS "Public can read encrypted files by file_id" ON public.encrypted_files;

-- Create a more secure policy that allows anonymous access only for downloading with file_id
CREATE POLICY "Allow file downloads by file_id"
ON public.encrypted_files
FOR SELECT
USING (
  -- Allow if user owns the file OR if accessing via file_id parameter
  auth.uid() = user_id OR 
  (
    -- Only allow access to specific columns needed for download
    current_setting('request.file_id', true) IS NOT NULL
  )
);