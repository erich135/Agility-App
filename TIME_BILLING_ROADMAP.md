# Agility App - Development Roadmap

## ✅ COMPLETED - Ready for Monday Presentation (Jan 6, 2026)

### Time Tracking & Billing System
- [x] Clean database schema (`time_entries`, `job_types` tables)
- [x] "Log Time" button on Customer Management page
- [x] Time entry modal with consultant selector
- [x] Job type selector with 8 default service types
- [x] **Large description field (8 rows)** for detailed work notes
- [x] Time entries saving with consultant, job type, rate, hours
- [x] Edit and delete time entries (unbilled only)
- [x] Time entry history view under each customer card
- [x] Billing Dashboard at `/billing` route
- [x] Unbilled time grouped by customer
- [x] Stats cards (customers, hours, amount)
- [x] **"Mark as Invoiced" workflow** (replaced "Create Invoice")
- [x] **Invoice number modal** - Capture Pastel Partner invoice details
- [x] **Preview Report Modal** - View unbilled time on-screen
- [x] **Professional PDF export** - "Unbilled Time Report" for Pastel Partner
- [x] Full description text visible in preview (no truncation)

### Database Schema
- [x] `time_entries` table with all fields
- [x] `job_types` table with default service types
- [x] Foreign keys to clients, consultants, job_types

---

## 🚀 PHASE 1: Critical Security & Access Control (In Progress ✅)

### Authentication & Login System
- [x] **Invitation email workflow**
  - Email sent when adding new user
  - Email with setup link for password creation
  - User clicks link and creates password
  - Session management after password setup
  
- [x] **Forgot Password flow**
  - "Forgot Password" button on login screen
  - Send password reset email with link
  - User clicks link and sets new password
  
- [x] **User roles enforcement**
  - Admin, Consultant, Accounts, User roles
  - Role-based UI rendering
  - Protect admin routes with `manage_users` permission

### Granular Permissions System
- [ ] **Create `permissions` table**
  ```sql
  permissions: module, action, role
  e.g., "customers", "create", "admin"
       "customers", "view", "consultant"
  ```
  ✅ *Already created in database schema*
  
- [x] **Permission checks on every action**
  - View Customers
  - Create/Edit/Delete Customers
  - View Billing Dashboard
  - Mark as Invoiced
  - View Financial Statements
  - Manage Users
  - Assign Consultants
  ✅ *ProtectedRoute checks permissions, AuthContext enforces roles*
  
- [ ] **User-level permission overrides**
  - Allow specific users custom permissions
  - Override table for exceptions
  - *Not needed yet - roles sufficient for MVP*

### Customer Assignment & Data Isolation
- [ ] **Add `assigned_consultant_id` to clients table**
  - Dropdown in customer form
  - Only assigned consultant can see/edit
  
- [ ] **Implement Row Level Security (RLS)**
  - Consultants see ONLY their assigned customers
  - Admins see all customers
  - Enforce at database level (Supabase RLS policies)
  - *Foundation in place - needs consultant data isolation integration*
  
- [ ] **Safeguards**
  - Prevent consultant from logging time on others' customers
  - Warning if trying to access unassigned customer
  - Audit log for admin override
  - *Ready to implement after RLS is enabled*

---

## 📊 PHASE 2: Reporting & Analytics

### Customer Reports
- [ ] **Customer History Timeline**
  - All interactions (calls, meetings, documents)
  - Time entries chronologically
  - Invoice history
  - Activity feed
  
- [ ] **Customer Financial Summary**
  - Total hours logged (all time)
  - Total amount invoiced
  - Outstanding unbilled time
  - Revenue trend chart

### Consultant Reports
- [ ] **Consultant Performance Dashboard**
  - Hours billed per consultant
  - Revenue generated per consultant
  - Customer count per consultant
  - Utilization rate (billable vs total hours)
  
- [ ] **Time Analysis**
  - Hours by job type
  - Hours by customer
  - Monthly trends
  - Billable vs non-billable breakdown

### Billing Reports
- [ ] **Invoice History View**
  - All invoiced time entries
  - Filter by invoice number, date range, customer
  - Search functionality
  - Export to CSV/Excel
  
- [ ] **Revenue Reports**
  - Monthly revenue totals
  - Revenue by consultant
  - Revenue by job type
  - Outstanding unbilled amounts

