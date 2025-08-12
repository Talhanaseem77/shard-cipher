-- Fix function search path security warning
CREATE OR REPLACE FUNCTION public.derive_key_from_password(password text, salt text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Simple PBKDF2-like derivation (in production, use proper PBKDF2)
  RETURN encode(
    digest(password || salt || 'file_index_encryption', 'sha256'), 
    'hex'
  );
END;
$$;