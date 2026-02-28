import { vi } from "vitest";
import { type MockClient, createMockClient } from "./mock-client";

export interface MockClock {
  setTimeout: ReturnType<typeof vi.fn>;
  setInterval: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
}

export interface MockRoom<TState = Record<string, unknown>> {
  state: TState;
  clock: MockClock;
  send: ReturnType<typeof vi.fn>;
  broadcast: ReturnType<typeof vi.fn>;
  clients: MockClient[];
  setMetadata: ReturnType<typeof vi.fn>;
  lock: ReturnType<typeof vi.fn>;
  maxClients: number;
}

export interface CreateMockRoomOptions<TState = Record<string, unknown>> {
  state?: TState;
  clientCount?: number;
  maxClients?: number;
}

export function createMockRoom<TState = Record<string, unknown>>(
  options?: CreateMockRoomOptions<TState>,
): MockRoom<TState> {
  const clientCount = options?.clientCount ?? 0;
  const clients: MockClient[] = [];
  for (let i = 0; i < clientCount; i++) {
    clients.push(createMockClient());
  }

  return {
    state: options?.state ?? ({} as TState),
    clock: {
      setTimeout: vi.fn(),
      setInterval: vi.fn(),
      clear: vi.fn(),
    },
    send: vi.fn(),
    broadcast: vi.fn(),
    clients,
    setMetadata: vi.fn(),
    lock: vi.fn(),
    maxClients: options?.maxClients ?? 8,
  };
}
