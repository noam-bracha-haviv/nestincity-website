import { dragStrip } from './drag-strip.js';

/* Nest in City — shared behaviour.
   Interactions are deliberately minimal, matching the Figma file. */

// Footer phone capture: keep the browser from navigating away on submit.
document.querySelectorAll('.phone-cta').forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input');
    if (input && input.value.trim()) form.dataset.submitted = 'true';
  });
});

/* Footer CTA — the pink pill slides left across the phone field, then the
   browser follows the anchor's own href. Reduced motion goes straight there. */
document.querySelectorAll('.phone-cta__button').forEach((link) => {
  let running = false;

  link.addEventListener('click', (e) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (running) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    running = true;
    link.classList.add('is-sliding');

    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      window.location.href = link.href;
    };
    link.addEventListener('transitionend', (ev) => {
      if (ev.propertyName === 'transform') go();
    });
    setTimeout(go, 400); // fallback if the transition never fires
  });

  // a restored page (back button / bfcache) must show the pill on the right
  window.addEventListener('pageshow', () => {
    running = false;
    link.classList.remove('is-sliding');
  });
});

/* Press carousel — one card per drag, swipe, wheel gesture or arrow click.
   A single index drives both the position and which card is blue. */
document.querySelectorAll('.press').forEach((press) => {
  const api = dragStrip(press.querySelector('.press__strip'), {
    mode: 'snap',
    activeClass: 'press__card--active',
    activeIndex: 4, // Arts Thread is the active card at rest, as in Figma
  });
  if (!api) return;
  press.querySelectorAll('.press__arrow').forEach((btn) => {
    btn.addEventListener('click', () => api.nudge(Number(btn.dataset.dir)));
  });
});

/* Home photo strip — free dragging with momentum. */
document.querySelectorAll('.groups__strip').forEach((el) =>
  dragStrip(el, { mode: 'free' })
);

/* Story video — muted autoplay as in Figma, plus an accessible play/pause. */
document.querySelectorAll('.story__video').forEach((wrap) => {
  const video = wrap.querySelector('video');
  const btn = wrap.querySelector('.story__video-toggle');
  if (!video || !btn) return;

  const mute = wrap.querySelector('.story__video-mute');

  const sync = () => {
    const paused = video.paused;
    wrap.dataset.paused = paused ? 'true' : 'false';
    btn.setAttribute('aria-label', paused ? 'Play video' : 'Pause video');
    btn.setAttribute('aria-pressed', paused ? 'false' : 'true');
    if (mute) {
      wrap.dataset.muted = video.muted ? 'true' : 'false';
      mute.setAttribute('aria-label', video.muted ? 'Unmute video' : 'Mute video');
      mute.setAttribute('aria-pressed', video.muted ? 'false' : 'true');
    }
  };

  const toggle = () => {
    if (video.paused) video.play().catch(() => {});
    else video.pause();
    sync(); // don't wait on the media event, so the icon never lags
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });

  /* Touch reveal — the controls are hover-only in CSS, which a touch device
     never satisfies, so a tap sets data-touched for a few seconds. The tap that
     brings them up must not also toggle playback. */
  let hideTimer;
  let swallowClick = false;
  const reveal = () => {
    wrap.dataset.touched = 'true';
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      delete wrap.dataset.touched;
    }, 3000);
  };

  wrap.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    swallowClick = wrap.dataset.touched !== 'true' && e.target === video;
    reveal();
  });

  video.addEventListener('click', () => {
    if (swallowClick) {
      swallowClick = false;
      return;
    }
    toggle();
  });
  video.addEventListener('play', sync);
  video.addEventListener('pause', sync);
  video.addEventListener('volumechange', sync);

  /* Fullscreen. Standard Fullscreen API on the frame so the controls come
     along; iOS Safari does not implement it on elements, so fall back to the
     video's own webkitEnterFullscreen. Esc / the browser gesture also exits,
     hence the fullscreenchange listeners rather than a local flag. */
  const full = wrap.querySelector('.story__video-full');
  if (full) {
    const fsElement = () =>
      document.fullscreenElement || document.webkitFullscreenElement || null;

    const syncFull = () => {
      const on = fsElement() === wrap;
      wrap.dataset.full = on ? 'true' : 'false';
      full.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen');
      full.setAttribute('aria-pressed', on ? 'true' : 'false');
    };

    const exit = () => {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    };

    const enter = () => {
      if (wrap.requestFullscreen) wrap.requestFullscreen().catch(() => {});
      else if (wrap.webkitRequestFullscreen) wrap.webkitRequestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen(); // iOS
    };

    full.addEventListener('click', (e) => {
      e.stopPropagation();
      if (fsElement()) exit();
      else enter();
    });

    document.addEventListener('fullscreenchange', syncFull);
    document.addEventListener('webkitfullscreenchange', syncFull);
    syncFull();
  }

  if (mute) {
    mute.addEventListener('click', (e) => {
      e.stopPropagation();
      video.muted = !video.muted;
      // unmuting counts as the user gesture that lets sound through
      if (!video.muted && video.paused) video.play().catch(() => {});
      sync();
    });
  }
  sync();
});

/* Shop filter pills — switch the active pill and show the matching products. */
document.querySelectorAll('.shop-filters').forEach((bar) => {
  const grid = document.querySelector('.shop-grid');
  if (!grid) return;
  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter');
    if (!btn) return;
    bar.querySelectorAll('.filter').forEach((b) => b.classList.toggle('filter--on', b === btn));
    const want = btn.dataset.filter;
    grid.querySelectorAll('.product').forEach((card) => {
      card.hidden = want !== 'All' && card.dataset.category !== want;
    });
  });
});

/* Responsive: between 1024 and 1440 scale the whole canvas so it fits the
   viewport exactly. clientWidth excludes the scrollbar, so this never
   overflows. Below 1024 the mobile layer re-flows the page instead, so the
   factor stays exactly 1 — no stale fraction is left on <html> for a stray
   `zoom` to pick up.

   The 1024 floor is tested with matchMedia, not with clientWidth: a media query
   measures the viewport *including* a classic scrollbar while clientWidth
   excludes it, and mixing the two bases would leave a ~15px band of widths
   where base.css applies the zoom but this code has already published 1. */
(() => {
  const CANVAS = 1440;
  const desktop = window.matchMedia('(min-width: 1024px)');
  const apply = () => {
    const w = document.documentElement.clientWidth;
    document.documentElement.style.setProperty(
      '--page-zoom',
      desktop.matches && w < CANVAS ? String(w / CANVAS) : '1'
    );
  };
  apply();
  window.addEventListener('resize', apply);
})();
