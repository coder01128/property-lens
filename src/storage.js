// ── Storage module — all localStorage operations ───────────────

export const genReportId = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("") + "_" + [
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
    String(d.getSeconds()).padStart(2, "0"),
  ].join("");
};

export const saveProfileLS = u => {
  try { localStorage.setItem("user_profile", JSON.stringify(u)); } catch {}
};

export const loadProfileLS = () => {
  try { return JSON.parse(localStorage.getItem("user_profile")); } catch { return null; }
};

export const saveReportLS = report => {
  try {
    localStorage.setItem(`report_${report.id}`, JSON.stringify(report));
    let idx = [];
    try { idx = JSON.parse(localStorage.getItem("report_index") || "[]"); } catch {}
    const entry = { id: report.id, address: report.address, tenant: report.tenant, date: report.date };
    const pos = idx.findIndex(r => r.id === report.id);
    if (pos >= 0) idx[pos] = entry; else idx.unshift(entry);
    localStorage.setItem("report_index", JSON.stringify(idx.slice(0, 50)));
  } catch (e) { console.error("Save failed", e); }
};

export const loadReportsLS = () => {
  try {
    const idx = JSON.parse(localStorage.getItem("report_index") || "[]");
    return idx
      .map(e => { try { return JSON.parse(localStorage.getItem(`report_${e.id}`)); } catch { return null; } })
      .filter(Boolean)
      .sort((a, b) => (b.date > a.date ? 1 : -1));
  } catch { return []; }
};

export const deleteReportLS = id => {
  try {
    localStorage.removeItem(`report_${id}`);
    let idx = [];
    try { idx = JSON.parse(localStorage.getItem("report_index") || "[]"); } catch {}
    localStorage.setItem("report_index", JSON.stringify(idx.filter(r => r.id !== id)));
  } catch (e) { console.error("Delete failed", e); }
};

export const clearAllDataLS = () => {
  try {
    const idx = JSON.parse(localStorage.getItem("report_index") || "[]");
    idx.forEach(e => localStorage.removeItem(`report_${e.id}`));
    localStorage.removeItem("report_index");
    localStorage.removeItem("user_profile");
  } catch {}
};
