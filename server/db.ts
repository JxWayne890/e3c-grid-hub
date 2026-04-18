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
  data: { orgId: string; userId: string; role: string; email?: string; firstName?: string; lastName?: string }
) {
  const referralCode = generateReferralCode(data.email ?? data.userId);

  const { error } = await supabase.from("org_members").insert({
    org_id: data.orgId,
    user_id: data.userId,
    role: data.role,
    referral_code: referralCode,
    first_name: data.firstName || "",
    last_name: data.lastName || "",
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

// --- Org profile operations ---

export async function updateOrgProfile(supabase: SupabaseClient, orgId: string, data: Record<string, unknown>) {
  const { data: org, error } = await supabase
    .from("organizations")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", orgId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update org: ${error.message}`);
  return org;
}

export async function updateMemberProfile(supabase: SupabaseClient, memberId: string, data: Record<string, unknown>) {
  const { data: member, error } = await supabase
    .from("org_members")
    .update(data)
    .eq("id", memberId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update member: ${error.message}`);
  return member;
}

export async function getOrgMembers(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("org_members")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to fetch members: ${error.message}`);
  return data ?? [];
}

// --- Email template operations ---

export async function getEmailTemplates(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch templates: ${error.message}`);
  return data ?? [];
}

export async function createEmailTemplate(supabase: SupabaseClient, data: { org_id: string; name: string; subject: string; body: string; created_by: string }) {
  const { data: template, error } = await supabase
    .from("email_templates")
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(`Failed to create template: ${error.message}`);
  return template;
}

export async function deleteEmailTemplate(supabase: SupabaseClient, templateId: number) {
  const { error } = await supabase.from("email_templates").delete().eq("id", templateId);
  if (error) throw new Error(`Failed to delete template: ${error.message}`);
}

// --- Email log operations ---

export async function logEmail(supabase: SupabaseClient, data: {
  org_id: string; contact_id?: number; user_id: string; to_email: string;
  subject: string; body: string; status: string; resend_id?: string;
}) {
  const { error } = await supabase.from("email_logs").insert({
    org_id: data.org_id,
    contact_id: data.contact_id || null,
    user_id: data.user_id,
    to_email: data.to_email,
    subject: data.subject,
    body: data.body,
    status: data.status,
    resend_id: data.resend_id || null,
  });
  if (error) throw new Error(`Failed to log email: ${error.message}`);
}

export async function getEmailLogsForContact(supabase: SupabaseClient, contactId: number) {
  const { data, error } = await supabase
    .from("email_logs")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch email logs: ${error.message}`);
  return data ?? [];
}

// --- Calendar event operations ---

export async function getEvents(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("end_at", new Date().toISOString())
    .order("start_at", { ascending: true });
  if (error) throw new Error(`Failed to fetch events: ${error.message}`);
  return data ?? [];
}

export async function getEventsForContact(supabase: SupabaseClient, contactId: number) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("contact_id", contactId)
    .order("start_at", { ascending: true });
  if (error) throw new Error(`Failed to fetch events: ${error.message}`);
  return data ?? [];
}

export async function createEvent(supabase: SupabaseClient, data: {
  org_id: string; contact_id?: number; created_by: string; title: string;
  description?: string; start_at: string; end_at: string; location?: string;
}) {
  const { data: event, error } = await supabase
    .from("events")
    .insert({
      org_id: data.org_id,
      contact_id: data.contact_id || null,
      created_by: data.created_by,
      title: data.title,
      description: data.description || "",
      start_at: data.start_at,
      end_at: data.end_at,
      location: data.location || "",
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create event: ${error.message}`);
  return event;
}

export async function updateEvent(supabase: SupabaseClient, eventId: number, data: Record<string, unknown>) {
  const { data: event, error } = await supabase
    .from("events")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update event: ${error.message}`);
  return event;
}

export async function deleteEvent(supabase: SupabaseClient, eventId: number) {
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) throw new Error(`Failed to delete event: ${error.message}`);
}

// --- Lead operations ---

export type LeadFilters = {
  stage?: string;
  temperature?: string;
  source?: string;
  assigned_to?: string;
  search?: string;
};

export async function getLeads(supabase: SupabaseClient, filters: LeadFilters = {}) {
  let query = supabase.from("leads").select("*").order("created_at", { ascending: false });
  if (filters.stage) query = query.eq("stage", filters.stage);
  if (filters.temperature) query = query.eq("temperature", filters.temperature);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.assigned_to) query = query.eq("assigned_to", filters.assigned_to);
  if (filters.search) {
    const q = filters.search;
    query = query.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,address.ilike.%${q}%`
    );
  }
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch leads: ${error.message}`);
  return data ?? [];
}

