// Duelo de Cristales — Server entry point

import express from "express";
import path from "path";
import gamesRouter from "./routes/games";

const app = express();

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------
app.use(express.json());

// ---------------------------------------------------------------------------
// CORS — only in non-production environments
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV !== "production") {
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
  });
}

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.use("/api", gamesRouter);

// ---------------------------------------------------------------------------
// Static files — only in production
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV === "production") {
  const clientDist = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientDist));

  // Fallback: serve index.html for non-API routes (SPA client-side routing)
  app.get(/^(?!\/api).*$/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ---------------------------------------------------------------------------
// Start server (skip binding in test environment)
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3001;
export const server =
  process.env.NODE_ENV === "test"
    ? app.listen(0) // ephemeral port — supertest manages the socket
    : app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
      });

// ---------------------------------------------------------------------------
// Graceful shutdown — Ctrl+C / SIGTERM must fully exit the process
// ---------------------------------------------------------------------------
function shutdown(signal: string) {
  console.log(`\n[server] ${signal} recibido, cerrando...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export default app;
