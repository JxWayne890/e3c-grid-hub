/**
 * seed-demo.ts — Full demo seed script for the CRM.
 *
 * Usage:
 *   DEMO_ORG_ID=<uuid> npm run seed:demo
 *   npm run seed:demo -- --org <uuid>
 *   npm run seed:demo -- --org <uuid> --reset   (wipe demo rows first)
 *
 * This script grows feature-by-feature. Phase 1 seeds Leads only.
 * Later phases append calls, campaigns, employees, incidents, etc.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const argv = process.argv.slice(2);
function arg(name: string): string | undefined {
  const idx = argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return argv[idx + 1];
}
const hasFlag = (name: string) => argv.includes(`--${name}`);

const ORG_ID = arg("org") ?? process.env.DEMO_ORG_ID;
const RESET = hasFlag("reset");

if (!ORG_ID) {
  console.error("Missing org id. Pass --org <uuid> or set DEMO_ORG_ID.");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// ----- utilities -------------------------------------------------------------

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function weighted<T>(entries: ReadonlyArray<readonly [T, number]>): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [v, w] of entries) {
    r -= w;
    if (r <= 0) return v;
  }
  return entries[entries.length - 1][0];
}
function randomDaysAgo(maxDays: number): string {
  // Weighted toward recent: bias using sqrt
  const bias = Math.pow(Math.random(), 2);
  const days = Math.floor(bias * maxDays);
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return d.toISOString();
}

// ----- data pools (NYC-flavored) ---------------------------------------------

const FIRST_NAMES = [
  "Marco", "Elena", "Jamal", "Priya", "Luis", "Aisha", "Dmitri", "Sofia", "Kenji",
  "Tamara", "Rafael", "Noor", "Hannah", "Terrence", "Yasmin", "Giancarlo", "Leah",
  "Victor", "Anika", "Jordan", "Maya", "Cody", "Isabella", "Omar", "Natasha",
  "Xavier", "Chloe", "Declan", "Priscilla", "Mateo", "Harper", "Rashida",
  "Finn", "Valeria", "Ezra", "Selena", "Trevor", "Kiana", "Dante", "Renata",
];

const LAST_NAMES = [
  "Hernandez", "Chen", "Patel", "O'Brien", "Washington", "Romano", "Nguyen",
  "Goldberg", "Silva", "Ibrahim", "Morales", "Sokolov", "Kim", "Adeyemi",
  "Johansson", "Martinez", "Abdullah", "Rodriguez", "Ferrara", "Nakamura",
  "Singh", "Ellington", "Cortez", "Belov", "Okoye", "Panagakos", "Vargas",
];

const NYC_ADDRESSES = [
  "82-14 Metropolitan Ave, Middle Village, NY 11379",
  "525 Nagle Ave, New York, NY 10034",
  "1845 Henry Hudson Pkwy W, Bronx, NY 10461",
  "441 Fulton St, Brooklyn, NY 11201",
  "22 Irving Ave, Brooklyn, NY 11237",
  "3101 W 231st St, Bronx, NY 10463",
  "2035 W 135th St (The Arches), New York, NY 10030",
  "110 Johnson Ave, Brooklyn, NY 11206",
  "267 Bedford Ave, Brooklyn, NY 11211",
  "98 Berry St, Brooklyn, NY 11249",
  "1500 Broadway, New York, NY 10036",
  "350 5th Ave, New York, NY 10118",
];

const SOURCES = ["phone", "walk_in", "website", "referral", "third_party"] as const;
const FREQUENCIES = ["hourly", "daily", "monthly"] as const;
const TEMPERATURES = ["hot", "warm", "cold"] as const;
const STAGES = ["new", "contacted", "qualified", "negotiating", "won", "lost"] as const;

// Weighted distributions so the board looks realistic
const STAGE_WEIGHTS: Array<readonly [typeof STAGES[number], number]> = [
  ["new", 10], ["contacted", 8], ["qualified", 6], ["negotiating", 4], ["won", 3], ["lost", 3],
];
const TEMP_WEIGHTS: Array<readonly [typeof TEMPERATURES[number], number]> = [
  ["hot", 3], ["warm", 5], ["cold", 2],
];
const SOURCE_WEIGHTS: Array<readonly [typeof SOURCES[number], number]> = [
  ["phone", 4], ["walk_in", 2], ["website", 5], ["referral", 3], ["third_party", 2],
];
const FREQ_WEIGHTS: Array<readonly [typeof FREQUENCIES[number], number]> = [
  ["hourly", 2], ["daily", 3], ["monthly", 5],
];

function phoneNumber(): string {
  const area = pick(["212", "347", "646", "718", "917", "929"]);
  const mid = String(Math.floor(Math.random() * 900 + 100));
  const end = String(Math.floor(Math.random() * 9000 + 1000));
  return `(${area}) ${mid}-${end}`;
}

function emailFor(first: string, last: string): string {
  const hosts = ["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "proton.me"];
  const sep = pick(["", ".", "_"]);
  return `${first.toLowerCase()}${sep}${last.toLowerCase().replace(/[^a-z]/g, "")}${Math.floor(Math.random() * 90 + 10)}@${pick(hosts)}`;
}

// ----- seed: leads -----------------------------------------------------------

async function seedLeads() {
  if (RESET) {
    const { error } = await sb.from("leads").delete().eq("org_id", ORG_ID);
    if (error) console.warn(`[leads] reset warning: ${error.message}`);
    else console.log(`[leads] cleared existing leads for org ${ORG_ID}`);
  }

  const rows: Array<Record<string, unknown>> = [];
  const target = 42;

  for (let i = 0; i < target; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const stage = weighted(STAGE_WEIGHTS);
    const temperature = weighted(TEMP_WEIGHTS);
    const source = weighted(SOURCE_WEIGHTS);
    const frequency = weighted(FREQ_WEIGHTS);
    const createdAt = randomDaysAgo(180);

    rows.push({
      org_id: ORG_ID,
      first_name: first,
      last_name: last,
      phone: phoneNumber(),
      email: emailFor(first, last),
      address: pick(NYC_ADDRESSES),
      source,
      frequency,
      temperature,
      stage,
      notes: pick([
        "",
        "Called about monthly parking near work.",
        "Wants daily rate for overnight stays.",
        "Referred by existing customer.",
        "Price-sensitive — comparing to competitor.",
        "Needs SUV-compatible spot.",
        "Walked in asking about valet service.",
      ]),
      created_at: createdAt,
      updated_at: createdAt,
    });
  }

  const { data, error } = await sb.from("leads").insert(rows).select("id");
  if (error) throw new Error(`[leads] insert failed: ${error.message}`);
  console.log(`[leads] inserted ${data?.length ?? 0} rows`);
}

// ----- seed: voice agents, calls, transcripts, chat sessions -----------------

const CALL_TYPES = ["sales", "support", "general", "billing"] as const;
const DISPOSITIONS = [
  "lead_created",
  "transferred_to_live_agent",
  "scheduled_callback",
  "info_provided",
  "no_answer",
] as const;

const CALL_TYPE_WEIGHTS: Array<readonly [typeof CALL_TYPES[number], number]> = [
  ["general", 4], ["sales", 3], ["support", 2], ["billing", 1],
];
const DISPO_WEIGHTS: Array<readonly [typeof DISPOSITIONS[number], number]> = [
  ["info_provided", 5], ["lead_created", 3], ["transferred_to_live_agent", 2],
  ["scheduled_callback", 2], ["no_answer", 1],
];

// Transcript scenarios — each returns { turns, summary, next_steps }.
type Scenario = { type: typeof CALL_TYPES[number]; disposition: typeof DISPOSITIONS[number]; gen: (callerName: string) => {
  turns: { speaker: "agent" | "caller"; text: string }[];
  summary: string;
  next_steps: string[];
} };

const SCENARIOS: Scenario[] = [
  {
    type: "sales", disposition: "lead_created",
    gen: (name) => ({
      turns: [
        { speaker: "agent", text: "Thanks for calling GridWorker Parking — this is Nina, how can I help?" },
        { speaker: "caller", text: `Hi, I'm ${name}. I'm looking for monthly parking near Williamsburg.` },
        { speaker: "agent", text: "Great — are you looking for uncovered, covered, or indoor?" },
        { speaker: "caller", text: "Covered if possible. I drive a mid-size SUV." },
        { speaker: "agent", text: "We have covered monthly spots at our Metropolitan Ave location for $385/month, and at Berry Street for $425. Both fit an SUV." },
        { speaker: "caller", text: "Is there 24/7 access?" },
        { speaker: "agent", text: "Yes, 24/7 keycard access at both. I can put you on a waitlist and have a manager call you back with the exact availability. What's the best number to reach you?" },
        { speaker: "caller", text: "This number is fine. Email me the brochure as well." },
        { speaker: "agent", text: "Will do — you'll get the brochure within the hour and a callback before end of day." },
      ],
      summary: `Inbound sales inquiry from ${name}. Interested in covered monthly parking in Williamsburg for a mid-size SUV. Quoted $385 (Metropolitan) and $425 (Berry). Requested brochure and callback.`,
      next_steps: [
        "Email brochure with Metropolitan + Berry Street options",
        "Schedule callback from a sales manager today",
        "Create lead with temperature=hot, source=phone",
      ],
    }),
  },
  {
    type: "support", disposition: "info_provided",
    gen: (name) => ({
      turns: [
        { speaker: "agent", text: "Thanks for calling — this is Marcus at GridWorker Support." },
        { speaker: "caller", text: `Hi Marcus, this is ${name}. My access card stopped working at the Nagle Ave garage.` },
        { speaker: "agent", text: "Sorry to hear that. When did it stop working?" },
        { speaker: "caller", text: "About an hour ago. The gate won't raise." },
        { speaker: "agent", text: "I see your card in the system — looks like a deactivation from the billing side. Let me re-activate it now." },
        { speaker: "caller", text: "Okay." },
        { speaker: "agent", text: "Done. Please try the gate again. The re-activation takes effect within two minutes." },
        { speaker: "caller", text: "Worked. Thanks." },
        { speaker: "agent", text: "Glad that's resolved. Have a good day." },
      ],
      summary: `${name} reported access card failure at Nagle Ave location. Card was flagged by billing; re-activated during the call. Customer confirmed gate now opens.`,
      next_steps: [
        "Follow up with billing team to check why the deactivation triggered",
        "Add note to contact record about reactivation",
      ],
    }),
  },
  {
    type: "billing", disposition: "transferred_to_live_agent",
    gen: (name) => ({
      turns: [
        { speaker: "agent", text: "GridWorker Parking, this is Ava. How can I help?" },
        { speaker: "caller", text: `Hi, I'm ${name}. I was charged twice for my monthly plan this month.` },
        { speaker: "agent", text: "I'm sorry about that. I can see your account — I do see two $385 charges posted the same day." },
        { speaker: "caller", text: "Yes. Can you refund one?" },
        { speaker: "agent", text: "That needs to be handled by a billing specialist. Let me transfer you now — one moment." },
        { speaker: "caller", text: "Thanks." },
      ],
      summary: `${name} flagged a duplicate monthly charge ($385 x2). Transferred to billing specialist for refund processing.`,
      next_steps: [
        "Billing team to process refund for duplicate charge",
        "Review payment processor logs for duplicate-charge cause",
      ],
    }),
  },
  {
    type: "general", disposition: "info_provided",
    gen: (name) => ({
      turns: [
        { speaker: "agent", text: "GridWorker Parking, this is Leo. How can I help?" },
        { speaker: "caller", text: `Hi, I'm ${name}. What are your daily rates at the Fulton Street garage?` },
        { speaker: "agent", text: "Daily rate at Fulton is $28 for up to 12 hours, $42 for 12-24 hours. Early-bird in before 9am is $22." },
        { speaker: "caller", text: "Do you offer validation with local businesses?" },
        { speaker: "agent", text: "Yes — we validate with the Fulton Mall retailers and the courthouse complex. 20% off with a validated ticket." },
        { speaker: "caller", text: "Perfect, thanks." },
      ],
      summary: `General pricing inquiry for Fulton Street location. Quoted standard daily, 24-hour, and early-bird rates. Confirmed validation partnerships with mall retailers and courthouse.`,
      next_steps: [],
    }),
  },
  {
    type: "sales", disposition: "scheduled_callback",
    gen: (name) => ({
      turns: [
        { speaker: "agent", text: "GridWorker Parking, Nina speaking." },
        { speaker: "caller", text: `Hi, I'm ${name}. Looking into fleet parking for 12 delivery vans.` },
        { speaker: "agent", text: "We handle fleet deals. Our sales manager Elena covers enterprise — would tomorrow at 10am work for a callback?" },
        { speaker: "caller", text: "Yes, that works. Use this number." },
        { speaker: "agent", text: "Confirmed. You'll get a calendar invite right after this call." },
      ],
      summary: `${name} inquired about fleet parking for 12 delivery vans. Callback scheduled with Elena tomorrow at 10am.`,
      next_steps: [
        "Send calendar invite for 10am callback",
        "Prepare fleet rate sheet ahead of call",
      ],
    }),
  },
  {
    type: "support", disposition: "scheduled_callback",
    gen: (name) => ({
      turns: [
        { speaker: "agent", text: "GridWorker Support, Marcus speaking." },
        { speaker: "caller", text: `Hi, I'm ${name}. I noticed a dent on my bumper after picking up last night at Berry Street.` },
        { speaker: "agent", text: "I'm sorry to hear that. We'll pull the security footage from that gate. I need a location manager to call you back with the review." },
        { speaker: "caller", text: "Alright. I left around 7:30pm." },
        { speaker: "agent", text: "Noted. Manager will call you within 24 hours." },
      ],
      summary: `${name} reported possible vehicle damage (dent) at Berry Street pickup ~7:30pm. Security footage review scheduled with manager callback in 24h.`,
      next_steps: [
        "Pull security footage from Berry Street gate 7:15-7:45pm",
        "Location manager to call customer back within 24 hours",
        "Log incident report",
      ],
    }),
  },
  {
    type: "general", disposition: "no_answer",
    gen: (name) => ({
      turns: [
        { speaker: "agent", text: "Thanks for calling GridWorker Parking. How can I help?" },
        { speaker: "caller", text: "" },
        { speaker: "agent", text: "Hello? If you can hear me, please say something." },
        { speaker: "caller", text: "" },
      ],
      summary: `No response from caller ${name}. Possible pocket-dial or bad connection.`,
      next_steps: [],
    }),
  },
];

async function seedVoiceAgents(): Promise<number[]> {
  if (RESET) await sb.from("voice_agents").delete().eq("org_id", ORG_ID);

  const agents = [
    { name: "Nina — Frontdesk", voice: "nina",   greeting: "Thanks for calling GridWorker Parking, this is Nina. How can I help?", is_active: true },
    { name: "Marcus — Support", voice: "marcus", greeting: "GridWorker Support, this is Marcus. What's going on?",                  is_active: true },
    { name: "Ava — Billing",    voice: "ava",    greeting: "GridWorker Billing, this is Ava. How can I help?",                       is_active: true },
    { name: "Leo — Sales",      voice: "leo",    greeting: "GridWorker Sales, this is Leo. What are you looking for?",               is_active: false },
  ];
  const { data, error } = await sb.from("voice_agents")
    .insert(agents.map((a) => ({
      org_id: ORG_ID,
      name: a.name,
      voice: a.voice,
      greeting: a.greeting,
      system_prompt: `You are ${a.name.split(" — ")[0]}, a helpful AI receptionist at GridWorker Parking.`,
      tools_enabled: ["list_locations", "create_lead", "schedule_callback"],
      is_active: a.is_active,
    })))
    .select("id");
  if (error) throw new Error(`[voice_agents] insert failed: ${error.message}`);
  console.log(`[voice_agents] inserted ${data?.length ?? 0} rows`);
  return (data ?? []).map((r) => r.id as number);
}

async function seedCallsAndTranscripts(agentIds: number[]) {
  if (RESET) await sb.from("calls").delete().eq("org_id", ORG_ID); // transcripts cascade

  const target = 28;
  const callRows: Array<Record<string, unknown>> = [];
  const scenarioAssignments: Array<{ scenario: Scenario; callerName: string }> = [];

  for (let i = 0; i < target; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const callerName = `${first} ${last}`;
    const startedAt = randomDaysAgo(60);
    const callType = weighted(CALL_TYPE_WEIGHTS);
    const disposition = weighted(DISPO_WEIGHTS);
    const duration = disposition === "no_answer"
      ? Math.floor(Math.random() * 10) + 5
      : Math.floor(Math.random() * 280) + 60;
    const endedAt = new Date(new Date(startedAt).getTime() + duration * 1000).toISOString();

    const scenario =
      SCENARIOS.find((s) => s.type === callType && s.disposition === disposition) ??
      SCENARIOS.find((s) => s.type === callType) ??
      pick(SCENARIOS);

    scenarioAssignments.push({ scenario, callerName });

    callRows.push({
      org_id: ORG_ID,
      contact_id: null,
      voice_agent_id: agentIds.length > 0 ? pick(agentIds) : null,
      direction: "inbound",
      caller_name: callerName,
      caller_phone: phoneNumber(),
      call_type: callType,
      disposition,
      duration_seconds: duration,
      recording_url: `https://demo-recordings.example/${Math.random().toString(36).slice(2, 10)}.mp3`,
      started_at: startedAt,
      ended_at: endedAt,
    });
  }

  const { data: calls, error } = await sb.from("calls").insert(callRows).select("id, started_at");
  if (error) throw new Error(`[calls] insert failed: ${error.message}`);
  console.log(`[calls] inserted ${calls?.length ?? 0} rows`);

  const transcriptRows = (calls ?? []).map((call, i) => {
    const { scenario, callerName } = scenarioAssignments[i];
    const content = scenario.gen(callerName);
    const baseTs = new Date(call.started_at as string).getTime();
    const turns = content.turns.map((t, idx) => ({
      speaker: t.speaker,
      text: t.text,
      timestamp: new Date(baseTs + idx * 8000).toISOString(),
    }));
    return {
      call_id: call.id,
      turns,
      summary: content.summary,
      next_steps: content.next_steps,
    };
  });

  const { error: terr } = await sb.from("call_transcripts").insert(transcriptRows);
  if (terr) throw new Error(`[call_transcripts] insert failed: ${terr.message}`);
  console.log(`[call_transcripts] inserted ${transcriptRows.length} rows`);
}

async function seedChatSessions() {
  if (RESET) await sb.from("chat_sessions").delete().eq("org_id", ORG_ID);

  const chatTemplates = [
    {
      q: "What are your rates for monthly parking in Brooklyn?",
      reply: "Our monthly rates in Brooklyn range from $325 (Fulton St) to $425 (Berry St). Covered spots run $60-75 more per month.",
      summary: "Visitor asked about monthly rates in Brooklyn. Provided range.",
    },
    {
      q: "Do you have a valet service?",
      reply: "Yes, valet is available at our Metropolitan Ave and Fulton Street locations. $18 daily valet or $520 monthly.",
      summary: "Visitor asked about valet; provided locations and pricing.",
    },
    {
      q: "Can I cancel my membership?",
      reply: "Yes, you can cancel at any time from the customer portal. Cancellations take effect at the end of your current billing cycle.",
      summary: "Visitor asked about cancellation policy. No churn action taken.",
    },
    {
      q: "Do you offer discounts for EV owners?",
      reply: "We offer 10% off monthly plans for EV owners at locations with charging stations: Metropolitan Ave, Berry St, and Fulton St.",
      summary: "Visitor asked about EV discount; provided discount details and eligible locations.",
    },
    {
      q: "Is there overnight parking near Williamsburg?",
      reply: "Yes — Berry Street and Bedford Ave both offer overnight parking. $22 overnight rate, in by 7pm and out by 8am.",
      summary: "Visitor asked about overnight Williamsburg parking. Quoted $22 overnight.",
    },
  ];

  const rows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 16; i++) {
    const first = pick(FIRST_NAMES);
    const template = pick(chatTemplates);
    const started = randomDaysAgo(45);
    const endedAt = new Date(new Date(started).getTime() + (Math.floor(Math.random() * 300) + 60) * 1000).toISOString();
    rows.push({
      org_id: ORG_ID,
      channel: Math.random() > 0.5 ? "website" : "widget",
      visitor_name: `${first} ${pick(LAST_NAMES)}`,
      transcript: [
        { speaker: "visitor", text: template.q, timestamp: started },
        { speaker: "agent", text: template.reply, timestamp: new Date(new Date(started).getTime() + 4000).toISOString() },
        { speaker: "visitor", text: "Thanks!", timestamp: new Date(new Date(started).getTime() + 9000).toISOString() },
      ],
      summary: template.summary,
      status: Math.random() > 0.15 ? "ended" : "abandoned",
      started_at: started,
      ended_at: endedAt,
    });
  }
  const { data, error } = await sb.from("chat_sessions").insert(rows).select("id");
  if (error) throw new Error(`[chat_sessions] insert failed: ${error.message}`);
  console.log(`[chat_sessions] inserted ${data?.length ?? 0} rows`);
}

// ----- seed: campaigns + recipients ------------------------------------------

type CampaignSeed = {
  name: string;
  type: "email" | "sms";
  subject?: string;
  body: string;
  status: "sent" | "draft" | "scheduled" | "sending";
  daysAgo: number;
  audienceSize: number;
  // Distributions for sent campaigns
  openRate?: number;
  clickRate?: number;
  bounceRate?: number;
};

const CAMPAIGN_SEEDS: CampaignSeed[] = [
  {
    name: "April Monthly Rate Reminder",
    type: "email",
    subject: "Your April parking spot is ready",
    body: "Hi {{first_name}},\n\nJust a reminder — your April monthly parking is active and your keycard is ready for pickup. Text us if anything changes.\n\n— GridWorker",
    status: "sent", daysAgo: 14, audienceSize: 86,
    openRate: 0.48, clickRate: 0.12, bounceRate: 0.02,
  },
  {
    name: "Winter Overnight Promo",
    type: "email",
    subject: "$19 overnight parking — this week only",
    body: "Hi {{first_name}},\n\nOvernight parking is just $19 this week at Berry St and Bedford Ave. Book by Friday.\n\n— GridWorker",
    status: "sent", daysAgo: 32, audienceSize: 140,
    openRate: 0.41, clickRate: 0.14, bounceRate: 0.03,
  },
  {
    name: "Winback: Churned Customers",
    type: "email",
    subject: "We miss you — 20% off monthly",
    body: "Hi {{first_name}},\n\nHaven't seen you in a few months. Come back and get 20% off your first monthly cycle. Reply YES to reactivate.\n\n— GridWorker",
    status: "sent", daysAgo: 58, audienceSize: 42,
    openRate: 0.33, clickRate: 0.08, bounceRate: 0.05,
  },
  {
    name: "Flash SMS: Event Parking Williamsburg",
    type: "sms",
    body: "GridWorker: Event parking near Williamsburg Waterfront tonight — $22 flat, in/out 6pm-1am. Reply STOP to opt out.",
    status: "sent", daysAgo: 6, audienceSize: 95,
    openRate: 1.0, clickRate: 0, bounceRate: 0.03,
  },
  {
    name: "Q2 Referral Program Launch",
    type: "email",
    subject: "Refer a friend, get a free month",
    body: "Hi {{first_name}},\n\nOur Q2 referral program is live: refer a friend who signs up for monthly parking and you both get a free month.\n\n— GridWorker",
    status: "scheduled", daysAgo: -2, audienceSize: 210,
  },
  {
    name: "New Fleet Rate Announcement",
    type: "email",
    subject: "Draft: Fleet rates for 5+ vehicles",
    body: "Hi {{first_name}},\n\nWe're rolling out flat fleet rates starting at $340/vehicle for 5+ vehicles. Want an estimate?\n\n— GridWorker",
    status: "draft", daysAgo: 0, audienceSize: 0,
  },
];

async function seedCampaigns() {
  if (RESET) {
    await sb.from("campaigns").delete().eq("org_id", ORG_ID); // recipients cascade
  }

  // Load up to N contact ids to use as recipients for sent campaigns.
  const { data: contacts } = await sb.from("contacts")
    .select("id, email, phone")
    .eq("org_id", ORG_ID)
    .limit(300);
  const pool = (contacts ?? []).filter((c: any) => c.email);

  for (const seed of CAMPAIGN_SEEDS) {
    const scheduledAt = seed.status === "scheduled" ? new Date(Date.now() + 3 * 86400000).toISOString() : null;
    const sentAt = seed.status === "sent" ? new Date(Date.now() - seed.daysAgo * 86400000).toISOString() : null;

    const { data: campaign, error } = await sb.from("campaigns").insert({
      org_id: ORG_ID,
      name: seed.name,
      type: seed.type,
      audience_filter: seed.status === "sent" ? { stage: ["qualified", "won"] } : {},
      audience_size: seed.audienceSize,
      subject: seed.subject ?? "",
      body: seed.body,
      status: seed.status,
      scheduled_at: scheduledAt,
      sent_at: sentAt,
      created_at: new Date(Date.now() - Math.max(seed.daysAgo, 0) * 86400000 - 86400000).toISOString(),
    }).select().single();
    if (error) { console.warn(`[campaigns] insert "${seed.name}" failed: ${error.message}`); continue; }

    if (seed.status === "sent" && pool.length > 0) {
      const take = Math.min(seed.audienceSize, pool.length);
      const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, take);
      const bounced = seed.bounceRate ?? 0;
      const openRate = seed.openRate ?? 0;
      const clickRate = seed.clickRate ?? 0;
      const baseTs = new Date(sentAt!).getTime();

      const recipientRows = shuffled.map((c: any, i) => {
        const isBounced = Math.random() < bounced;
        const isOpened = !isBounced && Math.random() < openRate;
        const isClicked = isOpened && Math.random() < clickRate / Math.max(openRate, 0.01);
        const status: string =
          isBounced ? "bounced"
          : isClicked ? "clicked"
          : isOpened ? "opened"
          : "delivered";
        const jitter = i * 500 + Math.random() * 2000;
        return {
          campaign_id: campaign.id,
          contact_id: c.id,
          to_email: seed.type === "email" ? c.email : "",
          to_phone: seed.type === "sms" ? (c.phone || phoneNumber()) : "",
          status,
          sent_at: isBounced ? null : new Date(baseTs + jitter).toISOString(),
          opened_at: isOpened ? new Date(baseTs + jitter + 3600_000).toISOString() : null,
          clicked_at: isClicked ? new Date(baseTs + jitter + 7200_000).toISOString() : null,
        };
      });

      // insert in chunks of 500 to stay safe
      for (let i = 0; i < recipientRows.length; i += 500) {
        const chunk = recipientRows.slice(i, i + 500);
        const { error: rerr } = await sb.from("campaign_recipients").insert(chunk);
        if (rerr) console.warn(`[campaign_recipients] chunk failed: ${rerr.message}`);
      }
    }
  }

  console.log(`[campaigns] inserted ${CAMPAIGN_SEEDS.length} campaigns`);
}

// ----- seed: HR (employees, incidents, write-ups, intakes) -------------------

const EMPLOYEE_ROLES = ["manager", "supervisor", "attendant", "valet", "admin"] as const;
const ROLE_WEIGHTS: Array<readonly [typeof EMPLOYEE_ROLES[number], number]> = [
  ["attendant", 6], ["valet", 4], ["supervisor", 2], ["manager", 1], ["admin", 1],
];

async function seedHR(locationIds: number[]) {
  if (RESET) {
    await sb.from("employee_intakes").delete().eq("org_id", ORG_ID);
    await sb.from("write_ups").delete().eq("org_id", ORG_ID);
    await sb.from("incident_reports").delete().eq("org_id", ORG_ID);
    await sb.from("employees").delete().eq("org_id", ORG_ID);
  }

  // Employees
  const empRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 23; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    empRows.push({
      org_id: ORG_ID,
      first_name: first,
      last_name: last,
      role: weighted(ROLE_WEIGHTS),
      location_id: locationIds.length ? pick(locationIds) : null,
      hire_date: new Date(Date.now() - Math.floor(Math.random() * 900) * 86400000).toISOString().slice(0, 10),
      status: Math.random() < 0.85 ? "active" : Math.random() < 0.6 ? "on_leave" : "terminated",
      phone: phoneNumber(),
      email: emailFor(first, last).replace(/@.*/, "@gridworker.demo"),
    });
  }
  const { data: empIds, error: empErr } = await sb.from("employees").insert(empRows).select("id");
  if (empErr) throw new Error(`[employees] insert failed: ${empErr.message}`);
  console.log(`[employees] inserted ${empIds?.length ?? 0} rows`);

  const employeeIds = (empIds ?? []).map((r) => r.id as number);

  // Write-ups (some employees get 3+ → flagged)
  const writeUpRows: Array<Record<string, unknown>> = [];
  const reasons = [
    "Tardiness — late 15+ minutes",
    "Uniform policy violation",
    "Customer complaint — rudeness",
    "Missed scheduled shift without notice",
    "Unauthorized cash register variance",
    "Safety protocol not followed",
  ];
  const severities = ["verbal", "written", "final"] as const;
  for (let i = 0; i < 9; i++) {
    const empId = pick(employeeIds);
    writeUpRows.push({
      org_id: ORG_ID,
      employee_id: empId,
      write_up_date: new Date(Date.now() - Math.floor(Math.random() * 240) * 86400000).toISOString().slice(0, 10),
      reason: pick(reasons),
      description: "Documented incident. Follow-up scheduled.",
      severity: pick(severities),
    });
  }
  // Force one employee to have 3 write-ups (flagged)
  const flaggedEmp = pick(employeeIds);
  for (let i = 0; i < 3; i++) {
    writeUpRows.push({
      org_id: ORG_ID,
      employee_id: flaggedEmp,
      write_up_date: new Date(Date.now() - (180 - i * 45) * 86400000).toISOString().slice(0, 10),
      reason: pick(reasons),
      description: "Pattern of concern.",
      severity: i === 2 ? "final" : "written",
    });
  }
  const { error: wuErr } = await sb.from("write_ups").insert(writeUpRows);
  if (wuErr) throw new Error(`[write_ups] insert failed: ${wuErr.message}`);
  console.log(`[write_ups] inserted ${writeUpRows.length} rows`);

  // Incidents
  const incidentTypes = ["damage", "theft", "injury", "customer_complaint", "safety", "other"] as const;
  const incSeverities = ["low", "medium", "high", "critical"] as const;
  const incStatuses = ["open", "investigating", "resolved"] as const;
  const incDescriptions = [
    "Vehicle bumper scratched during valet return",
    "Reported missing item from customer vehicle — pending review",
    "Employee slipped on wet floor in booth — minor injury",
    "Customer complained about long wait at exit gate",
    "Fire extinguisher tag expired — replaced same day",
    "Gate arm damaged by vehicle impact",
    "Lost key fob returned — no damage",
    "Customer reported fuel gauge lower after valet",
    "Exit terminal offline for 45 min — manual entry used",
    "Payment card reader jammed — tech dispatched",
    "Guest slipped on ice near stairwell — salted",
    "Employee altercation with intoxicated customer",
  ];
  const incidentRows = incDescriptions.map((desc, i) => ({
    org_id: ORG_ID,
    employee_id: Math.random() < 0.7 ? pick(employeeIds) : null,
    location_id: locationIds.length ? pick(locationIds) : null,
    incident_date: randomDaysAgo(120),
    type: pick(incidentTypes),
    severity: pick(incSeverities),
    description: desc,
    status: incStatuses[Math.min(i % 3, 2)],
  }));
  const { error: incErr } = await sb.from("incident_reports").insert(incidentRows);
  if (incErr) throw new Error(`[incident_reports] insert failed: ${incErr.message}`);
  console.log(`[incident_reports] inserted ${incidentRows.length} rows`);

  // Intakes
  const intakeStatuses = ["applied", "screening", "interview", "offer", "hired", "rejected"] as const;
  const intakeRoles = ["attendant", "valet", "supervisor", "manager"];
  const intakeRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 6; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    intakeRows.push({
      org_id: ORG_ID,
      applicant_name: `${first} ${last}`,
      email: emailFor(first, last),
      phone: phoneNumber(),
      role_applied: pick(intakeRoles),
      status: pick(intakeStatuses),
      notes: "",
      created_at: randomDaysAgo(60),
    });
  }
  const { error: intakeErr } = await sb.from("employee_intakes").insert(intakeRows);
  if (intakeErr) throw new Error(`[employee_intakes] insert failed: ${intakeErr.message}`);
  console.log(`[employee_intakes] inserted ${intakeRows.length} rows`);
}

