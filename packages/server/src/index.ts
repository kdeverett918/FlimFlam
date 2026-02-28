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
const port = Number(process.env.PORT) || COLYSEUS_PORT;

httpServer.listen(port, () => {
  console.log(`[PartyLine] Server listening on port ${port}`);
  console.log(`[PartyLine] Health: http://localhost:${port}/health`);
  if (process.env.NODE_ENV !== "production") {
    console.log(`[PartyLine] Monitor: http://localhost:${port}/colyseus`);
  }
});
