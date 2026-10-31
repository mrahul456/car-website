/**
 * NOCTIS — Central Configuration
 * All tunable values live here. Edit and refresh.
 */

window.NOCTIS_CONFIG = {

  // ── Frame counts (updated after conversion) ──────────────────────────────
  HERO_FRAME_COUNT: 583,      // clip1 + clip2 + clip3 total
  DISMANTLE_FRAME_COUNT: 198, // flow clip total

  // ── Frame paths ──────────────────────────────────────────────────────────
  FRAME_PATHS: {
    hero:              'assets/frames/hero/',
    heroMobile:        'assets/frames/hero-mobile/',
    dismantle:         'assets/frames/dismantle/',
    dismantleMobile:   'assets/frames/dismantle-mobile/',
  },
  FRAME_PREFIX: 'frame_',
  FRAME_EXT:    '.webp',
  FRAME_DIGITS: 4, // zero-padded length e.g. 0001

  // ── Section heights (vh units) ───────────────────────────────────────────
  HERO_HEIGHT_VH:      600,   // wrapper height for hero pinned section
  DISMANTLE_HEIGHT_VH: 350,   // wrapper height for dismantle pinned section

  // ── Hero chapter ranges [startPct, endPct] ───────────────────────────────
  HERO_CHAPTERS: {
    intro:  [0,   0.12],  // NOCTIS / city is asleep
    ch2:    [0.22, 0.40], // doesn't need city light
    ch3:    [0.50, 0.68], // brings its own
    ch4:    [0.80, 1.00], // GT-E reveal
  },

  // ── Hero text fadeout (canvas fades to black) ────────────────────────────
  HERO_FADE_START: 0.95, // progress at which canvas begins fading to black

  // ── Dismantle callout positions ──────────────────────────────────────────
  // { x, y } as fraction of stage width / height (0–1).
  // lineEnd is where the callout line starts from the dot.
  DISMANTLE_CALLOUTS: [
    {
      id: 'body',
      label: 'BODY',
      desc: 'Carbon composite monocoque',
      dot:  { x: 0.28, y: 0.42 },
      text: { x: 0.08, y: 0.30 },
    },
    {
      id: 'battery',
      label: 'BATTERY',
      desc: '110 kWh structural pack',
      dot:  { x: 0.50, y: 0.72 },
      text: { x: 0.60, y: 0.82 },
    },
    {
      id: 'drive',
      label: 'DRIVE',
      desc: 'Dual axial-flux motors, 680 kW',
      dot:  { x: 0.72, y: 0.60 },
      text: { x: 0.78, y: 0.45 },
    },
    {
      id: 'light',
      label: 'LIGHT',
      desc: 'Single-line LED signature',
      dot:  { x: 0.88, y: 0.38 },
      text: { x: 0.88, y: 0.22 },
    },
  ],
  // Callouts appear after this dismantle progress
  DISMANTLE_CALLOUT_START: 0.70,

  // ── Scroll lerp & animation ──────────────────────────────────────────────
  FRAME_LERP:      0.15,  // canvas frame lerp factor per rAF
  CURSOR_LERP:     0.18,  // custom cursor lerp
  GRAIN_FPS:       8,     // film grain shifts per second
  GRAIN_OPACITY:   0.035, // 3.5%

  // ── Lineup ───────────────────────────────────────────────────────────────
  LINEUP: [
    {
      id:     'gt-e',
      num:    '01',
      name:   'GT-E',
      tagline:'The grand tourer.',
      range:  '640 km',
      sprint: '3.1 s',
      power:  '680 kW',
      image:  'assets/cars/gt-e.webp',
      colors: ['#1A1A1A', '#2E2E2E', '#CFE3FF', '#5A4033'],
    },
    {
      id:     's',
      num:    '02',
      name:   'S',
      tagline:'Four doors, no compromise.',
      range:  '600 km',
      sprint: '3.6 s',
      power:  '520 kW',
      image:  'assets/cars/s.webp',
      colors: ['#EDEAE4', '#D4D0CA', '#3A3A3A', '#8A8F98'],
    },
    {
      id:     'x',
      num:    '03',
      name:   'X',
      tagline:'Higher, never heavier.',
      range:  '560 km',
      sprint: '4.2 s',
      power:  '480 kW',
      image:  'assets/cars/x.webp',
      colors: ['#0D1B2A', '#1B2B3A', '#2A3D52', '#8A8F98'],
    },
    {
      id:     'r',
      num:    '04',
      name:   'R',
      tagline:'Built for the track.',
      range:  '420 km',
      sprint: '2.4 s',
      power:  '900 kW',
      image:  'assets/cars/r.webp',
      colors: ['#0A0A0A', '#1A0000', '#E1251B', '#2A2A2A'],
    },
    {
      id:     'one',
      num:    '05',
      name:   'ONE',
      tagline:'The future, early.',
      range:  'Concept',
      sprint: '—',
      power:  '—',
      image:  'assets/cars/one.webp',
      colors: ['#C0C5CC', '#A8ADB4', '#E8EAEC', '#6A6F76'],
    },
  ],

  // ── Preloader: how many hero frames to load before revealing page ─────────
  PRELOAD_INITIAL_FRAMES: 40,
};

