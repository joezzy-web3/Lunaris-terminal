import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Silence internal Firestore stream retry/backoff logs (e.g. max backoff delay on quota limit)
try {
  setLogLevel('silent');
} catch {}

// Initialize or reuse Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with the provisioned databaseId
export const db: Firestore = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || '(default)'
);

// Graceful console error interceptor to catch and silence Firebase free-tier quota exhaustion noise
if (typeof window !== 'undefined') {
  const origConsoleError = console.error;
  console.error = (...args: any[]) => {
    try {
      const fullMsg = args
        .map((a) => (typeof a === 'string' ? a : a?.message || (typeof a === 'object' ? JSON.stringify(a) : String(a))))
        .join(' ');

      if (
        fullMsg.includes('resource-exhausted') ||
        fullMsg.includes('Quota limit exceeded') ||
        fullMsg.includes('Quota exceeded for quota metric') ||
        fullMsg.includes('Free daily write units per project') ||
        fullMsg.includes('Using maximum backoff delay to prevent overloading')
      ) {
        // Dynamically flag quota exhaustion in memory & localStorage without printing ugly red stacks
        import('./firestoreAudit')
          .then(({ flagFirestoreQuotaExceeded }) => {
            flagFirestoreQuotaExceeded({ message: 'Free daily write quota exceeded on Spark Plan' });
          })
          .catch(() => {});

        console.warn(
          '🛡️ [Firestore Safe Mode] Free-tier daily write units reached (Spark Plan). Operations seamlessly routed to persistent local & server ledger.'
        );
        return;
      }
    } catch {}
    origConsoleError.apply(console, args);
  };
}

export default app;

