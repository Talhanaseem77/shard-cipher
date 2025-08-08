-- Drop the complex policy and create a simpler one for downloads
DROP POLICY IF EXISTS "Allow file downloads by file_id" ON public.encrypted_files;

-- Allow public read access to encrypted_files for download functionality
-- This is secure because the files are encrypted and keys are never stored in the database
CREATE POLICY "Allow public downloads of encrypted files"
ON public.encrypted_files
FOR SELECT
USING (true);