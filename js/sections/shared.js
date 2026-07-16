// Helpers compartidos entre las secciones de La Ruta del Campeón, Rastreador de
// Goleadas y El Muro: formato de fecha, búsqueda por id, etiqueta de fase de grupo/
// eliminatoria, e íconos + markup de los bloques de estado (error / vacío).

function findById(list, id) {
  return list ? list.find(item => item.id === id) : null;
}

function formatMatchDate(rawDate, { withTime = true } = {}) {
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return rawDate;
  return withTime
    ? date.toLocaleString('es-CR', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : date.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const GROUP_STAGE_CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const KNOCKOUT_STAGE_LABELS = {
  R32: 'Dieciseisavos de final',
  R16: 'Octavos de final',
  QF: 'Cuartos de final',
  SF: 'Semifinal',
  '3RD': 'Tercer lugar',
  FINAL: 'Final',
};

function getPhaseLabel(groupCode) {
  if (!groupCode) return 'Fase eliminatoria';
  if (GROUP_STAGE_CODES.includes(groupCode)) return `Grupo ${groupCode}`;
  return KNOCKOUT_STAGE_LABELS[groupCode] || groupCode;
}

const RC_ICON_ALERT = '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
const RC_ICON_EMPTY = '<circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>';
const RC_ICON_SEARCH = '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>';

// renderStateBlock({ error, icon, title, message, action }): markup común para los
// estados de error/vacío (.rc-state) que usan las tres secciones. `action` es opcional:
// { label, id, className } para un botón de reintentar o limpiar filtros.
function renderStateBlock({ error = false, icon = RC_ICON_EMPTY, title, message, action } = {}) {
  const actionHtml = action
    ? `<button type="button" class="${action.className || 'btn-retry'}" id="${action.id}">${action.label}</button>`
    : '';
  return `
    <div class="rc-state${error ? ' rc-state-error' : ''}"${error ? ' role="alert"' : ''}>
      <svg class="rc-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg>
      <p class="rc-state-title">${title}</p>
      <p>${message}</p>
      ${actionHtml}
    </div>
  `;
}
