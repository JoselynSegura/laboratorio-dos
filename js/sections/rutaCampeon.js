// Fase 3: La Ruta del Campeón

const rutaCampeonState = {
  built: false,
  teams: null,
  teamsUnavailable: false,
  games: null,
  gamesUnavailable: false,
  stadiums: null,
  stadiumsUnavailable: false,
  selectedTeamId: '',
  searchQuery: '',
  activeSuggestionIndex: -1,
};

function initRutaCampeon() {
  if (rutaCampeonState.built) return;
  rutaCampeonState.built = true;

  buildRutaCampeonShell();
  renderRutaCampeon();
  loadRutaCampeonTeams();
  loadRutaCampeonGames();
  loadRutaCampeonStadiums();
}

function buildRutaCampeonShell() {
  const section = document.getElementById('ruta-campeon');
  const wrapper = document.createElement('div');
  wrapper.className = 'rc-wrapper';
  wrapper.innerHTML = `
    <div class="rc-hero">
      <p class="rc-hero-eyebrow">Copa Mundial FIFA 2026</p>
      <h2 class="rc-hero-title">Ruta del Campeón</h2>
      <p class="rc-hero-sub">Explora el recorrido de cualquier selección durante la Copa Mundial FIFA 2026.</p>
    </div>

    <div class="rc-search-block">
      <div class="rc-search" role="search">
        <label for="rc-search-input" class="sr-only">Buscar selección</label>
        <div class="rc-search-input-wrap">
          <svg class="rc-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input id="rc-search-input" class="rc-search-input" type="text" autocomplete="off" disabled
                 placeholder="Cargando selecciones…"
                 role="combobox" aria-expanded="false" aria-controls="rc-search-listbox" aria-autocomplete="list">
        </div>
        <ul id="rc-search-listbox" class="rc-search-listbox hidden" role="listbox" aria-label="Selecciones sugeridas" aria-live="polite"></ul>
      </div>
      <div id="rc-teams-countdown" class="rc-search-status" aria-live="polite"></div>
      <div id="rc-games-countdown" class="rc-search-status" aria-live="polite"></div>
      <div id="rc-stadiums-countdown" class="rc-search-status" aria-live="polite"></div>
    </div>

    <div id="rc-content" aria-live="polite"></div>
  `;
  section.appendChild(wrapper);

  setupRutaCampeonSearch();
  document.getElementById('rc-content').addEventListener('click', handleRutaCampeonContentClick);
}

/* ── Carga de datos (fetch + resiliencia ya la maneja fetcher.js) ── */

async function loadRutaCampeonTeams() {
  const input = document.getElementById('rc-search-input');
  const result = await getTeams({ countdownContainerId: 'rc-teams-countdown' });
  rutaCampeonState.teams = result.data ? result.data.teams : null;
  rutaCampeonState.teamsUnavailable = !rutaCampeonState.teams;

  if (input) {
    input.disabled = !rutaCampeonState.teams;
    input.placeholder = rutaCampeonState.teams ? 'Busca una selección…' : 'Selecciones no disponibles';
  }
  renderRutaCampeon();
}

async function loadRutaCampeonGames() {
  const result = await getGames({ countdownContainerId: 'rc-games-countdown' });
  rutaCampeonState.games = result.data ? result.data.games : null;
  rutaCampeonState.gamesUnavailable = !rutaCampeonState.games;
  renderRutaCampeon();
}

async function loadRutaCampeonStadiums() {
  const result = await getStadiums({ countdownContainerId: 'rc-stadiums-countdown' });
  if (result.data) {
    rutaCampeonState.stadiums = result.data.stadiums;
  } else {
    rutaCampeonState.stadiumsUnavailable = true;
  }
  renderRutaCampeon();
}

/* ── Helpers de datos ── */

function findTeamById(teamId) {
  return findById(rutaCampeonState.teams, teamId);
}

function findStadiumById(stadiumId) {
  return findById(rutaCampeonState.stadiums, stadiumId);
}

