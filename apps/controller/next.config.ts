import type { NextConfig } from "next";

function validateEnv() {
  if (process.env.NODE_ENV !== "production") return;

  const colyseusUrl = process.env.NEXT_PUBLIC_COLYSEUS_URL;

  if (!colyseusUrl || /localhost|127\.0\.0\.1/.test(colyseusUrl)) {
    const msg = [
      "",
      "=".repeat(70),
      " FLIMFLAM — Missing production environment variable",
      "=".repeat(70),
      `  * NEXT_PUBLIC_COLYSEUS_URL is ${colyseusUrl ? `"${colyseusUrl}" (localhost)` : "missing"}.`,
      "    Set it to the production Colyseus endpoint.",
      "=".repeat(70),
      "",
    ].join("\n");
    if (process.env.FLIMFLAM_STRICT_ENV === "1") throw new Error(msg);
    console.warn(msg);
  }
}

validateEnv();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  transpilePackages: ["@flimflam/shared", "@flimflam/ui"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
