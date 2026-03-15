# Property Lens — Product Requirements Document v2.0

**Company:** DarkLoud Digital
**Author:** Claude (CEO) + DarkCloud (Founder)
**Date:** 15 March 2026
**Status:** Approved for Development
**Classification:** Confidential

---

## 1. Executive Summary

Property Lens is a mobile-first property inspection application targeting the South African rental market. The app enables estate agents, property inspectors, and landlords to conduct professional incoming and outgoing property inspections using a card-based, minimal-typing interface with AI-powered condition assessment.

The product targets the underserved segment below enterprise platforms like RedRabbit/WeconnectU: solo inspectors, small agencies, and new entrants who need a self-contained, affordable, and offline-capable tool.

### 1.1 Vision Statement

The fastest, smartest way to inspect a rental property in South Africa. Inspect anywhere, AI catches up when you are back online.

### 1.2 Key Differentiators

- **AI vision condition assessment from day one** — analyses photos and suggests condition ratings automatically
- **Offline-first architecture** — complete inspections work without internet, AI defers to sync queue
- **Card-based minimal-typing UI** — tap, photograph, rate. No forms, no scrolling through dropdown menus
- **Side-by-side check-in/check-out comparison** — instant visual evidence for deposit disputes
- **Self-contained mobile app** — no portal account, no enterprise onboarding. Download and inspect.
- **Transparent pricing in ZAR** — self-serve signup, no demo-gated sales process

---

## 2. Market Context & Competitive Analysis

### 2.1 Market Opportunity

South Africa has approximately 2.3 million formal rental properties. The Rental Housing Amendment Act and PPRA regulations create compliance pressure on agents to document property condition professionally. The inspection software market is dominated by a single incumbent.

### 2.2 Competitive Landscape

| Feature | RedRabbit | Manual Methods | Property Lens |
|---------|-----------|----------------|---------------|
| Pricing | Quote-on-request | Free (time cost) | Freemium + ZAR tiers |
| AI Vision | None | None | Day 1 feature |
| Offline Mode | Partial (sync-dependent) | Full (pen and paper) | Full (offline-first) |
| Standalone App | No (requires portal) | N/A | Yes |
| Target Segment | Mid-large agencies | Everyone | Solo inspectors, small agencies |
| Check-in/out Compare | Yes (within platform) | Manual comparison | Side-by-side photos |

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
| New Inspection | Property address (autocomplete), unit number, check-in/check-out selection |
| Inspection Editor | Room palette, room cards with inspection items, photo capture, condition rating |
| Report View | Generated PDF preview, share/email/download, digital signature capture |
| Properties Dashboard | Properties grouped by address, linked check-in/check-out inspections |
| Settings | Theme toggle (dark/light), account, templates, AI preferences |

### 3.2 Data Model

The core data hierarchy:

- **Property** (address, unit number, coordinates)
  - Has many **Inspections**
- **Inspection** (type: check-in/check-out, date, status, signatures)
  - Belongs to a Property
  - Has many **Rooms**
- **Room** (type, custom name, auto-numbered, overview photos)
  - Has many **Inspection Items**
- **Inspection Item** (name, condition rating, notes, photos)

### 3.3 Technical Stack

- **Platform:** PWA (Progressive Web App) for MVP, native app planned for Phase 3
- **Frontend:** React with functional components and hooks
- **Styling:** Tailwind CSS with dark/light theme toggle
- **Local Storage:** IndexedDB via Dexie.js (offline-first)
- **Backend:** Supabase (auth, sync, AI queue management)
- **PDF Generation:** On-device via jsPDF
- **AI Vision:** Claude API (vision analysis, deferred queue when offline)
- **Address Autocomplete:** Google Places Autocomplete API

---

## 4. Inspection Flow Specification

### 4.1 Starting a New Inspection

When the user taps "New Inspection", the following flow begins:

1. Enter property address using Google Places Autocomplete (type-ahead suggestions)
2. Enter unit/apartment number (optional)
3. Select inspection type: **Check-In** or **Check-Out**
4. If Check-Out selected and a previous Check-In exists for that address, the app loads the check-in data for side-by-side comparison
5. Default rooms are pre-loaded (see Section 4.2)
6. Special cards (Keys, Meters) are always present (see Section 4.4)

### 4.2 Room System

#### 4.2.1 Default Rooms

Every new inspection is pre-loaded with these rooms. Each can be removed if not applicable (e.g. no garden in an apartment):

