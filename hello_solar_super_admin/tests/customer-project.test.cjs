const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function environment() {
  const storage = new Map();
  const context = { console, crypto, location: { protocol: 'file:' },
    localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, String(v)) },
    addEventListener() {} };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, '../shared/hello-solar-shared.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, '../Hello_Solar_Installer/assets/js/installer_data.js'), 'utf8'), context);
  return context;
}
const payload = { role: 'Customer', firstName: 'Beatrice', lastName: 'Morales',
  email: 'bea.morales@gmail.com', phone: '123456789', password: 'test-password',
  status: 'Active', system: 'HS 6 LITE', projectType: 'Residential Solar', inquiryId: 'INQ-202' };
function signIn(c, email) {
  c.localStorage.setItem('hello_solar_installer_logged_in', 'true');
  c.localStorage.setItem('hello_solar_installer_user', JSON.stringify({ email, fullName: email, businessName: 'Installer Team' }));
}

test('creates linked records once, preserves inquiry, and separates login and system status', () => {
  const c = environment(), db = c.HELLO_SOLAR_DB;
  const ids = db.generateProjectIds();
  assert.match(ids.hsId, /^HS-\d{5}$/);
  const result = db.createAccount({ ...payload, ...ids });
  assert.equal(result.success, true);
  assert.equal(result.account.appId, ids.appId);
  assert.equal(result.account.hsId, ids.hsId);
  const app = db.data.applications.find(a => a.id === ids.appId);
  assert.equal(app.hsId, ids.hsId);
  assert.equal(app.customerId, result.id);
  assert.equal(app.inquiryId, payload.inquiryId);
  assert.equal(app.systemStatus, 'Waiting for Installer');
  assert.equal(result.account.status, 'Active');
  assert.equal(app.dispatchStatus, 'New Application');
  assert.equal(db.getInquiries().find(i => i.id === payload.inquiryId).customerId, result.id);
  assert.equal(db.getInquiries().find(i => i.id === payload.inquiryId).hsId, ids.hsId);
  assert.ok(app.inquirySnapshot.message);
  assert.equal(db.createAccount(payload).success, false);
  assert.equal(db.createAccount({ ...payload, inquiryId: null }).success, false);
  const next = db.createAccount({ ...payload, inquiryId: null, email: 'second@example.com', ...ids });
  assert.equal(next.success, true);
  assert.notEqual(next.account.appId, ids.appId);
  assert.notEqual(next.account.hsId, ids.hsId);
  assert.equal(new c.HelloSolarStore().data.customers[0].hsId, next.account.hsId);
});

test('short HS IDs skip occupied customer and application IDs and wrap within five digits', () => {
  const c = environment(), db = c.HELLO_SOLAR_DB;
  c.crypto = { getRandomValues(values) { values[0] = 89999; return values; } };
  db.data.customers.push({ hsId: 'HS-99999' });
  db.data.applications.push({ hsId: 'HS-10000' });
  assert.equal(db.generateProjectIds().hsId, 'HS-10001');
});

test('installer can decline, another can accept, only assignee can start, complete and activate; state survives reload', async () => {
  const c = environment(), db = c.HELLO_SOLAR_DB, installer = c.InstallerData;
  const created = db.createAccount(payload);
  const id = created.account.appId;
  await installer.loadData();
  // Distinct, Active partner installer accounts (identity resolves by account email)
  const one = 'ops@solartechvisayas.com';      // INS-002
  const two = 'info@sunpowermasters.ph';       // INS-003
  const three = 'g.soriano@greenvolt.ph';      // INS-004
  assert.equal(installer.activateModel(id).success, false);
  signIn(c, one);
  // Unpaid full-payment application is not offered to installers until Super Admin verifies the payment
  assert.ok(!installer.getJobs().some(j => j.id === id));
  db.data = db.load();
  db.uploadCustomerReceipt(id);
  db.verifyPaymentReceipt(id);
  assert.ok(installer.getJobsByCategory('new').some(j => j.id === id));
  assert.equal(installer.activateModel(id).success, false);
  assert.equal(installer.declineJob(id).success, true);
  assert.ok(!installer.getJobs().some(j => j.id === id));
  assert.equal(installer.acceptJob(id).success, false);
  signIn(c, two);
  assert.equal(installer.acceptJob(id).success, true);
  assert.equal(installer.acceptJob(id).success, false);
  signIn(c, three);
  assert.equal(installer.activateModel(id).success, false);
  assert.ok(!installer.getJobs().some(j => j.id === id));
  signIn(c, two);
  // Status guards: activation requires Start Installation and Complete Installation first
  assert.equal(installer.activateModel(id).success, false);
  assert.equal(installer.completeInstallation(id).success, false);
  assert.equal(installer.startInstallation(id).success, true);
  assert.equal(installer.activateModel(id).success, false);
  assert.equal(installer.completeInstallation(id).success, true);
  assert.equal(installer.activateModel(id).success, true);
  const reloaded = new c.HelloSolarStore();
  const app = reloaded.data.applications.find(a => a.id === id);
  assert.equal(app.systemStatus, 'ACTIVE');
  assert.equal(app.installationStatus, 'COMPLETED');
  assert.equal(app.assignedInstallerId, 'INS-003');
  assert.equal(app.activatedBy, 'INS-003');
  assert.equal(reloaded.data.customers.find(a => a.id === created.id).status, 'Active');
  assert.equal(installer.activateModel(id).success, false);
});

