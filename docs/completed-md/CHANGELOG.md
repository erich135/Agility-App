# Changelog

All notable changes to the Agility App project will be documented in this file.

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
