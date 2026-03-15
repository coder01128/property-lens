# Ticket 0009 — Implement Report System

## Goal
Build the full report generation and delivery system as per PRD section 6: on-device PDF
with photos, signatures, special card data, check-in/check-out comparison, and report sharing.

## PRD Alignment (§6)

### §6.1 — PDF Report Content
The PDF must include:
- Property address + unit number, inspection type, date
- Inspector + tenant details
- Unique report reference number + timestamp
- All rooms with overview photos (thumbnail, up to 2 per room) and item-by-item condition ratings
- Special cards data — Keys (set count + key types), Electricity + Water meter readings
- Digital signatures for agent/inspector and tenant
- Watermark/footer link (all tiers — PRD §9.3 "primary organic growth mechanism")

### §6.2 — Report Delivery
- PDF download to device (already implemented — enhance)
- Web Share API (share to email/WhatsApp/etc.) — uses files: [PDF blob] with download fallback
- Shareable web link → **Phase 2** (requires Supabase hosting)
- Email body via `mailto:` → included as supplementary option

### §6.3 — Check-In vs Check-Out Comparison
- Condition comparison table (room | item | check-in condition | check-out condition | change ↑/=/↓)
- Side-by-side comparison photos → **Phase 2** (complex PDF layout)
- Linked check-in found automatically: most recent check-in for the same property

### §6.4 — Digital Signatures
- SignatureCanvas component (touch + mouse, clear button)
- Agent + Tenant signature fields in ReportView
- Stored in `inspection.signaturesJson` (persisted to Dexie)
- Embedded in PDF as images

### §6.5 — Properties Dashboard
- Add text search to filter properties by address

## Acceptance Criteria
- ✅ PDF includes photos (compressed thumbnails), conditions, notes, special card data.
- ✅ Signatures captured on-device and embedded in PDF.
- ✅ Check-out PDFs include condition comparison table vs linked check-in.
- ✅ Web Share API button with download fallback.
- ✅ `signaturesJson` persisted to Dexie so signatures survive app reload.
- ✅ Properties screen has search/filter by address.
- ✅ Watermark footer on every page (all tiers).

## Tasks
- [x] Create `src/components/SignatureCanvas.jsx`.
- [x] Create `src/lib/pdfBuilder.js` with full PDF structure.
- [x] Update `src/screens/ReportView/index.jsx` — signatures UI, comparison preview, share button.
- [x] Update `src/screens/Properties/index.jsx` — add address search.

## Out of Scope (Phase 2)
- Side-by-side comparison photos.
- Hosted shareable web links.
- Per-tier watermark variations (all tiers get standard footer watermark for now).
- Credit/billing integration.
