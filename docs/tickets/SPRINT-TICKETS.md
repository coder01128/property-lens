# Property Lens — Report Professionalisation Sprint

## Ticket Overview

| Ticket | Title | Priority | Estimate |
|--------|-------|----------|----------|
| PL-0006 | Extend data model: quantity + description per item | Critical | 1 session |
| PL-0007 | Expand special cards: meters, keys, tenant details | Critical | 1 session |
| PL-0008 | Add appliance checklist with photos | High | 1 session |
| PL-0009 | Rebuild PDF: cover page + T&C + property overview | Critical | 1 session |
| PL-0010 | Rebuild PDF: dual-column room detail tables | Critical | 1-2 sessions |
| PL-0011 | Rebuild PDF: photo gallery (3×2 grid, labelled) | Critical | 1-2 sessions |
| PL-0012 | Rebuild PDF: declaration + signatures page | High | 1 session |
| PL-0013 | Move Anthropic API key to server-side proxy | High | 1 session |
| PL-0014 | Integration testing: full inspection → PDF report | Critical | 1 session |

**Total estimated sessions: 9-11**

---

## PL-0006: Extend Data Model — Quantity + Description Per Item

### Pre-requisite
Read PRD.md Section 3.2 (Data Model) and Section 4.3.2 (Inspection Items) before starting.

### Description
Each inspection item currently stores: `name, condition, notes, photos`. Extend to include `quantity` and `description` fields. These fields enable the Chase Hammond level of detail in the report (e.g. "4 x ceiling mounted LED spots, white aluminium fittings" instead of just "Light Fixtures").

### Requirements
- Add `quantity` (string, optional) field to each inspection item in the data model
- Add `description` (string, optional) field to each inspection item in the data model
- Add UI inputs for both fields on the room item card:
  - `quantity` — short text input, placeholder: "e.g. 2 x double-glazed, white wood frames"
  - `description` — text input, placeholder: "e.g. Plaster painted white with LED spots"
- Both fields are optional — agent can skip them and just rate condition
- AI vision should auto-populate these fields when available (update the AI prompt to request quantity and description in its response)
- Existing saved inspections must not break — handle missing fields gracefully (default to empty string)
- localStorage schema must accommodate the new fields

### Testing
1. Create a new inspection → navigate to a room → verify quantity and description fields appear on each item card
2. Fill in quantity and description for 3 items → save → close and reopen the inspection → verify data persists
3. Leave quantity and description empty for some items → verify the app does not error or block progress
4. Open an old inspection (created before this change) → verify it loads without errors, new fields show as empty
5. Toggle AI vision ON → take a photo → verify AI response includes suggested quantity and description
6. Verify AI suggestions for quantity/description can be edited or dismissed by the agent

---

## PL-0007: Expand Special Cards — Meters, Keys, Tenant Details

### Pre-requisite
Read PRD.md Section 4.1 (Starting a New Inspection), Section 4.4 (Special Cards — Keys, Electricity Meter, Water Meter), and Section 6.6 (Keys & Tenant Details).

### Description
Expand the special cards and inspection metadata to capture the full set of fields needed for a professional report. This includes serial numbers on meters, key type categories, check-out columns, and tenant contact details.

### Requirements

**Electricity Meter card — add fields:**
- `serialNumber` (string, required)
- `location` (string, required) — e.g. "Garage", "Shower room cupboard"
- `readingOut` (string) — empty during check-in, filled during check-out

**Water Meter card — add fields:**
- `serialNumber` (string, required)
- `location` (string, required) — e.g. "Pavement", "Front garden"
- `readingOut` (string) — empty during check-in, filled during check-out

**Keys card — restructure:**
- Replace single keys entry with a dynamic list of key entries
- Each key entry: `type` (string, e.g. "Front door", "Communal", "Window", "Fob/swipe", "Garage", "Misc"), `quantity` (number), `description` (string, e.g. "1 x chrome Yale"), `checkOutQuantity` (number, filled at check-out)
- Add "+" button to add more key types
- Minimum 1 key entry required
- Photo remains mandatory (minimum 1)

