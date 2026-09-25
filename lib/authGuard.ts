/**
 * LUNARIS Operator Cryptographic Authorization Guard
 * Enforces SHA-256 authentication for sensitive operator commands (e.g. pausing the autoloop).
 * Zero plaintext credentials stored in source code.
 */

// SHA-256 hash of authorized operator credentials in normalized lowercase
export const OPERATOR_AUTH_SHA256 = '707d4f71bb4f95df798701a5141d52ce3c8b512c0361ce874a4b215ecf76e1b0';

/**
 * Computes SHA-256 hex string using Web Crypto API in browser
 */
export async function computeSha256Hex(value: string): Promise<string> {
  const normalized = (value || '').trim().toLowerCase();
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(normalized);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * Verifies whether an entered passcode matches authorized operator credentials.
 * Evaluates in case-insensitive format (capital or small).
 */
export async function verifyOperatorPasscode(passcode: string): Promise<boolean> {
  const clean = (passcode || '').trim().toLowerCase();
  if (!clean) return false;

  // 1. Check optional custom override stored in localStorage
  if (typeof window !== 'undefined') {
    try {
      const customKey = (localStorage.getItem('LUNARIS_ADMIN_PASSCODE') || '').trim().toLowerCase();
      if (customKey && clean === customKey) {
        return true;
      }
    } catch {}
  }

  // 2. Client-side SHA-256 validation (zero plaintext in bundle)
  try {
    const hex = await computeSha256Hex(clean);
    if (hex === OPERATOR_AUTH_SHA256) {
      return true;
    }
  } catch {}

  // 3. Server verification endpoint fallback
  try {
    const res = await fetch('/api/audit/verify-pause-passcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: clean }),
    });
    if (res.ok) {
      const payload = await res.json();
      if (payload?.verified === true) {
        return true;
      }
    }
  } catch {}

  return false;
}
