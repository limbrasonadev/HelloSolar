const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../auth.js'), 'utf8');
function setup(protectedPage = false, saved) {
  const values = new Map(saved || []), redirects = [], listeners = {};
  const context = {
    sessionStorage: { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) },
    document: { documentElement: { hasAttribute: () => protectedPage, classList: { add() {}, remove() {} } } },
    location: { replace: url => redirects.push(url) },
    addEventListener: (name, fn) => { listeners[name] = fn; }, setInterval() {},
  };
  context.window = context;
  vm.runInNewContext(source, context);
  return { auth: context.SuperAdminAuth, values, redirects, listeners };
}
test('rejects incorrect credentials and accepts the admin identity only', () => {
  const { auth, values } = setup();
  assert.equal(auth.login('customer@example.com', 'admin123'), false);
  assert.equal(auth.login('admin', 'SolarAdmin2026!'), false);
  assert.equal(auth.login('admin', 'wrong'), false);
  assert.equal(values.size, 0);
  assert.equal(auth.login(' admin ', 'admin123'), true);
  assert.equal(auth.isSignedIn(), true);
});
test('logout clears only the admin session and redirects to the local login page', () => {
  const { auth, values, redirects } = setup(false, [['other-portal', 'keep']]);
  auth.login('admin', 'admin123');
  auth.logout();
  assert.equal(auth.isSignedIn(), false);
  assert.equal(values.get('other-portal'), 'keep');
  assert.deepEqual(redirects, ['login.html']);
});
test('dashboard guard rejects absent, malformed, expired, and non-admin sessions', () => {
  for (const saved of [null, '{broken', JSON.stringify({role:'super-admin', expiresAt:0}), JSON.stringify({role:'customer', expiresAt:Date.now()+100000})]) {
    const { redirects } = setup(true, saved ? [['hello_solar_super_admin_session', saved]] : []);
    assert.deepEqual(redirects, ['login.html']);
  }
});
test('valid sessions open the dashboard; restoring a logged-out page redirects', () => {
  const first = setup();
  first.auth.login('admin', 'admin123');
  const { values, redirects, listeners } = setup(true, first.values);
  assert.deepEqual(redirects, []);
  values.clear();
  listeners.pageshow();
  assert.deepEqual(redirects, ['login.html']);
});
