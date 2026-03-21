import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Lightweight auth guard at the edge.
 *
 * Protected pages  → redirect to home (login prompt) if no session cookies.
 * Protected API    → 401 if no session cookies.
 *
 * This is defense-in-depth — API routes also enforce auth via requireAuth().
 * Cookie presence is a heuristic: authenticated users always have session
 * cookies set by the backend auth callback.
 */
export function proxy(request: NextRequest) {
  // Authenticated users always have at least one session cookie.
  // Skip middleware if any cookies exist — actual validation is at the API layer.
  if (request.cookies.size > 0) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Protected API routes → 401
  if (pathname.startsWith("/api/chat") || pathname.startsWith("/api/ai-text")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Protected pages → redirect to home
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("login", "required");
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/agent/:path*",
    "/batch-annotation/jobs/:path*",
    "/settings/:path*",
    "/api/chat/:path*",
    "/api/ai-text/:path*",
  ],
};
