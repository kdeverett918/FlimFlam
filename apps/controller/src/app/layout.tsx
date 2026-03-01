import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f1020",
};

export const metadata: Metadata = {
  title: "FLIMFLAM",
  description: "AI-powered party games — join from your phone!",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FLIMFLAM",
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${jakarta.variable} ${ibmPlexMono.variable}`}
    >
      <body className="min-h-dvh bg-bg-deep font-body text-text-primary antialiased">
        {children}
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              const buildId =
                (window.__NEXT_DATA__ && window.__NEXT_DATA__.buildId) ? window.__NEXT_DATA__.buildId : 'dev';
              navigator.serviceWorker.register('/sw.js?v=' + encodeURIComponent(buildId)).catch(() => {});
            }
          `}
        </Script>
      </body>
    </html>
  );
}