function formatLocalDate(rawDate) {
  return formatMatchDate(rawDate);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ── Búsqueda con autocomplete (combobox ARIA) ── */

function setupRutaCampeonSearch() {
  const input = document.getElementById('rc-search-input');
  const listbox = document.getElementById('rc-search-listbox');
  if (!input || !listbox) return;

  input.addEventListener('input', () => {
    rutaCampeonState.searchQuery = input.value.trim();
    rutaCampeonState.activeSuggestionIndex = -1;
    renderSuggestions();
  });

  input.addEventListener('focus', () => {
    rutaCampeonState.activeSuggestionIndex = -1;
    if (rutaCampeonState.searchQuery) renderSuggestions();
  });

  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (listbox.classList.contains('hidden')) { renderSuggestions(); return; }
      moveActiveSuggestion(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActiveSuggestion(-1);
    } else if (event.key === 'Enter') {
      const options = listbox.querySelectorAll('.rc-option');
      if (rutaCampeonState.activeSuggestionIndex >= 0 && options[rutaCampeonState.activeSuggestionIndex]) {
        event.preventDefault();
        selectTeam(options[rutaCampeonState.activeSuggestionIndex].dataset.teamId);
      }
    } else if (event.key === 'Escape') {
      closeSuggestions();
    }
  });

  listbox.addEventListener('click', event => {
    const option = event.target.closest('.rc-option');
    if (option) selectTeam(option.dataset.teamId);
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.rc-search')) closeSuggestions();
  });
}

function moveActiveSuggestion(delta) {
  const listbox = document.getElementById('rc-search-listbox');
  const input = document.getElementById('rc-search-input');
  const options = listbox.querySelectorAll('.rc-option');
  if (!options.length) return;

  const next = Math.min(Math.max(rutaCampeonState.activeSuggestionIndex + delta, 0), options.length - 1);
  rutaCampeonState.activeSuggestionIndex = next;
  options.forEach((opt, i) => opt.classList.toggle('rc-option-active', i === next));
  input.setAttribute('aria-activedescendant', options[next].id);
  options[next].scrollIntoView({ block: 'nearest' });
}

function renderSuggestions() {
  const listbox = document.getElementById('rc-search-listbox');
  const input = document.getElementById('rc-search-input');
  if (!listbox || !input || !rutaCampeonState.teams) return;

  const query = rutaCampeonState.searchQuery.toLowerCase();
  if (!query) { closeSuggestions(); return; }

  const matches = rutaCampeonState.teams
    .filter(team => (team.name_en || '').toLowerCase().includes(query))
    .slice(0, 8);

  listbox.innerHTML = matches.length === 0
    ? `<li class="rc-option-empty">No se encontraron selecciones con “${escapeHtml(rutaCampeonState.searchQuery)}”</li>`
    : matches.map(team => `
        <li class="rc-option" role="option" id="rc-opt-${team.id}" data-team-id="${team.id}">
          <img class="rc-option-flag" src="${team.flag}" alt="Bandera de ${team.name_en}">
          ${team.name_en}
        </li>
      `).join('');

  listbox.classList.remove('hidden');
  input.setAttribute('aria-expanded', 'true');
}

