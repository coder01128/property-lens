# Ticket 0007 — Implement Inspection Flow Specification

## Goal
Implement the detailed inspection flow including starting new inspections, room system, inspection items, special cards, and navigation as per section 4 of the PRD.

## Acceptance Criteria
- ✅ New inspection creation with address autocomplete and type selection.
- ✅ Room system with default rooms, adding/removing rooms, and custom rooms.
- ✅ Inspection items with condition ratings, notes, and photos.
- ✅ Special cards (Keys, Meters) always present.
- ✅ Free navigation with progress indicator.
- ✅ Minimum 2 overview photos per room enforced.

## Tasks
- [ ] Implement address autocomplete using Google Places API.
- [ ] Create room management (add, remove, duplicate numbering).
- [ ] Build inspection item cards with ratings and photo capture.
- [ ] Add special cards for keys and meters.
- [ ] Implement progress tracking and navigation.

## Testing
- Create a new inspection and add rooms.
- Rate items and capture photos.
- Verify progress indicator updates correctly.
- Ensure special cards are always present.