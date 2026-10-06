// Integration tests for the shared data layer against the Super Admin seed. Run: node --test shared/tests/
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');

const { environment, ROOT } = require('./helpers.cjs');

test('seed: every application has a unique 5-digit HS ID and every customer app link resolves', () => {
  const { S } = environment();
  const data = S.read();
  const ids = data.applications.map(a => a.hsId);
  assert.ok(ids.every(id => /^HS-\d{5}$/.test(id)), 'all HS IDs are HS-#####');
  assert.equal(new Set(ids).size, ids.length, 'HS IDs are unique');
  data.customers.forEach(c => {
    const app = data.applications.find(a => a.id === c.appId);
    assert.ok(app, `${c.id} app ${c.appId} exists`);
    assert.equal(app.hsId, c.hsId, `${c.id} HS ID matches its application`);
  });
});

test('demo identities are shared records and authenticate only for their own role', () => {
  const { S } = environment();
  const cases = [['customer', 'customer@hellosolar.ph', 'CUS-1010'], ['financer', 'financer@hellosolar.ph', 'FIN-005'],
    ['installer', 'installer@hellosolar.ph', 'INS-006'], ['merchant', 'merchant@hellosolar.ph', 'MER-026']];
  for (const [role, email, id] of cases) {
    const r = S.authenticate(role, email, 'password123');
    assert.equal(r.ok, true, `${role} logs in`);
    assert.equal(r.account.id, id);
    for (const other of ['customer', 'financer', 'installer', 'merchant'].filter(x => x !== role)) {
      assert.equal(S.authenticate(other, email, 'password123').ok, false, `${email} cannot log into ${other}`);
    }
  }
  assert.equal(S.authenticate('financer', 'customer@hellosolar.ph', 'password123').ok, false, 'no catch-all "solar" financer login');
  assert.equal(S.authenticate('installer', 'installer-anything', 'password123').ok, false, 'no catch-all installer login');
  assert.equal(S.authenticate('merchant', 'merchant@hellosolar.ph', 'wrong').ok, false, 'merchant password is checked');
  assert.equal(S.authenticate('installer', 'engineering@hellosolar.ph', '').ok, false, 'internal team is not a partner login');
});

test('Super Admin-created accounts log into their own portal; inactive accounts cannot', () => {
  const { c, S } = environment();
  const db = c.HELLO_SOLAR_DB;
  for (const [role, portal] of [['Installer', 'installer'], ['Financer', 'financer'], ['Merchant', 'merchant']]) {
    const res = db.createAccount({ role, firstName: 'Test', lastName: role, email: `${portal}.new@example.test`, phone: '0917', password: 'Secret123!', status: 'Active', companyName: `${role} Co` });
    assert.equal(res.success, true);
    assert.equal(S.authenticate(portal, `${portal}.new@example.test`, 'Secret123!').ok, true, `${role} created by Super Admin can log in`);
    db.updateAccountStatus(res.tabKey, res.id, 'Inactive');
    assert.equal(S.authenticate(portal, `${portal}.new@example.test`, 'Secret123!').ok, false, `${role} deactivated cannot log in`);
  }
  const ids = db.generateProjectIds();
  const cust = db.createAccount({ role: 'Customer', firstName: 'New', lastName: 'Buyer', email: 'buyer@example.test', phone: '0918', password: 'Temp123!', status: 'Active', system: 'HS 6 LITE', projectType: 'Residential Solar', ...ids });
  assert.equal(cust.success, true);
  const login = S.authenticate('customer', 'buyer@example.test', 'Temp123!');
  assert.equal(login.ok, true);
  assert.equal(S.read().customers.find(x => x.id === cust.id).invitationStatus, 'Active', 'first login completes the invitation');
  assert.equal(JSON.stringify(S.applicationsForCustomer(cust.id).map(a => a.id)), JSON.stringify([ids.appId]));
});

