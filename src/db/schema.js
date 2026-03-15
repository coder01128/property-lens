/**
 * Dexie.js schema — Property Lens
 * All primary keys are UUID strings generated in application code.
 * &id = unique (not auto-increment).
 * Only indexed fields appear in the stores string; non-indexed fields are stored automatically.
 */
export const SCHEMA = {
  properties:  '&id, userId, syncedAt',
  inspections: '&id, propertyId, linkedInspectionId, status, userId, syncedAt, createdAt',
  rooms:       '&id, inspectionId, sortOrder, specialType',
  items:       '&id, roomId, inspectionId, sortOrder',
  photos:      '&id, roomId, inspectionId, itemId, aiQueued',
  aiQueue:     '&id, photoId, inspectionId, roomId, status',
};

export const DB_VERSION = 2;