// ----- seed: locations -------------------------------------------------------

const LOCATION_SEEDS = [
  { name: "Metropolitan Ave", address: "82-14 Metropolitan Ave", city: "Middle Village", state: "NY", zip: "11379", capacity: 180, monthly: 385, hourly: 8, daily: 28 },
  { name: "Nagle Ave",         address: "525 Nagle Ave",         city: "New York",       state: "NY", zip: "10034", capacity: 120, monthly: 345, hourly: 7, daily: 24 },
  { name: "Henry Hudson Pkwy", address: "1845 Henry Hudson Pkwy W", city: "Bronx",       state: "NY", zip: "10461", capacity: 95,  monthly: 315, hourly: 6, daily: 22 },
  { name: "Fulton St",         address: "441 Fulton St",         city: "Brooklyn",       state: "NY", zip: "11201", capacity: 210, monthly: 365, hourly: 9, daily: 28 },
  { name: "Irving Ave",        address: "22 Irving Ave",         city: "Brooklyn",       state: "NY", zip: "11237", capacity: 75,  monthly: 325, hourly: 6, daily: 22 },
  { name: "231st St",          address: "3101 W 231st St",       city: "Bronx",          state: "NY", zip: "10463", capacity: 140, monthly: 335, hourly: 7, daily: 24 },
  { name: "The Arches — 135th St", address: "2035 W 135th St", city: "New York",       state: "NY", zip: "10030", capacity: 160, monthly: 375, hourly: 8, daily: 26 },
  { name: "Johnson Ave",       address: "110 Johnson Ave",       city: "Brooklyn",       state: "NY", zip: "11206", capacity: 110, monthly: 355, hourly: 7, daily: 25 },
];

