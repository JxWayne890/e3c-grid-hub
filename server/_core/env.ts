import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
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
  resendApiKey: optional("RESEND_API_KEY"),
  openclawUrl: optional("OPENCLAW_URL"),
  openclawToken: optional("OPENCLAW_GATEWAY_TOKEN"),
  isProduction: process.env.NODE_ENV === "production",
  appUrl: optional("APP_URL", "http://localhost:3000"),
};
