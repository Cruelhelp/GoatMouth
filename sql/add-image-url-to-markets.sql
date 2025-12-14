-- Add image_url column to markets table
-- Run this in Supabase SQL Editor

ALTER TABLE markets
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN markets.image_url IS 'URL of the market image (optional)';
