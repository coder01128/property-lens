import { useState } from 'react';
import TopBar from '../../components/layout/TopBar.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { getAiEnabled, setAiEnabled } from '../../lib/preferences.js';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [aiEnabled, setAiEnabledState] = useState(() => getAiEnabled());

  const handleToggleAi = () => {
    const next = !aiEnabled;
    setAiEnabled(next);
    setAiEnabledState(next);
  };

  const handleClearData = async () => {
    if (!window.confirm('Delete all local inspection data? This cannot be undone.')) return;
    const { default: db } = await import('../../db/index.js');
    await Promise.all([
      db.inspections.clear(),
      db.properties.clear(),
      db.rooms.clear(),
      db.items.clear(),
      db.photos.clear(),
      db.aiQueue.clear(),
    ]);
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-surface">
      <TopBar title="Settings" />
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Appearance */}
        <Section title="Appearance">
          <Row
            label="Theme"
            value={theme === 'dark' ? 'Dark' : 'Light'}
            action={
              <Toggle checked={theme === 'dark'} onChange={toggleTheme} />
            }
          />
        </Section>

        {/* AI Analysis */}
        <Section title="AI Analysis">
          <Row
            label="Enable AI Vision"
            value={aiEnabled ? 'On' : 'Off'}
            action={<Toggle checked={aiEnabled} onChange={handleToggleAi} />}
          />
          <Row
            label="Trigger"
            value="≥2 overview photos per room"
          />
          <Row
            label="Model"
            value="Claude 3.5 Sonnet"
          />
        </Section>

        {/* About */}
        <Section title="About">
          <Row label="App Version"    value="0.2.0" />
          <Row label="Build"          value="Ticket 0011" />
          <Row label="Storage"        value="IndexedDB (Dexie.js)" />
        </Section>

        {/* Danger zone */}
        <Section title="Danger Zone">
          <button
            onClick={handleClearData}
            className="w-full py-3 rounded-card border border-red-300 dark:border-red-800/40 text-red-600 dark:text-red-400 text-sm font-bold"
          >
            Clear All Local Data
          </button>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">{title}</h2>
      <div className="rounded-card border border-gray-200 dark:border-surface-border overflow-hidden divide-y divide-gray-100 dark:divide-surface-border">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, action }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-surface-card">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
      <div className="flex items-center gap-3">
        {value && <span className="text-sm text-gray-500 dark:text-gray-400">{value}</span>}
        {action}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-gold' : 'bg-gray-200 dark:bg-surface-border'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}
