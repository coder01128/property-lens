/**
 * SyncStatusBar — thin strip shown at the top of AppShell (PRD §7.3).
 * Displays connectivity and Supabase sync status.
 * Hidden when: online + idle/unavailable (no news is good news).
 */
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { useSyncStatus }   from '../hooks/useSyncStatus.js';

export default function SyncStatusBar() {
  const online           = useOnlineStatus();
  const { status }       = useSyncStatus();

  // Nothing to show in the happy path
  if (online && (status === 'idle' || status === 'unavailable')) return null;

  let text, cls;

  if (!online) {
    text = '● Offline — changes saved locally';
    cls  = 'bg-gray-100 dark:bg-surface-raised text-gray-500 dark:text-gray-400';
  } else if (status === 'syncing') {
    text = '↻ Syncing…';
    cls  = 'bg-gold/10 text-gold';
  } else if (status === 'synced') {
    text = '✓ Synced';
    cls  = 'bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400';
  } else if (status === 'error') {
    text = '⚠ Sync error — will retry on next connection';
    cls  = 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400';
  } else {
    return null;
  }

  return (
    <div
      className={`w-full text-center py-1.5 text-xs font-medium leading-none ${cls}`}
      role="status"
      aria-live="polite"
    >
      {text}
    </div>
  );
}
