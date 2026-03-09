import type { Metadata } from "next";
import Script from "next/script";

import { FLIMFLAP_CLIENT_ASSET_MANIFEST } from "@/lib/flimflap-client-manifest";

const normalizeBackendUrl = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.replace(/\/+$/, "");
};

const resolveBackendUrl = (): string => {
  const configured =
    normalizeBackendUrl(process.env.FLIMFLAP_BACKEND_URL) ??
    normalizeBackendUrl(process.env.TRUMPYBIRD_BACKEND_URL);
  if (configured) {
    return configured;
  }

  return process.env.NODE_ENV === "production" ? "https://trumpybird.app" : "http://127.0.0.1:2567";
};

export const metadata: Metadata = {
  title: "FlimFlap | FLIMFLAM",
  description:
    "Flap through neon pipes in solo, daily, campaign, or live multiplayer without leaving FLIMFLAM.",
  icons: {
    icon: "/flimflap/favicon.svg?v=20260309a",
    apple: "/flimflap/apple-touch-icon.png?v=20260309a",
  },
};

export default function FlimFlapPage() {
  const backendUrl = resolveBackendUrl();

  return (
    <>
      <Script id="flimflap-runtime-config" strategy="beforeInteractive">
        {`window.__FLIMFLAP_BACKEND_URL__ = ${JSON.stringify(backendUrl)}; window.__TRUMPYBIRD_BACKEND_URL__ = window.__FLIMFLAP_BACKEND_URL__;`}
      </Script>
      <div
        id="root"
        className="h-[100dvh] w-full overflow-hidden bg-[#05060f]"
        suppressHydrationWarning
      />
      <Script
        id="flimflap-client-entry"
        src={FLIMFLAP_CLIENT_ASSET_MANIFEST.script}
        strategy="afterInteractive"
        type="module"
      />
    </>
  );
}
