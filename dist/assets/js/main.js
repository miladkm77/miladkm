/* drmaneli.ir v2 — behaviour.
   Part 1 works without GSAP (header state, booking form).
   Part 2 is the GSAP layer. It only runs when the browser has not asked for
   reduced motion and the libraries actually loaded; otherwise the page stays
   static and complete. Every feature is wrapped so one failure can't take the
   rest of the page (or the page wipe) down with it. */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const fa = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const en = (s) => String(s).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

  /* ------------------------------------------------------------ header */
  const header = $('.site-header');
  if (header) {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        header.classList.toggle('is-scrolled', window.scrollY > 24);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------------ booking form */
  const form = $('#form');
  if (form && form.dataset.wa) {
    const clinicField = $('#clinic-field', form);
    const ok = $('#form-ok');
    const wanted = new URLSearchParams(location.search).get('visit');
    if (wanted === 'online' || wanted === 'inperson') {
      const r = $(`input[name="visit"][value="${wanted}"]`, form);
      if (r) r.checked = true;
    }
    const syncVisit = () => { if (clinicField) clinicField.hidden = form.elements.visit.value !== 'inperson'; };
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

  /* ================================================================= GSAP */
  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger || !root.classList.contains('motion')) return;
  window.__gsapOK = true;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const phone = window.matchMedia('(max-width: 719px)').matches;
  const wipe = $('.wipe');
  const safe = (name, fn) => { try { fn(); } catch (err) { console.warn(`[${name}]`, err); } };
  const clamp = gsap.utils.clamp;

  /* ---------------------------------------------------- smooth scroll */
  let lenis = null;
  safe('lenis', () => {
    if (!fine || !window.Lenis) return;
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  });
  const scrollToEl = (el) => {
    if (lenis) lenis.scrollTo(el, { offset: -96, duration: 1.5, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* -------------------------------------------------- page transitions */
  safe('page-transitions', () => {
    if (!wipe) return;
    window.addEventListener('pageshow', (e) => { if (e.persisted) gsap.set(wipe, { display: 'none' }); });
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) {
        if (url.hash && url.hash.length > 1) {
          const t = document.getElementById(decodeURIComponent(url.hash.slice(1)));
          if (t) { e.preventDefault(); scrollToEl(t); history.pushState(null, '', url.hash); }
        }
        return;
      }
      e.preventDefault();
      gsap.set(wipe, { display: 'block', yPercent: 100 });
      gsap.to(wipe, { yPercent: 0, duration: 0.75, ease: 'expo.inOut', onComplete: () => { location.href = a.href; } });
    });
  });

  /* ------------------------------------------------------------ helpers */
  // Split text nodes into words (element children keep their classes). Persian
  // joins letters, so we never split below the word.
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
              const s = document.createElement('span'); s.className = 'sw'; s.textContent = p; frag.appendChild(s); out.push(s);
            } else {
              const w = document.createElement('span'); w.className = 'w';
              const i = document.createElement('span'); i.className = 'wi'; i.textContent = p;
              w.appendChild(i); frag.appendChild(w); out.push(i);
            }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    return out;
  };
  const inView = (el, k = 0.92) => { const r = el.getBoundingClientRect(); return r.top < window.innerHeight * k && r.bottom > 0; };

  /* ------------------------------------------------- living colour field */
  const field = { intro: 0, h: 1 };
  const applyField = () => {
    const base = 1 - 0.88 * field.intro;
    const mix = base + (1 - base) * field.h;
    root.style.setProperty('--mix', mix.toFixed(3));
  };
  safe('ambient', () => {
    $$('.orb').forEach((orb, i) => {
      gsap.to(orb, { x: gsap.utils.random(-60, 60), y: gsap.utils.random(-50, 50), duration: gsap.utils.random(9, 16), ease: 'sine.inOut', repeat: -1, yoyo: true, delay: -i * 3 });
      gsap.to(orb, { yPercent: [30, -22, 26, -30][i] || 20, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1.2 } });
    });
    const intro = $('.fip__intro');
    if (intro) {
      ScrollTrigger.create({ trigger: intro, start: 'top 75%', end: 'bottom 20%', onUpdate: (s) => { field.intro = s.progress; applyField(); }, onRefresh: (s) => { field.intro = s.progress; applyField(); } });
    }
  });

  /* ---------------------------------------------------------- nav pill */
  safe('nav-indicator', () => {
    const nav = $('.nav'); const ind = $('.nav__ind');
    if (!nav || !ind || getComputedStyle(nav).display === 'none') return;
    const links = $$('a', nav);
    const current = links.find((l) => l.getAttribute('aria-current') === 'page');
    const place = (l, animate = true) => {
      if (!l) { gsap.to(ind, { opacity: 0, duration: 0.25 }); return; }
      gsap.to(ind, { right: 'auto', left: l.offsetLeft, width: l.offsetWidth, opacity: 1, duration: animate ? 0.55 : 0, ease: 'expo.out', overwrite: true });
    };
    place(current, false);
    links.forEach((l) => l.addEventListener('pointerenter', () => place(l)));
    nav.addEventListener('pointerleave', () => place(current));
    window.addEventListener('resize', () => place(current, false));
  });

  /* ------------------------------------------------- intro (hero / heads) */
  const introTl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  safe('intro', () => {
    if (wipe) introTl.to(wipe, { yPercent: -100, duration: 1, ease: 'expo.inOut', onComplete: () => gsap.set(wipe, { display: 'none' }) }, 0);
    const t0 = wipe ? 0.5 : 0;
    if (header) introTl.from(header, { yPercent: -160, opacity: 0, duration: 1.1 }, t0);
    let at = t0 + 0.1;
    $$('[data-split]').forEach((el) => {
      const words = splitWords(el, 'mask');
      if (inView(el)) {
        introTl.from(words, { yPercent: 118, rotate: 4, duration: 1.2, stagger: 0.08 }, at);
        at += 0.35;
      } else {
        gsap.from(words, { yPercent: 118, rotate: 3, duration: 1, stagger: 0.06, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      }
    });
    const hs = $$('[data-h]');
    if (hs.length) introTl.fromTo(hs, { opacity: 0, y: 36, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1, stagger: 0.1, clearProps: 'filter' }, at);
    const card = $('.hero__card');
    if (card) {
      introTl.fromTo(card, { opacity: 0, y: 90, scale: 0.9, rotateX: 12, transformPerspective: 1200 }, { opacity: 1, y: 0, scale: 1, rotateX: 0, duration: 1.5 }, t0 + 0.2);
      introTl.fromTo($$('.chip-card'), { opacity: 0, scale: 0.5, y: 40 }, { opacity: 1, scale: 1, y: 0, duration: 1.1, stagger: 0.16, ease: 'back.out(1.8)' }, t0 + 0.9);
    }
  });

  /* ------------------------------------------------ scroll-in reveals */
  safe('reveals', () => {
    const els = $$('[data-reveal]');
    if (!els.length) return;
    ScrollTrigger.batch(els, {
      start: 'top 90%', once: true, interval: 0.08, batchMax: 6,
      onEnter: (batch) => gsap.to(batch, {
        opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: phone ? 0.7 : 1, ease: 'expo.out', stagger: 0.1, overwrite: true,
        onComplete() { batch.forEach((el) => { el.classList.add('is-in'); gsap.set(el, { clearProps: 'opacity,transform,filter' }); }); },
      }),
    });
    gsap.set(els.filter((e) => !e.classList.contains('is-in')), { y: phone ? 24 : 46, scale: 0.965 });
  });

  safe('scrub-text', () => {
    $$('[data-scrub]').forEach((el) => {
      const words = splitWords(el, 'scrub');
      gsap.fromTo(words, { opacity: 0.16 }, { opacity: 1, ease: 'none', stagger: 0.12, scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 46%', scrub: 0.6 } });
    });
  });

  /* ---------------------------------------- pointer: sheen, tilt, magnet */
  safe('pointer-fx', () => {
    if (!fine) return;
    $$('.glass').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
    $$('[data-tilt]').forEach((el) => {
      const deg = Number(el.dataset.tilt) || 5;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(el, { rotationY: px * deg * 2, rotationX: -py * deg * 2, transformPerspective: 1000, duration: 0.7, ease: 'power3.out', overwrite: 'auto' });
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { rotationY: 0, rotationX: 0, duration: 1.1, ease: 'elastic.out(1, 0.6)', overwrite: 'auto' }));
    });
    $$('[data-magnet]').forEach((el) => {
      const qx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
      const qy = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        qx((e.clientX - (r.left + r.width / 2)) * 0.28);
        qy((e.clientY - (r.top + r.height / 2)) * 0.4);
      });
      el.addEventListener('pointerleave', () => { gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' }); });
    });
  });

  /* ------------------------------------------------------- hero depth */
  safe('hero-depth', () => {
    const stage = $('#hero-stage');
    if (!stage) return;
    gsap.to(stage, { yPercent: -7, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    if (!fine) return;
    const layers = $$('[data-depth]', stage).map((el) => ({ d: Number(el.dataset.depth), x: gsap.quickTo(el, 'x', { duration: 1.1, ease: 'power3.out' }), y: gsap.quickTo(el, 'y', { duration: 1.1, ease: 'power3.out' }) }));
    const hero = $('.hero');
    hero.addEventListener('pointermove', (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      layers.forEach((l) => { l.x(nx * l.d * -14); l.y(ny * l.d * -10); });
    });
  });

  /* --------------------------------------------------------- marquee */
  safe('marquee', () => {
    const track = $('.marquee__track');
    if (!track) return;
    const build = () => {
      const html = track.dataset.src || (track.dataset.src = track.innerHTML);
      track.innerHTML = html + html;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const half = (track.scrollWidth + gap) / 2;
      const tween = gsap.to(track, { x: half, duration: half / 70, ease: 'none', repeat: -1 });
      let calm;
      ScrollTrigger.create({
        trigger: '.marquee', start: 'top bottom', end: 'bottom top',
        onUpdate: (s) => {
          gsap.to(tween, { timeScale: clamp(-8, 8, 1 + s.getVelocity() / 260), duration: 0.25, overwrite: true });
          calm?.kill();
          calm = gsap.delayedCall(0.12, () => gsap.to(tween, { timeScale: 1, duration: 1.2, ease: 'power2.out', overwrite: true }));
        },
      });
    };
    (document.fonts?.ready || Promise.resolve()).then(build);
  });

  /* ---------------------------------------------- counters + bento art */
  safe('counters', () => {
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
    const ring = $('.r-fg');
    if (ring) gsap.fromTo(ring, { strokeDashoffset: 238.76 }, { strokeDashoffset: 52, duration: 2, ease: 'expo.out', scrollTrigger: { trigger: ring, start: 'top 90%', once: true } });
    const bars = $$('.bars i');
    if (bars.length) gsap.from(bars, { scaleY: 0, duration: 1.1, stagger: 0.09, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.bars', start: 'top 90%', once: true } });
    const sils = $$('.silhouettes use');
    if (sils.length) {
      gsap.from(sils, { opacity: 0, y: 50, duration: 1.4, stagger: 0.09, ease: 'expo.out', scrollTrigger: { trigger: '.tile--xl', start: 'top 85%', once: true } });
      gsap.to('.silhouettes', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.tile--xl', start: 'top bottom', end: 'bottom top', scrub: true } });
    }
  });

  /* --------------------------------------------- services steps line */
  safe('steps-line', () => {
    $$('[data-line]').forEach((list) => {
      const fill = $('.steps__line i', list);
      if (fill) gsap.fromTo(fill, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: list, start: 'top 78%', end: 'bottom 62%', scrub: 0.5 } });
      gsap.from($$('li', list), { x: 30, opacity: 0, duration: 0.9, stagger: 0.18, ease: 'expo.out', scrollTrigger: { trigger: list, start: 'top 82%', once: true } });
    });
    const days = $$('.days');
    days.forEach((d) => gsap.from($$('.day', d), { scale: 0.4, opacity: 0, duration: 0.7, stagger: 0.05, ease: 'back.out(2)', scrollTrigger: { trigger: d, start: 'top 90%', once: true } }));
  });

  /* ------------------------------------- about: pinned horizontal timeline */
  const mmH = gsap.matchMedia();
  safe('hscroll', () => {
    const pin = $('.hs__pin');
    if (!pin) return;
    mmH.add('(min-width: 900px)', () => {
      const track = $('.hs__track', pin);
      const view = $('.hs__viewport', pin);
      const bar = $('.hs__bar i', pin);
      const dist = () => Math.max(0, track.offsetWidth - view.clientWidth);
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true },
      });
      tl.to(track, { x: () => dist() }, 0).to(bar, { scaleX: 1 }, 0);
      $$('.hs__card', track).forEach((c) => {
        tl.fromTo(c, { scale: 0.94 }, { scale: 1, ease: 'power1.out', duration: 0.2 }, 0);
      });
    });
  });

  /* ============================================================ FIP story */
  safe('fip', () => {
    const track = $('#fip-track');
    if (!track) return;
    const stage = $('#fip-stage');
    const world = $('#fip-world');
    const crowd = $('#fip-crowd');
    const scene = $('#fip-scene');
    const catG = $('#fip-cat');
    const frames = $$('.cat-frame', catG);
    const dayEl = $('#fip-day');
    const meter = $('#fip-meter');
    const hud = $('.fip__hud', stage);
    const capEl = $('#fip-caption');
    const aura = $('#fip-aura');
    const ringsG = $('#fip-rings');
    const final = $('#fip-final');
    const cta = $('#fip-cta');
    const num = $('#fip-num');

    const NS = 'http://www.w3.org/2000/svg';
    const XLINK = 'http://www.w3.org/1999/xlink';
    const GRAY = { line: '#8b929c', fill: '#f0f1f4' };
    const BLUE = { line: '#1f5fd0', fill: '#e6efff' };
    const mixC = gsap.utils.interpolate;
    const CAT = { x: 0, y: -120 };
    const CAPS = ['شروع پروتکل GS-441524', 'ادامهٔ درمان، زیر نظر دامپزشک', 'پایان نزدیک است', 'روز ۸۴ · پایان دورهٔ پروتکل'];

    const capText = document.createElement('span');
    capText.textContent = capEl.textContent;
    capEl.replaceChildren(capText);

    const mm = gsap.matchMedia();
    mm.add({ all: '(min-width: 0px)', mobile: '(max-width: 719px)', portrait: '(orientation: portrait)' }, (ctx) => {
      const { mobile, portrait } = ctx.conditions;
      root.classList.add('fip-live');
      scene.setAttribute('viewBox', portrait ? '-360 -640 720 1280' : '-640 -360 1280 720');

      /* crowd — deterministic pseudo-random so it never reshuffles */
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
          const s = 0.8 + rnd() * 0.42;
          const flip = rnd() < 0.5 ? -1 : 1;
          const u = document.createElementNS(NS, 'use');
          u.setAttribute('href', '#cat-sil');
          u.setAttributeNS(XLINK, 'xlink:href', '#cat-sil');
          u.setAttribute('x', '-50'); u.setAttribute('y', '-50'); u.setAttribute('width', '100'); u.setAttribute('height', '100');
          u.setAttribute('transform', `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${(flip * s).toFixed(3)} ${s.toFixed(3)})`);
          u.setAttribute('opacity', (0.26 + rnd() * 0.5).toFixed(2));
          const d = Math.hypot((cx - CAT.x) / 1.25, cy - CAT.y);
          rings[Math.min(RINGS - 1, Math.floor(d / (mobile ? 95 : 105)))].appendChild(u);
        }
      }

      const Z0 = portrait ? 5.6 : 6.2;
      const useIdx = mobile ? [0, 2, 3] : [0, 1, 2, 3];
      frames.forEach((f) => { f.style.transformOrigin = '226px 350px'; });
      ringsG.style.transformBox = 'fill-box';
      ringsG.style.transformOrigin = 'center';

      let lastDay = -1;
      let lastCap = -1;
      const st = { h: 0, e: 0, n: 0 };

      const render = () => {
        const h = st.h;
        const c = clamp(0, 1, h);
        stage.style.setProperty('--cat-line', mixC(GRAY.line, BLUE.line, c));
        stage.style.setProperty('--cat-fill', mixC(GRAY.fill, BLUE.fill, c));
        field.h = c; applyField();

        // pose: hold each frame, then a short dissolve into the next
        const last = useIdx.length - 1;
        const t = h * last;
        const i = Math.min(last - 1, Math.floor(t));
        const frac = h >= 1 ? 1 : t - i;
        const a = gsap.parseEase('power2.inOut')(clamp(0, 1, (frac - 0.5) / 0.4));
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
        const ci = h >= 0.999 ? 3 : Math.min(2, Math.floor(h * 3));
        if (ci !== lastCap) {
          lastCap = ci;
          gsap.fromTo(capText, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'expo.out', overwrite: true });
          capText.textContent = CAPS[ci];
        }

        // camera pull-back
        const e = st.e;
        const z = Math.pow(Z0, 1 - e);
        const vy = -20 + (CAT.y + 20) * e;
        world.setAttribute('transform', `translate(0 ${(vy - CAT.y * z).toFixed(2)}) scale(${z.toFixed(4)})`);

        // aura + ripple rings
        aura.style.scale = (0.55 + 0.65 * c).toFixed(3);
        aura.style.opacity = ((0.3 + 0.4 * c) * (1 - 0.85 * e)).toFixed(3);
        const rv = clamp(0, 1, (h - 0.55) / 0.45) * (1 - e);
        ringsG.setAttribute('opacity', (rv * 0.6).toFixed(3));
        ringsG.style.transform = `scale(${(0.85 + 0.25 * c).toFixed(3)})`;

        num.textContent = fa(Math.round(st.n)) + '+';
      };

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        onUpdate: render,
        scrollTrigger: { trigger: track, start: 'top top', end: 'bottom bottom', scrub: 0.7, invalidateOnRefresh: true },
      });
      tl.to(st, { h: 1, duration: 0.65 }, 0.1);
      tl.to(st, { e: 1, duration: 0.15, ease: 'power2.inOut' }, 0.85);
      tl.to([hud, capEl], { autoAlpha: 0, duration: 0.05 }, 0.85);
      rings.forEach((g, i) => tl.to(g, { attr: { opacity: 1 }, duration: 0.06 }, 0.84 + i * 0.011));
      tl.to(st, { n: 800, duration: 0.11, ease: 'power2.out' }, 0.87);
      tl.fromTo(final, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.06, ease: 'power2.out' }, 0.89);
      tl.fromTo(cta, { autoAlpha: 0, scale: 0.88 }, { autoAlpha: 1, scale: 1, duration: 0.035, ease: 'back.out(2.4)' }, 0.965);
      tl.duration(1);
      render();

      return () => {
        crowd.replaceChildren();
        root.classList.remove('fip-live');
        frames.forEach((f) => { f.style.opacity = ''; f.style.transform = ''; });
        ['--cat-line', '--cat-fill'].forEach((p) => stage.style.removeProperty(p));
        field.h = 1; applyField();
      };
    });
  });

  /* fonts change line breaks → measure again */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
