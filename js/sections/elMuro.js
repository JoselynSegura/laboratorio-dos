// Fase 5: El Muro

const elMuroState = {
  built: false,
  groups: null,
  groupsUnavailable: false,
  teams: null,
  teamsUnavailable: false,
  games: null,
  gamesUnavailable: false,
  filter: 'all',
};

function initElMuro() {
  if (elMuroState.built) return;
  elMuroState.built = true;

  buildElMuroShell();
  renderElMuroRanking();
  loadElMuroGroups();
  loadElMuroTeams();
  loadElMuroGames();
}

function buildElMuroShell() {
  const section = document.getElementById('el-muro');
  const wrapper = document.createElement('div');
  wrapper.className = 'em-wrapper';
  wrapper.innerHTML = `
    <div class="rc-hero">
      <p class="rc-hero-eyebrow">Copa Mundial FIFA 2026</p>
      <h2 class="rc-hero-title">El Muro</h2>
      <p class="rc-hero-sub">Las selecciones con la defensa más sólida del Mundial FIFA 2026.</p>
    </div>

    <div id="em-summary"></div>

    <div class="rg-filters" id="em-filters" role="group" aria-label="Filtrar equipos por goles recibidos">
      <button type="button" class="chip em-filter-chip" data-filter="all" aria-pressed="true">Todos</button>
      <button type="button" class="chip em-filter-chip" data-filter="top3" aria-pressed="false">Top 3</button>
      <button type="button" class="chip em-filter-chip" data-filter="gc0" aria-pressed="false">GC = 0</button>
      <button type="button" class="chip em-filter-chip" data-filter="gc1" aria-pressed="false">GC = 1</button>
      <button type="button" class="chip em-filter-chip" data-filter="gc2" aria-pressed="false">GC = 2</button>
    </div>

    <div id="em-groups-countdown" class="rc-search-status" aria-live="polite"></div>
    <div id="em-teams-countdown" class="rc-search-status" aria-live="polite"></div>
    <div id="em-games-countdown" class="rc-search-status" aria-live="polite"></div>

    <div id="em-content" aria-live="polite"></div>
  `;
  section.appendChild(wrapper);

  setupElMuroControls();
  document.getElementById('em-content').addEventListener('click', handleElMuroContentClick);
}

/* ── Carga de datos (fetch + resiliencia ya la maneja fetcher.js) ── */

async function loadElMuroGroups() {
  const result = await getGroups({ countdownContainerId: 'em-groups-countdown' });
  if (result.data) {
    elMuroState.groups = result.data.groups;
  } else {
    elMuroState.groupsUnavailable = true;
  }
  renderElMuroRanking();
}

async function loadElMuroTeams() {
  const result = await getTeams({ countdownContainerId: 'em-teams-countdown' });
  if (result.data) {
    elMuroState.teams = result.data.teams;
  } else {
    elMuroState.teamsUnavailable = true;
  }
  renderElMuroRanking();
}

async function loadElMuroGames() {
  const result = await getGames({ countdownContainerId: 'em-games-countdown' });
  if (result.data) {
    elMuroState.games = result.data.games;
  } else {
    elMuroState.gamesUnavailable = true;
  }
  renderElMuroRanking();
}

/* ── Helpers de datos ── */

function findElMuroTeamById(teamId) {
  return findById(elMuroState.teams, teamId);
}

function findElMuroGroupForTeam(teamId) {
  if (!elMuroState.groups) return null;
  const group = elMuroState.groups.find(g => g.teams.some(t => t.team_id === teamId));
  return group ? group.name : null;
}

function formatElMuroDate(rawDate) {
  return formatMatchDate(rawDate);
}

/* ── Lógica de negocio (idéntica a la versión original) ── */

function computeElMuroTopFive() {
  const entries = [];
  elMuroState.groups.forEach(group => {
    group.teams.forEach(t => entries.push({ teamId: t.team_id, ga: Number(t.ga) }));
  });
  entries.sort((a, b) => a.ga - b.ga);
  return entries.slice(0, 5);
}

// Misma búsqueda de próximo rival que la versión original (filtro + orden + resolución de
// nombre), solo que ahora retorna datos en vez de HTML para poder pintar una mini tarjeta.
function getElMuroNextMatch(teamId) {
  if (elMuroState.gamesUnavailable) return { status: 'unavailable' };
  if (!elMuroState.games) return { status: 'loading' };

  const upcoming = elMuroState.games
    .filter(g => (g.home_team_id === teamId || g.away_team_id === teamId) && g.finished === 'FALSE')
    .sort((a, b) => new Date(a.local_date) - new Date(b.local_date));

  if (upcoming.length === 0) return { status: 'none' };

  const next = upcoming[0];
  const isHome = next.home_team_id === teamId;
  const opponentId = isHome ? next.away_team_id : next.home_team_id;
  const opponent = findElMuroTeamById(opponentId);
  const opponentName = opponent
    ? opponent.name_en
    : (isHome ? next.away_team_name_en : next.home_team_name_en);

  return {
    status: 'ready',
    isHome,
    opponentName,
    opponentFlag: opponent ? opponent.flag : null,
    date: next.local_date,
  };
}

