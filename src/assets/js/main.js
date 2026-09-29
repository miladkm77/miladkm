/* drmaneli.ir — behaviour.
   Part 1 works without GSAP (nav, header, booking form).
   Part 2 is the GSAP layer: gentle reveals, counters, timeline, and the FIP
   scroll story. It only runs when the browser has not asked for reduced motion
   and the library actually loaded; otherwise the page stays static and complete. */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const fa = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const en = (s) => String(s).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

  /* ------------------------------------------------------------------ nav */
  const header = $('.site-header');
  const nav = $('#nav');
  const toggle = $('.nav-toggle');
  if (toggle && nav) {
    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'بستن منو' : 'باز کردن منو');
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    document.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', () => setOpen(false));
  }
  if (header) {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        header.classList.toggle('is-scrolled', window.scrollY > 8);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------------------------------------------------------- booking form */
  const form = $('#form');
  if (form) {
    const clinicField = $('#clinic-field', form);
    const ok = $('#form-ok');
    const params = new URLSearchParams(location.search);
    const wanted = params.get('visit');
    if (wanted === 'online' || wanted === 'inperson') {
      const r = $(`input[name="visit"][value="${wanted}"]`, form);
      if (r) r.checked = true;
    }
    const syncVisit = () => {
      const v = form.elements.visit.value;
      if (clinicField) clinicField.hidden = v !== 'inperson';
    };
    form.addEventListener('change', (e) => e.target.name === 'visit' && syncVisit());
    syncVisit();

    const fail = (name, msg) => {
      const wrap = form.elements[name].closest('.field');
      wrap.classList.add('has-err');
      wrap.querySelector('.field-err').textContent = msg;
    };
    form.addEventListener('input', (e) => e.target.closest('.field')?.classList.remove('has-err'));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      $$('.field.has-err', form).forEach((f) => f.classList.remove('has-err'));
      const v = (n) => (form.elements[n]?.value || '').trim();
      const digits = en(v('phone')).replace(/\D/g, '');
      let bad = false;
      if (v('name').length < 2) { fail('name', 'لطفاً نام خود را بنویسید.'); bad = true; }
      if (digits.length < 10 || digits.length > 11) { fail('phone', 'شمارهٔ تماس معتبر نیست (مثلاً ۰۹۱۲۳۴۵۶۷۸۹).'); bad = true; }
      if (bad) { form.querySelector('.has-err input')?.focus(); return; }

      const online = form.elements.visit.value === 'online';
      const lines = [
        `سلام دکتر، درخواست ${online ? 'ویزیت آنلاین' : 'ویزیت حضوری'} دارم.`,
        `نام: ${v('name')}`,
        `شمارهٔ تماس: ${fa(digits)}`,
        `حیوان: ${v('animal')}${v('age') ? ` — سن: ${v('age')}` : ''}`,
      ];
      if (!online && v('clinic')) lines.push(`مطب مدنظر: ${v('clinic')}`);
      if (v('problem')) lines.push(`شرح مشکل: ${v('problem')}`);
      const url = `${form.dataset.wa}?text=${encodeURIComponent(lines.join('\n'))}`;

      if (ok) {
        ok.innerHTML = 'پیام شما آماده است. اگر واتس‌اپ خودکار باز نشد، <a href="' + url + '" target="_blank" rel="noopener">از این‌جا ارسالش کنید</a>.';
        ok.classList.add('is-on');
        ok.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      window.open(url, '_blank', 'noopener');
    });
  }

  /* ---------------------------------------------------------------- GSAP */
  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger || !root.classList.contains('motion')) return;
  window.__gsapOK = true;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const headerH = () => (header ? header.offsetHeight : 70);
  const mm = gsap.matchMedia();

  /* 1 — gentle reveals (≈0.4 s fade + short slide, batched) */
  mm.add({ all: '(min-width: 0px)', mobile: '(max-width: 719px)' }, (ctx) => {
    const mobile = ctx.conditions.mobile;
    if (!$('[data-reveal]')) return;
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 90%',
      once: true,
      interval: 0.08,
      batchMax: 6,
      onEnter: (els) =>
        gsap.to(els, {
          opacity: 1,
          y: 0,
          duration: mobile ? 0.3 : 0.4,
          ease: 'power2.out',
          stagger: 0.07,
          overwrite: true,
          onComplete() {
            els.forEach((el) => {
              el.classList.add('is-in');
              gsap.set(el, { clearProps: 'opacity,transform' });
            });
          },
        }),
    });
    const pending = $$('[data-reveal]:not(.is-in)');
    if (pending.length) gsap.set(pending, { y: mobile ? 16 : 26 });
  });

  /* 2 — count-up numbers */
  $$('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const o = { v: 0 };
    el.textContent = fa(0) + suffix;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () =>
        gsap.to(o, {
          v: target,
          duration: 0.9,
          ease: 'power2.out',
          onUpdate: () => { el.textContent = fa(Math.round(o.v)) + suffix; },
        }),
    });
  });

  /* 3 — very soft hero parallax (desktop pointer devices only, ≤ ~7 %) */
  mm.add('(min-width: 900px) and (hover: hover)', () => {
    const inner = $('[data-parallax] .photo-frame__inner');
    if (!inner) return;
    gsap.fromTo(
      inner,
      { yPercent: -4 },
      { yPercent: 4, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } },
    );
  });

  /* 4 — education timeline draws itself as it scrolls in */
  const tlEl = $('.timeline');
  if (tlEl) {
    gsap.fromTo(
      $('.timeline__fill', tlEl),
      { scaleY: 0 },
      { scaleY: 1, ease: 'none', scrollTrigger: { trigger: tlEl, start: 'top 72%', end: 'bottom 62%', scrub: 0.4 } },
    );
    ScrollTrigger.batch($$('.tl', tlEl), {
      start: 'top 72%',
      once: true,
      onEnter: (els) => els.forEach((el) => el.classList.add('is-on')),
    });
  }

  /* 5 — FIP scroll story (spec §8) ------------------------------------- */
  const track = $('#fip-track');
  if (track) {
    const stage = $('#fip-stage');
    const world = $('#fip-world');
    const crowd = $('#fip-crowd');
    const scene = $('#fip-scene');
    const frames = $$('.cat-frame', $('#fip-cat'));
    const dayEl = $('#fip-day');
    const meter = $('#fip-meter');
    const hud = $('.fip__hud', stage);
    const final = $('#fip-final');
    const cta = $('#fip-cta');
    const num = $('#fip-num');

    const NS = 'http://www.w3.org/2000/svg';
    const XLINK = 'http://www.w3.org/1999/xlink';
    const GRAY = { line: '#8b929c', fill: '#eceef1', bg: '#f1f2f4' };
    const BLUE = { line: '#1f5fd0', fill: '#dbe8fb', bg: '#eef4ff' };
    const mix = gsap.utils.interpolate;
    const CAT = { x: 0, y: -120 }; // world position of the hero cat

    mm.add({ all: '(min-width: 0px)', mobile: '(max-width: 719px)', portrait: '(orientation: portrait)' }, (ctx) => {
      const { mobile, portrait } = ctx.conditions;
      root.classList.add('fip-live');
      scene.setAttribute('viewBox', portrait ? '-360 -640 720 1280' : '-640 -360 1280 720');

      /* crowd of silhouettes — deterministic pseudo-random so it never reshuffles */
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
      const halfW = portrait ? 420 : 760;
      const halfH = portrait ? 760 : 430;
      const dx = mobile ? 104 : 90;
      const dy = mobile ? 80 : 62;
      const RINGS = 9;
      const rings = Array.from({ length: RINGS }, () => {
        const g = document.createElementNS(NS, 'g');
        g.setAttribute('opacity', '0');
        crowd.appendChild(g);
        return g;
      });
      let row = 0;
      for (let y = -halfH; y <= halfH; y += dy, row++) {
        for (let x = -halfW + (row % 2 ? dx / 2 : 0); x <= halfW; x += dx) {
          const cx = x + (rnd() - 0.5) * 26;
          const cy = y + (rnd() - 0.5) * 18;
          if (Math.abs(cx - CAT.x) < 66 && Math.abs(cy - CAT.y) < 54) continue; // keep the hero cat clear
          const s = 0.8 + rnd() * 0.42;
          const flip = rnd() < 0.5 ? -1 : 1;
          const u = document.createElementNS(NS, 'use');
          u.setAttribute('href', '#cat-sil');
          u.setAttributeNS(XLINK, 'xlink:href', '#cat-sil');
          u.setAttribute('x', '-50');
          u.setAttribute('y', '-50');
          u.setAttribute('width', '100');
          u.setAttribute('height', '100');
          u.setAttribute('transform', `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${(flip * s).toFixed(3)} ${s.toFixed(3)})`);
          u.setAttribute('opacity', (0.26 + rnd() * 0.5).toFixed(2));
          const d = Math.hypot((cx - CAT.x) / 1.25, cy - CAT.y);
          rings[Math.min(RINGS - 1, Math.floor(d / (mobile ? 95 : 105)))].appendChild(u);
        }
      }

      /* frames used: 4 on desktop, 3 on mobile (lighter) */
      const Z0 = portrait ? 5.6 : 6.2; // opening zoom (cat fills the frame)
      const useIdx = mobile ? [0, 2, 3] : [0, 1, 2, 3];
      frames.forEach((f) => { f.style.transformOrigin = '226px 350px'; });

      let lastDay = -1;
      const st = { h: 0, e: 0, n: 0 };

      const render = () => {
        // health → colour, background, pose, day counter
        const h = st.h;
        const c = gsap.utils.clamp(0, 1, h);
        stage.style.setProperty('--cat-line', mix(GRAY.line, BLUE.line, c));
        stage.style.setProperty('--cat-fill', mix(GRAY.fill, BLUE.fill, c));
        stage.style.setProperty('--stage-bg', mix(GRAY.bg, BLUE.bg, c));

        const last = useIdx.length - 1;
        const t = h * last;
        const i = Math.min(last - 1, Math.floor(t));
        const frac = h >= 1 ? 1 : t - i;
        const a = gsap.parseEase('power2.inOut')(gsap.utils.clamp(0, 1, (frac - 0.5) / 0.4)); // hold, then dissolve
        frames.forEach((f, k) => {
          let o = 0;
          if (k === useIdx[i]) o = a >= 0.999 ? 0 : 1;
          else if (k === useIdx[i + 1]) o = a;
          f.style.opacity = o.toFixed(3);
          f.style.transform = k === useIdx[i + 1] ? `scale(${(0.985 + 0.015 * a).toFixed(4)})` : 'none';
        });
        const day = Math.round(1 + 83 * h);
        if (day !== lastDay) { dayEl.textContent = fa(day); lastDay = day; }
        meter.style.transform = `scaleX(${h.toFixed(4)})`;

        // camera pull-back (log-interpolated zoom feels linear to the eye)
        const e = st.e;
        const z = Math.pow(Z0, 1 - e);
        const vy = -20 + (CAT.y + 20) * e; // where the hero cat sits on screen
        world.setAttribute('transform', `translate(0 ${(vy - CAT.y * z).toFixed(2)}) scale(${z.toFixed(4)})`);

        // 800+
        num.textContent = fa(Math.round(st.n)) + '+';
      };

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        onUpdate: render,
        scrollTrigger: { trigger: track, start: () => `top ${headerH()}px`, end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true },
      });
      // 0–10 %: hold (day 1) · 10–75 %: recovery · 75–85 %: hold (healthy)
      tl.to(st, { h: 1, duration: 0.65 }, 0.1);
      // 85–100 %: camera pulls back, one cat becomes hundreds
      tl.to(st, { e: 1, duration: 0.15, ease: 'power2.inOut' }, 0.85);
      tl.to(hud, { autoAlpha: 0, duration: 0.05 }, 0.86);
      rings.forEach((g, i) => tl.to(g, { attr: { opacity: 1 }, duration: 0.06 }, 0.84 + i * 0.011));
      tl.to(st, { n: 800, duration: 0.11, ease: 'power2.out' }, 0.87);
      tl.fromTo(final, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.06, ease: 'power2.out' }, 0.89);
      // the animation ends ON the call to action
      tl.fromTo(cta, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.035, ease: 'back.out(2.2)' }, 0.965);
      tl.duration(1);
      render();

      return () => {
        crowd.replaceChildren();
        root.classList.remove('fip-live');
        frames.forEach((f) => { f.style.opacity = ''; f.style.transform = ''; });
        stage.style.removeProperty('--cat-line');
        stage.style.removeProperty('--cat-fill');
        stage.style.removeProperty('--stage-bg');
      };
    });
  }

  /* fonts change line breaks → measure again */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
