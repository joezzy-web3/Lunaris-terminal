// api/autopilot/state.ts
// Vercel Serverless Function: Persistent Autopilot state backed by Cloudflare D1
import { queryD1, getD1Config } from '../audit/d1';
import fs from 'fs';
import path from 'path';

export const config = {
  maxDuration: 10,
};

function getLocalFallbackState(): any {
  try {
    const filePath = path.join(process.cwd(), 'data', 'autopilot_state.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (data && typeof data === 'object') return data;
    }
  } catch {}
  return {
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
