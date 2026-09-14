import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { PaperTradeRecord, SEED_PAPER_TRADES } from './paperTradingAudit';

const TRADES_COLLECTION = 'audit_trades';
const STATE_COLLECTION = 'autopilot_state';
const GLOBAL_STATE_DOC = 'global_v1';

/**
 * Fetch all audit trades from Firestore cloud database.
 * If empty in Firestore, automatically seeds with baseline Hackathon genesis trades.
 */
export async function fetchFirestoreAuditTrades(): Promise<PaperTradeRecord[]> {
  try {
    const colRef = collection(db, TRADES_COLLECTION);
    const q = query(colRef, orderBy('timestamp', 'asc'), limit(300));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('⚡ [Firestore] audit_trades collection is empty. Seeding baseline trades to cloud...');
      await seedFirestoreAuditTrades(SEED_PAPER_TRADES);
      return SEED_PAPER_TRADES;
    }

    const trades: PaperTradeRecord[] = [];
    snapshot.forEach((docSnap) => {
      trades.push(docSnap.data() as PaperTradeRecord);
    });

    return trades;
  } catch (err) {
    console.warn('⚠️ [Firestore] Failed to fetch trades, falling back to local/seed:', err);
    return [];
  }
}

/**
 * Save or update a single paper-trade record in Firestore cloud database.
 */
export async function saveTradeToFirestore(trade: PaperTradeRecord): Promise<void> {
  try {
    if (!trade || !trade.id) return;
    const docRef = doc(db, TRADES_COLLECTION, trade.id);
    await setDoc(docRef, trade, { merge: true });
  } catch (err) {
    console.warn(`⚠️ [Firestore] Could not write trade ${trade.id}:`, err);
  }
}

/**
 * Seed or reset audit trades in Firestore cloud database.
 */
export async function seedFirestoreAuditTrades(trades: PaperTradeRecord[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const t of trades) {
      const docRef = doc(db, TRADES_COLLECTION, t.id);
      batch.set(docRef, t, { merge: true });
    }
    await batch.commit();
    console.log(`✅ [Firestore] Successfully committed ${trades.length} trades to cloud.`);
  } catch (err) {
    console.warn('⚠️ [Firestore] Failed to batch seed audit trades:', err);
  }
}

/**
 * Real-time real-time cloud listener for audit trades.
 * Invokes callback whenever any user, browser, or server executes a trade.
 */
export function subscribeToFirestoreAuditTrades(
  onTradesUpdate: (trades: PaperTradeRecord[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const colRef = collection(db, TRADES_COLLECTION);
    const q = query(colRef, orderBy('timestamp', 'asc'), limit(300));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          onTradesUpdate(SEED_PAPER_TRADES);
          return;
        }
        const updatedTrades: PaperTradeRecord[] = [];
        snapshot.forEach((docSnap) => {
          updatedTrades.push(docSnap.data() as PaperTradeRecord);
        });
        onTradesUpdate(updatedTrades);
      },
      (error) => {
        console.warn('⚠️ [Firestore] Subscription error:', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('⚠️ [Firestore] Failed to initiate subscription:', err);
    return () => {};
  }
}

/**
 * Save Autopilot global portfolio and ledger state to Firestore.
 */
export async function saveAutopilotStateToFirestore(state: any): Promise<void> {
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
  } catch (err) {
    console.warn('⚠️ [Firestore] Failed to persist autopilot state:', err);
  }
}

/**
 * Subscribe to Autopilot global portfolio state across all browser sessions.
 */
export function subscribeToAutopilotState(
  onStateUpdate: (state: any) => void
): () => void {
  try {
    const docRef = doc(db, STATE_COLLECTION, GLOBAL_STATE_DOC);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onStateUpdate(docSnap.data());
        }
      },
      (err) => {
        console.warn('⚠️ [Firestore] Autopilot state subscription error:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('⚠️ [Firestore] Could not listen to autopilot state:', err);
    return () => {};
  }
}
