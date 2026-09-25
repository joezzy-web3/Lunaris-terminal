// scripts/seedD1.ts
import { executeD1Query } from '../lib/cloudflareD1.ts';
import { getProgressiveState } from '../api/audit/engine.ts';

async function main() {
  console.log('Seeding initial trade batch into Cloudflare D1...');

  const state = getProgressiveState(Date.now());
  console.log(`Current state: ${state.totalTrades} total trades, balance: $${state.currentBalance}`);

  const recent = state.recentTrades || [];
  console.log(`Writing ${recent.length} recent trades to Cloudflare D1...`);

  let inserted = 0;
  for (const t of recent) {
    const sql = `
      INSERT OR IGNORE INTO trades (
        id, seq, timestamp, instrument, direction, price,
        entry_price, exit_price, quantity, leverage, fee,
        slippage, gross_pnl, net_pnl, account_balance, status, trigger_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      t.id,
      t.auditSeq,
      t.timestamp,
      t.instrument,
      t.direction,
      t.price,
      t.entryPrice,
      t.exitPrice,
      t.quantity,
      t.leverage,
      t.fee,
      t.slippage,
      t.grossPnl,
      t.netPnl,
      t.accountBalance,
      t.status,
      t.trigger || '',
    ];

    try {
      await executeD1Query(sql, params);
      inserted++;
    } catch (err: any) {
      console.error(`Failed to insert trade ${t.id}:`, err.message);
    }
  }

  // Update audit_meta with aggregate stats
  await executeD1Query(
    `INSERT OR REPLACE INTO audit_meta (key, val) VALUES ('total_trades', ?), ('current_balance', ?), ('last_updated', ?)`,
    [String(state.totalTrades), String(state.currentBalance), new Date().toISOString()]
  );

  console.log(`Successfully seeded ${inserted} trades and metadata into Cloudflare D1!`);

  // Verify
  const rows = await executeD1Query('SELECT COUNT(*) as count, MAX(seq) as max_seq FROM trades');
  console.log('Verification query from Cloudflare D1:', rows);
}

main().catch(console.error);
