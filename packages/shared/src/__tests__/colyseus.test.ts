import {
  resolveColyseusWsUrlFromEnv,
  resolveNextPublicColyseusHttpUrl,
  resolveNextPublicColyseusWsUrl,
  resolveRoomIdByCode,
  wsUrlToHttpUrl,
} from "../utils/colyseus";

const ORIGINAL_ENV = { ...process.env };

describe("shared/utils/colyseus", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("resolves websocket URLs with production safeguards", () => {
    expect(
      resolveColyseusWsUrlFromEnv({
        envUrl: "wss://api.example.com",
        nodeEnv: "production",
      }),
    ).toBe("wss://api.example.com");

    expect(() =>
      resolveColyseusWsUrlFromEnv({
        envUrl: undefined,
        nodeEnv: "production",
        hostname: "example.com",
      }),
    ).toThrow("Missing NEXT_PUBLIC_COLYSEUS_URL");

    expect(
      resolveColyseusWsUrlFromEnv({
        envUrl: undefined,
        nodeEnv: "production",
        hostname: "localhost",
      }),
    ).toBe("ws://localhost:2567");

    expect(
      resolveColyseusWsUrlFromEnv({
        envUrl: "ws://localhost:2567",
        nodeEnv: "development",
      }),
    ).toBe("ws://localhost:2567");
  });

  it("converts ws URLs to http URLs and leaves unknown schemes untouched", () => {
    expect(wsUrlToHttpUrl("ws://localhost:2567")).toBe("http://localhost:2567");
    expect(wsUrlToHttpUrl("wss://game.example.com")).toBe("https://game.example.com");
    expect(wsUrlToHttpUrl("https://already-http.example.com")).toBe(
      "https://already-http.example.com",
    );
    expect(wsUrlToHttpUrl("custom://protocol")).toBe("custom://protocol");
  });

  it("resolves NEXT_PUBLIC ws/http URLs in browser context", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_COLYSEUS_URL = "wss://prod.example.com";
    vi.stubGlobal("window", { location: { hostname: "prod.example.com" } });

    expect(resolveNextPublicColyseusWsUrl()).toBe("wss://prod.example.com");
    expect(resolveNextPublicColyseusHttpUrl()).toBe("https://prod.example.com");
  });

  it("maps resolveRoomIdByCode responses to typed errors", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 400 }));
    await expect(resolveRoomIdByCode("https://api.example.com", "ABCD")).resolves.toEqual({
      ok: false,
      error: "invalid_code",
      status: 400,
    });

    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 404 }));
    await expect(resolveRoomIdByCode("https://api.example.com", "ABCD")).resolves.toEqual({
      ok: false,
      error: "not_found",
      status: 404,
    });

    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 429 }));
    await expect(resolveRoomIdByCode("https://api.example.com", "ABCD")).resolves.toEqual({
      ok: false,
      error: "rate_limited",
      status: 429,
    });

    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 503 }));
    await expect(resolveRoomIdByCode("https://api.example.com", "ABCD")).resolves.toEqual({
      ok: false,
      error: "server_error",
      status: 503,
    });
  });

  it("returns bad_response for missing roomId and success for valid payloads", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ roomId: "" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    await expect(resolveRoomIdByCode("https://api.example.com", "ABCD")).resolves.toEqual({
      ok: false,
      error: "bad_response",
      status: 200,
    });

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ roomId: "room-1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    await expect(resolveRoomIdByCode("https://api.example.com", "ABCD")).resolves.toEqual({
      ok: true,
      roomId: "room-1",
    });
  });

  it("returns network_error when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("offline")));

    await expect(resolveRoomIdByCode("https://api.example.com", "ABCD")).resolves.toEqual({
      ok: false,
      error: "network_error",
    });
  });
});
