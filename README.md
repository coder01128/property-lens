# Inspect-a-Home

A **simplified home inspection PWA** MVP built as a single React component (`inventory-app.jsx`).

## ✅ Current State (MVP)
- Auth flow (mocked: email/google/apple)
- Dashboard showing saved inspections
- Inspection flow:
  - Room-by-room checklist (condition, cleanliness, items, notes)
  - Photo upload (resized, optional AI analysis via Anthropic)
  - Signatures (tenant + landlord)
  - Export to PDF (using jsPDF)
- Minimal styling and UI logic all in one file.

## 🗂️ Project Structure
- `inventory-app.jsx` — core app component and logic

## 🎯 Goals for this Project
1. Establish a stable build/run setup.
2. Add persistence (localStorage / backend) so reports are saved.
3. Improve UX & validation.
4. Harden PDF export and signing workflow.
5. Add automated tests (where practical).

## 🧭 Next Steps
This repo is driven by *build & test tickets* in `docs/tickets/`. Start with **Ticket 0001** and work through the list in order.

---

## 📌 How to Run (Quick Start)
This repo is now scaffolded as a Vite + React PWA.

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open the shown URL (usually `http://localhost:5173`) in your browser.

### Build for production

```bash
npm run build
```

> ✅ When running locally, the app is available as a PWA and will install on mobile devices (icons can be added later in `public/icons/`).

---

## 📦 Publishing to GitHub

To publish this project to GitHub, create a new repository and run:

```bash
git remote add origin https://github.com/<your-org>/inspect-a-home.git
git branch -M main
git push -u origin main
```

Then add icons in `public/icons/` for better PWA install support.
