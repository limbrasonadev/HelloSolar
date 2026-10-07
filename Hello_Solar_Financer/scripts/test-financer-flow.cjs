const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Shared environment: applications are shared records owned by FIN-005 (SolarTech Financer)
const { makeFinancerContext } = require('./shared-env.cjs');
let ctx = makeFinancerContext();
const window = ctx;

const store = window.HelloSolarStore;
assert(store, "HelloSolarStore must be defined");

console.log("1. Testing Installment filtering...");
const installmentApps = store.getInstallmentApplications();
assert(Array.isArray(installmentApps), "Must return array of applications");
assert(installmentApps.length >= 8, "Must contain at least 8 installment applications");
assert(installmentApps.every(a => a.paymentType === "Installment"), "All applications must have paymentType = 'Installment'");
assert(!installmentApps.some(a => a.id === "APP-1120"), "Cash payment APP-1120 must be excluded");
console.log(`✓ Filtered correctly: ${installmentApps.length} installment applications found, APP-1120 cash payment excluded.`);

console.log("\n2. Testing Sample Applications APP-1103 and APP-1104 clean demo states and ID format...");
const app1103 = store.getApplicationById("APP-1103");
const app1104 = store.getApplicationById("APP-1104");
assert(app1103, "APP-1103 must exist");
assert(app1104, "APP-1104 must exist");
assert(app1103.paymentType === "Installment", "APP-1103 must be an Installment application");
assert(app1104.paymentType === "Installment", "APP-1104 must be an Installment application");
assert.strictEqual(app1103.financingStatus, "FINANCING_REVIEW", "APP-1103 must be in Financing Review");
assert.strictEqual(app1104.financingStatus, "DOCUMENTS_REQUIRED", "APP-1104 must be in Documents Required");
assert(!store.getPortalData().applications.some(a => a.id.startsWith("HS-APP-")), "No old HS-APP- IDs should exist in store");
console.log("✓ APP-1103 (Financing Review) and APP-1104 (Documents Required) verified in clean demo states.");

console.log("\n3. Testing Contract ID and APP ID separation...");
const app1107 = store.getApplicationById("APP-1107");
assert(app1107, "APP-1107 must exist");
assert.strictEqual(app1107.id, "APP-1107", "Application ID must be APP-1107");
assert.strictEqual(app1107.contractNumber, "HS-CTR-2026-1107", "Contract ID must be HS-CTR-2026-1107");
const approvedContract = store.getPortalData().approvedContracts.find(c => c.appId === "APP-1107");
assert(approvedContract, "Approved contract for APP-1107 must exist");
assert.strictEqual(approvedContract.contractNumber, "HS-CTR-2026-1107", "Contract number must be HS-CTR-2026-1107");
console.log("✓ Contract ID (HS-CTR-2026-1107) and Application ID (APP-1107) properly separated.");

console.log("\n4. Testing Request Documents action on APP-1103...");
store.requestDocuments("APP-1103");
const reqApp = store.getApplicationById("APP-1103");
assert.strictEqual(reqApp.financingStatus, "DOCUMENTS_REQUIRED", "financingStatus must be DOCUMENTS_REQUIRED");
assert.strictEqual(reqApp.applicationStatus, "DOCUMENTS_REQUIRED", "applicationStatus must be DOCUMENTS_REQUIRED");
assert.strictEqual(reqApp.loan.status, "docs_required", "loan.status must be docs_required");
console.log("✓ Request Documents correctly set status to DOCUMENTS_REQUIRED.");

console.log("\n5. Testing Approve Financing on APP-1103...");
store.approveFinancing("APP-1103", {
    fundedAmount: "₱340,000",
    monthlyPayment: "₱10,750/mo",
    financingTerm: "36 Months"
});

