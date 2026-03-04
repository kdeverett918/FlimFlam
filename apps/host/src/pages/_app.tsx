import type { AppProps } from "next/app";

export default function HostLegacyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
