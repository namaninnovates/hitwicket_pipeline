/**
 * Client-Side Local Database Layer (IndexedDB / LocalStorage)
 *
 * Provides isolated, persistent, lightning-fast local storage for each individual user.
 * 100% private to the user's browser with 0ms query latency and offline capability.
 */

const DB_NAME = "HitwicketIntelligenceDB";
const DB_VERSION = 1;
const STORE_REVIEWS = "reviews";
const STORE_BRIEFS = "briefs";
const STORE_META = "meta";

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
 * Completely clear the current user's local database.
 */
export async function resetLocalDatabase(): Promise<void> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_REVIEWS, STORE_BRIEFS, STORE_META], "readwrite");
      tx.objectStore(STORE_REVIEWS).clear();
      tx.objectStore(STORE_BRIEFS).clear();
      tx.objectStore(STORE_META).clear();
      tx.oncomplete = () => {
        try {
          localStorage.removeItem("hw_local_reviews");
          localStorage.removeItem("hw_local_seeded");
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
 * Export the user's local database as a downloadable JSON file.
 */
export async function exportLocalDatabaseJson(): Promise<string> {
  const reviews = await getLocalReviews();
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    totalReviews: reviews.length,
    reviews,
  };
  return JSON.stringify(exportPayload, null, 2);
}
