import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import TopBar from '../../../components/layout/TopBar.jsx';
import db from '../../../db/index.js';
import { ROOM_PRESETS, SPECIAL_ROOMS, CONDITION_OPTIONS, CLEANLINESS_OPTIONS, CONDITION_COLORS, CLEANLINESS_COLORS } from '../../../lib/roomPresets.js';
import { enqueueRoom, processQueue } from '../../../lib/aiQueue.js';

const uid = () => crypto.randomUUID();

export default function RoomEditor({ inspectionId, roomId, onBack }) {
  const [completeErr, setCompleteErr] = useState('');

  const room  = useLiveQuery(() => db.rooms.get(roomId), [roomId]);
  const items = useLiveQuery(
    () => db.items.where('roomId').equals(roomId).sortBy('sortOrder'),
    [roomId]
  );
  const photos = useLiveQuery(
    () => db.photos.where('roomId').equals(roomId).toArray(),
    [roomId]
  );

  const preset        = ROOM_PRESETS.find(r => r.typeKey === room?.typeKey)
    || SPECIAL_ROOMS.find(r => r.typeKey === room?.typeKey);
  const overviewPhotos = (photos || []).filter(p => p.role === 'overview');

  const updateRoom = (patch) => {
    db.rooms.update(roomId, { ...patch, updatedAt: new Date().toISOString() });
  };

  const updateItem = (itemId, patch) => {
    db.items.update(itemId, { ...patch, updatedAt: new Date().toISOString() });
  };

  // Auto-enqueue for AI analysis when ≥2 overview photos exist (PRD §5.1)
  // Must be before early return — hooks cannot be called conditionally
  useEffect(() => {
    if (!room || !items) return;
    if (overviewPhotos.length >= 2 && !room.aiAnalysed && !room.aiError) {
      enqueueRoom(inspectionId, roomId).then(() => processQueue());
    }
  }, [overviewPhotos.length, room?.aiAnalysed, room?.aiError, inspectionId, roomId]);

  if (!room || !items) return (
    <div className="min-h-screen bg-white dark:bg-surface p-4 space-y-3">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-card bg-gray-100 dark:bg-surface-card animate-pulse" />)}
    </div>
  );

  const handleAcceptSuggestion = async () => {
    const patch = {
      overallCondition: room.aiSuggestedCondition,
      overallNotes:     room.overallNotes
        ? room.overallNotes
        : room.aiSuggestedNotes, // only pre-fill notes if none entered
      aiSuggested: false,
    };
    await updateRoom(patch);
  };

  const handleDismissSuggestion = async () => {
    await updateRoom({ aiSuggested: false, aiSuggestedCondition: null, aiSuggestedNotes: null, aiConfidence: null });
  };

  const addItem = async () => {
    const now = new Date().toISOString();
    await db.items.add({
      id: uid(), roomId, inspectionId,
      name: '', isDefault: false, sortOrder: items.length,
      condition: null, cleanliness: null, defects: '', repairNotes: '',
      isRated: false, aiSuggested: false, aiAccepted: false,
      createdAt: now, updatedAt: now,
    });
  };

  const removeItem = async (itemId) => {
    await db.items.delete(itemId);
  };

  const handleMarkComplete = async () => {
    const namedItems = items.filter(it => it.name?.trim());
    const hasNotes   = room.overallNotes?.trim();
    if (namedItems.length === 0 && !hasNotes) {
      setCompleteErr('Add at least one item or a general note before completing this room.');
      return;
    }
    if (overviewPhotos.length < 2) {
      setCompleteErr(`Add at least 2 overview photos (currently ${overviewPhotos.length}).`);
      return;
    }
    setCompleteErr('');
    await updateRoom({ isComplete: true });
    onBack();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-surface">
      <TopBar
        title={room.displayName}
        subtitle={preset ? `${preset.icon} Room Inspection` : 'Room Inspection'}
        back={onBack}
      />

      <div className="max-w-lg mx-auto px-4 py-4 space-y-5 pb-8">
        {/* Special card dedicated fields */}
        {room.isSpecial && (
          <SpecialCardSection room={room} onUpdate={updateRoom} />
        )}

        {/* Overview photos */}
        <Section title="Overview Photos" badge={`${overviewPhotos.length} / 2 min`}>
          <PhotoStrip
            photos={overviewPhotos}
            roomId={roomId}
            inspectionId={inspectionId}
            role="overview"
          />
          {overviewPhotos.length < 2 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              At least 2 overview photos required to complete this room.
            </p>
          )}
          {overviewPhotos.length >= 2 && !room.aiAnalysed && !room.aiError && (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-gold">⏳ AI analysis queued…</p>
              <button
                onClick={() => enqueueRoom(inspectionId, roomId).then(() => processQueue())}
                className="text-xs text-gold underline"
              >
                Retry
              </button>
            </div>
          )}
          {room.aiError && (
            <p className="text-xs text-red-400 mt-1">⚠ AI analysis failed: {room.aiErrorMsg || 'unknown error'}</p>
          )}
        </Section>

        {/* AI Suggestion banner */}
        {room.aiSuggested && room.aiSuggestedCondition && (
          <AISuggestionBanner
            room={room}
            onAccept={handleAcceptSuggestion}
            onDismiss={handleDismissSuggestion}
          />
        )}

        {/* Overall condition */}
        <Section title="Overall Room Condition">
          <RatingPills
            options={CONDITION_OPTIONS}
            value={room.overallCondition || null}
            colors={CONDITION_COLORS}
            onChange={v => updateRoom({ overallCondition: v })}
          />
        </Section>

        {/* Cleanliness */}
        <Section title="Cleanliness">
          <RatingPills
            options={CLEANLINESS_OPTIONS}
            value={room.cleanliness || null}
            colors={CLEANLINESS_COLORS}
            onChange={v => updateRoom({ cleanliness: v })}
          />
        </Section>

        {/* Items */}
        <Section
          title="Inspection Items"
          action={
            <button onClick={addItem} className="text-xs font-bold text-gold">+ Add Item</button>
          }
        >
          {items.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
              No items yet — tap "+ Add Item" to start
            </p>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onChange={patch => updateItem(item.id, patch)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
          )}
        </Section>

        {/* General notes */}
        <Section title="General Notes">
          <textarea
            className="w-full px-3 py-2.5 rounded-card text-sm bg-gray-50 dark:bg-surface-card border border-gray-200 dark:border-surface-border text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-gold resize-none"
            rows={3}
            placeholder="Additional observations for this room…"
            value={room.overallNotes || ''}
            onChange={e => updateRoom({ overallNotes: e.target.value })}
          />
        </Section>

        {/* Validation error */}
        {completeErr && (
          <div className="p-3 rounded-card bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-sm text-red-600 dark:text-red-400">
            ⚠ {completeErr}
          </div>
        )}

        {/* Actions */}
        <button
          onClick={handleMarkComplete}
          className="w-full py-4 rounded-card bg-gold text-surface font-bold text-base active:opacity-90"
        >
          ✓ Mark Room Complete
        </button>
        <button
          onClick={() => { setCompleteErr(''); onBack(); }}
          className="w-full py-3 rounded-card border border-gray-200 dark:border-surface-border text-sm font-medium text-gray-600 dark:text-gray-300 active:opacity-80"
        >
          Save &amp; Return to Rooms
        </button>
      </div>
    </div>
  );
}

