-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "Allow public downloads of encrypted files" ON storage.objects;

-- Create the correct public download policy 
CREATE POLICY "Allow public downloads of encrypted files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'encrypted-files');