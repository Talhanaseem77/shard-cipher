-- Create storage bucket for encrypted files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('encrypted-files', 'encrypted-files', false, 104857600, NULL);

-- Create table for encrypted file metadata
CREATE TABLE public.encrypted_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_id TEXT NOT NULL UNIQUE, -- Short public file ID
  encrypted_filename TEXT NOT NULL, -- AES-GCM encrypted original filename
  encrypted_metadata JSONB NOT NULL, -- AES-GCM encrypted file metadata
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  storage_path TEXT NOT NULL, -- Path in Supabase storage
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  max_downloads INTEGER,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for encrypted user file index
CREATE TABLE public.user_file_index (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  encrypted_file_list TEXT NOT NULL, -- AES-GCM encrypted list of user's files
  salt TEXT NOT NULL, -- Salt for deriving encryption key from password
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for encrypted audit logs
CREATE TABLE public.encrypted_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  encrypted_log_entry TEXT NOT NULL, -- AES-GCM encrypted log data
  log_type TEXT NOT NULL, -- 'login', 'upload', 'download', 'delete'
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.encrypted_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_file_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encrypted_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for encrypted_files
CREATE POLICY "Users can view their own encrypted files" 
ON public.encrypted_files 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own encrypted files" 
ON public.encrypted_files 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own encrypted files" 
ON public.encrypted_files 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own encrypted files" 
ON public.encrypted_files 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for user_file_index
CREATE POLICY "Users can manage their own file index" 
ON public.user_file_index 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for encrypted_audit_logs
CREATE POLICY "Users can view their own audit logs" 
ON public.encrypted_audit_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs" 
ON public.encrypted_audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Storage RLS policies for encrypted files
CREATE POLICY "Users can upload their own encrypted files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'encrypted-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own encrypted files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'encrypted-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own encrypted files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'encrypted-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Public access policy for file downloads (without authentication)
CREATE POLICY "Public access to encrypted files via file_id" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'encrypted-files');

-- Function to generate short file IDs
CREATE OR REPLACE FUNCTION public.generate_file_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.encrypted_files WHERE file_id = result) LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_encrypted_files_updated_at
BEFORE UPDATE ON public.encrypted_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_file_index_updated_at
BEFORE UPDATE ON public.user_file_index
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();