**Tenant details — add to inspection metadata:**
- `tenantPhone` (string, optional)
- `tenantEmail` (string, optional)
- `tenantForwardingAddress` (string, optional — relevant for check-out)

**Inspector details — add to inspection metadata:**
- `inspectorCompany` (string, optional)
- `inspectorPhone` (string, optional)
- `inspectorEmail` (string, optional)

### Testing
1. Create a new inspection → verify Electricity Meter card shows: photo, location, serial number, reading in, reading out fields
2. Create a new inspection → verify Water Meter card shows the same field structure
3. Verify meter `readingOut` field is visible but clearly labelled as "filled at check-out"
4. Create a new inspection → verify Keys card shows a dynamic list with add/remove capability
5. Add 3 different key types → save → reopen → verify all persist
6. Verify tenant details fields (phone, email, forwarding address) appear on the new inspection form
7. Verify inspector details fields appear on the new inspection form
8. Open an old inspection → verify it loads without errors, new fields default to empty
9. Fill all fields → verify no field causes a crash or layout break on mobile

---

## PL-0008: Add Appliance Checklist with Photos

### Pre-requisite
Read PRD.md Section 4.5 (Appliances).

### Description
Add an appliance checklist that appears within Kitchen and utility rooms. Each appliance gets a photo, brand/model, condition rating, and notes. Appliance photos will appear in the Photo Gallery section of the PDF.

### Requirements
- When a room of type "Kitchen" or "Laundry" is present, show an "Appliances" section within that room
- Default appliance list for Kitchen: Oven, Hob, Microwave, Fridge/Freezer, Dishwasher, Washing Machine/Dryer, Extractor
- Agent can add or remove appliances from the list
- Each appliance entry has:
  - `name` (string, required)
  - `brandModel` (string, optional) — e.g. "SIEMENS"
  - `condition` (enum: Good / Fair / Poor / Damaged / N/A)
  - `photo` (image, minimum 1 required per appliance)
  - `notes` (string, optional)
- Appliance photos are stored in the inspection data and tagged with the room name and appliance name for photo gallery labelling
- Appliance data is separate from the room's inspection items (different data structure, rendered differently in the PDF)

### Testing
1. Create an inspection with a Kitchen room → verify "Appliances" section appears with 7 default appliances
2. Add a custom appliance (e.g. "Coffee Machine") → verify it appears in the list
3. Remove an appliance (e.g. "Dishwasher") → verify it is removed
4. Rate condition and take a photo for 3 appliances → save → reopen → verify data persists
5. Verify appliance section does NOT appear in a Bedroom or Bathroom room
6. Add a "Laundry" room → verify appliance section appears (with Washing Machine/Dryer as default)
7. Verify that an appliance with no photo shows a clear "photo required" indicator
8. Verify appliance photos are tagged correctly for later photo gallery use: `{RoomName} — {ApplianceName}`

---

## PL-0009: Rebuild PDF — Cover Page + Terms & Conditions + Property Overview

### Pre-requisite
Read PRD.md Section 6.1 (Report Page Structure), Section 6.2 (Cover Page), Section 6.3 (Terms & Conditions), and Section 6.4 (Property Overview).

### Description
Rebuild the first section of the PDF report to match professional standards. This ticket covers the first 3-4 pages of the report: a branded cover page, a legal T&C page, and an auto-generated property overview summary.

### Requirements

**Cover Page:**
- Property Lens logo/branding at top
- Property address and unit number (large, prominent)
- Date of inspection
- Client / agency name (if provided)
- Inspection type clearly indicated: "Inventory Make", "Check-In", or "Check-Out" (with visual checkbox style)
- Inspector company details (name, address, phone, email)
- Subtitle: "Independent Schedule of Condition and Inventory of Fixtures and Effects"
- Professional layout — reference the Chase Hammond cover page aesthetic (grid layout with branded sections)

