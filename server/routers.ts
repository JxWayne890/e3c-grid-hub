import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure, orgProcedure } from "./_core/trpc";
import { insertBetaSignup, getBetaSignups, addContactNote, getNotesForSignup, deleteContactNote, createOrganization, addOrgMember } from "./db";
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

  notes: router({
    list: orgProcedure
      .input(z.object({ signupId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        return getNotesForSignup(ctx.supabase!, input.signupId);
      }),

    add: orgProcedure
      .input(
        z.object({
          signupId: z.number().int().positive(),
          note: z.string().min(1).max(2000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await addContactNote(ctx.supabase!, {
          orgId: ctx.user.orgId!,
          signupId: input.signupId,
          userId: ctx.user.id,
          note: input.note,
        });
        return { success: true };
      }),

    delete: orgProcedure
      .input(z.object({ noteId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await deleteContactNote(ctx.supabase!, input.noteId);
        return { success: true };
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
      const { data } = await ctx.supabase!
        .from("org_members")
        .select("*")
        .eq("org_id", ctx.user.orgId!);
      return data ?? [];
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
          userName: ctx.user.email,
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
