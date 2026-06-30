const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

async function generateIcon(src, size, outPath) {
  const img = await loadImage(src);
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, size, size);
  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  console.log(`Generated ${outPath}`);
}

async function main() {
  const src = 'public/icons/p-lens-icon.png';
  await generateIcon(src, 192, 'public/icons/icon-192.png');
  await generateIcon(src, 512, 'public/icons/icon-512.png');
  await generateIcon(src, 32,  'public/icons/favicon.png');
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
