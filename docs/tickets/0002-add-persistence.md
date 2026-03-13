# Ticket 0002 — Add Persistence (localStorage)

## Goal
Keep inspection data between reloads by persisting reports in `localStorage`.

## Acceptance Criteria
- ✅ Reports persist in the browser after refresh.
- ✅ New inspection creation, updates, and deletes are saved automatically.
- ✅ Existing UI remains unchanged except for persistence behavior.

## Tasks
- [ ] Add a persistence layer that loads saved reports from `localStorage` on app start.
- [ ] Save reports automatically whenever they are created or updated.
- [ ] Add a “Delete Report” action on the dashboard.
- [ ] Add a basic “Reset” or “Clear all data” option for dev/testing.

## Testing
- Create a new inspection, refresh the browser, and verify it is still listed.
- Update a room entry, refresh, and verify changes persist.
- Delete a report and ensure it is removed after a refresh.
