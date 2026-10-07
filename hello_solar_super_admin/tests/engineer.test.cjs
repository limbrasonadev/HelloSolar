const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function environment() {
  const local = new Map(), session = new Map();
  const store = map => ({ getItem: k => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k) });
  const context = {
    console, crypto, location: { protocol: 'file:', replace() {} },
    localStorage: store(local), sessionStorage: store(session),
    document: { documentElement: { hasAttribute: () => false } },
    addEventListener() {}, setInterval() {}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'auth.js'), 'utf8'), context);
  return context;
}

const engineerPayload = {
  role: 'Engineer', engineerId: 'ENG-007', firstName: 'Ana', lastName: 'Reyes',
  email: 'ana.reyes@hellosolar.ph', phone: '+63 917 555 0101', password: 'secret-pass', status: 'Active'
};

test('Super Admin creates Direct Installation Engineer accounts separate from installers', () => {
  const c = environment(), db = c.HELLO_SOLAR_DB;
  const installersBefore = db.data.installers.length;
  const res = db.createAccount(engineerPayload);
  assert.equal(res.success, true);
  assert.equal(res.tabKey, 'engineers');
  assert.equal(res.id, 'ENG-007');
  const eng = db.data.engineers.find(e => e.id === 'ENG-007');
  assert.equal(eng.name, 'Ana Reyes');
  assert.equal(eng.role, 'Direct Installation Engineer');
  assert.equal(eng.status, 'Active');
  assert.equal(db.data.installers.length, installersBefore);
  assert.ok(!db.data.installers.some(i => i.email === engineerPayload.email));
  // Validation
  assert.equal(db.createAccount(engineerPayload).success, false); // duplicate ID
  assert.equal(db.createAccount({ ...engineerPayload, engineerId: 'ENG-008' }).success, false); // duplicate email
  assert.equal(db.createAccount({ ...engineerPayload, engineerId: 'X-1', email: 'x@hs.ph' }).success, false); // bad format
  assert.equal(db.getNextEngineerId(), 'ENG-008');
  // Role and status are set automatically when not provided by the form
  const auto = db.createAccount({ role: 'Engineer', firstName: 'Ben', lastName: 'Cruz', email: 'ben.cruz@hellosolar.ph', phone: '+63 917 555 0102', password: 'secret-pass' });
  assert.equal(auto.success, true);
  assert.equal(auto.id, 'ENG-008');
  assert.equal(auto.account.status, 'Pending Activation');
  assert.equal(auto.account.role, 'Direct Installation Engineer');
  // Persists across reload
  assert.ok(new c.HelloSolarStore().data.engineers.some(e => e.id === 'ENG-007'));
});

test('engineer accounts log in only when Active; deactivation ends the session; demo fallback remains', () => {
  const c = environment(), db = c.HELLO_SOLAR_DB, auth = c.SuperAdminAuth;
  db.createAccount({ ...engineerPayload, status: 'Pending Activation' });
  assert.equal(auth.login('ana.reyes@hellosolar.ph', 'secret-pass'), false);
  assert.match(auth.getLastError(), /pending activation/i);
  db.updateAccountStatus('engineers', 'ENG-007', 'Active');
  assert.equal(auth.login('ana.reyes@hellosolar.ph', 'wrong'), false);
  assert.equal(auth.login('ENG-007', 'secret-pass'), true);
  assert.equal(auth.getRole(), 'direct-engineer');
  assert.equal(auth.getSession().accountId, 'ENG-007');
  db.updateAccountStatus('engineers', 'ENG-007', 'Inactive');
  assert.equal(auth.isSignedIn(), false);
  assert.equal(auth.login('ana.reyes@hellosolar.ph', 'secret-pass'), false);
  // Prototype fallbacks still work
  assert.equal(auth.login('engineer', 'engineer123'), true);
  assert.equal(auth.getRole(), 'direct-engineer');
  assert.equal(auth.login('admin', 'admin123'), true);
  assert.equal(auth.getRole(), 'super-admin');
});

test('direct installation workflow keeps status guards and links progress by APP ID', () => {
  const c = environment(), db = c.HELLO_SOLAR_DB;
  const eng = { name: 'Ana Reyes', actorId: 'ENG-007' };
  const job = db.data.installations.find(j => j.installerType === 'Hello Solar Direct' && j.status === 'Ready');
  assert.ok(job);
  assert.equal(db.saveDirectInstallationProgress(job.id, { referenceNumber: 'JO-1' }, eng).success, false);
  assert.equal(db.engineerCompleteInstallation(job.id, eng).success, false);
  assert.equal(db.engineerActivateSystem(job.id, eng).success, false);
  assert.equal(db.engineerAcceptJob(job.id, eng).success, true);
  assert.equal(db.engineerAcceptJob(job.id, eng).success, false);
  assert.equal(db.saveDirectInstallationProgress(job.id, { progress: { percent: 10 } }, eng).success, false); // reference required
  assert.equal(db.saveDirectInstallationProgress(job.id, { referenceNumber: 'JO-1', progress: { percent: 100 } }, eng).success, false);
  assert.equal(db.saveDirectInstallationProgress(job.id, { referenceNumber: 'JO-1', inverter: { brand: 'Huawei' }, progress: { percent: 40 } }, eng).success, true);
  assert.equal(db.engineerActivateSystem(job.id, eng).success, false);
  assert.equal(db.engineerCompleteInstallation(job.id, eng).success, true);
  assert.equal(db.engineerActivateSystem(job.id, eng).success, true);
  assert.equal(db.engineerActivateSystem(job.id, eng).success, false);
  db.save();
  const app = new c.HelloSolarStore().data.applications.find(a => a.id === job.appId);
  assert.equal(app.installationProgress.appId, job.appId);
  assert.equal(app.installationProgress.referenceNumber, 'JO-1');
  assert.equal(app.installationStatus, 'COMPLETED');
  assert.equal(app.systemStatus, 'ACTIVE');
  assert.ok(db.engineerAcceptJob(db.data.installations.find(j => j.installerType !== 'Hello Solar Direct').id, eng).success === false);
});
