import { FLIMFLAP_CLIENT_ASSET_MANIFEST } from "./flimflap-client-manifest";

export default function Head() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800;900&family=Rajdhani:wght@500;600;700&display=swap"
        rel="stylesheet"
      />
      {FLIMFLAP_CLIENT_ASSET_MANIFEST.modulePreloads.map((href) => (
        <link key={href} rel="modulepreload" href={href} />
      ))}
      {FLIMFLAP_CLIENT_ASSET_MANIFEST.stylesheets.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
    </>
  );
}
