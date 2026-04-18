# E3C Grid Hub — CRM Feature Buildout Prompt

Copy everything below the line and paste it into Claude Code Terminal as a single prompt.

---

You are building out the remaining CRM features for the E3C Grid Hub app. The app is at the current working directory. It's a React 19 + Express + tRPC + Supabase app with an OpenClaw AI agent that uses MCP tools to take actions in the CRM.

## WHAT ALREADY EXISTS

**Database tables (Supabase PostgreSQL with RLS):**
- `contacts` — full contact profiles with stages (lead→contacted→qualified→proposal→won→lost)
- `contact_notes` — interaction notes per contact (has `contact_id` column)
- `deals` — opportunities linked to contacts (value, stage, probability, close date)
- `tasks` — tasks with status, priority, due dates, optional contact linking
- `activities` — auto-logged timeline entries (type: note|email|call|task|stage_change|deal_created)
- `events` — calendar events with start/end times, optional contact linking
- `email_templates` — saved reusable email templates (name, subject, body)
- `email_logs` — every email sent (to, subject, body, status, linked contact)
- `conversations` — OpenClaw AI chat history
- `organizations` — full business profile (name, industry, phone, email, website, address, timezone, email settings)
- `org_members` — team members with first_name, last_name, phone, title, role, referral_code

**tRPC routers that exist:**
- `contacts` — list, get, create, update, updateStage, delete
- `notes` — list (by contactId), add, delete
- `deals` — list (by contactId), create, update, delete
- `tasks` — list, listForContact, create, complete, update, delete
- `activities` — listForContact
- `calendar` — list, listForContact, create, update, delete
- `emailTemplates` — list, create, delete
- `emailLogs` — listForContact
- `org` — create, current, members, updateProfile, updateMember
- `ai` — chat, conversations
- `qr` — getMyCode, getMyCodeSVG
- `beta` — submit, listSignups

**MCP tools (16 total in server/mcp.ts):**
search_contacts, get_contact, create_contact, update_contact, update_contact_stage, get_contact_timeline, add_note, create_task, list_tasks, create_deal, list_deals, get_pipeline_summary, send_email, create_event, list_events, get_org_profile

**UI pages that exist:**
- `/crm` — Contacts list with search, filters, detail panel with notes, stage dropdown, + Add button. Has AI chat sidebar and QR sidebar. Nav tabs: Contacts, Pipeline, Tasks, Dashboard, Settings.
- `/crm/pipeline` — Drag-and-drop kanban board (6 columns)
- `/crm/tasks` — Task list grouped by pending/completed, add task dialog
- `/crm/dashboard` — Stats cards + pipeline bar chart + stage pie chart + weekly signups chart
- `/crm/settings` — Your Profile, Business Profile, Email Settings, Team Members

**Key patterns to follow:**
- All data is org-scoped via `org_id` + Supabase RLS
- tRPC procedures use `orgProcedure` which guarantees `ctx.user.orgId` exists
- DB functions are in `server/db.ts` and take a `SupabaseClient` as first arg
- MCP tools are in `server/mcp.ts` using `@modelcontextprotocol/sdk` with `McpServer.tool()`
- MCP tools use `supabaseAdmin` (bypasses RLS) since OpenClaw doesn't have a user session
- UI components match the dark luxury aesthetic: charcoal bg (`oklch(0.10...)`), gold accents (`oklch(0.78 0.12 75)`)
- Cache invalidation after mutations: `utils.<router>.<procedure>.invalidate()`
- After AI chat response, contacts + tasks caches are auto-invalidated in CRM.tsx

## WHAT TO BUILD

Execute all sections below in order. After each section, run `pnpm check` to verify no TypeScript errors. Push to git after completing all sections.

---

### SECTION 1: Calendar Page (`/crm/calendar`)

Create `client/src/pages/Calendar.tsx` — a calendar/schedule view:

- Uses `CrmLayout` wrapper (import from `@/components/CrmLayout`)
- Fetches events with `trpc.calendar.list.useQuery()`
- Shows events grouped by day (today, tomorrow, this week, later)
- Each event card shows: title, start/end time, location, linked contact name (if any)
- "Add Event" button opens a dialog with: title, description, date, start time, end time, location, contact (optional dropdown of contacts from `trpc.contacts.list`)
- Delete button on each event
- Match the existing dark luxury aesthetic

Add the route in `client/src/App.tsx`:
```
<Route path="/crm/calendar" component={Calendar} />
```
Place it before the `/crm` catch-all route.

Add "Calendar" to the nav in `client/src/components/CrmLayout.tsx` NAV_ITEMS array (use `Calendar` icon from lucide-react). Also add it to the inline nav tabs in `client/src/pages/CRM.tsx`.

---

### SECTION 2: Deals Section in Contact Detail Panel

In `client/src/pages/CRM.tsx`, add a `DealsSection` component to the `DetailPanel`. Place it after the Notes section, before the Actions buttons.

