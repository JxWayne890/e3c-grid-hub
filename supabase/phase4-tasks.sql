-- ============================================================
-- Phase 4: Tasks & Follow-ups
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE tasks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  contact_id bigint REFERENCES contacts(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  due_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view their tasks"
  ON tasks FOR SELECT USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "org members can create tasks"
  ON tasks FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));

CREATE POLICY "org members can update tasks"
  ON tasks FOR UPDATE USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "org members can delete tasks"
  ON tasks FOR DELETE USING (org_id IN (SELECT user_org_ids()));

CREATE INDEX idx_tasks_org_id ON tasks(org_id);
CREATE INDEX idx_tasks_contact_id ON tasks(contact_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(org_id, due_date);
CREATE INDEX idx_tasks_status ON tasks(org_id, status);
