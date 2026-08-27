import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decryptSession } from "./lib/auth-jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

    // Verify session age (12 hours check, matching cpm's 12h policy)
    const isExpired = Date.now() - sessionData.createdAt > 12 * 60 * 60 * 1000;
    if (isExpired) {
      const response = NextResponse.json({ error: { message: "Unauthorized. Session expired." } }, { status: 401 });
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
  matcher: ["/api/:path*"],
};