export async function getLead(supabase: SupabaseClient, leadId: number) {
  const { data, error } = await supabase.from("leads").select("*").eq("id", leadId).single();
  if (error) throw new Error(`Failed to fetch lead: ${error.message}`);
  return data;
}

export async function createLead(
  supabase: SupabaseClient,
  data: {
    org_id: string;
    first_name: string;
    last_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    location_id?: number | null;
    source?: string;
    frequency?: string;
    temperature?: string;
    stage?: string;
    assigned_to?: string | null;
    notes?: string;
  }
) {
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      org_id: data.org_id,
      first_name: data.first_name,
      last_name: data.last_name ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      address: data.address ?? "",
      location_id: data.location_id ?? null,
      source: data.source ?? "website",
      frequency: data.frequency ?? "monthly",
      temperature: data.temperature ?? "warm",
      stage: data.stage ?? "new",
      assigned_to: data.assigned_to ?? null,
      notes: data.notes ?? "",
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create lead: ${error.message}`);
  return lead;
}

export async function updateLead(supabase: SupabaseClient, leadId: number, data: Record<string, unknown>) {
  const { data: lead, error } = await supabase
    .from("leads")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update lead: ${error.message}`);
  return lead;
}

export async function deleteLead(supabase: SupabaseClient, leadId: number) {
  const { error } = await supabase.from("leads").delete().eq("id", leadId);
  if (error) throw new Error(`Failed to delete lead: ${error.message}`);
}

// --- HR operations ---

export async function getEmployees(supabase: SupabaseClient, filters: { location_id?: number; role?: string; status?: string; search?: string } = {}) {
  let query = supabase.from("employees").select("*").order("created_at", { ascending: false });
  if (filters.location_id) query = query.eq("location_id", filters.location_id);
  if (filters.role) query = query.eq("role", filters.role);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.search) {
    const q = filters.search;
    query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch employees: ${error.message}`);
  return data ?? [];
}

export async function getEmployee(supabase: SupabaseClient, employeeId: number) {
  const { data, error } = await supabase.from("employees").select("*").eq("id", employeeId).single();
  if (error) throw new Error(`Failed to fetch employee: ${error.message}`);
  return data;
}

export async function createEmployee(supabase: SupabaseClient, data: {
  org_id: string; first_name: string; last_name?: string; role?: string; location_id?: number | null;
  hire_date?: string | null; status?: string; phone?: string; email?: string;
}) {
  const { data: emp, error } = await supabase.from("employees").insert({
    org_id: data.org_id, first_name: data.first_name,
    last_name: data.last_name ?? "", role: data.role ?? "attendant",
    location_id: data.location_id ?? null, hire_date: data.hire_date ?? null,
    status: data.status ?? "active", phone: data.phone ?? "", email: data.email ?? "",
  }).select().single();
  if (error) throw new Error(`Failed to create employee: ${error.message}`);
  return emp;
}

export async function updateEmployee(supabase: SupabaseClient, employeeId: number, data: Record<string, unknown>) {
  const { data: emp, error } = await supabase.from("employees")
    .update({ ...data, updated_at: new Date().toISOString() }).eq("id", employeeId).select().single();
  if (error) throw new Error(`Failed to update employee: ${error.message}`);
  return emp;
}

export async function getIncidents(supabase: SupabaseClient, filters: { status?: string; severity?: string; employee_id?: number } = {}) {
  let query = supabase.from("incident_reports").select("*").order("incident_date", { ascending: false });
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.severity) query = query.eq("severity", filters.severity);
  if (filters.employee_id) query = query.eq("employee_id", filters.employee_id);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch incidents: ${error.message}`);
  return data ?? [];
}

