-- ============================================================
-- Settings: Expand organizations + org_members + email infrastructure
-- Run in Supabase SQL Editor
-- ============================================================

-- Expand organizations with business profile + email settings
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry text NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website text NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS zip text NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Chicago';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email_from_name text NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email_reply_to text NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email_signature text NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

-- Allow org members to update their own org
CREATE POLICY "org owners can update their org"
  ON organizations FOR UPDATE
  USING (id IN (
    SELECT om.org_id FROM org_members om
    WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
  ));

-- Expand org_members with profile fields
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT '';
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS last_name text NOT NULL DEFAULT '';
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';

-- Allow members to update their own profile
CREATE POLICY "members can update their own profile"
  ON org_members FOR UPDATE
  USING (user_id = auth.uid() AND org_id IN (SELECT user_org_ids()));

-- Email templates (org-scoped)
CREATE TABLE email_templates (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view their email templates"
  ON email_templates FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org members can create email templates"
  ON email_templates FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org members can update email templates"
  ON email_templates FOR UPDATE USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org members can delete email templates"
  ON email_templates FOR DELETE USING (org_id IN (SELECT user_org_ids()));

CREATE INDEX idx_email_templates_org_id ON email_templates(org_id);

-- Email logs (track every email sent)
CREATE TABLE email_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  contact_id bigint REFERENCES contacts(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  resend_id text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view their email logs"
  ON email_logs FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org members can create email logs"
  ON email_logs FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));

CREATE INDEX idx_email_logs_org_id ON email_logs(org_id);
CREATE INDEX idx_email_logs_contact_id ON email_logs(contact_id);

-- Events / Calendar
CREATE TABLE events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  contact_id bigint REFERENCES contacts(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  location text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view their events"
  ON events FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org members can create events"
  ON events FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org members can update events"
  ON events FOR UPDATE USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org members can delete events"
  ON events FOR DELETE USING (org_id IN (SELECT user_org_ids()));

CREATE INDEX idx_events_org_id ON events(org_id);
CREATE INDEX idx_events_contact_id ON events(contact_id);
CREATE INDEX idx_events_start_at ON events(org_id, start_at);
