import type { Metadata, Viewport } from "next";
import { buildFlimFlapRuntimeScript } from "@/lib/flimflap-backend";
import { FLIMFLAP_CLIENT_ASSET_MANIFEST } from "@/lib/flimflap-client-manifest";

const FLIMFLAP_SHELL_OVERRIDES = `
  .landing.landing-v2 .brand-logo {
    gap: 0.28rem;
  }

  .landing.landing-v2 .brand-logo-mark {
    width: clamp(104px, 11vw, 132px) !important;
    height: clamp(104px, 11vw, 132px) !important;
    max-width: clamp(104px, 11vw, 132px) !important;
    max-height: clamp(104px, 11vw, 132px) !important;
  }

  .landing.landing-v2 .brand-logo-wordmark {
    font-size: clamp(1rem, 1.7vw, 1.3rem) !important;
    letter-spacing: 0.16em !important;
  }

  .landing-hero-v2 {
    width: min(420px, 100%) !important;
    gap: 0.85rem !important;
    padding-top: 0.75rem !important;
  }

  @media (max-width: 760px) {
    .landing.landing-v2 .brand-logo-mark {
      width: clamp(96px, 26vw, 120px) !important;
      height: clamp(96px, 26vw, 120px) !important;
      max-width: clamp(96px, 26vw, 120px) !important;
      max-height: clamp(96px, 26vw, 120px) !important;
    }

    .landing-hero-v2 {
      width: min(440px, 100%) !important;
    }

    .landing-avatar-preview {
      width: min(100%, 250px) !important;
      min-height: 158px !important;
      padding: 0.72rem 1rem 0.52rem !important;
      gap: 0.2rem !important;
    }

    .landing-avatar-stage {
      width: 88px !important;
      height: 88px !important;
    }

    .landing-avatar-icon {
      width: 62px !important;
      height: 62px !important;
    }

    .landing-avatar-name {
      font-size: 1rem !important;
    }

    .landing-secondary-actions {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 0.7rem !important;
      height: auto !important;
    }

    .landing-link-pill {
      width: 100% !important;
      justify-content: center !important;
    }
  }
`;

export const metadata: Metadata = {
  title: "FlimFlap | FLIMFLAM",
  description:
    "Flap through neon pipes in solo, daily, campaign, or live multiplayer without leaving FLIMFLAM.",
  icons: {
    icon: "/flimflap/favicon.svg?v=20260309c",
    apple: "/flimflap/apple-touch-icon.png?v=20260309c",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f1020",
};

export default function FlimFlapPage() {
  const runtimeScript = buildFlimFlapRuntimeScript({
    colyseusUrl: process.env.NEXT_PUBLIC_COLYSEUS_URL ?? null,
    hostUrl: process.env.NEXT_PUBLIC_HOST_URL ?? null,
  });

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800;900&family=Rajdhani:wght@500;600;700&display=swap"
        rel="stylesheet"
      />
      {FLIMFLAP_CLIENT_ASSET_MANIFEST.stylesheets.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <style>{FLIMFLAP_SHELL_OVERRIDES}</style>
      <script id="flimflap-runtime-bootstrap" dangerouslySetInnerHTML={{ __html: runtimeScript }} />
      <div
        id="root"
        className="h-[100dvh] w-full overflow-hidden bg-[#05060f]"
        suppressHydrationWarning
      />
      <script
        id="flimflap-client-entry"
        src={FLIMFLAP_CLIENT_ASSET_MANIFEST.script}
        type="module"
        crossOrigin="anonymous"
      />
    </>
  );
}
