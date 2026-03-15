/**
 * aiQueue.js — Offline-first AI analysis queue.
 *
 * PRD §5.2: Inspector completes inspection fully offline.
 * Photos/rooms are queued locally. When connectivity returns, queue drains automatically.
 */

import db from '../db/index.js';
import { analyzeRoomPhotos } from './aiVision.js';
import { ROOM_PRESETS, SPECIAL_ROOMS } from './roomPresets.js';
import { getAiEnabled } from './preferences.js';

let _processing = false; // prevent concurrent processQueue calls

/**
 * Add a room to the AI analysis queue (idempotent — skips if already pending/processing).
 * No-ops when the user has disabled AI analysis in Settings.
 */
export async function enqueueRoom(inspectionId, roomId) {
  if (!getAiEnabled()) return;
  const existing = await db.aiQueue
    .where('roomId').equals(roomId)
    .filter(e => e.status === 'pending' || e.status === 'processing')
    .first();

  if (existing) return; // already queued

  const now = new Date().toISOString();
  await db.aiQueue.put({
    id:           crypto.randomUUID(),
    inspectionId, roomId,
    photoId:      null, // room-level entry, not per-photo
    status:       'pending',
    result:       null,
    error:        null,
    createdAt:    now,
    updatedAt:    now,
  });
}

/**
 * Process all pending queue entries.
 * Called on mount and whenever the device comes online.
 * No-ops if offline or already running.
 */
export async function processQueue() {
  if (!navigator.onLine || _processing) return;
  _processing = true;

  try {
    const pending = await db.aiQueue.where('status').equals('pending').toArray();
    for (const entry of pending) {
      await _processEntry(entry);
    }
  } finally {
    _processing = false;
  }
}

async function _processEntry(entry) {
  const now = () => new Date().toISOString();

  // Mark as processing
  await db.aiQueue.update(entry.id, { status: 'processing', updatedAt: now() });

  try {
    const [room, inspection] = await Promise.all([
      db.rooms.get(entry.roomId),
      db.inspections.get(entry.inspectionId),
    ]);

    if (!room || !inspection) {
      await db.aiQueue.update(entry.id, { status: 'error', error: 'Room or inspection not found', updatedAt: now() });
      return;
    }

    // Fetch overview photos for this room
    const photos = await db.photos
      .where('roomId').equals(entry.roomId)
      .filter(p => p.role === 'overview')
      .toArray();

    if (photos.length === 0) {
      await db.aiQueue.update(entry.id, { status: 'done', updatedAt: now() });
      return;
    }

    // Fetch items for context
    const items = await db.items.where('roomId').equals(entry.roomId).sortBy('sortOrder');

    // Resolve room preset label
    const preset = [...ROOM_PRESETS, ...SPECIAL_ROOMS].find(r => r.typeKey === room.typeKey);

    const result = await analyzeRoomPhotos(photos, {
      roomType:      preset?.label || room.displayName,
      inspectionType: inspection.type === 'check-in' ? 'Check-In' : 'Check-Out',
      itemNames:     items.filter(i => i.name?.trim()).map(i => i.name),
    });

    if (result) {
      // Store suggestion on the room record
      await db.rooms.update(entry.roomId, {
        aiSuggested:          true,
        aiSuggestedCondition: result.overallCondition,
        aiSuggestedNotes:     result.notes,
        aiConfidence:         result.confidence,
        aiAnalysed:           true,
        aiError:              false,
        aiErrorMsg:           null,
        updatedAt:            now(),
      });

      // Apply per-item suggestions (fuzzy name match)
      if (result.items?.length) {
        for (const suggestion of result.items) {
          const sugName = suggestion.name?.toLowerCase() || '';
          const match   = items.find(i => i.name?.toLowerCase().includes(sugName) || sugName.includes(i.name?.toLowerCase() || ''));
          if (match && suggestion.condition) {
            await db.items.update(match.id, {
              aiSuggested:          true,
              aiSuggestedCondition: suggestion.condition,
              aiSuggestedNotes:     suggestion.notes || '',
              updatedAt:            now(),
            });
          }
        }
      }

      // Mark photos as processed
      for (const photo of photos) {
        await db.photos.update(photo.id, { aiProcessedAt: now() });
      }
    } else {
      // AI returned null — surface as an error so the user can see it
      const msg = !import.meta.env.VITE_ANTHROPIC_KEY
        ? 'No API key configured (VITE_ANTHROPIC_KEY)'
        : 'AI returned no result — check API key or network';
      await db.aiQueue.update(entry.id, { status: 'error', error: msg, updatedAt: now() });
      await db.rooms.update(entry.roomId, {
        aiError: true, aiErrorMsg: msg, aiAnalysed: true, updatedAt: now(),
      });
      return;
    }

    await db.aiQueue.update(entry.id, {
      status:    'done',
      result:    JSON.stringify(result),
      updatedAt: now(),
    });
  } catch (err) {
    console.warn('[aiQueue] processEntry failed:', err.message);
    await db.aiQueue.update(entry.id, { status: 'error', error: err.message, updatedAt: now() });
    await db.rooms.update(entry.roomId, {
      aiError:    true,
      aiErrorMsg: err.message,
      aiAnalysed: true,
      updatedAt:  now(),
    });
  }
}