test('sessions are isolated per role and end when the account is deactivated', () => {
  const { c, S, store, redirects } = environment();
  const acc = S.authenticate('financer', 'financer@hellosolar.ph', 'password123').account;
  S.session.start('financer', acc);
  assert.equal(store.get('hello_solar_financer_logged_in'), 'true');
  for (const key of ['hello_solar_logged_in', 'hello_solar_merchant_logged_in', 'hello_solar_installer_logged_in']) {
    assert.equal(store.has(key), false, `financer login does not set ${key}`);
  }
  assert.equal(S.session.get('customer'), null);
  assert.equal(JSON.parse(store.get('hello_solar_financer_user')).password, undefined, 'no password in session');
  assert.ok(S.session.require('financer'));
  c.HELLO_SOLAR_DB.data = c.HELLO_SOLAR_DB.load();
  c.HELLO_SOLAR_DB.updateAccountStatus('financers', 'FIN-005', 'Inactive');
  assert.equal(S.session.require('financer'), null);
  assert.deepEqual(redirects, ['login.html']);
  assert.equal(store.has('hello_solar_financer_logged_in'), false);
  // Legacy-format sessions without an account ID are rejected
  store.set('hello_solar_logged_in', 'true');
  store.set('hello_solar_user', JSON.stringify({ name: 'Juan Dela Cruz', accountNo: 'HS-88219' }));
  assert.equal(S.session.isValid('customer'), false);
});

test('portal signup registers a Pending Review shared account that cannot log in until activated', () => {
  const { c, S } = environment();
  const r = S.registerPendingAccount('merchant', { name: 'Signup Supply', contact: 'Ana', phone: '0917', password: 'Pw123456!' , email: 'signup@example.test' });
  assert.equal(r.ok, true);
  assert.match(r.account.id, /^MER-\d{3}$/);
  assert.equal(S.authenticate('merchant', 'signup@example.test', 'Pw123456!').ok, false);
  assert.equal(S.registerPendingAccount('customer', { email: 'signup@example.test' }).ok, false, 'email unique across roles');
  c.HELLO_SOLAR_DB.data = c.HELLO_SOLAR_DB.load();
  c.HELLO_SOLAR_DB.updateAccountStatus('merchants', r.account.id, 'Active');
  assert.equal(S.authenticate('merchant', 'signup@example.test', 'Pw123456!').ok, true);
});

test('stored data from before the shared identity model is migrated without overwriting', () => {
  const { c } = environment();
  const old = JSON.parse(JSON.stringify(c.HELLO_SOLAR_DB.data));
  delete old.schemaVersion;
  old.applications = old.applications.filter(a => !['APP-4091', 'APP-1103'].includes(a.id));
  old.applications.forEach(a => { delete a.hsId; delete a.assignedInstallerId; });
  old.customers = old.customers.filter(x => x.id !== 'CUS-1010');
  old.applications.find(a => a.id === 'APP-1024').notes = 'kept';
  const { S } = environment([['HELLO_SOLAR_SUPER_ADMIN_DATA_V2', JSON.stringify(old)]]);
  const data = S.read();
  assert.equal(data.schemaVersion, 5);
  assert.ok(data.applications.find(a => a.id === 'APP-4091'));
  assert.ok(data.customers.find(x => x.id === 'CUS-1010'));
  assert.equal(data.applications.find(a => a.id === 'APP-1024').notes, 'kept');
  assert.equal(data.applications.find(a => a.id === 'APP-1048').assignedInstallerId, 'INS-002');
  assert.ok(data.applications.every(a => a.hsId));
});

test('installer visibility: own and pool jobs only; never Direct or other installers', () => {
  const { S } = environment();
  const data = S.read();
  const visible = ins => data.applications.filter(a => S.isVisibleToInstaller(a, data.installers.find(i => i.id === ins))).map(a => a.id);
  const ins6 = visible('INS-006');
  const ins2 = visible('INS-002');
  for (const id of ['APP-1062', 'APP-1070', 'APP-1102', 'APP-1058']) {
    assert.ok(!ins6.includes(id) && !ins2.includes(id), `${id} (Hello Solar Direct) hidden from partners`);
  }
  assert.ok(ins2.includes('APP-1048') && !ins6.includes('APP-1048'), 'APP-1048 only for INS-002');
  assert.ok(!ins6.includes('APP-1056'), 'GreenVolt job hidden from INS-006');
  assert.ok(ins6.includes('APP-4085'), 'own in-progress job visible');
  for (const id of ['APP-1031', 'APP-8821', 'APP-1075', 'APP-1082', 'APP-1089', 'APP-1103']) {
    assert.ok(!ins6.includes(id), `${id} (not cleared for installation) hidden`);
  }
  assert.ok(ins6.includes('APP-1024') && ins2.includes('APP-1024'), 'cleared, unassigned partner job is in the pool');
});