**Terms & Conditions (1-2 pages):**
- Static text block — SA-specific legal disclaimer
- Use this default text (can be customised later for paid tiers):

```
TERMS & CONDITIONS

This inventory report is a fair and accurate account describing the property's
content, condition and cleanliness for rental purposes only. This report is not
a guarantee of, or report on, the adequacy of, or safety of any equipment or
contents, merely a record that such items exist in the property as at the date
of the report.

The inventory only extends to parts of the property that are readily accessible.
All other parts of the premises, for example attics, garages, basements, lofts
and cupboards full of items which are not relevant to the inventory, are
specifically excluded.

Electrical appliances, machinery, boilers, gas appliances, radiators, water
supply and other similar items are not tested. Lighting is solely tested to
indicate whether light bulbs are working at the time of inspection.

Although every effort has been made to carefully verify the property and its
contents, it should be noted that the inspector is not an expert in textiles,
woods, materials, antiques, etc, or a qualified surveyor or valuer.

Meter readings may only be taken if these are located and readily accessible
and should be checked by the relevant utility company.

On receipt of the report, the tenant will have 7 days to consider and add any
comments as to the condition of the property or its contents. Should no comment
be received during this time, then the tenant is deemed to have accepted this
report in full.

Prior to check-out the tenant should ensure:
- All cleaning and washing is completed and items returned to original positions
- All food items removed from refrigerators, freezer defrosted if applicable
- Keys returned to the letting agent or handed over at check-out
- The property is left in the condition stipulated in the tenancy agreement
```

**Property Overview (auto-generated):**
- Single page summary table
- Two columns: "Condition at Check-In" / "Condition at Check-Out"
- Rows: Cleanliness, General overview, Decorative order, Lighting, Windows, Curtains/blinds, Skirting & woodwork, Carpets/flooring, Kitchen & appliances, Bathroom & fittings, External
- Auto-populate from room data: for each category, find the matching items across all rooms and use the worst condition as the summary. If no data, show "Not inspected"
- Check-out column empty during check-in (greyed out cells)

### Testing
1. Generate a PDF report → verify page 1 is a branded cover page with all required fields
2. Verify cover page shows correct property address, date, inspection type, and inspector details
3. Verify page 2-3 contains Terms & Conditions text, properly formatted with no truncation
4. Verify Property Overview page appears after T&C
5. Complete an inspection with 3 rooms → verify Property Overview auto-populates condition summaries
6. Verify check-out column on Property Overview is empty/greyed when inspection type is check-in
7. Test with an inspection where some rooms have "Damaged" items → verify the overview reflects the worst rating
8. Verify the cover page renders correctly on mobile screen (PDF preview)
9. Verify all pages have consistent header/footer with page numbers

---

## PL-0010: Rebuild PDF — Dual-Column Room Detail Tables

### Pre-requisite
Read PRD.md Section 6.7 (Room-by-Room Detail) and Section 4.3.3 (Condition Rating Colours). Also review the Chase Hammond report pages 7-16 for the exact table format.

### Description
Rebuild the room-by-room section of the PDF to use the dual-column Chase Hammond table format. This is the core of the report and the single biggest change to the PDF output.

### Requirements

**Table structure per room:**

| Item | Quantity and Description | Condition at Check-In | Condition at Check-Out | Comments |
|------|------------------------|----------------------|----------------------|----------|

- Column 1: Item name (bold)
- Column 2: Quantity and description (from the new fields added in PL-0006). If both quantity and description are filled, combine as "{quantity}. {description}". If only description, show description. If empty, show blank.
- Column 3: Condition at check-in — colour-coded text (green/amber/orange/red per rating)
- Column 4: Condition at check-out — empty during check-in, filled during check-out
- Column 5: Comments — from the notes field

