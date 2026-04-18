/**
 * ticker.ts — background "world ticker" that makes the demo feel alive.
 *
 * Enabled by setting DEMO_MODE=1 (or DEMO_MODE=true) in the environment.
 * Every 30-120 seconds, picks a random action:
 *   - insert a new lead
 *   - insert a new call + transcript
 *   - mark a random campaign recipient as opened or clicked
 *   - create a notification
 *
 * Single-org only (reads DEMO_ORG_ID). Silent if org id missing.
 */

import { supabaseAdmin } from "../supabase";

const FIRST_NAMES = ["Marco", "Elena", "Jamal", "Priya", "Luis", "Aisha", "Dmitri", "Sofia", "Kenji", "Tamara", "Rafael", "Diana", "Trent", "Lacey", "Renee", "Dwight", "Monica", "Harper", "Malik"];
const LAST_NAMES = ["Hernandez", "Chen", "Patel", "O'Brien", "Washington", "Romano", "Nguyen", "Goldberg", "Silva", "Ibrahim", "Henderson", "Beaumont", "Koehler", "Levine", "Okafor", "Caldwell"];
// Roofing-demo addresses by market (used when DEMO_INDUSTRY=roofing)
const ROOFING_ADDRESSES = [
  "3340 Peachtree Rd NE, Atlanta, GA", "215 S Broad St, Monroe, GA",
  "4830 W Kennedy Blvd, Tampa, FL",   "520 N Orlando Ave, Winter Park, FL",
  "11500 Olive Blvd, Creve Coeur, MO", "7285 W 132nd St, Overland Park, KS",
];
const DEFAULT_ADDRESSES = [
  "82-14 Metropolitan Ave, Queens", "525 Nagle Ave, Manhattan",
  "22 Irving Ave, Brooklyn", "441 Fulton St, Brooklyn",
];
const ADDRESSES = process.env.DEMO_INDUSTRY === "roofing" ? ROOFING_ADDRESSES : DEFAULT_ADDRESSES;

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function phoneNumber() {
  const areaPool = process.env.DEMO_INDUSTRY === "roofing"
    ? ["470", "404", "770", "678", "813", "407", "904", "314", "816"]
    : ["212", "347", "646", "718", "917"];
  const area = pick(areaPool);
  return `(${area}) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`;
}

async function spawnLead(orgId: string) {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const isRoofing = process.env.DEMO_INDUSTRY === "roofing";
  const baseRow: Record<string, unknown> = {
    org_id: orgId, first_name: first, last_name: last,
    phone: phoneNumber(), email: `${first.toLowerCase()}.${last.toLowerCase()}@${pick(["gmail.com", "yahoo.com"])}`,
    address: pick(ADDRESSES),
    source: pick(["phone", "website", "referral"]),
    frequency: pick(["daily", "monthly"]),
    temperature: pick(["hot", "warm"]),
    stage: "new",
  };
  if (isRoofing) {
    // Attach to the most recent storm event so OpenClaw queries answer cleanly
    const { data: storms } = await supabaseAdmin.from("storm_events")
      .select("id, name").eq("org_id", orgId).order("event_date", { ascending: false }).limit(1);
    if (storms?.[0]) baseRow.storm_event_id = storms[0].id;
    baseRow.damage_type = "Hail + Wind";
    baseRow.insurance_carrier = pick(["State Farm", "Allstate", "Travelers", "Farmers"]);
    baseRow.estimated_retail_amount = Math.floor(Math.random() * 18000) + 9000;
  }
  const { data } = await supabaseAdmin.from("leads").insert(baseRow).select("id, first_name, last_name").single();

  if (data) {
    await supabaseAdmin.from("notifications").insert({
      org_id: orgId, type: "lead_created",
      title: isRoofing ? "New roofing lead" : "New lead",
      body: `${data.first_name} ${data.last_name} just came in`,
      entity_type: "lead", entity_id: data.id,
    });
  }
}

async function advanceInProgressJob(orgId: string) {
  const { data: jobs } = await supabaseAdmin.from("jobs")
    .select("id, status").eq("org_id", orgId).eq("status", "in_progress").limit(20);
  if (!jobs || jobs.length === 0) return;
  const target = pick(jobs);
  await supabaseAdmin.from("jobs").update({
    status: "punch_list",
    actual_end_date: new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
  }).eq("id", target.id);
  await supabaseAdmin.from("notifications").insert({
    org_id: orgId, type: "job_advance",
    title: "Job moved to punch list",
    body: `Job #${target.id} wrapped up — final walkthrough pending`,
    entity_type: "job", entity_id: target.id,
  });
}

async function adjusterApproval(orgId: string) {
  const { data: adjs } = await supabaseAdmin.from("insurance_adjusters")
    .select("id, name, carrier").eq("org_id", orgId).limit(12);
  if (!adjs || adjs.length === 0) return;
  const a = pick(adjs);
  const approved = Math.floor(Math.random() * 12000) + 6000;
  await supabaseAdmin.from("notifications").insert({
    org_id: orgId, type: "claim_approved",
    title: "Claim approved",
    body: `${a.name} (${a.carrier}) approved a claim for $${approved.toLocaleString()}`,
    entity_type: "adjuster", entity_id: a.id,
  });
}

async function nudgeCampaignRecipient(orgId: string) {
  const { data: campaigns } = await supabaseAdmin.from("campaigns").select("id")
    .eq("org_id", orgId).eq("status", "sent").limit(20);
  if (!campaigns || campaigns.length === 0) return;
  const cid = pick(campaigns).id;
  const { data: delivered } = await supabaseAdmin.from("campaign_recipients")
    .select("id").eq("campaign_id", cid).eq("status", "delivered").limit(50);
  if (!delivered || delivered.length === 0) return;
  const target = pick(delivered);
  await supabaseAdmin.from("campaign_recipients")
    .update({ status: "opened", opened_at: new Date().toISOString() })
    .eq("id", target.id);
}

async function tick(orgId: string) {
  const isRoofing = process.env.DEMO_INDUSTRY === "roofing";
  const action = Math.random();
  try {
    if (isRoofing) {
      if (action < 0.30) await spawnLead(orgId);
      else if (action < 0.50) await nudgeCampaignRecipient(orgId);
      else if (action < 0.70) await advanceInProgressJob(orgId);
      else if (action < 0.85) await adjusterApproval(orgId);
      else {
        await supabaseAdmin.from("notifications").insert({
          org_id: orgId, type: "system",
          title: "Morning snapshot",
          body: "10 jobs in progress, 14 claims pending, 35 unread notifications.",
        });
      }
    } else {
      if (action < 0.35) await spawnLead(orgId);
      else if (action < 0.75) await nudgeCampaignRecipient(orgId);
      else {
        await supabaseAdmin.from("notifications").insert({
          org_id: orgId, type: "system",
          title: "Morning snapshot",
          body: "Your AI agent handled 3 calls in the last hour.",
        });
      }
    }
  } catch (e: any) {
    console.warn("[ticker] tick failed:", e.message);
  }
}

let started = false;
export function startDemoTicker() {
  if (started) return;
  const enabled = process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true";
  if (!enabled) return;
  const orgId = process.env.DEMO_ORG_ID;
  if (!orgId) {
    console.log("[ticker] DEMO_MODE enabled but DEMO_ORG_ID not set — ticker idle.");
    return;
  }
  started = true;
  console.log(`[ticker] started for org ${orgId}`);
  const loop = () => {
    const delay = 30000 + Math.random() * 90000;
    setTimeout(async () => {
      await tick(orgId);
      loop();
    }, delay);
  };
  loop();
}
