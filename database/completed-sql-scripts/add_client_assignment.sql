-- Add assigned consultant field to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_consultant_id UUID;
ALTER TABLE clients
  ADD CONSTRAINT clients_assigned_consultant_id_fkey
  FOREIGN KEY (assigned_consultant_id) REFERENCES consultants(id);

CREATE INDEX IF NOT EXISTS idx_clients_assigned_consultant_id ON clients(assigned_consultant_id);
