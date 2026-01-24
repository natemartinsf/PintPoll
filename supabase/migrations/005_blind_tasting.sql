-- Add blind_tasting column to events table
-- When enabled, hides brewer names from voters during voting

ALTER TABLE events ADD COLUMN blind_tasting BOOLEAN DEFAULT FALSE;

-- No backfill needed: existing events default to FALSE (normal behavior)
