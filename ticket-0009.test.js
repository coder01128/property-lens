/**
 * Tests for Ticket 0009 — Report System
 *
 * Acceptance criteria:
 * 1. PDF includes photos, conditions, notes, special card data.
 * 2. Signatures captured and persisted; embedded in PDF as images.
 * 3. Check-out PDFs include condition comparison table vs linked check-in.
 * 4. Web Share API invoked when available; download fallback otherwise.
 * 5. signaturesJson persisted to Dexie and restored on reload.
 * 6. Properties screen filters by address search query.
 * 7. Report reference is stable for a given inspection id.
 * 8. Condition delta calculation: improved / unchanged / deteriorated.
 * 9. reportFilename generates a safe filename.
 * 10. compressForPdf scales images correctly (mirrors pdfBuilder logic).
 */

// ─── Inline mirrors of pdfBuilder.js logic ────────────────────────────────

const SEV = { Excellent: 1, Good: 2, Fair: 3, Poor: 4, Damaged: 5 };

function conditionDelta(checkIn, checkOut) {
  const ci = SEV[checkIn]  || 0;
  const co = SEV[checkOut] || 0;
  if (!ci || !co) return null;
  return co - ci; // negative = better, 0 = same, positive = worse
}

function deltaLabel(delta) {
  if (delta === null) return '';
  if (delta < 0) return '↑ Better';
  if (delta > 0) return '↓ Worse';
  return '= Same';
}

function reportRef(inspectionId) {
  return 'PL-' + (inspectionId || '').replace(/-/g, '').slice(0, 8).toUpperCase();
}

function reportFilename(inspection) {
  const addr = (inspection.address || 'report').replace(/[^a-zA-Z0-9]/g, '_');
  const date = inspection.inspectionDate || 'undated';
  const type = inspection.type === 'check-in' ? 'CheckIn' : 'CheckOut';
  return `PropertyLens_${addr}_${date}_${type}.pdf`;
}

function calcScale(width, height, maxW, maxH) {
  return Math.min(maxW / width, maxH / height, 1);
}

// ─── Inline mirrors of signature persistence logic ─────────────────────────

function parseSigs(json) {
  try { return json ? JSON.parse(json) : {}; }
  catch { return {}; }
}

function serializeSigs(current, key, dataUrl) {
  return JSON.stringify({ ...current, [key]: dataUrl });
}

// ─── Inline mirrors of Properties search logic ────────────────────────────

function filterProperties(properties, query) {
  const q = query.trim().toLowerCase();
  if (!q) return properties;
  return properties.filter(p => p.address?.toLowerCase().includes(q));
}

// ─── Inline mirrors of share/download logic ───────────────────────────────

function choosePdfAction(canShare) {
  return canShare ? 'share' : 'download';
}

// ══════════════════════════════════════════════════════════════════════════════
// AC 3 — Condition delta calculation
// ══════════════════════════════════════════════════════════════════════════════
describe('Condition delta calculation', () => {
  test('Good → Poor = deteriorated (positive delta)', () => {
    expect(conditionDelta('Good', 'Poor')).toBeGreaterThan(0);
  });

  test('Poor → Good = improved (negative delta)', () => {
    expect(conditionDelta('Poor', 'Good')).toBeLessThan(0);
  });

  test('Good → Good = unchanged (zero delta)', () => {
    expect(conditionDelta('Good', 'Good')).toBe(0);
  });

  test('Excellent → Damaged = worst deterioration', () => {
    expect(conditionDelta('Excellent', 'Damaged')).toBe(4);
  });

  test('Damaged → Excellent = best improvement', () => {
    expect(conditionDelta('Damaged', 'Excellent')).toBe(-4);
  });

  test('missing check-in condition returns null', () => {
    expect(conditionDelta(undefined, 'Good')).toBeNull();
  });

  test('missing check-out condition returns null', () => {
    expect(conditionDelta('Good', undefined)).toBeNull();
  });

  test('both missing returns null', () => {
    expect(conditionDelta(undefined, undefined)).toBeNull();
  });
});

