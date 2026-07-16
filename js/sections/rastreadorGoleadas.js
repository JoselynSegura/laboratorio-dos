// Fase 4: Rastreador de Goleadas

const rastreadorGoleadasState = {
  built: false,
  games: null,
  gamesUnavailable: false,
  teams: null,
  teamsUnavailable: false,
  stadiums: null,
  stadiumsUnavailable: false,
  searchQuery: '',
  diffFilter: 3,
};

function initRastreadorGoleadas() {
  if (rastreadorGoleadasState.built) return;
  rastreadorGoleadasState.built = true;

  buildRastreadorGoleadasShell();
  renderRastreadorGoleadas();
  loadRastreadorGoleadasGames();
  loadRastreadorGoleadasTeams();
  loadRastreadorGoleadasStadiums();
}

function buildRastreadorGoleadasShell() {
  const section = document.getElementById('rastreador-goleadas');
  const wrapper = document.createElement('div');
  wrapper.className = 'rg-wrapper';
  wrapper.innerHTML = `
    <div class="rg-hero">
      <p class="rg-hero-eyebrow">Copa Mundial FIFA 2026</p>
      <h2 class="rg-hero-title">Rastreador de Goleadas</h2>
      <p class="rg-hero-sub">Descubre los partidos más contundentes del Mundial, ordenados por la mayor diferencia de goles.</p>
    </div>

    <div id="rg-summary"></div>

    <div class="rg-toolbar">
      <div class="rc-search" role="search">
        <label for="rg-search-input" class="sr-only">Buscar por selección, rival, estadio o ciudad</label>
        <div class="rc-search-input-wrap">
          <svg class="rc-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input id="rg-search-input" class="rc-search-input" type="text" autocomplete="off" placeholder="Buscar una selección…">
        </div>
      </div>
      <div class="rg-filters" id="rg-filters" role="group" aria-label="Filtrar por diferencia de goles">
        <button type="button" class="chip rg-filter-chip" data-diff="3" aria-pressed="true">Todos</button>
        <button type="button" class="chip rg-filter-chip" data-diff="4" aria-pressed="false">Diferencia 4+</button>
        <button type="button" class="chip rg-filter-chip" data-diff="5" aria-pressed="false">Diferencia 5+</button>
        <button type="button" class="chip rg-filter-chip" data-diff="6" aria-pressed="false">Diferencia 6+</button>
      </div>
    </div>

    <div id="rg-games-countdown" class="rc-search-status" aria-live="polite"></div>
    <div id="rg-teams-countdown" class="rc-search-status" aria-live="polite"></div>
    <div id="rg-stadiums-countdown" class="rc-search-status" aria-live="polite"></div>

    <div id="rg-content" aria-live="polite"></div>
  `;
  section.appendChild(wrapper);

  setupRastreadorGoleadasControls();
  document.getElementById('rg-content').addEventListener('click', handleRastreadorGoleadasContentClick);
}

/* ── Carga de datos (fetch + resiliencia ya la maneja fetcher.js) ── */

async function loadRastreadorGoleadasGames() {
  const result = await getGames({ countdownContainerId: 'rg-games-countdown' });
  rastreadorGoleadasState.games = result.data ? result.data.games : null;
  rastreadorGoleadasState.gamesUnavailable = !rastreadorGoleadasState.games;
  renderRastreadorGoleadas();
}

async function loadRastreadorGoleadasTeams() {
  const result = await getTeams({ countdownContainerId: 'rg-teams-countdown' });
  if (result.data) {
    rastreadorGoleadasState.teams = result.data.teams;
  } else {
    rastreadorGoleadasState.teamsUnavailable = true;
  }
  renderRastreadorGoleadas();
}

async function loadRastreadorGoleadasStadiums() {
  const result = await getStadiums({ countdownContainerId: 'rg-stadiums-countdown' });
  if (result.data) {
    rastreadorGoleadasState.stadiums = result.data.stadiums;
  } else {
    rastreadorGoleadasState.stadiumsUnavailable = true;
  }
  renderRastreadorGoleadas();
}

/* ── Helpers de datos ── */

function findRastreadorTeamById(teamId) {
  return findById(rastreadorGoleadasState.teams, teamId);
}

function findRastreadorStadiumById(stadiumId) {
  return findById(rastreadorGoleadasState.stadiums, stadiumId);
}

function formatRastreadorDate(rawDate) {
  return formatMatchDate(rawDate, { withTime: false });
}

function renderRastreadorPhaseLabel(groupCode) {
  return getPhaseLabel(groupCode);
}

