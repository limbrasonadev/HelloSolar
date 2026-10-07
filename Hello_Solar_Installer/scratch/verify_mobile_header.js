const fs = require('fs');
const path = require('path');

const pages = ['myjob.html', 'payout.html', 'profile.html', 'support.html'];
const cssContent = fs.readFileSync(path.join(__dirname, '..', 'assets', 'css', 'dashboard.css'), 'utf8');

console.log('=== VERIFYING MOBILE HEADER LOGO ACROSS NAVIGATION PAGES ===\n');

let allPassed = true;

// 1. Verify CSS rules
console.log('1. Checking CSS rules in dashboard.css...');
const hasDesktopHide = cssContent.includes('.mobile-logo,') && cssContent.includes('display: none;');
const hasMobileShow = cssContent.includes('.mobile-logo,') && cssContent.includes('display: inline-flex !important;');
const hasMobileTitleHide = cssContent.includes('.topbar-title {') && cssContent.includes('display: none !important;');

if (hasDesktopHide) {
    console.log('  ✓ Desktop rule hides .mobile-logo by default');
} else {
    console.error('  ✗ Desktop rule missing or invalid for .mobile-logo');
    allPassed = false;
}

if (hasMobileShow) {
    console.log('  ✓ Mobile media query shows .mobile-logo as inline-flex !important');
} else {
    console.error('  ✗ Mobile media query missing show rule for .mobile-logo');
    allPassed = false;
}

if (hasMobileTitleHide) {
    console.log('  ✓ Mobile media query hides .topbar-title !important');
} else {
    console.error('  ✗ Mobile media query missing hide rule for .topbar-title');
    allPassed = false;
}

// 2. Checking HTML files
console.log('\n2. Checking HTML navigation pages for topbar logo...');
pages.forEach(page => {
    const html = fs.readFileSync(path.join(__dirname, '..', page), 'utf8');
    
    // Check topbar-left has title AND mobile-logo
    const hasTopbarLeft = html.includes('class="topbar-left"');
    const hasTopbarTitle = html.includes('class="topbar-title"');
    const hasMobileLogo = html.includes('class="mobile-logo"') && html.includes('assets/images/hello_solar.png');
    const mobileLogoInsideLeft = html.match(/<div class="topbar-left">[\s\S]*?<a class="mobile-logo"[\s\S]*?<\/div>/);

    if (hasTopbarLeft && hasTopbarTitle && hasMobileLogo && mobileLogoInsideLeft) {
        console.log(`  ✓ ${page}: Contains .topbar-title and .mobile-logo inside .topbar-left`);
    } else {
        console.error(`  ✗ ${page}: Missing or incorrect topbar structure:`, {
            hasTopbarLeft,
            hasTopbarTitle,
            hasMobileLogo,
            mobileLogoInsideLeft: !!mobileLogoInsideLeft
        });
        allPassed = false;
    }
});

if (allPassed) {
    console.log('\n🎉 ALL CHECKS PASSED: Mobile header logo applied consistently to all navigations!');
    process.exit(0);
} else {
    console.error('\n❌ SOME CHECKS FAILED.');
    process.exit(1);
}