**Additional rules:**
- Each room starts with a header row showing the room name (e.g. "Bedroom One (straight off lower hallway)")
- Cleanliness row at the top of each room table (auto-populated or agent-entered)
- If the table exceeds one page, continue on the next page with a "(continued)" header
- Room-level AI notes appear below the table in an italicised "NOTES" block (same as current behaviour but styled to match Chase Hammond)
- Do NOT include photos inline with room tables — all photos go to the Photo Gallery
- Condition text formatting: "Good condition", "Fair condition", "Poor condition", "Damaged", not just the single word
- Alternating row shading for readability (light grey every other row)

**For check-out reports with a linked check-in:**
- Column 3 is pre-populated with the check-in data
- Column 4 is filled with the check-out data
- If condition has worsened, highlight the check-out cell with a subtle red background
- If condition has improved, highlight with a subtle green background

### Testing
1. Create a check-in inspection with 3 rooms, fill all items with conditions and descriptions → generate PDF → verify dual-column table format
2. Verify "Condition at Check-Out" column is present but empty for a check-in report
3. Verify condition text is colour-coded (green for Good, amber for Fair, orange for Poor, red for Damaged)
4. Verify quantity and description fields appear in the correct column
5. Verify items with no quantity/description show blank in that column (not "undefined" or "null")
6. Create an inspection with 15+ items in one room → verify table continues correctly across page break with "(continued)" header
7. Verify alternating row shading is applied
8. Verify room-level AI notes appear below the table in italics
9. Verify NO photos appear inline — room tables are data only
10. Create a check-out inspection linked to a check-in → verify check-in data appears in column 3
11. Verify worsened conditions are highlighted in the check-out column (if comparison feature is ready)

---

## PL-0011: Rebuild PDF — Photo Gallery (3×2 Grid, Labelled)

### Pre-requisite
Read PRD.md Section 6.8 (Photo Gallery) and Appendix A (Photo Gallery Label Generation).

### Description
Build the photo gallery section that appears at the end of the PDF report, before the Declaration page. Photos are arranged in a 3×2 grid (6 per page) with dark header bars and white text labels.

### Requirements

**Layout:**
- 3 columns × 2 rows = 6 photos per page
- Each photo has a dark grey/charcoal header bar above it with white text label
- Photos sized to fill their cell while maintaining aspect ratio
- Consistent spacing between cells
- Page header: "Photograph Gallery (1)", "Photograph Gallery (2)", etc.

**Photo ordering (mandatory — follow this exact sequence):**
1. Room overview photos — in room order from the inspection:
   - Label format: `{RoomName} (Angle {N})`
   - Example: "Bedroom (Angle 1)", "Bedroom (Angle 2)", "Kitchen (Angle 1)", "Kitchen (Angle 2)"
2. Special card photos — after all room overviews:
   - Label format: `{CardName}`
   - Example: "Keys", "Electricity Meter", "Water Meter"
3. Appliance photos — after special cards:
   - Label format: `{ApplianceName}`
   - Example: "Oven", "Hob", "Fridge/Freezer", "Washing Machine"
4. Defect/damage item photos — last:
   - Label format: `{RoomName} — {ItemName}`
   - Example: "Bedroom — Windows 2", "Bathroom — Tiles"

**Photo quality:**
- Embed at captured resolution (1000px longest edge)
- No additional compression during PDF export
- JPEG quality preserved from capture

**Edge cases:**
- If fewer than 6 photos remain for the last gallery page, leave empty cells blank (no placeholder)
- If an inspection has no photos (edge case), skip the gallery section entirely
- If a room has more than 2 overview photos, all appear in order: "Bedroom (Angle 1)", "Bedroom (Angle 2)", "Bedroom (Angle 3)"

