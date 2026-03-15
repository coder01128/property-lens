/**
 * preferences.js — persistent app-wide user preferences (localStorage).
 * Centralises all preference keys so they don't scatter across the codebase.
 */

const KEY_AI_ENABLED = 'pl_ai_enabled';
const KEY_THEME      = 'pl_theme'; // already used by ThemeContext

// ─── AI Vision preference ────────────────────────────────────────────────────

/** Returns true (default on) when not yet set. */
export function getAiEnabled() {
  try {
    const raw = localStorage.getItem(KEY_AI_ENABLED);
    return raw === null ? true : JSON.parse(raw);
  } catch {
    return true;
  }
}

export function setAiEnabled(enabled) {
  localStorage.setItem(KEY_AI_ENABLED, JSON.stringify(Boolean(enabled)));
}
