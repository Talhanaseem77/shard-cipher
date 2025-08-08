-- Allow public access to encrypted_files for downloads (read-only with file_id)
CREATE POLICY "Public can read encrypted files by file_id"
ON public.encrypted_files
FOR SELECT
USING (true);

-- Update existing policy to be more specific for authenticated users
DROP POLICY IF EXISTS "Users can view their own encrypted files" ON public.encrypted_files;

CREATE POLICY "Users can view their own encrypted files"
ON public.encrypted_files
FOR SELECT
USING (auth.uid() = user_id);