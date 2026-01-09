# Agility App - Complete Project Documentation

## 📋 Overview

**Agility App** is a comprehensive practice management system built for LMW Finance, a South African accounting and bookkeeping firm. It handles client management, project tracking, time entries, billing, and various compliance-related features specific to South African business requirements.

---

## 🏗️ Technology Stack

### Frontend
- **React 18** - UI framework
- **Vite 4.5** - Build tool and dev server
- **Tailwind CSS 3.3** - Utility-first styling
- **Lucide React** - Icon library
- **Recharts** - Data visualization
- **React Router DOM 7.9** - Client-side routing

### Backend
- **Supabase** - PostgreSQL database + Authentication
- **Row Level Security (RLS)** - Data access control
- **Real-time subscriptions** - Live updates

### Deployment
- **Vercel** - Hosting and CI/CD
- **GitHub** - Source control (erich135/Agility-App)

### Additional Libraries
- `dayjs` - Date manipulation
- `jspdf` + `html2canvas` - PDF generation
- `xlsx` + `papaparse` - Spreadsheet handling
- `tesseract.js` - OCR for document processing
- `nodemailer` - Email functionality

---

## 📁 Project Structure

```
Agility-App/
├── src/
│   ├── components/           # React components
│   │   ├── HomePage.jsx          # Main dashboard
│   │   ├── LoginPage.jsx         # Email OTP authentication
│   │   ├── CustomerManagement.jsx # Client CRUD
│   │   ├── Timesheet.jsx         # Time tracking with timer
│   │   ├── BillingDashboard.jsx  # Invoicing overview
│   │   ├── DashboardAnalytics.jsx # KPIs and charts
│   │   ├── FinancialStatements.jsx # SA financial reports
│   │   ├── DocumentManager.jsx   # File management
│   │   ├── Calendar.jsx          # Task scheduling
│   │   ├── CIPCManagement.jsx    # Company registry
│   │   ├── ActivityLogs.jsx      # Audit trail
│   │   ├── ChatWidget.jsx        # Messaging
│   │   ├── NotificationCenter.jsx
│   │   ├── SystemManagement.jsx
│   │   ├── UserManagement.jsx
│   │   └── ui/                   # Reusable UI components
│   ├── contexts/
│   │   └── AuthContext.jsx       # Authentication state
│   ├── services/
│   │   └── TimesheetService.js   # Database operations
│   ├── lib/
│   │   ├── SupabaseClient.js     # DB connection
│   │   ├── ActivityLogger.js     # Audit logging
│   │   ├── AIDocumentService.js  # Document AI
│   │   └── CalendarTaskService.js
│   └── types/
│       └── timesheet.js          # Type definitions
├── database/
│   ├── seed_test_data.sql        # Test data population
│   └── [various schema files]    # Table definitions
├── test/
│   ├── setup.js                  # Test configuration
│   ├── smoke.test.js             # Quick validation
│   └── comprehensive.test.js     # Full test suite
├── api/                          # Serverless functions
├── public/                       # Static assets
└── [config files]
```

---

## 🗄️ Database Schema

### Core Tables

#### `consultants`
Staff members who perform work and track time.
```sql
- id (UUID, PK)
- user_id (UUID, FK to auth.users)
- full_name, email, phone
- designation (Director, Senior Accountant, etc.)
- hourly_rate, default_hourly_rate
- is_active, can_approve_timesheets
- role (admin, consultant)
```

#### `clients`
Client companies with South African business details.
```sql
- id (UUID, PK)
- client_name, registration_number
- status (Active, Inactive)
- company_income_tax_number, vat_number, paye_number
- email, phone_number, physical_address
- contact_person_name, contact_person_email
- financial_year_end
- notes
```

#### `projects`
Individual jobs/engagements for clients.
```sql
- id (UUID, PK)
- project_number (unique, e.g., PRJ-2025-0001)
- client_id (FK)
- name, description
- job_type_id (FK)
- assigned_consultant_id (FK)
- start_date, billing_date
- status (active, ready_to_bill, on_hold, invoiced)
- total_hours, billable_hours, estimated_hours
- priority (low, normal, high)
- invoice_number, invoice_date, invoice_amount
```

#### `time_entries`
Billable hours logged against projects.
```sql
- id (UUID, PK)
- project_id, consultant_id (FKs)
- entry_date, start_time, end_time
- duration_hours
- entry_method (timer, manual)
- description
- is_billable, hourly_rate
- status (draft, approved, invoiced)
```

#### `job_types`
Categories of work performed.
```sql
- id (UUID, PK)
- name (Bookkeeping, VAT Return, Tax Return, etc.)
- is_active
```

### Supporting Tables
- `calendar_tasks` - Scheduled tasks and reminders
- `activity_logs` - Audit trail of all actions
- `messages` - Chat/messaging system
- `documents` - File metadata

