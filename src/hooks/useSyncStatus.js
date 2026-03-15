import { useState, useEffect } from 'react';
import { subscribe, getStatus, SYNC_AVAILABLE } from '../lib/syncManager.js';

/**
 * Reactive hook that returns the current Supabase sync status.
 * Updates whenever syncManager emits a status change.
 */
export function useSyncStatus() {
  const initial = getStatus();
  const [status,     setStatus]     = useState(initial.status);
  const [lastSyncAt, setLastSyncAt] = useState(initial.lastSyncAt);

  useEffect(() => {
    const unsubscribe = subscribe((s, t) => {
      setStatus(s);
      setLastSyncAt(t);
    });
    return unsubscribe;
  }, []);

  return { status, lastSyncAt, available: SYNC_AVAILABLE };
}