test('storage failure leaves no partial customer, application, or inquiry conversion', () => {
  const c = environment(), db = c.HELLO_SOLAR_DB;
  const before = db.data.customers.length;
  c.localStorage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.equal(db.createAccount(payload).success, false);
  assert.equal(db.data.customers.length, before);
  assert.ok(!db.getInquiries().find(i => i.id === payload.inquiryId).customerId);
});

test('inquiry prefill preserves contact data, full package text, location, subject and message', () => {
  const c = environment();
  const inputs = {};
  for (const id of ['newAccFirstName', 'newAccLastName', 'newAccEmail', 'newAccPhone', 'newAccLocation', 'newAccSystem', 'newAccProjectType', 'newAccNotes']) {
    inputs[id] = { value: '', tagName: /System|Type/.test(id) ? 'SELECT' : 'INPUT', options: [], add(option) { this.options.push(option); } };
  }
  c.document = { getElementById: id => inputs[id] };
  c.Option = function(text, value) { return { text, value }; };
  c.db = c.HELLO_SOLAR_DB;
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  vm.runInContext(app.slice(app.indexOf('  function prefillInquiry('), app.indexOf('  function renderCreateAccount(')), c);
  c.prefillInquiry('INQ-202');
  const inquiry = c.db.getInquiries().find(i => i.id === 'INQ-202');
  assert.equal(inputs.newAccFirstName.value, 'Beatrice');
  assert.equal(inputs.newAccLastName.value, 'Morales');
  assert.equal(inputs.newAccEmail.value, inquiry.email);
  assert.equal(inputs.newAccPhone.value, inquiry.phone);
  assert.equal(inputs.newAccLocation.value, inquiry.location);
  assert.equal(inputs.newAccSystem.value, inquiry.package);
  assert.equal(inputs.newAccProjectType.value, inquiry.category);
  assert.ok(inputs.newAccNotes.value.includes(inquiry.message));
  assert.ok(inputs.newAccNotes.value.includes(inquiry.subject));
});

test('inactive installer cannot see or activate projects and non-customer creation still works', async () => {
  const c = environment();
  const result = c.HELLO_SOLAR_DB.createAccount(payload);
  await c.InstallerData.loadData();
  signIn(c, 'vicente@apexsolar.com.ph');
  assert.ok(!c.InstallerData.getJobs().some(j => j.id === result.account.appId));
  assert.equal(c.InstallerData.activateModel(result.account.appId).success, false);
  const before = c.HELLO_SOLAR_DB.data.applications.length;
  const partner = c.HELLO_SOLAR_DB.createAccount({ role: 'Merchant', firstName: 'Test', lastName: 'Partner', email: 'partner@example.com' });
  assert.equal(partner.success, true);
  assert.equal(c.HELLO_SOLAR_DB.data.applications.length, before);
});

test('inquiry records contain paymentPreference, customerResponse, selectedSolarModel, and electricBill', () => {
  const c = environment(), db = c.HELLO_SOLAR_DB;
  const inqs = db.getInquiries();
  assert.ok(inqs.length > 0);
  inqs.forEach(inq => {
    assert.ok(['Full Payment', 'Installment'].includes(inq.paymentPreference));
    assert.ok(['Awaiting Response', 'Proceed', 'Not Proceed'].includes(inq.customerResponse));
    assert.ok(inq.selectedSolarModel);
    assert.ok(inq.electricBill);
    assert.ok(['Unread', 'Replied'].includes(inq.status));
  });
});

test('inquiry customer response updates and logs activity', () => {
  const c = environment(), db = c.HELLO_SOLAR_DB;
  const inq = db.getInquiries().find(i => i.id === 'INQ-201');
  assert.equal(inq.customerResponse, 'Awaiting Response');
  const updated = db.updateInquiryCustomerResponse('INQ-201', 'Proceed');
  assert.equal(updated.customerResponse, 'Proceed');
  const reloaded = new c.HelloSolarStore().getInquiries().find(i => i.id === 'INQ-201');
  assert.equal(reloaded.customerResponse, 'Proceed');
});

