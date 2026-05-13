#!/usr/bin/env bash
set -euo pipefail

OPENCLAW_CONTAINER="${OPENCLAW_CONTAINER:-openclaw-c1cf-openclaw-1}"
OPENCLAW_HOST_DATA="${OPENCLAW_HOST_DATA:-/docker/openclaw-c1cf/data}"
API_ENV_FILE="${API_ENV_FILE:-/docker/e3c-api/.env}"
PLUGIN_SRC="${PLUGIN_SRC:-$(pwd)/openclaw-plugins/e3c-crm}"
PLUGIN_HOST_DST="$OPENCLAW_HOST_DATA/.openclaw/extensions/e3c-crm"
PLUGIN_CONTAINER_DST="/data/.openclaw/extensions/e3c-crm"
MCP_URL="${MCP_URL:-https://api-e3c.srv1568356.hstgr.cloud/mcp}"

if [[ ! -d "$PLUGIN_SRC" ]]; then
  echo "Plugin source not found: $PLUGIN_SRC" >&2
  exit 1
fi

if [[ ! -f "$API_ENV_FILE" ]]; then
  echo "API env file not found: $API_ENV_FILE" >&2
  exit 1
fi

MCP_SHARED_SECRET="$(grep -E '^MCP_SHARED_SECRET=' "$API_ENV_FILE" | tail -1 | cut -d= -f2-)"
if [[ -z "$MCP_SHARED_SECRET" ]]; then
  echo "MCP_SHARED_SECRET not found in $API_ENV_FILE" >&2
  exit 1
fi

echo "Installing E3C CRM OpenClaw plugin..."
rm -rf "$PLUGIN_HOST_DST"
mkdir -p "$PLUGIN_HOST_DST"
cp -R "$PLUGIN_SRC"/. "$PLUGIN_HOST_DST"/
chown -R root:root "$PLUGIN_HOST_DST" || true

docker exec "$OPENCLAW_CONTAINER" openclaw plugins install --link "$PLUGIN_CONTAINER_DST" >/tmp/e3c-crm-plugin-install.log 2>&1 || {
  if grep -qiE "already exists|exists" /tmp/e3c-crm-plugin-install.log; then
    echo "Plugin link already exists; continuing."
  else
    cat /tmp/e3c-crm-plugin-install.log >&2
    exit 1
  fi
}

docker exec -i \
  -e E3C_CRM_MCP_SECRET="$MCP_SHARED_SECRET" \
  -e E3C_CRM_MCP_URL="$MCP_URL" \
  "$OPENCLAW_CONTAINER" \
  node --input-type=module - <<'NODE'
import fs from "node:fs";

const configPath = "/data/.openclaw/openclaw.json";
const pluginPath = "/data/.openclaw/extensions/e3c-crm/openclaw.plugin.json";
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(pluginPath, "utf8"));
const toolNames = manifest.contracts?.tools || [];

const withoutStale = (values) =>
  Array.isArray(values)
    ? values.filter((value) => value !== "bundle-mcp")
    : [];

config.plugins ||= {};
config.plugins.allow = Array.from(new Set([...(config.plugins.allow || []), "e3c-crm"]));
config.plugins.entries ||= {};
config.plugins.entries["e3c-crm"] = {
  ...(config.plugins.entries["e3c-crm"] || {}),
  enabled: true,
  config: {
    url: process.env.E3C_CRM_MCP_URL,
    secret: process.env.E3C_CRM_MCP_SECRET,
  },
};

config.tools ||= {};
config.tools.allow = withoutStale(config.tools.allow);
config.tools.alsoAllow = Array.from(
  new Set([...withoutStale(config.tools.alsoAllow), "e3c-crm", ...toolNames])
);
config.tools.deny = withoutStale(config.tools.deny);

fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Configured e3c-crm with ${toolNames.length} tools.`);
NODE

echo "Restarting OpenClaw..."
docker restart "$OPENCLAW_CONTAINER" >/dev/null
sleep 8
docker exec "$OPENCLAW_CONTAINER" sh -lc "chown -R root:root '$PLUGIN_CONTAINER_DST'"
if docker exec "$OPENCLAW_CONTAINER" openclaw gateway restart >/tmp/e3c-crm-gateway-restart.log 2>&1; then
  echo "Gateway restarted after plugin permission fix."
else
  echo "Gateway restart command did not complete; recent output:" >&2
  cat /tmp/e3c-crm-gateway-restart.log >&2
  echo "Plugin files are installed and config is written. If tools are not visible, run: docker exec $OPENCLAW_CONTAINER openclaw gateway restart" >&2
fi
echo "Done. Wait 20 seconds, then test the AI action again."
