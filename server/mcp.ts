/**
 * MCP (Model Context Protocol) Server for OpenClaw
 *
 * Exposes CRM tools that OpenClaw can call during chat sessions:
 * - search_contacts: Search contacts by name/email/company
 * - get_contact: Get full contact details by ID
 * - create_contact: Create a new contact
 * - update_contact_stage: Move a contact to a different pipeline stage
 * - add_note: Add a note to a contact
 * - create_task: Create a task (optionally linked to a contact)
 * - create_deal: Create a deal linked to a contact
 * - list_tasks: List pending tasks
 * - get_pipeline_summary: Get pipeline stage counts
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import type { Express, Request, Response } from "express";
import { supabaseAdmin } from "./supabase";

// We use supabaseAdmin for MCP calls because OpenClaw doesn't have a user session.
// Tool calls are scoped by org_id which OpenClaw passes as a parameter.

function createMcpServer() {
  const server = new McpServer({
    name: "e3c-crm",
    version: "1.0.0",
  });

  // --- TOOL: search_contacts ---
  server.tool(
    "search_contacts",
    "Search contacts in the CRM by name, email, or company. Returns up to 10 matches.",
    {
      org_id: z.string().describe("The organization ID to search within"),
      query: z.string().describe("Search term to match against name, email, or company"),
    },
    async ({ org_id, query }) => {
      const { data, error } = await supabaseAdmin
        .from("contacts")
        .select("id, first_name, last_name, email, phone, company, stage, created_at")
        .eq("org_id", org_id)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- TOOL: get_contact ---
  server.tool(
    "get_contact",
    "Get full details of a specific contact by their ID, including all fields.",
    {
      contact_id: z.number().describe("The contact ID"),
    },
    async ({ contact_id }) => {
      const { data, error } = await supabaseAdmin
        .from("contacts")
        .select("*")
        .eq("id", contact_id)
        .single();

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- TOOL: create_contact ---
  server.tool(
    "create_contact",
    "Create a new contact in the CRM. Returns the created contact.",
    {
      org_id: z.string().describe("The organization ID"),
      first_name: z.string().describe("Contact's first name"),
      last_name: z.string().optional().describe("Contact's last name"),
      email: z.string().describe("Contact's email address"),
      phone: z.string().optional().describe("Contact's phone number"),
      company: z.string().optional().describe("Contact's company name"),
      stage: z.enum(["lead", "contacted", "qualified", "proposal", "won", "lost"]).optional().describe("Pipeline stage (default: lead)"),
    },
    async ({ org_id, first_name, last_name, email, phone, company, stage }) => {
      const { data, error } = await supabaseAdmin
        .from("contacts")
        .insert({
          org_id,
          first_name,
          last_name: last_name || "",
          email,
          phone: phone || "",
          company: company || "",
          stage: stage || "lead",
          source: "manual",
        })
        .select()
        .single();

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Contact created: ${JSON.stringify(data)}` }] };
    }
  );

  // --- TOOL: update_contact_stage ---
  server.tool(
    "update_contact_stage",
    "Move a contact to a different pipeline stage (lead, contacted, qualified, proposal, won, lost).",
    {
      contact_id: z.number().describe("The contact ID"),
      stage: z.enum(["lead", "contacted", "qualified", "proposal", "won", "lost"]).describe("The new stage"),
    },
    async ({ contact_id, stage }) => {
      const { data, error } = await supabaseAdmin
        .from("contacts")
        .update({ stage, updated_at: new Date().toISOString() })
        .eq("id", contact_id)
        .select("id, first_name, last_name, stage")
        .single();

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Stage updated: ${data.first_name} ${data.last_name} → ${data.stage}` }] };
    }
  );

  // --- TOOL: add_note ---
  server.tool(
    "add_note",
    "Add an interaction note to a contact's record.",
    {
      org_id: z.string().describe("The organization ID"),
      contact_id: z.number().describe("The contact ID"),
      user_id: z.string().describe("The user ID adding the note"),
      note: z.string().describe("The note content"),
    },
    async ({ org_id, contact_id, user_id, note }) => {
      const { error } = await supabaseAdmin
        .from("contact_notes")
        .insert({ org_id, contact_id, user_id, note });

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Note added to contact ${contact_id}` }] };
    }
  );

  // --- TOOL: create_task ---
  server.tool(
    "create_task",
    "Create a new task. Can optionally be linked to a contact.",
    {
      org_id: z.string().describe("The organization ID"),
      assigned_to: z.string().describe("User ID to assign the task to"),
      title: z.string().describe("Task title"),
      description: z.string().optional().describe("Task description"),
      contact_id: z.number().optional().describe("Contact ID to link this task to"),
      due_date: z.string().optional().describe("Due date in YYYY-MM-DD format"),
      priority: z.enum(["low", "medium", "high"]).optional().describe("Task priority (default: medium)"),
    },
    async ({ org_id, assigned_to, title, description, contact_id, due_date, priority }) => {
      const { data, error } = await supabaseAdmin
        .from("tasks")
        .insert({
          org_id,
          assigned_to,
          title,
          description: description || "",
          contact_id: contact_id || null,
          due_date: due_date || null,
          priority: priority || "medium",
        })
        .select()
        .single();

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Task created: "${data.title}" (ID: ${data.id})` }] };
    }
  );

  // --- TOOL: create_deal ---
  server.tool(
    "create_deal",
    "Create a deal/opportunity linked to a contact with a monetary value.",
    {
      org_id: z.string().describe("The organization ID"),
      contact_id: z.number().describe("The contact ID to link the deal to"),
      title: z.string().describe("Deal title (e.g., 'Solar Panel Installation')"),
      value: z.number().describe("Deal value in dollars"),
      probability: z.number().optional().describe("Win probability 0-100 (default: 0)"),
      expected_close_date: z.string().optional().describe("Expected close date YYYY-MM-DD"),
    },
    async ({ org_id, contact_id, title, value, probability, expected_close_date }) => {
      const { data, error } = await supabaseAdmin
        .from("deals")
        .insert({
          org_id,
          contact_id,
          title,
          value,
          probability: probability ?? 0,
          expected_close_date: expected_close_date || null,
          stage: "lead",
        })
        .select()
        .single();

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Deal created: "${data.title}" worth $${data.value} (ID: ${data.id})` }] };
    }
  );

  // --- TOOL: list_tasks ---
  server.tool(
    "list_tasks",
    "List pending tasks for the organization. Shows title, due date, priority, and linked contact.",
    {
      org_id: z.string().describe("The organization ID"),
      status: z.enum(["pending", "completed", "cancelled"]).optional().describe("Filter by status (default: pending)"),
    },
    async ({ org_id, status }) => {
      const query = supabaseAdmin
        .from("tasks")
        .select("id, title, description, due_date, status, priority, contact_id, assigned_to")
        .eq("org_id", org_id)
        .eq("status", status || "pending")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(20);

      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- TOOL: get_pipeline_summary ---
  server.tool(
    "get_pipeline_summary",
    "Get a summary of the sales pipeline showing how many contacts are in each stage.",
    {
      org_id: z.string().describe("The organization ID"),
    },
    async ({ org_id }) => {
      const { data, error } = await supabaseAdmin
        .from("contacts")
        .select("stage")
        .eq("org_id", org_id);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };

      const counts = (data ?? []).reduce<Record<string, number>>((acc, c) => {
        acc[c.stage] = (acc[c.stage] || 0) + 1;
        return acc;
      }, {});

      const total = data?.length ?? 0;
      const summary = `Pipeline Summary (${total} total contacts):
- Lead: ${counts["lead"] || 0}
- Contacted: ${counts["contacted"] || 0}
- Qualified: ${counts["qualified"] || 0}
- Proposal: ${counts["proposal"] || 0}
- Won: ${counts["won"] || 0}
- Lost: ${counts["lost"] || 0}`;

      return { content: [{ type: "text" as const, text: summary }] };
    }
  );

  return server;
}

/**
 * Register the MCP server HTTP endpoint with Express.
 * OpenClaw connects to this via streamable-http transport.
 */