test('inquiry prefill fills Linked Inquiry, Name, Email, Phone, Location, Selected Solar Model, and Payment Type', () => {
  const c = environment();
  const inputs = {};
  for (const id of ['newAccInquiry', 'newAccFirstName', 'newAccLastName', 'newAccEmail', 'newAccPhone', 'newAccLocation', 'newAccSystem', 'newAccProjectType', 'newAccPaymentType', 'newAccNotes']) {
    inputs[id] = { value: '', tagName: /System|Type|Inquiry/.test(id) ? 'SELECT' : 'INPUT', options: [], add(option) { this.options.push(option); } };
  }
  c.document = { getElementById: id => inputs[id] };
  c.Option = function(text, value) { return { text, value }; };
  c.db = c.HELLO_SOLAR_DB;
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  vm.runInContext(app.slice(app.indexOf('  function prefillInquiry('), app.indexOf('  function renderCreateAccount(')), c);
  c.prefillInquiry('INQ-201');
  const inquiry = c.db.getInquiries().find(i => i.id === 'INQ-201');
  assert.equal(inputs.newAccInquiry.value, 'INQ-201');
  assert.equal(inputs.newAccFirstName.value, 'Engr. Marco');
  assert.equal(inputs.newAccLastName.value, 'Villanueva');
  assert.equal(inputs.newAccEmail.value, inquiry.email);
  assert.equal(inputs.newAccPhone.value, inquiry.phone);
  assert.equal(inputs.newAccLocation.value, inquiry.location);
  assert.equal(inputs.newAccSystem.value, inquiry.selectedSolarModel);
  assert.equal(inputs.newAccPaymentType.value, inquiry.paymentPreference);
});

test('modal button behavior conforms to customer response state', () => {
  const c = environment();
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const createBtn = { style: {}, disabled: false, textContent: '', dataset: {} };
  const closeBtn = { textContent: '' };
  c.$ = selector => {
    if (selector === '#btnInquiryCreateCustomer') return createBtn;
    if (selector === '#btnInquiryClose') return closeBtn;
    return null;
  };
  vm.runInContext(app.slice(app.indexOf('  function updateInquiryModalButtons('), app.indexOf('  function openInquiryModal(')), c);

  // Awaiting Response
  c.updateInquiryModalButtons({ id: 'INQ-201', customerResponse: 'Awaiting Response' });
  assert.equal(createBtn.style.display, 'none');
  assert.equal(createBtn.disabled, true);
  assert.equal(closeBtn.textContent, 'Close');

  // Proceed
  c.updateInquiryModalButtons({ id: 'INQ-202', customerResponse: 'Proceed' });
  assert.equal(createBtn.style.display, 'inline-flex');
  assert.equal(createBtn.disabled, false);
  assert.equal(createBtn.textContent, 'Create Customer Account');
  assert.equal(closeBtn.textContent, 'Close');

  // Proceed with existing customer
  c.updateInquiryModalButtons({ id: 'INQ-202', customerResponse: 'Proceed', customerId: 'CUS-1001' });
  assert.equal(createBtn.style.display, 'inline-flex');
  assert.equal(createBtn.disabled, true);
  assert.equal(createBtn.textContent, 'Customer Created · CUS-1001');

  // Not Proceed
  c.updateInquiryModalButtons({ id: 'INQ-205', customerResponse: 'Not Proceed' });
  assert.equal(createBtn.style.display, 'none');
  assert.equal(createBtn.disabled, true);
  assert.equal(closeBtn.textContent, 'Close Inquiry');
});

test('confirmation email dispatch and customer response automate inquiry status through 4 states', () => {
  const c = environment(), db = c.HELLO_SOLAR_DB;
  const inq = db.getInquiries().find(i => i.id === 'INQ-203');
  assert.equal(inq.inquiryStatus, 'Not Sent');

  // Admin sends confirmation email -> status becomes Awaiting Response
  const sendRes = db.sendInquiryConfirmationEmail('INQ-203');
  assert.equal(sendRes.success, true);
  assert.equal(sendRes.inquiry.inquiryStatus, 'Awaiting Response');
  assert.ok(sendRes.inquiry.confirmationEmailSentAt);

  // Customer selects 'Proceed' -> status becomes Proceed
  const proceedRes = db.updateInquiryCustomerResponse('INQ-203', 'Proceed');
  assert.equal(proceedRes.inquiryStatus, 'Proceed');
  assert.equal(proceedRes.customerResponse, 'Proceed');

  // Customer selects 'Not Proceeding' -> status becomes Not Proceeding
  const notProceedRes = db.updateInquiryCustomerResponse('INQ-203', 'Not Proceeding');
  assert.equal(notProceedRes.inquiryStatus, 'Not Proceeding');
  assert.equal(notProceedRes.customerResponse, 'Not Proceed');
});

