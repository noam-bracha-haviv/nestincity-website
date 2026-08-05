/**
 * Horizontal strip interaction, in two modes.
 *
 *   mode: 'snap'  — one card per drag / swipe / wheel gesture / arrow click.
 *                   A single index drives both the translation and which card
 *                   carries the active class. Movement uses the CSS transition
 *                   only, so there is never more than one animation running.
 *
 *   mode: 'free'  — free dragging with decaying momentum and hard clamping.
 *                   Movement uses rAF only; the CSS transition is switched off
 *                   so the two can never fight each other.
 *
 * Bounds are measured without ever touching the live transform (the previous
 * version reset it to read the rest position, which is what made the strips
 * visibly jump and snap back).
 */
const EASE = 'transform 0.42s cubic-bezier(0.22, 0.61, 0.36, 1)';

export function dragStrip(strip, opts = {}) {
  if (!strip) return null;
  const {
    mode = 'free',
    step = 0,
    activeClass = null,
    activeIndex = 0,
    threshold = 60,
  } = opts;

  const items = activeClass ? [...strip.children] : [];
  let t = 0;                 // current translation
  let index = activeIndex;   // snap mode: which card is active
  let restLeft = 0;
  let total = 0;
  let view = 0;

  /* Rest position from layout, never from the live rect: offsetLeft ignores the
     strip's own transform, and the offsetParent's rect gives its on-screen
     position (including that parent's own centring transform). Reading the
     strip's rect instead would sample a mid-transition value and drift. */
  const measure = () => {
    const parent = strip.offsetParent || strip.parentElement;
    /* Below 1440 the canvas is scaled, so viewport rects and the element's own
       layout coordinates are in different units. Derive the factor from the
       strip itself and work entirely in its own space (a no-op at scale 1). */
    const scale = strip.getBoundingClientRect().width / strip.offsetWidth || 1;
    restLeft = parent.getBoundingClientRect().left / scale + strip.offsetLeft;
    total = strip.scrollWidth;
    view = document.documentElement.clientWidth / scale;
  };

  const maxT = () => -restLeft;
  const minT = () => view - (restLeft + total);
  const clamp = (v) => {
    const lo = minT();
    const hi = maxT();
    return lo >= hi ? 0 : Math.min(hi, Math.max(lo, v));
  };

  const paint = (animate) => {
    strip.style.transition = animate ? EASE : 'none';
    strip.style.transform = `translate3d(${t}px,0,0)`;
  };

  /* snap mode: translation that centres card `i`, then clamped so the strip
     never opens a gap at either viewport edge */
  const centreFor = (i) => {
    if (!items[i]) return t;
    measure();
    const item = items[i];
    const itemCentreAtRest = item.offsetLeft + item.offsetWidth / 2 + restLeft;
    return clamp(view / 2 - itemCentreAtRest);
  };

  const setIndex = (i, animate = true) => {
    index = Math.min(items.length - 1, Math.max(0, i));
    t = centreFor(index);
    paint(animate);
    if (activeClass) {
      items.forEach((el, n) => el.classList.toggle(activeClass, n === index));
    }
  };

  measure();
  if (mode === 'snap') setIndex(index, false);
  else paint(false);

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      measure();
      if (mode === 'snap') setIndex(index, false);
      else {
        t = clamp(t);
        paint(false);
      }
    }, 120);
  });
  window.addEventListener('load', () => {
    measure();
    if (mode === 'snap') setIndex(index, false);
    else {
      t = clamp(t);
      paint(false);
    }
  });

  // ---- momentum (free mode only) -----------------------------------------
  let velocity = 0;
  let raf = null;
  const stopGlide = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    velocity = 0;
  };
  const glide = () => {
    velocity *= 0.93;
    const next = clamp(t + velocity);
    if (next === t || Math.abs(velocity) < 0.2) {
      raf = null;
      return;
    }
    t = next;
    paint(false);
    raf = requestAnimationFrame(glide);
  };

  // ---- pointer drag ------------------------------------------------------
  let dragging = false;
  let pointerId = null;
  let startX = 0;
  let startT = 0;
  let lastX = 0;
  let lastTime = 0;
  let moved = 0;

  strip.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    stopGlide();
    measure();
    dragging = true;
    pointerId = e.pointerId;
    startX = lastX = e.clientX;
    startT = t;
    lastTime = performance.now();
    moved = 0;
    strip.classList.add('is-dragging');
    strip.style.transition = 'none';
    /* capture is taken in pointermove, once the gesture is really a drag:
       capturing here retargets the following click to the strip, which swallows
       clicks on the cards' links */
  });

  strip.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    if (moved > 6 && !strip.hasPointerCapture?.(pointerId)) {
      strip.setPointerCapture?.(pointerId);
    }
    // snap mode follows the finger with resistance so it never looks loose
    t = clamp(startT + (mode === 'snap' ? dx * 0.55 : dx));
    paint(false);
    const now = performance.now();
    const dt = now - lastTime;
    if (dt > 0) velocity = (e.clientX - lastX) * (16 / dt);
    lastX = e.clientX;
    lastTime = now;
    if (moved > 6) e.preventDefault(); // never for the jitter of a plain click
  });

  const end = (e) => {
    if (!dragging || (e?.pointerId !== undefined && e.pointerId !== pointerId)) return;
    const dx = lastX - startX;
    dragging = false;
    strip.classList.remove('is-dragging');
    // releasing a pointer that was never captured throws, so check first
    if (strip.hasPointerCapture?.(pointerId)) strip.releasePointerCapture(pointerId);
    pointerId = null;

    if (mode === 'snap') {
      // past the threshold -> exactly one card; otherwise settle back
      if (Math.abs(dx) > threshold) setIndex(index + (dx < 0 ? 1 : -1));
      else setIndex(index);
      velocity = 0;
      return;
    }
    if (Math.abs(velocity) > 0.5) raf = requestAnimationFrame(glide);
  };
  strip.addEventListener('pointerup', end);
  strip.addEventListener('pointercancel', end);
  strip.addEventListener('lostpointercapture', end);

  strip.addEventListener('click', (e) => {
    if (moved > 6) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  strip.querySelectorAll('img, a').forEach((el) => {
    el.addEventListener('dragstart', (e) => e.preventDefault());
  });

  // ---- trackpad / horizontal wheel ---------------------------------------
  let wheelAcc = 0;
  let wheelLock = false;
  strip.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // leave vertical alone
    e.preventDefault();
    if (mode === 'snap') {
      if (wheelLock) return;
      wheelAcc += e.deltaX;
      if (Math.abs(wheelAcc) > threshold) {
        setIndex(index + (wheelAcc > 0 ? 1 : -1));
        wheelAcc = 0;
        wheelLock = true;
        setTimeout(() => { wheelLock = false; }, 420);
      }
      return;
    }
    stopGlide();
    measure();
    t = clamp(t - e.deltaX);
    paint(false);
  }, { passive: false });

  return {
    nudge(dir) {
      if (mode === 'snap') return setIndex(index + dir);
      stopGlide();
      measure();
      t = clamp(t + dir * -(step || 100));
      paint(true);
    },
    getIndex: () => index,
    get: () => t,
  };
}
