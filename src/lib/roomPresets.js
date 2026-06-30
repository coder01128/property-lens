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
    pickerItems: ['Walls', 'Ceiling', 'Floor', 'Door', 'Windows', 'Curtains / Blinds', 'Built-in Cupboards', 'Light Fitting', 'Power Points', 'Bed', 'Mattress', 'Bedside Table', 'Wardrobe', 'Mirror', 'Fan / AC Unit'],
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
    pickerItems: ['Walls', 'Ceiling', 'Tiles', 'Door', 'Toilet', 'Basin / Vanity', 'Bath', 'Shower', 'Shower Screen / Door', 'Mirror', 'Cabinet', 'Towel Rail', 'Extractor Fan', 'Light Fitting', 'Toilet Roll Holder'],
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
    pickerItems: ['Walls', 'Ceiling', 'Floor', 'Countertop', 'Sink', 'Stove / Hob', 'Oven', 'Extractor Fan', 'Fridge', 'Dishwasher', 'Microwave', 'Cupboards', 'Tiles / Splashback', 'Light Fitting', 'Power Points'],
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
    pickerItems: ['Walls', 'Ceiling', 'Floor', 'Windows', 'Door', 'Curtains / Blinds', 'Sofa', 'Coffee Table', 'TV Unit', 'Light Fitting', 'Power Points', 'Fireplace', 'Rug / Carpet', 'Air Conditioner'],
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
    pickerItems: ['Walls', 'Ceiling', 'Floor', 'Windows', 'Curtains / Blinds', 'Dining Table', 'Dining Chairs', 'Display Cabinet', 'Light Fitting', 'Power Points'],
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
    pickerItems: ['Walls', 'Ceiling', 'Floor', 'Front Door', 'Security Gate', 'Light Fitting', 'Intercom / Doorbell', 'Coat Hooks', 'Mirror'],
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
    pickerItems: ['Garage Door', 'Garage Door Motor', 'Floor', 'Walls', 'Ceiling', 'Light Fitting', 'Power Points', 'Shelving', 'Workbench'],
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
    pickerItems: ['Lawn', 'Fencing', 'Gate', 'Paving / Driveway', 'Pool', 'Exterior Walls', 'Garden Shed', 'Irrigation System', 'Outdoor Lighting'],
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
    pickerItems: ['Walls', 'Tiles', 'Door', 'Toilet', 'Basin', 'Mirror', 'Light Fitting', 'Towel Rail'],
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
    pickerItems: ['Walls', 'Floor', 'Door', 'Plumbing Connections', 'Washing Machine Point', 'Sink', 'Shelving', 'Light Fitting', 'Power Points'],
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
    pickerItems: ['Walls', 'Ceiling', 'Floor', 'Windows', 'Door', 'Curtains / Blinds', 'Built-in Shelving', 'Light Fitting', 'Power Points'],
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
    pickerItems: ['Floor / Tiles', 'Railing / Balustrade', 'Walls', 'Sliding Door', 'Outdoor Light', 'Braai Area', 'Patio Furniture'],
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
    pickerItems: ['Floor', 'Walls', 'Door / Lock', 'Light Fitting', 'Shelving'],
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
    pickerItems: ['Walls', 'Ceiling', 'Floor', 'Light Fitting'],
  },
  {
    typeKey: 'custom',
    label:   'Custom Area',
    icon:    '✏️',
    defaultItems: [],
    pickerItems: [],
  },
];

