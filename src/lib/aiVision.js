/**
 * aiVision.js — Claude API integration for room photo analysis.
 *
 * PRD §5.1: Structured prompt → JSON response (condition, confidence, notes, items[]).
 * PRD §5.4: Compress photos to ≤800px before upload. Batch per room (up to 4 photos).
 * PRD §5.2: Returns null when offline or when API key is absent — caller queues for later.
 */

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY;
const MODEL         = 'claude-haiku-4-5-20251001';
const TIMEOUT_MS    = 15_000;
const MAX_PHOTOS    = 4;   // max overview photos per API call (cost control)
const MAX_PX        = 800; // longest-edge resize before upload
const JPEG_QUALITY  = 0.72;

/**
 * Compress a dataUrl to ≤MAX_PX on the longest edge at JPEG_QUALITY.
 * Returns the compressed dataUrl. Falls back to the original if canvas fails.
 */
export function compressPhoto(dataUrl, maxPx = MAX_PX, quality = JPEG_QUALITY) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width || maxPx, img.height || maxPx));
      const w = Math.max(1, Math.round(img.width  * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      try {
        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(dataUrl); // fallback — send original
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Analyse overview photos for a room.
 *
 * @param {Array<{dataUrl: string}>} photos  — overview photos (up to MAX_PHOTOS used)
 * @param {{roomType: string, inspectionType: string, itemNames: string[]}} context
 * @returns {Promise<{overallCondition, confidence, notes, items[]} | null>}
 *   Returns null when offline, API key absent, or on any error.
 */
export async function analyzeRoomPhotos(photos, context) {
  if (!ANTHROPIC_KEY || !navigator.onLine) return null;
  if (!photos?.length) return null;

  const batch = photos.slice(0, MAX_PHOTOS);

  // Compress all photos in parallel
  const compressed = await Promise.all(batch.map(p => compressPhoto(p.dataUrl)));

  // Build image content blocks
  const imageBlocks = compressed.map(dataUrl => ({
    type: 'image',
    source: {
      type:       'base64',
      media_type: 'image/jpeg',
      data:       dataUrl.replace(/^data:image\/\w+;base64,/, ''),
    },
  }));

  const knownItems = context.itemNames?.length
    ? `Pre-listed items to prioritise if visible: ${context.itemNames.join(', ')}.`
    : '';

  const promptText = `You are an experienced South African property inspector conducting a ${context.inspectionType} inspection.

Analyse the ${batch.length} overview photo(s) of this ${context.roomType} and return ONLY a valid JSON object — no markdown, no explanation:

{
  "overallCondition": "Excellent | Good | Fair | Poor | Damaged",
  "confidence": 0.0,
  "notes": "General condition summary (2-3 sentences covering overall state, cleanliness, any notable defects or wear)",
  "items": [
    { "name": "item name", "condition": "Excellent | Good | Fair | Poor | Damaged | N/A", "notes": "specific observation" }
  ]
}

Rules:
- overallCondition must be exactly one of: Excellent, Good, Fair, Poor, Damaged
- confidence is a float 0.0–1.0 reflecting how clearly the condition is visible in the photos
- notes must be a descriptive paragraph: overall room condition, cleanliness, visible wear, stains, damage, or outstanding features
- items[] must list EVERY distinct item or surface you can identify in the photos — walls, ceiling, floor, windows, doors, fixtures, furniture, fittings, appliances, etc. Do not limit to pre-listed items only
- For each item provide a specific observation in notes (e.g. "hairline crack on upper right corner", "stained grout between tiles")
- Items with no visible issues should still be listed with condition Excellent or Good
- ${knownItems}
- Use South African English spelling`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'x-api-key':     ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 1024,
        messages: [{
          role:    'user',
          content: [...imageBlocks, { type: 'text', text: promptText }],
        }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      const errMsg  = (() => { try { return JSON.parse(errBody)?.error?.message || errBody; } catch { return errBody; } })();
      throw new Error(`API ${res.status}: ${errMsg}`);
    }

    const data  = await res.json();
    const text  = data.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]);

    // Validate required fields
    const validConditions = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'];
    if (!validConditions.includes(parsed.overallCondition)) return null;

    return {
      overallCondition: parsed.overallCondition,
      confidence:       Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
      notes:            String(parsed.notes || '').trim(),
      items:            Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') return null; // timeout — retry later
    throw err; // propagate real errors (API 404, 401, etc.) to caller
  }
}
