// QUIN , interaction layer. No framework, no CDN.

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Company marks drop into brand_assets/logos/ and appear automatically, whatever
// the file type. Until one is there, the text name beside it stands in.
const LOGO_EXTENSIONS = ['.svg', '.png', '.webp', '.jpg'];

function wireLogoFallbacks() {
  document.querySelectorAll('[data-logo]').forEach((slot) => {
    const img = slot.querySelector('img');
    const fallback = slot.querySelector('[hidden]');
    if (!img || !fallback) return;

    const base = img.getAttribute('src').replace(/\.[^./]+$/, '');
    let attempt = 0;

    const tryNextExtension = () => {
      attempt += 1;
      if (attempt < LOGO_EXTENSIONS.length) {
        img.src = base + LOGO_EXTENSIONS[attempt];
      } else {
        img.hidden = true;
        fallback.hidden = false;
      }
    };

    img.addEventListener('error', tryNextExtension);
    if (img.complete && img.naturalWidth === 0) tryNextExtension();
  });
}

// The bar sits white over the hero image, then inverts onto the page surface.
function wireNav() {
  const nav = document.querySelector('[data-nav]');
  const toggle = document.querySelector('[data-menu-toggle]');
  if (!nav) return;

  const hero = document.querySelector('.hero, .subhero');

  // Anchors land flush under the bar rather than under a guessed offset, so
  // arriving at index.html#experience does not leave a strip of the hero
  // showing above the section. The bar is a different height on a phone, so
  // this is measured rather than written into the stylesheet.
  const publishNavHeight = () =>
    document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px');

  // The bar is white-on-image over the hero and inverts onto the page. It has
  // to invert the moment the hero stops covering it: keying off the hero's
  // bottom edge, rather than a fixed scroll distance, keeps the two in step at
  // any landing position, including a hash jump that skips the scroll entirely.
  const onScroll = () => {
    const overHero = hero ? hero.getBoundingClientRect().bottom > nav.offsetHeight + 2 : false;
    nav.classList.toggle('is-solid', !overHero);
  };

  publishNavHeight();
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { publishNavHeight(); onScroll(); });
  // fonts and images settle after first paint and move the hero's edge with them
  window.addEventListener('load', () => { publishNavHeight(); onScroll(); });

  if (toggle) {
    toggle.addEventListener('click', () => {
      const open = document.body.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.querySelectorAll('.menu a').forEach((a) =>
      a.addEventListener('click', () => {
        document.body.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded', 'false');
      })
    );
  }
}

// The back links are plain hrefs carrying the section they return to
// (index.html#experience), so they land on the Experience section itself rather
// than wherever the visitor's history happened to be. history.back() was tried
// here and restored the wrong scroll position once lazy images had resized the
// page, so the href is left to do the routing and settleHashLanding() below
// puts the landing on the mark. Nothing to wire.

// House rule: on the homepage no single asset may appear more than twice. The
// cap is declared on the element that owns it (data-image-cap), counted per
// resolved path so media/x.png and ./media/x.png are the same picture, and
// enforced by taking the surplus copy out of the flow rather than hiding it,
// which would leave a gap where a picture used to be.
function enforceImageCap() {
  const scope = document.querySelector('[data-image-cap]');
  if (!scope) return null;

  const cap = Math.max(1, Number(scope.dataset.imageCap) || 2);

  const key = (src) => {
    try { return new URL(src, location.href).pathname; } catch (err) { return src; }
  };

  const collect = () => {
    const uses = Array.from(scope.querySelectorAll('img[src]')).map((el) => ({
      el,
      src: el.getAttribute('src'),
    }));
    // the watermark paints its asset through a custom property, not an <img>
    scope.querySelectorAll('[style*="--src"]').forEach((el) => {
      const match = (el.getAttribute('style') || '').match(/--src:\s*url\(["']?([^"')]+)/);
      if (match) uses.push({ el, src: match[1] });
    });
    return uses;
  };

  const counts = new Map();
  const removed = [];

  collect().forEach(({ el, src }) => {
    const path = key(src);
    const use = (counts.get(path) || 0) + 1;
    counts.set(path, use);
    if (use <= cap) return;

    const block =
      el.closest('figure, .work-item__media, .hero__media, .inset__media, .shot') || el;
    block.remove();
    counts.set(path, cap);
    removed.push(src + ' (use ' + use + ')');
  });

  if (removed.length) {
    console.warn(
      'Image cap is ' + cap + ' per asset on this page. Removed: ' + removed.join(', ')
    );
  }

  // a dev-time read of what the page actually shows, without changing it
  window.QUIN = window.QUIN || {};
  window.QUIN.imageUsage = () => {
    const tally = new Map();
    collect().forEach(({ src }) => {
      const path = key(src);
      tally.set(path, (tally.get(path) || 0) + 1);
    });
    return Array.from(tally, ([path, uses]) => ({ path, uses, overCap: uses > cap })).sort(
      (a, b) => b.uses - a.uses
    );
  };

  return { cap, counts, removed };
}

// The statement fills in from pale to solid as it passes through the viewport ,
// the reference's own device, driven by scroll position rather than a timer.
function buildScrollText() {
  const el = document.querySelector('[data-scroll-text]');
  if (!el) return null;

  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  words.forEach((word, i) => {
    const span = document.createElement('span');
    span.className = 'w';
    span.textContent = i === words.length - 1 ? word : word + ' ';
    el.appendChild(span);
  });

  const spans = Array.from(el.querySelectorAll('.w'));
  return () => {
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const runway = rect.height + vh * 0.45;
    const p = Math.min(Math.max((vh * 0.85 - rect.top) / runway, 0), 1);
    const lit = Math.round(p * spans.length * 1.2);
    spans.forEach((s, i) => s.classList.toggle('on', i < lit));
  };
}

// The résumé embeds a PDF; until that file exists, say so instead of showing a
// broken viewer frame.
function wireResume() {
  const holder = document.querySelector('[data-resume-doc]');
  if (!holder) return;
  const frame = holder.querySelector('[data-resume-frame]');
  const missing = holder.querySelector('[data-resume-missing]');
  if (!frame || !missing) return;

  const showMissing = () => {
    frame.hidden = true;
    frame.style.display = 'none';
    missing.hidden = false;
  };

  fetch(frame.src.split('#')[0], { method: 'HEAD' })
    .then((r) => {
      const type = r.headers.get('content-type') || '';
      if (!r.ok || !type.includes('pdf')) showMissing();
    })
    .catch(showMissing);
}

// One pointer listener feeds every spotlight. Each control is handed the pointer
// in its own coordinate space, so the gradients do not depend on
// background-attachment: fixed , which a filtered ancestor would break. Hue still
// comes from the pointer's position across the viewport, so the colour sweeps as
// one field even though each control is aimed individually.
function wirePointerGlow() {
  const els = Array.from(document.querySelectorAll('.glow'));
  if (!els.length) return;

  const root = document.documentElement;
  let x = 0;
  let y = 0;
  let queued = false;

  const apply = () => {
    queued = false;
    root.style.setProperty('--xp', (x / window.innerWidth).toFixed(3));
    root.style.setProperty('--yp', (y / window.innerHeight).toFixed(3));

    for (const el of els) {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--gx', (x - r.left).toFixed(1) + 'px');
      el.style.setProperty('--gy', (y - r.top).toFixed(1) + 'px');
    }
  };

  document.addEventListener(
    'pointermove',
    (e) => {
      x = e.clientX;
      y = e.clientY;
      if (!queued) {
        queued = true;
        requestAnimationFrame(apply);
      }
    },
    { passive: true }
  );
}

// Plots carry their meaning in axis labels a thumbnail cannot show, so every
// plate and photograph opens full size. Arrow keys walk the set it belongs to.
function wireLightbox() {
  const openers = Array.from(document.querySelectorAll('[data-zoom]'));
  if (!openers.length) return;

  const box = document.createElement('div');
  box.className = 'lightbox';
  box.hidden = true;
  box.innerHTML =
    '<figure style="display:contents">' +
    '<img alt="" />' +
    '<figcaption></figcaption>' +
    '</figure>' +
    '<button class="lightbox__close" type="button" aria-label="Close">' +
    '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
    '<path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
    '</svg></button>';
  document.body.appendChild(box);

  const img = box.querySelector('img');
  const cap = box.querySelector('figcaption');
  const close = box.querySelector('.lightbox__close');
  let index = -1;
  let lastFocus = null;

  const show = (i) => {
    const el = openers[i];
    if (!el) return;
    index = i;
    const source = el.querySelector('img');
    img.src = source.getAttribute('src');
    img.alt = source.getAttribute('alt') || '';
    img.classList.toggle('on-dark-plate', el.classList.contains('plate__frame--dark'));
    const caption = document.getElementById(el.getAttribute('aria-describedby') || '');
    cap.innerHTML = caption ? caption.innerHTML : '';
  };

  const open = (i) => {
    lastFocus = document.activeElement;
    show(i);
    box.hidden = false;
    document.body.classList.add('lightbox-open');
    requestAnimationFrame(() => box.classList.add('is-open'));
    close.focus();
  };

  const shut = () => {
    box.classList.remove('is-open');
    document.body.classList.remove('lightbox-open');
    const done = () => { box.hidden = true; img.removeAttribute('src'); };
    if (reduceMotion.matches) done();
    else setTimeout(done, 260);
    if (lastFocus) lastFocus.focus();
  };

  const step = (by) => show((index + by + openers.length) % openers.length);

  openers.forEach((el, i) => el.addEventListener('click', () => open(i)));
  close.addEventListener('click', shut);
  box.addEventListener('click', (e) => { if (e.target === box || e.target === img) shut(); });

  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') shut();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });
}

// Arriving on a deep link, the browser performs its hash jump during parsing:
// before the deferred script has measured the bar, and before images have
// reserved their space. The landing is a little off as a result. This puts it
// back on the mark once things have settled, and gives up the moment the
// visitor scrolls for themselves.
// The model library collapses each model into a disclosure panel, so a deep link
// has to open the one it points at before anything tries to scroll to it.
function openTargetPanel() {
  if (!location.hash || location.hash === '#') return null;
  let target;
  try {
    target = document.querySelector(location.hash);
  } catch (err) {
    return null;
  }
  const panel = target && target.closest ? target.closest('details') : null;
  if (panel) panel.open = true;
  return panel;
}

function settleHashLanding() {
  if (!location.hash || location.hash === '#') return;
  openTargetPanel();

  let target;
  try {
    target = document.querySelector(location.hash);
  } catch (err) {
    return;
  }
  if (!target) return;

  let claimed = false;
  const release = () => { claimed = true; };
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((type) =>
    window.addEventListener(type, release, { passive: true, once: true })
  );

  const land = () => {
    if (claimed) return;
    target.scrollIntoView({ block: 'start', behavior: 'auto' });
  };

  land();
  window.addEventListener('load', () => {
    land();
    // one more pass after the last of the above-the-fold images report in
    setTimeout(land, 120);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  wireLogoFallbacks();
  wireNav();
  enforceImageCap();
  settleHashLanding();
  // a link followed inside the page has to open its panel too
  window.addEventListener('hashchange', () => {
    const panel = openTargetPanel();
    if (panel) panel.scrollIntoView({ block: 'start' });
  });
  wirePointerGlow();
  wireLightbox();
  document.body.classList.add('ready');

  wireResume();

  const onScroll = [buildScrollText()].filter(Boolean);
  if (!onScroll.length) return;
  let queued = false;
  const run = () => { onScroll.forEach((fn) => fn()); queued = false; };
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };
  run();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
});
