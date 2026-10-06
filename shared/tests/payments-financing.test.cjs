// Super Admin financer assignment and installment receipt verification on shared APP records.
// Run: node --test shared/tests/
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { environment } = require('./helpers.cjs');
const { makeFinancerContext } = require('../../Hello_Solar_Financer/scripts/shared-env.cjs');

const notesOf = env => JSON.parse(env.store.get('hello_solar_notifications_store') || '[]');

function newInstallmentCustomer(db, email) {
  const ids = db.generateProjectIds();
  const created = db.createAccount({
    role: 'Customer', firstName: 'Test', lastName: 'Buyer', email, phone: '0917', password: 'Pw123456!',
    status: 'Active', system: 'HS 6 LITE', projectType: 'Residential Solar', paymentType: 'Installment', ...ids
  });
  assert.equal(created.success, true);
  return { ids, created };
}

// ---- Financer assignment ----
test('Super Admin assigns only Active-contract financers; the application then appears only for that financer', () => {
  const env = environment();
  const { c, S } = env, db = c.HELLO_SOLAR_DB;
  const assignable = db.getAssignableFinancers().map(f => f.id);
  assert.ok(assignable.includes('FIN-005') && assignable.includes('FIN-001'));
  assert.ok(!assignable.includes('FIN-002'), 'expired contract excluded');
  assert.ok(!assignable.includes('FIN-006'), 'no contract excluded');

  const { ids } = newInstallmentCustomer(db, 'lia@example.test');
  assert.equal(S.getApplication(ids.appId).financerId, null);
  assert.equal(db.assignFinancer(ids.appId, 'FIN-002').success, false, 'expired financer refused');
  assert.equal(db.assignFinancer(ids.appId, 'FIN-006').success, false, 'no-contract financer refused');
  db.updateAccountStatus('financers', 'FIN-004', 'Inactive');
  assert.ok(!db.getAssignableFinancers().some(f => f.id === 'FIN-004'), 'inactive financer not offered');
  assert.equal(db.assignFinancer(ids.appId, 'FIN-004').success, false, 'inactive financer refused');
  assert.equal(db.assignFinancer('APP-8821', 'FIN-005').success, false, 'full payment needs no financer');

  const res = db.assignFinancer(ids.appId, 'FIN-005');
  assert.equal(res.success, true);
  const app = S.getApplication(ids.appId);
  assert.equal(app.financerId, 'FIN-005');
  assert.equal(app.financer, 'SolarTech Financer');
  assert.equal(app.stage, 'Financing Review');
  assert.equal(app.hsId, ids.hsId, 'same APP record (APP ID / HS ID unchanged)');
  assert.ok(notesOf(env).some(n => n.recipientRole === 'financer' && n.recipientId === 'FIN-005' && n.recordId === ids.appId));
  assert.ok(S.read().activity.some(a => a.record === ids.appId && /assigned .* to financer FIN-005/.test(a.action)));

  const storage = Object.fromEntries(env.store);
  const fin5 = makeFinancerContext(storage, 'FIN-005');
  assert.ok(fin5.HelloSolarStore.getApplicationById(ids.appId), 'visible to the assigned financer');
  assert.ok(fin5.HelloSolarStore.approveFinancing(ids.appId), 'assigned financer can decide it');
  const fin1 = makeFinancerContext(storage, 'FIN-001');
  assert.equal(fin1.HelloSolarStore.getApplicationById(ids.appId), null, 'not visible to other financers');
});

// ---- Installment receipt verification ----
const SEP_BILL = { billId: 'bill-77310-09', period: 'Sep 2026', dueDate: '2026-09-30', amount: '₱6,200' };

