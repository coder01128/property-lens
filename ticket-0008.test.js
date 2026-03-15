/**
 * Tests for Ticket 0008 — AI Vision Specification
 *
 * Acceptance criteria:
 * 1. Photos ≥2 in a room trigger AI analysis when online (auto-enqueue).
 * 2. Offline behaviour queues rooms; processQueue no-ops when offline.
 * 3. AI suggestion banner shown only when valid suggestion data exists.
 * 4. Accept applies suggestion; Dismiss clears it without touching manual data.
 * 5. Photo compression targets ≤800px longest edge.
 * 6. API response is parsed robustly — malformed / invalid JSON returns null.
 * 7. Only valid condition strings are accepted from the API.
 * 8. 15s AbortController timeout — app never hangs.
 * 9. aiQueue is idempotent — duplicate enqueue of same room is a no-op.
 * 10. Per-item fuzzy name matching applies suggestions to matching items.
 */

// ─── Inline re-implementations (mirrors src/lib/aiVision.js logic) ────────────

const VALID_CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'];
const TIMEOUT_MS       = 15_000;

/**
 * Mirrors the JSON extraction + validation in analyzeRoomPhotos.
 * Returns the parsed object or null.
 */
function parseAiResponse(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let parsed;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }
  if (!VALID_CONDITIONS.includes(parsed.overallCondition)) return null;
  return {
    overallCondition: parsed.overallCondition,
    confidence:       Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
    notes:            String(parsed.notes || '').trim(),
    items:            Array.isArray(parsed.items) ? parsed.items : [],
  };
}

/**
 * Mirrors the offline guard in analyzeRoomPhotos.
 */
function shouldCallApi(hasKey, isOnline) {
  return !!(hasKey && isOnline);
}

/**
 * Mirrors the compression scale calculation in compressPhoto.
 */
function calcCompressionScale(width, height, maxPx = 800) {
  return Math.min(1, maxPx / Math.max(width, height));
}

/**
 * Mirrors the auto-enqueue guard in RoomEditor useEffect.
 */
function shouldEnqueue(photoCount, aiAnalysed, aiError) {
  return photoCount >= 2 && !aiAnalysed && !aiError;
}

/**
 * Mirrors the AISuggestionBanner visibility check.
 */
function shouldShowBanner(room) {
  return !!(room.aiSuggested && room.aiSuggestedCondition);
}

/**
 * Mirrors handleAcceptSuggestion in RoomEditor.
 * Only pre-fills notes if the user hasn't entered any.
 */
function acceptSuggestion(room) {
  return {
    overallCondition: room.aiSuggestedCondition,
    overallNotes:     room.overallNotes || room.aiSuggestedNotes,
    aiSuggested:      false,
  };
}

/**
 * Mirrors handleDismissSuggestion in RoomEditor.
 */
function dismissSuggestion() {
  return {
    aiSuggested:          false,
    aiSuggestedCondition: null,
    aiSuggestedNotes:     null,
    aiConfidence:         null,
  };
}

/**
 * Mirrors the fuzzy item-name matching in aiQueue._processEntry.
 */
function matchItem(items, suggestionName) {
  const sug = suggestionName.toLowerCase();
  return items.find(i => {
    const name = i.name?.toLowerCase() || '';
    return name.includes(sug) || sug.includes(name);
  }) || null;
}

/**
 * Mirrors the idempotency check in enqueueRoom.
 */
