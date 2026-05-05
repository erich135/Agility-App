# Changelog

All notable changes to the LMW Financial Solutions app will be documented in this file.

---

## [2026-05-05] - Meetings Feature + Global Calendar Popup

### ✨ New Features

#### Meetings Module
- **`database/NEW_SQL_SCRIPTS_GO_HERE/create_meetings_table.sql`** — new `meetings` table with `title`, `meeting_date` (TIMESTAMPTZ), `location`, `notes`, `client_id`, `job_id`, `created_by`, `reminders` (JSONB array of offset keys), and `reminders_sent` (JSONB — prevents duplicate push notifications)
- **`src/components/MeetingsPage.jsx`** — full Meetings page with:
  - Stats row (Upcoming / Today / This Week / Past)
  - Search bar and filter tabs (All / Upcoming / Today / Past)
  - Colour-coded meeting cards (red=imminent, orange=today, yellow=soon, blue=upcoming, gray=past)
  - Reminder badges showing which offsets have already fired (green) vs pending (gray)
  - Edit and delete actions with confirmation dialog
- **`src/components/MeetingForm.jsx`** — create/edit modal with title, datetime picker, location, client dropdown, job dropdown (now shows `Job Title — Client Name` to disambiguate), notes, and 6 reminder checkboxes (1 week / 3 days / 1 day / 4 hours / 1 hour / 30 minutes)
  - Resets `reminders_sent` automatically when meeting time is changed

#### Meeting Reminder Crons
- **`api/cron-meeting-reminders.js`** — daily cron (04:00 UTC / 06:00 SAST) for long-lead reminders: 1 week, 3 days, 1 day before; uses ±12h matching window to tolerate drift
- **`api/cron-meeting-hourly.js`** — hourly cron for close-range reminders: 4 hours, 1 hour, 30 minutes before; 30-min reminder uses `requireInteraction: true`
- Both crons use the existing VAPID/webpush setup, deduplicate via `reminders_sent`, and clean up stale push endpoints

#### Global Calendar Popup
- **`src/components/GlobalCalendarPopup.jsx`** — full-screen modal calendar showing **meetings** (blue) and **job deadlines** (colour-coded by urgency: red=overdue, orange=today/tomorrow, yellow=≤7d, green=future) together in one view
  - Month navigation, "Today" button, date selection
  - Right panel shows all items for the selected date
  - All calendar grid pills and right-panel cards are **clickable** and open a detail popup
  - **Detail popup** shows: full date/time, location, client, linked job, notes, reminders set (meetings); due date + urgency badge, client, status, category, description (jobs)
  - Escape key closes the detail popup first, then the calendar
  - Clicking the backdrop dismisses

### 🔧 Changes

#### `src/components/Layout.jsx`
- Added **Calendar button** (blue pill with `CalendarClock` icon + "Calendar" label) in the top-bar header, visible on every page
- Imported and rendered `GlobalCalendarPopup` — toggled by the header button

#### `src/components/Sidebar.jsx`
- Added **Meetings** nav entry (CalendarClock icon) in the Core group, between Email and Admin

#### `src/App.jsx`
- Added `/meetings` route → `<MeetingsPage />`

#### `vercel.json`
- Added two new Vercel Cron entries:
  - `cron-meeting-reminders` — `0 4 * * *` (daily 04:00 UTC)
  - `cron-meeting-hourly` — `0 * * * *` (every hour)

### 📝 Modified Files
- `src/App.jsx` — MeetingsPage import + /meetings route
- `src/components/Layout.jsx` — Calendar header button + GlobalCalendarPopup
- `src/components/Sidebar.jsx` — Meetings nav item + CalendarClock icon import
- `vercel.json` — 2 new cron schedules

### 📝 New Files
- `database/NEW_SQL_SCRIPTS_GO_HERE/create_meetings_table.sql`
- `api/cron-meeting-reminders.js`
- `api/cron-meeting-hourly.js`
- `src/components/MeetingsPage.jsx`
- `src/components/MeetingForm.jsx`
- `src/components/GlobalCalendarPopup.jsx`

---

