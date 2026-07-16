// Las tres secciones piden los mismos endpoints (teams/games/stadiums) al montarse;
// se memoiza por cacheKey para no repetir la misma petición de red 3 veces seguidas.
const endpointCache = {};

function withEndpointCache(cacheKey, fetcher) {
  if (!endpointCache[cacheKey]) {
    endpointCache[cacheKey] = (async () => {
      try {
        const result = await fetcher();
        if (!result.data) delete endpointCache[cacheKey];
        return result;
      } catch (error) {
        delete endpointCache[cacheKey];
        throw error;
      }
    })();
  }
  return endpointCache[cacheKey];
}

function getTeams(options = {}) {
  return withEndpointCache('teams', () => fetchWithRetry(`${API_BASE}/get/teams`, 'teams', options));
}

function getGames(options = {}) {
  return withEndpointCache('games', () => fetchWithRetry(`${API_BASE}/get/games`, 'games', options));
}

function getStadiums(options = {}) {
  return withEndpointCache('stadiums', () => fetchWithRetry(`${API_BASE}/get/stadiums`, 'stadiums', options));
}

function getGroups(options = {}) {
  return withEndpointCache('groups', () => fetchWithRetry(`${API_BASE}/get/groups`, 'groups', options));
}