test('create account automatically dispatches activation email, issues activation link, and tracks invitation status', () => {
  const c = environment(), db = c.HELLO_SOLAR_DB;
  const ids = db.generateProjectIds();
  const res = db.createAccount({
    role: 'Customer',
    firstName: 'Clarissa',
    lastName: 'Reyes',
    email: 'clarissa.reyes@example.ph',
    phone: '+63 917 111 2233',
    location: 'Cebu City',
    system: 'HS 6 LITE',
    projectType: 'Residential Solar',
    paymentType: 'Installment',
    inquiryId: 'INQ-201',
    ...ids
  });

  assert.equal(res.success, true);
  assert.equal(res.account.invitationStatus, 'Sent');
  assert.ok(res.account.activationLink);
  assert.match(res.account.activationLink, /token=/);
  assert.equal(res.account.hasSetPassword, false);
  assert.equal(res.account.paymentPreference, 'Installment');

  // Linked inquiry is updated to Proceed and holds customerId & appId
  const inq = db.getInquiries().find(i => i.id === 'INQ-201');
  assert.equal(inq.customerId, res.id);
  assert.equal(inq.inquiryStatus, 'Proceed');

  // Customer activates account and sets custom password
  const actRes = db.activateCustomerAccount(res.id, 'MyNewSecureSolarPassword2026!');
  assert.equal(actRes.success, true);
  assert.equal(actRes.customer.invitationStatus, 'Active');
  assert.equal(actRes.customer.status, 'Active');
  assert.equal(actRes.customer.hasSetPassword, true);
  assert.equal(actRes.customer.password, 'MyNewSecureSolarPassword2026!');
});

test('manual status override records reason and logs audit activity', () => {
  const c = environment(), db = c.HELLO_SOLAR_DB;
  const inqId = 'INQ-207';
  const inq = db.getInquiries().find(i => i.id === inqId);
  assert.equal(inq.inquiryStatus, 'Not Sent');

  const reason = 'Customer phoned office to confirm Proceed with Application';
  const updated = db.overrideInquiryCustomerResponse(inqId, 'Proceed', reason, 'ADMIN (Limuel)');
  assert.equal(updated.inquiryStatus, 'Proceed');
  assert.equal(updated.customerResponse, 'Proceed');
  assert.ok(updated.manualOverride);
  assert.equal(updated.manualOverride.reason, reason);
  assert.equal(updated.manualOverride.overriddenBy, 'ADMIN (Limuel)');

  // Verify activity audit log contains documented reason
  const activity = db.data.activity.find(a => a.recordId === inqId && a.action.includes('manually overrode'));
  assert.ok(activity);
  assert.ok(activity.action.includes(reason));
});

test('customer confirmation flow generates secure token link and only enables account creation on Proceed', () => {
  const c = environment(), db = c.HELLO_SOLAR_DB;
  const inqId = 'INQ-203';
  const inq = db.getInquiries().find(i => i.id === inqId);
  assert.equal(inq.inquiryStatus, 'Not Sent');

  // 1. Admin sends confirmation email -> token generated, status becomes Awaiting Response
  const sendRes = db.sendInquiryConfirmationEmail(inqId, 'ADMIN (Limuel)');
  assert.equal(sendRes.success, true);
  assert.ok(sendRes.inquiry.confirmationToken);
  assert.equal(sendRes.inquiry.inquiryStatus, 'Awaiting Response');

  // Verify modal buttons for Awaiting Response (Create Account is hidden/disabled)
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const createBtn = { style: {}, disabled: false, textContent: '', dataset: {} };
  const closeBtn = { textContent: '' };
  c.$ = selector => {
    if (selector === '#btnInquiryCreateCustomer') return createBtn;
    if (selector === '#btnInquiryClose') return closeBtn;
    return null;
  };
  vm.runInContext(app.slice(app.indexOf('  function updateInquiryModalButtons('), app.indexOf('  function openInquiryModal(')), c);

  c.updateInquiryModalButtons(sendRes.inquiry);
  assert.equal(createBtn.style.display, 'none');
  assert.equal(createBtn.disabled, true);

  // 2. Customer confirms 'Proceed' via confirmation page
  const proceedRes = db.updateInquiryCustomerResponse(inqId, 'Proceed', `CUSTOMER (${inq.name})`);
  assert.equal(proceedRes.inquiryStatus, 'Proceed');
  assert.equal(proceedRes.customerResponse, 'Proceed');

  // Modal buttons for Proceed (Create Account is enabled)
  c.updateInquiryModalButtons(proceedRes);
  assert.equal(createBtn.style.display, 'inline-flex');
  assert.equal(createBtn.disabled, false);
  assert.equal(createBtn.textContent, 'Create Customer Account');

  // 3. If customer declined / Not Proceeding
  const declineRes = db.updateInquiryCustomerResponse(inqId, 'Not Proceeding', `CUSTOMER (${inq.name})`);
  assert.equal(declineRes.inquiryStatus, 'Not Proceeding');
  assert.equal(declineRes.customerResponse, 'Not Proceed');

  // Modal buttons for Not Proceeding (Create Account is hidden/disabled)
  c.updateInquiryModalButtons(declineRes);
  assert.equal(createBtn.style.display, 'none');
  assert.equal(createBtn.disabled, true);
  assert.equal(closeBtn.textContent, 'Close Inquiry');
});