The `DealsSection` should:
- Fetch deals with `trpc.deals.list.useQuery({ contactId: contact.id })`
- Show each deal as a card: title, value (formatted as $X,XXX), stage badge, expected close date
- "Add Deal" button opens an inline form with: title, value ($), probability (0-100), expected close date
- Delete button on each deal (with `trpc.deals.delete.useMutation`)
- After mutations, invalidate `utils.deals.list`

---

### SECTION 3: Activity Timeline in Contact Detail Panel

In `client/src/pages/CRM.tsx`, add an `ActivityTimeline` component to the `DetailPanel`. Place it between the contact info and the Notes section.

The `ActivityTimeline` should:
- Fetch activities with `trpc.activities.listForContact.useQuery({ contactId: contact.id })`
- Render a vertical timeline with an icon per type:
  - `note` → StickyNote icon
  - `email` → Mail icon
  - `call` → Phone icon
  - `task` → CheckSquare icon
  - `stage_change` → ArrowRight icon
  - `deal_created` → DollarSign icon
- Each entry shows: icon, content text, relative timestamp (e.g., "2 hours ago", "yesterday")
- Limit to 20 most recent, ordered newest first
- If empty, show "No activity yet"

---

### SECTION 4: Email Compose in Contact Detail Panel

In `client/src/pages/CRM.tsx`, add an `EmailSection` component to the `DetailPanel`. Place it after Deals, before Actions.

The `EmailSection` should:
- Have a "Compose Email" button that expands an inline form
- Form fields: Subject, Body (textarea, 6 rows)
- "Send" button calls a new tRPC mutation `emails.send` (create this)
- Show sent email history below the form from `trpc.emailLogs.listForContact.useQuery({ contactId })`
- Each sent email shows: subject, truncated body, timestamp, status badge (sent/failed)

Create the `emails.send` tRPC procedure in `server/routers.ts`:
```typescript
emails: router({
  send: orgProcedure
    .input(z.object({
      contactId: z.number().int().positive(),
      toEmail: z.string().email(),
      subject: z.string().min(1),
      body: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get org email settings
      const { data: org } = await ctx.supabase!.from("organizations")
        .select("name, email_from_name, email_reply_to, email_signature")
        .eq("id", ctx.user.orgId!).single();

      const fromName = org?.email_from_name || org?.name || "GridWorker OS";
      const signature = org?.email_signature ? `\n\n${org.email_signature}` : "";
      const fullBody = input.body + signature;

      // Send via Resend
      const { Resend } = await import("resend");
      const resend = new Resend(ENV.resendApiKey);
      const { data: result, error } = await resend.emails.send({
        from: `${fromName} <onboarding@resend.dev>`,
        to: input.toEmail,
        subject: input.subject,
        text: fullBody,
        ...(org?.email_reply_to ? { replyTo: org.email_reply_to } : {}),
      });

      // Log the email
      await logEmail(ctx.supabase!, {
        org_id: ctx.user.orgId!, contact_id: input.contactId, user_id: ctx.user.id,
        to_email: input.toEmail, subject: input.subject, body: fullBody,
        status: error ? "failed" : "sent", resend_id: result?.id,
      });

      // Log activity
      await logActivity(ctx.supabase!, {
        org_id: ctx.user.orgId!, contact_id: input.contactId, user_id: ctx.user.id,
        type: "email", content: `Sent email: "${input.subject}"`,
        metadata: { to: input.toEmail, subject: input.subject },
      });

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { success: true };
    }),
}),
```

Import `logEmail` and `logActivity` from `"./db"` and `ENV` from `"./_core/env"`.

---

### SECTION 5: Email Templates Page

Create `client/src/pages/EmailTemplates.tsx`:
- Uses `CrmLayout` wrapper
- Lists all templates from `trpc.emailTemplates.list.useQuery()`
- Each template card shows: name, subject, preview of body
- "Create Template" button opens a dialog: name, subject, body (textarea)
- Delete button on each template
- Add route `/crm/templates` in App.tsx
- Add "Templates" to CRM nav (use `FileText` icon from lucide-react)

---

### SECTION 6: Missing MCP Tools

Add these tools to `server/mcp.ts` (inside the `createMcpServer` function, before `return server`):

**update_task** — Update a task's title, description, due date, priority, or status.
```
Params: task_id (number), title? (string), description? (string), due_date? (string YYYY-MM-DD), priority? (low|medium|high), status? (pending|completed|cancelled)
```

**assign_task** — Reassign a task to a different team member.
```
Params: task_id (number), assigned_to (string - user ID)
```

**update_deal** — Update a deal's title, value, stage, probability, or close date.
```
Params: deal_id (number), title? (string), value? (number), stage? (lead|contacted|qualified|proposal|won|lost), probability? (number 0-100), expected_close_date? (string YYYY-MM-DD)
```

**delete_deal** — Delete a deal.
```
Params: deal_id (number)
```

**update_event** — Reschedule or edit a calendar event.
```
Params: event_id (number), title? (string), description? (string), start_at? (string ISO), end_at? (string ISO), location? (string)
```

