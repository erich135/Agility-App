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

### 1.3 Files Created
- [x] `database/timesheet_module_schema.sql` - Complete database schema
- [x] `src/types/timesheet.js` - TypeScript type definitions
- [x] `src/services/TimesheetService.js` - All API operations

---

## Phase 2: Backend Services

### 2.1 Time Entry Services
- [x] Create TimesheetService.js ✅ DONE
  - [x] Start timer function
  - [x] Pause/stop timer function
  - [x] Manual entry function
  - [x] Update/edit entry function
  - [x] Delete entry function
  - [x] Get entries by project
  - [x] Get entries by consultant
  - [x] Get entries by date range

### 2.2 Project Management Services
- [x] Create ProjectService.js ✅ DONE (in TimesheetService.js)
  - [x] Create new project
  - [x] Update project details
  - [x] Mark project as completed
  - [x] Link time entries to project
  - [x] Calculate total hours for project (automatic via trigger)
  - [x] Get projects by status
  - [x] Get projects by client
  - [x] Get projects by billing date

### 2.3 Notification Services
- [x] TimesheetNotificationService.js ✅ DONE
  - [x] Get notifications by recipient
  - [x] Mark as read
  - [x] Create notification
  - [ ] Scheduled notification checker (TODO: edge function)

### 2.4 Reporting Services
- [x] Create ReportingService.js ✅ DONE
  - [x] Billable hours by month
  - [x] Filter by customer
  - [x] Filter by consultant
  - [x] Filter by job type
  - [x] Filter by date range
  - [x] Dashboard stats
  - [ ] Export functionality (CSV/PDF) - TODO

---

## Phase 3: Frontend Components

### 3.1 Consultant Timesheet Module
- [x] **Timesheet.jsx** ✅ DONE - Main component
  - [x] Customer dropdown selector
  - [x] Project selector (existing or create new)
  - [x] Timer component (Start/Pause/Stop buttons)
  - [x] Manual hours input field
  - [x] Notes/description field
  - [x] Submit entry button
  - [x] Recent entries display
  - [x] Stats cards (today, week, month)

- [x] **TimerWidget.jsx** ✅ DONE (embedded in Timesheet.jsx)
  - [x] Real-time timer display
  - [x] Start/Pause/Resume controls
  - [x] Current project indicator
  - [x] Floating widget design

- [ ] **MyTimesheets.jsx** - TODO
  - [ ] View personal time entries
  - [ ] Edit/delete entries
  - [ ] Filter by date range
  - [ ] Export personal timesheet

### 3.2 Project Management - TODO
- [ ] **ProjectManagement.jsx**
- [ ] **ProjectForm.jsx** (Create/Edit)
- [ ] **ProjectDetails.jsx**

### 3.3 Accounts/Billing Module - TODO
- [ ] **BillingDashboard.jsx**
- [ ] **BillingReports.jsx**
- [ ] **InvoicePreparation.jsx**

---

## Phase 4: Existing Modules Revamp

### 4.1 Remove AI Insights Module
- [x] Remove from App.jsx routes ✅ DONE
- [x] Remove from HomePage navigation ✅ DONE
- [ ] Delete AIInsights.jsx component (keeping file for now)
- [ ] Clean up any AI-specific imports

### 4.2 Add Timesheet Module
- [x] Add Timesheet route to App.jsx ✅ DONE
- [x] Add Timesheet card to HomePage ✅ DONE
- [x] Create Timesheet.jsx component ✅ DONE

---

## Phase 5: Integration & Workflow

### 5.1 Notification System
- [ ] Implement automated reminders:
  - 7 days before billing date
  - 3 days before billing date
  - On billing date
  - 2 days after job completion (if no invoice details)
- [ ] Email notifications (optional)
- [ ] In-app notification badges

### 5.2 User Roles & Permissions
- [ ] Define consultant role
- [ ] Define accounts/billing role
- [ ] Define admin role
- [ ] Implement role-based access control
- [ ] Configure RLS policies in Supabase

### 5.3 Dashboard Updates
- [ ] Update main dashboard for consultants
- [ ] Create specialized dashboard for accounts lady
- [ ] Add quick access widgets
- [ ] Summary statistics cards

---

## Phase 6: UX/UI Enhancements

### 6.1 Navigation
- [ ] Add "Timesheets" menu item
- [ ] Add "Projects" menu item
- [ ] Add "Billing" menu item (accounts role only)
- [ ] Add "Reports" menu item
- [ ] Update routing

### 6.2 User Experience
- [ ] Quick timer widget (always accessible)
- [ ] Keyboard shortcuts for common actions
- [ ] Auto-save functionality
- [ ] Confirmation dialogs for critical actions
- [ ] Loading states
- [ ] Error handling & user feedback

### 6.3 Mobile Responsiveness
- [ ] Ensure timesheet entry works on mobile
- [ ] Timer widget mobile optimization
- [ ] Report viewing on mobile devices

---

