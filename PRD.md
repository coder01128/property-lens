# Property Lens — Product Requirements Document v3.0

**Company:** DarkLoud Digital
**Author:** Claude (CEO) + DarkCloud (Founder)
**Date:** 17 March 2026
**Status:** Approved for Development
**Classification:** Confidential
**Supersedes:** PRD v2.0 (15 March 2026)

---

## 1. Executive Summary

Property Lens is a mobile-first property inspection application targeting the South African rental market. The app enables estate agents, property inspectors, and landlords to conduct professional incoming and outgoing property inspections using a card-based, minimal-typing interface with AI-powered condition assessment.

The product targets the underserved segment below enterprise platforms like RedRabbit/WeconnectU: solo inspectors, small agencies, and new entrants who need a self-contained, affordable, and offline-capable tool.

**The output report must meet the professional standard of established UK/international inventory firms (Chase Hammond, InventoryBase, etc.).** This is non-negotiable — the report is the product. If it looks amateur, the business fails.

### 1.1 Vision Statement

The fastest, smartest way to inspect a rental property in South Africa. Inspect anywhere, AI catches up when you are back online.

### 1.2 Key Differentiators

- **AI vision condition assessment from day one** — analyses photos and suggests condition ratings and item descriptions automatically
- **Offline-first architecture** — complete inspections work without internet, AI defers to sync queue
- **Card-based minimal-typing UI** — tap, photograph, rate. No forms, no scrolling through dropdown menus
- **Professional dual-column reports** — check-in and check-out in one document, matching industry standards
- **Self-contained mobile app** — no portal account, no enterprise onboarding. Download and inspect.
- **Transparent pricing in ZAR** — self-serve signup, no demo-gated sales process

---

## 2. Market Context & Competitive Analysis

### 2.1 Market Opportunity

South Africa has approximately 2.3 million formal rental properties. The Rental Housing Amendment Act and PPRA regulations create compliance pressure on agents to document property condition professionally.

### 2.2 Competitive Landscape

| Feature | RedRabbit | Manual Methods | Property Lens |
|---------|-----------|----------------|---------------|
| Pricing | Quote-on-request | Free (time cost) | Freemium + ZAR tiers |
| AI Vision | None | None | Day 1 feature |
| Offline Mode | Partial (sync-dependent) | Full (pen and paper) | Full (offline-first) |
| Standalone App | No (requires portal) | N/A | Yes |
| Target Segment | Mid-large agencies | Everyone | Solo inspectors, small agencies |
| Dual-column report | Yes (within platform) | Manual comparison | Yes — single document |
| Photo quality | HD multi-shot | N/A | 1000px+ per photo, no compression on export |
| WhatsApp integration | None | N/A | Native tenant intake + report delivery (Phase 3) |

### 2.3 RedRabbit Gap Analysis

RedRabbit, now part of the WeconnectU ecosystem, has won the mid-to-large agency segment and is pulling further upmarket. Key gaps exploitable by Property Lens:

- No public pricing creates friction for small operators
- Zero AI vision capability anywhere in their stack
- Mobile app requires a portal account, not standalone
- Cloud-first architecture is weak in low-connectivity SA areas
- Template-bound reports with limited customisation

---

## 3. Product Architecture

### 3.1 App Structure

| Screen | Description |
|--------|-------------|
| Home Screen | Properties dashboard, new inspection button, saved reports, settings |
| New Inspection | Property address (autocomplete), unit number, check-in/check-out selection, tenant & inspector details |
| Inspection Editor | Room palette, room cards with inspection items, photo capture, condition rating |
| Report Preview | Generated PDF preview, share/email/download, digital signature capture |
| Properties Dashboard | Properties grouped by address, linked check-in/check-out inspections |
| Settings | Theme toggle (dark/light), account, default T&C template, AI preferences |

### 3.2 Data Model

The core data hierarchy:

- **Property** (address, unit number, coordinates)
  - Has many **Inspections**
- **Inspection** (type: check-in/check-out, date, status, inspector details, tenant details, signatures)
  - Belongs to a Property
  - Links to a paired inspection (check-in links to check-out and vice versa)
  - Has many **Rooms**
  - Has **Special Cards** (Keys, Electricity Meter, Water Meter)
