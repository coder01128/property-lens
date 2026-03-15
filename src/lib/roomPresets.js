/**
 * Room type catalogue and default inspection items.
 * Drives the dynamic room system: inspectors add from this list,
 * duplicates auto-number (Bedroom 2, Bedroom 3, etc.).
 */

// Condition colour tokens — aligned to PRD §4.3.3 (must stay in sync with tailwind.config.js)
export const CONDITION_COLORS = {
  Excellent: '#22c55e', // not specified in PRD; keep as distinct green
  Good:      '#06D6A0', // PRD: teal-green
  Fair:      '#FFD166', // PRD: amber
  Poor:      '#F97316', // PRD: orange ✓
  Damaged:   '#EF476F', // PRD: red-pink
  'N/A':     '#636E72', // PRD: grey ✓
};

export const CLEANLINESS_COLORS = {
  Spotless:   '#22c55e',
  Clean:      '#06D6A0',
  Dusty:      '#FFD166',
  Dirty:      '#F97316',
  'Very Dirty': '#EF476F',
};

export const CONDITION_OPTIONS    = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged', 'N/A'];
export const CLEANLINESS_OPTIONS  = ['Spotless', 'Clean', 'Dusty', 'Dirty', 'Very Dirty'];

// ─── Special cards (always present, cannot be removed) ─────────────────────
export const SPECIAL_ROOMS = [
  {
    typeKey:     'keys',
    specialType: 'keys',
    displayName: 'Keys',
    icon:        '🔑',
    defaultItems: [
      { name: 'Front Door Key' },
      { name: 'Gate / Complex Key' },
      { name: 'Garage Remote / Key' },
      { name: 'Postbox Key' },
    ],
  },
  {
    typeKey:     'electricity_meter',
    specialType: 'electricity_meter',
    displayName: 'Electricity Meter',
    icon:        '⚡',
    defaultItems: [
      { name: 'Meter Reading' },
      { name: 'Meter Box Condition' },
      { name: 'Prepaid Token Slot' },
    ],
  },
  {
    typeKey:     'water_meter',
    specialType: 'water_meter',
    displayName: 'Water Meter',
    icon:        '💧',
    defaultItems: [
      { name: 'Meter Reading' },
      { name: 'Meter Box / Housing Condition' },
    ],
  },
];

