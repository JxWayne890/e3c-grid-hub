/**
 * simulate.ts — fake external sends for the demo.
 *
 * No real API calls fire. Each function writes realistic DB state over time
 * so the UI feels alive.
 */

import { supabaseAdmin } from "../supabase";

// Realistic distributions that mirror the spec: ~40% open, ~10% click, ~2% bounce.
const DIST = {
  bounce: 0.02,
  open: 0.40,  // of delivered
  click: 0.10, // of delivered (clicks imply opens)
};

type Stage = { atMs: number; apply: (recipientId: number) => Promise<void> };

async function markStatus(recipientId: number, status: string, tsCol?: string) {
  const updates: Record<string, unknown> = { status };
  if (tsCol) updates[tsCol] = new Date().toISOString();
  const { error } = await supabaseAdmin.from("campaign_recipients").update(updates).eq("id", recipientId);
  if (error) console.warn(`[simulate] recipient ${recipientId} update failed: ${error.message}`);
}

/**
 * Simulate sending an email campaign.
 *
 * Flow over ~60s wall-clock:
 *   0s  → recipients inserted as "pending" (caller does this)
 *   2s  → ~98% go "sent"  (~2% "bounced")
 *   8s  → "sent" → "delivered"
 *   25s → ~40% of delivered → "opened"
 *   45s → ~10% of delivered → "clicked"
 *   60s → campaign status "sent"
 *
 * Timers run on the Node event loop — fine for demo durations. If the process
 * restarts mid-send, the campaign is left mid-state and `resumeCampaigns()`
 * could pick it up (not implemented; demo resets via seed).
 */
export async function simulateEmailSend(campaignId: number) {
  // Mark campaign as sending
  await supabaseAdmin.from("campaigns").update({ status: "sending", updated_at: new Date().toISOString() }).eq("id", campaignId);

  const { data: recipients, error } = await supabaseAdmin
    .from("campaign_recipients")
    .select("id")
    .eq("campaign_id", campaignId);
  if (error || !recipients) {
    console.warn(`[simulate] could not load recipients: ${error?.message}`);
    return;
  }

  const ids = recipients.map((r) => r.id as number);
  const bounced = new Set(ids.filter(() => Math.random() < DIST.bounce));
  const delivered = ids.filter((id) => !bounced.has(id));
  const openedArr = delivered.filter(() => Math.random() < DIST.open);
  const clickedArr = openedArr.filter(() => Math.random() < DIST.click / DIST.open);

  const runAfter = (ms: number, fn: () => Promise<void>) => {
    setTimeout(() => { fn().catch((e) => console.warn("[simulate] stage failed:", e)); }, ms);
  };

  runAfter(2000, async () => {
    for (const id of ids) {
      if (bounced.has(id)) await markStatus(id, "bounced");
      else await markStatus(id, "sent", "sent_at");
    }
  });

  runAfter(8000, async () => {
    for (const id of delivered) await markStatus(id, "delivered");
  });

  runAfter(25000, async () => {
    for (const id of openedArr) await markStatus(id, "opened", "opened_at");
  });

  runAfter(45000, async () => {
    for (const id of clickedArr) await markStatus(id, "clicked", "clicked_at");
  });

  runAfter(60000, async () => {
    await supabaseAdmin
      .from("campaigns")
      .update({ status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", campaignId);
  });
}

const INBOUND_REPLY_TEMPLATES = [
  "Thanks, got it!",
  "What time does that end?",
  "Can you send me the details again?",
  "Perfect, see you then.",
  "I'll call you back in a bit.",
  "Actually, can we reschedule?",
  "How much is the monthly rate?",
  "Sounds good, thanks!",
];

/**
 * Simulate sending a single outbound SMS to a contact. 95% delivered in ~2s.
 * 30% chance of an auto-generated inbound reply 10-45s later.
 */
export async function simulateSingleSms(messageId: number, contactId: number, orgId: string, toNumber: string) {
  const willFail = Math.random() < 0.05;
  setTimeout(async () => {
    if (willFail) {
      await supabaseAdmin.from("sms_messages")
        .update({ status: "failed", sent_at: new Date().toISOString() })
        .eq("id", messageId);
      return;
    }
    await supabaseAdmin.from("sms_messages")
      .update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", messageId);

    setTimeout(async () => {
      await supabaseAdmin.from("sms_messages").update({ status: "delivered" }).eq("id", messageId);
    }, 1500);

    // 30% reply
    if (Math.random() < 0.30) {
      const replyDelay = 10000 + Math.random() * 35000;
      setTimeout(async () => {
        const reply = INBOUND_REPLY_TEMPLATES[Math.floor(Math.random() * INBOUND_REPLY_TEMPLATES.length)];
        await supabaseAdmin.from("sms_messages").insert({
          org_id: orgId,
          contact_id: contactId,
          direction: "inbound",
          body: reply,
          status: "delivered",
          from_number: toNumber,
          to_number: "",
          sent_at: new Date().toISOString(),
        });
      }, replyDelay);
    }
  }, 2000);
}

/**
 * Simulate an SMS blast campaign. Faster timeline; SMS has no open/click.
 */
export async function simulateSmsBlast(campaignId: number) {
  await supabaseAdmin.from("campaigns").update({ status: "sending", updated_at: new Date().toISOString() }).eq("id", campaignId);

  const { data: recipients } = await supabaseAdmin
    .from("campaign_recipients").select("id").eq("campaign_id", campaignId);
  const ids = (recipients ?? []).map((r) => r.id as number);

  const failed = new Set(ids.filter(() => Math.random() < 0.03));

  setTimeout(async () => {
    for (const id of ids) {
      if (failed.has(id)) await markStatus(id, "failed");
      else await markStatus(id, "sent", "sent_at");
    }
  }, 1500);

  setTimeout(async () => {
    for (const id of ids) if (!failed.has(id)) await markStatus(id, "delivered");
  }, 4000);

  setTimeout(async () => {
    await supabaseAdmin
      .from("campaigns")
      .update({ status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", campaignId);
  }, 6000);
}
