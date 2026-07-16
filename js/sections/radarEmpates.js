// Fase 7: Radar de Empates

const radarEmpatesState = {
  built: false,
  games: null,
  gamesUnavailable: false,
  teams: null,
  teamsUnavailable: false,
  groupFilter: 'all',
};

function initRadarEmpates() {
  if (radarEmpatesState.built) return;
  radarEmpatesState.built = true;

  buildRadarEmpatesShell();
  renderRadarEmpates();
  loadRadarEmpatesGames();
  loadRadarEmpatesTeams();
}

function buildRadarEmpatesShell() {
  const section = document.getElementById('radar-empates');
  const wrapper = document.createElement('div');
  wrapper.className = 'rd-wrapper';
  wrapper.innerHTML = `
    <div class="rc-hero">
      <p class="rc-hero-eyebrow">Copa Mundial FIFA 2026</p>
      <h2 class="rc-hero-title">Radar de Empates</h2>
      <p class="rc-hero-sub">Todos los partidos terminados en empate, agrupados por su grupo de fase de grupos (A–L).</p>
    </div>

    <div id="rd-summary"></div>

    <div class="rg-filters" id="rd-filters" role="group" aria-label="Filtrar por grupo">
      <button type="button" class="chip rd-filter-chip" data-group="all" aria-pressed="true">Todos</button>
      ${GROUP_STAGE_CODES.map(code => `<button type="button" class="chip rd-filter-chip" data-group="${code}" aria-pressed="false">Grupo ${code}</button>`).join('')}
    </div>

    <div id="rd-games-countdown" class="rc-search-status" aria-live="polite"></div>
    <div id="rd-teams-countdown" class="rc-search-status" aria-live="polite"></div>

    <div id="rd-content" aria-live="polite"></div>
  `;
  section.appendChild(wrapper);

  setupRadarEmpatesControls();
  document.getElementById('rd-content').addEventListener('click', handleRadarEmpatesContentClick);
}

/* ── Carga de datos (fetch + resiliencia ya la maneja fetcher.js) ── */

async function loadRadarEmpatesGames() {
  const result = await getGames({ countdownContainerId: 'rd-games-countdown' });
  if (result.data) {
    radarEmpatesState.games = result.data.games;
  } else {
    radarEmpatesState.gamesUnavailable = true;
  }
  renderRadarEmpates();
}

async function loadRadarEmpatesTeams() {
  const result = await getTeams({ countdownContainerId: 'rd-teams-countdown' });
  if (result.data) {
    radarEmpatesState.teams = result.data.teams;
  } else {
    radarEmpatesState.teamsUnavailable = true;
  }
  renderRadarEmpates();
}

/* ── Helpers de datos ── */

function findRadarTeamById(teamId) {
  return findById(radarEmpatesState.teams, teamId);
}

/* ── Lógica de negocio ── */

function computeRadarGroups() {
  const ties = radarEmpatesState.games.filter(g =>
    g.finished === 'TRUE' && Number(g.home_score) === Number(g.away_score) && GROUP_STAGE_CODES.includes(g.group));

  return GROUP_STAGE_CODES.map(code => ({
    code,
    ties: ties.filter(g => g.group === code),
  }));
}

function computeRadarSummary(groups) {
  const totalTies = groups.reduce((sum, g) => sum + g.ties.length, 0);
  const groupsWithTies = groups.filter(g => g.ties.length > 0).length;
  const leader = groups.reduce((best, g) => (g.ties.length > best.ties.length ? g : best), groups[0]);
  return {
    totalTies,
    groupsWithTies,
    leaderLabel: leader.ties.length > 0 ? `Grupo ${leader.code}` : '—',
  };
}

/* ── Filtro de vista ── */

function applyRadarFilter(groups) {
  if (radarEmpatesState.groupFilter === 'all') return groups;
  return groups.filter(g => g.code === radarEmpatesState.groupFilter);
}

/* ── Controles (chips de grupo) ── */

function setupRadarEmpatesControls() {
  document.getElementById('rd-filters').addEventListener('click', event => {
    const chip = event.target.closest('.rd-filter-chip');
    if (!chip) return;

    radarEmpatesState.groupFilter = chip.dataset.group;
    document.querySelectorAll('.rd-filter-chip').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn === chip));
    });
    renderRadarEmpates();
  });
}

function handleRadarEmpatesContentClick(event) {
  const retryBtn = event.target.closest('#rd-retry-games');
  if (retryBtn) { loadRadarEmpatesGames(); }
}