function closeSuggestions() {
  const listbox = document.getElementById('rc-search-listbox');
  const input = document.getElementById('rc-search-input');
  if (listbox) { listbox.classList.add('hidden'); listbox.innerHTML = ''; }
  if (input) { input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
  rutaCampeonState.activeSuggestionIndex = -1;
}

function selectTeam(teamId) {
  rutaCampeonState.selectedTeamId = teamId;
  rutaCampeonState.searchQuery = '';
  closeSuggestions();

  const input = document.getElementById('rc-search-input');
  const team = findTeamById(teamId);
  if (input) input.value = team ? team.name_en : '';

  renderRutaCampeon();
}

function clearSelectedTeam() {
  rutaCampeonState.selectedTeamId = '';
  const input = document.getElementById('rc-search-input');
  if (input) { input.value = ''; input.focus(); }
  renderRutaCampeon();
}

function handleRutaCampeonContentClick(event) {
  const chip = event.target.closest('.rc-team-chip');
  if (chip) { selectTeam(chip.dataset.teamId); return; }

  const retryBtn = event.target.closest('#rc-retry-teams');
  if (retryBtn) { loadRutaCampeonTeams(); return; }

  const retryGamesBtn = event.target.closest('#rc-retry-games');
  if (retryGamesBtn) { loadRutaCampeonGames(); return; }

  const clearBtn = event.target.closest('#rc-clear-team');
  if (clearBtn) { clearSelectedTeam(); }
}

/* ── Render principal (despacha según el estado) ── */

function renderRutaCampeon() {
  const content = document.getElementById('rc-content');
  if (!content) return;

  if (rutaCampeonState.teamsUnavailable) {
    content.innerHTML = renderTeamsErrorState();
    return;
  }

  if (!rutaCampeonState.teams) {
    content.innerHTML = '<p class="loading">Cargando selecciones…</p>';
    return;
  }

  if (!rutaCampeonState.selectedTeamId) {
    content.innerHTML = renderFeaturedContent();
    return;
  }

  content.innerHTML = renderTeamResults(rutaCampeonState.selectedTeamId);
}

/* ── Contenido inicial destacado ── */

function computeFeaturedTeams() {
  return [...rutaCampeonState.teams]
    .sort((a, b) => a.name_en.localeCompare(b.name_en))
    .slice(0, 8);
}

function computeFeaturedMatches() {
  if (!rutaCampeonState.games) return [];
  return rutaCampeonState.games
    .filter(g => g.finished === 'FALSE')
    .sort((a, b) => new Date(a.local_date) - new Date(b.local_date))
    .slice(0, 4);
}

function computeFeaturedStadiums() {
  if (!rutaCampeonState.stadiums) return [];
  return [...rutaCampeonState.stadiums]
    .sort((a, b) => b.capacity - a.capacity)
    .slice(0, 4);
}

function computeFeaturedCities() {
  if (!rutaCampeonState.stadiums || !rutaCampeonState.games) return [];
  const matchesByStadium = {};
  rutaCampeonState.games.forEach(g => {
    matchesByStadium[g.stadium_id] = (matchesByStadium[g.stadium_id] || 0) + 1;
  });

  const cityMap = new Map();
  rutaCampeonState.stadiums.forEach(stadium => {
    const key = `${stadium.city_en}|${stadium.country_en}`;
    const matches = matchesByStadium[stadium.id] || 0;
    const existing = cityMap.get(key);
    if (existing) {
      existing.matches += matches;
    } else {
      cityMap.set(key, { city: stadium.city_en, country: stadium.country_en, matches });
    }
  });

  return [...cityMap.values()].sort((a, b) => b.matches - a.matches).slice(0, 4);
}

function renderFeaturedContent() {
  return `
    <div class="rc-featured">
      ${renderFeaturedTeamsBlock()}
      ${renderFeaturedMatchesBlock()}
      ${renderFeaturedStadiumsBlock()}
      ${renderFeaturedCitiesBlock()}
    </div>
  `;
}

function featuredBlockShell(title, bodyHtml, note) {
  return `
    <div class="rc-featured-block">
      <div class="rc-featured-block-header">
        <h3 class="rc-featured-block-title">${title}</h3>
        ${note ? `<span class="rc-featured-block-note">${note}</span>` : ''}
      </div>
      ${bodyHtml}
    </div>
  `;
}

function renderFeaturedTeamsBlock() {
  const teams = computeFeaturedTeams();
  const chips = teams.map(team => `
    <button class="chip rc-team-chip" type="button" data-team-id="${team.id}">
      <img class="chip-flag" src="${team.flag}" alt="Bandera de ${team.name_en}">
      ${team.name_en}
    </button>
  `).join('');
  return featuredBlockShell('Selecciones para explorar', `<div class="rc-chip-row">${chips}</div>`, 'Orden alfabético');
}

function renderFeaturedMatchesBlock() {
  if (rutaCampeonState.gamesUnavailable) {
    return featuredBlockShell('Próximos partidos destacados', renderRcGamesErrorState());
  }
  if (!rutaCampeonState.games) {
    return featuredBlockShell('Próximos partidos destacados', '<p class="loading">Cargando partidos…</p>');
  }
  const matches = computeFeaturedMatches();
  if (matches.length === 0) return '';
  return featuredBlockShell(
    'Próximos partidos destacados',
    `<div class="rc-grid">${matches.map(renderMatchCard).join('')}</div>`,
    'Los más próximos en fecha'
  );
}

function renderFeaturedStadiumsBlock() {
  if (!rutaCampeonState.stadiums && !rutaCampeonState.stadiumsUnavailable) {
    return featuredBlockShell('Estadios más grandes', '<p class="loading">Cargando estadios…</p>');
  }
  const stadiums = computeFeaturedStadiums();
  if (stadiums.length === 0) return '';
  return featuredBlockShell(
    'Estadios más grandes',
    `<div class="rc-grid">${stadiums.map(renderStadiumCard).join('')}</div>`,
    'Por aforo'
  );
}

function renderFeaturedCitiesBlock() {
  if (!rutaCampeonState.stadiums && !rutaCampeonState.stadiumsUnavailable) {
    return featuredBlockShell('Ciudades con más partidos', '<p class="loading">Cargando ciudades…</p>');
  }
  const cities = computeFeaturedCities();
  if (cities.length === 0) return '';
  return featuredBlockShell(
    'Ciudades con más partidos',
    `<div class="rc-grid">${cities.map(renderCityCard).join('')}</div>`
  );
}

/* ── Tarjetas ── */

function renderPhaseBadge(groupCode) {
  const cls = groupCode ? 'badge-primary' : 'badge-neutral';
  return `<span class="badge ${cls}">${getPhaseLabel(groupCode)}</span>`;
}

function renderMatchCard(game) {
  const homeTeam = findTeamById(game.home_team_id);
  const awayTeam = findTeamById(game.away_team_id);
  const homeName = homeTeam ? homeTeam.name_en : (game.home_team_name_en || 'Por definir');
  const awayName = awayTeam ? awayTeam.name_en : (game.away_team_name_en || 'Por definir');
  const homeCrest = homeTeam
    ? `<img class="rc-crest" src="${homeTeam.flag}" alt="Bandera de ${homeName}">`
    : '<div class="rc-crest-placeholder"></div>';
  const awayCrest = awayTeam
    ? `<img class="rc-crest" src="${awayTeam.flag}" alt="Bandera de ${awayName}">`
    : '<div class="rc-crest-placeholder"></div>';

  const stadium = findStadiumById(game.stadium_id);
  let stadiumHtml;
  if (stadium) {
    stadiumHtml = `${stadium.name_en} — ${stadium.city_en}`;
  } else if (rutaCampeonState.stadiumsUnavailable) {
    stadiumHtml = '<span class="offline">Estadio no disponible</span>';
  } else {
    stadiumHtml = 'Cargando estadio…';
  }

  const phaseBadge = renderPhaseBadge(game.group);
  const statusBadge = game.finished === 'TRUE'
    ? `<span class="badge badge-neutral">${game.home_score} - ${game.away_score}</span>`
    : '<span class="badge badge-accent">Por jugar</span>';

  return `
    <div class="rc-match-card">
      <div class="rc-match-badges">${phaseBadge}${statusBadge}</div>
      <div class="rc-match-teams">
        <div class="rc-team-slot">${homeCrest}<span class="rc-team-name">${homeName}</span></div>
        <span class="rc-vs">VS</span>
        <div class="rc-team-slot">${awayCrest}<span class="rc-team-name">${awayName}</span></div>
      </div>
      <div class="rc-match-meta">
        <span class="rc-match-date">${formatLocalDate(game.local_date)}</span>
        <span class="rc-match-stadium">${stadiumHtml}</span>
      </div>
    </div>
  `;
}

function stadiumInitials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function renderStadiumCard(stadium) {
  return `
    <div class="rc-media-card">
      <div class="rc-media-card-banner">${stadiumInitials(stadium.name_en)}</div>
      <div class="rc-media-card-body">
        <div class="rc-media-card-title">${stadium.name_en}</div>
        <div class="rc-media-card-detail">${stadium.city_en}, ${stadium.country_en}</div>
        <div class="rc-media-card-detail">Aforo: ${stadium.capacity.toLocaleString('es-CR')}</div>
      </div>
    </div>
  `;
}

function renderCityCard(cityEntry) {
  return `
    <div class="rc-media-card">
      <div class="rc-media-card-banner">${cityEntry.city.charAt(0).toUpperCase()}</div>
      <div class="rc-media-card-body">
        <div class="rc-media-card-title">${cityEntry.city}</div>
        <div class="rc-media-card-detail">${cityEntry.country}</div>
        <div class="rc-media-card-detail">${cityEntry.matches} partido${cityEntry.matches === 1 ? '' : 's'}</div>
      </div>
    </div>
  `;
}

/* ── Resultados de un equipo seleccionado ── */

function renderResultsHeaderHtml(team, teamId, extraHtml) {
  const name = team ? team.name_en : `Equipo #${teamId}`;
  const flag = team
    ? `<img class="rc-results-flag" src="${team.flag}" alt="Bandera de ${name}">`
    : '<div class="rc-crest-placeholder"></div>';

  return `
    <div class="rc-results-header">
      ${flag}
      <span class="rc-results-team-name">${name}</span>
      <div class="rc-results-summary">${extraHtml || ''}</div>
      <button type="button" class="rc-btn-clear" id="rc-clear-team">Elegir otra selección</button>
    </div>
  `;
}

function renderEmptyState(message) {
  return renderStateBlock({ icon: RC_ICON_EMPTY, title: 'Sin partidos programados', message });
}

function renderTeamsErrorState() {
  return renderStateBlock({
    error: true,
    icon: RC_ICON_ALERT,
    title: 'No se pudieron cargar las selecciones',
    message: 'Revisa tu conexión e intenta de nuevo.',
    action: { label: 'Reintentar', id: 'rc-retry-teams' },
  });
}

function renderRcGamesErrorState() {
  return renderStateBlock({
    error: true,
    icon: RC_ICON_ALERT,
    title: 'No se pudieron cargar los partidos',
    message: 'Revisa tu conexión e intenta de nuevo.',
    action: { label: 'Reintentar', id: 'rc-retry-games' },
  });
}

function computeTeamCities(games) {
  const countByCity = new Map();
  games.forEach(game => {
    const stadium = findStadiumById(game.stadium_id);
    if (!stadium) return;
    const key = `${stadium.city_en}|${stadium.country_en}`;
    const existing = countByCity.get(key);
    if (existing) {
      existing.matches += 1;
    } else {
      countByCity.set(key, { city: stadium.city_en, country: stadium.country_en, matches: 1 });
    }
  });
  return [...countByCity.values()];
}

function renderTimeline(games) {
  const steps = games.map((game, index) => {
    const stadium = findStadiumById(game.stadium_id);
    const cityText = stadium ? stadium.city_en : 'Ciudad por confirmar';
    const detailText = stadium ? stadium.name_en : 'Estadio por confirmar';
    const connector = index < games.length - 1 ? '<div class="timeline-connector"></div>' : '';
    return `
      <div class="timeline-step">
        <div class="timeline-node">
          <div class="timeline-node-marker">${index + 1}</div>
          <span class="timeline-node-date">${formatLocalDate(game.local_date)}</span>
          <span class="timeline-node-city">${cityText}</span>
          <span class="timeline-node-detail">${detailText}</span>
        </div>
        ${connector}
      </div>
    `;
  }).join('');

  return `<div class="timeline">${steps}</div>`;
}

function renderTeamResults(teamId) {
  const team = findTeamById(teamId);

  if (rutaCampeonState.gamesUnavailable) {
    return renderResultsHeaderHtml(team, teamId) + renderRcGamesErrorState();
  }

  if (!rutaCampeonState.games) {
    return renderResultsHeaderHtml(team, teamId) + '<p class="loading">Cargando partidos…</p>';
  }

  const games = rutaCampeonState.games
    .filter(g => g.home_team_id === teamId || g.away_team_id === teamId)
    .sort((a, b) => new Date(a.local_date) - new Date(b.local_date));

  if (games.length === 0) {
    return renderResultsHeaderHtml(team, teamId) +
      renderEmptyState('Este equipo no tiene partidos programados todavía.');
  }

  const cities = new Set();
  const stadiumsForTeam = [];
  games.forEach(game => {
    const stadium = findStadiumById(game.stadium_id);
    if (stadium) {
      cities.add(stadium.city_en);
      if (!stadiumsForTeam.find(s => s.id === stadium.id)) stadiumsForTeam.push(stadium);
    }
  });

  const citySummary = rutaCampeonState.stadiums
    ? `<span class="badge badge-primary">Ciudades distintas: ${cities.size}</span>`
    : '';

  const stadiumsLoading = !rutaCampeonState.stadiums && !rutaCampeonState.stadiumsUnavailable;
  const stadiumsSectionHtml = stadiumsLoading
    ? '<p class="loading">Cargando estadios…</p>'
    : (stadiumsForTeam.length > 0
        ? `<div class="rc-grid">${stadiumsForTeam.map(renderStadiumCard).join('')}</div>`
        : '<p class="loading">Estadios no disponibles por ahora.</p>');

  const cityEntries = computeTeamCities(games);
  const citiesSectionHtml = stadiumsLoading
    ? '<p class="loading">Cargando ciudades…</p>'
    : (cityEntries.length > 0
        ? `<div class="rc-grid">${cityEntries.map(renderCityCard).join('')}</div>`
        : '<p class="loading">Ciudades no disponibles por ahora.</p>');

  return `
    ${renderResultsHeaderHtml(team, teamId, citySummary)}
    <div class="rc-results-section">
      <h3 class="rc-results-section-title">Próximos partidos</h3>
      <div class="rc-grid">${games.map(renderMatchCard).join('')}</div>
    </div>
    <div class="rc-results-section">
      <h3 class="rc-results-section-title">Estadios</h3>
      ${stadiumsSectionHtml}
    </div>
    <div class="rc-results-section">
      <h3 class="rc-results-section-title">Ciudades</h3>
      ${citiesSectionHtml}
    </div>
    <div class="rc-results-section">
      <h3 class="rc-results-section-title">Recorrido</h3>
      ${renderTimeline(games)}
    </div>
  `;
}