async function seedLocations(): Promise<number[]> {
  if (RESET) await sb.from("locations").delete().eq("org_id", ORG_ID);
  const rows = LOCATION_SEEDS.map((l) => ({
    org_id: ORG_ID, name: l.name, address: l.address, city: l.city, state: l.state, zip: l.zip,
    capacity: l.capacity, monthly_rate: l.monthly, hourly_rate: l.hourly, daily_rate: l.daily,
    amenities: ["24/7 access", Math.random() > 0.5 ? "covered" : "EV charging", "keycard entry"],
    is_active: true,
  }));
  const { data, error } = await sb.from("locations").insert(rows).select("id");
  if (error) throw new Error(`[locations] insert failed: ${error.message}`);
  console.log(`[locations] inserted ${data?.length ?? 0} rows`);
  return (data ?? []).map((r) => r.id as number);
}

// ----- seed: SMS threads -----------------------------------------------------

async function seedSmsThreads() {
  if (RESET) await sb.from("sms_messages").delete().eq("org_id", ORG_ID);

  const { data: contacts } = await sb.from("contacts").select("id, phone").eq("org_id", ORG_ID).not("phone", "is", null).limit(50);
  const pool = (contacts ?? []).filter((c: any) => c.phone).slice(0, 15);

  const templates = [
    ["Hey — just confirming your monthly parking starts Monday the 1st. Keycard is at the front desk.",
     "Got it, thanks!",
     "Great — let us know if anything comes up.",
     "Quick question — does the gate close at midnight?",
     "24/7 keycard access, no gate hours.",
     "Perfect, thanks!"],
    ["Reminder: your April invoice is due Friday. Reply PAY to use saved card.",
     "PAY",
     "Processed. You'll get a receipt shortly."],
    ["Hi! Saw you looked at our Berry St location. Happy to answer any questions.",
     "What's the covered monthly rate?",
     "$425 covered, $365 uncovered. 24/7 access at both tiers.",
     "Thanks, I'll think about it."],
    ["GridWorker: your valet pickup is ready at Fulton St.",
     "On my way!"],
  ];

  const allRows: Array<Record<string, unknown>> = [];
  for (const contact of pool) {
    const template = templates[Math.floor(Math.random() * templates.length)];
    const baseTs = Date.now() - Math.floor(Math.random() * 14 * 86400000);
    template.forEach((body, i) => {
      const direction = i % 2 === 0 ? "outbound" : "inbound";
      const ts = new Date(baseTs + i * 3 * 60 * 1000).toISOString();
      allRows.push({
        org_id: ORG_ID,
        contact_id: (contact as any).id,
        direction,
        body,
        status: "delivered",
        from_number: direction === "outbound" ? "+18005551234" : (contact as any).phone,
        to_number: direction === "outbound" ? (contact as any).phone : "+18005551234",
        sent_at: ts,
        created_at: ts,
      });
    });
  }

  if (allRows.length > 0) {
    const { error } = await sb.from("sms_messages").insert(allRows);
    if (error) console.warn(`[sms_messages] insert failed: ${error.message}`);
    else console.log(`[sms_messages] inserted ${allRows.length} rows across ${pool.length} threads`);
  }
}

