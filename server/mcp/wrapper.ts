import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { supabaseAdmin, createRequestClient } from "../supabase";
import { verifyContextToken, mcpCtxStore, type ToolCtx } from "./context";
import { mintSupabaseUserJwt } from "./jwt";

type ToolResult = { content: Array<{ type: "text"; text: string }> };

const CONTEXT_PARAM = "mcp_context_token";

function deny(message: string): ToolResult {
  return { content: [{ type: "text", text: message }] };
}

function summarize(result: unknown): string | null {
  try {
    const text = (result as ToolResult)?.content?.[0]?.text;
    if (typeof text === "string") return text.slice(0, 500);
    return JSON.stringify(result).slice(0, 500);
  } catch {
    return null;
  }
}

function scrubArgs(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (k === CONTEXT_PARAM) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Wrap McpServer.tool with security boundary:
 *   1. Inject required `mcp_context_token` param into the schema.
 *   2. On every call, verify the token (HMAC). Reject if invalid/expired.
 *   3. Build a per-call ToolCtx with verified org_id, user_id, and a Supabase
 *      client scoped to the user's JWT (RLS enforces org isolation).
 *   4. Override args.org_id and args.user_id with verified values; warn on
 *      mismatch (signal of prompt injection).
 *   5. Write before/after rows to agent_actions for audit.
 *   6. Run the handler inside AsyncLocalStorage so getCtx() works in handlers.
 */
// Inferred output type for a ZodRawShape — Zod v4 dropped objectOutputType,
// so wrap the shape in a ZodObject and infer.
type InferShape<S extends z.ZodRawShape> = z.infer<z.ZodObject<S>>;

export function tool<S extends z.ZodRawShape>(
  server: McpServer,
  name: string,
  description: string,
  schema: S,
  handler: (args: InferShape<S>) => Promise<ToolResult>
): void {
  const fullSchema = {
    ...schema,
    [CONTEXT_PARAM]: z
      .string()
      .describe(
        "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify."
      ),
  } as S & { [CONTEXT_PARAM]: z.ZodString };

  server.tool(
    name,
    description,
    fullSchema,
    (async (rawArgs: Record<string, unknown>): Promise<ToolResult> => {
      const claims = verifyContextToken(rawArgs[CONTEXT_PARAM]);
      if (!claims) {
        return deny(
          "Error: missing or invalid session context token. The server cannot verify which org/user this call belongs to."
        );
      }

      const userJwt = mintSupabaseUserJwt(claims.user_id);
      const ctx: ToolCtx = {
        org_id: claims.org_id,
        user_id: claims.user_id,
        db: createRequestClient(userJwt),
      };

      const llmOrgId = rawArgs.org_id;
      if (typeof llmOrgId === "string" && llmOrgId !== ctx.org_id) {
        console.warn(
          `[mcp] org_id MISMATCH in ${name}: llm='${llmOrgId}' verified='${ctx.org_id}' user=${ctx.user_id}`
        );
      }
      const llmUserId = rawArgs.user_id;
      if (typeof llmUserId === "string" && llmUserId !== ctx.user_id) {
        console.warn(
          `[mcp] user_id MISMATCH in ${name}: llm='${llmUserId}' verified='${ctx.user_id}'`
        );
      }

      const safeArgs = scrubArgs(rawArgs);
      if ("org_id" in safeArgs) safeArgs.org_id = ctx.org_id;
      if ("user_id" in safeArgs) safeArgs.user_id = ctx.user_id;
      if ("created_by" in safeArgs && safeArgs.created_by === undefined) {
        safeArgs.created_by = ctx.user_id;
      }

      let auditId: number | null = null;
      try {
        const { data } = await supabaseAdmin
          .from("agent_actions")
          .insert({
            org_id: ctx.org_id,
            user_id: ctx.user_id,
            tool_name: name,
            tool_args_json: safeArgs,
            status: "started",
          })
          .select("id")
          .single();
        auditId = data?.id ?? null;
      } catch (e) {
        console.error(`[mcp] audit insert failed for ${name}:`, e);
      }

      const finishAudit = async (
        status: "success" | "error",
        summary: string | null
      ) => {
        if (auditId == null) return;
        try {
          await supabaseAdmin
            .from("agent_actions")
            .update({ status, tool_result_summary: summary })
            .eq("id", auditId);
        } catch (e) {
          console.error(`[mcp] audit update failed for ${name}:`, e);
        }
      };

      try {
        const result = await mcpCtxStore.run(ctx, () =>
          handler(safeArgs as InferShape<S>)
        );
        await finishAudit("success", summarize(result));
        return result;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        await finishAudit("error", msg.slice(0, 500));
        return deny(`Tool error: ${msg}`);
      }
    }) as never
  );
}
