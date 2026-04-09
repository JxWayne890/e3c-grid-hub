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
  updateOrgProfile, updateMemberProfile, getOrgMembers,
  getEmailTemplates, createEmailTemplate, deleteEmailTemplate,
  logEmail, getEmailLogsForContact,
  getEvents, getEventsForContact, createEvent, updateEvent, deleteEvent,
} from "./db";
import { sendBetaSignupNotification, sendBetaSignupConfirmation, sendWelcomeEmail } from "./email";
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

        await addOrgMember(supabaseAdmin, {
          orgId: org.id,
          userId: ctx.user!.id,
          role: "owner",
          email: ctx.user!.email,
        });

        await sendWelcomeEmail(ctx.user!.email, ctx.user!.email).catch(() => {});

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
        // Fetch live business data for context
        const [signupsRes, notesRes, memberRes] = await Promise.all([
          ctx.supabase!.from("beta_signups").select("name, email, industry, created_at").order("created_at", { ascending: false }).limit(10),
          ctx.supabase!.from("contact_notes").select("id", { count: "exact", head: true }),
          ctx.supabase!.from("org_members").select("referral_code").eq("user_id", ctx.user.id).eq("org_id", ctx.user.orgId!).single(),
        ]);

        const signups = signupsRes.data ?? [];
        const industries = Array.from(new Set(signups.map((s: any) => s.industry).filter(Boolean)));

        // Get total count separately
        const { count: totalSignups } = await ctx.supabase!.from("beta_signups").select("id", { count: "exact", head: true });

        const reply = await chatWithOpenClaw(input.messages, {
          orgId: ctx.user.orgId!,
          orgName: ctx.user.orgName!,
          orgTier: ctx.user.orgTier!,
          userId: ctx.user.id,
          userName: ctx.user.fullName || ctx.user.email,
          business: {
            totalSignups: totalSignups ?? 0,
            recentSignups: signups as any[],
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
