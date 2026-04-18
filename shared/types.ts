export * from "./_core/errors";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  tier: "starter" | "pro" | "enterprise";
  industry: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  logo_url: string | null;
  timezone: string;
  email_from_name: string;
  email_reply_to: string;
  email_signature: string;
  created_at: string;
  updated_at: string;
};

export type OrgMember = {
  id: string;
  org_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  first_name: string;
  last_name: string;
  phone: string;
  title: string;
  referral_code: string | null;
  created_at: string;
};

export type BetaSignup = {
  id: number;
  org_id: string;
  name: string;
  email: string;
  phone: string;
  industry: string;
  referral_code: string | null;
  message: string | null;
  created_at: string;
};

export type ContactStage = "lead" | "contacted" | "qualified" | "proposal" | "won" | "lost";
export type ContactSource = "manual" | "referral" | "import" | "website";

export type Contact = {
  id: number;
  org_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  tags: string[];
  source: ContactSource;
  assigned_to: string | null;
  stage: ContactStage;
  beta_signup_id: number | null;
  created_at: string;
  updated_at: string;
};

export type ContactNote = {
  id: number;
  org_id: string;
  signup_id: number | null;
  contact_id: number | null;
  user_id: string;
  note: string;
  created_at: string;
};

export type Deal = {
  id: number;
  org_id: string;
  contact_id: number;
  title: string;
  value: number;
  stage: ContactStage;
  probability: number;
  expected_close_date: string | null;
  assigned_to: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type TaskStatus = "pending" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: number;
  org_id: string;
  contact_id: number | null;
  assigned_to: string;
  title: string;
  description: string;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  completed_at: string | null;
};

export type LeadStage = "new" | "contacted" | "qualified" | "negotiating" | "won" | "lost";
export type LeadSource = "phone" | "walk_in" | "website" | "referral" | "third_party";
export type LeadFrequency = "hourly" | "daily" | "monthly";
export type LeadTemperature = "hot" | "warm" | "cold";

export type Lead = {
  id: number;
  org_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address: string;
  location_id: number | null;
  source: LeadSource;
  frequency: LeadFrequency;
  temperature: LeadTemperature;
  stage: LeadStage;
  assigned_to: string | null;
  notes: string;
  converted_contact_id: number | null;
  created_at: string;
  updated_at: string;
};

export type VoiceName = "nina" | "marcus" | "ava" | "leo";

