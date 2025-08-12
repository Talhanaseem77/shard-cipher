-- Fix security warnings by setting search_path for all functions
-- Update the file ID generation function
CREATE OR REPLACE FUNCTION public.generate_file_id()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Update the timestamp function  
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Update the file access function
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;