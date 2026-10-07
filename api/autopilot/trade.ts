// api/autopilot/trade.ts
// Vercel Serverless Function: Record an Autopilot trade to Cloudflare D1
import { queryD1, getD1Config } from '../_lib/d1';

export const config = {
  maxDuration: 10,
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const trade = req.body?.trade;
  if (!trade || !trade.id) {
    return res.status(400).json({ success: false, error: 'Invalid trade' });
  }

  const { isConfigured } = getD1Config();

  if (isConfigured) {
    try {
      // 1. Fetch current state from D1
      const rows = await queryD1<{ key: string; val: string }>(
        "SELECT val FROM audit_meta WHERE key = 'autopilot_state_json' LIMIT 1"
      );
      let state: any = null;
      if (rows && rows.length > 0 && rows[0].val) {
        state = JSON.parse(rows[0].val);
      }

      if (state) {
        const ledger = Array.isArray(state.ledger) ? state.ledger : [];
        if (!ledger.some((t: any) => t.id === trade.id)) {
          ledger.unshift(trade);
          if (ledger.length > 500) ledger.length = 500;
        }
        state.ledger = ledger;
        if (typeof trade.balanceAfter === 'number') {
          state.cashBalance = trade.balanceAfter;
        }
        state.lastUpdated = new Date().toISOString();

        await queryD1(
          "INSERT OR REPLACE INTO audit_meta (key, val) VALUES ('autopilot_state_json', ?)",
          [JSON.stringify(state)]
        );
      }
    } catch (err: any) {
      console.error('Error persisting trade to D1:', err.message);
    }
  }

  return res.status(200).json({ success: true, tradeId: trade.id });
}