## [2026-05-04] - CIPC Registration Date Fix

### 🐛 Bug Fixes

#### `src/components/CIPCManagement.jsx`
- **Removed `due_month` from Supabase update payload** — column does not exist in the `clients` schema; the due month is already derived client-side from `registration_date` via `getDueMonthLabel()`
- **Removed misleading "Due Month" text input** from the CIPC edit form; replaced with a read-only display showing the month computed from the registration date, making it clear it is derived and not user-editable
- Removed `due_month` from all `formData` initialisations and state resets

#### `src/components/CustomerForm.jsx`
- **Added `registration_date` field** to the Add New Customer / Edit Customer modal ("Company Registration Date" date picker in the Basic Company Information section)
- Registration date is now captured in `formData` state, loaded from the DB when editing, and included in the `customerPayload` sent to Supabase
- Field is labelled with a hint *(used for CIPC AR & BO due dates)* so the purpose is explicit
- Fixes the root cause of the error: customers added via the Customer modal had no registration date, leaving the CIPC module unable to determine AR and BO filing due dates

### 📝 Modified Files
- `src/components/CIPCManagement.jsx` — removed `due_month` from payload, formData, and form UI
- `src/components/CustomerForm.jsx` — added `registration_date` to state, loader, payload, and UI

---

## [2026-04-21] - Notification System Overhaul

### 🔔 Interrupt Inbox — Snooze & Reminders

#### New: Snooze Button (`src/components/InterruptInbox.jsx`)
- Replaced the hardcoded "defer to tomorrow" clock button with a **Snooze dropdown** (6 options: 15 min / 30 min / 1 h / 2 h / Tomorrow 09:00 / Next Monday 09:00)
- Deferred items now show a blue "Reminds at HH:MM" line so snooze time is always visible
- **Age indicator dots** on every pending item icon: 🟢 < 1 h, 🟠 1–4 h, 🔴 4+ h

#### New: OS-level Snooze Action (`public/sw.js`, `api/push-snooze.js`)
- Interrupt-related push notifications now include **"⏰ Snooze 30 min"** and **"✅ Done"** action buttons in the OS notification banner — no app open required
- Snooze tapped → Service Worker calls `POST /api/push-snooze` silently in the background
- Done tapped → opens `/focus?resolveInterrupt=<id>` for in-app marking

### 🔔 Interrupt Reminder Crons

#### New: `api/cron-interrupt-reminders.js` (hourly)
- **Snooze expired**: Re-activates deferred items and sends a targeted push to the capturing user
- **Urgent stale**: Fires for `now`-urgency items still pending after 1 hour
- **End-of-day sweep**: Fires after 16:00 for `today`-urgency items still pending
- All 3 triggers route pushes **per user** via new `user_id` column on `interrupt_inbox`; falls back to broadcast for older rows

#### New: `api/cron-process-notifications.js` (hourly) — fixes Gap #4
- Processes all `pending` notifications from the `notifications` table whose `scheduled_for <= now`
- Handles email (nodemailer), SMS/WhatsApp (email fallback), and in-app (mark delivered + push)
- Previously scheduled notifications were stored in DB but never sent

#### New: `api/cron-weekly-digest.js` (Mondays 07:00)
- Pushes a grouped inbox summary (by urgency bucket) + top 5 jobs due that week every Monday morning
- Ensures nothing is forgotten over the weekend

### 🔔 In-App → Push Fix (`src/lib/NotificationService.js`) — fixes Gap #2
- `sendImmediately()` now also fires `/api/push-send` for `in_app` type notifications
- Escalation alerts and filing reminders now ring the OS notification bell immediately instead of waiting for the 30-second poll cycle

### 🔔 Focus Session → Inbox Nudge (`src/contexts/FocusContext.jsx`)
- `completeFocusSession()` fires a targeted push to the user after their session ends if there are pending interrupts in their inbox
- Single item: names it. Multiple: summarises the first 3.