- **Room** (type, custom name, auto-numbered, overview photos, overall condition)
  - Has many **Inspection Items**
- **Inspection Item** (name, quantity, description, condition, notes, photos)

**CRITICAL: Each Inspection Item has these fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | yes | Item name (e.g. "Walls", "Ceiling", "Sink") |
| quantity | string | no | Quantity and type (e.g. "2 x double-glazed, white wood frames") |
| description | string | no | Physical description (e.g. "Plaster painted white with ceiling-mounted LED spots") |
| condition | enum | yes | Good / Fair / Poor / Damaged / N/A |
| notes | string | no | Agent's notes on defects or comments |
| photos | array | no | Item-specific photos documenting defects |

AI vision should auto-suggest the `description` and `condition` fields from photos when available.

### 3.3 Technical Stack

- **Platform:** PWA (Progressive Web App) for MVP, native app planned for Phase 3
- **Frontend:** React with functional components and hooks
- **Styling:** Tailwind CSS with dark/light theme toggle
- **Local Storage:** IndexedDB via Dexie.js (offline-first)
- **Backend:** Supabase (auth, sync, AI queue management)
- **PDF Generation:** On-device via jsPDF
- **AI Vision:** Claude API (vision analysis, deferred queue when offline)
- **Address Autocomplete:** Google Places Autocomplete API
- **Photo Resolution:** 1000px longest edge on capture (test and bump to 1500/2000px if needed). No additional compression on PDF export — embed at captured resolution.

---

## 4. Inspection Flow Specification

### 4.1 Starting a New Inspection

When the user taps "New Inspection":

1. Enter property address using Google Places Autocomplete (type-ahead suggestions). Fallback: manual text entry when offline.
2. Enter unit/apartment number (optional)
3. Select inspection type: **Check-In** or **Check-Out**
4. Enter **tenant details**: full name, phone number, email, forwarding address (check-out only)
5. Enter **inspector/agent details**: name, company, contact
6. If Check-Out selected and a previous Check-In exists for that address, the app loads the check-in data to pre-populate the left column
7. Default rooms are pre-loaded (see Section 4.2)
8. Special cards (Keys, Meters) are always present (see Section 4.4)

### 4.2 Room System

#### 4.2.1 Default Rooms

Every new inspection is pre-loaded with these rooms. Each can be removed if not applicable:

| Room Type | Default Inspection Items |
|-----------|------------------------|
| Bedroom | Walls, Ceiling, Floor, Windows, Door, Light Fixtures, Power Points, Curtains/Blinds, Built-in Cupboards, Switches & Sockets, Heating, Smoke Alarm |
| Bathroom | Toilet, Basin, Shower/Bath, Tiles, Mirror, Extractor Fan, Towel Rails, Light Fixtures, Switches & Sockets, Bathroom Cabinet, Shaver Socket |
| Kitchen | Countertops, Sink/Drainer, Stove/Hob, Oven, Microwave, Fridge/Freezer, Dishwasher, Extractor, Cupboards (Wall), Cupboards (Base), Drawers, Tiles/Splashback, Light Fixtures, Switches & Sockets |
| Living Area | Walls, Ceiling, Floor, Windows, Door, Light Fixtures, Power Points, Curtains/Blinds, Fireplace, Switches & Sockets, Heating, Smoke Alarm |
| Dining Room | Walls, Ceiling, Floor, Windows, Door, Light Fixtures, Power Points, Curtains/Blinds, Switches & Sockets |
| Garden | Lawn, Fencing, Gate, Paving, Pool, Irrigation, Trees/Plants, Garden Shed, Exterior Walls |

#### 4.2.2 Adding Rooms

The "+ Add Area" button opens a room picker with two sections:

- **Preset:** Bedroom, Bathroom, Toilet, Kitchen, Living Area, Dining Room, Garden, Garage, Laundry, Study, Balcony, Storeroom, Entrance Hall, Passage, Shower Room
- **Custom:** Text field for agent to type any custom area name (e.g. Staff Quarters, Wine Cellar, Server Room)

