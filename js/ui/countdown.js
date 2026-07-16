const countdownTimers = {};

// renderCountdown(seconds, containerId): pinta un countdown visible dentro del
// elemento containerId y resuelve la promesa cuando llega a 0.
function renderCountdown(seconds, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return Promise.resolve();

  clearCountdown(containerId);

  return new Promise(resolve => {
    let remaining = seconds;

    const paint = () => {
      container.innerHTML = `<div class="countdown">Límite de peticiones alcanzado. Reintentando en ${remaining}s…</div>`;
    };
    paint();

    const timer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timer);
        delete countdownTimers[containerId];
        container.innerHTML = '';
        resolve();
        return;
      }
      paint();
    }, 1000);

    countdownTimers[containerId] = timer;
  });
}

function clearCountdown(containerId) {
  if (countdownTimers[containerId]) {
    clearInterval(countdownTimers[containerId]);
    delete countdownTimers[containerId];
  }
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = '';
}
