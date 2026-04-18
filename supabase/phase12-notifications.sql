-- ============================================================
-- Phase 12: Notifications
-- ============================================================

CREATE TABLE notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  entity_type text,
  entity_id bigint,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org notifications view" ON notifications FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org notifications create" ON notifications FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org notifications update" ON notifications FOR UPDATE USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org notifications delete" ON notifications FOR DELETE USING (org_id IN (SELECT user_org_ids()));
CREATE INDEX idx_notifications_org_user ON notifications(org_id, user_id, read, created_at DESC);
