/**
 * Client-Side Local Database Layer (IndexedDB / LocalStorage)
 *
 * Provides isolated, persistent, lightning-fast local storage for each individual user.
 * 100% private to the user's browser with 0ms query latency and offline capability.
 */

const DB_NAME = "HitwicketIntelligenceDB";
const DB_VERSION = 2;
const STORE_REVIEWS = "reviews";
const STORE_BRIEFS = "briefs";
const STORE_SNAPSHOTS = "snapshots";
const STORE_META = "meta";

export interface HistorySnapshot {
  id: string;
  title: string;
  timestamp: string;
  game: string;
  totalReviews: number;
  avgRating: number;
  positivePct: number;
  topPriority?: string;
  brief?: string | null;
  priorities?: any[];
  matrix?: any;
}

let dbInstance: IDBDatabase | null = null;

/**
 * Open or initialize the browser's IndexedDB database instance.
 */
export function openLocalDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("IndexedDB is only available in browser environments"));
    }

    if (dbInstance) {
      return resolve(dbInstance);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Reviews Store
      if (!db.objectStoreNames.contains(STORE_REVIEWS)) {
        const reviewStore = db.createObjectStore(STORE_REVIEWS, { keyPath: "id", autoIncrement: true });
        reviewStore.createIndex("game", "game", { unique: false });
        reviewStore.createIndex("review_date", "review_date", { unique: false });
        reviewStore.createIndex("rating", "rating", { unique: false });
        reviewStore.createIndex("primary_category", "primary_category", { unique: false });
      }

      // Briefs Store
      if (!db.objectStoreNames.contains(STORE_BRIEFS)) {
        db.createObjectStore(STORE_BRIEFS, { keyPath: "game" });
      }

      // Snapshots (ChatGPT-style History) Store
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
        const snapStore = db.createObjectStore(STORE_SNAPSHOTS, { keyPath: "id" });
        snapStore.createIndex("timestamp", "timestamp", { unique: false });
        snapStore.createIndex("game", "game", { unique: false });
      }

      // Metadata Store
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.warn("IndexedDB open error:", (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Save an array of reviews to the local database.
 */
export async function saveLocalReviews(reviews: any[]): Promise<number> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_REVIEWS, "readwrite");
      const store = tx.objectStore(STORE_REVIEWS);

      for (const rev of reviews) {
        store.put(rev);
      }

      tx.oncomplete = () => resolve(reviews.length);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Falling back to localStorage for reviews:", err);
    try {
      localStorage.setItem("hw_local_reviews", JSON.stringify(reviews));
      return reviews.length;
    } catch {
      return 0;
    }
  }
}

/**
 * Retrieve all reviews from the local database.
 */
export async function getLocalReviews(gameFilter?: string): Promise<any[]> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_REVIEWS, "readonly");
      const store = tx.objectStore(STORE_REVIEWS);
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result || [];
        if (gameFilter && gameFilter !== "all") {
          results = results.filter((r: any) => r.game === gameFilter);
        }
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("Reading reviews from localStorage fallback:", err);
    try {
      const raw = localStorage.getItem("hw_local_reviews");
      const list = raw ? JSON.parse(raw) : [];
      if (gameFilter && gameFilter !== "all") {
        return list.filter((r: any) => r.game === gameFilter);
      }
      return list;
    } catch {
      return [];
    }
  }
}

/**
 * Save an executive founder brief for a specific game key.
 */
export async function saveLocalBrief(game: string, briefText: string): Promise<void> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BRIEFS, "readwrite");
      const store = tx.objectStore(STORE_BRIEFS);
      store.put({ game, brief: briefText, timestamp: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try {
      localStorage.setItem(`hw_brief_${game}`, briefText);
    } catch {}
  }
}

/**
 * Get the stored brief for a specific game.
 */
export async function getLocalBrief(game: string): Promise<string | null> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_BRIEFS, "readonly");
      const store = tx.objectStore(STORE_BRIEFS);
      const request = store.get(game);
      request.onsuccess = () => {
        resolve(request.result ? request.result.brief : null);
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return localStorage.getItem(`hw_brief_${game}`);
  }
}

/**
 * Save a historical analysis snapshot (ChatGPT-style session).
 */
