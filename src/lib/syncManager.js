/**
 * syncManager.js — Supabase sync for offline-first data (PRD §7.3).
 *
 * Strategy: last-write-wins with local priority.
 *   - Push: local records where updatedAt > syncedAt (or syncedAt is null)
 *           are upserted to Supabase. syncedAt is updated on success.
 *   - Pull / multi-device sync → Phase 2.
 *
 * All sync functionality is gated on VITE_SUPABASE_URL being set.
 * When not configured, the module is a no-op and status stays 'unavailable'.
 *
 * Synced tables (MVP): properties, inspections
 * Deferred (Phase 2): rooms, items, photos (too large, need chunked upload)
 */

import { createClient } from '@supabase/supabase-js';
import db from '../db/index.js';

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const SYNC_AVAILABLE = !!(SB_URL && SB_KEY);

// ─── Status management ──────────────────────────────────────────────────────
// 'unavailable' | 'idle' | 'syncing' | 'synced' | 'offline' | 'error'

let _status     = SYNC_AVAILABLE ? 'idle' : 'unavailable';
let _lastSyncAt = null;
let _syncing    = false;

const _listeners = new Set();

function _setStatus(s) {
  _status = s;
  _listeners.forEach(fn => fn(_status, _lastSyncAt));
}

/** Subscribe to status changes. Returns an unsubscribe function. */
export function subscribe(fn) {
  _listeners.add(fn);
  fn(_status, _lastSyncAt); // fire immediately with current state
  return () => _listeners.delete(fn);
}

export function getStatus() {
  return { status: _status, lastSyncAt: _lastSyncAt };
}

// ─── Supabase client (lazy) ─────────────────────────────────────────────────
let _client = null;

function _getClient() {
  if (!_client && SYNC_AVAILABLE) {
    _client = createClient(SB_URL, SB_KEY);
  }
  return _client;
}

// ─── Sync logic ─────────────────────────────────────────────────────────────

/**
 * Push un-synced local records (properties + inspections) to Supabase.
 * No-op if offline, not configured, or already running.
 */
export async function syncAll() {
  if (!SYNC_AVAILABLE) return;

  if (!navigator.onLine) {
    _setStatus('offline');
    return;
  }

  if (_syncing) return;
  _syncing = true;
  _setStatus('syncing');

  try {
    await _pushTable('properties');
    await _pushTable('inspections');

    _lastSyncAt = new Date().toISOString();
    _setStatus('synced');
    // Auto-clear the "synced" badge after 3 seconds
    setTimeout(() => { if (_status === 'synced') _setStatus('idle'); }, 3_000);
  } catch (err) {
    console.warn('[sync] Push failed:', err.message);
    _setStatus('error');
  } finally {
    _syncing = false;
  }
}

async function _pushTable(tableName) {
  const all     = await db[tableName].toArray();
  // Records that have never been synced, or were updated after last sync
  const pending = all.filter(r => !r.syncedAt || r.updatedAt > r.syncedAt);

  if (pending.length === 0) return;

  const supabase = _getClient();
  const { error } = await supabase
    .from(tableName)
    .upsert(pending, { onConflict: 'id' });

  if (error) throw new Error(`${tableName}: ${error.message}`);

  // Mark records as synced
  const now = new Date().toISOString();
  await Promise.all(
    pending.map(r => db[tableName].update(r.id, { syncedAt: now }))
  );
}
