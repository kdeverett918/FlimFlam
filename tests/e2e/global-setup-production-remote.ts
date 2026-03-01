async function pollHttpOk(
  label: string,
  url: string,
  { timeoutMs, intervalMs }: { timeoutMs: number; intervalMs: number },
) {
  const started = Date.now();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let status = 0;
    try {
      const res = await fetch(url, { method: "GET" });
      status = res.status;
    } catch {
      // ignore
    }

    if (status >= 200 && status < 400) return;

    if (Date.now() - started > timeoutMs) {
      throw new Error(`[globalSetup] ${label} not ready: GET ${url} -> ${status}`);
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

export default async function globalSetup() {
  const hostUrl = process.env.FLIMFLAM_E2E_HOST_URL ?? "https://flimflam-host.onrender.com";
  const controllerUrl =
    process.env.FLIMFLAM_E2E_CONTROLLER_URL ?? "https://flimflam-controller.onrender.com";
  const colyseusHealthUrl =
    process.env.FLIMFLAM_E2E_COLYSEUS_HEALTH_URL ?? "https://us-dfw-baad7ee4.colyseus.cloud/health";

  // Keep this conservative: Render cold starts + DNS propagation can be slow.
  const timeoutMs = 5 * 60_000;
  const intervalMs = 2_000;

  await pollHttpOk("Colyseus /health", colyseusHealthUrl, { timeoutMs, intervalMs });
  await pollHttpOk("Render host", hostUrl, { timeoutMs, intervalMs });
  await pollHttpOk("Render controller", controllerUrl, { timeoutMs, intervalMs });
}
