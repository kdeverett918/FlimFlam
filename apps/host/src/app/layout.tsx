import type { Metadata } from "next";
import { DM_Sans, Dela_Gothic_One } from "next/font/google";
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

export const metadata: Metadata = {
  title: "PARTYLINE - Host Display",
  description: "AI-powered party games for your next gathering. Display on a shared screen.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${delaGothicOne.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-bg-dark font-body text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