### 🔔 Job Register Notifications (`src/components/JobRegister.jsx`)
- New `sendJobPush()` helper resolves assignee `user_id` from `directors` table by name (fuzzy match), falls back to broadcasting
- **New job assigned**: Push to assignee on creation
- **Assignment changed**: Push to new assignee on edit
- **Urgent unassigned job**: Broadcast so someone picks it up
- **Job completed**: Push to assignee
- **Ready for review**: Broadcast to all subscribed users

### 🗃️ Database
- **`add_user_id_to_interrupt_inbox.sql`**: Adds `user_id UUID` column to `interrupt_inbox` for per-user push targeting

### ⚙️ Vercel Crons (`vercel.json`)
- Added `cron-process-notifications` — every hour (`0 * * * *`)
- Added `cron-interrupt-reminders` — every hour (`0 * * * *`)
- Added `cron-weekly-digest` — Mondays 07:00 (`0 7 * * 1`)

### 📝 New Files
- `api/cron-process-notifications.js`
- `api/cron-interrupt-reminders.js`
- `api/cron-weekly-digest.js`
- `api/push-snooze.js`
- `database/NEW_SQL_SCRIPTS_GO_HERE/add_user_id_to_interrupt_inbox.sql`

### 📝 Modified Files
- `public/sw.js` — snooze/resolve action buttons, `interruptId` in push data, separate `notificationclick` handler per action
- `src/components/InterruptInbox.jsx` — snooze dropdown, age indicator dots, deferred wakeup time display
- `src/components/JobRegister.jsx` — `sendJobPush` helper, 5 push triggers on job lifecycle events
- `src/contexts/FocusContext.jsx` — imports `useAuth`, stamps `user_id` on captured interrupts, inbox nudge on session complete
- `src/lib/NotificationService.js` — `in_app` type now also fires a push notification
- `vercel.json` — 3 new cron schedules

---

## [2026-04-20] - Rebrand to LMW Financial Solutions & IMAP Email Migration

### 🏢 Full Rebrand: Agility → LMW Financial Solutions

#### Branding & Identity
- **Favicon** (`public/favicon.svg`): Replaced blue "C" square with dark navy circle + cyan ring + letter "L"
- **Logo files** (new): `public/lmw-logo.png`, `lmw-icon-192.png`, `lmw-icon-512.png`
- **PWA manifest** (`public/manifest.json`): name/short_name → "LMW Financial Solutions" / "LMW", icon refs updated
- **index.html**: Page title → "LMW Financial Solutions", apple-touch-icon → lmw-icon-192.png
- **Service Worker** (`public/sw.js`): Cache name → `lmw-v1`, precache and notification refs updated

#### UI Components
- **Sidebar.jsx**: Logo → lmw-logo.png, text → "LMW"
- **LoginPage.jsx**: Logo + "Sign in to your LMW account"
- **ClientPortal.jsx**: Both logo references updated
- **DashboardAnalytics.jsx**: Logo updated
- **CIPCManagement.jsx**: Logo updated
- **EmailPage.jsx**: "manage emails directly from LMW"

#### Business Documents
- **Billing.jsx**: Company header → "LMW FINANCIAL SOLUTIONS", contact → erich@lmwfinance.co.za, 087 255 3270, Reg 2022/675452/07
- **jobProgressPDF.js**: Footer → "generated by LMW Financial Solutions"
- **DocumentGenerationService.js**: Company name → "LMW Financial Solutions"

#### API & Backend
- **send-email-otp.js**, **send-email-simple.js**, **send-invitation-email.js**: fromName → "LMW Financial Solutions"
- **send-sms-simple.js**, **send-sms.js**: OTP message → "Your LMW login code"
- **cron-deadline-check.js**: VAPID email → erich@lmwfinance.co.za, notification titles → "LMW — Urgent/Upcoming Deadlines"
- **push-send.js**: VAPID email updated, default title → "LMW Reminder", tag → lmw-notification
- **pushNotifications.js**: Storage key → lmw_vapid_public_key, test title → "LMW Test"
- **AuthContext.jsx**: localStorage keys → `lmw_user`, `lmw_login_time`

⚠️ **Breaking**: localStorage keys changed from `agility_*` to `lmw_*` — existing users will need to re-login.