export async function createIncident(supabase: SupabaseClient, data: {
  org_id: string; employee_id?: number | null; location_id?: number | null;
  incident_date?: string; type: string; severity: string; description: string; status?: string; created_by?: string | null;
}) {
  const { data: incident, error } = await supabase.from("incident_reports").insert({
    org_id: data.org_id,
    employee_id: data.employee_id ?? null,
    location_id: data.location_id ?? null,
    incident_date: data.incident_date ?? new Date().toISOString(),
    type: data.type, severity: data.severity,
    description: data.description, status: data.status ?? "open",
    created_by: data.created_by ?? null,
  }).select().single();
  if (error) throw new Error(`Failed to create incident: ${error.message}`);
  return incident;
}

export async function updateIncident(supabase: SupabaseClient, incidentId: number, data: Record<string, unknown>) {
  const { data: incident, error } = await supabase.from("incident_reports")
    .update({ ...data, updated_at: new Date().toISOString() }).eq("id", incidentId).select().single();
  if (error) throw new Error(`Failed to update incident: ${error.message}`);
  return incident;
}

export async function getWriteUps(supabase: SupabaseClient, filters: { employee_id?: number } = {}) {
  let query = supabase.from("write_ups").select("*").order("write_up_date", { ascending: false });
  if (filters.employee_id) query = query.eq("employee_id", filters.employee_id);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch write-ups: ${error.message}`);
  return data ?? [];
}

export async function createWriteUp(supabase: SupabaseClient, data: {
  org_id: string; employee_id: number; write_up_date?: string;
  reason: string; description?: string; severity?: string; issued_by?: string | null;
}) {
  const { data: wu, error } = await supabase.from("write_ups").insert({
    org_id: data.org_id, employee_id: data.employee_id,
    write_up_date: data.write_up_date ?? new Date().toISOString().slice(0, 10),
    reason: data.reason, description: data.description ?? "",
    severity: data.severity ?? "verbal", issued_by: data.issued_by ?? null,
  }).select().single();
  if (error) throw new Error(`Failed to create write-up: ${error.message}`);
  return wu;
}

export async function getEmployeeFiles(supabase: SupabaseClient, employeeId: number) {
  const { data, error } = await supabase.from("employee_files").select("*")
    .eq("employee_id", employeeId).order("uploaded_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch employee files: ${error.message}`);
  return data ?? [];
}

export async function getIntakes(supabase: SupabaseClient, filters: { status?: string } = {}) {
  let query = supabase.from("employee_intakes").select("*").order("created_at", { ascending: false });
  if (filters.status) query = query.eq("status", filters.status);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch intakes: ${error.message}`);
  return data ?? [];
}

export async function updateIntakeStatus(supabase: SupabaseClient, intakeId: number, status: string, notes?: string) {
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (notes !== undefined) updates.notes = notes;
  const { data, error } = await supabase.from("employee_intakes").update(updates).eq("id", intakeId).select().single();
  if (error) throw new Error(`Failed to update intake: ${error.message}`);
  return data;
}

// --- Campaign operations ---

export type CampaignAudienceFilter = {
  stage?: string[];
  tags?: string[];
  cities?: string[];
  sources?: string[];
  churned?: boolean;
  active?: boolean;
};

export async function buildCampaignAudience(
  supabase: SupabaseClient,
  filter: CampaignAudienceFilter
): Promise<Array<{ id: number; email: string; phone: string }>> {
  let query = supabase.from("contacts").select("id, email, phone");
  if (filter.stage && filter.stage.length > 0) query = query.in("stage", filter.stage);
  if (filter.sources && filter.sources.length > 0) query = query.in("source", filter.sources);
  if (filter.cities && filter.cities.length > 0) query = query.in("city", filter.cities);
  if (filter.tags && filter.tags.length > 0) query = query.overlaps("tags", filter.tags);
  const { data, error } = await query.limit(2000);
  if (error) throw new Error(`Failed to build audience: ${error.message}`);
  return (data ?? []) as Array<{ id: number; email: string; phone: string }>;
}

export async function getCampaigns(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch campaigns: ${error.message}`);
  return data ?? [];
}