test('installment receipt: verify marks the matching billing period Paid and notifies the customer', () => {
  const env = environment();
  const { c, S } = env, db = c.HELLO_SOLAR_DB;
  const r = S.submitReceipt('CUS-1010', 'APP-4085', { fileName: 'gcash.png', channel: 'GCash', amount: '₱6,200', date: '2026-10-05', reference: 'GC-1', bills: [SEP_BILL] });
  assert.equal(r.ok, true);
  assert.equal(S.submitReceipt('CUS-1010', 'APP-4085', { fileName: 'dup.png', bills: [SEP_BILL] }).ok, false, 'no duplicate pending receipt for the same period');
  db.data = db.load();
  const pending = db.getPendingInstallmentReceipt('APP-4085');
  assert.equal(pending.id, r.submission.id);
  assert.equal(db.verifyInstallmentReceipt('APP-8821', 'x').success, false, 'full payment uses its own flow');

  const v = db.verifyInstallmentReceipt('APP-4085', pending.id);
  assert.equal(v.success, true);
  const app = S.getApplication('APP-4085');
  assert.equal(app.billStatus['bill-77310-09'].status, 'Paid');
  assert.equal(app.receiptVerificationStatus, 'Verified');
  assert.equal(app.receiptSubmissions[0].status, 'Verified');
  const sched = S.read().paymentSchedules['APP-4085'];
  const inst = sched.installments.find(i => i.no === v.installments[0]);
  assert.equal(inst.status, 'Paid');
  assert.equal(String(inst.dueDate).slice(0, 7), '2026-09', 'the September installment was settled');
  assert.equal(inst.reference, 'GC-1');
  assert.ok(sched.history.some(h => h.ref === 'GC-1' && h.status === 'Verified'));
  assert.equal(db.getPendingInstallmentReceipt('APP-4085'), null);
  assert.ok(notesOf(env).some(n => n.recipientId === 'CUS-1010' && n.title === 'Payment Verified' && n.recordId === 'APP-4085'));
});

test('installment receipt: reject sets Re-upload Required; a new receipt for the period can then be verified', () => {
  const env = environment();
  const { c, S } = env, db = c.HELLO_SOLAR_DB;
  const first = S.submitReceipt('CUS-1010', 'APP-4085', { fileName: 'blurry.png', amount: '6200', bills: [SEP_BILL] });
  db.data = db.load();
  assert.equal(db.rejectInstallmentReceipt('APP-4085', first.submission.id, { reason: 'Unreadable' }).success, true);
  let app = S.getApplication('APP-4085');
  assert.equal(app.billStatus['bill-77310-09'].status, 'Re-upload Required');
  assert.equal(app.billStatus['bill-77310-09'].reason, 'Unreadable');
  assert.equal(app.receiptVerificationStatus, 'Rejected');
  assert.equal(app.receiptSubmissions[0].status, 'Re-upload Required');
  assert.equal(S.read().paymentSchedules['APP-4085'].installments.filter(i => i.status === 'Re-upload Required').length, 1);
  assert.ok(notesOf(env).some(n => n.recipientId === 'CUS-1010' && n.title === 'Receipt Re-upload Required'));

  const second = S.submitReceipt('CUS-1010', 'APP-4085', { fileName: 'clear.png', amount: '6200', bills: [SEP_BILL] });
  assert.equal(second.ok, true, 're-upload accepted');
  db.data = db.load();
  assert.equal(db.verifyInstallmentReceipt('APP-4085', second.submission.id).success, true);
  app = S.getApplication('APP-4085');
  assert.equal(app.billStatus['bill-77310-09'].status, 'Paid');
  assert.equal(S.read().paymentSchedules['APP-4085'].installments.filter(i => i.status === 'Re-upload Required').length, 0);
});

test('installment receipt for a Super Admin–created customer settles the exact linked installment', () => {
  const env = environment();
  const { c, S } = env, db = c.HELLO_SOLAR_DB;
  const { ids, created } = newInstallmentCustomer(db, 'ana@example.test');
  db.assignFinancer(ids.appId, 'FIN-005');
  db.data = db.load();
  const sched = db.getPaymentSchedule(ids.appId);
  db.save();
  const target = sched.installments[2];
  const r = S.submitReceipt(created.id, ids.appId, { fileName: 'r.png', amount: String(target.amount), bills: [{ billId: `${ids.appId}-I${target.no}`, dueDate: target.dueDate, amount: target.amount }] });
  assert.equal(r.ok, true);
  db.data = db.load();
  const v = db.verifyInstallmentReceipt(ids.appId, r.submission.id);
  assert.equal(JSON.stringify(v.installments), JSON.stringify([target.no]));
  assert.equal(S.read().paymentSchedules[ids.appId].installments.find(i => i.no === target.no).status, 'Paid');
});

test('full payment verification flow is unchanged', () => {
  const { c, S } = environment();
  const db = c.HELLO_SOLAR_DB;
  S.submitReceipt('CUS-1010', 'APP-8821', { fileName: 'bdo.png', amount: '320000' });
  db.data = db.load();
  assert.equal(db.getPendingInstallmentReceipt('APP-8821'), null, 'not an installment receipt');
  assert.equal(db.verifyPaymentReceipt('APP-8821').success, true);
  const app = S.getApplication('APP-8821');
  assert.equal(app.paymentStatus, 'Verified / Paid');
  assert.equal(app.stage, 'Ready for Installation');
});