---

## 🔐 Authentication

### Email OTP System
1. User enters email address
2. System sends 6-digit OTP via email
3. User enters OTP to authenticate
4. JWT token issued by Supabase Auth
5. Consultant record linked via `user_id`

### Roles
- **Admin**: Full access to all features
- **Consultant**: Access to assigned projects and own timesheets

---

## ⚡ Key Features

### 1. Dashboard (`HomePage.jsx`)
- Project status overview (active, ready to bill, on hold)
- Quick access to recent time entries
- Upcoming billing dates
- KPI cards

### 2. Timesheet Module (`Timesheet.jsx`)
- **Timer mode**: Start/stop tracking with live counter
- **Manual entry**: Add hours retrospectively
- Project selection with client context
- Billable/non-billable toggle
- Status workflow: Draft → Approved → Invoiced

### 3. Client Management (`CustomerManagement.jsx`)
- Full CRUD for client records
- SA-specific fields (CIPC registration, tax numbers)
- Contact person details
- Financial year end tracking

### 4. Billing Dashboard (`BillingDashboard.jsx`)
- Projects ready to invoice
- Unbilled hours calculation
- Invoice generation
- Payment tracking

### 5. Financial Statements (`FinancialStatements.jsx`)
- SA-specific report formats
- Trial balance, income statement, balance sheet
- Export to PDF/Excel

### 6. Document Management (`DocumentManager.jsx`)
- File upload with categorization
- OCR text extraction (Tesseract.js)
- AI-powered document analysis

### 7. CIPC Management (`CIPCManagement.jsx`)
- Company registration tracking
- Annual return reminders
- Compliance status monitoring

---

## 🧪 Testing

### Test Framework: Vitest

### Running Tests
```bash
# Quick smoke test (~10 seconds)
npm run test:smoke

# Full comprehensive test (~45 seconds)
npm run test:comprehensive

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

### Test Data
Run `database/completed-sql-scripts/seed_test_data.sql` in Supabase SQL Editor to populate:
- 5 consultants
- 12 clients
- 16 projects
- 18 time entries

### Cleanup Test Data
```sql
DELETE FROM time_entries WHERE id::text LIKE 'b000000%';
DELETE FROM projects WHERE id::text LIKE 'a000000%';
DELETE FROM clients WHERE id::text LIKE 'd000000%';
DELETE FROM consultants WHERE id::text LIKE 'c000000%';
```

---

## 🚀 Deployment

### Vercel Configuration
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: 18.x

### Environment Variables
```env
VITE_SUPABASE_URL=https://nhzpfukswjgbchfczhsw.supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
```

### GitHub Repository
- **URL**: https://github.com/erich135/Agility-App
- **Branch**: `main` (auto-deploys to Vercel)

---

## 📊 Status Values Reference

### Project Status
| Value | Description |
|-------|-------------|
| `active` | Work in progress |
| `ready_to_bill` | Complete, awaiting invoice |
| `on_hold` | Temporarily paused |
| `invoiced` | Invoice sent |

### Time Entry Status
| Value | Description |
|-------|-------------|
| `draft` | Not yet approved |
| `approved` | Ready for billing |
| `invoiced` | Included on invoice |

### Client Status
| Value | Description |
|-------|-------------|
| `Active` | Current client |
| `Inactive` | Former client |

---

## 🔧 Development

### Local Setup
```bash
# Clone repository
git clone https://github.com/erich135/Agility-App.git
cd Agility-App

# Install dependencies
npm install

# Create .env file with Supabase credentials
echo "VITE_SUPABASE_URL=..." > .env
echo "VITE_SUPABASE_ANON_KEY=..." >> .env

# Start development server
npm run dev
```

### NPM Scripts
```bash
npm run dev          # Start dev server (localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Run all tests
npm run test:smoke   # Quick validation tests
npm run test:comprehensive # Full test suite
```

---

## 📝 Recent Development History

### December 17, 2025
- Fixed all schema mismatches between React components and database
- Added comprehensive test infrastructure (62 tests)
- Created seed data SQL script for testing
- Documented all changes in docs/completed-md/CHANGELOG.md

### Previous Development
- Built complete React frontend with all major features
- Set up Supabase database with RLS policies
- Implemented email OTP authentication
- Deployed to Vercel with auto-deployment from GitHub
- Created timesheet module with timer functionality
- Built billing and financial reporting features
- Added document management with AI/OCR capabilities

---

## 👥 Team

- **Developer**: Erich Oberholzer
- **Company**: LMW Finance
- **Location**: South Africa

---

## 📞 Support

For issues or questions:
1. Check `docs/completed-md/TEST_BOT_GUIDE.md` for testing help
2. Review `docs/completed-md/CHANGELOG.md` for recent changes
3. Run smoke tests to verify system health: `npm run test:smoke`
