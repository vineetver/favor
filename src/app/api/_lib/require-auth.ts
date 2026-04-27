import { type AuthUser, resolveAuth } from "@infra/auth/server";

/** Verify the caller is authenticated. */
export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const result = await resolveAuth(req.headers.get("cookie"));
  return result?.user ?? null;
}

/** Guard — returns 401 Response if not authenticated. */
export async function requireAuth(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return { user: null, error: new Response("Unauthorized", { status: 401 }) };
  }
  return { user, error: null };
}