function computeElMuroSummaryStats(topFive) {
  const gaValues = topFive.map(e => e.ga);
  return {
    count: topFive.length,
    min: Math.min(...gaValues),
    avg: (gaValues.reduce((sum, v) => sum + v, 0) / gaValues.length).toFixed(1),
  };
}

function computeElMuroBarFill(ga, maxGa) {
  if (maxGa === 0) return 100;
  return Math.round((1 - ga / maxGa) * 100);
}

/* ── Filtro de vista (solo presentación, no recalcula el Top 5) ── */

function applyElMuroFilter(topFive) {
  switch (elMuroState.filter) {
    case 'top3': return topFive.slice(0, 3);
    case 'gc0':  return topFive.filter(e => e.ga === 0);
    case 'gc1':  return topFive.filter(e => e.ga === 1);
    case 'gc2':  return topFive.filter(e => e.ga === 2);
    default:     return topFive;
  }
}

/* ── Controles (chips de filtro) ── */

function setupElMuroControls() {
  document.getElementById('em-filters').addEventListener('click', event => {
    const chip = event.target.closest('.em-filter-chip');
    if (!chip) return;

    elMuroState.filter = chip.dataset.filter;
    document.querySelectorAll('.em-filter-chip').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn === chip));
    });
    renderElMuroRanking();
  });
}

function clearElMuroFilter() {
  elMuroState.filter = 'all';
  document.querySelectorAll('.em-filter-chip').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.filter === 'all'));
  });
  renderElMuroRanking();
}

function handleElMuroContentClick(event) {
  const retryBtn = event.target.closest('#em-retry-groups');
  if (retryBtn) { loadElMuroGroups(); return; }

  const clearBtn = event.target.closest('#em-clear-filter');
  if (clearBtn) { clearElMuroFilter(); }
}

/* ── Render principal ── */

function renderElMuroRanking() {
  const summaryEl = document.getElementById('em-summary');
  const content = document.getElementById('em-content');
  if (!content || !summaryEl) return;

  if (elMuroState.groupsUnavailable) {
    summaryEl.innerHTML = '';
    content.innerHTML = renderElMuroErrorState();
    return;
  }

  if (!elMuroState.groups) {
    summaryEl.innerHTML = '<div class="rg-summary-skeleton"></div>';
    content.innerHTML = renderElMuroSkeleton();
    return;
  }

  const topFive = computeElMuroTopFive().map((entry, index) => ({ ...entry, rank: index + 1 }));
  const maxGa = Math.max(...topFive.map(e => e.ga));
  const stats = computeElMuroSummaryStats(topFive);
  summaryEl.innerHTML = renderElMuroSummaryCard(stats);

  const filtered = applyElMuroFilter(topFive);

  if (filtered.length === 0) {
    content.innerHTML = renderElMuroNoResultsState();
    return;
  }

  content.innerHTML = `<div class="em-grid">${filtered.map(entry => renderElMuroCard(entry, maxGa)).join('')}</div>`;
}

/* ── Bloques de UI ── */

function renderElMuroSummaryCard(stats) {
  return `
    <div class="rg-summary-card">
      <div class="rg-summary-stat">
        <span class="rg-summary-label">Mejores defensas</span>
        <span class="rg-summary-value">Top ${stats.count}</span>
      </div>
      <div class="rg-summary-divider" aria-hidden="true"></div>
      <div class="rg-summary-stat">
        <span class="rg-summary-label">GC mínimo</span>
        <span class="rg-summary-value">${stats.min}</span>
      </div>
      <div class="rg-summary-divider" aria-hidden="true"></div>
      <div class="rg-summary-stat">
        <span class="rg-summary-label">Promedio GC</span>
        <span class="rg-summary-value">${stats.avg}</span>
      </div>
    </div>
  `;
}

function renderElMuroSkeleton() {
  return `<div class="em-grid">${Array.from({ length: 5 }).map(() => '<div class="rg-skeleton-card"></div>').join('')}</div>`;
}

function renderElMuroErrorState() {
  return renderStateBlock({
    error: true,
    icon: RC_ICON_ALERT,
    title: 'No se pudo construir el ranking',
    message: 'Los grupos no están disponibles en este momento.',
    action: { label: 'Reintentar', id: 'em-retry-groups' },
  });
}