function installerEnv() {
  const env = environment();
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'Hello_Solar_Installer/assets/js/installer_data.js'), 'utf8'), env.c);
  return env;
}
function signInInstaller(env, accountId) {
  const acc = env.S.getAccount('installer', accountId);
  env.S.session.start('installer', acc, { businessName: acc.name, fullName: acc.contact });
}

test('installer portal job list: Super Admin assignment, Direct acceptance and decline', async () => {
  const env = installerEnv();
  const { c, S } = env, db = c.HELLO_SOLAR_DB, inst = c.InstallerData;
  await inst.loadData();
  signInInstaller(env, 'INS-006');
  const ids = () => inst.getJobs().map(j => j.id);
  assert.ok(ids().includes('APP-4085'), 'own assigned job');
  assert.ok(!ids().includes('APP-1048') && !ids().includes('APP-1062'), 'no other-installer or Direct jobs');
  assert.ok(!ids().some(id => ['APP-1027', 'APP-1035', 'APP-1021', 'APP-1031', 'APP-1033'].includes(id)), 'portal sample jobs are not merged');
  // Super Admin assigns APP-1050 (pool) to INS-002 -> leaves INS-006's view
  assert.ok(ids().includes('APP-1050'));
  db.data = db.load();
  db.assignPartnerInstaller('APP-1050', 'SolarTech Visayas Solutions');
  assert.equal(S.getApplication('APP-1050').assignedInstallerId, 'INS-002');
  assert.ok(!ids().includes('APP-1050'), 'assigned to another installer');
  signInInstaller(env, 'INS-002');
  assert.ok(ids().includes('APP-1050'), 'assignee sees it');
  // Super Admin accepts APP-1094 for Hello Solar Direct -> hidden from all partners
  db.data = db.load();
  db.acceptDirectInstallation('APP-1094');
  assert.ok(!ids().includes('APP-1094'));
  signInInstaller(env, 'INS-006');
  assert.ok(!ids().includes('APP-1094'));
  // Decline returns a pool job for reassignment and hides it from the decliner only
  assert.equal(inst.declineJob('APP-1024').success, true);
  assert.ok(!ids().includes('APP-1024'));
  signInInstaller(env, 'INS-002');
  assert.ok(ids().includes('APP-1024'));
  // No session / unknown installer -> no jobs and no writes
  S.session.clear('installer');
  assert.equal(inst.getJobs().length, 0);
  assert.equal(inst.acceptJob('APP-1024').success, false);
});

test('customer links an unlinked system only with the owner contact on record', () => {
  const { S } = environment();
  assert.equal(S.claimApplicationByHsId('CUS-1010', 'HS-55201', 'someone@else.com').ok, false, 'wrong contact');
  assert.equal(S.claimApplicationByHsId('CUS-1010', 'HS-21048', 'rgomez.cebu@yahoo.com').ok, false, "another customer's system");
  assert.equal(S.claimApplicationByHsId('CUS-1010', 'HS-88219', 'customer@hellosolar.ph').ok, false, 'already linked');
  assert.equal(S.claimApplicationByHsId('CUS-1010', 'HS-99999', 'x').ok, false, 'unknown HS ID');
  const r = S.claimApplicationByHsId('CUS-1010', 'hs-55201', '0917 555 0199');
  assert.equal(r.ok, true, 'phone match links it');
  assert.equal(S.getApplication('APP-4072').customerId, 'CUS-1010');
  assert.equal(S.claimApplicationByHsId('CUS-1011', 'HS-55201', 'juan.delacruz@hellosolar.ph').ok, false, 'cannot be claimed twice');
});

