# Database Schema for Customer Management System

This document outlines the Supabase database tables needed for the expanded Agility Management System.

## 1. Customers Table
Primary table for storing customer company information.

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL,
  company_registration_number VARCHAR(50) UNIQUE NOT NULL,
  company_income_tax_number VARCHAR(50),
  company_vat_number VARCHAR(50),
  company_paye_number VARCHAR(50),
  company_public_officer_name VARCHAR(255),
  public_officer_id_number VARCHAR(20),
  company_address TEXT,
  company_telephone VARCHAR(20),
  company_email VARCHAR(255),
  contact_person_name VARCHAR(255),
  contact_person_telephone VARCHAR(20),
  contact_person_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
```

## 2. Directors Table
Store information for up to 5 directors per company.

```sql
CREATE TABLE directors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  director_name VARCHAR(255) NOT NULL,
  id_number VARCHAR(20) NOT NULL,
  contact_telephone VARCHAR(20),
  contact_email VARCHAR(255),
  director_order INTEGER CHECK (director_order BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(customer_id, director_order)
);
```

## 3. Documents Table
Store document metadata and file references.

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
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
  uploaded_by UUID REFERENCES auth.users(id),
  
  UNIQUE(customer_id, document_type, document_name)
);
```

## 4. Audit Trail Table
Track all changes for compliance and security.

```sql
CREATE TABLE audit_trail (
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
```

## 5. User Roles Table
Manage user access levels.

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'user', 'read_only')),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id, role)
);
```

## 6. User Sessions Table (for OTP tracking)
Track OTP sessions and authentication.

```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  phone_number VARCHAR(20) NOT NULL,
  otp_code VARCHAR(6),
  otp_expires_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  session_token VARCHAR(255),
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Indexes for Performance

```sql
-- Customer indexes
CREATE INDEX idx_customers_registration_number ON customers(company_registration_number);
CREATE INDEX idx_customers_name ON customers(company_name);
CREATE INDEX idx_customers_status ON customers(status);

-- Director indexes
CREATE INDEX idx_directors_customer_id ON directors(customer_id);
CREATE INDEX idx_directors_id_number ON directors(id_number);

-- Document indexes  
CREATE INDEX idx_documents_customer_id ON documents(customer_id);
CREATE INDEX idx_documents_type ON documents(document_type);

-- Audit trail indexes
CREATE INDEX idx_audit_trail_table_record ON audit_trail(table_name, record_id);
CREATE INDEX idx_audit_trail_changed_by ON audit_trail(changed_by);
CREATE INDEX idx_audit_trail_changed_at ON audit_trail(changed_at);

-- User role indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Session indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_phone ON user_sessions(phone_number);
```

## Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE directors ENABLE ROW LEVEL SECURITY;  
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Example policies (customize based on your requirements)
-- Customers: Users can only see customers they have access to
CREATE POLICY "Users can view customers" ON customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager', 'user', 'read_only')
    )
  );

-- Admin full access policy
CREATE POLICY "Admins can manage customers" ON customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );
```

## Triggers for Audit Trail

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

-- Apply triggers to all main tables
CREATE TRIGGER customers_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER directors_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON directors
  FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER documents_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION log_changes();
```

## Storage Buckets

Create storage buckets in Supabase for document files:

1. **customer-documents** - For all customer-related documents
2. **profile-images** - For user profile pictures (future use)

## Next Steps

1. Create these tables in your Supabase project
2. Set up the storage buckets
3. Configure the RLS policies according to your security requirements
4. Test the audit trail functionality
5. Implement the OTP authentication system