// ─── AI Suggestion banner (PRD §5.1) ──────────────────────────────────────
function AISuggestionBanner({ room, onAccept, onDismiss }) {
  const color = CONDITION_COLORS[room.aiSuggestedCondition] || '#888';
  const pct   = Math.round((room.aiConfidence || 0) * 100);

  return (
    <div className="p-4 rounded-card border border-gold/30 bg-gold/5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-gold">✨ AI Suggestion</span>
        <span className="text-xs text-gray-400 dark:text-gray-500">{pct}% confidence</span>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: color + '22', color }}
        >
          {room.aiSuggestedCondition}
        </span>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-snug flex-1">
          {room.aiSuggestedNotes}
        </p>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Accept to apply this condition rating, or dismiss to keep your manual assessment.
      </p>

      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 py-2.5 rounded-card bg-gold text-surface text-sm font-bold active:opacity-80"
        >
          Accept
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 py-2.5 rounded-card border border-gray-300 dark:border-surface-border text-sm font-medium text-gray-600 dark:text-gray-300 active:opacity-80"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ─── Special card dedicated fields ────────────────────────────────────────
function SpecialCardSection({ room, onUpdate }) {
  const { specialType, meterReading, keyCount } = room;

  if (specialType === 'keys') {
    return (
      <div className="p-4 rounded-card bg-gold/5 border border-gold/20 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">Key Count</p>
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-700 dark:text-gray-200 flex-1">Number of complete key sets</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdate({ keyCount: Math.max(0, (keyCount || 0) - 1) })}
              className="w-8 h-8 rounded-full border border-gray-300 dark:border-surface-border text-gray-600 dark:text-gray-300 font-bold text-lg flex items-center justify-center active:opacity-70"
            >
              −
            </button>
            <span className="text-xl font-bold text-gray-900 dark:text-white w-8 text-center">
              {keyCount ?? 0}
            </span>
            <button
              onClick={() => onUpdate({ keyCount: (keyCount || 0) + 1 })}
              className="w-8 h-8 rounded-full border border-gold text-gold font-bold text-lg flex items-center justify-center active:opacity-70"
            >
              +
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (specialType === 'electricity_meter' || specialType === 'water_meter') {
    const label = specialType === 'electricity_meter' ? 'Electricity Reading (kWh)' : 'Water Reading (kL)';
    const placeholder = specialType === 'electricity_meter' ? 'e.g. 12345.6' : 'e.g. 9876.5';
    return (
      <div className="p-4 rounded-card bg-gold/5 border border-gold/20 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">Meter Reading</p>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>
          <input
            type="text"
            inputMode="decimal"
            className="w-full px-4 py-3 rounded-card text-sm bg-white dark:bg-surface-card border border-gray-200 dark:border-surface-border outline-none focus:border-gold text-gray-900 dark:text-white placeholder-gray-400"
            placeholder={placeholder}
            value={meterReading || ''}
            onChange={e => onUpdate({ meterReading: e.target.value })}
          />
        </div>
      </div>
    );
  }

  return null;
}

// ─── Photo compression (1200px max, JPEG 0.85) ────────────────────────────
async function compressPhoto(dataUrl, maxPx = 1200, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width  * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl); // fallback: keep original
    img.src = dataUrl;
  });
}

