/**
 * Generates icon-192.png and icon-512.png for the PWA manifest.
 * Property Lens brand: gold (#c8a96e) background with dark "PL" text.
 * Run once: node generate-icons.cjs
 */
const zlib = require('zlib');
const fs   = require('fs');

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const t   = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function makePNG(size) {
  const gold = [200, 169, 110]; // #c8a96e
  const dark = [10,  10,  15];  // #0a0a0f

  // Draw pixels: dark background, gold rounded square inset, dark "PL" letters
  const pixels = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      const cx = size / 2, cy = size / 2;
      const r  = size * 0.42;
      const dx = x - cx, dy = y - cy;

      // Rounded rectangle (simulate with circle corners)
      const pad = size * 0.13;
      const inX = x >= pad && x < size - pad;
      const inY = y >= pad && y < size - pad;
      const corners = [
        [pad, pad], [size - pad, pad], [pad, size - pad], [size - pad, size - pad],
      ];
      const inCorner = corners.some(([cx2, cy2]) =>
        Math.hypot(x - cx2, y - cy2) < size * 0.13
      );
      const inRect = inX && inY && !inCorner;

      if (!inRect) return dark;

      // Draw "PL" using a simple pixel font (relative to icon size)
      const u = size / 64; // unit = 1/64th of icon size
      // "P" occupies cols 12–22, rows 16–44 (in 64-unit coords)
      const px = x / u, py = y / u;

      // P stem
      if (px >= 12 && px < 16 && py >= 16 && py < 44) return dark;
      // P bowl (top half arc approximation)
      if (px >= 16 && px < 23 && py >= 16 && py < 22) return dark;
      if (px >= 16 && px < 23 && py >= 28 && py < 30) return dark;
      if (px >= 22 && px < 24 && py >= 18 && py < 28) return dark;

      // L stem
      if (px >= 28 && px < 32 && py >= 16 && py < 44) return dark;
      // L foot
      if (px >= 28 && px < 44 && py >= 40 && py < 44) return dark;

      return gold;
    })
  );

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const base = y * (1 + size * 3);
    raw[base] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixels[y][x];
      raw[base + 1 + x * 3]     = r;
      raw[base + 1 + x * 3 + 1] = g;
      raw[base + 1 + x * 3 + 2] = b;
    }
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.writeFileSync('public/icons/icon-192.png', makePNG(192));
fs.writeFileSync('public/icons/icon-512.png', makePNG(512));
console.log('✓ icon-192.png and icon-512.png generated');
