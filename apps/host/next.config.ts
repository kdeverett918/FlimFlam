import type { NextConfig } from "next";

function validateEnv() {
  if (process.env.NODE_ENV !== "production") return;

  const colyseusUrl = process.env.NEXT_PUBLIC_COLYSEUS_URL;
  const controllerUrl = process.env.NEXT_PUBLIC_CONTROLLER_URL;
  const errors: string[] = [];

  if (!colyseusUrl || /localhost|127\.0\.0\.1/.test(colyseusUrl)) {
    errors.push(
      `NEXT_PUBLIC_COLYSEUS_URL is ${colyseusUrl ? `"${colyseusUrl}" (localhost)` : "missing"}. Set it to the production Colyseus endpoint.`,
    );
  }
  if (!controllerUrl || /localhost|127\.0\.0\.1/.test(controllerUrl)) {
    errors.push(
      `NEXT_PUBLIC_CONTROLLER_URL is ${controllerUrl ? `"${controllerUrl}" (localhost)` : "missing"}. Set it to the deployed controller URL.`,
    );
  }

  if (errors.length > 0) {
    const msg = [
      "",
      "=".repeat(70),
      " FLIMFLAM — Missing production environment variables",
      "=".repeat(70),
      ...errors.map((e) => `  * ${e}`),
      "=".repeat(70),
      "",
    ].join("\n");
    if (process.env.FLIMFLAM_STRICT_ENV === "1") throw new Error(msg);
    console.warn(msg);
  }
}

validateEnv();
const e2eDistDir = process.env.FLIMFLAM_NEXT_DIST_DIR?.trim();

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
  ...(e2eDistDir ? { distDir: e2eDistDir } : {}),
  transpilePackages: ["@flimflam/shared", "@flimflam/ui"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
