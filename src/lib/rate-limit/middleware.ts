import { headers } from "next/headers";
import type { RateLimitConfig } from "./config";
import { rateLimiter } from "./rate-limiter";

export async function rateLimit(
  limitConfig: Pick<RateLimitConfig, "limit" | "window">,
): Promise<void> {
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for") ??
    headersList.get("x-real-ip") ??
    "anonymous";

  const result = await rateLimiter.check({
    identifier: ip,
    ...limitConfig,
  });

  if (!result.success) {
    throw new Error("Rate limit exceeded");
  }
}