/* ── Lógica de negocio (sin cambios respecto a la versión original) ── */

function computeBlowouts() {
  return rastreadorGoleadasState.games
    .filter(g => g.finished === 'TRUE')
    .map(g => ({ game: g, diff: Math.abs(Number(g.home_score) - Number(g.away_score)) }))
    .filter(entry => entry.diff >= 3)
    .sort((a, b) => b.diff - a.diff);
}

function computeSummaryStats(blowouts) {
  if (blowouts.length === 0) return { count: 0, max: 0, avg: '0.0' };
  const diffs = blowouts.map(b => b.diff);
  return {
    count: blowouts.length,
    max: Math.max(...diffs),
    avg: (diffs.reduce((sum, d) => sum + d, 0) / diffs.length).toFixed(1),
  };
}

/* ── Filtros de vista (búsqueda + chip de diferencia) ── */

function matchesRastreadorSearch(game, query) {
  const home = findRastreadorTeamById(game.home_team_id);
  const away = findRastreadorTeamById(game.away_team_id);
  const homeName = (home ? home.name_en : (game.home_team_name_en || '')).toLowerCase();
  const awayName = (away ? away.name_en : (game.away_team_name_en || '')).toLowerCase();
  const stadium = findRastreadorStadiumById(game.stadium_id);
  const stadiumName = stadium ? stadium.name_en.toLowerCase() : '';
  const cityName = stadium ? stadium.city_en.toLowerCase() : '';

  return homeName.includes(query) || awayName.includes(query) ||
    stadiumName.includes(query) || cityName.includes(query);
}

function applyRastreadorFilters(blowouts) {
  let filtered = blowouts;

  if (rastreadorGoleadasState.diffFilter > 3) {
    filtered = filtered.filter(entry => entry.diff >= rastreadorGoleadasState.diffFilter);
  }

  const query = rastreadorGoleadasState.searchQuery.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(entry => matchesRastreadorSearch(entry.game, query));
  }

  return filtered;
}

/* ── Controles (búsqueda + chips) ── */

function setupRastreadorGoleadasControls() {
  const searchInput = document.getElementById('rg-search-input');
  searchInput.addEventListener('input', () => {
    rastreadorGoleadasState.searchQuery = searchInput.value;
    renderRastreadorGoleadas();
  });

  document.getElementById('rg-filters').addEventListener('click', event => {
    const chip = event.target.closest('.rg-filter-chip');
    if (!chip) return;

    rastreadorGoleadasState.diffFilter = Number(chip.dataset.diff);
    document.querySelectorAll('.rg-filter-chip').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn === chip));
    });
    renderRastreadorGoleadas();
  });
}

function clearRastreadorFilters() {
  rastreadorGoleadasState.searchQuery = '';
  rastreadorGoleadasState.diffFilter = 3;

  const input = document.getElementById('rg-search-input');
  if (input) input.value = '';

  document.querySelectorAll('.rg-filter-chip').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.diff === '3'));
  });

  renderRastreadorGoleadas();
}

function handleRastreadorGoleadasContentClick(event) {
  const retryBtn = event.target.closest('#rg-retry-games');
  if (retryBtn) { loadRastreadorGoleadasGames(); return; }

  const clearBtn = event.target.closest('#rg-clear-filters');
  if (clearBtn) { clearRastreadorFilters(); }
}

/* ── Render principal ── */

function renderRastreadorGoleadas() {
  const summaryEl = document.getElementById('rg-summary');
  const content = document.getElementById('rg-content');
  if (!content || !summaryEl) return;

  if (rastreadorGoleadasState.gamesUnavailable) {
    summaryEl.innerHTML = '';
    content.innerHTML = renderGamesErrorState();
    return;
  }

  if (!rastreadorGoleadasState.games) {
    summaryEl.innerHTML = '<div class="rg-summary-skeleton"></div>';
    content.innerHTML = renderCardsSkeleton();
    return;
  }

  const blowouts = computeBlowouts();
  const stats = computeSummaryStats(blowouts);
  summaryEl.innerHTML = renderSummaryCard(stats);

  if (blowouts.length === 0) {
    content.innerHTML = renderNoBlowoutsState();
    return;
  }

  const filtered = applyRastreadorFilters(blowouts);

  if (filtered.length === 0) {
    content.innerHTML = renderNoSearchResultsState();
    return;
  }

  content.innerHTML = `<div class="rg-grid">${filtered.map((entry, index) => renderBlowoutCard(entry, index)).join('')}</div>`;
}

/* ── Bloques de UI ── */

