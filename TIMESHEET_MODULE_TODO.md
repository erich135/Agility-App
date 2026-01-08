# Timesheet & Billing Module - Development To-Do List

## Project Overview
Transform the Agility App into a comprehensive time tracking and billing system for an accounting firm dealing with high-end clients.

---

## 🎯 CRITICAL DEADLINE: January 12, 2026 (Client Presentation)
**Working Days Available:** ~18 days (accounting for holiday)

### 🏖️ Holiday Schedule
- **Dec 27 - Jan 3:** Cape Town family holiday (limited availability)
- Laptop available for occasional work sessions

### Realistic Milestone Timeline
| Phase | Dates | Status | Focus Area | Deliverable |
|-------|-------|--------|------------|-------------|
| **Sprint 1** | Dec 14-20 | 🔥 INTENSE | Database + Core Backend | Schema, services, API ready |
| **Sprint 2** | Dec 21-26 | 🔥 INTENSE | Time Entry + Projects UI | Consultant can log time |
| **Holiday** | Dec 27-Jan 3 | 🏖️ LIGHT | Bug fixes, tweaks only | Optional improvements |
| **Sprint 3** | Jan 4-8 | 🔥 INTENSE | Billing + Reports | Accounts lady dashboard |
| **Sprint 4** | Jan 9-11 | ⚡ POLISH | Demo Prep | Wow-factor, demo data |
| **D-Day** | Jan 12 | 🚀 | PRESENTATION | Impress the client! |

### Priority Strategy
**Before Holiday (Dec 14-26) - GET CORE WORKING:**
- ✅ Database schema complete
- ✅ Time entry with timer working
- ✅ Projects can be created and managed
- ✅ Basic consultant view functional

**During Holiday (Dec 27-Jan 3) - OPTIONAL:**
- 🏖️ Only if you feel like it
- Small bug fixes
- UI tweaks
- Nothing critical

**After Holiday (Jan 4-11) - POLISH & WOW:**
- Reports and filtering
- Accounts lady dashboard
- Notifications and reminders
- Demo preparation
- Wow-factor animations

---

## 📊 Database Decision: Supabase vs MongoDB

### Current Choice: Supabase (PostgreSQL) ✅ RECOMMENDED TO KEEP

**Why Supabase is PERFECT for this project:**
1. **Free Tier is Sufficient** - 500MB database, 2GB bandwidth, 50MB file storage
2. **Real-time Subscriptions** - Instant notifications when jobs are completed
3. **Row Level Security (RLS)** - Built-in role-based access (consultant vs accounts lady)
4. **SQL is BETTER for this use case** - Timesheets need complex JOINs, aggregations, reports
5. **Auth Built-in** - Email/password, OTP already working in your app
6. **PostgreSQL Functions** - Auto-calculate hours, trigger notifications
7. **Edge Functions** - For reminder emails, automated tasks

**When would MongoDB be better?**
- Document-heavy apps (not our case)
- Unpredictable schema (our schema is well-defined)
- Massive scale (millions of records - not our case)

**Recommendation:** Stay with Supabase. If you outgrow free tier, paid plans start at $25/month.

**Migration Path (if ever needed):**
- Supabase → Any PostgreSQL host (Railway, Render, AWS RDS)
- Export/import is straightforward with standard pg_dump
- MongoDB migration would require rewriting all queries

---

## 🎨 Lead Management System - Code We Can Reuse

From analyzing the lead-management-system, we can borrow:

### Components to Adapt:
| Lead System | Our Timesheet System | Reuse Level |
|-------------|---------------------|-------------|
| `Dashboard.tsx` | `TimesheetDashboard.jsx` | 80% - layout, stats cards |
| `NotificationSystem.tsx` | `NotificationCenter.jsx` | 90% - already have similar |
| `Reports.tsx` | `BillingReports.jsx` | 70% - filter logic, exports |
| `AuthContext.tsx` | Already have | ✅ Complete |
| `LeadForm.tsx` | `TimeEntryForm.jsx` | 60% - form patterns |
| `LeadDetails.tsx` | `ProjectDetails.jsx` | 70% - detail views |

