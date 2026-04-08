export * from "./_core/errors";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  tier: "starter" | "pro" | "enterprise";
  created_at: string;
};

export type OrgMember = {
  id: string;
  org_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
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

export type ContactNote = {
  id: number;
  org_id: string;
  signup_id: number;
  user_id: string;
  note: string;
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
