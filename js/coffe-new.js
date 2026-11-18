// Espresso Yourself — coffe-new.html interactions
//
// Two layers:
//  1. Basics that work everywhere (nav state, reveal, roast picker, form).
//  2. A motion layer (GSAP + ScrollTrigger + SplitText + Lenis) that only runs
//     when the libraries loaded and the visitor hasn't asked for reduced motion.
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const motion = !reduceMotion && !!(window.gsap && window.ScrollTrigger && window.SplitText);

  /* ================= 1. Basics ================= */

  // Nav: solid background once scrolled, hide on scroll down, show on scroll up, progress bar
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
  const reveal = (els) => {
    if (!('IntersectionObserver' in window)) return els.forEach((el) => el.classList.add('is-visible'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    els.forEach((el) => io.observe(el));
  };
  reveal($$('[data-reveal]'));

  // Roast guide: pick a roast, move the spotlight + meter to its pile of beans
  const roastSection = $('#roast');
  const roastStage = $('[data-roast-stage]');
  const roastList = $('.roasts');
  const roasts = $$('.roast', roastList);
  const selectRoast = (li) => {
    roasts.forEach((r) => {
      const on = r === li;
      r.classList.toggle('is-active', on);
      r.querySelector('button').setAttribute('aria-pressed', String(on));
    });
    roastList.classList.add('has-active');
    roastSection.style.setProperty('--x', `${li.dataset.x}%`);
    $('[data-roast-name]').textContent = li.querySelector('button').textContent;
    $('[data-roast-temp]').textContent = li.querySelector('.roast__temp').textContent.split('·')[0].trim();
    roastStage.classList.add('is-live');
  };
  roasts.forEach((li) => {
    li.querySelector('button').addEventListener('click', () => selectRoast(li));
    if (finePointer) li.addEventListener('mouseenter', () => selectRoast(li));
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setTimeout(() => selectRoast($('.roast.is-active') || roasts[1]), 500);
      io.disconnect();
    }, { threshold: 0.6 });
    io.observe(roastStage);
  }

  // Footer year
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  // Demo subscribe form (no backend)
  const form = $('[data-subscribe]');
  const msg = $('[data-form-msg]');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msg.textContent = 'Please enter a valid email address.';
      form.email.focus();
      return;
    }
    msg.textContent = 'Welcome to the club! Check your inbox for your first brew guide.';
    form.reset();
  });

  const loader = $('[data-loader]');
  if (!motion) {
    loader?.remove();
    return;
  }

  /* ================= 2. Motion layer ================= */

  const { gsap, ScrollTrigger, SplitText } = window;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  root.classList.add('has-motion');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  // Smooth scrolling, driven by GSAP's ticker so ScrollTrigger stays in sync
  let lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, autoRaf: false });
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
      lenis.scrollTo(id === '#top' ? 0 : target, { duration: 1.6 });
    });
  });

  /* ---------- Preloader counter ---------- */
  loader.style.animation = 'none'; // JS is in charge now, cancel the CSS safety net
  const countEl = $('[data-loader-count]');
  const counter = { v: 0 };
  const paintCount = () => { countEl.textContent = Math.round(counter.v); };
  gsap.to(counter, { v: 86, duration: 1.4, ease: 'power2.out', onUpdate: paintCount });

  const heroImg = $('[data-hero-img] img');
  const heroReady = !heroImg || heroImg.complete
    ? Promise.resolve()
    : new Promise((r) => { heroImg.addEventListener('load', r, { once: true }); heroImg.addEventListener('error', r, { once: true }); });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  Promise.race([Promise.all([document.fonts.ready, heroReady, wait(1400)]), wait(5000)]).then(start);

  function start() {
    buildScrollScenes();

    const intro = gsap.timeline();
    intro
      .to(counter, { v: 100, duration: 0.45, ease: 'power1.out', onUpdate: paintCount })
      .to('.loader__inner', { yPercent: -60, opacity: 0, duration: 0.6, ease: 'power3.in' })
      .to(loader, { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '-=0.25')
      .call(() => { loader.remove(); lenis?.start(); })
      .add(heroIntro(), '-=0.65');
  }

  /* ---------- Hero entrance ---------- */
  function heroIntro() {
    const title = SplitText.create('[data-hero-title]', { type: 'lines', mask: 'lines', linesClass: 'split-line' });
    const tl = gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.4 } });

    tl.from(title.lines, { yPercent: 115, stagger: 0.12 }, 0)
      .fromTo('[data-hero-img]',
        { clipPath: 'inset(100% 0% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut', clearProps: 'clipPath' }, 0)
      .from('[data-hero-img] img', { scale: 1.45, duration: 2.2 }, 0)
      .from('[data-intro]', { y: 30, opacity: 0, stagger: 0.09, duration: 1.2 }, 0.35)
      .from(nav, { yPercent: -100, opacity: 0, duration: 1.2, clearProps: 'transform,opacity' }, 0.5)
      .from('[data-badge]', { scale: 0, rotate: -160, duration: 1.6 }, 0.75)
      .from('[data-hero-card]', { x: -40, opacity: 0, duration: 1.2 }, 0.95);

    $$('[data-count]').forEach((el) => {
      const end = Number(el.dataset.count);
      const o = { v: 0 };
      el.textContent = '0';
      tl.to(o, {
        v: end, duration: 2, ease: 'power3.out',
        onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('en-US'); },
      }, 0.6);
    });
    return tl;
  }

  /* ---------- Everything driven by scroll ---------- */
  function buildScrollScenes() {
    // Hero parallax as it scrolls away
    const heroScroll = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('[data-hero-img] img', { yPercent: 9, ease: 'none', scrollTrigger: heroScroll });
    gsap.to('[data-hero-text]', { yPercent: -10, opacity: 0.25, ease: 'none', scrollTrigger: heroScroll });
    gsap.to('[data-hero-card]', { y: -70, ease: 'none', scrollTrigger: heroScroll });
    gsap.to('.badge__ring', { rotate: 220, ease: 'none', scrollTrigger: { ...heroScroll, scrub: 1 } });

    // Ticker reacts to scroll speed and direction
    const track = $('[data-ticker]');
    const loop = gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
    loop.totalTime(loop.duration() * 100); // start far from 0 so it can also run backwards
    const skewTo = gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3.out' });
    let settle;
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate(self) {
        const v = self.getVelocity();
        loop.timeScale(self.direction * (1 + Math.min(Math.abs(v) / 280, 7)));
        skewTo(gsap.utils.clamp(-9, 9, -v / 220));
        settle?.kill();
        settle = gsap.to(loop, { timeScale: self.direction, duration: 1.2, ease: 'power3.out', delay: 0.08 });
        gsap.delayedCall(0.15, () => skewTo(0));
      },
    });

    // Manifesto: words light up one by one, photo pills open inside the sentence
    const manifesto = $('[data-manifesto]');
    [...manifesto.childNodes].forEach((node) => {
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
    const manifestoScroll = { trigger: manifesto, start: 'top 82%', end: 'bottom 48%', scrub: true };
    gsap.to($$('.word', manifesto), { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: manifestoScroll });
    gsap.from($$('.pill', manifesto), { width: 0, marginInline: 0, stagger: 0.35, ease: 'none', scrollTrigger: manifestoScroll });

    // Section headings rise line by line
    $$('[data-split]').forEach((el) => {
      const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
      gsap.from(split.lines, {
        yPercent: 115, duration: 1.3, ease: 'expo.out', stagger: 0.1,
        scrollTrigger: { trigger: el, start: 'top 88%' },
      });
    });

    // Process photos open up from a smaller frame as they scroll in
    $$('[data-clip]').forEach((fig) => {
      const st = { trigger: fig, start: 'top 95%', end: 'top 40%', scrub: true };
      gsap.fromTo(fig,
        { clipPath: 'inset(16% 10% 16% 10% round 18px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 18px)', ease: 'none', scrollTrigger: st });
      const img = $('img', fig);
      if (img) gsap.fromTo(img, { scale: 1.35 }, { scale: 1, ease: 'none', scrollTrigger: st });
    });

    // CTA background slowly settles as the section scrolls in
    gsap.fromTo('[data-join-img]',
      { scale: 1.3, yPercent: -6 },
      { scale: 1, yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.join', start: 'top bottom', end: 'bottom bottom', scrub: true } });

    // Giant footer wordmark letters rise in
    const mark = SplitText.create('[data-footer-mark]', { type: 'lines,chars', mask: 'lines' });
    gsap.from(mark.chars, {
      yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.035,
      scrollTrigger: { trigger: '.footer', start: 'top 75%' },
    });

    // Desktop only: pinned horizontal origins + offset middle process step
    const mm = gsap.matchMedia();
    mm.add('(min-width: 861px)', () => {
      gsap.fromTo('.process__step[data-speed="1"]', { y: 70 }, {
        y: -70, ease: 'none',
        scrollTrigger: { trigger: '.process', start: 'top bottom', end: 'bottom top', scrub: true },
      });

      const section = $('[data-hscroll]');
      const trackEl = $('[data-track]');
      const bar = $('[data-origin-bar]');
      const count = $('[data-origin-count]');
      section.classList.add('is-hscroll');
      $$('img', section).forEach((img) => { img.loading = 'eager'; });

      const distance = () => trackEl.scrollWidth - window.innerWidth;
      const travel = gsap.to(trackEl, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate(self) {
            bar.style.transform = `scaleX(${self.progress})`;
            count.textContent = String(Math.min(7, Math.floor(self.progress * 7) + 1)).padStart(2, '0');
          },
        },
      });

      // Photos drift inside their cards while travelling sideways
      $$('.origin:not(.origin--cta) img', section).forEach((img) => {
        gsap.fromTo(img, { xPercent: -6 }, {
          xPercent: 6, ease: 'none',
          scrollTrigger: { trigger: img.closest('.origin'), containerAnimation: travel, start: 'left right', end: 'right left', scrub: true },
        });
      });

      return () => section.classList.remove('is-hscroll');
    });

    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ---------- Pointer niceties (mouse / trackpad only) ---------- */
  if (finePointer) {
    $$('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.35);
        yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });

    const cursor = document.createElement('div');
    cursor.className = 'cursor is-hidden';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.append(cursor);
    const cx = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3.out' });
    const cy = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3.out' });
    window.addEventListener('pointermove', (e) => {
      cx(e.clientX); cy(e.clientY);
      cursor.classList.remove('is-hidden');
    });
    root.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('pointerover', (e) => {
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button, input'));
    });
  }
})();
