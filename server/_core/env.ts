import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function requiredMinLength(key: string, min: number): string {
  const value = required(key);
  if (value.length < min) {
    throw new Error(`Environment variable ${key} must be at least ${min} characters`);
  }
  return value;
}

function optional(key: string, fallback: string = ""): string {
  return process.env[key] || fallback;
}

export const ENV = {
  supabaseUrl: required("SUPABASE_URL"),
  supabaseAnonKey: required("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  supabaseJwtSecret: requiredMinLength("SUPABASE_JWT_SECRET", 32),
  resendApiKey: optional("RESEND_API_KEY"),
  openclawUrl: optional("OPENCLAW_URL"),
  openclawToken: optional("OPENCLAW_GATEWAY_TOKEN"),
  mcpSharedSecret: requiredMinLength("MCP_SHARED_SECRET", 32),
  mcpContextSigningKey: requiredMinLength("MCP_CONTEXT_SIGNING_KEY", 32),
  isProduction: process.env.NODE_ENV === "production",
  appUrl: optional("APP_URL", "http://localhost:3000"),
};