| Room Type | Default Inspection Items |
|-----------|------------------------|
| Bedroom | Walls, Ceiling, Floor, Windows, Door, Light Fixtures, Power Points, Curtains/Blinds, Built-in Cupboards |
| Bathroom | Toilet, Basin, Shower/Bath, Tiles, Mirror, Extractor Fan, Towel Rails, Light Fixtures, Power Points |
| Kitchen | Countertops, Sink, Stove/Hob, Oven, Cupboards, Tiles/Splashback, Extractor, Light Fixtures, Power Points |
| Living Area | Walls, Ceiling, Floor, Windows, Door, Light Fixtures, Power Points, Curtains/Blinds, Fireplace |
| Dining Room | Walls, Ceiling, Floor, Windows, Door, Light Fixtures, Power Points, Curtains/Blinds |
| Garden | Lawn, Fencing, Gate, Paving, Pool, Irrigation, Trees/Plants, Garden Shed, Exterior Walls |

#### 4.2.2 Adding Rooms

The "+ Add Area" button opens a room picker with two sections:

- **Preset:** Bedroom, Bathroom, Toilet, Kitchen, Living Area, Dining Room, Garden, Garage, Laundry, Study, Balcony, Storeroom, Entrance Hall, Passage
- **Custom:** Text field for agent to type any custom area name (e.g. Staff Quarters, Wine Cellar, Server Room)

When a duplicate room type is added, it auto-numbers: Bedroom 2, Bedroom 3, Bathroom 2, etc. Each duplicate inherits the default inspection items for that room type.

#### 4.2.3 Removing Rooms

Each room card has a remove button. Removing a room that contains completed inspection data requires confirmation. Numbering adjusts automatically (removing Bedroom 2 of 3 renumbers the third to Bedroom 2).

### 4.3 Inside a Room

Each room displays as a card. Tapping a room card opens the room detail view:

#### 4.3.1 Room Overview Photos

- **Minimum 2 overview photos required per room** (enforced before room can be marked complete)
- Photos captured via device camera or selected from gallery
- No upper limit on additional photos
- During Check-Out, previous Check-In photos display side-by-side (check-in left, check-out right)

#### 4.3.2 Inspection Items

Each room comes pre-loaded with inspection items appropriate to its type (see table in 4.2.1). The agent can add or remove items.

Each inspection item has:

- **Condition rating:** Good / Fair / Poor / Damaged / N/A (tap to select, colour-coded)
- **Text notes field** (agent types or uses device dictation)
- **Optional photos** to document specific issues (no minimum, no upper limit)
- **AI vision suggestion** (when online or after sync): auto-suggests condition and notes from photos

#### 4.3.3 Condition Rating Colours

