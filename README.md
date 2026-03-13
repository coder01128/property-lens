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
This repo currently contains only a React component. To run it quickly:

1. Create a simple React app (e.g., Vite + React) and drop `inventory-app.jsx` in `src/`.
2. Render it from `src/main.jsx`:

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./inventory-app";

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
```

3. Run the app via your chosen build tool (e.g. `npm run dev`).

> 💡 Optionally, a quick `index.html` + CDN build can be used if you want to prototype without a bundler.
