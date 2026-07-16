// Fase 8: Panel de accesibilidad — modo oscuro/claro y tamaño de texto (PlanProyecto.md §7.3).
// La aplicación del valor guardado antes del primer render (anti-FOUC) vive en el
// script inline de <head> en index.html; este archivo solo maneja el panel una vez
// que el DOM ya existe.

const A11Y_THEME_KEY = 'wc26_theme';
const A11Y_FONT_SCALE_KEY = 'wc26_font_scale';

let a11yLastFocused = null;

function getEffectiveTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function getStoredFontScale() {
  return localStorage.getItem(A11Y_FONT_SCALE_KEY) || 'normal';
}

function setTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem(A11Y_THEME_KEY, theme);
  syncA11yThemeButtons(theme);
}

function setFontScale(level) {
  if (level === 'normal') {
    document.documentElement.removeAttribute('data-font-scale');
  } else {
    document.documentElement.setAttribute('data-font-scale', level);
  }
  localStorage.setItem(A11Y_FONT_SCALE_KEY, level);
  syncA11yFontButtons(level);
}

function syncA11yThemeButtons(theme) {
  document.querySelectorAll('.a11y-option[data-theme-option]').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.themeOption === theme));
  });
}

function syncA11yFontButtons(level) {
  document.querySelectorAll('.a11y-option[data-font-option]').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.fontOption === level));
  });
}

function openA11yPanel(event) {
  a11yLastFocused = event ? event.currentTarget : document.activeElement;
  document.getElementById('a11y-overlay').classList.remove('hidden');
  document.getElementById('a11y-panel').classList.remove('hidden');
  document.getElementById('a11y-close').focus();
  document.addEventListener('keydown', handleA11yKeydown);
}

function closeA11yPanel() {
  document.getElementById('a11y-overlay').classList.add('hidden');
  document.getElementById('a11y-panel').classList.add('hidden');
  document.removeEventListener('keydown', handleA11yKeydown);
  if (a11yLastFocused) a11yLastFocused.focus();
}

function handleA11yKeydown(event) {
  if (event.key === 'Escape') {
    closeA11yPanel();
    return;
  }
  if (event.key === 'Tab') trapA11yFocus(event);
}

// Atrapa el foco dentro del panel mientras está abierto (WCAG 2.4.3 orden de foco).
function trapA11yFocus(event) {
  const panel = document.getElementById('a11y-panel');
  const focusable = Array.from(panel.querySelectorAll('button'));
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function setupAccessibilityPanel() {
  syncA11yThemeButtons(getEffectiveTheme());
  syncA11yFontButtons(getStoredFontScale());

  document.querySelectorAll('.a11y-trigger').forEach(btn => {
    btn.addEventListener('click', openA11yPanel);
  });
  document.getElementById('a11y-close').addEventListener('click', closeA11yPanel);
  document.getElementById('a11y-overlay').addEventListener('click', closeA11yPanel);

  document.querySelectorAll('.a11y-option[data-theme-option]').forEach(btn => {
    btn.addEventListener('click', () => setTheme(btn.dataset.themeOption));
  });
  document.querySelectorAll('.a11y-option[data-font-option]').forEach(btn => {
    btn.addEventListener('click', () => setFontScale(btn.dataset.fontOption));
  });
}
