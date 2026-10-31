/**
 * Generate solid-colour placeholder car images using sharp API directly.
 * Run with: node gen_placeholders_api.js
 */

const path = require('path');
const fs   = require('fs');

// Find sharp in global node_modules
const sharp = require('C:\\Users\\rahul\\AppData\\Roaming\\npm\\node_modules\\sharp-cli\\node_modules\\sharp');

const OUT = 'c:\\Users\\rahul\\OneDrive\\Desktop\\car website\\assets\\cars';
fs.mkdirSync(OUT, { recursive: true });

const cars = ['gt-e', 's', 'x', 'r', 'one'];

async function run() {
  for (const id of cars) {
    const dst = path.join(OUT, `${id}.webp`);
    await sharp({
      create: {
        width:      1600,
        height:     900,
        channels:   3,
        background: { r: 7, g: 8, b: 10 }
      }
    })
    .webp({ quality: 80 })
    .toFile(dst);
    console.log(`Created: ${id}.webp`);
  }
  console.log('Done.');
}

run().catch(console.error);