When a duplicate room type is added, it auto-numbers: Bedroom 2, Bedroom 3, Bathroom 2, etc. Each duplicate inherits the default inspection items for that room type.

#### 4.2.3 Removing Rooms

Each room card has a remove button. Removing a room that contains completed inspection data requires confirmation. Numbering adjusts automatically.

### 4.3 Inside a Room

Each room displays as a card. Tapping a room card opens the room detail view:

#### 4.3.1 Room Overview Photos

- **Minimum 2 overview photos required per room** (enforced before room can be marked complete)
- Photos captured via device camera or selected from gallery
- No upper limit on additional photos
- Photos are labelled automatically: "Bedroom (Angle 1)", "Bedroom (Angle 2)", etc.
- These appear in the Photo Gallery section of the PDF report

#### 4.3.2 Inspection Items

Each room comes pre-loaded with inspection items appropriate to its type (see table in 4.2.1). The agent can add or remove items.

Each inspection item has:

- **Quantity field** (optional) — e.g. "2 x double-glazed, white wood frames"
- **Description field** (optional) — e.g. "Plaster painted white with ceiling-mounted LED spots"
- **Condition rating:** Good / Fair / Poor / Damaged / N/A (tap to select, colour-coded)
- **Notes field** — agent types or uses device dictation for defect details
- **Optional photos** — to document specific defects (these appear in the Photo Gallery under the item name)
- **AI vision suggestion** — auto-suggests description, condition, and notes from photos

AI vision can auto-populate the quantity and description fields. The agent confirms, edits, or dismisses.

#### 4.3.3 Condition Rating Colours

| Rating | Colour | Hex |
|--------|--------|-----|
| Good | Green | #06D6A0 |
| Fair | Amber | #FFD166 |
| Poor | Orange | #F97316 |
| Damaged | Red | #EF476F |
| N/A | Grey | #636E72 |

### 4.4 Special Cards

These are always present at the top of every inspection and cannot be removed:

#### Keys

| Field | Type | Required |
|-------|------|----------|
| Photo | image | yes (minimum 1) |
| Key type | string | yes (e.g. "Front door", "Communal", "Window", "Fob/swipe", "Garage", "Misc") |
| Quantity | number | yes |
| Description | string | no (e.g. "1 x chrome Yale") |
| Check-in count | number | yes |
| Check-out count | number | yes (filled during check-out) |

Keys should support multiple entries (e.g. 3 different key types). The report renders as a table with check-in and check-out columns.

#### Electricity Meter

| Field | Type | Required |
|-------|------|----------|
| Photo | image | yes (minimum 1) |
| Location | string | yes (e.g. "Garage", "Shower room cupboard") |
| Serial number | string | yes |
| Reading In | string | yes |
| Reading Out | string | yes (filled during check-out) |

#### Water Meter

| Field | Type | Required |
|-------|------|----------|
| Photo | image | yes (minimum 1) |
| Location | string | yes (e.g. "Pavement", "Front garden") |
| Serial number | string | yes |
| Reading In | string | yes |
| Reading Out | string | yes (filled during check-out) |

### 4.5 Appliances

Each kitchen and utility room should include an appliance checklist. Each appliance entry captures:

| Field | Type | Required |
|-------|------|----------|
| Appliance name | string | yes (e.g. "Oven", "Fridge/Freezer", "Washing Machine") |
| Brand/model | string | no (e.g. "SIEMENS") |
| Condition | enum | yes (Good / Fair / Poor / Damaged / N/A) |
| Photo | image | yes (minimum 1 per appliance) |
| Notes | string | no |

Default appliance list for Kitchen: Oven, Hob, Microwave, Fridge/Freezer, Dishwasher, Washing Machine/Dryer, Extractor. Agent can add/remove.

### 4.6 Navigation

The inspection editor uses **free navigation**. The agent can jump between any room at any time. A progress indicator shows which rooms are complete, in progress, or not started. Rooms are complete when all required fields are filled (minimum 2 overview photos, all items rated).

---

## 5. AI Vision Specification

### 5.1 How It Works

