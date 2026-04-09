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
