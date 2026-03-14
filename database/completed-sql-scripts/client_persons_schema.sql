-- ============================================
-- Client Persons Register & Signature Vault
-- ============================================
-- Phase 2: Comprehensive person register for directors,
-- members, trustees, shareholders, beneficial owners,
-- public officers, and authorised representatives.
-- Each person can have multiple roles per client.
-- Signatures stored as transparent PNGs for reuse.

-- 1. Client Persons table
CREATE TABLE IF NOT EXISTS client_persons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Personal details
  full_name VARCHAR(200) NOT NULL,
  id_number VARCHAR(20),
  passport_number VARCHAR(50),
  date_of_birth DATE,
  nationality VARCHAR(100) DEFAULT 'South African',
  
  -- Contact details
  email VARCHAR(200),
  phone VARCHAR(50),
  
  -- Addresses
  residential_address TEXT,
  postal_address TEXT,
  
  -- Roles (PostgreSQL array - can hold multiple)
  -- Valid values: director, member, trustee, shareholder, 
  -- public_officer, authorised_representative, beneficial_owner, secretary
  roles TEXT[] DEFAULT '{}',
  
  -- Appointment info
  appointment_date DATE,
  resignation_date DATE,
  is_active BOOLEAN DEFAULT true,
  
  -- Shareholding (if shareholder role)
  share_percentage DECIMAL(5,2),
  number_of_shares INTEGER,
  
  -- Additional info
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_persons_client ON client_persons(client_id);
CREATE INDEX IF NOT EXISTS idx_client_persons_active ON client_persons(is_active);
CREATE INDEX IF NOT EXISTS idx_client_persons_id_number ON client_persons(id_number);
CREATE INDEX IF NOT EXISTS idx_client_persons_roles ON client_persons USING GIN(roles);

-- 2. Signatures table (Signature Vault)
CREATE TABLE IF NOT EXISTS person_signatures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id UUID NOT NULL REFERENCES client_persons(id) ON DELETE CASCADE,
  
  -- Signature storage
  file_path TEXT NOT NULL,
  signature_type VARCHAR(50) DEFAULT 'full',
  -- full = full signature, initials = initials only
  
  -- Metadata
  original_filename VARCHAR(255),
  file_size INTEGER,
  
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID,
  
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_person_signatures_person ON person_signatures(person_id);
CREATE INDEX IF NOT EXISTS idx_person_signatures_default ON person_signatures(person_id, is_default) WHERE is_default = true;

-- 3. Disable RLS for development (matching existing pattern)
ALTER TABLE client_persons DISABLE ROW LEVEL SECURITY;
ALTER TABLE person_signatures DISABLE ROW LEVEL SECURITY;
