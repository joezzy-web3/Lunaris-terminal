/**
 * Explicit Standalone Migration Script: Remove Test & Sanity Artifacts from Trade Ledger
 * Targets ONLY the 3 identified test documents:
 *   1. 'test-write-1'
 *   2. 'TEST-WRITE-01'
 *   3. 'PT-TEST-SANITIZED-01'
 *
 * Usage:
 *   npx tsx scripts/removeTestTradesFromFirestore.ts --dry-run
 *   npx tsx scripts/removeTestTradesFromFirestore.ts --execute
 */

import fs from 'fs';
import path from 'path';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, deleteDoc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const TARGET_TEST_IDS = [
  'test-write-1',
  'TEST-WRITE-01',
  'PT-TEST-SANITIZED-01',
];

async function main() {
  const isExecute = process.argv.includes('--execute');
  const mode = isExecute ? 'EXECUTE (LIVE)' : 'DRY RUN (NO CHANGES)';

  console.log('=====================================================');
  console.log(`🧹 Lunaris Terminal Audit: Test Trades Removal Migration`);
  console.log(`⚙️ Mode: ${mode}`);
  console.log(`🎯 Target Document IDs:`);
  TARGET_TEST_IDS.forEach((id) => console.log(`   - ${id}`));
  console.log('=====================================================\n');

  // 1. Audit Local Server Disk Ledger
  const auditFilePath = path.join(process.cwd(), 'data', 'audit_trades.json');
  if (fs.existsSync(auditFilePath)) {
    try {
      const raw = fs.readFileSync(auditFilePath, 'utf8');
      const trades = JSON.parse(raw);
      const foundInDisk = trades.filter((t: any) => TARGET_TEST_IDS.includes(t.id));

      console.log(`[Disk Ledger] Scanned ${trades.length} trades in data/audit_trades.json.`);
      console.log(`[Disk Ledger] Found ${foundInDisk.length} target test records on disk.`);

      if (isExecute && foundInDisk.length > 0) {
        // Create timestamped safety backup
        const backupDir = path.join(process.cwd(), 'data', 'backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const backupFile = path.join(backupDir, `audit_trades_pre_test_cleanup_${Date.now()}.json`);
        fs.writeFileSync(backupFile, raw, 'utf8');
        console.log(`[Disk Ledger] ✅ Safety backup saved to: ${backupFile}`);

        // Filter and write clean dataset
        const cleanTrades = trades.filter((t: any) => !TARGET_TEST_IDS.includes(t.id));
        fs.writeFileSync(auditFilePath, JSON.stringify(cleanTrades, null, 2), 'utf8');
        console.log(`[Disk Ledger] ✅ Removed ${foundInDisk.length} test records. New count: ${cleanTrades.length}`);
      }
    } catch (e: any) {
      console.error(`[Disk Ledger] Error reading disk ledger:`, e.message);
    }
  } else {
    console.log(`[Disk Ledger] No data/audit_trades.json found.`);
  }

  // 2. Audit Cloud Firestore Collection
  console.log('\n[Firestore Cloud] Connecting to Firestore database...');
  try {
    const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

    for (const testId of TARGET_TEST_IDS) {
      const docRef = doc(db, 'audit_trades', testId);
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          console.log(`[Firestore Cloud] ⚠️ Found target test document 'audit_trades/${testId}'`);
          if (isExecute) {
            await deleteDoc(docRef);
            console.log(`[Firestore Cloud] ✅ DELETED 'audit_trades/${testId}'`);
          } else {
            console.log(`[Firestore Cloud] (Dry-run: would delete 'audit_trades/${testId}')`);
          }
        } else {
          console.log(`[Firestore Cloud] ℹ️ Document 'audit_trades/${testId}' does not exist (clean).`);
        }
      } catch (docErr: any) {
        console.warn(`[Firestore Cloud] Could not check doc '${testId}':`, docErr.message);
      }
    }
  } catch (cloudErr: any) {
    console.error(`[Firestore Cloud] Firestore operation failed:`, cloudErr.message);
  }

  console.log('\n=====================================================');
  if (!isExecute) {
    console.log(`ℹ️ Dry run completed. To execute changes, run:`);
    console.log(`   npx tsx scripts/removeTestTradesFromFirestore.ts --execute`);
  } else {
    console.log(`✅ Migration complete. Target test documents removed.`);
  }
  console.log('=====================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
