import type { Metadata, Viewport } from "next";
import { DM_Sans, Dela_Gothic_One } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const delaGothicOne = Dela_Gothic_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ff3366",
};

export const metadata: Metadata = {
  title: "PARTYLINE",
  description: "AI-powered party games — join from your phone!",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PARTYLINE",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${delaGothicOne.variable} ${dmSans.variable}`}>
      <body className="min-h-dvh bg-bg-dark font-body text-text-primary antialiased">
        {children}
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            }
          `}
        </Script>
      </body>
    </html>
  );
}
