# Ticket 0010 — Implement Offline-First Architecture

## Goal
Ensure the app functions fully offline and syncs to Supabase when connectivity returns,
as specified in PRD section 7. All core inspection features must work without internet.

## PRD Alignment (§7)

### §7.1 — What Works Offline (all already working via Dexie)
Creating inspections, adding rooms/items, capturing photos, rating conditions, generating
PDFs, viewing saved inspections, capturing signatures. **No changes needed.**

### §7.2 — What Requires Connectivity
AI vision (queued — already implemented), Google Places (fallback — already implemented),
Supabase sync, report sharing via web link (Phase 2).

### §7.3 — Sync Strategy
- AI queue drains on reconnect — **already implemented in main.jsx + aiQueue.js**
- Local data (properties + inspections) syncs to Supabase on reconnect
- **Conflict resolution: last-write-wins with local priority**
  - Push: records where `updatedAt > syncedAt` (or `syncedAt` is null) are upserted to Supabase
  - `syncedAt` is updated on successful push
  - Pull (Phase 2 — multi-device sync)
- **Sync status indicator visible in app** (PRD §7.3, thin bar in AppShell)
- Rooms/items/photos sync → **Phase 2** (too large; metadata-only for MVP)

### PWA Caching
Service worker upgraded to cache app shell on install; cache-first for `/assets/**`;
network-first with SPA fallback for navigation. Enables true offline cold start.

## Acceptance Criteria
- ✅ Connectivity state (`online`/`offline`) reactive in UI.
- ✅ `syncManager.js` pushes un-synced properties + inspections to Supabase on reconnect.
- ✅ Conflict resolution: local updatedAt wins (last-write-wins, local priority).
- ✅ `SyncStatusBar` in AppShell: Offline · Syncing · Synced · Error states.
- ✅ Service worker pre-caches app shell; assets served from cache offline.
- ✅ All features work without internet (Supabase gated on env var).

## Tasks
- [x] Create `src/hooks/useOnlineStatus.js`
- [x] Create `src/lib/syncManager.js` (Supabase gated on VITE_SUPABASE_URL)
- [x] Create `src/hooks/useSyncStatus.js`
- [x] Create `src/components/SyncStatusBar.jsx`
- [x] Update `src/components/layout/AppShell.jsx`
- [x] Upgrade `public/sw.js` (cache-first assets + SPA fallback)
- [x] Update `src/main.jsx` — trigger `syncAll` on reconnect

## Out of Scope (Phase 2)
- Rooms, items, and photos sync to Supabase (chunked upload).
- Pull sync / multi-device conflict resolution.
- Push notifications when sync completes.
- Supabase real-time subscriptions.
