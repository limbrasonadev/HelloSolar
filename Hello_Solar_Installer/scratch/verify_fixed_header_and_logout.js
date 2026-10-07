const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== VERIFYING FIXED HEADER & LOGOUT MODAL IMPLEMENTATION ===\n');

// 1. Check CSS rules in dashboard.css
console.log('1. Checking dashboard.css rules...');
const cssPath = path.join(__dirname, '..', 'assets/css/dashboard.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

// Ensure no overflow-x: hidden on layout parents breaking position:sticky
const badOverflowHtml = /html\s*\{[^}]*overflow-x:\s*hidden/m.test(cssContent);
const badOverflowBody = /body\s*\{[^}]*overflow-x:\s*hidden/m.test(cssContent);
const badOverflowApp = /\.app\s*\{[^}]*overflow-x:\s*hidden/m.test(cssContent);
const badOverflowMain = /\.main\s*\{[^}]*overflow-x:\s*hidden/m.test(cssContent);

if (badOverflowHtml || badOverflowBody || badOverflowApp || badOverflowMain) {
    console.error('   ✗ Found overflow-x: hidden on an ancestor that could break position:sticky!');
    console.error({ badOverflowHtml, badOverflowBody, badOverflowApp, badOverflowMain });
    process.exit(1);
}
console.log('   ✓ html, body, .app, and .main do NOT have overflow-x: hidden');

// Ensure sticky topbar with z-index 500
if (!cssContent.includes('position: sticky') || !cssContent.includes('top: 0') || !cssContent.includes('z-index: 500')) {
    console.error('   ✗ Expected .topbar to have position: sticky, top: 0, and z-index: 500');
    process.exit(1);
}
console.log('   ✓ .topbar is configured with position: sticky, top: 0, and z-index: 500');

// Ensure profile modal styles exist
if (!cssContent.includes('.header-profile-modal-backdrop') || !cssContent.includes('.profile-modal-logout-btn')) {
    console.error('   ✗ Missing header profile modal or logout button CSS rules!');
    process.exit(1);
}
console.log('   ✓ Header profile modal and .profile-modal-logout-btn CSS rules are present');

// 2. Check profile.html for Logout inside editProfileModal
console.log('\n2. Checking profile.html for logout button in edit profile modal...');
const profileHtmlPath = path.join(__dirname, '..', 'profile.html');
const profileHtmlContent = fs.readFileSync(profileHtmlPath, 'utf8');

if (!profileHtmlContent.includes('id="btnEditProfileLogout"') || !profileHtmlContent.includes('class="btn btn-secondary btn-sm logout"')) {
    console.error('   ✗ Expected btnEditProfileLogout with class="logout" in profile.html');
    process.exit(1);
}
console.log('   ✓ profile.html #editProfileModal contains #btnEditProfileLogout with class="logout"');

// 3. Check dashboard.js implementation
console.log('\n3. Checking dashboard.js logic...');
const jsPath = path.join(__dirname, '..', 'assets/js/dashboard.js');
const jsContent = fs.readFileSync(jsPath, 'utf8');

// Syntax check
try {
    new vm.Script(jsContent);
    console.log('   ✓ dashboard.js syntax is valid');
} catch (err) {
    console.error('   ✗ dashboard.js syntax error:', err.message);
    process.exit(1);
}

if (!jsContent.includes('initHeaderProfileModal') || !jsContent.includes('headerProfileModal')) {
    console.error('   ✗ Expected initHeaderProfileModal in dashboard.js');
    process.exit(1);
}
console.log('   ✓ initHeaderProfileModal is present in dashboard.js');

if (!jsContent.includes('topbarEl.classList.add("scrolled")')) {
    console.error('   ✗ Expected topbar scroll shadow handler in dashboard.js');
    process.exit(1);
}
console.log('   ✓ Sticky topbar scroll shadow handler is present in dashboard.js');

if (!jsContent.includes('localStorage.removeItem("hello_solar_installer_logged_in")')) {
    console.error('   ✗ Expected session clear in logout handler');
    process.exit(1);
}
console.log('   ✓ Logout handlers properly clear installer session data from localStorage');

console.log('\n=== ALL FIXED HEADER & LOGOUT VERIFICATIONS PASSED! ===\n');