test('customer receipt reaches Super Admin verification; verification clears the job for installers', () => {
  const env = environment();
  const { c, S } = env, db = c.HELLO_SOLAR_DB;
  assert.equal(S.submitReceipt('CUS-1011', 'APP-8821', { fileName: 'x.png' }).ok, false, "cannot submit for another customer's system");
  const r = S.submitReceipt('CUS-1010', 'APP-8821', { fileName: 'bdo.png', channel: 'BDO', amount: '₱320,000', date: '2026-10-05', reference: 'HS-10492-FP' });
  assert.equal(r.ok, true);
  let app = S.getApplication('APP-8821');
  assert.equal(app.paymentStatus, 'Verification Required');
  assert.equal(app.uploadedReceipt, 'bdo.png');
  assert.equal(app.receiptAmount, 320000);
  assert.equal(S.isClearedForInstallation(app), false, 'not cleared before verification');
  db.data = db.load();
  assert.equal(db.verifyPaymentReceipt('APP-8821').success, true);
  app = S.getApplication('APP-8821');
  assert.equal(S.isClearedForInstallation(app), true);
  assert.ok(S.isVisibleToInstaller(app, S.getAccount('installer', 'INS-006')), 'enters the partner pool');
  // Installment receipt is recorded as a pending submission without touching the payment status
  const before = S.getApplication('APP-4085').paymentStatus;
  assert.equal(S.submitReceipt('CUS-1010', 'APP-4085', { fileName: 'gcash.png', amount: '6,200', billIds: ['bill-1'] }).ok, true);
  const inst = S.getApplication('APP-4085');
  assert.equal(inst.paymentStatus, before);
  assert.equal(inst.receiptSubmissions[0].status, 'Pending Verification');
  assert.equal(JSON.stringify(inst.receiptForBills), JSON.stringify(['bill-1']));
});

test('customer support ticket lands in the Super Admin support queue linked by APP ID', () => {
  const { c, S } = environment();
  const r = S.createSupportTicket({ accountType: 'Customer', accountId: 'CUS-1010', accountName: 'Juan Dela Cruz', relatedId: 'APP-4091', hsId: 'HS-88219', subject: 'Inverter fault', category: 'Inverter', description: 'E-21' });
  assert.equal(r.ok, true);
  assert.match(r.ticket.id, /^SUP-\d{3}$/);
  const db = c.HELLO_SOLAR_DB; db.data = db.load();
  const t = db.data.support.find(x => x.id === r.ticket.id);
  assert.equal(t.accountType, 'Customer');
  assert.equal(t.relatedId, 'APP-4091');
  assert.equal(t.status, 'Open');
  db.resolveSupportTicket(t.id, 'Reset inverter remotely');
  assert.equal(S.supportTicketsFor('Customer', 'CUS-1010').find(x => x.id === t.id).status, 'Resolved', 'customer sees the admin resolution');
  assert.equal(S.supportTicketsFor('Customer', 'CUS-1011').length, 0, 'other customers do not see it');
});

test('customer document uploads are what Super Admin reviews, and the verdict flows back', () => {
  const { c, S, store } = environment();
  store.set('hello_solar_shared_documents', JSON.stringify({ 'APP-1105': { appId: 'APP-1105', documents: [
    { id: 'gov_id_front', name: 'Valid Government ID — Front / Main Page', status: 'SUBMITTED', fileName: 'id.png', uploadedAt: '2026-10-01T00:00:00Z' },
    { id: 'gov_id_back', name: 'Valid Government ID — Back', optional: true, status: 'NOT_SUBMITTED' }
  ] } }));
  const db = c.HELLO_SOLAR_DB; db.data = db.load();
  const docs = db.getAppDocuments('APP-1105');
  // Shared request list: 4 required documents; optional not-submitted documents are not listed
  assert.equal(JSON.stringify(docs.map(d => d.status)), JSON.stringify(['Submitted', 'Missing', 'Missing', 'Missing']));
  assert.equal(docs[0].file, 'id.png');
  db.updateDocumentStatus('APP-1105', 'Valid Government ID — Front / Main Page', 'Verified');
  assert.equal(S.documentsFor('APP-1105').documents[0].status, 'ACCEPTED');
  assert.equal(db.data.applications.find(a => a.id === 'APP-1105').documents, undefined, 'no Super Admin copy of the documents');
  // A later customer re-upload is seen by Super Admin (no stale copy)
  const raw = JSON.parse(store.get('hello_solar_shared_documents'));
  Object.assign(raw['APP-1105'].documents.find(d => d.id === 'proof_of_income'), { status: 'SUBMITTED', fileName: 'payslip.pdf' });
  store.set('hello_solar_shared_documents', JSON.stringify(raw));
  assert.equal(db.getAppDocuments('APP-1105').find(d => d.name === 'Proof of Income').file, 'payslip.pdf');
  // Without uploads the list comes from the shared record — no invented files or verdicts
  const fallback = db.getAppDocuments('APP-1075');
  assert.ok(fallback.every(d => d.file === null && d.date === null && d.status === 'Missing'));
});

