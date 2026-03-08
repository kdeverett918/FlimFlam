import type { NextConfig } from "next";

function validateEnv() {
  if (process.env.FLIMFLAM_E2E === "1" || process.env.NEXT_PUBLIC_FLIMFLAM_E2E === "1") return;
  if (process.env.NODE_ENV !== "production") return;

  const colyseusUrl = process.env.NEXT_PUBLIC_COLYSEUS_URL;
  const errors: string[] = [];

  if (!colyseusUrl || /localhost|127\.0\.0\.1/.test(colyseusUrl)) {
    errors.push(
      `NEXT_PUBLIC_COLYSEUS_URL is ${colyseusUrl ? `"${colyseusUrl}" (localhost)` : "missing"}. Set it to the production Colyseus endpoint.`,
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
const e2eDistDir =
  process.env.FLIMFLAM_NEXT_DIST_DIR?.trim() ?? process.env.FLIMFLAM_E2E_HOST_DIST_DIR?.trim();
const nextTsconfigPath = process.env.FLIMFLAM_NEXT_TSCONFIG_PATH?.trim();
const isE2E = process.env.NEXT_PUBLIC_FLIMFLAM_E2E === "1" || process.env.FLIMFLAM_E2E === "1";

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
  ...(nextTsconfigPath ? { typescript: { tsconfigPath: nextTsconfigPath } } : {}),
  transpilePackages: ["@flimflam/shared", "@flimflam/ui"],
  webpack: (config) => {
    if (isE2E) {
      // E2E cold starts on Windows are more stable without filesystem pack cache renames.
      config.cache = false;
    }
    return config;
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