// ─── Per-item placeholder text for Quantity + Description inputs ────────────
// Keyed by item name (all variants used across presets).
export const ITEM_PLACEHOLDERS = {
  'Walls':              { qty: 'e.g. 4 walls',                    desc: 'e.g. Plaster painted white, no visible cracks' },
  'Ceiling':            { qty: 'e.g. 1 ceiling',                  desc: 'e.g. Smooth plaster, painted white, no watermarks' },
  'Floor':              { qty: 'e.g. 1 floor surface',            desc: 'e.g. Laminate, light scuff marks near entrance' },
  'Floor / Tiles':      { qty: 'e.g. 1 floor surface',            desc: 'e.g. Ceramic tiles, grout intact, no chips' },
  'Door':               { qty: 'e.g. 1 x solid wood door',        desc: 'e.g. White painted, handle functional, no damage' },
  'Front Door':         { qty: 'e.g. 1 x solid wood door',        desc: 'e.g. White painted, handle functional, no damage' },
  'Sliding Door':       { qty: 'e.g. 1 x aluminium sliding door', desc: 'e.g. Locks functional, track clean, no chips' },
  'Windows':            { qty: 'e.g. 2 x double-glazed frames',   desc: 'e.g. Clear glass, locks operational, no cracks' },
  'Curtains / Blinds':  { qty: 'e.g. 2 x curtain panels',        desc: 'e.g. White linen, good condition, no stains' },
  'Curtains':           { qty: 'e.g. 2 x curtain panels',        desc: 'e.g. White linen, good condition, no stains' },
  'Blinds':             { qty: 'e.g. 1 x roller blind',          desc: 'e.g. White, fully operational, no tears' },
  'Toilet':             { qty: 'e.g. 1 x toilet',                desc: 'e.g. White ceramic, seat intact, flushes correctly' },
  'Bath':               { qty: 'e.g. 1 x bathtub',               desc: 'e.g. White acrylic, no chips or cracks' },
  'Shower / Bath':      { qty: 'e.g. 1 x shower enclosure',      desc: 'e.g. Glass panel, no chips or mould, drain clear' },
  'Shower':             { qty: 'e.g. 1 x shower enclosure',      desc: 'e.g. Glass panel, no chips or mould, drain clear' },
  'Shower Screen / Door': { qty: 'e.g. 1 x glass panel',         desc: 'e.g. Frameless, no chips, seal intact' },
  'Basin':              { qty: 'e.g. 1 x basin with vanity',     desc: 'e.g. White ceramic, taps functional, no cracks' },
  'Basin / Vanity':     { qty: 'e.g. 1 x basin with vanity',     desc: 'e.g. White ceramic, taps functional, no cracks' },
  'Geyser':             { qty: 'e.g. 1 x 150L geyser',          desc: 'e.g. Mounted in roof, no visible leaks' },
  'Light Fixtures':     { qty: 'e.g. 2 x ceiling lights',        desc: 'e.g. Functional, no exposed wiring' },
  'Light Fitting':      { qty: 'e.g. 2 x ceiling lights',        desc: 'e.g. Functional, no exposed wiring' },
  'Outdoor Light':      { qty: 'e.g. 1 x wall-mounted light',    desc: 'e.g. Functional, weatherproof fitting' },
  'Power Points':       { qty: 'e.g. 4 x double sockets',        desc: 'e.g. White plastic, all functional, no damage' },
  'Plug Points':        { qty: 'e.g. 4 x double sockets',        desc: 'e.g. White plastic, all functional, no damage' },
  'Built-in Cupboards': { qty: 'e.g. 2 x built-in wardrobes',    desc: 'e.g. White MDF, hinges intact, no shelf damage' },
  'Cupboards':          { qty: 'e.g. 2 x built-in wardrobes',    desc: 'e.g. White MDF, hinges intact, no shelf damage' },
  'Built-in Shelving':  { qty: 'e.g. 3 x shelves',               desc: 'e.g. White painted MDF, no warping or damage' },
  'Kitchen Units':      { qty: 'e.g. 6 x base and wall units',   desc: 'e.g. White melamine, doors aligned, no water damage' },
  'Countertop':         { qty: 'e.g. 1 x countertop run',        desc: 'e.g. Granite, no chips or stains' },
  'Countertops':        { qty: 'e.g. 1 x countertop run',        desc: 'e.g. Granite, no chips or stains' },
  'Sink':               { qty: 'e.g. 1 x stainless steel sink',  desc: 'e.g. Double basin, drain clear, no rust' },
  'Stove / Hob':        { qty: 'e.g. 1 x 4-plate electric hob', desc: 'e.g. All plates functional, no cracks to surface' },
  'Hob/Stove':          { qty: 'e.g. 1 x 4-plate electric hob', desc: 'e.g. All plates functional, no cracks to surface' },
  'Oven':               { qty: 'e.g. 1 x built-in oven',         desc: 'e.g. Functional, interior clean, seals intact' },
  'Extractor Fan':      { qty: 'e.g. 1 x extractor',            desc: 'e.g. Functional, filter clean, no damage' },
  'Tiles / Splashback': { qty: 'e.g. 1 x splashback panel',     desc: 'e.g. White subway tile, grout intact, no chips' },
  'Tiles':              { qty: 'e.g. 1 x tiled surface',         desc: 'e.g. Ceramic, grout intact, no loose or cracked tiles' },
  'Mirror':             { qty: 'e.g. 1 x wall mirror',           desc: 'e.g. No chips or silver fade, secure fixing' },
  'Towel Rail':         { qty: 'e.g. 2 x chrome towel rails',   desc: 'e.g. Securely mounted, no rust or damage' },
  'Towel Rails':        { qty: 'e.g. 2 x chrome towel rails',   desc: 'e.g. Securely mounted, no rust or damage' },
  'Security Gate':      { qty: 'e.g. 1 x security gate',        desc: 'e.g. Steel, lock functional, no rust' },
  'Garage Door':        { qty: 'e.g. 1 x roller garage door',   desc: 'e.g. No dents, opens fully, manual release intact' },
  'Garage Door Motor':  { qty: 'e.g. 1 x motor unit',           desc: 'e.g. Functional, remote paired, limits set correctly' },
  'Plumbing Connections': { qty: 'e.g. 1 x hot + cold supply',  desc: 'e.g. No leaks, stop valves operational' },
  'Railing / Balustrade': { qty: 'e.g. 1 x balustrade run',     desc: 'e.g. Secure, no wobble, no rust or peeling paint' },
};

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
