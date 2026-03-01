import fs from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import net from "node:net";
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
app.disable("x-powered-by");
app.use(cors());
app.use(express.json());

// ─── Health Endpoint ─────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

let isReady = false;
app.get("/ready", (_req, res) => {
  if (!isReady) {
    res.status(503).json({ status: "starting" });
    return;
  }
  res.json({ status: "ready" });
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
// Colyseus Cloud runs behind NGINX + unix sockets at `/run/colyseus/{port}.sock`.
// It also uses PM2's `NODE_APP_INSTANCE` to spin up multiple processes.
const isColyseusCloud = process.env.COLYSEUS_CLOUD !== undefined;

function getListenPort() {
  let port = Number(process.env.PORT || COLYSEUS_PORT);
  if (!Number.isFinite(port) || port <= 0) port = COLYSEUS_PORT;

  // Colyseus Cloud forces base port 2567.
  if (isColyseusCloud) port = COLYSEUS_PORT;

  // When using PM2, each process increments the port using NODE_APP_INSTANCE.
  const processNumber = Number(process.env.NODE_APP_INSTANCE || "0");
  if (Number.isFinite(processNumber) && processNumber > 0) {
    port += processNumber;
  }

  return port;
}

const port = getListenPort();

function checkInactiveSocketFile(sockFilePath: string) {
  return new Promise<void>((resolve, reject) => {
    const client = net
      .createConnection({ path: sockFilePath })
      .on("connect", () => {
        client.end();
        const err = new Error(
          `EADDRINUSE: Already listening on '${sockFilePath}'`,
        ) as NodeJS.ErrnoException;
        err.code = "EADDRINUSE";
        reject(err);
      })
      .on("error", () => {
        // socket file is inactive (or missing) - remove it and continue
        fs.unlink(sockFilePath, (err) => {
          if (err && (err as NodeJS.ErrnoException).code !== "ENOENT") {
            reject(err);
            return;
          }
          resolve();
        });
      });

    client.unref?.();
  });
}

const EADDRINUSE_RETRY_MS = 750;
const MAX_EADDRINUSE_RETRIES = 40;

function startListening(attempt = 0) {
  const onListening = (
    where: { kind: "port"; value: number } | { kind: "socket"; value: string },
  ) => {
    isReady = true;
    if (where.kind === "socket") {
      console.log(`[PartyLine] Server listening on unix socket ${where.value}`);
      console.log(
        `[PartyLine] Health (via unix socket): curl --unix-socket ${where.value} http://localhost/health`,
      );
    } else {
      console.log(`[PartyLine] Server listening on port ${where.value}`);
      console.log(`[PartyLine] Health: http://localhost:${where.value}/health`);
      if (process.env.NODE_ENV !== "production") {
        console.log(`[PartyLine] Monitor: http://localhost:${where.value}/colyseus`);
      }
    }

    // PM2 "wait_ready" integration (used by Colyseus Cloud).
    // See: ecosystem.config.js (wait_ready: true)
    if (typeof process.send === "function") {
      process.send("ready");
    }
  };

  const target = isColyseusCloud ? `/run/colyseus/${port}.sock` : `0.0.0.0:${port}`;

  const onError = (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE" && attempt < MAX_EADDRINUSE_RETRIES) {
      const nextAttempt = attempt + 1;
      console.warn(
        `[PartyLine] ${target} in use (attempt ${nextAttempt}/${MAX_EADDRINUSE_RETRIES}). Retrying in ${EADDRINUSE_RETRY_MS}ms...`,
      );
      setTimeout(() => startListening(nextAttempt), EADDRINUSE_RETRY_MS);
      return;
    }

    console.error(`[PartyLine] Failed to start server (${target})`, error);
    process.exit(1);
  };

  if (isColyseusCloud) {
    const socketPath = `/run/colyseus/${port}.sock`;
    checkInactiveSocketFile(socketPath)
      .then(() => {
        httpServer.once("error", onError);
        httpServer.listen(socketPath, () => onListening({ kind: "socket", value: socketPath }));
      })
      .catch((error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE" && attempt < MAX_EADDRINUSE_RETRIES) {
          const nextAttempt = attempt + 1;
          console.warn(
            `[PartyLine] Socket ${socketPath} in use (attempt ${nextAttempt}/${MAX_EADDRINUSE_RETRIES}). Retrying in ${EADDRINUSE_RETRY_MS}ms...`,
          );
          setTimeout(() => startListening(nextAttempt), EADDRINUSE_RETRY_MS);
          return;
        }

        console.error(`[PartyLine] Failed to start server on unix socket ${socketPath}`, error);
        process.exit(1);
      });
    return;
  }

  httpServer.once("error", onError);
  httpServer.listen({ host: "0.0.0.0", port }, () => onListening({ kind: "port", value: port }));
}

startListening();

let shuttingDown = false;
async function shutdown(signal: "SIGINT" | "SIGTERM") {
  if (shuttingDown) return;
  shuttingDown = true;
  isReady = false;

  console.log(`[PartyLine] Received ${signal}. Shutting down...`);

  // If something hangs (open keep-alive sockets, stuck plugin, etc.), avoid an infinite drain.
  const forcedExit = setTimeout(() => {
    console.error("[PartyLine] Forced shutdown after timeout.");
    process.exit(1);
  }, 15_000);
  forcedExit.unref?.();

  try {
    // Stop accepting new connections.
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  } catch (error) {
    console.error("[PartyLine] Error closing HTTP server", error);
  }

  try {
    const maybeGraceful = (gameServer as unknown as { gracefullyShutdown?: () => Promise<void> })
      .gracefullyShutdown;
    if (typeof maybeGraceful === "function") {
      await maybeGraceful.call(gameServer);
    }
  } catch (error) {
    console.error("[PartyLine] Error during Colyseus graceful shutdown", error);
  }

  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
