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

  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const phone = window.matchMedia('(max-width: 719px)').matches;
  const clamp = gsap.utils.clamp;
  const safe = (name, fn) => { try { fn(); } catch (err) { console.warn(`[${name}]`, err); } };
  const headerH = () => (header ? header.offsetHeight : 72);

  /* smooth scroll — pointer devices only; touch keeps native momentum */
  let lenis = null;
  safe('lenis', () => {
    if (!fine || !window.Lenis) return;
    lenis = new window.Lenis({ lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"], a[href*=".html#"]');
      if (!a) return;
      const url = new URL(a.href, location.href);
      if (url.pathname !== location.pathname || url.hash.length < 2) return;
      const t = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -90, duration: 1.4 }); }
    });
  });

  /* words → masked spans (Persian joins letters, so never split below the word) */
  const splitWords = (el, mode) => {
    const out = [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            if (mode === 'scrub') {
              const sp = document.createElement('span'); sp.className = 'sw'; sp.textContent = p; frag.appendChild(sp); out.push(sp);
            } else {
              const w = document.createElement('span'); w.className = 'w';
              const i = document.createElement('span'); i.className = 'wi'; i.textContent = p;
              w.appendChild(i); frag.appendChild(w); out.push(i);
            }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('ltr')) walk(n);
      });
    };
    walk(el);
    return out;
  };
  const inView = (el, k = 0.95) => { const r = el.getBoundingClientRect(); return r.top < window.innerHeight * k && r.bottom > 0; };

  /* ---------------------------------------------------------- intro */
  safe('intro', () => {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    let at = 0.05;
    $$('[data-split]').forEach((el) => {
      const words = splitWords(el);
      if (inView(el)) {
        tl.from(words, { yPercent: 115, duration: 1.25, stagger: 0.09 }, at);
        at += 0.2;
      } else {
        gsap.from(words, { yPercent: 115, duration: 1.1, stagger: 0.07, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      }
    });
    const hs = $$('[data-h]');
    if (hs.length) tl.fromTo(hs, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.12, clearProps: 'transform' }, at + 0.15);
    const arch = $('#hero-arch');
    if (arch) {
      tl.fromTo(arch, { clipPath: 'inset(22% 8% 0% 8% round 999px 999px 28px 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 28px 28px)', duration: 1.6, ease: 'expo.inOut', clearProps: 'clipPath' }, 0.1);
      const cat = $('.photo-frame__ph', arch) || $('img', arch);
      if (cat) gsap.fromTo(cat, { yPercent: 8 }, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    }
  });

  /* ------------------------------------------------ scroll-in reveals */
  safe('reveals', () => {
    const els = $$('[data-reveal]');
    if (!els.length) return;
    ScrollTrigger.batch(els, {
      start: 'top 90%', once: true, interval: 0.08, batchMax: 6,
      onEnter: (batch) => gsap.to(batch, {
        opacity: 1, y: 0, duration: phone ? 0.7 : 1, ease: 'expo.out', stagger: 0.1, overwrite: true,
        onComplete() { batch.forEach((el) => { el.classList.add('is-in'); gsap.set(el, { clearProps: 'opacity,transform' }); }); },
      }),
    });
    gsap.set(els.filter((e) => !e.classList.contains('is-in')), { y: phone ? 20 : 32 });
  });

  safe('scrub-text', () => {
    $$('[data-scrub]').forEach((el) => {
      const words = splitWords(el, 'scrub');
      gsap.fromTo(words, { opacity: 0.2 }, { opacity: 1, ease: 'none', stagger: 0.12, scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 50%', scrub: 0.5 } });
    });
  });

  /* numbers: rule draws, digits count up */
  safe('numbers', () => {
    $$('.num__rule').forEach((r) => gsap.fromTo(r, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: r, start: 'top 92%', once: true } }));
    $$('[data-count]').forEach((el) => {
      const target = Number(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const o = { v: 0 };
      el.textContent = fa(0) + suffix;
      ScrollTrigger.create({
        trigger: el, start: 'top 92%', once: true,
        onEnter: () => gsap.to(o, { v: target, duration: 1.8, ease: 'expo.out', onUpdate: () => { el.textContent = fa(Math.round(o.v)) + suffix; } }),
      });
    });
  });

  /* about: timeline rows light up as they pass */
  safe('timeline', () => {
    const rows = $$('.tl');
    if (rows.length) ScrollTrigger.batch(rows, { start: 'top 70%', once: true, onEnter: (b) => b.forEach((r) => r.classList.add('is-on')) });
  });

  /* ============================================================ FIP story */
  safe('fip', () => {
    const track = $('#fip-track');
    if (!track) return;
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
    const GRAY = { line: '#8a93a8', fill: '#121828' };
    const BLUE = { line: '#79a2ff', fill: '#1a2a5e' };
    const mixC = gsap.utils.interpolate;
    const CAT = { x: 0, y: -120 };

    const mm = gsap.matchMedia();
    mm.add({ all: '(min-width: 0px)', mobile: '(max-width: 719px)', portrait: '(orientation: portrait)' }, (ctx) => {
      const { mobile, portrait } = ctx.conditions;
      root.classList.add('fip-live');
      scene.setAttribute('viewBox', portrait ? '-360 -640 720 1280' : '-640 -360 1280 720');

      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
      const halfW = portrait ? 420 : 760;
      const halfH = portrait ? 760 : 430;
      const dx = mobile ? 104 : 88;
      const dy = mobile ? 80 : 60;
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
          if (Math.abs(cx - CAT.x) < 66 && Math.abs(cy - CAT.y) < 54) continue;
          const sc = 0.8 + rnd() * 0.42;
          const flip = rnd() < 0.5 ? -1 : 1;
          const u = document.createElementNS(NS, 'use');
          u.setAttribute('href', '#cat-sil');
          u.setAttributeNS(XLINK, 'xlink:href', '#cat-sil');
          u.setAttribute('x', '-50'); u.setAttribute('y', '-50'); u.setAttribute('width', '100'); u.setAttribute('height', '100');
          u.setAttribute('transform', `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${(flip * sc).toFixed(3)} ${sc.toFixed(3)})`);
          u.setAttribute('opacity', (0.18 + rnd() * 0.5).toFixed(2));
          const d = Math.hypot((cx - CAT.x) / 1.25, cy - CAT.y);
          rings[Math.min(RINGS - 1, Math.floor(d / (mobile ? 95 : 105)))].appendChild(u);
        }
      }

      const Z0 = portrait ? 5.6 : 6.2;
      const useIdx = mobile ? [0, 2, 3] : [0, 1, 2, 3];
      frames.forEach((f) => { f.style.transformOrigin = '226px 350px'; });
      let lastDay = -1;
      const st = { h: 0, e: 0, n: 0 };
      const ease = gsap.parseEase('power2.inOut');

      const render = () => {
        const h = st.h;
        const c = clamp(0, 1, h);
        stage.style.setProperty('--cat-line', mixC(GRAY.line, BLUE.line, c));
        stage.style.setProperty('--cat-fill', mixC(GRAY.fill, BLUE.fill, c));
        stage.style.setProperty('--glow', (0.04 + 0.5 * c * (1 - 0.6 * st.e)).toFixed(3));

        const last = useIdx.length - 1;
        const t = h * last;
        const i = Math.min(last - 1, Math.floor(t));
        const frac = h >= 1 ? 1 : t - i;
        const a = ease(clamp(0, 1, (frac - 0.5) / 0.4));
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

        const e = st.e;
        const z = Math.pow(Z0, 1 - e);
        const vy = -20 + (CAT.y + 20) * e;
        world.setAttribute('transform', `translate(0 ${(vy - CAT.y * z).toFixed(2)}) scale(${z.toFixed(4)})`);
        num.textContent = fa(Math.round(st.n)) + '+';
      };

      /* fully reversible: scrubbed both ways, never touches the scroll itself */
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        onUpdate: render,
        scrollTrigger: { trigger: track, start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true },
      });
      tl.to(st, { h: 1, duration: 0.65 }, 0.1);
      tl.to(st, { e: 1, duration: 0.15, ease: 'power2.inOut' }, 0.85);
      tl.to(hud, { autoAlpha: 0, duration: 0.05 }, 0.85);
      rings.forEach((g, i) => tl.to(g, { attr: { opacity: 1 }, duration: 0.06 }, 0.84 + i * 0.011));
      tl.to(st, { n: 800, duration: 0.11, ease: 'power2.out' }, 0.87);
      tl.fromTo(final, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.06, ease: 'power2.out' }, 0.89);
      tl.fromTo(cta, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.035, ease: 'back.out(2)' }, 0.965);
      tl.duration(1);
      render();

      return () => {
        crowd.replaceChildren();
        root.classList.remove('fip-live');
        frames.forEach((f) => { f.style.opacity = ''; f.style.transform = ''; });
        ['--cat-line', '--cat-fill', '--glow'].forEach((p) => stage.style.removeProperty(p));
      };
    });
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