// ─── Photo preview modal ───────────────────────────────────────────────────
function PhotoPreviewModal({ dataUrl, onUse, onRetake }) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black/90" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-sm font-semibold text-white">Preview Photo</span>
        <button onClick={onRetake} className="text-sm text-gray-400 active:opacity-70">Retake</button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <img src={dataUrl} className="max-w-full max-h-full object-contain rounded-lg" alt="Preview" />
      </div>
      <div className="px-4 pb-8 pt-3 flex gap-3 border-t border-white/10">
        <button
          onClick={onRetake}
          className="flex-1 py-3 rounded-card border border-white/20 text-sm font-medium text-white active:opacity-80"
        >
          Retake
        </button>
        <button
          onClick={onUse}
          className="flex-1 py-3 rounded-card bg-gold text-surface text-sm font-bold active:opacity-90"
        >
          Use Photo
        </button>
      </div>
    </div>
  );
}

// ─── Photo strip ──────────────────────────────────────────────────────────
function PhotoStrip({ photos, roomId, inspectionId, role }) {
  const [preview, setPreview] = useState(null); // compressed dataUrl pending confirm

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressPhoto(ev.target.result);
      setPreview(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleUsePhoto = async () => {
    if (!preview) return;
    await db.photos.add({
      id: crypto.randomUUID(), roomId, inspectionId,
      itemId: null, role,
      sortOrder: photos.length,
      dataUrl: preview, thumbnailUrl: preview,
      width: 0, height: 0,
      capturedAt: new Date().toISOString(),
      syncedAt: null, aiQueued: false, aiProcessedAt: null,
    });
    setPreview(null);
  };

  return (
    <>
      {preview && (
        <PhotoPreviewModal
          dataUrl={preview}
          onUse={handleUsePhoto}
          onRetake={() => setPreview(null)}
        />
      )}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {photos.map((p) => (
          <div key={p.id} className="relative shrink-0">
            <img src={p.dataUrl} className="w-20 h-16 object-cover rounded-lg border border-gray-200 dark:border-surface-border" alt="" />
            <button
              onClick={() => db.photos.delete(p.id)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 border-2 border-white dark:border-surface text-white text-xs font-bold flex items-center justify-center"
            >
              ×
            </button>
          </div>
        ))}
        <label className="shrink-0 w-20 h-16 rounded-lg border-2 border-dashed border-gold/40 flex flex-col items-center justify-center cursor-pointer hover:bg-gold/5 transition-colors">
          <span className="text-xl">📷</span>
          <span className="text-xs text-gold font-medium mt-0.5">Add</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        </label>
      </div>
    </>
  );
}

// ─── Rating pills ─────────────────────────────────────────────────────────
function RatingPills({ options, value, colors, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const selected = value === opt;
        const color = colors[opt] || '#888';
        return (
          <button
            key={opt}
            onClick={() => onChange(selected ? null : opt)}
            style={selected ? { background: color, borderColor: color } : {}}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              selected
                ? 'text-gray-900'
                : 'border-gray-300 dark:border-surface-border text-gray-600 dark:text-gray-300 bg-transparent'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Item card ────────────────────────────────────────────────────────────
function ItemCard({ item, onChange, onRemove }) {
  return (
    <div className="p-3 rounded-card bg-gray-50 dark:bg-surface-card border border-gray-200 dark:border-surface-border space-y-2">
      <div className="flex items-center gap-2">
        <input
          className="flex-1 text-sm font-medium bg-transparent text-gray-900 dark:text-white outline-none placeholder-gray-400 border-b border-transparent focus:border-gold pb-0.5"
          placeholder="Item name (e.g. Ceiling Fan)"
          value={item.name}
          onChange={e => onChange({ name: e.target.value })}
        />
        <button onClick={onRemove} className="p-0.5 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CONDITION_OPTIONS.filter(o => o !== 'N/A').concat(['N/A']).map(opt => {
          const sel = item.condition === opt;
          const color = CONDITION_COLORS[opt] || '#888';
          return (
            <button
              key={opt}
              onClick={() => onChange({ condition: sel ? null : opt, isRated: !sel })}
              style={sel ? { background: color, borderColor: color } : {}}
              className={`px-2 py-0.5 rounded-full text-xs font-bold border transition-all ${
                sel ? 'text-gray-900' : 'border-gray-300 dark:border-surface-border text-gray-500 dark:text-gray-400'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {item.condition && item.condition !== 'Excellent' && item.condition !== 'Good' && (
        <input
          className="w-full text-xs bg-transparent text-gray-600 dark:text-gray-300 outline-none placeholder-gray-400 border-b border-gray-200 dark:border-surface-border focus:border-gold pb-0.5"
          placeholder="Describe the defect or issue…"
          value={item.defects || ''}
          onChange={e => onChange({ defects: e.target.value })}
        />
      )}
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────
function Section({ title, badge, action, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{title}</h3>
          {badge && (
            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-surface-border px-2 py-0.5 rounded-full">{badge}</span>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
