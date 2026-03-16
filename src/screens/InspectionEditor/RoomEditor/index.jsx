import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import TopBar from '../../../components/layout/TopBar.jsx';
import db from '../../../db/index.js';
import { ROOM_PRESETS, SPECIAL_ROOMS, CONDITION_OPTIONS, CLEANLINESS_OPTIONS, CONDITION_COLORS, CLEANLINESS_COLORS } from '../../../lib/roomPresets.js';
import { enqueueRoom, processQueue } from '../../../lib/aiQueue.js';

const uid = () => crypto.randomUUID();

export default function RoomEditor({ inspectionId, roomId, onBack }) {
  const [completeErr, setCompleteErr] = useState('');
  const [newItemId, setNewItemId] = useState(null);

  const room  = useLiveQuery(() => db.rooms.get(roomId), [roomId]);
  const items = useLiveQuery(
    () => db.items.where('roomId').equals(roomId).sortBy('sortOrder'),
    [roomId]
  );
  const photos = useLiveQuery(
    () => db.photos.where('roomId').equals(roomId).toArray(),
    [roomId]
  );

  const overviewPhotos = (photos || []).filter(p => p.role === 'overview');

  const updateRoom = (patch) => {
    db.rooms.update(roomId, { ...patch, updatedAt: new Date().toISOString() });
  };

  const updateItem = (itemId, patch) => {
    db.items.update(itemId, { ...patch, updatedAt: new Date().toISOString() });
  };

  // Scroll to bottom when a new item is added so the full input is visible
  useEffect(() => {
    if (!newItemId || !items) return;
    const el = document.getElementById(`item-${newItemId}`);
    if (el) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      el.querySelector('input')?.focus();
      setNewItemId(null);
    }
  }, [items, newItemId]);

  // AI analysis — skip for special rooms; reset when photos drop below 2, re-queue when they reach 2+
  useEffect(() => {
    if (!room || !items) return;
    if (room.isSpecial) return;
    if (overviewPhotos.length < 2 && room.aiAnalysed) {
      // Photos removed — reset so analysis re-runs when new photos are added
      db.rooms.update(roomId, {
        aiAnalysed: false, aiSuggested: false,
        aiSuggestedCondition: null, aiSuggestedNotes: null,
        aiConfidence: null, aiError: false, aiErrorMsg: null,
        updatedAt: new Date().toISOString(),
      });
    } else if (overviewPhotos.length >= 2 && !room.aiAnalysed && !room.aiError) {
      enqueueRoom(inspectionId, roomId).then(() => processQueue());
    }
  }, [overviewPhotos.length, room?.aiAnalysed, room?.aiError, inspectionId, roomId]);

  if (!room || !items) return (
    <div className="min-h-screen bg-white dark:bg-surface p-4 space-y-3">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-card bg-gray-100 dark:bg-surface-card animate-pulse" />)}
    </div>
  );

  const handleAcceptSuggestion = async () => {
    await updateRoom({
      overallCondition: room.aiSuggestedCondition,
      overallNotes:     room.aiSuggestedNotes || room.overallNotes || '',
      aiSuggested:      false,
    });
  };

  const handleDismissSuggestion = async () => {
    await updateRoom({ aiSuggested: false, aiSuggestedCondition: null, aiSuggestedNotes: null, aiConfidence: null });
  };

  const addItem = async () => {
    const now = new Date().toISOString();
    const id = uid();
    setNewItemId(id);
    await db.items.add({
      id, roomId, inspectionId,
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
    if (room.isSpecial) {
      if (overviewPhotos.length < 1) {
        setCompleteErr('Add at least 1 photo before completing.');
        return;
      }
    } else {
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
    }
    setCompleteErr('');
    await updateRoom({ isComplete: true });
    onBack();
  };

  const preset        = ROOM_PRESETS.find(r => r.typeKey === room?.typeKey)
    || SPECIAL_ROOMS.find(r => r.typeKey === room?.typeKey);

  return (
    <div className="min-h-screen bg-white dark:bg-surface">
      <TopBar
        title={room.displayName}
        subtitle={preset ? `${preset.icon} ${room.isSpecial ? 'Special Card' : 'Room Inspection'}` : 'Room Inspection'}
        back={onBack}
      />

      <div className="max-w-lg mx-auto px-4 py-4 space-y-5 pb-8">

        {room.isSpecial ? (
          <SpecialRoomContent
            room={room}
            photos={overviewPhotos}
            roomId={roomId}
            inspectionId={inspectionId}
            onUpdate={updateRoom}
          />
        ) : (
          <>
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
                <p className="text-xs text-gold mt-1">⏳ AI analysis queued…</p>
              )}
              {room.aiError && (
                <div className="mt-1 space-y-1">
                  <p className="text-xs text-red-400">⚠ AI analysis failed: {room.aiErrorMsg || 'unknown error'}</p>
                  <button
                    onClick={() => {
                      updateRoom({ aiError: false, aiErrorMsg: null, aiAnalysed: false });
                      enqueueRoom(inspectionId, roomId).then(() => processQueue());
                    }}
                    className="text-xs text-gold underline"
                  >
                    Retry
                  </button>
                </div>
              )}
            </Section>

            {/* General notes */}
            <Section title="General Notes">
              <div className="relative">
                <textarea
                  className="w-full px-3 py-2.5 pr-9 rounded-card text-sm bg-gray-50 dark:bg-surface-card border border-gray-200 dark:border-surface-border text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-gold resize-none"
                  rows={3}
                  placeholder="Additional observations for this room…"
                  value={room.overallNotes || ''}
                  onChange={e => updateRoom({ overallNotes: e.target.value })}
                />
                <MicButton
                  value={room.overallNotes || ''}
                  onAppend={v => updateRoom({ overallNotes: v })}
                  className="absolute bottom-2 right-1.5"
                />
              </div>
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
                <button onClick={addItem} className="text-sm font-bold text-surface bg-gold px-4 py-1.5 rounded-card active:opacity-80">+ Add Item</button>
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
          </>
        )}

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

// ─── Key presets ──────────────────────────────────────────────────────────
const KEY_PRESETS = [
  'Driveway Gate Key',
  'Driveway Gate Remote',
  'Garage Remote',
  'Front Door Security Gate Key',
  'Front Door Key',
  'Back Door Key',
  'Patio Door Key',
  'Security Alarm / Panic Button Remote',
];

// Serialise selections [{label,count}] → multiline description string
function selectionsToText(selections) {
  return selections
    .filter(s => s.count > 0)
    .map(s => s.count > 1 ? `${s.count} × ${s.label}` : s.label)
    .join('\n');
}

// ─── Special room layout (Keys / Electricity Meter / Water Meter) ─────────
function SpecialRoomContent({ room, photos, roomId, inspectionId, onUpdate }) {
  const isMeter  = room.specialType === 'electricity_meter' || room.specialType === 'water_meter';
  const isKeys   = room.specialType === 'keys';
  const meterUnit = room.specialType === 'electricity_meter' ? 'kWh' : 'kL';

  // Parse persisted key selections from room record
  const selections = (() => { try { return JSON.parse(room.keySelections || '[]'); } catch { return []; } })();
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom]   = useState(false);

  const saveSelections = (next) => {
    onUpdate({ keySelections: JSON.stringify(next), overallNotes: selectionsToText(next) });
  };

  const handleCardClick = (label) => {
    const existing = selections.find(s => s.label === label);
    saveSelections(existing
      ? selections.map(s => s.label === label ? { ...s, count: s.count + 1 } : s)
      : [...selections, { label, count: 1 }]
    );
  };

  const handleRemoveCard = (label) => {
    saveSelections(selections.filter(s => s.label !== label));
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    handleCardClick(trimmed);
    setCustomInput('');
    setShowCustom(false);
  };

  return (
    <div className="space-y-5">
      {/* Photos — min 1 required */}
      <Section title="Photos" badge={`${photos.length} / 1 min`}>
        <PhotoStrip photos={photos} roomId={roomId} inspectionId={inspectionId} role="overview" />
        {photos.length < 1 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            At least 1 photo required to complete.
          </p>
        )}
      </Section>

      {/* Keys — card grid */}
      {isKeys && (
        <>
          <Section
            title="Key Items"
            action={
              <button
                onClick={() => setShowCustom(v => !v)}
                className="text-sm font-bold text-surface bg-gold px-4 py-1.5 rounded-card active:opacity-80"
              >
                + Add Item
              </button>
            }
          >
            {/* Custom item input */}
            {showCustom && (
              <div className="flex gap-2 mb-3">
                <input
                  autoFocus
                  className="flex-1 px-3 py-2 rounded-lg text-sm bg-white dark:bg-zinc-700 border border-gold/60 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-gold"
                  placeholder="Custom key item…"
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                />
                <button
                  onClick={handleAddCustom}
                  className="px-3 py-2 rounded-lg bg-gold text-surface text-sm font-bold active:opacity-80"
                >
                  Add
                </button>
              </div>
            )}

            {/* 2-column preset grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Preset cards */}
              {KEY_PRESETS.map(label => {
                const sel = selections.find(s => s.label === label);
                return (
                  <KeyCard
                    key={label}
                    label={label}
                    count={sel?.count || 0}
                    onClick={() => handleCardClick(label)}
                    onRemove={() => handleRemoveCard(label)}
                  />
                );
              })}
              {/* Custom cards (not in presets) */}
              {selections.filter(s => !KEY_PRESETS.includes(s.label)).map(s => (
                <KeyCard
                  key={s.label}
                  label={s.label}
                  count={s.count}
                  onClick={() => handleCardClick(s.label)}
                  onRemove={() => handleRemoveCard(s.label)}
                />
              ))}
            </div>
          </Section>

          {/* Description textarea — auto-populated, still manually editable */}
          <Section title="Description">
            <div className="relative">
              <textarea
                className="w-full px-3 py-2.5 pr-9 rounded-card text-sm bg-gray-50 dark:bg-surface-card border border-gray-200 dark:border-surface-border text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-gold resize-none"
                rows={4}
                placeholder="Key items will appear here as you tap the cards above…"
                value={room.overallNotes || ''}
                onChange={e => onUpdate({ overallNotes: e.target.value })}
              />
              <MicButton value={room.overallNotes || ''} onAppend={v => onUpdate({ overallNotes: v })} className="absolute bottom-2 right-1.5" />
            </div>
          </Section>
        </>
      )}

      {/* Meter fields */}
      {isMeter && (
        <>
          <Section title="Meter Location">
            <div className="relative">
              <textarea
                className="w-full px-3 py-2.5 pr-9 rounded-card text-sm bg-gray-50 dark:bg-surface-card border border-gray-200 dark:border-surface-border text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-gold resize-none"
                rows={2}
                placeholder="e.g. Outside wall, north side of property…"
                value={room.meterLocation || ''}
                onChange={e => onUpdate({ meterLocation: e.target.value })}
              />
              <MicButton value={room.meterLocation || ''} onAppend={v => onUpdate({ meterLocation: v })} className="absolute bottom-2 right-1.5" />
            </div>
          </Section>

          <Section title={`Meter Reading (${meterUnit})`}>
            <input
              type="text"
              inputMode="decimal"
              className="w-full px-3 py-2.5 rounded-card text-sm bg-gray-50 dark:bg-surface-card border border-gray-200 dark:border-surface-border outline-none focus:border-gold text-gray-900 dark:text-white placeholder-gray-400"
              placeholder={room.specialType === 'electricity_meter' ? 'e.g. 12345.6' : 'e.g. 9876.5'}
              value={room.meterReading || ''}
              onChange={e => onUpdate({ meterReading: e.target.value })}
            />
          </Section>

          <Section title="Meter Number">
            <input
              type="text"
              className="w-full px-3 py-2.5 rounded-card text-sm bg-gray-50 dark:bg-surface-card border border-gray-200 dark:border-surface-border outline-none focus:border-gold text-gray-900 dark:text-white placeholder-gray-400"
              placeholder="e.g. MTR-00123456"
              value={room.meterNumber || ''}
              onChange={e => onUpdate({ meterNumber: e.target.value })}
            />
          </Section>
        </>
      )}
    </div>
  );
}

