import crypto from "node:crypto";

function b64url(buf: Buffer | string): string {
  const s = (typeof buf === "string" ? Buffer.from(buf) : buf).toString("base64");
  return s.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function getSecret(): string {
  const s = process.env.SUPABASE_JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SUPABASE_JWT_SECRET missing or too short (min 32 chars)");
  }
  return s;
}

/**
 * Mint a short-lived (5 min) Supabase user JWT (HS256) for the given user.
 * Used to call Supabase from the MCP server with RLS scoped to that user —
 * `auth.uid()` in policies returns this user's id, so cross-tenant queries
 * silently filter to zero rows.
 */
export function mintSupabaseUserJwt(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: "supabase",
      sub: userId,
      aud: "authenticated",
      role: "authenticated",
      iat: now,
      exp: now + 5 * 60,
    })
  );
  const signingInput = `${header}.${payload}`;
  const sig = b64url(
    crypto.createHmac("sha256", getSecret()).update(signingInput).digest()
  );
  return `${signingInput}.${sig}`;
}