1. Agent takes a photo of a room or item
2. Photo is sent to Claude API with a structured prompt asking for condition assessment
3. API returns: suggested condition rating, confidence score, item description, and descriptive notes
4. Suggestion appears as pre-filled fields that the agent can confirm, edit, or dismiss
5. **Agent always has final authority.** AI suggestions are clearly labelled.

### 5.2 AI Auto-Population Targets

AI vision should attempt to populate these fields:

- **Item description** (e.g. "White ceramic with chrome mixer tap and plug hole")
- **Item quantity** (e.g. "4 x ceiling mounted LED spots, white aluminium fittings")
- **Condition rating** (Good / Fair / Poor / Damaged)
- **Defect notes** (e.g. "Light paint cracking and painted over imperfections throughout")
- **Room-level summary notes** (aggregated from all items in the room)

### 5.3 Offline Behaviour

AI vision requires internet connectivity. The offline behaviour is:

1. Agent completes inspection fully offline using manual condition ratings
2. All photos are queued locally on the device
3. When connectivity is restored, the queue fires automatically
4. AI analyses each photo and updates the inspection with suggested ratings, descriptions, and notes
5. Agent receives a notification and can review/confirm each suggestion
6. Report can be generated at any time, with or without AI suggestions

### 5.4 Cost Management

- Batch photos per room rather than per-photo API calls
- Photos embedded at captured resolution (1000px) — no additional compression
- Credit-based system for paid tiers (e.g. 50 AI analyses/month on Solo, 200 on Pro)
- Free tier receives limited AI credits to demonstrate value

---

## 6. Report Specification (CRITICAL — Professional Standard Required)

**The PDF report is the product.** It must match the professional standard of established inspection firms. The Chase Hammond report format is the benchmark.

### 6.1 Report Page Structure

The PDF report follows this exact page order:

```
Page 1:    Cover Page
Page 2-3:  Terms & Conditions
Page 4:    Property Overview (summary table)
Page 5:    Utility Readings (Electricity, Water — with photos)
Page 6:    Keys & Tenant Details
Page 7:    Manuals Checklist (optional)
Page 8+:   Room-by-Room Detail (one room per page or as needed)
Page N-2:  Photo Gallery (3×2 grid, 6 photos per page, labelled)
Page N-1:  Declaration
Page N:    Signatures
```

### 6.2 Cover Page

- Property Lens branding (logo, colours)
- Property address and unit number
- Date of inspection
- Client / agency name
- Inspection type checkboxes: Inventory Make / Check-In / Check-Out
- Inspector company details (name, address, contact)
- Subtitle: "Independent Schedule of Condition and Inventory"

### 6.3 Terms & Conditions

A default SA-specific legal disclaimer page covering:

- Scope of inspection (accessible areas only, not a valuation)
- Electrical/gas appliances not tested
- Photography limitations
- Liability exclusions
- 7-day tenant review period
- Tenant check-out guidelines

Agents on paid tiers can customise this text. Free tier uses the default.

### 6.4 Property Overview

A single-page summary table with **two columns: Condition at Check-In / Condition at Check-Out**:

| Category | Condition at Check-In | Condition at Check-Out |
|----------|----------------------|----------------------|
| Cleanliness | Professionally cleaned | _(empty until check-out)_ |
| General overview | Two bedroom property in good overall condition | |
| Decorative order | Neutral colours, good condition | |
| Lighting | Good working condition | |
| Windows | Good overall condition | |
| Curtains/blinds | Good overall condition | |
| Skirting & woodwork | Good overall condition | |
| Carpets/flooring | Good overall condition | |
| Kitchen & appliances | Good overall condition | |
| Bathroom & fittings | Good overall condition | |
| External | Good condition | |

This page is **auto-generated** from the room-by-room data. The agent does not fill this in manually — it aggregates the worst condition rating per category across all rooms.

### 6.5 Utility Readings

Structured tables for each meter with photo alongside:

**Electricity:**
| Field | Value |
|-------|-------|
| Location | _(from data)_ |
| Serial Number | _(from data)_ |
| Reading In | _(from data)_ |
| Reading Out | _(empty until check-out)_ |

Photo displayed next to the table (same layout as Chase Hammond).

Same structure for **Water** meter.

### 6.6 Keys & Tenant Details

**Tenant Details table:**

