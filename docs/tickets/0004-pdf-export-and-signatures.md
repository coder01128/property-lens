# Ticket 0004 — PDF Export & Signature Workflow

## Goal
Stabilize and improve the PDF export flow and signature capture to ensure reliable reports.

## Acceptance Criteria
- ✅ PDF export works consistently across browsers and includes all filled data.
- ✅ Signatures are securely embedded in the exported PDF.
- ✅ Users can re-sign or clear signatures before export.
- ✅ PDF export button gives clear feedback (loading, success, error).

## Tasks
- [ ] Verify `jsPDF` is loaded reliably (handle offline or blocked CDN failures).
- [ ] Ensure exported PDF includes all rooms, photos, items, and notes.
- [ ] Allow re-taking signatures without losing other report data.
- [ ] Add a “Download PDF” confirmation (e.g., toast message or indicator).

## Testing
- Create a full inspection (all rooms completed), add photos and signatures, and export the PDF.
- Open the downloaded PDF and verify the content matches the app.
- Remove a signature, re-sign, and confirm the PDF updates accordingly.
