const DEFAULT_TIMEOUT_MS = 8000;
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000];

let sessionRecovery = null;

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function waitForReauth() {
  if (!sessionRecovery) {
    let resolve;
    const promise = new Promise(r => { resolve = r; });
    sessionRecovery = { promise, resolve };
    showExpiredSessionModal();
  }
  return sessionRecovery.promise;
}

function notifySessionRestored() {
  if (sessionRecovery) {
    sessionRecovery.resolve();
    sessionRecovery = null;
  }
}

async function fetchWithAuth(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${getToken()}` };
  const response = await fetchWithTimeout(url, { ...options, headers }, timeoutMs);

  if (response.status === 401) {
    clearToken();
    await waitForReauth();
    return fetchWithAuth(url, options, timeoutMs);
  }

  return response;
}

async function waitWithCountdown(seconds, containerId) {
  if (containerId && document.getElementById(containerId)) {
    await renderCountdown(seconds, containerId);
  } else {
    await sleep(seconds * 1000);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadSeed(cacheKey) {
  try {
    const response = await fetch(`data/seed-${cacheKey}.json`);
    if (!response.ok) return null;
    return await response.json();
  } catch (_) {
    return null;
  }
}

async function loadFallback(cacheKey) {
  const cached = readFromCache(cacheKey);
  if (cached) {
    showOfflineBanner();
    return { data: cached, source: 'cache' };
  }

  const seed = await loadSeed(cacheKey);
  if (seed) {
    showSeedBanner();
    return { data: seed, source: 'seed' };
  }

  return { data: null, source: 'none' };
}

// fetchWithRetry(url, cacheKey, options?): options.countdownContainerId opcional,
// donde 'options' es el resto del init de fetch más ese campo.
async function fetchWithRetry(url, cacheKey, options = {}) {
  const { countdownContainerId, ...fetchOptions } = options;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    let response;
    try {
      response = await fetchWithAuth(url, fetchOptions);
    } catch (error) {
      // TypeError (red) o AbortError (timeout): no se reintenta, va directo a fallback
      return loadFallback(cacheKey);
    }

    if (response.ok) {
      try {
        const data = await response.json();
        saveToCache(cacheKey, data);
        hideAllBanners();
        return { data, source: 'api' };
      } catch (error) {
        // JSON inválido/vacío pese al 200: se trata como fallo, va a fallback
        return loadFallback(cacheKey);
      }
    }

    if (response.status === 429 || response.status === 500) {
      const waitMs = RETRY_DELAYS_MS[attempt];
      if (response.status === 429) {
        await waitWithCountdown(waitMs / 1000, countdownContainerId);
      } else {
        await sleep(waitMs);
      }
      continue;
    }

    return loadFallback(cacheKey);
  }

  return loadFallback(cacheKey);
}
