-- Update user_file_index table to include iv column (if not exists)
ALTER TABLE public.user_file_index 
ADD COLUMN IF NOT EXISTS iv TEXT DEFAULT '';