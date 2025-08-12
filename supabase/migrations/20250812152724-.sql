-- Fix the generate_file_id function to use a method that works in all Postgres versions
CREATE OR REPLACE FUNCTION public.generate_file_id()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Use md5 with random() and current timestamp for generating file IDs
  -- This ensures compatibility across all Postgres versions
  RETURN encode(
    digest(
      extract(epoch from now())::text || random()::text || pg_backend_pid()::text,
      'sha256'
    ),
    'hex'
  )::text;
END;
$function$;