**delete_event** — Cancel/delete a calendar event.
```
Params: event_id (number)
```

**list_email_templates** — List saved email templates for the org.
```
Params: org_id (string)
```

**create_email_template** — Save a new reusable email template.
```
Params: org_id (string), user_id (string), name (string), subject (string), body (string)
```

**get_dashboard_stats** — Get comprehensive CRM analytics.
```
Params: org_id (string)
Returns: total contacts, contacts by stage, total deals, total deal value, won revenue, pending tasks, overdue tasks, events this week
```

**add_tag** — Add a tag to a contact's tags array.
```
Params: contact_id (number), tag (string)
Implementation: fetch contact, append tag to tags array if not already present, update
```

**remove_tag** — Remove a tag from a contact.
```
Params: contact_id (number), tag (string)
Implementation: fetch contact, filter out the tag, update
```

**get_activity_feed** — Get recent activity across all contacts for the org.
```
Params: org_id (string), limit? (number, default 20)
```

Each tool follows the same pattern as existing tools in `server/mcp.ts`:
- Use `server.tool(name, description, { params with z.describe() }, async handler)`
- Use `supabaseAdmin` for queries
- Return `{ content: [{ type: "text" as const, text: "result" }] }`

---

### SECTION 7: Update OpenClaw System Prompt

In `server/openclaw.ts`, find the CRM Tools section in `buildSystemPrompt` and add the new tools to the list:

Under NOTES & TASKS add:
- **update_task**: Edit task title, due date, priority, status. Pass task_id.
- **assign_task**: Reassign task to team member. Pass task_id, assigned_to (user_id).

Under DEALS add:
- **update_deal**: Edit deal value, stage, close date. Pass deal_id.
- **delete_deal**: Remove a deal. Pass deal_id.

Add new CALENDAR section:
- **update_event**: Reschedule/edit event. Pass event_id.
- **delete_event**: Cancel event. Pass event_id.

Add new EMAIL TEMPLATES section:
- **list_email_templates**: Get saved templates. Pass org_id.
- **create_email_template**: Save new template. Pass org_id, user_id.

Add new ANALYTICS section:
- **get_dashboard_stats**: Full CRM analytics. Pass org_id.
- **get_activity_feed**: Recent activity across all contacts. Pass org_id.

Add new TAGS section:
- **add_tag**: Tag a contact. Pass contact_id, tag.
- **remove_tag**: Remove tag. Pass contact_id, tag.

Update RESPONSE GUIDELINES to include:
- When asked to schedule/reschedule, use create_event or update_event
- When asked about analytics/stats, use get_dashboard_stats
- When asked to tag contacts, use add_tag/remove_tag
- When asked to use a template, use list_email_templates to find it, then send_email with the template content

---

### SECTION 8: Auto-refresh After AI Actions

In `client/src/pages/CRM.tsx`, the `chatMutation.onSuccess` already invalidates `contacts.list` and `tasks.list`. Expand it to also invalidate:
- `utils.deals.list.invalidate()` (if the deals router is used)
- `utils.activities.listForContact.invalidate()` (if any exist)
- `utils.calendar.list.invalidate()`
- `utils.emailLogs.listForContact.invalidate()` (if any exist)

Use a simple approach: just invalidate all queries after AI response:
```typescript
// In chatMutation onSuccess:
utils.contacts.list.invalidate();
utils.tasks.list.invalidate();
utils.calendar.list.invalidate();
```

---

### FINAL VERIFICATION

1. Run `pnpm check` — zero TypeScript errors
2. Run `pnpm build:client` — frontend builds successfully
3. Git add all changes and commit with message:
```
Complete CRM buildout: Calendar, Deals UI, Timeline, Email compose, Templates, 12 new MCP tools

- Calendar page at /crm/calendar with event management
- Deals section in contact detail panel (add, view, delete deals)
- Activity timeline in contact detail panel (auto-logged history)
- Email compose in contact detail (send + view sent emails)
- Email templates page at /crm/templates (create, list, delete)
- 12 new MCP tools: update_task, assign_task, update_deal, delete_deal,
  update_event, delete_event, list_email_templates, create_email_template,
  get_dashboard_stats, add_tag, remove_tag, get_activity_feed
- OpenClaw prompt updated with all 28 tools
- Auto-refresh all CRM data after AI actions
```
4. Push to GitHub (auto-deploys to VPS + Vercel)

---

## FILES REFERENCE

Key files you'll be modifying:
- `client/src/pages/CRM.tsx` — add DealsSection, ActivityTimeline, EmailSection to DetailPanel
- `client/src/pages/Calendar.tsx` — NEW: calendar page
- `client/src/pages/EmailTemplates.tsx` — NEW: templates page
- `client/src/App.tsx` — add Calendar + Templates routes
- `client/src/components/CrmLayout.tsx` — add Calendar + Templates to NAV_ITEMS
- `server/routers.ts` — add emails.send procedure
- `server/mcp.ts` — add 12 new MCP tools
- `server/openclaw.ts` — update system prompt with new tools
