# Updated Database Schema - Working with Existing Clients Table

Since you already have a `clients` table with existing data, here are the SQL commands to extend it for the customer management system while allowing NULL values for flexibility.

## 1. Add New Columns to Existing Clients Table

```sql
-- Add the additional customer management fields to your existing clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS company_income_tax_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_vat_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_paye_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_public_officer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS public_officer_id_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS company_address TEXT,
ADD COLUMN IF NOT EXISTS company_telephone VARCHAR(20),
ADD COLUMN IF NOT EXISTS company_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_person_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_person_telephone VARCHAR(20),
ADD COLUMN IF NOT EXISTS contact_person_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active',
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add constraint for status if it doesn't exist
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE clients ADD CONSTRAINT clients_status_check 
        CHECK (status IN ('Active', 'Inactive', 'Suspended'));
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;
```

## 2. Create Directors Table (linked to existing clients)

```sql
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

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_directors_client_id ON directors(client_id);
```

## 3. Create Documents Table (linked to existing clients)

```sql
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

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
```

## 4. Create Audit Trail Table

```sql
CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_trail_table_record ON audit_trail(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_changed_by ON audit_trail(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_trail_changed_at ON audit_trail(changed_at);
```

## 5. User Management Tables

```sql
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'user', 'read_only')),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  phone_number VARCHAR(20),
  otp_code VARCHAR(6),
  otp_expires_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  session_token VARCHAR(255),
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## 6. Audit Trail Triggers

```sql
-- Function to automatically log changes
CREATE OR REPLACE FUNCTION log_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_trail (table_name, record_id, action, old_values, changed_by, ip_address)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), auth.uid(), inet_client_addr());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_trail (table_name, record_id, action, old_values, new_values, changed_by, ip_address)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), auth.uid(), inet_client_addr());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_trail (table_name, record_id, action, new_values, changed_by, ip_address)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), auth.uid(), inet_client_addr());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to main tables
DROP TRIGGER IF EXISTS clients_audit_trigger ON clients;
CREATE TRIGGER clients_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION log_changes();

DROP TRIGGER IF EXISTS directors_audit_trigger ON directors;
CREATE TRIGGER directors_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON directors
  FOR EACH ROW EXECUTE FUNCTION log_changes();

DROP TRIGGER IF EXISTS documents_audit_trigger ON documents;
CREATE TRIGGER documents_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION log_changes();
```

## 7. Row Level Security (Optional)

```sql
-- Enable RLS on new tables
ALTER TABLE directors ENABLE ROW LEVEL SECURITY;  
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Basic policies (customize as needed)
-- Allow authenticated users to see directors of clients they have access to
CREATE POLICY "Users can view directors" ON directors
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to see documents of clients they have access to  
CREATE POLICY "Users can view documents" ON documents
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can view audit trail
CREATE POLICY "Admins can view audit trail" ON audit_trail
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );
```

## 8. Storage Buckets

Create these storage buckets in Supabase for document files:

1. **client-documents** - For all client-related documents
2. **profile-images** - For user profile pictures

## Summary of Changes

✅ **All fields in the extended clients table allow NULL values**
✅ **Preserves existing client_name and registration_number data**
✅ **Adds 11 new fields for comprehensive client management**
✅ **Directors table supports up to 5 directors per client**
✅ **Documents table with support for 13 document types + "other"**
✅ **Complete audit trail for compliance**
✅ **User role management system**
✅ **Flexible data entry - users can add information gradually**

## Field Mapping

Your existing fields map to the customer requirements as follows:
- `client_name` → Company Name ✅
- `registration_number` → Company Registration Number ✅
- **NEW:** `company_income_tax_number` → Company Income Tax Reference number
- **NEW:** `company_vat_number` → Company VAT Number  
- **NEW:** `company_paye_number` → Company PAYE Number
- **NEW:** `company_public_officer_name` → Company Public officer name with SARS
- **NEW:** `public_officer_id_number` → ID for the person in number 6
- **NEW:** `company_address` → Company Address
- **NEW:** `company_telephone` → Company Telephone
- **NEW:** `company_email` → Company email address
- **NEW:** `contact_person_name` → Contact Person
- **NEW:** `contact_person_telephone` → Contact Person tel number
- **NEW:** `contact_person_email` → Contact person Email address
- **Directors table** → Name and ID number and contact details for up to 5 directors

This approach ensures no data loss and provides maximum flexibility for users to add information as it becomes available.