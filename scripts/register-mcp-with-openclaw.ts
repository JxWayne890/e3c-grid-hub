/**
 * Register the CRM MCP server with OpenClaw.
 * Run this once after deploying the API server.
 *
 * Usage: npx tsx scripts/register-mcp-with-openclaw.ts
 */

import "dotenv/config";
import crypto from "crypto";
import WebSocket from "ws";

const TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN!;
const OPENCLAW_URL = process.env.OPENCLAW_URL!;
const PRIV_PEM = (process.env.OPENCLAW_DEVICE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const DEVICE_ID = process.env.OPENCLAW_DEVICE_ID!;
const API_URL = process.env.APP_URL || "http://localhost:3000";

// The MCP server URL that OpenClaw will connect to
// Must be reachable from the OpenClaw Docker container — use the public API URL
const MCP_URL = "https://api-e3c.srv1568356.hstgr.cloud/mcp";

console.log("Registering CRM MCP server with OpenClaw...");
console.log(`  OpenClaw: ${OPENCLAW_URL}`);
console.log(`  MCP URL: ${MCP_URL}`);

const privateKey = crypto.createPrivateKey(PRIV_PEM);
const publicKey = crypto.createPublicKey(privateKey);
const pubKeyRaw = publicKey.export({ type: "spki", format: "der" }).subarray(-32);
const pubKeyB64 = pubKeyRaw.toString("base64");

const wsUrl = OPENCLAW_URL.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://") + "/rpc";
const ws = new WebSocket(wsUrl, ["rpc"]);

ws.on("message", (data: WebSocket.Data) => {
  const msg = JSON.parse(data.toString());

  // Step 1: Authenticate
  if (msg.type === "event" && msg.event === "connect.challenge") {
    const nonce = msg.payload.nonce;
    const signedAt = Date.now();
    const scopes = "operator.admin,operator.read,operator.write,operator.approvals,operator.pairing";
    const sigPayload = ["v2", DEVICE_ID, "cli", "cli", "operator", scopes, signedAt, TOKEN, nonce].join("|");
    const signature = crypto.sign(null, Buffer.from(sigPayload), privateKey).toString("base64");

    ws.send(JSON.stringify({
      type: "req", id: "auth-1", method: "connect",
      params: {
        minProtocol: 3, maxProtocol: 3,
        client: { id: "cli", version: "1.0.0", platform: "linux", mode: "cli" },
        role: "operator", scopes: scopes.split(","),
        auth: { token: TOKEN },
        device: { id: DEVICE_ID, publicKey: pubKeyB64, signature, signedAt, nonce },
      },
    }));
  }

  // Step 2: After auth, get current config to obtain base hash
  if (msg.type === "res" && msg.id === "auth-1") {
    if (!msg.ok) {
      console.error("Authentication failed:", msg.error);
      process.exit(1);
    }

    console.log("Authenticated! Fetching current config...");
    ws.send(JSON.stringify({
      type: "req",
      id: "config-get-1",
      method: "config.get",
      params: {},
    }));
  }

  // Step 3: Got config — now patch with the base hash
  if (msg.type === "res" && msg.id === "config-get-1") {
    if (!msg.ok) {
      console.error("Failed to get config:", msg.error);
      process.exit(1);
    }

    const baseHash = msg.payload?.hash || msg.payload?.baseHash;
    console.log(`Got config hash: ${baseHash}`);
    console.log("Registering MCP server...");

    const configPatch = {
      mcpServers: {
        crm: {
          url: MCP_URL,
          transport: "streamable-http",
        },
      },
    };

    ws.send(JSON.stringify({
      type: "req",
      id: "config-1",
      method: "config.patch",
      params: {
        raw: JSON.stringify(configPatch),
        baseHash,
      },
    }));
  }

  // Step 4: Confirm config was applied
  if (msg.type === "res" && msg.id === "config-1") {
    if (msg.ok) {
      console.log("MCP server registered successfully!");
      console.log("OpenClaw can now use CRM tools:");
      console.log("  - search_contacts");
      console.log("  - get_contact");
      console.log("  - create_contact");
      console.log("  - update_contact_stage");
      console.log("  - add_note");
      console.log("  - create_task");
      console.log("  - create_deal");
      console.log("  - list_tasks");
      console.log("  - get_pipeline_summary");
    } else {
      console.error("Failed to register:", msg.error);
    }

    // Verify by checking effective tools
    ws.send(JSON.stringify({
      type: "req", id: "tools-1", method: "tools.effective",
      params: { sessionKey: "default" },
    }));
  }

  if (msg.type === "res" && msg.id === "tools-1") {
    if (msg.ok) {
      const tools = msg.payload?.tools || [];
      const crmTools = tools.filter((t: any) => t.name?.startsWith("crm_") || t.source === "crm");
      console.log(`\nTotal tools available: ${tools.length}`);
      if (crmTools.length > 0) {
        console.log(`CRM tools found: ${crmTools.length}`);
        crmTools.forEach((t: any) => console.log(`  - ${t.name}: ${t.description || ""}`));
      } else {
        console.log("CRM tools not yet visible — they may appear after OpenClaw restarts or refreshes its tool catalog.");
      }
    }
    ws.close();
    process.exit(0);
  }
});

ws.on("error", (err) => { console.error("WebSocket error:", err.message); process.exit(1); });
ws.on("close", () => process.exit(0));
setTimeout(() => { console.log("Timeout"); process.exit(1); }, 15000);
