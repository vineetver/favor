import { API_BASE } from "@/config/api";

/**
 * Verify the caller is authenticated by forwarding cookies to the backend.
 *
 * Strategy:
 * 1. Forward request cookies (works when frontend and backend share a domain)
 * 2. Fall back to FAVOR_API_KEY (cross-origin dev/staging where the session
 *    cookie is on the backend domain and never reaches the Next.js server)
 */
export async function getAuthUser(
  req: Request,
): Promise<{ sub: string; email?: string } | null> {
  // Try cookie-based auth first (same-domain deploys)
  const cookie = req.headers.get("cookie");
  if (cookie) {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Cookie: cookie },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.sub) return data;
      }
    } catch {
      // Fall through to API key
    }
  }

  // Cross-origin fallback: use server API key to verify identity
  const apiKey = process.env.FAVOR_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.sub) return data;
      }
    } catch {
      // Auth failed entirely
    }
  }

  return null;
}

/** Guard — returns 401 Response if not authenticated. */
export async function requireAuth(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return { user: null, error: new Response("Unauthorized", { status: 401 }) };
  }
  return { user, error: null };
}
