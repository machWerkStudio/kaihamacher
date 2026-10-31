(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const card = document.querySelector('.identity');
  const pad = n => String(n).padStart(2, '0');

  // Timecode wie im Kamera-Display
  const tc = document.querySelector('.timecode');
  const start = performance.now();
  const tick = () => {
    const t = (performance.now() - start) / 1000;
    tc.textContent = `00:${pad(Math.floor(t / 60) % 60)}:${pad(Math.floor(t % 60))}:${pad(Math.floor((t % 1) * 25))}`;
  };

  // Wortwechsel – jeder Wechsel ist ein neuer „Take", der Fokusrahmen stellt scharf
  const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'de');
  const TAKES = {
    de: [['Videos.', 'VIDEO'], ['Fotos.', 'FOTO'], ['Plakate.', 'PLAKATE'], ['Gesprächsstoff.', 'GUERILLA'],
      ['Stimmung.', 'AKTIONEN'], ['Lángos.', 'STREETFOOD'], ['was draus.', 'FINAL']],
    en: [['videos.', 'VIDEO'], ['photos.', 'PHOTO'], ['posters.', 'POSTERS'], ['buzz.', 'GUERRILLA'],
      ['memories.', 'ACTIVATIONS'], ['Lángos.', 'STREET FOOD'], ['it happen.', 'FINAL']]
  };
  const rotor = document.querySelector('.rotor');
  const takeNo = document.querySelector('.take');
  const h1 = card.querySelector('h1');
  let i = 0;
  const next = () => {
    const takes = TAKES[lang()];
    const [word, label] = takes[i % takes.length];
    const old = rotor.lastElementChild;
    const el = document.createElement('span');
    el.className = 'rotor-word';
    el.textContent = word;
    rotor.append(el);
    void el.offsetWidth; // Startposition setzen, damit die Transition greift
    old.classList.replace('is-in', 'is-out');
    el.classList.add('is-in');
    setTimeout(() => old.remove(), 800);
    takeNo.innerHTML = `TAKE ${pad(i % takes.length + 1)} · <b>${label}</b>`;
    h1.classList.remove('is-focusing');
    void h1.offsetWidth;
    h1.classList.add('is-focusing');
    i++;
  };

  // Animationen anhalten/fortsetzen (WCAG 2.2.2) – Wahl wird im Browser gemerkt
  const motionBtn = document.querySelector('.motion-toggle');
  const MOTION = {
    de: ['Animationen anhalten', 'Animationen fortsetzen'],
    en: ['Pause animations', 'Resume animations']
  };
  let timers = [];
  const setMotion = paused => {
    timers.forEach(clearInterval);
    timers = paused ? [] : [setInterval(tick, 40), setInterval(next, 2600)];
    document.body.classList.toggle('motion-paused', paused);
    motionBtn.setAttribute('aria-pressed', String(paused));
    motionBtn.setAttribute('aria-label', MOTION[lang()][paused ? 1 : 0]);
    try { localStorage.setItem('hm-motion', paused ? 'paused' : 'on'); } catch {}
  };
  if (!reduce) {
    let paused = false;
    try { paused = localStorage.getItem('hm-motion') === 'paused'; } catch {}
    motionBtn.hidden = false;
    motionBtn.addEventListener('click', () => setMotion(motionBtn.getAttribute('aria-pressed') !== 'true'));
    document.addEventListener('hm:lang', () => motionBtn.setAttribute('aria-label', MOTION[lang()][motionBtn.getAttribute('aria-pressed') === 'true' ? 1 : 0]));
    setMotion(paused);
  }

  // Leichter 3D-Tilt und magnetischer Button (nur mit Maus)
  if (!reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.classList.add('is-tilting');
      card.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 5 + 'deg');
      card.style.setProperty('--rx', (.5 - (e.clientY - r.top) / r.height) * 5 + 'deg');
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-tilting');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
    const btn = document.querySelector('.round-link');
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .35}px, ${(e.clientY - r.top - r.height / 2) * .35}px)`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
  }

  // Kontaktformular: Versand über contact.php (wie bei mein-fw.de)
  const form = document.querySelector('.contact-form');
  // Zeitstempel für die Mindest-Ausfüllzeit (Spamschutz in contact.php)
  form.querySelector('input[name="ts"]').value = String(Date.now());
  const MSG = {
    de: { sending: 'Wird gesendet …', failed: 'Die Nachricht konnte nicht gesendet werden.', thanks: 'Danke! Deine Nachricht ist angekommen.', direct: 'Schreib uns gern direkt an ' },
    en: { sending: 'Sending …', failed: 'Your message could not be sent.', thanks: 'Thank you! Your message has arrived.', direct: 'Feel free to email us directly at ' }
  };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const button = form.querySelector('.send-btn');
    const label = button.querySelector('.send-label');
    const status = form.querySelector('.form-status');
    const original = label.textContent;
    button.disabled = true;
    const t = MSG[lang()];
    label.textContent = t.sending;
    status.textContent = '';
    status.classList.remove('is-success', 'is-error');
    try {
      const response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || t.failed);
      form.reset();
      form.querySelector('input[name="ts"]').value = String(Date.now());
      status.textContent = result.message || t.thanks;
      status.classList.add('is-success');
    } catch (error) {
      status.innerHTML = '';
      status.append(`${error.message} ${t.direct}`, Object.assign(document.createElement('a'), { href: 'mailto:info@hamacher-marketing.de', textContent: 'info@hamacher-marketing.de' }), '.');
      status.classList.add('is-error');
    } finally {
      button.disabled = false;
      label.textContent = original;
    }
  });

  // Streetfood-Kacheln: am Handy per Antippen umdrehen und wieder zurück (Maus nutzt Hover)
  const tiles = document.querySelectorAll('.food-menu li');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const flip = li => {
    const open = !li.classList.contains('is-open');
    tiles.forEach(t => t.classList.remove('is-open'));
    li.classList.toggle('is-open', open);
  };
  tiles.forEach(li => {
    li.addEventListener('click', () => { if (!finePointer.matches) flip(li); });
    li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(li); } });
  });

  // Inhalte beim Scrollen einblenden
  if (!reduce && 'IntersectionObserver' in window) {
    const targets = document.querySelectorAll('.section-head, .information h2, .contact-location, .contact-item, .map-card, .social-label, .social-links li, .contact-form, .accordion details');
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    targets.forEach((el, n) => { el.classList.add('reveal'); el.style.setProperty('--delay', (n % 4) * 70 + 'ms'); io.observe(el); });
  }
})();
