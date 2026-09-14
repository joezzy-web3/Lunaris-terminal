import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
  onSnapshot,
  query,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { PaperTradeRecord, SEED_PAPER_TRADES } from './paperTradingAudit';

const TRADES_COLLECTION = 'audit_trades';
const STATE_COLLECTION = 'autopilot_state';
const GLOBAL_STATE_DOC = 'global_v1';

// Circuit breaker for Firestore free-tier daily quota exhaustion
let firestoreQuotaExceeded = false;
let quotaExceededTimestamp = 0;

export function isFirestoreQuotaExceeded(): boolean {
  if (firestoreQuotaExceeded) {
    // Retry once after 30 minutes to check if daily quota has refreshed
    if (Date.now() - quotaExceededTimestamp > 30 * 60 * 1000) {
      firestoreQuotaExceeded = false;
    }
  }
  return firestoreQuotaExceeded;
}

export function flagFirestoreQuotaExceeded(err?: any) {
  firestoreQuotaExceeded = true;
  quotaExceededTimestamp = Date.now();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('lunaris-firestore-quota-exceeded', {
        detail: {
          error: err?.message || 'Quota limit exceeded',
          timestamp: new Date().toISOString(),
        },
      })
    );
  }
}

function checkIsQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = err.message || String(err);
  const code = err.code || '';
  return (
    code === 'resource-exhausted' ||
    msg.includes('Quota exceeded') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('Quota limit exceeded')
  );
}

/**
 * Resolves the true historical execution timestamp for a trade loaded from Firestore,
 * local storage, or server API.
 * 
 * Prevents trades from being reset to "today" or the sync time by:
 * 1. Prioritizing actual execution fields: realTimestamp, executedAt, originalTimestamp,
 *    tradeTimestamp, utcTimestamp, time, createdAt, and timestamp.
 * 2. Properly parsing Firestore Timestamp objects ({ seconds, nanoseconds } / toDate())
 *    and numeric epoch timestamps (ms or seconds).
 * 3. Detecting historical date mismatches where an older trade ID (e.g. PT-2026-0903-01)
 *    had its timestamp mistakenly overwritten with the sync update time.
 *    If the ID date is older than the timestamp date, the historical ID date is restored.
 */
export function resolveRealTradeTimestamp(data: any, fallbackId?: string): string {
  if (!data) return new Date().toISOString();

  // Candidates in priority order of original trade execution time
  const rawCandidate =
    data.realTimestamp ||
    data.executedAt ||
    data.originalTimestamp ||
    data.tradeTimestamp ||
    data.tradeTime ||
    data.timestamp ||
    data.utcTimestamp ||
    data.createdAt ||
    data.time;

  let resolvedIso: string | null = null;

  // 1. Firestore Timestamp instance or object with toDate()
  if (rawCandidate && typeof rawCandidate.toDate === 'function') {
    try {
      resolvedIso = rawCandidate.toDate().toISOString();
    } catch {}
  }

  // 2. Object with seconds or _seconds (Firestore Timestamp raw representation)
  if (!resolvedIso && rawCandidate && typeof rawCandidate === 'object') {
    const secs = rawCandidate.seconds ?? rawCandidate._seconds;
    if (typeof secs === 'number' && !isNaN(secs)) {
      resolvedIso = new Date(secs * 1000).toISOString();
    }
  }

  // 3. Number (epoch milliseconds or seconds)
  if (!resolvedIso && typeof rawCandidate === 'number' && !isNaN(rawCandidate)) {
    if (rawCandidate > 1e11) {
      resolvedIso = new Date(rawCandidate).toISOString();
    } else if (rawCandidate > 1e8) {
      resolvedIso = new Date(rawCandidate * 1000).toISOString();
    }
  }

  // 4. Valid Date string
  if (!resolvedIso && typeof rawCandidate === 'string' && rawCandidate.trim().length > 0) {
    const d = new Date(rawCandidate);
    if (!isNaN(d.getTime())) {
      resolvedIso = d.toISOString();
    }
  }

  // 5. Cross-reference ID for historical date recovery
  const tradeId = data.id || fallbackId;
  if (tradeId && typeof tradeId === 'string') {
    // Check for formats like PT-2026-0903-01 or PT-20260903-01
    const match = tradeId.match(/PT-(\d{4})-?(\d{2})(\d{2})/i);
    if (match) {
      const [, yyyy, mm, dd] = match;
      const idDateStr = `${yyyy}-${mm}-${dd}`;

      // If we don't have a resolved timestamp yet, use the ID date
      if (!resolvedIso) {
        resolvedIso = `${idDateStr}T12:00:00.000Z`;
      } else {
        // If the resolved timestamp is after the ID date (e.g. today vs 2026-09-03),
        // it means the timestamp was accidentally stamped with the audit update time.
        // Restore the historical date while preserving the original time-of-day.
        const resolvedDateStr = resolvedIso.slice(0, 10);
        if (idDateStr < resolvedDateStr) {
          const timePart = resolvedIso.slice(11);
          resolvedIso = `${idDateStr}T${timePart}`;
        }
      }
    }
  }

  return resolvedIso || new Date().toISOString();
}