// ----- main ------------------------------------------------------------------

async function main() {
  console.log(`Seeding demo data for org ${ORG_ID}${RESET ? " (with reset)" : ""}...`);
  const locationIds = await seedLocations().catch((e) => {
    console.warn(`[locations] skipped: ${e.message} (run locations migration if table missing)`);
    return [] as number[];
  });
  await seedLeads();
  const agentIds = await seedVoiceAgents();
  await seedCallsAndTranscripts(agentIds);
  await seedChatSessions();
  await seedCampaigns();
  await seedHR(locationIds).catch((e) => console.warn(`[hr] skipped: ${e.message}`));
  await seedSmsThreads().catch((e) => console.warn(`[sms] skipped: ${e.message}`));
  await seedNotifications().catch((e) => console.warn(`[notifications] skipped: ${e.message}`));
  console.log("Done.");
}

async function seedNotifications() {
  if (RESET) await sb.from("notifications").delete().eq("org_id", ORG_ID);
  const seeds = [
    { type: "lead_created", title: "New hot lead", body: "Elena Hernandez called about monthly parking", hoursAgo: 0.5 },
    { type: "call_lead", title: "AI agent created a lead", body: "Marcus handled an inbound call → lead_created", hoursAgo: 2 },
    { type: "campaign_sent", title: "Campaign 'April Monthly Rate Reminder' sent", body: "86 recipients", hoursAgo: 6 },
    { type: "incident", title: "New incident filed", body: "Damage report at Berry Street", hoursAgo: 18 },
    { type: "write_up", title: "Write-up issued", body: "Tardiness — Written severity", hoursAgo: 26 },
    { type: "system", title: "Nightly backup complete", body: "All data backed up successfully", hoursAgo: 10 },
  ];
  const rows = seeds.map((s, i) => ({
    org_id: ORG_ID, type: s.type, title: s.title, body: s.body,
    read: i >= 4,
    created_at: new Date(Date.now() - s.hoursAgo * 3600 * 1000).toISOString(),
  }));
  const { error } = await sb.from("notifications").insert(rows);
  if (error) throw new Error(error.message);
  console.log(`[notifications] inserted ${rows.length} rows`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
