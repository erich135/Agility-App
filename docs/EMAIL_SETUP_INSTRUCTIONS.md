# Email Integration Setup Instructions

## Step 1: Register Azure AD App

1. Go to **https://portal.azure.com**
2. Navigate to **Azure Active Directory** → **App registrations** → **New registration**
3. Fill in:
   - **Name:** `Agility Email`
   - **Supported account types:** Accounts in this organizational directory only (single tenant)
   - **Redirect URI:** Platform = **Web**, URI = `https://your-app.vercel.app/api/email-auth?action=callback`
     _(replace `your-app` with your actual Vercel domain)_
4. Click **Register**
5. On the overview page, copy the **Application (client) ID** and **Directory (tenant) ID**

## Step 2: Create Client Secret

1. In your new app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Description: `Agility Email Secret`, Expiry: 24 months
4. Click **Add**
5. **IMMEDIATELY copy the secret Value** (you can't see it again later)

## Step 3: Add API Permissions

1. Go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**
2. Add these permissions:
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `Mail.Send`
   - `User.Read`
   - `offline_access`
3. Click **Grant admin consent for [your org]**

## Step 4: Add Environment Variables in Vercel

Go to your Vercel project → **Settings** → **Environment Variables** and add:

```
MS_TENANT_ID=paste-your-directory-tenant-id-here
MS_CLIENT_ID=paste-your-application-client-id-here
MS_CLIENT_SECRET=paste-your-client-secret-value-here
MS_REDIRECT_URI=https://your-app.vercel.app/api/email-auth?action=callback
```

## Step 5: Run SQL Script in Supabase

1. Open Supabase Dashboard → **SQL Editor**
2. Run the contents of: `database/NEW_SQL_SCRIPTS_GO_HERE/create_email_tables.sql`
3. This creates `email_tokens` and `job_emails` tables

## Step 6: Deploy & Connect

1. Push to Git / deploy to Vercel
2. Open the app → click **Email** in the sidebar
3. Click **Connect Microsoft 365**
4. Sign in with your Microsoft account and grant consent
5. You should be redirected back with "Email connected successfully!"

## What Was Built

| File | Purpose |
|------|---------|
| `api/email-auth.js` | OAuth2 login/callback/status/disconnect |
| `api/email-api.js` | Inbox, read, send, reply, forward, search, link/unlink jobs |
| `src/services/emailService.js` | Frontend API client |
| `src/components/EmailPage.jsx` | Full email client (3-panel layout) |
| `src/components/JobEmailsTab.jsx` | Linked emails in job detail view |
| `database/NEW_SQL_SCRIPTS_GO_HERE/create_email_tables.sql` | DB tables |

## Features

- View inbox with folders, search, pagination
- Read, compose, reply, reply all, forward emails
- **Link to Job** — connect any email to a job register entry
- **Create Job from Email** — creates a new job pre-filled from the email (auto-matches client by email address)
- **Job Register Emails tab** — see all linked emails when you expand a job (both table and board view)
