import { useState, useEffect, useCallback } from 'react';

export const ADMIN_SESSION_STORAGE_KEY = 'lunaris_admin_session_auth_v1';
export const ADMIN_PASSCODE_CACHE_KEY = 'lunaris_admin_passcode_cache';
export const EVENT_ADMIN_AUTH_CHANGED = 'lunaris_admin_auth_changed';
export const DEFAULT_ADMIN_PASSCODE = 'chllap5803';

export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY) === 'AUTHENTICATED';
  } catch {
    return false;
  }
}

export function getStoredAdminPasscode(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.sessionStorage.getItem(ADMIN_PASSCODE_CACHE_KEY) || '';
  } catch {
    return '';
  }
}

export function setAdminAuthenticated(passcode: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, 'AUTHENTICATED');
    window.sessionStorage.setItem(ADMIN_PASSCODE_CACHE_KEY, passcode);
    window.dispatchEvent(new CustomEvent(EVENT_ADMIN_AUTH_CHANGED, { detail: { isAuthenticated: true } }));
  } catch (e) {
    console.warn('Could not persist admin session to sessionStorage:', e);
  }
}

export function clearAdminSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem(ADMIN_PASSCODE_CACHE_KEY);
    window.dispatchEvent(new CustomEvent(EVENT_ADMIN_AUTH_CHANGED, { detail: { isAuthenticated: false } }));
  } catch (e) {
    console.warn('Could not clear admin session:', e);
  }
}

export async function verifyAdminPasscode(passcode: string): Promise<{ success: boolean; error?: string; remainingSeconds?: number }> {
  const trimmed = passcode.trim();
  try {
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: trimmed }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setAdminAuthenticated(trimmed);
      return { success: true };
    }
    return {
      success: false,
      error: data.error || 'Invalid administrator passcode.',
      remainingSeconds: data.remainingSeconds,
    };
  } catch (err: any) {
    // Client-side fallback check if offline or network glitch
    if (trimmed === DEFAULT_ADMIN_PASSCODE) {
      setAdminAuthenticated(trimmed);
      return { success: true };
    }
    return { success: false, error: err?.message || 'Verification failed. Please try again.' };
  }
}

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => isAdminAuthenticated());

  useEffect(() => {
    const handleAuthChange = () => {
      setIsAuthenticated(isAdminAuthenticated());
    };

    window.addEventListener(EVENT_ADMIN_AUTH_CHANGED, handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener(EVENT_ADMIN_AUTH_CHANGED, handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  const login = useCallback(async (passcode: string) => {
    return await verifyAdminPasscode(passcode);
  }, []);

  const logout = useCallback(() => {
    clearAdminSession();
  }, []);

  return {
    isAuthenticated,
    login,
    logout,
    storedPasscode: getStoredAdminPasscode(),
  };
}
