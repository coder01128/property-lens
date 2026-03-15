/**
 * pdfBuilder.js — Full on-device PDF report builder (PRD §6.1).
 *
 * Sections:
 *   1. Header (brand, type, date)
 *   2. Property + inspection info + report reference
 *   3. Special cards (keys, meter readings)
 *   4. Rooms with overview photo thumbnails + item condition table
 *   5. Check-in / Check-out comparison table (check-out reports only)
 *   6. Signatures (agent + tenant)
 *   7. Footer on every page (watermark, page numbers)
 */

import { jsPDF } from 'jspdf';

// ─── Brand colours (RGB) ────────────────────────────────────────────────────
const C = {
  dark:   [12,  12,  22 ],
  gold:   [200, 169, 110],
  cream:  [240, 237, 232],
  light:  [246, 246, 252],
  muted:  [140, 140, 160],
  body:   [40,  40,  50 ],
  sub:    [100, 100, 120],
  red:    [180, 80,  60 ],
  green:  [34,  197, 94 ],
};

const W  = 210;   // A4 width mm
const M  = 16;    // margin mm
const CW = W - M * 2;  // content width mm

// Condition severity (for comparison delta)
const SEV = { Excellent: 1, Good: 2, Fair: 3, Poor: 4, Damaged: 5 };

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Compress a dataUrl to thumbnail size for PDF embedding. */
async function compressForPdf(dataUrl, maxW = 240, maxH = 180, quality = 0.6) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxW / (img.width || maxW), maxH / (img.height || maxH), 1);
      const w = Math.max(1, Math.round(img.width  * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      try {
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/** Generate a short human-readable report ref from inspection id. */
function reportRef(inspectionId) {
  return 'PL-' + (inspectionId || '').replace(/-/g, '').slice(0, 8).toUpperCase();
}

/** Set fill color from RGB array. */
const fc = (doc, rgb) => doc.setFillColor(...rgb);
/** Set text color from RGB array. */
const tc = (doc, rgb) => doc.setTextColor(...rgb);

/** Check page break and add new page if needed. Returns new y. */
function pb(doc, y, needed = 20) {
  if (y + needed > 280) { doc.addPage(); return 20; }
  return y;
}

// ─── Section builders ───────────────────────────────────────────────────────

function drawHeader(doc, inspection) {
  fc(doc, C.dark); doc.rect(0, 0, W, 42, 'F');
  fc(doc, C.gold); doc.rect(0, 40, W, 2,  'F');

  tc(doc, C.gold);  doc.setFontSize(7);  doc.setFont('helvetica', 'bold');
  doc.text('PROPERTY LENS', M, 11);

  tc(doc, C.cream); doc.setFontSize(15);
  doc.text('Property Inspection Report', M, 25);

  const typeLabel = inspection.type === 'check-in' ? 'Check-In' : 'Check-Out';
  tc(doc, C.gold);  doc.setFontSize(8);  doc.setFont('helvetica', 'normal');
  doc.text(`${typeLabel}  ·  ${inspection.inspectionDate || ''}`, M, 35);

  return 52;
}

function drawPropertyInfo(doc, inspection, y) {
  const ref = reportRef(inspection.id);

  tc(doc, C.body); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text(inspection.address || '—', M, y); y += 6;

  if (inspection.addressLine2) {
    tc(doc, C.sub); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Unit / Flat: ${inspection.addressLine2}`, M, y); y += 5;
  }

  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  tc(doc, C.sub);

  const fields = [];
  if (inspection.tenantName)    fields.push(`Tenant: ${inspection.tenantName}`);
  if (inspection.inspectorName) fields.push(`Inspector: ${inspection.inspectorName}`);
  fields.push(`Date: ${inspection.inspectionDate || '—'}`);
  fields.push(`Report Ref: ${ref}`);

  for (const f of fields) {
    doc.text(f, M, y); y += 5;
  }

  return y + 4;
}

function drawSpecialCards(doc, rooms, items, y) {
  const specialRooms = rooms.filter(r => r.isSpecial);
  if (specialRooms.length === 0) return y;

  y = pb(doc, y, 20);

  // Section header
  fc(doc, C.light); doc.roundedRect(M, y, CW, 7, 1.5, 1.5, 'F');
  tc(doc, C.dark); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text('SPECIAL CARDS', M + 3, y + 5); y += 11;

  for (const room of specialRooms) {
    y = pb(doc, y, 10);
    const icon = room.typeKey === 'keys' ? '🔑' : room.typeKey === 'electricity_meter' ? '⚡' : '💧';

    tc(doc, C.body); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text(`${icon} ${room.displayName}`, M + 2, y);

    // Meter reading
    if ((room.typeKey === 'electricity_meter' || room.typeKey === 'water_meter') && room.meterReading) {
      const unit = room.typeKey === 'electricity_meter' ? 'kWh' : 'kL';
      tc(doc, C.sub); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      doc.text(`Reading: ${room.meterReading} ${unit}`, M + 60, y);
    }

    // Key count
    if (room.typeKey === 'keys' && room.keyCount != null) {
      tc(doc, C.sub); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      doc.text(`Sets: ${room.keyCount}`, M + 60, y);
    }

    y += 6;

    // Key items
    if (room.typeKey === 'keys') {
      const keyItems = items.filter(it => it.roomId === room.id && it.name?.trim());
      for (const ki of keyItems) {
        y = pb(doc, y, 6);
        tc(doc, C.sub); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
        doc.text(`  · ${ki.name}${ki.condition ? '  — ' + ki.condition : ''}`, M + 4, y);
        y += 5;
      }
    }

    // Notes
    if (room.overallNotes?.trim()) {
      y = pb(doc, y, 6);
      tc(doc, C.muted); doc.setFontSize(7.5); doc.setFont('helvetica', 'italic');
      doc.text(room.overallNotes, M + 4, y, { maxWidth: CW - 8 }); y += 5;
    }
  }

  return y + 4;
}

async function drawRooms(doc, completedRooms, items, photos, y) {
  if (completedRooms.length === 0) return y;

  y = pb(doc, y, 20);
  fc(doc, C.light); doc.roundedRect(M, y, CW, 7, 1.5, 1.5, 'F');
  tc(doc, C.dark); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text('ROOM INSPECTIONS', M + 3, y + 5); y += 11;

  for (const room of completedRooms) {
    y = pb(doc, y, 25);

    // Room header bar
    fc(doc, [230, 230, 240]); doc.roundedRect(M, y, CW, 8, 1.5, 1.5, 'F');
    tc(doc, C.dark); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text(room.displayName, M + 3, y + 6);

    if (room.overallCondition) {
      tc(doc, C.gold); doc.setFontSize(8);
      doc.text(room.overallCondition, W - M - 3, y + 6, { align: 'right' });
    }
    y += 11;

    // Overview photos (up to 2 thumbnails)
    const overviewPhotos = photos
      .filter(p => p.roomId === room.id && p.role === 'overview')
      .slice(0, 2);

    if (overviewPhotos.length > 0) {
      y = pb(doc, y, 32);
      let px = M;
      const thumbW = 36, thumbH = 27, gap = 3;
      for (const photo of overviewPhotos) {
        const compressed = await compressForPdf(photo.dataUrl, 240, 180);
        if (compressed) {
          try {
            doc.addImage(compressed, 'JPEG', px, y, thumbW, thumbH);
          } catch { /* skip if image fails */ }
        }
        px += thumbW + gap;
      }
      y += thumbH + 4;
    }

    // Items
    const roomItems = items.filter(it => it.roomId === room.id && it.name?.trim());
    for (const item of roomItems) {
      y = pb(doc, y, 8);
      tc(doc, C.body); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      doc.text(`· ${item.name}`, M + 3, y);

      if (item.condition) {
        doc.setFont('helvetica', 'bold');
        tc(doc, item.condition === 'Excellent' || item.condition === 'Good' ? C.green : C.red);
        doc.text(item.condition, M + 75, y);
      }

      if (item.defects?.trim()) {
        doc.setFont('helvetica', 'italic'); tc(doc, C.red);
        doc.text(item.defects, M + 108, y, { maxWidth: CW - 100 });
      }

      y += 6.5;
    }

    // Room notes
    if (room.overallNotes?.trim()) {
      y = pb(doc, y, 8);
      tc(doc, C.sub); doc.setFontSize(7.5); doc.setFont('helvetica', 'italic');
      doc.text(`Notes: ${room.overallNotes}`, M + 3, y, { maxWidth: CW - 6 }); y += 6;
    }

    y += 5;
  }

  return y;
}

function drawComparison(doc, rooms, items, linkedRooms, linkedItems, y) {
  if (!linkedRooms?.length) return y;

  y = pb(doc, y, 30);
  fc(doc, C.light); doc.roundedRect(M, y, CW, 7, 1.5, 1.5, 'F');
  tc(doc, C.dark); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text('CHECK-IN vs CHECK-OUT COMPARISON', M + 3, y + 5); y += 11;

  // Table headers
  const colW = [50, 38, 38, 28]; // Room | Item | Check-In | Check-Out | Change
  const cols  = [M, M+colW[0], M+colW[0]+colW[1], M+colW[0]+colW[1]+colW[2]];

  tc(doc, C.muted); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
  doc.text('Room',       cols[0], y);
  doc.text('Item',       cols[1], y);
  doc.text('Check-In',   cols[2], y);
  doc.text('Check-Out',  cols[3], y);
  doc.text('Change', W - M, y, { align: 'right' });
  y += 2;

  // Divider
  fc(doc, [220,220,230]); doc.rect(M, y, CW, 0.5, 'F'); y += 4;

  const normalRooms = rooms.filter(r => !r.isSpecial && r.isComplete);

  for (const room of normalRooms) {
    const linkedRoom = linkedRooms.find(lr => lr.displayName === room.displayName);
    if (!linkedRoom) continue;

    const roomItems   = items.filter(it => it.roomId === room.id && it.name?.trim());
    const linkedItemsForRoom = linkedItems.filter(it => it.roomId === linkedRoom.id);

    for (const item of roomItems) {
      y = pb(doc, y, 7);

      const linkedItem = linkedItemsForRoom.find(li =>
        li.name?.toLowerCase() === item.name?.toLowerCase()
      );
      const ciCond = linkedItem?.condition || '—';
      const coCond = item.condition || '—';

      const ciSev = SEV[ciCond] || 0;
      const coSev = SEV[coCond] || 0;
      const delta = (ciSev && coSev) ? coSev - ciSev : null;
      const arrow = delta == null ? '' : delta < 0 ? '↑ Better' : delta > 0 ? '↓ Worse' : '= Same';

      tc(doc, C.sub); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
      doc.text(room.displayName.slice(0, 20), cols[0], y);
      doc.text(item.name.slice(0, 20),        cols[1], y);
      doc.text(ciCond, cols[2], y);
      doc.text(coCond, cols[3], y);

      if (arrow) {
        tc(doc, delta < 0 ? C.green : delta > 0 ? C.red : C.muted);
        doc.setFont('helvetica', 'bold');
        doc.text(arrow, W - M, y, { align: 'right' });
      }

      y += 5.5;
    }
  }

  return y + 4;
}

function drawSignatures(doc, signatures, y) {
  y = pb(doc, y, 50);

  // Section divider
  fc(doc, [220,220,230]); doc.rect(M, y, CW, 0.5, 'F'); y += 6;

  tc(doc, C.dark); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text('Signatures', M, y); y += 8;

  const sigW = 80, sigH = 22;
  const positions = [
    { label: 'Inspector / Agent', x: M,          sig: signatures?.agent  },
    { label: 'Tenant',            x: M + sigW + 8, sig: signatures?.tenant },
  ];

  for (const { label, x, sig } of positions) {
    y = pb(doc, y, sigH + 12);

    tc(doc, C.sub); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
    doc.text(label, x, y); y += 3;

    // Signature image or blank box
    if (sig) {
      try {
        doc.addImage(sig, 'PNG', x, y, sigW, sigH);
      } catch { /* skip */ }
    } else {
      // Empty box placeholder
      doc.setDrawColor(200, 200, 210);
      doc.rect(x, y, sigW, sigH);
      tc(doc, [200,200,210]); doc.setFontSize(7);
      doc.text('(not signed)', x + sigW / 2, y + sigH / 2 + 2, { align: 'center' });
    }

    // Only advance y for the first signature (they're side by side)
    if (x === M) {
      // will advance after both are drawn
    }
  }

  // Advance y past signature boxes
  y += sigH + 4;

  // Signature lines
  for (const { label, x } of positions) {
    fc(doc, [180,180,200]); doc.rect(x, y, sigW, 0.5, 'F');
    tc(doc, C.muted); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text(label, x + sigW / 2, y + 4, { align: 'center' });
  }

  return y + 10;
}

function drawFooters(doc, inspection) {
  const ref       = reportRef(inspection.id);
  const pageCount = doc.getNumberOfPages();
  const timestamp = new Date().toLocaleDateString('en-ZA', { day:'2-digit', month:'short', year:'numeric' });

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    fc(doc, C.dark); doc.rect(0, 285, W, 12, 'F');
    tc(doc, C.gold); doc.setFontSize(6); doc.setFont('helvetica', 'normal');
    doc.text(`Property Lens · PropertyLens.co.za · ${ref} · ${timestamp}`, M, 291);
    tc(doc, C.muted);
    doc.text(`Page ${i} of ${pageCount}`, W - M, 291, { align: 'right' });
  }
}

// ─── Main export ────────────────────────────────────────────────────────────

/**
 * Build a full inspection PDF.
 *
 * @param {{
 *   inspection: object,
 *   rooms: object[],
 *   items: object[],
 *   photos: object[],
 *   signatures: { agent: string|null, tenant: string|null } | null,
 *   linkedInspection: object | null,
 *   linkedRooms: object[] | null,
 *   linkedItems: object[] | null,
 * }} data
 * @returns {import('jspdf').jsPDF}
 */
export async function buildInspectionPDF({
  inspection,
  rooms,
  items,
  photos,
  signatures    = null,
  linkedInspection = null,
  linkedRooms   = null,
  linkedItems   = null,
}) {
  const doc  = new jsPDF({ unit: 'mm', format: 'a4' });
  const completedRooms = rooms.filter(r => r.isComplete && !r.isSpecial);

  let y = drawHeader(doc, inspection);
  y     = drawPropertyInfo(doc, inspection, y);
  y     = drawSpecialCards(doc, rooms, items, y);
  y     = await drawRooms(doc, completedRooms, items, photos, y);

  if (inspection.type === 'check-out' && linkedRooms?.length) {
    y = drawComparison(doc, rooms, items, linkedRooms, linkedItems || [], y);
  }

  drawSignatures(doc, signatures, y);
  drawFooters(doc, inspection);

  return doc;
}

/** Generate the filename for a report. */
export function reportFilename(inspection) {
  const addr = (inspection.address || 'report').replace(/[^a-zA-Z0-9]/g, '_');
  const date = inspection.inspectionDate || 'undated';
  const type = inspection.type === 'check-in' ? 'CheckIn' : 'CheckOut';
  return `PropertyLens_${addr}_${date}_${type}.pdf`;
}
