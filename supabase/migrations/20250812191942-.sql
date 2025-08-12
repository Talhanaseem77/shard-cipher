-- Create function to increment download count
CREATE OR REPLACE FUNCTION public.increment_download_count(file_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.encrypted_files 
  SET download_count = download_count + 1
  WHERE encrypted_files.file_id = increment_download_count.file_id;
END;
$$;