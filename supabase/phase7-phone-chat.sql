-- ============================================================
-- Phase 7: Phone & Chat (AI Voice Agent + Transcripts)
-- Run in Supabase SQL Editor
-- ============================================================

-- Voice agents: named AI personas that answer the phone.
CREATE TABLE voice_agents (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  voice text NOT NULL DEFAULT 'nina'
    CHECK (voice IN ('nina', 'marcus', 'ava', 'leo')),
  greeting text NOT NULL DEFAULT '',
  system_prompt text NOT NULL DEFAULT '',
  tools_enabled jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE voice_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can view voice_agents" ON voice_agents FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org members can create voice_agents" ON voice_agents FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org members can update voice_agents" ON voice_agents FOR UPDATE USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org members can delete voice_agents" ON voice_agents FOR DELETE USING (org_id IN (SELECT user_org_ids()));
CREATE INDEX idx_voice_agents_org_id ON voice_agents(org_id);

-- Calls: individual phone calls handled by an agent (or a human).
CREATE TABLE calls (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  contact_id bigint REFERENCES contacts(id) ON DELETE SET NULL,
  voice_agent_id bigint REFERENCES voice_agents(id) ON DELETE SET NULL,
  direction text NOT NULL DEFAULT 'inbound'
    CHECK (direction IN ('inbound', 'outbound')),
  caller_name text NOT NULL DEFAULT '',
  caller_phone text NOT NULL DEFAULT '',
  location_id bigint,
  call_type text NOT NULL DEFAULT 'general'
    CHECK (call_type IN ('sales', 'support', 'general', 'billing')),
  disposition text NOT NULL DEFAULT 'info_provided'
    CHECK (disposition IN (
      'lead_created', 'transferred_to_live_agent', 'scheduled_callback',
      'info_provided', 'no_answer'
    )),
  duration_seconds integer NOT NULL DEFAULT 0,
  recording_url text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can view calls" ON calls FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org members can create calls" ON calls FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org members can update calls" ON calls FOR UPDATE USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org members can delete calls" ON calls FOR DELETE USING (org_id IN (SELECT user_org_ids()));
CREATE INDEX idx_calls_org_id ON calls(org_id);
CREATE INDEX idx_calls_contact_id ON calls(contact_id);
CREATE INDEX idx_calls_started_at ON calls(org_id, started_at DESC);
CREATE INDEX idx_calls_call_type ON calls(org_id, call_type);
CREATE INDEX idx_calls_disposition ON calls(org_id, disposition);

-- Call transcripts: turn-by-turn transcript + summary + next steps.
CREATE TABLE call_transcripts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  call_id bigint REFERENCES calls(id) ON DELETE CASCADE NOT NULL UNIQUE,
  turns jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text NOT NULL DEFAULT '',
  next_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE call_transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can view call_transcripts" ON call_transcripts FOR SELECT
  USING (call_id IN (SELECT id FROM calls WHERE org_id IN (SELECT user_org_ids())));
CREATE POLICY "org members can create call_transcripts" ON call_transcripts FOR INSERT
  WITH CHECK (call_id IN (SELECT id FROM calls WHERE org_id IN (SELECT user_org_ids())));
CREATE POLICY "org members can update call_transcripts" ON call_transcripts FOR UPDATE
  USING (call_id IN (SELECT id FROM calls WHERE org_id IN (SELECT user_org_ids())));
CREATE INDEX idx_call_transcripts_call_id ON call_transcripts(call_id);

-- Chat sessions: AI chat widget / website conversations.
CREATE TABLE chat_sessions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  contact_id bigint REFERENCES contacts(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'website'
    CHECK (channel IN ('website', 'widget')),
  visitor_name text NOT NULL DEFAULT '',
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'ended'
    CHECK (status IN ('active', 'ended', 'abandoned')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can view chat_sessions" ON chat_sessions FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org members can create chat_sessions" ON chat_sessions FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org members can update chat_sessions" ON chat_sessions FOR UPDATE USING (org_id IN (SELECT user_org_ids()));
CREATE INDEX idx_chat_sessions_org_id ON chat_sessions(org_id);
CREATE INDEX idx_chat_sessions_started_at ON chat_sessions(org_id, started_at DESC);
