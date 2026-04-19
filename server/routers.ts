import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure, orgProcedure } from "./_core/trpc";
import {
  insertBetaSignup, getBetaSignups, addContactNote, getNotesForContact, deleteContactNote,
  createOrganization, addOrgMember, getContacts, getContact, createContact, updateContact,
  updateContactStage, deleteContact, createContactFromSignup,
  getDealsForContact, createDeal, updateDeal, deleteDeal,
  getTasks, getTasksForContact, createTask, completeTask, updateTask, deleteTask,
  logActivity, getActivitiesForContact,
  getLeads, getLead, createLead, updateLead, deleteLead, convertLeadToContact,
  getVoiceAgents, createVoiceAgent, updateVoiceAgent,
  getCalls, getCall, getCallTranscript, getCallStats, getChatSessions,
  buildCampaignAudience, getCampaigns, getCampaign, getCampaignRecipients, getCampaignStats,
  createCampaign, insertCampaignRecipients, updateCampaign,
  getEmployees, getEmployee, createEmployee, updateEmployee,
  getIncidents, createIncident, updateIncident,
  getWriteUps, createWriteUp, getEmployeeFiles, getIntakes, updateIntakeStatus,
  updateOrgProfile, updateMemberProfile, getOrgMembers,
  getEmailTemplates, createEmailTemplate, deleteEmailTemplate,
  logEmail, getEmailLogsForContact,
  getEvents, getEventsForContact, createEvent, updateEvent, deleteEvent,
} from "./db";
import { sendBetaSignupNotification, sendBetaSignupConfirmation, sendWelcomeEmail } from "./email";
import { simulateEmailSend, simulateSmsBlast, simulateSingleSms } from "./lib/simulate";
import { supabaseAdmin } from "./supabase";
import { chatWithOpenClaw } from "./openclaw";
import { generateReferralQRCode, generateReferralQRCodeSVG } from "./qrcode";
import { ENV } from "./_core/env";

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    updateName: protectedProcedure
      .input(z.object({ fullName: z.string().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(ctx.user.id, {
          user_metadata: { full_name: input.fullName },
        });
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        return { success: true };
      }),
  }),

  beta: router({
    submit: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          email: z.string().email(),
          phone: z.string().min(7),
          industry: z.string().min(1),
          referralCode: z.string().optional(),
          message: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const ip = ctx.req.ip || ctx.req.socket.remoteAddress || "unknown";
        if (!checkRateLimit(ip)) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many submissions. Please try again later.",
          });
        }

        // Use the user's org if signed in, otherwise use admin client for the default org
        const orgId = ctx.user?.orgId;

        if (orgId && ctx.supabase) {
          await insertBetaSignup(ctx.supabase, orgId, {
            name: input.name,
            email: input.email,
            phone: input.phone,
            industry: input.industry,
            referral_code: input.referralCode ?? null,
            message: input.message ?? null,
          });
          // Auto-create contact from signup
          await createContactFromSignup(ctx.supabase, orgId, {
            name: input.name,
            email: input.email,
            phone: input.phone,
            industry: input.industry,
            referralCode: input.referralCode,
          }).catch((err) => console.error("[Contact] Auto-create failed:", err));
        } else {
          // Anonymous submission — insert via admin client without org scoping
          await supabaseAdmin.from("beta_signups").insert({
            org_id: null,
            name: input.name,
            email: input.email,
            phone: input.phone,
            industry: input.industry,
            referral_code: input.referralCode ?? null,
            message: input.message ?? null,
          });
        }

        // Send notification emails in parallel
        await Promise.allSettled([
          sendBetaSignupNotification({
            name: input.name,
            email: input.email,
            phone: input.phone,
            industry: input.industry,
            referralCode: input.referralCode ?? null,
            message: input.message ?? null,
          }),
          sendBetaSignupConfirmation(input.email, input.name),
        ]);

        return { success: true };
      }),

    listSignups: orgProcedure.query(async ({ ctx }) => {
      return getBetaSignups(ctx.supabase!);
    }),
  }),

  contacts: router({
    list: orgProcedure.query(async ({ ctx }) => {
      return getContacts(ctx.supabase!);
    }),

    get: orgProcedure
      .input(z.object({ contactId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        return getContact(ctx.supabase!, input.contactId);
      }),

    create: orgProcedure
      .input(z.object({
        firstName: z.string().min(1),
        lastName: z.string().optional(),
        email: z.string().email(),
        phone: z.string().optional(),
        company: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        tags: z.array(z.string()).optional(),
        source: z.enum(["manual", "referral", "import", "website"]).optional(),
        stage: z.enum(["lead", "contacted", "qualified", "proposal", "won", "lost"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createContact(ctx.supabase!, {
          org_id: ctx.user.orgId!,
          first_name: input.firstName,
          last_name: input.lastName,
          email: input.email,
          phone: input.phone,
          company: input.company,
          address: input.address,
          city: input.city,
          state: input.state,
          zip: input.zip,
          tags: input.tags,
          source: input.source,
          stage: input.stage,
        });
      }),

    update: orgProcedure
      .input(z.object({
        contactId: z.number().int().positive(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        tags: z.array(z.string()).optional(),
        stage: z.enum(["lead", "contacted", "qualified", "proposal", "won", "lost"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { contactId, firstName, lastName, ...rest } = input;
        const updates: Record<string, unknown> = { ...rest };
        if (firstName !== undefined) updates.first_name = firstName;
        if (lastName !== undefined) updates.last_name = lastName;
        return updateContact(ctx.supabase!, contactId, updates);
      }),

    updateStage: orgProcedure
      .input(z.object({
        contactId: z.number().int().positive(),
        stage: z.enum(["lead", "contacted", "qualified", "proposal", "won", "lost"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await updateContactStage(ctx.supabase!, input.contactId, input.stage);
        // Log activity (non-blocking)
        Promise.allSettled([
          logActivity(ctx.supabase!, {
            org_id: ctx.user.orgId!, contact_id: input.contactId, user_id: ctx.user.id,
            type: "stage_change", content: `Stage changed to ${input.stage}`,
            metadata: { newStage: input.stage },
          }),
        ]);
        return result;
      }),

    delete: orgProcedure
      .input(z.object({ contactId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await deleteContact(ctx.supabase!, input.contactId);
        return { success: true };
      }),
  }),

  notes: router({
    list: orgProcedure
      .input(z.object({ contactId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        return getNotesForContact(ctx.supabase!, input.contactId);
      }),

    add: orgProcedure
      .input(
        z.object({
          contactId: z.number().int().positive(),
          note: z.string().min(1).max(2000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await addContactNote(ctx.supabase!, {
          orgId: ctx.user.orgId!,
          contactId: input.contactId,
          userId: ctx.user.id,
          note: input.note,
        });
        // Log activity (non-blocking)
        Promise.allSettled([
          logActivity(ctx.supabase!, {
            org_id: ctx.user.orgId!, contact_id: input.contactId, user_id: ctx.user.id,
            type: "note", content: input.note,
          }),
        ]);
        return { success: true };
      }),

    delete: orgProcedure
      .input(z.object({ noteId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await deleteContactNote(ctx.supabase!, input.noteId);
        return { success: true };
      }),
  }),

  deals: router({
    list: orgProcedure
      .input(z.object({ contactId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        return getDealsForContact(ctx.supabase!, input.contactId);
      }),

    create: orgProcedure
      .input(z.object({
        contactId: z.number().int().positive(),
        title: z.string().min(1).max(200),
        value: z.number().min(0).optional(),
        stage: z.enum(["lead", "contacted", "qualified", "proposal", "won", "lost"]).optional(),
        probability: z.number().min(0).max(100).optional(),
        expectedCloseDate: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createDeal(ctx.supabase!, {
          org_id: ctx.user.orgId!,
          contact_id: input.contactId,
          title: input.title,
          value: input.value,
          stage: input.stage,
          probability: input.probability,
          expected_close_date: input.expectedCloseDate,
          notes: input.notes,
        });
      }),

    update: orgProcedure
      .input(z.object({
        dealId: z.number().int().positive(),
        title: z.string().min(1).optional(),
        value: z.number().min(0).optional(),
        stage: z.enum(["lead", "contacted", "qualified", "proposal", "won", "lost"]).optional(),
        probability: z.number().min(0).max(100).optional(),
        expectedCloseDate: z.string().nullable().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { dealId, expectedCloseDate, ...rest } = input;
        const updates: Record<string, unknown> = { ...rest };
        if (expectedCloseDate !== undefined) updates.expected_close_date = expectedCloseDate;
        return updateDeal(ctx.supabase!, dealId, updates);
      }),

    delete: orgProcedure
      .input(z.object({ dealId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await deleteDeal(ctx.supabase!, input.dealId);
        return { success: true };
      }),
  }),

  tasks: router({
    list: orgProcedure.query(async ({ ctx }) => {
      return getTasks(ctx.supabase!);
    }),

    listForContact: orgProcedure
      .input(z.object({ contactId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        return getTasksForContact(ctx.supabase!, input.contactId);
      }),

    create: orgProcedure
      .input(z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        contactId: z.number().int().positive().optional(),
        dueDate: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createTask(ctx.supabase!, {
          org_id: ctx.user.orgId!,
          contact_id: input.contactId,
          assigned_to: ctx.user.id,
          title: input.title,
          description: input.description,
          due_date: input.dueDate,
          priority: input.priority,
        });
      }),

    complete: orgProcedure
      .input(z.object({ taskId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        return completeTask(ctx.supabase!, input.taskId);
      }),

    update: orgProcedure
      .input(z.object({
        taskId: z.number().int().positive(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        dueDate: z.string().nullable().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        status: z.enum(["pending", "completed", "cancelled"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { taskId, dueDate, ...rest } = input;
        const updates: Record<string, unknown> = { ...rest };
        if (dueDate !== undefined) updates.due_date = dueDate;
        if (rest.status === "completed") updates.completed_at = new Date().toISOString();
        return updateTask(ctx.supabase!, taskId, updates);
      }),

    delete: orgProcedure
      .input(z.object({ taskId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await deleteTask(ctx.supabase!, input.taskId);
        return { success: true };
      }),
  }),

  activities: router({
    listForContact: orgProcedure
      .input(z.object({ contactId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        return getActivitiesForContact(ctx.supabase!, input.contactId);
      }),
  }),

  leads: router({
    list: orgProcedure
      .input(z.object({
        stage: z.enum(["new", "contacted", "qualified", "negotiating", "won", "lost"]).optional(),
        temperature: z.enum(["hot", "warm", "cold"]).optional(),
        source: z.enum(["phone", "walk_in", "website", "referral", "third_party"]).optional(),
        assignedTo: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return getLeads(ctx.supabase!, {
          stage: input?.stage,
          temperature: input?.temperature,
          source: input?.source,
          assigned_to: input?.assignedTo,
          search: input?.search,
        });
      }),

    get: orgProcedure
      .input(z.object({ leadId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        return getLead(ctx.supabase!, input.leadId);
      }),

    create: orgProcedure
      .input(z.object({
        firstName: z.string().min(1),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        locationId: z.number().int().positive().nullable().optional(),
        source: z.enum(["phone", "walk_in", "website", "referral", "third_party"]).optional(),
        frequency: z.enum(["hourly", "daily", "monthly"]).optional(),
        temperature: z.enum(["hot", "warm", "cold"]).optional(),
        stage: z.enum(["new", "contacted", "qualified", "negotiating", "won", "lost"]).optional(),
        assignedTo: z.string().nullable().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createLead(ctx.supabase!, {
          org_id: ctx.user.orgId!,
          first_name: input.firstName,
          last_name: input.lastName,
          phone: input.phone,
          email: input.email,
          address: input.address,
          location_id: input.locationId ?? null,
          source: input.source,
          frequency: input.frequency,
          temperature: input.temperature,
          stage: input.stage,
          assigned_to: input.assignedTo ?? null,
          notes: input.notes,
        });
      }),

    update: orgProcedure
      .input(z.object({
        leadId: z.number().int().positive(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        locationId: z.number().int().positive().nullable().optional(),
        source: z.enum(["phone", "walk_in", "website", "referral", "third_party"]).optional(),
        frequency: z.enum(["hourly", "daily", "monthly"]).optional(),
        temperature: z.enum(["hot", "warm", "cold"]).optional(),
        stage: z.enum(["new", "contacted", "qualified", "negotiating", "won", "lost"]).optional(),
        assignedTo: z.string().nullable().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { leadId, firstName, lastName, locationId, assignedTo, ...rest } = input;
        const updates: Record<string, unknown> = { ...rest };
        if (firstName !== undefined) updates.first_name = firstName;
        if (lastName !== undefined) updates.last_name = lastName;
        if (locationId !== undefined) updates.location_id = locationId;
        if (assignedTo !== undefined) updates.assigned_to = assignedTo;
        return updateLead(ctx.supabase!, leadId, updates);
      }),

    updateStage: orgProcedure
      .input(z.object({
        leadId: z.number().int().positive(),
        stage: z.enum(["new", "contacted", "qualified", "negotiating", "won", "lost"]),
      }))
      .mutation(async ({ ctx, input }) => {
        return updateLead(ctx.supabase!, input.leadId, { stage: input.stage });
      }),

    updateTemperature: orgProcedure
      .input(z.object({
        leadId: z.number().int().positive(),
        temperature: z.enum(["hot", "warm", "cold"]),
      }))
      .mutation(async ({ ctx, input }) => {
        return updateLead(ctx.supabase!, input.leadId, { temperature: input.temperature });
      }),

    convertToContact: orgProcedure
      .input(z.object({ leadId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const result = await convertLeadToContact(ctx.supabase!, input.leadId, ctx.user.orgId!);
        // Log conversion on the new contact's activity timeline
        Promise.allSettled([
          logActivity(ctx.supabase!, {
            org_id: ctx.user.orgId!,
            contact_id: result.contact.id,
            user_id: ctx.user.id,
            type: "stage_change",
            content: `Converted from lead #${input.leadId}`,
            metadata: { leadId: input.leadId, source: result.lead.source },
          }),
        ]);
        return result;
      }),

    delete: orgProcedure
      .input(z.object({ leadId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await deleteLead(ctx.supabase!, input.leadId);
        return { success: true };
      }),
  }),

  notifications: router({
    list: orgProcedure
      .input(z.object({ unreadOnly: z.boolean().optional(), limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        let query = ctx.supabase!.from("notifications").select("*")
          .eq("org_id", ctx.user.orgId!)
          .order("created_at", { ascending: false })
          .limit(input?.limit ?? 20);
        if (input?.unreadOnly) query = query.eq("read", false);
        const { data, error } = await query;
        if (error) return [];
        return data ?? [];
      }),
    unreadCount: orgProcedure.query(async ({ ctx }) => {
      const { count } = await ctx.supabase!.from("notifications").select("id", { count: "exact", head: true })
        .eq("org_id", ctx.user.orgId!).eq("read", false);
      return count ?? 0;
    }),
    markRead: orgProcedure
      .input(z.object({ notificationId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await ctx.supabase!.from("notifications").update({ read: true }).eq("id", input.notificationId);
        return { success: true };
      }),
    markAllRead: orgProcedure.mutation(async ({ ctx }) => {
      await ctx.supabase!.from("notifications").update({ read: true }).eq("org_id", ctx.user.orgId!).eq("read", false);
      return { success: true };
    }),
  }),

  search: router({
    global: orgProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const q = input.query;
        const orgId = ctx.user.orgId!;
        const [contactsRes, leadsRes, employeesRes, callsRes, incidentsRes] = await Promise.all([
          ctx.supabase!.from("contacts")
            .select("id, first_name, last_name, email, phone, stage")
            .eq("org_id", orgId)
            .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
            .limit(5),
          ctx.supabase!.from("leads")
            .select("id, first_name, last_name, phone, stage")
            .eq("org_id", orgId)
            .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`)
            .limit(5),
          ctx.supabase!.from("employees")
            .select("id, first_name, last_name, role")
            .eq("org_id", orgId)
            .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
            .limit(5),
          ctx.supabase!.from("calls")
            .select("id, caller_name, caller_phone, call_type")
            .eq("org_id", orgId)
            .ilike("caller_name", `%${q}%`)
            .limit(5),
          ctx.supabase!.from("incident_reports")
            .select("id, description, severity, status")
            .eq("org_id", orgId)
            .ilike("description", `%${q}%`)
            .limit(5),
        ]);
        return {
          contacts: contactsRes.data ?? [],
          leads: leadsRes.data ?? [],
          employees: employeesRes.data ?? [],
          calls: callsRes.data ?? [],
          incidents: incidentsRes.data ?? [],
        };
      }),
  }),

  timeline: router({
    forContact: orgProcedure
      .input(z.object({ contactId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const cid = input.contactId;
        const [emails, notes, tasks, events, calls, sms, deals] = await Promise.all([
          ctx.supabase!.from("email_logs").select("id, subject, body, created_at").eq("contact_id", cid).order("created_at", { ascending: false }).limit(20),
          ctx.supabase!.from("contact_notes").select("id, note, created_at").eq("contact_id", cid).order("created_at", { ascending: false }).limit(20),
          ctx.supabase!.from("tasks").select("id, title, description, status, created_at").eq("contact_id", cid).order("created_at", { ascending: false }).limit(20),
          ctx.supabase!.from("events").select("id, title, start_at, created_at").eq("contact_id", cid).order("created_at", { ascending: false }).limit(20),
          ctx.supabase!.from("calls").select("id, caller_name, call_type, disposition, started_at").eq("contact_id", cid).order("started_at", { ascending: false }).limit(20),
          ctx.supabase!.from("sms_messages").select("id, direction, body, created_at").eq("contact_id", cid).order("created_at", { ascending: false }).limit(20),
          ctx.supabase!.from("deals").select("id, title, value, stage, created_at").eq("contact_id", cid).order("created_at", { ascending: false }).limit(20),
        ]);

        type Entry = { id: string; kind: string; timestamp: string; title: string; preview: string; meta?: any };
        const entries: Entry[] = [];
        for (const e of emails.data ?? []) entries.push({ id: `email-${e.id}`, kind: "email", timestamp: e.created_at, title: e.subject, preview: (e.body ?? "").slice(0, 120) });
        for (const n of notes.data ?? []) entries.push({ id: `note-${n.id}`, kind: "note", timestamp: n.created_at, title: "Note", preview: n.note.slice(0, 120) });
        for (const t of tasks.data ?? []) entries.push({ id: `task-${t.id}`, kind: "task", timestamp: t.created_at, title: t.title, preview: t.description ?? "", meta: { status: t.status } });
        for (const ev of events.data ?? []) entries.push({ id: `event-${ev.id}`, kind: "event", timestamp: ev.created_at, title: ev.title, preview: `Starts ${new Date(ev.start_at).toLocaleString()}` });
        for (const c of calls.data ?? []) entries.push({ id: `call-${c.id}`, kind: "call", timestamp: c.started_at, title: `Call: ${c.caller_name}`, preview: `${c.call_type} · ${c.disposition}` });
        for (const s of sms.data ?? []) entries.push({ id: `sms-${s.id}`, kind: "sms", timestamp: s.created_at, title: s.direction === "inbound" ? "SMS received" : "SMS sent", preview: s.body });
        for (const d of deals.data ?? []) entries.push({ id: `deal-${d.id}`, kind: "deal", timestamp: d.created_at, title: d.title, preview: `$${d.value} · ${d.stage}` });

        entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        return entries.slice(0, 50);
      }),
  }),

  sms: router({
    thread: orgProcedure
      .input(z.object({ contactId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const { data, error } = await ctx.supabase!.from("sms_messages").select("*")
          .eq("contact_id", input.contactId).order("created_at", { ascending: true });
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        return data ?? [];
      }),
    send: orgProcedure
      .input(z.object({
        contactId: z.number().int().positive(),
        body: z.string().min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const { data: contact } = await ctx.supabase!.from("contacts").select("phone").eq("id", input.contactId).single();
        if (!contact?.phone) throw new TRPCError({ code: "BAD_REQUEST", message: "Contact has no phone number" });
        const { data, error } = await ctx.supabase!.from("sms_messages").insert({
          org_id: ctx.user.orgId!, contact_id: input.contactId,
          direction: "outbound", body: input.body, status: "queued",
          from_number: "+18005551234", to_number: contact.phone,
        }).select().single();
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        void simulateSingleSms(data.id, input.contactId, ctx.user.orgId!, contact.phone);
        return data;
      }),
  }),

  locations: router({
    list: orgProcedure.query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase!
        .from("locations").select("*").order("name", { ascending: true });
      if (error) return [];
      return data ?? [];
    }),
    get: orgProcedure
      .input(z.object({ locationId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const { data, error } = await ctx.supabase!.from("locations").select("*").eq("id", input.locationId).single();
        if (error) throw new TRPCError({ code: "NOT_FOUND", message: error.message });
        return data;
      }),
    create: orgProcedure
      .input(z.object({
        name: z.string().min(1), address: z.string().optional(),
        city: z.string().optional(), state: z.string().optional(), zip: z.string().optional(),
        capacity: z.number().optional(), monthlyRate: z.number().optional(),
        hourlyRate: z.number().optional(), dailyRate: z.number().optional(),
        amenities: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { data, error } = await ctx.supabase!.from("locations").insert({
          org_id: ctx.user.orgId!, name: input.name,
          address: input.address ?? "", city: input.city ?? "",
          state: input.state ?? "", zip: input.zip ?? "",
          capacity: input.capacity ?? 0, monthly_rate: input.monthlyRate ?? 0,
          hourly_rate: input.hourlyRate ?? 0, daily_rate: input.dailyRate ?? 0,
          amenities: input.amenities ?? [], is_active: true,
        }).select().single();
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        return data;
      }),
    update: orgProcedure
      .input(z.object({
        locationId: z.number().int().positive(),
        name: z.string().optional(),
        capacity: z.number().optional(),
        monthlyRate: z.number().optional(),
        hourlyRate: z.number().optional(),
        dailyRate: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { locationId, monthlyRate, hourlyRate, dailyRate, isActive, ...rest } = input;
        const updates: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };
        if (monthlyRate !== undefined) updates.monthly_rate = monthlyRate;
        if (hourlyRate !== undefined) updates.hourly_rate = hourlyRate;
        if (dailyRate !== undefined) updates.daily_rate = dailyRate;
        if (isActive !== undefined) updates.is_active = isActive;
        const { data, error } = await ctx.supabase!.from("locations").update(updates).eq("id", locationId).select().single();
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        return data;
      }),
    occupancy: orgProcedure
      .input(z.object({ locationId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const [locRes, empRes] = await Promise.all([
          ctx.supabase!.from("locations").select("capacity").eq("id", input.locationId).single(),
          ctx.supabase!.from("contacts").select("id", { count: "exact", head: true })
            .eq("stage", "won"),
        ]);
        const capacity = locRes.data?.capacity ?? 0;
        const used = empRes.count ?? 0; // crude: treat won contacts as occupied spots
        return { capacity, used: Math.min(used, capacity), percent: capacity ? Math.round(Math.min(used, capacity) / capacity * 100) : 0 };
      }),
  }),

  reports: router({
    revenue: orgProcedure.query(async ({ ctx }) => {
      const { data: deals } = await ctx.supabase!.from("deals")
        .select("value, stage, created_at").eq("org_id", ctx.user.orgId!);
      const won = (deals ?? []).filter((d) => d.stage === "won");
      const pipeline = (deals ?? []).filter((d) => !["won", "lost"].includes(d.stage));
      const byMonth: Record<string, number> = {};
      for (const d of won) {
        const m = new Date(d.created_at).toISOString().slice(0, 7);
        byMonth[m] = (byMonth[m] || 0) + Number(d.value ?? 0);
      }
      const months = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
      return {
        totalWon: won.reduce((s, d) => s + Number(d.value ?? 0), 0),
        totalPipeline: pipeline.reduce((s, d) => s + Number(d.value ?? 0), 0),
        wonCount: won.length,
        pipelineCount: pipeline.length,
        byMonth: months.map(([month, value]) => ({ month, value })),
      };
    }),
    leadConversion: orgProcedure.query(async ({ ctx }) => {
      const { data: leads } = await ctx.supabase!.from("leads").select("stage, source, temperature, created_at");
      const rows = leads ?? [];
      const total = rows.length;
      const converted = rows.filter((l) => l.stage === "won").length;
      const lost = rows.filter((l) => l.stage === "lost").length;
      const bySource: Record<string, number> = {};
      const byTemp: Record<string, number> = {};
      for (const l of rows) {
        bySource[l.source] = (bySource[l.source] || 0) + 1;
        byTemp[l.temperature] = (byTemp[l.temperature] || 0) + 1;
      }
      return {
        total, converted, lost,
        conversionRate: total ? Math.round((converted / total) * 100) : 0,
        bySource: Object.entries(bySource).map(([k, v]) => ({ name: k, value: v })),
        byTemperature: Object.entries(byTemp).map(([k, v]) => ({ name: k, value: v })),
      };
    }),
    campaignPerformance: orgProcedure.query(async ({ ctx }) => {
      const { data: campaigns } = await ctx.supabase!.from("campaigns").select("id, name, type, status, audience_size")
        .eq("org_id", ctx.user.orgId!).eq("status", "sent");
      const results = [];
      for (const c of campaigns ?? []) {
        const { data: recips } = await ctx.supabase!.from("campaign_recipients").select("status").eq("campaign_id", c.id);
        const total = recips?.length ?? 0;
        const counts: Record<string, number> = {};
        for (const r of recips ?? []) counts[r.status] = (counts[r.status] || 0) + 1;
        const delivered = (counts.delivered ?? 0) + (counts.opened ?? 0) + (counts.clicked ?? 0);
        const opened = (counts.opened ?? 0) + (counts.clicked ?? 0);
        const clicked = counts.clicked ?? 0;
        results.push({
          id: c.id, name: c.name, type: c.type, total,
          openRate: delivered ? Math.round(opened / delivered * 100) : 0,
          clickRate: delivered ? Math.round(clicked / delivered * 100) : 0,
        });
      }
      return results;
    }),
    callAnalytics: orgProcedure.query(async ({ ctx }) => {
      const { data: calls } = await ctx.supabase!.from("calls").select("call_type, disposition, duration_seconds, started_at")
        .eq("org_id", ctx.user.orgId!);
      const rows = calls ?? [];
      const byType: Record<string, number> = {};
      const byDispo: Record<string, number> = {};
      for (const c of rows) {
        byType[c.call_type] = (byType[c.call_type] || 0) + 1;
        byDispo[c.disposition] = (byDispo[c.disposition] || 0) + 1;
      }
      const byWeek: Record<string, number> = {};
      for (const c of rows) {
        const d = new Date(c.started_at);
        const week = `${d.getFullYear()}-W${String(Math.ceil(d.getDate() / 7)).padStart(2, "0")}`;
        byWeek[week] = (byWeek[week] || 0) + 1;
      }
      return {
        total: rows.length,
        byType: Object.entries(byType).map(([name, value]) => ({ name, value })),
        byDispo: Object.entries(byDispo).map(([name, value]) => ({ name, value })),
        weekly: Object.entries(byWeek).sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([week, value]) => ({ week, value })),
      };
    }),
    employeePerformance: orgProcedure.query(async ({ ctx }) => {
      const [empRes, wuRes, incRes] = await Promise.all([
        ctx.supabase!.from("employees").select("id, first_name, last_name, role, status"),
        ctx.supabase!.from("write_ups").select("employee_id"),
        ctx.supabase!.from("incident_reports").select("employee_id"),
      ]);
      const wuCounts: Record<number, number> = {};
      for (const w of wuRes.data ?? []) wuCounts[w.employee_id] = (wuCounts[w.employee_id] || 0) + 1;
      const incCounts: Record<number, number> = {};
      for (const i of incRes.data ?? []) if (i.employee_id) incCounts[i.employee_id] = (incCounts[i.employee_id] || 0) + 1;
      return (empRes.data ?? []).map((e) => ({
        ...e, write_ups: wuCounts[e.id] ?? 0, incidents: incCounts[e.id] ?? 0,
      }));
    }),
  }),

  hr: router({
    listEmployees: orgProcedure
      .input(z.object({
        locationId: z.number().optional(),
        role: z.enum(["manager", "supervisor", "attendant", "valet", "admin"]).optional(),
        status: z.enum(["active", "on_leave", "terminated"]).optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return getEmployees(ctx.supabase!, {
          location_id: input?.locationId, role: input?.role,
          status: input?.status, search: input?.search,
        });
      }),
    getEmployee: orgProcedure
      .input(z.object({ employeeId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => getEmployee(ctx.supabase!, input.employeeId)),
    createEmployee: orgProcedure
      .input(z.object({
        firstName: z.string().min(1), lastName: z.string().optional(),
        role: z.enum(["manager", "supervisor", "attendant", "valet", "admin"]).optional(),
        locationId: z.number().nullable().optional(),
        hireDate: z.string().nullable().optional(),
        status: z.enum(["active", "on_leave", "terminated"]).optional(),
        phone: z.string().optional(), email: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createEmployee(ctx.supabase!, {
          org_id: ctx.user.orgId!, first_name: input.firstName, last_name: input.lastName,
          role: input.role, location_id: input.locationId ?? null,
          hire_date: input.hireDate ?? null, status: input.status,
          phone: input.phone, email: input.email,
        });
      }),
    updateEmployee: orgProcedure
      .input(z.object({
        employeeId: z.number().int().positive(),
        firstName: z.string().optional(), lastName: z.string().optional(),
        role: z.enum(["manager", "supervisor", "attendant", "valet", "admin"]).optional(),
        locationId: z.number().nullable().optional(),
        status: z.enum(["active", "on_leave", "terminated"]).optional(),
        phone: z.string().optional(), email: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { employeeId, firstName, lastName, locationId, ...rest } = input;
        const updates: Record<string, unknown> = { ...rest };
        if (firstName !== undefined) updates.first_name = firstName;
        if (lastName !== undefined) updates.last_name = lastName;
        if (locationId !== undefined) updates.location_id = locationId;
        return updateEmployee(ctx.supabase!, employeeId, updates);
      }),

    listIncidents: orgProcedure
      .input(z.object({
        status: z.enum(["open", "investigating", "resolved"]).optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        employeeId: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return getIncidents(ctx.supabase!, {
          status: input?.status, severity: input?.severity, employee_id: input?.employeeId,
        });
      }),
    createIncident: orgProcedure
      .input(z.object({
        employeeId: z.number().nullable().optional(),
        locationId: z.number().nullable().optional(),
        incidentDate: z.string().optional(),
        type: z.enum(["damage", "theft", "injury", "customer_complaint", "safety", "other"]),
        severity: z.enum(["low", "medium", "high", "critical"]),
        description: z.string().min(1),
        status: z.enum(["open", "investigating", "resolved"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createIncident(ctx.supabase!, {
          org_id: ctx.user.orgId!, employee_id: input.employeeId ?? null,
          location_id: input.locationId ?? null,
          incident_date: input.incidentDate,
          type: input.type, severity: input.severity,
          description: input.description, status: input.status,
          created_by: ctx.user.id,
        });
      }),
    updateIncident: orgProcedure
      .input(z.object({
        incidentId: z.number().int().positive(),
        status: z.enum(["open", "investigating", "resolved"]).optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { incidentId, ...rest } = input;
        const updates: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rest)) if (v !== undefined) updates[k] = v;
        return updateIncident(ctx.supabase!, incidentId, updates);
      }),

    listWriteUps: orgProcedure
      .input(z.object({ employeeId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getWriteUps(ctx.supabase!, { employee_id: input?.employeeId });
      }),
    createWriteUp: orgProcedure
      .input(z.object({
        employeeId: z.number().int().positive(),
        writeUpDate: z.string().optional(),
        reason: z.string().min(1),
        description: z.string().optional(),
        severity: z.enum(["verbal", "written", "final"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createWriteUp(ctx.supabase!, {
          org_id: ctx.user.orgId!, employee_id: input.employeeId,
          write_up_date: input.writeUpDate, reason: input.reason,
          description: input.description, severity: input.severity,
          issued_by: ctx.user.id,
        });
      }),

    listFiles: orgProcedure
      .input(z.object({ employeeId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => getEmployeeFiles(ctx.supabase!, input.employeeId)),

    listIntakes: orgProcedure
      .input(z.object({
        status: z.enum(["applied", "screening", "interview", "offer", "hired", "rejected"]).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return getIntakes(ctx.supabase!, { status: input?.status });
      }),
    updateIntakeStatus: orgProcedure
      .input(z.object({
        intakeId: z.number().int().positive(),
        status: z.enum(["applied", "screening", "interview", "offer", "hired", "rejected"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return updateIntakeStatus(ctx.supabase!, input.intakeId, input.status, input.notes);
      }),
  }),

  campaigns: router({
    list: orgProcedure.query(async ({ ctx }) => {
      return getCampaigns(ctx.supabase!);
    }),

    get: orgProcedure
      .input(z.object({ campaignId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        return getCampaign(ctx.supabase!, input.campaignId);
      }),

    recipients: orgProcedure
      .input(z.object({ campaignId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        return getCampaignRecipients(ctx.supabase!, input.campaignId);
      }),

    stats: orgProcedure
      .input(z.object({ campaignId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        return getCampaignStats(ctx.supabase!, input.campaignId);
      }),

    previewAudience: orgProcedure
      .input(z.object({
        stage: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        cities: z.array(z.string()).optional(),
        sources: z.array(z.string()).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const audience = await buildCampaignAudience(ctx.supabase!, input);
        return { size: audience.length, sample: audience.slice(0, 5) };
      }),

    create: orgProcedure
      .input(z.object({
        name: z.string().min(1),
        type: z.enum(["email", "sms"]),
        audienceFilter: z.object({
          stage: z.array(z.string()).optional(),
          tags: z.array(z.string()).optional(),
          cities: z.array(z.string()).optional(),
          sources: z.array(z.string()).optional(),
          churned: z.boolean().optional(),
          active: z.boolean().optional(),
        }),
        templateId: z.number().int().positive().nullable().optional(),
        subject: z.string().optional(),
        body: z.string().min(1),
        sendMode: z.enum(["draft", "now", "schedule"]),
        scheduledAt: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const audience = await buildCampaignAudience(ctx.supabase!, input.audienceFilter);

        const status = input.sendMode === "now" ? "sending"
          : input.sendMode === "schedule" ? "scheduled"
          : "draft";

        const campaign = await createCampaign(ctx.supabase!, {
          org_id: ctx.user.orgId!,
          name: input.name,
          type: input.type,
          audience_filter: input.audienceFilter,
          audience_size: audience.length,
          template_id: input.templateId ?? null,
          subject: input.subject,
          body: input.body,
          status,
          scheduled_at: input.sendMode === "schedule" ? (input.scheduledAt ?? null) : null,
          created_by: ctx.user.id,
        });

        if (input.sendMode === "now" && audience.length > 0) {
          await insertCampaignRecipients(ctx.supabase!, campaign.id, audience, input.type);
          // Kick off simulated send in the background.
          if (input.type === "email") void simulateEmailSend(campaign.id);
          else void simulateSmsBlast(campaign.id);
        }
        return campaign;
      }),

    send: orgProcedure
      .input(z.object({ campaignId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const campaign = await getCampaign(ctx.supabase!, input.campaignId);
        if (campaign.status !== "draft" && campaign.status !== "scheduled") {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot send a ${campaign.status} campaign` });
        }
        const audience = await buildCampaignAudience(ctx.supabase!, campaign.audience_filter);
        await insertCampaignRecipients(ctx.supabase!, campaign.id, audience, campaign.type);
        if (campaign.type === "email") void simulateEmailSend(campaign.id);
        else void simulateSmsBlast(campaign.id);
        return { success: true, recipients: audience.length };
      }),

    cancel: orgProcedure
      .input(z.object({ campaignId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        return updateCampaign(ctx.supabase!, input.campaignId, { status: "cancelled" });
      }),
  }),

  voiceAgents: router({
    list: orgProcedure.query(async ({ ctx }) => {
      return getVoiceAgents(ctx.supabase!);
    }),
    create: orgProcedure
      .input(z.object({
        name: z.string().min(1),
        voice: z.enum(["nina", "marcus", "ava", "leo"]),
        greeting: z.string().optional(),
        systemPrompt: z.string().optional(),
        toolsEnabled: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createVoiceAgent(ctx.supabase!, {
          org_id: ctx.user.orgId!,
          name: input.name,
          voice: input.voice,
          greeting: input.greeting,
          system_prompt: input.systemPrompt,
          tools_enabled: input.toolsEnabled,
          is_active: input.isActive,
        });
      }),
    update: orgProcedure
      .input(z.object({
        agentId: z.number().int().positive(),
        name: z.string().optional(),
        voice: z.enum(["nina", "marcus", "ava", "leo"]).optional(),
        greeting: z.string().optional(),
        systemPrompt: z.string().optional(),
        toolsEnabled: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { agentId, systemPrompt, toolsEnabled, isActive, ...rest } = input;
        const updates: Record<string, unknown> = { ...rest };
        if (systemPrompt !== undefined) updates.system_prompt = systemPrompt;
        if (toolsEnabled !== undefined) updates.tools_enabled = toolsEnabled;
        if (isActive !== undefined) updates.is_active = isActive;
        return updateVoiceAgent(ctx.supabase!, agentId, updates);
      }),
  }),

  calls: router({
    list: orgProcedure
      .input(z.object({
        callType: z.enum(["sales", "support", "general", "billing"]).optional(),
        disposition: z.enum(["lead_created", "transferred_to_live_agent", "scheduled_callback", "info_provided", "no_answer"]).optional(),
        direction: z.enum(["inbound", "outbound"]).optional(),
        contactId: z.number().int().positive().optional(),
        limit: z.number().int().positive().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return getCalls(ctx.supabase!, {
          call_type: input?.callType,
          disposition: input?.disposition,
          direction: input?.direction,
          contact_id: input?.contactId,
          limit: input?.limit,
        });
      }),
    get: orgProcedure
      .input(z.object({ callId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        return getCall(ctx.supabase!, input.callId);
      }),
    getTranscript: orgProcedure
      .input(z.object({ callId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        return getCallTranscript(ctx.supabase!, input.callId);
      }),
    stats: orgProcedure.query(async ({ ctx }) => {
      return getCallStats(ctx.supabase!, ctx.user.orgId!);
    }),
  }),

  chats: router({
    list: orgProcedure.query(async ({ ctx }) => {
      return getChatSessions(ctx.supabase!);
    }),
  }),

  org: router({
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(100),
          slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const org = await createOrganization(supabaseAdmin, {
          name: input.name,
          slug: input.slug,
          tier: "starter",
        });

        // Pull name from Supabase auth metadata (set during signup)
        const nameParts = (ctx.user!.fullName || "").split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        await addOrgMember(supabaseAdmin, {
          orgId: org.id,
          userId: ctx.user!.id,
          role: "owner",
          email: ctx.user!.email,
          firstName,
          lastName,
        });

        await sendWelcomeEmail(ctx.user!.email, ctx.user!.fullName || ctx.user!.email).catch(() => {});

        return org;
      }),

    current: orgProcedure.query(async ({ ctx }) => {
      const { data } = await ctx.supabase!
        .from("organizations")
        .select("*")
        .eq("id", ctx.user.orgId!)
        .single();
      return data;
    }),

    members: orgProcedure.query(async ({ ctx }) => {
      return getOrgMembers(ctx.supabase!);
    }),

    updateProfile: orgProcedure
      .input(z.object({
        name: z.string().min(1).optional(),
        industry: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        website: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        timezone: z.string().optional(),
        emailFromName: z.string().optional(),
        emailReplyTo: z.string().optional(),
        emailSignature: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { emailFromName, emailReplyTo, emailSignature, ...rest } = input;
        const updates: Record<string, unknown> = { ...rest };
        if (emailFromName !== undefined) updates.email_from_name = emailFromName;
        if (emailReplyTo !== undefined) updates.email_reply_to = emailReplyTo;
        if (emailSignature !== undefined) updates.email_signature = emailSignature;
        return updateOrgProfile(ctx.supabase!, ctx.user.orgId!, updates);
      }),

    updateMember: orgProcedure
      .input(z.object({
        memberId: z.string(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        title: z.string().optional(),
        role: z.enum(["owner", "admin", "member"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { memberId, firstName, lastName, ...rest } = input;
        const updates: Record<string, unknown> = { ...rest };
        if (firstName !== undefined) updates.first_name = firstName;
        if (lastName !== undefined) updates.last_name = lastName;
        return updateMemberProfile(ctx.supabase!, memberId, updates);
      }),
  }),

  emailTemplates: router({
    list: orgProcedure.query(async ({ ctx }) => {
      return getEmailTemplates(ctx.supabase!);
    }),
    create: orgProcedure
      .input(z.object({ name: z.string().min(1), subject: z.string().min(1), body: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        return createEmailTemplate(ctx.supabase!, { org_id: ctx.user.orgId!, created_by: ctx.user.id, ...input });
      }),
    delete: orgProcedure
      .input(z.object({ templateId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await deleteEmailTemplate(ctx.supabase!, input.templateId);
        return { success: true };
      }),
  }),

  emails: router({
    send: orgProcedure
      .input(z.object({
        contactId: z.number().int().positive(),
        toEmail: z.string().email(),
        subject: z.string().min(1),
        body: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const { data: org } = await ctx.supabase!.from("organizations")
          .select("name, email_from_name, email_reply_to, email_signature")
          .eq("id", ctx.user.orgId!).single();

        const fromName = org?.email_from_name || org?.name || "GridWorker OS";
        const signature = org?.email_signature ? `\n\n${org.email_signature}` : "";
        const fullBody = input.body + signature;

        const { Resend } = await import("resend");
        const resend = new Resend(ENV.resendApiKey);
        const { data: result, error } = await resend.emails.send({
          from: `${fromName} <onboarding@resend.dev>`,
          to: input.toEmail,
          subject: input.subject,
          text: fullBody,
          ...(org?.email_reply_to ? { replyTo: org.email_reply_to } : {}),
        });

        await logEmail(ctx.supabase!, {
          org_id: ctx.user.orgId!, contact_id: input.contactId, user_id: ctx.user.id,
          to_email: input.toEmail, subject: input.subject, body: fullBody,
          status: error ? "failed" : "sent", resend_id: result?.id,
        });

        await logActivity(ctx.supabase!, {
          org_id: ctx.user.orgId!, contact_id: input.contactId, user_id: ctx.user.id,
          type: "email", content: `Sent email: "${input.subject}"`,
          metadata: { to: input.toEmail, subject: input.subject },
        });

        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        return { success: true };
      }),
  }),

  emailLogs: router({
    listForContact: orgProcedure
      .input(z.object({ contactId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        return getEmailLogsForContact(ctx.supabase!, input.contactId);
      }),
  }),

  calendar: router({
    list: orgProcedure.query(async ({ ctx }) => {
      return getEvents(ctx.supabase!);
    }),
    listForContact: orgProcedure
      .input(z.object({ contactId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        return getEventsForContact(ctx.supabase!, input.contactId);
      }),
    create: orgProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        contactId: z.number().int().positive().optional(),
        startAt: z.string(),
        endAt: z.string(),
        location: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createEvent(ctx.supabase!, {
          org_id: ctx.user.orgId!,
          created_by: ctx.user.id,
          contact_id: input.contactId,
          title: input.title,
          description: input.description,
          start_at: input.startAt,
          end_at: input.endAt,
          location: input.location,
        });
      }),
    update: orgProcedure
      .input(z.object({
        eventId: z.number().int().positive(),
        title: z.string().optional(),
        description: z.string().optional(),
        startAt: z.string().optional(),
        endAt: z.string().optional(),
        location: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { eventId, startAt, endAt, ...rest } = input;
        const updates: Record<string, unknown> = { ...rest };
        if (startAt !== undefined) updates.start_at = startAt;
        if (endAt !== undefined) updates.end_at = endAt;
        return updateEvent(ctx.supabase!, eventId, updates);
      }),
    delete: orgProcedure
      .input(z.object({ eventId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await deleteEvent(ctx.supabase!, input.eventId);
        return { success: true };
      }),
  }),

  ai: router({
    chat: orgProcedure
      .input(
        z.object({
          messages: z.array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().min(1).max(10000),
            })
          ),
          conversationId: z.string().uuid().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Fetch live business data for context — query the contacts table (real CRM data)
        const [contactsRes, notesRes, memberRes] = await Promise.all([
          ctx.supabase!.from("contacts")
            .select("first_name, last_name, email, company, stage, created_at")
            .eq("org_id", ctx.user.orgId!)
            .order("created_at", { ascending: false })
            .limit(10),
          ctx.supabase!.from("contact_notes").select("id", { count: "exact", head: true }),
          ctx.supabase!.from("org_members").select("referral_code").eq("user_id", ctx.user.id).eq("org_id", ctx.user.orgId!).single(),
        ]);

        const contacts = contactsRes.data ?? [];
        const recentSignups = contacts.map((c: any) => ({
          name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
          email: c.email,
          industry: c.company || c.stage || "—",
          created_at: c.created_at,
        }));
        const industries = Array.from(new Set(contacts.map((c: any) => c.company).filter(Boolean)));

        // Get total contact count for this org
        const { count: totalSignups } = await ctx.supabase!
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("org_id", ctx.user.orgId!);

        const reply = await chatWithOpenClaw(input.messages, {
          orgId: ctx.user.orgId!,
          orgName: ctx.user.orgName!,
          orgTier: ctx.user.orgTier!,
          userId: ctx.user.id,
          userName: ctx.user.fullName || ctx.user.email,
          business: {
            totalSignups: totalSignups ?? 0,
            recentSignups: recentSignups as any[],
            topIndustries: industries as string[],
            referralCode: memberRes.data?.referral_code ?? null,
            referralUrl: memberRes.data?.referral_code
              ? `${ENV.appUrl}/join?ref=${encodeURIComponent(memberRes.data.referral_code)}`
              : null,
            totalNotes: notesRes.count ?? 0,
          },
        });

        const allMessages = [
          ...input.messages,
          { role: "assistant" as const, content: reply },
        ];

        if (input.conversationId) {
          await ctx.supabase!
            .from("conversations")
            .update({
              messages: allMessages,
              updated_at: new Date().toISOString(),
            })
            .eq("id", input.conversationId);

          return { reply, conversationId: input.conversationId };
        } else {
          const { data } = await ctx.supabase!
            .from("conversations")
            .insert({
              org_id: ctx.user.orgId,
              user_id: ctx.user.id,
              title:
                input.messages[0]?.content.slice(0, 100) || "New conversation",
              messages: allMessages,
            })
            .select("id")
            .single();

          return { reply, conversationId: data?.id };
        }
      }),

    conversations: orgProcedure.query(async ({ ctx }) => {
      const { data } = await ctx.supabase!
        .from("conversations")
        .select("id, title, created_at, updated_at")
        .order("updated_at", { ascending: false });
      return data ?? [];
    }),
  }),

  qr: router({
    getMyCode: orgProcedure.query(async ({ ctx }) => {
      const { data: member } = await ctx.supabase!
        .from("org_members")
        .select("referral_code")
        .eq("user_id", ctx.user.id)
        .eq("org_id", ctx.user.orgId!)
        .single();

      if (!member?.referral_code) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No referral code found. Contact support.",
        });
      }

      const qrDataUrl = await generateReferralQRCode(member.referral_code);
      const referralUrl = `${ENV.appUrl}/join?ref=${encodeURIComponent(member.referral_code)}`;

      return {
        referralCode: member.referral_code,
        referralUrl,
        qrCodeDataUrl: qrDataUrl,
      };
    }),

    getMyCodeSVG: orgProcedure.query(async ({ ctx }) => {
      const { data: member } = await ctx.supabase!
        .from("org_members")
        .select("referral_code")
        .eq("user_id", ctx.user.id)
        .eq("org_id", ctx.user.orgId!)
        .single();

      if (!member?.referral_code) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No referral code found.",
        });
      }

      return { svg: await generateReferralQRCodeSVG(member.referral_code) };
    }),
  }),
});

export type AppRouter = typeof appRouter;
