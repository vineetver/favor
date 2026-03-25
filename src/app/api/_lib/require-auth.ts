import { API_BASE } from "@/config/api";

const IS_DEV = process.env.NODE_ENV !== "production";

/**
 * Verify the caller is authenticated by forwarding cookies to the backend.
 *
 * Production: cookie forwarding only (frontend and backend share .genohub.org)
 * Development: cookie forwarding first, then FAVOR_API_KEY fallback
 *   (cross-origin localhost where session cookie doesn't reach Next.js)
 */
export async function getAuthUser(
  req: Request,
): Promise<{ sub: string; email?: string } | null> {
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
      // Fall through
    }
  }

  // Dev-only fallback: API key auth when cross-origin cookies don't work.
  // NOT safe for production — authenticates as the key owner, not the user.
  if (IS_DEV) {
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
