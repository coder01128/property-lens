import { useState } from 'react';
import { ROOM_PRESETS } from '../../lib/roomPresets.js';

export default function AddRoomSheet({ onAdd, onClose }) {
  const [customName, setCustomName] = useState('');
  const [selected, setSelected]     = useState(null);

  const handleSelect = (typeKey) => {
    if (typeKey === 'custom') {
      setSelected('custom');
    } else {
      onAdd(typeKey, '');
    }
  };

  const handleCustomSubmit = () => {
    if (!customName.trim()) return;
    onAdd('custom', customName.trim());
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add a Room"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-surface-raised rounded-t-sheet shadow-sheet max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-surface-border shrink-0">
          <h3 className="font-bold text-gray-900 dark:text-white">Add a Room</h3>
          <button onClick={onClose} aria-label="Close" className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3">
          {selected === 'custom' ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Enter a name for this area:</p>
              <input
                className="w-full px-4 py-3 rounded-card text-sm bg-gray-50 dark:bg-surface-card border border-gray-200 dark:border-surface-border text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-gold"
                placeholder="e.g. Wine Cellar, Staff Quarters…"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setSelected(null)}
                  className="flex-1 py-3 rounded-card border border-gray-200 dark:border-surface-border text-sm font-medium text-gray-600 dark:text-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={handleCustomSubmit}
                  disabled={!customName.trim()}
                  className="flex-1 py-3 rounded-card bg-gold text-surface font-bold text-sm disabled:opacity-50"
                >
                  Add Room
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pb-4">
              {ROOM_PRESETS.map(preset => (
                <button
                  key={preset.typeKey}
                  onClick={() => handleSelect(preset.typeKey)}
                  className="flex items-center gap-2 p-3 rounded-card border border-gray-200 dark:border-surface-border bg-gray-50 dark:bg-surface-card text-left active:opacity-80 transition-opacity"
                >
                  <span className="text-xl">{preset.icon}</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-tight">{preset.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