### 📧 Email Client: Microsoft Graph → IMAP/SMTP

Replaced Azure/Microsoft 365 dependency with direct IMAP/SMTP connection to cPanel mail server (`mail.lmwfinance.co.za`).

#### Backend Changes
- **email-api.js** (rewritten): Uses `ImapFlow` for IMAP reading + `nodemailer` for SMTP sending
  - All operations preserved: inbox, message, send, reply, forward (with attachments), move, delete, search, mark-read, folders, link-job, unlink-job, job-emails
  - Recursive folder tree support for deeply nested cPanel mailboxes
  - Old version backed up as `api/email-api.old.js`
- **email-auth.js** (rewritten): Simple status endpoint — checks if EMAIL_HOST/USER/PASSWORD env vars are configured. No OAuth flow needed.
  - Old version backed up as `api/email-auth.old.js`

#### Frontend Changes
- **emailService.js**: Removed OAuth methods (`getLoginUrl`, `disconnect`), all methods now accept `folder` parameter
- **EmailPage.jsx**: Added `FolderTreeItem` recursive component for collapsible nested folders, removed Microsoft 365 connect button, auto-connects when env vars are set

#### Dependency Changes
- **Added**: `imapflow` ^1.3.2, `mailparser` ^3.9.8
- **Removed** (no longer imported): `@azure/msal-node`, `@microsoft/microsoft-graph-client`

#### Environment Variables (replaces Azure AD vars)
```
EMAIL_HOST=mail.lmwfinance.co.za
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=erich@lmwfinance.co.za
EMAIL_PASSWORD=<password>
EMAIL_FROM_NAME=LMW Financial Solutions
EMAIL_FROM_ADDRESS=erich@lmwfinance.co.za
```

### 📝 Updated Docs
- **EMAIL_SETUP_INSTRUCTIONS.md**: Replaced Azure AD setup guide with simple IMAP/SMTP env var instructions

---

## [2026-04-18] - In-App Email Client (Microsoft 365 Integration) [SUPERSEDED]

### ✨ New Features

#### Email Client (Microsoft Graph API)
- **EmailPage.jsx** (new): Full 3-panel email client — folder sidebar, message list with pagination, message reader
- **Compose/Reply/Forward**: Modal composer with To, CC, Subject, Body fields; supports new email, reply, reply all, and forward
- **Folder navigation**: Shows all M365 folders with unread counts
- **Search**: Full-text email search via Microsoft Graph
- **Mark read/unread**, **delete** actions on messages

#### Email ↔ Job Register Integration
- **Link to Job**: Button on any email opens a job picker to link correspondence to a job register entry
- **Create Job from Email**: Creates a new job pre-filled with email subject as title, auto-matches client by sender email address, and auto-links the email
- **JobEmailsTab.jsx** (new): "Linked Emails" section in job detail — shows all linked emails with sender, date, attachments, preview; available in both table and board view
- **Unlink**: Remove email-job links from either the email viewer or the job detail

