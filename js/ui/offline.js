const CACHE_PREFIX = 'wc26_cache_';

function saveToCache(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, savedAt: Date.now() }));
  } catch (_) {
    // localStorage lleno o no disponible: se ignora, no es crítico para el flujo
  }
}

function readFromCache(key) {
  const raw = localStorage.getItem(CACHE_PREFIX + key);
  if (!raw) return null;
  try {
    return JSON.parse(raw).data;
  } catch (_) {
    return null;
  }
}

function showOfflineBanner() {
  document.getElementById('banner-offline').classList.remove('hidden');
  document.getElementById('banner-seed').classList.add('hidden');
}

function showSeedBanner() {
  document.getElementById('banner-seed').classList.remove('hidden');
  document.getElementById('banner-offline').classList.add('hidden');
}

function hideAllBanners() {
  document.getElementById('banner-offline').classList.add('hidden');
  document.getElementById('banner-seed').classList.add('hidden');
}
