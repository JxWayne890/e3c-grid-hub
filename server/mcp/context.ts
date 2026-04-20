import crypto from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MCPContextClaims = {
  org_id: string;
  user_id: string;
  iat: number;
  exp: number;
};

export type ToolCtx = {
  org_id: string;
  user_id: string;
  db: SupabaseClient;
};

const TTL_SECONDS = 5 * 60;

function b64url(buf: Buffer | string): string {
  const s = (typeof buf === "string" ? Buffer.from(buf) : buf).toString("base64");
  return s.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function getSigningKey(): string {
  const key = process.env.MCP_CONTEXT_SIGNING_KEY;
  if (!key || key.length < 32) {
    throw new Error("MCP_CONTEXT_SIGNING_KEY missing or too short (min 32 chars)");
  }
  return key;
}

/**
 * Mint a short-lived (5 min) HMAC-signed context token carrying {org_id, user_id}.
 * The token is embedded in the chat message and required as `mcp_context_token`
 * on every tool call. The MCP wrapper verifies it server-side; tools never trust
 * org_id supplied by the LLM.
 */
export function mintContextToken(orgId: string, userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const claims: MCPContextClaims = {
    org_id: orgId,
    user_id: userId,
    iat: now,
    exp: now + TTL_SECONDS,
  };
  const payloadB64 = b64url(JSON.stringify(claims));
  const sig = crypto
    .createHmac("sha256", getSigningKey())
    .update(payloadB64)
    .digest();
  return `${payloadB64}.${b64url(sig)}`;
}

/**
 * Verify and parse a context token. Returns null on any failure
 * (bad signature, expired, malformed). Uses constant-time comparison.
 */
export function verifyContextToken(token: unknown): MCPContextClaims | null {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [payloadB64, sigB64] = token.split(".", 2);
  if (!payloadB64 || !sigB64) return null;

  let expectedSig: Buffer;
  let providedSig: Buffer;
  try {
    expectedSig = crypto
      .createHmac("sha256", getSigningKey())
      .update(payloadB64)
      .digest();
    providedSig = b64urlDecode(sigB64);
  } catch {
    return null;
  }
  if (expectedSig.length !== providedSig.length) return null;
  if (!crypto.timingSafeEqual(expectedSig, providedSig)) return null;

  let claims: MCPContextClaims;
  try {
    claims = JSON.parse(b64urlDecode(payloadB64).toString("utf8"));
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== "number" || claims.exp < now) return null;
  if (typeof claims.iat !== "number" || claims.iat > now + 60) return null;
  if (typeof claims.org_id !== "string" || !claims.org_id) return null;
  if (typeof claims.user_id !== "string" || !claims.user_id) return null;

  return claims;
}

/**
 * AsyncLocalStorage holding the per-tool-call ToolCtx. The wrapper sets it;
 * tool handlers read it via getCtx(). Avoids threading ctx through every
 * handler signature.
 */
export const mcpCtxStore = new AsyncLocalStorage<ToolCtx>();

export function getCtx(): ToolCtx {
  const ctx = mcpCtxStore.getStore();
  if (!ctx) {
    throw new Error("MCP tool context not initialized — tool called outside wrapper");
  }
  return ctx;
}
