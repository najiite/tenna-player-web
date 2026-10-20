// Small touches: the mobile menu, the platform the visitor is on, tabs, a table of contents that follows the page, and fade-ins.
(() => {
  const root = document.documentElement;

  // Mobile menu
  const header = document.querySelector('.site-header');
  const toggle = header?.querySelector('.menu-toggle');
  toggle?.addEventListener('click', () => {
    const open = header.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header?.classList.contains('is-open')) { header.classList.remove('is-open'); toggle?.setAttribute('aria-expanded', 'false'); toggle?.focus(); }
  });
  header?.querySelectorAll('.main-nav a').forEach((a) => a.addEventListener('click', () => { header.classList.remove('is-open'); toggle?.setAttribute('aria-expanded', 'false'); }));

  // Which computer is this? The download page highlights the matching card (a guess from the browser, never sent anywhere)
  const ua = navigator.userAgent || '';
  const hint = navigator.userAgentData?.platform || navigator.platform || '';
  let os = 'other';
  if (/android|iphone|ipad|ipod/i.test(ua) || (/Mac/i.test(hint) && navigator.maxTouchPoints > 1)) os = 'mobile';
  else if (/win/i.test(hint) || /windows/i.test(ua)) os = 'windows';
  else if (/mac/i.test(hint) || /macintosh|mac os/i.test(ua)) os = 'mac';
  root.dataset.os = os;

  // Tabs
  document.querySelectorAll('[role="tablist"]').forEach((list) => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const select = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (e) => {
        const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
        if (next === null) return;
        const target = tabs[(next + tabs.length) % tabs.length];
        select(target); target.focus(); e.preventDefault();
      });
    });
    // The tab for this visitor's computer starts open
    const mine = tabs.find((t) => t.dataset.os === os);
    if (mine) select(mine);
  });

  // Table of contents follows the section on screen
  const links = [...document.querySelectorAll('.toc a[href^="#"]')];
  if (links.length && 'IntersectionObserver' in window) {
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const seen = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.remove('is-active'));
        byId.get(entry.target.id)?.classList.add('is-active');
      });
    }, { rootMargin: '-90px 0px -70% 0px' });
    byId.forEach((_, id) => { const heading = document.getElementById(id); if (heading) seen.observe(heading); });
  }

  // Fade-ins
  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } }), { threshold: 0.12 });
    items.forEach((el) => io.observe(el));
    // Safety net: never leave content hidden if the observer is slow or absent (print, capture, odd browsers).
    setTimeout(() => items.forEach((el) => el.classList.add('is-visible')), 2500);
    addEventListener('beforeprint', () => items.forEach((el) => el.classList.add('is-visible')));
  } else {
    items.forEach((el) => el.classList.add('is-visible'));
  }
})();
