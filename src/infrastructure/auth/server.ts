import { cookies } from "next/headers";
import { API_BASE } from "@/config/api";

const IS_DEV = process.env.NODE_ENV !== "production";

export type AuthUser = { sub: string; email?: string };

/** Auth headers to forward to the backend. */
export type AuthHeaders = { Cookie: string } | { Authorization: string };

interface AuthResult {
  headers: AuthHeaders;
  user: AuthUser;
}

/**
 * Resolve auth for backend calls.
 *
 * Production: cookie forwarding only (frontend and backend share the parent domain).
 * Development: cookie forwarding first, then `FAVOR_API_KEY` fallback for the
 *   cross-origin localhost case where the `sid` cookie set on `:8000` is not
 *   sent to `:3000`.
 *
 * Cookie path verifies via `/auth/me` (cookies expire). API-key path skips
 * verification — `/auth/me` is session-only and returns 401 for keys; the
 * key is server-side dev config, so we trust it and let the real downstream
 * call surface any failure.
 *
 * Accepts a cookie string from either source (`cookies().toString()` for
 * server actions / RSC, or `req.headers.get("cookie")` for route handlers).
 */
export async function resolveAuth(
  cookie: string | null,
): Promise<AuthResult | null> {
  if (cookie) {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Cookie: cookie },
    }).catch(() => null);
    if (res?.ok) {
      const data = (await res.json().catch(() => null)) as {
        sub?: string;
        email?: string;
      } | null;
      if (data?.sub) {
        return {
          headers: { Cookie: cookie },
          user: { sub: data.sub, email: data.email },
        };
      }
    }
  }

  if (IS_DEV) {
    const apiKey = process.env.FAVOR_API_KEY;
    if (apiKey) {
      return {
        headers: { Authorization: `Bearer ${apiKey}` },
        user: { sub: "dev:api-key" },
      };
    }
  }

  return null;
}

/** Server actions / RSC: pulls cookies from `next/headers`. */
export async function resolveAuthFromCookieStore(): Promise<AuthResult | null> {
  const store = await cookies();
  return resolveAuth(store.toString() || null);
}
