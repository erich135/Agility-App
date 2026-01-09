# 🔧 Quick Fix Guide - Database Setup

## ⚠️ Issue You're Experiencing

The error `Could not find the 'company_income_tax_number' column of 'clients'` means your database schema is missing some columns.

## ✅ Solution: Run Database Migration

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com
2. Select your project
3. Click on "SQL Editor" in the left sidebar

### Step 2: Run the Migration Script
1. Click "New Query"
2. Copy and paste the entire content of `database/completed-sql-scripts/fix_schema_migration.sql`
3. Click "Run" or press Ctrl+Enter
4. Wait for the green success message

### Step 3: Verify Tables
Run this query to verify all tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see these tables:
- ✅ clients
- ✅ directors
- ✅ documents
- ✅ activity_logs
- ✅ notifications
- ✅ notification_preferences
- ✅ tasks
- ✅ billing_info
- ✅ filing_history

### Step 4: Refresh Your App
1. Close the "Edit Customer" modal
2. Refresh the browser page (F5)
3. Try editing a customer again

---

## 🔍 What the Migration Does

1. **Adds Missing Columns to `clients` table:**
   - company_income_tax_number
   - vat_number
   - paye_number
   - email
   - phone_number
   - physical_address
   - postal_address
   - directors
   - shareholders
   - financial_year_end
   - share_capital
   - number_of_shares

2. **Creates New Feature Tables:**
   - notifications
   - notification_preferences
   - tasks
   - billing_info
   - filing_history

3. **Adds Indexes for Performance**

4. **Sets up Row Level Security (RLS) Policies**

---

## 🚨 Alternative: Run Full Enhanced Schema

If you haven't run the enhanced features schema yet:

1. Open SQL Editor in Supabase
2. Run the file: `database/completed-sql-scripts/enhanced_features_schema.sql`
3. This creates ALL new feature tables and adds missing columns

---

## 📝 After Running Migration

### Test These Features:
1. ✅ Edit customer (should save without errors)
2. ✅ Dashboard loads (/dashboard)
3. ✅ Notification center (bell icon) doesn't show errors
4. ✅ Customer management works smoothly

---

## 🔧 Still Having Issues?

### Check Database Connection
```sql
SELECT NOW(); -- Should return current timestamp
```

### Check User Permissions
```sql
SELECT current_user, current_database();
```

### Verify Clients Table Structure
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clients' 
ORDER BY ordinal_position;
```

---

## 💡 Pro Tips

1. **Always backup before migrations:**
   - Supabase > Database > Backups
   - Or export current data

2. **Run migrations during low traffic:**
   - Migrations can lock tables briefly

3. **Test in development first:**
   - If you have a dev/staging environment

4. **Check Vercel Environment Variables:**
   - Make sure VITE_SUPABASE_URL points to the right database
   - Verify VITE_SUPABASE_ANON_KEY is correct

---

## 🎯 Quick Commands

### In Supabase SQL Editor:

**1. Check if table exists:**
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'notifications'
);
```

**2. Check if column exists:**
```sql
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_name = 'clients' 
  AND column_name = 'company_income_tax_number'
);
```

**3. Add single column manually:**
```sql
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS company_income_tax_number VARCHAR(50);
```

---

## 📞 Need More Help?

If you're still experiencing issues after running the migration:

1. Check browser console for specific error messages
2. Verify Supabase project is active and not paused
3. Check if you're using the correct database credentials
4. Make sure you have proper permissions in Supabase

---

## ✨ Expected Result

After successful migration:
- ✅ No more "column does not exist" errors
- ✅ Customer form saves successfully
- ✅ Dashboard loads without errors
- ✅ Notification center works (even if empty)
- ✅ All features function properly

---

**Time to Complete:** ~2 minutes  
**Difficulty:** Easy (just copy & paste SQL)  
**Risk:** Low (uses IF NOT EXISTS clauses)

---

*Last Updated: October 22, 2025*
