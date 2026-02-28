import { vi } from "vitest";

let clientIdCounter = 0;

export interface MockClient {
  sessionId: string;
  send: ReturnType<typeof vi.fn>;
  leave: ReturnType<typeof vi.fn>;
  userData: Record<string, unknown>;
}

export function createMockClient(overrides?: Partial<MockClient>): MockClient {
  clientIdCounter += 1;
  return {
    sessionId: overrides?.sessionId ?? `mock-session-${clientIdCounter}-${Date.now().toString(36)}`,
    send: overrides?.send ?? vi.fn(),
    leave: overrides?.leave ?? vi.fn(),
    userData: overrides?.userData ?? {},
  };
}

export function resetClientIdCounter(): void {
  clientIdCounter = 0;
}
