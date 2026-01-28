# Organization Scoping

## Overview

Replace per-event admin assignments (`event_admins` junction table) with organization-based access. Admins belong to an organization, events belong to an organization, and all admins in an org automatically see all that org's events. This eliminates the privacy leak where any admin could see all admin emails in the system via the event admin dropdown, and simplifies the access model overall.

## Design Decisions

**Organizations replace event_admins.** The `event_admins` junction table is dropped entirely. Event access is determined by matching the admin's `organization_id` to the event's `organization_id`. No more per-event admin invitations.

**Events get organization_id.** Set automatically from the creating admin's org. No manual org selection needed at event creation time.

**Super admin default view is org-scoped.** The super admin's event list defaults to showing their own org's events (same experience as any admin), with an "All Events" tab that shows events across all orgs. This is a UI-level distinction — RLS allows super admins to access any event.

**Org management lives on the Manage Admins page.** The super admin can create orgs and assign admins to orgs from the existing admin management page. No separate org management route. The Add Admin form gets an organization dropdown.

**Access request club_name maps to orgs.** When reviewing access requests, the super admin sees `club_name` and can select the matching org (or create a new one) when inviting the admin. This is a manual step, not auto-matched.

**RLS uses helper functions.** New `get_admin_org_id()` and `is_super_admin()` functions replace the `event_admins` JOIN patterns in RLS policies. This keeps policies readable and avoids repetition.

**No "Event Admins" section on event detail page.** The entire section (dropdown, assigned admins list, add/remove actions) is removed. If you're in the org, you see the event. Period.

## Tasks

### Task 1: Database migration

