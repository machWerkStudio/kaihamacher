(() => {
  // Sprachumschalter DE/EN: Deutsch steht im HTML, Englisch kommt aus i18n-en.js
  const EN = window.HM_EN || {};
  const ATTRS = [
    ['.brand', 'aria-label', 'Hamacher Marketing home'],
    ['.brand-logo', 'alt', 'Hamacher Marketing – content, campaigns, visibility'],
    ['.portrait', 'alt', 'Portrait of Kai Hamacher'],
    ['.round-link', 'aria-label', 'Go to contact details'],
    ['.contact-grid a[href*="google.com/maps"]', 'aria-label', 'Open Tränkeweg 12, 15517 Fürstenwalde on the map (new tab)'],
    ['.contact-grid a[href="https://hamacher-marketing.de"]', 'aria-label', 'Open hamacher-marketing.de (new tab)'],
    ['.map-route', 'aria-label', 'Get directions to Tränkeweg 12 (Google Maps, new tab)'],
    ['.food-menu', 'aria-label', 'Our street food'],
    ['.service-photo img[src*="streetfood-stand"]', 'alt', 'Lángos stand with wooden panelling, string lights and menu boards in the evening'],
    ['.service-photo img[src*="content-creation"]', 'alt', 'Team producing video and podcast content in a studio'],
    ['.service-photo img[src*="design-print"]', 'alt', 'Colour swatches, business cards and print samples on a desk'],
    ['.service-photo img[src*="guerilla-marketing"]', 'alt', 'Giant astronaut figure as an eye-catcher in a pedestrian zone at night'],
    ['.service-photo img[src*="staende-aktionen"]', 'alt', 'Promo stand with a prize wheel where visitors receive small gift bags'],
    ['.service-photo img[src*="plakate-flyer"]', 'alt', 'Putting up posters on a wall and handing out flyers in town'],
    ['.food-photo[src*="langos"]', 'alt', 'Lángos with sour cream, cheese and chives'],
    ['.food-photo[src*="suppe"]', 'alt', 'Hearty soup served in a bread bowl'],
    ['.food-photo[src*="crepes"]', 'alt', 'Crêpe with chocolate sauce and fresh berries'],
    ['.food-photo[src*="flammkuchen"]', 'alt', 'Tarte flambée with bacon and red onions'],
    ['.food-photo[src*="grill"]', 'alt', 'Sausages, steaks and vegetables on a swing grill'],
    ['.contact-form textarea', 'placeholder', 'What are you planning? Ideally with dates and location.'],
    ['.footer-legal', 'aria-label', 'Site navigation'],
    ['.social-whatsapp', 'href', 'https://wa.me/4917634071561?text=Hi%20Kai%2C%20I%20have%20an%20enquiry%20via%20your%20digital%20business%20card.'],
    ['meta[name="description"]', 'content', 'Marketing from Fürstenwalde, Germany: content, design & print, guerrilla campaigns, promo stands, posters and street food. Contact owner Kai Hamacher directly.']
  ];

  const nodes = [...document.querySelectorAll('[data-i18n]')].map(el => ({ el, de: el.innerHTML }));
  const attrs = ATTRS.flatMap(([sel, attr, en]) =>
    [...document.querySelectorAll(sel)].map(el => ({ el, attr, en, de: el.getAttribute(attr) })));
  const langInput = document.querySelector('.contact-form input[name="lang"]');
  const sw = document.querySelector('.lang-switch');
  const buttons = sw ? [...sw.querySelectorAll('button')] : [];

  const apply = lang => {
    const en = lang === 'en';
    document.documentElement.lang = lang;
    nodes.forEach(n => { n.el.innerHTML = en && EN[n.el.dataset.i18n] ? EN[n.el.dataset.i18n] : n.de; });
    attrs.forEach(a => a.el.setAttribute(a.attr, en ? a.en : a.de));
    if (langInput) langInput.value = lang;
    if (sw) sw.dataset.lang = lang;
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    try { localStorage.setItem('hm-lang', lang); } catch {}
    document.dispatchEvent(new CustomEvent('hm:lang', { detail: lang }));
  };

  let initial = null;
  try { initial = localStorage.getItem('hm-lang'); } catch {}
  if (initial !== 'de' && initial !== 'en') {
    const prefs = navigator.languages || [navigator.language || 'de'];
    initial = prefs.some(l => /^de/i.test(l)) ? 'de' : 'en';
  }
  if (sw) {
    sw.hidden = false;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;
    buttons.forEach(b => b.addEventListener('click', () => {
      const lang = b.dataset.lang;
      if (lang === root.lang) return;
      // Schalter springt sofort, Texte blenden kurz aus und in der neuen Sprache wieder ein
      sw.dataset.lang = lang;
      sw.classList.remove('is-pulse'); void sw.offsetWidth; sw.classList.add('is-pulse');
      if (reduce) return apply(lang);
      root.classList.add('lang-anim', 'lang-out');
      setTimeout(() => {
        apply(lang);
        root.classList.remove('lang-out');
        setTimeout(() => root.classList.remove('lang-anim'), 250);
      }, 180);
    }));
  }
  apply(initial);
})();
