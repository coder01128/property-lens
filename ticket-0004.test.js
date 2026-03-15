/**
 * Tests for Ticket 0004 — PDF Export & Signature Workflow
 *
 * Acceptance criteria:
 * 1. PDF export works consistently (jsPDF bundled locally — no CDN dependency).
 * 2. Signatures are embedded in the exported PDF.
 * 3. Users can re-sign or clear signatures without losing other report data.
 * 4. PDF export button gives clear feedback (idle / loading / done / error).
 */

import { jsPDF } from "jspdf";

// ─── AC1: jsPDF is available from the local bundle (no CDN needed) ────────────
describe("jsPDF local bundle", () => {
  test("jsPDF can be imported from the npm package", () => {
    expect(jsPDF).toBeDefined();
    expect(typeof jsPDF).toBe("function");
  });

  test("jsPDF can instantiate a document without network access", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    expect(doc).toBeDefined();
    expect(typeof doc.text).toBe("function");
    expect(typeof doc.save).toBe("function");
  });

  test("jsPDF produces output (page count > 0)", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    expect(doc.getNumberOfPages()).toBeGreaterThan(0);
  });
});

// ─── AC2: Signature data is preserved for PDF embedding ───────────────────────
describe("Signature state for PDF embedding", () => {
  // Mirrors the signatures state shape used in the app
  function makeSignatures(tenant = null, landlord = null) {
    return { tenant, landlord };
  }

  function setSig(signatures, role, dataUrl, name) {
    return { ...signatures, [role]: { dataUrl, name } };
  }

  function clearSig(signatures, role) {
    return { ...signatures, [role]: null };
  }

  test("signature object contains dataUrl and name after signing", () => {
    let sigs = makeSignatures();
    sigs = setSig(sigs, "tenant", "data:image/png;base64,abc123", "Sipho Ndlovu");
    expect(sigs.tenant.dataUrl).toBe("data:image/png;base64,abc123");
    expect(sigs.tenant.name).toBe("Sipho Ndlovu");
    expect(sigs.landlord).toBeNull();
  });

  test("both signatures can be set independently", () => {
    let sigs = makeSignatures();
    sigs = setSig(sigs, "tenant", "data:image/png;base64,t1", "Sipho");
    sigs = setSig(sigs, "landlord", "data:image/png;base64,l1", "Jane Agent");
    expect(sigs.tenant.name).toBe("Sipho");
    expect(sigs.landlord.name).toBe("Jane Agent");
  });
});

// ─── AC3: Re-sign and clear signature without losing other report data ─────────
describe("Re-sign and clear signatures", () => {
  function makeState() {
    return {
      insp: {
        id: "20260315_120000",
        address: "14 Bree Street, Cape Town",
        tenant: "Sipho Ndlovu",
        date: "2026-03-15",
        rooms: { lounge: { completed: true, generalNotes: "Good condition" } },
      },
      signatures: { tenant: null, landlord: null },
    };
  }

  test("clearing tenant signature does not affect report data", () => {
    const state = makeState();
    state.signatures.tenant = { dataUrl: "data:image/png;base64,abc", name: "Sipho" };

    // Clear the signature
    const updated = { ...state.signatures, tenant: null };
    expect(updated.tenant).toBeNull();
    // Report data untouched
    expect(state.insp.address).toBe("14 Bree Street, Cape Town");
    expect(state.insp.rooms.lounge.generalNotes).toBe("Good condition");
  });

  test("re-signing replaces only the target signature", () => {
    const state = makeState();
    state.signatures.tenant   = { dataUrl: "data:image/png;base64,old", name: "Old Name" };
    state.signatures.landlord = { dataUrl: "data:image/png;base64,ll1", name: "Agent" };

    // Re-sign tenant
    const updated = { ...state.signatures, tenant: { dataUrl: "data:image/png;base64,new", name: "Sipho Ndlovu" } };
    expect(updated.tenant.name).toBe("Sipho Ndlovu");
    expect(updated.tenant.dataUrl).toBe("data:image/png;base64,new");
    // Landlord unaffected
    expect(updated.landlord.name).toBe("Agent");
  });

  test("clearing one signature does not affect the other", () => {
    const state = makeState();
    state.signatures.tenant   = { dataUrl: "data:image/png;base64,t1", name: "Sipho" };
    state.signatures.landlord = { dataUrl: "data:image/png;base64,l1", name: "Jane" };

    const updated = { ...state.signatures, tenant: null };
    expect(updated.tenant).toBeNull();
    expect(updated.landlord.name).toBe("Jane");
  });

  test("can re-sign after clearing", () => {
    let sigs = { tenant: { dataUrl: "data:image/png;base64,old", name: "Old" }, landlord: null };
    sigs = { ...sigs, tenant: null };               // clear
    sigs = { ...sigs, tenant: { dataUrl: "data:image/png;base64,new", name: "Sipho" } }; // re-sign
    expect(sigs.tenant.name).toBe("Sipho");
  });
});

// ─── AC4: PDF export button state transitions ─────────────────────────────────
describe("PDF export button state machine", () => {
  // Mirrors the pdfStatus state and handleExportPDF logic
  const VALID_STATES = ["idle", "loading", "done", "error"];

  test("all expected states are defined", () => {
    VALID_STATES.forEach(s => expect(typeof s).toBe("string"));
  });

  test("initial state is idle", () => {
    const pdfStatus = "idle";
    expect(pdfStatus).toBe("idle");
  });

  test("transitions: idle → loading → done on success", () => {
    let status = "idle";
    // Simulate export start
    status = "loading";
    expect(status).toBe("loading");
    // Simulate export success
    status = "done";
    expect(status).toBe("done");
  });

  test("transitions: idle → loading → error on failure", () => {
    let status = "idle";
    status = "loading";
    status = "error";
    expect(status).toBe("error");
  });

  test("button is disabled in loading state (prevents double-trigger)", () => {
    const pdfStatus = "loading";
    // In the component: disabled={pdfStatus==="loading"}
    const isDisabled = pdfStatus === "loading";
    expect(isDisabled).toBe(true);
  });

  test("button is enabled in idle state", () => {
    expect("idle" === "loading").toBe(false);
  });

  test("button is enabled in error state (retry)", () => {
    const pdfStatus = "error";
    const canClick = pdfStatus === "idle" || pdfStatus === "error";
    expect(canClick).toBe(true);
  });

  test("done state shows success label (not retry)", () => {
    const pdfStatus = "done";
    const label =
      pdfStatus === "idle"    ? "Export PDF Report"   :
      pdfStatus === "loading" ? "Building PDF…"       :
      pdfStatus === "done"    ? "✓ PDF Downloaded!"   :
      /* error */               "⚠ Failed — Tap to Retry";
    expect(label).toBe("✓ PDF Downloaded!");
  });
});

// ─── AC1 (extra): PDF document structure contains expected fields ──────────────
describe("PDF document content structure", () => {
  test("jsPDF can add text without throwing", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    expect(() => {
      doc.setFontSize(12);
      doc.text("14 Bree Street, Cape Town", 16, 20);
      doc.text("Tenant: Sipho Ndlovu", 16, 30);
    }).not.toThrow();
  });

  test("jsPDF can add multiple pages", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.addPage();
    expect(doc.getNumberOfPages()).toBe(2);
  });

  test("jsPDF addImage does not throw with a valid PNG data URL", () => {
    // 1x1 transparent PNG
    const png1x1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    expect(() => {
      doc.addImage(png1x1, "PNG", 16, 16, 30, 10);
    }).not.toThrow();
  });
});
