/**
 * IndexedDB cache for binary data files (Arrow IPC, Parquet, etc.)
 * Persists data across page refreshes to avoid re-downloading
 */

const DB_NAME = "favor-data-cache";
const DB_VERSION = 2;
const STORE_NAME = "data-files";

// Cache entry expires after 24 hours
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  url: string;
  data: ArrayBuffer;
  timestamp: number;
  size: number;
}

/**
 * Open IndexedDB connection
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "url" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });
}

/**
 * Get cached data file by URL
 */
export async function getCachedData(url: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(url);

      request.onerror = () => {
        db.close();
        reject(new Error("Failed to read from cache"));
      };

      request.onsuccess = () => {
        db.close();
        const entry = request.result as CacheEntry | undefined;

        if (!entry) {
          resolve(null);
          return;
        }

        // Check if cache has expired
        const age = Date.now() - entry.timestamp;
        if (age > CACHE_TTL_MS) {
          // Cache expired, delete it
          deleteCachedData(url).catch(console.error);
          resolve(null);
          return;
        }

        resolve(entry.data);
      };
    });
  } catch (error) {
    console.warn("Cache read failed:", error);
    return null;
  }
}

/**
 * Store data file in cache
 */
export async function setCachedData(
  url: string,
  data: ArrayBuffer,
): Promise<void> {
  try {
    // Clone the ArrayBuffer to avoid "detached buffer" errors
    // This can happen when the buffer has been transferred to a worker
    const clonedData = data.slice(0);

    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      const entry: CacheEntry = {
        url,
        data: clonedData,
        timestamp: Date.now(),
        size: clonedData.byteLength,
      };

      const request = store.put(entry);

      request.onerror = () => {
        db.close();
        reject(new Error("Failed to write to cache"));
      };

      request.onsuccess = () => {
        db.close();
        resolve();
      };
    });
  } catch (error) {
    console.warn("Cache write failed:", error);
  }
}

/**
 * Delete cached data file
 */
export async function deleteCachedData(url: string): Promise<void> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(url);

      request.onerror = () => {
        db.close();
        reject(new Error("Failed to delete from cache"));
      };

      request.onsuccess = () => {
        db.close();
        resolve();
      };
    });
  } catch (error) {
    console.warn("Cache delete failed:", error);
  }
}

/**
 * Clear all cached data files
 */
export async function clearDataCache(): Promise<void> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => {
        db.close();
        reject(new Error("Failed to clear cache"));
      };

      request.onsuccess = () => {
        db.close();
        resolve();
      };
    });
  } catch (error) {
    console.warn("Cache clear failed:", error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  entries: number;
  totalSize: number;
  items: Array<{ url: string; size: number; age: number }>;
}> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => {
        db.close();
        reject(new Error("Failed to read cache stats"));
      };

      request.onsuccess = () => {
        db.close();
        const entries = request.result as CacheEntry[];
        const now = Date.now();

        resolve({
          entries: entries.length,
          totalSize: entries.reduce((sum, e) => sum + e.size, 0),
          items: entries.map((e) => ({
            url: e.url,
            size: e.size,
            age: now - e.timestamp,
          })),
        });
      };
    });
  } catch (error) {
    console.warn("Failed to get cache stats:", error);
    return { entries: 0, totalSize: 0, items: [] };
  }
}

/**
 * Check if data file is cached
 */
export async function isDataCached(url: string): Promise<boolean> {
  const cached = await getCachedData(url);
  return cached !== null;
}
