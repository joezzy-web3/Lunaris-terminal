// api/audit/d1.ts
// Direct Cloudflare D1 integration for Vercel serverless functions

export function getD1Config() {
  return {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || 'de6f32420d2021b88ca16405c61f4154',
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID || 'eb00f7eb-1d17-40cc-99e7-2a1c548853ba',
    apiToken: process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN,
  };
}

export async function queryD1<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const { accountId, databaseId, apiToken } = getD1Config();
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

export async function saveTradeToD1(t: any): Promise<void> {
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

  await queryD1(sql, params);
  await queryD1(
    `INSERT OR REPLACE INTO audit_meta (key, val) VALUES ('total_trades', ?), ('current_balance', ?), ('last_updated', ?)`,
    [String(t.auditSeq), String(t.accountBalance), new Date().toISOString()]
  );
}