export type VoiceAgent = {
  id: number;
  org_id: string;
  name: string;
  voice: VoiceName;
  greeting: string;
  system_prompt: string;
  tools_enabled: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CallDirection = "inbound" | "outbound";
export type CallType = "sales" | "support" | "general" | "billing";
export type CallDisposition =
  | "lead_created"
  | "transferred_to_live_agent"
  | "scheduled_callback"
  | "info_provided"
  | "no_answer";

export type Call = {
  id: number;
  org_id: string;
  contact_id: number | null;
  voice_agent_id: number | null;
  direction: CallDirection;
  caller_name: string;
  caller_phone: string;
  location_id: number | null;
  call_type: CallType;
  disposition: CallDisposition;
  duration_seconds: number;
  recording_url: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
};

export type CallTurn = {
  speaker: "agent" | "caller";
  text: string;
  timestamp: string;
};

export type CallTranscript = {
  id: number;
  call_id: number;
  turns: CallTurn[];
  summary: string;
  next_steps: string[];
  created_at: string;
};

export type ChatChannel = "website" | "widget";
export type ChatStatus = "active" | "ended" | "abandoned";
export type ChatTurn = { speaker: "agent" | "visitor"; text: string; timestamp: string };

export type ChatSession = {
  id: number;
  org_id: string;
  contact_id: number | null;
  channel: ChatChannel;
  visitor_name: string;
  transcript: ChatTurn[];
  summary: string;
  status: ChatStatus;
  started_at: string;
  ended_at: string | null;
  created_at: string;
};

export type CampaignType = "email" | "sms";
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed" | "cancelled";

export type AudienceFilter = {
  stage?: ContactStage[];
  tags?: string[];
  cities?: string[];
  sources?: ContactSource[];
  churned?: boolean;
  active?: boolean;
};

export type Campaign = {
  id: number;
  org_id: string;
  name: string;
  type: CampaignType;
  audience_filter: AudienceFilter;
  audience_size: number;
  template_id: number | null;
  subject: string;
  body: string;
  status: CampaignStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RecipientStatus =
  | "pending" | "sent" | "delivered" | "opened" | "clicked" | "bounced" | "failed";

export type CampaignRecipient = {
  id: number;
  campaign_id: number;
  contact_id: number | null;
  to_email: string;
  to_phone: string;
  status: RecipientStatus;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  created_at: string;
};

export type Location = {
  id: number;
  org_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  capacity: number;
  monthly_rate: number;
  hourly_rate: number;
  daily_rate: number;
  amenities: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: number;
  org_id: string;
  user_id: string | null;
  type: string;
  title: string;
  body: string;
  entity_type: string | null;
  entity_id: number | null;
  read: boolean;
  created_at: string;
};

export type SmsDirection = "inbound" | "outbound";
export type SmsStatus = "queued" | "sent" | "delivered" | "failed";
export type SmsMessage = {
  id: number;
  org_id: string;
  contact_id: number;
  direction: SmsDirection;
  body: string;
  status: SmsStatus;
  from_number: string;
  to_number: string;
  sent_at: string | null;
  created_at: string;
};

export type EmployeeRole = "manager" | "supervisor" | "attendant" | "valet" | "admin";
export type EmployeeStatus = "active" | "on_leave" | "terminated";
export type Employee = {
  id: number;
  org_id: string;
  first_name: string;
  last_name: string;
  role: EmployeeRole;
  location_id: number | null;
  hire_date: string | null;
  status: EmployeeStatus;
  phone: string;
  email: string;
  created_at: string;
  updated_at: string;
};

export type IncidentType = "damage" | "theft" | "injury" | "customer_complaint" | "safety" | "other";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "open" | "investigating" | "resolved";
export type IncidentReport = {
  id: number;
  org_id: string;
  employee_id: number | null;
  location_id: number | null;
  incident_date: string;
  type: IncidentType;
  severity: IncidentSeverity;
  description: string;
  status: IncidentStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type WriteUpSeverity = "verbal" | "written" | "final";
export type WriteUp = {
  id: number;
  org_id: string;
  employee_id: number;
  write_up_date: string;
  reason: string;
  description: string;
  severity: WriteUpSeverity;
  issued_by: string | null;
  acknowledged: boolean;
  created_at: string;
};

export type EmployeeFileCategory = "id" | "contract" | "training" | "medical" | "other";
export type EmployeeFile = {
  id: number;
  org_id: string;
  employee_id: number;
  file_name: string;
  file_type: string;
  category: EmployeeFileCategory;
  url: string | null;
  uploaded_at: string;
};

export type IntakeStatus = "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
export type EmployeeIntake = {
  id: number;
  org_id: string;
  applicant_name: string;
  email: string;
  phone: string;
  role_applied: string;
  status: IntakeStatus;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type ActivityType = "note" | "email" | "call" | "task" | "stage_change" | "deal_created";

export type Activity = {
  id: number;
  org_id: string;
  contact_id: number;
  user_id: string;
  type: ActivityType;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type Conversation = {
  id: string;
  org_id: string;
  user_id: string;
  title: string | null;
  messages: Array<{ role: string; content: string }>;
  created_at: string;
  updated_at: string;
};

export type EmailTemplate = {
  id: number;
  org_id: string;
  name: string;
  subject: string;
  body: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EmailLog = {
  id: number;
  org_id: string;
  contact_id: number | null;
  user_id: string;
  to_email: string;
  subject: string;
  body: string;
  status: "sent" | "failed" | "bounced";
  resend_id: string | null;
  created_at: string;
};

export type CalendarEvent = {
  id: number;
  org_id: string;
  contact_id: number | null;
  created_by: string;
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  location: string;
  created_at: string;
  updated_at: string;
};
