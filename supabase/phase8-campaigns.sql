-- ============================================================
-- Phase 8: Campaigns (Email + SMS blasts)
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE campaigns (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'email' CHECK (type IN ('email', 'sms')),
  audience_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  audience_size integer NOT NULL DEFAULT 0,
  template_id bigint REFERENCES email_templates(id) ON DELETE SET NULL,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can view campaigns" ON campaigns FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org members can create campaigns" ON campaigns FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org members can update campaigns" ON campaigns FOR UPDATE USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org members can delete campaigns" ON campaigns FOR DELETE USING (org_id IN (SELECT user_org_ids()));
CREATE INDEX idx_campaigns_org_id ON campaigns(org_id);
CREATE INDEX idx_campaigns_status ON campaigns(org_id, status);
CREATE INDEX idx_campaigns_created_at ON campaigns(org_id, created_at DESC);

CREATE TABLE campaign_recipients (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id bigint REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  contact_id bigint REFERENCES contacts(id) ON DELETE SET NULL,
  to_email text NOT NULL DEFAULT '',
  to_phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can view campaign_recipients" ON campaign_recipients FOR SELECT
  USING (campaign_id IN (SELECT id FROM campaigns WHERE org_id IN (SELECT user_org_ids())));
CREATE POLICY "org members can create campaign_recipients" ON campaign_recipients FOR INSERT
  WITH CHECK (campaign_id IN (SELECT id FROM campaigns WHERE org_id IN (SELECT user_org_ids())));
CREATE POLICY "org members can update campaign_recipients" ON campaign_recipients FOR UPDATE
  USING (campaign_id IN (SELECT id FROM campaigns WHERE org_id IN (SELECT user_org_ids())));
CREATE INDEX idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_contact_id ON campaign_recipients(contact_id);
CREATE INDEX idx_campaign_recipients_status ON campaign_recipients(campaign_id, status);