#### OAuth2 Authentication
- **email-auth.js** (new API): Microsoft OAuth2 flow with MSAL — login redirect, callback token exchange, connection status check, disconnect
- Single-user design (owner's M365 account) — one token stored in `email_tokens` table
- Automatic token refresh when expired

### 📦 New Dependencies
- `@microsoft/microsoft-graph-client` ^3.0.7
- `@azure/msal-node` ^5.1.3

### 🗃️ Database (create_email_tables.sql)
- `email_tokens`: user_id (unique), access_token, refresh_token, token_expires_at, email_address, display_name
- `job_emails`: job_id (FK→job_register), message_id, internet_message_id, conversation_id, subject, sender_name, sender_email, received_at, snippet, has_attachments, linked_by, notes

### 📝 New Files
- `api/email-auth.js` — OAuth2 login/callback/status/disconnect
- `api/email-api.js` — Inbox, message, send, reply, forward, move, delete, search, folders, mark-read, link-job, unlink-job, job-emails
- `src/services/emailService.js` — Frontend API client
- `src/components/EmailPage.jsx` — Full email client UI
- `src/components/JobEmailsTab.jsx` — Linked emails in job expanded detail
- `database/NEW_SQL_SCRIPTS_GO_HERE/create_email_tables.sql` — DB migration
- `docs/EMAIL_SETUP_INSTRUCTIONS.md` — Azure AD setup guide

### 📝 Modified Files
- `src/App.jsx` — Added `/email` route with EmailPage import
- `src/components/Sidebar.jsx` — Added Mail icon + "Email" menu item in Core group
- `src/components/JobRegister.jsx` — Added JobEmailsTab in table view expanded section and board view modal

### ⚙️ Setup Required
- Register Azure AD app (see `docs/EMAIL_SETUP_INSTRUCTIONS.md`)
- Set env vars: `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_REDIRECT_URI`
- Run `create_email_tables.sql` in Supabase

---

## [2026-04-17] - Focus Mode, Sidebar Cleanup & Executive Function Features

### ✨ New Features

#### Focus Mode (ASD/ADHD Executive Function Support)
- **FocusContext.jsx** (new): Focus session management with WIP limits, email windows, countdown timer, 5-minute warnings
- **FocusSession.jsx** (new): Full focus UI — start form with job picker, active countdown, capture interruption modal, end-of-block decision prompt
- **InterruptInbox.jsx** (new): Review/resolve/defer captured interruptions with urgency badges and source icons
- **Parked Sessions**: Resume or abandon parked focus blocks from the right sidebar
- **Job ↔ Focus integration**: "Link to a job" dropdown in focus form auto-fills task + client; "Focus on this" (Target icon) button in Job Register navigates to Focus Mode pre-filled
- **Convert to Job**: Briefcase button in Interrupt Inbox creates a Job Register entry from any interruption (maps urgency → priority)

#### Sidebar Cleanup (11 → 7 items)
- **AdminPage.jsx** (new): Consolidated admin into tabbed page (Users, Job Statuses, Doc Categories, Job Templates)
- **CustomersPage.jsx** (new): Merged Clients + Person Register into tabbed page
- Financial Statements removed from sidebar (code preserved)
- Old URLs redirect with `?tab=` params for bookmarks

### 🔧 Bug Fixes

#### Timer Fixes
- **TimerContext.jsx**: `stopTimer()` now subtracts paused time correctly (`workedMs = totalMs - pausedTime`)
- **TimerContext.jsx**: Pause/resume tracks accumulated paused duration via `pauseStartRef`
- **TimerContext.jsx**: 30-minute reminder replaced blocking `confirm()` with non-blocking toast via `timerReminderCallbackRef`

### 🗃️ Database

#### New Tables (create_focus_tables.sql)
- `focus_sessions`: id, task_description, next_action, duration_minutes, started_at, ends_at, completed_at, client_name, client_id (FK→clients), job_id (FK→job_register), status, interruptions_count
- `interrupt_inbox`: id, source, client_name, subject, urgency, next_action, focus_session_id (FK→focus_sessions), status (pending/resolved/deferred/converted), captured_at, resolved_at, defer_until
- Idempotent SQL — safe to re-run with DO blocks and IF NOT EXISTS throughout

### 📝 Modified Files
- `src/App.jsx` — Added FocusProvider, FocusSession route, AdminPage/CustomersPage routes with redirects
- `src/components/Sidebar.jsx` — Cleaned to 7 items: Dashboard, Focus Mode, Customers, CIPC, Documents, Job Register, Admin
- `src/components/CustomerManagement.jsx` — Added `embedded` prop support
- `src/components/PersonRegister.jsx` — Added `embedded` prop support
- `src/components/JobRegister.jsx` — Added "Focus on this" button (Target icon) in table rows and expanded detail view

---

## [2025-12-17] - Major Schema Fix & Test Infrastructure

### 🔧 Critical Bug Fixes

#### Schema Mismatches Fixed
- **HomePage.jsx**: Fixed status values from `Active`/`Completed` to lowercase `active`/`ready_to_bill`
- **HomePage.jsx**: Fixed column names from `project_name` → `name`, `expected_billing_date` → `billing_date`
- **BillingDashboard.jsx**: Removed broken `getBillingReport()` call, now queries `projects` table directly
- **BillingDashboard.jsx**: Fixed all status and column references to match actual schema
- **DashboardAnalytics.jsx**: Replaced non-existent `tasks` table query with `projects` count
- **DashboardAnalytics.jsx**: Replaced `billing_info` table with `time_entries` calculation
- **UserManagement.jsx**: Stubbed `permissions` and `user_permissions` tables (don't exist yet)
- **UserManagement.jsx**: Removed broken RPC calls
- **TimesheetService.js**: Added missing `ReportingService` methods:
  - `getMonthlyBillingReport()`
  - `getBillingByClient()`
  - `getBillingByConsultant()`
- **TimesheetService.js**: Replaced non-existent views with direct queries

#### Database Views Removed (Don't Exist)
- `v_projects_ready_to_bill`
- `v_active_timers`
- `v_upcoming_reminders`

### 🧪 Test Infrastructure Added

#### New Files
- `vitest.config.js` - Vitest test runner configuration
- `test/setup.js` - Supabase client initialization and test data IDs
- `test/smoke.test.js` - Quick validation tests (12 tests, ~10 seconds)
- `test/comprehensive.test.js` - Full test suite (62 tests, ~45 seconds)
- `docs/completed-md/TEST_BOT_GUIDE.md` - Documentation for running tests

#### Test Coverage (62 Total Tests)
| Category | Tests |
|----------|-------|
| Database Connection | 2 |
| Consultants Table | 5 |
| Clients Table | 4 |
| Projects Table | 6 |
| Time Entries Table | 7 |
| Job Types Table | 3 |
| Relational Integrity | 3 |
| Dashboard Queries | 5 |
| Billing Dashboard | 3 |
| HomePage Queries | 3 |
| CRUD Operations | 6 |
| Aggregate Queries | 3 |
| Search & Filter | 4 |
| Reporting Queries | 3 |
| Edge Cases | 4 |

### 📊 Test Data Seed Script

#### New File: `database/completed-sql-scripts/seed_test_data.sql`
- 5 test consultants (Erich, Sarah, John, Michelle, Thabo)
- 12 test clients (10 active, 2 inactive) - South African businesses
- 16 test projects across all statuses:
  - 7 active
  - 3 ready_to_bill
  - 1 on_hold
  - 5 invoiced
- 18 time entries with realistic work patterns
- Invoice details for completed projects
- Cleanup script included for removing test data

### 📦 Dependencies Added
```json
{
  "devDependencies": {
    "vitest": "^1.6.0",
    "dotenv": "^16.3.1",
    "@vitest/ui": "^1.6.0",
    "@vitest/coverage-v8": "^1.6.0"
  }
}
```

### 🚀 New NPM Scripts
```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:smoke        # Quick smoke tests (~10s)
npm run test:comprehensive # Full test suite (~45s)
npm run test:coverage     # With coverage report
```

### 📝 Commits
- `7bc868a` - Fix all schema mismatches and non-existent table references
- `f4ab1c4` - Add comprehensive test bot and seed data

---

## [Previous Development] - Core Application Build

### Features Implemented
- React 18 + Vite frontend
- Supabase PostgreSQL backend
- Vercel deployment
- Email OTP authentication
- Multi-user support with roles (admin, consultant)
- Timesheet module with timer functionality
- Client management (CIPC integration)
- Project/job management
- Billing dashboard
- Financial statements
- Document management with AI features
- Calendar & task management
- Activity logging
- Chat widget
- Notification center

### Database Schema
- `consultants` - Staff members with hourly rates
- `clients` - Client companies with SA tax numbers
- `projects` - Jobs with status workflow
- `time_entries` - Billable hours tracking
- `job_types` - Service categories
- `calendar_tasks` - Task scheduling
- `activity_logs` - Audit trail
- `messages` - Chat system

---

## Version History

| Date | Version | Description |
|------|---------|-------------|
| 2025-12-17 | 1.1.0 | Schema fixes + Test infrastructure |
| Previous | 1.0.0 | Initial application build |
