# OpenClaw Integration Template

> A complete, copy-pasteable playbook for wiring an OpenClaw AI agent into a new
> SaaS app on Hostinger VPS. Based on the working e3c-grid-hub setup.
>
> Goal: any future project can follow this end-to-end and have a persistent
> chat widget that can read/write app data via MCP tools — in roughly 1–2 hours.

---

## Architecture Overview

Three Docker stacks on a single Hostinger VPS, fronted by Traefik with auto SSL:

```
                     Hostinger VPS (one box)
  ┌─────────────────────────────────────────────────────────┐
  │                                                         │
  │   ┌───────────┐   ┌──────────────┐   ┌─────────────┐    │
  │   │  Traefik  │──▶│  OpenClaw    │   │  Your API   │    │
  │   │  (proxy)  │   │  Container   │◀─▶│  Container  │    │
  │   │  +SSL     │   │  (Hostinger  │   │  (your app) │    │
  │   │           │──▶│   template)  │   │             │    │
  │   └───────────┘   └──────────────┘   └─────────────┘    │
  │         ▲              ▲                   │            │
  │         │              │                   ▼            │
  │         │              └─── MCP HTTP ──┐  Supabase      │
  │         │              (CRM tools)     │   (RLS DB)     │
  │         │                              │                │
  └─────────┼──────────────────────────────┼────────────────┘
            │                              │
       Browser                        WebSocket
       (chat UI)                       JSON-RPC
                                       /rpc
```

**Data flow for a chat message:**

1. User types in floating chat widget → tRPC mutation `ai.chat`
2. Server opens WebSocket to OpenClaw, auths with gateway token + device sig
3. Server sends `chat.send` with the message + system prompt
4. OpenClaw's LLM decides to call MCP tools (e.g. `search_contacts`)
5. OpenClaw HTTP-calls **your own API** at `/mcp` to run the tool
6. Tool reads/writes Supabase, returns result
7. LLM sees tool result, generates final reply, streams back over WebSocket
8. Server collects final text, returns to browser

**Why this layout works:**

- One VPS, no inter-host networking
- Traefik handles HTTPS for both OpenClaw and your API automatically
- The MCP server is **part of your app** (not a separate service) — you ship CRM tools as Express routes alongside tRPC
- Device pairing is one-time; runtime auth is stateless (signed challenges)

---

## Prerequisites