| Rating | Colour |
|--------|--------|
| Good | Green (#06D6A0) |
| Fair | Amber (#FFD166) |
| Poor | Orange (#F97316) |
| Damaged | Red (#EF476F) |
| N/A | Grey (#636E72) |

### 4.4 Special Cards

These are always present at the top of every inspection and cannot be removed:

| Card | Fields |
|------|--------|
| Keys | Photo slot, description field, key count |
| Electricity Meter | Photo slot, meter number field, current reading field |
| Water Meter | Photo slot, meter number field, current reading field |

### 4.5 Navigation

The inspection editor uses **free navigation**. The agent can jump between any room at any time. A progress indicator shows which rooms are complete, in progress, or not started. Rooms are complete when all required fields are filled (minimum 2 overview photos, all items rated).

---

## 5. AI Vision Specification

### 5.1 How It Works

1. Agent takes a photo of a room or item
2. Photo is sent to Claude API with a structured prompt asking for condition assessment
3. API returns a suggested condition rating (Good/Fair/Poor/Damaged) and descriptive notes
4. Suggestion appears as a pre-filled card that the agent can confirm, edit, or dismiss
5. **Agent always has final authority.** AI suggestions are clearly labelled as suggestions.

### 5.2 Offline Behaviour

AI vision requires internet connectivity. The offline behaviour is:

1. Agent completes inspection fully offline using manual condition ratings
2. All photos are queued locally on the device
3. When connectivity is restored, the queue fires automatically
4. AI analyses each photo and updates the inspection with suggested ratings and notes
5. Agent receives a notification and can review/confirm each suggestion
6. Report can be generated at any time, with or without AI suggestions

### 5.3 AI Prompt Structure

Each photo is sent with context: room type, item name, inspection type (check-in/check-out). The API is asked to return structured JSON with condition rating, confidence score, and descriptive notes. This enables consistent parsing and UI display.

### 5.4 Cost Management

AI vision calls incur API costs. Cost management strategies:

- Batch photos per room rather than per-photo API calls
- Compress photos before upload (target 800px longest edge)
- Credit-based system for paid tiers (e.g. 50 AI analyses/month on Solo, 200 on Pro)
- Free tier receives limited AI credits to demonstrate value

---

## 6. Report System

### 6.1 Report Generation

Reports are generated on-device as PDF documents. The report includes:

- Property address and unit number
- Inspection type (Check-In / Check-Out) and date
- Inspector/agent details
- All rooms with overview photos and item-by-item condition ratings
- Side-by-side comparison photos (for Check-Out reports where Check-In exists)
- Special cards data (keys, meter readings)
- Digital signatures (agent and tenant)
- Timestamp and unique report reference number

### 6.2 Report Delivery

- PDF download to device
- Shareable web link (hosted report accessible via URL)
- Email directly from the app

### 6.3 Check-In vs Check-Out Comparison

When a Check-Out inspection is generated for a property that has an existing Check-In:

- Photos display **side-by-side: check-in on the left, check-out on the right**
- Condition ratings are compared with change indicators (improved/unchanged/deteriorated)
- The report highlights items where condition has worsened, providing clear evidence for deposit disputes

### 6.4 Digital Signatures

Both the agent/inspector and the tenant can sign on the device screen. Signatures are embedded in the PDF report and stored with the inspection record. The signature field is mandatory for report completion but can be captured after the inspection (e.g. if tenant was not present).

### 6.5 Properties Dashboard

All inspections are grouped by property address in a Properties dashboard. Each property shows:

- Property address and unit number
- List of inspections (check-in and check-out) with dates and status
- Quick access to generate comparison reports
- Search and filter by address, date, or status

---

## 7. Offline-First Architecture

Property Lens is designed to function fully without internet connectivity. This is a core differentiator and a non-negotiable requirement.

### 7.1 What Works Offline

- Creating new inspections
- Adding/removing rooms and items
- Capturing photos (camera and gallery)
- Rating conditions and adding notes
- Generating PDF reports
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
- Photos are compressed automatically for storage efficiency
- Minimum 2 overview photos per room enforced with clear visual indicator

---

## 9. Monetisation Strategy

Detailed monetisation and pricing to be finalised before launch. The following framework has been agreed:

### 9.1 Pricing Framework

| Tier | Price | Includes |
|------|-------|----------|
| Free / Starter | R0/mo | 5 inspections/month, watermarked PDF reports, basic templates |
| Solo Inspector | R199-R249/mo | Unlimited inspections, unbranded reports, AI vision credits, offline mode |
| Small Agency | R499-R699/mo | Up to 3 inspectors, shared templates, basic analytics, priority AI |
| Agency Pro | R1,200+/mo | Unlimited inspectors, white-label reports, full AI, API access, WhatsApp integration |

### 9.2 Revenue Target

R40,000/month within 12-16 months of launch. Achievable with approximately 80-100 paying users across tiers, or fewer with agency-level accounts.

### 9.3 Watermarked Report Viral Loop

Free tier PDF reports carry a subtle Property Lens watermark and footer link. Every report shared with landlords, tenants, or body corporates acts as a marketing asset. This is the primary organic growth mechanism and should be prioritised from day one.

---

## 10. Development Roadmap

### 10.1 Phase 1: MVP (Weeks 1-8)

- Core inspection flow: property creation, room system, item cards, condition ratings
- Photo capture (camera + gallery) with minimum 2 per room enforcement
- Special cards: Keys, Electricity Meter, Water Meter
- PDF report generation on-device
- Offline-first local storage (IndexedDB)
- Google Places address autocomplete
- AI vision integration with deferred queue
- Digital signature capture
- Dark/light theme toggle
- PWA deployment

### 10.2 Phase 2: Growth (Weeks 9-16)

- Check-in/check-out comparison with side-by-side photos
- Shareable web report links
- Email reports directly from app
- User accounts and cloud sync via Supabase
- Properties dashboard with search and filter
- Watermarked free-tier reports

### 10.3 Phase 3: Scale (Weeks 17+)

- Native app (App Store + Play Store) with ASO optimisation
- Multi-inspector accounts for agencies
- White-label report branding
- Custom inspection templates
- Franchise partnership features
- WhatsApp tenant intake integration
- Maintenance contractor marketplace

---

## 11. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| AI vision accuracy | High | Implement confidence scores, always present as suggestions, allow easy override |
| API costs at scale | Medium | Credit-based usage limits, photo compression, batch processing |
| Offline sync conflicts | Medium | Last-write-wins with local priority, clear sync status indicators |
| Google Places costs | Low | Fallback to manual text entry, cache frequent addresses |
| RedRabbit response | Low | They are moving upmarket; our segment is below their focus |
| PWA limitations | Medium | Camera access works in modern browsers; native app planned for Phase 3 |
| SA load-shedding | High | Offline-first by design; this is our advantage, not a risk |

---

## 12. Open Questions

The following decisions are pending and will be resolved during development:

- Exact AI vision prompt engineering and response parsing format
- Supabase schema design for multi-device sync
- Report PDF template design (layout, branding, typography)
- App Store listing copy and screenshot strategy (for Phase 3 native launch)
- Exact free-tier inspection limit and AI credit allocation
- PPRA and Rental Housing Act compliance field requirements
