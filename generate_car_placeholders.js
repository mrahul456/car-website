/**
 * generate_car_placeholders.js
 * Creates placeholder WebP images for the 5 NOCTIS lineup cars.
 * Each is a flat #07080A rectangle 1600×900 (16:9).
 * Once real car images are available, replace these files.
 *
 * Uses sharp CLI with --create for solid-colour images.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

const OUT = 'c:\\Users\\rahul\\OneDrive\\Desktop\\car website\\assets\\cars';
fs.mkdirSync(OUT, { recursive: true });

// sharp create syntax:
// sharp --input --create width height channels background
//   -o output -f webp

const cars = ['gt-e', 's', 'x', 'r', 'one'];

cars.forEach(id => {
  const dst = path.join(OUT, `${id}.webp`);
  if (fs.existsSync(dst)) {
    console.log(`SKIP (exists): ${id}.webp`);
    return;
  }
  // Create a 1600x900 flat #07080A image
  const cmd = [
    'sharp',
    '--input',
    '--create', '1600', '900', '3', '#07080A',
    '-o', `"${dst}"`,
    '-f', 'webp',
    '-mq', '80'
  ].join(' ');

  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log(`Created placeholder: ${id}.webp`);
  } catch (e) {
    console.error(`Failed ${id}:`, e.stderr?.toString() || e.message);
  }
});

console.log('Placeholder generation done.');

