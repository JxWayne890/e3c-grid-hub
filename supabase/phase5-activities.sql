-- ============================================================
-- Phase 5: Activity Timeline
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE activities (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  contact_id bigint REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('note', 'email', 'call', 'task', 'stage_change', 'deal_created')),
  content text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view their activities"
  ON activities FOR SELECT USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "org members can create activities"
  ON activities FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));

CREATE INDEX idx_activities_contact_id ON activities(contact_id, created_at DESC);
CREATE INDEX idx_activities_org_id ON activities(org_id);
CREATE INDEX idx_activities_type ON activities(org_id, type);
