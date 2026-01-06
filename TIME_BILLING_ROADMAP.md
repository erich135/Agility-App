# Time Tracking & Billing - Implementation Roadmap

## Current Status ✅
- [x] Clean database schema created (`time_entries` table)
- [x] "Log Time" button added to Customer Management
- [x] Basic time entry modal working (date, hours, description, rate)
- [x] Time entries saving to database successfully

## Phase 1: Enhanced Time Logging 🎯

### A. Improve Time Entry Modal
- [ ] **Add Consultant Selector**
  - Dropdown showing all consultants
  - Default to current logged-in user
  - Allow admin to log time for others
  
- [ ] **Add Job Type Selector**
  - Link to `job_types` table
  - Categories like: Consultation, Tax Return, CIPC Filing, Bookkeeping, etc.
  - Store `job_type_id` in time_entries
  
- [ ] **Add Notes/Details Field**
  - Separate from description
  - For internal notes (non-billable details)
  
- [ ] **Validation Improvements**
  - Prevent duplicate entries (same day, same customer, overlapping times)
  - Warn if hours > 12 in one day
  - Required fields clearly marked

### B. Time Entry History per Customer
- [ ] **Show Time Log on Customer Page**
  - Expandable section under each customer
  - Table showing: Date | Consultant | Job Type | Hours | Amount | Status
  - Filter by date range
  - Total unbilled hours/amount displayed
  
- [ ] **Quick Actions**
  - Edit time entry
  - Delete time entry (with confirmation)
  - Mark as billable/non-billable

## Phase 2: Billing Module 💰

### A. Billing Dashboard (New Route: `/billing`)
- [ ] **Overview Cards**
  - Total Unbilled Amount (all customers)
  - Total Unbilled Hours
  - Number of Customers with Unbilled Time
  - This Month's Invoiced Amount
  
- [ ] **Customer List View**
  - Show all customers with unbilled time
  - Grouped/sorted by amount (highest first)
  - Click to expand and see line items
  
- [ ] **Bulk Actions**
  - Select multiple time entries
  - "Create Invoice" button
  - Mark selected as invoiced

### B. Invoice Creation
- [ ] **Invoice Generator**
  - Auto-generate invoice number (e.g., INV-2026-001)
  - Select time entries to include
  - Preview invoice before finalizing
  - Add invoice date
  
- [ ] **Invoice PDF Export**
  - Professional template
  - Company details (from settings)
  - Line items with descriptions
  - Subtotal, VAT (if applicable), Total
  - Download as PDF
  
- [ ] **Mark as Invoiced**
  - Update time_entries: set invoice_number, invoice_date, is_invoiced=true
  - Create invoice record (new table: `invoices`)

### C. Invoice Management
- [ ] **Invoices Table** (New database table)
  ```sql
  CREATE TABLE invoices (
    id UUID PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE,
    client_id UUID REFERENCES clients(id),
    invoice_date DATE,
    due_date DATE,
    subtotal NUMERIC(10,2),
    tax_amount NUMERIC(10,2),
    total_amount NUMERIC(10,2),
    status VARCHAR(20), -- draft, sent, paid, overdue
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
  );
  ```
  
- [ ] **Invoice History**
  - List all invoices
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