test('Super Admin Applications rules: Full Payment vs Installment, unified record, and Direct Install eligibility', () => {
  const c = environment(), db = c.HELLO_SOLAR_DB;

  // 1. Full Payment Customer Account
  const fullPayIds = db.generateProjectIds();
  const fullPayRes = db.createAccount({
    role: 'Customer',
    firstName: 'Clarissa',
    lastName: 'Tan',
    email: 'clarissa.tan@example.com',
    phone: '09171234567',
    password: 'Password123!',
    status: 'Active',
    system: 'HS 10 PRO',
    projectType: 'Residential Solar',
    paymentType: 'Full Payment',
    location: 'Cebu City',
    ...fullPayIds
  });
  assert.equal(fullPayRes.success, true);

  const apps = db.getApplications();
  const fullApp = apps.find(a => a.id === fullPayIds.appId);
  assert.ok(fullApp, 'Application must appear in applications list automatically');
  assert.equal(fullApp.paymentType, 'Full Payment');
  assert.equal(fullApp.stage, 'Payment Required');
  assert.equal(fullApp.financer, 'Not Required');
  assert.equal(fullApp.installer, 'Unassigned');
  assert.notEqual(fullApp.stage, 'Submitted', 'Generic Submitted must be removed');
  // Unified IDs across records
  assert.equal(fullApp.id, fullPayIds.appId);
  assert.equal(fullApp.hsId, fullPayIds.hsId);
  assert.equal(fullApp.customerId, fullPayRes.id);

  // 2. Installment Customer Account
  const instIds = db.generateProjectIds();
  const instRes = db.createAccount({
    role: 'Customer',
    firstName: 'Marco',
    lastName: 'Velasco',
    email: 'marco.velasco@example.com',
    phone: '09187654321',
    password: 'Password123!',
    status: 'Active',
    system: 'HS 6 LITE',
    projectType: 'Residential Solar',
    paymentType: 'Installment',
    location: 'Davao City',
    ...instIds
  });
  assert.equal(instRes.success, true);

  const instApp = db.getApplications().find(a => a.id === instIds.appId);
  assert.ok(instApp, 'Installment application must appear in applications list automatically');
  assert.equal(instApp.paymentType, 'Installment');
  assert.equal(instApp.stage, 'Financing Review');
  assert.equal(instApp.financer, 'Pending');
  assert.equal(instApp.installer, 'Unassigned');
  assert.notEqual(instApp.stage, 'Submitted', 'Generic Submitted must be removed');
  // Unified IDs
  assert.equal(instApp.id, instIds.appId);
  assert.equal(instApp.hsId, instIds.hsId);
  assert.equal(instApp.customerId, instRes.id);

  // 3. Test Direct Install eligibility rule in app.js
  const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  // Extract isDirectProject, hasNoInstaller, and isEligibleForDirect
  const helperCode = appJs.slice(appJs.indexOf('  function isDirectProject('), appJs.indexOf('  // ==================== 2. APPLICATIONS PAGE'));
  vm.runInContext(helperCode, c);

  // Approved stage should NOT be eligible for Direct Install
  assert.equal(c.isEligibleForDirect({ stage: 'Approved', installer: 'Unassigned', installerType: 'Partner Installer' }), false);
  // Payment Required stage should NOT be eligible
  assert.equal(c.isEligibleForDirect({ stage: 'Payment Required', installer: 'Unassigned', installerType: 'Partner Installer' }), false);
  // Financing Review stage should NOT be eligible
  assert.equal(c.isEligibleForDirect({ stage: 'Financing Review', installer: 'Unassigned', installerType: 'Partner Installer' }), false);
  // Ready for Installation with unassigned installer IS eligible
  assert.equal(c.isEligibleForDirect({ stage: 'Ready for Installation', installer: 'Unassigned', installerType: 'Partner Installer' }), true);
  // Ready for Installation already assigned to Hello Solar Direct is NOT eligible (already direct)
  assert.equal(c.isEligibleForDirect({ stage: 'Ready for Installation', installer: 'Hello Solar Internal Team', installerType: 'Hello Solar Direct' }), false);
  // Ready for Installation already assigned to Partner is NOT eligible
  assert.equal(c.isEligibleForDirect({ stage: 'Ready for Installation', installer: 'SolarTech Solutions', installerType: 'Partner Installer' }), false);
});

