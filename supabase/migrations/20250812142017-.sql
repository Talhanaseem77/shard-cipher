-- Enable pgcrypto extension to provide gen_random_bytes function
-- This is required for the generate_file_id() function to work properly
CREATE EXTENSION IF NOT EXISTS pgcrypto;