-- Fix Document Schema - Add missing uploaded_by and document_name columns
-- Run this in your Supabase SQL Editor

-- Add uploaded_by column (this is missing and needed by DocumentManager)
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS uploaded_by text;

-- Add document_name column if it doesn't exist  
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS document_name text;

-- Add description column for additional documents
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS description text;

-- Update existing records to populate document_name from file_name for backward compatibility
UPDATE public.documents 
SET document_name = file_name 
WHERE document_name IS NULL;

-- Verify the columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND table_schema = 'public'
ORDER BY ordinal_position;