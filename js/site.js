/* KTZ GROUP SAS — interactions et animations */
(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  /* ── Découpe des titres en mots ── */
  document.querySelectorAll('[data-split]').forEach(el => {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span');
            const wi = document.createElement('span');
            w.className = 'w';
            wi.className = 'wi';
            wi.textContent = part;
            wi.style.transitionDelay = (i++ * 0.07) + 's';
            w.append(wi);
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    };
    walk(el);
  });

  /* ── Index de décalage pour les groupes ── */
  document.querySelectorAll('[data-stagger]').forEach(group => {
    [...group.children].forEach((child, i) => child.style.setProperty('--i', i));
  });

  /* ── Écran de chargement ── */
  const pre = document.getElementById('preloader');
  const preNum = pre && pre.querySelector('.pre-num span');
  const finishLoading = () => {
    if (pre) {
      pre.classList.add('done');
      setTimeout(() => pre.remove(), 1200);
    }
    body.classList.add('loaded');
    startCounters(document.querySelectorAll('.hero [data-count]'));
  };
  if (!pre || reduce) {
    finishLoading();
  } else {
    const t0 = performance.now();
    const dur = 1500;
    let pageReady = document.readyState === 'complete';
    addEventListener('load', () => { pageReady = true; }, { once: true });
    setTimeout(() => { pageReady = true; }, 3500); // ne jamais bloquer sur une ressource lente
    const tick = now => {
      const p = clamp((now - t0) / dur, 0, 1);
      preNum.textContent = Math.round(easeOut(p) * (pageReady ? 100 : 92));
      if (p < 1 || !pageReady) requestAnimationFrame(tick);
      else { preNum.textContent = 100; setTimeout(finishLoading, 150); }
    };
    requestAnimationFrame(tick);
  }

  /* ── Compteurs ── */
  function startCounters(els) {
    els.forEach(el => {
      if (el.dataset.done) return;
      el.dataset.done = '1';
      const to = +el.dataset.count;
      const from = +(el.dataset.from || 0);
      if (reduce) { el.textContent = to; return; }
      const dur = 1800 + Math.min(to, 300) * 2;
      const t0 = performance.now();
      const step = now => {
        const p = clamp((now - t0) / dur, 0, 1);
        el.textContent = Math.round(from + (to - from) * easeOut(p));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ── Apparitions au défilement ── */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      startCounters(e.target.querySelectorAll('[data-count]'));
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('[data-reveal], [data-split], .footer-big').forEach(el => {
    if (!el.closest('.hero')) io.observe(el);
  });

  /* ── Navigation : fond au défilement, masquage, lien actif ── */
  const nav = document.getElementById('nav');
  const progress = document.querySelector('.progress');
  let lastY = scrollY;

  const navLinks = [...document.querySelectorAll('.links a')];
  const sectionIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['poles', 'histoire', 'references', 'equipe', 'contact'].forEach(id => {
    const s = document.getElementById(id);
    if (s) sectionIO.observe(s);
  });

  /* ── Menu mobile ── */
  const burger = document.querySelector('.burger');
  const menu = document.getElementById('menu');
  const setMenu = open => {
    body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    menu.setAttribute('aria-hidden', !open);
  };
  burger.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ── Références : défilement horizontal épinglé ── */
  const hs = document.querySelector('.hscroll');
  const track = hs.querySelector('.hs-track');
  const hsCount = hs.querySelector('.hs-count');
  const hsBar = hs.querySelector('.hs-bar i');
  const refs = track.children.length;
  const pinnedMode = () => innerWidth >= 900 && !reduce;
  let hsDist = 0;

  const sizeHs = () => {
    if (pinnedMode()) {
      hs.classList.add('pinned');
      hsDist = Math.max(0, track.scrollWidth - innerWidth);
      hs.style.height = (hsDist + innerHeight) + 'px';
    } else {
      hs.classList.remove('pinned');
      hs.style.height = '';
      track.style.transform = '';
    }
  };
  const setHsProgress = p => {
    const idx = Math.min(refs, Math.floor(p * refs) + 1);
    hsCount.textContent = String(idx).padStart(2, '0');
    hsBar.style.transform = `scaleX(${Math.max(1 / refs, p)})`;
  };
  // sur mobile, la piste défile nativement
  hs.querySelector('.hs-viewport').addEventListener('scroll', e => {
    if (pinnedMode()) return;
    const v = e.currentTarget;
    setHsProgress(v.scrollLeft / Math.max(1, v.scrollWidth - v.clientWidth));
  }, { passive: true });

  /* ── Frise de la méthode ── */
  const timeline = document.querySelector('.timeline');
  const tlFill = timeline.querySelector('.tl-fill');
  const steps = [...timeline.querySelectorAll('.step')];

  /* ── Grand texte en parallaxe ── */
  const figBg = document.querySelector('.figures-bg');

  /* ── Boucle de défilement ── */
  let ticking = false;
  const onScroll = () => {
    const y = scrollY;
    const docH = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${docH > 0 ? y / docH : 0})`;

    nav.classList.toggle('scrolled', y > 30);
    nav.classList.toggle('hidden', y > lastY && y > 600 && !body.classList.contains('menu-open'));
    lastY = y;

    if (pinnedMode()) {
      const r = hs.getBoundingClientRect();
      const p = hsDist > 0 ? clamp(-r.top / hsDist, 0, 1) : 0;
      track.style.transform = `translate3d(${-p * hsDist}px,0,0)`;
      setHsProgress(p);
    }

    const tr = timeline.getBoundingClientRect();
    const line = innerHeight * 0.6;
    tlFill.style.transform = `scaleY(${clamp((line - tr.top) / tr.height, 0, 1)})`;
    steps.forEach(s => s.classList.toggle('active', s.getBoundingClientRect().top < line));

    if (figBg && !reduce) {
      const fr = figBg.parentElement.getBoundingClientRect();
      figBg.style.setProperty('--px', `${(fr.top / innerHeight) * 20 - 5}vw`);
    }
    ticking = false;
  };
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  addEventListener('resize', () => { sizeHs(); onScroll(); });
  sizeHs();
  onScroll();
  addEventListener('load', () => { sizeHs(); onScroll(); });
  if (document.fonts) document.fonts.ready.then(() => { sizeHs(); onScroll(); });

  /* ── Cartes : inclinaison 3D et halo ── */
  document.querySelectorAll('[data-tilt]').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', (x * 100) + '%');
      card.style.setProperty('--my', (y * 100) + '%');
      if (!finePointer || reduce) return;
      card.classList.add('tilting');
      card.style.transform = `perspective(1000px) rotateX(${(0.5 - y) * 7}deg) rotateY(${(x - 0.5) * 7}deg) translateY(-4px)`;
    });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
      setTimeout(() => card.classList.remove('tilting'), 300);
    });
  });

  /* ── Boutons magnétiques ── */
  if (finePointer && !reduce) {
    document.querySelectorAll('[data-magnetic]').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ── Curseur personnalisé ── */
  if (finePointer && !reduce) {
    const dot = document.querySelector('.cursor-dot');
    const ring = document.querySelector('.cursor-ring');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      root.classList.add('has-cursor');
    }, { passive: true });
    document.addEventListener('pointerleave', () => root.classList.remove('has-cursor'));
    const loop = () => {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('pointerover', e => {
      ring.classList.toggle('hover', !!e.target.closest('a, button, input, select, textarea, [data-tilt]'));
    });
  }

  /* ── Hero : logo qui suit la souris ── */
  const hero = document.querySelector('.hero');
  const heroLogo = document.querySelector('.hero-logo');
  if (finePointer && !reduce) {
    hero.addEventListener('pointermove', e => {
      const x = e.clientX / innerWidth - 0.5;
      const y = e.clientY / innerHeight - 0.5;
      heroLogo.style.transform = `rotateY(${x * 22}deg) rotateX(${-y * 22}deg) translate(${x * 14}px, ${y * 14}px)`;
    });
    hero.addEventListener('pointerleave', () => { heroLogo.style.transform = ''; });
  }

  /* ── Hero : réseau de particules ── */
  const canvas = document.querySelector('.hero-canvas');
  const ctx = canvas.getContext('2d');
  const colors = ['242,122,15', '34,211,197', '229,21,122', '255,178,63'];
  let W = 0, H = 0, dpr = 1, parts = [], heroVisible = true;
  const pointer = { x: -9999, y: -9999 };

  const initParts = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(120, Math.round((W * H) / 13000));
    parts = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.6,
      c: colors[Math.floor(Math.random() * colors.length)]
    }));
  };
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    const link = 130;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (!reduce) {
        const dx = p.x - pointer.x, dy = p.y - pointer.y, d2 = dx * dx + dy * dy;
        if (d2 < 22000) { const f = (22000 - d2) / 22000 * 0.9; const d = Math.sqrt(d2) || 1; p.x += dx / d * f * 2; p.y += dy / d * f * 2; }
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      for (let j = i + 1; j < parts.length; j++) {
        const q = parts[j];
        const dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy);
        if (d < link) {
          ctx.strokeStyle = `rgba(${p.c},${(1 - d / link) * 0.28})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
      ctx.fillStyle = `rgba(${p.c},.85)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
  };
  const animate = () => {
    if (heroVisible) draw();
    if (!reduce) requestAnimationFrame(animate);
  };
  initParts();
  animate();
  addEventListener('resize', initParts);
  hero.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
  });
  hero.addEventListener('pointerleave', () => { pointer.x = pointer.y = -9999; });
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe(hero);

  /* ── Formulaire de contact : ouvre la messagerie avec le message prérempli ── */
  const form = document.getElementById('contact-form');
  const note = form.querySelector('.form-note');
  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    form.querySelectorAll('[required]').forEach(f => {
      const bad = !f.value.trim() || (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value));
      f.closest('.field').classList.toggle('error', bad);
      if (bad) ok = false;
    });
    if (!ok) {
      note.textContent = 'Merci de remplir les champs requis (nom, email valide, objet, message).';
      note.classList.add('err');
      return;
    }
    const d = new FormData(form);
    const subject = `[Site KTZ GROUP] ${d.get('subject')} — ${d.get('name')}`;
    const bodyText = [
      `Nom : ${d.get('name')}`,
      `Email : ${d.get('email')}`,
      `Organisation : ${d.get('org') || '—'}`,
      `Objet : ${d.get('subject')}`,
      '',
      d.get('message')
    ].join('\n');
    location.href = `mailto:kitzdon37@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    note.classList.remove('err');
    note.textContent = '✓ Votre messagerie s\'ouvre avec le message prérempli. L\'équipe KTZ GROUP SAS vous répondra prochainement.';
  });
  form.addEventListener('input', e => {
    const f = e.target.closest('.field');
    if (f) f.classList.remove('error');
  });

  /* ── Année du pied de page ── */
  document.getElementById('year').textContent = new Date().getFullYear();
})();
