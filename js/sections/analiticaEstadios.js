// Fase 6: Analítica de Estadios

const analiticaEstadiosState = {
  built: false,
  stadiums: null,
  stadiumsUnavailable: false,
  games: null,
  gamesUnavailable: false,
};

function initAnaliticaEstadios() {
  if (analiticaEstadiosState.built) return;
  analiticaEstadiosState.built = true;

  buildAnaliticaEstadiosShell();
  renderAnaliticaEstadios();
  loadAnaliticaEstadiosStadiums();
  loadAnaliticaEstadiosGames();
}

function buildAnaliticaEstadiosShell() {
  const section = document.getElementById('analitica-estadios');
  const wrapper = document.createElement('div');
  wrapper.className = 'ae-wrapper';
  wrapper.innerHTML = `
    <div class="rc-hero">
      <p class="rc-hero-eyebrow">Copa Mundial FIFA 2026</p>
      <h2 class="rc-hero-title">Analítica de Estadios</h2>
      <p class="rc-hero-sub">Los 16 estadios del Mundial FIFA 2026, ordenados por asistencia potencial: capacidad multiplicada por partidos albergados.</p>
    </div>

    <div id="ae-summary"></div>

    <div id="ae-stadiums-countdown" class="rc-search-status" aria-live="polite"></div>
    <div id="ae-games-countdown" class="rc-search-status" aria-live="polite"></div>

    <div id="ae-content" aria-live="polite"></div>
  `;
  section.appendChild(wrapper);

  document.getElementById('ae-content').addEventListener('click', handleAnaliticaEstadiosContentClick);
}

/* ── Carga de datos (fetch + resiliencia ya la maneja fetcher.js) ── */

async function loadAnaliticaEstadiosStadiums() {
  const result = await getStadiums({ countdownContainerId: 'ae-stadiums-countdown' });
  if (result.data) {
    analiticaEstadiosState.stadiums = result.data.stadiums;
  } else {
    analiticaEstadiosState.stadiumsUnavailable = true;
  }
  renderAnaliticaEstadios();
}

async function loadAnaliticaEstadiosGames() {
  const result = await getGames({ countdownContainerId: 'ae-games-countdown' });
  if (result.data) {
    analiticaEstadiosState.games = result.data.games;
  } else {
    analiticaEstadiosState.gamesUnavailable = true;
  }
  renderAnaliticaEstadios();
}

function handleAnaliticaEstadiosContentClick(event) {
  const retryStadiums = event.target.closest('#ae-retry-stadiums');
  if (retryStadiums) { loadAnaliticaEstadiosStadiums(); return; }

  const retryGames = event.target.closest('#ae-retry-games');
  if (retryGames) { loadAnaliticaEstadiosGames(); }
}

/* ── Lógica de negocio ── */

// Cuenta partidos por estadio y calcula asistencia potencial (capacity × partidos).
// `matches`/`potential` quedan en null mientras games no ha llegado, para que la
// gráfica pueda distinguir "todavía no sé" de "cero partidos".
function computeAnaliticaEstadiosStats() {
  const games = analiticaEstadiosState.games;
  const stats = analiticaEstadiosState.stadiums.map(stadium => {
    const matches = games ? games.filter(g => g.stadium_id === stadium.id).length : null;
    const potential = matches !== null ? stadium.capacity * matches : null;
    return { stadium, matches, potential };
  });

  stats.sort((a, b) => games
    ? b.potential - a.potential
    : b.stadium.capacity - a.stadium.capacity);

  return stats;
}

function computeAnaliticaEstadiosSummary(stats) {
  const totalCapacity = stats.reduce((sum, entry) => sum + entry.stadium.capacity, 0);
  const topStadiumName = analiticaEstadiosState.games ? stats[0].stadium.name_en : '—';
  return { count: stats.length, totalCapacity, topStadiumName };
}

/* ── Render principal ── */

function renderAnaliticaEstadios() {
  const summaryEl = document.getElementById('ae-summary');
  const content = document.getElementById('ae-content');
  if (!content || !summaryEl) return;

  if (analiticaEstadiosState.stadiumsUnavailable) {
    summaryEl.innerHTML = '';
    content.innerHTML = renderAeStadiumsErrorState();
    return;
  }

  if (!analiticaEstadiosState.stadiums) {
    summaryEl.innerHTML = '<div class="rg-summary-skeleton"></div>';
    content.innerHTML = renderAeSkeleton();
    return;
  }

  const stats = computeAnaliticaEstadiosStats();
  const summary = computeAnaliticaEstadiosSummary(stats);
  summaryEl.innerHTML = renderAeSummaryCard(summary);

  const maxCapacity = Math.max(...stats.map(e => e.stadium.capacity));
  const maxMatches = analiticaEstadiosState.games
    ? Math.max(1, ...stats.map(e => e.matches))
    : 1;

  content.innerHTML = `
    ${renderAeGamesNotice()}
    <div class="ae-chart" role="list" aria-label="Estadios ordenados por asistencia potencial">
      ${stats.map((entry, index) => renderAeStadiumRow(entry, index + 1, maxCapacity, maxMatches)).join('')}
    </div>
  `;
}