export function registerMcpEndpoint(app: Express) {
  // Each session gets its own McpServer + Transport pair
  const sessions = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>();

  app.post("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && sessions.has(sessionId)) {
      const { transport } = sessions.get(sessionId)!;
      await transport.handleRequest(req, res);
      return;
    }

    // New session — create fresh server + transport pair
    const mcpServer = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    transport.onclose = () => {
      const sid = (transport as any).sessionId;
      if (sid) sessions.delete(sid);
    };

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res);

    // Store session AFTER first request (sessionId is set during handleRequest)
    const sid = (transport as any).sessionId;
    if (sid) sessions.set(sid, { server: mcpServer, transport });
  });

  // Handle GET for SSE stream
  app.get("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && sessions.has(sessionId)) {
      const { transport } = sessions.get(sessionId)!;
      await transport.handleRequest(req, res);
      return;
    }
    res.status(400).json({ error: "No active session" });
  });

  // Handle DELETE for session cleanup
  app.delete("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && sessions.has(sessionId)) {
      const { transport } = sessions.get(sessionId)!;
      await transport.handleRequest(req, res);
      sessions.delete(sessionId);
      return;
    }
    res.status(400).json({ error: "No active session" });
  });

  console.log("[MCP] CRM tools endpoint registered at /mcp");
}
