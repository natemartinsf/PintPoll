# Landing Page & Access Request Flow

## Overview

Add a public landing page at `/` that introduces PintPoll and lets prospective organizers request access. Includes a Supabase table for access requests, a public submission form on the landing page, and an admin section on the existing Manage Admins page to review pending requests. Adds a super admin role to restrict admin management to the site owner.

## Design Decisions

- **Inline form over modal**: The "Request Access" CTA scrolls to an inline form section at the bottom of the landing page. Simpler, more mobile-friendly.
- **Admin view on existing page**: Access requests appear as a new section on `/admin/admins` rather than a separate route. This keeps the admin panel lean and puts requests next to the invite action (natural workflow: review request → invite via existing form).
- **No auto-approval**: Requests are purely informational. Admin reviews, then manually uses the existing "Add Admin" form to invite. The `status` column on `access_requests` is for the admin's own tracking (pending/approved/dismissed) — it doesn't trigger anything.
- **Super admin role**: A boolean `is_super` column on `admins`. Only super admins can add/remove admins and view access requests. The "Manage Admins" nav link is hidden for regular admins, and the page itself is gated server-side. Regular admins can only manage their assigned events.
- **Email notification via Resend**: When an access request is submitted, the SvelteKit server action sends a notification email to a configured address (env var). Uses Resend's REST API — one `fetch()` call, no Supabase Edge Functions or webhooks needed. Supabase's built-in email is auth-only and can't send arbitrary transactional emails.
- **Form fields**: name, email, club_name, message (optional free-text).
- **Ko-fi link**: `ko-fi.com/natemartinsf`. Subtle placement — footer on the landing page, and small footer links on the vote and results pages.
- **Landing page replaces the current design preview** at `/+page.svelte` (which is marked for removal).
- **No auth required**: The landing page and form submission are fully public. RLS allows anonymous INSERT.

## Tasks

### Task 1: Super admin role migration

- **What**: New migration file `008_super_admin.sql` in `supabase/migrations/`.
- **Schema change**: Add `is_super BOOLEAN NOT NULL DEFAULT FALSE` to the `admins` table.
- **Backfill**: Update the site owner's admin record to `is_super = true`. Since we can't know the exact user at migration time, the migration sets the oldest admin record (first `created_at`) as super. Alternatively, the migration can set ALL current admins as super and the owner can demote others — either works for a small app.
- **RLS**: No RLS changes needed — `admins` table access is already admin-gated. The `is_super` check happens in application code.
- **Acceptance criteria**: Migration adds the column. At least one admin is marked as super.

### Task 2: Gate admin management behind super admin

- **What**: Update `/admin/admins` page and the admin layout to restrict access.
- **Server-side**: In `+page.server.ts` for `/admin/admins`, check that the current admin has `is_super = true`. Return 403 or redirect if not.
- **Nav**: In `/admin/+layout.svelte`, only show the "Manage Admins" link if the admin is super. Pass `isSuper` from the layout server load.
- **Layout server**: Update `/admin/+layout.server.ts` to include `isSuper` in the returned data.
- **Acceptance criteria**: Non-super admins cannot access `/admin/admins` and don't see the nav link. Super admins see and access it as before.

### Task 3: Database migration for access_requests table

- **What**: New migration file `009_access_requests.sql` in `supabase/migrations/`.
- **Table schema**:
  - `id` UUID DEFAULT gen_random_uuid() PRIMARY KEY
  - `name` TEXT NOT NULL
  - `email` TEXT NOT NULL
  - `club_name` TEXT NOT NULL
  - `message` TEXT (nullable, optional)
  - `status` TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed'))
  - `created_at` TIMESTAMPTZ DEFAULT NOW()
- **RLS**: Enable RLS. Public INSERT (anon + authenticated). SELECT and UPDATE restricted to authenticated users who are in the `admins` table with `is_super = true`.
- **Acceptance criteria**: Migration file exists and follows the pattern of existing migrations. SQL is valid and can be run against Supabase.

