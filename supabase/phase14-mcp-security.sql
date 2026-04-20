-- ============================================================
-- Phase 14: MCP Security — agent_actions audit log
-- Run in Supabase SQL Editor.
-- ============================================================

-- Forensic trail of every MCP tool invocation. Written by the tool() wrapper
-- in server/mcp/wrapper.ts. Two writes per call: status='started' (before),
-- then update to status='success' or 'error' (after). Org_id and user_id
-- come from the verified context token, NOT from the LLM's args.

CREATE TABLE IF NOT EXISTS agent_actions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  tool_name text NOT NULL,
  tool_args_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  tool_result_summary text,
  status text NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'success', 'error')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_actions_org_id ON agent_actions(org_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_user_id ON agent_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_created_at ON agent_actions(org_id, created_at DESC);

ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;

-- Org members can read their org's audit log (for the "what did the AI do?" view).
-- Writes are done by the API server using the service role; no INSERT/UPDATE
-- policy is needed for end users.
CREATE POLICY "org members can view their agent_actions"
  ON agent_actions FOR SELECT
  USING (org_id IN (SELECT user_org_ids()));

-- ============================================================
-- Sanity check: confirm RLS is enabled on every org-scoped table
-- the MCP server touches. If any of these report `false`, fix
-- before deploying the new MCP wrapper — RLS is now load-bearing.
-- ============================================================

-- Run this to verify (read-only):
--
--   SELECT n.nspname || '.' || c.relname AS table_name,
--          c.relrowsecurity AS rls_enabled
--     FROM pg_class c
--     JOIN pg_namespace n ON n.oid = c.relnamespace
--    WHERE n.nspname = 'public'
--      AND c.relkind = 'r'
--      AND c.relname IN (
--          'organizations','org_members','contacts','contact_notes',
--          'deals','tasks','activities','events','email_templates',
--          'email_logs','leads','campaigns','campaign_recipients',
--          'voice_agents','calls','call_transcripts','chat_sessions',
--          'employees','incident_reports','write_ups','employee_files',
--          'employee_intakes','locations','sms_messages','notifications',
--          'storm_events','insurance_adjusters','crews','crew_members','jobs',
--          'agent_actions','conversations','beta_signups'
--      )
--    ORDER BY table_name;
