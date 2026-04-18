/**
 * seed-restore-america.ts — Full Restore America Roofing & Restoration demo seed.
 *
 * Usage:
 *   DEMO_ORG_ID=<uuid> DEMO_USER_ID=<uuid> npm run seed:ra
 *   npm run seed:ra -- --org <uuid> --user <uuid>
 *   npm run seed:ra -- --org <uuid> --user <uuid> --force  (wipe demo rows first)
 *
 * Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Today is fixed at 2026-04-18 so the demo stays fresh.
 *
 * DEMO_USER_ID is the auth.users.id of the logged-in demo account (Brandon).
 * It is used for any column that FK-references auth.users (tasks.assigned_to,
 * activities.user_id, events.created_by, write_ups.issued_by, etc.).
 *
 * Employee attribution (Tyrell, Jessica, Cody, ...) is tracked via
 * tasks.employee_id and jobs.*_employee_id — added in phase13-roofing.sql.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// ---------- ENV + CLI --------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const argv = process.argv.slice(2);
const arg = (n: string) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? undefined : argv[i + 1];
};
const hasFlag = (n: string) => argv.includes(`--${n}`);

const ORG_ID = arg("org") ?? process.env.DEMO_ORG_ID;
const USER_ID = arg("user") ?? process.env.DEMO_USER_ID;
const FORCE = hasFlag("force");

if (!ORG_ID) {
  console.error("Missing org id. Pass --org <uuid> or set DEMO_ORG_ID.");
  process.exit(1);
}
if (!USER_ID) {
  console.error("Missing user id. Pass --user <uuid> or set DEMO_USER_ID.");
  console.error("Tip: this should be the auth.users.id of your demo login (Brandon).");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ---------- CONSTANTS ---------------------------------------------------------
const TODAY = new Date("2026-04-18T12:00:00Z");
const DAY_MS = 86_400_000;

const ORG_NAME = "Restore America Roofing & Restoration";
const ORG_SLUG = "restore-america-roofing";
const EMAIL_DOMAIN = "gorestoreamerica.com";

// ---------- UTILITIES ---------------------------------------------------------
function pick<T>(a: readonly T[]): T { return a[Math.floor(Math.random() * a.length)]; }
function weighted<T>(entries: ReadonlyArray<readonly [T, number]>): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [v, w] of entries) { r -= w; if (r <= 0) return v; }
  return entries[entries.length - 1][0];
}
function daysAgo(days: number, jitterHours = 0): string {
  const d = new Date(TODAY.getTime() - days * DAY_MS);
  if (jitterHours) d.setHours(d.getHours() + Math.floor(Math.random() * jitterHours));
  return d.toISOString();
}
function daysFromNow(days: number): string {
  return new Date(TODAY.getTime() + days * DAY_MS).toISOString();
}
function dateOnly(iso: string): string { return iso.slice(0, 10); }
function weightedDaysAgo(maxDays: number, biasTowardRecent = 2): number {
  const bias = Math.pow(Math.random(), biasTowardRecent);
  return Math.floor(bias * maxDays);
}
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min: number, max: number, decimals = 2) {
  return +(Math.random() * (max - min) + min).toFixed(decimals);
}
function chunk<T>(a: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
  return out;
}
function shuffle<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- PHONE / EMAIL GENERATORS -----------------------------------------
function gaPhone() {
  const area = pick(["470", "404", "770", "678"]);
  return `(${area}) ${rand(200, 999)}-${rand(1000, 9999)}`;
}
function flPhone() {
  const area = pick(["813", "407", "904", "321"]);
  return `(${area}) ${rand(200, 999)}-${rand(1000, 9999)}`;
}
function moPhone() {
  const area = pick(["314", "816"]);
  return `(${area}) ${rand(200, 999)}-${rand(1000, 9999)}`;
}
function phoneForMarket(market: string): string {
  const m = market.toLowerCase();
  if (m.includes("florida") || ["orlando", "tampa", "jacksonville"].some(c => m.includes(c))) return flPhone();
  if (m.includes("missouri") || ["st. louis", "st louis", "kansas city"].some(c => m.includes(c))) return moPhone();
  return gaPhone();
}
function personalEmail(first: string, last: string) {
  const hosts = ["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "hotmail.com", "aol.com"];
  const sep = pick(["", ".", "_"]);
  return `${first.toLowerCase().replace(/[^a-z]/g, "")}${sep}${last.toLowerCase().replace(/[^a-z]/g, "")}@${pick(hosts)}`;
}

// ---------- LOCATIONS --------------------------------------------------------
type MarketKey = "jersey" | "walton" | "atlanta" | "orlando" | "tampa" | "jacksonville" | "stlouis" | "kansascity";
const MARKETS: Record<MarketKey, {
  name: string; address: string; city: string; state: string; zip: string;
  opened: string; market: string; phone: string;
}> = {
  jersey:      { name: "Jersey HQ",             address: "137 Main St",             city: "Jersey",       state: "GA", zip: "30018", opened: "2014-05-15", market: "Jersey, GA (HQ)", phone: "(470) 205-7445" },
  walton:      { name: "Walton County Office",  address: "215 S Broad St",          city: "Monroe",       state: "GA", zip: "30655", opened: "2017-03-01", market: "Walton County, GA", phone: "(770) 373-5663" },
  atlanta:     { name: "Atlanta Office",        address: "3340 Peachtree Rd NE Ste 1800", city: "Atlanta", state: "GA", zip: "30326", opened: "2016-08-22", market: "Atlanta, GA", phone: "(404) 567-8421" },
  orlando:     { name: "Orlando Office",        address: "520 N Orlando Ave Ste 200", city: "Winter Park", state: "FL", zip: "32789", opened: "2021-06-07", market: "Orlando, FL", phone: "(407) 712-8890" },
  tampa:       { name: "Tampa Office",          address: "4830 W Kennedy Blvd Ste 600", city: "Tampa",     state: "FL", zip: "33609", opened: "2022-04-18", market: "Tampa, FL", phone: "(813) 489-3102" },
  jacksonville:{ name: "Jacksonville Office",   address: "9471 Baymeadows Rd Ste 105", city: "Jacksonville", state: "FL", zip: "32256", opened: "2023-09-12", market: "Jacksonville, FL", phone: "(904) 223-7711" },
  stlouis:     { name: "St. Louis Office",      address: "11500 Olive Blvd Ste 210", city: "Creve Coeur",  state: "MO", zip: "63141", opened: "2025-11-04", market: "St. Louis, MO", phone: "(314) 618-4422" },
  kansascity:  { name: "Kansas City Office",    address: "7285 W 132nd St",          city: "Overland Park", state: "KS", zip: "66213", opened: "2026-01-13", market: "Kansas City, MO", phone: "(816) 944-2210" },
};

// ---------- STREET NAMES BY MARKET -------------------------------------------
const STREETS_BY_MARKET: Record<MarketKey, string[]> = {
  atlanta: ["Peachtree Rd", "Ponce de Leon Ave", "Briarcliff Rd", "Howell Mill Rd", "West Paces Ferry Rd", "North Highland Ave", "Moores Mill Rd", "Piedmont Ave", "Roswell Rd", "Cheshire Bridge Rd", "LaVista Rd"],
  walton:  ["Mountain View Dr", "Highway 78", "Alcovy Rd", "Jersey Walnut Grove Rd", "Good Hope Rd", "Pannell Rd", "Mount Pleasant Rd", "Blasingame Rd"],
  jersey:  ["Main St", "Old Mill Rd", "Jersey Social Circle Rd", "Peachtree Ave"],
  orlando: ["Kirkman Rd", "International Dr", "Lake Underhill Rd", "University Blvd", "Semoran Blvd", "Colonial Dr"],
  tampa:   ["Bayshore Blvd", "Kennedy Blvd", "Dale Mabry Hwy", "Armenia Ave", "Gandy Blvd", "Swann Ave", "Lois Ave"],
  jacksonville: ["San Jose Blvd", "Atlantic Blvd", "Beach Blvd", "Southside Blvd", "Hodges Blvd"],
  stlouis: ["Delmar Blvd", "Forest Park Pkwy", "Clayton Rd", "Big Bend Blvd", "Manchester Rd", "Hanley Rd"],
  kansascity: ["Ward Pkwy", "State Line Rd", "Mission Rd", "Metcalf Ave", "College Blvd", "Nall Ave"],
};

function randomAddressForMarket(mk: MarketKey): { address: string; city: string; state: string; zip: string } {
  const m = MARKETS[mk];
  const street = pick(STREETS_BY_MARKET[mk]);
  const number = rand(100, 9999);
  return { address: `${number} ${street}`, city: m.city, state: m.state, zip: m.zip };
}

// ---------- RESET ------------------------------------------------------------
async function wipeDemoData() {
  console.log(`[reset] wiping existing demo rows for org ${ORG_ID}...`);
  // Reverse-dependency order. Errors on missing tables are warnings.
  const tables = [
    "tasks", "events", "notifications", "sms_messages",
    "campaign_recipients", "campaigns",
    "call_transcripts", "calls", "chat_sessions", "voice_agents",
    "write_ups", "incident_reports", "employee_intakes", "employee_files",
    "jobs", "crew_members", "crews",
    "activities", "contact_notes", "email_logs",
    "leads", "deals", "contacts",
    "insurance_adjusters", "storm_events",
    "employees", "locations",
  ];
  for (const t of tables) {
    if (t === "call_transcripts") {
      // Cascades from calls; leave alone to avoid "org_id not a column" error.
      continue;
    }
    if (t === "campaign_recipients" || t === "crew_members") {
      // Cascades from parents; and they don't have org_id.
      continue;
    }
    const { error } = await sb.from(t).delete().eq("org_id", ORG_ID as string);
    if (error) console.warn(`[reset] ${t}: ${error.message}`);
  }
  console.log("[reset] done.");
}

// ---------- ORG + MEMBERS ----------------------------------------------------
async function ensureOrg() {
  // Upsert org row. Don't overwrite existing slug conflicts — just ensure name.
  const { data: existing } = await sb.from("organizations").select("id, name").eq("id", ORG_ID as string).maybeSingle();
  if (!existing) {
    // Create from scratch (slug may collide; append suffix)
    const { error } = await sb.from("organizations").insert({
      id: ORG_ID,
      name: ORG_NAME,
      slug: `${ORG_SLUG}-${Math.random().toString(36).slice(2, 7)}`,
      tier: "enterprise",
      industry: "roofing",
      phone: MARKETS.jersey.phone,
      email: `hello@${EMAIL_DOMAIN}`,
      website: "https://gorestoreamerica.com",
      address: MARKETS.jersey.address,
      city: MARKETS.jersey.city,
      state: MARKETS.jersey.state,
      zip: MARKETS.jersey.zip,
      timezone: "America/New_York",
      email_from_name: ORG_NAME,
      email_reply_to: `hello@${EMAIL_DOMAIN}`,
      email_signature: "Fair, honest pricing. In-house insurance claim experts.",
    });
    if (error) throw new Error(`[org] insert failed: ${error.message}`);
    console.log(`[org] created ${ORG_NAME} (${ORG_ID})`);
  } else {
    const { error } = await sb.from("organizations").update({
      name: ORG_NAME,
      tier: "enterprise",
      industry: "roofing",
      phone: MARKETS.jersey.phone,
      email: `hello@${EMAIL_DOMAIN}`,
      website: "https://gorestoreamerica.com",
      address: MARKETS.jersey.address,
      city: MARKETS.jersey.city,
      state: MARKETS.jersey.state,
      zip: MARKETS.jersey.zip,
      timezone: "America/New_York",
      email_from_name: ORG_NAME,
      email_reply_to: `hello@${EMAIL_DOMAIN}`,
      email_signature: "Fair, honest pricing. In-house insurance claim experts.",
      updated_at: new Date().toISOString(),
    }).eq("id", ORG_ID as string);
    if (error) console.warn(`[org] update warn: ${error.message}`);
    else console.log(`[org] refreshed ${ORG_NAME}`);
  }

  // Ensure Brandon membership record for DEMO_USER_ID
  const brandon = {
    org_id: ORG_ID,
    user_id: USER_ID,
    role: "owner",
    first_name: "Brandon",
    last_name: "Pergantis",
    phone: MARKETS.jersey.phone,
    title: "President / Co-founder",
  };
  const { data: existingMember } = await sb.from("org_members")
    .select("id").eq("org_id", ORG_ID as string).eq("user_id", USER_ID as string).maybeSingle();
  if (existingMember) {
    const { error } = await sb.from("org_members").update({
      role: "owner", first_name: "Brandon", last_name: "Pergantis",
      phone: MARKETS.jersey.phone, title: "President / Co-founder",
    }).eq("id", existingMember.id);
    if (error) console.warn(`[org_members] Brandon update warn: ${error.message}`);
  } else {
    const { error } = await sb.from("org_members").insert(brandon);
    if (error) console.warn(`[org_members] Brandon insert warn: ${error.message} (auth user may not exist — log in at least once as Brandon, then re-run).`);
  }
  console.log(`[org_members] Brandon Pergantis wired to user_id ${USER_ID}`);
}

// ---------- LOCATIONS --------------------------------------------------------
async function seedLocations(): Promise<Record<MarketKey, number>> {
  const rows = (Object.keys(MARKETS) as MarketKey[]).map((key) => {
    const m = MARKETS[key];
    return {
      org_id: ORG_ID,
      name: m.name,
      address: m.address,
      city: m.city,
      state: m.state,
      zip: m.zip,
      capacity: 0,
      monthly_rate: 0,
      hourly_rate: 0,
      daily_rate: 0,
      amenities: [],
      is_active: true,
      opened_date: m.opened,
      phone: m.phone,
      market: m.market,
    };
  });
  const { data, error } = await sb.from("locations").insert(rows).select("id, name");
  if (error) throw new Error(`[locations] insert failed: ${error.message}`);
  const map: Partial<Record<MarketKey, number>> = {};
  const byName = new Map((data ?? []).map((r: any) => [r.name, r.id as number]));
  for (const key of Object.keys(MARKETS) as MarketKey[]) {
    const id = byName.get(MARKETS[key].name);
    if (id) map[key] = id;
  }
  console.log(`[locations] inserted ${data?.length ?? 0} rows`);
  return map as Record<MarketKey, number>;
}

// ---------- EMPLOYEES + CREWS ------------------------------------------------
type EmpSpec = {
  first: string; last: string; role: string; market: MarketKey; hireDate: string;
  email?: string; key?: string;
};
const EMPLOYEES: EmpSpec[] = [
  // Owners/leadership also mirrored as employees so MCP tools see them by role
  { first: "Angel",    last: "Spikes",     role: "owner",            market: "atlanta", hireDate: "2014-05-15", email: `angel@${EMAIL_DOMAIN}`,    key: "angel" },
  { first: "Brandon",  last: "Pergantis",  role: "owner",            market: "jersey",  hireDate: "2014-05-15", email: `brandon@${EMAIL_DOMAIN}`,  key: "brandon" },
  { first: "Ryan",     last: "Spikes",     role: "general_manager",  market: "atlanta", hireDate: "2014-05-15", email: `ryan.s@${EMAIL_DOMAIN}`,   key: "ryan_s" },
  { first: "Ryan",     last: "Thomason",   role: "general_manager",  market: "orlando", hireDate: "2014-05-15", email: `ryan.t@${EMAIL_DOMAIN}`,   key: "ryan_t" },
  // GMs
  { first: "Marcus",   last: "Holloway",   role: "general_manager",  market: "atlanta", hireDate: "2018-03-15", key: "marcus_h" },
  { first: "Derek",    last: "Reyna",      role: "general_manager",  market: "stlouis", hireDate: "2025-10-20", key: "derek_r" },
  // Sales Reps / Canvassers
  { first: "Tyrell",   last: "Washington", role: "sales_rep",        market: "atlanta",      hireDate: "2019-06-10", key: "tyrell" },
  { first: "Jessica",  last: "Nguyen",     role: "sales_rep",        market: "walton",       hireDate: "2020-08-03", key: "jessica" },
  { first: "Cody",     last: "Blackwell",  role: "sales_rep",        market: "tampa",        hireDate: "2022-04-11", key: "cody" },
  { first: "Maria",    last: "Delgado",    role: "sales_rep",        market: "orlando",      hireDate: "2022-09-19", key: "maria" },
  { first: "Sam",      last: "Parrish",    role: "sales_rep",        market: "jacksonville", hireDate: "2023-07-07", key: "sam" },
  { first: "Kenny",    last: "Okafor",     role: "sales_rep",        market: "kansascity",   hireDate: "2026-02-16", key: "kenny" },
  // PMs
  { first: "Daniel",   last: "Hayes",      role: "project_manager",  market: "atlanta",      hireDate: "2019-11-04", key: "daniel" },
  { first: "Patricia", last: "Vargas",     role: "project_manager",  market: "tampa",        hireDate: "2023-01-30", key: "patricia" },
  { first: "Luis",     last: "Moreno",     role: "project_manager",  market: "jersey",       hireDate: "2020-05-12", key: "luis" },
  // Supplements Coordinators
  { first: "Tanya",    last: "Whitmore",   role: "supplements_coordinator", market: "atlanta", hireDate: "2017-09-18", key: "tanya" },
  { first: "Rebecca",  last: "Lin",        role: "supplements_coordinator", market: "orlando", hireDate: "2023-03-06", key: "rebecca" },
  // Estimators
  { first: "Hector",   last: "Ramirez",    role: "estimator",        market: "jersey",       hireDate: "2016-07-22", key: "hector" },
  { first: "Stephen",  last: "Kowalski",   role: "estimator",        market: "orlando",      hireDate: "2024-02-05", key: "stephen" },
  // Crew Leaders
  { first: "Jamal",    last: "Richardson", role: "crew_leader",      market: "atlanta",      hireDate: "2018-06-03", key: "jamal" },
  { first: "Victor",   last: "Alvarado",   role: "crew_leader",      market: "walton",       hireDate: "2019-04-15", key: "victor" },
  { first: "Brian",    last: "Henderson",  role: "crew_leader",      market: "tampa",        hireDate: "2022-05-22", key: "brian" },
  { first: "Travis",   last: "Morgan",     role: "crew_leader",      market: "stlouis",      hireDate: "2025-11-10", key: "travis" },
  // Installers
  { first: "Duane",    last: "Haskell",    role: "installer",        market: "atlanta",      hireDate: "2020-03-18", key: "install1" },
  { first: "Antonio",  last: "Mendez",     role: "installer",        market: "walton",       hireDate: "2021-01-22", key: "install2" },
  { first: "Terrence", last: "Beal",       role: "installer",        market: "tampa",        hireDate: "2022-10-05", key: "install3" },
  { first: "Kyle",     last: "Ferrell",    role: "installer",        market: "tampa",        hireDate: "2023-08-14", key: "install4" },
  { first: "Dwayne",   last: "Mathis",     role: "installer",        market: "stlouis",      hireDate: "2025-12-02", key: "install5" },
  // Office admin
  { first: "Ashley",   last: "Brennan",    role: "office_manager",   market: "jersey",       hireDate: "2019-02-11", email: `ashley@${EMAIL_DOMAIN}`, key: "ashley" },
  // Warranty
  { first: "Olivia",   last: "Trent",      role: "warranty_coordinator", market: "atlanta",  hireDate: "2021-10-25", key: "olivia" },
];

async function seedEmployees(locIds: Record<MarketKey, number>): Promise<Record<string, number>> {
  const rows = EMPLOYEES.map((e) => ({
    org_id: ORG_ID,
    first_name: e.first,
    last_name: e.last,
    role: e.role,
    location_id: locIds[e.market],
    hire_date: e.hireDate,
    status: "active",
    phone: phoneForMarket(MARKETS[e.market].market),
    email: e.email ?? `${e.first.toLowerCase()}.${e.last.toLowerCase()}@${EMAIL_DOMAIN}`,
    market: MARKETS[e.market].market,
  }));
  const { data, error } = await sb.from("employees").insert(rows).select("id, first_name, last_name");
  if (error) throw new Error(`[employees] insert failed: ${error.message}`);
  const map: Record<string, number> = {};
  (data ?? []).forEach((r: any, i: number) => {
    const key = EMPLOYEES[i].key ?? `${EMPLOYEES[i].first}_${EMPLOYEES[i].last}`.toLowerCase();
    map[key] = r.id as number;
  });
  console.log(`[employees] inserted ${data?.length ?? 0} rows`);
  return map;
}

async function seedCrews(emp: Record<string, number>, locIds: Record<MarketKey, number>): Promise<Record<string, number>> {
  const crewSpecs = [
    { key: "ga1", name: "GA Crew 1", leader: "jamal",  loc: "atlanta" as MarketKey, members: ["install1"] },
    { key: "ga2", name: "GA Crew 2", leader: "victor", loc: "walton"  as MarketKey, members: ["install2"] },
    { key: "fl1", name: "FL Crew 1", leader: "brian",  loc: "tampa"   as MarketKey, members: ["install3", "install4"] },
    { key: "mo1", name: "MO Crew 1", leader: "travis", loc: "stlouis" as MarketKey, members: ["install5"] },
  ];
  const rows = crewSpecs.map((c) => ({
    org_id: ORG_ID,
    name: c.name,
    location_id: locIds[c.loc],
    leader_employee_id: emp[c.leader],
    capacity_jobs_per_week: 3,
    is_active: true,
  }));
  const { data, error } = await sb.from("crews").insert(rows).select("id, name");
  if (error) throw new Error(`[crews] insert failed: ${error.message}`);
  const byName = new Map((data ?? []).map((r: any) => [r.name, r.id as number]));
  const crewMap: Record<string, number> = {};
  for (const c of crewSpecs) crewMap[c.key] = byName.get(c.name) as number;

  // crew_members
  const cmRows: any[] = [];
  for (const c of crewSpecs) {
    cmRows.push({ crew_id: crewMap[c.key], employee_id: emp[c.leader] });
    for (const m of c.members) cmRows.push({ crew_id: crewMap[c.key], employee_id: emp[m] });
  }
  const { error: cmErr } = await sb.from("crew_members").insert(cmRows);
  if (cmErr) console.warn(`[crew_members] insert warn: ${cmErr.message}`);

  // Back-link employees → crew_id
  for (const c of crewSpecs) {
    await sb.from("employees").update({ crew_id: crewMap[c.key] })
      .in("id", [emp[c.leader], ...c.members.map(m => emp[m])]);
  }
  console.log(`[crews] inserted ${data?.length ?? 0} crews, ${cmRows.length} memberships`);
  return crewMap;
}

// ---------- ADJUSTERS --------------------------------------------------------
const ADJUSTER_SPECS = [
  { name: "Mike Prescott",      carrier: "State Farm",    territory: "GA",    days: 4.2, pct: 18, notes: "Responsive, approves photo docs fast" },
  { name: "Denise Carrington",  carrier: "Allstate",      territory: "GA",    days: 7.8, pct:  9, notes: "Tough on ridge vent replacements" },
  { name: "Jerry Nakamura",     carrier: "USAA",          territory: "GA+FL", days: 3.1, pct: 22, notes: "Military-friendly, quick turnaround" },
  { name: "Linda Bellamy",      carrier: "Travelers",     territory: "GA",    days: 6.5, pct: 14, notes: "Needs detailed scope sheets" },
  { name: "Rashaad Patel",      carrier: "Farmers",       territory: "GA+FL", days: 5.4, pct: 16, notes: "" },
  { name: "Kevin Solomon",      carrier: "Liberty Mutual",territory: "FL",    days: 8.2, pct: 11, notes: "" },
  { name: "Stephanie Vogel",    carrier: "Progressive",   territory: "FL",    days: 4.9, pct: 17, notes: "" },
  { name: "Miguel Cortez",      carrier: "Nationwide",    territory: "FL",    days: 6.1, pct: 15, notes: "" },
  { name: "Aaron Brinkley",     carrier: "State Farm",    territory: "MO",    days: 5.2, pct: 19, notes: "" },
  { name: "Cheryl Donaldson",   carrier: "Allstate",      territory: "MO",    days: 9.4, pct:  7, notes: "Slow, requires multiple follow-ups" },
  { name: "Theresa Wu",         carrier: "American Family",territory: "MO",   days: 5.8, pct: 13, notes: "" },
  { name: "Brad Thornhill",     carrier: "Auto-Owners",   territory: "GA",    days: 3.8, pct: 24, notes: "Best supplement approval rate in GA" },
];

async function seedAdjusters(): Promise<Record<string, number>> {
  const rows = ADJUSTER_SPECS.map((a) => ({
    org_id: ORG_ID,
    name: a.name,
    carrier: a.carrier,
    territory: a.territory,
    avg_approval_days: a.days,
    avg_supplement_pct: a.pct,
    notes: a.notes,
    phone: a.territory.startsWith("MO") ? moPhone() : a.territory.includes("FL") ? flPhone() : gaPhone(),
    email: `${a.name.toLowerCase().replace(/[^a-z]/g, ".")}@${a.carrier.toLowerCase().replace(/[^a-z]/g, "")}.com`,
  }));
  const { data, error } = await sb.from("insurance_adjusters").insert(rows).select("id, name");
  if (error) throw new Error(`[adjusters] insert failed: ${error.message}`);
  const map: Record<string, number> = {};
  (data ?? []).forEach((r: any) => { map[r.name] = r.id as number; });
  console.log(`[adjusters] inserted ${data?.length ?? 0} rows`);
  return map;
}

// ---------- STORM EVENTS -----------------------------------------------------
const STORM_SPECS = [
  { key: "feb_atl",  name: "Feb 2026 Metro Atlanta Hail",      date: "2026-02-14", type: "hail",     counties: ["Fulton", "DeKalb", "Gwinnett", "Cobb", "Walton"], description: "Widespread 1.5\"-2.5\" hail across Metro Atlanta and Walton County." },
  { key: "mar_tpa",  name: "March 2026 Tampa Windstorm",       date: "2026-03-08", type: "wind",     counties: ["Hillsborough", "Pinellas"], description: "Sustained 65-75mph winds with gusts to 90mph." },
  { key: "oct_fl",   name: "October 2025 Central FL Tropical System", date: "2025-10-22", type: "tropical", counties: ["Orange", "Seminole", "Osceola"], description: "Post-tropical system, 50mph sustained, saturated ground." },
  { key: "jan_stl",  name: "January 2026 STL Ice Event",       date: "2026-01-19", type: "ice",      counties: ["St. Louis", "St. Charles"], description: "Ice storm with widespread wind damage and shingle uplift." },
  { key: "nov_nega", name: "November 2025 NE GA Wind",         date: "2025-11-12", type: "wind",     counties: ["Walton", "Newton", "Barrow", "Gwinnett"], description: "NE GA wind event, 55-65mph gusts." },
];

async function seedStormEvents(): Promise<Record<string, number>> {
  const rows = STORM_SPECS.map((s) => ({
    org_id: ORG_ID,
    name: s.name,
    event_date: s.date,
    storm_type: s.type,
    counties: s.counties,
    description: s.description,
  }));
  const { data, error } = await sb.from("storm_events").insert(rows).select("id, name");
  if (error) throw new Error(`[storm_events] insert failed: ${error.message}`);
  const byName = new Map((data ?? []).map((r: any) => [r.name, r.id as number]));
  const map: Record<string, number> = {};
  for (const s of STORM_SPECS) map[s.key] = byName.get(s.name) as number;
  console.log(`[storm_events] inserted ${data?.length ?? 0} rows`);
  return map;
}

// ---------- NAME POOLS (diverse, realistic) ----------------------------------
const FIRST_POOL = [
  "Mark", "Linda", "Roberta", "Devon", "Grace", "Matt", "Sarah", "Bill", "Hannah",
  "Diana", "Jordan", "Keisha", "Ronald", "Nelda", "Marcus", "Terri", "Eddie",
  "Whitney", "Darren", "Priscilla", "Trent", "Lacey", "Dwight", "Renee", "Omar",
  "Yolanda", "Brent", "Sophia", "Angela", "Malik", "Adrienne", "Travis", "Joanna",
  "Wesley", "Cassandra", "Felipe", "Brittany", "Jamar", "Denise", "Raul", "Vanessa",
  "Chase", "Monica", "Kristen", "Neal", "Harper", "Tasha", "Bradley", "Megan",
  "Kwame", "Nora", "Armando", "Deidre", "Colton", "Jada", "Preston", "Vivian",
  "Ernest", "Maya", "Tamika", "Paul", "Lorena", "Tim", "Ebony", "Clayton",
  "Janelle", "Rick", "Susan", "Horace", "Pam", "Leonard", "Helen", "Chris",
  "Valerie", "Oscar", "Tonya", "Edward", "Shanice", "Phillip", "Marcia", "Seth",
];
const LAST_POOL = [
  "Henderson", "Beaumont", "Finch", "Pierce", "Wilmot", "Okonkwo", "Levine", "Tavares",
  "Ortiz", "Koehler", "Caldwell", "Parnell", "Cummins", "Oakley", "Lassiter", "Bowers",
  "Whitfield", "Jessup", "Holman", "McCree", "Battle", "Rowland", "Langley", "Preston",
  "Culpepper", "Nash", "Barron", "Fielder", "Dudley", "Stanton", "Heath", "Maddox",
  "Reese", "Upshaw", "Gamble", "Banks", "Sharp", "Ivey", "Houston", "McLendon",
  "Carrington", "Shipley", "Vogel", "Crowder", "Brewington", "Shelton", "Sutherland",
  "Breland", "Haskins", "Massey", "Odom", "Truitt", "Whitlock", "Kingsbury",
];

function randomPerson(): { first: string; last: string } {
  return { first: pick(FIRST_POOL), last: pick(LAST_POOL) };
}

// ---------- ROOFING DATA POOLS -----------------------------------------------
const ROOF_TYPES = ["Asphalt Shingle", "Architectural Shingle", "TPO (commercial)", "EPDM (commercial)", "Modified Bitumen", "Metal - Standing Seam", "Tile"];
const DAMAGE_TYPES = ["Hail", "Wind", "Hail + Wind", "Tree Impact", "Age / Granule Loss", "Leak / Water Damage", "Fire"];
const MATERIAL_BRANDS = [
  { brand: "GAF", lines: ["Timberline HDZ", "Timberline UHDZ", "Camelot II"], colors: ["Weathered Wood", "Charcoal", "Hickory", "Pewter Gray", "Barkwood"] },
  { brand: "Owens Corning", lines: ["Duration", "Duration Storm", "TruDefinition"], colors: ["Driftwood", "Onyx Black", "Estate Gray", "Brownwood", "Aged Copper"] },
  { brand: "CertainTeed", lines: ["Landmark", "Landmark Pro", "Presidential"], colors: ["Weathered Wood", "Moire Black", "Georgetown Gray", "Heather Blend"] },
  { brand: "Malarkey", lines: ["Vista", "Legacy", "Windsor"], colors: ["Weathered Wood", "Storm Grey", "Natural Wood", "Midnight Black"] },
];
const CARRIERS = ["State Farm", "Allstate", "USAA", "Travelers", "Farmers", "Liberty Mutual", "Progressive", "Nationwide", "American Family", "Auto-Owners"];
const CARRIER_CODES: Record<string, string> = {
  "State Farm": "SF", "Allstate": "ALL", "USAA": "USAA", "Travelers": "TRV",
  "Farmers": "FRM", "Liberty Mutual": "LM", "Progressive": "PRG",
  "Nationwide": "NW", "American Family": "AF", "Auto-Owners": "AO",
};
function claimNumber(carrier: string): string {
  const code = CARRIER_CODES[carrier] ?? "CLM";
  return `${code}-2026-${String(rand(10000, 99999))}`;
}

// Map carrier → adjuster ids that cover that carrier
function adjusterForCarrier(carrier: string, territoryHint: "GA" | "FL" | "MO", adjMap: Record<string, number>): number | null {
  const matches = ADJUSTER_SPECS.filter((a) => a.carrier === carrier && a.territory.includes(territoryHint));
  if (matches.length) return adjMap[pick(matches).name];
  const fallback = ADJUSTER_SPECS.filter((a) => a.carrier === carrier);
  if (fallback.length) return adjMap[pick(fallback).name];
  return null;
}

// ---------- LEADS ------------------------------------------------------------
// 50 leads, carefully distributed.
// Stages: New(9) Inspection Scheduled(8) Inspected(6) Estimate Sent(5)
//         Insurance Pending(14) Approved(3) Scheduled(2) In Progress(2) Lost(1)
// The 14 Insurance Pending leads use specific stuck-day offsets.

type LeadPlan = {
  stage: string;
  market: MarketKey;
  source: string;
  temperature: string;
  isCommercial: boolean;
  stormKey?: string;
  stuckDays?: number; // for insurance_pending
  daysAgo?: number;   // otherwise
  notesOverride?: string;
};

const INSURANCE_STUCK_DAYS = [3, 5, 8, 10, 12, 14, 18, 21, 24, 28, 35, 42, 50, 67];

// Market distribution: Atlanta 14, Walton 11, Orlando 6, Tampa 6, Jax 4, STL 4, KC 3, Jersey 2
const MARKET_DISTRIBUTION: MarketKey[] = [
  ...Array(14).fill("atlanta"),
  ...Array(11).fill("walton"),
  ...Array(6).fill("orlando"),
  ...Array(6).fill("tampa"),
  ...Array(4).fill("jacksonville"),
  ...Array(4).fill("stlouis"),
  ...Array(3).fill("kansascity"),
  ...Array(2).fill("jersey"),
] as MarketKey[];

const STAGE_DISTRIBUTION: string[] = [
  ...Array(9).fill("new"),
  ...Array(8).fill("inspection_scheduled"),
  ...Array(6).fill("inspected"),
  ...Array(5).fill("estimate_sent"),
  ...Array(14).fill("insurance_pending"),
  ...Array(3).fill("approved"),
  ...Array(2).fill("scheduled"),
  ...Array(2).fill("in_progress"),
  ...Array(1).fill("lost"),
];

const SOURCE_WEIGHTS: Array<readonly [string, number]> = [
  ["phone", 12], ["walk_in", 2], ["website", 9],
  ["referral", 11], ["third_party", 4],
];

function sourceDetail(): { source: string; subsource: string } {
  // Choose a valid DB source + friendlier subsource string
  const detailPick = weighted<[string, string]>([
    [["phone", "Google LSA"], 9],
    [["phone", "Door-knock callback"], 5],
    [["walk_in", "Door-knock"], 7],
    [["website", "Facebook ad"], 7],
    [["website", "Angi/HomeAdvisor"], 4],
    [["website", "Nextdoor"], 2],
    [["referral", "Past-customer referral"], 6],
    [["referral", "Insurance adjuster referral"], 5],
    [["third_party", "HOA/commercial"], 3],
    [["phone", "Yard sign callback"], 2],
  ]);
  return { source: detailPick[0], subsource: detailPick[1] };
}

async function seedLeadsAndContacts(
  locIds: Record<MarketKey, number>,
  empMap: Record<string, number>,
  adjMap: Record<string, number>,
  stormMap: Record<string, number>,
): Promise<{ leadIds: number[]; contactIds: number[]; leadByCarrier: Map<number, string>; namedLeadByPerson: Map<string, number>; }> {
  // Seed 50 leads first
  const stagesShuffled = shuffle(STAGE_DISTRIBUTION);
  const marketsShuffled = shuffle(MARKET_DISTRIBUTION);
  const stuckShuffle = shuffle(INSURANCE_STUCK_DAYS);
  let stuckIdx = 0;

  const leadRows: any[] = [];
  const namedLeadByPerson = new Map<string, number>();
  const CANON_NAMES = [
    "Mark Henderson", "Linda Beaumont", "Roberta Finch", "Devon Pierce", "Grace Wilmot",
    "Matt Okonkwo", "Sarah Levine", "Bill Tavares", "Hannah Ortiz", "Diana Koehler",
  ];
  const usedNames = new Set<string>();

  for (let i = 0; i < 50; i++) {
    const stage = stagesShuffled[i];
    const market = marketsShuffled[i];
    const isCommercial = Math.random() < 0.40;
    const temperatureRoll = weighted<string>([["hot", 12], ["warm", 26], ["cold", 12]]);
    const det = sourceDetail();

    let first: string, last: string;
    if (i < CANON_NAMES.length) {
      [first, last] = CANON_NAMES[i].split(" ");
    } else {
      let p = randomPerson();
      while (usedNames.has(`${p.first} ${p.last}`)) p = randomPerson();
      first = p.first; last = p.last;
    }
    usedNames.add(`${first} ${last}`);

    const addr = randomAddressForMarket(market);
    const m = MARKETS[market];
    const territoryHint: "GA" | "FL" | "MO" = m.state === "GA" ? "GA" : m.state === "FL" ? "FL" : "MO";
    const carrier = pick(CARRIERS);
    const adjusterId = adjusterForCarrier(carrier, territoryHint, adjMap);
    const roofType = isCommercial
      ? pick(["TPO (commercial)", "EPDM (commercial)", "Modified Bitumen"])
      : pick(["Asphalt Shingle", "Architectural Shingle", "Metal - Standing Seam", "Tile"]);
    const squares = isCommercial ? randFloat(40, 220, 1) : randFloat(18, 44, 1);
    const stories = isCommercial ? rand(1, 2) : rand(1, 2);
    const estRetail = isCommercial
      ? randFloat(45000, 285000, 0)
      : (m.state === "FL" ? randFloat(14000, 32000, 0) : randFloat(8000, 22000, 0));
    const estInsurance = estRetail * randFloat(0.78, 0.96, 2);

    // Determine created_at
    let daysAgoLead: number;
    if (stage === "insurance_pending") {
      daysAgoLead = stuckShuffle[stuckIdx++];
    } else if (i % 10 === 0) {
      daysAgoLead = rand(0, 30);
    } else {
      // 60% last 30d, 30% last 90d, 10% older
      const r = Math.random();
      daysAgoLead = r < 0.6 ? rand(0, 30) : r < 0.9 ? rand(31, 90) : rand(91, 365);
    }

    // Storm tag logic
    let stormKey: string | undefined;
    if (market === "atlanta" || market === "walton" || market === "jersey") {
      const createdDate = new Date(TODAY.getTime() - daysAgoLead * DAY_MS);
      if (createdDate >= new Date("2026-02-15") && createdDate <= new Date("2026-03-01") && Math.random() < 0.70) stormKey = "feb_atl";
      else if (market === "walton" && Math.random() < 0.3) stormKey = "nov_nega";
    } else if (market === "tampa") {
      const createdDate = new Date(TODAY.getTime() - daysAgoLead * DAY_MS);
      if (createdDate >= new Date("2026-03-09") && createdDate <= new Date("2026-03-20") && Math.random() < 0.5) stormKey = "mar_tpa";
    } else if (market === "orlando" || market === "jacksonville") {
      if (Math.random() < 0.4) stormKey = "oct_fl";
    } else if (market === "stlouis" || market === "kansascity") {
      if (Math.random() < 0.6) stormKey = "jan_stl";
    }

    // Choose assigned rep by market
    const repByMarket: Partial<Record<MarketKey, string>> = {
      atlanta: "tyrell", walton: "jessica", tampa: "cody",
      orlando: "maria", jacksonville: "sam", kansascity: "kenny",
      stlouis: "kenny", jersey: "jessica",
    };
    const repKey = repByMarket[market] ?? "tyrell";

    // Build notes
    let noteContext: string;
    if (CANON_NAMES.includes(`${first} ${last}`)) {
      const canonNotes: Record<string, string> = {
        "Mark Henderson": "Emergency leak at 2-story Buckhead home; wife is the decision maker. Active leak in master bedroom ceiling.",
        "Linda Beaumont": "Hail damage Feb 14, State Farm claim in progress. Inspection scheduled with Hector for Thursday 2pm.",
        "Roberta Finch": "Existing customer — Travelers claim approved Tuesday for $18,400 with $2,100 supplement pending.",
        "Devon Pierce": "Competitor quoted $4,200 less. Reviewing scope with Tyrell; sensitive to price but wants warranty.",
        "Grace Wilmot": "Post-warranty claim, 2023 install. 4 shingles blew off after windstorm; Olivia scheduled.",
        "Matt Okonkwo": "Property manager for Brookstone Heights HOA — 14 units with flat TPO roofs, March storm damage.",
        "Sarah Levine": "Referred by neighbor Jim Caldwell who had roof done last year. Wants inspection booked.",
        "Bill Tavares": "Install confirmed for Thursday, crew 7am arrival, materials delivery Wednesday.",
        "Hannah Ortiz": "Wants to cancel scheduled install — competitor offered cash-only. Save attempt with Tanya.",
        "Diana Koehler": "Came in from Feb ATL hail campaign. Wants free 24-hour inspection.",
      };
      noteContext = canonNotes[`${first} ${last}`] ?? "";
    } else {
      const notes = [
        `Called from yard sign on ${addr.address.split(' ').slice(1).join(' ')}, has ${rand(1, 4)} tabs in claim.`,
        `${det.subsource} lead — ${isCommercial ? 'commercial property manager' : 'homeowner'} interested in inspection.`,
        `Roof is ${rand(10, 25)} years old; ${pick(["hail bruising visible", "wind-lifted shingles", "granule loss", "active leak in attic"])}.`,
        `Spouse is decision maker. Best time to call is ${pick(["evenings", "weekends", "mornings before 9am"])}.`,
        `${pick(["2", "3"])}-story ${isCommercial ? 'flat roof' : 'home'}; steep pitch; ${pick(["tile underlayment concern", "ridge vent damage", "fascia rot"])}.`,
        `Referred by previous customer. Ready to move quickly once insurance approves.`,
      ];
      noteContext = pick(notes);
    }

    const createdAt = daysAgo(daysAgoLead, 12);
    const claimNo = stage === "new" || stage === "inspection_scheduled"
      ? (Math.random() < 0.3 ? claimNumber(carrier) : "")
      : claimNumber(carrier);

    const row = {
      org_id: ORG_ID,
      first_name: first,
      last_name: last,
      phone: phoneForMarket(m.market),
      email: personalEmail(first, last),
      address: `${addr.address}, ${addr.city}, ${addr.state} ${addr.zip}`,
      location_id: locIds[market],
      source: det.source,
      frequency: "monthly",
      temperature: temperatureRoll,
      stage,
      assigned_to: null as string | null,
      notes: `${noteContext} [source: ${det.subsource}] [rep: ${EMPLOYEES.find(e => e.key === repKey)?.first} ${EMPLOYEES.find(e => e.key === repKey)?.last}]`,
      property_address: addr.address,
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
      roof_type: roofType,
      roof_age_years: rand(8, 28),
      squares,
      stories,
      damage_type: stormKey ? "Hail + Wind" : pick(DAMAGE_TYPES),
      insurance_carrier: carrier,
      claim_number: claimNo,
      adjuster_id: adjusterId,
      storm_event_id: stormKey ? stormMap[stormKey] : null,
      estimated_retail_amount: estRetail,
      estimated_insurance_amount: Math.round(estInsurance),
      created_at: createdAt,
      updated_at: createdAt,
    };
    leadRows.push(row);

    if (CANON_NAMES.includes(`${first} ${last}`)) {
      // Will fill in id after insert
    }
  }

  // INSURANCE PENDING carrier tweak: ensure 67-day stuck lead uses Allstate + Denise
  // (so the story "Denise went on leave" lands in demo).
  const ipIdx = leadRows.findIndex((r) => r.stage === "insurance_pending"
    && Math.round((TODAY.getTime() - new Date(r.created_at as string).getTime()) / DAY_MS) === 67);
  if (ipIdx >= 0) {
    leadRows[ipIdx].insurance_carrier = "Allstate";
    leadRows[ipIdx].claim_number = claimNumber("Allstate");
    leadRows[ipIdx].adjuster_id = adjMap["Denise Carrington"] ?? leadRows[ipIdx].adjuster_id;
    leadRows[ipIdx].notes = (leadRows[ipIdx].notes as string) + " [stuck: adjuster Denise Carrington on leave since mid-Feb]";
  }

  const { data: leadsData, error: leadsErr } = await sb.from("leads").insert(leadRows).select("id, first_name, last_name");
  if (leadsErr) throw new Error(`[leads] insert failed: ${leadsErr.message}`);
  const leadIds = (leadsData ?? []).map((r: any) => r.id as number);
  console.log(`[leads] inserted ${leadIds.length} rows`);

  // Map canonical leads
  (leadsData ?? []).forEach((r: any) => {
    if (CANON_NAMES.includes(`${r.first_name} ${r.last_name}`)) {
      namedLeadByPerson.set(`${r.first_name} ${r.last_name}`, r.id as number);
    }
  });

  // -------------------- CONTACTS --------------------
  // 140 contacts breakdown:
  //  40 completed-job customers (2022-2025 installs)
  //  30 active-pipeline customers (linked to current jobs)
  //  25 current leads-converted-to-contacts
  //  20 referral prospects (cold)
  //  15 HOA/property manager contacts (commercial)
  //  10 past customers who are now referral sources
  const contactRows: any[] = [];
  const contactTagsList: string[][] = [];
  const contactMarkets: MarketKey[] = [];

  const ALL_MARKETS: MarketKey[] = ["atlanta", "walton", "tampa", "orlando", "jacksonville", "stlouis", "kansascity", "jersey"];
  function pickMarket(): MarketKey {
    return weighted<MarketKey>([
      ["atlanta", 12], ["walton", 9], ["tampa", 8], ["orlando", 7],
      ["jacksonville", 5], ["stlouis", 4], ["kansascity", 3], ["jersey", 2],
    ]);
  }

  function pushContact(opts: {
    tag: string; bucket: "completed" | "active" | "converted" | "prospect" | "hoa" | "referrer";
    market?: MarketKey; ageDaysMin?: number; ageDaysMax?: number;
  }) {
    const market = opts.market ?? pickMarket();
    const m = MARKETS[market];
    const addr = randomAddressForMarket(market);
    const p = randomPerson();
    const isCommercial = opts.bucket === "hoa";
    const companyName = isCommercial
      ? pick(["Brookstone Heights HOA", "Lakeridge Property Management", "Sunrise Commercial Partners", "Ridgewood HOA", "Coastal Office Group", "Midtown Realty Partners", "Eagle Industrial Park", "Westbrook Commons HOA", "Parkside Commercial", "Stonegate HOA", "Ashford Business Park", "Beltline Properties LLC", "Magnolia Manor HOA", "Riverside Commercial", "Oakwood Apartments"])
      : "";
    const carrier = pick(CARRIERS);
    const age = rand(opts.ageDaysMin ?? 180, opts.ageDaysMax ?? 900);
    const createdAt = daysAgo(age, 12);
    const health = opts.bucket === "completed" || opts.bucket === "referrer"
      ? rand(62, 100) // weighted toward higher via noise, avg around 82
      : opts.bucket === "active" ? rand(68, 95) : null;

    const row = {
      org_id: ORG_ID,
      first_name: isCommercial ? p.first : p.first,
      last_name: isCommercial ? p.last : p.last,
      email: personalEmail(p.first, p.last),
      phone: phoneForMarket(m.market),
      company: companyName,
      address: addr.address,
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
      tags: [opts.tag],
      source: opts.bucket === "referrer" || opts.bucket === "active" ? "referral" : opts.bucket === "hoa" ? "manual" : "website",
      stage: opts.bucket === "completed" ? "won" : opts.bucket === "prospect" ? "lead" : "qualified",
      created_at: createdAt,
      updated_at: createdAt,
      spouse_name: isCommercial ? "" : (Math.random() < 0.7 ? `${pick(FIRST_POOL)} ${p.last}` : ""),
      secondary_phone: Math.random() < 0.5 ? phoneForMarket(m.market) : "",
      mailing_address: Math.random() < 0.2 ? `${rand(100, 9999)} ${pick(STREETS_BY_MARKET[market])}, ${m.city}, ${m.state} ${m.zip}` : "",
      insurance_carrier: carrier,
      preferred_contact_method: pick(["phone", "email", "text", "any"]),
      best_time_to_reach: pick(["", "Evenings after 6pm", "Weekends", "Weekday mornings", "Anytime"]),
      storm_tag: "",
      customer_health_score: health,
    };
    contactRows.push(row);
    contactTagsList.push([opts.tag]);
    contactMarkets.push(market);
  }

  // 40 completed customers
  for (let i = 0; i < 40; i++) pushContact({ tag: "warranty", bucket: "completed", ageDaysMin: 120, ageDaysMax: 900 });
  // 30 active pipeline
  for (let i = 0; i < 30; i++) pushContact({ tag: "insurance-claim", bucket: "active", ageDaysMin: 14, ageDaysMax: 90 });
  // 25 converted from lead
  for (let i = 0; i < 25; i++) pushContact({ tag: "converted", bucket: "converted", ageDaysMin: 14, ageDaysMax: 60 });
  // 20 referral prospects (cold)
  for (let i = 0; i < 20; i++) pushContact({ tag: "cold-prospect", bucket: "prospect", ageDaysMin: 1, ageDaysMax: 120 });
  // 15 HOA
  for (let i = 0; i < 15; i++) {
    pushContact({ tag: `hoa-${(i + 1).toString().padStart(2, "0")}`, bucket: "hoa", ageDaysMin: 20, ageDaysMax: 400 });
  }
  // 10 past customers who refer
  for (let i = 0; i < 10; i++) pushContact({ tag: "repeat", bucket: "referrer", ageDaysMin: 300, ageDaysMax: 1200 });

  // Tag a few completed customers with storm_tag for storytelling
  for (let i = 0; i < 12; i++) {
    const idx = rand(0, 39);
    contactRows[idx].storm_tag = pick(["Feb 2026 Atlanta Hail", "October 2025 Central FL Tropical", "November 2025 NE GA Wind"]);
    contactRows[idx].tags = [...(contactRows[idx].tags as string[]), "storm"];
  }

  // INSERT contacts in two passes: first insert all, then back-fill referred_by
  const { data: contactData, error: ctErr } = await sb.from("contacts").insert(contactRows).select("id, first_name, last_name");
  if (ctErr) throw new Error(`[contacts] insert failed: ${ctErr.message}`);
  const contactIds = (contactData ?? []).map((r: any) => r.id as number);
  console.log(`[contacts] inserted ${contactIds.length} rows`);

  // Build referral network: ~25% of contacts reference another contact via referred_by
  const updates: Array<{ id: number; referred_by: number }> = [];
  for (let i = 0; i < contactIds.length; i++) {
    if (Math.random() < 0.25) {
      const referrer = contactIds[rand(0, Math.max(0, 49))];
      if (referrer !== contactIds[i]) updates.push({ id: contactIds[i], referred_by: referrer });
    }
  }
  for (const batch of chunk(updates, 50)) {
    for (const u of batch) {
      await sb.from("contacts").update({ referred_by: u.referred_by }).eq("id", u.id);
    }
  }
  console.log(`[contacts] built referral graph: ${updates.length} referred_by links`);

  // map carriers for jobs
  const leadByCarrier = new Map<number, string>();
  (leadsData ?? []).forEach((r: any, i: number) => {
    leadByCarrier.set(r.id as number, leadRows[i].insurance_carrier as string);
  });

  return { leadIds, contactIds, leadByCarrier, namedLeadByPerson };
}

// ---------- JOBS -------------------------------------------------------------
async function seedJobs(
  locIds: Record<MarketKey, number>,
  empMap: Record<string, number>,
  adjMap: Record<string, number>,
  stormMap: Record<string, number>,
  crewMap: Record<string, number>,
  leadIds: number[],
  contactIds: number[],
): Promise<number[]> {
  // 60 jobs: 30 completed, 15 scheduled/materials_ordered, 10 in_progress (4 GA, 3 FL, 3 MO), 5 punch_list
  type JobPlan = { status: string; market: MarketKey; crewKey: string; isCommercial: boolean; };
  const plans: JobPlan[] = [];
  const add = (count: number, status: string, market: MarketKey, crewKey: string, commercialRate = 0.3) => {
    for (let i = 0; i < count; i++) {
      plans.push({ status, market, crewKey, isCommercial: Math.random() < commercialRate });
    }
  };
  // Completed 30
  add(10, "completed", "atlanta", "ga1", 0.2);
  add(7,  "completed", "walton",  "ga2", 0.2);
  add(5,  "completed", "tampa",   "fl1", 0.4);
  add(4,  "completed", "orlando", "fl1", 0.4);
  add(2,  "completed", "jacksonville", "fl1", 0.5);
  add(2,  "completed", "jersey",  "ga1", 0.2);
  // Scheduled / materials_ordered 15
  add(3, "scheduled",          "atlanta", "ga1", 0.2);
  add(2, "materials_ordered",  "atlanta", "ga1", 0.2);
  add(2, "scheduled",          "walton",  "ga2");
  add(2, "materials_ordered",  "walton",  "ga2");
  add(2, "scheduled",          "tampa",   "fl1", 0.4);
  add(2, "scheduled",          "orlando", "fl1", 0.4);
  add(1, "materials_ordered",  "stlouis", "mo1");
  add(1, "scheduled",          "kansascity", "mo1");
  // In progress 10 (4 GA, 3 FL, 3 MO)
  add(2, "in_progress", "atlanta", "ga1", 0.2);
  add(2, "in_progress", "walton",  "ga2", 0.2);
  add(2, "in_progress", "tampa",   "fl1", 0.4);
  add(1, "in_progress", "orlando", "fl1", 0.4);
  add(2, "in_progress", "stlouis", "mo1", 0.4);
  add(1, "in_progress", "kansascity", "mo1", 0.4);
  // Punch list 5
  add(2, "punch_list", "atlanta", "ga1", 0.2);
  add(1, "punch_list", "tampa",   "fl1", 0.3);
  add(1, "punch_list", "walton",  "ga2");
  add(1, "punch_list", "orlando", "fl1", 0.3);

  const repByMarket: Partial<Record<MarketKey, string>> = {
    atlanta: "tyrell", walton: "jessica", tampa: "cody",
    orlando: "maria", jacksonville: "sam", kansascity: "kenny",
    stlouis: "kenny", jersey: "jessica",
  };
  const pmByMarket: Partial<Record<MarketKey, string>> = {
    atlanta: "daniel", walton: "luis", jersey: "luis",
    tampa: "patricia", orlando: "patricia", jacksonville: "patricia",
    stlouis: "luis", kansascity: "luis",
  };
  const suppByState: Record<string, string> = {
    GA: "tanya", FL: "rebecca", MO: "tanya", KS: "tanya",
  };

  const rows: any[] = [];
  const usedLeadIds = new Set<number>();
  const usedContactIds = new Set<number>();

  for (const plan of plans) {
    const m = MARKETS[plan.market];
    const addr = randomAddressForMarket(plan.market);
    const brand = pick(MATERIAL_BRANDS);
    const line = pick(brand.lines);
    const color = pick(brand.colors);
    const carrier = pick(CARRIERS);
    const territory: "GA" | "FL" | "MO" = m.state === "GA" ? "GA" : m.state === "FL" ? "FL" : "MO";
    const adjusterId = adjusterForCarrier(carrier, territory, adjMap);

    const isCommercial = plan.isCommercial;
    const squares = isCommercial ? randFloat(45, 280) : randFloat(18, 42);
    const retail = isCommercial ? randFloat(45000, 285000, 0)
      : m.state === "FL" ? randFloat(14000, 32000, 0) : randFloat(8000, 22000, 0);
    const insuranceApproved = Math.round(retail * randFloat(0.80, 0.95));
    const supplementsAmount = Math.round(insuranceApproved * randFloat(0.14, 0.22));
    const finalContract = insuranceApproved + supplementsAmount;

    let scheduledStart: string | null = null;
    let scheduledEnd: string | null = null;
    let actualStart: string | null = null;
    let actualEnd: string | null = null;
    let createdAt: string;
    let stormKey: string | null = null;

    if (plan.status === "completed") {
      const endAgo = weightedDaysAgo(540, 1.5) + 3;
      const duration = isCommercial ? rand(4, 10) : rand(1, 3);
      actualEnd = dateOnly(daysAgo(endAgo));
      actualStart = dateOnly(daysAgo(endAgo + duration));
      scheduledStart = actualStart;
      scheduledEnd = actualEnd;
      createdAt = daysAgo(endAgo + duration + rand(14, 60));
      if (endAgo < 90) stormKey = pick(["feb_atl", "oct_fl", "nov_nega", "jan_stl", "mar_tpa"]);
    } else if (plan.status === "in_progress") {
      const startedAgo = rand(1, 5);
      const totalDur = isCommercial ? rand(4, 10) : rand(1, 3);
      actualStart = dateOnly(daysAgo(startedAgo));
      scheduledStart = actualStart;
      scheduledEnd = dateOnly(daysAgo(startedAgo - totalDur));
      createdAt = daysAgo(startedAgo + rand(14, 40));
      stormKey = pick(["feb_atl", "mar_tpa", "jan_stl", "oct_fl"]);
    } else if (plan.status === "scheduled" || plan.status === "materials_ordered") {
      const startIn = rand(2, 28);
      const duration = isCommercial ? rand(4, 10) : rand(1, 3);
      scheduledStart = dateOnly(daysFromNow(startIn));
      scheduledEnd = dateOnly(daysFromNow(startIn + duration));
      createdAt = daysAgo(rand(7, 45));
      stormKey = pick(["feb_atl", "mar_tpa", "jan_stl"]);
    } else if (plan.status === "punch_list") {
      const endedAgo = rand(1, 7);
      const duration = isCommercial ? rand(4, 10) : rand(1, 3);
      actualEnd = dateOnly(daysAgo(endedAgo));
      actualStart = dateOnly(daysAgo(endedAgo + duration));
      scheduledStart = actualStart;
      scheduledEnd = actualEnd;
      createdAt = daysAgo(endedAgo + duration + rand(10, 30));
      stormKey = pick(["feb_atl", "mar_tpa", "jan_stl", "oct_fl"]);
    } else {
      createdAt = daysAgo(rand(14, 60));
    }

    // link to a real lead and contact when possible
    let leadLink: number | null = null;
    for (const id of leadIds) if (!usedLeadIds.has(id)) { leadLink = id; usedLeadIds.add(id); break; }
    let contactLink: number | null = null;
    for (const id of contactIds) if (!usedContactIds.has(id)) { contactLink = id; usedContactIds.add(id); break; }

    const p = randomPerson();
    const permitsReq = m.state === "FL" || isCommercial;
    const photos = plan.status === "completed" || plan.status === "punch_list" || plan.status === "in_progress"
      ? buildPhotos(rows.length + 1, plan.status)
      : [];

    rows.push({
      org_id: ORG_ID,
      contact_id: contactLink,
      lead_id: leadLink,
      location_id: locIds[plan.market],
      property_address: addr.address,
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
      roof_type: isCommercial ? pick(["TPO", "EPDM", "Modified Bitumen", "PVC"]) : pick(["Architectural Shingle", "Asphalt Shingle", "Metal - Standing Seam"]),
      squares,
      pitch: isCommercial ? "Flat" : `${rand(4, 12)}:12`,
      stories: rand(1, 3),
      damage_type: stormKey ? "Hail + Wind" : pick(DAMAGE_TYPES),
      storm_event_id: stormKey ? stormMap[stormKey] : null,
      insurance_carrier: carrier,
      claim_number: claimNumber(carrier),
      adjuster_id: adjusterId,
      estimated_retail_amount: retail,
      insurance_approved_amount: plan.status === "scheduled" || plan.status === "materials_ordered" ? insuranceApproved : insuranceApproved,
      supplements_amount: supplementsAmount,
      final_contract_amount: finalContract,
      material_brand: brand.brand,
      material_line: line,
      color,
      scheduled_start_date: scheduledStart,
      scheduled_end_date: scheduledEnd,
      actual_start_date: actualStart,
      actual_end_date: actualEnd,
      crew_id: crewMap[plan.crewKey],
      pm_employee_id: empMap[pmByMarket[plan.market] ?? "daniel"],
      supplements_coord_employee_id: empMap[suppByState[m.state] ?? "tanya"],
      sales_rep_employee_id: empMap[repByMarket[plan.market] ?? "tyrell"],
      status: plan.status,
      permits_required: permitsReq,
      permit_number: permitsReq ? `PMT-${m.state}-${rand(20000, 99999)}` : "",
      photos,
      notes: `${isCommercial ? "Commercial" : "Residential"} ${brand.brand} ${line} in ${color}. ${plan.status === "completed" ? "Completed on schedule. Customer gave 5-star review." : plan.status === "in_progress" ? "Install underway, weather cooperating." : plan.status === "punch_list" ? "Final walkthrough pending; minor debris cleanup flagged." : "Prep underway."}`,
      created_at: createdAt,
      updated_at: createdAt,
    });
  }

  const ids: number[] = [];
  for (const batch of chunk(rows, 15)) {
    const { data, error } = await sb.from("jobs").insert(batch).select("id");
    if (error) throw new Error(`[jobs] insert failed: ${error.message}`);
    for (const r of data ?? []) ids.push(r.id as number);
  }
  console.log(`[jobs] inserted ${ids.length} rows`);
  return ids;
}

function buildPhotos(seed: number, status: string) {
  const tag = status === "completed" || status === "punch_list" ? ["before", "during", "after"]
    : status === "in_progress" ? ["before", "during"] : ["before"];
  return tag.map((t, i) => ({
    tag: t,
    url: `https://picsum.photos/seed/ra-${seed}-${i}/800/600`,
    caption: t === "before" ? "Pre-install damage photo"
      : t === "during" ? "Tear-off in progress" : "Completed install",
  }));
}

// ---------- VOICE AGENTS + CALLS --------------------------------------------
async function seedVoiceAgents(): Promise<number> {
  const { data, error } = await sb.from("voice_agents").insert({
    org_id: ORG_ID,
    name: "Nina — Restore America",
    voice: "nina",
    greeting: "Thanks for calling Restore America Roofing — this is Nina. How can I help?",
    system_prompt: "You are Nina, a professional, empathetic AI receptionist for Restore America Roofing & Restoration. Triage calls for emergency tarping, post-storm inspections, insurance claim status, and warranty claims. Book inspections with the right rep and route adjuster calls to the supplements coordinator.",
    tools_enabled: [
      "create_lead", "list_adjusters", "list_jobs", "get_job_details",
      "get_leads_by_storm_event", "create_event", "create_task", "get_contact_full_context",
    ],
    is_active: true,
  }).select("id").single();
  if (error) throw new Error(`[voice_agents] insert failed: ${error.message}`);
  console.log(`[voice_agents] inserted Nina`);
  return data!.id as number;
}

type ScenarioTurn = { speaker: "agent" | "caller"; text: string };
type Scenario = {
  name: string;
  callType: "sales" | "support" | "general" | "billing";
  disposition: "lead_created" | "transferred_to_live_agent" | "scheduled_callback" | "info_provided" | "no_answer";
  callerName: string;
  phone: string;
  market: MarketKey;
  turns: ScenarioTurn[];
  summary: string;
  nextSteps: string[];
  sentiment: "positive" | "neutral" | "negative";
  daysAgo: number;
};

const VERBATIM_SCENARIOS: Scenario[] = [
  {
    name: "emergency_leak_henderson",
    callType: "general", disposition: "scheduled_callback",
    callerName: "Mark Henderson", phone: "(404) 551-2233", market: "atlanta",
    daysAgo: 2, sentiment: "negative",
    turns: [
      { speaker: "agent", text: "Thanks for calling Restore America, this is Nina — how can I help?" },
      { speaker: "caller", text: "Hi, this is Mark Henderson. I've got an active leak in my master bedroom ceiling — it's pouring rain and the drywall is sagging." },
      { speaker: "agent", text: "I'm so sorry to hear that, Mark. Are you in a safe, dry area of the house right now?" },
      { speaker: "caller", text: "Yeah, we moved the bed out and put buckets down." },
      { speaker: "agent", text: "Good. I'm pulling up emergency tarping availability for your area — are you in Atlanta?" },
      { speaker: "caller", text: "Yes, Buckhead. Two-story home." },
      { speaker: "agent", text: "We have a tarping crew that can be out within four hours. I'll have Tyrell Washington, our Atlanta rep, call you back inside 30 minutes to confirm the exact arrival and take a few photos over text. What's the best number?" },
      { speaker: "caller", text: "This number. My wife Rachel is also on 404-551-2244 if I can't grab it." },
      { speaker: "agent", text: "Got it. Rachel's number is backup. I'll create a lead tagged as emergency tarp, Buckhead, two-story. Tyrell will be the point of contact. Anything else I can help with right now?" },
      { speaker: "caller", text: "No, just please get someone out here." },
      { speaker: "agent", text: "You have my word, Mark. Help is on the way." },
    ],
    summary: "Mark Henderson reported an active roof leak at a 2-story Buckhead home during heavy rain. Nina triaged as emergency tarp, confirmed a 4-hour crew window, and scheduled a 30-minute callback from Tyrell Washington. Wife Rachel's number logged as backup.",
    nextSteps: [
      "Tyrell Washington to call Mark within 30 minutes",
      "Dispatch emergency tarping crew within 4 hours",
      "Create task: photo-document damage and send insurance packet",
      "Create lead tagged hot + emergency + storm",
      "Log Rachel Henderson as secondary contact",
    ],
  },
  {
    name: "post_storm_beaumont",
    callType: "sales", disposition: "lead_created",
    callerName: "Linda Beaumont", phone: "(770) 555-4812", market: "walton",
    daysAgo: 5, sentiment: "positive",
    turns: [
      { speaker: "agent", text: "Thanks for calling Restore America, this is Nina — how can I help?" },
      { speaker: "caller", text: "Hi, I'm Linda Beaumont. My neighbor said y'all handle the Feb 14th hail claims." },
      { speaker: "agent", text: "Yes ma'am, we're handling a lot of those. Are you in Walton County?" },
      { speaker: "caller", text: "Monroe. My insurance is State Farm." },
      { speaker: "agent", text: "Perfect. For State Farm in GA, our adjuster contact is usually Mike Prescott — he's fast, about 4 days average. Have you filed the claim yet?" },
      { speaker: "caller", text: "Not yet, I wanted to see what y'all found first." },
      { speaker: "agent", text: "Smart move. I can book a free 24-hour inspection with Hector Ramirez — he's our estimator for Walton. How's Thursday at 2pm?" },
      { speaker: "caller", text: "Thursday 2pm works." },
      { speaker: "agent", text: "Booked. Hector will be there Thursday at 2. He'll document everything and, if we see storm damage, we'll help you file the State Farm claim and route it to Mike." },
      { speaker: "caller", text: "Wonderful." },
    ],
    summary: "Linda Beaumont in Monroe, Walton County, is insured by State Farm. Nina tagged the lead to the Feb 2026 Metro Atlanta Hail event, identified Mike Prescott as the likely adjuster, and booked Hector Ramirez for a Thursday 2pm inspection.",
    nextSteps: [
      "Hector Ramirez inspection Thursday 2pm",
      "Pre-populate State Farm claim packet for Mike Prescott",
      "Send Linda text confirmation with Hector's direct number",
      "Tag lead to Feb 2026 Metro Atlanta Hail storm event",
    ],
  },
  {
    name: "claim_status_finch",
    callType: "support", disposition: "info_provided",
    callerName: "Roberta Finch", phone: "(470) 555-9910", market: "atlanta",
    daysAgo: 1, sentiment: "positive",
    turns: [
      { speaker: "agent", text: "Thanks for calling Restore America, this is Nina — how can I help?" },
      { speaker: "caller", text: "Hi Nina, this is Roberta Finch. I'm calling about my claim status." },
      { speaker: "agent", text: "Let me pull up your record, Roberta. One moment…" },
      { speaker: "agent", text: "Okay — I have you here. Your claim with Travelers, adjuster Linda Bellamy, was approved Tuesday for $18,400 with a $2,100 supplement pending. Your install is tentatively scheduled with our Atlanta crew for April 29th." },
      { speaker: "caller", text: "Oh wonderful. What's the supplement for?" },
      { speaker: "agent", text: "That's for the ridge vent and drip edge replacement Linda asked for additional documentation on. Tanya Whitmore, our supplements coordinator, already uploaded the photos on Monday, so we expect that to approve within the week." },
      { speaker: "caller", text: "And the color — did we pick the Driftwood?" },
      { speaker: "agent", text: "Yes, Owens Corning Duration in Driftwood. That matches your HOA requirement. Anything else?" },
      { speaker: "caller", text: "No, that's everything. Thank you!" },
    ],
    summary: "Roberta Finch requested claim status. Her Travelers claim (Linda Bellamy, approved Tuesday $18,400 + $2,100 supplement pending) is on track. Install scheduled April 29 with Atlanta crew using OC Duration Driftwood.",
    nextSteps: [
      "Send Roberta written confirmation via email",
      "Tanya Whitmore to follow up with Linda Bellamy on supplement approval",
      "Confirm April 29 install date with crew GA Crew 1",
    ],
  },
  {
    name: "price_objection_pierce",
    callType: "sales", disposition: "scheduled_callback",
    callerName: "Devon Pierce", phone: "(678) 555-3321", market: "atlanta",
    daysAgo: 3, sentiment: "neutral",
    turns: [
      { speaker: "agent", text: "Thanks for calling Restore America, this is Nina — how can I help?" },
      { speaker: "caller", text: "Hey, it's Devon Pierce. Another company quoted me $4,200 less for the same scope." },
      { speaker: "agent", text: "I appreciate you calling us back, Devon. Can I ask who the other company was and whether their bid is insurance-scope or retail?" },
      { speaker: "caller", text: "It was a cash-only guy, retail." },
      { speaker: "agent", text: "Got it. That's the difference — a cash bid usually leaves your supplement money on the table. With State Farm, we typically recover an extra 14-18 percent in supplements, so a $4,200 gap can turn into a $3,000+ loss for you. That's before warranty differences." },
      { speaker: "caller", text: "What warranty do you offer?" },
      { speaker: "agent", text: "Five-year workmanship plus lifetime material warranty through GAF, because we're manufacturer certified. A cash installer typically offers none of that, and you also lose BBB protection." },
      { speaker: "caller", text: "Okay, I want to talk through it with someone." },
      { speaker: "agent", text: "Let me have Tyrell Washington call you later today — he'll walk you through the scope side by side. Does 3pm work?" },
      { speaker: "caller", text: "3pm works." },
    ],
    summary: "Devon Pierce received a $4,200 lower cash bid from a competitor. Nina differentiated on supplements recovery, 5-yr workmanship + lifetime material warranty, GAF certification, and BBB protection. Callback scheduled with Tyrell Washington for 3pm.",
    nextSteps: [
      "Tyrell Washington callback at 3pm today",
      "Send competitor comparison sheet",
      "Create task: follow up after callback",
    ],
  },
  {
    name: "warranty_wilmot",
    callType: "support", disposition: "scheduled_callback",
    callerName: "Grace Wilmot", phone: "(404) 555-7760", market: "atlanta",
    daysAgo: 4, sentiment: "neutral",
    turns: [
      { speaker: "agent", text: "Thanks for calling Restore America, this is Nina — how can I help?" },
      { speaker: "caller", text: "Yes, hi. I'm Grace Wilmot. Y'all did my roof in 2023 and four shingles blew off after that windstorm." },
      { speaker: "agent", text: "I'm sorry to hear that, Grace. Let me pull up your install record… yes, installed October 2023, GAF Timberline HDZ in Barkwood. That's under our 5-year workmanship warranty." },
      { speaker: "caller", text: "Do I need to file through insurance?" },
      { speaker: "agent", text: "Not for four shingles — that's on us. I'll have Olivia Trent, our warranty coordinator, come out and repair it at no cost. How's Friday?" },
      { speaker: "caller", text: "Friday's fine." },
      { speaker: "agent", text: "Booked. Olivia will text you a one-hour window Thursday evening." },
    ],
    summary: "Grace Wilmot reported 4 shingles lost post-windstorm on her Oct 2023 install (GAF Timberline HDZ, Barkwood). Under 5-year workmanship warranty. Olivia Trent scheduled for Friday repair, no cost to customer.",
    nextSteps: [
      "Olivia Trent repair visit Friday",
      "Olivia to text Grace Thursday evening with arrival window",
      "Log warranty repair in job record",
    ],
  },
  {
    name: "hoa_commercial_okonkwo",
    callType: "sales", disposition: "lead_created",
    callerName: "Matt Okonkwo", phone: "(813) 555-4401", market: "tampa",
    daysAgo: 6, sentiment: "positive",
    turns: [
      { speaker: "agent", text: "Thanks for calling Restore America, this is Nina — how can I help?" },
      { speaker: "caller", text: "Hi, I'm Matt Okonkwo. I manage the Brookstone Heights HOA in Tampa — 14 units with flat TPO roofs." },
      { speaker: "agent", text: "Got it, Matt. Are you calling about the March windstorm?" },
      { speaker: "caller", text: "Exactly. We're seeing membrane tears on at least six of the buildings." },
      { speaker: "agent", text: "We handle commercial TPO at our Tampa location. Stephen Kowalski is our commercial estimator, based in Orlando but he covers Tampa. I can book him for a full 14-unit inspection and quarterly maintenance discussion. Would next Tuesday morning work?" },
      { speaker: "caller", text: "Yes, 9am." },
      { speaker: "agent", text: "Booked. Stephen will bring aerial imagery and a scope-of-work template for HOA boards. Any specific carriers on the master policy?" },
      { speaker: "caller", text: "Liberty Mutual." },
      { speaker: "agent", text: "Kevin Solomon is the Liberty adjuster we usually work with for FL commercial. We'll pre-coordinate with him." },
    ],
    summary: "Matt Okonkwo (property manager, Brookstone Heights HOA, Tampa, 14 flat TPO roofs, Liberty Mutual master policy) reported post-March windstorm membrane tears on 6+ units. Stephen Kowalski booked for Tuesday 9am full inspection + quarterly maintenance discussion.",
    nextSteps: [
      "Stephen Kowalski inspection Tuesday 9am",
      "Bring aerial imagery + HOA scope-of-work template",
      "Pre-coordinate with adjuster Kevin Solomon (Liberty Mutual)",
      "Tag lead to March 2026 Tampa Windstorm",
    ],
  },
  {
    name: "referral_levine",
    callType: "sales", disposition: "lead_created",
    callerName: "Sarah Levine", phone: "(470) 555-1180", market: "atlanta",
    daysAgo: 7, sentiment: "positive",
    turns: [
      { speaker: "agent", text: "Thanks for calling Restore America, this is Nina — how can I help?" },
      { speaker: "caller", text: "Hi, I'm Sarah Levine. My neighbor Jim Caldwell got his roof done last year and told me to call y'all." },
      { speaker: "agent", text: "Jim Caldwell — yes, I see him here. His install was last August, GAF Timberline in Weathered Wood." },
      { speaker: "caller", text: "That's the one. My roof is 19 years old and I think it's about done." },
      { speaker: "agent", text: "Before we do anything, do you have insurance coverage on storm damage?" },
      { speaker: "caller", text: "Yes, Allstate." },
      { speaker: "agent", text: "Let's get a free inspection booked. Hector can be out this Saturday morning. If we find storm damage we can help you file; if not, we can scope a cash or financed replacement." },
      { speaker: "caller", text: "Saturday morning works." },
      { speaker: "agent", text: "Booked. And I'll put a $500 referral credit on Jim's record — he'll be pleased." },
    ],
    summary: "Sarah Levine referred by past customer Jim Caldwell. 19-year-old roof, Allstate insurance. Hector Ramirez booked for Saturday morning inspection. Jim Caldwell credited $500 referral.",
    nextSteps: [
      "Hector Ramirez inspection Saturday morning",
      "Credit $500 referral to Jim Caldwell",
      "Create contact tagged referred_by: Jim Caldwell",
      "Send Sarah intro text from Hector",
    ],
  },
  {
    name: "install_confirmation_tavares",
    callType: "general", disposition: "info_provided",
    callerName: "Bill Tavares", phone: "(678) 555-2201", market: "atlanta",
    daysAgo: 0, sentiment: "positive",
    turns: [
      { speaker: "agent", text: "Hi Bill, this is Nina at Restore America. Calling to confirm your install this Thursday." },
      { speaker: "caller", text: "Hey Nina, yes I was expecting your call." },
      { speaker: "agent", text: "Perfect. Crew arrives 7am Thursday, tear-off complete by noon, dry-in same day, shingles Friday. Materials delivery is tomorrow Wednesday between 10 and 2 — will someone be home?" },
      { speaker: "caller", text: "My wife will be. Driveway is open." },
      { speaker: "agent", text: "Great. We'll place materials on the driveway closest to the garage. Daniel Hayes, your PM, will be on site both days." },
      { speaker: "caller", text: "Perfect, thanks." },
    ],
    summary: "Outbound confirmation call to Bill Tavares. Install Thursday 7am, tear-off + dry-in same day, shingles Friday. Materials delivery Wednesday 10-2 (wife home). Daniel Hayes PM on-site both days.",
    nextSteps: [
      "Send Bill text with Daniel Hayes's cell",
      "Confirm materials delivery window with supplier",
    ],
  },
  {
    name: "save_attempt_ortiz",
    callType: "support", disposition: "transferred_to_live_agent",
    callerName: "Hannah Ortiz", phone: "(407) 555-6670", market: "orlando",
    daysAgo: 2, sentiment: "negative",
    turns: [
      { speaker: "agent", text: "Thanks for calling Restore America, this is Nina — how can I help?" },
      { speaker: "caller", text: "Hi, I'm Hannah Ortiz. I need to cancel my scheduled install." },
      { speaker: "agent", text: "I'm sorry to hear that, Hannah. Can I ask why?" },
      { speaker: "caller", text: "Another guy offered to do it cash, $3,500 less." },
      { speaker: "agent", text: "I hear you — that's a real number. Can I share something real quick? The cash-only route means no supplement recovery, no written documentation for your carrier, and if anything goes wrong there's no warranty path. We've seen a few of those turn into $10k problems two years later." },
      { speaker: "caller", text: "I just want to save money right now." },
      { speaker: "agent", text: "Completely fair. Let me have Tanya Whitmore, our supplements coordinator, call you within 30 minutes to walk you through what we can get your carrier to cover — you may end up paying less out of pocket with us than with the cash guy." },
      { speaker: "caller", text: "Okay, 30 minutes." },
      { speaker: "agent", text: "I'll hold your install on the schedule until she reaches you. Thank you for giving us the chance, Hannah." },
    ],
    summary: "Hannah Ortiz tried to cancel her scheduled install for a $3,500 cheaper cash offer. Nina empathized, explained risks (no supplement, no docs, no warranty path), and routed to Tanya Whitmore for supplements review within 30 minutes. Install held on schedule.",
    nextSteps: [
      "Tanya Whitmore to call Hannah within 30 minutes",
      "Hold install slot pending Tanya's conversation",
      "Tanya to prepare supplement opportunity analysis",
      "Follow up next day on decision",
    ],
  },
  {
    name: "adjuster_coord_prescott",
    callType: "general", disposition: "transferred_to_live_agent",
    callerName: "Mike Prescott (State Farm)", phone: "(770) 555-0012", market: "atlanta",
    daysAgo: 1, sentiment: "neutral",
    turns: [
      { speaker: "agent", text: "Thanks for calling Restore America, this is Nina — how can I help?" },
      { speaker: "caller", text: "Mike Prescott with State Farm. I need photos of ridge replacement scope for claim SF-2026-18742." },
      { speaker: "agent", text: "Hi Mike, let me pull that claim… Got it. That's the Henderson file in Atlanta. I'm routing you directly to Tanya Whitmore in supplements — she has the photos ready and can upload within 24 hours. One moment." },
      { speaker: "caller", text: "Thanks Nina." },
    ],
    summary: "Inbound coordination call from State Farm adjuster Mike Prescott regarding claim SF-2026-18742 (Henderson). Nina routed to Tanya Whitmore (supplements) with a 24-hour photo upload SLA.",
    nextSteps: [
      "Tanya Whitmore to upload ridge replacement photos within 24h",
      "Create task: 'Upload photos to adjuster Mike Prescott for Henderson'",
      "Confirm delivery via portal with Mike",
    ],
  },
];

// Additional 20 scenarios generated in the same style
function generateAdditionalScenario(i: number): Scenario {
  const marketPool: MarketKey[] = ["atlanta", "walton", "tampa", "orlando", "jacksonville", "stlouis", "kansascity"];
  const market = marketPool[i % marketPool.length];
  const m = MARKETS[market];
  const p = randomPerson();
  const name = `${p.first} ${p.last}`;
  const phone = phoneForMarket(m.market);
  const carrier = pick(CARRIERS);
  const topics = [
    { callType: "sales" as const, disposition: "lead_created" as const, prompt: "new post-storm inspection request" },
    { callType: "sales" as const, disposition: "scheduled_callback" as const, prompt: "comparison shopping" },
    { callType: "support" as const, disposition: "info_provided" as const, prompt: "claim status question" },
    { callType: "support" as const, disposition: "scheduled_callback" as const, prompt: "leak triage" },
    { callType: "general" as const, disposition: "info_provided" as const, prompt: "service area question" },
    { callType: "billing" as const, disposition: "info_provided" as const, prompt: "invoice clarification" },
  ];
  const topic = topics[i % topics.length];
  const daysAgo = rand(0, 28);
  const sentiment: "positive" | "neutral" | "negative" = topic.disposition === "lead_created" ? "positive" : topic.prompt.includes("leak") ? "negative" : "neutral";

  let turns: ScenarioTurn[];
  let summary: string;
  let nextSteps: string[];
  if (topic.prompt === "new post-storm inspection request") {
    turns = [
      { speaker: "agent", text: "Thanks for calling Restore America, this is Nina — how can I help?" },
      { speaker: "caller", text: `Hi, I'm ${name}. We had storm damage last week — need an inspection.` },
      { speaker: "agent", text: `Sorry to hear that, ${p.first}. Are you in the ${m.city} area?` },
      { speaker: "caller", text: `Yes. My insurance is ${carrier}.` },
      { speaker: "agent", text: `Perfect. I can book our ${m.state === "GA" ? "Hector" : m.state === "FL" ? "Stephen" : "local"} estimator for ${pick(["tomorrow afternoon", "Thursday morning", "Friday 10am"])} at no cost.` },
      { speaker: "caller", text: "That works." },
      { speaker: "agent", text: "Booked. You'll get a confirmation text with the estimator's direct number within 5 minutes." },
    ];
    summary = `${name} in ${m.city} requested a post-storm inspection. Insured by ${carrier}. Booked free inspection with local estimator.`;
    nextSteps = ["Send confirmation text", "Create lead tagged to storm event", "Pre-coordinate with adjuster"];
  } else if (topic.prompt === "comparison shopping") {
    turns = [
      { speaker: "agent", text: "Thanks for calling Restore America, this is Nina — how can I help?" },
      { speaker: "caller", text: `Hi, I'm ${name}. Got a couple of quotes — trying to understand the differences.` },
      { speaker: "agent", text: "Happy to walk you through. What do the other quotes include for warranty and supplements?" },
      { speaker: "caller", text: "Not sure — just a price." },
      { speaker: "agent", text: "That's the issue — price without scope is hard to compare. Let me have our rep call you tomorrow with a side-by-side." },
      { speaker: "caller", text: "Okay." },
    ];
    summary = `${name} is comparison shopping. Nina offered side-by-side scope walkthrough and scheduled callback with regional rep.`;
    nextSteps = ["Rep callback tomorrow", "Prepare scope comparison sheet"];
  } else if (topic.prompt === "claim status question") {
    turns = [
      { speaker: "agent", text: "Thanks for calling Restore America, this is Nina — how can I help?" },
      { speaker: "caller", text: `${name} here — quick check on my claim.` },
      { speaker: "agent", text: "Let me pull you up… Your claim is in 'insurance pending' status. Adjuster responded Monday; we have one outstanding supplement item. Expected approval within the week." },
      { speaker: "caller", text: "Thanks!" },
    ];
    summary = `${name} called for claim status. Nina confirmed insurance-pending status with one supplement item outstanding; approval expected within the week.`;
    nextSteps = ["Send written follow-up", "Notify supplements coord"];
  } else if (topic.prompt === "leak triage") {
    turns = [
      { speaker: "agent", text: "Thanks for calling Restore America, this is Nina — how can I help?" },
      { speaker: "caller", text: `Hi, I'm ${name}. I've got a drip in my ceiling.` },
      { speaker: "agent", text: "Let's get that triaged. When did you first notice it?" },
      { speaker: "caller", text: "This morning." },
      { speaker: "agent", text: "Got it. I'll have our closest crew give you a callback within the hour and we'll tarp if needed." },
      { speaker: "caller", text: "Thanks." },
    ];
    summary = `${name} reported an active ceiling drip. Nina triaged and scheduled a callback within the hour with possible emergency tarp.`;
    nextSteps = ["Crew callback within 1 hour", "Prep emergency tarp if needed"];
  } else if (topic.prompt === "service area question") {
    turns = [
      { speaker: "agent", text: "Thanks for calling Restore America, this is Nina — how can I help?" },
      { speaker: "caller", text: `Hi, I'm ${name}. Do y'all cover ${m.city}?` },
      { speaker: "agent", text: `Yes — we have a ${m.city} office and a local crew. What can I help you with?` },
      { speaker: "caller", text: "Just wanted to check. I'll call back." },
      { speaker: "agent", text: "Sounds good. Have a great day." },
    ];
    summary = `${name} confirmed service area coverage in ${m.city}.`;
    nextSteps = [];
  } else {
    turns = [
      { speaker: "agent", text: "Thanks for calling Restore America, this is Nina — how can I help?" },
      { speaker: "caller", text: `${name} — question on my final invoice.` },
      { speaker: "agent", text: "Let me pull it up… your balance is the deductible plus upgrade charges. Would you like me to email a line-item copy?" },
      { speaker: "caller", text: "Yes please." },
      { speaker: "agent", text: "Sent. Let me know if anything isn't clear." },
    ];
    summary = `${name} asked for invoice clarification; Nina emailed line-item copy.`;
    nextSteps = ["Ensure line-item invoice sent"];
  }

  return {
    name: `scenario_${i + 11}`, callType: topic.callType, disposition: topic.disposition,
    callerName: name, phone, market,
    daysAgo, sentiment, turns, summary, nextSteps,
  };
}

async function seedCallsAndTranscripts(
  voiceAgentId: number,
  locIds: Record<MarketKey, number>,
  contactIds: number[],
  namedLeadByPerson: Map<string, number>,
) {
  const allScenarios: Scenario[] = [
    ...VERBATIM_SCENARIOS,
    ...Array.from({ length: 20 }, (_, i) => generateAdditionalScenario(i)),
  ];

  const callRows: any[] = [];
  for (const s of allScenarios) {
    const startedAt = daysAgo(s.daysAgo, 12);
    const durationSec = s.disposition === "no_answer" ? rand(5, 15) : rand(90, 480);
    const endedAt = new Date(new Date(startedAt).getTime() + durationSec * 1000).toISOString();
    callRows.push({
      org_id: ORG_ID,
      voice_agent_id: voiceAgentId,
      direction: s.name === "adjuster_coord_prescott" ? "inbound" : (s.name === "install_confirmation_tavares" ? "outbound" : "inbound"),
      caller_name: s.callerName,
      caller_phone: s.phone,
      location_id: locIds[s.market] ?? null,
      call_type: s.callType,
      disposition: s.disposition,
      duration_seconds: durationSec,
      recording_url: `https://ra-demo-recordings.example/${s.name}.mp3`,
      started_at: startedAt,
      ended_at: endedAt,
    });
  }
  const { data: calls, error } = await sb.from("calls").insert(callRows).select("id, started_at, caller_name");
  if (error) throw new Error(`[calls] insert failed: ${error.message}`);
  console.log(`[calls] inserted ${calls?.length ?? 0} rows`);

  const transcriptRows = (calls ?? []).map((c: any, i: number) => {
    const s = allScenarios[i];
    const baseTs = new Date(c.started_at as string).getTime();
    const turns = s.turns.map((t, idx) => ({
      speaker: t.speaker,
      text: t.text,
      timestamp: new Date(baseTs + idx * 9000).toISOString(),
    }));
    return {
      call_id: c.id,
      turns,
      summary: s.summary,
      next_steps: { steps: s.nextSteps, sentiment: s.sentiment, lead_converted: s.disposition === "lead_created" },
    };
  });
  const { error: tErr } = await sb.from("call_transcripts").insert(transcriptRows);
  if (tErr) throw new Error(`[call_transcripts] insert failed: ${tErr.message}`);
  console.log(`[call_transcripts] inserted ${transcriptRows.length} rows`);
}

// ---------- CHAT SESSIONS ----------------------------------------------------
async function seedChatSessions() {
  const chats = [
    { q: "How much does a new roof cost?", a: "Residential GA asphalt replacements typically run $8k-$22k before any insurance adjustment. FL homes run $14k-$32k. Want me to book a free 24-hour inspection to get you an exact number?" },
    { q: "Do you work with my insurance company?", a: "Most likely yes — we work with State Farm, Allstate, USAA, Travelers, Farmers, Liberty Mutual, Progressive, Nationwide, American Family, and Auto-Owners. Our in-house supplements team handles the paperwork." },
    { q: "How long does an install take?", a: "A typical residential asphalt replacement is 1-3 days; commercial TPO runs 4-10 days depending on size. We start tear-off at 7am and always dry-in the same day." },
    { q: "Are you licensed in Florida?", a: "Yes — licensed and insured in GA, FL, and MO. BBB A+ accredited in all markets." },
    { q: "Do you offer financing?", a: "Yes, through our financing partners. Most homeowners use insurance first, then finance only the out-of-pocket deductible + upgrades." },
    { q: "Can you help with hail damage in Tampa?", a: "Yes — we're handling a lot of March 2026 windstorm and hail claims in Hillsborough County. Can I book Stephen Kowalski for a free inspection?" },
    { q: "What brands of shingles do you use?", a: "GAF Timberline HDZ (our most popular), Owens Corning Duration, CertainTeed Landmark, and Malarkey Vista. All come with a lifetime material warranty." },
    { q: "Do you do commercial flat roofs?", a: "Yes — TPO, EPDM, modified bitumen, and PVC. Our commercial estimator Stephen Kowalski handles FL commercial; Hector Ramirez handles GA commercial." },
    { q: "How do I know if I have hail damage?", a: "Granule loss in gutters, dents on soft metals (vents, AC covers), and bruising on shingles are signs. We offer a free 24-hour inspection — want me to book one?" },
    { q: "What's a supplement and why does it matter?", a: "A supplement is additional scope we request from your insurance carrier after they issue the initial estimate — things like ridge vent, drip edge, or code upgrades. We average 14-22% recovery in supplements that most homeowners leave on the table." },
    { q: "Do you offer a warranty?", a: "Five-year workmanship warranty on every install, plus lifetime material warranty from the manufacturer. We're GAF Master Elite certified." },
    { q: "How fast can you get here for a leak?", a: "Our emergency tarp crews are typically on-site within 4 hours in GA and FL markets, 24/7." },
    { q: "Do you handle HOA-required colors?", a: "Yes — we work with your HOA's architectural review committee and can pull pre-approved color swatches. No install without written HOA approval." },
    { q: "Are you really 24/7?", a: "Our emergency tarping and leak response is 24/7. Sales and office hours are Mon-Sat 8am-8pm." },
    { q: "What's the referral program?", a: "Refer a neighbor who signs up and both of you get a $500 credit." },
  ];
  const rows: any[] = [];
  for (let i = 0; i < 15; i++) {
    const market = weighted<MarketKey>([["atlanta", 5], ["walton", 3], ["tampa", 2], ["orlando", 2], ["jacksonville", 1], ["stlouis", 1], ["kansascity", 1]]);
    const p = randomPerson();
    const startedAt = daysAgo(rand(0, 30), 12);
    const durationS = rand(45, 400);
    const endedAt = new Date(new Date(startedAt).getTime() + durationS * 1000).toISOString();
    const c = chats[i];
    const turns = [
      { speaker: "visitor", text: c.q, timestamp: startedAt },
      { speaker: "agent", text: c.a, timestamp: new Date(new Date(startedAt).getTime() + 4000).toISOString() },
    ];
    if (Math.random() < 0.6) {
      turns.push({ speaker: "visitor", text: "Thanks!", timestamp: new Date(new Date(startedAt).getTime() + 9000).toISOString() });
    }
    rows.push({
      org_id: ORG_ID,
      channel: Math.random() > 0.4 ? "website" : "widget",
      visitor_name: `${p.first} ${p.last}`,
      transcript: turns,
      summary: `Visitor asked: "${c.q}". Agent responded with ${c.a.length > 120 ? "detailed info." : c.a.slice(0, 100) + "..."}`,
      status: Math.random() < 0.4 ? "active" : "ended",
      started_at: startedAt,
      ended_at: endedAt,
    });
  }
  const { data, error } = await sb.from("chat_sessions").insert(rows).select("id");
  if (error) throw new Error(`[chat_sessions] insert failed: ${error.message}`);
  console.log(`[chat_sessions] inserted ${data?.length ?? 0} rows`);
}

// ---------- SMS THREADS ------------------------------------------------------
async function seedSmsThreads(contactIds: number[]) {
  const THREAD_TEMPLATES: string[][] = [
    ["Crew is 10 min out — side gate accessible?", "Yes, unlocked. Dogs are in.", "Perfect. Daniel Hayes will text you when work starts."],
    ["Adjuster requested supplement photos — I'll upload this afternoon.", "Thanks Tanya. Let me know if you need anything from me."],
    ["Sent your estimate PDF — let me know if you have questions.", "Received. Reviewing tonight and will call tomorrow."],
    ["Confirming install Thursday 7am — materials Wednesday 10-2.", "Someone will be home. Driveway is clear.", "Great, see you then."],
    ["Weather looks good for Friday. On track for install.", "Sounds good!"],
    ["Quick follow-up — any decision on the scope we reviewed?", "Still talking it over. I'll reach out by Friday."],
    ["Your claim with State Farm was approved today — $19,400.", "Wow, that's more than expected. What's next?", "I'll send the contract for signature and we'll schedule install within 10 days."],
    ["Text me photos of the storm damage when you get a chance.", "Sending now…", "Got them, thanks. Hector will review tonight."],
    ["Punch list walkthrough scheduled for Saturday 10am.", "Confirmed."],
    ["Balance due after insurance = $1,850. Pay link: ra-pay.com/inv/4421", "Paid. Thanks!", "Received. Receipt emailed."],
    ["Hey Tyrell — my neighbor wants a quote too.", "Awesome. Send their number and I'll call today."],
    ["Crew is wrapping up. Please take a look and let me know.", "Looks amazing. Thank you!"],
    ["Warranty claim received — Olivia will text you a window tomorrow.", "Thanks!"],
    ["Your inspection is scheduled Friday 2pm with Hector.", "Can we move to 3pm?", "Done — 3pm Friday confirmed."],
    ["Just checking on the supplement status.", "Waiting on Linda Bellamy. Should hear back by Thursday.", "Thanks for the update."],
    ["Signed contract received. Ordering materials today.", "Great!"],
    ["HOA approved the Driftwood color.", "Perfect — matching install to that."],
    ["Canvassing your neighborhood tomorrow — anyone else you know needs a quote?", "My neighbor Rick Houston — 404-555-7712."],
    ["Reminder: final walkthrough Monday 11am.", "Will be there."],
    ["Thanks for choosing Restore America. Would you leave us a Google review?", "Happy to — 5 stars incoming."],
  ];

  const ORG_PHONE = "+14702057445";
  const rows: any[] = [];
  const used = new Set<number>();
  for (let i = 0; i < 20; i++) {
    let cid: number;
    do { cid = contactIds[rand(0, contactIds.length - 1)]; } while (used.has(cid) && used.size < contactIds.length);
    used.add(cid);
    const { data: contact } = await sb.from("contacts").select("phone").eq("id", cid).single();
    const tpl = THREAD_TEMPLATES[i % THREAD_TEMPLATES.length];
    const baseTs = TODAY.getTime() - rand(0, 18) * DAY_MS - rand(0, 60) * 60 * 1000;
    tpl.forEach((body, idx) => {
      const outbound = idx % 2 === 0;
      const ts = new Date(baseTs + idx * 4 * 60 * 1000).toISOString();
      rows.push({
        org_id: ORG_ID, contact_id: cid,
        direction: outbound ? "outbound" : "inbound",
        body, status: "delivered",
        from_number: outbound ? ORG_PHONE : (contact?.phone ?? ""),
        to_number: outbound ? (contact?.phone ?? "") : ORG_PHONE,
        sent_at: ts, created_at: ts,
      });
    });
  }
  if (rows.length) {
    const { error } = await sb.from("sms_messages").insert(rows);
    if (error) console.warn(`[sms] insert warn: ${error.message}`);
    else console.log(`[sms] inserted ${rows.length} messages across ${used.size} threads`);
  }
}

// ---------- CAMPAIGNS --------------------------------------------------------
type CampaignSpec = {
  name: string; type: "email" | "sms"; subject?: string; body: string;
  status: "draft" | "scheduled" | "sent";
  sentDaysAgo?: number; scheduledDaysFromNow?: number;
  audienceSize: number; openRate?: number; clickRate?: number; bounceRate?: number;
  metricsSnapshot?: Record<string, number | string>;
};
const CAMPAIGNS: CampaignSpec[] = [
  {
    name: "Feb 2026 Metro ATL Hailstorm — Free 24hr Inspection",
    type: "email",
    subject: "Free 24-hour inspection — we're in your neighborhood",
    body: "Hi {{first_name}},\n\nThe Feb 14 hailstorm hit your neighborhood hard. Restore America is offering FREE 24-hour inspections with our in-house insurance experts — no obligation.\n\nReply or call (470) 205-7445 to book.\n\n— The Restore America team",
    status: "sent", sentDaysAgo: 61, audienceSize: 847,
    openRate: 0.384, clickRate: 0.121, bounceRate: 0.018,
    metricsSnapshot: { inspections_booked: 52 },
  },
  {
    name: "Tampa Homeowners: Hurricane Season Prep",
    type: "sms",
    body: "Restore America: Tampa, get a free pre-season roof inspection this month. (813) 489-3102. Reply STOP to opt out.",
    status: "sent", sentDaysAgo: 48, audienceSize: 412,
    openRate: 1.0, clickRate: 0.187, bounceRate: 0.022,
  },
  {
    name: "Your Roof Is 18+ Years Old",
    type: "email",
    subject: "Your roof is 18+ years old — time for a check-up",
    body: "Hi {{first_name}},\n\nOur records show your roof is 18+ years old. Even without visible damage, that's the age when carriers start denying claims. A free inspection now can save you thousands later.\n\n— Restore America",
    status: "sent", sentDaysAgo: 86, audienceSize: 312,
    openRate: 0.312, clickRate: 0.078, bounceRate: 0.025,
  },
  {
    name: "Refer a Neighbor, Both Get $500",
    type: "email",
    subject: "Refer a neighbor — both of you get $500",
    body: "Hi {{first_name}},\n\nLove your new roof? Refer a neighbor who signs up and BOTH of you get $500 after install. No cap on referrals.\n\n— Restore America",
    status: "sent", sentDaysAgo: 129, audienceSize: 523,
    openRate: 0.449, clickRate: 0.142, bounceRate: 0.016,
    metricsSnapshot: { referrals_generated: 31 },
  },
  {
    name: "5-Year Workmanship Warranty Expiring",
    type: "email",
    subject: "Your 5-year workmanship warranty is expiring",
    body: "Hi {{first_name}},\n\nYour 5-year workmanship warranty from your 2021 install is expiring this summer. Schedule a complimentary warranty-close inspection now.\n\n— Restore America",
    status: "scheduled", scheduledDaysFromNow: 13, audienceSize: 186,
  },
  {
    name: "Commercial Property Managers: Free Quarterly Inspection",
    type: "email",
    subject: "Free quarterly commercial roof inspection",
    body: "Hi {{first_name}},\n\nAs a property manager, you know deferred maintenance on a commercial TPO roof costs 3-5× more to fix. We're offering a FREE quarterly inspection to new commercial partners.\n\n— Restore America",
    status: "draft", audienceSize: 94,
  },
  {
    name: "St. Louis — Free Inspections Through April",
    type: "sms",
    body: "Restore America: Free storm inspections in St. Louis through April. (314) 618-4422. Reply STOP to opt out.",
    status: "sent", sentDaysAgo: 29, audienceSize: 148,
    openRate: 1.0, clickRate: 0.224, bounceRate: 0.02,
    metricsSnapshot: { leads_attributed: 9 },
  },
];

async function seedCampaigns(contactIds: number[]) {
  // Load contacts (with emails + phones) to use as recipients
  const { data: contactRows } = await sb.from("contacts")
    .select("id, email, phone, city, state, tags")
    .eq("org_id", ORG_ID as string).limit(1000);
  const allContacts = (contactRows ?? []) as any[];

  for (const c of CAMPAIGNS) {
    const sentAt = c.status === "sent" && c.sentDaysAgo != null ? daysAgo(c.sentDaysAgo) : null;
    const scheduledAt = c.status === "scheduled" && c.scheduledDaysFromNow != null ? daysFromNow(c.scheduledDaysFromNow) : null;
    const { data: campaign, error } = await sb.from("campaigns").insert({
      org_id: ORG_ID,
      name: c.name,
      type: c.type,
      audience_filter: {},
      audience_size: c.audienceSize,
      subject: c.subject ?? "",
      body: c.body,
      status: c.status,
      scheduled_at: scheduledAt,
      sent_at: sentAt,
      created_by: USER_ID,
      metrics_snapshot: c.metricsSnapshot ?? {},
      created_at: sentAt ? daysAgo((c.sentDaysAgo ?? 0) + 2) : daysAgo(rand(5, 20)),
    }).select().single();
    if (error) { console.warn(`[campaigns] "${c.name}" failed: ${error.message}`); continue; }
    if (c.status !== "sent") continue;

    // Build recipients
    const pool = allContacts.filter((ct) => c.type === "email" ? ct.email : ct.phone);
    const take = Math.min(c.audienceSize, pool.length);
    const shuffled = shuffle(pool).slice(0, take);
    const baseTs = new Date(sentAt!).getTime();
    const bounce = c.bounceRate ?? 0;
    const open = c.openRate ?? 0;
    const click = c.clickRate ?? 0;

    const recipientRows = shuffled.map((ct: any, i: number) => {
      const isBounced = Math.random() < bounce;
      const isOpened = !isBounced && Math.random() < open;
      const isClicked = isOpened && Math.random() < (open > 0 ? click / open : 0);
      const status = isBounced ? "bounced" : isClicked ? "clicked" : isOpened ? "opened" : "delivered";
      const jitter = i * 300 + rand(0, 2000);
      return {
        campaign_id: campaign.id,
        contact_id: ct.id,
        to_email: c.type === "email" ? (ct.email ?? "") : "",
        to_phone: c.type === "sms" ? (ct.phone ?? "") : "",
        status,
        sent_at: isBounced ? null : new Date(baseTs + jitter).toISOString(),
        opened_at: isOpened ? new Date(baseTs + jitter + rand(30, 180) * 60 * 1000).toISOString() : null,
        clicked_at: isClicked ? new Date(baseTs + jitter + rand(60, 300) * 60 * 1000).toISOString() : null,
      };
    });
    for (const batch of chunk(recipientRows, 400)) {
      const { error: rerr } = await sb.from("campaign_recipients").insert(batch);
      if (rerr) console.warn(`[campaign_recipients] batch failed: ${rerr.message}`);
    }
  }
  console.log(`[campaigns] inserted ${CAMPAIGNS.length} campaigns + recipients`);
}

// ---------- TASKS ------------------------------------------------------------
async function seedTasks(empMap: Record<string, number>, contactIds: number[]) {
  const TASK_TYPES = [
    "Call back",
    "Send estimate",
    "Upload photos to adjuster",
    "Schedule crew",
    "Order materials",
    "Follow up on claim status",
    "Punch list walkthrough",
    "Collect signed contract",
    "Warranty inspection",
  ];
  const REP_KEYS = ["tyrell", "jessica", "cody", "maria", "sam", "kenny"];
  const REP_LOAD = { tyrell: 8, jessica: 6, cody: 9, maria: 5, sam: 4, kenny: 2 }; // target distribution
  const rows: any[] = [];

  // OVERDUE 15
  for (let i = 0; i < 15; i++) {
    const repKey = REP_KEYS[i % REP_KEYS.length];
    rows.push({
      org_id: ORG_ID,
      assigned_to: USER_ID,
      employee_id: empMap[repKey],
      contact_id: contactIds[rand(0, contactIds.length - 1)],
      title: `${pick(TASK_TYPES)} — overdue ${rand(1, 9)}d`,
      description: `[rep: ${EMPLOYEES.find(e => e.key === repKey)?.first} ${EMPLOYEES.find(e => e.key === repKey)?.last}] Overdue task.`,
      due_date: dateOnly(daysAgo(rand(1, 12))),
      status: "pending",
      priority: pick(["high", "medium", "high"]),
      created_at: daysAgo(rand(10, 25)),
    });
  }
  // DUE THIS WEEK 15
  for (let i = 0; i < 15; i++) {
    const repKey = REP_KEYS[i % REP_KEYS.length];
    rows.push({
      org_id: ORG_ID,
      assigned_to: USER_ID,
      employee_id: empMap[repKey],
      contact_id: contactIds[rand(0, contactIds.length - 1)],
      title: pick(TASK_TYPES),
      description: `[rep: ${EMPLOYEES.find(e => e.key === repKey)?.first} ${EMPLOYEES.find(e => e.key === repKey)?.last}] Follow-up required.`,
      due_date: dateOnly(daysFromNow(rand(0, 6))),
      status: "pending",
      priority: pick(["low", "medium", "high"]),
      created_at: daysAgo(rand(2, 8)),
    });
  }
  // COMPLETED LAST 7D 10
  for (let i = 0; i < 10; i++) {
    const repKey = REP_KEYS[i % REP_KEYS.length];
    const completedAt = daysAgo(rand(0, 7), 12);
    rows.push({
      org_id: ORG_ID,
      assigned_to: USER_ID,
      employee_id: empMap[repKey],
      contact_id: contactIds[rand(0, contactIds.length - 1)],
      title: pick(TASK_TYPES),
      description: `[rep: ${EMPLOYEES.find(e => e.key === repKey)?.first} ${EMPLOYEES.find(e => e.key === repKey)?.last}] Completed.`,
      due_date: dateOnly(new Date(new Date(completedAt).getTime() + rand(-3, 2) * DAY_MS).toISOString()),
      status: "completed",
      priority: pick(["low", "medium"]),
      created_at: daysAgo(rand(8, 20)),
      completed_at: completedAt,
    });
  }
  const { error } = await sb.from("tasks").insert(rows);
  if (error) throw new Error(`[tasks] insert failed: ${error.message}`);
  console.log(`[tasks] inserted ${rows.length} rows (15 overdue, 15 this-week, 10 completed)`);
}

// ---------- EVENTS -----------------------------------------------------------
async function seedEvents(contactIds: number[], empMap: Record<string, number>) {
  type EventSpec = { title: string; description: string; dayOffset: number; hour: number; durH: number; locationLabel: string };
  const specs: EventSpec[] = [
    // Inspections (8 this week)
    ...Array.from({ length: 8 }, (_, i) => ({
      title: `Inspection — ${pick(FIRST_POOL)} ${pick(LAST_POOL)}`,
      description: `Free 24-hour inspection. ${pick(["Residential", "Commercial"])} property.`,
      dayOffset: rand(0, 6), hour: rand(9, 17), durH: 1, locationLabel: pick(["Atlanta", "Walton County", "Tampa", "Orlando", "Jacksonville"]),
    })),
    // Installs (6 next 14 days)
    ...Array.from({ length: 6 }, (_, i) => ({
      title: `Install — ${pick(FIRST_POOL)} ${pick(LAST_POOL)}`,
      description: `Tear-off + install. Crew starts 7am sharp.`,
      dayOffset: rand(1, 14), hour: 7, durH: 10, locationLabel: pick(["Atlanta", "Walton County", "Tampa", "St. Louis"]),
    })),
    // Walkthroughs (3)
    ...Array.from({ length: 3 }, (_, i) => ({
      title: `Punch-list walkthrough — ${pick(FIRST_POOL)} ${pick(LAST_POOL)}`,
      description: `Final walkthrough with PM.`,
      dayOffset: rand(1, 10), hour: 11, durH: 1, locationLabel: pick(["Atlanta", "Tampa", "Orlando"]),
    })),
    // Adjuster meetings (2)
    ...Array.from({ length: 2 }, (_, i) => ({
      title: `Adjuster meeting — ${pick(["Mike Prescott", "Linda Bellamy"])}`,
      description: `On-site scope review with carrier adjuster.`,
      dayOffset: rand(1, 10), hour: 14, durH: 1, locationLabel: "Atlanta",
    })),
    // Canvassing shifts (4)
    ...Array.from({ length: 4 }, (_, i) => ({
      title: `Canvassing shift — ${pick(["Tyrell", "Jessica", "Cody", "Maria", "Kenny"])}`,
      description: `Post-storm door-knock shift.`,
      dayOffset: rand(1, 10), hour: 10, durH: 6, locationLabel: pick(["Atlanta", "Walton County", "Tampa", "St. Louis", "Kansas City"]),
    })),
    // Internal (2)
    { title: "Weekly Sales Standup", description: "All-hands sales review.", dayOffset: 2, hour: 9, durH: 1, locationLabel: "HQ" },
    { title: "Supplements Coordinator Review", description: "Tanya + Rebecca cross-review pending supplements.", dayOffset: 4, hour: 10, durH: 1, locationLabel: "Atlanta" },
  ];

  const rows = specs.map((s) => {
    const start = new Date(TODAY.getTime() + s.dayOffset * DAY_MS);
    start.setUTCHours(s.hour, 0, 0, 0);
    const end = new Date(start.getTime() + s.durH * 3600 * 1000);
    return {
      org_id: ORG_ID,
      created_by: USER_ID,
      title: s.title,
      description: s.description,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      location: s.locationLabel,
      contact_id: contactIds[rand(0, contactIds.length - 1)],
    };
  });
  const { error } = await sb.from("events").insert(rows);
  if (error) throw new Error(`[events] insert failed: ${error.message}`);
  console.log(`[events] inserted ${rows.length} rows`);
}

// ---------- INCIDENTS + WRITE-UPS -------------------------------------------
async function seedIncidentsAndWriteUps(empMap: Record<string, number>, locIds: Record<MarketKey, number>) {
  const incRows = [
    {
      org_id: ORG_ID, employee_id: empMap.jamal, location_id: locIds.atlanta,
      incident_date: daysAgo(60), type: "injury", severity: "low",
      description: "Installer slipped on 8:12 pitch, caught by harness. No medical treatment needed. Harness inspection completed.",
      status: "resolved", created_by: USER_ID,
    },
    {
      org_id: ORG_ID, employee_id: empMap.brian, location_id: locIds.tampa,
      incident_date: daysAgo(90), type: "damage", severity: "medium",
      description: "Broken AC condenser cover during tear-off. Reimbursed customer $340 via check within 48 hours.",
      status: "resolved", created_by: USER_ID,
    },
    {
      org_id: ORG_ID, employee_id: empMap.sam, location_id: locIds.jacksonville,
      incident_date: daysAgo(28), type: "other", severity: "medium",
      description: "Material shortage delay — Timberline HDZ Charcoal backorder pushed install by 4 days. Customer updated daily.",
      status: "investigating", created_by: USER_ID,
    },
    {
      org_id: ORG_ID, employee_id: empMap.victor, location_id: locIds.walton,
      incident_date: daysAgo(20), type: "customer_complaint", severity: "low",
      description: "Customer complained about debris cleanup. Crew returned next day with magnet sweep. Customer satisfied.",
      status: "resolved", created_by: USER_ID,
    },
  ];
  await sb.from("incident_reports").insert(incRows);
  console.log(`[incident_reports] inserted ${incRows.length} rows`);

  const wuRows = [
    {
      org_id: ORG_ID, employee_id: empMap.install3,
      write_up_date: dateOnly(daysAgo(45)), reason: "Tardiness — 20 min late twice in one week",
      description: "Verbal warning.", severity: "verbal", issued_by: USER_ID,
    },
    {
      org_id: ORG_ID, employee_id: empMap.install4,
      write_up_date: dateOnly(daysAgo(30)), reason: "Tardiness",
      description: "Second verbal; will escalate to written on next incident.", severity: "verbal", issued_by: USER_ID,
    },
    {
      org_id: ORG_ID, employee_id: empMap.install2,
      write_up_date: dateOnly(daysAgo(14)), reason: "Safety — not wearing harness on 10:12 pitch",
      description: "Written warning. Mandatory safety refresher scheduled.", severity: "written", issued_by: USER_ID,
    },
  ];
  await sb.from("write_ups").insert(wuRows);
  console.log(`[write_ups] inserted ${wuRows.length} rows`);
}

// ---------- NOTIFICATIONS ----------------------------------------------------
async function seedNotifications() {
  const notifs = [
    { type: "lead_created",       title: "New lead created",                        body: "Diana Koehler from Feb 2026 ATL Hail campaign",                         hoursAgo: 0.4 },
    { type: "claim_approved",     title: "Claim approved",                          body: "Adjuster Denise Carrington approved claim ALL-2026-41298 for $19,400", hoursAgo: 1.2 },
    { type: "task_overdue",       title: "Task overdue",                            body: "Upload photos to adjuster for Job #142",                                hoursAgo: 2.1 },
    { type: "deal_closed",        title: "Deal closed",                             body: "Tyrell Washington closed Mark Henderson — $22,400",                    hoursAgo: 3.0 },
    { type: "campaign_complete",  title: "Campaign completed",                      body: "'Tampa Hurricane Prep' hit 18.7% click rate",                           hoursAgo: 4.0 },
    { type: "warranty_filed",     title: "Warranty claim filed",                    body: "Grace Wilmot, 2023 install",                                            hoursAgo: 5.5 },
    { type: "commercial_lead",    title: "New commercial lead",                     body: "Brookstone Heights HOA — est $87k, 14 units",                           hoursAgo: 7.3 },
    { type: "storm_tagged",       title: "New leads from Feb ATL Hail",             body: "8 new leads tagged in the last 48h",                                   hoursAgo: 9.0 },
    { type: "supplement_pending", title: "Supplement pending > 30d",                body: "14 leads in Insurance Pending stage > 30 days",                        hoursAgo: 10.5 },
    { type: "install_today",      title: "Install starts today",                    body: "Bill Tavares — Atlanta GA Crew 1, 7am start",                          hoursAgo: 12.0 },
    { type: "inspection_booked",  title: "Inspection booked",                       body: "Sarah Levine — Saturday 10am with Hector Ramirez",                      hoursAgo: 14.0 },
    { type: "save_attempted",     title: "Save attempt in progress",                body: "Hannah Ortiz — Tanya Whitmore calling within 30 min",                   hoursAgo: 15.0 },
    { type: "adjuster_call",      title: "Adjuster coordination",                   body: "Mike Prescott (State Farm) needs ridge photos for SF-2026-18742",      hoursAgo: 17.5 },
    { type: "crew_wrapping",      title: "Crew wrapping up",                        body: "GA Crew 2 finishing Walton County job",                                 hoursAgo: 19.0 },
    { type: "at_risk_customer",   title: "Customer health dropping",                body: "3 customers in Tampa dropped below 70 this week",                      hoursAgo: 22.0 },
    { type: "chat_escalated",     title: "Chat escalated",                          body: "Visitor on website asked for commercial TPO — Stephen assigned",       hoursAgo: 26.0 },
    { type: "payment_received",   title: "Deductible payment received",             body: "$1,850 — Roberta Finch",                                                hoursAgo: 28.0 },
    { type: "materials_ordered",  title: "Materials ordered",                       body: "Owens Corning Duration in Driftwood — Finch install April 29",         hoursAgo: 30.0 },
    { type: "new_referral",       title: "New referral",                            body: "Jim Caldwell referred Sarah Levine — $500 credit applied",              hoursAgo: 32.0 },
    { type: "crew_added",         title: "New installer hired",                     body: "Dwayne Mathis joined MO Crew 1",                                        hoursAgo: 40.0 },
    { type: "incident_filed",     title: "Incident filed",                          body: "Material shortage delay — Jacksonville, resolved pending",             hoursAgo: 43.0 },
    { type: "warranty_repaired",  title: "Warranty repair completed",               body: "Grace Wilmot — 4 shingles replaced",                                   hoursAgo: 45.5 },
    { type: "system_snapshot",    title: "Morning snapshot",                        body: "Pipeline: 50 leads • Insurance Pending: 14 ($340k)",                    hoursAgo: 46.0 },
    { type: "sms_reply",          title: "SMS reply",                               body: "Devon Pierce replied to Tyrell's comparison sheet",                    hoursAgo: 4.2 },
    { type: "commercial_inspection", title: "Commercial inspection scheduled",      body: "Brookstone Heights HOA — Tuesday 9am with Stephen Kowalski",            hoursAgo: 8.5 },
    { type: "estimate_sent",      title: "Estimate sent",                           body: "$18,400 to Roberta Finch",                                              hoursAgo: 11.0 },
    { type: "permit_pending",     title: "Permit pending",                          body: "Walton County permit PMT-GA-48221 pending — 2d avg approval",          hoursAgo: 13.0 },
    { type: "supplement_approved",title: "Supplement approved",                     body: "Brad Thornhill (Auto-Owners) approved $4,200 supplement",              hoursAgo: 16.0 },
    { type: "call_summary",       title: "Call summary generated",                  body: "Nina handled Mark Henderson emergency leak — routed to Tyrell",        hoursAgo: 18.0 },
    { type: "lead_stuck_alert",   title: "Lead stuck > 60 days",                    body: "1 lead in Insurance Pending stuck 67 days (adjuster on leave)",        hoursAgo: 23.0 },
    { type: "campaign_scheduled", title: "Campaign scheduled",                      body: "'5-Year Workmanship Warranty Expiring' queued for May 1",              hoursAgo: 25.0 },
    { type: "kc_launch",          title: "Kansas City office operational",          body: "Kenny Okafor onboarded; 2 leads inbound",                               hoursAgo: 34.0 },
    { type: "gm_review",          title: "GM review ready",                         body: "Weekly snapshot: 10 jobs in progress, $1.28M in approved jobs",         hoursAgo: 38.0 },
    { type: "storm_forecast",     title: "Storm forecast alert",                    body: "Severe weather possible in Orlando metro next week",                    hoursAgo: 41.0 },
    { type: "review_request",     title: "5-star review received",                  body: "Roberta Finch left a 5-star Google review",                             hoursAgo: 2.7 },
  ];
  const rows = notifs.map((n, i) => ({
    org_id: ORG_ID,
    user_id: USER_ID,
    type: n.type,
    title: n.title,
    body: n.body,
    read: i >= 30, // first 30 unread
    created_at: new Date(TODAY.getTime() - n.hoursAgo * 3600 * 1000).toISOString(),
  }));
  const { error } = await sb.from("notifications").insert(rows);
  if (error) throw new Error(`[notifications] insert failed: ${error.message}`);
  console.log(`[notifications] inserted ${rows.length} rows (30 unread)`);
}

// ---------- MAIN -------------------------------------------------------------
async function main() {
  console.log(`\n=== Seeding Restore America demo into org ${ORG_ID} ===`);
  console.log(`Today: ${TODAY.toISOString().slice(0, 10)}`);

  if (FORCE) await wipeDemoData();

  await ensureOrg();
  const locIds = await seedLocations();
  const empMap = await seedEmployees(locIds);
  const crewMap = await seedCrews(empMap, locIds);
  const adjMap = await seedAdjusters();
  const stormMap = await seedStormEvents();

  const { leadIds, contactIds } = await seedLeadsAndContacts(locIds, empMap, adjMap, stormMap);
  await seedJobs(locIds, empMap, adjMap, stormMap, crewMap, leadIds, contactIds);

  const voiceAgentId = await seedVoiceAgents();
  const { namedLeadByPerson } = { namedLeadByPerson: new Map<string, number>() };
  await seedCallsAndTranscripts(voiceAgentId, locIds, contactIds, namedLeadByPerson);
  await seedChatSessions();
  await seedSmsThreads(contactIds);
  await seedCampaigns(contactIds);
  await seedTasks(empMap, contactIds);
  await seedEvents(contactIds, empMap);
  await seedIncidentsAndWriteUps(empMap, locIds);
  await seedNotifications();

  console.log(`\n=== Seed complete ===`);
  console.log(`  1 org (${ORG_NAME})`);
  console.log(`  ${EMPLOYEES.length} employees`);
  console.log(`  ${ADJUSTER_SPECS.length} insurance adjusters`);
  console.log(`  ${STORM_SPECS.length} storm events`);
  console.log(`  50 leads, 140 contacts, 60 jobs`);
  console.log(`  30 calls with full transcripts, 15 chat sessions, ~20 SMS threads`);
  console.log(`  7 campaigns with recipients, 40 tasks, 25 events`);
  console.log(`  4 incidents, 3 write-ups, 35 notifications`);
  console.log(`\nLogin as Brandon (user ${USER_ID}) to see the dashboard.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
