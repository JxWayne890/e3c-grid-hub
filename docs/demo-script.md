# Restore America Demo Script — 15 Questions for OpenClaw

Use these questions to rehearse the live demo. Each entry lists the intended OpenClaw phrasing, the MCP tool(s) it should call, and what the answer should sound like.

## 1. "Which leads came in from the February Atlanta hailstorm?"
- **Tool:** `get_leads_by_storm_event` with `storm_name: "Feb Atlanta"`
- **Expected:** count of ~15–20 leads, list sorted by `created_at` desc, carriers heavy on State Farm / Allstate / Travelers, cities Atlanta + Walton County.

## 2. "Show me insurance claims stuck for more than 14 days."
- **Tool:** `get_pipeline_stuck_leads` (stage defaults to `insurance_pending`, min_days 14)
- **Expected:** 8–10 leads including the 18d, 21d, 24d, 28d, 35d, 42d, 50d, and the **67-day outlier** ("adjuster Denise Carrington on leave"). Total stuck value ~$180–220k.

## 3. "Which adjusters approve supplements fastest?"
- **Tool:** `get_adjuster_stats` with `rank_by: "avg_approval_days"` ascending
- **Expected:** Jerry Nakamura (USAA, 3.1d) #1, Brad Thornhill (Auto-Owners, 3.8d) #2, Stephanie Vogel (Progressive, 4.9d), Mike Prescott (State Farm, 4.2d).

## 4. "Which adjusters approve the highest supplement percentages?"
- **Tool:** `get_adjuster_stats` (default rank = `avg_supplement_pct`)
- **Expected:** Brad Thornhill #1 (24%), Jerry Nakamura (22%), Aaron Brinkley (19%), Mike Prescott (18%). Line the demo narrative: "Brad's our best — always route Auto-Owners to him."

## 5. "What's our crew utilization for the next 2 weeks?"
- **Tool:** `get_crew_utilization` with `days_ahead: 14`
- **Expected:** 4 crews listed. GA Crew 1 near capacity, GA Crew 2 moderate, FL Crew 1 near capacity, MO Crew 1 ramping. Percentages in the 50–100% range.

## 6. "Who on my team has the most overdue tasks?"
- **Tool:** `list_tasks` then inspect `employee_id` distribution
- **Expected:** Overdue task list of 15. Tyrell (8), Jessica (6), Cody (9), Maria (5), Sam (4), Kenny (2) across the combined overdue + this-week buckets. Cody top of the list.

## 7. "Give me a status update on Mark Henderson's job."
- **Tool:** `get_job_details` with `customer_name: "Mark Henderson"` + org_id
- **Expected:** If a job was linked (some records link lead→job), full record; otherwise `get_contact_full_context` falls back to his contact, emergency-tarp call transcript, tagged as Feb 2026 ATL Hail, insurance State Farm.

## 8. "What campaigns are scheduled to send this quarter?"
- **Tool:** `list_campaigns` with `status: "scheduled"` (existing tool)
- **Expected:** "5-Year Workmanship Warranty Expiring" for ~2026-05-01, audience size 186. Also the Draft for Commercial Property Managers (94).

## 9. "Summarize the call with Devon Pierce."
- **Tool:** `list_calls_by_disposition` to find it, then `get_call_transcript` (existing)
- **Expected:** Devon raised a $4,200 cash-bid objection; Nina differentiated on supplements + GAF certification + BBB; callback scheduled with Tyrell. 5-sentence summary.

## 10. "Top 5 adjusters by total approved dollars."
- **Tool:** `get_top_adjusters_by_approved_value`
- **Expected:** Reflects the 60 seeded jobs. GA adjusters (Mike Prescott, Brad Thornhill, Linda Bellamy) typically lead; FL's Miguel Cortez + Kevin Solomon mid-pack; MO adjusters newer with fewer jobs.

## 11. "Top sales rep closed this month."
- **Tool:** `get_top_rep_closed_this_month`
- **Expected:** Tyrell Washington or Cody Blackwell at the top by closed contract $. Figures in the low to mid six figures across scheduled + completed jobs this month.

## 12. "Show me the pipeline — how many leads are in Insurance Pending and what's the total value?"
- **Tool:** `list_leads` with `stage: "insurance_pending"` + client-side sum (or `get_pipeline_stuck_leads` min_days 0)
- **Expected:** Exactly **14 leads**, total estimated insurance value ~$340k.

## 13. "Which customers are at risk?"
- **Tool:** `get_at_risk_customers` (max_score 70)
- **Expected:** Small set of completed customers with a health score < 70 — warranty flags, recent complaints, or churn risk signals.

## 14. "Who referred the most customers?"
- **Tool:** `get_referral_network`
- **Expected:** Leaderboard of top referrers. Total referrals ~30–40 across the network. Handful of "referrer" tagged past customers at the top.

## 15. "What does our Tampa windstorm pipeline look like?"
- **Tool:** `list_storm_events` → grab the Tampa storm id → `get_leads_by_storm_event` + `list_jobs` filtered by that storm
- **Expected:** Handful of Tampa leads (mostly created March 9–20), 1–2 jobs already scheduled, commercial HOA lead (Brookstone Heights) visible.

---

## Tips during the demo

- **Start with question 1** (storm-tagged leads) — the "wow" is seeing OpenClaw filter on a real-world event.
- **Pivot to question 3 or 4** (adjuster performance) — this is Restore America's actual pain point.
- **Hit question 5** (crew utilization) — operations managers will care about this most.
- **Save Mark Henderson (Q7) for the end** — the emergency-leak scenario has the best narrative arc. Also try: "what was Nina's call with Mark Henderson about?"
