import { copyFileSync } from 'fs';
copyFileSync('landing/index.html', 'dist/index.html');
console.log('Copied landing/index.html → dist/index.html');
