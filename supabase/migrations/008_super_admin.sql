-- Super admin role: only super admins can manage other admins and view access requests

ALTER TABLE admins ADD COLUMN is_super BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: set site owner as super admin
-- TODO: hardcoded email in a public repo — replace with a migration that uses
-- a different identifier (e.g., oldest created_at) and scrub git history
UPDATE admins SET is_super = TRUE WHERE email = '[REDACTED]';
