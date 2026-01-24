-- Migration: Make brewer field optional for anonymous/blind tasting competitions
-- This allows events where brewer identity is not disclosed to voters

-- Remove NOT NULL constraint from brewer column
ALTER TABLE beers ALTER COLUMN brewer DROP NOT NULL;

-- Add comment explaining the nullable brewer field
COMMENT ON COLUMN beers.brewer IS 'Brewer name - nullable for anonymous/blind tasting competitions';