test('Super Admin Payments: 3 KPI cards calculation and overdue accounts monitoring', () => {
  const c = environment(), db = c.HELLO_SOLAR_DB;
  const kpis = db.getPaymentsKpis();

  // 1. Total Portfolio Value: Total, HS Funded, Third Party Funded
  assert.ok(kpis.totalPortfolio > 0, 'Total portfolio value must be greater than 0');
  assert.ok(kpis.hsFunded > 0, 'HS Funded must be greater than 0');
  assert.ok(kpis.thirdPartyFunded >= 0, 'Third Party Funded must be non-negative');
  assert.equal(kpis.totalPortfolio, kpis.hsFunded + kpis.thirdPartyFunded, 'Total Portfolio must equal HS Funded + Third Party Funded');

  // 2. Expected Revenue: Total, HS Revenue, Third Party Revenue
  assert.equal(kpis.totalExpectedRevenue, kpis.hsRevenue + kpis.thirdPartyRevenue, 'Expected Revenue must equal HS Revenue + Third Party Revenue');
  // Revenue is the current-period scheduled amount (not funded principal), split by current contract owner
  assert.ok(kpis.totalExpectedRevenue > 0);
  assert.ok(kpis.totalExpectedRevenue < kpis.totalPortfolio, 'Expected Revenue must not equal Total Portfolio');
  assert.match(kpis.revenuePeriod, /^\d{4}-\d{2}$/);

  // 3. Overdue Accounts: Count and action status
  const apps = db.getApplications();
  const overdueApps = apps.filter(a => (a.paymentStatus || '').includes('Overdue'));
  assert.equal(kpis.overdueCount, overdueApps.length);
  assert.ok(kpis.overdueActionStatus.includes('flagged') || kpis.overdueActionStatus.includes('nominal'));
});

test('Super Admin Payments: Full Payment flow verification and rejection', () => {
  const c = environment(), db = c.HELLO_SOLAR_DB;

  // 1. Create a Full Payment customer account
  const ids = db.generateProjectIds();
  const createRes = db.createAccount({
    role: 'Customer',
    firstName: 'Gillian',
    lastName: 'Tan',
    email: 'gillian.tan@example.com',
    phone: '09171234567',
    password: 'Password123!',
    status: 'Active',
    system: 'HS 6 LITE',
    projectType: 'Residential Solar',
    paymentType: 'Full Payment',
    location: 'Cebu City',
    ...ids
  });
  assert.equal(createRes.success, true);

  const app = db.getApplications().find(a => a.id === ids.appId);
  assert.equal(app.paymentType, 'Full Payment');
  assert.equal(app.stage, 'Payment Required');
  assert.equal(app.financer, 'Not Required');

  // Load app.js helper functions
  const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const helperCode = appJs.slice(appJs.indexOf('  function isDirectProject('), appJs.indexOf('  // ==================== 2. APPLICATIONS PAGE'));
  vm.runInContext(helperCode, c);

  // Initial stage is Payment Required -> NOT eligible for installer
  assert.equal(c.isEligibleForDirect(app), false, 'Payment Required stage must not be eligible for Installer');

  // 2. Customer uploads payment receipt -> Verification Required
  const uploadRes = db.uploadCustomerReceipt(ids.appId, {
    receipt: 'bdo_transfer_gillian.png',
    bank: 'BDO Unibank',
    reference: 'BDO-REF-998877',
    amount: app.amount
  });
  assert.equal(uploadRes.success, true);
  assert.equal(app.paymentStatus, 'Verification Required');
  assert.ok(app.uploadedReceipt);

  // Still Payment Required stage -> NOT eligible for installer
  assert.equal(c.isEligibleForDirect(app), false, 'Verification Required must still not be eligible for Installer before admin verification');

  // 3. Test Rejection flow first
  const rejectRes = db.rejectPaymentReceipt(ids.appId, {
    reason: 'Receipt image unreadable, please re-upload clear slip',
    adminUser: 'ADMIN (Limuel)'
  });
  assert.equal(rejectRes.success, true);
  assert.ok(app.paymentStatus.includes('Rejected'), 'Payment status must reflect rejection');
  assert.equal(app.stage, 'Payment Required', 'Stage must remain Payment Required upon rejection');
  assert.equal(c.isEligibleForDirect(app), false, 'Rejected payment must NOT be sent to installer');

  // 4. Customer re-uploads valid receipt -> Verification Required
  db.uploadCustomerReceipt(ids.appId, {
    receipt: 'bdo_transfer_gillian_clear.png',
    bank: 'BDO Unibank',
    reference: 'BDO-REF-998888',
    amount: app.amount
  });
  assert.equal(app.paymentStatus, 'Verification Required');

  // 5. Super Admin clicks Verify Payment
  const verifyRes = db.verifyPaymentReceipt(ids.appId, { adminUser: 'ADMIN (Limuel)' });
  assert.equal(verifyRes.success, true);
  assert.ok(app.paymentStatus.includes('Verified'), 'Payment status must be Verified / Paid');
  assert.equal(app.stage, 'Ready for Installation', 'Application stage must update to Ready for Installation');

  // Now eligible for Direct Install / Installer Dashboard!
  assert.equal(c.isEligibleForDirect(app), true, 'Verified full payment application must become available to Installer');

  // Verified record maintains single source of truth across customer, app, payments
  assert.equal(app.id, ids.appId);
  assert.equal(app.hsId, ids.hsId);
  assert.equal(app.customerId, createRes.id);
});

