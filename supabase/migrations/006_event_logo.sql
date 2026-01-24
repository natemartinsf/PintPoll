-- Add logo_url column to events table
-- Stores the Supabase Storage URL for the event logo

ALTER TABLE events ADD COLUMN logo_url TEXT;

-- No backfill needed: existing events will have NULL logo (graceful fallback)