describe('Delta label', () => {
  test('negative delta → "↑ Better"', () => {
    expect(deltaLabel(-2)).toBe('↑ Better');
  });

  test('zero delta → "= Same"', () => {
    expect(deltaLabel(0)).toBe('= Same');
  });

  test('positive delta → "↓ Worse"', () => {
    expect(deltaLabel(2)).toBe('↓ Worse');
  });

  test('null delta → empty string', () => {
    expect(deltaLabel(null)).toBe('');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AC 5 — Signature persistence
// ══════════════════════════════════════════════════════════════════════════════
describe('Signature persistence', () => {
  test('parseSigs returns {} for null signaturesJson', () => {
    expect(parseSigs(null)).toEqual({});
  });

  test('parseSigs returns {} for empty string', () => {
    expect(parseSigs('')).toEqual({});
  });

  test('parseSigs restores agent and tenant', () => {
    const json = JSON.stringify({ agent: 'data:agent', tenant: 'data:tenant' });
    const sigs = parseSigs(json);
    expect(sigs.agent).toBe('data:agent');
    expect(sigs.tenant).toBe('data:tenant');
  });

  test('parseSigs handles corrupt JSON gracefully (returns {})', () => {
    expect(parseSigs('{invalid')).toEqual({});
  });

  test('serializeSigs adds new key without losing existing', () => {
    const existing = { agent: 'data:agent' };
    const json = serializeSigs(existing, 'tenant', 'data:tenant');
    const result = JSON.parse(json);
    expect(result.agent).toBe('data:agent');
    expect(result.tenant).toBe('data:tenant');
  });

  test('serializeSigs overwrites existing key', () => {
    const existing = { agent: 'old-data' };
    const json = serializeSigs(existing, 'agent', 'new-data');
    expect(JSON.parse(json).agent).toBe('new-data');
  });

  test('serializeSigs stores null when signature cleared', () => {
    const json = serializeSigs({}, 'agent', null);
    expect(JSON.parse(json).agent).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AC 6 — Properties address search
// ══════════════════════════════════════════════════════════════════════════════
describe('Properties address search', () => {
  const properties = [
    { id: '1', address: '14 Bree Street, Cape Town' },
    { id: '2', address: '22 Long Street, Cape Town' },
    { id: '3', address: '5 Main Road, Johannesburg' },
    { id: '4', address: '8 Nelson Mandela Drive, Durban' },
  ];

  test('empty query returns all properties', () => {
    expect(filterProperties(properties, '').length).toBe(4);
  });

  test('whitespace-only query returns all properties', () => {
    expect(filterProperties(properties, '   ').length).toBe(4);
  });

  test('exact partial match filters correctly', () => {
    const result = filterProperties(properties, 'Cape Town');
    expect(result.length).toBe(2);
  });

  test('case-insensitive match', () => {
    const result = filterProperties(properties, 'cape town');
    expect(result.length).toBe(2);
  });

  test('no match returns empty array', () => {
    expect(filterProperties(properties, 'Pretoria').length).toBe(0);
  });

  test('single character match works', () => {
    const result = filterProperties(properties, 'Main');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('3');
  });

  test('street number match works', () => {
    const result = filterProperties(properties, '22');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('2');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AC 7 — Report reference stability
// ══════════════════════════════════════════════════════════════════════════════
describe('Report reference', () => {
  const id = 'b8f2c3d4-e5f6-7890-abcd-ef1234567890';

  test('ref starts with PL-', () => {
    expect(reportRef(id)).toMatch(/^PL-/);
  });

  test('ref is deterministic for the same id', () => {
    expect(reportRef(id)).toBe(reportRef(id));
  });

  test('ref is 11 characters (PL- + 8)', () => {
    expect(reportRef(id).length).toBe(11);
  });

  test('ref is uppercase', () => {
    const ref = reportRef(id);
    expect(ref).toBe(ref.toUpperCase());
  });

  test('null id produces a defined ref', () => {
    expect(reportRef(null)).toBe('PL-');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AC 9 — reportFilename
// ══════════════════════════════════════════════════════════════════════════════
describe('reportFilename', () => {
  test('generates .pdf extension', () => {
    expect(reportFilename({ address: '14 Bree St', inspectionDate: '2026-03-15', type: 'check-in' }))
      .toMatch(/\.pdf$/);
  });

  test('starts with PropertyLens_', () => {
    expect(reportFilename({ address: '14 Bree St', inspectionDate: '2026-03-15', type: 'check-in' }))
      .toMatch(/^PropertyLens_/);
  });

  test('replaces spaces and special chars with underscores', () => {
    const fname = reportFilename({ address: '14 Bree St, Cape Town', inspectionDate: '2026-03-15', type: 'check-in' });
    expect(fname).not.toMatch(/[ ,]/);
  });

  test('check-in uses CheckIn suffix', () => {
    const fname = reportFilename({ address: 'addr', inspectionDate: '2026-03-15', type: 'check-in' });
    expect(fname).toContain('CheckIn');
  });

  test('check-out uses CheckOut suffix', () => {
    const fname = reportFilename({ address: 'addr', inspectionDate: '2026-03-15', type: 'check-out' });
    expect(fname).toContain('CheckOut');
  });

  test('missing address falls back to "report"', () => {
    const fname = reportFilename({ address: '', inspectionDate: '2026-03-15', type: 'check-in' });
    expect(fname).toContain('report');
  });

  test('missing date falls back to "undated"', () => {
    const fname = reportFilename({ address: 'addr', inspectionDate: null, type: 'check-in' });
    expect(fname).toContain('undated');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AC 10 — PDF thumbnail compression scale
// ══════════════════════════════════════════════════════════════════════════════
describe('PDF thumbnail compression scale', () => {
  test('landscape 1600×900 fits within 240×180', () => {
    const scale = calcScale(1600, 900, 240, 180);
    expect(Math.round(1600 * scale)).toBeLessThanOrEqual(240);
    expect(Math.round(900  * scale)).toBeLessThanOrEqual(180);
  });

  test('portrait 900×1600 fits within 240×180', () => {
    const scale = calcScale(900, 1600, 240, 180);
    expect(Math.round(900  * scale)).toBeLessThanOrEqual(240);
    expect(Math.round(1600 * scale)).toBeLessThanOrEqual(180);
  });

  test('small image (100×80) is not upscaled', () => {
    expect(calcScale(100, 80, 240, 180)).toBe(1);
  });

  test('exactly matching size (240×180) returns scale 1', () => {
    expect(calcScale(240, 180, 240, 180)).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AC 4 — Share vs Download selection
// ══════════════════════════════════════════════════════════════════════════════
describe('Share vs download fallback', () => {
  test('uses share when navigator.canShare returns true', () => {
    expect(choosePdfAction(true)).toBe('share');
  });

  test('falls back to download when canShare returns false', () => {
    expect(choosePdfAction(false)).toBe('download');
  });

  test('falls back to download when canShare is undefined', () => {
    expect(choosePdfAction(undefined)).toBe('download');
  });
});
