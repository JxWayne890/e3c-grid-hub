-- ============================================================
-- Phase 13: Roofing Industry Schema (Restore America demo)
-- Run in Supabase SQL Editor as a single query.
-- Adds: storm_events, insurance_adjusters, crews, crew_members, jobs
-- Extends: leads, contacts, employees, locations with roofing fields
-- ============================================================

-- 1. STORM EVENTS ---------------------------------------------------
CREATE TABLE IF NOT EXISTS storm_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  event_date date NOT NULL,
  storm_type text NOT NULL DEFAULT 'hail'
    CHECK (storm_type IN ('hail', 'wind', 'tropical', 'ice', 'tornado', 'other')),
  counties text[] NOT NULL DEFAULT '{}',
  description text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE storm_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org storm_events view" ON storm_events FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org storm_events create" ON storm_events FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org storm_events update" ON storm_events FOR UPDATE USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org storm_events delete" ON storm_events FOR DELETE USING (org_id IN (SELECT user_org_ids()));
CREATE INDEX IF NOT EXISTS idx_storm_events_org ON storm_events(org_id, event_date DESC);

-- 2. INSURANCE ADJUSTERS --------------------------------------------
CREATE TABLE IF NOT EXISTS insurance_adjusters (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  carrier text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  territory text NOT NULL DEFAULT '',
  avg_approval_days numeric(5,2) NOT NULL DEFAULT 0,
  avg_supplement_pct numeric(5,2) NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE insurance_adjusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org adjusters view" ON insurance_adjusters FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org adjusters create" ON insurance_adjusters FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org adjusters update" ON insurance_adjusters FOR UPDATE USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org adjusters delete" ON insurance_adjusters FOR DELETE USING (org_id IN (SELECT user_org_ids()));
CREATE INDEX IF NOT EXISTS idx_adjusters_org ON insurance_adjusters(org_id);
CREATE INDEX IF NOT EXISTS idx_adjusters_carrier ON insurance_adjusters(org_id, carrier);

-- 3. CREWS ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS crews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  location_id bigint REFERENCES locations(id) ON DELETE SET NULL,
  leader_employee_id bigint,  -- FK added after employees widened below
  capacity_jobs_per_week integer NOT NULL DEFAULT 3,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org crews view" ON crews FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org crews create" ON crews FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org crews update" ON crews FOR UPDATE USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org crews delete" ON crews FOR DELETE USING (org_id IN (SELECT user_org_ids()));
CREATE INDEX IF NOT EXISTS idx_crews_org ON crews(org_id);

-- 4. EMPLOYEES EXTENSIONS -------------------------------------------
-- Widen the role check to include roofing roles. Drop + recreate.
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees
  ADD CONSTRAINT employees_role_check CHECK (role IN (
    'manager', 'supervisor', 'attendant', 'valet', 'admin',
    'general_manager', 'sales_rep', 'project_manager',
    'supplements_coordinator', 'estimator', 'crew_leader',
    'installer', 'office_manager', 'warranty_coordinator',
    'owner'
  ));

ALTER TABLE employees ADD COLUMN IF NOT EXISTS crew_id bigint REFERENCES crews(id) ON DELETE SET NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS market text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_employees_crew ON employees(crew_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(org_id, role);

-- Now add the crew leader FK (employees now exists with crew_id)
ALTER TABLE crews
  ADD CONSTRAINT crews_leader_employee_id_fkey
  FOREIGN KEY (leader_employee_id) REFERENCES employees(id) ON DELETE SET NULL;

-- 5. CREW MEMBERS ---------------------------------------------------
CREATE TABLE IF NOT EXISTS crew_members (
  crew_id bigint REFERENCES crews(id) ON DELETE CASCADE NOT NULL,
  employee_id bigint REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (crew_id, employee_id)
);
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org crew_members view" ON crew_members FOR SELECT
  USING (crew_id IN (SELECT id FROM crews WHERE org_id IN (SELECT user_org_ids())));
CREATE POLICY "org crew_members create" ON crew_members FOR INSERT
  WITH CHECK (crew_id IN (SELECT id FROM crews WHERE org_id IN (SELECT user_org_ids())));
CREATE POLICY "org crew_members delete" ON crew_members FOR DELETE
  USING (crew_id IN (SELECT id FROM crews WHERE org_id IN (SELECT user_org_ids())));

-- 6. LEADS EXTENSIONS -----------------------------------------------
ALTER TABLE leads ADD COLUMN IF NOT EXISTS property_address text NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS zip text NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS roof_type text NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS roof_age_years integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS squares numeric(6,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS stories integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS damage_type text NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS insurance_carrier text NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS claim_number text NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS adjuster_id bigint REFERENCES insurance_adjusters(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS storm_event_id bigint REFERENCES storm_events(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS estimated_retail_amount numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS estimated_insurance_amount numeric(12,2) NOT NULL DEFAULT 0;
-- Custom pipeline stage for roofing (extends the original leads.stage enum).
-- We relax the CHECK so roofing-specific stages are allowed.
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_stage_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_stage_check CHECK (stage IN (
    'new', 'contacted', 'qualified', 'negotiating', 'won', 'lost',
    'inspection_scheduled', 'inspected', 'estimate_sent',
    'insurance_pending', 'approved', 'scheduled', 'in_progress'
  ));

CREATE INDEX IF NOT EXISTS idx_leads_storm_event ON leads(org_id, storm_event_id);
CREATE INDEX IF NOT EXISTS idx_leads_adjuster ON leads(org_id, adjuster_id);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(org_id, city);

-- 7. CONTACTS EXTENSIONS --------------------------------------------
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS spouse_name text NOT NULL DEFAULT '';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS secondary_phone text NOT NULL DEFAULT '';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS mailing_address text NOT NULL DEFAULT '';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS insurance_carrier text NOT NULL DEFAULT '';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS referred_by bigint REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_contact_method text NOT NULL DEFAULT 'phone'
  CHECK (preferred_contact_method IN ('phone', 'email', 'text', 'any'));
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS best_time_to_reach text NOT NULL DEFAULT '';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS storm_tag text NOT NULL DEFAULT '';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS customer_health_score integer
  CHECK (customer_health_score IS NULL OR (customer_health_score >= 0 AND customer_health_score <= 100));

CREATE INDEX IF NOT EXISTS idx_contacts_referred_by ON contacts(referred_by);
CREATE INDEX IF NOT EXISTS idx_contacts_health ON contacts(org_id, customer_health_score);

-- 8. LOCATIONS EXTENSIONS -------------------------------------------
ALTER TABLE locations ADD COLUMN IF NOT EXISTS opened_date date;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';
ALTER TABLE locations ADD COLUMN IF NOT EXISTS market text NOT NULL DEFAULT '';

-- 9. JOBS (roofing projects) ----------------------------------------
CREATE TABLE IF NOT EXISTS jobs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  contact_id bigint REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id bigint REFERENCES leads(id) ON DELETE SET NULL,
  location_id bigint REFERENCES locations(id) ON DELETE SET NULL,
  property_address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  zip text NOT NULL DEFAULT '',
  roof_type text NOT NULL DEFAULT '',
  squares numeric(6,2) NOT NULL DEFAULT 0,
  pitch text NOT NULL DEFAULT '',
  stories integer NOT NULL DEFAULT 1,
  damage_type text NOT NULL DEFAULT '',
  storm_event_id bigint REFERENCES storm_events(id) ON DELETE SET NULL,
  insurance_carrier text NOT NULL DEFAULT '',
  claim_number text NOT NULL DEFAULT '',
  adjuster_id bigint REFERENCES insurance_adjusters(id) ON DELETE SET NULL,
  estimated_retail_amount numeric(12,2) NOT NULL DEFAULT 0,
  insurance_approved_amount numeric(12,2) NOT NULL DEFAULT 0,
  supplements_amount numeric(12,2) NOT NULL DEFAULT 0,
  final_contract_amount numeric(12,2) NOT NULL DEFAULT 0,
  material_brand text NOT NULL DEFAULT '',
  material_line text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '',
  scheduled_start_date date,
  scheduled_end_date date,
  actual_start_date date,
  actual_end_date date,
  crew_id bigint REFERENCES crews(id) ON DELETE SET NULL,
  pm_employee_id bigint REFERENCES employees(id) ON DELETE SET NULL,
  supplements_coord_employee_id bigint REFERENCES employees(id) ON DELETE SET NULL,
  sales_rep_employee_id bigint REFERENCES employees(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN (
      'scheduled', 'materials_ordered', 'in_progress',
      'punch_list', 'completed', 'warranty_claim', 'cancelled'
    )),
  permits_required boolean NOT NULL DEFAULT false,
  permit_number text NOT NULL DEFAULT '',
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org jobs view" ON jobs FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org jobs create" ON jobs FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org jobs update" ON jobs FOR UPDATE USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "org jobs delete" ON jobs FOR DELETE USING (org_id IN (SELECT user_org_ids()));
CREATE INDEX IF NOT EXISTS idx_jobs_org ON jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(org_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_contact ON jobs(contact_id);
CREATE INDEX IF NOT EXISTS idx_jobs_lead ON jobs(lead_id);
CREATE INDEX IF NOT EXISTS idx_jobs_storm ON jobs(org_id, storm_event_id);
CREATE INDEX IF NOT EXISTS idx_jobs_crew ON jobs(crew_id);
CREATE INDEX IF NOT EXISTS idx_jobs_adjuster ON jobs(adjuster_id);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_start ON jobs(org_id, scheduled_start_date);

-- 10. CAMPAIGNS metrics snapshot (for attribution display) ----------
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS metrics_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 11. TASKS extensions (rep attribution without creating auth users) -
-- tasks.assigned_to already references auth.users(id). employee_id lets
-- us attribute workload to the specific rep (Tyrell, Jessica, etc.) even
-- when the actual auth user is the logged-in owner.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS employee_id bigint REFERENCES employees(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_employee ON tasks(employee_id, status);

-- ============================================================
-- End of phase 13
-- ============================================================
