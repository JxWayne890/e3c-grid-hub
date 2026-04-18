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
import { simulateEmailSend, simulateSmsBlast, simulateSingleSms } from "./lib/simulate";

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

  // --- TOOL: update_task ---
  server.tool(
    "update_task",
    "Update one or more fields on an existing task (title, description, due date, priority, or status).",
    {
      task_id: z.number().describe("The ID of the task to update"),
      title: z.string().optional().describe("Updated task title"),
      description: z.string().optional().describe("Updated task description"),
      due_date: z.string().optional().describe("Updated due date in YYYY-MM-DD format"),
      priority: z.enum(["low", "medium", "high"]).optional().describe("Updated priority level"),
      status: z.enum(["pending", "completed", "cancelled"]).optional().describe("Updated task status"),
    },
    async ({ task_id, ...fields }) => {
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined) updates[k] = v;
      }
      if (Object.keys(updates).length === 0) return { content: [{ type: "text" as const, text: "No fields to update." }] };

      updates.updated_at = new Date().toISOString();
      const { data, error } = await supabaseAdmin.from("tasks").update(updates).eq("id", task_id).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Task updated: "${data.title}" (ID: ${data.id})` }] };
    }
  );

  // --- TOOL: assign_task ---
  server.tool(
    "assign_task",
    "Reassign a task to a different user.",
    {
      task_id: z.number().describe("The ID of the task to reassign"),
      assigned_to: z.string().describe("The user ID to assign the task to"),
    },
    async ({ task_id, assigned_to }) => {
      const { data, error } = await supabaseAdmin
        .from("tasks")
        .update({ assigned_to, updated_at: new Date().toISOString() })
        .eq("id", task_id)
        .select("id, title, assigned_to")
        .single();

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Task "${data.title}" (ID: ${data.id}) reassigned to ${data.assigned_to}` }] };
    }
  );

  // --- TOOL: update_deal ---
  server.tool(
    "update_deal",
    "Update one or more fields on an existing deal (title, value, stage, probability, or expected close date).",
    {
      deal_id: z.number().describe("The ID of the deal to update"),
      title: z.string().optional().describe("Updated deal title"),
      value: z.number().optional().describe("Updated deal value in dollars"),
      stage: z.enum(["lead", "contacted", "qualified", "proposal", "won", "lost"]).optional().describe("Updated deal stage"),
      probability: z.number().optional().describe("Updated win probability 0-100"),
      expected_close_date: z.string().optional().describe("Updated expected close date in YYYY-MM-DD format"),
    },
    async ({ deal_id, ...fields }) => {
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined) updates[k] = v;
      }
      if (Object.keys(updates).length === 0) return { content: [{ type: "text" as const, text: "No fields to update." }] };

      updates.updated_at = new Date().toISOString();
      const { data, error } = await supabaseAdmin.from("deals").update(updates).eq("id", deal_id).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Deal updated: "${data.title}" (ID: ${data.id})` }] };
    }
  );

  // --- TOOL: delete_deal ---
  server.tool(
    "delete_deal",
    "Permanently delete a deal/opportunity by its ID.",
    {
      deal_id: z.number().describe("The ID of the deal to delete"),
    },
    async ({ deal_id }) => {
      const { error } = await supabaseAdmin.from("deals").delete().eq("id", deal_id);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Deal ${deal_id} deleted.` }] };
    }
  );

  // --- TOOL: update_event ---
  server.tool(
    "update_event",
    "Update one or more fields on an existing calendar event (title, description, times, or location).",
    {
      event_id: z.number().describe("The ID of the event to update"),
      title: z.string().optional().describe("Updated event title"),
      description: z.string().optional().describe("Updated event description"),
      start_at: z.string().optional().describe("Updated start date/time in ISO format"),
      end_at: z.string().optional().describe("Updated end date/time in ISO format"),
      location: z.string().optional().describe("Updated event location"),
    },
    async ({ event_id, ...fields }) => {
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined) updates[k] = v;
      }
      if (Object.keys(updates).length === 0) return { content: [{ type: "text" as const, text: "No fields to update." }] };

      updates.updated_at = new Date().toISOString();
      const { data, error } = await supabaseAdmin.from("events").update(updates).eq("id", event_id).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Event updated: "${data.title}" (ID: ${data.id})` }] };
    }
  );

  // --- TOOL: delete_event ---
  server.tool(
    "delete_event",
    "Permanently delete a calendar event by its ID.",
    {
      event_id: z.number().describe("The ID of the event to delete"),
    },
    async ({ event_id }) => {
      const { error } = await supabaseAdmin.from("events").delete().eq("id", event_id);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Event ${event_id} deleted.` }] };
    }
  );

  // --- TOOL: list_email_templates ---
  server.tool(
    "list_email_templates",
    "List available email templates for the organization.",
    {
      org_id: z.string().describe("The organization ID"),
    },
    async ({ org_id }) => {
      const { data, error } = await supabaseAdmin
        .from("email_templates")
        .select("id, name, subject, body")
        .eq("org_id", org_id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data || data.length === 0) return { content: [{ type: "text" as const, text: "No email templates found." }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- TOOL: create_email_template ---
  server.tool(
    "create_email_template",
    "Create a reusable email template for the organization.",
    {
      org_id: z.string().describe("The organization ID"),
      user_id: z.string().describe("The user ID creating the template"),
      name: z.string().describe("Template name for identification"),
      subject: z.string().describe("Email subject line template"),
      body: z.string().describe("Email body template content"),
    },
    async ({ org_id, user_id, name, subject, body }) => {
      const { data, error } = await supabaseAdmin
        .from("email_templates")
        .insert({ org_id, created_by: user_id, name, subject, body })
        .select()
        .single();

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Email template created: "${data.name}" (ID: ${data.id})` }] };
    }
  );

  // --- TOOL: get_dashboard_stats ---
  server.tool(
    "get_dashboard_stats",
    "Get comprehensive CRM analytics including contact counts by stage, deal values, pending/overdue tasks, and upcoming events.",
    {
      org_id: z.string().describe("The organization ID"),
    },
    async ({ org_id }) => {
      const now = new Date().toISOString();
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const [contactsRes, dealsRes, tasksRes, overdueRes, eventsRes] = await Promise.all([
        supabaseAdmin.from("contacts").select("stage").eq("org_id", org_id),
        supabaseAdmin.from("deals").select("stage, value").eq("org_id", org_id),
        supabaseAdmin.from("tasks").select("id").eq("org_id", org_id).eq("status", "pending"),
        supabaseAdmin.from("tasks").select("id").eq("org_id", org_id).eq("status", "pending").lt("due_date", now),
        supabaseAdmin.from("events").select("id").eq("org_id", org_id).gte("start_at", now).lte("start_at", weekFromNow),
      ]);

      const contacts = contactsRes.data ?? [];
      const contactsByStage = contacts.reduce<Record<string, number>>((acc, c) => {
        acc[c.stage] = (acc[c.stage] || 0) + 1;
        return acc;
      }, {});

      const deals = dealsRes.data ?? [];
      const totalDealValue = deals.reduce((sum, d) => sum + Number(d.value), 0);
      const dealsByStage = deals.reduce<Record<string, number>>((acc, d) => {
        acc[d.stage] = (acc[d.stage] || 0) + 1;
        return acc;
      }, {});

      const pendingTasks = tasksRes.data?.length ?? 0;
      const overdueTasks = overdueRes.data?.length ?? 0;
      const eventsThisWeek = eventsRes.data?.length ?? 0;

      const summary = `Dashboard Stats:

Contacts (${contacts.length} total):
- Lead: ${contactsByStage["lead"] || 0}
- Contacted: ${contactsByStage["contacted"] || 0}
- Qualified: ${contactsByStage["qualified"] || 0}
- Proposal: ${contactsByStage["proposal"] || 0}
- Won: ${contactsByStage["won"] || 0}
- Lost: ${contactsByStage["lost"] || 0}

Deals (${deals.length} total, $${totalDealValue.toFixed(2)} pipeline value):
- Lead: ${dealsByStage["lead"] || 0}
- Contacted: ${dealsByStage["contacted"] || 0}
- Qualified: ${dealsByStage["qualified"] || 0}
- Proposal: ${dealsByStage["proposal"] || 0}
- Won: ${dealsByStage["won"] || 0}
- Lost: ${dealsByStage["lost"] || 0}

Tasks:
- Pending: ${pendingTasks}
- Overdue: ${overdueTasks}

Events this week: ${eventsThisWeek}`;

      return { content: [{ type: "text" as const, text: summary }] };
    }
  );

  // --- TOOL: add_tag ---
  server.tool(
    "add_tag",
    "Add a tag to a contact. Skips if the tag already exists on the contact.",
    {
      contact_id: z.number().describe("The contact ID to add the tag to"),
      tag: z.string().describe("The tag to add"),
    },
    async ({ contact_id, tag }) => {
      const { data: contact, error: fetchError } = await supabaseAdmin
        .from("contacts")
        .select("tags")
        .eq("id", contact_id)
        .single();

      if (fetchError) return { content: [{ type: "text" as const, text: `Error: ${fetchError.message}` }] };

      const currentTags: string[] = contact.tags || [];
      if (currentTags.includes(tag)) {
        return { content: [{ type: "text" as const, text: `Tag "${tag}" already exists on contact ${contact_id}.` }] };
      }

      const { error } = await supabaseAdmin
        .from("contacts")
        .update({ tags: [...currentTags, tag], updated_at: new Date().toISOString() })
        .eq("id", contact_id);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Tag "${tag}" added to contact ${contact_id}.` }] };
    }
  );

  // --- TOOL: remove_tag ---
  server.tool(
    "remove_tag",
    "Remove a tag from a contact.",
    {
      contact_id: z.number().describe("The contact ID to remove the tag from"),
      tag: z.string().describe("The tag to remove"),
    },
    async ({ contact_id, tag }) => {
      const { data: contact, error: fetchError } = await supabaseAdmin
        .from("contacts")
        .select("tags")
        .eq("id", contact_id)
        .single();

      if (fetchError) return { content: [{ type: "text" as const, text: `Error: ${fetchError.message}` }] };

      const currentTags: string[] = contact.tags || [];
      const updatedTags = currentTags.filter((t: string) => t !== tag);

      if (updatedTags.length === currentTags.length) {
        return { content: [{ type: "text" as const, text: `Tag "${tag}" not found on contact ${contact_id}.` }] };
      }

      const { error } = await supabaseAdmin
        .from("contacts")
        .update({ tags: updatedTags, updated_at: new Date().toISOString() })
        .eq("id", contact_id);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Tag "${tag}" removed from contact ${contact_id}.` }] };
    }
  );

  // ==================================================================
  // LEADS — separate pipeline from contacts (inquiries, not customers)
  // ==================================================================

  // --- TOOL: create_lead ---
  server.tool(
    "create_lead",
    "Create a new lead (inquiry) in the CRM. Leads are inquiries that haven't become customers yet. Convert them with convert_lead_to_contact when they're ready.",
    {
      org_id: z.string().describe("The organization ID"),
      first_name: z.string().describe("Lead's first name"),
      last_name: z.string().optional().describe("Lead's last name"),
      phone: z.string().optional().describe("Lead's phone number"),
      email: z.string().optional().describe("Lead's email"),
      address: z.string().optional().describe("Lead's address or location text"),
      source: z.enum(["phone", "walk_in", "website", "referral", "third_party"]).optional().describe("How the lead came in (default: website)"),
      frequency: z.enum(["hourly", "daily", "monthly"]).optional().describe("Expected usage frequency (default: monthly)"),
      temperature: z.enum(["hot", "warm", "cold"]).optional().describe("Lead temperature (default: warm)"),
      stage: z.enum(["new", "contacted", "qualified", "negotiating", "won", "lost"]).optional().describe("Pipeline stage (default: new)"),
      notes: z.string().optional().describe("Free-form notes"),
    },
    async ({ org_id, first_name, last_name, phone, email, address, source, frequency, temperature, stage, notes }) => {
      const { data, error } = await supabaseAdmin
        .from("leads")
        .insert({
          org_id,
          first_name,
          last_name: last_name ?? "",
          phone: phone ?? "",
          email: email ?? "",
          address: address ?? "",
          source: source ?? "website",
          frequency: frequency ?? "monthly",
          temperature: temperature ?? "warm",
          stage: stage ?? "new",
          notes: notes ?? "",
        })
        .select()
        .single();

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Lead created: ${data.first_name} ${data.last_name} (ID: ${data.id}) — ${data.temperature}/${data.stage}` }] };
    }
  );

  // --- TOOL: list_leads ---
  server.tool(
    "list_leads",
    "List leads with optional filters. Useful for questions like 'how many hot leads do we have?' or 'show me all new leads from referrals'.",
    {
      org_id: z.string().describe("The organization ID"),
      stage: z.enum(["new", "contacted", "qualified", "negotiating", "won", "lost"]).optional().describe("Filter by pipeline stage"),
      temperature: z.enum(["hot", "warm", "cold"]).optional().describe("Filter by temperature"),
      source: z.enum(["phone", "walk_in", "website", "referral", "third_party"]).optional().describe("Filter by source"),
      assigned_to: z.string().optional().describe("Filter by assigned user ID"),
      limit: z.number().optional().describe("Max rows to return (default: 25)"),
    },
    async ({ org_id, stage, temperature, source, assigned_to, limit }) => {
      let query = supabaseAdmin
        .from("leads")
        .select("id, first_name, last_name, phone, email, address, source, frequency, temperature, stage, assigned_to, created_at")
        .eq("org_id", org_id)
        .order("created_at", { ascending: false })
        .limit(limit ?? 25);

      if (stage) query = query.eq("stage", stage);
      if (temperature) query = query.eq("temperature", temperature);
      if (source) query = query.eq("source", source);
      if (assigned_to) query = query.eq("assigned_to", assigned_to);

      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data || data.length === 0) return { content: [{ type: "text" as const, text: "No leads match those filters." }] };
      return { content: [{ type: "text" as const, text: `${data.length} lead(s):\n${JSON.stringify(data, null, 2)}` }] };
    }
  );

  // --- TOOL: get_lead ---
  server.tool(
    "get_lead",
    "Get full details of a specific lead by its ID.",
    {
      lead_id: z.number().describe("The lead ID"),
    },
    async ({ lead_id }) => {
      const { data, error } = await supabaseAdmin.from("leads").select("*").eq("id", lead_id).single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- TOOL: update_lead ---
  server.tool(
    "update_lead",
    "Update one or more fields on an existing lead.",
    {
      lead_id: z.number().describe("The lead ID"),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      source: z.enum(["phone", "walk_in", "website", "referral", "third_party"]).optional(),
      frequency: z.enum(["hourly", "daily", "monthly"]).optional(),
      temperature: z.enum(["hot", "warm", "cold"]).optional(),
      stage: z.enum(["new", "contacted", "qualified", "negotiating", "won", "lost"]).optional(),
      notes: z.string().optional(),
    },
    async ({ lead_id, ...fields }) => {
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined) updates[k] = v;
      }
      if (Object.keys(updates).length === 0) return { content: [{ type: "text" as const, text: "No fields to update." }] };
      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabaseAdmin.from("leads").update(updates).eq("id", lead_id).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Lead updated: ${data.first_name} ${data.last_name} (ID: ${data.id})` }] };
    }
  );

  // --- TOOL: update_lead_stage ---
  server.tool(
    "update_lead_stage",
    "Move a lead to a different pipeline stage (new, contacted, qualified, negotiating, won, lost).",
    {
      lead_id: z.number().describe("The lead ID"),
      stage: z.enum(["new", "contacted", "qualified", "negotiating", "won", "lost"]).describe("The new stage"),
    },
    async ({ lead_id, stage }) => {
      const { data, error } = await supabaseAdmin
        .from("leads")
        .update({ stage, updated_at: new Date().toISOString() })
        .eq("id", lead_id)
        .select("id, first_name, last_name, stage")
        .single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Stage updated: ${data.first_name} ${data.last_name} → ${data.stage}` }] };
    }
  );

  // --- TOOL: update_lead_temperature ---
  server.tool(
    "update_lead_temperature",
    "Set a lead's temperature (hot, warm, cold).",
    {
      lead_id: z.number().describe("The lead ID"),
      temperature: z.enum(["hot", "warm", "cold"]).describe("The new temperature"),
    },
    async ({ lead_id, temperature }) => {
      const { data, error } = await supabaseAdmin
        .from("leads")
        .update({ temperature, updated_at: new Date().toISOString() })
        .eq("id", lead_id)
        .select("id, first_name, last_name, temperature")
        .single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Temperature updated: ${data.first_name} ${data.last_name} → ${data.temperature}` }] };
    }
  );

  // --- TOOL: get_leads_by_stage ---
  server.tool(
    "get_leads_by_stage",
    "Get a summary of the leads pipeline showing how many leads are in each stage.",
    {
      org_id: z.string().describe("The organization ID"),
    },
    async ({ org_id }) => {
      const { data, error } = await supabaseAdmin
        .from("leads")
        .select("stage, temperature")
        .eq("org_id", org_id);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };

      const byStage = (data ?? []).reduce<Record<string, number>>((acc, r) => {
        acc[r.stage] = (acc[r.stage] || 0) + 1;
        return acc;
      }, {});
      const byTemp = (data ?? []).reduce<Record<string, number>>((acc, r) => {
        acc[r.temperature] = (acc[r.temperature] || 0) + 1;
        return acc;
      }, {});

      const total = data?.length ?? 0;
      const summary = `Leads Pipeline (${total} total):
By stage:
- New: ${byStage["new"] || 0}
- Contacted: ${byStage["contacted"] || 0}
- Qualified: ${byStage["qualified"] || 0}
- Negotiating: ${byStage["negotiating"] || 0}
- Won: ${byStage["won"] || 0}
- Lost: ${byStage["lost"] || 0}

By temperature:
- Hot: ${byTemp["hot"] || 0}
- Warm: ${byTemp["warm"] || 0}
- Cold: ${byTemp["cold"] || 0}`;

      return { content: [{ type: "text" as const, text: summary }] };
    }
  );

  // --- TOOL: convert_lead_to_contact ---
  server.tool(
    "convert_lead_to_contact",
    "Convert a qualified lead into a contact. Creates a new contact record, links the lead via converted_contact_id, and sets lead stage to 'won'. Returns the new contact.",
    {
      org_id: z.string().describe("The organization ID"),
      lead_id: z.number().describe("The lead ID to convert"),
    },
    async ({ org_id, lead_id }) => {
      const { data: lead, error: leadErr } = await supabaseAdmin.from("leads").select("*").eq("id", lead_id).single();
      if (leadErr) return { content: [{ type: "text" as const, text: `Error: ${leadErr.message}` }] };
      if (lead.converted_contact_id) {
        return { content: [{ type: "text" as const, text: `Lead ${lead_id} has already been converted to contact ${lead.converted_contact_id}.` }] };
      }

      const fallbackEmail = `${lead.first_name.toLowerCase()}.${(lead.last_name || "contact").toLowerCase()}@unknown.local`;
      const { data: contact, error: contactErr } = await supabaseAdmin
        .from("contacts")
        .insert({
          org_id,
          first_name: lead.first_name,
          last_name: lead.last_name ?? "",
          email: lead.email || fallbackEmail,
          phone: lead.phone ?? "",
          address: lead.address ?? "",
          source: lead.source === "referral" ? "referral" : lead.source === "website" ? "website" : "manual",
          stage: "qualified",
          assigned_to: lead.assigned_to ?? null,
        })
        .select()
        .single();
      if (contactErr) return { content: [{ type: "text" as const, text: `Error creating contact: ${contactErr.message}` }] };

      await supabaseAdmin
        .from("leads")
        .update({ converted_contact_id: contact.id, stage: "won", updated_at: new Date().toISOString() })
        .eq("id", lead_id);

      return { content: [{ type: "text" as const, text: `Lead ${lead_id} converted. New contact: ${contact.first_name} ${contact.last_name} (ID: ${contact.id})` }] };
    }
  );

  // --- TOOL: delete_lead ---
  server.tool(
    "delete_lead",
    "Permanently delete a lead by its ID.",
    {
      lead_id: z.number().describe("The lead ID to delete"),
    },
    async ({ lead_id }) => {
      const { error } = await supabaseAdmin.from("leads").delete().eq("id", lead_id);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Lead ${lead_id} deleted.` }] };
    }
  );

  // ==================================================================
  // NOTIFICATIONS
  // ==================================================================

  server.tool(
    "list_notifications",
    "List notifications for an organization (optionally unread only).",
    { org_id: z.string(), unread_only: z.boolean().optional(), limit: z.number().optional() },
    async ({ org_id, unread_only, limit }) => {
      let query = supabaseAdmin.from("notifications").select("*")
        .eq("org_id", org_id).order("created_at", { ascending: false }).limit(limit ?? 20);
      if (unread_only) query = query.eq("read", false);
      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "mark_notification_read",
    "Mark a notification as read.",
    { notification_id: z.number() },
    async ({ notification_id }) => {
      const { error } = await supabaseAdmin.from("notifications").update({ read: true }).eq("id", notification_id);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Notification ${notification_id} marked read.` }] };
    }
  );

  server.tool(
    "create_notification",
    "Create an in-app notification.",
    {
      org_id: z.string(),
      type: z.string(),
      title: z.string(),
      body: z.string().optional(),
      entity_type: z.string().optional(),
      entity_id: z.number().optional(),
      user_id: z.string().optional(),
    },
    async (args) => {
      const { data, error } = await supabaseAdmin.from("notifications").insert({
        org_id: args.org_id, user_id: args.user_id ?? null,
        type: args.type, title: args.title, body: args.body ?? "",
        entity_type: args.entity_type ?? null, entity_id: args.entity_id ?? null,
      }).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Notification created (ID: ${data.id})` }] };
    }
  );

  server.tool(
    "get_contact_activity_timeline",
    "Get the unified chronological activity timeline for a contact: emails, notes, tasks, events, calls, SMS, deals.",
    { contact_id: z.number(), limit: z.number().optional() },
    async ({ contact_id, limit }) => {
      const lim = limit ?? 30;
      const [emails, notes, tasks, events, calls, sms, deals] = await Promise.all([
        supabaseAdmin.from("email_logs").select("id, subject, created_at").eq("contact_id", contact_id).order("created_at", { ascending: false }).limit(10),
        supabaseAdmin.from("contact_notes").select("id, note, created_at").eq("contact_id", contact_id).order("created_at", { ascending: false }).limit(10),
        supabaseAdmin.from("tasks").select("id, title, status, created_at").eq("contact_id", contact_id).order("created_at", { ascending: false }).limit(10),
        supabaseAdmin.from("events").select("id, title, start_at").eq("contact_id", contact_id).order("start_at", { ascending: false }).limit(10),
        supabaseAdmin.from("calls").select("id, call_type, disposition, started_at").eq("contact_id", contact_id).order("started_at", { ascending: false }).limit(10),
        supabaseAdmin.from("sms_messages").select("id, direction, body, created_at").eq("contact_id", contact_id).order("created_at", { ascending: false }).limit(10),
        supabaseAdmin.from("deals").select("id, title, value, stage, created_at").eq("contact_id", contact_id).order("created_at", { ascending: false }).limit(10),
      ]);

      const entries: any[] = [];
      for (const e of emails.data ?? []) entries.push({ kind: "email", timestamp: e.created_at, title: e.subject });
      for (const n of notes.data ?? []) entries.push({ kind: "note", timestamp: n.created_at, title: n.note });
      for (const t of tasks.data ?? []) entries.push({ kind: "task", timestamp: t.created_at, title: `${t.title} (${t.status})` });
      for (const ev of events.data ?? []) entries.push({ kind: "event", timestamp: ev.start_at, title: ev.title });
      for (const c of calls.data ?? []) entries.push({ kind: "call", timestamp: c.started_at, title: `${c.call_type}/${c.disposition}` });
      for (const s of sms.data ?? []) entries.push({ kind: "sms", timestamp: s.created_at, title: `${s.direction}: ${s.body.slice(0, 60)}` });
      for (const d of deals.data ?? []) entries.push({ kind: "deal", timestamp: d.created_at, title: `${d.title} ($${d.value})` });

      entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      return { content: [{ type: "text" as const, text: JSON.stringify(entries.slice(0, lim), null, 2) }] };
    }
  );

  // ==================================================================
  // SMS — individual 1:1 SMS threads with contacts
  // ==================================================================

  server.tool(
    "send_sms",
    "Send a single SMS to a contact. Simulated — no real carrier call. 30% of outbound messages auto-generate a reply.",
    {
      org_id: z.string(),
      contact_id: z.number(),
      body: z.string().describe("Message body"),
    },
    async ({ org_id, contact_id, body }) => {
      const { data: contact } = await supabaseAdmin.from("contacts").select("phone").eq("id", contact_id).single();
      if (!contact?.phone) return { content: [{ type: "text" as const, text: "Contact has no phone number." }] };
      const { data, error } = await supabaseAdmin.from("sms_messages").insert({
        org_id, contact_id, direction: "outbound", body, status: "queued",
        from_number: "+18005551234", to_number: contact.phone,
      }).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      void simulateSingleSms(data.id, contact_id, org_id, contact.phone);
      return { content: [{ type: "text" as const, text: `SMS queued to ${contact.phone} (ID: ${data.id}).` }] };
    }
  );

  server.tool(
    "list_sms_messages",
    "List recent SMS messages across the organization.",
    { org_id: z.string(), limit: z.number().optional() },
    async ({ org_id, limit }) => {
      const { data, error } = await supabaseAdmin.from("sms_messages")
        .select("id, contact_id, direction, body, status, from_number, to_number, created_at")
        .eq("org_id", org_id)
        .order("created_at", { ascending: false }).limit(limit ?? 30);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_sms_thread",
    "Get the full SMS thread with a specific contact.",
    { contact_id: z.number() },
    async ({ contact_id }) => {
      const { data, error } = await supabaseAdmin.from("sms_messages").select("*")
        .eq("contact_id", contact_id).order("created_at", { ascending: true });
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data || data.length === 0) return { content: [{ type: "text" as const, text: "No SMS history." }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ==================================================================
  // LOCATIONS — parking/site locations with rates and capacity
  // ==================================================================

  server.tool(
    "list_locations",
    "List all locations for an organization with rates, capacity, and amenities.",
    { org_id: z.string() },
    async ({ org_id }) => {
      const { data, error } = await supabaseAdmin.from("locations")
        .select("*").eq("org_id", org_id).order("name");
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_location",
    "Get full details of a specific location.",
    { location_id: z.number() },
    async ({ location_id }) => {
      const { data, error } = await supabaseAdmin.from("locations").select("*").eq("id", location_id).single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "update_location",
    "Update a location's rates, capacity, or active state.",
    {
      location_id: z.number(),
      name: z.string().optional(),
      capacity: z.number().optional(),
      monthly_rate: z.number().optional(),
      hourly_rate: z.number().optional(),
      daily_rate: z.number().optional(),
      is_active: z.boolean().optional(),
    },
    async ({ location_id, ...fields }) => {
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) if (v !== undefined) updates[k] = v;
      if (!Object.keys(updates).length) return { content: [{ type: "text" as const, text: "No fields to update." }] };
      updates.updated_at = new Date().toISOString();
      const { data, error } = await supabaseAdmin.from("locations").update(updates).eq("id", location_id).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Location "${data.name}" updated.` }] };
    }
  );

  server.tool(
    "get_location_occupancy",
    "Get rough occupancy stats for a location (capacity vs assigned employees).",
    { location_id: z.number() },
    async ({ location_id }) => {
      const [locRes, empRes] = await Promise.all([
        supabaseAdmin.from("locations").select("name, capacity").eq("id", location_id).single(),
        supabaseAdmin.from("employees").select("id", { count: "exact", head: true }).eq("location_id", location_id),
      ]);
      if (locRes.error) return { content: [{ type: "text" as const, text: `Error: ${locRes.error.message}` }] };
      const capacity = locRes.data.capacity;
      const used = empRes.count ?? 0;
      return { content: [{ type: "text" as const, text: `${locRes.data.name}: ${used} employees assigned, capacity ${capacity}` }] };
    }
  );

  // ==================================================================
  // REPORTS — aggregated analytics
  // ==================================================================

  server.tool(
    "get_revenue_report",
    "Aggregated revenue report: won deal value, pipeline value, monthly trend.",
    { org_id: z.string() },
    async ({ org_id }) => {
      const { data } = await supabaseAdmin.from("deals").select("value, stage, created_at").eq("org_id", org_id);
      const rows = data ?? [];
      const won = rows.filter((d) => d.stage === "won");
      const pipeline = rows.filter((d) => !["won", "lost"].includes(d.stage));
      const wonValue = won.reduce((s, d) => s + Number(d.value ?? 0), 0);
      const pipelineValue = pipeline.reduce((s, d) => s + Number(d.value ?? 0), 0);
      return { content: [{ type: "text" as const, text:
`Revenue: $${wonValue.toFixed(2)} won (${won.length} deals). Pipeline: $${pipelineValue.toFixed(2)} (${pipeline.length} open).`
      }] };
    }
  );

  server.tool(
    "get_lead_conversion_report",
    "Lead conversion analytics: total leads, conversion rate, breakdown by source and temperature.",
    { org_id: z.string() },
    async ({ org_id }) => {
      const { data } = await supabaseAdmin.from("leads").select("stage, source, temperature").eq("org_id", org_id);
      const rows = data ?? [];
      const total = rows.length;
      const converted = rows.filter((l) => l.stage === "won").length;
      const bySource: Record<string, number> = {};
      for (const l of rows) bySource[l.source] = (bySource[l.source] || 0) + 1;
      return { content: [{ type: "text" as const, text:
`Lead Conversion: ${converted}/${total} (${total ? Math.round(converted / total * 100) : 0}%). By source: ${JSON.stringify(bySource)}`
      }] };
    }
  );

  server.tool(
    "get_campaign_performance",
    "Aggregate campaign performance across all sent campaigns.",
    { org_id: z.string() },
    async ({ org_id }) => {
      const { data: campaigns } = await supabaseAdmin.from("campaigns").select("id, name, type").eq("org_id", org_id).eq("status", "sent");
      const out: any[] = [];
      for (const c of campaigns ?? []) {
        const { data: recips } = await supabaseAdmin.from("campaign_recipients").select("status").eq("campaign_id", c.id);
        const counts: Record<string, number> = {};
        for (const r of recips ?? []) counts[r.status] = (counts[r.status] || 0) + 1;
        const delivered = (counts.delivered ?? 0) + (counts.opened ?? 0) + (counts.clicked ?? 0);
        out.push({
          campaign: c.name, type: c.type, total: recips?.length ?? 0,
          openRate: delivered ? Math.round(((counts.opened ?? 0) + (counts.clicked ?? 0)) / delivered * 100) : 0,
          clickRate: delivered ? Math.round((counts.clicked ?? 0) / delivered * 100) : 0,
        });
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }] };
    }
  );

  server.tool(
    "get_call_analytics",
    "Aggregated call analytics over the last 60 days.",
    { org_id: z.string() },
    async ({ org_id }) => {
      const since = new Date(Date.now() - 60 * 86400000).toISOString();
      const { data } = await supabaseAdmin.from("calls").select("call_type, disposition, duration_seconds")
        .eq("org_id", org_id).gte("started_at", since);
      const rows = data ?? [];
      const byType: Record<string, number> = {};
      for (const c of rows) byType[c.call_type] = (byType[c.call_type] || 0) + 1;
      return { content: [{ type: "text" as const, text:
`Last 60 days: ${rows.length} calls. By type: ${JSON.stringify(byType)}`
      }] };
    }
  );

  server.tool(
    "get_employee_performance",
    "Per-employee metrics: write-up count and incident count.",
    { org_id: z.string() },
    async ({ org_id }) => {
      const [empRes, wuRes, incRes] = await Promise.all([
        supabaseAdmin.from("employees").select("id, first_name, last_name").eq("org_id", org_id),
        supabaseAdmin.from("write_ups").select("employee_id").eq("org_id", org_id),
        supabaseAdmin.from("incident_reports").select("employee_id").eq("org_id", org_id),
      ]);
      const wu: Record<number, number> = {}; for (const w of wuRes.data ?? []) wu[w.employee_id] = (wu[w.employee_id] || 0) + 1;
      const inc: Record<number, number> = {}; for (const i of incRes.data ?? []) if (i.employee_id) inc[i.employee_id] = (inc[i.employee_id] || 0) + 1;
      const rows = (empRes.data ?? []).map((e) => ({
        name: `${e.first_name} ${e.last_name}`,
        write_ups: wu[e.id] ?? 0,
        incidents: inc[e.id] ?? 0,
      }));
      return { content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }] };
    }
  );

  // ==================================================================
  // HR & OPERATIONS — employees, incidents, write-ups, intakes
  // ==================================================================

  server.tool(
    "list_employees",
    "List employees with optional location/role/status filters.",
    {
      org_id: z.string(),
      location_id: z.number().optional(),
      role: z.enum(["manager", "supervisor", "attendant", "valet", "admin"]).optional(),
      status: z.enum(["active", "on_leave", "terminated"]).optional(),
    },
    async ({ org_id, location_id, role, status }) => {
      let query = supabaseAdmin.from("employees")
        .select("id, first_name, last_name, role, location_id, status, phone, email, hire_date")
        .eq("org_id", org_id)
        .order("created_at", { ascending: false });
      if (location_id) query = query.eq("location_id", location_id);
      if (role) query = query.eq("role", role);
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_employee",
    "Get full employee details including incidents and write-ups count.",
    { employee_id: z.number() },
    async ({ employee_id }) => {
      const [empRes, wuRes, incRes] = await Promise.all([
        supabaseAdmin.from("employees").select("*").eq("id", employee_id).single(),
        supabaseAdmin.from("write_ups").select("id", { count: "exact", head: true }).eq("employee_id", employee_id),
        supabaseAdmin.from("incident_reports").select("id", { count: "exact", head: true }).eq("employee_id", employee_id),
      ]);
      if (empRes.error) return { content: [{ type: "text" as const, text: `Error: ${empRes.error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({
        ...empRes.data, write_ups_count: wuRes.count ?? 0, incidents_count: incRes.count ?? 0,
      }, null, 2) }] };
    }
  );

  server.tool(
    "create_employee",
    "Hire a new employee.",
    {
      org_id: z.string(),
      first_name: z.string(),
      last_name: z.string().optional(),
      role: z.enum(["manager", "supervisor", "attendant", "valet", "admin"]).optional(),
      location_id: z.number().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      hire_date: z.string().optional(),
    },
    async (args) => {
      const { data, error } = await supabaseAdmin.from("employees").insert({
        org_id: args.org_id, first_name: args.first_name, last_name: args.last_name ?? "",
        role: args.role ?? "attendant", location_id: args.location_id ?? null,
        phone: args.phone ?? "", email: args.email ?? "",
        hire_date: args.hire_date ?? null, status: "active",
      }).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Employee created: ${data.first_name} ${data.last_name} (ID: ${data.id})` }] };
    }
  );

  server.tool(
    "update_employee",
    "Update an employee's role, location, status, contact info.",
    {
      employee_id: z.number(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      role: z.enum(["manager", "supervisor", "attendant", "valet", "admin"]).optional(),
      location_id: z.number().optional(),
      status: z.enum(["active", "on_leave", "terminated"]).optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    },
    async ({ employee_id, ...fields }) => {
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) if (v !== undefined) updates[k] = v;
      if (!Object.keys(updates).length) return { content: [{ type: "text" as const, text: "No fields to update." }] };
      updates.updated_at = new Date().toISOString();
      const { data, error } = await supabaseAdmin.from("employees").update(updates).eq("id", employee_id).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Employee ${data.first_name} ${data.last_name} updated.` }] };
    }
  );

  server.tool(
    "list_incidents",
    "List incident reports with filters.",
    {
      org_id: z.string(),
      status: z.enum(["open", "investigating", "resolved"]).optional(),
      severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    },
    async ({ org_id, status, severity }) => {
      let query = supabaseAdmin.from("incident_reports").select("*")
        .eq("org_id", org_id).order("incident_date", { ascending: false });
      if (status) query = query.eq("status", status);
      if (severity) query = query.eq("severity", severity);
      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "create_incident",
    "File a new incident report.",
    {
      org_id: z.string(),
      employee_id: z.number().optional(),
      location_id: z.number().optional(),
      type: z.enum(["damage", "theft", "injury", "customer_complaint", "safety", "other"]),
      severity: z.enum(["low", "medium", "high", "critical"]),
      description: z.string(),
      incident_date: z.string().optional(),
    },
    async (args) => {
      const { data, error } = await supabaseAdmin.from("incident_reports").insert({
        org_id: args.org_id, employee_id: args.employee_id ?? null,
        location_id: args.location_id ?? null,
        incident_date: args.incident_date ?? new Date().toISOString(),
        type: args.type, severity: args.severity,
        description: args.description, status: "open",
      }).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Incident filed (ID: ${data.id}, ${data.severity} ${data.type})` }] };
    }
  );

  server.tool(
    "list_write_ups",
    "List employee write-ups. Filter by employee_id if given.",
    { org_id: z.string(), employee_id: z.number().optional() },
    async ({ org_id, employee_id }) => {
      let query = supabaseAdmin.from("write_ups").select("*")
        .eq("org_id", org_id).order("write_up_date", { ascending: false });
      if (employee_id) query = query.eq("employee_id", employee_id);
      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "create_write_up",
    "Issue a write-up to an employee.",
    {
      org_id: z.string(),
      employee_id: z.number(),
      reason: z.string(),
      description: z.string().optional(),
      severity: z.enum(["verbal", "written", "final"]).optional(),
    },
    async (args) => {
      const { data, error } = await supabaseAdmin.from("write_ups").insert({
        org_id: args.org_id, employee_id: args.employee_id,
        reason: args.reason, description: args.description ?? "",
        severity: args.severity ?? "verbal",
      }).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Write-up issued (ID: ${data.id}, severity: ${data.severity})` }] };
    }
  );

  server.tool(
    "list_intakes",
    "List employee intake applications.",
    {
      org_id: z.string(),
      status: z.enum(["applied", "screening", "interview", "offer", "hired", "rejected"]).optional(),
    },
    async ({ org_id, status }) => {
      let query = supabaseAdmin.from("employee_intakes").select("*")
        .eq("org_id", org_id).order("created_at", { ascending: false });
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "update_intake_status",
    "Move an applicant to a new stage (applied → screening → interview → offer → hired / rejected).",
    {
      intake_id: z.number(),
      status: z.enum(["applied", "screening", "interview", "offer", "hired", "rejected"]),
      notes: z.string().optional(),
    },
    async ({ intake_id, status, notes }) => {
      const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (notes !== undefined) updates.notes = notes;
      const { data, error } = await supabaseAdmin.from("employee_intakes").update(updates).eq("id", intake_id).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Applicant ${data.applicant_name} → ${data.status}` }] };
    }
  );

  // ==================================================================
  // CAMPAIGNS — email + SMS blasts
  // ==================================================================

  // --- TOOL: create_campaign ---
  server.tool(
    "create_campaign",
    "Create a new campaign (email or SMS) as a draft. Audience is rebuilt from audience_filter at send time.",
    {
      org_id: z.string(),
      name: z.string().describe("Campaign name"),
      type: z.enum(["email", "sms"]),
      subject: z.string().optional().describe("Email subject (ignored for SMS)"),
      body: z.string().describe("Message body (supports {{first_name}} {{company}} merge tags)"),
      audience_filter: z.object({
        stage: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        cities: z.array(z.string()).optional(),
        sources: z.array(z.string()).optional(),
      }).optional(),
      template_id: z.number().optional(),
    },
    async ({ org_id, name, type, subject, body, audience_filter, template_id }) => {
      const filter = audience_filter ?? {};
      let aq = supabaseAdmin.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", org_id);
      if (filter.stage?.length) aq = aq.in("stage", filter.stage);
      if (filter.sources?.length) aq = aq.in("source", filter.sources);
      if (filter.cities?.length) aq = aq.in("city", filter.cities);
      if (filter.tags?.length) aq = aq.overlaps("tags", filter.tags);
      const { count } = await aq;

      const { data, error } = await supabaseAdmin.from("campaigns").insert({
        org_id, name, type, subject: subject ?? "", body,
        audience_filter: filter, audience_size: count ?? 0,
        template_id: template_id ?? null, status: "draft",
      }).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Campaign created: "${data.name}" (ID: ${data.id}) — audience ~${data.audience_size}` }] };
    }
  );

  // --- TOOL: list_campaigns ---
  server.tool(
    "list_campaigns",
    "List campaigns for an organization. Supports status filtering.",
    {
      org_id: z.string(),
      status: z.enum(["draft", "scheduled", "sending", "sent", "failed", "cancelled"]).optional(),
      limit: z.number().optional(),
    },
    async ({ org_id, status, limit }) => {
      let query = supabaseAdmin.from("campaigns")
        .select("id, name, type, status, audience_size, subject, scheduled_at, sent_at, created_at")
        .eq("org_id", org_id)
        .order("created_at", { ascending: false })
        .limit(limit ?? 20);
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data || data.length === 0) return { content: [{ type: "text" as const, text: "No campaigns yet." }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- TOOL: get_campaign ---
  server.tool(
    "get_campaign",
    "Get full details of a specific campaign.",
    { campaign_id: z.number() },
    async ({ campaign_id }) => {
      const { data, error } = await supabaseAdmin.from("campaigns").select("*").eq("id", campaign_id).single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- TOOL: get_campaign_stats ---
  server.tool(
    "get_campaign_stats",
    "Get aggregated stats for a campaign: total, sent, delivered, opened, clicked, bounced, open/click/bounce rate.",
    { campaign_id: z.number() },
    async ({ campaign_id }) => {
      const { data, error } = await supabaseAdmin
        .from("campaign_recipients")
        .select("status")
        .eq("campaign_id", campaign_id);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      const rows = data ?? [];
      const counts = rows.reduce<Record<string, number>>((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
      const delivered = (counts.delivered ?? 0) + (counts.opened ?? 0) + (counts.clicked ?? 0);
      const opened = (counts.opened ?? 0) + (counts.clicked ?? 0);
      const clicked = counts.clicked ?? 0;
      return { content: [{ type: "text" as const, text:
`Campaign ${campaign_id} stats:
- Total recipients: ${rows.length}
- Delivered: ${delivered}
- Opened: ${opened} (${delivered ? Math.round(opened / delivered * 100) : 0}%)
- Clicked: ${clicked} (${delivered ? Math.round(clicked / delivered * 100) : 0}%)
- Bounced: ${counts.bounced ?? 0}
- Failed: ${counts.failed ?? 0}`
      }] };
    }
  );

  // --- TOOL: send_campaign ---
  server.tool(
    "send_campaign",
    "Send a draft or scheduled campaign immediately. Builds recipient list from audience filter and simulates delivery.",
    { campaign_id: z.number() },
    async ({ campaign_id }) => {
      const { data: campaign, error: cerr } = await supabaseAdmin.from("campaigns").select("*").eq("id", campaign_id).single();
      if (cerr) return { content: [{ type: "text" as const, text: `Error: ${cerr.message}` }] };
      if (!["draft", "scheduled"].includes(campaign.status)) {
        return { content: [{ type: "text" as const, text: `Cannot send campaign — current status: ${campaign.status}` }] };
      }

      const filter = campaign.audience_filter ?? {};
      let query = supabaseAdmin.from("contacts").select("id, email, phone").eq("org_id", campaign.org_id);
      if (filter.stage?.length) query = query.in("stage", filter.stage);
      if (filter.sources?.length) query = query.in("source", filter.sources);
      if (filter.cities?.length) query = query.in("city", filter.cities);
      if (filter.tags?.length) query = query.overlaps("tags", filter.tags);
      const { data: audience, error: aerr } = await query.limit(2000);
      if (aerr) return { content: [{ type: "text" as const, text: `Error: ${aerr.message}` }] };

      if ((audience?.length ?? 0) === 0) {
        return { content: [{ type: "text" as const, text: "Audience is empty — no recipients to send to." }] };
      }

      const rows = (audience ?? []).map((a) => ({
        campaign_id,
        contact_id: a.id,
        to_email: campaign.type === "email" ? a.email : "",
        to_phone: campaign.type === "sms" ? a.phone : "",
        status: "pending",
      }));
      const { error: ierr } = await supabaseAdmin.from("campaign_recipients").insert(rows);
      if (ierr) return { content: [{ type: "text" as const, text: `Error: ${ierr.message}` }] };

      if (campaign.type === "email") void simulateEmailSend(campaign_id);
      else void simulateSmsBlast(campaign_id);

      return { content: [{ type: "text" as const, text: `Campaign ${campaign_id} sending to ${rows.length} recipient(s). Delivery status updates over the next ~60s.` }] };
    }
  );

  // --- TOOL: schedule_campaign ---
  server.tool(
    "schedule_campaign",
    "Schedule a draft campaign to send at a future time. Note: demo mode does not auto-run scheduled sends; use send_campaign to kick off delivery.",
    { campaign_id: z.number(), scheduled_at: z.string().describe("ISO timestamp") },
    async ({ campaign_id, scheduled_at }) => {
      const { data, error } = await supabaseAdmin.from("campaigns")
        .update({ status: "scheduled", scheduled_at, updated_at: new Date().toISOString() })
        .eq("id", campaign_id).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Campaign "${data.name}" scheduled for ${new Date(scheduled_at).toLocaleString()}` }] };
    }
  );

  // --- TOOL: get_campaign_recipients ---
  server.tool(
    "get_campaign_recipients",
    "List recipients for a campaign with per-recipient status.",
    {
      campaign_id: z.number(),
      status: z.enum(["pending", "sent", "delivered", "opened", "clicked", "bounced", "failed"]).optional(),
      limit: z.number().optional(),
    },
    async ({ campaign_id, status, limit }) => {
      let query = supabaseAdmin.from("campaign_recipients")
        .select("id, contact_id, to_email, to_phone, status, sent_at, opened_at, clicked_at")
        .eq("campaign_id", campaign_id)
        .order("id", { ascending: true })
        .limit(limit ?? 50);
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- TOOL: cancel_campaign ---
  server.tool(
    "cancel_campaign",
    "Cancel a scheduled or draft campaign.",
    { campaign_id: z.number() },
    async ({ campaign_id }) => {
      const { data, error } = await supabaseAdmin.from("campaigns")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", campaign_id).select("id, name").single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Campaign "${data.name}" cancelled.` }] };
    }
  );

  // ==================================================================
  // PHONE & CHAT — voice agents, calls, transcripts, chat sessions
  // ==================================================================

  // --- TOOL: create_voice_agent ---
  server.tool(
    "create_voice_agent",
    "Create a new AI voice agent (the persona that answers the phone).",
    {
      org_id: z.string(),
      name: z.string().describe("Human-readable agent name, e.g., 'Frontdesk'"),
      voice: z.enum(["nina", "marcus", "ava", "leo"]).describe("Voice persona"),
      greeting: z.string().optional(),
      system_prompt: z.string().optional(),
      tools_enabled: z.array(z.string()).optional(),
      is_active: z.boolean().optional(),
    },
    async ({ org_id, name, voice, greeting, system_prompt, tools_enabled, is_active }) => {
      const { data, error } = await supabaseAdmin.from("voice_agents").insert({
        org_id, name, voice,
        greeting: greeting ?? "",
        system_prompt: system_prompt ?? "",
        tools_enabled: tools_enabled ?? [],
        is_active: is_active ?? true,
      }).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Voice agent created: "${data.name}" (ID: ${data.id}, voice: ${data.voice})` }] };
    }
  );

  // --- TOOL: list_voice_agents ---
  server.tool(
    "list_voice_agents",
    "List all voice agents for an organization.",
    { org_id: z.string() },
    async ({ org_id }) => {
      const { data, error } = await supabaseAdmin.from("voice_agents")
        .select("id, name, voice, greeting, is_active")
        .eq("org_id", org_id)
        .order("created_at", { ascending: true });
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data || data.length === 0) return { content: [{ type: "text" as const, text: "No voice agents yet." }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- TOOL: update_voice_agent ---
  server.tool(
    "update_voice_agent",
    "Update fields on an existing voice agent (name, voice, greeting, system prompt, tool list, active state).",
    {
      agent_id: z.number(),
      name: z.string().optional(),
      voice: z.enum(["nina", "marcus", "ava", "leo"]).optional(),
      greeting: z.string().optional(),
      system_prompt: z.string().optional(),
      tools_enabled: z.array(z.string()).optional(),
      is_active: z.boolean().optional(),
    },
    async ({ agent_id, ...fields }) => {
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) if (v !== undefined) updates[k] = v;
      if (Object.keys(updates).length === 0) return { content: [{ type: "text" as const, text: "No fields to update." }] };
      updates.updated_at = new Date().toISOString();
      const { data, error } = await supabaseAdmin.from("voice_agents").update(updates).eq("id", agent_id).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Voice agent "${data.name}" updated.` }] };
    }
  );

  // --- TOOL: list_calls ---
  server.tool(
    "list_calls",
    "List phone calls with optional filters. Answers questions like 'how many support calls happened this week?' or 'show me calls that created leads'.",
    {
      org_id: z.string(),
      call_type: z.enum(["sales", "support", "general", "billing"]).optional(),
      disposition: z.enum(["lead_created", "transferred_to_live_agent", "scheduled_callback", "info_provided", "no_answer"]).optional(),
      direction: z.enum(["inbound", "outbound"]).optional(),
      contact_id: z.number().optional(),
      limit: z.number().optional().describe("Max rows (default: 20)"),
    },
    async ({ org_id, call_type, disposition, direction, contact_id, limit }) => {
      let query = supabaseAdmin.from("calls")
        .select("id, caller_name, caller_phone, call_type, disposition, direction, duration_seconds, started_at, contact_id, voice_agent_id")
        .eq("org_id", org_id)
        .order("started_at", { ascending: false })
        .limit(limit ?? 20);
      if (call_type) query = query.eq("call_type", call_type);
      if (disposition) query = query.eq("disposition", disposition);
      if (direction) query = query.eq("direction", direction);
      if (contact_id) query = query.eq("contact_id", contact_id);
      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data || data.length === 0) return { content: [{ type: "text" as const, text: "No calls match those filters." }] };
      return { content: [{ type: "text" as const, text: `${data.length} call(s):\n${JSON.stringify(data, null, 2)}` }] };
    }
  );

  // --- TOOL: get_call ---
  server.tool(
    "get_call",
    "Get full details of a specific call by its ID.",
    { call_id: z.number() },
    async ({ call_id }) => {
      const { data, error } = await supabaseAdmin.from("calls").select("*").eq("id", call_id).single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- TOOL: get_call_transcript ---
  server.tool(
    "get_call_transcript",
    "Get the full transcript, AI summary, and next-step checklist for a call.",
    { call_id: z.number() },
    async ({ call_id }) => {
      const { data, error } = await supabaseAdmin.from("call_transcripts")
        .select("*").eq("call_id", call_id).maybeSingle();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data) return { content: [{ type: "text" as const, text: `No transcript recorded for call ${call_id}.` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- TOOL: summarize_call ---
  server.tool(
    "summarize_call",
    "Set or overwrite the AI summary + next-steps for a call's transcript. Use after reviewing raw turns.",
    {
      call_id: z.number(),
      summary: z.string().describe("Plain-text summary"),
      next_steps: z.array(z.string()).optional().describe("Next-step checklist"),
    },
    async ({ call_id, summary, next_steps }) => {
      const { data: existing } = await supabaseAdmin.from("call_transcripts").select("id").eq("call_id", call_id).maybeSingle();
      const payload = { summary, next_steps: next_steps ?? [] };
      if (existing) {
        const { error } = await supabaseAdmin.from("call_transcripts").update(payload).eq("call_id", call_id);
        if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
        return { content: [{ type: "text" as const, text: `Summary updated for call ${call_id}.` }] };
      }
      const { error } = await supabaseAdmin.from("call_transcripts").insert({ call_id, turns: [], ...payload });
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `Summary created for call ${call_id}.` }] };
    }
  );

  // --- TOOL: get_call_stats ---
  server.tool(
    "get_call_stats",
    "Get aggregated call metrics: today/week/month volume, AI handle rate, avg duration, calls by type, and leads created.",
    { org_id: z.string() },
    async ({ org_id }) => {
      const { data, error } = await supabaseAdmin.from("calls")
        .select("started_at, duration_seconds, call_type, disposition")
        .eq("org_id", org_id);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      const rows = data ?? [];
      const now = Date.now();
      const today = rows.filter((r) => new Date(r.started_at).toDateString() === new Date(now).toDateString()).length;
      const week = rows.filter((r) => now - new Date(r.started_at).getTime() < 7 * 86400000).length;
      const month = rows.filter((r) => now - new Date(r.started_at).getTime() < 30 * 86400000).length;
      const aiHandled = rows.filter((r) =>
        ["info_provided", "lead_created", "scheduled_callback"].includes(r.disposition)
      ).length;
      const handleRate = rows.length ? Math.round((aiHandled / rows.length) * 100) : 0;
      const durations = rows.map((r) => r.duration_seconds).filter((d) => d > 0);
      const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
      const byType = rows.reduce<Record<string, number>>((acc, r) => {
        acc[r.call_type] = (acc[r.call_type] || 0) + 1;
        return acc;
      }, {});
      const leads = rows.filter((r) => r.disposition === "lead_created").length;

      return { content: [{ type: "text" as const, text:
`Call stats for org ${org_id}:
- Today: ${today}
- This week: ${week}
- This month: ${month}
- AI handle rate: ${handleRate}%
- Avg duration: ${Math.floor(avg / 60)}m ${avg % 60}s
- Leads created from calls: ${leads}
- By type: ${JSON.stringify(byType)}`
      }] };
    }
  );

  // --- TOOL: list_chat_sessions ---
  server.tool(
    "list_chat_sessions",
    "List AI chat sessions (website / widget).",
    {
      org_id: z.string(),
      status: z.enum(["active", "ended", "abandoned"]).optional(),
      limit: z.number().optional(),
    },
    async ({ org_id, status, limit }) => {
      let query = supabaseAdmin.from("chat_sessions")
        .select("id, visitor_name, channel, status, summary, started_at, ended_at")
        .eq("org_id", org_id)
        .order("started_at", { ascending: false })
        .limit(limit ?? 20);
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data || data.length === 0) return { content: [{ type: "text" as const, text: "No chat sessions yet." }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- TOOL: get_activity_feed ---
  server.tool(
    "get_activity_feed",
    "Get the recent activity feed across all contacts in the organization.",
    {
      org_id: z.string().describe("The organization ID"),
      limit: z.number().optional().describe("Maximum number of activities to return (default: 20)"),
    },
    async ({ org_id, limit }) => {
      const { data, error } = await supabaseAdmin
        .from("activities")
        .select("id, type, content, metadata, contact_id, created_at")
        .eq("org_id", org_id)
        .order("created_at", { ascending: false })
        .limit(limit || 20);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data || data.length === 0) return { content: [{ type: "text" as const, text: "No recent activity." }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ==========================================================================
  // ROOFING-SPECIFIC TOOLS (phase 13)
  // ==========================================================================

  // --- TOOL: list_storm_events ---
  server.tool(
    "list_storm_events",
    "List storm events (hail, wind, tropical, ice) that this org tracks, with counts of linked leads and jobs.",
    { org_id: z.string() },
    async ({ org_id }) => {
      const { data: storms, error } = await supabaseAdmin
        .from("storm_events")
        .select("id, name, event_date, storm_type, counties, description")
        .eq("org_id", org_id)
        .order("event_date", { ascending: false });
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      const enriched = await Promise.all((storms ?? []).map(async (s: any) => {
        const { count: leadCount } = await supabaseAdmin.from("leads").select("id", { count: "exact", head: true }).eq("org_id", org_id).eq("storm_event_id", s.id);
        const { count: jobCount } = await supabaseAdmin.from("jobs").select("id", { count: "exact", head: true }).eq("org_id", org_id).eq("storm_event_id", s.id);
        return { ...s, lead_count: leadCount ?? 0, job_count: jobCount ?? 0 };
      }));
      return { content: [{ type: "text" as const, text: JSON.stringify(enriched, null, 2) }] };
    }
  );

  // --- TOOL: get_leads_by_storm_event ---
  server.tool(
    "get_leads_by_storm_event",
    "List all leads tagged to a specific storm event. Use this to answer 'which leads came in from the Feb Atlanta hailstorm?'",
    {
      org_id: z.string(),
      storm_event_id: z.number().optional().describe("Storm event id (preferred)"),
      storm_name: z.string().optional().describe("Fuzzy storm name match (e.g., 'Feb Atlanta')"),
    },
    async ({ org_id, storm_event_id, storm_name }) => {
      let eventId = storm_event_id;
      if (!eventId && storm_name) {
        const { data: storms } = await supabaseAdmin.from("storm_events")
          .select("id, name").eq("org_id", org_id).ilike("name", `%${storm_name}%`).limit(1);
        eventId = storms?.[0]?.id;
      }
      if (!eventId) return { content: [{ type: "text" as const, text: "No matching storm event found." }] };
      const { data, error } = await supabaseAdmin.from("leads")
        .select("id, first_name, last_name, property_address, city, state, stage, insurance_carrier, claim_number, estimated_retail_amount, created_at")
        .eq("org_id", org_id).eq("storm_event_id", eventId).order("created_at", { ascending: false });
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ storm_event_id: eventId, count: data?.length ?? 0, leads: data }, null, 2) }] };
    }
  );

  // --- TOOL: list_adjusters ---
  server.tool(
    "list_adjusters",
    "List insurance adjusters the org has worked with, with carrier, territory, and performance stats.",
    {
      org_id: z.string(),
      carrier: z.string().optional(),
      territory: z.string().optional(),
    },
    async ({ org_id, carrier, territory }) => {
      let q = supabaseAdmin.from("insurance_adjusters")
        .select("id, name, carrier, territory, phone, email, avg_approval_days, avg_supplement_pct, notes")
        .eq("org_id", org_id);
      if (carrier) q = q.eq("carrier", carrier);
      if (territory) q = q.ilike("territory", `%${territory}%`);
      const { data, error } = await q.order("avg_approval_days", { ascending: true });
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // --- TOOL: get_adjuster_stats ---
  server.tool(
    "get_adjuster_stats",
    "Ranked adjuster performance: fastest approvers, highest supplement rates, and total approved $ across jobs. Use for 'which adjusters approve supplements fastest'.",
    {
      org_id: z.string(),
      rank_by: z.enum(["avg_approval_days", "avg_supplement_pct", "approved_value", "supplement_value"]).optional().describe("Default: avg_supplement_pct desc"),
      limit: z.number().optional(),
    },
    async ({ org_id, rank_by = "avg_supplement_pct", limit = 12 }) => {
      const { data: adjs, error } = await supabaseAdmin.from("insurance_adjusters")
        .select("id, name, carrier, territory, avg_approval_days, avg_supplement_pct, notes")
        .eq("org_id", org_id);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      const { data: jobs } = await supabaseAdmin.from("jobs")
        .select("adjuster_id, insurance_approved_amount, supplements_amount")
        .eq("org_id", org_id);
      const byAdjuster = new Map<number, { approved: number; supp: number; count: number }>();
      for (const j of jobs ?? []) {
        if (!j.adjuster_id) continue;
        const cur = byAdjuster.get(j.adjuster_id) ?? { approved: 0, supp: 0, count: 0 };
        cur.approved += Number(j.insurance_approved_amount || 0);
        cur.supp += Number(j.supplements_amount || 0);
        cur.count += 1;
        byAdjuster.set(j.adjuster_id, cur);
      }
      const enriched = (adjs ?? []).map((a: any) => {
        const s = byAdjuster.get(a.id) ?? { approved: 0, supp: 0, count: 0 };
        return { ...a, jobs_count: s.count, total_approved_value: s.approved, total_supplement_value: s.supp };
      });
      const sorted = enriched.sort((x: any, y: any) => {
        if (rank_by === "avg_approval_days") return x.avg_approval_days - y.avg_approval_days;
        if (rank_by === "avg_supplement_pct") return y.avg_supplement_pct - x.avg_supplement_pct;
        if (rank_by === "approved_value") return y.total_approved_value - x.total_approved_value;
        return y.total_supplement_value - x.total_supplement_value;
      }).slice(0, limit);
      return { content: [{ type: "text" as const, text: JSON.stringify({ ranked_by: rank_by, adjusters: sorted }, null, 2) }] };
    }
  );

  // --- TOOL: list_jobs ---
  server.tool(
    "list_jobs",
    "List roofing jobs, optionally filtered by status, market/state, crew, date range, or storm event.",
    {
      org_id: z.string(),
      status: z.enum(["scheduled", "materials_ordered", "in_progress", "punch_list", "completed", "warranty_claim", "cancelled"]).optional(),
      state: z.string().optional().describe("2-letter state like GA, FL, MO"),
      crew_id: z.number().optional(),
      storm_event_id: z.number().optional(),
      limit: z.number().optional(),
    },
    async ({ org_id, status, state, crew_id, storm_event_id, limit = 50 }) => {
      let q = supabaseAdmin.from("jobs")
        .select("id, property_address, city, state, roof_type, squares, status, insurance_carrier, claim_number, estimated_retail_amount, insurance_approved_amount, supplements_amount, final_contract_amount, scheduled_start_date, actual_start_date, actual_end_date, crew_id, adjuster_id, contact_id, lead_id, storm_event_id")
        .eq("org_id", org_id)
        .order("scheduled_start_date", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (status) q = q.eq("status", status);
      if (state) q = q.eq("state", state);
      if (crew_id) q = q.eq("crew_id", crew_id);
      if (storm_event_id) q = q.eq("storm_event_id", storm_event_id);
      const { data, error } = await q;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ count: data?.length ?? 0, jobs: data }, null, 2) }] };
    }
  );

  // --- TOOL: get_job_details ---
  server.tool(
    "get_job_details",
    "Full job record including adjuster, crew, sales rep, PM, photos, and linked contact/lead names. Use for 'status update on Mark Henderson's job'.",
    {
      job_id: z.number().optional(),
      customer_name: z.string().optional().describe("Fuzzy customer name match (looks up via contacts or leads)"),
      org_id: z.string().optional(),
    },
    async ({ job_id, customer_name, org_id }) => {
      let id = job_id;
      if (!id && customer_name && org_id) {
        const [first, ...rest] = customer_name.split(" ");
        const last = rest.join(" ");
        const { data: leads } = await supabaseAdmin.from("leads")
          .select("id").eq("org_id", org_id).ilike("first_name", `%${first}%`).ilike("last_name", `%${last}%`).limit(1);
        if (leads?.[0]) {
          const { data: j } = await supabaseAdmin.from("jobs").select("id").eq("lead_id", leads[0].id).limit(1);
          if (j?.[0]) id = j[0].id;
        }
        if (!id) {
          const { data: contacts } = await supabaseAdmin.from("contacts")
            .select("id").eq("org_id", org_id).ilike("first_name", `%${first}%`).ilike("last_name", `%${last}%`).limit(1);
          if (contacts?.[0]) {
            const { data: j } = await supabaseAdmin.from("jobs").select("id").eq("contact_id", contacts[0].id).limit(1);
            if (j?.[0]) id = j[0].id;
          }
        }
      }
      if (!id) return { content: [{ type: "text" as const, text: "No job found." }] };
      const { data, error } = await supabaseAdmin.from("jobs").select("*").eq("id", id).single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      // Enrich with adjuster + crew + sales rep names
      const [{ data: adj }, { data: crew }, { data: rep }, { data: pm }] = await Promise.all([
        data.adjuster_id ? supabaseAdmin.from("insurance_adjusters").select("name, carrier").eq("id", data.adjuster_id).maybeSingle() : Promise.resolve({ data: null }),
        data.crew_id ? supabaseAdmin.from("crews").select("name").eq("id", data.crew_id).maybeSingle() : Promise.resolve({ data: null }),
        data.sales_rep_employee_id ? supabaseAdmin.from("employees").select("first_name, last_name").eq("id", data.sales_rep_employee_id).maybeSingle() : Promise.resolve({ data: null }),
        data.pm_employee_id ? supabaseAdmin.from("employees").select("first_name, last_name").eq("id", data.pm_employee_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      return { content: [{ type: "text" as const, text: JSON.stringify({
        ...data,
        adjuster_name: adj ? `${(adj as any).name} (${(adj as any).carrier})` : null,
        crew_name: (crew as any)?.name ?? null,
        sales_rep_name: rep ? `${(rep as any).first_name} ${(rep as any).last_name}` : null,
        pm_name: pm ? `${(pm as any).first_name} ${(pm as any).last_name}` : null,
      }, null, 2) }] };
    }
  );

  // --- TOOL: get_contact_full_context ---
  server.tool(
    "get_contact_full_context",
    "Return a contact plus all related jobs, recent calls, SMS, tasks, and notes in a single payload.",
    { contact_id: z.number(), org_id: z.string().optional() },
    async ({ contact_id }) => {
      const [{ data: contact }, { data: jobs }, { data: calls }, { data: sms }, { data: tasks }, { data: notes }] = await Promise.all([
        supabaseAdmin.from("contacts").select("*").eq("id", contact_id).maybeSingle(),
        supabaseAdmin.from("jobs").select("id, status, property_address, estimated_retail_amount, final_contract_amount, scheduled_start_date").eq("contact_id", contact_id),
        supabaseAdmin.from("calls").select("id, direction, call_type, disposition, started_at, duration_seconds").eq("contact_id", contact_id).order("started_at", { ascending: false }).limit(10),
        supabaseAdmin.from("sms_messages").select("id, direction, body, sent_at").eq("contact_id", contact_id).order("created_at", { ascending: false }).limit(10),
        supabaseAdmin.from("tasks").select("id, title, status, due_date, priority").eq("contact_id", contact_id).order("due_date", { ascending: true }).limit(10),
        supabaseAdmin.from("contact_notes").select("note, created_at").eq("contact_id", contact_id).order("created_at", { ascending: false }).limit(10),
      ]);
      return { content: [{ type: "text" as const, text: JSON.stringify({ contact, jobs, calls, sms, tasks, notes }, null, 2) }] };
    }
  );

  // --- TOOL: get_pipeline_stuck_leads ---
  server.tool(
    "get_pipeline_stuck_leads",
    "Leads that have been in a stage longer than N days. Default: insurance_pending > 14 days. Use for 'show me insurance claims stuck > 14 days'.",
    {
      org_id: z.string(),
      stage: z.string().optional().describe("Default: insurance_pending"),
      min_days: z.number().optional().describe("Default: 14"),
    },
    async ({ org_id, stage = "insurance_pending", min_days = 14 }) => {
      const cutoff = new Date(Date.now() - min_days * 86_400_000).toISOString();
      const { data, error } = await supabaseAdmin.from("leads")
        .select("id, first_name, last_name, property_address, city, state, stage, insurance_carrier, claim_number, adjuster_id, estimated_retail_amount, estimated_insurance_amount, notes, created_at")
        .eq("org_id", org_id).eq("stage", stage).lte("created_at", cutoff)
        .order("created_at", { ascending: true });
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      const enriched = (data ?? []).map((l: any) => ({
        ...l,
        days_stuck: Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86_400_000),
      }));
      const total = enriched.reduce((s: number, l: any) => s + Number(l.estimated_insurance_amount || 0), 0);
      return { content: [{ type: "text" as const, text: JSON.stringify({ stage, min_days, count: enriched.length, total_stuck_value: total, leads: enriched }, null, 2) }] };
    }
  );

  // --- TOOL: get_supplement_performance ---
  server.tool(
    "get_supplement_performance",
    "Supplement recovery performance grouped by coordinator (supplements_coord_employee_id) or adjuster.",
    {
      org_id: z.string(),
      group_by: z.enum(["coordinator", "adjuster"]).optional().describe("Default: coordinator"),
    },
    async ({ org_id, group_by = "coordinator" }) => {
      const { data: jobs, error } = await supabaseAdmin.from("jobs")
        .select("supplements_coord_employee_id, adjuster_id, insurance_approved_amount, supplements_amount")
        .eq("org_id", org_id);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };

      const groups = new Map<number | string, { approved: number; supp: number; count: number }>();
      for (const j of jobs ?? []) {
        const key = group_by === "coordinator" ? j.supplements_coord_employee_id : j.adjuster_id;
        if (!key) continue;
        const cur = groups.get(key) ?? { approved: 0, supp: 0, count: 0 };
        cur.approved += Number(j.insurance_approved_amount || 0);
        cur.supp += Number(j.supplements_amount || 0);
        cur.count += 1;
        groups.set(key, cur);
      }
      const ids = Array.from(groups.keys()) as number[];
      const nameMap = new Map<number, string>();
      if (group_by === "coordinator" && ids.length) {
        const { data: emps } = await supabaseAdmin.from("employees").select("id, first_name, last_name").in("id", ids);
        (emps ?? []).forEach((e: any) => nameMap.set(e.id, `${e.first_name} ${e.last_name}`));
      } else if (ids.length) {
        const { data: adjs } = await supabaseAdmin.from("insurance_adjusters").select("id, name, carrier").in("id", ids);
        (adjs ?? []).forEach((a: any) => nameMap.set(a.id, `${a.name} (${a.carrier})`));
      }
      const rows = Array.from(groups.entries()).map(([id, s]) => ({
        id,
        name: nameMap.get(id as number) ?? `#${id}`,
        jobs: s.count,
        total_approved: s.approved,
        total_supplements: s.supp,
        supplement_pct: s.approved > 0 ? +(s.supp / s.approved * 100).toFixed(1) : 0,
      })).sort((a, b) => b.total_supplements - a.total_supplements);
      return { content: [{ type: "text" as const, text: JSON.stringify({ group_by, rows }, null, 2) }] };
    }
  );

  // --- TOOL: get_crew_utilization ---
  server.tool(
    "get_crew_utilization",
    "Crew utilization for the next N days: scheduled jobs vs weekly capacity.",
    {
      org_id: z.string(),
      days_ahead: z.number().optional().describe("Default: 14"),
    },
    async ({ org_id, days_ahead = 14 }) => {
      const today = new Date();
      const end = new Date(today.getTime() + days_ahead * 86_400_000);
      const { data: crews } = await supabaseAdmin.from("crews")
        .select("id, name, capacity_jobs_per_week, location_id")
        .eq("org_id", org_id).eq("is_active", true);
      const { data: jobs } = await supabaseAdmin.from("jobs")
        .select("crew_id, status, scheduled_start_date")
        .eq("org_id", org_id)
        .gte("scheduled_start_date", today.toISOString().slice(0, 10))
        .lte("scheduled_start_date", end.toISOString().slice(0, 10));
      const weeks = days_ahead / 7;
      const out = (crews ?? []).map((c: any) => {
        const assigned = (jobs ?? []).filter((j: any) => j.crew_id === c.id).length;
        const capacity = c.capacity_jobs_per_week * weeks;
        return {
          crew_id: c.id, crew_name: c.name,
          jobs_assigned: assigned, weekly_capacity: c.capacity_jobs_per_week,
          total_capacity: capacity,
          utilization_pct: capacity > 0 ? +(assigned / capacity * 100).toFixed(0) : 0,
        };
      });
      return { content: [{ type: "text" as const, text: JSON.stringify({ window_days: days_ahead, crews: out }, null, 2) }] };
    }
  );

  // --- TOOL: get_referral_network ---
  server.tool(
    "get_referral_network",
    "Referral graph: who referred whom. Optionally filtered to a single referrer to see their downstream contacts.",
    {
      org_id: z.string(),
      referrer_contact_id: z.number().optional(),
      limit: z.number().optional(),
    },
    async ({ org_id, referrer_contact_id, limit = 100 }) => {
      let q = supabaseAdmin.from("contacts")
        .select("id, first_name, last_name, referred_by, created_at")
        .eq("org_id", org_id).not("referred_by", "is", null).limit(limit);
      if (referrer_contact_id) q = q.eq("referred_by", referrer_contact_id);
      const { data, error } = await q;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      // Build referrer name map
      const referrerIds = Array.from(new Set((data ?? []).map((r: any) => r.referred_by))).filter(Boolean) as number[];
      const { data: refs } = referrerIds.length
        ? await supabaseAdmin.from("contacts").select("id, first_name, last_name").in("id", referrerIds)
        : { data: [] as any[] };
      const nameMap = new Map((refs ?? []).map((r: any) => [r.id, `${r.first_name} ${r.last_name}`]));
      const rows = (data ?? []).map((r: any) => ({
        contact_id: r.id,
        contact_name: `${r.first_name} ${r.last_name}`,
        referred_by_id: r.referred_by,
        referred_by_name: nameMap.get(r.referred_by) ?? "Unknown",
        created_at: r.created_at,
      }));
      // Top referrers
      const topMap = new Map<number, number>();
      for (const r of rows) topMap.set(r.referred_by_id, (topMap.get(r.referred_by_id) ?? 0) + 1);
      const topReferrers = Array.from(topMap.entries())
        .map(([id, n]) => ({ id, name: nameMap.get(id) ?? `#${id}`, referrals: n }))
        .sort((a, b) => b.referrals - a.referrals).slice(0, 10);
      return { content: [{ type: "text" as const, text: JSON.stringify({ total_referrals: rows.length, top_referrers: topReferrers, edges: rows }, null, 2) }] };
    }
  );

  // --- TOOL: list_calls_by_disposition ---
  server.tool(
    "list_calls_by_disposition",
    "List calls filtered by disposition, optionally by call_type and a date range.",
    {
      org_id: z.string(),
      disposition: z.enum(["lead_created", "transferred_to_live_agent", "scheduled_callback", "info_provided", "no_answer"]).optional(),
      call_type: z.enum(["sales", "support", "general", "billing"]).optional(),
      days_back: z.number().optional().describe("Default: 30"),
      limit: z.number().optional(),
    },
    async ({ org_id, disposition, call_type, days_back = 30, limit = 50 }) => {
      const cutoff = new Date(Date.now() - days_back * 86_400_000).toISOString();
      let q = supabaseAdmin.from("calls")
        .select("id, caller_name, caller_phone, call_type, disposition, duration_seconds, started_at")
        .eq("org_id", org_id).gte("started_at", cutoff)
        .order("started_at", { ascending: false }).limit(limit);
      if (disposition) q = q.eq("disposition", disposition);
      if (call_type) q = q.eq("call_type", call_type);
      const { data, error } = await q;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ count: data?.length ?? 0, calls: data }, null, 2) }] };
    }
  );

  // --- TOOL: get_top_adjusters_by_approved_value ---
  server.tool(
    "get_top_adjusters_by_approved_value",
    "Top adjusters ranked by total insurance-approved dollars across all jobs. Use for 'top 5 adjusters by total approved $'.",
    { org_id: z.string(), limit: z.number().optional() },
    async ({ org_id, limit = 5 }) => {
      const { data: jobs, error } = await supabaseAdmin.from("jobs")
        .select("adjuster_id, insurance_approved_amount, supplements_amount").eq("org_id", org_id);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      const byAdj = new Map<number, { approved: number; supp: number; count: number }>();
      for (const j of jobs ?? []) {
        if (!j.adjuster_id) continue;
        const cur = byAdj.get(j.adjuster_id) ?? { approved: 0, supp: 0, count: 0 };
        cur.approved += Number(j.insurance_approved_amount || 0);
        cur.supp += Number(j.supplements_amount || 0);
        cur.count += 1;
        byAdj.set(j.adjuster_id, cur);
      }
      const ids = Array.from(byAdj.keys());
      const { data: adjs } = ids.length
        ? await supabaseAdmin.from("insurance_adjusters").select("id, name, carrier").in("id", ids)
        : { data: [] as any[] };
      const nameMap = new Map((adjs ?? []).map((a: any) => [a.id, `${a.name} (${a.carrier})`]));
      const rows = Array.from(byAdj.entries()).map(([id, s]) => ({
        adjuster_id: id,
        adjuster_name: nameMap.get(id) ?? `#${id}`,
        jobs: s.count,
        total_approved: s.approved,
        total_supplements: s.supp,
      })).sort((a, b) => b.total_approved - a.total_approved).slice(0, limit);
      return { content: [{ type: "text" as const, text: JSON.stringify({ top_adjusters: rows }, null, 2) }] };
    }
  );

  // --- TOOL: get_top_rep_closed_this_month ---
  server.tool(
    "get_top_rep_closed_this_month",
    "Top sales reps by closed contract $ this calendar month. Uses jobs.sales_rep_employee_id where status='completed' or actual_end_date this month.",
    { org_id: z.string(), limit: z.number().optional() },
    async ({ org_id, limit = 5 }) => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const { data: jobs, error } = await supabaseAdmin.from("jobs")
        .select("sales_rep_employee_id, final_contract_amount, status, actual_end_date, created_at")
        .eq("org_id", org_id)
        .or(`actual_end_date.gte.${start},and(created_at.gte.${start}T00:00:00Z,status.in.(scheduled,materials_ordered,in_progress,completed))`);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      const byRep = new Map<number, { total: number; count: number }>();
      for (const j of jobs ?? []) {
        if (!j.sales_rep_employee_id) continue;
        const cur = byRep.get(j.sales_rep_employee_id) ?? { total: 0, count: 0 };
        cur.total += Number(j.final_contract_amount || 0);
        cur.count += 1;
        byRep.set(j.sales_rep_employee_id, cur);
      }
      const ids = Array.from(byRep.keys());
      const { data: emps } = ids.length
        ? await supabaseAdmin.from("employees").select("id, first_name, last_name, role, market").in("id", ids)
        : { data: [] as any[] };
      const nameMap = new Map((emps ?? []).map((e: any) => [e.id, `${e.first_name} ${e.last_name} (${e.market})`]));
      const rows = Array.from(byRep.entries()).map(([id, s]) => ({
        employee_id: id,
        name: nameMap.get(id) ?? `#${id}`,
        jobs: s.count,
        total_closed_value: s.total,
      })).sort((a, b) => b.total_closed_value - a.total_closed_value).slice(0, limit);
      return { content: [{ type: "text" as const, text: JSON.stringify({ month_start: start, top_reps: rows }, null, 2) }] };
    }
  );

  // --- TOOL: get_at_risk_customers ---
  server.tool(
    "get_at_risk_customers",
    "Customers with health score < threshold (default 70). Returns name, score, tags, and last interaction type.",
    { org_id: z.string(), max_score: z.number().optional(), limit: z.number().optional() },
    async ({ org_id, max_score = 70, limit = 50 }) => {
      const { data, error } = await supabaseAdmin.from("contacts")
        .select("id, first_name, last_name, email, phone, city, state, tags, storm_tag, customer_health_score, assigned_to")
        .eq("org_id", org_id)
        .not("customer_health_score", "is", null)
        .lte("customer_health_score", max_score)
        .order("customer_health_score", { ascending: true })
        .limit(limit);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ count: data?.length ?? 0, customers: data }, null, 2) }] };
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
