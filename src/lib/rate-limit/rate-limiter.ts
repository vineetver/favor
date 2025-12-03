import { kvClient, isKVConfigured } from "@/lib/cache/kv-client";
import type { RateLimitConfig } from "./config";

export interface RateLimitResult {
	success: boolean;
	limit: number;
	remaining: number;
	reset: number;
}

export class RateLimiter {
	async check(config: RateLimitConfig): Promise<RateLimitResult> {
		if (!isKVConfigured) {
			return {
				success: true,
				limit: config.limit,
				remaining: config.limit,
				reset: Date.now() + config.window * 1000,
			};
		}

		const { identifier, limit, window } = config;
		const key = `ratelimit:${identifier}`;

		try {
			const current = await kvClient.incr(key);

			if (current === 0) {
				return {
					success: true,
					limit,
					remaining: limit,
					reset: Date.now() + window * 1000,
				};
			}

			if (current === 1) {
				await kvClient.expire(key, window);
			}

			const remaining = Math.max(0, limit - current);
			const reset = Date.now() + window * 1000;

			return {
				success: current <= limit,
				limit,
				remaining,
				reset,
			};
		} catch {
			return {
				success: true,
				limit,
				remaining: limit,
				reset: Date.now() + window * 1000,
			};
		}
	}
}

export const rateLimiter = new RateLimiter();
