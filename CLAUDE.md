# Property Lens — Claude Code Instructions

## Project Overview
Property Lens is an AI-powered property inspection app targeting South African rental agents and inspectors. It is a DarkLoud Digital product (Tier 1 priority).

## Key Context
- Card-based UI for minimal typing during inspections
- AI vision for condition assessment (Phase 2 — not MVP)
- Offline-first architecture — inspections must work without internet
- Competitor: RedRabbit (enterprise-focused, our gap is the solo inspector / small agency segment)
- Target pricing: Free tier (watermarked reports) → R199/mo Solo → R499/mo Agency → R1200/mo Pro

## STATUS.json — MANDATORY UPDATE

**Before ending every session, you MUST update the STATUS.json file in this project root.**

Write/overwrite `STATUS.json` with this structure:

```json
{
  "projectName": "Property Lens",
  "version": "0.1.0",
  "lastUpdated": "2026-03-15T14:30:00Z",
  "currentPhase": "MVP Development",
  "summary": "Brief 1-2 sentence summary of current state",
  "techStack": "React Native / PWA, Supabase, etc",
  "recentChanges": [
    "What was done in this session",
    "Another thing that changed"
  ],
  "blockers": [
    "Anything blocking progress"
  ],
  "nextSteps": [
    "What should be done next session",
    "Another next step"
  ],
  "metrics": {
    "componentsBuilt": 0,
    "testsWritten": 0,
    "openIssues": 0
  }
}
```

**This file is monitored by Launchpad (the DarkLoud Digital project management dashboard) and updates appear in real-time on the Founder's dashboard. Always keep it accurate.**

## Development Standards
- Use React with functional components and hooks
- Tailwind CSS for styling
- All components must work offline — no API calls in the critical inspection flow
- Photos stored locally on device, synced when online
- PDF report generation must work on-device
