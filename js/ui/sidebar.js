function setupSidebarToggle() {
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!toggleBtn || !sidebar || !overlay) return;

  const closeDrawer = () => {
    sidebar.classList.remove('sidebar-open');
    overlay.hidden = true;
    toggleBtn.setAttribute('aria-expanded', 'false');
  };

  const openDrawer = () => {
    sidebar.classList.add('sidebar-open');
    overlay.hidden = false;
    toggleBtn.setAttribute('aria-expanded', 'true');
  };

  toggleBtn.addEventListener('click', () => {
    const isOpen = sidebar.classList.contains('sidebar-open');
    if (isOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  overlay.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeDrawer();
  });

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', closeDrawer);
  });
}

function setupSidebarResize() {
  const sidebar = document.getElementById('sidebar');
  const resizer = document.getElementById('sidebar-resizer');
  if (!sidebar || !resizer) return;

  const MIN_WIDTH = 200;
  const MAX_WIDTH = 400;
  const STEP = 16;
  const STORAGE_KEY = 'sidebar-width';
  const root = document.documentElement;

  const clamp = width => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));

  const applyWidth = width => {
    root.style.setProperty('--sidebar-width', `${width}px`);
    resizer.setAttribute('aria-valuenow', String(width));
  };

  const savedWidth = Number(localStorage.getItem(STORAGE_KEY));
  if (savedWidth) {
    applyWidth(clamp(savedWidth));
  } else {
    resizer.setAttribute('aria-valuenow', String(sidebar.getBoundingClientRect().width || 248));
  }

  let startX = 0;
  let startWidth = 0;

  const onPointerMove = event => {
    applyWidth(clamp(startWidth + (event.clientX - startX)));
  };

  const stopResize = () => {
    document.body.classList.remove('sidebar-resizing');
    resizer.classList.remove('is-resizing');
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', stopResize);
    localStorage.setItem(STORAGE_KEY, Math.round(sidebar.getBoundingClientRect().width));
  };

  resizer.addEventListener('pointerdown', event => {
    if (window.matchMedia('(max-width: 1023px)').matches) return;
    event.preventDefault();
    startX = event.clientX;
    startWidth = sidebar.getBoundingClientRect().width;
    document.body.classList.add('sidebar-resizing');
    resizer.classList.add('is-resizing');
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', stopResize);
  });

  resizer.addEventListener('keydown', event => {
    const current = sidebar.getBoundingClientRect().width;
    let next = null;
    if (event.key === 'ArrowLeft') next = current - STEP;
    else if (event.key === 'ArrowRight') next = current + STEP;
    else if (event.key === 'Home') next = MIN_WIDTH;
    else if (event.key === 'End') next = MAX_WIDTH;
    if (next === null) return;

    event.preventDefault();
    const clamped = clamp(next);
    applyWidth(clamped);
    localStorage.setItem(STORAGE_KEY, clamped);
  });
}
