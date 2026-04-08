-- ============================================================
-- E3C Grid Hub — Supabase Migration
-- Run as a SINGLE query in Supabase SQL Editor
-- Order: tables → function → RLS policies → indexes
-- ============================================================

-- 1. CREATE ALL TABLES FIRST

-- Organizations table
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  tier text NOT NULL DEFAULT 'starter' CHECK (tier IN ('starter', 'pro', 'enterprise')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Org members table
CREATE TABLE org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  referral_code text UNIQUE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(org_id, user_id)
);

-- Beta signups (org-scoped)
CREATE TABLE beta_signups (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  industry text NOT NULL,
  referral_code text,
  message text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Contact notes (org-scoped with user ownership)
CREATE TABLE contact_notes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  signup_id bigint REFERENCES beta_signups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  note text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Conversations (for OpenClaw chat history, org-scoped)
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  title text,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2. CREATE HELPER FUNCTION (now org_members exists)

CREATE OR REPLACE FUNCTION user_org_ids()
RETURNS SETOF uuid AS $$
  SELECT org_id FROM org_members WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. ENABLE RLS ON ALL TABLES

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES

-- Organizations
CREATE POLICY "users can view their orgs"
  ON organizations FOR SELECT
  USING (id IN (SELECT user_org_ids()));

CREATE POLICY "authenticated users can create orgs"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Org members
CREATE POLICY "users can view their org memberships"
  ON org_members FOR SELECT
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "org owners can manage members"
  ON org_members FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
    )
    OR
    NOT EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = org_members.org_id)
  );

CREATE POLICY "org owners can remove members"
  ON org_members FOR DELETE
  USING (
    org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = auth.uid() AND om.role = 'owner'
    )
  );

-- Beta signups
CREATE POLICY "org members can view their signups"
  ON beta_signups FOR SELECT
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "org members can create signups"
  ON beta_signups FOR INSERT
  WITH CHECK (org_id IN (SELECT user_org_ids()) OR org_id IS NULL);

-- Contact notes
CREATE POLICY "org members can view their org notes"
  ON contact_notes FOR SELECT
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "authenticated users can create notes in their org"
  ON contact_notes FOR INSERT
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_id = auth.uid());

CREATE POLICY "users can only delete their own notes"
  ON contact_notes FOR DELETE
  USING (user_id = auth.uid() AND org_id IN (SELECT user_org_ids()));

-- Conversations
CREATE POLICY "users can view their own conversations"
  ON conversations FOR SELECT
  USING (user_id = auth.uid() AND org_id IN (SELECT user_org_ids()));

CREATE POLICY "users can create conversations in their org"
  ON conversations FOR INSERT
  WITH CHECK (user_id = auth.uid() AND org_id IN (SELECT user_org_ids()));

CREATE POLICY "users can update their own conversations"
  ON conversations FOR UPDATE
  USING (user_id = auth.uid() AND org_id IN (SELECT user_org_ids()));

-- 5. INDEXES

CREATE INDEX idx_org_members_user_id ON org_members(user_id);
CREATE INDEX idx_org_members_org_id ON org_members(org_id);
CREATE INDEX idx_org_members_referral_code ON org_members(referral_code);
CREATE INDEX idx_beta_signups_org_id ON beta_signups(org_id);
CREATE INDEX idx_contact_notes_signup_id ON contact_notes(signup_id);
CREATE INDEX idx_contact_notes_org_id ON contact_notes(org_id);
CREATE INDEX idx_conversations_org_id ON conversations(org_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