### Database Patterns to Copy:
- Status workflow tracking (lead_status_history → time_entry_history)
- Notification system with real-time subscriptions
- User roles and RLS policies
- Indexing strategy for performance

### UI Patterns to Copy:
- Filter bar with dropdowns
- Stats cards with icons
- Responsive tables
- Export to CSV functionality
- Real-time notification badges

---

## Phase 1: Database Schema & Setup

### 1.1 Core Tables to Create
- [x] **Consultants Table** ✅ DONE
  - Linked to existing users table
  - Professional designation (CA, Accountant, Student)
  - Hourly rate
  - Active/inactive status

- [x] **Customers/Clients Table** (Enhanced) ✅ ALREADY EXISTS
  - Client name
  - Contact information
  - Billing preferences
  - Account status

- [x] **Job Types Table** ✅ DONE (25 default types)
  - Pre-defined job types (Annual tax returns, CIPC filings, Labour matters, etc.)
  - Category/classification
  - Default descriptions

- [x] **Projects Table** ✅ DONE
  - Client reference (FK)
  - Project/job name
  - Job type reference (FK)
  - Status (Active, Completed, Invoiced)
  - Expected billing date
  - Created date
  - Completion date
  - Invoice number
  - Invoice date
  - Total hours accumulated
  - Notes/description

- [x] **Time Entries Table** ✅ DONE
  - Project reference (FK)
  - Consultant reference (FK)
  - Entry date
  - Start time (for timer function)
  - End time (for timer function)
  - Duration (in hours, decimal)
  - Entry method (Manual, Timer, Adjusted)
  - Description/notes
  - Billable flag
  - Created timestamp
  - Modified timestamp

- [x] **Notifications Table** ✅ DONE
  - Recipient user ID
  - Notification type (Billing due, Job completed, Invoice pending, etc.)
  - Related project ID
  - Message
  - Read status
  - Created date
  - Due date (for reminders)

- [x] **Invoice Tracking** ✅ DONE (integrated into Projects table)
  - Project reference
  - Invoice number
  - Invoice date
  - Total hours billed
  - Status
  - Generated by (user ID)

### 1.2 Database Features Created
- [x] Auto project number generation (PRJ-YYYY-0001)
- [x] Auto project hours calculation (trigger)
- [x] Auto billing reminders (7 days, 3 days, day of)
- [x] Status change audit trail
- [x] Reporting views (monthly hours, ready to bill, active timers)
- [x] Row Level Security (RLS) policies
- [x] Performance indexes

# Timesheet & Billing Module - To‑Do (Clean)

## 🎯 Deadline: January 12, 2026 (Client Presentation)

## ✅ Current Status (as of Jan 8, 2026)
- Reporting page is working end-to-end:
  - Summary, Detailed, Client, Consultant, Job Type, Productivity reports
  - Filters work and default-select all Clients/Consultants/Job Types
  - Export CSV works for all report types
- PostgREST join issues resolved via proper FK disambiguation and embeds
- Supabase RLS was blocking reads during development; for speed we disabled RLS on timesheet tables

## 🔥 Tomorrow (Jan 9) — “Bling / Polish” Checklist
- [ ] Polish report UI containers (consistent padding, rounded borders, spacing)
- [ ] Improve tables (header contrast, row hover, zebra striping, responsive overflow)
- [ ] Add subtle transitions (tab switch, filter expand/collapse, loading states)
- [ ] Improve empty/loading states (no hard errors; clear messages)
- [ ] Consistent buttons (primary/secondary states; disabled styling)
- [ ] Ensure Export CSV affordance is clear (enabled/disabled states)

## ⚡ Final Demo Prep (Jan 9–11)
- [ ] Demo script + “happy path” flow
- [ ] Seed data sanity check (clients/projects/job types/time entries consistent)
- [ ] Verify every report type with multiple filter combos
- [ ] Quick smoke test on mobile viewport

## 🧩 Remaining Functional Work (Post-demo)
- [ ] Billing dashboard (accounts view)
- [ ] Invoice preparation workflow
- [ ] Notifications/reminders: scheduled/edge-function checker
- [ ] Role-based access (re-enable RLS properly with real policies)

## Notes
- Keep console logs for now (they’re actively useful during final stabilization).
  - [x] Mark as read