test('Customer and Financer read the same shared document record by APP ID', () => {
  const { S } = environment();
  // First open (either portal) creates the record from the shared request list
  const rec = S.documentRecordFor('APP-1105');
  assert.equal(JSON.stringify(rec.documents.map(d => d.id)), JSON.stringify(S.DOCUMENT_REQUESTS.map(d => d.id)));
  assert.ok(rec.documents.every(d => d.status === 'NOT_SUBMITTED'));
  // Commissioned systems start with the required documents Accepted
  assert.ok(S.documentRecordFor('APP-4091').documents.filter(d => !d.optional).every(d => d.status === 'ACCEPTED'));
  // Full-payment applications have no installment document record
  assert.equal(S.documentRecordFor('APP-8821'), null);
  // A review verdict is visible on the same record for every reader
  S.setDocumentStatus('APP-1105', 'proof_of_income', 'REUPLOAD_REQUIRED', 'Blurry copy');
  const again = S.documentsFor('APP-1105').documents.find(d => d.id === 'proof_of_income');
  assert.equal(again.status, 'REUPLOAD_REQUIRED');
  assert.equal(again.note, 'Blurry copy');
  assert.equal(S.documentSummary(S.documentsFor('APP-1105')).reuploadRequired, 1);
});

test('Assign Partner Installer offers only Active partner installer accounts and links by ID', () => {
  const { c, S } = environment();
  const db = c.HELLO_SOLAR_DB;
  db.data = db.load();
  const ids = () => db.getAssignablePartnerInstallers().map(i => i.id);
  assert.ok(ids().includes('INS-006'), 'portal partner account is offered');
  assert.ok(!ids().includes('INS-001'), 'internal team excluded');
  assert.ok(!ids().includes('INS-005'), 'inactive partner excluded');
  // Newly created partner appears once Active; engineers never do
  db.updateAccountStatus('installers', 'INS-002', 'Suspended');
  assert.ok(!ids().includes('INS-002'), 'suspended partner excluded');
  assert.equal(db.assignPartnerInstaller('APP-1050', 'INS-002').success, false);
  assert.equal(db.assignPartnerInstaller('APP-1050', 'INS-001').success, false);
  const res = db.assignPartnerInstaller('APP-1050', 'INS-006', 'Oct 12');
  assert.equal(res.success, true);
  const app = S.getApplication('APP-1050');
  assert.equal(app.assignedInstallerId, 'INS-006');
  assert.equal(app.installer, 'SolarTech Installer');
  const notes = JSON.parse(c.localStorage.getItem('hello_solar_notifications_store') || '[]');
  assert.ok(notes.some(n => n.recipientRole === 'installer' && n.recipientId === 'INS-006' && n.recordId === 'APP-1050'));
});

