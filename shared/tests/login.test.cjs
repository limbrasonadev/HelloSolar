// Unified login (login.html / shared/hello-solar-login.js): one form, the account decides the dashboard.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const { ROOT } = require('./helpers.cjs');

function env() {
  const store = new Map();
  const session = new Map();
  const mem = map => ({
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k)
  });
  const c = {
    console, crypto,
    location: { protocol: 'http:', pathname: '/login.html', replace() {} },
    localStorage: mem(store), sessionStorage: mem(session),
    document: { documentElement: { hasAttribute: () => false } },
    addEventListener() {}
  };
  c.window = c;
  vm.createContext(c);
  ['hello_solar_super_admin/data.js', 'shared/hello-solar-shared.js', 'hello_solar_super_admin/auth.js', 'shared/hello-solar-login.js']
    .forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), c));
  return c;
}

const cases = [
  ['customer@hellosolar.ph', 'password123', 'customer', 'Hello_Solar_Customer/mysystem.html'],
  ['CUS-1011', 'password123', 'customer', 'Hello_Solar_Customer/mysystem.html'],
  ['financer@hellosolar.ph', 'password123', 'financer', 'Hello_Solar_Financer/dashboard.html'],
  ['installer@hellosolar.ph', 'password123', 'installer', 'Hello_Solar_Installer/myjob.html'],
  ['merchant@hellosolar.ph', 'password123', 'merchant', 'Hello_Solar_Merchant/dashboard.html'],
  ['admin', 'admin123', 'super-admin', 'hello_solar_super_admin/index.html'],
  ['engineer@hellosolar.ph', 'engineer123', 'direct-engineer', 'hello_solar_super_admin/index.html']
];

for (const [id, pw, role, url] of cases) {
  test(`unified login: ${id} → ${role}`, () => {
    const c = env();
    const res = c.HSLogin.login(id, pw);
    assert.equal(res.ok, true, res.error);
    assert.equal(res.role, role);
    assert.equal(c.HSLogin.destinationFor(role).url, url);
    if (role === 'super-admin' || role === 'direct-engineer') {
      assert.equal(c.SuperAdminAuth.getRole(), role);
    } else {
      assert.equal(c.HSShared.session.isValid(role), true);
      // only that role's session is created
      ['customer', 'financer', 'installer', 'merchant'].filter(r => r !== role)
        .forEach(r => assert.equal(c.HSShared.session.get(r), null));
    }
  });
}

test('unified login: session payload matches the portal (financer, merchant, installer fields)', () => {
  const c = env();
  c.HSLogin.login('financer@hellosolar.ph', 'password123');
  const f = c.HSShared.session.get('financer');
  assert.equal(f.financerId, 'FIN-005');
  assert.equal(f.partnerId, 'FIN-005');
  assert.equal(f.businessName, 'SolarTech Financer');
  c.HSLogin.login('merchant@hellosolar.ph', 'password123');
  assert.equal(c.HSShared.session.get('merchant').merchantId, 'MER-026');
  c.HSLogin.login('installer@hellosolar.ph', 'password123');
  assert.equal(c.HSShared.session.get('installer').installerId, 'INS-006');
  c.HSLogin.login('customer@hellosolar.ph', 'password123');
  assert.equal(c.HSShared.session.get('customer').accountNo, 'HS-88219');
});

test('unified login: wrong password, unknown account and empty fields are rejected', () => {
  const c = env();
  assert.equal(c.HSLogin.login('customer@hellosolar.ph', 'nope').ok, false);
  assert.equal(c.HSLogin.login('nobody@example.com', 'password123').ok, false);
  assert.equal(c.HSLogin.login('', 'x').field, 'identifier');
  assert.equal(c.HSLogin.login('customer', '').field, 'password');
  assert.equal(c.HSShared.session.get('customer'), null);
  assert.equal(c.SuperAdminAuth.isSignedIn(), false);
});

test('unified login: pending accounts get the pending-review message', () => {
  const c = env();
  const reg = c.HSShared.registerPendingAccount('merchant', { name: 'New Shop', email: 'newshop@example.com', password: 'secret123' });
  assert.equal(reg.ok, true);
  const res = c.HSLogin.login('newshop@example.com', 'secret123');
  assert.equal(res.ok, false);
  assert.match(res.error, /pending/i);
});

test('unified login: ?portal= hint opens an existing session directly', () => {
  const c = env();
  assert.equal(c.HSLogin.activeSessionFor('financer'), null);
  c.HSLogin.login('financer@hellosolar.ph', 'password123');
  assert.equal(c.HSLogin.activeSessionFor('financer'), 'financer');
  assert.equal(c.HSLogin.activeSessionFor('customer'), null);
  c.HSLogin.login('admin', 'admin123');
  assert.equal(c.HSLogin.activeSessionFor('admin'), 'super-admin');
});

test('unified login: demo account list covers every dashboard', () => {
  const c = env();
  const roles = c.HSLogin.demoAccounts().map(d => d.role);
  ['customer', 'financer', 'installer', 'merchant', 'super-admin', 'direct-engineer'].forEach(r => assert.ok(roles.includes(r), r));
  c.HSLogin.demoAccounts().forEach(d => assert.equal(env().HSLogin.login(d.identifier, d.password).ok, true, d.label));
});
