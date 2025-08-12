-- Fix the generate_file_id function to properly cast the integer parameter
CREATE OR REPLACE FUNCTION public.generate_file_id()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN encode(gen_random_bytes(16::integer), 'hex');
END;
$function$