document.addEventListener('DOMContentLoaded', () => {
  if (isAuthenticated()) {
    showApp();
  } else {
    showLoginScreen();
  }

  setupNavigation();
  setupLoginForm();
  setupReauthForm();
  setupPasswordToggle();
});

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  activateSection('ruta-campeon');
}

function showLoginScreen() {
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
}

function activateSection(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const section = document.getElementById(sectionId);
  const btn = document.querySelector(`.nav-btn[data-section="${sectionId}"]`);
  if (section) section.classList.remove('hidden');
  if (btn) btn.classList.add('active');

  initSection(sectionId);
}

function initSection(sectionId) {
  const initializers = {
    'ruta-campeon':        typeof initRutaCampeon        !== 'undefined' ? initRutaCampeon        : null,
    'rastreador-goleadas': typeof initRastreadorGoleadas !== 'undefined' ? initRastreadorGoleadas : null,
    'el-muro':             typeof initElMuro             !== 'undefined' ? initElMuro             : null,
    'analitica-estadios':  typeof initAnaliticaEstadios  !== 'undefined' ? initAnaliticaEstadios  : null,
    'radar-empates':       typeof initRadarEmpates       !== 'undefined' ? initRadarEmpates       : null,
  };
  const fn = initializers[sectionId];
  if (fn) fn();
}

function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => activateSection(btn.dataset.section));
  });
}

function setupLoginForm() {
  const form      = document.getElementById('login-form');
  const errorEl   = document.getElementById('login-error');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    errorEl.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Ingresando...';

    try {
      await login(email, password);
      showApp();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Ingresar';
    }
  });
}

function setupPasswordToggle() {
  const btn   = document.querySelector('.btn-toggle-pw');
  const input = document.getElementById('password');
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    btn.setAttribute('aria-label', hidden ? 'Ocultar contraseña' : 'Mostrar contraseña');
    btn.classList.toggle('active', hidden);
  });
}

function setupReauthForm() {
  const reauthBtn = document.getElementById('reauth-btn');

  reauthBtn.addEventListener('click', async () => {
    const email    = document.getElementById('reauth-email').value.trim();
    const password = document.getElementById('reauth-password').value;

    if (!email || !password) {
      showModalError('Ingresa correo y contraseña');
      return;
    }

    reauthBtn.disabled = true;
    reauthBtn.textContent = 'Ingresando...';

    try {
      await login(email, password);
      hideExpiredSessionModal();
    } catch (err) {
      showModalError(err.message);
    } finally {
      reauthBtn.disabled = false;
      reauthBtn.textContent = 'Reautenticarse';
    }
  });
}