/* ── Bloques de UI ── */

function renderAeGamesNotice() {
  if (analiticaEstadiosState.gamesUnavailable) {
    return `
      <div class="ae-notice offline" role="status">
        No se pudieron cargar los partidos. Mostrando solo la capacidad de los estadios.
        <button type="button" class="btn-retry" id="ae-retry-games">Reintentar</button>
      </div>
    `;
  }
  if (!analiticaEstadiosState.games) {
    return '<div class="ae-notice loading" role="status">Esperando datos de partidos…</div>';
  }
  return '';
}

function renderAeSummaryCard(summary) {
  return `
    <div class="rg-summary-card">
      <div class="rg-summary-stat">
        <span class="rg-summary-label">Estadios</span>
        <span class="rg-summary-value">${summary.count}</span>
      </div>
      <div class="rg-summary-divider" aria-hidden="true"></div>
      <div class="rg-summary-stat">
        <span class="rg-summary-label">Capacidad total</span>
        <span class="rg-summary-value">${summary.totalCapacity.toLocaleString('es-CR')}</span>
      </div>
      <div class="rg-summary-divider" aria-hidden="true"></div>
      <div class="rg-summary-stat">
        <span class="rg-summary-label">Mayor asistencia potencial</span>
        <span class="rg-summary-value">${summary.topStadiumName}</span>
      </div>
    </div>
  `;
}

function renderAeSkeleton() {
  return `<div class="ae-chart">${Array.from({ length: 6 }).map(() => '<div class="rg-skeleton-card ae-skeleton-row"></div>').join('')}</div>`;
}

function renderAeStadiumsErrorState() {
  return renderStateBlock({
    error: true,
    icon: RC_ICON_ALERT,
    title: 'No se pudo construir la gráfica',
    message: 'Los estadios no están disponibles en este momento.',
    action: { label: 'Reintentar', id: 'ae-retry-stadiums' },
  });
}

// Barra generada manualmente con SVG (sin librerías): un <rect> de fondo y un
// <rect> de relleno cuyo ancho representa el porcentaje del valor máximo.
function renderAeSvgBar(percent, modifierClass) {
  const width = 200;
  const height = 10;
  const fillWidth = Math.max(2, Math.round((Math.min(100, Math.max(0, percent)) / 100) * width));
  return `
    <svg class="ae-bar-svg ${modifierClass}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-hidden="true">
      <rect class="ae-bar-track" x="0" y="0" width="${width}" height="${height}" rx="${height / 2}"></rect>
      <rect class="ae-bar-fill" x="0" y="0" width="${fillWidth}" height="${height}" rx="${height / 2}"></rect>
    </svg>
  `;
}

function renderAeStadiumRow(entry, rank, maxCapacity, maxMatches) {
  const { stadium, matches, potential } = entry;
  const isFeatured = rank === 1 && analiticaEstadiosState.games;

  const capacityPercent = (stadium.capacity / maxCapacity) * 100;
  const matchesPercent = matches !== null ? (matches / maxMatches) * 100 : 0;

  const matchesBlock = matches !== null
    ? `${renderAeSvgBar(matchesPercent, 'ae-bar-matches')}<span class="ae-metric-value">${matches} partido${matches === 1 ? '' : 's'}</span>`
    : '<span class="ae-metric-pending">esperando datos de partidos…</span>';

  return `
    <div class="ae-row ${isFeatured ? 'ae-row-featured' : ''}" role="listitem"
      aria-label="${stadium.name_en}, ${stadium.city_en}, capacidad ${stadium.capacity}${matches !== null ? `, ${matches} partidos, asistencia potencial ${potential}` : ''}">
      <div class="ae-row-head">
        <span class="ae-rank">#${rank}</span>
        <div class="ae-row-titles">
          <span class="ae-name">${stadium.name_en}</span>
          <span class="ae-city">${stadium.city_en}, ${stadium.country_en}</span>
        </div>
        ${isFeatured ? '<span class="badge badge-primary">Mayor asistencia potencial</span>' : ''}
      </div>
      <div class="ae-metrics">
        <div class="ae-metric">
          <span class="ae-metric-label">Capacidad</span>
          ${renderAeSvgBar(capacityPercent, 'ae-bar-capacity')}
          <span class="ae-metric-value">${stadium.capacity.toLocaleString('es-CR')}</span>
        </div>
        <div class="ae-metric">
          <span class="ae-metric-label">Partidos albergados</span>
          ${matchesBlock}
        </div>
      </div>
      <div class="ae-potential">
        <span class="ae-potential-label">Asistencia potencial</span>
        <span class="ae-potential-value">${potential !== null ? potential.toLocaleString('es-CR') : '—'}</span>
      </div>
    </div>
  `;
}
