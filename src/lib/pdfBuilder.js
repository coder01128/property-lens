/**
 * pdfBuilder.js — Professional property inspection PDF (redesigned).
 *
 * Layout:
 *   Page 1  — Branded cover: header, property info, special cards
 *   Page N  — One page per room: photos (aspect-ratio correct), item table, notes
 *   Last    — Check-in/out comparison (if check-out) + signatures
 */

import { jsPDF } from 'jspdf';

// ─── Brand palette (RGB) ────────────────────────────────────────────────────
const C = {
  dark:    [10,  10,  22 ],
  gold:    [200, 169, 110],
  cream:   [240, 237, 232],
  body:    [38,  38,  50 ],
  sub:     [100, 100, 120],
  muted:   [150, 150, 168],
  border:  [200, 200, 215],
  tblHdr:  [232, 232, 244],
  tblAlt:  [248, 248, 252],
  notesBg: [245, 245, 250],
  red:     [185, 28,  28 ],
  green:   [22,  163, 74 ],
};

// Condition colours — darker shades for PDF readability on white
const COND_RGB = {
  Excellent: [22,  163, 74 ],
  Good:      [5,   150, 105],
  Fair:      [152, 115, 0  ],
  Poor:      [194, 65,  12 ],
  Damaged:   [185, 28,  28 ],
  'N/A':     [107, 114, 128],
};

const SEV = { Excellent: 1, Good: 2, Fair: 3, Poor: 4, Damaged: 5 };

const W  = 210;   // A4 width mm
const M  = 14;    // page margin mm
const CW = W - M * 2;  // content width: 182mm

// Table column layout
const TC = {
  item:  { x: M,          w: 70  },
  cond:  { x: M + 70,     w: 32  },
  notes: { x: M + 70 + 32, w: CW - 70 - 32 },  // ~80mm
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const fc = (doc, rgb) => doc.setFillColor(...rgb);
const tc = (doc, rgb) => doc.setTextColor(...rgb);
const dc = (doc, rgb) => doc.setDrawColor(...rgb);

/** Check page break; add new page if needed. Returns new y. */
function pb(doc, y, needed = 20) {
  if (y + needed > 278) { doc.addPage(); return 22; }
  return y;
}

/** Report reference code */
function reportRef(id) {
  return 'PL-' + (id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
}

/**
 * Compress photo for PDF embedding, returns { dataUrl, ar (aspect ratio) }.
 * Uses higher quality than AI compression — photos should look great in report.
 */
async function compressForPdf(dataUrl, maxDim = 900, quality = 0.88) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const ar = img.width / (img.height || 1);
      const scale = Math.min(maxDim / (img.width || maxDim), maxDim / (img.height || maxDim), 1);
      const w = Math.max(1, Math.round(img.width  * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      try {
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', quality), ar });
      } catch { resolve({ dataUrl, ar }); }
    };
    img.onerror = () => resolve({ dataUrl, ar: 1 });
    img.src = dataUrl;
  });
}

// ─── Cover page ─────────────────────────────────────────────────────────────

function drawHeader(doc, inspection) {
  // Dark header band
  fc(doc, C.dark); doc.rect(0, 0, W, 44, 'F');
  fc(doc, C.gold); doc.rect(0, 42, W, 2.5, 'F');

  // Brand
  tc(doc, C.gold); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
  doc.text('PROPERTY LENS', M, 12);

  // Title
  tc(doc, C.cream); doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('Property Inspection Report', M, 27);

  // Type + date pill (right-aligned)
  const typeLabel = inspection.type === 'check-in' ? 'Check-In' : 'Check-Out';
  const dateStr   = inspection.inspectionDate || '';
  tc(doc, C.gold); doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
  doc.text(`${typeLabel}  ·  ${dateStr}`, M, 37);

  return 52;
}

