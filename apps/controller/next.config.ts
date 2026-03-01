import type { NextConfig } from "next";

function validateEnv() {
  if (process.env.NODE_ENV !== "production") return;

  const colyseusUrl = process.env.NEXT_PUBLIC_COLYSEUS_URL;

  if (!colyseusUrl || /localhost|127\.0\.0\.1/.test(colyseusUrl)) {
    const msg = [
      "",
      "=".repeat(70),
      " PARTYLINE — Missing production environment variable",
      "=".repeat(70),
      `  * NEXT_PUBLIC_COLYSEUS_URL is ${colyseusUrl ? `"${colyseusUrl}" (localhost)` : "missing"}.`,
      "    Set it to the production Colyseus endpoint.",
      "=".repeat(70),
      "",
    ].join("\n");
    if (process.env.PARTYLINE_STRICT_ENV === "1") throw new Error(msg);
    console.warn(msg);
  }
}

validateEnv();

const nextConfig: NextConfig = {
  transpilePackages: ["@partyline/shared", "@partyline/ui"],
};

export default nextConfig;
