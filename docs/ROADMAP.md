# Inspect-a-Home Roadmap

This document outlines the high-level roadmap for evolving the MVP into a more complete, production-ready simplified home inspection PWA.

## 🚀 Phase 0 — MVP (Present)
- Single-file React PWA in `inventory-app.jsx`
- Mocked auth + saved reports in memory
- Room-by-room inspection capture
- Photo uploads + optional AI analysis
- PDF export with signatures

## 🧩 Phase 1 — Local Persistence
- Persist inspections + user profile in `localStorage`
- Add ability to create/edit/delete saved reports
- Add simple export/import (JSON)

## 🎨 Phase 2 — UX & Data Validation
- Improve form validation (required fields, item names, etc.)
- Add onscreen guidance for each step (what to inspect, how to mark conditions)
- Improve mobile responsiveness and accessibility
- Add progress indicators and undo/redo for key actions

## ⚙️ Phase 3 — Export & Reporting
- Make PDF export consistent across browsers
- Add option to generate PDF per room or full report
- Add CSV export for data analysis
- Improve signature capture (clear, retry, required confirmation)

## 🧪 Phase 4 — Testing & Quality
- Add unit tests for core logic (data transformations, export PDF helpers)
- Add E2E tests for key flows (create inspection, add room data, export)
- Add linting + formatting rules (ESLint, Prettier)

## 🧠 Phase 5 — Optional Enhancements
- Backend sync (Firebase, Supabase, or custom API)
- Real auth (OAuth, email/password)
- Multi-user support and shared reports
- AI/ML improvements (object recognition, automated issue detection)
