import fs from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import net from "node:net";
import { monitor } from "@colyseus/monitor";
import {
  COLYSEUS_PORT,
  GAME_MANIFESTS,
  MAX_NAME_LENGTH,
  ROOM_CODE_CHARS,
  ROOM_CODE_LENGTH,
} from "@flimflam/shared";
import cors from "cors";
import express from "express";
import { PartyRoom } from "./rooms/PartyRoom";
import { getRoomIdByCode } from "./rooms/room-registry";

// Register all games (this triggers the side-effect of loading game factories into the registry)
import "./register-games";

const require = createRequire(import.meta.url);
const { Server, matchMaker } = require("colyseus") as typeof import("colyseus");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());

const CODE_REGEX = new RegExp(`^[${ROOM_CODE_CHARS}]{${ROOM_CODE_LENGTH}}$`);

function normalizeRoomCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  if (!CODE_REGEX.test(code)) return null;
  return code;
}

type FixedWindowCounter = { count: number; resetAt: number };
const resolveRateByIp = new Map<string, FixedWindowCounter>();

function rateLimitResolveByIp(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const ip = req.ip || "unknown";
  const now = Date.now();

  // Opportunistic cleanup to avoid unbounded growth.
  if (resolveRateByIp.size > 10_000) {
    for (const [key, counter] of resolveRateByIp) {
      if (counter.resetAt <= now) resolveRateByIp.delete(key);
    }
  }

  const windowMs = 60_000;
  const maxRequests = 240; // generous for parties behind NAT + E2E, blocks brute-force.

  const existing = resolveRateByIp.get(ip);
  if (!existing || existing.resetAt <= now) {
    resolveRateByIp.set(ip, { count: 1, resetAt: now + windowMs });
    next();
    return;
  }

  existing.count++;
  if (existing.count > maxRequests) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  next();
}

// ─── Health Endpoint ─────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: Date.now(),
    maxNameLength: MAX_NAME_LENGTH,
    nodeVersion: process.version,
    gitSha:
      process.env.RENDER_GIT_COMMIT ??
      process.env.GITHUB_SHA ??
      process.env.SOURCE_VERSION ??
      null,
  });
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

// ─── Room Resolve Endpoint ────────────────────────────────────────────────
// Resolve a 4-char room code to a Colyseus roomId.
//
// Rooms are marked private, so clients can no longer enumerate via
// `client.getAvailableRooms("party")`.
app.post("/api/rooms/resolve", rateLimitResolveByIp, async (req, res) => {
  const code = normalizeRoomCode((req.body as { code?: unknown } | undefined)?.code);
  if (!code) {
    res.status(400).json({ error: "Invalid room code" });
    return;
  }

  let roomId = getRoomIdByCode(code);

  // Fallback for edge cases where the in-memory index is out of sync (e.g. hot reload).
  if (!roomId) {
    try {
      const rooms = await matchMaker.query({ name: "party" });
      const match = rooms.find((r) => (r.metadata as { code?: string } | undefined)?.code === code);
      roomId = match?.roomId ?? null;
    } catch (error) {
      console.error("[PartyLine] Failed to resolve room code via matchMaker.query()", error);
    }
  }

  if (!roomId) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  res.json({ roomId });
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
      console.log(`[FlimFlam] Server listening on unix socket ${where.value}`);
      console.log(
        `[FlimFlam] Health (via unix socket): curl --unix-socket ${where.value} http://localhost/health`,
      );
    } else {
      console.log(`[FlimFlam] Server listening on port ${where.value}`);
      console.log(`[FlimFlam] Health: http://localhost:${where.value}/health`);
      if (process.env.NODE_ENV !== "production") {
        console.log(`[FlimFlam] Monitor: http://localhost:${where.value}/colyseus`);
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
        `[FlimFlam] ${target} in use (attempt ${nextAttempt}/${MAX_EADDRINUSE_RETRIES}). Retrying in ${EADDRINUSE_RETRY_MS}ms...`,
      );
      setTimeout(() => startListening(nextAttempt), EADDRINUSE_RETRY_MS);
      return;
    }

    console.error(`[FlimFlam] Failed to start server (${target})`, error);
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
            `[FlimFlam] Socket ${socketPath} in use (attempt ${nextAttempt}/${MAX_EADDRINUSE_RETRIES}). Retrying in ${EADDRINUSE_RETRY_MS}ms...`,
          );
          setTimeout(() => startListening(nextAttempt), EADDRINUSE_RETRY_MS);
          return;
        }

        console.error(`[FlimFlam] Failed to start server on unix socket ${socketPath}`, error);
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

  console.log(`[FlimFlam] Received ${signal}. Shutting down...`);

  // If something hangs (open keep-alive sockets, stuck plugin, etc.), avoid an infinite drain.
  const forcedExit = setTimeout(() => {
    console.error("[FlimFlam] Forced shutdown after timeout.");
    process.exit(1);
  }, 15_000);
  forcedExit.unref?.();

  try {
    // Stop accepting new connections.
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  } catch (error) {
    console.error("[FlimFlam] Error closing HTTP server", error);
  }

  try {
    const maybeGraceful = (gameServer as unknown as { gracefullyShutdown?: () => Promise<void> })
      .gracefullyShutdown;
    if (typeof maybeGraceful === "function") {
      await maybeGraceful.call(gameServer);
    }
  } catch (error) {
    console.error("[FlimFlam] Error during Colyseus graceful shutdown", error);
  }

  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
