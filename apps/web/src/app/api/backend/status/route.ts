import { type NextRequest } from "next/server";

import { proxyFlimFlapBackendRequest } from "@/lib/flimflap-backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleRoute(request: NextRequest) {
  return proxyFlimFlapBackendRequest(request, "/api/backend/status");
}

export const GET = handleRoute;