const approvedApp = store.getApplicationById("APP-1103");
assert.strictEqual(approvedApp.financingStatus, "APPROVED", "financingStatus must be APPROVED");
assert.strictEqual(approvedApp.applicationStatus, "READY_FOR_INSTALLATION", "applicationStatus must be READY_FOR_INSTALLATION");
assert.strictEqual(approvedApp.fundedAmount, "₱340,000", "fundedAmount must match");
assert.strictEqual(approvedApp.monthlyPayment, "₱10,750/mo", "monthlyPayment must match");
assert.strictEqual(approvedApp.financingTerm, "36 Months", "financingTerm must match");
assert(approvedApp.installerIntegration, "installerIntegration must be created");
assert.strictEqual(approvedApp.installerIntegration.status, "READY_FOR_INSTALLATION", "installerIntegration status must be READY_FOR_INSTALLATION");
assert.strictEqual(approvedApp.installerIntegration.eligible, true, "installerIntegration eligible must be true");
assert(approvedApp.repaymentSchedule, "repaymentSchedule must be prepared for Super Admin payments");
assert.strictEqual(approvedApp.repaymentSchedule.planMonths, 36, "repayment planMonths must be 36");

const approvedList = store.getApprovedApplications();
assert(approvedList.some(a => a.id === "APP-1103"), "APP-1103 must appear in getApprovedApplications()");
console.log("✓ APP-1103 successfully approved with READY_FOR_INSTALLATION, installer integration, and repayment schedule.");

console.log("\n6. Testing Decline Financing on APP-1104...");
store.declineFinancing("APP-1104", {
    reason: "Excessive Debt-to-Income (DTI) exceeds policy threshold"
});

const declinedApp = store.getApplicationById("APP-1104");
assert.strictEqual(declinedApp.financingStatus, "DECLINED", "financingStatus must be DECLINED");
assert.strictEqual(declinedApp.applicationStatus, "FINANCING_DECLINED", "applicationStatus must be FINANCING_DECLINED");
assert.strictEqual(declinedApp.declineReason, "Excessive Debt-to-Income (DTI) exceeds policy threshold", "declineReason must be saved");
assert.strictEqual(declinedApp.installerEligible, false, "installerEligible must be false");
assert.strictEqual(declinedApp.installerIntegration.eligible, false, "installerIntegration must not be eligible");

const declinedList = store.getDeclinedApplications();
assert(declinedList.some(a => a.id === "APP-1104"), "APP-1104 must appear in getDeclinedApplications()");
console.log("✓ APP-1104 successfully declined with FINANCING_DECLINED, adverse reason, and installer ineligibility.");

console.log("\n7. Testing Single Source of Truth...");
const appFromStore = store.getApplicationById("APP-1103");
const appFromApproved = store.getApprovedApplications().find(a => a.id === "APP-1103");
assert.deepStrictEqual(appFromStore, appFromApproved, "Approved list must match the application object from store");
console.log("✓ Single source of truth verified across portal pages.");

// Decisions were written to the shared application records (single source of truth)
const shared = ctx.HSShared;
assert.strictEqual(shared.getApplication("APP-1103").stage, "Ready for Installation", "approval moves the shared record to Ready for Installation");
assert.strictEqual(shared.getApplication("APP-1103").financingStatus, "APPROVED", "financing status stays APPROVED");
assert.strictEqual(shared.getApplication("APP-1103").applicationStatus, "READY_FOR_INSTALLATION");
assert.strictEqual(shared.getApplication("APP-1103").financing.financingStatus, "APPROVED");
assert.strictEqual(shared.getApplication("APP-1104").stage, "Declined", "decline updates the shared record");
assert.ok(shared.read().activity.some(a => a.record === "APP-1103" && a.role === "Financer"), "decision is in the audit log");
console.log("✓ Financer decisions persisted on the shared APP records with audit entries.");

// Another financer never sees or changes FIN-005's applications
const other = makeFinancerContext({ ...ctx.storage }, 'FIN-001');
assert.strictEqual(other.HelloSolarStore.getApplicationById("APP-1105"), null, "FIN-001 cannot see FIN-005 applications");
assert.strictEqual(other.HelloSolarStore.approveFinancing("APP-1105"), null, "FIN-001 cannot decide FIN-005 applications");

// Fresh environment returns to the seed baseline
ctx = makeFinancerContext();
const resetStore = ctx.HelloSolarStore.getPortalData();
assert.strictEqual(resetStore.applications.find(a => a.id === "APP-1103").financingStatus, "FINANCING_REVIEW");
assert.strictEqual(resetStore.applications.find(a => a.id === "APP-1104").financingStatus, "DOCUMENTS_REQUIRED");
console.log("✓ Demo states cleanly preserved at baseline.");

console.log("\nALL FINANCER FLOW TESTS PASSED SUCCESSFULLY! ✓");
