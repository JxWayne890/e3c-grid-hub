-- ============================================================
-- Phase 3: Deals / Opportunities
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE deals (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  contact_id bigint REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  value decimal(12,2) NOT NULL DEFAULT 0,
  stage text NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'contacted', 'qualified', 'proposal', 'won', 'lost')),
  probability integer NOT NULL DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date date,
  assigned_to uuid REFERENCES auth.users(id),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view their deals"
  ON deals FOR SELECT USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "org members can create deals"
  ON deals FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));

CREATE POLICY "org members can update deals"
  ON deals FOR UPDATE USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "org members can delete deals"
  ON deals FOR DELETE USING (org_id IN (SELECT user_org_ids()));

CREATE INDEX idx_deals_org_id ON deals(org_id);
CREATE INDEX idx_deals_contact_id ON deals(contact_id);
CREATE INDEX idx_deals_stage ON deals(org_id, stage);