---

## 🎨 PHASE 3: UI/UX Enhancements

### Dashboard Improvements
- [ ] **Clean up main Dashboard**
  - Better stats cards
  - Recent activity feed
  - Quick action buttons
  - Charts (revenue trend, hours by consultant)
  
- [ ] **Notifications panel**
  - Pending time approvals
  - Overdue invoices
  - Recent customer activity

### Search & Filters
- [ ] **Billing Dashboard filters**
  - Date range picker
  - Search by customer name
  - Filter by consultant
  - Filter by job type
  
- [ ] **Date range filters everywhere**
  - Time entries
  - Reports
  - Invoice history
  - Global date picker component

### Bulk Actions
- [ ] **Multi-select functionality**
  - Bulk delete time entries
  - Bulk mark as invoiced
  - Bulk reassign consultant
  - Bulk export

### Mobile Responsive
- [ ] **Mobile-optimized layouts**
  - Responsive tables (stack on mobile)
  - Touch-friendly buttons
  - Mobile navigation
  - Test on tablets and phones

---

## 🔧 PHASE 4: Advanced Features

### Data Export
- [ ] **CSV/Excel export**
  - Time entries export
  - Invoice history export
  - Customer list export
  - Consultant reports export

### Automation
- [ ] **Automated reminders**
  - Email when unbilled time > threshold
  - Monthly billing reminders
  - Customer activity notifications

### Integration
- [ ] **Pastel Partner integration** (future)
  - API connection
  - Auto-sync invoices
  - Customer import/export

---

## 🐛 Known Issues / Technical Debt

- [ ] Remove console.log statements (consultants/job types loading)
- [ ] Add loading states to all async operations
- [ ] Error boundary components for graceful failures
- [ ] Optimize database queries (add indexes)
- [ ] Add database backups automation
- [ ] Implement proper form validation library (Zod/Yup)

---

## 📝 Notes

**Monday Presentation Focus:**
1. ✅ Time logging with detailed descriptions
2. ✅ Preview unbilled time reports on-screen
3. ✅ Mark as invoiced with Pastel invoice number
4. ✅ Professional PDF export for client records
5. ✅ Edit/delete time entries

**Priority After Monday:**
1. Fix login/authentication (security)
2. Permissions & RLS (data isolation)
3. Customer assignment (workflow)
4. Consultant reports (value-add)
5. Dashboard cleanup (polish)

  - Filter by customer, date, status
  - Regenerate PDF
  - Mark as paid

## Phase 3: Reports & Analytics 📊

### A. Time Reports
- [ ] **Consultant Time Report**
  - Hours logged per consultant
  - Date range filter
  - Export to CSV/Excel
  
- [ ] **Customer Time Report**
  - Hours per customer
  - Revenue breakdown
  - Billable vs non-billable
  
- [ ] **Job Type Report**
  - Time distribution by job type
  - Identify most profitable services

### B. Revenue Reports
- [ ] **Monthly Revenue**
  - Invoiced vs paid
  - Outstanding invoices
  - Revenue trends
  
- [ ] **Customer Profitability**
  - Total revenue per customer
  - Average hourly rate
  - Payment history

## Phase 4: Enhancements 🚀

### A. Time Entry Improvements
- [ ] **Timer Functionality**
  - Start/stop timer for active tasks
  - Timer runs in background
  - Auto-save when stopped
  
- [ ] **Recurring Time Entries**
  - Templates for common tasks
  - Quick-add from history
  
- [ ] **Mobile Optimization**
  - Responsive design for logging on-the-go

### B. Billing Enhancements
- [ ] **Email Invoices**
  - Send PDF via email directly
  - Track sent/opened status
  
- [ ] **Payment Tracking**
  - Mark invoice as paid
  - Partial payments
  - Payment history
  
- [ ] **Reminders**
  - Overdue invoice alerts
  - Automatic follow-ups

## Database Schema Updates Needed

### 1. Update time_entries table
```sql
ALTER TABLE time_entries 
ADD COLUMN job_type_id UUID REFERENCES job_types(id),
ADD COLUMN notes TEXT,
ADD COLUMN is_billable BOOLEAN DEFAULT true;
```