// ─── Key card ─────────────────────────────────────────────────────────────
function KeyCard({ label, count, onClick, onRemove }) {
  const selected = count > 0;
  return (
    <button
      onClick={onClick}
      className={`relative text-left p-3 rounded-card border transition-all active:opacity-80 ${
        selected
          ? 'bg-gold/10 border-gold/60 dark:bg-gold/10 dark:border-gold/50'
          : 'bg-gray-50 dark:bg-surface-card border-gray-200 dark:border-surface-border'
      }`}
    >
      <span className="block text-xs font-semibold text-gray-800 dark:text-gray-100 leading-tight pr-4">
        {label}
      </span>
      {selected && (
        <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-gold">
          × {count}
        </span>
      )}
      {selected && (
        <span
          role="button"
          onClickCapture={e => { e.stopPropagation(); onRemove(); }}
          className="absolute top-2 right-2 text-gray-900 dark:text-gold hover:text-red-400 dark:hover:text-red-400 transition-colors"
          aria-label={`Remove ${label}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </span>
      )}
    </button>
  );
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
  const [btnScale, setBtnScale] = useState(1);

  // Expand-then-shrink animation on first mount to draw attention
  useEffect(() => {
    if (photos.length > 0) return; // only animate when no photos yet
    const t1 = setTimeout(() => setBtnScale(1.2), 120);
    const t2 = setTimeout(() => setBtnScale(1),   550);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        <label
          className="shrink-0 w-24 h-20 rounded-xl border-2 border-gold bg-gold/10 flex flex-col items-center justify-center cursor-pointer hover:bg-gold/20 active:opacity-80 transition-colors"
          style={{ transform: `scale(${btnScale})`, transition: 'transform 0.35s ease-in-out' }}
        >
          <span className="text-3xl">📷</span>
          <span className="text-xs text-gold font-bold mt-1">Add Photo</span>
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
  const isEmpty = !item.name?.trim();
  return (
    <div id={`item-${item.id}`} className="p-3 rounded-card bg-gray-50 dark:bg-surface-card border border-gray-200 dark:border-surface-border space-y-2">
      <div className="flex items-center gap-2">
        <input
          className={`flex-1 text-sm font-medium text-gray-900 dark:text-white outline-none placeholder-gray-400 transition-all ${
            isEmpty
              ? 'px-3 py-2 rounded-lg bg-white dark:bg-zinc-700 border border-gold/60 placeholder-gray-300 dark:placeholder-gray-400 focus:border-gold focus:ring-1 focus:ring-gold/30'
              : 'bg-transparent border-b border-transparent focus:border-gold pb-0.5'
          }`}
          placeholder="Item name (e.g. Ceiling Fan)"
          value={item.name}
          onChange={e => onChange({ name: e.target.value })}
        />
        <button onClick={onRemove} className="p-1 text-gray-900 dark:text-gold hover:text-red-400 dark:hover:text-red-400 transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
        <div className="relative">
          <textarea
            className="w-full px-3 py-2 pr-9 rounded-lg text-sm bg-white dark:bg-zinc-700 border border-gold/60 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-400 outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 resize-none"
            rows={2}
            placeholder="Describe the defect or issue…"
            value={item.defects || ''}
            onChange={e => onChange({ defects: e.target.value })}
          />
          <MicButton value={item.defects || ''} onAppend={v => onChange({ defects: v })} className="absolute bottom-1.5 right-1.5" />
        </div>
      )}
    </div>
  );
}

// ─── Mic button (Web Speech API) ──────────────────────────────────────────
function MicButton({ value, onAppend, className = '' }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = 'en-ZA';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      onAppend(value ? value + ' ' + t : t);
      setListening(false);
    };
    rec.onend  = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  return (
    <button
      type="button"
      onMouseDown={e => e.preventDefault()} // prevent textarea blur
      onClick={toggle}
      className={`p-2 rounded-full transition-colors ${
        listening
          ? 'text-red-500 animate-pulse'
          : 'text-gray-400 dark:text-gray-500 hover:text-gold'
      } ${className}`}
      aria-label={listening ? 'Stop recording' : 'Dictate'}
    >
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm6.364 9.172a.75.75 0 0 1 .736.912A7.001 7.001 0 0 1 12.75 17.92V20h2.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5h2.5v-2.08a7.001 7.001 0 0 1-6.35-6.836.75.75 0 0 1 1.486-.176A5.5 5.5 0 0 0 17.5 11a5.47 5.47 0 0 0-.048-.64.75.75 0 0 1 .912-.188z"/>
      </svg>
    </button>
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
