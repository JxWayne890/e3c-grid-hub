import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mintContextToken, verifyContextToken } from "./context";

const ORIG_KEY = process.env.MCP_CONTEXT_SIGNING_KEY;

beforeAll(() => {
  process.env.MCP_CONTEXT_SIGNING_KEY = "a".repeat(64);
});
afterAll(() => {
  if (ORIG_KEY === undefined) delete process.env.MCP_CONTEXT_SIGNING_KEY;
  else process.env.MCP_CONTEXT_SIGNING_KEY = ORIG_KEY;
});

describe("context token", () => {
  it("round-trips a valid token", () => {
    const token = mintContextToken("org-1", "user-1");
    const claims = verifyContextToken(token);
    expect(claims).not.toBeNull();
    expect(claims!.org_id).toBe("org-1");
    expect(claims!.user_id).toBe("user-1");
    expect(claims!.exp).toBeGreaterThan(claims!.iat);
  });

  it("rejects a tampered payload", () => {
    const token = mintContextToken("org-1", "user-1");
    const [payloadB64, sigB64] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ org_id: "OTHER-ORG", user_id: "user-1", iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300 })
    ).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    const forged = `${tamperedPayload}.${sigB64}`;
    expect(verifyContextToken(forged)).toBeNull();
    // Also confirm the original still verifies (sanity)
    expect(verifyContextToken(`${payloadB64}.${sigB64}`)).not.toBeNull();
  });

  it("rejects a token signed with a different key", () => {
    const token = mintContextToken("org-1", "user-1");
    process.env.MCP_CONTEXT_SIGNING_KEY = "b".repeat(64);
    expect(verifyContextToken(token)).toBeNull();
    process.env.MCP_CONTEXT_SIGNING_KEY = "a".repeat(64);
  });

  it("rejects an expired token", () => {
    // Build a token with exp in the past by mocking Date.now temporarily
    const realNow = Date.now;
    Date.now = () => (realNow() - 10 * 60 * 1000); // 10 min ago
    const token = mintContextToken("org-1", "user-1");
    Date.now = realNow;
    expect(verifyContextToken(token)).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(verifyContextToken("")).toBeNull();
    expect(verifyContextToken("notatoken")).toBeNull();
    expect(verifyContextToken("a.b.c")).toBeNull();
    expect(verifyContextToken(null)).toBeNull();
    expect(verifyContextToken(undefined)).toBeNull();
    expect(verifyContextToken(123 as unknown)).toBeNull();
  });

  it("rejects a signature of the right length but wrong value", () => {
    const token = mintContextToken("org-1", "user-1");
    const [payloadB64] = token.split(".");
    // 32 zero bytes base64url-encoded
    const fakeSig = Buffer.alloc(32).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    expect(verifyContextToken(`${payloadB64}.${fakeSig}`)).toBeNull();
  });
});
