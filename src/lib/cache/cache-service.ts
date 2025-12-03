import { kvClient, isKVConfigured } from "./kv-client";
import type { CacheOptions } from "./types";

const CACHE_TIMEOUT = 200;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), timeoutMs),
    ),
  ]);
}

export class CacheService {
  private defaultTTL = 300;

  async get<T>(key: string): Promise<T | null> {
    if (!isKVConfigured) return null;
    try {
      return await withTimeout(kvClient.get<T>(key), CACHE_TIMEOUT);
    } catch {
      return null;
    }
  }

  async set(
    key: string,
    value: unknown,
    options?: CacheOptions,
  ): Promise<void> {
    if (!isKVConfigured) return;
    const ttl = options?.ttl ?? this.defaultTTL;
    try {
      await withTimeout(kvClient.set(key, value, ttl), CACHE_TIMEOUT);
    } catch {
      // Silent fail
    }
  }

  async del(key: string): Promise<void> {
    if (!isKVConfigured) return;
    try {
      await withTimeout(kvClient.del(key), CACHE_TIMEOUT);
    } catch {
      // Silent fail
    }
  }

  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    if (!isKVConfigured) {
      return await fn();
    }

    try {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }
    } catch {
      // Cache miss or error, continue to fn
    }

    const result = await fn();

    this.set(key, result, options).catch(() => {
      // Silent fail on cache set
    });

    return result;
  }
}

export const cacheService = new CacheService();
