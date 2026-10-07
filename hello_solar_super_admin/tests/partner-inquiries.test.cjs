const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const QUEUE_KEY = 'HELLO_SOLAR_PARTNER_INQUIRIES';

// Same record shape the landing page Contact Us form writes
function landingRecord(partnerType, extra = {}) {
  const id = `PINQ-${partnerType}-${Math.floor(Math.random() * 1e6)}`;
  const proposal = partnerType === 'Financer' ? { contractTermMonths: 36, annualRate: 8.5, contractStartDate: '2026-11-01' } : null;
  return {
    id, inquiryType: 'Partner', partnerType, source: 'Landing Page — Contact Us',
    name: `Test ${partnerType}`, firstName: 'Test', lastName: partnerType,
    email: `${partnerType.toLowerCase()}@partner.test`, phone: '0917 000 0000', location: 'Philippines', country: 'Philippines',
    category: `${partnerType} Partner`, subject: `${partnerType} Partnership Inquiry`, message: 'Hello',
    financerProposal: proposal, status: 'Unread', inquiryStatus: 'Pending Review',
    timestamp: new Date().toISOString(), accountCreated: false,
    createAccountPrefill: { role: partnerType, firstName: 'Test', lastName: partnerType, email: `${partnerType.toLowerCase()}@partner.test`, phone: '0917 000 0000', ...(proposal || {}) },
    ...extra
  };
}

function environment(queue = []) {
  const local = new Map([[QUEUE_KEY, JSON.stringify(queue)]]);
  const context = {
    console,
    localStorage: { getItem: k => (local.has(k) ? local.get(k) : null), setItem: (k, v) => local.set(k, String(v)), removeItem: k => local.delete(k) }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
  return { db: context.HELLO_SOLAR_DB, local, storage: context.localStorage };
}

test('partner inquiries from the landing page appear in Contact Inquiries once, with partner details', () => {
  const fin = landingRecord('Financer');
  const ins = landingRecord('Installer');
  const { db } = environment([fin, ins]);
  const list = db.getInquiries();
  const f = list.find(i => i.id === fin.id);
  assert.ok(f && db.isPartnerInquiry(f));
  assert.equal(f.partnerType, 'Financer');
  assert.equal(f.financerProposal.annualRate, 8.5);
  assert.equal(f.inquiryStatus, 'Pending Review');
  assert.ok(list.find(i => i.id === ins.id));
  const before = db.getInquiries().length;
  db.getInquiries();
  assert.equal(db.getInquiries().length, before, 'no duplicates on repeated sync');
  // Existing customer inquiries are untouched
  assert.ok(list.some(i => i.id === 'INQ-201' && !db.isPartnerInquiry(i)));
});

test('account cannot be created before approval; approval logs activity', () => {
  const fin = landingRecord('Financer');
  const { db, local } = environment([fin]);
  db.getInquiries();
  const payload = { role: 'Financer', firstName: 'Test', lastName: 'Financer', email: 'financer@partner.test', phone: '0917', companyName: 'Test Finance Co', password: 'secret123', status: 'Active', partnerInquiryId: fin.id };
  const early = db.createAccount(payload);
  assert.equal(early.success, false);
  assert.match(early.error, /Approve/);

  const res = db.approvePartnerInquiry(fin.id, 'ADMIN (Test)');
  assert.equal(res.success, true);
  assert.equal(res.inquiry.inquiryStatus, 'Approved');
  assert.equal(res.inquiry.accountCreated, false, 'approval does not create an account');
  assert.equal(db.data.activity[0].details.inquiryId, fin.id);
  assert.equal(JSON.parse(local.get(QUEUE_KEY))[0].inquiryStatus, 'Approved');
});

test('creating the account links the inquiry and sets accountCreated only on success', () => {
  const fin = landingRecord('Financer');
  const { db, local } = environment([fin]);
  db.getInquiries();
  db.approvePartnerInquiry(fin.id);

  const wrongRole = db.createAccount({ role: 'Merchant', firstName: 'A', lastName: 'B', email: 'x@y.test', phone: '1', companyName: 'X', password: 'secret123', status: 'Active', partnerInquiryId: fin.id });
  assert.equal(wrongRole.success, false);
  assert.equal(db.getInquiries().find(i => i.id === fin.id).accountCreated, false);

  const res = db.createAccount({ role: 'Financer', firstName: 'Test', lastName: 'Financer', email: 'financer@partner.test', phone: '0917', companyName: 'Test Finance Co', password: 'secret123', status: 'Active', partnerInquiryId: fin.id });
  assert.equal(res.success, true);
  const inq = db.getInquiries().find(i => i.id === fin.id);
  assert.equal(inq.accountCreated, true);
  assert.equal(inq.linkedAccountId, res.id);
  const account = db.data.financers.find(f => f.id === res.id);
  assert.equal(account.partnerInquiryId, fin.id);
  assert.equal(account.proposedContract.contractTermMonths, 36);
  assert.equal(account.contractStartDate, null, 'contract is not auto-applied; Super Admin sets it');
  assert.equal(JSON.parse(local.get(QUEUE_KEY))[0].accountCreated, true);

  const again = db.createAccount({ role: 'Financer', firstName: 'Test', lastName: 'Financer', email: 'f2@partner.test', phone: '0917', companyName: 'Dup', password: 'secret123', status: 'Active', partnerInquiryId: fin.id });
  assert.equal(again.success, false, 'one account per inquiry');
});

test('failed save leaves accountCreated false', () => {
  const ins = landingRecord('Installer');
  const { db, storage } = environment([ins]);
  db.getInquiries();
  db.approvePartnerInquiry(ins.id);
  const realSet = storage.setItem;
  storage.setItem = (k, v) => { if (k === 'HELLO_SOLAR_SUPER_ADMIN_DATA_V2') throw new Error('QuotaExceeded'); return realSet(k, v); };
  const res = db.createAccount({ role: 'Installer', firstName: 'Ina', lastName: 'Installer', email: 'ina@partner.test', phone: '0918', companyName: 'Ina Solar', password: 'secret123', status: 'Active', partnerInquiryId: ins.id });
  storage.setItem = realSet;
  assert.equal(res.success, false);
  const inq = db.getInquiries().find(i => i.id === ins.id);
  assert.equal(inq.accountCreated, false);
  assert.ok(!inq.linkedAccountId);
});
