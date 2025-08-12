-- CRITICAL FIX: Remove the remaining overly permissive policy
-- This policy still has USING condition: true which is a major security vulnerability

DROP POLICY IF EXISTS "System can manage rate limit data" ON public.file_access_rate_limit;

-- The rate limiting table should only have these restricted policies:
-- 1. Users can view their own rate limit data (read-only)
-- 2. All other operations (INSERT, UPDATE, DELETE) should be blocked for direct user access
-- 3. Only security definer functions should be able to modify this data

-- Create secure policies that block all direct manipulation
CREATE POLICY "Block direct inserts on rate limit data" 
ON public.file_access_rate_limit 
FOR INSERT 
TO authenticated
WITH CHECK (false); -- Block all direct inserts

CREATE POLICY "Block direct updates on rate limit data" 
ON public.file_access_rate_limit 
FOR UPDATE 
TO authenticated
USING (false); -- Block all direct updates

CREATE POLICY "Block direct deletes on rate limit data" 
ON public.file_access_rate_limit 
FOR DELETE 
TO authenticated
USING (false); -- Block all direct deletes