/* ── Render principal ── */

function renderRadarEmpates() {
  const summaryEl = document.getElementById('rd-summary');
  const content = document.getElementById('rd-content');
  if (!content || !summaryEl) return;

  if (radarEmpatesState.gamesUnavailable) {
    summaryEl.innerHTML = '';
    content.innerHTML = renderRadarErrorState();
    return;
  }

  if (!radarEmpatesState.games) {
    summaryEl.innerHTML = '<div class="rg-summary-skeleton"></div>';
    content.innerHTML = renderRadarSkeleton();
    return;
  }

  const groups = computeRadarGroups();
  const summary = computeRadarSummary(groups);
  summaryEl.innerHTML = renderRadarSummaryCard(summary);

  const filtered = applyRadarFilter(groups);
  const teamsNotice = radarEmpatesState.teamsUnavailable
    ? '<div class="offline">No se pudieron cargar los equipos — mostrando nombres de respaldo.</div>'
    : '';

  content.innerHTML = `
    ${teamsNotice}
    <div class="rd-matrix" role="list">${filtered.map(renderRadarGroupCard).join('')}</div>
  `;
}

/* ── Bloques de UI ── */

function renderRadarSummaryCard(summary) {
  return `
    <div class="rg-summary-card">
      <div class="rg-summary-stat">
        <span class="rg-summary-label">Empates encontrados</span>
        <span class="rg-summary-value">${summary.totalTies}</span>
      </div>
      <div class="rg-summary-divider" aria-hidden="true"></div>
      <div class="rg-summary-stat">
        <span class="rg-summary-label">Grupos con empates</span>
        <span class="rg-summary-value">${summary.groupsWithTies} / ${GROUP_STAGE_CODES.length}</span>
      </div>
      <div class="rg-summary-divider" aria-hidden="true"></div>
      <div class="rg-summary-stat">
        <span class="rg-summary-label">Grupo con más empates</span>
        <span class="rg-summary-value">${summary.leaderLabel}</span>
      </div>
    </div>
  `;
}

function renderRadarSkeleton() {
  return `<div class="rd-matrix">${Array.from({ length: 6 }).map(() => '<div class="rg-skeleton-card rd-skeleton-card"></div>').join('')}</div>`;
}

function renderRadarErrorState() {
  return renderStateBlock({
    error: true,
    icon: RC_ICON_ALERT,
    title: 'No se pudo construir el radar de empates',
    message: 'Los partidos no están disponibles en este momento.',
    action: { label: 'Reintentar', id: 'rd-retry-games' },
  });
}

function renderRadarGroupCard(group) {
  return `
    <div class="rd-group-card" role="listitem">
      <div class="rd-group-head">
        <span class="rd-group-name">Grupo ${group.code}</span>
        <span class="badge ${group.ties.length > 0 ? 'badge-primary' : 'badge-neutral'}">${group.ties.length} empate${group.ties.length === 1 ? '' : 's'}</span>
      </div>
      ${group.ties.length > 0
        ? `<div class="rd-tie-list">${group.ties.map(renderRadarTieCell).join('')}</div>`
        : '<p class="rd-group-empty">Sin empates en este grupo.</p>'}
    </div>
  `;
}

function renderRadarTieCell(game) {
  const homeTeam = findRadarTeamById(game.home_team_id);
  const awayTeam = findRadarTeamById(game.away_team_id);
  const homeName = homeTeam ? homeTeam.name_en : (game.home_team_name_en || 'Equipo por confirmar');
  const awayName = awayTeam ? awayTeam.name_en : (game.away_team_name_en || 'Equipo por confirmar');
  const homeCrest = homeTeam
    ? `<img class="rc-crest" src="${homeTeam.flag}" alt="Bandera de ${homeName}">`
    : '<div class="rc-crest-placeholder"></div>';
  const awayCrest = awayTeam
    ? `<img class="rc-crest" src="${awayTeam.flag}" alt="Bandera de ${awayName}">`
    : '<div class="rc-crest-placeholder"></div>';

  return `
    <div class="rd-tie-cell" tabindex="0" aria-label="Empate entre ${homeName} y ${awayName}, ${game.home_score} a ${game.away_score}">
      <div class="rc-team-slot">${homeCrest}<span class="rc-team-name">${homeName}</span></div>
      <span class="rd-tie-score">${game.home_score} — ${game.away_score}</span>
      <div class="rc-team-slot">${awayCrest}<span class="rc-team-name">${awayName}</span></div>
    </div>
  `;
}
