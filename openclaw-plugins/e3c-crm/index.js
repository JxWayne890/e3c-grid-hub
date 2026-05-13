import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { CRM_TOOLS } from "./tools.generated.js";

const DEFAULT_MCP_URL = "https://api-e3c.srv1568356.hstgr.cloud/mcp";
const MCP_PROTOCOL_VERSION = "2025-06-18";

function headers(secret, sessionId) {
  return {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    "x-mcp-secret": secret,
    "mcp-protocol-version": MCP_PROTOCOL_VERSION,
    ...(sessionId ? { "mcp-session-id": sessionId } : {}),
  };
}

async function readMcpResponse(response) {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`MCP HTTP ${response.status}: ${body.slice(0, 500)}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream")) {
    const dataLine = body
      .split(/\r?\n/)
      .find((line) => line.startsWith("data: "));
    if (!dataLine) throw new Error("MCP SSE response did not include data");
    return JSON.parse(dataLine.slice(6));
  }

  return JSON.parse(body);
}

async function openMcpSession(url, secret) {
  const response = await fetch(url, {
    method: "POST",
    headers: headers(secret),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "e3c-openclaw-crm-plugin", version: "1.0.0" },
      },
    }),
  });

  const initialized = await readMcpResponse(response);
  if (initialized.error) {
    throw new Error(initialized.error.message || "MCP initialize failed");
  }
  return response.headers.get("mcp-session-id");
}

async function callMcpTool(url, secret, name, args) {
  const sessionId = await openMcpSession(url, secret);
  const response = await fetch(url, {
    method: "POST",
    headers: headers(secret, sessionId),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name,
        arguments: args || {},
      },
    }),
  });

  const payload = await readMcpResponse(response);
  if (payload.error) {
    throw new Error(payload.error.message || `${name} failed`);
  }
  return payload.result;
}

function errorResult(error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [{ type: "text", text: `CRM tool error: ${message}` }],
  };
}

export default definePluginEntry({
  id: "e3c-crm",
  name: "E3C CRM",
  description: "Direct OpenClaw tool bridge for the E3C CRM MCP server.",
  register(api) {
    const config = api.pluginConfig || {};
    const url = config.url || process.env.E3C_CRM_MCP_URL || DEFAULT_MCP_URL;
    const secret =
      config.secret ||
      process.env.E3C_CRM_MCP_SECRET ||
      process.env.MCP_SHARED_SECRET;

    for (const tool of CRM_TOOLS) {
      api.registerTool({
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema || {
          type: "object",
          additionalProperties: true,
        },
        async execute(_id, params) {
          if (!secret) {
            return errorResult("Missing E3C CRM MCP secret in plugin config");
          }
          try {
            return await callMcpTool(url, secret, tool.name, params);
          } catch (error) {
            return errorResult(error);
          }
        },
      });
    }
  },
});