### Testing
1. Create an inspection with 3 rooms (2 overview photos each) + keys + electricity meter + water meter → generate PDF → verify gallery section appears
2. Verify gallery pages are titled "Photograph Gallery (1)", "Photograph Gallery (2)", etc.
3. Verify 3×2 grid layout with dark header bars and white text labels
4. Verify photo order: room overviews first (in room order), then special cards, then appliances, then defect photos
5. Verify label format: "Bedroom (Angle 1)", "Kitchen (Angle 2)", "Keys", "Electricity Meter", "Oven", "Bedroom — Windows 2"
6. Count total photos and verify correct number of gallery pages (ceil(total / 6))
7. Verify last gallery page with fewer than 6 photos renders correctly (empty cells blank)
8. Verify photo quality — zoom into a gallery photo in the PDF and confirm it is sharp at 1000px
9. Create an inspection with 20+ photos → verify gallery spans multiple pages correctly
10. Create an inspection with only 1 room and 2 photos → verify gallery renders as a single page with 2 photos

---

## PL-0012: Rebuild PDF — Declaration + Signatures Page

### Pre-requisite
Read PRD.md Section 6.9 (Declaration) and Section 6.10 (Signatures).

### Description
Add a proper declaration page and restructured signatures page to the end of the PDF report, matching the Chase Hammond legal format.

### Requirements

**Declaration text:**
```
Whilst the utmost care has been taken to ensure the accuracy of this report,
it must be checked and verified by the landlord(s) and tenant(s) to ensure all
parties agree with its contents.

This is to certify that we the undersigned have carefully checked the foregoing
Inventory Report and subject to the marginal notes, consider this to be a fair
and correct schedule of condition of the property and items mentioned in the report.
```

**Signature table:**

| Role | Name | Signature at Check-In | Signature at Check-Out |
|------|------|----------------------|----------------------|
| Tenant(s) | _(from data)_ | _(signature image)_ | _(empty or signature)_ |
| Landlord / Owner | _(from data)_ | _(signature image)_ | _(empty or signature)_ |
| Agent / Inspector | _(from data)_ | _(signature image)_ | _(empty or signature)_ |

- Date field below the signature table
- Tenant email and forwarding address fields (for reference)
- Property address repeated for clarity
- Signature images embedded from canvas capture
- Check-out signature column empty during check-in

**Landlord signature:**
- Current app only captures tenant + inspector signatures
- Add a third signature field for landlord/owner (optional — may not be present at inspection)
- If not captured, show empty line in PDF

### Testing
1. Generate a PDF → verify Declaration page appears after Photo Gallery
2. Verify declaration text is present and properly formatted
3. Verify signature table shows all three roles: Tenant, Landlord, Agent
4. Capture tenant + inspector signatures → verify they render in the PDF
5. Skip landlord signature → verify the field shows empty/blank (not an error)
6. Verify check-out signature column is present but empty for check-in reports
7. Verify tenant name, email, and property address appear on the declaration page
8. Verify this is the last page of the PDF (after Photo Gallery)
9. Test on mobile — verify signature capture still works with the third signature field

---

## PL-0013: Move Anthropic API Key to Server-Side Proxy

### Pre-requisite
Read PRD.md Section 11 (Risks & Mitigations) — "API key exposure" is flagged as High severity.

### Description
The Anthropic API key is currently embedded in client-side JavaScript. This is a critical security risk for production deployment. Create a lightweight server-side proxy that handles API calls.

### Requirements
- Create a Netlify serverless function (or Vercel equivalent) at `/api/analyze`
- The function receives: image data (base64), room type, item name, inspection type
- The function calls the Anthropic API with the key stored as an environment variable
- The function returns the AI response to the client
- Update the client-side `analyzePhoto` function to call `/api/analyze` instead of calling Anthropic directly
- Remove the hardcoded API key from all client-side code
- Add the API key as a Netlify/Vercel environment variable
- Maintain the 15-second timeout behaviour
- Maintain the toggle on/off behaviour

