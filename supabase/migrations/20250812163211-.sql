-- Add iv column to user_file_index table for proper encryption
ALTER TABLE public.user_file_index 
ADD COLUMN iv text NOT NULL DEFAULT '';