### Task 4: Landing page at /

- **What**: Replace `src/routes/+page.svelte` with the landing page. Add `src/routes/+page.server.ts` for the form action.
- **Page structure** (top to bottom):
  1. **Hero**: App name/logo + tagline ("Digital voting for homebrew competition people's choice awards"). "Request Access" button that scrolls to the form section.
  2. **How It Works**: Two columns (or stacked on mobile) — Voter flow (scan QR → allocate points → update anytime before results) and Organizer flow (create event → generate QR codes → reveal results live).
  3. **Request Access form**: Inline section with name, email, club/organization name, optional message. Submit button. Success/error feedback.
  4. **Footer**: Ko-fi tip link (ko-fi.com/natemartinsf), minimal copyright/branding.
- **Server action**: `+page.server.ts` with a named `requestAccess` action that inserts into `access_requests`. Uses the public Supabase client (anon). Basic validation (required fields, email format). Returns success/error to the form. On success, also sends notification email (Task 5).
- **Styling**: Use existing craft brewery design system — `.card`, `.btn-primary`, `.input`, `.heading`, `.subheading`, `.text-muted`, amber/brown palette, cream background.
- **Acceptance criteria**: Landing page renders at `/`. Form submits and inserts a row into `access_requests`. Success message shown after submission. Page is mobile-first and consistent with existing styling.

### Task 5: Email notification on access request

- **What**: After a successful access request insert (in the Task 4 server action), send a notification email to the site owner.
- **Implementation**: Single `fetch()` call to `https://api.resend.com/emails` with the Resend API key from env var `RESEND_API_KEY`. Notification recipient address from env var `NOTIFY_EMAIL`.
- **Email content**: Simple text — "New PintPoll access request from [name] ([email]) at [club_name]" with the message if provided.
- **Failure handling**: Log the error but don't fail the form submission. The request is already saved in the database — the email is best-effort.
- **Env vars**: `RESEND_API_KEY`, `NOTIFY_EMAIL`. Add to `.env.example` if one exists, document in CLAUDE.md.
- **Acceptance criteria**: Email is sent on successful request submission. Form still succeeds even if email fails.

### Task 6: Admin view for access requests on Manage Admins page

- **What**: Add an "Access Requests" section to `src/routes/admin/admins/+page.svelte` and load requests in `+page.server.ts`.
- **Data loading**: Fetch from `access_requests` ordered by `created_at` desc. Show pending requests first, then dismissed/approved.
- **UI**: Card section below the existing admin list. Each request shows name, email, club_name, message (if present), submitted date, and current status. Buttons to mark as "approved" or "dismissed" (updates `status` column only — actual invite is done via the existing Add Admin form above).
- **Server actions**: Add `approveRequest` and `dismissRequest` actions that update the `status` field.
- **Acceptance criteria**: Pending requests visible on the Manage Admins page. Status can be updated. The admin can then copy the email and use the existing Add Admin form to invite.

### Task 7: Ko-fi link on vote and results pages

- **What**: Add a subtle footer with the Ko-fi link to both the vote page (`/vote/[event_code]/[voter_code]`) and the results page (`/results/[code]`).
- **Placement**: Both pages currently end with no footer. Add a small centered footer after the main content — muted text, small font, something like "Made with [beer emoji] by PintPoll · Support us on Ko-fi". Link to `https://ko-fi.com/natemartinsf`.
- **Vote page**: After the beer list, inside the outer `min-h-screen` div.
- **Results page**: After `</main>`, inside the `flex flex-col` container (will naturally sit at the bottom).
- **Styling**: `.text-muted`, `text-xs` or `text-sm`, generous top padding to separate from content. Should not distract from the voting/results experience.
- **Acceptance criteria**: Both pages show a subtle Ko-fi link at the bottom. Link opens in a new tab. Does not interfere with existing layout or functionality.

## Open Questions

- **Rate limiting on the public form**: Not implementing now. If spam becomes an issue, can add a simple honeypot field or Supabase rate limiting later.
