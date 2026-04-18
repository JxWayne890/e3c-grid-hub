-- ============================================================
-- Phase 10: Locations
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE locations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  zip text NOT NULL DEFAULT '',
  capacity integer NOT NULL DEFAULT 0,
  monthly_rate numeric(10,2) NOT NULL DEFAULT 0,
  hourly_rate numeric(10,2) NOT NULL DEFAULT 0,
  daily_rate numeric(10,2) NOT NULL DEFAULT 0,
  amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org locations view" ON locations FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org locations create" ON locations FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org locations update" ON locations FOR UPDATE USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org locations delete" ON locations FOR DELETE USING (org_id IN (SELECT user_org_ids()));
CREATE INDEX idx_locations_org_id ON locations(org_id);

-- Now add the FK constraint on leads.location_id (was deferred from phase 6)
ALTER TABLE leads
  ADD CONSTRAINT leads_location_id_fkey
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;

ALTER TABLE calls
  ADD CONSTRAINT calls_location_id_fkey
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;

ALTER TABLE incident_reports
  ADD CONSTRAINT incident_reports_location_id_fkey
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;

ALTER TABLE employees
  ADD CONSTRAINT employees_location_id_fkey
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;
