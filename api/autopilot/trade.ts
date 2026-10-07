// api/autopilot/trade.ts
// Vercel Serverless Function: Record an Autopilot trade to Cloudflare D1

export const config = {
  maxDuration: 10,
};

function getD1Config() {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
  return {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || 'de6f32420d2021b88ca16405c61f4154',
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID || 'eb00f7eb-1d17-40cc-99e7-2a1c548853ba',
    apiToken,
    isConfigured: !!(apiToken && apiToken.trim().length > 10),
  };
}

async function queryD1<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const { accountId, databaseId, apiToken, isConfigured } = getD1Config();
  if (!isConfigured) {
    return [] as T[];
  }
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
    signal: AbortSignal.timeout(3000),
  });

  if (!resp.ok) {
    throw new Error(`D1 HTTP ${resp.status}`);
  }

  const data = await resp.json();
  if (!data.success) {
    throw new Error(`D1 Error: ${JSON.stringify(data.errors)}`);
  }

  return (data.result?.[0]?.results || []) as T[];
}

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
