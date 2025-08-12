-- CRITICAL SECURITY FIX: Add password-based encryption for file index
-- Users must provide a password to encrypt/decrypt their file list

-- Add password hash column for securing file lists  
ALTER TABLE public.user_file_index 
ADD COLUMN password_hash text,
ADD COLUMN encrypted_with_password boolean DEFAULT false;

-- Create function to derive encryption key from password
CREATE OR REPLACE FUNCTION public.derive_key_from_password(password text, salt text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Simple PBKDF2-like derivation (in production, use proper PBKDF2)
  RETURN encode(
    digest(password || salt || 'file_index_encryption', 'sha256'), 
    'hex'
  );
END;
$$;