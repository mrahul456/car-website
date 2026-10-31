/**
 * NOCTIS Frame Conversion Script
 * Converts raw JPG frames to WebP in 4 output sets:
 *   assets/frames/hero/           1600px wide, q78
 *   assets/frames/hero-mobile/    960px wide,  q72
 *   assets/frames/dismantle/      1600px wide, q78
 *   assets/frames/dismantle-mobile/ 960px wide, q72
 *
 * Hero = clip1 (200) + clip2 (200) + clip3 (183), with duplicate-frame skip at joins.
 * Dismantle = dismantle folder (198 frames).
 *
 * Duplicate detection: compare file size of last frame of prev clip vs first frame of next.
 * If within 1% → skip first frame of next clip.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE = 'c:\\Users\\rahul\\OneDrive\\Desktop\\car website';
const RAW = path.join(BASE, 'frames_raw');
const OUT = path.join(BASE, 'assets', 'frames');

// Natural sort helper
function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function getFrames(dir) {
  return fs.readdirSync(dir)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .sort(naturalSort)
    .map(f => path.join(dir, f));
}

function sizeClose(pathA, pathB, threshold = 0.01) {
  const sA = fs.statSync(pathA).size;
  const sB = fs.statSync(pathB).size;
  return Math.abs(sA - sB) / Math.max(sA, sB) < threshold;
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function convertFrame(src, dst, width, quality) {
  // sharp CLI syntax: sharp -i input -o output -mq<quality> resize <width>
  // -f webp sets output format, -mq sets quality
  const cmd = `sharp -i "${src}" -o "${dst}" -f webp -mq${quality} resize ${width}`;
  execSync(cmd, { stdio: 'pipe' });
}

// ── Build hero sequence ──────────────────────────────────────────────────────
console.log('Building hero sequence...');
const clip1 = getFrames(path.join(RAW, 'clip1'));
const clip2 = getFrames(path.join(RAW, 'clip2'));
const clip3 = getFrames(path.join(RAW, 'clip3'));

// Check join clip1→clip2
let heroFrames = [...clip1];
const startClip2 = sizeClose(clip1[clip1.length - 1], clip2[0]) ? 1 : 0;
heroFrames = heroFrames.concat(clip2.slice(startClip2));
const lastClip2idx = heroFrames.length - 1;
const startClip3 = sizeClose(heroFrames[lastClip2idx], clip3[0]) ? 1 : 0;
heroFrames = heroFrames.concat(clip3.slice(startClip3));

console.log(`Hero: clip1=${clip1.length}, clip2=${clip2.length}(skip ${startClip2}), clip3=${clip3.length}(skip ${startClip3}) → total ${heroFrames.length} frames`);

// ── Build dismantle sequence ─────────────────────────────────────────────────
console.log('Building dismantle sequence...');
const dismantleFrames = getFrames(path.join(RAW, 'dismantle'));
console.log(`Dismantle: ${dismantleFrames.length} frames`);

// ── Convert hero desktop ─────────────────────────────────────────────────────
const heroDir = path.join(OUT, 'hero');
const heroMobDir = path.join(OUT, 'hero-mobile');
ensureDir(heroDir);
ensureDir(heroMobDir);

console.log('Converting hero desktop (1600px, q78)...');
heroFrames.forEach((src, i) => {
  const name = `frame_${String(i + 1).padStart(4, '0')}.webp`;
  convertFrame(src, path.join(heroDir, name), 1600, 78);
  if ((i + 1) % 50 === 0) console.log(`  hero desktop ${i + 1}/${heroFrames.length}`);
});

console.log('Converting hero mobile (960px, q72)...');
heroFrames.forEach((src, i) => {
  const name = `frame_${String(i + 1).padStart(4, '0')}.webp`;
  convertFrame(src, path.join(heroMobDir, name), 960, 72);
  if ((i + 1) % 50 === 0) console.log(`  hero mobile ${i + 1}/${heroFrames.length}`);
});

// ── Convert dismantle ────────────────────────────────────────────────────────
const dismDir = path.join(OUT, 'dismantle');
const dismMobDir = path.join(OUT, 'dismantle-mobile');
ensureDir(dismDir);
ensureDir(dismMobDir);

console.log('Converting dismantle desktop (1600px, q78)...');
dismantleFrames.forEach((src, i) => {
  const name = `frame_${String(i + 1).padStart(4, '0')}.webp`;
  convertFrame(src, path.join(dismDir, name), 1600, 78);
  if ((i + 1) % 50 === 0) console.log(`  dismantle desktop ${i + 1}/${dismantleFrames.length}`);
});

console.log('Converting dismantle mobile (960px, q72)...');
dismantleFrames.forEach((src, i) => {
  const name = `frame_${String(i + 1).padStart(4, '0')}.webp`;
  convertFrame(src, path.join(dismMobDir, name), 960, 72);
  if ((i + 1) % 50 === 0) console.log(`  dismantle mobile ${i + 1}/${dismantleFrames.length}`);
});

// ── Report ───────────────────────────────────────────────────────────────────
function folderSize(dir) {
  let total = 0;
  fs.readdirSync(dir).forEach(f => { total += fs.statSync(path.join(dir, f)).size; });
  return (total / 1024 / 1024).toFixed(1) + ' MB';
}

console.log('\n=== DONE ===');
console.log('hero frames:             ', heroFrames.length, '   size:', folderSize(heroDir));
console.log('hero-mobile frames:      ', heroFrames.length, '   size:', folderSize(heroMobDir));
console.log('dismantle frames:        ', dismantleFrames.length, '   size:', folderSize(dismDir));
console.log('dismantle-mobile frames: ', dismantleFrames.length, '   size:', folderSize(dismMobDir));
console.log('\nPaste these into config.js:');
console.log(`HERO_FRAME_COUNT:       ${heroFrames.length}`);
console.log(`DISMANTLE_FRAME_COUNT:  ${dismantleFrames.length}`);