| Field | Check-In | Check-Out |
|-------|----------|-----------|
| Full name | | |
| Telephone | | |
| Email | | |
| Forwarding address | | _(filled at check-out)_ |

**Keys table:**

| Key Type | Number at Check-In | Number at Check-Out |
|----------|-------------------|-------------------|
| Front door | 1 x chrome Yale | |
| Window | 3 x chrome | |
| Misc | 1 x garage remote | |

Photo of keys displayed alongside the table.

### 6.7 Room-by-Room Detail

Each room renders as a section with the following structure:

**Room header:** Room name (e.g. "Entrance Hallway / Stairway")

**Room detail table — dual column format:**

| Item | Quantity and Description | Condition at Check-In | Condition at Check-Out | Comments |
|------|------------------------|----------------------|----------------------|----------|
| Ceiling | Plaster painted white | Good condition | _(empty)_ | |
| Walls | Plaster painted white, including motion sensor | Good condition | | Light scuffs at mid level |
| Flooring | Dark wood laminate | Good condition | | Occasional light scratches |
| Lighting | 4 x ceiling LED spots, white fittings | Good working condition | | |
| Windows | 2 x double-glazed, white wood frames | Good condition | | |

**Key rules for this table:**
- The "Quantity and Description" column contains the physical description of each item — this is what makes the report legally useful
- Condition at Check-In is filled during check-in
- Condition at Check-Out column is **always present but empty** during check-in (filled during check-out)
- Comments column captures defects and notes
- Condition text is colour-coded (green for Good, amber for Fair, orange for Poor, red for Damaged)
- AI vision auto-populates Quantity/Description and Condition. Agent confirms.

**Room-level notes** (optional): AI-generated summary of overall room condition appears below the table.

### 6.8 Photo Gallery

The photo gallery appears at the **end of the report**, before the Declaration page. Photos are arranged in a **3×2 grid (6 photos per page)** with labelled headers above each photo.

**Photo order (mandatory):**

1. **Room overview photos** — in room order, labelled:
   - "Bedroom (Angle 1)"
   - "Bedroom (Angle 2)"
   - "Kitchen (Angle 1)"
   - "Kitchen (Angle 2)"
   - etc.

2. **Special card photos** — after room overviews:
   - "Keys"
   - "Electricity Meter"
   - "Water Meter"

3. **Appliance photos** — after special cards:
   - "Kitchen — Oven"
   - "Kitchen — Hob"
   - "Kitchen — Fridge/Freezer"
   - etc.

4. **Defect / damage item photos** — last:
   - "Bedroom — Windows 2" (if a photo was taken of a damaged window)
   - "Bathroom — Tiles" (if a photo was taken of cracked tiles)
   - etc.

**Photo heading generation logic:**
- Room overview photos: `{RoomName} (Angle {N})`
- Special cards: `{CardName}`
- Appliance photos: `{RoomName} — {ApplianceName}`
- Item defect photos: `{RoomName} — {ItemName}`

**Photo quality:** Embedded at captured resolution (1000px longest edge). No additional compression during PDF export. If 1000px proves insufficient after testing, bump to 1500px or 2000px (single config change).

### 6.9 Declaration

Legal declaration text:

> "This is to certify that we the undersigned have carefully checked the foregoing Inventory Report and subject to the marginal notes, consider this to be a fair and correct schedule of condition of the property and items mentioned in the report."

Followed by fields for:

| Role | Name | Signature at Check-In | Signature at Check-Out |
|------|------|----------------------|----------------------|
| Tenant | | | |
| Landlord / Owner | | | |
| Agent / Inspector | | | |
| Date | | | |

### 6.10 Signatures

Digital signature capture for all parties. Each signature is:
- Drawn on device screen (canvas)
- Or typed name (fallback)
- Embedded in PDF
- Stored with inspection record

Signatures are captured at the end of the inspection but can be added later (e.g. if tenant was not present).

### 6.11 Report Branding

- **Free tier:** Property Lens watermark on every page + footer link "Generated with Property Lens — propertylens.co.za"
- **Solo tier:** Unbranded (watermark removed)
- **Agency Pro tier:** White-label — agent's own logo, company name, colours

