function showExpiredSessionModal() {
  document.getElementById('session-modal').classList.remove('hidden');
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function hideExpiredSessionModal() {
  document.getElementById('session-modal').classList.add('hidden');
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('reauth-error').textContent = '';
  document.getElementById('reauth-error').classList.add('hidden');
  document.getElementById('reauth-email').value = '';
  document.getElementById('reauth-password').value = '';
}

function showModalError(message) {
  const el = document.getElementById('reauth-error');
  el.textContent = message;
  el.classList.remove('hidden');
}
