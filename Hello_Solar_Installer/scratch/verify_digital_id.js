const fs = require('fs');
const path = require('path');

const profileHtml = fs.readFileSync(path.join(__dirname, '..', 'profile.html'), 'utf8');
const dashboardJs = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'dashboard.js'), 'utf8');
const profileCss = fs.readFileSync(path.join(__dirname, '..', 'assets', 'css', 'profile.css'), 'utf8');

const checks = [];

function assert(condition, message) {
    if (!condition) {
        checks.push({ status: 'FAIL', message });
        console.error('❌ FAIL:', message);
    } else {
        checks.push({ status: 'PASS', message });
        console.log('✅ PASS:', message);
    }
}

console.log('--- Verifying Digital Installer Gate Pass / ID Card in profile.html ---');
assert(profileHtml.includes('id="btnOpenDigitalId"'), 'Hero card contains #btnOpenDigitalId');
assert(profileHtml.includes('id="btnOpenDigitalIdFromCard"'), 'Credentials card contains #btnOpenDigitalIdFromCard');
assert(profileHtml.includes('id="digitalIdModal"'), 'Modal contains #digitalIdModal');
assert(profileHtml.includes('id="contractorIdBadge"'), 'Modal contains #contractorIdBadge');
assert(profileHtml.includes('id="badgeContractorName"'), 'Modal contains #badgeContractorName');
assert(profileHtml.includes('id="badgeContractorRole"'), 'Modal contains #badgeContractorRole');
assert(profileHtml.includes('id="badgeContractorCompany"'), 'Modal contains #badgeContractorCompany');
assert(profileHtml.includes('id="badgePassNumber"'), 'Modal contains #badgePassNumber');
assert(profileHtml.includes('id="badgeLicenseVal"'), 'Modal contains #badgeLicenseVal');
assert(profileHtml.includes('id="badgePrcVal"'), 'Modal contains #badgePrcVal');
assert(profileHtml.includes('class="badge-qr-svg"'), 'Modal contains QR code SVG .badge-qr-svg');
assert(profileHtml.includes('id="btnCopyVerifyLink"'), 'Modal footer contains #btnCopyVerifyLink');
assert(profileHtml.includes('id="btnPrintIdPass"'), 'Modal footer contains #btnPrintIdPass');
assert(profileHtml.includes('id="btnCloseDigitalId"'), 'Modal footer contains #btnCloseDigitalId');
assert(profileHtml.includes('id="btnCloseDigitalIdHeader"'), 'Modal header contains #btnCloseDigitalIdHeader');
assert(profileHtml.includes('class="pass-info-notice"'), 'Modal contains village guard / security clearance notice');

console.log('\n--- Verifying JavaScript wiring in dashboard.js ---');
assert(dashboardJs.includes('openDigitalIdModal'), 'dashboard.js defines openDigitalIdModal');
assert(dashboardJs.includes('closeDigitalIdModal'), 'dashboard.js defines closeDigitalIdModal');
assert(dashboardJs.includes('btnOpenDigitalId'), 'dashboard.js binds btnOpenDigitalId');
assert(dashboardJs.includes('btnOpenDigitalIdFromCard'), 'dashboard.js binds btnOpenDigitalIdFromCard');
assert(dashboardJs.includes('btnCopyVerifyLink'), 'dashboard.js binds btnCopyVerifyLink');
assert(dashboardJs.includes('btnPrintIdPass'), 'dashboard.js binds btnPrintIdPass');
assert(dashboardJs.includes('badgeContractorName'), 'dashboard.js syncs badgeContractorName');
assert(dashboardJs.includes('badgeAvatarWrap'), 'dashboard.js syncs badgeAvatarWrap');

console.log('\n--- Verifying CSS styling in profile.css ---');
assert(profileCss.includes('.contractor-id-badge'), 'profile.css defines .contractor-id-badge');
assert(profileCss.includes('.badge-lanyard-slot'), 'profile.css defines lanyard slot');
assert(profileCss.includes('.badge-brand-header'), 'profile.css defines badge brand header');
assert(profileCss.includes('.badge-qr-container'), 'profile.css defines QR container');
assert(profileCss.includes('@media print'), 'profile.css defines @media print for printable pass');
assert(profileCss.includes('.btn-card-action'), 'profile.css defines .btn-card-action');

const failed = checks.filter(c => c.status === 'FAIL');
if (failed.length > 0) {
    console.error(`\nCompleted with ${failed.length} failures.`);
    process.exit(1);
} else {
    console.log(`\nAll ${checks.length} assertions PASSED! 🎉`);
}
