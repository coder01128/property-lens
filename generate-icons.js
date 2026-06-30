const fs = require('fs');
const { createCanvas } = require('canvas');

// Create a simple 192x192 icon
function createIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Dark blue background
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, size, size);

  // White "PL" text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PL', size / 2, size / 2);

  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buffer);
  console.log(`Created ${filename}`);
}

createIcon(192, 'public/icons/icon-192.png');
createIcon(512, 'public/icons/icon-512.png');