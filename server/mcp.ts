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

  // --- TOOL: send_email ---
  server.tool(
    "send_email",
    "Send an email to a contact using the organization's email settings. Logs the email to the contact's timeline.",
    {
      org_id: z.string().describe("The organization ID"),
      contact_id: z.number().optional().describe("Contact ID to link the email to"),
      user_id: z.string().describe("The user ID sending the email"),
      to_email: z.string().describe("Recipient email address"),
      subject: z.string().describe("Email subject line"),
      body: z.string().describe("Email body (plain text)"),
    },
    async ({ org_id, contact_id, user_id, to_email, subject, body }) => {
      // Get org settings for from name and reply-to
      const { data: org } = await supabaseAdmin.from("organizations").select("name, email_from_name, email_reply_to, email_signature").eq("id", org_id).single();

      const fromName = org?.email_from_name || org?.name || "GridWorker OS";
      const replyTo = org?.email_reply_to || undefined;
      const signature = org?.email_signature ? `\n\n${org.email_signature}` : "";
      const fullBody = body + signature;

      try {
        const { Resend } = await import("resend");
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) return { content: [{ type: "text" as const, text: "Error: Email not configured (no RESEND_API_KEY)" }] };

        const resend = new Resend(resendKey);
        const { data: emailResult, error } = await resend.emails.send({
          from: `${fromName} <onboarding@resend.dev>`,
          to: to_email,
          subject,
          text: fullBody,
          ...(replyTo ? { replyTo } : {}),
        });

        if (error) return { content: [{ type: "text" as const, text: `Email failed: ${error.message}` }] };

        // Log the email
        await supabaseAdmin.from("email_logs").insert({
          org_id, contact_id: contact_id || null, user_id, to_email, subject, body: fullBody,
          status: "sent", resend_id: emailResult?.id || null,
        });

        // Log activity if contact linked
        if (contact_id) {
          await supabaseAdmin.from("activities").insert({
            org_id, contact_id, user_id, type: "email",
            content: `Sent email: "${subject}"`, metadata: { to: to_email, subject },
          });
        }

        return { content: [{ type: "text" as const, text: `Email sent to ${to_email} — Subject: "${subject}"` }] };
      } catch (e: any) {
        return { content: [{ type: "text" as const, text: `Email error: ${e.message}` }] };
      }
    }
  );

  // --- TOOL: create_event ---
  server.tool(
    "create_event",
    "Create a calendar event/meeting. Can optionally be linked to a contact.",
    {
      org_id: z.string().describe("The organization ID"),
      created_by: z.string().describe("User ID creating the event"),
      title: z.string().describe("Event title"),
      description: z.string().optional().describe("Event description"),
      start_at: z.string().describe("Start date/time in ISO format (e.g., 2026-04-10T14:00:00Z)"),
      end_at: z.string().describe("End date/time in ISO format"),
      contact_id: z.number().optional().describe("Contact ID to link this event to"),
      location: z.string().optional().describe("Event location"),
    },
    async ({ org_id, created_by, title, description, start_at, end_at, contact_id, location }) => {
      const { data, error } = await supabaseAdmin.from("events").insert({
        org_id, created_by, title, description: description || "",
        start_at, end_at, contact_id: contact_id || null, location: location || "",
      }).select().single();

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Event created: "${title}" on ${new Date(start_at).toLocaleDateString()} (ID: ${data.id})` }] };
    }
  );

  // --- TOOL: list_events ---
  server.tool(
    "list_events",
    "List upcoming calendar events for the organization.",
    {
      org_id: z.string().describe("The organization ID"),
    },
    async ({ org_id }) => {
      const { data, error } = await supabaseAdmin
        .from("events")
        .select("id, title, start_at, end_at, location, contact_id")
        .eq("org_id", org_id)
        .gte("end_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(20);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data || data.length === 0) return { content: [{ type: "text" as const, text: "No upcoming events." }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- TOOL: update_contact ---
  server.tool(
    "update_contact",
    "Update any field on an existing contact (name, phone, company, address, tags, etc).",
    {
      contact_id: z.number().describe("The contact ID"),
      first_name: z.string().optional().describe("Updated first name"),
      last_name: z.string().optional().describe("Updated last name"),
      phone: z.string().optional().describe("Updated phone"),
      company: z.string().optional().describe("Updated company"),
      email: z.string().optional().describe("Updated email"),
      address: z.string().optional().describe("Updated address"),
      city: z.string().optional().describe("Updated city"),
      state: z.string().optional().describe("Updated state"),
      zip: z.string().optional().describe("Updated zip"),
      tags: z.array(z.string()).optional().describe("Replace tags array"),
    },
    async ({ contact_id, ...fields }) => {
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined) updates[k] = v;
      }
      if (Object.keys(updates).length === 0) return { content: [{ type: "text" as const, text: "No fields to update." }] };

      updates.updated_at = new Date().toISOString();
      const { data, error } = await supabaseAdmin.from("contacts").update(updates).eq("id", contact_id).select("id, first_name, last_name").single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Updated contact ${data.first_name} ${data.last_name} (ID: ${data.id})` }] };
    }
  );

  // --- TOOL: get_contact_timeline ---
  server.tool(
    "get_contact_timeline",
    "Get the full activity timeline for a contact (notes, emails, stage changes, deals, tasks).",
    {
      contact_id: z.number().describe("The contact ID"),
    },
    async ({ contact_id }) => {
      const { data, error } = await supabaseAdmin
        .from("activities")
        .select("id, type, content, metadata, created_at")
        .eq("contact_id", contact_id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data || data.length === 0) return { content: [{ type: "text" as const, text: "No activity history for this contact." }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- TOOL: get_org_profile ---
  server.tool(
    "get_org_profile",
    "Get the organization's business profile, team members, and settings.",
    {
      org_id: z.string().describe("The organization ID"),
    },
    async ({ org_id }) => {
      const [orgRes, membersRes] = await Promise.all([
        supabaseAdmin.from("organizations").select("*").eq("id", org_id).single(),
        supabaseAdmin.from("org_members").select("first_name, last_name, role, title, phone, referral_code").eq("org_id", org_id),
      ]);

      if (orgRes.error) return { content: [{ type: "text" as const, text: `Error: ${orgRes.error.message}` }] };

      const profile = {
        business: orgRes.data,
        team: membersRes.data ?? [],
      };
      return { content: [{ type: "text" as const, text: JSON.stringify(profile, null, 2) }] };
    }
  );

  // --- TOOL: list_deals ---
  server.tool(
    "list_deals",
    "List all deals/opportunities for the organization with their values and stages.",
    {
      org_id: z.string().describe("The organization ID"),
    },
    async ({ org_id }) => {
      const { data, error } = await supabaseAdmin
        .from("deals")
        .select("id, title, value, stage, probability, expected_close_date, contact_id")
        .eq("org_id", org_id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data || data.length === 0) return { content: [{ type: "text" as const, text: "No deals found." }] };

      const total = data.reduce((sum, d) => sum + Number(d.value), 0);
      return { content: [{ type: "text" as const, text: `${data.length} deals (total: $${total.toFixed(2)})\n${JSON.stringify(data, null, 2)}` }] };
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
