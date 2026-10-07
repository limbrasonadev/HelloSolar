// Prototype-only authentication. Production access must be enforced by a server.
(() => {
  const SESSION_KEY = 'hello_solar_super_admin_session';
  const DATA_KEY = 'HELLO_SOLAR_SUPER_ADMIN_DATA_V2';
  const SESSION_DURATION = 8 * 60 * 60 * 1000;
  const ENGINEER_TITLE = 'Direct Installation Engineer';
  // Prototype / demo fallback accounts. Real Direct Installation Engineer accounts are
  // created by Super Admin (Accounts → Create Account) and stored in data.engineers.
  const DEMO_ACCOUNTS = [
    { ids: ['admin@hellosolar.ph', 'admin'], password: 'admin123', role: 'super-admin', name: 'Limuel Brasona', title: 'Super Admin' },
    { ids: ['engineer@hellosolar.ph', 'engineer'], password: 'engineer123', role: 'direct-engineer', name: 'Engr. Mark Dizon', title: ENGINEER_TITLE, actorId: 'ENG-DEMO' }
  ];
  const ROLES = ['super-admin', 'direct-engineer'];
  // Runtime mode (shared/hello-solar-config.js). api mode: the backend checks credentials and issues a token;
  // demo accounts and client-side password checks are local-mode only.
  const CONFIG = window.HS_CONFIG || { isApi: false, demoData: true };
  const API = window.HSApi || null;
  const IS_API = !!(CONFIG.isApi && API);
  const DEMO = !IS_API && CONFIG.demoData !== false;
  let lastError = '';

  function storedEngineers() {
    try {
      const data = JSON.parse((window.HSStore || localStorage).getItem(DATA_KEY) || 'null');
      return Array.isArray(data?.engineers) ? data.engineers : [];
    } catch { return []; }
  }

  function getSession() {
    try {
      const session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
      if (!ROLES.includes(session?.role) || !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()) return null;
      // api mode: the backend token is the session (bootstrap clears it when the account is no longer Active)
      if (IS_API) return API.tokens.get('admin') ? session : null;
      // Created engineer accounts lose access as soon as they are no longer Active
      if (session.role === 'direct-engineer' && session.accountId) {
        const account = storedEngineers().find(e => e.id === session.accountId);
        if (!account || account.status !== 'Active') return null;
      }
      return session;
    } catch { return null; }
  }
  function isSignedIn() {
    return !!getSession();
  }
  function getRole() {
    return getSession()?.role || null;
  }
  function startSession(fields) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...fields, expiresAt: Date.now() + SESSION_DURATION }));
  }
  function login(identifier, password) {
    lastError = '';
    const id = identifier.trim().toLowerCase();

    if (IS_API) {
      // POST /auth/login { role: "admin", identifier, password } → { token, account: { id, name, title, role } }
      // account.role is "super-admin" or "direct-engineer"
      const res = API.requestSync('POST', '/auth/login', { role: 'admin', identifier: id, password }, { role: 'admin', auth: false });
      const account = res.data && res.data.account;
      if (!res.ok || !account || !ROLES.includes(account.role)) {
        lastError = (res.data && res.data.error) || (res.status === 0 ? res.error : '');
        return false;
      }
      API.tokens.set('admin', res.data.token);
      startSession({
        role: account.role, name: account.name, title: account.title || (account.role === 'direct-engineer' ? ENGINEER_TITLE : 'Super Admin'),
        actorId: account.id, accountId: account.role === 'direct-engineer' ? account.id : undefined
      });
      return true;
    }

    // 1. Super Admin–created Direct Installation Engineer accounts (by email or Engineer ID)
    const engineer = storedEngineers().find(e =>
      (e.email || '').toLowerCase() === id || (e.id || '').toLowerCase() === id);
    if (engineer) {
      if (engineer.password !== password) return false;
      if (engineer.status !== 'Active') {
        lastError = engineer.status === 'Pending Activation'
          ? 'Your engineer account is pending activation. Please contact your Super Admin.'
          : 'Your engineer account is not active. Please contact your Super Admin.';
        return false;
      }
      startSession({ role: 'direct-engineer', name: engineer.name, title: ENGINEER_TITLE, actorId: engineer.id, accountId: engineer.id });
      return true;
    }

    // 2. Prototype / demo fallback accounts (local demo mode only)
    const account = DEMO && DEMO_ACCOUNTS.find(a => a.ids.includes(id) && a.password === password);
    if (!account) return false;
    startSession({ role: account.role, name: account.name, title: account.title, actorId: account.actorId || 'ADMIN-01' });
    return true;
  }
  function getLastError() {
    return lastError;
  }
  function logout() {
    if (IS_API && API.tokens.get('admin')) {
      API.request('POST', '/auth/logout', {}, { role: 'admin' });
      API.tokens.clear('admin');
    }
    sessionStorage.removeItem(SESSION_KEY);
    window.location.replace('login.html');
  }
  window.SuperAdminAuth = { isSignedIn, login, logout, getRole, getSession, getLastError };
  if (document.documentElement.hasAttribute('data-admin-protected')) {
    const guard = () => {
      if (!isSignedIn()) {
        document.documentElement.classList.add('auth-pending');
        window.location.replace('login.html');
      } else {
        document.documentElement.classList.remove('auth-pending');
      }
    };
    guard();
    window.addEventListener('pageshow', guard);
    window.addEventListener('focus', guard);
    window.setInterval(guard, 30000);
  }
})();