test('Super Admin Payments: Installment customer monitoring and independence from receipt verification', () => {
  const c = environment(), db = c.HELLO_SOLAR_DB;

  // 1. Create an Installment customer account
  const ids = db.generateProjectIds();
  const createRes = db.createAccount({
    role: 'Customer',
    firstName: 'Daniel',
    lastName: 'Reyes',
    email: 'daniel.reyes@example.com',
    phone: '09191234567',
    password: 'Password123!',
    status: 'Active',
    system: 'HS 6 LITE',
    projectType: 'Residential Solar',
    paymentType: 'Installment',
    location: 'Mandaue City',
    ...ids
  });
  assert.equal(createRes.success, true);

  const app = db.getApplications().find(a => a.id === ids.appId);
  assert.equal(app.paymentType, 'Installment');
  assert.equal(app.stage, 'Financing Review');
  assert.ok(app.amount > 0, 'Must have financed amount');
  assert.ok(app.monthly > 0, 'Must have monthly payment');

  // Installment schedule calculation handles monthly payments
  const schedule = db.getPaymentSchedule(app.id);
  assert.ok(schedule, 'Must have payment schedule');
  assert.ok(schedule.installments.length > 1, 'Installment customer must have multi-period schedule');

  // Installation readiness depends on Financer approval, not receipt verification
  const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const helperCode = appJs.slice(appJs.indexOf('  function isDirectProject('), appJs.indexOf('  // ==================== 2. APPLICATIONS PAGE'));
  vm.runInContext(helperCode, c);

  assert.equal(c.isEligibleForDirect(app), false, 'Financing Review stage is not eligible for installer');

  // Financer approves loan -> Stage becomes Ready for Installation directly
  app.stage = 'Ready for Installation';
  assert.equal(c.isEligibleForDirect(app), true, 'Becomes ready for installation upon financer approval without full payment receipt');
});

