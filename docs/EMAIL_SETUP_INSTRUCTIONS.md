# Email Setup — IMAP/SMTP via cPanel

## Environment Variables (Vercel)

Add these to your Vercel project → **Settings** → **Environment Variables**:

```
EMAIL_HOST=mail.lmwfinance.co.za
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=erich@lmwfinance.co.za
EMAIL_PASSWORD=your-email-password
EMAIL_FROM_NAME=LMW Financial Solutions
EMAIL_FROM_ADDRESS=erich@lmwfinance.co.za
```

## Database Setup

1. Open Supabase Dashboard → **SQL Editor**
2. Run the contents of: `database/NEW_SQL_SCRIPTS_GO_HERE/create_email_tables.sql`
3. This creates `email_tokens` and `job_emails` tables

## What Was Built

| File | Purpose |
|------|---------|
| `api/email-api.js` | IMAP/SMTP email operations (inbox, read, send, reply, forward, search, folders, link/unlink jobs) |
| `src/services/emailService.js` | Frontend API client |
| `src/components/EmailPage.jsx` | Full email client (3-panel layout with folder tree) |
| `src/components/JobEmailsTab.jsx` | Linked emails in job detail view |
| `database/NEW_SQL_SCRIPTS_GO_HERE/create_email_tables.sql` | DB tables |

## Features

- View inbox with full folder tree (including all subfolders)
- Read, compose, reply, reply all, forward emails
- **Link to Job** — connect any email to a job register entry
- **Create Job from Email** — creates a new job pre-filled from the email (auto-matches client by email address)
- **Job Register Emails tab** — see all linked emails when you expand a job (both table and board view)
