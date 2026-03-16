import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import TopBar from '../../components/layout/TopBar.jsx';
import db from '../../db/index.js';
import { ROOM_PRESETS, SPECIAL_ROOMS, resolveDisplayName } from '../../lib/roomPresets.js';
import RoomEditor from './RoomEditor/index.jsx';
import AddRoomSheet from './AddRoomSheet.jsx';

const uid = () => crypto.randomUUID();

export default function InspectionEditor() {
  const { inspectionId, roomId } = useParams();
  const navigate = useNavigate();
  const [addRoomOpen, setAddRoomOpen] = useState(false);

  const inspection = useLiveQuery(() => db.inspections.get(inspectionId), [inspectionId]);
  const rooms      = useLiveQuery(
    () => db.rooms.where('inspectionId').equals(inspectionId).sortBy('sortOrder'),
    [inspectionId]
  );

  if (!inspection || !rooms) return <LoadingScreen />;

  // If a roomId is in the URL, show the room editor
  if (roomId) {
    return (
      <RoomEditor
        inspectionId={inspectionId}
        roomId={roomId}
        onBack={() => navigate(`/inspect/${inspectionId}`)}
      />
    );
  }

  const specialRooms = rooms.filter(r => r.isSpecial);
  const normalRooms  = rooms.filter(r => !r.isSpecial);
  const completedCount = rooms.filter(r => r.isComplete).length;
  const progress = rooms.length > 0 ? completedCount / rooms.length : 0;

  const handleAddRoom = async (typeKey, customName) => {
    const now = new Date().toISOString();
    const existingRooms = await db.rooms.where('inspectionId').equals(inspectionId).toArray();
    const displayName = resolveDisplayName(typeKey, existingRooms, customName);
    const preset = ROOM_PRESETS.find(r => r.typeKey === typeKey);
    const sortOrder = existingRooms.filter(r => !r.isSpecial).length + SPECIAL_ROOMS.length;
    const roomId = uid();

    await db.rooms.add({
      id: roomId, inspectionId, typeKey, displayName, sortOrder,
      isSpecial: false, specialType: null, isComplete: false,
      overallNotes: '', createdAt: now, updatedAt: now,
      aiAnalysed: false, aiError: false, aiErrorMsg: null,
      meterReading: '', keyCount: null,
    });

    // Seed default items
    const defaultItems = preset?.defaultItems || [];
    for (let i = 0; i < defaultItems.length; i++) {
      await db.items.add({
        id: uid(), roomId, inspectionId,
        name: defaultItems[i].name, isDefault: true, sortOrder: i,
        condition: null, cleanliness: null, defects: '', repairNotes: '',
        isRated: false, aiSuggested: false, aiAccepted: false,
        createdAt: now, updatedAt: now,
      });
    }

    setAddRoomOpen(false);
    navigate(`/inspect/${inspectionId}/room/${roomId}`);
  };

  const handleRemoveRoom = async (room) => {
    if (room.isSpecial) return;
    const confirmed = window.confirm(`Remove "${room.displayName}"? All data for this room will be deleted.`);
    if (!confirmed) return;
    await db.items.where('roomId').equals(room.id).delete();
    await db.photos.where('roomId').equals(room.id).delete();
    await db.rooms.delete(room.id);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-surface">
      <TopBar
        title={inspection.address || 'Inspection'}
        subtitle={`${inspection.type === 'check-in' ? '🔑 Check-In' : '🔓 Check-Out'} · ${inspection.inspectionDate || ''}`}
        back={() => navigate('/')}
        actions={
          completedCount > 0 ? (
            <button
              onClick={() => navigate(`/inspect/${inspectionId}/report`)}
              className="text-sm font-bold text-surface bg-gold px-4 py-2 rounded-card active:opacity-80"
            >
              Generate Report
            </button>
          ) : null
        }
      />

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Progress */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            <span>{completedCount} of {rooms.length} rooms complete</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-surface-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gold rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {/* Special cards */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
            Always Required
          </h3>
          <div className="space-y-2">
            {specialRooms.map(room => (
              <RoomRow
                key={room.id}
                room={room}
                onClick={() => navigate(`/inspect/${inspectionId}/room/${room.id}`)}
              />
            ))}
          </div>
        </div>

        {/* Regular rooms */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
            Rooms
          </h3>
          {normalRooms.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm border border-dashed border-gray-200 dark:border-surface-border rounded-card">
              No rooms added yet — tap "+ Add Room" below
            </div>
          ) : (
            <div className="space-y-2">
              {normalRooms.map(room => (
                <RoomRow
                  key={room.id}
                  room={room}
                  onClick={() => navigate(`/inspect/${inspectionId}/room/${room.id}`)}
                  onRemove={() => handleRemoveRoom(room)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Add Room */}
        <button
          onClick={() => setAddRoomOpen(true)}
          className="w-full py-3 rounded-card border-2 border-dashed border-gold/30 text-gold font-semibold text-sm hover:bg-gold/5 transition-colors"
        >
          + Add Room
        </button>
      </div>

      {addRoomOpen && (
        <AddRoomSheet
          onAdd={handleAddRoom}
          onClose={() => setAddRoomOpen(false)}
        />
      )}
    </div>
  );
}

function RoomRow({ room, onClick, onRemove }) {
  const preset = ROOM_PRESETS.find(r => r.typeKey === room.typeKey)
    || SPECIAL_ROOMS.find(r => r.typeKey === room.typeKey);

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-card border cursor-pointer active:opacity-80 transition-opacity ${
        room.isComplete
          ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30'
          : 'bg-gray-50 dark:bg-surface-card border-gray-200 dark:border-surface-border'
      }`}
      onClick={onClick}
    >
      <span className="text-xl">{preset?.icon || '🏠'}</span>
      <span className="flex-1 text-sm font-semibold text-gray-900 dark:text-white">{room.displayName}</span>
      {room.isComplete
        ? <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">✓ Done</span>
        : <span className="text-xs text-gray-400 dark:text-gray-500">Tap →</span>
      }
      {onRemove && !room.isSpecial && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors"
          aria-label="Remove room"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white dark:bg-surface p-4 space-y-3">
      {[1,2,3,4].map(i => (
        <div key={i} className="h-14 rounded-card bg-gray-100 dark:bg-surface-card animate-pulse" />
      ))}
    </div>
  );
}
