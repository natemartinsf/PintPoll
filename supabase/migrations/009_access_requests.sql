-- Access requests: public form submissions from prospective organizers

-- ============================================================================
-- HELPER FUNCTION: Check if current user is a super admin (bypasses RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND is_super = TRUE
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLE
-- ============================================================================

CREATE TABLE access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  club_name TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a request (public form, no auth required)
CREATE POLICY "access_requests_insert_public"
  ON access_requests FOR INSERT
  TO public
  WITH CHECK (true);

-- Only super admins can view requests
CREATE POLICY "access_requests_select_super_admin"
  ON access_requests FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Only super admins can update request status
CREATE POLICY "access_requests_update_super_admin"
  ON access_requests FOR UPDATE
  TO authenticated
  USING (is_super_admin());

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT INSERT ON access_requests TO anon;
GRANT INSERT ON access_requests TO authenticated;
GRANT SELECT, UPDATE ON access_requests TO authenticated;
