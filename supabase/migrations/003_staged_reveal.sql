-- Staged reveal: Replace results_visible boolean with reveal_stage integer
-- Stages: 0=hidden, 1=ceremony started, 2=3rd revealed, 3=2nd revealed, 4=1st revealed

-- Add new column
ALTER TABLE events ADD COLUMN reveal_stage INTEGER DEFAULT 0;

-- Migrate existing data: fully revealed events get stage 4
UPDATE events SET reveal_stage = 4 WHERE results_visible = TRUE;

-- Drop old column
ALTER TABLE events DROP COLUMN results_visible;
