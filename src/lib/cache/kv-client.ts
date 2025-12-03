import { Redis } from "@upstash/redis";
import type { CacheClient } from "./types";

const isKVConfigured = !!(
	process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
);

class UpstashClient implements CacheClient {
	private namespace: string;
	private redis: Redis | null = null;

	constructor(namespace = "app") {
		this.namespace = namespace;
		if (isKVConfigured) {
			try {
				this.redis = Redis.fromEnv();
			} catch {
				// Redis not available
			}
		}
	}

	private key(k: string): string {
		return `${this.namespace}:${k}`;
	}

	async get<T>(key: string): Promise<T | null> {
		if (!this.redis) return null;
		try {
			return (await this.redis.get(this.key(key))) as T | null;
		} catch {
			return null;
		}
	}

	async set(key: string, value: unknown, ttl?: number): Promise<void> {
		if (!this.redis) return;
		try {
			if (ttl) {
				await this.redis.setex(this.key(key), ttl, JSON.stringify(value));
			} else {
				await this.redis.set(this.key(key), JSON.stringify(value));
			}
		} catch {
			// Silent fail
		}
	}

	async del(key: string): Promise<void> {
		if (!this.redis) return;
		try {
			await this.redis.del(this.key(key));
		} catch {
			// Silent fail
		}
	}

	async incr(key: string): Promise<number> {
		if (!this.redis) return 0;
		try {
			return (await this.redis.incr(this.key(key))) as number;
		} catch {
			return 0;
		}
	}

	async expire(key: string, seconds: number): Promise<void> {
		if (!this.redis) return;
		try {
			await this.redis.expire(this.key(key), seconds);
		} catch {
			// Silent fail
		}
	}
}

export const kvClient = new UpstashClient("favor");
export { isKVConfigured };