export async function getCampaign(supabase: SupabaseClient, campaignId: number) {
  const { data, error } = await supabase.from("campaigns").select("*").eq("id", campaignId).single();
  if (error) throw new Error(`Failed to fetch campaign: ${error.message}`);
  return data;
}

export async function getCampaignRecipients(supabase: SupabaseClient, campaignId: number) {
  const { data, error } = await supabase
    .from("campaign_recipients")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("id", { ascending: true });
  if (error) throw new Error(`Failed to fetch recipients: ${error.message}`);
  return data ?? [];
}

export async function getCampaignStats(supabase: SupabaseClient, campaignId: number) {
  const rows = await getCampaignRecipients(supabase, campaignId);
  const total = rows.length;
  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  const delivered = (counts.delivered ?? 0) + (counts.opened ?? 0) + (counts.clicked ?? 0);
  const opened = (counts.opened ?? 0) + (counts.clicked ?? 0);
  const clicked = counts.clicked ?? 0;
  return {
    total,
    sent: (counts.sent ?? 0) + delivered,
    delivered,
    opened,
    clicked,
    bounced: counts.bounced ?? 0,
    failed: counts.failed ?? 0,
    openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
    clickRate: delivered > 0 ? Math.round((clicked / delivered) * 100) : 0,
    bounceRate: total > 0 ? Math.round(((counts.bounced ?? 0) / total) * 100) : 0,
  };
}

export async function createCampaign(
  supabase: SupabaseClient,
  data: {
    org_id: string;
    name: string;
    type: "email" | "sms";
    audience_filter: CampaignAudienceFilter;
    audience_size: number;
    template_id?: number | null;
    subject?: string;
    body: string;
    status?: string;
    scheduled_at?: string | null;
    created_by?: string | null;
  }
) {
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      org_id: data.org_id,
      name: data.name,
      type: data.type,
      audience_filter: data.audience_filter,
      audience_size: data.audience_size,
      template_id: data.template_id ?? null,
      subject: data.subject ?? "",
      body: data.body,
      status: data.status ?? "draft",
      scheduled_at: data.scheduled_at ?? null,
      created_by: data.created_by ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create campaign: ${error.message}`);
  return campaign;
}

export async function insertCampaignRecipients(
  supabase: SupabaseClient,
  campaignId: number,
  audience: Array<{ id: number; email: string; phone: string }>,
  type: "email" | "sms"
) {
  if (audience.length === 0) return [];
  const rows = audience.map((a) => ({
    campaign_id: campaignId,
    contact_id: a.id,
    to_email: type === "email" ? a.email : "",
    to_phone: type === "sms" ? a.phone : "",
    status: "pending",
  }));
  const { data, error } = await supabase.from("campaign_recipients").insert(rows).select("id");
  if (error) throw new Error(`Failed to insert recipients: ${error.message}`);
  return data ?? [];
}

export async function updateCampaign(supabase: SupabaseClient, campaignId: number, data: Record<string, unknown>) {
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", campaignId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update campaign: ${error.message}`);
  return campaign;
}

// --- Voice agent / Call / Chat operations ---

export async function getVoiceAgents(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("voice_agents")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to fetch voice agents: ${error.message}`);
  return data ?? [];
}

export async function createVoiceAgent(
  supabase: SupabaseClient,
  data: { org_id: string; name: string; voice: string; greeting?: string; system_prompt?: string; tools_enabled?: string[]; is_active?: boolean }
) {
  const { data: agent, error } = await supabase
    .from("voice_agents")
    .insert({
      org_id: data.org_id,
      name: data.name,
      voice: data.voice,
      greeting: data.greeting ?? "",
      system_prompt: data.system_prompt ?? "",
      tools_enabled: data.tools_enabled ?? [],
      is_active: data.is_active ?? true,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create voice agent: ${error.message}`);
  return agent;
}

export async function updateVoiceAgent(supabase: SupabaseClient, agentId: number, data: Record<string, unknown>) {
  const { data: agent, error } = await supabase
    .from("voice_agents")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", agentId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update voice agent: ${error.message}`);
  return agent;
}

