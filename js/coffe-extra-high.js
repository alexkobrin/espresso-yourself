// Espresso Yourself — Extra High Reserve (coffe-extra-high.html)
//
// Two layers, same as coffe-new.js:
//  1. Basics that work everywhere (nav, reveal, card stacking, lot picker, form).
//  2. A slow, cinematic motion layer (GSAP + ScrollTrigger + SplitText + DrawSVG + Lenis)
//     that only runs when the libraries loaded and the visitor hasn't asked for reduced motion.
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const motion = !reduceMotion && !!(window.gsap && window.ScrollTrigger && window.SplitText);

  /* ================= 1. Basics ================= */

  // Nav: solid once scrolled, hides on scroll down, returns on scroll up, gold progress line
  const nav = $('[data-nav]');
  const progress = $('[data-progress]');
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    const max = root.scrollHeight - window.innerHeight;
    nav.classList.toggle('is-scrolled', y > 20);
    if (Math.abs(y - lastY) > 6) {
      nav.classList.toggle('is-hidden', y > lastY && y > window.innerHeight * 0.6);
      lastY = y;
    }
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));

  // Reveal elements as they enter the viewport
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    $$('[data-reveal]').forEach((el) => io.observe(el));
  } else {
    $$('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
  }

  // Stacked lot cards are position: sticky. A card taller than the screen (phones) sticks
  // by its bottom edge instead, so all of its content scrolls into view before the next covers it.
  const lots = $$('[data-lot]');
  const fitLots = () => lots.forEach((lot) => {
    lot.style.top = `${Math.min(0, window.innerHeight - lot.offsetHeight)}px`;
  });
  fitLots();
  window.addEventListener('resize', fitLots);
  window.addEventListener('load', fitLots);

  // "Reserve" on a lot card pre-selects that lot in the form
  $$('[data-pick]').forEach((a) => a.addEventListener('click', () => {
    const radio = $(`input[name="lot"][value="${a.dataset.pick}"]`);
    if (radio) radio.checked = true;
  }));

  // Demo reservation form (no backend)
  const form = $('[data-reserve-form]');
  const msg = $('[data-form-msg]');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msg.textContent = 'Please enter a valid email address.';
      form.email.focus();
      return;
    }
    const lot = form.querySelector('input[name="lot"]:checked');
    const name = lot ? lot.nextElementSibling.textContent : 'your';
    msg.textContent = name === 'All three'
      ? 'Thank you. We’re holding one box of each lot for you for 48 hours.'
      : `Thank you. We’re holding a ${name} box for you for 48 hours.`;
    form.reset();
  });

  // Footer year
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  const loader = $('[data-loader]');
  if (!motion) {
    loader?.remove();
    return;
  }

  /* ================= 2. Motion layer ================= */

  const { gsap, ScrollTrigger, SplitText } = window;
  const hasDraw = !!window.DrawSVGPlugin;
  gsap.registerPlugin(ScrollTrigger, SplitText, ...(hasDraw ? [window.DrawSVGPlugin] : []));
  root.classList.add('has-motion');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  // Weighted, slower smooth scroll for a luxury feel, driven by GSAP's ticker so ScrollTrigger stays in sync
  let lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.07, wheelMultiplier: 0.9, autoRaf: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  // In-page links glide instead of jumping
  $$('a[href^="#"]:not(.skip-link)').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id.length > 1 && $(id);
      if (!target || !lenis) return;
      e.preventDefault();
      lenis.scrollTo(id === '#top' ? 0 : target, { duration: 2 });
    });
  });

  /* ---------- Preloader: wordmark un-blurs, gold line fills, curtains part ---------- */
  loader.style.animation = 'none'; // JS is in charge now, cancel the CSS safety net
  const loaderMark = SplitText.create('[data-loader-mark]', { type: 'chars' });
  gsap.from(loaderMark.chars, { opacity: 0, filter: 'blur(12px)', yPercent: 30, stagger: 0.07, duration: 1.4, ease: 'power3.out' });
  gsap.from('.loader__kicker', { opacity: 0, y: 10, duration: 1.2, ease: 'power3.out', delay: 0.2 });
  const line = gsap.to('[data-loader-line]', { scaleX: 0.85, duration: 1.8, ease: 'power2.out' });

  const heroImg = $('[data-hero-img]');
  const heroReady = !heroImg || heroImg.complete
    ? Promise.resolve()
    : new Promise((r) => { heroImg.addEventListener('load', r, { once: true }); heroImg.addEventListener('error', r, { once: true }); });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  Promise.race([Promise.all([document.fonts.ready, heroReady, wait(1800)]), wait(5000)]).then(start);

  function start() {
    line.kill();
    buildScrollScenes();

    gsap.timeline()
      .to('[data-loader-line]', { scaleX: 1, duration: 0.5, ease: 'power1.inOut' })
      .to('[data-loader-inner]', { opacity: 0, filter: 'blur(8px)', duration: 0.7, ease: 'power2.in' })
      .to('.loader__curtain--top', { yPercent: -100, duration: 1.5, ease: 'expo.inOut' }, '-=0.2')
      .to('.loader__curtain--bottom', { yPercent: 100, duration: 1.5, ease: 'expo.inOut' }, '<')
      .add(heroIntro(), '<0.25')
      .call(() => { loader.remove(); lenis?.start(); }, null, '<1.3');
  }

  /* ---------- Hero entrance ---------- */
  function heroIntro() {
    const title = SplitText.create('[data-hero-title]', { type: 'chars' });
    const tl = gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.8 } });
    const img = $('[data-hero-img]'); // gone if the photo doesn't exist yet

    tl.fromTo('[data-hero-media]',
      { clipPath: 'inset(50% 0% 50% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 2, ease: 'expo.inOut', clearProps: 'clipPath' }, 0);
    if (img) tl.fromTo(img, { scale: 1.3, opacity: 0.2 }, { scale: 1.06, opacity: 1, duration: 3, ease: 'power3.out' }, 0);
    tl.from('[data-dust]', { opacity: 0, duration: 3, ease: 'power2.out' }, 0.6)
      .from(title.chars, { yPercent: 45, opacity: 0, filter: 'blur(16px)', stagger: 0.07, duration: 2, clearProps: 'filter' }, 0.6)
      .from('[data-intro]', { y: 26, opacity: 0, stagger: 0.12, duration: 1.6 }, 1.1)
      .from(nav, { yPercent: -100, opacity: 0, duration: 1.4, clearProps: 'transform,opacity' }, 1.2);

    $$('[data-hero-aside] [data-count]').forEach((el) => tl.add(countUp(el, 2.4), 1.3));
    return tl;
  }

  function countUp(el, duration = 2) {
    const end = Number(el.dataset.count);
    const o = { v: 0 };
    el.textContent = '0';
    return gsap.to(o, {
      v: end, duration, ease: 'power3.out',
      onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('en-US'); },
    });
  }

  /* ---------- Everything driven by scroll ---------- */
  function buildScrollScenes() {
    // Hero: as it scrolls away the photo pushes in, the dust rises faster (depth), the text lifts and fades
    const heroScroll = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('[data-hero-media]', { scale: 1.12, yPercent: 8, ease: 'none', scrollTrigger: heroScroll });
    gsap.to('[data-dust]', { yPercent: -22, ease: 'none', scrollTrigger: heroScroll });
    gsap.to(['[data-hero-text]', '[data-hero-aside]'], { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { ...heroScroll, end: '70% top' } });

    // Manifesto: words light up one by one (also inside the gold <em>), then the ornament draws
    const manifesto = $('[data-manifesto]');
    splitWords(manifesto);
    gsap.to($$('.word', manifesto), {
      opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: manifesto, start: 'top 80%', end: 'bottom 50%', scrub: true },
    });
    if (hasDraw) {
      const [left, diamond, right] = $$('[data-ornament] path');
      gsap.timeline({ scrollTrigger: { trigger: '[data-ornament]', start: 'top 88%' }, defaults: { duration: 1.6, ease: 'power3.inOut' } })
        .from(left, { drawSVG: '100% 100%' }, 0)
        .from(right, { drawSVG: '0% 0%' }, 0)
        .from(diamond, { drawSVG: 0, duration: 1.2 }, 0.5);
    }

    // Headings rise line by line out of a mask (lot names and the box title are handled with their sections below)
    const splitLines = (el) => SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
    const riseLines = (el, scrollTrigger) => {
      gsap.from(splitLines(el).lines, { yPercent: 115, duration: 1.6, ease: 'expo.out', stagger: 0.12, scrollTrigger });
    };
    $$('[data-split]').forEach((el) => {
      if (!el.closest('[data-lot], [data-box]')) riseLines(el, { trigger: el, start: 'top 88%' });
    });

    // Collection. Lot cards are sticky, and a stuck element reports a misleading position,
    // so every lot trigger is measured on the non-sticky .lots wrapper plus the card's place in the flow.
    const flowTop = (i) => lots.slice(0, i).reduce((sum, l) => sum + l.offsetHeight, 0);
    const atLot = (i, viewport) => ({
      trigger: '[data-lots]',
      start: () => `top+=${flowTop(i)} ${viewport}`,
      invalidateOnRefresh: true,
    });

    lots.forEach((lot, i) => {
      // As a card arrives: the photo opens out of a smaller frame, the name rises, the gold rule draws
      const media = $('[data-lot-media]', lot);
      const img = $('img', media);
      const arrive = { ...atLot(i, '90%'), end: () => `top+=${flowTop(i)} 15%`, scrub: true };
      gsap.fromTo(media, { clipPath: 'inset(14% 12% 14% 12% round 18px)' }, { clipPath: 'inset(0% 0% 0% 0% round 18px)', ease: 'none', scrollTrigger: arrive });
      if (img) gsap.fromTo(img, { scale: 1.35 }, { scale: 1, ease: 'none', scrollTrigger: arrive });
      riseLines($('[data-split]', lot), atLot(i, '55%'));
      gsap.fromTo($('[data-rule]', lot), { scaleX: 0 }, { scaleX: 1, duration: 1.6, ease: 'expo.inOut', scrollTrigger: atLot(i, '45%') });

      // While the next card slides up over this one, this one sinks back and dims
      const next = lots[i + 1];
      if (!next) return;
      gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          ...atLot(i + 1, 'bottom'),
          end: () => `top+=${flowTop(i + 1) - parseFloat(next.style.top || 0)} top`,
          scrub: true,
        },
      })
        .to($('[data-lot-inner]', lot), { scale: 0.9, yPercent: -2 }, 0)
        .to($('[data-lot-dim]', lot), { opacity: 0.72 }, 0);
    });

    // The Box: the unboxing film plays frame by frame with the scroll.
    // Desktop pins the section: the film fills the screen while the lid lifts, then lands in its frame
    // on the right as the text arrives. Phones play the film while the stage scrolls past.
    // Built before the sections below it so their positions include the pin's extra scroll length.
    const box = $('[data-box]');
    const stage = $('[data-box-stage]');
    const filmEl = $('[data-box-film]');
    const useFilm = boxFilm(filmEl);
    const boxTitle = $('[data-split]', box);
    const boxIntro = $$('[data-box-reveal]', box);
    const items = $$('[data-box-item]', box);
    const loadWhenNear = (film) => ScrollTrigger.create({ trigger: box, start: 'top bottom+=150%', once: true, onEnter: film.load });
    const mm = gsap.matchMedia();

    mm.add('(min-width: 861px) and (min-height: 620px)', () => {
      const film = useFilm(false);
      loadWhenNear(film);

      // Where the stage sits inside the section, so the film can start covering the whole screen
      const offset = () => {
        const b = box.getBoundingClientRect();
        const s = stage.getBoundingClientRect();
        return { x: s.left - b.left + stage.clientLeft, y: s.top - b.top + stage.clientTop };
      };
      const play = { p: 0 };
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: box, start: 'top top', end: '+=300%', pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true },
      });
      tl.to(play, { p: 1, duration: 0.8, onUpdate: () => film.seek(play.p) }, 0)
        .to('[data-box-cue]', { opacity: 0, duration: 0.06 }, 0)
        .fromTo('[data-box-shade]', { opacity: 1 }, { opacity: 0, duration: 0.22 }, 0.52)
        .fromTo(filmEl, {
          left: () => -offset().x, top: () => -offset().y,
          width: () => box.clientWidth, height: () => window.innerHeight, borderRadius: 0,
        }, {
          left: 0, top: 0, width: () => stage.clientWidth, height: () => stage.clientHeight, borderRadius: 27,
          duration: 0.32, ease: 'power2.inOut',
        }, 0.5)
        .from(boxIntro[0], { opacity: 0, y: 20, duration: 0.12 }, 0.7)
        .from(splitLines(boxTitle).lines, { yPercent: 115, stagger: 0.04, duration: 0.16, ease: 'power3.out' }, 0.72)
        .from(boxIntro.slice(1), { opacity: 0, y: 20, duration: 0.12 }, 0.8)
        .from(items, { opacity: 0, x: -24, stagger: 0.05, duration: 0.12 }, 0.84)
        .from($$('.rule', box), { scaleX: 0, stagger: 0.05, duration: 0.12 }, 0.84)
        .to({}, { duration: 0.12 }); // a short hold on the open box before the pin releases
    });

    mm.add('(max-width: 860px), (max-height: 619px)', () => {
      const film = useFilm(window.innerWidth <= 860);
      loadWhenNear(film);
      const play = { p: 0 };
      gsap.to(play, {
        p: 1, ease: 'none', onUpdate: () => film.seek(play.p),
        scrollTrigger: { trigger: stage, start: 'top 85%', end: 'bottom 20%', scrub: 0.5 },
      });
      riseLines(boxTitle, { trigger: boxTitle, start: 'top 88%' });
      [...boxIntro, ...items].forEach((el) => gsap.from(el, {
        opacity: 0, y: 24, duration: 1.2, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 90%' },
      }));
    });

    // Reserve: background settles, count rolls up once
    const reserveImg = $('[data-reserve-img]');
    if (reserveImg) gsap.fromTo(reserveImg, { scale: 1.25, yPercent: -5 }, {
      scale: 1, yPercent: 0, ease: 'none',
      scrollTrigger: { trigger: '.reserve', start: 'top bottom', end: 'top top', scrub: true },
    });
    const reserveCount = $('.reserve__count [data-count]');
    ScrollTrigger.create({ trigger: reserveCount, start: 'top 92%', once: true, onEnter: () => countUp(reserveCount, 2.2) });

    // Giant footer wordmark letters rise in
    const mark = SplitText.create('[data-footer-mark]', { type: 'lines,chars', mask: 'lines' });
    gsap.from(mark.chars, {
      yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.05,
      scrollTrigger: { trigger: '.footer', start: 'top 75%' },
    });

    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  // The unboxing film: a canvas that shows the still frame for the current scroll position.
  // Frames load progressively (first, last, every 16th, then filling the gaps); until a frame
  // has loaded, the nearest one that has is shown. useFilm(small) picks the phone or desktop set.
  function boxFilm(el) {
    const canvas = $('canvas', el);
    const ctx = canvas.getContext('2d');
    const sets = {};
    let current = null;

    const makeSet = (pattern, count, [w, h]) => {
      const frames = [];
      const order = [0, count - 1];
      for (let step = 16; step >= 1; step /= 2) {
        for (let i = step; i < count - 1; i += step) if (!order.includes(i)) order.push(i);
      }
      let want = 0;
      let started = false;
      const set = {
        w, h, shown: -1,
        draw() {
          if (current !== set) return;
          for (let d = 0; d < count; d++) {
            const i = frames[want - d] ? want - d : frames[want + d] ? want + d : -1;
            if (i === -1) continue;
            if (i !== set.shown) { set.shown = i; ctx.drawImage(frames[i], 0, 0, w, h); }
            return;
          }
        },
        seek(p) {
          want = Math.round(gsap.utils.clamp(0, 1, p) * (count - 1));
          set.draw();
        },
        load() {
          if (started) return;
          started = true;
          let next = 0;
          const pump = () => {
            if (next >= order.length) return;
            const i = order[next++];
            const img = new Image();
            img.src = pattern.replace('{n}', String(i + 1).padStart(4, '0'));
            img.decode()
              .then(() => { frames[i] = img; set.draw(); }, () => { if (i === 0) el.classList.add('is-broken'); })
              .then(pump);
          };
          for (let k = 0; k < 6; k++) pump();
        },
      };
      return set;
    };

    return (small) => {
      const d = el.dataset;
      const key = small ? 'sm' : 'lg';
      sets[key] ??= makeSet(
        small ? d.framesSm : d.frames,
        Number(small ? d.countSm : d.count),
        (small ? d.sizeSm : d.size).split('x').map(Number),
      );
      current = sets[key];
      canvas.width = current.w; // resizing also clears the canvas
      canvas.height = current.h;
      current.shown = -1;
      current.draw();
      return current;
    };
  }

  // Wrap every word of an element (including inside <em>) in a span so words can light up one by one
  function splitWords(el) {
    [...el.childNodes].forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) return splitWords(node);
      if (node.nodeType !== Node.TEXT_NODE) return;
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(' '); return; }
        const word = document.createElement('span');
        word.className = 'word';
        word.textContent = part;
        frag.append(word);
      });
      node.replaceWith(frag);
    });
  }

  /* ---------- Pointer niceties (mouse / trackpad only) ---------- */
  if (finePointer) {
    $$('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.3);
        yTo((e.clientY - r.top - r.height / 2) * 0.3);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });

    // Hero depth: the gold dust layer drifts with the pointer, the photo moves gently the other way.
    // (The dust wrapper moves, not its <img>, which already runs a CSS drift animation.)
    const hero = $('.hero');
    const follow = (el, x, y) => {
      if (!el) return () => {};
      const toX = gsap.quickTo(el, 'x', { duration: 1.8, ease: 'power3.out' });
      const toY = gsap.quickTo(el, 'y', { duration: 1.8, ease: 'power3.out' });
      return (px, py) => { toX(px * x); toY(py * y); };
    };
    const dust = follow($('[data-dust]'), 40, 30);
    const photo = follow($('[data-hero-img]'), -14, -10);
    hero.addEventListener('pointermove', (e) => {
      const px = e.clientX / window.innerWidth - 0.5;
      const py = e.clientY / window.innerHeight - 0.5;
      dust(px, py);
      photo(px, py);
    });

    const cursor = document.createElement('div');
    cursor.className = 'cursor is-hidden';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.append(cursor);
    const cx = gsap.quickTo(cursor, 'x', { duration: 0.5, ease: 'power3.out' });
    const cy = gsap.quickTo(cursor, 'y', { duration: 0.5, ease: 'power3.out' });
    window.addEventListener('pointermove', (e) => {
      cx(e.clientX); cy(e.clientY);
      cursor.classList.remove('is-hidden');
    });
    root.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('pointerover', (e) => {
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button, input, label'));
    });
  }
})();