test('Super Admin Payments: table filters cover All, Verification Required, On Time, Due Soon, Overdue, and Completed', () => {
  const c = environment(), db = c.HELLO_SOLAR_DB;
  const apps = db.getApplications();

  // Test filter matching predicate matching app.js
  function filterPayments(filterStatus, query = '') {
    return apps.filter(app => {
      let matchStatus = true;
      if (filterStatus === 'Verification Required') {
        matchStatus = (app.paymentStatus || '').includes('Verification Required');
      } else if (filterStatus === 'On Time') {
        matchStatus = app.paymentStatus === 'On Time';
      } else if (filterStatus === 'Due Soon') {
        matchStatus = app.paymentStatus === 'Due Soon';
      } else if (filterStatus === 'Overdue') {
        matchStatus = (app.paymentStatus || '').includes('Overdue');
      } else if (filterStatus === 'Completed') {
        matchStatus = (app.paymentStatus || '').includes('Completed') || (app.paymentStatus || '').includes('Verified') || (app.paymentStatus || '').includes('Paid');
      } else if (filterStatus && filterStatus !== 'All') {
        matchStatus = app.paymentStatus === filterStatus;
      }

      const q = (query || '').toLowerCase().trim();
      const matchSearch = !q || (
        (app.id && app.id.toLowerCase().includes(q)) ||
        (app.customer && app.customer.toLowerCase().includes(q)) ||
        (app.paymentType && app.paymentType.toLowerCase().includes(q)) ||
        (app.paymentStatus && app.paymentStatus.toLowerCase().includes(q))
      );
      return matchStatus && matchSearch;
    });
  }

  // 1. All
  const allPayments = filterPayments('All');
  assert.equal(allPayments.length, apps.length);

  // 2. Verification Required
  const verifPayments = filterPayments('Verification Required');
  assert.ok(verifPayments.length > 0, 'Must have verification required payments');
  verifPayments.forEach(p => assert.ok(p.paymentStatus.includes('Verification Required')));

  // 3. On Time
  const onTimePayments = filterPayments('On Time');
  assert.ok(onTimePayments.length > 0);
  onTimePayments.forEach(p => assert.equal(p.paymentStatus, 'On Time'));

  // 4. Due Soon
  const dueSoonPayments = filterPayments('Due Soon');
  assert.ok(dueSoonPayments.length > 0);
  dueSoonPayments.forEach(p => assert.equal(p.paymentStatus, 'Due Soon'));

  // 5. Overdue
  const overduePayments = filterPayments('Overdue');
  assert.ok(overduePayments.length > 0);
  overduePayments.forEach(p => assert.ok(p.paymentStatus.includes('Overdue')));

  // 6. Completed
  const completedPayments = filterPayments('Completed');
  assert.ok(completedPayments.length > 0);
  completedPayments.forEach(p => {
    const s = p.paymentStatus;
    assert.ok(s.includes('Completed') || s.includes('Verified') || s.includes('Paid'));
  });
});

test('Super Admin Payments: index.html markup contains exactly 3 KPI cards, 7 table columns, filters, and full review modal fields', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  const paymentsSection = html.slice(html.indexOf('id="page-payments"'), html.indexOf('id="page-support"'));
  assert.ok(paymentsSection.length > 0);

  // 1. Repayment Health card must be completely removed from Payments page
  assert.ok(!paymentsSection.includes('Repayment Health'), 'Repayment Health card must be completely removed from Payments page');
  const cardMatches = paymentsSection.match(/class="ops-card"/g);
  assert.equal(cardMatches.length, 3, 'There must be exactly 3 KPI cards in Payments');

  // KPI elements
  assert.ok(paymentsSection.includes('id="payTotalPortfolioValue"'));
  assert.ok(paymentsSection.includes('id="payHsFunded"'));
  assert.ok(paymentsSection.includes('id="payThirdPartyFunded"'));
  assert.ok(paymentsSection.includes('id="payExpectedRevenue"'));
  assert.ok(paymentsSection.includes('id="payHsRevenue"'));
  assert.ok(paymentsSection.includes('id="payThirdPartyRevenue"'));
  assert.ok(paymentsSection.includes('id="payOverdueCount"'));
  assert.ok(paymentsSection.includes('id="payOverdueActionStatus"'));

  // 3. Filter tabs: All, Verification Required, On Time, Due Soon, Overdue, Completed
  for (const filter of ['All', 'Verification Required', 'On Time', 'Due Soon', 'Overdue', 'Completed']) {
    assert.ok(paymentsSection.includes(`data-status="${filter}"`), `Payments filter ${filter} must exist in HTML`);
  }

  // 4. Table 7 columns
  const tableHeaders = ['Application ID', 'Customer', 'Payment Type', 'Amount', 'Payment Status', 'Due / Uploaded Date', 'Action'];
  for (const header of tableHeaders) {
    assert.ok(paymentsSection.includes(`<th>${header}</th>`) || paymentsSection.includes(`>${header}</th>`), `Table header ${header} must exist in HTML`);
  }

  // 5. Review Receipt Modal fields
  const modalSection = html.slice(html.indexOf('id="reviewReceiptModal"'), html.indexOf('id="paymentModal"'));
  assert.ok(modalSection.length > 0);
  assert.ok(modalSection.includes('id="rrAppIdText"'), 'Review modal must show Application ID');
  assert.ok(modalSection.includes('id="rrCustomer"'), 'Review modal must show Customer');
  assert.ok(modalSection.includes('id="rrHsId"'), 'Review modal must show HS ID');
  assert.ok(modalSection.includes('id="rrAmount"'), 'Review modal must show Total amount');
  assert.ok(modalSection.includes('id="rrUploadedDate"'), 'Review modal must show Uploaded date');
  assert.ok(modalSection.includes('id="rrReceiptBankName"') && modalSection.includes('id="rrReceiptRefNumber"'), 'Review modal must show Uploaded receipt');
  assert.ok(modalSection.includes('id="btnRejectPayment"'), 'Review modal must have Reject Payment button');
  assert.ok(modalSection.includes('id="btnVerifyPayment"'), 'Review modal must have Verify Payment button');
});