export async function saveHistorySnapshot(snapshot: HistorySnapshot): Promise<void> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SNAPSHOTS, "readwrite");
      const store = tx.objectStore(STORE_SNAPSHOTS);
      store.put(snapshot);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    try {
      const existing = JSON.parse(localStorage.getItem("hw_snapshots") || "[]");
      const updated = [snapshot, ...existing.filter((s: any) => s.id !== snapshot.id)].slice(0, 50);
      localStorage.setItem("hw_snapshots", JSON.stringify(updated));
    } catch {}
  }
}

/**
 * Retrieve all historical analysis snapshots sorted by timestamp descending.
 */
export async function getAllHistorySnapshots(): Promise<HistorySnapshot[]> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SNAPSHOTS, "readonly");
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const request = store.getAll();
      request.onsuccess = () => {
        const list = (request.result || []) as HistorySnapshot[];
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(list);
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    try {
      return JSON.parse(localStorage.getItem("hw_snapshots") || "[]");
    } catch {
      return [];
    }
  }
}

/**
 * Delete a specific snapshot from history.
 */
export async function deleteHistorySnapshot(id: string): Promise<void> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SNAPSHOTS, "readwrite");
      const store = tx.objectStore(STORE_SNAPSHOTS);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try {
      const existing = JSON.parse(localStorage.getItem("hw_snapshots") || "[]");
      localStorage.setItem("hw_snapshots", JSON.stringify(existing.filter((s: any) => s.id !== id)));
    } catch {}
  }
}

/**
 * Completely clear the current user's local database.
 */
export async function resetLocalDatabase(): Promise<void> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const stores = [STORE_REVIEWS, STORE_BRIEFS, STORE_SNAPSHOTS, STORE_META].filter((s) =>
        db.objectStoreNames.contains(s)
      );
      const tx = db.transaction(stores, "readwrite");
      stores.forEach((s) => tx.objectStore(s).clear());
      tx.oncomplete = () => {
        try {
          localStorage.removeItem("hw_local_reviews");
          localStorage.removeItem("hw_local_seeded");
          localStorage.removeItem("hw_snapshots");
          Object.keys(localStorage)
            .filter((k) => k.startsWith("hw_brief_"))
            .forEach((k) => localStorage.removeItem(k));
        } catch {}
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    localStorage.clear();
  }
}

/**
 * Save computed active telemetry (metrics, priorities, matrix, briefs) locally.
 */
export interface LocalTelemetry {
  metrics?: any;
  priorities?: any;
  matrix?: any;
  analytics?: any[];
  briefs?: Record<string, string>;
  updatedAt: string;
}

export async function saveLocalTelemetry(telemetry: Partial<LocalTelemetry>): Promise<void> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, "readwrite");
      const store = tx.objectStore(STORE_META);
      const existingReq = store.get("active_telemetry");
      existingReq.onsuccess = () => {
        const current = existingReq.result?.value || {};
        const merged = { ...current, ...telemetry, updatedAt: new Date().toISOString() };
        store.put({ key: "active_telemetry", value: merged });
      };
      tx.oncomplete = () => {
        try {
          localStorage.setItem("hw_active_telemetry", JSON.stringify({ ...telemetry, updatedAt: new Date().toISOString() }));
        } catch {}
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try {
      const current = JSON.parse(localStorage.getItem("hw_active_telemetry") || "{}");
      localStorage.setItem("hw_active_telemetry", JSON.stringify({ ...current, ...telemetry, updatedAt: new Date().toISOString() }));
    } catch {}
  }
}

export async function getLocalTelemetry(): Promise<LocalTelemetry | null> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_META, "readonly");
      const store = tx.objectStore(STORE_META);
      const req = store.get("active_telemetry");
      req.onsuccess = () => {
        const val = req.result?.value || null;
        if (val) return resolve(val);
        try {
          resolve(JSON.parse(localStorage.getItem("hw_active_telemetry") || "null"));
        } catch {
          resolve(null);
        }
      };
      req.onerror = () => {
        try {
          resolve(JSON.parse(localStorage.getItem("hw_active_telemetry") || "null"));
        } catch {
          resolve(null);
        }
      };
    });
  } catch {
    try {
      return JSON.parse(localStorage.getItem("hw_active_telemetry") || "null");
    } catch {
      return null;
    }
  }
}

/**
 * Export the user's local database as a downloadable JSON file.
 */
export async function exportLocalDatabaseJson(): Promise<string> {
  const reviews = await getLocalReviews();
  const snapshots = await getAllHistorySnapshots();
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    totalReviews: reviews.length,
    snapshotsCount: snapshots.length,
    snapshots,
    reviews,
  };
  return JSON.stringify(exportPayload, null, 2);
}
