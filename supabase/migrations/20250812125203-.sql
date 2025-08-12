-- CRITICAL SECURITY FIX: Restrict rate limiting table access

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can manage rate limit data" ON public.file_access_rate_limit;

-- Create secure, restrictive policies for rate limiting table
-- Users can only view their own rate limit data (read-only)
CREATE POLICY "Users can view their own rate limit data" 
ON public.file_access_rate_limit 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Only allow system functions to insert rate limit records
-- This prevents direct user manipulation
CREATE POLICY "System functions can insert rate limit data" 
ON public.file_access_rate_limit 
FOR INSERT 
TO authenticated
WITH CHECK (false); -- Block all direct inserts by users

-- Only allow system functions to update rate limit records
CREATE POLICY "System functions can update rate limit data" 
ON public.file_access_rate_limit 
FOR UPDATE 
TO authenticated
USING (false); -- Block all direct updates by users

-- Only allow system functions to delete old rate limit records
CREATE POLICY "System functions can delete rate limit data" 
ON public.file_access_rate_limit 
FOR DELETE 
TO authenticated
USING (false); -- Block all direct deletes by users

-- Update the rate limiting function to use a security definer approach
-- This allows the function to bypass RLS for system operations
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
  current_user_id uuid;
BEGIN
  current_ip := inet_client_addr();
  current_user_id := auth.uid();
  
  -- Clean up old rate limit entries (older than 1 hour)
  -- Using DELETE with security definer privileges
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
    -- Use security definer privileges to manage rate limit data
    INSERT INTO public.file_access_rate_limit (
      user_id,
      file_id,
      ip_address,
      access_count,
      window_start
    ) VALUES (
      current_user_id,
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
        'limit', max_requests_per_hour,
        'user_id', current_user_id::text
      )
    );
    
    RETURN false;
  END IF;
END;
$function$;

-- Add a unique constraint to prevent duplicate entries
-- This helps prevent race conditions and ensures data integrity
ALTER TABLE public.file_access_rate_limit 
ADD CONSTRAINT unique_user_file_ip_window 
UNIQUE (user_id, file_id, ip_address);

-- Create an index for better performance on cleanup operations
CREATE INDEX IF NOT EXISTS idx_rate_limit_window_cleanup 
ON public.file_access_rate_limit (window_start) 
WHERE window_start < now() - interval '1 hour';