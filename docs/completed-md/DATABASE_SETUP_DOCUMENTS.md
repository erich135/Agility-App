# Database Setup for Document Management

Run these SQL commands in your Supabase SQL editor to set up document management functionality.

## 1. Create Documents Table

```sql
-- Create documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
    'registration_certificate',
    'income_tax_certificate',
    'vat_certificate',
    'paye_certificate',
    'public_officer_id',
    'director_id_1',
    'director_id_2', 
    'director_id_3',
    'director_id_4',
    'director_id_5',
    'proof_of_address',
    'mandate',
    'other'
  )),
  document_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL, -- Supabase Storage path
  file_size BIGINT,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id)
);
```

## 2. Create Directors Table (if not already exists)

```sql
-- Create directors table if it doesn't exist
CREATE TABLE IF NOT EXISTS directors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  director_name VARCHAR(255),
  id_number VARCHAR(20),
  contact_telephone VARCHAR(20),
  contact_email VARCHAR(255),
  director_order INTEGER CHECK (director_order BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(client_id, director_order)
);
```

## 3. Create Indexes for Performance

```sql
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_directors_client_id ON directors(client_id);
CREATE INDEX IF NOT EXISTS idx_directors_order ON directors(client_id, director_order);
```

## 4. Enable Row Level Security (Optional)

```sql
-- Enable RLS on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE directors ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage documents
CREATE POLICY IF NOT EXISTS "Users can view documents" ON documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Users can insert documents" ON documents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Users can update documents" ON documents
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Users can delete documents" ON documents
  FOR DELETE USING (auth.role() = 'authenticated');

-- Allow authenticated users to manage directors
CREATE POLICY IF NOT EXISTS "Users can view directors" ON directors
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Users can insert directors" ON directors
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Users can update directors" ON directors
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Users can delete directors" ON directors
  FOR DELETE USING (auth.role() = 'authenticated');
```

## 5. Create Storage Bucket

You need to create a storage bucket in Supabase for document files:

### In Supabase Dashboard:

1. Go to **Storage** in the left sidebar
2. Click **New bucket**
3. Create a bucket named: `client-documents`
4. Set it as **Public** if you want direct download links, or **Private** for more security
5. Upload policies can be set as needed

### Or via SQL (if you prefer):

```sql
-- Insert bucket (this may need to be done via the dashboard)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents', 
  false, -- Set to true if you want public access
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
);
```

## 6. Storage Policies (if bucket is private)

```sql
-- Allow authenticated users to upload files
CREATE POLICY IF NOT EXISTS "Users can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'client-documents' AND 
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to view files
CREATE POLICY IF NOT EXISTS "Users can view documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'client-documents' AND 
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete files
CREATE POLICY IF NOT EXISTS "Users can delete documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'client-documents' AND 
    auth.role() = 'authenticated'
  );
```

## 7. Add Audit Trail for Documents (Optional)

```sql
-- Create audit trigger for documents table
DROP TRIGGER IF EXISTS documents_audit_trigger ON documents;
CREATE TRIGGER documents_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION log_changes();

-- Create audit trigger for directors table  
DROP TRIGGER IF EXISTS directors_audit_trigger ON directors;
CREATE TRIGGER directors_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON directors
  FOR EACH ROW EXECUTE FUNCTION log_changes();
```

## Summary

After running these commands, you will have:

✅ **Documents table** - Store document metadata  
✅ **Directors table** - Store up to 5 directors per client  
✅ **Storage bucket** - Store actual document files  
✅ **Indexes** - For better query performance  
✅ **Security policies** - Control access to documents  
✅ **Audit trail** - Track all document changes  

The document management system supports:
- 13 predefined document types + "other"
- File uploads up to 10MB
- PDF, JPG, PNG file formats
- Download and delete functionality
- Audit trail for compliance
- Secure file storage in Supabase