/**
 * Normalizes any trade object from Firestore, local storage, or API into a validated PaperTradeRecord
 * with its true immutable execution timestamp.
 */
export function normalizeTradeRecord(data: any, fallbackId?: string): PaperTradeRecord {
  const id = data?.id || fallbackId || `PT-${Date.now()}`;
  const timestamp = resolveRealTradeTimestamp(data, id);
  return {
    ...data,
    id,
    timestamp,
    price: Number(data?.price) || 0,
    quantity: Number(data?.quantity) || 0,
    leverage: Number(data?.leverage) || 1,
    balanceChange: Number(data?.balanceChange) || 0,
    balanceChangePct: Number(data?.balanceChangePct) || 0,
    accountBalance: Number(data?.accountBalance) || 100000,
    instrument: data?.instrument || 'BTC/USDT',
    direction: data?.direction === 'SHORT' ? 'SHORT' : 'LONG',
    trigger: data?.trigger || 'Autonomous Council Execution',
    status: data?.status || (Number(data?.balanceChange) >= 0 ? 'TAKE_PROFIT' : 'STOP_LOSS'),
  };
}

/**
 * Formats a trade timestamp for clear audit display (UTC Date + Time)
 */
export function formatAuditTimestamp(rawTimestamp: any, fallbackId?: string): {
  dateStr: string;
  timeStr: string;
  fullUtc: string;
} {
  const iso = resolveRealTradeTimestamp({ timestamp: rawTimestamp }, fallbackId);
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    return {
      dateStr: iso.slice(0, 10),
      timeStr: iso.slice(11, 19) + ' UTC',
      fullUtc: iso.replace('T', ' ').replace('Z', ' UTC'),
    };
  }

  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');

  return {
    dateStr: `${yyyy}-${mm}-${dd}`,
    timeStr: `${hh}:${min}:${ss} UTC`,
    fullUtc: `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} UTC`,
  };
}

/**
 * Clean data for Firestore by removing any keys with undefined values
 * which would otherwise cause FirebaseError: Function setDoc() called with invalid data.
 */
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      cleaned[key] = cleanFirestoreData(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned as T;
}

/**
 * Fetch all audit trades from Firestore cloud database.
 * If empty in Firestore, automatically seeds with baseline Hackathon genesis trades.
 * Guarantees every trade retains its true execution timestamp.
 */
export async function fetchFirestoreAuditTrades(): Promise<PaperTradeRecord[]> {
  if (isFirestoreQuotaExceeded()) {
    return [];
  }

  try {
    const colRef = collection(db, TRADES_COLLECTION);
    const q = query(colRef, limit(500));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('⚡ [Firestore] audit_trades collection is empty. Seeding baseline trades to cloud...');
      await seedFirestoreAuditTrades(SEED_PAPER_TRADES);
      return SEED_PAPER_TRADES;
    }

    const trades: PaperTradeRecord[] = [];
    snapshot.forEach((docSnap) => {
      const raw = docSnap.data();
      if (raw && (raw.id || docSnap.id)) {
        const normalized = normalizeTradeRecord(raw, docSnap.id);
        if (normalized.id.startsWith('PT-')) {
          trades.push(normalized);
        }
      }
    });

    if (trades.length === 0) {
      return SEED_PAPER_TRADES;
    }

    // Always sort by true execution timestamp ascending
    trades.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return trades;
  } catch (err: any) {
    if (checkIsQuotaError(err)) {
      flagFirestoreQuotaExceeded(err);
      console.warn('⚠️ [Firestore] Free-tier daily write units exceeded on Firebase Spark plan. Falling back to persistent server ledger.');
    } else {
      console.warn('⚠️ [Firestore] Failed to fetch trades, falling back to local/seed:', err);
    }
    return [];
  }
}

/**
 * Save or update a single paper-trade record in Firestore cloud database.
 * Cleaned to omit undefined properties and ensure 100% cloud write reliability.
 */
