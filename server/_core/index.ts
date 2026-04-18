import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ENV } from "./env";
import { registerMcpEndpoint } from "../mcp";
import { startDemoTicker } from "../lib/ticker";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Body parser with safe limits (skip /mcp — MCP SDK handles its own parsing)
  app.use((req, res, next) => {
    if (req.path === "/mcp") return next();
    express.json({ limit: "1mb" })(req, res, next);
  });
  app.use((req, res, next) => {
    if (req.path === "/mcp") return next();
    express.urlencoded({ limit: "1mb", extended: true })(req, res, next);
  });

  // CORS — allow frontend (Vercel) to talk to this API
  app.use((req, res, next) => {
    const allowedOrigins = [
      ENV.appUrl,
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
    ].filter(Boolean);
    const origin = req.headers.origin;
    if (origin && allowedOrigins.some((o) => origin.startsWith(o))) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else if (origin && ENV.isProduction) {
      // In production, also allow any *.vercel.app origin
      if (origin.endsWith(".vercel.app")) {
        res.setHeader("Access-Control-Allow-Origin", origin);
      }
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    if (ENV.isProduction) {
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains"
      );
    }
    next();
  });

  // HTTPS redirect in production (only when behind a reverse proxy that sets x-forwarded-proto)
  if (ENV.isProduction) {
    app.use((req, res, next) => {
      const proto = req.headers["x-forwarded-proto"];
      if (proto && proto !== "https") {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
      }
      next();
    });
  }

  // MCP server endpoint (for OpenClaw tool calling)
  registerMcpEndpoint(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    startDemoTicker();
  });
}

startServer().catch(console.error);
