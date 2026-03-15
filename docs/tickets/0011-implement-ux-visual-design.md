# Ticket 0011 — Implement UX & Visual Design

## Goal
Complete the UX & visual design pass per PRD section 8. Focuses on the gaps remaining
after the Ticket 0006 rebuild: photo capture UX, PRD-accurate condition colours,
AI preferences in Settings, accessibility, and smooth theme transitions.

## PRD Alignment (§8)

### §8.1 / §8.2 — Already Implemented
- Dark/light theme with system-preference default ✅
- Card-based layout throughout ✅
- Large tap targets (py-3/py-4 buttons) ✅
- One-thumb navigation ✅

### §8.3 — Photo Capture UX (gaps)
- Camera opens full-screen → native `capture="environment"` triggers device camera ✅ (acceptable for PWA)
- **Gallery option alongside camera** → add `capture` omitted variant for gallery pick
- **Photo preview with retake before accepting** → preview modal with Use/Retake buttons ← missing
- **Photos compressed automatically** → canvas resize to 1200px max on capture ← missing

### §4.3.3 — Condition Rating Colours (PRD exact values)
Current colours differ from PRD. Update to:
- Excellent: #22c55e (keep — not specified in PRD)
- Good:      #06D6A0 (PRD: teal-green, was #86efac)
- Fair:      #FFD166 (PRD: amber, was #fbbf24)
- Poor:      #F97316 ✅ (already correct)
- Damaged:   #EF476F (PRD: red-pink, was #ef4444)
- N/A:       #636E72 ✅ (already correct)

### §3.1 — Settings: AI Preferences
Settings screen should include AI preferences (PRD §3.1). Add AI enable/disable toggle
persisted to localStorage. aiQueue checks preference before enqueuing.

### Accessibility
- ARIA roles on modal dialogs (AddRoomSheet: `role="dialog"`, `aria-modal`, focus)
- `role="switch"` + `aria-checked` on Toggle components
- `aria-label` on icon-only buttons (photo delete, FAB, close buttons)
- `aria-live` on sync status bar ✅ (already added in 0010)

### Theme Transition
- Add `transition-colors duration-200` to `body` in globals.css for smooth theme switch

## Acceptance Criteria
- ✅ Photos compressed to ≤1200px on capture; preview shown before saving.
- ✅ Condition colours match PRD §4.3.3 exactly.
- ✅ Settings has AI enable/disable toggle; aiQueue respects the preference.
- ✅ AddRoomSheet accessible: role=dialog, aria-modal, focus trap.
- ✅ Toggles have role=switch + aria-checked.
- ✅ Icon-only buttons have aria-label.
- ✅ Theme transition is smooth (200ms).

## Tasks
- [x] Create `src/lib/preferences.js`
- [x] Update `src/lib/aiQueue.js` — check AI preference
- [x] Update `src/lib/roomPresets.js` — fix condition colours
- [x] Update `tailwind.config.js` — sync condition colours
- [x] Update `src/screens/InspectionEditor/RoomEditor/index.jsx` — photo compression + preview modal
- [x] Update `src/screens/Settings/index.jsx` — AI preferences section
- [x] Update `src/screens/InspectionEditor/AddRoomSheet.jsx` — accessibility
- [x] Update `src/components/layout/BottomNav.jsx` — aria-label on FAB
- [x] Update `src/styles/globals.css` — theme transition
