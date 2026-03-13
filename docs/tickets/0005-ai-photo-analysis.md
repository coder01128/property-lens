# Ticket 0005 — AI Photo Analysis (Optional)

## Goal
Ensure the optional AI photo analysis flow is stable and easy to disable/enable.

## Acceptance Criteria
- ✅ AI analysis can be explicitly enabled/disabled by the user.
- ✅ Fallback behavior works when the AI API fails (network error or invalid response).
- ✅ The UI indicates when analysis is in progress.

## Tasks
- [ ] Add a toggle to enable/disable AI photo analysis per inspection.
- [ ] Improve error handling for the `analyzePhoto` API call (retry, graceful fallback).
- [ ] Clearly show “AI-assist” state in the room view (e.g., badge or note).
- [ ] Ensure the app doesn’t hang if the AI call takes too long.

## Testing
- Enable AI analysis and upload a photo; verify the room fields are populated.
- Simulate an API failure (e.g., block the request) and confirm the app continues normally.
- Disable AI analysis and verify that photo upload does not trigger the remote call.
