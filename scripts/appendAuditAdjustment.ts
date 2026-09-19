import fs from 'fs';
import path from 'path';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { reconcileTradeCollection, normalizeTradeRecord } from '../lib/firestoreAudit';
import firebaseConfig from '../firebase-applet-config.json';

const AUDIT_FILE = path.join(process.cwd(), 'data', 'audit_trades.json');

export async function appendAuthoritativeAdjustment() {
  if (!fs.existsSync(AUDIT_FILE)) {
    throw new Error(`Audit ledger not found at ${AUDIT_FILE}`);
  }

  const rawTrades = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));

  // Verify that an adjustment for this batch hasn't already been appended
  const existingAdj = rawTrades.find(
    (t: any) =>
      t.idempotencyKey === 'audit_adjustment_batch_4438_4477_delta_2997_96' ||
      (t.status === 'ADJUSTMENT' && String(t.trigger || '').includes('PT-20260919-4438'))
  );

  if (existingAdj) {
    console.log('✅ Audit adjustment record already exists:', existingAdj.id);
    return existingAdj;
  }

  // Calculate highest sequence number for canonical ID formatting
  let maxSeq = 0;
  for (const t of rawTrades) {
    if (t && t.id) {
      const match = t.id.match(/-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSeq) maxSeq = num;
      }
    }
  }

  const nextSeq = Math.max(maxSeq + 1, rawTrades.length + 1);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const adjustmentId = `PT-${dateStr}-${nextSeq.toString().padStart(4, '0')}`;

  const lastTrade = rawTrades[rawTrades.length - 1];
  const lastTime = new Date(lastTrade.timestamp).getTime();
  const adjustmentTimestamp = new Date(Math.max(Date.now(), lastTime + 1000)).toISOString();

  const netDelta = -2997.96;
  const previousBalance = Number(lastTrade.accountBalance) || 100000;
  const newBalance = parseFloat((previousBalance + netDelta).toFixed(2));

  const triggerDescription =
    'Audit Reconciliation Adjustment: Retroactive correction for unapplied Taker Fees ($2,533.84) and L2 Slippage ($464.12) across trades PT-20260919-4438 through PT-20260919-4477 (executed 2026-09-19 06:32:27–06:40:45 UTC). Net Realized PnL delta: -$2,997.96 applied to settled account balance.';

  const rawAdjustmentRecord = {
    id: adjustmentId,
    legacyId: adjustmentId,
    timestamp: adjustmentTimestamp,
    instrument: 'ADJUSTMENT/USD',
    direction: 'LONG' as const,
    price: 1.0,
    entryPrice: 1.0,
    exitPrice: 1.0,
    priceDelta: 0.0,
    priceDeltaPct: 0.0,
    quantity: 2997.96,
    leverage: 1,
    fee: 0.0,
    feeRate: 0.0,
    slippage: 0.0,
    slippageBps: 0.0,
    grossPnl: 0.0,
    netPnl: netDelta,
    balanceChange: netDelta,
    balanceChangePct: -100.0,
    accountBalance: newBalance,
    trigger: triggerDescription,
    notes: triggerDescription,
    status: 'ADJUSTMENT' as const,
    sourceHandler: 'ADJUSTMENT' as const,
    idempotencyKey: 'audit_adjustment_batch_4438_4477_delta_2997_96',
  };

  const normalized = normalizeTradeRecord(rawAdjustmentRecord, adjustmentId);

  // Append to trades collection while strictly preserving immutability of all existing rows
  const updatedTrades = [...rawTrades, normalized];
  const reconciled = reconcileTradeCollection(updatedTrades);

  // Save to persistent disk ledger
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(reconciled, null, 2), 'utf8');
  console.log(`✅ Appended adjustment record ${adjustmentId} to ${AUDIT_FILE}`);
  console.log(`   Previous balance: $${previousBalance.toFixed(2)}`);
  console.log(`   Adjustment delta: -$2,997.96`);
  console.log(`   New settled balance: $${newBalance.toFixed(2)}`);
  console.log(`   Total ledger rows: ${reconciled.length}`);

  // Push to Cloud Firestore
  try {
    const finalRecord = reconciled.find((t: any) => t.id === adjustmentId) || normalized;
    const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
    const d = doc(db, 'audit_trades', adjustmentId);
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(finalRecord)) {
      if (v !== undefined) cleaned[k] = v;
    }
    await setDoc(d, cleaned, { merge: true });
    console.log(`✅ Synced adjustment record ${adjustmentId} to Cloud Firestore.`);
  } catch (fsErr: any) {
    console.warn('Firestore sync notice (local ledger authoritative):', fsErr.message);
  }

  return normalized;
}

if (import.meta.url.endsWith(process.argv[1])) {
  appendAuthoritativeAdjustment()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error appending adjustment:', err);
      process.exit(1);
    });
}
