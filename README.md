# NOCTIS — Electric Vehicles for the Dark

A premium, minimal, single-page scrollytelling website for **NOCTIS**, a fictional electric vehicle brand.

> **Mood**: A city in total blackout at night where the car's light is the only light in the world. Quiet, expensive, and precise — expansive negative space, restrained typography, and fluid 60fps canvas-driven motion.

---

## ⚡ Features

* **Scroll-Scrubbed Canvas Engine**:
  - Scrubbed sequence rendering across full device pixel ratio (capped at `2x`) on HTML5 `<canvas>`.
  - Zero image swapping, zero video tags.
  - Bidirectional nearest-frame finder for jitter-free playback.
  - Adaptive orientation: Cover-fit on landscape viewports; contain-fit vertically centered on `--asphalt` (`#07080A`) on portrait screens.
  - Automatic mobile optimization: dynamically loads high-efficiency 960px WebP sets below 768px viewport width.

* **Section Architecture**:
  1. **Hero (~600vh sticky stage)**:
     - 583 joined frames from 3 cinematic clips.
     - Live HUD telemetry: Speed counter (000 → 118 KM/H), distance tracker (0.0 → 4.2 KM), active chapter indicators with taillight-red ticks.
     - Scroll-driven line-reveal chapters positioned exclusively in empty sky.
     - Smooth fade to solid black/asphalt over the final 5% of scroll.
  2. **Engineering Statement (100vh)**:
     - Word-by-word opacity reveal (15% → 100%) as the statement aligns with the viewport center.
  3. **Dismantle (~350vh sticky stage)**:
     - 198-frame interactive breakdown scrubbing forward and backward.
     - Four component callouts (BODY, BATTERY, DRIVE, LIGHT) with 1px SVG hairline connectors and xenon dots appearing progressively after 70% scroll.
  4. **The Lineup (Interactive Accordion)**:
     - Five models side by side: GT-E, S, X, R, and ONE.
     - 80ms debounced hover expansion with smooth `flex-grow` transitions.
     - Car slides in 6% from left to right along a continuous floor line at 72% slide height.
     - Staggered line-by-line typography reveals (0.06s stagger), specifications, and interactive color swatches.
     - Responsive vertical accordion on mobile devices (<768px) with accessible keyboard navigation (`ArrowLeft`, `ArrowRight`, `Enter`, `Space`, and `aria-expanded`).
  5. **Reserve (100vh)**:
     - Solid black backdrop with custom interactive xenon reservation button and taillight indicator.
  6. **Footer**:
     - Minimal 1px hairline border, mono navigation columns, legal information.

* **Cinematic Effects & Micro-Interactions**:
  - **The Headlight (Custom Cursor)**: Desktop fine-pointer cursor following mouse with 0.18 lerp; morphs into a 44x2px xenon light bar with mono labels (`VIEW`, `RESERVE`, `MENU`, `OPEN`, `CONFIGURE`); 120ms mousedown brightness pulse.
  - **Dynamic Film Grain**: Offscreen 200×200 procedural noise tile shifted randomly 8 times per second at ~3.5% opacity.
  - **Minimal Preloader**: Center-outward expanding xenon progress indicator with 000–100 mono counter; loads the first 40 frames before revealing the page, then continues loading in the background.
  - **Full Accessibility**: Automatic fallback for `prefers-reduced-motion` with static keyframes, standard native cursor, and semantic headings.

---

## 🎨 Design Tokens

* **Colors**:
  - `--asphalt`: `#07080A` (Page background)
  - `--graphite`: `#121418`
  - `--fog`: `#8A8F98` (Muted mono text & labels)
  - `--bone`: `#EDEAE4` (Body & display typography)
  - `--xenon`: `#CFE3FF` (Primary light accent)
  - `--taillight`: `#E1251B` (Subtle indicators)
  - `--hairline`: `rgba(237, 234, 228, 0.12)`
* **Typography**:
  - Display: **Archivo** (variable, 125% expanded width, weights 300 & 400)
  - Body: **Inter** 400
  - HUD: **JetBrains Mono** 400
* **Strict Style Rules**: No gradients, no blur, no glassmorphism, no box/drop shadows, no glow filters, no rounded bubbly cards.

---

## 🛠️ Project Structure

```text
├── assets/
│   ├── cars/                 # 1600px studio WebP lineup renders (gt-e, s, x, r, one)
│   └── frames/
│       ├── hero/             # 583 desktop WebP frames (1600px, q78)
│       ├── hero-mobile/      # 583 mobile WebP frames (960px, q72)
│       ├── dismantle/        # 198 desktop WebP frames (1600px, q78)
│       └── dismantle-mobile/ # 198 mobile WebP frames (960px, q72)
├── index.html                # Semantic single-page HTML5 structure
├── styles.css                # Pure vanilla CSS design system
├── config.js                 # Central configuration (frame counts, section heights, callouts)
├── main.js                   # Pure vanilla JS scrollytelling & interaction engine
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

No build tools, bundlers, or npm dependencies are required. Run directly with any static file server:

### VS Code Live Server
1. Open the project folder in **VS Code**.
2. Click **Go Live** on the bottom status bar (or right-click `index.html` → **Open with Live Server**).

### Python HTTP Server
```bash
python -m http.server 3000
```
Open `http://localhost:3000` in your browser.

### Node / npx
```bash
npx serve .
```
Open the provided local URL in your browser.

