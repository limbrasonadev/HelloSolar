const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function environment(seedStorage) {
  const local = new Map(seedStorage || []);
  const context = {
    console,
    localStorage: { getItem: k => (local.has(k) ? local.get(k) : null), setItem: (k, v) => local.set(k, String(v)), removeItem: k => local.delete(k) }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
  return { context, db: context.HELLO_SOLAR_DB, local };
}

test('active contract makes the financer the funding/revenue owner', () => {
  const { db } = environment();
  const fin = db.data.financers.find(f => f.id === 'FIN-001');
  const c = db.getFinancerContract(fin, '2026-10-04T12:00:00');
  assert.equal(c.status, 'Active');
  assert.equal(c.ownerName, 'SunFund Philippines');
  assert.equal(c.ownerId, 'FIN-001');
});

test('expired, pending, terminated or missing contracts belong to Hello Solar', () => {
  const { db } = environment();
  const fin = db.data.financers.find(f => f.id === 'FIN-001');
  assert.equal(db.getFinancerContract(fin, '2028-01-15T09:00:00').status, 'Expired');
  assert.equal(db.getFinancerContract(fin, '2028-01-15T09:00:00').ownerName, 'Hello Solar');
  assert.equal(db.getFinancerContract(fin, '2024-12-01T09:00:00').status, 'Pending Start');
  assert.equal(db.getFinancerContract({ ...fin, contractStatusOverride: 'Terminated' }, '2026-10-04T12:00:00').ownerId, 'HELLO-SOLAR');
  assert.equal(db.getFinancerContract({ id: 'FIN-999', name: 'X' }).status, 'No Contract');
});

test('sync propagates ownership to linked applications and logs transfers', () => {
  const { db } = environment();
  db.syncFinancerContracts({ asOf: '2026-10-04T12:00:00', silent: true });
  const app = db.data.applications.find(a => a.financerId === 'FIN-001');
  assert.equal(app.fundingOwner, 'SunFund Philippines');

  const before = db.data.activity.length;
  db.syncFinancerContracts({ asOf: '2028-02-01T12:00:00' });
  assert.equal(app.fundingOwner, 'Hello Solar');
  assert.equal(app.fundingOwnerId, 'HELLO-SOLAR');
  assert.ok(db.data.activity.length > before);
  assert.ok(db.data.activity.slice(0, db.data.activity.length - before).some(a => a.record === 'FIN-001' && /Hello Solar/.test(a.action)));
});

test('updateFinancerContract validates input, derives end date, and persists', () => {
  const { db, local } = environment();
  assert.equal(db.updateFinancerContract('FIN-002', { contractTermMonths: 0, annualRate: 5, contractStartDate: '2026-01-01' }).success, false);
  assert.equal(db.updateFinancerContract('FIN-002', { contractTermMonths: 12, annualRate: '', contractStartDate: '2026-01-01' }).success, false);
  assert.equal(db.updateFinancerContract('FIN-002', { contractTermMonths: 12, annualRate: 5, contractStartDate: '2026-01-01', contractEndDate: '2025-01-01' }).success, false);

  const res = db.updateFinancerContract('FIN-002', { contractTermMonths: 36, annualRate: 7.5, contractStartDate: '2026-01-31' });
  assert.equal(res.success, true);
  assert.equal(res.financer.contractEndDate, '2029-01-31');
  const stored = JSON.parse([...local.values()][0]);
  assert.equal(stored.financers.find(f => f.id === 'FIN-002').annualRate, 7.5);
});

test('stored data without contract fields is backfilled from seed', () => {
  const first = environment();
  first.db.data.financers.forEach(f => {
    delete f.contractTermMonths; delete f.annualRate; delete f.contractStartDate; delete f.contractEndDate; delete f.contractStatusOverride;
  });
  first.db.save();
  const { db } = environment(first.local);
  const fin = db.data.financers.find(f => f.id === 'FIN-003');
  assert.equal(fin.contractTermMonths, 60);
  assert.equal(fin.contractStartDate, '2026-03-01');
});

test('payments funding view reuses contract ownership and keeps the original financer for history', () => {
  const { db } = environment();
  // FIN-002 seed contract ended 2026-08-01 -> Hello Solar owns, BDO stays the linked financer
  const bdoApp = db.data.applications.find(a => a.financerId === 'FIN-002');
  const f = db.getApplicationFunding(bdoApp);
  const expected = db.getFinancerContract(db.data.financers.find(x => x.id === 'FIN-002'));
  assert.equal(f.isFinanced, true);
  assert.equal(f.financerId, 'FIN-002');
  assert.equal(f.financerName, 'BDO Green Energy Financing');
  assert.equal(f.ownerName, expected.ownerName);
  assert.equal(f.contractStatus, expected.status);
  assert.equal(f.contractEndDate, '2026-08-01');
  assert.equal(f.fundedAmount, Number(bdoApp.amount));
  assert.equal(bdoApp.financer, 'BDO Green Energy Financing', 'original financer must not be overwritten');

  const fullApp = db.data.applications.find(a => a.financer === 'Not Required');
  assert.equal(db.getApplicationFunding(fullApp).isFinanced, false);
});

test('expected revenue uses current-period scheduled amounts split by owner; funded split keeps original source', () => {
  const { db } = environment();
  // Money sums are compared to the centavo: summation order differs between KPI code and this check
  const cents = v => Math.round(Number(v) * 100);
  const asOf = '2026-10-04T12:00:00';
  const periodAmount = pred => db.getApplications()
    .filter(pred)
    .flatMap(a => (db.getPaymentSchedule(a.id)?.installments || []).filter(i => String(i.dueDate).slice(0, 7) === '2026-10'))
    .reduce((s, i) => s + (Number(i.status === 'Paid' ? (i.paidAmount || i.amount) : i.amount) || 0), 0);

  const k = db.getPaymentsKpis({ asOf });
  assert.equal(k.revenuePeriod, '2026-10');
  assert.equal(k.totalExpectedRevenue, k.hsRevenue + k.thirdPartyRevenue);
  assert.notEqual(k.totalExpectedRevenue, k.totalPortfolio);
  assert.equal(cents(k.totalExpectedRevenue), cents(periodAmount(() => true)));
  // FIN-002 (expired) current-period installments count as HS revenue
  const bdo = periodAmount(a => a.financerId === 'FIN-002');
  assert.ok(bdo > 0);
  assert.equal(cents(k.hsRevenue), cents(periodAmount(a => !db.getApplicationFunding(a).isFinanced) + bdo));

  // Re-activate every contract -> all financed current-period revenue is third party; funded split unchanged
  db.data.financers.forEach(f => { f.contractStartDate = '2020-01-01'; f.contractEndDate = '2099-01-01'; f.contractStatusOverride = null; });
  const active = db.getPaymentsKpis({ asOf });
  assert.equal(active.hsFunded, k.hsFunded);
  assert.equal(active.thirdPartyFunded, k.thirdPartyFunded);
  assert.equal(cents(active.thirdPartyRevenue), cents(periodAmount(a => db.getApplicationFunding(a).isFinanced)));

  // Pending Start -> HS
  const fin1 = db.data.financers.find(f => f.id === 'FIN-001');
  fin1.contractStartDate = '2099-01-01'; fin1.contractEndDate = '2100-01-01';
  const pending = db.getPaymentsKpis({ asOf });
  assert.equal(pending.hsRevenue, active.hsRevenue + periodAmount(a => a.financerId === 'FIN-001'));
  assert.ok(db.data.applications.filter(a => a.financerId === 'FIN-001').every(a => a.financer === 'SunFund Philippines'));
});

test('collected payments are not moved retroactively when ownership changes', () => {
  const { db } = environment();
  const asOf = '2026-10-20T12:00:00';
  const fin1 = db.data.financers.find(f => f.id === 'FIN-001');
  fin1.contractStartDate = '2020-01-01'; fin1.contractEndDate = '2099-01-01'; fin1.contractStatusOverride = null;
  // Mark one FIN-001 October installment as collected on Oct 5, while the contract was Active
  const app = db.getApplications().find(a => a.financerId === 'FIN-001' && (db.getPaymentSchedule(a.id).installments || []).some(i => String(i.dueDate).startsWith('2026-10')));
  const inst = db.getPaymentSchedule(app.id).installments.find(i => String(i.dueDate).startsWith('2026-10'));
  Object.assign(inst, { status: 'Paid', paidDate: '2026-10-05', paidAmount: inst.amount });
  const before = db.getPaymentsKpis({ asOf });

  // Contract expires on Oct 10: collected Oct-5 payment stays third party; unpaid FIN-001 amounts move to HS
  fin1.contractEndDate = '2026-10-10';
  const after = db.getPaymentsKpis({ asOf });
  const unpaidFin1 = db.getApplications().filter(a => a.financerId === 'FIN-001')
    .flatMap(a => db.getPaymentSchedule(a.id).installments.filter(i => String(i.dueDate).startsWith('2026-10') && i.status !== 'Paid'))
    .reduce((s, i) => s + Number(i.amount), 0);
  assert.equal(after.hsRevenue, before.hsRevenue + unpaidFin1);
  assert.equal(after.thirdPartyRevenue, before.thirdPartyRevenue - unpaidFin1);
  assert.equal(after.totalExpectedRevenue, before.totalExpectedRevenue);
  assert.ok(after.thirdPartyRevenue >= inst.amount);
});
