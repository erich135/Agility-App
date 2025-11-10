# 📎 Additional Documents Feature - Setup & Usage Guide

## ✅ **Feature Status: AVAILABLE but needs database update**

The Additional Documents upload functionality with descriptions **IS implemented** but requires a quick database schema update.

---

## 🗄️ **Step 1: Update Database Schema (Required)**

**Run this SQL in your Supabase SQL Editor:**

```sql
-- Fix Document Schema - Add missing columns
-- Run this in your Supabase SQL Editor

-- Add uploaded_by column (this is missing and needed by DocumentManager)
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS uploaded_by text;

-- Add document_name column if it doesn't exist  
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS document_name text;

-- Add description column for additional documents
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS description text;

-- Update existing records to populate document_name from file_name for backward compatibility
UPDATE public.documents 
SET document_name = file_name 
WHERE document_name IS NULL;

-- Verify the columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND table_schema = 'public'
ORDER BY ordinal_position;
```

**How to run:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste the above SQL
5. Click **Run**

---

## 📱 **Step 2: How to Use Additional Documents**

### **Navigation Path:**
1. **Login** to the app
2. Go to **"Customer Management"** (from main navigation)
3. **Find the customer** you want to add documents for
4. **Click the "Documents" button** for that customer
5. **Scroll down** to see **"Additional Documents"** section
6. **Click "Add Document"** button

### **Upload Process:**
1. **Enter Document Name** (e.g., "Business License", "Contract Amendment")
2. **Enter Description** (detailed description of the document)
3. **Choose File** to upload
4. **Click "Upload Additional Document"**

### **Features Available:**
- ✅ **Custom document names** (not just filenames)
- ✅ **Rich descriptions** (multi-line text area)
- ✅ **File upload** with progress indicators
- ✅ **View documents** (opens in new tab)
- ✅ **Download documents** 
- ✅ **Delete documents**
- ✅ **Document listing** with names and descriptions

---

## 🎯 **Current Integration Status:**

### ✅ **What's Working:**
- DocumentManager component has full additional documents functionality
- Upload form with name and description fields
- File storage in Supabase Storage
- Document viewing, downloading, and deletion
- Integration in Customer Management interface

### 🔧 **What Needs Setup:**
- Database schema update (the SQL above)
- Users need to know the navigation path

---

## 🚀 **Expected User Experience:**

After running the database update:

1. **Customer Management → Select Customer → Documents**
2. **See standard document uploads** (Registration Certificate, VAT, etc.)
3. **Below that: "Additional Documents" section**
4. **Click "Add Document"** → **Upload form appears**
5. **Fill in name, description, select file**
6. **Upload successfully with rich metadata**

---

## 📋 **Quick Test:**

1. Run the SQL schema update
2. Go to Customer Management
3. Pick any customer → Click "Documents"
4. Scroll down to "Additional Documents"
5. Click "Add Document"
6. You should see form fields for:
   - Document Name
   - Description (textarea)
   - File selection

**The feature is fully implemented - just needs the database schema update!** 🎉