const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function environment() {
  const local = new Map();
  const context = {
    console,
    localStorage: { getItem: k => (local.has(k) ? local.get(k) : null), setItem: (k, v) => local.set(k, String(v)), removeItem: k => local.delete(k) }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
  return { db: context.HELLO_SOLAR_DB, local };
}

test('accounting summary reuses payments KPIs, schedules and contract data', () => {
  const { db } = environment();
  const asOf = '2026-10-04T12:00:00';
  const s = db.getAccountingSummary({ asOf });
  const k = db.getCurrentPaymentsKpis({ asOf });
  assert.equal(s.totalPortfolio, k.totalPortfolio);
  assert.equal(s.expectedRevenue, k.totalExpectedRevenue);
  assert.equal(s.expectedRevenue, s.hsRevenue + s.thirdPartyRevenue);
  assert.ok(s.collectedRevenue > 0);
  assert.ok(s.overdueAmount > 0);
  assert.equal(s.overdueAccounts, k.overdueCount);
  assert.equal(s.hsRevenue, k.hsRevenue);
  assert.equal(s.thirdPartyRevenue, k.thirdPartyRevenue);
  assert.equal(s.contracts.total, db.data.financers.length);
  assert.equal(s.contracts.active, 4); // FIN-001, FIN-003, FIN-004, FIN-005
  assert.equal(s.contracts.expired, 1);
});

test('disconnect request requires Super Admin, a reason, and logs APP ID / HS ID / admin / time', () => {
  const { db } = environment();
  const app = db.data.applications.find(a => a.id === 'APP-1056');
  app.hsId = 'HS-48213'; // real stored HS ID
  const hsId = db.getAppHsId(app);
  assert.equal(hsId, 'HS-48213');

  assert.equal(db.requestSystemDisconnect('APP-1056', { reason: 'Safety hazard', actorRole: 'direct-engineer' }).success, false);
  assert.equal(db.requestSystemDisconnect('APP-1056', { reason: '', actorRole: 'super-admin' }).success, false);
  assert.equal(db.getSystemConnectionStatus(app), 'Connected');

  const res = db.requestSystemDisconnect('APP-1056', { reason: 'Non-payment escalation', actorRole: 'super-admin', adminUser: 'ADMIN (Test)' });
  assert.equal(res.success, true);
  assert.equal(app.systemConnectionStatus, 'Disconnect Requested', 'must not jump straight to Disconnected');
  assert.equal(res.request.appId, 'APP-1056');
  assert.equal(res.request.hsId, hsId);
  assert.equal(db.data.disconnectRequests[0].status, 'Pending API Confirmation');

  const log = db.data.activity[0];
  assert.equal(log.record, 'APP-1056');
  assert.equal(log.details.appId, 'APP-1056');
  assert.equal(log.details.hsId, hsId);
  assert.equal(log.details.admin, 'ADMIN (Test)');
  assert.equal(log.details.reason, 'Non-payment escalation');
  assert.ok(log.details.requestedAt && log.timestamp);

  // Duplicate request blocked while pending
  assert.equal(db.requestSystemDisconnect('APP-1056', { reason: 'Again please', actorRole: 'super-admin' }).success, false);
});

test('Disconnected is set only by backend confirmation with an API reference', () => {
  const { db } = environment();
  db.data.applications.find(a => a.id === 'APP-1024').hsId = 'HS-55102';
  assert.equal(db.confirmSystemDisconnect('APP-1024', { apiReference: 'INV-1' }).success, false, 'no pending request');
  db.requestSystemDisconnect('APP-1024', { reason: 'Customer requested shutdown', actorRole: 'super-admin' });
  assert.equal(db.confirmSystemDisconnect('APP-1024', {}).success, false, 'reference required');

  const res = db.confirmSystemDisconnect('APP-1024', { apiReference: 'INV-API-7781' });
  assert.equal(res.success, true);
  const app = db.data.applications.find(a => a.id === 'APP-1024');
  assert.equal(app.systemConnectionStatus, 'Disconnected');
  assert.equal(app.disconnectRequest.apiReference, 'INV-API-7781');
  assert.equal(db.data.disconnectRequests[0].status, 'Confirmed');
  assert.equal(db.data.activity[0].details.status, 'Disconnected');
});

test('no fallback HS IDs: apps without a stored hsId show none and cannot be disconnected', () => {
  const { db } = environment();
  const app = db.data.applications.find(a => a.id === 'APP-1048');
  delete app.hsId;
  assert.equal(db.getAppHsId(app), null);
  assert.equal(db.getAppHsId({ id: 'APP-1048', hsId: '   ' }), null);
  const res = db.requestSystemDisconnect('APP-1048', { reason: 'Safety hazard on site', actorRole: 'super-admin' });
  assert.equal(res.success, false);
  assert.match(res.error, /HS ID/);
  assert.equal(db.getSystemConnectionStatus(app), 'Connected');
  assert.ok(!(db.data.disconnectRequests || []).some(r => r.appId === 'APP-1048'));
});

test('accounting values always equal the current Payments KPIs, even with stale stored payment statuses', () => {
  const { db } = environment();
  db.data.applications.forEach(a => { if (!(a.paymentType || '').toLowerCase().includes('full')) a.paymentStatus = 'On Time'; });
  const s = db.getAccountingSummary();
  const k = db.getCurrentPaymentsKpis();
  assert.equal(s.totalPortfolio, k.totalPortfolio);
  assert.equal(s.expectedRevenue, k.totalExpectedRevenue);
  assert.equal(s.overdueAccounts, k.overdueCount);
  assert.ok(k.overdueCount > 0, 'statuses are refreshed from schedules, not stale stored values');
});
