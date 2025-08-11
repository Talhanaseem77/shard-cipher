-- Create storage policies for encrypted-files bucket
-- Allow public downloads (files are encrypted so this is safe)
CREATE POLICY "Allow public downloads of encrypted files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'encrypted-files');

-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload their own encrypted files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'encrypted-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own encrypted files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'encrypted-files' AND auth.uid()::text = (storage.foldername(name))[1]);