### 6.12 Report Delivery

- PDF download to device
- Shareable web link (hosted report accessible via URL)
- Email directly from the app
- WhatsApp share (Phase 3)

---

## 7. Offline-First Architecture

Property Lens is designed to function fully without internet connectivity. This is a core differentiator and a non-negotiable requirement.

### 7.1 What Works Offline

- Creating new inspections
- Adding/removing rooms and items
- Capturing photos (camera and gallery)
- Rating conditions, adding descriptions, and adding notes
- Generating PDF reports (including photo gallery)
- Viewing saved inspections and properties
- Capturing digital signatures

### 7.2 What Requires Connectivity

- AI vision analysis (deferred to queue when offline)
- Google Places address autocomplete (fallback: manual text entry)
- Syncing data to cloud backup
- Sharing reports via web link or email
- Account authentication (cached session persists offline)

### 7.3 Sync Strategy

When connectivity is restored:

- AI vision queue processes automatically
- Local data syncs to Supabase cloud
- Conflicts resolved by last-write-wins with local priority
- Sync status indicator visible in the app header

---

## 8. UX & Visual Design

### 8.1 Design Philosophy

The interface is designed for speed in the field. Agents are walking through properties, often in poor lighting, with one hand holding a phone. Every interaction should be achievable with one thumb tap. Minimal typing, maximum tapping.

The quantity and description fields per item add data density to the report but should NOT slow down the inspection. These fields are:
- Optional for manual entry (agent can skip and just rate condition)
- Auto-populated by AI vision when available
- Pre-filled with sensible defaults where possible

### 8.2 Theme

The app supports a **user-togglable dark/light theme**. Default theme is determined by device system setting.

- Clean, professional aesthetic suitable for showing to clients
- Colour-coded condition ratings provide instant visual status
- Large tap targets for field use
- Card-based layout throughout

### 8.3 Photo Capture UX

- Camera opens full-screen with a simple capture button
- Gallery option available alongside camera
- Photo preview with retake option before accepting
- Photos stored at 1000px longest edge (configurable)
- No additional compression on PDF export
- Minimum 2 overview photos per room enforced with clear visual indicator
- Minimum 1 photo per special card (Keys, Electricity Meter, Water Meter)
- Minimum 1 photo per appliance

---

## 9. Monetisation Strategy

Detailed monetisation and pricing to be finalised before launch.

### 9.1 Pricing Framework

| Tier | Price | Includes |
|------|-------|----------|
| Free / Starter | R0/mo | 5 inspections/month, watermarked PDF reports, basic templates |
| Solo Inspector | R199-R249/mo | Unlimited inspections, unbranded reports, AI vision credits, offline mode |
| Small Agency | R499-R699/mo | Up to 3 inspectors, shared templates, basic analytics, priority AI |
| Agency Pro | R1,200+/mo | Unlimited inspectors, white-label reports, full AI, API access, custom T&C |

### 9.2 Revenue Target

R40,000/month within 12-16 months of launch.

### 9.3 Watermarked Report Viral Loop

Free tier PDF reports carry a subtle Property Lens watermark and footer link. Every report shared with landlords, tenants, or body corporates acts as a marketing asset.

---

## 10. Development Roadmap

### 10.1 Phase 1: MVP (Current Sprint)

**App Core (mostly complete):**
- Core inspection flow: property creation, room system, item cards, condition ratings
- Photo capture (camera + gallery) with minimum 2 per room enforcement
- Special cards: Keys, Electricity Meter, Water Meter
- AI vision integration with toggle and deferred queue
- Digital signature capture
- Dark/light theme toggle
- PWA deployment
- Offline-first local storage

**Report Professionalisation Sprint (next priority):**
- Extend data model: add quantity + description fields per item
- Add serial number + location + reading out fields to meter cards
- Add key type categories with check-in/check-out columns
- Add tenant detail fields (phone, email, forwarding address)
- Add appliance checklist with photos
- Rebuild PDF generator with Chase Hammond page structure
- Implement dual-column check-in/check-out format
- Add Property Overview auto-generated summary page
- Add Terms & Conditions page (SA-specific default)
- Add Declaration page with all three parties
- Implement Photo Gallery (3×2 grid, labelled, ordered: rooms → special cards → appliances → defects)
- Move Anthropic API key to server-side proxy

