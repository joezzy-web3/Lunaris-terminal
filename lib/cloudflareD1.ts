/**
 * Cloudflare D1 SQL Client
 * Provides high-speed relational queries to SQLite database on Cloudflare edge.
 */

export interface D1TradeRow {
  id: string;
  seq: number;
  timestamp: string;
  instrument: string;
  direction: string;
  price: number;
  entry_price: number;
  exit_price: number;
  quantity: number;
  leverage: number;
  fee: number;
  slippage: number;
  gross_pnl: number;
  net_pnl: number;
  account_balance: number;
  status: string;
  trigger_reason: string;
}

export function getD1Credentials() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'de6f32420d2021b88ca16405c61f4154';
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID || 'eb00f7eb-1d17-40cc-99e7-2a1c548853ba';
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
  return { accountId, databaseId, apiToken };
}

export async function executeD1Query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const { accountId, databaseId, apiToken } = getD1Credentials();
  if (!accountId || !databaseId || !apiToken) {
    throw new Error('Missing Cloudflare D1 credentials');
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sql,
      params,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare D1 query failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(`Cloudflare D1 returned error: ${JSON.stringify(data.errors)}`);
  }

  return (data.result?.[0]?.results || []) as T[];
}

export async function executeD1Batch(queries: { sql: string; params?: any[] }[]): Promise<any[]> {
  const { accountId, databaseId, apiToken } = getD1Credentials();
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  const results: any[] = [];
  // Run queries in sequential chunks of 10 to respect D1 limits
  for (const q of queries) {
    const res = await executeD1Query(q.sql, q.params || []);
    results.push(res);
  }
  return results;
}
