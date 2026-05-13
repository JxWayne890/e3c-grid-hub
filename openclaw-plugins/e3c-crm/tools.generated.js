// Generated from https://api-e3c.srv1568356.hstgr.cloud/mcp. Do not edit by hand.
export const CRM_TOOLS = [
  {
    "name": "search_contacts",
    "description": "Search contacts in the CRM by name, email, or company. Returns up to 10 matches.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "description": "The organization ID to search within",
          "type": "string"
        },
        "query": {
          "description": "Search term to match against name, email, or company",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "query",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_contact",
    "description": "Get full details of a specific contact by their ID, including all fields.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "contact_id": {
          "description": "The contact ID",
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "contact_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "create_contact",
    "description": "Create a new contact in the CRM. Returns the created contact.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "description": "The organization ID",
          "type": "string"
        },
        "first_name": {
          "description": "Contact's first name",
          "type": "string"
        },
        "last_name": {
          "description": "Contact's last name",
          "type": "string"
        },
        "email": {
          "description": "Contact's email address",
          "type": "string"
        },
        "phone": {
          "description": "Contact's phone number",
          "type": "string"
        },
        "company": {
          "description": "Contact's company name",
          "type": "string"
        },
        "stage": {
          "description": "Pipeline stage (default: lead)",
          "type": "string",
          "enum": [
            "lead",
            "contacted",
            "qualified",
            "proposal",
            "won",
            "lost"
          ]
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "first_name",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "update_contact_stage",
    "description": "Move a contact to a different pipeline stage (lead, contacted, qualified, proposal, won, lost).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "contact_id": {
          "description": "The contact ID",
          "type": "number"
        },
        "stage": {
          "description": "The new stage",
          "type": "string",
          "enum": [
            "lead",
            "contacted",
            "qualified",
            "proposal",
            "won",
            "lost"
          ]
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "contact_id",
        "stage",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "add_note",
    "description": "Add an interaction note to a contact's record.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "description": "The organization ID",
          "type": "string"
        },
        "contact_id": {
          "description": "The contact ID",
          "type": "number"
        },
        "user_id": {
          "description": "The user ID adding the note",
          "type": "string"
        },
        "note": {
          "description": "The note content",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "contact_id",
        "user_id",
        "note",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "create_task",
    "description": "Create a new task. Can optionally be linked to a contact.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "description": "The organization ID",
          "type": "string"
        },
        "assigned_to": {
          "description": "User ID to assign the task to",
          "type": "string"
        },
        "title": {
          "description": "Task title",
          "type": "string"
        },
        "description": {
          "description": "Task description",
          "type": "string"
        },
        "contact_id": {
          "description": "Contact ID to link this task to",
          "type": "number"
        },
        "due_date": {
          "description": "Due date in YYYY-MM-DD format",
          "type": "string"
        },
        "priority": {
          "description": "Task priority (default: medium)",
          "type": "string",
          "enum": [
            "low",
            "medium",
            "high"
          ]
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "assigned_to",
        "title",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "create_deal",
    "description": "Create a deal/opportunity linked to a contact with a monetary value.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "description": "The organization ID",
          "type": "string"
        },
        "contact_id": {
          "description": "The contact ID to link the deal to",
          "type": "number"
        },
        "title": {
          "description": "Deal title (e.g., 'Solar Panel Installation')",
          "type": "string"
        },
        "value": {
          "description": "Deal value in dollars",
          "type": "number"
        },
        "probability": {
          "description": "Win probability 0-100 (default: 0)",
          "type": "number"
        },
        "expected_close_date": {
          "description": "Expected close date YYYY-MM-DD",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "contact_id",
        "title",
        "value",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "list_tasks",
    "description": "List pending tasks for the organization. Shows title, due date, priority, and linked contact.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "description": "The organization ID",
          "type": "string"
        },
        "status": {
          "description": "Filter by status (default: pending)",
          "type": "string",
          "enum": [
            "pending",
            "completed",
            "cancelled"
          ]
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_pipeline_summary",
    "description": "Get a summary of the sales pipeline showing how many contacts are in each stage.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "description": "The organization ID",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "send_email",
    "description": "Send an email to a contact using the organization's email settings. Logs the email to the contact's timeline.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "description": "The organization ID",
          "type": "string"
        },
        "contact_id": {
          "description": "Contact ID to link the email to",
          "type": "number"
        },
        "user_id": {
          "description": "The user ID sending the email",
          "type": "string"
        },
        "to_email": {
          "description": "Recipient email address",
          "type": "string"
        },
        "subject": {
          "description": "Email subject line",
          "type": "string"
        },
        "body": {
          "description": "Email body (plain text)",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "user_id",
        "to_email",
        "subject",
        "body",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "create_event",
    "description": "Create a calendar event/meeting. Can optionally be linked to a contact.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "description": "The organization ID",
          "type": "string"
        },
        "created_by": {
          "description": "User ID creating the event",
          "type": "string"
        },
        "title": {
          "description": "Event title",
          "type": "string"
        },
        "description": {
          "description": "Event description",
          "type": "string"
        },
        "start_at": {
          "description": "Start date/time in ISO format (e.g., 2026-04-10T14:00:00Z)",
          "type": "string"
        },
        "end_at": {
          "description": "End date/time in ISO format",
          "type": "string"
        },
        "contact_id": {
          "description": "Contact ID to link this event to",
          "type": "number"
        },
        "location": {
          "description": "Event location",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "created_by",
        "title",
        "start_at",
        "end_at",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "list_events",
    "description": "List upcoming calendar events for the organization.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "description": "The organization ID",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "update_contact",
    "description": "Update any field on an existing contact (name, phone, company, address, tags, etc).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "contact_id": {
          "description": "The contact ID",
          "type": "number"
        },
        "first_name": {
          "description": "Updated first name",
          "type": "string"
        },
        "last_name": {
          "description": "Updated last name",
          "type": "string"
        },
        "phone": {
          "description": "Updated phone",
          "type": "string"
        },
        "company": {
          "description": "Updated company",
          "type": "string"
        },
        "email": {
          "description": "Updated email",
          "type": "string"
        },
        "address": {
          "description": "Updated address",
          "type": "string"
        },
        "city": {
          "description": "Updated city",
          "type": "string"
        },
        "state": {
          "description": "Updated state",
          "type": "string"
        },
        "zip": {
          "description": "Updated zip",
          "type": "string"
        },
        "tags": {
          "description": "Replace tags array",
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "contact_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_contact_timeline",
    "description": "Get the full activity timeline for a contact (notes, emails, stage changes, deals, tasks).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "contact_id": {
          "description": "The contact ID",
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "contact_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_org_profile",
    "description": "Get the organization's business profile, team members, and settings.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "description": "The organization ID",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "list_deals",
    "description": "List all deals/opportunities for the organization with their values and stages.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "description": "The organization ID",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "update_task",
    "description": "Update one or more fields on an existing task (title, description, due date, priority, or status).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "task_id": {
          "description": "The ID of the task to update",
          "type": "number"
        },
        "title": {
          "description": "Updated task title",
          "type": "string"
        },
        "description": {
          "description": "Updated task description",
          "type": "string"
        },
        "due_date": {
          "description": "Updated due date in YYYY-MM-DD format",
          "type": "string"
        },
        "priority": {
          "description": "Updated priority level",
          "type": "string",
          "enum": [
            "low",
            "medium",
            "high"
          ]
        },
        "status": {
          "description": "Updated task status",
          "type": "string",
          "enum": [
            "pending",
            "completed",
            "cancelled"
          ]
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "task_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "assign_task",
    "description": "Reassign a task to a different user.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "task_id": {
          "description": "The ID of the task to reassign",
          "type": "number"
        },
        "assigned_to": {
          "description": "The user ID to assign the task to",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "task_id",
        "assigned_to",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "update_deal",
    "description": "Update one or more fields on an existing deal (title, value, stage, probability, or expected close date).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "deal_id": {
          "description": "The ID of the deal to update",
          "type": "number"
        },
        "title": {
          "description": "Updated deal title",
          "type": "string"
        },
        "value": {
          "description": "Updated deal value in dollars",
          "type": "number"
        },
        "stage": {
          "description": "Updated deal stage",
          "type": "string",
          "enum": [
            "lead",
            "contacted",
            "qualified",
            "proposal",
            "won",
            "lost"
          ]
        },
        "probability": {
          "description": "Updated win probability 0-100",
          "type": "number"
        },
        "expected_close_date": {
          "description": "Updated expected close date in YYYY-MM-DD format",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "deal_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "delete_deal",
    "description": "Permanently delete a deal/opportunity by its ID.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "deal_id": {
          "description": "The ID of the deal to delete",
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "deal_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "update_event",
    "description": "Update one or more fields on an existing calendar event (title, description, times, or location).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "event_id": {
          "description": "The ID of the event to update",
          "type": "number"
        },
        "title": {
          "description": "Updated event title",
          "type": "string"
        },
        "description": {
          "description": "Updated event description",
          "type": "string"
        },
        "start_at": {
          "description": "Updated start date/time in ISO format",
          "type": "string"
        },
        "end_at": {
          "description": "Updated end date/time in ISO format",
          "type": "string"
        },
        "location": {
          "description": "Updated event location",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "event_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "delete_event",
    "description": "Permanently delete a calendar event by its ID.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "event_id": {
          "description": "The ID of the event to delete",
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "event_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "list_email_templates",
    "description": "List available email templates for the organization.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "description": "The organization ID",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "create_email_template",
    "description": "Create a reusable email template for the organization.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "description": "The organization ID",
          "type": "string"
        },
        "user_id": {
          "description": "The user ID creating the template",
          "type": "string"
        },
        "name": {
          "description": "Template name for identification",
          "type": "string"
        },
        "subject": {
          "description": "Email subject line template",
          "type": "string"
        },
        "body": {
          "description": "Email body template content",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "user_id",
        "name",
        "subject",
        "body",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_dashboard_stats",
    "description": "Get comprehensive CRM analytics including contact counts by stage, deal values, pending/overdue tasks, and upcoming events.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "description": "The organization ID",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "add_tag",
    "description": "Add a tag to a contact. Skips if the tag already exists on the contact.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "contact_id": {
          "description": "The contact ID to add the tag to",
          "type": "number"
        },
        "tag": {
          "description": "The tag to add",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "contact_id",
        "tag",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "remove_tag",
    "description": "Remove a tag from a contact.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "contact_id": {
          "description": "The contact ID to remove the tag from",
          "type": "number"
        },
        "tag": {
          "description": "The tag to remove",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "contact_id",
        "tag",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "create_lead",
    "description": "Create a new lead (inquiry) in the CRM. Leads are inquiries that haven't become customers yet. Convert them with convert_lead_to_contact when they're ready.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "description": "The organization ID",
          "type": "string"
        },
        "first_name": {
          "description": "Lead's first name",
          "type": "string"
        },
        "last_name": {
          "description": "Lead's last name",
          "type": "string"
        },
        "phone": {
          "description": "Lead's phone number",
          "type": "string"
        },
        "email": {
          "description": "Lead's email",
          "type": "string"
        },
        "address": {
          "description": "Lead's address or location text",
          "type": "string"
        },
        "source": {
          "description": "How the lead came in (default: website)",
          "type": "string",
          "enum": [
            "phone",
            "walk_in",
            "website",
            "referral",
            "third_party"
          ]
        },
        "frequency": {
          "description": "Expected usage frequency (default: monthly)",
          "type": "string",
          "enum": [
            "hourly",
            "daily",
            "monthly"
          ]
        },
        "temperature": {
          "description": "Lead temperature (default: warm)",
          "type": "string",
          "enum": [
            "hot",
            "warm",
            "cold"
          ]
        },
        "stage": {
          "description": "Pipeline stage (default: new)",
          "type": "string",
          "enum": [
            "new",
            "contacted",
            "qualified",
            "negotiating",
            "won",
            "lost"
          ]
        },
        "notes": {
          "description": "Free-form notes",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "first_name",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "list_leads",
    "description": "List leads with optional filters. Useful for questions like 'how many hot leads do we have?' or 'show me all new leads from referrals'.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "description": "The organization ID",
          "type": "string"
        },
        "stage": {
          "description": "Filter by pipeline stage",
          "type": "string",
          "enum": [
            "new",
            "contacted",
            "qualified",
            "negotiating",
            "won",
            "lost"
          ]
        },
        "temperature": {
          "description": "Filter by temperature",
          "type": "string",
          "enum": [
            "hot",
            "warm",
            "cold"
          ]
        },
        "source": {
          "description": "Filter by source",
          "type": "string",
          "enum": [
            "phone",
            "walk_in",
            "website",
            "referral",
            "third_party"
          ]
        },
        "assigned_to": {
          "description": "Filter by assigned user ID",
          "type": "string"
        },
        "limit": {
          "description": "Max rows to return (default: 25)",
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_lead",
    "description": "Get full details of a specific lead by its ID.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "lead_id": {
          "description": "The lead ID",
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "lead_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "update_lead",
    "description": "Update one or more fields on an existing lead.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "lead_id": {
          "description": "The lead ID",
          "type": "number"
        },
        "first_name": {
          "type": "string"
        },
        "last_name": {
          "type": "string"
        },
        "phone": {
          "type": "string"
        },
        "email": {
          "type": "string"
        },
        "address": {
          "type": "string"
        },
        "source": {
          "type": "string",
          "enum": [
            "phone",
            "walk_in",
            "website",
            "referral",
            "third_party"
          ]
        },
        "frequency": {
          "type": "string",
          "enum": [
            "hourly",
            "daily",
            "monthly"
          ]
        },
        "temperature": {
          "type": "string",
          "enum": [
            "hot",
            "warm",
            "cold"
          ]
        },
        "stage": {
          "type": "string",
          "enum": [
            "new",
            "contacted",
            "qualified",
            "negotiating",
            "won",
            "lost"
          ]
        },
        "notes": {
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "lead_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "update_lead_stage",
    "description": "Move a lead to a different pipeline stage (new, contacted, qualified, negotiating, won, lost).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "lead_id": {
          "description": "The lead ID",
          "type": "number"
        },
        "stage": {
          "description": "The new stage",
          "type": "string",
          "enum": [
            "new",
            "contacted",
            "qualified",
            "negotiating",
            "won",
            "lost"
          ]
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "lead_id",
        "stage",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "update_lead_temperature",
    "description": "Set a lead's temperature (hot, warm, cold).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "lead_id": {
          "description": "The lead ID",
          "type": "number"
        },
        "temperature": {
          "description": "The new temperature",
          "type": "string",
          "enum": [
            "hot",
            "warm",
            "cold"
          ]
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "lead_id",
        "temperature",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_leads_by_stage",
    "description": "Get a summary of the leads pipeline showing how many leads are in each stage.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "description": "The organization ID",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "convert_lead_to_contact",
    "description": "Convert a qualified lead into a contact. Creates a new contact record, links the lead via converted_contact_id, and sets lead stage to 'won'. Returns the new contact.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "description": "The organization ID",
          "type": "string"
        },
        "lead_id": {
          "description": "The lead ID to convert",
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "lead_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "delete_lead",
    "description": "Permanently delete a lead by its ID.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "lead_id": {
          "description": "The lead ID to delete",
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "lead_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "list_notifications",
    "description": "List notifications for an organization (optionally unread only).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "unread_only": {
          "type": "boolean"
        },
        "limit": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "mark_notification_read",
    "description": "Mark a notification as read.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "notification_id": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "notification_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "create_notification",
    "description": "Create an in-app notification.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "type": {
          "type": "string"
        },
        "title": {
          "type": "string"
        },
        "body": {
          "type": "string"
        },
        "entity_type": {
          "type": "string"
        },
        "entity_id": {
          "type": "number"
        },
        "user_id": {
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "type",
        "title",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_contact_activity_timeline",
    "description": "Get the unified chronological activity timeline for a contact: emails, notes, tasks, events, calls, SMS, deals.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "contact_id": {
          "type": "number"
        },
        "limit": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "contact_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "send_sms",
    "description": "Send a single SMS to a contact. Simulated — no real carrier call. 30% of outbound messages auto-generate a reply.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "contact_id": {
          "type": "number"
        },
        "body": {
          "description": "Message body",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "contact_id",
        "body",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "list_sms_messages",
    "description": "List recent SMS messages across the organization.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "limit": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_sms_thread",
    "description": "Get the full SMS thread with a specific contact.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "contact_id": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "contact_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "list_locations",
    "description": "List all locations for an organization with rates, capacity, and amenities.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_location",
    "description": "Get full details of a specific location.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "location_id": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "location_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "update_location",
    "description": "Update a location's rates, capacity, or active state.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "location_id": {
          "type": "number"
        },
        "name": {
          "type": "string"
        },
        "capacity": {
          "type": "number"
        },
        "monthly_rate": {
          "type": "number"
        },
        "hourly_rate": {
          "type": "number"
        },
        "daily_rate": {
          "type": "number"
        },
        "is_active": {
          "type": "boolean"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "location_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_location_occupancy",
    "description": "Get rough occupancy stats for a location (capacity vs assigned employees).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "location_id": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "location_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_revenue_report",
    "description": "Aggregated revenue report: won deal value, pipeline value, monthly trend.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_lead_conversion_report",
    "description": "Lead conversion analytics: total leads, conversion rate, breakdown by source and temperature.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_campaign_performance",
    "description": "Aggregate campaign performance across all sent campaigns.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_call_analytics",
    "description": "Aggregated call analytics over the last 60 days.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_employee_performance",
    "description": "Per-employee metrics: write-up count and incident count.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "list_employees",
    "description": "List employees with optional location/role/status filters.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "location_id": {
          "type": "number"
        },
        "role": {
          "type": "string",
          "enum": [
            "manager",
            "supervisor",
            "attendant",
            "valet",
            "admin"
          ]
        },
        "status": {
          "type": "string",
          "enum": [
            "active",
            "on_leave",
            "terminated"
          ]
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_employee",
    "description": "Get full employee details including incidents and write-ups count.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "employee_id": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "employee_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "create_employee",
    "description": "Hire a new employee.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "first_name": {
          "type": "string"
        },
        "last_name": {
          "type": "string"
        },
        "role": {
          "type": "string",
          "enum": [
            "manager",
            "supervisor",
            "attendant",
            "valet",
            "admin"
          ]
        },
        "location_id": {
          "type": "number"
        },
        "phone": {
          "type": "string"
        },
        "email": {
          "type": "string"
        },
        "hire_date": {
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "first_name",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "update_employee",
    "description": "Update an employee's role, location, status, contact info.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "employee_id": {
          "type": "number"
        },
        "first_name": {
          "type": "string"
        },
        "last_name": {
          "type": "string"
        },
        "role": {
          "type": "string",
          "enum": [
            "manager",
            "supervisor",
            "attendant",
            "valet",
            "admin"
          ]
        },
        "location_id": {
          "type": "number"
        },
        "status": {
          "type": "string",
          "enum": [
            "active",
            "on_leave",
            "terminated"
          ]
        },
        "phone": {
          "type": "string"
        },
        "email": {
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "employee_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "list_incidents",
    "description": "List incident reports with filters.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "status": {
          "type": "string",
          "enum": [
            "open",
            "investigating",
            "resolved"
          ]
        },
        "severity": {
          "type": "string",
          "enum": [
            "low",
            "medium",
            "high",
            "critical"
          ]
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "create_incident",
    "description": "File a new incident report.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "employee_id": {
          "type": "number"
        },
        "location_id": {
          "type": "number"
        },
        "type": {
          "type": "string",
          "enum": [
            "damage",
            "theft",
            "injury",
            "customer_complaint",
            "safety",
            "other"
          ]
        },
        "severity": {
          "type": "string",
          "enum": [
            "low",
            "medium",
            "high",
            "critical"
          ]
        },
        "description": {
          "type": "string"
        },
        "incident_date": {
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "type",
        "severity",
        "description",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "list_write_ups",
    "description": "List employee write-ups. Filter by employee_id if given.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "employee_id": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "create_write_up",
    "description": "Issue a write-up to an employee.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "employee_id": {
          "type": "number"
        },
        "reason": {
          "type": "string"
        },
        "description": {
          "type": "string"
        },
        "severity": {
          "type": "string",
          "enum": [
            "verbal",
            "written",
            "final"
          ]
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "employee_id",
        "reason",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "list_intakes",
    "description": "List employee intake applications.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "status": {
          "type": "string",
          "enum": [
            "applied",
            "screening",
            "interview",
            "offer",
            "hired",
            "rejected"
          ]
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "update_intake_status",
    "description": "Move an applicant to a new stage (applied → screening → interview → offer → hired / rejected).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "intake_id": {
          "type": "number"
        },
        "status": {
          "type": "string",
          "enum": [
            "applied",
            "screening",
            "interview",
            "offer",
            "hired",
            "rejected"
          ]
        },
        "notes": {
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "intake_id",
        "status",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "create_campaign",
    "description": "Create a new campaign (email or SMS) as a draft. Audience is rebuilt from audience_filter at send time.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "name": {
          "description": "Campaign name",
          "type": "string"
        },
        "type": {
          "type": "string",
          "enum": [
            "email",
            "sms"
          ]
        },
        "subject": {
          "description": "Email subject (ignored for SMS)",
          "type": "string"
        },
        "body": {
          "description": "Message body (supports {{first_name}} {{company}} merge tags)",
          "type": "string"
        },
        "audience_filter": {
          "type": "object",
          "properties": {
            "stage": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "tags": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "cities": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "sources": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          }
        },
        "template_id": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "name",
        "type",
        "body",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "list_campaigns",
    "description": "List campaigns for an organization. Supports status filtering.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "status": {
          "type": "string",
          "enum": [
            "draft",
            "scheduled",
            "sending",
            "sent",
            "failed",
            "cancelled"
          ]
        },
        "limit": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_campaign",
    "description": "Get full details of a specific campaign.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "campaign_id": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "campaign_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_campaign_stats",
    "description": "Get aggregated stats for a campaign: total, sent, delivered, opened, clicked, bounced, open/click/bounce rate.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "campaign_id": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "campaign_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "send_campaign",
    "description": "Send a draft or scheduled campaign immediately. Builds recipient list from audience filter and simulates delivery.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "campaign_id": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "campaign_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "schedule_campaign",
    "description": "Schedule a draft campaign to send at a future time. Note: demo mode does not auto-run scheduled sends; use send_campaign to kick off delivery.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "campaign_id": {
          "type": "number"
        },
        "scheduled_at": {
          "description": "ISO timestamp",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "campaign_id",
        "scheduled_at",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_campaign_recipients",
    "description": "List recipients for a campaign with per-recipient status.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "campaign_id": {
          "type": "number"
        },
        "status": {
          "type": "string",
          "enum": [
            "pending",
            "sent",
            "delivered",
            "opened",
            "clicked",
            "bounced",
            "failed"
          ]
        },
        "limit": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "campaign_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "cancel_campaign",
    "description": "Cancel a scheduled or draft campaign.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "campaign_id": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "campaign_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "create_voice_agent",
    "description": "Create a new AI voice agent (the persona that answers the phone).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "name": {
          "description": "Human-readable agent name, e.g., 'Frontdesk'",
          "type": "string"
        },
        "voice": {
          "description": "Voice persona",
          "type": "string",
          "enum": [
            "nina",
            "marcus",
            "ava",
            "leo"
          ]
        },
        "greeting": {
          "type": "string"
        },
        "system_prompt": {
          "type": "string"
        },
        "tools_enabled": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "is_active": {
          "type": "boolean"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "name",
        "voice",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "list_voice_agents",
    "description": "List all voice agents for an organization.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "update_voice_agent",
    "description": "Update fields on an existing voice agent (name, voice, greeting, system prompt, tool list, active state).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "agent_id": {
          "type": "number"
        },
        "name": {
          "type": "string"
        },
        "voice": {
          "type": "string",
          "enum": [
            "nina",
            "marcus",
            "ava",
            "leo"
          ]
        },
        "greeting": {
          "type": "string"
        },
        "system_prompt": {
          "type": "string"
        },
        "tools_enabled": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "is_active": {
          "type": "boolean"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "agent_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "list_calls",
    "description": "List phone calls with optional filters. Answers questions like 'how many support calls happened this week?' or 'show me calls that created leads'.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "call_type": {
          "type": "string",
          "enum": [
            "sales",
            "support",
            "general",
            "billing"
          ]
        },
        "disposition": {
          "type": "string",
          "enum": [
            "lead_created",
            "transferred_to_live_agent",
            "scheduled_callback",
            "info_provided",
            "no_answer"
          ]
        },
        "direction": {
          "type": "string",
          "enum": [
            "inbound",
            "outbound"
          ]
        },
        "contact_id": {
          "type": "number"
        },
        "limit": {
          "description": "Max rows (default: 20)",
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_call",
    "description": "Get full details of a specific call by its ID.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "call_id": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "call_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_call_transcript",
    "description": "Get the full transcript, AI summary, and next-step checklist for a call.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "call_id": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "call_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "summarize_call",
    "description": "Set or overwrite the AI summary + next-steps for a call's transcript. Use after reviewing raw turns.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "call_id": {
          "type": "number"
        },
        "summary": {
          "description": "Plain-text summary",
          "type": "string"
        },
        "next_steps": {
          "description": "Next-step checklist",
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "call_id",
        "summary",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_call_stats",
    "description": "Get aggregated call metrics: today/week/month volume, AI handle rate, avg duration, calls by type, and leads created.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "list_chat_sessions",
    "description": "List AI chat sessions (website / widget).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "status": {
          "type": "string",
          "enum": [
            "active",
            "ended",
            "abandoned"
          ]
        },
        "limit": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_activity_feed",
    "description": "Get the recent activity feed across all contacts in the organization.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "description": "The organization ID",
          "type": "string"
        },
        "limit": {
          "description": "Maximum number of activities to return (default: 20)",
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "list_storm_events",
    "description": "List storm events (hail, wind, tropical, ice) that this org tracks, with counts of linked leads and jobs.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_leads_by_storm_event",
    "description": "List all leads tagged to a specific storm event. Use this to answer 'which leads came in from the Feb Atlanta hailstorm?'",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "storm_event_id": {
          "description": "Storm event id (preferred)",
          "type": "number"
        },
        "storm_name": {
          "description": "Fuzzy storm name match (e.g., 'Feb Atlanta')",
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "list_adjusters",
    "description": "List insurance adjusters the org has worked with, with carrier, territory, and performance stats.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "carrier": {
          "type": "string"
        },
        "territory": {
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_adjuster_stats",
    "description": "Ranked adjuster performance: fastest approvers, highest supplement rates, and total approved $ across jobs. Use for 'which adjusters approve supplements fastest'.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "rank_by": {
          "description": "Default: avg_supplement_pct desc",
          "type": "string",
          "enum": [
            "avg_approval_days",
            "avg_supplement_pct",
            "approved_value",
            "supplement_value"
          ]
        },
        "limit": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "list_jobs",
    "description": "List roofing jobs, optionally filtered by status, market/state, crew, date range, or storm event.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "status": {
          "type": "string",
          "enum": [
            "scheduled",
            "materials_ordered",
            "in_progress",
            "punch_list",
            "completed",
            "warranty_claim",
            "cancelled"
          ]
        },
        "state": {
          "description": "2-letter state like GA, FL, MO",
          "type": "string"
        },
        "crew_id": {
          "type": "number"
        },
        "storm_event_id": {
          "type": "number"
        },
        "limit": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_job_details",
    "description": "Full job record including adjuster, crew, sales rep, PM, photos, and linked contact/lead names. Use for 'status update on Mark Henderson's job'.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "job_id": {
          "type": "number"
        },
        "customer_name": {
          "description": "Fuzzy customer name match (looks up via contacts or leads)",
          "type": "string"
        },
        "org_id": {
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_contact_full_context",
    "description": "Return a contact plus all related jobs, recent calls, SMS, tasks, and notes in a single payload.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "contact_id": {
          "type": "number"
        },
        "org_id": {
          "type": "string"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "contact_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_pipeline_stuck_leads",
    "description": "Leads that have been in a stage longer than N days. Default: insurance_pending > 14 days. Use for 'show me insurance claims stuck > 14 days'.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "stage": {
          "description": "Default: insurance_pending",
          "type": "string"
        },
        "min_days": {
          "description": "Default: 14",
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_supplement_performance",
    "description": "Supplement recovery performance grouped by coordinator (supplements_coord_employee_id) or adjuster.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "group_by": {
          "description": "Default: coordinator",
          "type": "string",
          "enum": [
            "coordinator",
            "adjuster"
          ]
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_crew_utilization",
    "description": "Crew utilization for the next N days: scheduled jobs vs weekly capacity.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "days_ahead": {
          "description": "Default: 14",
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_referral_network",
    "description": "Referral graph: who referred whom. Optionally filtered to a single referrer to see their downstream contacts.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "referrer_contact_id": {
          "type": "number"
        },
        "limit": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "list_calls_by_disposition",
    "description": "List calls filtered by disposition, optionally by call_type and a date range.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "disposition": {
          "type": "string",
          "enum": [
            "lead_created",
            "transferred_to_live_agent",
            "scheduled_callback",
            "info_provided",
            "no_answer"
          ]
        },
        "call_type": {
          "type": "string",
          "enum": [
            "sales",
            "support",
            "general",
            "billing"
          ]
        },
        "days_back": {
          "description": "Default: 30",
          "type": "number"
        },
        "limit": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_top_adjusters_by_approved_value",
    "description": "Top adjusters ranked by total insurance-approved dollars across all jobs. Use for 'top 5 adjusters by total approved $'.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "limit": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_top_rep_closed_this_month",
    "description": "Top sales reps by closed contract $ this calendar month. Uses jobs.sales_rep_employee_id where status='completed' or actual_end_date this month.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "limit": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_at_risk_customers",
    "description": "Customers with health score < threshold (default 70). Returns name, score, tags, and last interaction type.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "org_id": {
          "type": "string"
        },
        "max_score": {
          "type": "number"
        },
        "limit": {
          "type": "number"
        },
        "mcp_context_token": {
          "description": "REQUIRED. Session context token provided in the system prompt. Pass it unchanged on every call. Never invent or modify.",
          "type": "string"
        }
      },
      "required": [
        "org_id",
        "mcp_context_token"
      ],
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  }
];