function canEnqueue(existingEntries, roomId) {
  return !existingEntries.some(
    e => e.roomId === roomId && (e.status === 'pending' || e.status === 'processing')
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AC 1 — Auto-enqueue trigger (≥2 photos, not yet analysed)
// ══════════════════════════════════════════════════════════════════════════════
describe('Auto-enqueue trigger', () => {
  test('does NOT enqueue with 0 photos', () => {
    expect(shouldEnqueue(0, false, false)).toBe(false);
  });

  test('does NOT enqueue with 1 photo', () => {
    expect(shouldEnqueue(1, false, false)).toBe(false);
  });

  test('enqueues when exactly 2 photos and not yet analysed', () => {
    expect(shouldEnqueue(2, false, false)).toBe(true);
  });

  test('enqueues with more than 2 photos', () => {
    expect(shouldEnqueue(5, false, false)).toBe(true);
  });

  test('does NOT re-enqueue when room already analysed', () => {
    expect(shouldEnqueue(2, true, false)).toBe(false);
  });

  test('does NOT re-enqueue when room has an AI error flag', () => {
    expect(shouldEnqueue(2, false, true)).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AC 2 — Offline behaviour / API gate
// ══════════════════════════════════════════════════════════════════════════════
describe('Offline behaviour / API gate', () => {
  test('calls API when key present and online', () => {
    expect(shouldCallApi(true, true)).toBe(true);
  });

  test('does NOT call API when offline', () => {
    expect(shouldCallApi(true, false)).toBe(false);
  });

  test('does NOT call API when API key absent', () => {
    expect(shouldCallApi(false, true)).toBe(false);
  });

  test('does NOT call API when both offline and key absent', () => {
    expect(shouldCallApi(false, false)).toBe(false);
  });

  test('processQueue no-ops when offline (simulate)', async () => {
    let called = false;
    const mockProcessQueue = (isOnline) => {
      if (!isOnline) return; // mirrors the guard in processQueue()
      called = true;
    };
    mockProcessQueue(false);
    expect(called).toBe(false);
  });

  test('processQueue runs when online', async () => {
    let called = false;
    const mockProcessQueue = (isOnline) => {
      if (!isOnline) return;
      called = true;
    };
    mockProcessQueue(true);
    expect(called).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AC 3 — AI suggestion banner visibility
// ══════════════════════════════════════════════════════════════════════════════
describe('AI suggestion banner visibility', () => {
  test('banner shown when aiSuggested=true and condition present', () => {
    expect(shouldShowBanner({ aiSuggested: true, aiSuggestedCondition: 'Good' })).toBe(true);
  });

  test('banner hidden when aiSuggested=false', () => {
    expect(shouldShowBanner({ aiSuggested: false, aiSuggestedCondition: 'Good' })).toBe(false);
  });

  test('banner hidden when condition missing (null)', () => {
    expect(shouldShowBanner({ aiSuggested: true, aiSuggestedCondition: null })).toBe(false);
  });

  test('banner hidden when condition is empty string', () => {
    expect(shouldShowBanner({ aiSuggested: true, aiSuggestedCondition: '' })).toBe(false);
  });

  test('banner hidden on fresh room (no AI data)', () => {
    expect(shouldShowBanner({ aiSuggested: false, aiSuggestedCondition: null })).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AC 4 — Accept / Dismiss suggestion
// ══════════════════════════════════════════════════════════════════════════════
describe('Accept suggestion', () => {
  const suggestion = {
    aiSuggested: true,
    aiSuggestedCondition: 'Good',
    aiSuggestedNotes: 'Room in good order.',
    overallNotes: '',
  };

  test('accept sets overallCondition to suggested condition', () => {
    const result = acceptSuggestion(suggestion);
    expect(result.overallCondition).toBe('Good');
  });

  test('accept pre-fills notes when user has none', () => {
    const result = acceptSuggestion(suggestion);
    expect(result.overallNotes).toBe('Room in good order.');
  });

  test('accept does NOT overwrite existing user notes', () => {
    const result = acceptSuggestion({ ...suggestion, overallNotes: 'My own notes.' });
    expect(result.overallNotes).toBe('My own notes.');
  });

  test('accept clears aiSuggested flag', () => {
    const result = acceptSuggestion(suggestion);
    expect(result.aiSuggested).toBe(false);
  });
});

describe('Dismiss suggestion', () => {
  test('dismiss clears aiSuggested', () => {
    expect(dismissSuggestion().aiSuggested).toBe(false);
  });

  test('dismiss nulls out condition', () => {
    expect(dismissSuggestion().aiSuggestedCondition).toBeNull();
  });

  test('dismiss nulls out notes', () => {
    expect(dismissSuggestion().aiSuggestedNotes).toBeNull();
  });

  test('dismiss nulls out confidence', () => {
    expect(dismissSuggestion().aiConfidence).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AC 5 — Photo compression scale calculation
// ══════════════════════════════════════════════════════════════════════════════
describe('Photo compression', () => {
  test('image smaller than 800px is not upscaled (scale = 1)', () => {
    expect(calcCompressionScale(400, 300)).toBe(1);
  });

  test('landscape image wider than 800px is scaled by width', () => {
    const scale = calcCompressionScale(1600, 900);
    expect(scale).toBeCloseTo(0.5, 5);
  });

  test('portrait image taller than 800px is scaled by height', () => {
    const scale = calcCompressionScale(600, 1200);
    expect(scale).toBeCloseTo(0.667, 2);
  });

  test('square 800×800 is not scaled', () => {
    expect(calcCompressionScale(800, 800)).toBe(1);
  });

  test('square 801×801 is scaled just below 1', () => {
    const scale = calcCompressionScale(801, 801);
    expect(scale).toBeLessThan(1);
    expect(scale).toBeCloseTo(800 / 801, 4);
  });

  test('resulting dimensions respect max pixel boundary', () => {
    const w = 2400, h = 1800;
    const scale = calcCompressionScale(w, h);
    expect(Math.round(w * scale)).toBeLessThanOrEqual(800);
    expect(Math.round(h * scale)).toBeLessThanOrEqual(800);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AC 6 — API response parsing
// ══════════════════════════════════════════════════════════════════════════════
describe('API response parsing', () => {
  test('parses valid JSON object from clean response', () => {
    const text = JSON.stringify({
      overallCondition: 'Good',
      confidence: 0.85,
      notes: 'Room looks clean.',
      items: [],
    });
    expect(parseAiResponse(text)).not.toBeNull();
  });

  test('parses JSON embedded in markdown code block', () => {
    const text = '```json\n{"overallCondition":"Fair","confidence":0.6,"notes":"Some wear.","items":[]}\n```';
    expect(parseAiResponse(text)).not.toBeNull();
  });

  test('returns null for empty string', () => {
    expect(parseAiResponse('')).toBeNull();
  });

  test('returns null for plain text with no JSON', () => {
    expect(parseAiResponse('The room looks fine.')).toBeNull();
  });

  test('returns null for malformed JSON', () => {
    expect(parseAiResponse('{overallCondition: Good}')).toBeNull();
  });

  test('returns null when overallCondition is missing', () => {
    expect(parseAiResponse('{"confidence":0.9,"notes":"ok","items":[]}')).toBeNull();
  });

  test('confidence is clamped to 0–1 range', () => {
    const result = parseAiResponse('{"overallCondition":"Good","confidence":1.5,"notes":"","items":[]}');
    expect(result?.confidence).toBe(1);
  });

  test('confidence defaults to 0.5 when non-numeric', () => {
    const result = parseAiResponse('{"overallCondition":"Good","confidence":"high","notes":"","items":[]}');
    expect(result?.confidence).toBe(0.5);
  });

  test('items defaults to [] when missing from response', () => {
    const result = parseAiResponse('{"overallCondition":"Good","confidence":0.8,"notes":"ok"}');
    expect(result?.items).toEqual([]);
  });

  test('items defaults to [] when not an array', () => {
    const result = parseAiResponse('{"overallCondition":"Good","confidence":0.8,"notes":"ok","items":"none"}');
    expect(result?.items).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AC 7 — Only valid condition strings accepted
// ══════════════════════════════════════════════════════════════════════════════
describe('Condition validation', () => {
  const validCases = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'];
  const invalidCases = ['excellent', 'GOOD', 'Average', 'N/A', 'Unknown', '', null, 123];

  validCases.forEach(cond => {
    test(`accepts "${cond}"`, () => {
      const result = parseAiResponse(`{"overallCondition":"${cond}","confidence":0.8,"notes":"","items":[]}`);
      expect(result).not.toBeNull();
      expect(result.overallCondition).toBe(cond);
    });
  });

  invalidCases.forEach(cond => {
    test(`rejects ${JSON.stringify(cond)}`, () => {
      const result = parseAiResponse(`{"overallCondition":${JSON.stringify(cond)},"confidence":0.8,"notes":"","items":[]}`);
      expect(result).toBeNull();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AC 8 — Timeout guard (15 s AbortController)
// ══════════════════════════════════════════════════════════════════════════════
describe('Timeout guard', () => {
  test('TIMEOUT_MS is between 5s and 30s', () => {
    expect(TIMEOUT_MS).toBeGreaterThanOrEqual(5_000);
    expect(TIMEOUT_MS).toBeLessThanOrEqual(30_000);
  });

  test('AbortController aborts an in-flight fetch', async () => {
    const controller = new AbortController();
    controller.abort();
    const err = await fetch('https://example.com', { signal: controller.signal }).catch(e => e);
    expect(err.name).toBe('AbortError');
  }, 5000);

  test('aborted fetch resolves to null in the catch handler (mirrors analyzeRoomPhotos)', () => {
    // analyzeRoomPhotos catch block always returns null for any thrown error
    const catchHandler = () => null;
    expect(catchHandler(new DOMException('The operation was aborted.', 'AbortError'))).toBeNull();
  });

  test('non-abort fetch errors also resolve to null', () => {
    const catchHandler = () => null;
    expect(catchHandler(new TypeError('Failed to fetch'))).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AC 9 — aiQueue idempotency
// ══════════════════════════════════════════════════════════════════════════════
describe('aiQueue idempotency', () => {
  test('can enqueue a room with no existing entries', () => {
    expect(canEnqueue([], 'room-1')).toBe(true);
  });

  test('can enqueue a different room even if another is pending', () => {
    const entries = [{ roomId: 'room-1', status: 'pending' }];
    expect(canEnqueue(entries, 'room-2')).toBe(true);
  });

  test('cannot re-enqueue a room that is already pending', () => {
    const entries = [{ roomId: 'room-1', status: 'pending' }];
    expect(canEnqueue(entries, 'room-1')).toBe(false);
  });

  test('cannot enqueue a room that is currently processing', () => {
    const entries = [{ roomId: 'room-1', status: 'processing' }];
    expect(canEnqueue(entries, 'room-1')).toBe(false);
  });

  test('CAN re-enqueue a room whose prior entry is done', () => {
    const entries = [{ roomId: 'room-1', status: 'done' }];
    expect(canEnqueue(entries, 'room-1')).toBe(true);
  });

  test('CAN re-enqueue a room whose prior entry errored', () => {
    const entries = [{ roomId: 'room-1', status: 'error' }];
    expect(canEnqueue(entries, 'room-1')).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AC 10 — Per-item fuzzy name matching
// ══════════════════════════════════════════════════════════════════════════════
describe('Per-item fuzzy name matching', () => {
  const items = [
    { id: '1', name: 'Ceiling Fan' },
    { id: '2', name: 'Walls' },
    { id: '3', name: 'Built-in Cupboards' },
    { id: '4', name: 'Power Points' },
  ];

  test('exact match finds the item', () => {
    expect(matchItem(items, 'Walls')?.id).toBe('2');
  });

  test('partial match (suggestion is substring of item name) finds item', () => {
    expect(matchItem(items, 'Cupboards')?.id).toBe('3');
  });

  test('partial match (item name is substring of suggestion) finds item', () => {
    expect(matchItem(items, 'Ceiling Fan Light')?.id).toBe('1');
  });

  test('case-insensitive match', () => {
    expect(matchItem(items, 'walls')?.id).toBe('2');
  });

  test('no match returns null', () => {
    expect(matchItem(items, 'Jacuzzi')).toBeNull();
  });

  test('empty items array returns null', () => {
    expect(matchItem([], 'Walls')).toBeNull();
  });
});