- A Hostinger account with VPS hosting purchased
- A Supabase project (or equivalent: Postgres + auth + RLS)
- Local dev: Node 20+, pnpm, the Anthropic SDK / OpenAI key (whichever provider you'll use inside OpenClaw)
- A domain or willingness to use Hostinger's auto-assigned `*.srv*.hstgr.cloud`

---

## Phase 1 — Spin up the OpenClaw VPS

OpenClaw ships as a **prebuilt Hostinger VPS template** — no manual install.

1. In the Hostinger panel: **VPS → Add New VPS** (or pick existing)
2. **Operating System → Application templates → OpenClaw** (image: `ghcr.io/hostinger/hvps-openclaw:latest`)
3. Pick a plan (KVM 2 minimum recommended; OpenClaw runs LLM context locally)
4. Wait for provisioning (~3–5 min). Hostinger will:
   - Spin up Ubuntu 24.04
   - Install Docker
   - Deploy three stacks under `/docker/`: `openclaw-c1cf`, `traefik`, (sometimes additional)
   - Auto-issue Let's Encrypt cert for `<stack-name>.<vps-host>.hstgr.cloud`
5. Note the auto-assigned URL — e.g. `openclaw-c1cf.srv1568356.hstgr.cloud`. This becomes your `OPENCLAW_URL`.

**Verify:**
```bash
ssh root@<vps-ip>
docker ps   # should show openclaw + traefik containers running
curl -I https://openclaw-c1cf.<your-host>.hstgr.cloud   # should return 200
```

---

## Phase 2 — Get the OpenClaw gateway token

The bootstrap token is auto-generated and stored in OpenClaw's env file.

```bash
# On the VPS
cat /docker/openclaw-c1cf/.env | grep OPENCLAW_GATEWAY_TOKEN
```

Copy the value. **This is the master operator token** — never commit it, never paste it in screenshots/chat. If exposed, rotate it (edit the `.env`, `cd /docker/openclaw-c1cf && docker compose up -d`, then update your app's env to match).

---

## Phase 3 — Generate the device keypair (locally)

OpenClaw uses Ed25519 challenge-response auth on top of the gateway token.

```bash
# On your local machine
openssl genpkey -algorithm ed25519 -out openclaw-device.pem
```

Convert PEM to single-line format for the env var:

```bash
awk 'NF {sub(/\r/, ""); printf "%s\\n", $0}' openclaw-device.pem
```

Copy that output. It's your `OPENCLAW_DEVICE_PRIVATE_KEY`.

For `OPENCLAW_DEVICE_ID`: any stable string works (e.g. `your-app-prod-001`). The first connect will register the public key against this ID via the `operator.pairing` scope.

---

## Phase 4 — Set app env vars

In your app's `.env`:

```bash
OPENCLAW_URL=https://openclaw-c1cf.srv1568356.hstgr.cloud
OPENCLAW_GATEWAY_TOKEN=<from Phase 2>
OPENCLAW_DEVICE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMC4CAQAw...\n-----END PRIVATE KEY-----\n
OPENCLAW_DEVICE_ID=your-app-prod-001
APP_URL=https://api-yourapp.<host>.hstgr.cloud   # public URL of YOUR API server
```

Add the same vars to `.env.example` (with placeholder values) and to your env validator (e.g. `server/_core/env.ts`).

---

## Phase 5 — Add the WebSocket client to your server

Create `server/openclaw.ts`. The protocol has 5 stages: connect → challenge response → subscribe → chat.send → collect streaming events.

Use the canonical implementation from this repo as your starting point:

```
server/openclaw.ts            # WebSocket client + system prompt builder
```

Key responsibilities:
- `getDeviceCredentials()` — derives pubkey from private key, signs nonces
- `authenticateWs(ws, nonce, token)` — sends `connect` request with signature
- `chatWithOpenClaw(messages, context)` — full lifecycle: open ws, auth, subscribe, send, collect events, resolve with final text
- `buildSystemPrompt(context)` — injects org_id, user_id, business snapshot, tool usage rules

**Critical pieces of the protocol** (don't change without reading the OpenClaw docs):

- `minProtocol: 3, maxProtocol: 3` in the connect payload
- `role: "operator"` with full scope list including `operator.pairing`
- `sessionKey: "default"` for chat.send (or generate per-conversation keys for memory continuity)
- Event types to listen for: `connect.challenge`, `agent` (streaming deltas), `chat` (final state)
- Always set a 60s timeout — WebSockets can silently stall

---

## Phase 6 — Add the MCP server (your app's tools)

OpenClaw can only do useful work if your app exposes MCP tools it can call.

Create `server/mcp.ts` using `@modelcontextprotocol/sdk`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

function createMcpServer() {
  const server = new McpServer({ name: "your-app-crm", version: "1.0.0" });

  server.tool(
    "search_contacts",
    "Search contacts by name, email, or company. Returns up to 10.",
    {
      org_id: z.string().describe("Organization ID to scope the search"),
      query: z.string().describe("Search term"),
    },
    async ({ org_id, query }) => {
      // Call Supabase / your DB here, scoped by org_id
      const { data } = await supabaseAdmin
        .from("contacts")
        .select("*")
        .eq("org_id", org_id)
        .ilike("first_name", `%${query}%`)
        .limit(10);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  // Add more tools: get_contact, create_contact, list_tasks, etc.
  return server;
}

export function mountMcp(app: Express) {
  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => transport.close());
    const server = createMcpServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
}
```

**Tool design rules:**

- **Always require `org_id`** as a parameter. OpenClaw is multi-tenant by passing the value, not by session
- Use `supabaseAdmin` (service role) since OpenClaw has no user session — RLS doesn't apply
- Return structured text (JSON.stringify is fine), the LLM parses it
- Keep tool descriptions terse and action-oriented — they go straight to the model

Mount in your Express setup: `mountMcp(app)`.

---

## Phase 7 — Wire the tRPC chat endpoint

In your tRPC router (`server/routers.ts` or similar):

```typescript
chat: protectedProcedure
  .input(z.object({
    messages: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })),
    conversationId: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const business = await loadBusinessSnapshot(ctx.user.orgId);
    const reply = await chatWithOpenClaw(input.messages, {
      orgId: ctx.user.orgId,
      orgName: ctx.user.orgName,
      orgTier: ctx.user.orgTier,
      userId: ctx.user.id,
      userName: ctx.user.name || ctx.user.email,
      business,
    });
    return { reply, conversationId: input.conversationId };
  }),
```

The system prompt (built inside `chatWithOpenClaw`) tells the LLM about `org_id` and forces tool calls — see `server/openclaw.ts` `buildSystemPrompt()` for the exact wording.

---

## Phase 8 — Dual deploy: Vercel for the app, Hostinger for MCP

This setup runs **two copies** of the codebase, each with a specific job:

| Where      | What it serves                                                        | Why                                                                |
|------------|-----------------------------------------------------------------------|--------------------------------------------------------------------|
| Vercel     | Frontend (React) + tRPC routes + the WebSocket client to OpenClaw     | User-facing app. Auto-deploys from `main` on every git push.       |
| Hostinger  | Same codebase, but only `/mcp` is actually used                       | OpenClaw needs a publicly-reachable HTTPS endpoint to call MCP tools. Co-locating on the same VPS means low-latency calls and no cross-internet hop. |

Both pull from the same GitHub repo. Both update automatically.

### 8a — Vercel side

1. Push the repo to GitHub
2. Import the project in Vercel → connect to GitHub
3. Set env vars in Vercel: everything from Phase 4 except `PORT`
4. Vercel auto-deploys on push to `main`. No further config needed.

### 8b — Hostinger side: stack files

On the VPS, create `/docker/your-app/` with:

**`docker-compose.yml`:**
```yaml
services:
  api:
    build: .
    env_file: .env
    ports:
      - "3000:3000"
    restart: unless-stopped
    labels:
      - traefik.enable=true
      - traefik.http.routers.your-app.rule=Host(`api-yourapp.srv1568356.hstgr.cloud`)
      - traefik.http.routers.your-app.entrypoints=websecure
      - traefik.http.routers.your-app.tls.certresolver=letsencrypt
      - traefik.http.services.your-app.loadbalancer.server.port=3000
```

**`Dockerfile`** — standard Node 20 multi-stage, build then `node dist/index.js`.

**`.env`** — same vars from Phase 4, plus Supabase / other provider keys.

### 8c — Hostinger side: clone the repo + first build

```bash
ssh root@<vps-ip>
cd /docker
git clone https://github.com/<you>/<your-repo>.git your-app
cd your-app
# Place your .env here (do NOT commit it to git)
docker compose up -d --build
docker compose logs -f api    # confirm "listening on :3000"
```

After Traefik picks up the labels, the MCP endpoint is live at `https://api-yourapp.<host>.hstgr.cloud/mcp` with auto SSL.

### 8d — Hostinger side: auto-deploy via cron

To match the Vercel side's auto-deploy behavior, install this cron job on the VPS so the Hostinger container rebuilds whenever `main` changes:

```bash
# On the VPS, as root:
crontab -e
```

Add this line:
```cron
*/2 * * * * cd /docker/your-app && git fetch origin main && if [ $(git rev-parse HEAD) != $(git rev-parse origin/main) ]; then git pull && docker compose up -d --build >> /tmp/deploy.log 2>&1; fi
```

Behavior:
- Polls GitHub every 2 minutes
- If `origin/main` is ahead, pulls + rebuilds + restarts the container
- Logs to `/tmp/deploy.log` (tail this when you want to confirm a deploy landed)

**End-to-end flow after this is set up:**
1. `git push origin main`
2. Vercel auto-deploys (~1 min) — your frontend reflects changes
3. Cron polls within 2 min, rebuilds Hostinger container — MCP reflects changes
4. No SSH or manual steps needed

**To check Hostinger sync status anytime:**
```bash
ssh root@<vps-ip> "cd /docker/your-app && git log --oneline -1 && docker ps --filter name=your-app"
```

---

## Phase 9 — Register your MCP server with OpenClaw

OpenClaw needs to know where to call your tools. This is a one-time config patch.

Use `scripts/register-mcp-with-openclaw.ts` from this repo as the template. Edit the `MCP_URL` constant to point at your deployed API:

```typescript
const MCP_URL = "https://api-yourapp.<host>.hstgr.cloud/mcp";
```

Run from your local machine with the env vars set:

```bash
pnpm tsx scripts/register-mcp-with-openclaw.ts
```

Expected output:
```
Authenticated! Fetching current config...
Got config hash: <hash>
Registering MCP server...
MCP server registered successfully!
Total tools available: N
```

**Verify in the OpenClaw UI:** open `https://<your-openclaw-url>` → AI & Agents → Tools → your tool names should appear.

---

## Phase 10 — Pick a default model

OpenClaw ships with a list of providers but no default agent model. Use the same `config.patch` pattern.

Use `scripts/switch-to-gpt-4o-mini.ts` as the template. Two things must happen in one patch:

1. Add the model entry under `models.providers.<provider>.models`
2. Set `agents.defaults.model.primary` AND **the per-agent override** at `agents.list[<i>].model`

> **Gotcha:** the global default at `agents.defaults.model.primary` is **overridden** by any value at `agents.list[<i>].model`. Your "main" agent will keep using whatever was set there until you change it. Always set both.

Run:
```bash
pnpm tsx scripts/switch-to-gpt-4o-mini.ts
```

Then verify in the OpenClaw UI: **Agent → Agents → main → Model** should show your selection.

---

## Phase 11 — Add the chat UI

Two components, one mount point.

### `client/src/components/AIChatBox.tsx`
The presentational chat box: messages, input, send button, markdown rendering. Reusable. See this repo for the full implementation.

### `client/src/components/FloatingAIChat.tsx`
The floating bubble + panel. Owns conversation state, calls `trpc.ai.chat`, gates by org tier. Skeleton:

```tsx
export function FloatingAIChat() {
  const { isAuthenticated } = useAuth();
  const orgQuery = trpc.org.current.useQuery(undefined, { enabled: isAuthenticated });
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>();

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (data.conversationId) setConversationId(data.conversationId);
      // invalidate any queries the AI may have changed
    },
    onError: (err) => {
      setMessages((prev) => [...prev, { role: "assistant", content: `**Error:** ${err.message}` }]);
    },
  });

  if (!isAuthenticated || !orgQuery.data) return null;
  if (orgQuery.data.tier === "starter") return null;

  return open ? <Panel ... /> : <Bubble onClick={() => setOpen(true)} />;
}
```

### Mount once in your layout

Anywhere in `CrmLayout` (or your app shell), **outside** the routed `<Switch>`:

```tsx
<main>{children}</main>
<FloatingAIChat />   {/* persists across navigation automatically */}
```

Because the layout doesn't unmount when the route changes, the chat state survives navigation for free — no portal, no global store needed.

---

## Verification Checklist

- [ ] `https://<openclaw-url>` loads the OpenClaw control UI
- [ ] `https://api-yourapp.<host>.hstgr.cloud/health` returns 200 (add a health route if you don't have one)
- [ ] `pnpm tsx scripts/register-mcp-with-openclaw.ts` exits cleanly with tools listed
- [ ] In the OpenClaw UI: **Agent → Agents → main → Model** shows your chosen model
- [ ] In the OpenClaw UI: **AI & Agents → Tools** shows your MCP tools
- [ ] Open the app, click the floating bubble, send "what tools do you have?" — the agent should list your MCP tool names
- [ ] Send "summarize my contacts" — the agent should call `search_contacts` and return real data
- [ ] Navigate between pages — bubble stays open, conversation history persists

---

## Maintenance

**Update the agent's model:**
Copy `scripts/switch-to-gpt-4o-mini.ts`, change line ~92 (`primary` value) and line ~67 (model entry id), run.

**Add a new MCP tool:**
1. Add `server.tool(...)` block in `server/mcp.ts`
2. Redeploy your API
3. (No re-registration needed — OpenClaw refetches the tool list per session)

**Add a new agent:**
Patch `agents.list` in OpenClaw config via the same WebSocket pattern.

**Rotate the gateway token:**
1. Edit `/docker/openclaw-c1cf/.env`, change `OPENCLAW_GATEWAY_TOKEN`
2. `cd /docker/openclaw-c1cf && docker compose up -d`
3. Update the same value in your app's `.env` and redeploy
4. Existing pairings survive (signed by device key, not the token)

**Push code updates:**
Just `git push origin main`. Both Vercel (frontend + tRPC) and Hostinger (MCP endpoint) auto-deploy. Hostinger lags Vercel by up to 2 minutes (cron polling interval).

To force an immediate Hostinger rebuild without waiting for cron:
```bash
ssh root@<vps-ip> "cd /docker/your-app && git pull && docker compose up -d --build"
```

To inspect the cron deploy log:
```bash
ssh root@<vps-ip> "tail -50 /tmp/deploy.log"
```

---

## Common Issues

**`Authentication failed: signature invalid`**
Your `OPENCLAW_DEVICE_PRIVATE_KEY` got mangled — escaped newlines (`\n`) must be literal `\n` in the env file, not actual newlines. Re-run the `awk` command from Phase 3.

**`AI assistant is not configured yet`**
`OPENCLAW_URL` or `OPENCLAW_GATEWAY_TOKEN` is empty in the app env. Check `docker exec your-app-api-1 env | grep OPENCLAW`.

**MCP tools not visible to the agent**
- Confirm the registration script ran successfully and showed your tools
- Verify the `MCP_URL` is reachable from the OpenClaw container: `docker exec openclaw-c1cf-openclaw-1 curl -I <your MCP_URL>`
- Restart the OpenClaw container: `docker restart openclaw-c1cf-openclaw-1`

**Agent always calls the wrong model**
You forgot the per-agent override. Check `agents.list[<i>].model` in OpenClaw config — it overrides the global default.

**Chat times out after 60s**
Either the LLM is genuinely slow (cold start on a small model), or the `agent` event with `phase: "end"` isn't firing. Add a log in `server/openclaw.ts` at the message handler to see what events arrive.

**TPM (tokens per minute) rate limit errors**
Your system prompt is probably too large. Trim `buildSystemPrompt()` — the business snapshot should be a tight summary, not a full data dump. Tools are for fetching detail.

**`subscribe` request fails**
Some OpenClaw versions require `params: { key: "default" }` instead of `params: { sessionKey: "default" }` on `sessions.messages.subscribe`. If subscribing fails, try the other key name.

---

## Files in this Repo to Reference

| File                                              | Purpose                                                 |
|---------------------------------------------------|---------------------------------------------------------|
| `server/openclaw.ts`                              | WebSocket client + system prompt                        |
| `server/mcp.ts`                                   | MCP server with all CRM tools                           |
| `server/_core/env.ts`                             | Env var validation                                      |
| `scripts/register-mcp-with-openclaw.ts`           | One-time MCP registration                               |
| `scripts/switch-to-gpt-4o-mini.ts`                | Model switching pattern (copyable)                      |
| `client/src/components/AIChatBox.tsx`             | Chat UI primitive                                       |
| `client/src/components/FloatingAIChat.tsx`        | Floating bubble + persistent panel                      |
| `client/src/components/CrmLayout.tsx`             | Mount point (renders `<FloatingAIChat />` once)         |
| `.env.example`                                    | Env var reference                                       |
