/**
 * Tests for Ticket 0003 — UX Validation
 *
 * Acceptance criteria:
 * 1. Required fields (address, tenant name, date) cannot be left blank when saving.
 * 2. Each room should require at least one item or a general note before marked complete.
 * 3. Provide clear UI feedback for validation errors.
 * 4. Provide a way to quickly jump between rooms.
 *
 * These tests exercise the pure validation logic extracted from inventory-app.jsx.
 */

// ─── Header validation logic (mirrors the "Begin Inspection" button handler) ───
function validateHeader(draft) {
  const errs = {};
  if (!draft.address?.trim())  errs.address = "Property address is required.";
  if (!draft.tenant?.trim())   errs.tenant  = "Tenant name is required.";
  if (!draft.date)             errs.date    = "Inspection date is required.";
  return errs;
}

// ─── Room completion validation logic (mirrors markRoomComplete) ──────────────
function validateRoomComplete(roomData) {
  const hasItems = (roomData.items || []).some(it => it.name?.trim());
  const hasNotes = roomData.generalNotes?.trim();
  if (!hasItems && !hasNotes) {
    return "Add at least one item or a general note before completing this room.";
  }
  return null;
}

// ─── Room navigation helper (mirrors the nav bar logic) ───────────────────────
function getRoomNavState(rooms, activeRoomId, inspRooms) {
  return rooms.map(r => ({
    id:     r.id,
    label:  r.label,
    active: r.id === activeRoomId,
    done:   !!(inspRooms?.[r.id]?.completed),
  }));
}

// ══════════════════════════════════════════════════════════════════════════════
// AC1 + AC3 — Header validation: required fields block submission
// ══════════════════════════════════════════════════════════════════════════════
describe("Header validation", () => {
  test("passes when all fields are filled", () => {
    const errs = validateHeader({
      address: "14 Bree Street, Cape Town",
      tenant:  "Sipho Ndlovu",
      date:    "2026-03-15",
    });
    expect(Object.keys(errs)).toHaveLength(0);
  });

  test("blocks when address is empty", () => {
    const errs = validateHeader({ address: "", tenant: "Sipho", date: "2026-03-15" });
    expect(errs.address).toBe("Property address is required.");
    expect(errs.tenant).toBeUndefined();
    expect(errs.date).toBeUndefined();
  });

  test("blocks when address is whitespace-only", () => {
    const errs = validateHeader({ address: "   ", tenant: "Sipho", date: "2026-03-15" });
    expect(errs.address).toBe("Property address is required.");
  });

  test("blocks when tenant is empty", () => {
    const errs = validateHeader({ address: "14 Bree St", tenant: "", date: "2026-03-15" });
    expect(errs.tenant).toBe("Tenant name is required.");
  });

  test("blocks when tenant is whitespace-only", () => {
    const errs = validateHeader({ address: "14 Bree St", tenant: "  ", date: "2026-03-15" });
    expect(errs.tenant).toBe("Tenant name is required.");
  });

  test("blocks when date is missing", () => {
    const errs = validateHeader({ address: "14 Bree St", tenant: "Sipho", date: "" });
    expect(errs.date).toBe("Inspection date is required.");
  });

  test("blocks all three fields when all empty", () => {
    const errs = validateHeader({ address: "", tenant: "", date: "" });
    expect(errs.address).toBeDefined();
    expect(errs.tenant).toBeDefined();
    expect(errs.date).toBeDefined();
    expect(Object.keys(errs)).toHaveLength(3);
  });

  test("returns independent errors for each missing field", () => {
    const errsTenant = validateHeader({ address: "14 Bree St", tenant: "", date: "2026-03-15" });
    expect(Object.keys(errsTenant)).toHaveLength(1);
    expect(errsTenant.tenant).toBeDefined();

    const errsDate = validateHeader({ address: "14 Bree St", tenant: "Sipho", date: "" });
    expect(Object.keys(errsDate)).toHaveLength(1);
    expect(errsDate.date).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AC2 + AC3 — Room completion: items or notes required
// ══════════════════════════════════════════════════════════════════════════════
describe("Room completion validation", () => {
  test("passes when a named item exists", () => {
    const result = validateRoomComplete({
      items: [{ id: "1", name: "Ceiling fan", condition: "Good", defects: "" }],
      generalNotes: "",
    });
    expect(result).toBeNull();
  });

  test("passes when general notes exist", () => {
    const result = validateRoomComplete({
      items: [],
      generalNotes: "Walls in good condition.",
    });
    expect(result).toBeNull();
  });

  test("passes when both items and notes are present", () => {
    const result = validateRoomComplete({
      items: [{ id: "1", name: "Window", condition: "Fair", defects: "Cracked sill" }],
      generalNotes: "Needs repainting.",
    });
    expect(result).toBeNull();
  });

  test("blocks when no items and no notes", () => {
    const result = validateRoomComplete({ items: [], generalNotes: "" });
    expect(result).toMatch(/at least one item or a general note/i);
  });

  test("blocks when items array is absent and no notes", () => {
    const result = validateRoomComplete({ generalNotes: "" });
    expect(result).not.toBeNull();
  });

  test("blocks when all items have blank names", () => {
    const result = validateRoomComplete({
      items: [{ id: "1", name: "   ", condition: "Good", defects: "" }],
      generalNotes: "",
    });
    expect(result).not.toBeNull();
  });

  test("blocks when notes are whitespace-only", () => {
    const result = validateRoomComplete({ items: [], generalNotes: "   " });
    expect(result).not.toBeNull();
  });

  test("passes with one named item even if notes whitespace-only", () => {
    const result = validateRoomComplete({
      items: [{ id: "1", name: "Door", condition: "Good", defects: "" }],
      generalNotes: "   ",
    });
    expect(result).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AC4 — Room navigation: nav bar renders correct active/done state
// ══════════════════════════════════════════════════════════════════════════════
describe("Room navigation bar state", () => {
  const ROOMS = [
    { id: "entrance", label: "Entrance / Hallway", icon: "🚪" },
    { id: "lounge",   label: "Lounge",             icon: "🛋️" },
    { id: "kitchen",  label: "Kitchen",            icon: "🍳" },
  ];

  test("marks the active room correctly", () => {
    const nav = getRoomNavState(ROOMS, "lounge", {});
    expect(nav.find(r => r.id === "lounge").active).toBe(true);
    expect(nav.find(r => r.id === "entrance").active).toBe(false);
  });

  test("marks completed rooms as done", () => {
    const inspRooms = { entrance: { completed: true }, kitchen: { completed: false } };
    const nav = getRoomNavState(ROOMS, "lounge", inspRooms);
    expect(nav.find(r => r.id === "entrance").done).toBe(true);
    expect(nav.find(r => r.id === "kitchen").done).toBe(false);
    expect(nav.find(r => r.id === "lounge").done).toBe(false);
  });

  test("returns all rooms in the list", () => {
    const nav = getRoomNavState(ROOMS, "entrance", {});
    expect(nav).toHaveLength(3);
    expect(nav.map(r => r.id)).toEqual(["entrance", "lounge", "kitchen"]);
  });

  test("handles no completed rooms", () => {
    const nav = getRoomNavState(ROOMS, "entrance", {});
    expect(nav.every(r => !r.done)).toBe(true);
  });

  test("can have active room also be done (re-visiting a completed room)", () => {
    const inspRooms = { lounge: { completed: true } };
    const nav = getRoomNavState(ROOMS, "lounge", inspRooms);
    const lounge = nav.find(r => r.id === "lounge");
    expect(lounge.active).toBe(true);
    expect(lounge.done).toBe(true);
  });
});
