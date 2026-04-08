import type { SupabaseClient } from "@supabase/supabase-js";

function generateReferralCode(userName: string): string {
  const name = userName.split("@")[0].split(/[^a-zA-Z]/)[0].toUpperCase().slice(0, 8) || "GRID";
  const suffix = Math.floor(Math.random() * 900 + 100); // 3-digit number
  return `${name}${suffix}`;
}

// --- Organization operations ---

export async function createOrganization(
  supabase: SupabaseClient,
  data: { name: string; slug: string; tier: string }
) {
  const { data: org, error } = await supabase
    .from("organizations")
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(`Failed to create organization: ${error.message}`);
  return org;
}

export async function addOrgMember(
  supabase: SupabaseClient,
  data: { orgId: string; userId: string; role: string; email?: string }
) {
  const referralCode = generateReferralCode(data.email ?? data.userId);

  const { error } = await supabase.from("org_members").insert({
    org_id: data.orgId,
    user_id: data.userId,
    role: data.role,
    referral_code: referralCode,
  });

  if (error) throw new Error(`Failed to add org member: ${error.message}`);
}

export async function getOrgForUser(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(id, tier, name)")
    .eq("user_id", userId)
    .limit(1)
    .single();

  return data;
}

// --- Beta signup operations ---

export async function insertBetaSignup(
  supabase: SupabaseClient,
  orgId: string,
  data: {
    name: string;
    email: string;
    phone: string;
    industry: string;
    referral_code: string | null;
    message: string | null;
  }
) {
  const { error } = await supabase.from("beta_signups").insert({
    org_id: orgId,
    ...data,
  });

  if (error) throw new Error(`Failed to insert beta signup: ${error.message}`);
}

export async function getBetaSignups(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("beta_signups")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch beta signups: ${error.message}`);
  return data ?? [];
}

// --- Contact note operations ---

export async function addContactNote(
  supabase: SupabaseClient,
  data: { orgId: string; signupId: number; userId: string; note: string }
) {
  const { error } = await supabase.from("contact_notes").insert({
    org_id: data.orgId,
    signup_id: data.signupId,
    user_id: data.userId,
    note: data.note,
  });

  if (error) throw new Error(`Failed to add contact note: ${error.message}`);
}

export async function getNotesForSignup(
  supabase: SupabaseClient,
  signupId: number
) {
  const { data, error } = await supabase
    .from("contact_notes")
    .select("*")
    .eq("signup_id", signupId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch notes: ${error.message}`);
  return data ?? [];
}

export async function deleteContactNote(
  supabase: SupabaseClient,
  noteId: number
) {
  const { error } = await supabase
    .from("contact_notes")
    .delete()
    .eq("id", noteId);

  if (error) throw new Error(`Failed to delete note: ${error.message}`);
}
