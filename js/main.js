/**
 * Espresso Yourself — landing page interactions.
 * Vanilla JS, no dependencies. Each feature lives in its own small init function.
 */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Utilities
   * ------------------------------------------------------------------ */
  const root = document.documentElement;
  const $ = (selector, ctx = document) => ctx.querySelector(selector);
  const $$ = (selector, ctx = document) => Array.from(ctx.querySelectorAll(selector));

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutExpo = t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const hexToRgb = hex => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ------------------------------------------------------------------ *
   * Frame-synced scroll & resize hub
   * ------------------------------------------------------------------ */
  const scrollSubscribers = new Set();
  const resizeSubscribers = new Set();

  const emitScroll = () => {
    const y = window.scrollY;
    scrollSubscribers.forEach(fn => fn(y));
  };

  let scrollQueued = false;
  window.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      emitScroll();
    });
  }, { passive: true });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => resizeSubscribers.forEach(fn => fn()), 150);
  });

  const onScroll = fn => {
    scrollSubscribers.add(fn);
    fn(window.scrollY);
  };
  const onResize = fn => resizeSubscribers.add(fn);

  /* ------------------------------------------------------------------ *
   * Smooth scroll — eases wheel input towards a target position.
   * Uses native scrolling underneath, so sticky elements, the scrollbar
   * and keyboard navigation keep working.
   * ------------------------------------------------------------------ */
  class SmoothScroll {
    constructor({ smoothness = 0.1 } = {}) {
      this.smoothness = smoothness;
      this.current = window.scrollY;
      this.target = this.current;
      this.animating = false;
      this.lastTime = 0;
      this.tick = this.tick.bind(this);

      window.addEventListener('wheel', event => this.onWheel(event), { passive: false });
      window.addEventListener('scroll', () => {
        if (!this.animating) this.current = this.target = window.scrollY;
      }, { passive: true });
      // Hand control back to the browser for keyboard / scrollbar interaction
      window.addEventListener('keydown', () => this.stop());
      window.addEventListener('pointerdown', () => this.stop());

      root.classList.add('has-smooth-scroll');
    }

    get limit() {
      return root.scrollHeight - window.innerHeight;
    }

    onWheel(event) {
      if (event.ctrlKey || event.defaultPrevented) return; // pinch-zoom
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return; // horizontal gestures stay native
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? window.innerHeight : 1;
      this.scrollTo(this.target + event.deltaY * unit);
    }

    scrollTo(y) {
      this.target = clamp(y, 0, this.limit);
      if (this.animating) return;
      this.animating = true;
      this.current = window.scrollY;
      this.lastTime = performance.now();
      requestAnimationFrame(this.tick);
    }

    stop() {
      this.animating = false;
      this.current = this.target = window.scrollY;
    }

    tick(now) {
      if (!this.animating) return;
      // Frame-rate independent easing (same feel at 60 Hz and 144 Hz)
      const dt = Math.min(Math.max(now - this.lastTime, 1), 64);
      this.lastTime = now;
      const k = 1 - Math.pow(1 - this.smoothness, dt / 16.667);
      this.current = lerp(this.current, this.target, k);

      if (Math.abs(this.target - this.current) < 0.5) {
        this.current = this.target;
        this.animating = false;
      }
      window.scrollTo(0, this.current);
      emitScroll();
      if (this.animating) requestAnimationFrame(this.tick);
    }
  }

  /* ------------------------------------------------------------------ *
   * In-page anchor links
   * ------------------------------------------------------------------ */
  function initAnchors(smooth) {
    document.addEventListener('click', event => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      const hash = link.getAttribute('href');
      if (hash.length < 2) return;
      const target = document.querySelector(hash);
      if (!target) return;

      event.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY;
      if (smooth) smooth.scrollTo(y);
      else window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });

      history.replaceState(null, '', hash);
      // Move focus for keyboard and screen-reader users without jumping
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  }

  /* ------------------------------------------------------------------ *
   * Navigation: progress bar, glass state, hide-on-scroll, active link
   * ------------------------------------------------------------------ */
  function initNav() {
    const nav = $('#nav');
    const progress = $('.scroll-progress');
    const links = $$('[data-nav]');
    const sections = links.map(link => $(link.getAttribute('href'))).filter(Boolean);
    let lastY = window.scrollY;
    let activeId = '';

    onScroll(y => {
      const max = root.scrollHeight - window.innerHeight;
      if (progress) progress.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : '0');

      if (nav) {
        nav.classList.toggle('is-scrolled', y > 24);
        if (Math.abs(y - lastY) > 6) {
          nav.classList.toggle('is-hidden', y > lastY && y > window.innerHeight * 0.5);
          lastY = y;
        }
      }

      const marker = window.innerHeight * 0.4;
      let current = sections[0];
      sections.forEach(section => {
        if (section.getBoundingClientRect().top <= marker) current = section;
      });
      if (current && current.id !== activeId) {
        activeId = current.id;
        links.forEach(link => {
          const isActive = link.getAttribute('href') === `#${activeId}`;
          link.classList.toggle('is-active', isActive);
          if (isActive) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Hero: split headline, floating beans, mouse + scroll parallax
   * ------------------------------------------------------------------ */
  function splitChars(element) {
    element.setAttribute('aria-label', element.textContent.replace(/\s+/g, ' ').trim());
    let index = 0;

    const walk = node => {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
          return;
        }
        if (child.nodeType !== Node.TEXT_NODE) return;
        const text = child.textContent;
        if (!text.trim()) {
          child.remove();
          return;
        }
        const fragment = document.createDocumentFragment();
        for (const char of text.trim()) {
          const span = document.createElement('span');
          span.className = 'char';
          span.setAttribute('aria-hidden', 'true');
          span.textContent = char === ' ' ? ' ' : char;
          span.style.setProperty('--i', index++);
          fragment.append(span);
        }
        child.replaceWith(fragment);
      });
    };
    walk(element);
  }

  function createBeans(host, count) {
    if (!host) return [];
    const palette = ['#6b3d1f', '#5a3219', '#7a4825', '#4a2813', '#8a5530'];

    return Array.from({ length: count }, (_, i) => {
      const depth = 0.15 + Math.random() * 0.85; // 0 = far away, 1 = close to camera
      const bean = document.createElement('div');
      bean.className = 'bean';
      const vars = {
        '--x': `${(((i * 0.618034) % 1) * 94 + 3).toFixed(2)}%`, // golden-ratio spread
        '--y': `${(Math.random() * 90 + 5).toFixed(2)}%`,
        '--s': `${Math.round(16 + depth * 50)}px`,
        '--r': `${Math.round(Math.random() * 360)}deg`,
        '--dur': `${(5 + Math.random() * 5).toFixed(2)}s`,
        '--delay': `${(-Math.random() * 6).toFixed(2)}s`,
        '--blur': `${((1 - depth) * 3).toFixed(2)}px`,
        '--o': (0.35 + depth * 0.65).toFixed(2),
        '--in': `${300 + i * 70}ms`,
        '--bean-c': palette[i % palette.length],
      };
      Object.entries(vars).forEach(([key, value]) => bean.style.setProperty(key, value));
      bean.style.zIndex = String(Math.round(depth * 10));
      bean.innerHTML = '<div class="bean__in"><svg viewBox="0 0 100 100"><use href="#i-bean"/></svg></div>';
      host.append(bean);
      return { el: bean, depth };
    });
  }

  function initHero() {
    const hero = $('.hero');
    if (!hero) return;

    const title = $('[data-split]', hero);
    if (title) splitChars(title);
    $$('[data-hero-fade]', hero).forEach((el, i) => el.style.setProperty('--i', i));

    const beans = createBeans($('.hero__beans', hero), window.innerWidth < 720 ? 8 : 16);
    if (reduceMotion) return;

    const content = $('.hero__content', hero);
    const visual = $('.hero__visual', hero);
    const cup = $('.cup', hero);
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    if (finePointer) {
      hero.addEventListener('pointermove', event => {
        pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
      });
      hero.addEventListener('pointerleave', () => {
        pointer.tx = 0;
        pointer.ty = 0;
      });
    }

    let frame = null;
    let inView = true;

    const render = () => {
      pointer.x = lerp(pointer.x, pointer.tx, 0.07);
      pointer.y = lerp(pointer.y, pointer.ty, 0.07);
      const vh = window.innerHeight;
      const sy = Math.min(window.scrollY, vh * 1.5);

      beans.forEach(({ el, depth }) => {
        const x = pointer.x * depth * 36;
        const y = pointer.y * depth * 36 - sy * depth * 0.6;
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      });
      if (cup) {
        cup.style.transform = `rotateX(${(-pointer.y * 10).toFixed(2)}deg) rotateY(${(pointer.x * 10).toFixed(2)}deg)`;
      }
      if (content) {
        content.style.transform = `translate3d(0, ${(sy * 0.3).toFixed(1)}px, 0)`;
        content.style.opacity = (1 - clamp(sy / (vh * 0.75))).toFixed(3);
      }
      if (visual) {
        visual.style.transform = `translate3d(0, ${(sy * 0.15).toFixed(1)}px, 0) rotate(${(sy * 0.03).toFixed(2)}deg)`;
      }

      frame = inView ? requestAnimationFrame(render) : null;
    };

    // Only animate while the hero is on screen
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView && !frame) frame = requestAnimationFrame(render);
    }).observe(hero);
  }

  /* ------------------------------------------------------------------ *
   * Animated counters in the hero stats
   * ------------------------------------------------------------------ */
  function initCounters() {
    const items = $$('[data-count]');
    if (reduceMotion || !items.length) return null;
    items.forEach(el => { el.textContent = '0'; });

    return () => items.forEach((el, i) => {
      const end = Number(el.dataset.count);
      const duration = 1800;
      const startAt = performance.now() + 900 + i * 150;
      const step = now => {
        const t = clamp((now - startAt) / duration);
        el.textContent = Math.round(end * easeOutExpo(t)).toLocaleString('en-US');
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ------------------------------------------------------------------ *
   * Magnetic buttons
   * ------------------------------------------------------------------ */
  function initMagnetic() {
    if (!finePointer || reduceMotion) return;
    $$('[data-magnetic]').forEach(el => {
      const strength = 0.3;
      el.addEventListener('pointermove', event => {
        const rect = el.getBoundingClientRect();
        const x = event.clientX - (rect.left + rect.width / 2);
        const y = event.clientY - (rect.top + rect.height / 2);
        el.style.transform = `translate3d(${x * strength}px, ${y * strength}px, 0)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ------------------------------------------------------------------ *
   * Reveal on scroll (with automatic sibling stagger)
   * ------------------------------------------------------------------ */
  function initReveal() {
    const items = $$('[data-reveal]');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const counters = new Map();
    items.forEach(el => {
      const index = counters.get(el.parentElement) || 0;
      el.style.setProperty('--d', `${index * 110}ms`);
      counters.set(el.parentElement, index + 1);
    });

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });

    items.forEach(el => observer.observe(el));
  }

  /* ------------------------------------------------------------------ *
   * Origins: pinned horizontal journey across the coffee belt
   * ------------------------------------------------------------------ */
  function initOrigins() {
    const pin = $('[data-origins]');
    if (!pin) return;

    const viewport = $('.origins__viewport', pin);
    const track = $('.origins__track', pin);
    const cards = $$('.origin-card', track);
    const svg = $('.belt svg', pin);
    const routesLayer = svg && $('.belt__routes', svg);
    const dotsLayer = svg && $('.belt__dots', svg);
    const label = svg && $('.belt__label', svg);
    const labelText = label && $('text', label);
    const counter = $('[data-origin-current]', pin);
    const bar = $('.origins__bar', pin);
    if (!viewport || !track || !cards.length) return;

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const LAT_TOP = 40; // map spans 40°N → 40°S
    const ALT_MAX = 2500; // metres, scale for the altitude bars

    const createSvg = (tag, attrs) => {
      const el = document.createElementNS(SVG_NS, tag);
      Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
      return el;
    };

    // Equirectangular projection: x = longitude + 180, y = 40 − latitude
    const points = cards.map(card => ({
      x: Number(card.dataset.lon) + 180,
      y: LAT_TOP - Number(card.dataset.lat),
    }));

    cards.forEach(card => {
      card.style.setProperty('--from', (Number(card.dataset.altMin) / ALT_MAX).toFixed(3));
      card.style.setProperty('--to', (Number(card.dataset.altMax) / ALT_MAX).toFixed(3));
    });

    // Curved flight-path segments between consecutive origins
    const segments = [];
    if (routesLayer) {
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        const lift = Math.min(Math.hypot(b.x - a.x, b.y - a.y) * 0.25, 16);
        const d = `M${a.x} ${a.y} Q${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - lift} ${b.x} ${b.y}`;
        routesLayer.append(createSvg('path', { d, class: 'belt__route-ghost', pathLength: 1 }));
        const segment = createSvg('path', { d, class: 'belt__route', pathLength: 1 });
        routesLayer.append(segment);
        segments.push(segment);
      }
    }

    const dots = dotsLayer
      ? points.map(point => {
        const group = createSvg('g', { class: 'belt__dot', transform: `translate(${point.x} ${point.y})` });
        group.append(
          createSvg('circle', { class: 'belt__pulse', r: 2 }),
          createSvg('circle', { class: 'belt__core', r: 1.2 }),
        );
        dotsLayer.append(group);
        return group;
      })
      : [];

    let start = 0;
    let maxX = 0;
    let active = -1;

    const setActive = index => {
      if (index === active) return;
      active = index;
      cards.forEach((card, i) => card.classList.toggle('is-active', i === index));
      dots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === index);
        dot.classList.toggle('is-past', i < index);
      });
      if (label && labelText) {
        const point = points[index];
        label.style.transform = `translate(${point.x}px, ${point.y}px)`;
        labelText.textContent = cards[index].dataset.name;
      }
      if (counter) counter.textContent = String(index + 1).padStart(2, '0');
    };

    const update = y => {
      const progress = maxX > 0 ? clamp((y - start) / maxX) : 0;
      const steps = cards.length - 1;
      track.style.transform = `translate3d(${(-progress * maxX).toFixed(2)}px, 0, 0)`;
      segments.forEach((segment, i) => {
        segment.style.strokeDashoffset = (1 - clamp(progress * steps - i)).toFixed(4);
      });
      if (bar) bar.style.setProperty('--p', progress.toFixed(4));
      setActive(Math.round(progress * steps));
    };

    // The pin is as tall as the horizontal distance, so 1px of scroll = 1px of travel
    const measure = () => {
      maxX = Math.max(0, track.scrollWidth - viewport.clientWidth);
      pin.style.height = `${window.innerHeight + maxX}px`;
      start = pin.getBoundingClientRect().top + window.scrollY;
      update(window.scrollY);
    };

    measure();
    onScroll(update);
    onResize(measure);
    window.addEventListener('load', measure);
    if (document.fonts) document.fonts.ready.then(measure);
  }

  /* ------------------------------------------------------------------ *
   * Roast Lab: interactive roast slider
   * ------------------------------------------------------------------ */
  function initRoast() {
    const lab = $('[data-roast]');
    const input = lab && $('#roastRange', lab);
    if (!lab || !input) return;

    const ui = {
      stage: $('[data-roast-stage]', lab),
      alias: $('[data-roast-alias]', lab),
      desc: $('[data-roast-desc]', lab),
      temp: $('[data-roast-temp]', lab),
      meters: $$('[data-meter]', lab),
      cracks: $$('[data-crack]', lab),
      stageButtons: $$('[data-roast-to]', lab),
      beanWrap: $('.roast__bean-wrap', lab),
      sparks: $('.roast__sparks', lab),
    };

    const MIN = Number(input.min);
    const MAX = Number(input.max);

    // Stages by bean temperature (°C). `until` is the exclusive upper bound.
    const STAGES = [
      { until: 196, name: 'Underdeveloped', alias: 'Before first crack', desc: 'Still dense and grassy, with sour, bready notes. Keep roasting — it isn’t ready for the cup yet.' },
      { until: 207, name: 'Light', alias: 'Cinnamon · New England', desc: 'Bright, tea-like and fruit-forward. The origin’s florals and citrus shine through.' },
      { until: 219, name: 'Medium', alias: 'City · American', desc: 'Balanced and sweet — caramelised sugars meet the bean’s natural acidity.' },
      { until: 230, name: 'Medium-Dark', alias: 'Full City · Vienna', desc: 'Bittersweet chocolate and spice, a heavier body and softer acidity. Oils begin to surface.' },
      { until: Infinity, name: 'Dark', alias: 'French · Italian', desc: 'Smoky, roasty and bold. Roast character now outweighs the origin.' },
    ];

    const COLOR_STOPS = [
      [185, '#c49a62'], [196, '#a8713f'], [207, '#8a5530'],
      [219, '#5e351a'], [230, '#3a2010'], [245, '#1c0f08'],
    ].map(([t, hex]) => [t, hexToRgb(hex)]);

    // Illustrative flavour profile (0–1) at key temperatures
    const PROFILE_STOPS = [
      [185, { acidity: 0.95, sweetness: 0.2, body: 0.2, bitterness: 0.05 }],
      [201, { acidity: 0.9, sweetness: 0.55, body: 0.35, bitterness: 0.12 }],
      [213, { acidity: 0.65, sweetness: 0.85, body: 0.6, bitterness: 0.3 }],
      [225, { acidity: 0.4, sweetness: 0.65, body: 0.85, bitterness: 0.6 }],
      [245, { acidity: 0.12, sweetness: 0.3, body: 0.8, bitterness: 0.95 }],
    ];

    const mixArray = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
    const mixObject = (a, b, k) => Object.fromEntries(Object.keys(a).map(key => [key, lerp(a[key], b[key], k)]));
    const sample = (stops, t, mix) => {
      if (t <= stops[0][0]) return stops[0][1];
      for (let i = 1; i < stops.length; i++) {
        const [t1, v1] = stops[i];
        if (t <= t1) {
          const [t0, v0] = stops[i - 1];
          return mix(v0, v1, (t - t0) / (t1 - t0));
        }
      }
      return stops[stops.length - 1][1];
    };

    ui.cracks.forEach(el => {
      el.style.setProperty('--k', ((Number(el.dataset.crack) - MIN) / (MAX - MIN)).toFixed(4));
    });

    let currentStage = null;
    let lastTemp = Number(input.value);
    let tweenId = 0;

    const crack = text => {
      if (reduceMotion || !ui.sparks) return;
      const easing = 'cubic-bezier(.16,1,.3,1)';

      const pop = document.createElement('span');
      pop.className = 'roast__pop';
      pop.textContent = text;
      ui.sparks.append(pop);
      pop.animate([
        { opacity: 0, transform: 'translate(-50%, 20px) scale(.7)' },
        { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: 0.2 },
        { opacity: 1, transform: 'translate(-50%, -10px) scale(1)', offset: 0.7 },
        { opacity: 0, transform: 'translate(-50%, -40px) scale(1)' },
      ], { duration: 1600, easing, fill: 'forwards' }).onfinish = () => pop.remove();

      // Chaff (the papery skin) bursts off the bean
      const colors = ['#d8b98a', '#c9a46f', '#b98b55', '#e8d2ad'];
      for (let i = 0; i < 22; i++) {
        const flake = document.createElement('span');
        flake.className = 'roast__chaff';
        flake.style.setProperty('--chaff', colors[i % colors.length]);
        ui.sparks.append(flake);
        const angle = Math.random() * Math.PI * 2;
        const distance = 80 + Math.random() * 150;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance + 40; // a little gravity
        const spin = Math.random() * 720 - 360;
        flake.animate([
          { opacity: 1, transform: 'translate(0, 0) rotate(0deg) scale(1)' },
          { opacity: 0, transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(.6)` },
        ], { duration: 900 + Math.random() * 700, easing }).onfinish = () => flake.remove();
      }

      ui.beanWrap?.animate([
        { transform: 'translate(0, 0)' },
        { transform: 'translate(-4px, 2px) rotate(-2deg)' },
        { transform: 'translate(4px, -2px) rotate(2deg)' },
        { transform: 'translate(-2px, -1px)' },
        { transform: 'translate(0, 0)' },
      ], { duration: 380, easing: 'ease-out' });
    };

    const setStage = stage => {
      if (stage === currentStage) return;
      const isFirst = currentStage === null;
      currentStage = stage;
      ui.stage.textContent = stage.name;
      ui.alias.textContent = stage.alias;
      ui.desc.textContent = stage.desc;
      ui.stageButtons.forEach(btn => {
        const isActive = btn.dataset.stage === stage.name;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
      });
      if (isFirst || reduceMotion) return;
      [ui.alias, ui.stage, ui.desc].forEach((el, i) => {
        el.animate(
          [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
          { duration: 500, delay: i * 60, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' },
        );
      });
    };

    const render = t => {
      const roast = (t - MIN) / (MAX - MIN);
      const [r, g, b] = sample(COLOR_STOPS, t, mixArray);
      lab.style.setProperty('--bean', `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`);
      lab.style.setProperty('--roast', roast.toFixed(3));
      lab.style.setProperty('--heat', (0.15 + roast * 0.6).toFixed(3));
      lab.style.setProperty('--oil', clamp((t - 219) / 22).toFixed(3));
      lab.style.setProperty('--smoke', clamp((t - 226) / 16).toFixed(3));
      ui.temp.textContent = Math.round(t);

      const profile = sample(PROFILE_STOPS, t, mixObject);
      ui.meters.forEach(meter => {
        const value = profile[meter.dataset.meter];
        meter.style.setProperty('--v', value.toFixed(3));
        const output = $('[data-meter-value]', meter);
        if (output) output.textContent = `${Math.round(value * 10)}/10`;
      });

      ui.cracks.forEach(el => {
        const crackTemp = Number(el.dataset.crack);
        el.classList.toggle('is-reached', t >= crackTemp);
        if (lastTemp < crackTemp && t >= crackTemp) crack(el.dataset.label);
      });

      const stage = STAGES.find(s => t < s.until) || STAGES[STAGES.length - 1];
      setStage(stage);
      input.setAttribute('aria-valuetext', `${Math.round(t)} °C, ${stage.name} roast`);
      lastTemp = t;
    };

    const tweenTo = target => {
      cancelAnimationFrame(tweenId);
      const from = lastTemp;
      if (reduceMotion || from === target) {
        input.value = target;
        render(target);
        return;
      }
      const duration = 500 + Math.abs(target - from) * 25;
      const startTime = performance.now();
      const step = now => {
        const k = clamp((now - startTime) / duration);
        const t = lerp(from, target, easeInOutCubic(k));
        input.value = t;
        render(t);
        if (k < 1) tweenId = requestAnimationFrame(step);
      };
      tweenId = requestAnimationFrame(step);
    };

    input.addEventListener('input', () => {
      cancelAnimationFrame(tweenId);
      render(Number(input.value));
    });
    ui.stageButtons.forEach(btn => {
      btn.addEventListener('click', () => tweenTo(Number(btn.dataset.roastTo)));
    });

    render(lastTemp);
  }

  /* ------------------------------------------------------------------ *
   * Newsletter form (front-end only — no backend connected yet)
   * ------------------------------------------------------------------ */
  function initForm() {
    const form = $('[data-subscribe]');
    if (!form) return;
    const input = $('input[type="email"]', form);
    const message = $('[data-form-msg]', form);

    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!input.checkValidity()) {
        form.classList.remove('is-success');
        form.classList.add('is-error');
        message.textContent = 'Please enter a valid email address.';
        input.focus();
        return;
      }
      form.classList.remove('is-error');
      form.classList.add('is-success');
      message.textContent = 'You’re on the list — your first brew guide is on its way.';
      form.reset();
    });
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */
  const smooth = !reduceMotion && finePointer ? new SmoothScroll() : null;

  initAnchors(smooth);
  initNav();
  initHero();
  const startCounters = initCounters();
  initMagnetic();
  initReveal();
  initOrigins();
  initRoast();
  initForm();
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  // Start the intro once fonts are ready (with a safety timeout)
  let started = false;
  const startIntro = () => {
    if (started) return;
    started = true;
    requestAnimationFrame(() => {
      root.classList.add('is-loaded');
      if (startCounters) startCounters();
    });
  };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(startIntro);
  setTimeout(startIntro, 1200);
})();
