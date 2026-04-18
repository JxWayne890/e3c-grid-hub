-- ============================================================
-- Phase 6: Leads (separate from Contacts)
-- Run in Supabase SQL Editor
-- Notes:
--   - Leads are inquiries that haven't yet become customers.
--   - Converting a lead creates a row in `contacts` and sets
--     `leads.converted_contact_id` to that contact's id.
--   - `location_id` is added in a later phase (Locations) via
--     ALTER TABLE ... ADD CONSTRAINT. It's nullable for now.
-- ============================================================

CREATE TABLE leads (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  location_id bigint,
  source text NOT NULL DEFAULT 'website'
    CHECK (source IN ('phone', 'walk_in', 'website', 'referral', 'third_party')),
  frequency text NOT NULL DEFAULT 'monthly'
    CHECK (frequency IN ('hourly', 'daily', 'monthly')),
  temperature text NOT NULL DEFAULT 'warm'
    CHECK (temperature IN ('hot', 'warm', 'cold')),
  stage text NOT NULL DEFAULT 'new'
    CHECK (stage IN ('new', 'contacted', 'qualified', 'negotiating', 'won', 'lost')),
  assigned_to uuid REFERENCES auth.users(id),
  notes text NOT NULL DEFAULT '',
  converted_contact_id bigint REFERENCES contacts(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view their leads"
  ON leads FOR SELECT USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "org members can create leads"
  ON leads FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));

CREATE POLICY "org members can update leads"
  ON leads FOR UPDATE USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "org members can delete leads"
  ON leads FOR DELETE USING (org_id IN (SELECT user_org_ids()));

CREATE INDEX idx_leads_org_id ON leads(org_id);
CREATE INDEX idx_leads_stage ON leads(org_id, stage);
CREATE INDEX idx_leads_temperature ON leads(org_id, temperature);
CREATE INDEX idx_leads_source ON leads(org_id, source);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_converted_contact_id ON leads(converted_contact_id);