### 2. Ensure job_types table exists
```sql
CREATE TABLE IF NOT EXISTS job_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  default_rate NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add default job types
INSERT INTO job_types (name, description, default_rate) VALUES
  ('Consultation', 'General consultation and advice', 500.00),
  ('Tax Return Preparation', 'Individual or company tax returns', 750.00),
  ('CIPC Filing', 'Annual returns and company registration', 600.00),
  ('Bookkeeping', 'Monthly bookkeeping services', 450.00),
  ('Audit Support', 'Audit preparation and support', 800.00),
  ('Payroll Processing', 'Monthly payroll services', 400.00),
  ('Financial Statements', 'Preparation of financial statements', 700.00);
```

### 3. Create invoices table
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id),
  invoice_date DATE NOT NULL,
  due_date DATE,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Recommended Next Steps (Priority Order)

### Week 1 - Core Functionality
1. ✅ ~~Create basic time_entries table~~
2. ✅ ~~Add "Log Time" button to customers~~
3. ✅ ~~Basic time entry modal~~
4. **Add consultant selector to modal**
5. **Add job type selector to modal**
6. **Show time entries under each customer**

### Week 2 - Billing Basics
7. **Create Billing Dashboard route**
8. **Show customers with unbilled time**
9. **Create invoice generation logic**
10. **PDF export functionality**

### Week 3 - Polish & Reports
11. **Invoice history view**
12. **Basic time reports**
13. **Revenue reports**
14. **Testing & refinements**

## UI/UX Recommendations

### Time Entry Modal - Enhanced Layout
```
┌─────────────────────────────────────┐
│ Log Time - [Customer Name]          │
├─────────────────────────────────────┤
│ Date:          [2026/01/06]         │
│ Consultant:    [Dropdown ▼]         │
│ Job Type:      [Dropdown ▼]         │
│ Hours:         [2.5]                │
│ Hourly Rate:   [R 500.00]           │
│                                     │
│ Description:                        │
│ ┌─────────────────────────────┐    │
│ │ What work was completed?    │    │
│ └─────────────────────────────┘    │
│                                     │
│ Internal Notes: (optional)          │
│ ┌─────────────────────────────┐    │
│ │ Non-billable details...     │    │
│ └─────────────────────────────┘    │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ Total: R 1,250.00           │    │
│ └─────────────────────────────┘    │
│                                     │
│        [Cancel]  [Save Entry]      │
└─────────────────────────────────────┘
```

### Billing Dashboard Layout
```
┌─────────────────────────────────────────────────────────┐
│ 💰 Billing Dashboard                                    │
├─────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ │ Unbilled │ │ Unbilled │ │ Customers│ │ This    │  │
│ │ Amount   │ │ Hours    │ │ w/ Time  │ │ Month   │  │
│ │ R45,230  │ │ 87.5h    │ │    12    │ │ R89,450 │  │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                         │
│ Customers with Unbilled Time                           │
│ ┌─────────────────────────────────────────────────┐   │
│ │ ▼ ABC Enterprises          R12,500  |  25h     │   │
│ │   ├─ Jan 3  Consultation    2h  R1,000         │   │
│ │   ├─ Jan 4  Tax Return      5h  R3,750         │   │
│ │   └─ Jan 5  Bookkeeping     8h  R3,600         │   │
│ │   [Select All] [Create Invoice]                │   │
│ └─────────────────────────────────────────────────┘   │
│ ┌─────────────────────────────────────────────────┐   │
│ │ ▶ XYZ Company             R8,750   |  17.5h    │   │
│ └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Questions to Consider

1. **Do consultants have different hourly rates?**
   - If yes: Store default_hourly_rate in consultants table
   - If no: Use system-wide default rate

2. **Do you charge VAT on invoices?**
   - If yes: Add VAT calculation (15% in SA)
   - Store VAT-inclusive vs VAT-exclusive rates

3. **Do you need time approval workflow?**
   - E.g., Consultant logs → Admin approves → Then billable
   - If yes: Add `approved_by` and `approved_at` to time_entries

4. **Invoice numbering format?**
   - Options: INV-2026-001, 2026/001, simple sequence
   - Auto-generate vs manual entry

5. **Payment terms?**
   - Default due date (e.g., 30 days from invoice)
   - Payment methods tracking

Would you like me to start implementing any specific phase? I recommend:
1. First: Add consultant & job type selectors to the modal
2. Second: Show time entries under each customer
3. Third: Create basic billing dashboard

What do you think?
