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
  }
`;

export default function Head() {
  return (
    <>
      <meta name="theme-color" content="#0f1020" />
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
    </>
  );
}
