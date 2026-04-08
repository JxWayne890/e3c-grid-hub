import { Resend } from "resend";
import { ENV } from "./_core/env";

const OWNER_EMAIL = "u.logistics.ed@gmail.com";
const FROM_EMAIL = "GridWorker OS <onboarding@resend.dev>";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!ENV.resendApiKey) {
    console.warn("[Email] RESEND_API_KEY not set — skipping email.");
    return null;
  }
  if (!_resend) {
    _resend = new Resend(ENV.resendApiKey);
  }
  return _resend;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface BetaSignupEmailData {
  name: string;
  email: string;
  phone: string;
  industry: string;
  referralCode?: string | null;
  message?: string | null;
}

/**
 * Sends a notification email to the owner whenever a new beta signup is submitted.
 */
export async function sendBetaSignupNotification(data: BetaSignupEmailData): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: OWNER_EMAIL,
      subject: `New Beta Signup: ${escapeHtml(data.name)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f14; color: #e0e0e0; padding: 32px; border-radius: 12px;">
          <div style="border-bottom: 1px solid #2a2a3a; padding-bottom: 16px; margin-bottom: 24px;">
            <h1 style="color: #c9a84c; font-size: 22px; margin: 0;">New Beta Signup</h1>
            <p style="color: #666; font-size: 12px; margin: 4px 0 0;">GridWorker OS — E3C Collective</p>
          </div>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #888; font-size: 13px; width: 130px;">Name</td>
              <td style="padding: 10px 0; color: #fff; font-size: 14px; font-weight: bold;">${escapeHtml(data.name)}</td>
            </tr>
            <tr style="border-top: 1px solid #1e1e2e;">
              <td style="padding: 10px 0; color: #888; font-size: 13px;">Email</td>
              <td style="padding: 10px 0; color: #c9a84c; font-size: 14px;">
                <a href="mailto:${encodeURIComponent(data.email)}" style="color: #c9a84c;">${escapeHtml(data.email)}</a>
              </td>
            </tr>
            <tr style="border-top: 1px solid #1e1e2e;">
              <td style="padding: 10px 0; color: #888; font-size: 13px;">Phone</td>
              <td style="padding: 10px 0; color: #fff; font-size: 14px;">
                <a href="tel:${encodeURIComponent(data.phone)}" style="color: #fff;">${escapeHtml(data.phone)}</a>
              </td>
            </tr>
            <tr style="border-top: 1px solid #1e1e2e;">
              <td style="padding: 10px 0; color: #888; font-size: 13px;">Industry</td>
              <td style="padding: 10px 0; color: #fff; font-size: 14px;">${escapeHtml(data.industry)}</td>
            </tr>
            ${data.referralCode ? `
            <tr style="border-top: 1px solid #1e1e2e;">
              <td style="padding: 10px 0; color: #888; font-size: 13px;">Referral Code</td>
              <td style="padding: 10px 0; color: #6ea8fe; font-size: 14px; font-family: monospace;">${escapeHtml(data.referralCode)}</td>
            </tr>` : ""}
            ${data.message ? `
            <tr style="border-top: 1px solid #1e1e2e;">
              <td style="padding: 10px 0; color: #888; font-size: 13px; vertical-align: top;">Message</td>
              <td style="padding: 10px 0; color: #ccc; font-size: 14px; line-height: 1.5;">${escapeHtml(data.message)}</td>
            </tr>` : ""}
          </table>

          <div style="margin-top: 28px; padding: 16px; background: #1a1a2e; border-radius: 8px; border-left: 3px solid #c9a84c;">
            <p style="margin: 0; font-size: 13px; color: #888;">
              Reply directly to <a href="mailto:${encodeURIComponent(data.email)}" style="color: #c9a84c;">${escapeHtml(data.email)}</a> to start the conversation.
            </p>
          </div>

          <p style="margin-top: 24px; font-size: 11px; color: #444; text-align: center;">
            GridWorker OS · E3C Collective · Communicate. Collaborate. Connect.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[Email] Resend error:", error);
      return false;
    }

    console.log(`[Email] Beta signup notification sent for ${data.name}`);
    return true;
  } catch (err) {
    console.error("[Email] Failed to send beta signup notification:", err);
    return false;
  }
}

/**
 * Sends a confirmation email to the beta signup user.
 */
export async function sendBetaSignupConfirmation(to: string, name: string): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "You're In — GridWorker OS Beta",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f14; color: #e0e0e0; padding: 32px; border-radius: 12px;">
          <div style="border-bottom: 1px solid #2a2a3a; padding-bottom: 16px; margin-bottom: 24px;">
            <h1 style="color: #c9a84c; font-size: 22px; margin: 0;">You're On The Grid</h1>
            <p style="color: #666; font-size: 12px; margin: 4px 0 0;">GridWorker OS — E3C Collective</p>
          </div>

          <p style="font-size: 15px; line-height: 1.6; color: #ccc;">
            Hey ${escapeHtml(name)},
          </p>

          <p style="font-size: 15px; line-height: 1.6; color: #ccc;">
            Your beta signup has been received. Welcome to the Grid Worker Movement.
          </p>

          <div style="margin: 24px 0; padding: 20px; background: #1a1a2e; border-radius: 8px; border-left: 3px solid #c9a84c;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #c9a84c; font-weight: bold;">What happens next:</p>
            <ul style="margin: 0; padding-left: 20px; color: #aaa; font-size: 13px; line-height: 2;">
              <li>Our team will review your application</li>
              <li>You'll receive an invite to create your account</li>
              <li>Get access to the full CRM + referral tracking system</li>
            </ul>
          </div>

          <p style="font-size: 13px; color: #888; line-height: 1.5;">
            In the meantime, follow us and stay connected. The grid is growing.
          </p>

          <p style="margin-top: 24px; font-size: 11px; color: #444; text-align: center;">
            GridWorker OS · E3C Collective · Communicate. Collaborate. Connect.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[Email] Resend error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Email] Failed to send beta confirmation:", err);
    return false;
  }
}

/**
 * Sends a welcome email when a user creates their organization.
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Welcome to GridWorker OS",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f14; color: #e0e0e0; padding: 32px; border-radius: 12px;">
          <div style="border-bottom: 1px solid #2a2a3a; padding-bottom: 16px; margin-bottom: 24px;">
            <h1 style="color: #c9a84c; font-size: 22px; margin: 0;">Welcome to GridWorker OS</h1>
            <p style="color: #666; font-size: 12px; margin: 4px 0 0;">Your command center is ready.</p>
          </div>

          <p style="font-size: 15px; line-height: 1.6; color: #ccc;">
            Hey ${escapeHtml(name)},
          </p>

          <p style="font-size: 15px; line-height: 1.6; color: #ccc;">
            Your organization has been created and your CRM dashboard is live. Here's what you can do:
          </p>

          <div style="margin: 24px 0; padding: 20px; background: #1a1a2e; border-radius: 8px;">
            <ul style="margin: 0; padding-left: 20px; color: #ccc; font-size: 14px; line-height: 2.2;">
              <li><span style="color: #c9a84c; font-weight: bold;">Track Signups</span> — Monitor beta signups and manage contacts</li>
              <li><span style="color: #c9a84c; font-weight: bold;">Add Notes</span> — Keep interaction logs on every contact</li>
              <li><span style="color: #c9a84c; font-weight: bold;">Export Data</span> — Download your contacts as CSV anytime</li>
              <li><span style="color: #c9a84c; font-weight: bold;">AI Assistant</span> — Upgrade to Pro for AI-powered insights</li>
            </ul>
          </div>

          <a href="${ENV.appUrl}/crm" style="display: inline-block; padding: 12px 28px; background: #c9a84c; color: #0f0f14; font-weight: bold; text-decoration: none; border-radius: 8px; font-size: 14px;">
            Open Your Dashboard
          </a>

          <p style="margin-top: 24px; font-size: 11px; color: #444; text-align: center;">
            GridWorker OS · E3C Collective · Communicate. Collaborate. Connect.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[Email] Resend error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Email] Failed to send welcome email:", err);
    return false;
  }
}