- **What**: New migration `010_organizations.sql` that:
  1. Creates `organizations` table (`id` UUID PK, `name` TEXT NOT NULL UNIQUE, `created_at` TIMESTAMPTZ)
  2. Adds `organization_id UUID REFERENCES organizations(id)` to `admins` table (nullable initially for backfill)
  3. Adds `organization_id UUID REFERENCES organizations(id)` to `events` table (nullable initially for backfill)
  4. Creates a default org (e.g., name from the first admin's email domain or a hardcoded "Default") and backfills all existing admins and events to it
  5. Sets `NOT NULL` constraint on both `organization_id` columns after backfill
  6. Creates helper functions:
     - `get_admin_org_id()` — returns current user's org ID (SECURITY DEFINER)
     - `is_super_admin()` — returns true if current user is super admin (SECURITY DEFINER)
  7. Drops RLS policies that reference `event_admins`: `events_update_admin`, `events_delete_admin`, `beers_update_admin`, `beers_delete_admin`, `event_admins_select_admin`, `event_admins_insert_admin`, `event_admins_delete_admin`
  8. Creates new RLS policies:
     - `events_update_org`: admin's org matches event's org, OR is super admin
     - `events_delete_org`: same
     - `beers_update_org`: admin's org matches event's org (via events join), OR is super admin
     - `beers_delete_org`: same
  9. Adds RLS and grants for `organizations` table (authenticated SELECT for all admins, INSERT/UPDATE/DELETE for super admins only)
  10. Drops `event_admins` table (and its index)
  11. Adds indexes: `idx_admins_org` on `admins(organization_id)`, `idx_events_org` on `events(organization_id)`
- **Acceptance criteria**: Migration runs cleanly. Existing admins and events are assigned to a default org. `event_admins` table no longer exists. RLS policies use org-based checks.

### Task 2: Update TypeScript types

- **What**: Update `src/lib/types.ts` and `src/lib/database.types.ts` to reflect schema changes.
  - Add `Organization` type
  - Add `organization_id` to `Admin` and `Event` types
  - Remove `EventAdmin` type (if it exists)
  - Remove any `event_admins` references from database types
- **Acceptance criteria**: `npm run check` passes. Types match new schema.

### Task 3: Update admin layout server

- **What**: Update `src/routes/admin/+layout.server.ts` to include the admin's `organization_id` and org name in the returned data.
- **Acceptance criteria**: `parentData` in child routes includes `admin.organization_id` and `admin.organization_name` (or a nested `organization` object).

### Task 4: Update admin event list (org-scoped + All Events tab)

- **What**: Update `src/routes/admin/+page.server.ts` and `+page.svelte`:
  - **Server**: Replace `event_admins` JOIN query with direct `events` query filtered by `organization_id = admin.organization_id`. If super admin and "all" tab is active (via URL param like `?view=all`), fetch all events instead.
  - **Svelte**: Add tab UI for super admin: "Your Org" (default) | "All Events". Regular admins see no tabs, just their org's events. "All Events" tab shows org name alongside each event.
  - **Event creation**: Set `organization_id` on the new event from the creating admin's org. Remove the `event_admins` insert (no longer exists).
  - **Event deletion**: Update access check from `event_admins` lookup to org match (or super admin).
- **Acceptance criteria**: Admins see only their org's events by default. Super admin can toggle to see all events. New events are created with the correct org. Deleting events works with org-based auth.

### Task 5: Update admin event detail page

- **What**: Update `src/routes/admin/events/[code]/+page.server.ts` and `+page.svelte`:
  - **Server load**: Replace `event_admins` access check with org match (`admin.organization_id === event.organization_id` or super admin). Remove the `allAdmins` and `eventAdmins` queries entirely.
  - **Server actions**: Remove `addEventAdmin` and `removeEventAdmin` actions.
  - **Svelte**: Remove the entire "Event Admins" card (lines ~858-921). Remove `assignedAdmins`, `allAdmins`, `availableAdmins`, `selectedAdminId` state/derived. Remove related form error handling.
  - Remove `currentAdminId` from returned data (no longer needed without the self-check).
- **Acceptance criteria**: Event detail page loads with org-based access check. No "Event Admins" section visible. All existing functionality (beers, votes, results, QR codes) still works.

### Task 6: Update Manage Admins page (org management + org selector)

- **What**: Update `src/routes/admin/admins/+page.server.ts` and `+page.svelte`:
  - **Server load**: Also fetch all organizations.
  - **UI**:
    - Add "Organizations" section: list of orgs with admin count, "Create Organization" form (name input).
    - Admin list: show each admin's org name next to their email.
    - Add Admin form: add an "Organization" dropdown (required, lists all orgs).
  - **Server actions**:
    - `add`: Accept `organizationId` from form, set on the new admin record.
    - New `createOrg` action: inserts into organizations table.
  - **Access requests section**: Show `club_name` prominently (it already does). No auto-matching — the super admin reads the club name and picks the right org when inviting.
- **Acceptance criteria**: Super admin can create orgs. Add Admin form requires org selection. Admin list shows org membership. Existing approve/dismiss flow still works.

### Task 7: Clean up dead code and update docs

- **What**:
  - Remove any remaining references to `event_admins` in code (grep for it).
  - Update `CLAUDE.md` schema section: remove `event_admins`, add `organizations`, update `admins` and `events` with `organization_id`.
  - Update `docs/plans/implementation-plan.md` schema section to match.
  - Update route descriptions if any mention event admin assignment.
- **Acceptance criteria**: No references to `event_admins` remain in application code. Docs reflect the new model.

## Open Questions

1. **Org renaming/deletion**: Not implementing now. Super admin can create orgs but not rename or delete them. If needed, can add later — it's just an UPDATE/DELETE on a simple table.
2. **Moving admins between orgs**: Not implementing a UI for this. If needed, super admin can do it via Supabase dashboard. Could add later as an admin detail/edit view.
3. **Multi-org admins**: An admin belongs to exactly one org. If someone runs events for two clubs, they'd need two accounts. This matches the real-world model (one person, one club role) and avoids complexity. Revisit if it becomes a real need.