function renderSummaryCard(stats) {
  return `
    <div class="rg-summary-card">
      <div class="rg-summary-stat">
        <span class="rg-summary-label">Goleadas encontradas</span>
        <span class="rg-summary-value">${stats.count} partido${stats.count === 1 ? '' : 's'}</span>
      </div>
      <div class="rg-summary-divider" aria-hidden="true"></div>
      <div class="rg-summary-stat">
        <span class="rg-summary-label">Mayor diferencia</span>
        <span class="rg-summary-value">${stats.max} goles</span>
      </div>
      <div class="rg-summary-divider" aria-hidden="true"></div>
      <div class="rg-summary-stat">
        <span class="rg-summary-label">Promedio</span>
        <span class="rg-summary-value">${stats.avg} goles</span>
      </div>
    </div>
  `;
}

function renderCardsSkeleton() {
  return `
    <div class="rg-grid">
      ${Array.from({ length: 6 }).map(() => '<div class="rg-skeleton-card"></div>').join('')}
    </div>
  `;
}

function renderGamesErrorState() {
  return renderStateBlock({
    error: true,
    icon: RC_ICON_ALERT,
    title: 'No se pudieron cargar los partidos',
    message: 'Revisa tu conexión e intenta de nuevo.',
    action: { label: 'Reintentar', id: 'rg-retry-games' },
  });
}

function renderNoBlowoutsState() {
  return renderStateBlock({
    icon: RC_ICON_EMPTY,
    title: 'Todavía no hay goleadas',
    message: 'Ningún partido terminado tiene una diferencia de 3 goles o más por ahora.',
  });
}

function renderNoSearchResultsState() {
  return renderStateBlock({
    icon: RC_ICON_SEARCH,
    title: 'Sin resultados',
    message: 'No hay goleadas que coincidan con tu búsqueda o filtro actual.',
    action: { label: 'Limpiar filtros', id: 'rg-clear-filters', className: 'rc-btn-clear' },
  });
}

function renderBlowoutCard(entry, index) {
  const { game, diff } = entry;
  const isFeatured = index === 0;

  const homeTeam = findRastreadorTeamById(game.home_team_id);
  const awayTeam = findRastreadorTeamById(game.away_team_id);
  const homeName = homeTeam ? homeTeam.name_en : (game.home_team_name_en || 'Equipo por confirmar');
  const awayName = awayTeam ? awayTeam.name_en : (game.away_team_name_en || 'Equipo por confirmar');
  const homeCrest = homeTeam
    ? `<img class="rc-crest" src="${homeTeam.flag}" alt="Bandera de ${homeName}">`
    : '<div class="rc-crest-placeholder"></div>';
  const awayCrest = awayTeam
    ? `<img class="rc-crest" src="${awayTeam.flag}" alt="Bandera de ${awayName}">`
    : '<div class="rc-crest-placeholder"></div>';

  const stadium = findRastreadorStadiumById(game.stadium_id);
  const metaBadges = [];
  if (stadium) {
    metaBadges.push(`<span class="badge badge-neutral"><svg class="rg-meta-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${stadium.name_en}</span>`);
    metaBadges.push(`<span class="badge badge-neutral"><svg class="rg-meta-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1m-6 4h1m4 0h1"/></svg>${stadium.city_en}</span>`);
  }
  metaBadges.push(`<span class="badge badge-neutral"><svg class="rg-meta-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${formatRastreadorDate(game.local_date)}</span>`);
  metaBadges.push(`<span class="badge badge-primary">${renderRastreadorPhaseLabel(game.group)}</span>`);

  return `
    <article class="rg-card ${isFeatured ? 'rg-card-featured' : ''}" tabindex="0"
      aria-label="${homeName} ${game.home_score} contra ${game.away_score} ${awayName}, diferencia de ${diff} goles">
      <div class="rg-card-top">
        <span class="rg-rank">#${index + 1}</span>
        ${isFeatured ? '<span class="rg-featured-badge">🏆 Mayor goleada</span>' : ''}
        <span class="rg-diff-badge">+${diff} GOLES</span>
      </div>
      <div class="rg-card-matchup">
        <div class="rg-team-col">${homeCrest}<span class="rg-team-name">${homeName}</span></div>
        <div class="rg-score-block">
          <span class="rg-score">${game.home_score} — ${game.away_score}</span>
          <span class="rg-vs">VS</span>
        </div>
        <div class="rg-team-col">${awayCrest}<span class="rg-team-name">${awayName}</span></div>
      </div>
      <div class="rg-card-meta">${metaBadges.join('')}</div>
    </article>
  `;
}