## Phase 7: Testing & Validation

### 7.1 Functionality Testing
- [ ] Test timer accuracy
- [ ] Test manual entry validation
- [ ] Test notification triggers
- [ ] Test reporting filters
- [ ] Test role permissions
- [ ] Test data calculations

### 7.2 Edge Cases
- [ ] Handle overlapping timer sessions
- [ ] Handle negative time entries
- [ ] Handle deleted projects with time entries
- [ ] Handle invoice number conflicts
- [ ] Test with large datasets

### 7.3 User Acceptance Testing
- [ ] Consultant workflow testing
- [ ] Accounts lady workflow testing
- [ ] Admin workflow testing

---

## Phase 8: Deployment & Documentation

### 8.1 Documentation
- [ ] User manual for consultants
- [ ] User manual for accounts staff
- [ ] Admin guide
- [ ] API documentation
- [ ] Database schema documentation

### 8.2 Deployment
- [ ] Deploy database migrations
- [ ] Deploy backend updates
- [ ] Deploy frontend updates
- [ ] Configure environment variables
- [ ] Set up automated backups

### 8.3 Training
- [ ] Create training materials
- [ ] Prepare demo scenarios
- [ ] Schedule training sessions

---

## Technical Decisions to Make

### Decision Points
1. **Time Entry Method Priority**
   - Option A: Timer + Manual override (RECOMMENDED)
   - Option B: Manual only with optional timer
   - Option C: Timer required, manual as backup

2. **Project vs Job Terminology**
   - Decide on consistent terminology throughout app
   - Current suggestion: "Projects" for ongoing work, "Jobs" for specific tasks

3. **Billing Date Reminder Schedule**
   - Default reminder timing (7 days, 3 days, day of?)
   - Make configurable per project or system-wide?

4. **Invoice Number Generation**
   - Manual entry only
   - Auto-generate with manual override
   - Integrate with accounting software

5. **Hourly Rate Storage**
   - Per consultant (allows different rates for same person)
   - Per consultant-client combination
   - Per project

6. **Minimum Billable Increment**
   - 0.1 hours (6 minutes)
   - 0.25 hours (15 minutes)
   - Custom per client

---

## Future Enhancements (Phase 9+)
- [ ] Integration with accounting software (Xero, QuickBooks, etc.)
- [ ] Client portal for viewing hours
- [ ] Mobile app for time tracking
- [ ] GPS tracking for on-site visits
- [ ] Expense tracking addition
- [ ] Budget vs actual tracking
- [ ] Profitability analysis
- [ ] AI-powered insights (re-add later)
- [ ] Automated invoice generation
- [ ] Payment tracking

---

## Notes & Considerations

### Current Pain Points to Solve
1. ✅ Excel timesheets are counterproductive
2. ✅ Small time entries get lost over time
3. ✅ Manual data consolidation is time-consuming
4. ✅ Lack of reminders for billing
5. ✅ No tracking of invoice completion

### Key Success Factors
- Intuitive time entry (must be faster than Excel)
- Reliable notifications
- Flexible reporting
- Accurate time calculations
- Clear workflow from time entry to invoicing

---

---

## 🌟 WOW-Factor Features for Presentation

### Must-Have Wow Features:
1. **Live Timer Widget** - Floating timer that consultants can see while working
2. **Real-time Dashboard** - Numbers update live when time is logged
3. **Smart Notifications** - Toast notifications with sounds
4. **One-Click Invoicing** - "Mark as Invoiced" with confetti animation
5. **Beautiful Reports** - Charts with animations (Chart.js or Recharts)
6. **Mobile-Responsive** - Demo on phone to show field accessibility

### Nice-to-Have Demo Features:
1. **Dark Mode Toggle** - Shows modern design thinking
2. **Keyboard Shortcuts** - Quick time entry without mouse
3. **Search Everything** - Global search across projects/clients
4. **Export to PDF** - Professional-looking timesheet reports
5. **Email Previews** - Show what reminder emails look like

### Demo Script Preparation:
- [ ] Create demo accounts (Consultant, Accounts Lady, Admin)
- [ ] Pre-populate realistic data
- [ ] Prepare walkthrough script
- [ ] Have backup offline demo ready

---

## 📝 Current App Status

### Existing Modules (from Agility-App):
- ✅ Authentication (Email OTP)
- ✅ Customer Management
- ✅ CIPC Management (keep, revamp later)
- ✅ Calendar & Tasks
- ✅ Financial Statements
- ✅ Document Manager
- ✅ Notification Center
- ✅ Dashboard Analytics
- ⛔ AI Insights (REMOVE)

### What We Can Leverage:
- Existing `clients` table → will link to projects
- Existing `notifications` table → extend for billing reminders
- Existing `tasks` table → integrate with projects
- Existing auth system with roles
- Existing Supabase connection and services

---

**Last Updated:** December 13, 2025
**Status:** Planning Phase
**Next Action:** Start Phase 1 - Database Schema
