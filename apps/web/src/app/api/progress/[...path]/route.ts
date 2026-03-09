import { type NextRequest } from "next/server";

import { proxyFlimFlapBackendRequest } from "@/lib/flimflap-backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProgressProxyRouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

async function handleProxy(request: NextRequest, { params }: ProgressProxyRouteContext) {
  const { path = [] } = await params;
  const pathname = `/api/progress/${path.join("/")}`;
  return proxyFlimFlapBackendRequest(request, pathname);
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
export const OPTIONS = handleProxy;
export const HEAD = handleProxy;
