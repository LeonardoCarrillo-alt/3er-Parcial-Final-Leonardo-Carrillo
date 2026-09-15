// Duelo de Cristales — Server entry point

import express from "express";
import path from "path";
import gamesRouter from "./routes/games";

const app = express();

app.use(express.json());

// CORS a usar solo en entorno de desarrollo
if (process.env.NODE_ENV !== "production") {
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
  });
}


app.use("/api", gamesRouter);


if (process.env.NODE_ENV === "production") {
  const clientDist = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientDist));

  app.get(/^(?!\/api).*$/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const PORT = process.env.PORT || 3001;
export const server =
  process.env.NODE_ENV === "test"
    ? app.listen(0) // ephemeral port — supertest manages the socket
    : app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
      });

function shutdown(signal: string) {
  console.log(`\n[server] ${signal} recibido, cerrando...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export default app;
