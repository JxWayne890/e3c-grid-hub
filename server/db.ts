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

// --- Contact operations ---

export async function getContacts(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch contacts: ${error.message}`);
  return data ?? [];
}

export async function getContact(supabase: SupabaseClient, contactId: number) {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .single();

  if (error) throw new Error(`Failed to fetch contact: ${error.message}`);
  return data;
}

export async function createContact(
  supabase: SupabaseClient,
  data: {
    org_id: string;
    first_name: string;
    last_name?: string;
    email: string;
    phone?: string;
    company?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    tags?: string[];
    source?: string;
    assigned_to?: string;
    stage?: string;
  }
) {
  const { data: contact, error } = await supabase
    .from("contacts")
    .insert({
      org_id: data.org_id,
      first_name: data.first_name,
      last_name: data.last_name || "",
      email: data.email,
      phone: data.phone || "",
      company: data.company || "",
      address: data.address || "",
      city: data.city || "",
      state: data.state || "",
      zip: data.zip || "",
      tags: data.tags || [],
      source: data.source || "manual",
      assigned_to: data.assigned_to || null,
      stage: data.stage || "lead",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create contact: ${error.message}`);
  return contact;
}

export async function updateContact(
  supabase: SupabaseClient,
  contactId: number,
  data: Record<string, unknown>
) {
  const { data: contact, error } = await supabase
    .from("contacts")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", contactId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update contact: ${error.message}`);
  return contact;
}

export async function updateContactStage(
  supabase: SupabaseClient,
  contactId: number,
  stage: string
) {
  const { data: contact, error } = await supabase
    .from("contacts")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", contactId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update contact stage: ${error.message}`);
  return contact;
}

export async function deleteContact(supabase: SupabaseClient, contactId: number) {
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", contactId);

  if (error) throw new Error(`Failed to delete contact: ${error.message}`);
}

export async function createContactFromSignup(
  supabase: SupabaseClient,
  orgId: string,
  signup: { name: string; email: string; phone: string; industry: string; referralCode?: string | null; id?: number }
) {
  const parts = signup.name.trim().split(/\s+/);
  const firstName = parts[0] || signup.name;
  const lastName = parts.slice(1).join(" ");

  return createContact(supabase, {
    org_id: orgId,
    first_name: firstName,
    last_name: lastName,
    email: signup.email,
    phone: signup.phone,
    company: signup.industry,
    source: signup.referralCode ? "referral" : "website",
  });
}

// --- Deal operations ---

export async function getDealsForContact(supabase: SupabaseClient, contactId: number) {
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch deals: ${error.message}`);
  return data ?? [];
}

export async function createDeal(
  supabase: SupabaseClient,
  data: { org_id: string; contact_id: number; title: string; value?: number; stage?: string; probability?: number; expected_close_date?: string; notes?: string }
) {
  const { data: deal, error } = await supabase
    .from("deals")
    .insert({
      org_id: data.org_id,
      contact_id: data.contact_id,
      title: data.title,
      value: data.value ?? 0,
      stage: data.stage ?? "lead",
      probability: data.probability ?? 0,
      expected_close_date: data.expected_close_date || null,
      notes: data.notes ?? "",
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create deal: ${error.message}`);
  return deal;
}

export async function updateDeal(supabase: SupabaseClient, dealId: number, data: Record<string, unknown>) {
  const { data: deal, error } = await supabase
    .from("deals")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", dealId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update deal: ${error.message}`);
  return deal;
}

export async function deleteDeal(supabase: SupabaseClient, dealId: number) {
  const { error } = await supabase.from("deals").delete().eq("id", dealId);
  if (error) throw new Error(`Failed to delete deal: ${error.message}`);
}

// --- Task operations ---

export async function getTasks(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);
  return data ?? [];
}

export async function getTasksForContact(supabase: SupabaseClient, contactId: number) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("contact_id", contactId)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);
  return data ?? [];
}

export async function createTask(
  supabase: SupabaseClient,
  data: { org_id: string; contact_id?: number; assigned_to: string; title: string; description?: string; due_date?: string; priority?: string }
) {
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      org_id: data.org_id,
      contact_id: data.contact_id || null,
      assigned_to: data.assigned_to,
      title: data.title,
      description: data.description ?? "",
      due_date: data.due_date || null,
      priority: data.priority ?? "medium",
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create task: ${error.message}`);
  return task;
}

export async function completeTask(supabase: SupabaseClient, taskId: number) {
  const { data: task, error } = await supabase
    .from("tasks")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .select()
    .single();
  if (error) throw new Error(`Failed to complete task: ${error.message}`);
  return task;
}

export async function updateTask(supabase: SupabaseClient, taskId: number, data: Record<string, unknown>) {
  const { data: task, error } = await supabase
    .from("tasks")
    .update(data)
    .eq("id", taskId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update task: ${error.message}`);
  return task;
}

export async function deleteTask(supabase: SupabaseClient, taskId: number) {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(`Failed to delete task: ${error.message}`);
}

// --- Activity operations ---

export async function logActivity(
  supabase: SupabaseClient,
  data: { org_id: string; contact_id: number; user_id: string; type: string; content: string; metadata?: Record<string, unknown> }
) {
  await supabase.from("activities").insert({
    org_id: data.org_id,
    contact_id: data.contact_id,
    user_id: data.user_id,
    type: data.type,
    content: data.content,
    metadata: data.metadata ?? {},
  });
}

export async function getActivitiesForContact(supabase: SupabaseClient, contactId: number) {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`Failed to fetch activities: ${error.message}`);
  return data ?? [];
}

// --- Contact note operations ---

export async function addContactNote(
  supabase: SupabaseClient,
  data: { orgId: string; contactId: number; userId: string; note: string }
) {
  const { error } = await supabase.from("contact_notes").insert({
    org_id: data.orgId,
    contact_id: data.contactId,
    user_id: data.userId,
    note: data.note,
  });

  if (error) throw new Error(`Failed to add contact note: ${error.message}`);
}

export async function getNotesForContact(
  supabase: SupabaseClient,
  contactId: number
) {
  const { data, error } = await supabase
    .from("contact_notes")
    .select("*")
    .eq("contact_id", contactId)
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
