import { type NextRequest } from "next/server";

import { proxyFlimFlapBackendRequest } from "@/lib/flimflap-backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleProxy(request: NextRequest) {
  return proxyFlimFlapBackendRequest(request, "/api/broadcast");
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
export const OPTIONS = handleProxy;
export const HEAD = handleProxy;
