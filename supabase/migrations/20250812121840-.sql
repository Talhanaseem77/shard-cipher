-- Create function to generate file IDs
CREATE OR REPLACE FUNCTION public.generate_file_id()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create encrypted_files table
CREATE TABLE public.encrypted_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_id TEXT NOT NULL UNIQUE,
  encrypted_filename TEXT NOT NULL,
  encrypted_metadata JSONB,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  download_count INTEGER NOT NULL DEFAULT 0,
  max_downloads INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on encrypted_files
ALTER TABLE public.encrypted_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for encrypted_files
CREATE POLICY "Users can view their own encrypted files" 
ON public.encrypted_files 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own encrypted files" 
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

-- Public access policy for downloads (when file_id is known)
CREATE POLICY "Allow public download access by file_id" 
ON public.encrypted_files 
FOR SELECT 
USING (true);

-- Create user_file_index table for storing encrypted file lists
CREATE TABLE public.user_file_index (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  encrypted_file_list TEXT NOT NULL DEFAULT '[]',
  salt TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_file_index
ALTER TABLE public.user_file_index ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_file_index
CREATE POLICY "Users can view their own file index" 
ON public.user_file_index 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own file index" 
ON public.user_file_index 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own file index" 
ON public.user_file_index 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create encrypted_audit_logs table
CREATE TABLE public.encrypted_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  encrypted_log_entry TEXT NOT NULL,
  log_type TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on encrypted_audit_logs
ALTER TABLE public.encrypted_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for encrypted_audit_logs
CREATE POLICY "Users can view their own audit logs" 
ON public.encrypted_audit_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create audit logs" 
ON public.encrypted_audit_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_encrypted_files_updated_at
BEFORE UPDATE ON public.encrypted_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_file_index_updated_at
BEFORE UPDATE ON public.user_file_index
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_encrypted_files_user_id ON public.encrypted_files(user_id);
CREATE INDEX idx_encrypted_files_file_id ON public.encrypted_files(file_id);
CREATE INDEX idx_user_file_index_user_id ON public.user_file_index(user_id);
CREATE INDEX idx_encrypted_audit_logs_user_id ON public.encrypted_audit_logs(user_id);
CREATE INDEX idx_encrypted_audit_logs_created_at ON public.encrypted_audit_logs(created_at);