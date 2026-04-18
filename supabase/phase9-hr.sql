-- ============================================================
-- Phase 9: HR & Operations
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE employees (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'attendant'
    CHECK (role IN ('manager', 'supervisor', 'attendant', 'valet', 'admin')),
  location_id bigint,
  hire_date date,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'on_leave', 'terminated')),
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org employees view" ON employees FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org employees create" ON employees FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org employees update" ON employees FOR UPDATE USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org employees delete" ON employees FOR DELETE USING (org_id IN (SELECT user_org_ids()));
CREATE INDEX idx_employees_org_id ON employees(org_id);
CREATE INDEX idx_employees_location ON employees(location_id);
CREATE INDEX idx_employees_status ON employees(org_id, status);

CREATE TABLE incident_reports (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  employee_id bigint REFERENCES employees(id) ON DELETE SET NULL,
  location_id bigint,
  incident_date timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL DEFAULT 'other'
    CHECK (type IN ('damage', 'theft', 'injury', 'customer_complaint', 'safety', 'other')),
  severity text NOT NULL DEFAULT 'low'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'investigating', 'resolved')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org incidents view" ON incident_reports FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org incidents create" ON incident_reports FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org incidents update" ON incident_reports FOR UPDATE USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org incidents delete" ON incident_reports FOR DELETE USING (org_id IN (SELECT user_org_ids()));
CREATE INDEX idx_incidents_org_id ON incident_reports(org_id);
CREATE INDEX idx_incidents_employee ON incident_reports(employee_id);
CREATE INDEX idx_incidents_status ON incident_reports(org_id, status);
CREATE INDEX idx_incidents_date ON incident_reports(org_id, incident_date DESC);

CREATE TABLE write_ups (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  employee_id bigint REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  write_up_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'verbal'
    CHECK (severity IN ('verbal', 'written', 'final')),
  issued_by uuid REFERENCES auth.users(id),
  acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE write_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org write_ups view" ON write_ups FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org write_ups create" ON write_ups FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org write_ups update" ON write_ups FOR UPDATE USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org write_ups delete" ON write_ups FOR DELETE USING (org_id IN (SELECT user_org_ids()));
CREATE INDEX idx_write_ups_org_id ON write_ups(org_id);
CREATE INDEX idx_write_ups_employee ON write_ups(employee_id);

CREATE TABLE employee_files (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  employee_id bigint REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL DEFAULT 'other',
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('id', 'contract', 'training', 'medical', 'other')),
  url text,
  uploaded_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE employee_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org emp_files view" ON employee_files FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org emp_files create" ON employee_files FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org emp_files delete" ON employee_files FOR DELETE USING (org_id IN (SELECT user_org_ids()));
CREATE INDEX idx_emp_files_employee ON employee_files(employee_id);

CREATE TABLE employee_intakes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  applicant_name text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  role_applied text NOT NULL DEFAULT 'attendant',
  status text NOT NULL DEFAULT 'applied'
    CHECK (status IN ('applied', 'screening', 'interview', 'offer', 'hired', 'rejected')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE employee_intakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org intakes view" ON employee_intakes FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org intakes create" ON employee_intakes FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org intakes update" ON employee_intakes FOR UPDATE USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org intakes delete" ON employee_intakes FOR DELETE USING (org_id IN (SELECT user_org_ids()));
CREATE INDEX idx_intakes_org_id ON employee_intakes(org_id);
CREATE INDEX idx_intakes_status ON employee_intakes(org_id, status);
