import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@partyline/shared", "@partyline/ui"],
};

export default nextConfig;
