/**
 * Explicit Standalone Migration Script: Harmonize Status and PnL Sign Contradictions
 *
 * Scans the trade ledger (local disk and Firestore cloud) for records where the
 * `status` field contradicts the mathematical sign of `balanceChange`:
 *   - status === 'TAKE_PROFIT' with balanceChange < 0  --> corrected to 'STOP_LOSS'
 *   - status === 'STOP_LOSS' with balanceChange > 0    --> corrected to 'TAKE_PROFIT'
 *   - status in ('TAKE_PROFIT', 'STOP_LOSS') with balanceChange === 0 --> corrected to 'CLOSED'
 *
 * Usage:
 *   npx tsx scripts/fixStatusPnlContradictions.ts --dry-run
 *   npx tsx scripts/fixStatusPnlContradictions.ts --execute
 */

import fs from 'fs';
import path from 'path';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

interface Discrepancy {
  id: string;
  instrument?: string;
  currentStatus: string;
  correctedStatus: 'STOP_LOSS' | 'TAKE_PROFIT' | 'CLOSED';
  balanceChange: number;
  trigger?: string;
}

function determineCorrectStatus(status: string, balanceChange: number): 'STOP_LOSS' | 'TAKE_PROFIT' | 'CLOSED' | null {
  if (status === 'TAKE_PROFIT' && balanceChange < 0) {
    return 'STOP_LOSS';
  }
  if (status === 'STOP_LOSS' && balanceChange > 0) {
    return 'TAKE_PROFIT';
  }
  if ((status === 'TAKE_PROFIT' || status === 'STOP_LOSS') && balanceChange === 0) {
    return 'CLOSED';
  }
  return null;
}

async function main() {
  const isExecute = process.argv.includes('--execute');
  const mode = isExecute ? 'EXECUTE (LIVE UPDATE)' : 'DRY RUN (NO CHANGES)';

  console.log('=====================================================');
  console.log(`⚖️ Lunaris Terminal Audit: Status & PnL Harmonization Migration`);
  console.log(`⚙️ Mode: ${mode}`);
  console.log('=====================================================\n');

  const auditFilePath = path.join(process.cwd(), 'data', 'audit_trades.json');
  const discrepancies: Discrepancy[] = [];

  // 1. Audit & update Local Disk Ledger
  if (fs.existsSync(auditFilePath)) {
    try {
      const raw = fs.readFileSync(auditFilePath, 'utf8');
      const trades = JSON.parse(raw);

      for (const t of trades) {
        const pnl = Number(t.balanceChange) || 0;
        const correct = determineCorrectStatus(t.status, pnl);
        if (correct) {
          discrepancies.push({
            id: t.id,
            instrument: t.instrument,
            currentStatus: t.status,
            correctedStatus: correct,
            balanceChange: pnl,
            trigger: t.trigger,
          });
        }
      }

      console.log(`[Disk Ledger] Scanned ${trades.length} trades in data/audit_trades.json.`);
      console.log(`[Disk Ledger] Identified ${discrepancies.length} status/PnL contradictions:`);
      for (const d of discrepancies) {
        console.log(`   - Trade ${d.id} (${d.instrument || 'N/A'}): Status "${d.currentStatus}" with PnL $${d.balanceChange.toFixed(2)} -> Correct to "${d.correctedStatus}"`);
      }

      if (isExecute && discrepancies.length > 0) {
        // Timestamped backup
        const backupDir = path.join(process.cwd(), 'data', 'backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const backupFile = path.join(backupDir, `audit_trades_pre_status_fix_${Date.now()}.json`);
        fs.writeFileSync(backupFile, raw, 'utf8');
        console.log(`\n[Disk Ledger] ✅ Safety backup saved to: ${backupFile}`);

        // Apply corrections
        const discrepancyMap = new Map(discrepancies.map((d) => [d.id, d.correctedStatus]));
        const updatedTrades = trades.map((t: any) => {
          if (discrepancyMap.has(t.id)) {
            return {
              ...t,
              status: discrepancyMap.get(t.id),
            };
          }
          return t;
        });

        fs.writeFileSync(auditFilePath, JSON.stringify(updatedTrades, null, 2), 'utf8');
        console.log(`[Disk Ledger] ✅ Corrected ${discrepancies.length} records in data/audit_trades.json.`);
      }
    } catch (e: any) {
      console.error(`[Disk Ledger] Error processing disk ledger:`, e.message);
    }
  } else {
    console.log(`[Disk Ledger] No data/audit_trades.json found.`);
  }

  // 2. Audit & update Cloud Firestore Documents
  console.log('\n[Firestore Cloud] Connecting to Firestore database...');
  try {
    const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

    for (const d of discrepancies) {
      const docRef = doc(db, 'audit_trades', d.id);
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const cloudData = snap.data();
          const cloudStatus = cloudData.status;
          const cloudPnl = Number(cloudData.balanceChange) || 0;
          console.log(`[Firestore Cloud] Found document 'audit_trades/${d.id}' with status="${cloudStatus}" (PnL: $${cloudPnl})`);

          if (isExecute) {
            await updateDoc(docRef, { status: d.correctedStatus });
            console.log(`[Firestore Cloud] ✅ Updated 'audit_trades/${d.id}' status to "${d.correctedStatus}"`);
          } else {
            console.log(`[Firestore Cloud] (Dry-run: would update 'audit_trades/${d.id}' status to "${d.correctedStatus}")`);
          }
        } else {
          console.log(`[Firestore Cloud] Document 'audit_trades/${d.id}' not present in cloud (local-only or already pruned).`);
        }
      } catch (docErr: any) {
        console.warn(`[Firestore Cloud] Notice on doc '${d.id}':`, docErr.message);
      }
    }
  } catch (cloudErr: any) {
    console.error(`[Firestore Cloud] Firestore operation failed:`, cloudErr.message);
  }

  console.log('\n=====================================================');
  if (!isExecute) {
    console.log(`ℹ️ Dry run completed. To execute changes, run:`);
    console.log(`   npx tsx scripts/fixStatusPnlContradictions.ts --execute`);
  } else {
    console.log(`✅ Migration complete. All status/PnL contradictions reconciled.`);
  }
  console.log('=====================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
