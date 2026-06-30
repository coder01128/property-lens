import { copyFileSync } from 'fs';
copyFileSync('landing/index.html', 'dist/index.html');
console.log('Copied landing/index.html → dist/index.html');
copyFileSync('landing/sw.js', 'dist/sw.js');
console.log('Copied landing/sw.js → dist/sw.js (root SW killer)');
