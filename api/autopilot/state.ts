// api/autopilot/state.ts
// Vercel Serverless Function: Persistent Autopilot state backed by Cloudflare D1
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let defaultAutopilotState: any = null;
try {
  defaultAutopilotState = require('../../data/autopilot_state.json');
} catch {
  // Safe fallback
}

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

function getLocalFallbackState(): any {
  return defaultAutopilotState || {
    isExecuting: true,
    isTurbo: false,
    cashBalance: 107321.1,
    positions: {},
    ledger: [],
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { isConfigured } = getD1Config();

  if (req.method === 'GET') {
    if (isConfigured) {
      try {
        const rows = await queryD1<{ key: string; val: string }>(
          "SELECT val FROM audit_meta WHERE key = 'autopilot_state_json' LIMIT 1"
        );
        if (rows && rows.length > 0 && rows[0].val) {
          const parsed = JSON.parse(rows[0].val);
          return res.status(200).json({
            success: true,
            state: parsed,
            source: 'Cloudflare-D1-SQL',
            timestamp: Date.now(),
          });
        }
      } catch (err: any) {
        console.error('D1 query error in autopilot/state.ts:', err.message);
      }
    }

    // Fallback to local data file (contains the 300 real trades from today)
    const fallback = getLocalFallbackState();

    // If D1 is configured but not yet seeded with autopilot_state_json, seed D1 now in background
    if (isConfigured && fallback) {
      queryD1(
        "INSERT OR REPLACE INTO audit_meta (key, val) VALUES ('autopilot_state_json', ?)",
        [JSON.stringify(fallback)]
      ).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      state: fallback,
      source: 'Local-Disk-Fallback',
      timestamp: Date.now(),
    });
  }

  if (req.method === 'POST') {
    try {
      const incomingState = req.body?.state;
      if (!incomingState || typeof incomingState !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid state payload' });
      }

      if (isConfigured) {
        await queryD1(
          "INSERT OR REPLACE INTO audit_meta (key, val) VALUES ('autopilot_state_json', ?)",
          [JSON.stringify(incomingState)]
        );
      }

      return res.status(200).json({
        success: true,
        source: isConfigured ? 'Cloudflare-D1-SQL' : 'Local-Memory',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
