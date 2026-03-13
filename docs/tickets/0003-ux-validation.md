# Ticket 0003 — Improve UX and Validation

## Goal
Make the inspection workflow more user-friendly and prevent common data entry errors.

## Acceptance Criteria
- ✅ Required fields (address, tenant name, date) cannot be left blank when saving.
- ✅ Each room should require at least one item or a general note before marked complete.
- ✅ Provide clear UI feedback for validation errors.
- ✅ Provide a way to quickly jump between rooms (e.g., a room selector list).

## Tasks
- [ ] Add inline validation for the inspection header (address/tenant/date).
- [ ] Add validation for room completion (items or notes required).
- [ ] Add a room navigation UI (e.g., tabs or side list) in the inspection screen.
- [ ] Improve button states (disabled/success/error states) and consistent spacing.

## Testing
- Attempt to save an inspection with missing required fields; confirm an error is shown and save is blocked.
- Attempt to complete a room with no items/notes and verify prompt for more info.
- Navigate between rooms without losing unsaved edits.
