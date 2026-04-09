import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { supabaseAdmin, createRequestClient } from "../supabase";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: {
    id: string;
    email: string;
    fullName: string | null;
    orgId: string | null;
    orgRole: string | null;
    orgTier: string | null;
    orgName: string | null;
  } | null;
  supabase: ReturnType<typeof createRequestClient> | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const authHeader = opts.req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { req: opts.req, res: opts.res, user: null, supabase: null };
  }

  const token = authHeader.slice(7);

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return { req: opts.req, res: opts.res, user: null, supabase: null };
    }

    // Look up org membership (including member's name)
    const { data: membership } = await supabaseAdmin
      .from("org_members")
      .select("org_id, role, first_name, last_name, organizations(id, tier, name)")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    const org = (membership?.organizations ?? null) as unknown as { id: string; tier: string; name: string } | null;

    // Get the user's name: check org_members first, then Supabase auth metadata
    const memberName = [membership?.first_name, membership?.last_name].filter(Boolean).join(" ") || null;
    const authName = user.user_metadata?.full_name || user.user_metadata?.name || null;
    const fullName = memberName || authName;

    const supabase = createRequestClient(token);

    return {
      req: opts.req,
      res: opts.res,
      user: {
        id: user.id,
        email: user.email ?? "",
        fullName,
        orgId: membership?.org_id ?? null,
        orgRole: membership?.role ?? null,
        orgTier: org?.tier ?? null,
        orgName: org?.name ?? null,
      },
      supabase,
    };
  } catch {
    return { req: opts.req, res: opts.res, user: null, supabase: null };
  }
}
