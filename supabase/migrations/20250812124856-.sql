-- Fix remaining security linter warnings

-- 1. Fix function search path issues by ensuring all functions have proper search_path
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  event_data jsonb,
  target_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow authenticated users to create audit logs, except for specific system events
  IF auth.uid() IS NULL AND event_type NOT IN ('failed_login', 'suspicious_activity') THEN
    RETURN;
  END IF;
  
  INSERT INTO public.encrypted_audit_logs (
    user_id,
    log_type,
    encrypted_log_entry,
    ip_address
  ) VALUES (
    COALESCE(target_user_id, auth.uid()),
    event_type,
    encrypt_text(event_data::text, 'audit_key_placeholder'),
    inet_client_addr()
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_file_access_rate_limit(
  file_id_param text,
  max_requests_per_hour integer DEFAULT 100
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_count integer;
  current_ip inet;
BEGIN
  current_ip := inet_client_addr();
  
  -- Clean up old rate limit entries (older than 1 hour)
  DELETE FROM public.file_access_rate_limit 
  WHERE window_start < now() - interval '1 hour';
  
  -- Get current count for this IP and file in the last hour
  SELECT COALESCE(SUM(access_count), 0) INTO current_count
  FROM public.file_access_rate_limit
  WHERE file_id = file_id_param 
    AND ip_address = current_ip
    AND window_start > now() - interval '1 hour';
  
  -- If within limits, update/insert rate limit record
  IF current_count < max_requests_per_hour THEN
    INSERT INTO public.file_access_rate_limit (
      user_id,
      file_id,
      ip_address,
      access_count,
      window_start
    ) VALUES (
      auth.uid(),
      file_id_param,
      current_ip,
      1,
      now()
    )
    ON CONFLICT (user_id, file_id, ip_address) 
    DO UPDATE SET 
      access_count = file_access_rate_limit.access_count + 1,
      window_start = CASE 
        WHEN file_access_rate_limit.window_start < now() - interval '1 hour' 
        THEN now() 
        ELSE file_access_rate_limit.window_start 
      END;
    
    RETURN true;
  ELSE
    -- Log rate limit violation
    PERFORM public.log_security_event(
      'rate_limit_violation',
      jsonb_build_object(
        'file_id', file_id_param,
        'ip_address', current_ip::text,
        'current_count', current_count,
        'limit', max_requests_per_hour
      )
    );
    
    RETURN false;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.encrypt_text(input_text text, key_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  -- Placeholder implementation - in production, replace with proper encryption
  -- This is just to make the audit logging work without breaking existing functionality
  RETURN encode(input_text::bytea, 'base64');
END;
$function$;