test('customer billing for a shared APP comes only from the shared payment schedule', () => {
  const { c, S } = environment();
  const sched = S.paymentScheduleFor('APP-4091');
  assert.equal(sched.installments.length, 60);
  assert.equal(JSON.stringify(sched.installments.slice(0, 6).map(i => [i.dueDate, i.status])), JSON.stringify([
    ['2026-05-01', 'Paid'], ['2026-06-01', 'Paid'], ['2026-07-01', 'Paid'], ['2026-08-01', 'Paid'], ['2026-09-01', 'Paid'], ['2026-10-15', 'Upcoming']]));
  assert.equal(S.paymentScheduleFor('APP-4085').installments[2].status, 'Overdue');
  // A generated schedule is saved on first read so its dates stay fixed
  assert.ok(!S.read().paymentSchedules['APP-1048']);
  const gen = S.paymentScheduleFor('APP-1048');
  assert.ok(gen && gen.installments.length);
  assert.equal(JSON.stringify(S.read().paymentSchedules['APP-1048']), JSON.stringify(gen));
  // Receipt for installment #3 of APP-4085 (exact APP-####-I# link) → verified → schedule installment Paid
  const r = S.submitReceipt('CUS-1010', 'APP-4085', { fileName: 'r.png', amount: '6200', reference: 'REF1',
    bills: [{ billId: 'APP-4085-I3', period: 'Sep 2026', dueDate: '2026-09-30', amount: 6200 }] });
  assert.equal(r.ok, true);
  const db = c.HELLO_SOLAR_DB; db.data = db.load();
  assert.equal(db.verifyInstallmentReceipt('APP-4085', r.submission.id).success, true);
  const after = S.paymentScheduleFor('APP-4085');
  assert.equal(after.installments[2].status, 'Paid');
  assert.equal(after.installments[2].reference, 'REF1');
  assert.ok(after.history.some(h => h.ref === 'REF1' && h.installmentNo === 3));
});

test('stored demo schedules are migrated to the shared APP schedule unless a receipt was applied', () => {
  const { c } = environment();
  const old = JSON.parse(JSON.stringify(c.HELLO_SOLAR_DB.data));
  old.schemaVersion = 3;
  old.paymentSchedules = {
    'APP-4091': { appId: 'APP-4091', installments: [{ no: 1, dueDate: '2026-01-15', status: 'On Time' }], history: [] },
    'APP-4088': { appId: 'APP-4088', installments: [{ no: 1, dueDate: '2026-01-20', status: 'Paid', notes: 'Customer receipt RCPT-1 verified by ADMIN.' }], history: [] }
  };
  const { S } = environment([['HELLO_SOLAR_SUPER_ADMIN_DATA_V2', JSON.stringify(old)]]);
  const data = S.read();
  assert.equal(data.schemaVersion, 5);
  assert.equal(data.paymentSchedules['APP-4091'].installments[0].dueDate, '2026-05-01');
  assert.equal(data.paymentSchedules['APP-4088'].installments[0].dueDate, '2026-01-20', 'receipt history kept');
  assert.ok(data.paymentSchedules['APP-4072'].seeded);
});

test('financer decision notifies only that application\'s customer', () => {
  const fin = require('../../Hello_Solar_Financer/scripts/shared-env.cjs').makeFinancerContext();
  const store = fin.HelloSolarStore;
  // APP-1105 belongs to CUS-1001 (same applicant email); put it back in review to decide it
  fin.HSShared.update(d => { d.applications.find(a => a.id === 'APP-1105').stage = 'Under Review'; });
  assert.ok(store.approveFinancing('APP-1105'));
  const notes = JSON.parse(fin.storage.hello_solar_notifications_store || '[]').filter(n => n.recordId === 'APP-1105');
  assert.equal(notes.length, 1);
  assert.equal(notes[0].recipientRole, 'customer');
  assert.equal(notes[0].recipientId, 'CUS-1001');
});

test('installer milestones notify only the application\'s customer', async () => {
  const env = installerEnv();
  const { c, S, store } = env, db = c.HELLO_SOLAR_DB, inst = c.InstallerData;
  await inst.loadData();
  S.submitReceipt('CUS-1010', 'APP-8821', { fileName: 'r.png', amount: '320000' });
  db.data = db.load();
  db.verifyPaymentReceipt('APP-8821');
  signInInstaller(env, 'INS-006');
  assert.equal(inst.acceptJob('APP-8821').success, true);
  assert.equal(inst.startInstallation('APP-8821').success, true);
  const notes = JSON.parse(store.get('hello_solar_notifications_store') || '[]').filter(n => n.recordId === 'APP-8821' && n.recipientRole === 'customer');
  assert.deepEqual(notes.map(n => n.title).sort(), ['Installation Started', 'Installer Assigned']);
  assert.ok(notes.every(n => n.recipientId === 'CUS-1010'));
});