// ─── Preset room types (selectable from the "+ Add Room" sheet) ────────────
export const ROOM_PRESETS = [
  {
    typeKey: 'bedroom',
    label:   'Bedroom',
    icon:    '🛏',
    defaultItems: [
      { name: 'Walls' },
      { name: 'Ceiling' },
      { name: 'Floor' },
      { name: 'Windows' },
      { name: 'Door' },
      { name: 'Light Fixtures' },
      { name: 'Power Points' },
      { name: 'Curtains / Blinds' },
      { name: 'Built-in Cupboards' },
    ],
  },
  {
    typeKey: 'bathroom',
    label:   'Bathroom',
    icon:    '🚿',
    defaultItems: [
      { name: 'Toilet' },
      { name: 'Basin' },
      { name: 'Shower / Bath' },
      { name: 'Tiles' },
      { name: 'Mirror' },
      { name: 'Extractor Fan' },
      { name: 'Towel Rails' },
      { name: 'Light Fixtures' },
      { name: 'Power Points' },
    ],
  },
  {
    typeKey: 'kitchen',
    label:   'Kitchen',
    icon:    '🍳',
    defaultItems: [
      { name: 'Countertops' },
      { name: 'Sink' },
      { name: 'Stove / Hob' },
      { name: 'Oven' },
      { name: 'Cupboards' },
      { name: 'Tiles / Splashback' },
      { name: 'Extractor Fan' },
      { name: 'Light Fixtures' },
      { name: 'Power Points' },
    ],
  },
  {
    typeKey: 'living_area',
    label:   'Living Area',
    icon:    '🛋',
    defaultItems: [
      { name: 'Walls' },
      { name: 'Ceiling' },
      { name: 'Floor' },
      { name: 'Windows' },
      { name: 'Door' },
      { name: 'Light Fixtures' },
      { name: 'Power Points' },
      { name: 'Curtains / Blinds' },
      { name: 'Fireplace' },
    ],
  },
  {
    typeKey: 'dining_room',
    label:   'Dining Room',
    icon:    '🪑',
    defaultItems: [
      { name: 'Walls' },
      { name: 'Ceiling' },
      { name: 'Floor' },
      { name: 'Windows' },
      { name: 'Door' },
      { name: 'Light Fixtures' },
      { name: 'Power Points' },
      { name: 'Curtains / Blinds' },
    ],
  },
  {
    typeKey: 'entrance_hall',
    label:   'Entrance Hall',
    icon:    '🚪',
    defaultItems: [
      { name: 'Walls' },
      { name: 'Ceiling' },
      { name: 'Floor' },
      { name: 'Front Door' },
      { name: 'Security Gate' },
      { name: 'Light Fixtures' },
      { name: 'Intercom / Doorbell' },
    ],
  },
  {
    typeKey: 'garage',
    label:   'Garage',
    icon:    '🚗',
    defaultItems: [
      { name: 'Garage Door' },
      { name: 'Garage Door Motor' },
      { name: 'Floor' },
      { name: 'Walls' },
      { name: 'Light Fixtures' },
      { name: 'Power Points' },
    ],
  },
  {
    typeKey: 'garden',
    label:   'Garden / Exterior',
    icon:    '🌿',
    defaultItems: [
      { name: 'Lawn' },
      { name: 'Fencing' },
      { name: 'Gate' },
      { name: 'Paving / Driveway' },
      { name: 'Pool' },
      { name: 'Exterior Walls' },
      { name: 'Garden Shed' },
      { name: 'Irrigation System' },
    ],
  },
  {
    typeKey: 'toilet',
    label:   'Toilet (Separate)',
    icon:    '🚽',
    defaultItems: [
      { name: 'Toilet' },
      { name: 'Basin' },
      { name: 'Walls' },
      { name: 'Tiles' },
      { name: 'Light Fixtures' },
      { name: 'Door' },
    ],
  },
  {
    typeKey: 'laundry',
    label:   'Laundry',
    icon:    '🫧',
    defaultItems: [
      { name: 'Walls' },
      { name: 'Floor' },
      { name: 'Plumbing Connections' },
      { name: 'Washing Machine Point' },
      { name: 'Light Fixtures' },
      { name: 'Power Points' },
    ],
  },
  {
    typeKey: 'study',
    label:   'Study',
    icon:    '📚',
    defaultItems: [
      { name: 'Walls' },
      { name: 'Ceiling' },
      { name: 'Floor' },
      { name: 'Windows' },
      { name: 'Door' },
      { name: 'Light Fixtures' },
      { name: 'Power Points' },
      { name: 'Built-in Shelving' },
    ],
  },
  {
    typeKey: 'balcony',
    label:   'Balcony / Patio',
    icon:    '🌅',
    defaultItems: [
      { name: 'Floor / Tiles' },
      { name: 'Railing / Balustrade' },
      { name: 'Walls' },
      { name: 'Sliding Door' },
      { name: 'Outdoor Light' },
    ],
  },
  {
    typeKey: 'storeroom',
    label:   'Storeroom',
    icon:    '📦',
    defaultItems: [
      { name: 'Floor' },
      { name: 'Walls' },
      { name: 'Door / Lock' },
      { name: 'Light Fixtures' },
    ],
  },
  {
    typeKey: 'passage',
    label:   'Passage / Hallway',
    icon:    '🚶',
    defaultItems: [
      { name: 'Walls' },
      { name: 'Ceiling' },
      { name: 'Floor' },
      { name: 'Light Fixtures' },
    ],
  },
  {
    typeKey: 'custom',
    label:   'Custom Area',
    icon:    '✏️',
    defaultItems: [],
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Look up a preset by typeKey */
export function getPreset(typeKey) {
  return ROOM_PRESETS.find(r => r.typeKey === typeKey) || null;
}

/**
 * Given the existing rooms in an inspection, compute the display name for a new room of typeKey.
 * e.g. adding a second 'bedroom' returns "Bedroom 2".
 */
export function resolveDisplayName(typeKey, existingRooms, customName = '') {
  if (typeKey === 'custom') return customName || 'Custom Area';
  const preset = getPreset(typeKey);
  if (!preset) return customName || typeKey;
  const existing = existingRooms.filter(r => r.typeKey === typeKey && !r.isSpecial);
  if (existing.length === 0) return preset.label;
  return `${preset.label} ${existing.length + 1}`;
}
