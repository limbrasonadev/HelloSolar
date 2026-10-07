const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

// Fresh, isolated shared environment per scenario, signed in as a shared financer
const { makeFinancerContext } = require('./shared-env.cjs');
function makeStore(sharedStorage = {}, financerId = 'FIN-005') {
    return makeFinancerContext(sharedStorage, financerId).HelloSolarStore;
}

function withProfileContract(store, fields) {
    const data = store.getPortalData();
    Object.assign(data.financerProfile, fields);
    store.savePortalData(data);
}

const NOW = '2026-10-04T12:00:00';
const pendingApp = (store) => store.getPortalData().applications.find(a => ['pending', 'review', 'docs_required'].includes(a.loan?.status));

console.log('1. Shared financer without a contract (FIN-006) is "No Contract": Hello Solar owns funding, financing is read-only...');
{
    const store = makeStore({}, 'FIN-006');
    const c = store.getFinancerContract(NOW);
    assert.strictEqual(c.available, true);
    assert.strictEqual(c.source, 'super-admin');
    assert.strictEqual(c.status, 'No Contract');
    assert.strictEqual(c.ownerName, 'Hello Solar');
    assert.strictEqual(c.canAcceptNewFinancing, false);
    assert.ok(store.getNewFinancingBlockReason());
}
console.log('1b. Active shared contract (FIN-005) is read from Super Admin and allows financing...');
{
    const store = makeStore();
    const c = store.getFinancerContract(NOW);
    assert.strictEqual(c.source, 'super-admin');
    assert.strictEqual(c.status, 'Active');
    assert.strictEqual(c.ownerName, 'SolarTech Financer');
    const app = pendingApp(store);
    assert.ok(store.approveFinancing(app.id), 'approval works under an Active contract');
}

console.log('2. Active contract keeps the financer as owner...');
{
    // Signed in as FIN-001; the profile cannot switch to another financer identity
    const store = makeStore({}, 'FIN-001');
    withProfileContract(store, {
        financerId: 'FIN-999', contractTermMonths: 36, annualRate: 8.5,
        contractStartDate: '2025-01-15', contractEndDate: '2028-01-15', contractStatusOverride: null,
        fundingOwner: 'SunFund Philippines', fundingOwnerId: 'FIN-001'
    });
    const c = store.getFinancerContract(NOW);
    assert.strictEqual(c.status, 'Active');
    assert.strictEqual(c.ownerType, 'Financer');
    assert.strictEqual(c.ownerName, 'SunFund Philippines');
    assert.strictEqual(c.termMonths, 36);
    assert.strictEqual(c.annualRate, 8.5);
    assert.strictEqual(c.canAcceptNewFinancing, true);
    assert.strictEqual(store.getPortalData().financerProfile.financerId, 'FIN-001');
}

console.log('3. Expired / Terminated / Pending Start → Hello Solar owns funding/revenue...');
{
    const store = makeStore();
    withProfileContract(store, { contractTermMonths: 24, annualRate: 7.25, contractStartDate: '2024-08-01', contractEndDate: '2026-08-01' });
    let c = store.getFinancerContract(NOW);
    assert.strictEqual(c.status, 'Expired');
    assert.strictEqual(c.ownerName, 'Hello Solar');
    assert.strictEqual(c.ownerId, 'HELLO-SOLAR');

    withProfileContract(store, { contractStartDate: '2026-12-01', contractEndDate: '2028-12-01' });
    c = store.getFinancerContract(NOW);
    assert.strictEqual(c.status, 'Pending Start');
    assert.strictEqual(c.ownerName, 'Hello Solar');

    withProfileContract(store, { contractStartDate: '2026-01-01', contractEndDate: '2028-01-01', contractStatusOverride: 'Terminated' });
    c = store.getFinancerContract(NOW);
    assert.strictEqual(c.status, 'Terminated');
    assert.strictEqual(c.ownerName, 'Hello Solar');
}

console.log('4. Pending Start / Expired / Terminated are read-only: no approve, request docs or decline; history stays visible...');
const NON_ACTIVE = {
    'Pending Start': { contractStartDate: '2026-12-01', contractEndDate: '2028-12-01', contractStatusOverride: null },
    'Expired': { contractStartDate: '2024-08-01', contractEndDate: '2026-08-01', contractStatusOverride: null },
    'Terminated': { contractStartDate: '2026-01-01', contractEndDate: '2028-01-01', contractStatusOverride: 'Terminated' }
};
Object.entries(NON_ACTIVE).forEach(([status, dates]) => {
    const store = makeStore();
    const approvedBefore = store.getApprovedApplications().length;
    const declinedBefore = store.getDeclinedApplications().length;
    withProfileContract(store, { contractTermMonths: 24, annualRate: 7.25, ...dates });
    const c = store.getFinancerContract();
    assert.strictEqual(c.status, status);
    assert.strictEqual(c.ownerName, 'Hello Solar');
    assert.strictEqual(c.canAcceptNewFinancing, false, `${status} must not accept financing`);
    assert.ok(store.getNewFinancingBlockReason(), `block reason expected for ${status}`);
    const app = pendingApp(store);
    const statusBefore = app.loan.status;
    assert.strictEqual(store.approveFinancing(app.id), null);
    assert.strictEqual(store.requestDocuments(app.id), null);
    assert.strictEqual(store.declineFinancing(app.id, { reason: 'test' }), null);
    assert.strictEqual(store.getApplicationById(app.id).loan.status, statusBefore);
    assert.strictEqual(store.getApprovedApplications().length, approvedBefore);
    assert.strictEqual(store.getDeclinedApplications().length, declinedBefore);
});

console.log('4b. Active contract can approve, request documents and decline...');
{
    const store = makeStore();
    withProfileContract(store, { contractTermMonths: 36, annualRate: 8.5, contractStartDate: '2025-01-15', contractEndDate: '2099-01-15', contractStatusOverride: null });
    const apps = store.getPortalData().applications.filter(a => ['pending', 'review', 'docs_required'].includes(a.loan?.status));
    assert.ok(apps.length >= 3, 'need 3 pending apps for this scenario');
    assert.ok(store.requestDocuments(apps[0].id));
    assert.ok(store.declineFinancing(apps[1].id, { reason: 'test' }));
    assert.ok(store.approveFinancing(apps[2].id));
}

console.log('5. Backend payload (data.financerContract) takes priority; Super Admin record is the fallback...');
{
    const store = makeStore({}, 'FIN-003');
    let c = store.getFinancerContract(NOW);
    assert.strictEqual(c.source, 'super-admin');
    assert.strictEqual(c.ownerName, 'UnionBank Solar Loan Program');

    const data = store.getPortalData();
    data.financerContract = { financerId: 'FIN-003', contractTermMonths: 12, annualRate: 6, contractStartDate: '2025-01-01', contractEndDate: '2026-01-01' };
    store.savePortalData(data);
    c = store.getFinancerContract(NOW);
    assert.strictEqual(c.source, 'api');
    assert.strictEqual(c.status, 'Expired');
    assert.strictEqual(c.ownerName, 'Hello Solar');
}



console.log('\nALL FINANCER CONTRACT TESTS PASSED! ✓');
