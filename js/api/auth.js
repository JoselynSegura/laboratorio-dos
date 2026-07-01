const API_BASE = '/api';
const TOKEN_KEY = 'wc26_token';

async function login(email, password) {
  const response = await fetch(`${API_BASE}/auth/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    let message = `Error de autenticación (${response.status})`;
    try {
      const body = await response.json();
      if (body.message) message = body.message;
    } catch (_) {}
    throw new Error(message);
  }

  const data = await response.json();
  localStorage.setItem(TOKEN_KEY, data.token);
  return data.token;
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function isAuthenticated() {
  return Boolean(getToken());
}
