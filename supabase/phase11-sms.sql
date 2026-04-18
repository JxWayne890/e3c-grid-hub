-- ============================================================
-- Phase 11: SMS individual messages (1:1 threads with contacts)
-- ============================================================

CREATE TABLE sms_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  contact_id bigint REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
  from_number text NOT NULL DEFAULT '',
  to_number text NOT NULL DEFAULT '',
  sent_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org sms view" ON sms_messages FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org sms create" ON sms_messages FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org sms update" ON sms_messages FOR UPDATE USING (org_id IN (SELECT user_org_ids()));
CREATE INDEX idx_sms_org_id ON sms_messages(org_id);
CREATE INDEX idx_sms_contact_id ON sms_messages(contact_id, created_at);
