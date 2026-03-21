const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/**
 * Verify the caller is authenticated by forwarding cookies to the backend.
 * Returns the user object on success, null on failure.
 */
export async function getAuthUser(
  req: Request,
): Promise<{ sub: string; email?: string } | null> {
  const cookie = req.headers.get("cookie");
  if (!cookie) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Cookie: cookie },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.sub ? data : null;
  } catch {
    return null;
  }
}

/** Guard — returns 401 Response if not authenticated. */
export async function requireAuth(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return { user: null, error: new Response("Unauthorized", { status: 401 }) };
  }
  return { user, error: null };
}
