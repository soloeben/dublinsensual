const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reducedMotion) document.documentElement.classList.add('reveal-ready');

const header = document.querySelector('.site-header');
const syncHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 24);
syncHeader();
window.addEventListener('scroll', syncHeader, { passive: true });

const menuToggle = document.querySelector('[data-menu-toggle]');
const mobileMenu = document.querySelector('[data-mobile-menu]');
let lastFocused = null;

function setMenu(open) {
  if (!menuToggle || !mobileMenu) return;
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  mobileMenu.hidden = !open;
  document.body.classList.toggle('menu-open', open);
  if (open) {
    lastFocused = document.activeElement;
    mobileMenu.querySelector('a')?.focus();
  } else if (lastFocused instanceof HTMLElement) {
    lastFocused.focus();
  }
}

menuToggle?.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
mobileMenu?.addEventListener('click', event => {
  if (event.target instanceof HTMLAnchorElement) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') setMenu(false);
});

const currentFile = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('[data-site-nav] a[href]').forEach(link => {
  if (link.getAttribute('href') === currentFile) link.setAttribute('aria-current', 'page');
});

if (!reducedMotion && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
} else {
  document.querySelectorAll('[data-reveal]').forEach(element => element.classList.add('is-visible'));
}

const dayTabs = [...document.querySelectorAll('[role="tab"][data-day]')];
const dayPanels = [...document.querySelectorAll('[role="tabpanel"][data-day-panel]')];
function activateDay(day, focus = false) {
  dayTabs.forEach(tab => {
    const active = tab.dataset.day === day;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active && focus) tab.focus();
  });
  dayPanels.forEach(panel => { panel.hidden = panel.dataset.dayPanel !== day; });
}
dayTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateDay(tab.dataset.day));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % dayTabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + dayTabs.length) % dayTabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = dayTabs.length - 1;
    activateDay(dayTabs[next].dataset.day, true);
  });
});

const EB_EVENT_ID = '1806334287479';
const eventbriteUrl = 'https://www.eventbrite.com/e/dublin-sensual-festival-sbk-2026-3rd-edition-tickets-1806334287479?aff=ebdssbdestsearch&keep_tld=1';
const eventbriteTrigger = document.getElementById(`eventbrite-widget-modal-trigger-${EB_EVENT_ID}`);
const ebModal = document.querySelector('[data-eb-modal]');

if (eventbriteTrigger && ebModal) {
  let ebWidgetReady = false;
  let ebLastFocused = null;

  const loadEbScript = () => new Promise((resolve, reject) => {
    if (window.EBWidgets) return resolve();
    const existing = document.querySelector('script[data-eb-widgets]');
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://www.eventbrite.com/static/widgets/eb_widgets.js';
    script.async = true;
    script.dataset.ebWidgets = 'true';
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', reject, { once: true });
    document.head.appendChild(script);
  });

  const closeEb = () => {
    ebModal.hidden = true;
    document.body.classList.remove('modal-open');
    if (ebLastFocused instanceof HTMLElement) ebLastFocused.focus();
  };

  const openEb = async () => {
    ebLastFocused = document.activeElement;
    ebModal.hidden = false;
    document.body.classList.add('modal-open');
    ebModal.querySelector('.eb-modal__close')?.focus();
    if (ebWidgetReady) return;
    try {
      await loadEbScript();
      if (!window.EBWidgets) throw new Error('EBWidgets unavailable');
      window.EBWidgets.createWidget({
        widgetType: 'checkout',
        eventId: EB_EVENT_ID,
        iframeContainerId: 'eventbrite-checkout-container',
        iframeContainerHeight: 660
      });
      ebWidgetReady = true;
    } catch {
      // Widget blocked or offline — fall back to Eventbrite's own page.
      closeEb();
      window.open(eventbriteUrl, '_blank', 'noopener,noreferrer');
    }
  };

  eventbriteTrigger.addEventListener('click', event => {
    event.preventDefault();
    // Eventbrite refuses to run the embedded checkout on anything but https,
    // so on http/file (local preview) send people straight to Eventbrite.
    if (window.location.protocol !== 'https:') {
      window.open(eventbriteUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    openEb();
  });

  ebModal.querySelectorAll('[data-eb-close]').forEach(element => element.addEventListener('click', closeEb));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !ebModal.hidden) closeEb();
  });
}