function drawPropertyInfo(doc, inspection, y) {
  const ref = reportRef(inspection.id);

  // Address
  tc(doc, C.dark); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text(inspection.address || '—', M, y); y += 7;

  if (inspection.addressLine2) {
    tc(doc, C.sub); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Unit / Complex: ${inspection.addressLine2}`, M, y); y += 6;
  }

  y += 2;

  // Details grid — 2 columns
  const details = [
    ['Tenant',     inspection.tenantName    || '—'],
    ['Inspector',  inspection.inspectorName || '—'],
    ['Date',       inspection.inspectionDate || '—'],
    ['Report Ref', ref],
    ['Type',       inspection.type === 'check-in' ? 'Check-In' : 'Check-Out'],
  ];

  const colW = CW / 2;
  details.forEach(([label, val], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * colW;
    const ry = y + row * 6.5;

    tc(doc, C.muted); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
    doc.text(label.toUpperCase(), x, ry);
    tc(doc, C.body);  doc.setFontSize(9);   doc.setFont('helvetica', 'normal');
    doc.text(val, x + 28, ry);
  });

  y += Math.ceil(details.length / 2) * 6.5 + 6;

  // Divider
  dc(doc, C.gold); doc.setLineWidth(0.6);
  doc.line(M, y, M + CW, y); y += 6;

  return y;
}

// ─── Special cards ──────────────────────────────────────────────────────────

async function drawSpecialCards(doc, rooms, items, photos, y) {
  const specialRooms = rooms.filter(r => r.isSpecial);
  if (!specialRooms.length) return y;

  y = pb(doc, y, 20);

  // Section heading
  tc(doc, C.muted); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.text('SPECIAL CARDS', M, y); y += 2;
  dc(doc, C.gold); doc.setLineWidth(0.4);
  doc.line(M, y, M + CW, y); y += 6;

  for (const room of specialRooms) {
    y = pb(doc, y, 14);

    // Sub-header
    fc(doc, [220, 218, 210]); doc.rect(M, y, CW, 8, 'F');
    tc(doc, C.dark); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text(room.displayName, M + 3, y + 5.5);
    y += 11;

    // Photos (aspect-ratio correct, up to 4)
    const roomPhotos = (photos || []).filter(p => p.roomId === room.id).slice(0, 4);
    if (roomPhotos.length) {
      const colW = (CW - (Math.min(roomPhotos.length, 2) - 1) * 3) / Math.min(roomPhotos.length, 2);
      const MAX_H = 130;
      const compressed = await Promise.all(roomPhotos.map(p => compressForPdf(p.dataUrl, 1600, 0.92)));
      // Lay out photos in rows of 2
      for (let i = 0; i < compressed.length; i += 2) {
        const batch = compressed.slice(i, i + 2);
        const perW = batch.length === 1 ? CW : colW;
        // Calculate each photo's display dimensions (never stretch — reduce width if needed)
        const dims = batch.map(({ ar }) => {
          let dw = perW, dh = dw / ar;
          if (dh > MAX_H) { dh = MAX_H; dw = dh * ar; }
          return { dw, dh };
        });
        const rowH = Math.max(...dims.map(d => d.dh));
        y = pb(doc, y, rowH + 4);
        let px = M;
        for (let j = 0; j < batch.length; j++) {
          const { dataUrl: cd } = batch[j];
          const { dw, dh } = dims[j];
          try { doc.addImage(cd, 'JPEG', px, y, dw, dh); } catch {}
          px += perW + 3;
        }
        y += rowH + 5;
      }
    }

    // Meter fields
    if (room.typeKey === 'electricity_meter' || room.typeKey === 'water_meter') {
      const unit = room.typeKey === 'electricity_meter' ? 'kWh' : 'kL';
      const fields = [
        room.meterLocation ? `Location: ${room.meterLocation}` : null,
        room.meterReading  ? `Reading: ${room.meterReading} ${unit}` : null,
        room.meterNumber   ? `Meter No: ${room.meterNumber}` : null,
      ].filter(Boolean);
      for (const f of fields) {
        y = pb(doc, y, 6);
        tc(doc, C.body); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
        doc.text(f, M + 3, y); y += 6;
      }
    }

    // Keys description (multiline)
    if (room.typeKey === 'keys' && room.overallNotes?.trim()) {
      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); tc(doc, C.body);
      const lines = doc.splitTextToSize(room.overallNotes.trim(), CW - 6);
      for (const line of lines) {
        y = pb(doc, y, 6);
        doc.text(line, M + 3, y); y += 5.5;
      }
    }

    y += 5;
  }

  return y + 4;
}

// ─── Item table ─────────────────────────────────────────────────────────────

function drawItemsTable(doc, items, yStart) {
  if (!items.length) return yStart;

  const PAD    = 2.5;
  const LINE_H = 4.4;
  const MIN_ROW = 8;

  let y = yStart;

  // --- Header row ---
  fc(doc, C.tblHdr); doc.rect(M, y, CW, 8.5, 'F');
  tc(doc, C.dark); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  doc.text('ITEM',            TC.item.x  + PAD, y + 5.8);
  doc.text('CONDITION',       TC.cond.x  + PAD, y + 5.8);
  doc.text('DEFECTS / NOTES', TC.notes.x + PAD, y + 5.8);
  // Header bottom line
  dc(doc, C.dark); doc.setLineWidth(0.5);
  doc.line(M, y + 8.5, M + CW, y + 8.5);
  // Column dividers in header
  dc(doc, C.border); doc.setLineWidth(0.3);
  doc.line(TC.cond.x,  y, TC.cond.x,  y + 8.5);
  doc.line(TC.notes.x, y, TC.notes.x, y + 8.5);
  y += 8.5;

  // --- Data rows ---
  for (let ri = 0; ri < items.length; ri++) {
    const item = items[ri];
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    const nameLines  = doc.splitTextToSize(item.name || '', TC.item.w - PAD * 2);
    const qd = [item.quantity, item.description].filter(s => s?.trim()).join('  ·  ');
    doc.setFontSize(7.5);
    const qdLines = qd ? doc.splitTextToSize(qd, TC.item.w - PAD * 2) : [];
    doc.setFontSize(8.5);
    const defects    = item.defects?.trim() || '';
    const noteLines  = defects ? doc.splitTextToSize(defects, TC.notes.w - PAD * 2) : [];
    const itemTextLines = nameLines.length + qdLines.length;
    const rowH = Math.max(MIN_ROW, Math.max(itemTextLines, Math.max(noteLines.length, 1)) * LINE_H + PAD * 2);

    // Page break — redraw header on new page
    if (y + rowH > 278) {
      doc.addPage(); y = 22;
      fc(doc, C.tblHdr); doc.rect(M, y, CW, 8.5, 'F');
      tc(doc, C.dark); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
      doc.text('ITEM (continued)',  TC.item.x  + PAD, y + 5.8);
      doc.text('CONDITION',        TC.cond.x  + PAD, y + 5.8);
      doc.text('DEFECTS / NOTES',  TC.notes.x + PAD, y + 5.8);
      dc(doc, C.dark); doc.setLineWidth(0.5);
      doc.line(M, y + 8.5, M + CW, y + 8.5);
      dc(doc, C.border); doc.setLineWidth(0.3);
      doc.line(TC.cond.x,  y, TC.cond.x,  y + 8.5);
      doc.line(TC.notes.x, y, TC.notes.x, y + 8.5);
      y += 8.5;
    }

    // Alternating row background
    if (ri % 2 === 0) { fc(doc, C.tblAlt); doc.rect(M, y, CW, rowH, 'F'); }

    const textY = y + PAD + 3.2;

    // Item name
    tc(doc, C.body); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text(nameLines, TC.item.x + PAD, textY);
    // Quantity + description sub-line (grey italic)
    if (qdLines.length) {
      tc(doc, C.muted); doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5);
      doc.text(qdLines, TC.item.x + PAD, textY + nameLines.length * LINE_H);
    }

    // Condition — colored, bold
    if (item.condition) {
      const rgb = COND_RGB[item.condition] || C.sub;
      tc(doc, rgb); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
      doc.text(item.condition, TC.cond.x + PAD, textY);
    }

    // Defects — red italic
    if (noteLines.length) {
      tc(doc, C.red); doc.setFont('helvetica', 'italic'); doc.setFontSize(8);
      doc.text(noteLines, TC.notes.x + PAD, textY);
    }

    // Row divider + column lines
    dc(doc, C.border); doc.setLineWidth(0.2);
    doc.line(M, y + rowH, M + CW, y + rowH);
    doc.line(TC.cond.x,  y, TC.cond.x,  y + rowH);
    doc.line(TC.notes.x, y, TC.notes.x, y + rowH);

    y += rowH;
  }

  // Outer left + right borders spanning full table height
  dc(doc, [180, 180, 200]); doc.setLineWidth(0.4);
  doc.line(M,      yStart, M,      y);
  doc.line(M + CW, yStart, M + CW, y);
  doc.line(M, yStart, M + CW, yStart); // top

  return y + 4;
}

// ─── Room pages ─────────────────────────────────────────────────────────────

async function drawRooms(doc, completedRooms, items, photos, y) {
  if (!completedRooms.length) return y;

  const GAP    = 4;    // gap between side-by-side photos
  const MAX_PH = 130;  // generous height cap — portrait photos stay tall

  for (const room of completedRooms) {
    doc.addPage(); y = 20;

    // ── Room header bar ──────────────────────────────
    fc(doc, [228, 227, 238]); doc.rect(M, y, CW, 10, 'F');

    tc(doc, C.dark); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(room.displayName, M + 4, y + 7);

    if (room.overallCondition) {
      const rgb = COND_RGB[room.overallCondition] || C.sub;
      tc(doc, rgb); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
      doc.text(room.overallCondition, W - M - 4, y + 7, { align: 'right' });
    }

    y += 13;

    // ── Photos (aspect-ratio correct, 2-up layout) ──
    const overviewPhotos = photos
      .filter(p => p.roomId === room.id && p.role === 'overview')
      .slice(0, 4);

    if (overviewPhotos.length > 0) {
      for (let i = 0; i < overviewPhotos.length; i += 2) {
        const batch      = overviewPhotos.slice(i, i + 2);
        const compressed = await Promise.all(batch.map(p => compressForPdf(p.dataUrl, 1600, 0.92)));
        const perW       = batch.length === 1 ? CW : (CW - GAP) / 2;

        // Compute per-photo dims maintaining aspect ratio — never stretch
        const dims = compressed.map(({ ar }) => {
          let dw = perW, dh = dw / ar;
          if (dh > MAX_PH) { dh = MAX_PH; dw = dh * ar; }
          return { dw, dh };
        });
        const rowH = Math.max(...dims.map(d => d.dh));

        y = pb(doc, y, rowH + 4);
        let px = M;
        for (let j = 0; j < batch.length; j++) {
          const { dataUrl: cd } = batch[j];
          const { dw, dh } = dims[j];
          try { doc.addImage(cd, 'JPEG', px, y, dw, dh); } catch {}
          px += perW + GAP;
        }
        y += rowH + 5;
      }
    }

    // ── Items table ─────────────────────────────────
    const roomItems = items.filter(it => it.roomId === room.id && it.name?.trim());
    if (roomItems.length) {
      y = pb(doc, y, 24);
      y = drawItemsTable(doc, roomItems, y);
    }

    // ── Item defect photos ───────────────────────────
    const defectPhotos = photos.filter(p => p.roomId === room.id && p.role === 'defect');
    if (defectPhotos.length > 0) {
      // Group by itemId
      const byItem = {};
      for (const p of defectPhotos) {
        if (!byItem[p.itemId]) byItem[p.itemId] = [];
        byItem[p.itemId].push(p);
      }

      y = pb(doc, y, 14);
      tc(doc, C.muted); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
      doc.text('ITEM PHOTOS', M, y); y += 2;
      dc(doc, C.border); doc.setLineWidth(0.3);
      doc.line(M, y, M + CW, y); y += 5;

      for (const [itemId, iPhotos] of Object.entries(byItem)) {
        const item = roomItems.find(it => it.id === itemId);
        if (!item) continue;

        y = pb(doc, y, 10);
        tc(doc, C.dark); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
        doc.text(item.name, M, y); y += 4;

        // Up to 4 photos per row, 2-up layout
        const allItemPhotos = iPhotos.slice(0, 4);
        const MAX_ITEM_H = 100;
        for (let pi = 0; pi < allItemPhotos.length; pi += 2) {
          const batch = allItemPhotos.slice(pi, pi + 2);
          const compressed = await Promise.all(batch.map(p => compressForPdf(p.dataUrl, 1600, 0.92)));
          const perW = batch.length === 1 ? CW : (CW - 3) / 2;
          const dims = compressed.map(({ ar }) => {
            let dw = perW, dh = dw / ar;
            if (dh > MAX_ITEM_H) { dh = MAX_ITEM_H; dw = dh * ar; }
            return { dw, dh };
          });
          const rowH = Math.max(...dims.map(d => d.dh));
          y = pb(doc, y, rowH + 5);
          let px = M;
          for (let j = 0; j < batch.length; j++) {
            const { dataUrl: cd } = batch[j];
            const { dw, dh } = dims[j];
            try { doc.addImage(cd, 'JPEG', px, y, dw, dh); } catch {}
            px += perW + 3;
          }
          y += rowH + 4;
        }
        y += 2;
      }
    }

    // ── General notes box ────────────────────────────
    if (room.overallNotes?.trim()) {
      y = pb(doc, y, 14);
      const noteLines = doc.splitTextToSize(room.overallNotes.trim(), CW - 8);
      const boxH = noteLines.length * 4.8 + 9;
      fc(doc, C.notesBg); doc.rect(M, y, CW, boxH, 'F');
      dc(doc, C.border);  doc.setLineWidth(0.3); doc.rect(M, y, CW, boxH);
      tc(doc, C.muted); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
      doc.text('NOTES', M + 4, y + 5.5);
      tc(doc, C.body); doc.setFontSize(8.5); doc.setFont('helvetica', 'italic');
      doc.text(noteLines, M + 4, y + 10);
      y += boxH + 4;
    }
  }

  return y;
}

// ─── Comparison table ────────────────────────────────────────────────────────

function drawComparison(doc, rooms, items, linkedRooms, linkedItems, y) {
  if (!linkedRooms?.length) return y;

  doc.addPage(); y = 22;

  tc(doc, C.muted); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.text('CHECK-IN vs CHECK-OUT COMPARISON', M, y); y += 2;
  dc(doc, C.gold); doc.setLineWidth(0.5);
  doc.line(M, y, M + CW, y); y += 7;

  // Table header
  const cols = [M, M + 52, M + 104, M + 136, M + 164];
  fc(doc, C.tblHdr); doc.rect(M, y, CW, 8, 'F');
  tc(doc, C.dark); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
  doc.text('Room',      cols[0] + 2, y + 5.5);
  doc.text('Item',      cols[1] + 2, y + 5.5);
  doc.text('Check-In',  cols[2] + 2, y + 5.5);
  doc.text('Check-Out', cols[3] + 2, y + 5.5);
  doc.text('Change',    cols[4] + 2, y + 5.5);
  dc(doc, C.dark); doc.setLineWidth(0.4);
  doc.line(M, y + 8, M + CW, y + 8);
  for (let c = 1; c < cols.length; c++) {
    dc(doc, C.border); doc.setLineWidth(0.2);
    doc.line(cols[c], y, cols[c], y + 8);
  }
  y += 8;

  let ri = 0;
  for (const room of rooms.filter(r => !r.isSpecial && r.isComplete)) {
    const linkedRoom = linkedRooms.find(lr => lr.displayName === room.displayName);
    if (!linkedRoom) continue;
    const roomItems        = items.filter(it => it.roomId === room.id && it.name?.trim());
    const linkedItemsRoom  = (linkedItems || []).filter(it => it.roomId === linkedRoom.id);

    for (const item of roomItems) {
      y = pb(doc, y, 7);
      const linked  = linkedItemsRoom.find(li => li.name?.toLowerCase() === item.name?.toLowerCase());
      const ciCond  = linked?.condition || '—';
      const coCond  = item.condition    || '—';
      const ciSev   = SEV[ciCond] || 0;
      const coSev   = SEV[coCond] || 0;
      const delta   = (ciSev && coSev) ? coSev - ciSev : null;
      const arrow   = delta == null ? '' : delta < 0 ? 'Improved' : delta > 0 ? 'Declined' : 'Same';

      if (ri % 2 === 0) { fc(doc, C.tblAlt); doc.rect(M, y, CW, 6.5, 'F'); }
      tc(doc, C.sub); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
      doc.text(room.displayName.slice(0, 18), cols[0] + 2, y + 4.5);
      doc.text(item.name.slice(0, 18),        cols[1] + 2, y + 4.5);

      if (ciCond !== '—') { tc(doc, COND_RGB[ciCond] || C.sub); doc.setFont('helvetica', 'bold'); }
      doc.text(ciCond, cols[2] + 2, y + 4.5);

      if (coCond !== '—') { tc(doc, COND_RGB[coCond] || C.sub); doc.setFont('helvetica', 'bold'); }
      doc.text(coCond, cols[3] + 2, y + 4.5);

      if (arrow) {
        tc(doc, delta < 0 ? C.green : delta > 0 ? C.red : C.muted);
        doc.setFont('helvetica', 'bold');
        doc.text(arrow, cols[4] + 2, y + 4.5);
      }

      dc(doc, C.border); doc.setLineWidth(0.15);
      doc.line(M, y + 6.5, M + CW, y + 6.5);
      for (let c = 1; c < cols.length; c++) doc.line(cols[c], y, cols[c], y + 6.5);

      y += 6.5; ri++;
    }
  }

  return y + 6;
}

// ─── Signatures ──────────────────────────────────────────────────────────────

function drawSignatures(doc, signatures, y) {
  y = pb(doc, y, 60);

  dc(doc, C.gold); doc.setLineWidth(0.5);
  doc.line(M, y, M + CW, y); y += 7;

  tc(doc, C.dark); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text('Signatures', M, y); y += 8;

  const sigW = 82, sigH = 26;
  const positions = [
    { label: 'Inspector / Agent', x: M,             sig: signatures?.agent  },
    { label: 'Tenant',            x: M + sigW + 12,  sig: signatures?.tenant },
  ];

  const sigY = y;
  for (const { label, x, sig } of positions) {
    tc(doc, C.muted); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
    doc.text(label.toUpperCase(), x, sigY);

    if (sig) {
      try { doc.addImage(sig, 'PNG', x, sigY + 3, sigW, sigH); } catch {}
    } else {
      dc(doc, C.border); doc.setLineWidth(0.3);
      doc.rect(x, sigY + 3, sigW, sigH);
      tc(doc, [210, 210, 220]); doc.setFontSize(7);
      doc.text('(not signed)', x + sigW / 2, sigY + 3 + sigH / 2 + 2, { align: 'center' });
    }

    // Signature line + label
    fc(doc, [190, 190, 205]); doc.rect(x, sigY + 3 + sigH + 4, sigW, 0.5, 'F');
    tc(doc, C.muted); doc.setFontSize(7);
    doc.text(label, x + sigW / 2, sigY + 3 + sigH + 10, { align: 'center' });
  }

  return sigY + sigH + 20;
}

// ─── Footers (all pages) ─────────────────────────────────────────────────────

function drawFooters(doc, inspection) {
  const ref       = reportRef(inspection.id);
  const timestamp = new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    fc(doc, C.dark); doc.rect(0, 285, W, 12, 'F');
    tc(doc, C.gold); doc.setFontSize(6); doc.setFont('helvetica', 'normal');
    doc.text(`Property Lens  ·  ${ref}  ·  ${timestamp}`, M, 291);
    tc(doc, C.muted);
    doc.text(`Page ${i} of ${pageCount}`, W - M, 291, { align: 'right' });
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

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
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const completedRooms = rooms.filter(r => r.isComplete && !r.isSpecial);

  let y = drawHeader(doc, inspection);
  y     = drawPropertyInfo(doc, inspection, y);
  y     = await drawSpecialCards(doc, rooms, items, photos, y);
  y     = await drawRooms(doc, completedRooms, items, photos, y);

  if (inspection.type === 'check-out' && linkedRooms?.length) {
    y = drawComparison(doc, rooms, items, linkedRooms, linkedItems || [], y);
  }

  drawSignatures(doc, signatures, y);
  drawFooters(doc, inspection);

  return doc;
}

export function reportFilename(inspection) {
  const addr = (inspection.address || 'report').replace(/[^a-zA-Z0-9]/g, '_');
  const date = inspection.inspectionDate || 'undated';
  const type = inspection.type === 'check-in' ? 'CheckIn' : 'CheckOut';
  return `PropertyLens_${addr}_${date}_${type}.pdf`;
}
