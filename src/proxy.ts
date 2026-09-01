import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decryptSession } from "./lib/auth-jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Support and protect legacy /uploads/orders/ paths by rewriting authenticated requests to secure API route
  const legacyUploadMatch = pathname.match(/^\/uploads\/orders\/([^\/]+)\/([^\/]+)$/);
  if (legacyUploadMatch) {
    const sessionToken = request.cookies.get("token")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: { message: "Unauthorized. Please log in." } }, { status: 401 });
    }
    const sessionData = await decryptSession(sessionToken);
    if (!sessionData) {
      const response = NextResponse.json({ error: { message: "Unauthorized. Invalid session." } }, { status: 401 });
      response.cookies.delete("token");
      return response;
    }
    const orderId = legacyUploadMatch[1];
    const filename = legacyUploadMatch[2];
    const targetUrl = new URL(`/api/orders/${orderId}/attachments/file/${encodeURIComponent(filename)}`, request.url);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", sessionData.userId);
    requestHeaders.set("x-username", sessionData.username);
    requestHeaders.set("x-role", sessionData.role);
    return NextResponse.rewrite(targetUrl, {
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Block direct unauthenticated access to storage/upload paths
  if (pathname.startsWith("/storage") || pathname.startsWith("/uploads") || pathname.startsWith("/invoices")) {
    return NextResponse.json({ error: { message: "Direct file access forbidden. Please use authenticated API routes." } }, { status: 403 });
  }

  // We only protect api routes, excluding the login API route itself
  const isApiRoute = pathname.startsWith("/api");
  const isLoginRoute = pathname === "/api/auth/login";

  if (isApiRoute && !isLoginRoute) {
    const sessionToken = request.cookies.get("token")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: { message: "Unauthorized. Please log in." } }, { status: 401 });
    }

    const sessionData = await decryptSession(sessionToken);
    if (!sessionData) {
      const response = NextResponse.json({ error: { message: "Unauthorized. Invalid session." } }, { status: 401 });
      response.cookies.delete("token");
      return response;
    }

    // Inject session info into requests by headers so route handlers don't have to decrypt again
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", sessionData.userId);
    requestHeaders.set("x-username", sessionData.username);
    requestHeaders.set("x-role", sessionData.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/storage/:path*", "/uploads/:path*", "/invoices/:path*"],
};
