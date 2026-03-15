# Ticket 0008 — Implement AI Vision Specification

## Goal
Integrate AI vision for condition assessment using Claude API (claude-haiku), with offline queue
management as specified in section 5 of the PRD. Agent always has final authority — AI is
advisory only.

## PRD Alignment (§5)

### §5.1 — How It Works
1. Inspection photos are analysed by Claude API with room/item context.
2. API returns suggested condition rating + descriptive notes + confidence score.
3. Suggestion appears as a pre-filled banner in RoomEditor (confirm / dismiss).
4. **Agent always has final authority.** Suggestions are clearly labelled "AI Suggestion".

### §5.2 — Offline Behaviour
1. Inspector completes inspection fully offline using manual ratings.
2. Photos are queued locally in the `aiQueue` Dexie table.
3. When connectivity returns, the queue drains automatically (online event listener).
4. Reports can be generated at any time with or without AI suggestions.

### §5.3 — Prompt Structure
- Context sent: room type, inspection type (check-in/check-out), known item names.
- API returns structured JSON: `{ overallCondition, confidence, notes, items[] }`.
- Per-item suggestions matched by name to existing items in the room.

### §5.4 — Cost Management (MVP scope)
- **Batch photos per room** — one API call per room (up to 4 overview photos), not per photo.
- **Photo compression** — canvas resize to ≤800px longest edge, JPEG q=0.72 before upload.
- Credit tiers (Free/Solo/Pro limits) are **Phase 2** — not implemented in this ticket.

## Acceptance Criteria
- ✅ Photos ≥2 in a room trigger AI analysis when online.
- ✅ Offline behaviour queues rooms for later processing; drains on reconnect.
- ✅ AI suggestion banner in RoomEditor: labelled, shows condition + confidence + notes.
- ✅ Accept applies suggestion to room overallCondition + overallNotes (and matching items).
- ✅ Dismiss clears suggestion without affecting manually-entered data.
- ✅ Photos compressed to ≤800px before upload (cost management).
- ✅ Batched per room — one API call per room regardless of photo count.
- ✅ 15s AbortController timeout — app never hangs on slow connections.

## Tasks
- [x] Create `src/lib/aiVision.js` — photo compression + Claude API call.
- [x] Create `src/lib/aiQueue.js` — queue management (enqueue, process, drain on reconnect).
- [x] Update `RoomEditor` — auto-enqueue when ≥2 photos, show AISuggestionBanner.
- [x] Update `main.jsx` — online event listener to drain queue on reconnect.

## Out of Scope (Phase 2)
- Credit tracking and per-tier limits.
- AI toggle per inspection (basic version already exists from Ticket 0005 on old monolith).
- Server-side API proxy (key currently in client env var — security risk flagged).

## Testing
- Add ≥2 overview photos to a room while online → banner appears with suggestion.
- Go offline, add photos → room queued; go online → queue drains automatically.
- Accept suggestion → condition/notes fields update.
- Dismiss → suggestion cleared, manual data unchanged.