### 10.2 Phase 2: Growth (Weeks 9-16)

- Shareable web report links
- Email reports directly from app
- User accounts and cloud sync via Supabase
- Properties dashboard with search and filter
- Watermarked free-tier reports
- Custom T&C templates for agencies
- Photo resolution configuration (1000/1500/2000px)

### 10.3 Phase 3: Scale (Weeks 17+)

- Native app (App Store + Play Store) with ASO optimisation
- Multi-inspector accounts for agencies
- White-label report branding
- Custom inspection templates
- Franchise partnership features
- WhatsApp tenant intake integration
- WhatsApp report delivery
- Maintenance contractor marketplace

---

## 11. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Report looks amateur | **Critical** | Chase Hammond format is the benchmark. PDF rebuild is top priority. |
| AI vision accuracy | High | Confidence scores, always present as suggestions, easy override |
| API key exposure | High | Move to server-side proxy before production deployment |
| API costs at scale | Medium | Credit-based limits, photo compression, batch processing |
| Offline sync conflicts | Medium | Last-write-wins with local priority, clear sync indicators |
| Google Places costs | Low | Fallback to manual text entry, cache frequent addresses |
| Photo quality in PDF | Medium | Start at 1000px, test, bump if needed. No compression on export. |
| RedRabbit response | Low | They are moving upmarket; our segment is below their focus |
| PWA limitations | Medium | Camera access works in modern browsers; native app Phase 3 |
| SA load-shedding | High | Offline-first by design; this is our advantage |

---

## 12. Open Questions

- Exact AI vision prompt engineering for auto-populating description + quantity fields
- Supabase schema design for multi-device sync and paired inspections
- SA-specific Terms & Conditions legal review
- PPRA and Rental Housing Act compliance field requirements
- App Store listing copy and screenshot strategy (Phase 3)
- Exact free-tier inspection limit and AI credit allocation

---

## Appendix A: Photo Gallery Label Generation

The photo gallery section of the PDF uses auto-generated headings. The generation logic:

```
For each room (in inspection order):
  For each overview photo (index i):
    Label = "{RoomName} (Angle {i+1})"
    Example: "Bedroom (Angle 1)", "Bedroom (Angle 2)"

For each special card:
  For each photo:
    Label = "{CardName}"
    Example: "Keys", "Electricity Meter", "Water Meter"

For each appliance (in room order):
  For each photo:
    Label = "{ApplianceName}"
    Example: "Oven", "Hob", "Dishwasher", "Washing Machine"

For each item with defect photos (in room order):
  For each photo:
    Label = "{RoomName} — {ItemName}"
    Example: "Bedroom — Windows 2", "Bathroom — Tiles"
```

Photos are arranged 3 across × 2 down = 6 per page. Each photo has a dark header bar above it with white text label (matching Chase Hammond gallery style). Gallery pages are numbered "Photograph Gallery (1)", "Photograph Gallery (2)", etc.

---

## Appendix B: Changes from PRD v2.0

| Change | Reason |
|--------|--------|
| Added quantity + description fields per inspection item | Match Chase Hammond data density for legally defensible reports |
| Added dual-column check-in/check-out format | Industry standard — one document, both states |
| Added Property Overview summary page | Professional report structure |
| Added Terms & Conditions page | Liability protection |
| Added Declaration page with all parties | Legal compliance |
| Added Photo Gallery specification (3×2, labelled, ordered) | Match Chase Hammond photo gallery format |
| Added serial number and Reading Out to meter cards | Complete utility documentation |
| Added key type categories with dual columns | Match Chase Hammond key inventory format |
| Added tenant detail fields | Complete tenant documentation |
| Added appliance checklist with photos | Match Chase Hammond appliance documentation |
| Added Manuals checklist (optional) | Match Chase Hammond feature |
| Specified photo quality: no compression on PDF export | Preserve evidence quality |
| Elevated report quality to Critical risk | The report IS the product |
| Added Appendix A: Photo gallery label generation logic | Clear spec for implementation |
