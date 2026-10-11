import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getDatabase, ref, set, onValue, type Database } from "firebase/database";

// Configuration provided by user
export const defaultFirebaseConfig = {
  apiKey: "AIzaSyBtN2Kz_jeMTRsztKMzJ-Y0furXU6KotVg",
  authDomain: "jrzscoretgr.firebaseapp.com",
  databaseURL: "https://jrzscoretgr-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "jrzscoretgr",
  storageBucket: "jrzscoretgr.firebasestorage.app",
  messagingSenderId: "361567577491",
  appId: "1:361567577491:web:2ebc3afac97fcf599df466",
  measurementId: "G-XKEY1RTSZQ"
};

declare global {
  interface Window {
    firebaseConfig?: typeof defaultFirebaseConfig;
    isOfflineMode?: boolean;
    __jrzFirebaseInitialized?: boolean;
  }
}

const SYNC_KEYS = [
  "silat_seni_match_state",
  "registered_athletes",
  "match_schedules",
  "jrz_bagan_configs",
  "jrz_bracket_overrides",
  "logo_kiri",
  "logo_kanan"
];

let firebaseApp: FirebaseApp | null = null;
let database: Database | null = null;
let isInitialized = false;
let isRemoteUpdating = false;

/**
 * Initializes Firebase Realtime Database and starts two-way cloud sync
 */
export function initFirebaseRealtime(): Database | null {
  if (isInitialized) return database;
  if (typeof window === "undefined") return null;

  // 100% Offline Mode (index-offline.html): do not connect to external network
  if (window.isOfflineMode) {
    console.info("[JRZ Score] Mode 100% Offline Aktif (index-offline). Firebase dinonaktifkan.");
    isInitialized = true;
    return null;
  }

  // Get config from window.firebaseConfig (set in index.html) or default
  const config = window.firebaseConfig || defaultFirebaseConfig;

  try {
    if (!getApps().length) {
      firebaseApp = initializeApp(config);
    } else {
      firebaseApp = getApps()[0];
    }

    if (firebaseApp) {
      database = getDatabase(firebaseApp);
      console.info("[JRZ Score] Firebase Realtime Database terhubung:", config.databaseURL);
      
      // Setup automatic sync for match & tournament state
      setupTwoWaySync(database);
    }
  } catch (error) {
    console.warn("[JRZ Score] Tidak dapat menginisialisasi Firebase (berjalan offline dengan localStorage):", error);
    database = null;
  }

  isInitialized = true;
  window.__jrzFirebaseInitialized = !!database;
  return database;
}

/**
 * Sets up transparent two-way synchronization between localStorage and Firebase Realtime Database
 */
function setupTwoWaySync(db: Database) {
  // 1. Listen for remote changes from Firebase for each synchronized key
  SYNC_KEYS.forEach(key => {
    try {
      const dbRef = ref(db, `jrzscore/${key}`);
      onValue(dbRef, (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.val();
        const value = data?.value !== undefined ? data.value : data;
        const serialized = typeof value === "string" ? value : JSON.stringify(value);

        const currentLocal = localStorage.getItem(key);
        if (currentLocal !== serialized) {
          isRemoteUpdating = true;
          try {
            localStorage.setItem(key, serialized);
            // Dispatch synthetic storage event so active React states update immediately
            window.dispatchEvent(new StorageEvent("storage", {
              key,
              newValue: serialized,
              storageArea: localStorage
            }));
          } finally {
            isRemoteUpdating = false;
          }
        }
      }, (err) => {
        console.warn(`[Firebase Sync] Error on ${key}:`, err);
      });
    } catch (e) {
      console.warn(`[Firebase Sync] Failed to attach listener for ${key}:`, e);
    }
  });

  // 2. Intercept localStorage.setItem to push local mutations to Firebase
  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(key: string, value: string) {
    originalSetItem(key, value);

    if (!isRemoteUpdating && SYNC_KEYS.includes(key)) {
      try {
        let parsed: any = value;
        try {
          parsed = JSON.parse(value);
        } catch {
          // Plain string
        }
        const dbRef = ref(db, `jrzscore/${key}`);
        set(dbRef, {
          value: parsed,
          updatedAt: Date.now()
        }).catch(() => {
          // Fail silently offline
        });
      } catch {
        // Ignore
      }
    }
  };
}

/**
 * Manually pushes a key to Firebase Realtime Database & localStorage
 */
export async function syncRealtimeData(key: string, data: any): Promise<void> {
  const serialized = typeof data === "string" ? data : JSON.stringify(data);
  localStorage.setItem(key, serialized);
}