export type CallFilters = {
  call_type?: string;
  disposition?: string;
  direction?: string;
  contact_id?: number;
  limit?: number;
};

export async function getCalls(supabase: SupabaseClient, filters: CallFilters = {}) {
  let query = supabase
    .from("calls")
    .select("*")
    .order("started_at", { ascending: false });
  if (filters.call_type) query = query.eq("call_type", filters.call_type);
  if (filters.disposition) query = query.eq("disposition", filters.disposition);
  if (filters.direction) query = query.eq("direction", filters.direction);
  if (filters.contact_id) query = query.eq("contact_id", filters.contact_id);
  if (filters.limit) query = query.limit(filters.limit);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch calls: ${error.message}`);
  return data ?? [];
}

export async function getCall(supabase: SupabaseClient, callId: number) {
  const { data, error } = await supabase.from("calls").select("*").eq("id", callId).single();
  if (error) throw new Error(`Failed to fetch call: ${error.message}`);
  return data;
}

export async function getCallTranscript(supabase: SupabaseClient, callId: number) {
  const { data, error } = await supabase
    .from("call_transcripts")
    .select("*")
    .eq("call_id", callId)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch transcript: ${error.message}`);
  return data;
}

export async function getCallStats(supabase: SupabaseClient, orgId: string) {
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const prevMonth = new Date(now.getTime() - 60 * 24 * 3600 * 1000);

  const { data: calls, error } = await supabase
    .from("calls")
    .select("started_at, duration_seconds, call_type, disposition")
    .eq("org_id", orgId);
  if (error) throw new Error(`Failed to fetch call stats: ${error.message}`);

  const rows = calls ?? [];
  const today = rows.filter((r) => new Date(r.started_at) >= startOfDay).length;
  const week = rows.filter((r) => new Date(r.started_at) >= weekAgo).length;
  const month = rows.filter((r) => new Date(r.started_at) >= monthAgo).length;
  const prev = rows.filter((r) => {
    const d = new Date(r.started_at);
    return d >= prevMonth && d < monthAgo;
  }).length;

  const aiHandled = rows.filter(
    (r) =>
      r.disposition === "info_provided" ||
      r.disposition === "lead_created" ||
      r.disposition === "scheduled_callback"
  );
  const handleRate = rows.length > 0 ? Math.round((aiHandled.length / rows.length) * 100) : 0;
  const durations = rows.filter((r) => r.duration_seconds > 0).map((r) => r.duration_seconds);
  const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  const byType = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.call_type] = (acc[r.call_type] || 0) + 1;
    return acc;
  }, {});

  const leadsFromCalls = rows.filter((r) => r.disposition === "lead_created").length;

  return {
    today,
    week,
    month,
    monthGrowth: prev > 0 ? Math.round(((month - prev) / prev) * 100) : 0,
    aiHandleRate: handleRate,
    avgDurationSeconds: avgDuration,
    byType,
    leadsFromCalls,
    total: rows.length,
  };
}

export async function getChatSessions(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .order("started_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch chat sessions: ${error.message}`);
  return data ?? [];
}

export async function convertLeadToContact(
  supabase: SupabaseClient,
  leadId: number,
  orgId: string
) {
  const lead = await getLead(supabase, leadId);
  if (lead.converted_contact_id) {
    throw new Error("Lead has already been converted");
  }

  // Parse address into components if present (very light heuristic).
  const contact = await createContact(supabase, {
    org_id: orgId,
    first_name: lead.first_name,
    last_name: lead.last_name,
    email: lead.email || `${lead.first_name.toLowerCase()}.${(lead.last_name || "contact").toLowerCase()}@unknown.local`,
    phone: lead.phone,
    address: lead.address,
    source: lead.source === "referral" ? "referral" : lead.source === "website" ? "website" : "manual",
    stage: "qualified",
    assigned_to: lead.assigned_to ?? undefined,
  });

  const updated = await updateLead(supabase, leadId, {
    converted_contact_id: contact.id,
    stage: "won",
  });

  return { lead: updated, contact };
}

