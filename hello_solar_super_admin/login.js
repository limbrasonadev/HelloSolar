(() => {
  if (window.SuperAdminAuth.isSignedIn()) {
    window.location.replace('index.html');
    return;
  }
  const form = document.getElementById('loginForm');
  const password = document.getElementById('adminPassword');
  const error = document.getElementById('loginError');
  const toggle = document.getElementById('passwordToggle');
  toggle.addEventListener('click', () => {
    const show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    toggle.setAttribute('aria-pressed', String(show));
  });
  form.addEventListener('input', () => { error.hidden = true; });
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      if (window.SuperAdminAuth.login(document.getElementById('adminIdentifier').value, password.value)) {
        window.location.replace('index.html');
        return;
      }
      error.textContent = (window.SuperAdminAuth.getLastError && window.SuperAdminAuth.getLastError()) ||
        'Incorrect email, username, or password. Please try again.';
    } catch {
      error.textContent = 'Unable to start your session. Allow browser storage and try again.';
    }
    error.hidden = false;
  });
})();