test('financer approval keeps financingStatus APPROVED and moves the application to Ready for Installation', () => {
  const fin = require('../../Hello_Solar_Financer/scripts/shared-env.cjs').makeFinancerContext();
  fin.HSShared.update(d => { const a = d.applications.find(x => x.id === 'APP-1105'); a.stage = 'Under Review'; a.installer = 'Unassigned'; delete a.assignedInstallerId; });
  assert.ok(fin.HelloSolarStore.approveFinancing('APP-1105'));
  const app = fin.HSShared.getApplication('APP-1105');
  assert.equal(app.stage, 'Ready for Installation');
  assert.equal(app.financingStatus, 'APPROVED');
  assert.equal(app.applicationStatus, 'READY_FOR_INSTALLATION');
  assert.equal(app.financing.financingStatus, 'APPROVED');
  assert.equal(fin.HelloSolarStore.getApplicationById('APP-1105').financingStatus, 'APPROVED', 'Financer still shows it as approved');
  // Super Admin's assignment panel unlocks (its eligibility rule is unchanged: Ready for Installation only)
  const appJs = fs.readFileSync(path.join(ROOT, 'hello_solar_super_admin/app.js'), 'utf8');
  vm.runInContext(appJs.slice(appJs.indexOf('  function isDirectProject('), appJs.indexOf('  // ==================== 2. APPLICATIONS PAGE')), fin);
  assert.equal(fin.isEligibleForDirect(app), true);
  assert.equal(fin.isEligibleForDirect({ stage: 'Approved', installer: 'Unassigned', installerType: 'Partner Installer' }), false, 'generic Approved is not eligible');
});

test('stored Financer approvals at stage Approved are migrated to Ready for Installation (schema v5)', () => {
  const { c } = environment();
  const old = JSON.parse(JSON.stringify(c.HELLO_SOLAR_DB.data));
  old.schemaVersion = 4;
  const a = old.applications.find(x => x.id === 'APP-1105');
  Object.assign(a, { stage: 'Approved', installer: 'Unassigned', financingDecision: { decision: 'Approved', by: 'FIN-005' } });
  delete a.assignedInstallerId; delete a.installationStatus;
  const b = old.applications.find(x => x.id === 'APP-1050'); // Super Admin seed approval — no Financer decision
  const { S } = environment([['HELLO_SOLAR_SUPER_ADMIN_DATA_V2', JSON.stringify(old)]]);
  assert.equal(S.read().schemaVersion, 5);
  assert.equal(S.getApplication('APP-1105').stage, 'Ready for Installation');
  assert.equal(S.getApplication('APP-1105').financingStatus, 'APPROVED');
  assert.equal(S.getApplication('APP-1050').stage, b.stage, 'non-Financer approvals untouched');
});

test('Super Admin document counts come from the shared document record, not app.docs', () => {
  const { c, S, store } = environment();
  const db = c.HELLO_SOLAR_DB; db.data = db.load();
  db.data.applications.find(a => a.id === 'APP-1105').docs = '5/5'; // stale stored value is ignored
  assert.equal(db.getAppDocumentCounts('APP-1105').label, '0/4');
  const raw = { 'APP-1105': S.documentRecordFor('APP-1105') };
  Object.assign(raw['APP-1105'].documents.find(d => d.id === 'proof_of_income'), { status: 'SUBMITTED', fileName: 'p.pdf' });
  store.set('hello_solar_shared_documents', JSON.stringify(raw));
  let n = db.getAppDocumentCounts('APP-1105');
  assert.equal(n.label, '1/4');
  assert.equal(n.verified, 0);
  S.setDocumentStatus('APP-1105', 'proof_of_income', 'ACCEPTED');
  n = db.getAppDocumentCounts('APP-1105');
  assert.equal(n.verified, 1);
  assert.equal(n.missing.length, 3);
  // Overview alert text uses the same counts
  db.data.applications.find(a => a.id === 'APP-1105').stage = 'Missing Documents';
  const alert = db.getAttentionItems ? db.getAttentionItems().find(i => i.id === 'APP-1105') : null;
  if (alert) assert.match(alert.context, /1\/4 uploaded/);
});
