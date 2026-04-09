-- ============================================================
-- Phase 1: Contacts Table
-- Run in Supabase SQL Editor
-- ============================================================

-- Contacts table (replaces beta_signups as the primary CRM entity)
CREATE TABLE contacts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL DEFAULT '',
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  zip text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'referral', 'import', 'website')),
  assigned_to uuid REFERENCES auth.users(id),
  stage text NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'contacted', 'qualified', 'proposal', 'won', 'lost')),
  beta_signup_id bigint REFERENCES beta_signups(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view their contacts"
  ON contacts FOR SELECT
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "org members can create contacts"
  ON contacts FOR INSERT
  WITH CHECK (org_id IN (SELECT user_org_ids()));

CREATE POLICY "org members can update contacts"
  ON contacts FOR UPDATE
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "org members can delete contacts"
  ON contacts FOR DELETE
  USING (org_id IN (SELECT user_org_ids()));

CREATE INDEX idx_contacts_org_id ON contacts(org_id);
CREATE INDEX idx_contacts_stage ON contacts(org_id, stage);
CREATE INDEX idx_contacts_assigned_to ON contacts(assigned_to);
CREATE INDEX idx_contacts_email ON contacts(org_id, email);
CREATE INDEX idx_contacts_beta_signup_id ON contacts(beta_signup_id);

-- Add contact_id to contact_notes (alongside existing signup_id)
ALTER TABLE contact_notes ADD COLUMN contact_id bigint REFERENCES contacts(id) ON DELETE CASCADE;
CREATE INDEX idx_contact_notes_contact_id ON contact_notes(contact_id);

-- Backfill: create contacts from existing beta_signups
INSERT INTO contacts (org_id, first_name, last_name, email, phone, company, source, beta_signup_id, created_at)
SELECT
  org_id,
  split_part(name, ' ', 1),
  CASE WHEN position(' ' IN name) > 0 THEN substring(name FROM position(' ' IN name) + 1) ELSE '' END,
  email,
  phone,
  industry,
  CASE WHEN referral_code IS NOT NULL THEN 'referral' ELSE 'website' END,
  id,
  created_at
FROM beta_signups
WHERE org_id IS NOT NULL;

-- Backfill contact_notes with contact_id
UPDATE contact_notes cn
SET contact_id = c.id
FROM contacts c
WHERE c.beta_signup_id = cn.signup_id;