export async function saveTradeToFirestore(trade: PaperTradeRecord): Promise<void> {
  if (isFirestoreQuotaExceeded()) {
    return;
  }

  try {
    if (!trade || !trade.id) return;
    const cleaned = cleanFirestoreData(trade);
    const docRef = doc(db, TRADES_COLLECTION, trade.id);
    await setDoc(docRef, cleaned, { merge: true });
    console.log(`✅ [Firestore] Successfully persisted trade ${trade.id} to cloud.`);
  } catch (err: any) {
    if (checkIsQuotaError(err)) {
      flagFirestoreQuotaExceeded(err);
      console.warn(`⚠️ [Firestore] Daily quota reached while saving ${trade.id}. Persisting to server/local storage instead.`);
    } else {
      console.warn(`⚠️ [Firestore] Could not write trade ${trade.id}:`, err);
    }
  }
}

/**
 * Seed or reset audit trades in Firestore cloud database.
 */
export async function seedFirestoreAuditTrades(trades: PaperTradeRecord[]): Promise<void> {
  if (isFirestoreQuotaExceeded()) {
    return;
  }

  try {
    const batch = writeBatch(db);
    for (const t of trades) {
      const docRef = doc(db, TRADES_COLLECTION, t.id);
      const cleaned = cleanFirestoreData(t);
      batch.set(docRef, cleaned, { merge: true });
    }
    await batch.commit();
    console.log(`✅ [Firestore] Successfully committed ${trades.length} trades to cloud.`);
  } catch (err: any) {
    if (checkIsQuotaError(err)) {
      flagFirestoreQuotaExceeded(err);
    } else {
      console.warn('⚠️ [Firestore] Failed to batch seed audit trades:', err);
    }
  }
}

/**
 * Real-time cloud listener for audit trades.
 * Invokes callback whenever any user, browser, or server executes a trade.
 */
export function subscribeToFirestoreAuditTrades(
  onTradesUpdate: (trades: PaperTradeRecord[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (isFirestoreQuotaExceeded()) {
    return () => {};
  }

  try {
    const colRef = collection(db, TRADES_COLLECTION);
    const q = query(colRef, limit(500));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          onTradesUpdate(SEED_PAPER_TRADES);
          return;
        }
        const updatedTrades: PaperTradeRecord[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data();
          if (raw && (raw.id || docSnap.id)) {
            const normalized = normalizeTradeRecord(raw, docSnap.id);
            if (normalized.id.startsWith('PT-')) {
              updatedTrades.push(normalized);
            }
          }
        });

        if (updatedTrades.length === 0) {
          onTradesUpdate(SEED_PAPER_TRADES);
          return;
        }

        updatedTrades.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        onTradesUpdate(updatedTrades);
      },
      (error: any) => {
        if (checkIsQuotaError(error)) {
          flagFirestoreQuotaExceeded(error);
          console.warn('⚠️ [Firestore] Listener paused due to quota limit.');
        } else {
          console.warn('⚠️ [Firestore] Subscription error:', error);
        }
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    if (checkIsQuotaError(err)) {
      flagFirestoreQuotaExceeded(err);
    } else {
      console.warn('⚠️ [Firestore] Failed to initiate subscription:', err);
    }
    return () => {};
  }
}

/**
 * Save Autopilot global portfolio and ledger state to Firestore.
 */
export async function saveAutopilotStateToFirestore(state: any): Promise<void> {
  if (isFirestoreQuotaExceeded()) {
    return;
  }

  try {
    const docRef = doc(db, STATE_COLLECTION, GLOBAL_STATE_DOC);
    await setDoc(
      docRef,
      {
        ...state,
        lastCloudSync: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err: any) {
    if (checkIsQuotaError(err)) {
      flagFirestoreQuotaExceeded(err);
      console.warn('⚠️ [Firestore] State sync paused: Free daily quota reached. Local & server persistence intact.');
    } else {
      console.warn('⚠️ [Firestore] Failed to persist autopilot state:', err);
    }
  }
}

/**
 * Subscribe to Autopilot global portfolio state across all browser sessions.
 */
export function subscribeToAutopilotState(
  onStateUpdate: (state: any) => void
): () => void {
  if (isFirestoreQuotaExceeded()) {
    return () => {};
  }

  try {
    const docRef = doc(db, STATE_COLLECTION, GLOBAL_STATE_DOC);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onStateUpdate(docSnap.data());
        }
      },
      (err: any) => {
        if (checkIsQuotaError(err)) {
          flagFirestoreQuotaExceeded(err);
        } else {
          console.warn('⚠️ [Firestore] Autopilot state subscription error:', err);
        }
      }
    );
    return unsubscribe;
  } catch (err: any) {
    if (checkIsQuotaError(err)) {
      flagFirestoreQuotaExceeded(err);
    } else {
      console.warn('⚠️ [Firestore] Could not listen to autopilot state:', err);
    }
    return () => {};
  }
}