function renderElMuroNoResultsState() {
  return renderStateBlock({
    icon: RC_ICON_SEARCH,
    title: 'Sin resultados',
    message: 'Ningún equipo del Top 5 coincide con este filtro.',
    action: { label: 'Limpiar filtro', id: 'em-clear-filter', className: 'rc-btn-clear' },
  });
}

function renderElMuroNextMatchBlock(teamId, team) {
  const match = getElMuroNextMatch(teamId);

  if (match.status === 'unavailable') {
    return '<div class="em-next-match"><span class="offline">Próximo rival no disponible</span></div>';
  }
  if (match.status === 'loading') {
    return '<p class="loading">Buscando próximo partido…</p>';
  }
  if (match.status === 'none') {
    return `
      <div class="em-next-match em-next-match-empty">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>
        <span>Sin partidos pendientes</span>
      </div>
    `;
  }

  const teamName = team ? team.name_en : 'Este equipo';
  const teamFlag = team ? `<img class="rc-crest" src="${team.flag}" alt="Bandera de ${teamName}">` : '<div class="rc-crest-placeholder"></div>';
  const oppFlag = match.opponentFlag
    ? `<img class="rc-crest" src="${match.opponentFlag}" alt="Bandera de ${match.opponentName}">`
    : '<div class="rc-crest-placeholder"></div>';

  const teamSlot = `<div class="rc-team-slot">${teamFlag}<span class="rc-team-name">${teamName}</span></div>`;
  const oppSlot = `<div class="rc-team-slot">${oppFlag}<span class="rc-team-name">${match.opponentName}</span></div>`;

  return `
    <div class="em-next-match">
      <p class="em-next-match-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Próximo partido
      </p>
      <div class="em-next-match-teams">
        ${match.isHome ? teamSlot : oppSlot}
        <span class="rc-vs">VS</span>
        ${match.isHome ? oppSlot : teamSlot}
      </div>
      <p class="em-next-match-date">${formatElMuroDate(match.date)}</p>
    </div>
  `;
}

// Si algo falla al procesar un equipo puntual (dato corrupto, cruce inesperado), el catch
// muestra "Próximo rival no disponible" sin afectar a los otros equipos del ranking.
function renderElMuroCard(entry, maxGa) {
  try {
    const { teamId, ga, rank } = entry;
    const isFeatured = rank === 1;
    const isElite = ga === 0;

    const team = findElMuroTeamById(teamId);
    const teamNameHtml = team
      ? `<span class="em-team-name">${team.name_en}</span>`
      : `<span class="em-team-name em-team-fallback">Equipo #${teamId}</span>`;
    const flagHtml = team
      ? `<img class="rc-crest ${isFeatured ? 'em-flag-lg' : ''}" src="${team.flag}" alt="Bandera de ${team.name_en}">`
      : `<div class="rc-crest-placeholder ${isFeatured ? 'em-flag-lg' : ''}"></div>`;

    const groupName = findElMuroGroupForTeam(teamId);
    const badges = [];
    if (isElite) {
      badges.push('<span class="badge badge-success"><svg class="em-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Defensa Élite</span>');
    }
    if (groupName) {
      badges.push(`<span class="badge badge-neutral">Grupo ${groupName}</span>`);
    }

    const fillPercent = computeElMuroBarFill(ga, maxGa);

    return `
      <article class="em-card ${isFeatured ? 'em-card-featured' : ''}" tabindex="0"
        aria-label="${team ? team.name_en : 'Equipo #' + teamId}, posición ${rank} en defensa, ${ga} goles recibidos">
        <div class="em-card-top">
          <span class="em-rank">#${rank}</span>
          ${isFeatured ? '<span class="em-crown-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9 12 2"/></svg>Mejor Defensa</span>' : ''}
        </div>
        <div class="em-team-block">
          ${flagHtml}
          ${teamNameHtml}
        </div>
        <div class="em-metric">
          <span class="em-metric-label">Goles recibidos</span>
          <span class="em-metric-value ${isElite ? 'em-metric-elite' : ''}">${ga}</span>
          <div class="em-defense-bar"><div class="em-defense-bar-fill" style="width:${fillPercent}%"></div></div>
        </div>
        ${badges.length ? `<div class="em-card-badges">${badges.join('')}</div>` : ''}
        ${renderElMuroNextMatchBlock(teamId, team)}
      </article>
    `;
  } catch (error) {
    return `
      <article class="em-card">
        <div class="em-card-top"><span class="em-rank">#${entry.rank}</span></div>
        <div class="em-next-match"><span class="offline">Próximo rival no disponible</span></div>
      </article>
    `;
  }
}
