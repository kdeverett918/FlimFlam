import { createServer } from "node:http";
import { createRequire } from "node:module";
import { monitor } from "@colyseus/monitor";
import { COLYSEUS_PORT, GAME_MANIFESTS } from "@partyline/shared";
import cors from "cors";
import express from "express";
import { PartyRoom } from "./rooms/PartyRoom";

// Register all games (this triggers the side-effect of loading game factories into the registry)
import "./register-games";

const require = createRequire(import.meta.url);
const { Server } = require("colyseus") as typeof import("colyseus");

const app = express();
app.use(cors());
app.use(express.json());

// ─── Health Endpoint ─────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// ─── Game Manifests Endpoint ─────────────────────────────────────────────
app.get("/api/games", (_req, res) => {
  res.json(GAME_MANIFESTS);
});

// ─── Colyseus Monitor (dev only) ────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  app.use("/colyseus", monitor());
}

// ─── Create HTTP Server and Colyseus ────────────────────────────────────
const httpServer = createServer(app);

const gameServer = new Server({
  server: httpServer,
  greet: process.env.NODE_ENV !== "production",
});

// Define the party room
gameServer.define("party", PartyRoom);

// ─── Start Listening ────────────────────────────────────────────────────
const explicitPort = Number(process.env.PORT);
const nodeAppInstance = Number(process.env.NODE_APP_INSTANCE);
const instanceOffset = Number.isFinite(nodeAppInstance) ? nodeAppInstance : 0;

// Colyseus Cloud may run multiple PM2 instances during rolling deploys.
// If a fixed PORT is not injected, offset by NODE_APP_INSTANCE to avoid
// EADDRINUSE when multiple processes briefly overlap.
const port =
  Number.isFinite(explicitPort) && explicitPort > 0 ? explicitPort : COLYSEUS_PORT + instanceOffset;

httpServer.listen(port, () => {
  console.log(`[PartyLine] Server listening on port ${port}`);
  console.log(`[PartyLine] Health: http://localhost:${port}/health`);
  if (process.env.NODE_ENV !== "production") {
    console.log(`[PartyLine] Monitor: http://localhost:${port}/colyseus`);
  }

  // PM2 "wait_ready" integration (used by Colyseus Cloud).
  // See: ecosystem.config.js (wait_ready: true)
  if (typeof process.send === "function") {
    process.send("ready");
  }
});
