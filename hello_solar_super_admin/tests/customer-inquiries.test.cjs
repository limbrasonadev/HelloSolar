const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const CUSTOMER_KEY = 'HELLO_SOLAR_CUSTOMER_INQUIRIES';
const PARTNER_KEY = 'HELLO_SOLAR_PARTNER_INQUIRIES';

// Same record shapes the landing page writes (Request Solar Proposal form and Contact Us → Customer)
function requestFormRecord(extra = {}) {
  return {
    id: `INQ-LP${Date.now()}${Math.floor(Math.random() * 1e4)}`, inquiryType: 'Customer',
    source: 'Landing Page — Request Solar Proposal', leadId: 'lead_1',
    name: 'Rosa Mendoza', firstName: 'Rosa', lastName: 'Mendoza', email: 'rosa@test.ph', phone: '0917 222 3333',
    location: 'Cebu City', category: 'Residential Solar', packageId: 'hs8-pro',
    package: 'HS 8 PRO — 8kW | 8kW | 16kWh', selectedSolarModel: 'HS 8 PRO — 8kW | 8kW | 16kWh',
    electricBill: '₱8,000 – ₱12,000', paymentPreference: 'Installment', paymentType: 'Installment',
    subject: 'HS 8 PRO Assessment Request', message: 'Requested a free site assessment.',
    status: 'Unread', inquiryStatus: 'Not Sent', customerResponse: 'Awaiting Response',
    confirmationEmailSentAt: null, timestamp: new Date().toISOString(), ...extra
  };
}
function contactRecord(extra = {}) {
  return {
    id: `INQ-CU${Date.now()}${Math.floor(Math.random() * 1e4)}`, inquiryType: 'Customer', source: 'Landing Page — Contact Us',
    name: 'Lia Santos', firstName: 'Lia', lastName: 'Santos', email: 'lia@test.ph', phone: '0917 777 8888',
    location: 'Philippines', country: 'Philippines', category: 'Residential Solar', paymentPreference: 'Not specified',
    subject: 'Contact Us Message', message: 'Hello', status: 'Unread', inquiryStatus: 'Not Sent', customerResponse: 'Awaiting Response',
    confirmationEmailSentAt: null, timestamp: new Date().toISOString(), ...extra
  };
}

function environment(customers = [], partners = []) {
  const local = new Map([[CUSTOMER_KEY, JSON.stringify(customers)], [PARTNER_KEY, JSON.stringify(partners)]]);
  const context = {
    console,
    localStorage: { getItem: k => (local.has(k) ? local.get(k) : null), setItem: (k, v) => local.set(k, String(v)), removeItem: k => local.delete(k) }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
  return { db: context.HELLO_SOLAR_DB, local, context };
}

test('customer inquiries from both landing entry points appear in Contact Inquiries', () => {
  const form = requestFormRecord();
  const contact = contactRecord();
  const { db } = environment([contact, form]);
  const list = db.getInquiries();
  const f = list.find(i => i.id === form.id);
  const c = list.find(i => i.id === contact.id);
  assert.ok(f && c);
  assert.equal(db.isPartnerInquiry(f), false);
  assert.equal(f.paymentPreference, 'Installment');
  assert.equal(f.selectedSolarModel, 'HS 8 PRO — 8kW | 8kW | 16kWh');
  assert.equal(f.electricBill, '₱8,000 – ₱12,000');
  assert.equal(f.inquiryStatus, 'Not Sent');
  assert.equal(f.status, 'Unread');
  assert.equal(c.category, 'Residential Solar');
  assert.equal(c.selectedSolarModel, 'Custom Solar Package');
  assert.equal(c.electricBill, 'Not provided');
  assert.equal(c.paymentPreference, 'Not specified');
});

test('payment type is kept exactly (Full Payment vs Installment)', () => {
  const full = requestFormRecord({ paymentPreference: 'Full Payment', paymentType: 'Full Payment' });
  const inst = requestFormRecord({ paymentPreference: 'Installment', paymentType: 'Installment' });
  const { db } = environment([full, inst]);
  const list = db.getInquiries();
  assert.equal(list.find(i => i.id === full.id).paymentPreference, 'Full Payment');
  assert.equal(list.find(i => i.id === inst.id).paymentPreference, 'Installment');
});

test('no duplicates on repeated sync or reload', () => {
  const form = requestFormRecord();
  const { db, local, context } = environment([form, form]);
  const count = () => db.getInquiries().filter(i => i.id === form.id).length;
  assert.equal(count(), 1);
  db.getInquiries();
  assert.equal(count(), 1);
  // Reload Super Admin from the saved store: still one copy
  vm.runInContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
  assert.equal(context.HELLO_SOLAR_DB.getInquiries().filter(i => i.id === form.id).length, 1);
  assert.ok(local.get('HELLO_SOLAR_SUPER_ADMIN_DATA_V2'));
});

test('partner records in the customer queue are ignored; partner flow is unchanged', () => {
  const stray = { ...contactRecord(), inquiryType: 'Partner', partnerType: 'Installer' };
  const partner = {
    id: 'PINQ-1', inquiryType: 'Partner', partnerType: 'Merchant', name: 'M Co', firstName: 'M', lastName: 'Co',
    email: 'm@test.ph', phone: '1', status: 'Unread', inquiryStatus: 'Pending Review', timestamp: new Date().toISOString(), accountCreated: false
  };
  const { db } = environment([stray], [partner]);
  const list = db.getInquiries();
  assert.equal(list.some(i => i.id === stray.id), false);
  const p = list.find(i => i.id === 'PINQ-1');
  assert.ok(p && db.isPartnerInquiry(p));
});

test('imported customer inquiry follows the existing confirmation → Proceed flow', () => {
  const form = requestFormRecord();
  const { db } = environment([form]);
  db.getInquiries();
  const res = db.updateInquiryCustomerResponse(form.id, 'Proceed', 'ADMIN (Test)');
  const inq = db.getInquiries().find(i => i.id === form.id);
  assert.equal(inq.inquiryStatus, 'Proceed');
  assert.ok(res === undefined || res.success !== false);
});

test('Contact Us customer payment is never guessed from the message', () => {
  const c = contactRecord({ message: 'We want a loan / installment financing' });
  const legacy = contactRecord({ paymentPreference: undefined, message: 'financing please' });
  const { db, context } = environment([c, legacy]);
  db.getInquiries();
  assert.equal(db.getInquiries().find(i => i.id === c.id).paymentPreference, 'Not specified');
  assert.equal(db.getInquiries().find(i => i.id === legacy.id).paymentPreference, 'Not specified');
  // Still "Not specified" after Super Admin reloads its saved data
  vm.runInContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
  assert.equal(context.HELLO_SOLAR_DB.getInquiries().find(i => i.id === c.id).paymentPreference, 'Not specified');
});