### Testing
1. Deploy to Netlify with the serverless function → verify AI analysis still works
2. Inspect the client-side JavaScript bundle → verify NO API key is present
3. Open browser DevTools Network tab → verify API calls go to `/api/analyze` not to `api.anthropic.com`
4. Test with AI toggle ON → take a photo → verify response returns correctly
5. Test with AI toggle OFF → verify no API calls are made
6. Test timeout: simulate a slow response → verify 15-second timeout still triggers
7. Test offline: disconnect internet → verify AI gracefully fails and agent can continue manually
8. Verify environment variable is set in Netlify/Vercel dashboard, not in code

---

## PL-0014: Integration Testing — Full Inspection → PDF Report

### Pre-requisite
All tickets PL-0006 through PL-0012 must be complete.

### Description
End-to-end integration test. Complete a full property inspection using the app and generate a PDF report. Compare the output against the Chase Hammond benchmark report. Document any gaps.

### Test Scenarios

**Test 1: Complete Check-In Inspection**
1. Create new inspection: address "14 Bridge Street, Randburg", unit "3A", type Check-In
2. Fill tenant details: name, phone, email
3. Fill inspector details: name, company, phone, email
4. Remove Garden room (apartment — no garden)
5. Add a second Bedroom → verify auto-names to "Bedroom 2"
6. For each room: take 2 overview photos, rate all items with conditions, fill quantity + description for at least 3 items, add notes on 2 items
7. Fill Keys card: 3 key types with quantities, 1 photo
8. Fill Electricity Meter: location, serial number, reading in, 1 photo
9. Fill Water Meter: location, serial number, reading in, 1 photo
10. Fill appliances in Kitchen: rate 4 appliances with photos
11. Take 2 defect photos (e.g. cracked window, stained carpet)
12. Capture tenant signature + inspector signature
13. Generate PDF report

**Verify PDF contains (in order):**
- [ ] Cover page with all details
- [ ] Terms & Conditions (1-2 pages)
- [ ] Property Overview summary table (dual column, check-out column empty)
- [ ] Utility Readings with photos (Electricity + Water)
- [ ] Keys & Tenant Details (key inventory table, tenant contact info)
- [ ] Room-by-room tables in dual-column format (5 columns: Item, Qty/Desc, Check-In, Check-Out, Comments)
- [ ] Room tables have alternating row shading and colour-coded condition text
- [ ] Photo Gallery in correct order: room overviews → special cards → appliances → defect photos
- [ ] Gallery uses 3×2 grid with dark header bars and white labels
- [ ] Gallery labels are correct: "Bedroom (Angle 1)", "Keys", "Oven", "Bedroom — Windows 2"
- [ ] Declaration page with legal text
- [ ] Signatures page with tenant + inspector signatures, empty landlord field
- [ ] All pages have consistent header and footer with page numbers
- [ ] Photos are sharp (no visible compression artifacts)
- [ ] No "undefined", "null", or empty placeholder text visible anywhere

**Test 2: Offline Inspection**
1. Enable airplane mode on device
2. Complete an inspection (all steps above, skip AI)
3. Generate PDF
4. Verify PDF generates successfully offline
5. Verify all data and photos are present
6. Re-enable network → verify AI queue processes

**Test 3: Mobile UX**
1. Complete the full inspection on a mobile phone
2. Verify all fields are accessible with one-thumb operation
3. Verify photo capture works (camera + gallery)
4. Verify PDF downloads correctly on mobile
5. Verify the report looks professional when opened on a laptop/desktop

**Test 4: Edge Cases**
1. Inspection with only 1 room → verify report still generates correctly
2. Inspection with 10+ rooms → verify report handles pagination
3. Room with all items rated N/A → verify renders correctly
4. Inspection with no defect photos → verify gallery skips defect section
5. Very long item descriptions → verify table wraps correctly without breaking layout

### Acceptance Criteria
The generated PDF report must be **visually comparable to the Chase Hammond benchmark report** in terms of:
- Professional layout and typography
- Data density and completeness
- Photo presentation quality
- Legal compliance (T&C, declaration, signatures)
- Dual-column check-in/check-out structure

If the report does not meet this standard, document specific gaps and create follow-up tickets.
