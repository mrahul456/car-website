/**
 * NOCTIS — main.js
 * Plain JavaScript, 60fps scroll-scrubbed canvas playback,
 * custom cursor, film grain, preloader, nav, lineup accordion,
 * and scrollytelling motion.
 *
 * No frameworks. No build tools. No npm libraries.
 */

/* ── Configuration Reference ─────────────────────────────────────────────── */
const C = window.NOCTIS_CONFIG;

/* ── Environment Checks ──────────────────────────────────────────────────── */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer   = window.matchMedia('(pointer: fine)').matches;
const isMobile      = () => window.innerWidth < 768;

/* ─────────────────────────────────────────────────────────────────────────── */
/* UTILITY: Frame URL Builder                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
function frameUrl(set, index) {
  const n = String(index + 1).padStart(C.FRAME_DIGITS, '0');
  return `${C.FRAME_PATHS[set]}${C.FRAME_PREFIX}${n}${C.FRAME_EXT}`;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* UTILITY: Load Frame with img.decode()                                       */
/* ─────────────────────────────────────────────────────────────────────────── */
function loadFrame(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.decode) {
        img.decode().then(() => resolve(img)).catch(() => resolve(img));
      } else {
        resolve(img);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* CANVAS PLAYER                                                               */
/* Manages high-performance canvas scrubbing for pinned sequences             */
/* ─────────────────────────────────────────────────────────────────────────── */
class CanvasPlayer {
  constructor(canvas, setName, count) {
    this.canvas    = canvas;
    this.ctx       = canvas.getContext('2d');
    this.setName   = setName;
    this.count     = count;
    this.frames    = new Array(count).fill(null);
    this.loaded    = 0;

    // Scroll state
    this.targetFrame  = 0;
    this.currentFrame = 0; // float for smooth lerp
    this.lastDrawn    = -1;
    this.lastFade     = 0;
    this._pendingLoads = new Set();

    this._setupCanvas();
    window.addEventListener('resize', () => {
      this._setupCanvas();
      const newSet = isMobile() ? `${setName.replace('-mobile', '')}Mobile` : setName.replace('Mobile', '');
      if (C.FRAME_PATHS[newSet] && this.setName !== newSet) {
        this.updateSet(newSet);
      }
    });
  }

  _setupCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w   = this.canvas.clientWidth || window.innerWidth;
    const h   = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width  = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dpr   = dpr;
    this._cssW = w;
    this._cssH = h;
    if (this.lastDrawn >= 0) {
      this._drawFrame(this.lastDrawn, true, this.lastFade);
    }
  }

  updateSet(newSet) {
    if (this.setName === newSet) return;
    this.setName = newSet;
    this.frames  = new Array(this.count).fill(null);
    this.loaded  = 0;
    this.lastDrawn = -1;
    const cur = Math.round(this.currentFrame);
    loadFrame(frameUrl(this.setName, cur)).then(img => {
      if (img && this.setName === newSet) {
        this.frames[cur] = img;
        this._drawFrame(cur, true, this.lastFade);
      }
    });
  }

  /** Parallel preload for initial range */
  async preload(start, end, onProgress) {
    const tasks = [];
    for (let i = start; i < end && i < this.count; i++) {
      const idx = i;
      const url = frameUrl(this.setName, idx);
      tasks.push(
        loadFrame(url).then(img => {
          if (img) {
            this.frames[idx] = img;
            this.loaded++;
          }
          if (onProgress) onProgress(this.loaded);
        })
      );
    }
    await Promise.all(tasks);
  }

  /** Sequential batched background loader (in-order, 6 concurrent) */
  async preloadBatched(start, end, batchSize = 6) {
    for (let i = start; i < end && i < this.count; i += batchSize) {
      const batch = [];
      for (let j = i; j < i + batchSize && j < end && j < this.count; j++) {
        if (this.frames[j]) continue;
        const idx = j;
        batch.push(
          loadFrame(frameUrl(this.setName, idx)).then(img => {
            if (img) {
              this.frames[idx] = img;
              this.loaded++;
            }
          })
        );
      }
      if (batch.length) {
        await Promise.all(batch);
      }
    }
  }

  /** Set target frame from normalized scroll progress (0..1) */
  setProgress(progress) {
    const clamped = Math.max(0, Math.min(1, progress));
    this.targetFrame = Math.round(clamped * (this.count - 1));

    // Priority load nearby frame if not yet cached
    if (!this.frames[this.targetFrame] && !this._pendingLoads.has(this.targetFrame)) {
      this._pendingLoads.add(this.targetFrame);
      loadFrame(frameUrl(this.setName, this.targetFrame)).then(img => {
        this._pendingLoads.delete(this.targetFrame);
        if (img) {
          this.frames[this.targetFrame] = img;
          if (Math.round(this.currentFrame) === this.targetFrame) {
            this._drawFrame(this.targetFrame, true, this.lastFade);
          }
        }
      });
    }
  }

  /** Called inside rAF loop: lerp towards target, redraw only when changed */
  tick(fadeAlpha) {
    this.currentFrame += (this.targetFrame - this.currentFrame) * C.FRAME_LERP;
    const frame = Math.round(this.currentFrame);
    const fade = fadeAlpha != null ? Math.min(1, Math.max(0, fadeAlpha)) : 0;

    const frameChanged = frame !== this.lastDrawn;
    const fadeChanged  = Math.abs(fade - this.lastFade) > 0.005;

    if (frameChanged || fadeChanged) {
      this._drawFrame(frame, false, fade);
      this.lastDrawn = frame;
      this.lastFade  = fade;
      return true;
    }
    return false;
  }

  _drawFrame(frameIndex, force, fadeAlpha = 0) {
    // Find nearest loaded frame if current one is pending
    let idx = frameIndex;
    if (!this.frames[idx]) {
      for (let offset = 1; offset < this.count; offset++) {
        if (idx - offset >= 0 && this.frames[idx - offset]) {
          idx = idx - offset;
          break;
        }
        if (idx + offset < this.count && this.frames[idx + offset]) {
          idx = idx + offset;
          break;
        }
      }
    }

    const img = this.frames[idx];
    if (!img) return;

    const ctx = this.ctx;
    const W   = this._cssW;
    const H   = this._cssH;

    // Fill page asphalt background
    ctx.fillStyle = '#07080A';
    ctx.fillRect(0, 0, W, H);

    const portrait = H > W;
    const iW = img.naturalWidth  || img.width;
    const iH = img.naturalHeight || img.height;

    let dx, dy, dw, dh;

    if (portrait) {
      // Contain-fit vertically centred so car is never cropped
      const scale = Math.min(W / iW, H / iH);
      dw = iW * scale;
      dh = iH * scale;
      dx = (W - dw) / 2;
      dy = (H - dh) / 2;
    } else {
      // Cover-fit on landscape screens
      const scale = Math.max(W / iW, H / iH);
      dw = iW * scale;
      dh = iH * scale;
      dx = (W - dw) / 2;
      dy = (H - dh) / 2;
    }

    ctx.globalAlpha = 1;
    ctx.drawImage(img, dx, dy, dw, dh);

    // Fade to solid black/asphalt overlay when requested (e.g. hero exit)
    if (fadeAlpha > 0) {
      ctx.globalAlpha = fadeAlpha;
      ctx.fillStyle   = '#07080A';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  drawStatic(frameIndex) {
    this._drawFrame(frameIndex, true, 0);
    this.lastDrawn = frameIndex;
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* FILM GRAIN OVERLAY                                                           */
/* Noise tile drawn once, shifted 8 times per second at ~3.5% opacity         */
/* ─────────────────────────────────────────────────────────────────────────── */
function initGrain() {
  const overlay = document.getElementById('grain');
  if (!overlay) return;

  const SIZE = 200;
  const offscreen = document.createElement('canvas');
  offscreen.width  = SIZE;
  offscreen.height = SIZE;
  const octx = offscreen.getContext('2d');
  const imgData = octx.createImageData(SIZE, SIZE);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    data[i]     = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  octx.putImageData(imgData, 0, 0);

  overlay.style.backgroundImage  = `url(${offscreen.toDataURL('image/png')})`;
  overlay.style.backgroundRepeat = 'repeat';

  const interval = 1000 / C.GRAIN_FPS;
  setInterval(() => {
    const x = (Math.random() * SIZE) | 0;
    const y = (Math.random() * SIZE) | 0;
    overlay.style.backgroundPosition = `${x}px ${y}px`;
  }, interval);
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* CUSTOM CURSOR ("The Headlight", desktop fine pointer only)                 */
/* ─────────────────────────────────────────────────────────────────────────── */
let activeCursorMode = 'dot';
let activeCursorLabel = '';

function setGlobalCursorMode(mode, labelText = '') {
  const cursor = document.getElementById('cursor');
  if (!cursor) return;
  const label = cursor.querySelector('.cursor-label');

  activeCursorMode  = mode;
  activeCursorLabel = labelText;

  if (mode === 'bar') {
    cursor.classList.add('bar-mode');
    if (label) label.textContent = labelText;
  } else {
    cursor.classList.remove('bar-mode');
    if (label) label.textContent = '';
  }
}

function initCursor() {
  if (!finePointer || reducedMotion) return;

  const cursor = document.getElementById('cursor');
  if (!cursor) return;

  let mouseX = -100, mouseY = -100;
  let curX   = -100, curY   = -100;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Attach hover triggers
  document.querySelectorAll('a, button, [role="button"], .lineup-slide').forEach(el => {
    el.addEventListener('mouseenter', () => {
      let lbl = 'VIEW';
      if (el.classList.contains('reserve-btn')) lbl = 'RESERVE';
      else if (el.classList.contains('lineup-slide')) {
        lbl = el.classList.contains('open') ? 'CONFIGURE' : 'OPEN';
      } else if (el.classList.contains('nav-wordmark') || el.closest('#nav')) {
        lbl = 'MENU';
      }
      setGlobalCursorMode('bar', lbl);
    });

    el.addEventListener('mouseleave', () => {
      setGlobalCursorMode('dot');
    });
  });

  // Mousedown 120ms highlight
  document.addEventListener('mousedown', () => {
    cursor.classList.add('pressed');
    setTimeout(() => cursor.classList.remove('pressed'), 120);
  });

  // Smooth lerp loop
  function loop() {
    curX += (mouseX - curX) * C.CURSOR_LERP;
    curY += (mouseY - curY) * C.CURSOR_LERP;
    cursor.style.transform = `translate(${curX}px, ${curY}px)`;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* NAVIGATION BAR                                                               */
/* Hides on scroll down, shows on scroll up                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > lastY && y > 100) {
      nav.classList.add('hidden');
    } else {
      nav.classList.remove('hidden');
    }
    lastY = y;
  }, { passive: true });
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* PINNED SCROLL PROGRESS HELPER                                               */
/* ─────────────────────────────────────────────────────────────────────────── */
function getPinProgress(wrapper) {
  const top     = wrapper.getBoundingClientRect().top;
  const scrollH = wrapper.offsetHeight - window.innerHeight;
  if (scrollH <= 0) return 0;
  return Math.max(0, Math.min(1, -top / scrollH));
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* SECTION 1 — HERO                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */
function initHero(heroPlayer) {
  const wrapper     = document.getElementById('hero-wrapper');
  const progressLine = document.querySelector('#hero-stage .progress-line');

  const hudChapter  = document.querySelector('.hud-chapter-text');
  const hudSpeed    = document.querySelector('.hud-speed');
  const hudDistance = document.querySelector('.hud-distance');

  const chapters = {
    ch1: document.getElementById('hero-ch1'),
    ch2: document.getElementById('hero-ch2'),
    ch3: document.getElementById('hero-ch3'),
    ch4: document.getElementById('hero-ch4'),
  };

  const heroLines = document.querySelectorAll('.hero-line');

  function update() {
    const p = getPinProgress(wrapper);

    // Update bottom 1px xenon progress line
    if (progressLine) {
      progressLine.style.width = `${p * 100}%`;
    }

    // Advance frame scrubbing
    heroPlayer.setProgress(p);

    // Fade to solid black over the last 5% of scroll
    let fade = 0;
    if (p > C.HERO_FADE_START) {
      fade = (p - C.HERO_FADE_START) / (1 - C.HERO_FADE_START);
    }
    heroPlayer.tick(fade);

    // HUD Telemetry
    if (hudSpeed) {
      hudSpeed.textContent = `${String(Math.round(p * 118)).padStart(3, '0')} KM/H`;
    }
    if (hudDistance) {
      hudDistance.textContent = `${(p * 4.2).toFixed(1)} KM`;
    }
    if (hudChapter) {
      hudChapter.textContent = p < 0.22 ? '01 / 04' : p < 0.50 ? '02 / 04' : p < 0.80 ? '03 / 04' : '04 / 04';
    }

    // Chapter visibility
    const ranges = C.HERO_CHAPTERS;
    const inRange = (key) => p >= ranges[key][0] && p <= ranges[key][1];

    chapters.ch1?.classList.toggle('visible', inRange('intro'));
    chapters.ch2?.classList.toggle('visible', inRange('ch2'));
    chapters.ch3?.classList.toggle('visible', inRange('ch3'));
    chapters.ch4?.classList.toggle('visible', inRange('ch4'));

    // Hero line reveals driven by scroll progress inside pinned section
    heroLines.forEach(mask => {
      const inner   = mask.querySelector('.line-inner');
      const showAt  = parseFloat(mask.dataset.showAt || '0');
      const hideAt  = parseFloat(mask.dataset.hideAt || '1');
      const visible = p >= showAt && p <= hideAt;
      if (inner) {
        if (visible && !inner.classList.contains('revealed')) {
          inner.classList.add('revealed');
        } else if (!visible && inner.classList.contains('revealed')) {
          inner.classList.remove('revealed');
        }
      }
    });

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* SECTION 2 — STATEMENT                                                        */
/* Word-by-word opacity reveal from 15% to 100%                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
function initStatement() {
  const section = document.getElementById('statement');
  if (!section) return;

  const words = section.querySelectorAll('.word');
  if (!words.length) return;

  function update() {
    const rect = section.getBoundingClientRect();
    const vh   = window.innerHeight;
    // Normalized position: 0 when entering from bottom, 1 when leaving at top
    const totalDist = rect.height + vh;
    const currentPos = vh - rect.top;
    const progress = Math.max(0, Math.min(1, currentPos / totalDist));

    // Focus word illumination while section is comfortably centered (progress 0.25 to 0.75)
    const local = Math.max(0, Math.min(1, (progress - 0.25) / 0.5));

    words.forEach((w, i) => {
      const threshold = i / Math.max(1, words.length - 1);
      w.classList.toggle('lit', local >= threshold);
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* SECTION 3 — DISMANTLE SVG CALLOUT CONNECTOR LINES                            */
/* ─────────────────────────────────────────────────────────────────────────── */
function initCalloutLines() {
  const stage = document.getElementById('dismantle-stage');
  if (!stage) return;

  let svg = stage.querySelector('.callout-svg-root');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'callout-svg-root');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('viewBox', '0 0 1000 1000');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.cssText = `
      position: absolute; inset: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 19;
    `;
    stage.appendChild(svg);
  } else {
    svg.innerHTML = '';
  }

  C.DISMANTLE_CALLOUTS.forEach((co) => {
    const el = document.querySelector(`.callout[data-id="${co.id}"]`);
    if (!el) return;

    // Position dot
    const dot = el.querySelector('.callout-dot');
    if (dot) {
      dot.style.left = `${co.dot.x * 100}%`;
      dot.style.top  = `${co.dot.y * 100}%`;
    }

    // Position label
    const lbl = el.querySelector('.callout-label');
    if (lbl) {
      lbl.style.left = `${co.text.x * 100}%`;
      lbl.style.top  = `${co.text.y * 100}%`;
    }

    // 1px hairline connector line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', `${co.dot.x * 1000}`);
    line.setAttribute('y1', `${co.dot.y * 1000}`);
    line.setAttribute('x2', `${co.text.x * 1000}`);
    line.setAttribute('y2', `${co.text.y * 1000}`);
    line.setAttribute('stroke', 'rgba(207,227,255,0.4)');
    line.setAttribute('stroke-width', '1');
    line.setAttribute('vector-effect', 'non-scaling-stroke');
    line.style.opacity = '0';
    line.style.transition = 'opacity 0.6s cubic-bezier(0.16,1,0.3,1)';
    line.dataset.calloutId = co.id;
    svg.appendChild(line);
  });
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* SECTION 3 — DISMANTLE PLAYBACK                                               */
/* ─────────────────────────────────────────────────────────────────────────── */
function initDismantle(dismantlePlayer) {
  const wrapper      = document.getElementById('dismantle-wrapper');
  const progressLine = document.querySelector('#dismantle-stage .progress-line');
  const callouts     = document.querySelectorAll('.callout');

  function update() {
    const p = getPinProgress(wrapper);

    if (progressLine) {
      progressLine.style.width = `${p * 100}%`;
    }

    dismantlePlayer.setProgress(p);
    dismantlePlayer.tick();

    // Reveal "Look closer." title on scroll entry
    const titleInner = document.querySelector('.dismantle-title .line-inner');
    if (titleInner) {
      titleInner.classList.toggle('revealed', p > 0.02);
    }

    // After 70% progress, four callouts and connector lines fade in one by one
    const calloutStart = C.DISMANTLE_CALLOUT_START;
    const calloutRange = 1 - calloutStart;
    const svgLines = document.querySelectorAll('#dismantle-stage svg line');

    callouts.forEach((el, i) => {
      const threshold = calloutStart + (i / callouts.length) * calloutRange;
      const visible   = p >= threshold;
      el.classList.toggle('visible', visible);
      if (svgLines[i]) {
        svgLines[i].style.opacity = visible ? '1' : '0';
      }
    });

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* SECTION 4 — LINEUP ACCORDION                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
function initLineup() {
  const slides = document.querySelectorAll('.lineup-slide');
  if (!slides.length) return;

  let openIdx   = 0;
  let hoverTimer = null;

  function openSlide(idx) {
    slides.forEach((sl, i) => {
      const opening = i === idx;
      sl.classList.toggle('open', opening);
      sl.setAttribute('aria-expanded', opening ? 'true' : 'false');
    });
    openIdx = idx;

    // Dynamically update cursor label if cursor is currently hovering over this slide
    const hovered = document.querySelector('.lineup-slide:hover');
    if (hovered) {
      const isCurrentOpen = hovered === slides[openIdx];
      setGlobalCursorMode('bar', isCurrentOpen ? 'CONFIGURE' : 'OPEN');
    }
  }

  // Desktop: debounced 80ms hover to avoid sweeping flicker
  if (!isMobile()) {
    slides.forEach((sl, i) => {
      sl.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => openSlide(i), 80);
      });
      sl.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimer);
      });
    });
  }

  // Click & keyboard navigation (aria-expanded, arrows)
  slides.forEach((sl, i) => {
    sl.addEventListener('click', () => openSlide(i));

    sl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openSlide(i);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = Math.min(i + 1, slides.length - 1);
        slides[next].focus();
        openSlide(next);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = Math.max(i - 1, 0);
        slides[prev].focus();
        openSlide(prev);
      }
    });
  });

  // Solid colour swatches selection
  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = sw.parentElement;
      parent.querySelectorAll('.color-swatch').forEach(s => {
        s.classList.remove('active');
        s.setAttribute('aria-checked', 'false');
      });
      sw.classList.add('active');
      sw.setAttribute('aria-checked', 'true');
    });
  });

  // Section entrance animation (slides rise 40px with 0.08s stagger)
  const container = document.querySelector('.lineup-slides');
  if (container) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        slides.forEach((sl, i) => {
          setTimeout(() => sl.classList.add('in-view'), i * 80);
        });
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.1 });
    obs.observe(container);
  }

  // GT-E open by default
  openSlide(0);
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* LINE-REVEAL OBSERVER (for static sections)                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
function initLineReveal() {
  const masks = document.querySelectorAll('.line-mask:not(.hero-line)');
  if (!masks.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const inner = entry.target.querySelector('.line-inner');
      const delay = entry.target.dataset.delay || '0';
      if (inner) {
        inner.style.transitionDelay = `${delay}s`;
        inner.classList.add('revealed');
      }
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.15 });

  masks.forEach(m => obs.observe(m));
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* ACCESSIBILITY: REDUCED MOTION                                               */
/* No pinning, static keyframes (hero 0%, 35%, 65%, 100%; dismantle assembled) */
/* ─────────────────────────────────────────────────────────────────────────── */
function initReducedMotion(heroPlayer, dismantlePlayer) {
  const heroWrapper = document.getElementById('hero-wrapper');
  const dismWrapper = document.getElementById('dismantle-wrapper');

  if (heroWrapper) {
    heroWrapper.style.height = 'auto';
    const stage = heroWrapper.querySelector('.pin-stage');
    if (stage) stage.style.position = 'relative';
  }
  if (dismWrapper) {
    dismWrapper.style.height = 'auto';
    const stage = dismWrapper.querySelector('.pin-stage');
    if (stage) stage.style.position = 'relative';
  }

  // Display initial hero static frame
  heroPlayer.drawStatic(0);

  // Reveal all hero chapter headlines
  ['hero-ch1', 'hero-ch2', 'hero-ch3', 'hero-ch4'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('visible');
  });

  // Reveal statement
  document.querySelectorAll('#statement .word').forEach(w => w.classList.add('lit'));

  // Dismantle assembled static frame
  dismantlePlayer.drawStatic(0);
  document.querySelectorAll('.callout').forEach(c => c.classList.add('visible'));
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* PRELOADER                                                                    */
/* Black screen, NOCTIS wordmark, thin center-outward expanding xenon line,   */
/* 000–100 mono counter, preloads frames 1–40, then reveals page               */
/* ─────────────────────────────────────────────────────────────────────────── */
async function runPreloader(heroPlayer, dismantlePlayer) {
  const preloader = document.getElementById('preloader');
  const bar       = document.querySelector('.pre-bar');
  const counter   = document.querySelector('.pre-counter');

  let loaded = 0;
  const total = C.PRELOAD_INITIAL_FRAMES;

  function updateUI(n) {
    const pct = Math.min(100, Math.round((n / total) * 100));
    const halfPct = pct / 2;
    if (bar) {
      bar.style.width = `${pct}%`;
      bar.style.left  = `${50 - halfPct}%`;
    }
    if (counter) {
      counter.textContent = String(pct).padStart(3, '0');
    }
  }

  updateUI(0);

  // Preload first 40 hero frames in parallel
  await heroPlayer.preload(0, total, (n) => {
    loaded = n;
    updateUI(n);
  });

  updateUI(total);

  // Brief pause at 100%
  await new Promise(r => setTimeout(r, 260));

  // Bar turns brighter for a moment
  if (bar) bar.style.background = '#ffffff';
  await new Promise(r => setTimeout(r, 120));
  if (bar) bar.style.background = 'var(--xenon)';
  await new Promise(r => setTimeout(r, 80));

  // Fade out preloader to the hero
  if (preloader) {
    preloader.classList.add('exit');
    await new Promise(r => setTimeout(r, 800));
    preloader.style.display = 'none';
  }

  // Reveal page
  document.body.style.opacity = '1';

  // Draw initial hero frame
  heroPlayer.drawStatic(0);

  // In the background: load remaining hero frames in order, then dismantle frames
  (async () => {
    await heroPlayer.preloadBatched(total, C.HERO_FRAME_COUNT, 6);
    await dismantlePlayer.preloadBatched(0, C.DISMANTLE_FRAME_COUNT, 6);
  })();
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* SET WRAPPER HEIGHTS from config.js                                          */
/* ─────────────────────────────────────────────────────────────────────────── */
function setWrapperHeights() {
  const hw = document.getElementById('hero-wrapper');
  const dw = document.getElementById('dismantle-wrapper');
  if (hw) hw.style.height = `${C.HERO_HEIGHT_VH}vh`;
  if (dw) dw.style.height = `${C.DISMANTLE_HEIGHT_VH}vh`;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* MAIN INITIALIZATION                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */
async function init() {
  // Hide body until initial frames are preloaded
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1)';

  setWrapperHeights();
  initGrain();
  initNav();
  initCursor();

  // Create canvas players
  const heroSet = isMobile() ? 'heroMobile' : 'hero';
  const dismSet = isMobile() ? 'dismantleMobile' : 'dismantle';

  const heroCanvas      = document.getElementById('hero-canvas');
  const dismantleCanvas = document.getElementById('dismantle-canvas');

  const heroPlayer      = new CanvasPlayer(heroCanvas, heroSet, C.HERO_FRAME_COUNT);
  const dismantlePlayer = new CanvasPlayer(dismantleCanvas, dismSet, C.DISMANTLE_FRAME_COUNT);

  // Preloader
  await runPreloader(heroPlayer, dismantlePlayer);

  // Initialize interactive sections
  initCalloutLines();

  if (reducedMotion) {
    initReducedMotion(heroPlayer, dismantlePlayer);
  } else {
    initHero(heroPlayer);
    initDismantle(dismantlePlayer);
  }

  initStatement();
  initLineReveal();
  initLineup();
}

// Kick off
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
