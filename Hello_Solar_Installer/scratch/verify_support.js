const fs = require('fs');
const path = require('path');

const supportHtml = fs.readFileSync(path.join(__dirname, '..', 'support.html'), 'utf8');
const supportCss = fs.readFileSync(path.join(__dirname, '..', 'assets', 'css', 'support.css'), 'utf8');
const workspaceJs = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'workspace.js'), 'utf8');

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

console.log('--- 1. Page Header Verification ---');
assert(supportHtml.includes('<h1 class="topbar-title">Support</h1>'), 'Topbar title is "Support"');
assert(supportHtml.includes('<p class="topbar-subtitle">Need help with a job or field issue?</p>'), 'Topbar subtitle is "Need help with a job or field issue?"');
assert(supportHtml.includes('<h1 class="support-title">Support</h1>'), 'Workspace title is "Support"');
assert(supportHtml.includes('<p class="support-subtitle">Need help with a job or field issue?</p>'), 'Workspace subtitle is "Need help with a job or field issue?"');

console.log('\n--- 2. Left-Side Alignment Verification ---');
assert(supportCss.includes('max-width: 620px;') && supportCss.includes('margin: 0;'), 'support.css has left-aligned .support-container with margin: 0;');
assert(supportCss.includes('justify-content: flex-start;'), 'support.css has left-aligned .support-secondary-help');

console.log('\n--- 3. Main Support Card Verification ---');
assert(supportHtml.includes('id="mainSupportCard"'), 'Main Support Card exists with id="mainSupportCard"');
assert(supportHtml.includes('Need help?</h2>'), 'Card title is "Need help?"');
assert(supportHtml.includes('Tell us what happened and we\'ll help with the next step.'), 'Helper text is "Tell us what happened and we\'ll help with the next step."');
assert(supportHtml.includes('value="Site Access & Scheduling"'), 'Topic option "Site Access & Scheduling" present');
assert(supportHtml.includes('value="Payout & BIR 2307"'), 'Topic option "Payout & BIR 2307" present');
assert(supportHtml.includes('value="Equipment & Permits"'), 'Topic option "Equipment & Permits" present');
assert(supportHtml.includes('value="Profile & Credentials"'), 'Topic option "Profile & Credentials" present');
assert(supportHtml.includes('value="Other"'), 'Topic option "Other" present');
assert(supportHtml.includes('placeholder="e.g. JOB-2026-081"'), 'Job reference placeholder is "e.g. JOB-2026-081"');
assert(supportHtml.includes('placeholder="Tell us what you need help with..."'), 'Textarea placeholder is "Tell us what you need help with..."');
assert(supportHtml.includes('id="btnSendRequest"'), 'Primary CTA exists with id="btnSendRequest"');

console.log('\n--- 4. Common Answers Modal Verification ---');
assert(supportHtml.includes('id="faqModal"'), 'Modal exists with id="faqModal"');
assert(supportHtml.includes('class="installer-modal-backdrop"'), 'Modal has class "installer-modal-backdrop"');
assert(supportHtml.includes('class="installer-modal-card faq-modal-dialog"'), 'Modal has card dialog "faq-modal-dialog"');
assert(supportHtml.includes('id="closeFaqModal"'), 'Modal has header close button #closeFaqModal');
assert(supportHtml.includes('id="btnCloseFaqModalFooter"'), 'Modal has footer close button #btnCloseFaqModalFooter');
assert(supportHtml.includes('id="faqSearchInput"'), 'Modal contains #faqSearchInput');
assert(supportHtml.includes('id="faqList"'), 'Modal contains #faqList');
assert(supportHtml.includes('id="btnToggleFaq"'), 'Secondary trigger #btnToggleFaq opens modal');
assert(supportHtml.includes('aria-controls="faqModal"'), 'Trigger has aria-controls="faqModal"');

console.log('\n--- 5. JavaScript Logic Verification ---');
assert(workspaceJs.includes('openFaqModal'), 'workspace.js implements openFaqModal()');
assert(workspaceJs.includes('closeFaqModalDialog'), 'workspace.js implements closeFaqModalDialog()');
assert(workspaceJs.includes('faqModal.classList.add(\'open\')'), 'workspace.js opens modal with .open class');
assert(workspaceJs.includes('faqModal.classList.remove(\'open\')'), 'workspace.js closes modal by removing .open class');
assert(workspaceJs.includes('e.key === \'Escape\''), 'workspace.js handles Escape key to close modal');
assert(workspaceJs.includes('✓ Request sent to Hello Solar Dispatch!'), 'workspace.js provides request sent feedback');

const failed = checks.filter(c => c.status === 'FAIL');
if (failed.length > 0) {
    console.error(`\nTest failed with ${failed.length} failure(s).`);
    process.exit(1);
} else {
    console.log(`\nAll ${checks.length} assertions PASSED! 🎉 Support page left-aligned & FAQ modal verified!`);
}
