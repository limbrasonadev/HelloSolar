// Isolated browser checks; localStorage mutations live only in a fresh test context.
const assert = require('node:assert/strict');
module.exports = async function verifyBehavior(page, name, origin) {
    const click = selector => page.locator(selector).first().evaluate(el => el.click());
    const isOpen = id => page.locator('#' + id).evaluate(el => el.classList.contains('open'));
    const readStore = () => page.evaluate(() => window.HelloSolarStore.getPortalData());
    if (name === 'login') {
        await page.locator('#username').fill('invalid@example.test');
        await page.locator('#password').fill('incorrect');
        await click('#loginBtn');
        await page.waitForFunction(() => !document.getElementById('loginBtn').disabled && document.getElementById('loginErrorText').textContent.includes('Invalid'));
        await page.locator('#username').fill('financer@hellosolar.ph');
        await page.locator('#password').fill('password123');
        await click('#loginBtn');
        await page.waitForURL('**/dashboard.html');
        assert.equal(await page.evaluate(() => localStorage.getItem('hello_solar_financer_logged_in')), 'true');
        await click('#logout');
        await page.waitForURL('**/login.html');
        assert.equal(await page.evaluate(() => localStorage.getItem('hello_solar_financer_logged_in')), null);
        return;
    }
    if (name === 'signup') {
        await page.locator('#signupForm').evaluate(form => form.dispatchEvent(new Event('submit', { cancelable: true })));
        assert.ok(await page.locator('.form-group.invalid').count());
        for (const [id, value] of Object.entries({ businessName: 'Regression Solar', fullName: 'Test Financer', phone: '09171234567', email: 'cleanup@example.test', password: 'TestPassword123!', confirmPassword: 'TestPassword123!' })) await page.locator('#' + id).fill(value);
        await click('#signupButton');
        await page.waitForURL('**/dashboard.html');
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('hello_solar_financer_user')).email), 'cleanup@example.test');
        await page.goto(origin + '/login.html');
        assert.ok(await page.evaluate(() => window.HelloSolarAuth.authenticate('cleanup@example.test', 'TestPassword123!')));
        return;
    }
    // The JSON is supplementary; fetch failure must preserve the embedded/local fallback.
    const before = await readStore();
    const fetched = await page.evaluate(() => window.HelloSolarStore.loadAsync());
    assert.ok(fetched.applications.length >= before.applications.length);
    await page.route('**/data/financer_data.json', route => route.abort());
    const fallback = await page.evaluate(() => window.HelloSolarStore.loadAsync());
    assert.deepEqual(fallback, await readStore());
    await page.unroute('**/data/financer_data.json');

    await click('.profile');
    await page.locator('#profBusinessName').fill('Regression Solar');
    await click('#profileModalSaveBtn');
    assert.equal(await page.locator('#topbarFinancerName').textContent(), 'Regression Solar');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('#topbarFinancerName').textContent(), 'Regression Solar');
    await click('#menu');
    assert.equal(await isOpen('sidebar'), true);
    await page.keyboard.press('Escape');
    assert.equal(await isOpen('sidebar'), false);
    await click('#notificationBellBtn');
    assert.equal(await isOpen('notificationPanel'), true);
    await click('#notifMarkAllBtn');
    await page.waitForFunction(() => getComputedStyle(document.getElementById('notificationBadge')).display === 'none');
    await page.keyboard.press('Escape');
    assert.equal(await isOpen('notificationPanel'), false);

    if (['dashboard', 'applications'].includes(name)) {
        await click('.doc-status-text-btn');
        assert.equal(await isOpen('docChecklistModal'), true);
        assert.ok((await page.locator('#docSummaryCount').textContent()).includes('Documents'));
        await click('#docModalOpenReviewBtn');
        assert.equal(await isOpen('reviewModal'), true);
        await page.keyboard.press('Escape');
        const buttons = await page.locator('[data-decision="approved"]').evaluateAll(els => els.map(el => el.dataset.appid));
        assert.ok(buttons.length >= 2);
        await click(`[data-decision="approved"][data-appid="${buttons[0]}"]`);
        assert.equal((await readStore()).applications.find(a => a.id === buttons[0]).loan.status, 'approved');
        await click(`[data-decision="rejected"][data-appid="${buttons[1]}"]`);
        assert.equal((await readStore()).applications.find(a => a.id === buttons[1]).loan.status, 'rejected');
        await page.reload({ waitUntil: 'networkidle' });
        assert.equal((await readStore()).applications.find(a => a.id === buttons[0]).loan.status, 'approved');
        if (name === 'dashboard') {
            const count = (await readStore()).applications.filter(a => ['pending', 'review'].includes(a.loan?.status)).length;
            assert.equal(await page.locator('#dashValReview').textContent(), String(count));
        } else {
            await page.locator('#appSearchInput').fill('no-match-regression');
            assert.equal(await page.locator('#applicationsTable tbody tr:visible').count(), 0);
            await page.locator('#appSearchInput').fill('');
            await click('[data-filter="rejected"]');
            assert.ok(await page.locator('#applicationsTable tbody tr:visible').count());
        }
    }
    if (['approved', 'rejected'].includes(name)) {
        await page.locator(`#${name}SearchInput`).fill('no-match-regression');
        assert.equal(await page.locator(`#${name}Table tbody tr:visible`).count(), 0);
        await page.locator(`#${name}SearchInput`).fill('');
        assert.ok(await page.locator(`#${name}Table tbody tr:visible`).count());
        const select = page.locator(name === 'approved' ? '#merchantFilterSelect' : '#reasonFilterSelect');
        const value = await select.locator('option').nth(1).getAttribute('value');
        await select.selectOption(value);
        await select.selectOption('all');
        await click(name === 'approved' ? '.btn-open-loan-modal, .btn-toggle-loan-detail' : '.btn-open-decline-modal, .btn-toggle-decline-detail');
        assert.equal(await isOpen(name === 'approved' ? 'loanDetailModal' : 'declineDetailModal'), true);
        await page.keyboard.press('Escape');
        if (name === 'approved') {
            const appId = await page.locator('tr[data-appid]').first().getAttribute('data-appid');
            await page.evaluate(id => window.openPaymentPlanModal(id), appId);
            assert.equal(await isOpen('paymentPlanModal'), true);
            assert.ok((await page.locator('#planMetricFunded').textContent()).length);
            await page.keyboard.press('Escape');
        }
        // These retained CSV helpers are public; the current markup has no export button.
        const [downloaded] = await Promise.all([
            page.waitForEvent('download'),
            page.evaluate(pageName => pageName === 'approved' ? window.exportApprovedLoansCSV() : window.exportDeclinedApplicationsCSV(), name)
        ]);
        assert.ok(downloaded.suggestedFilename().endsWith('.csv'));
    }
    if (name === 'support') {
        await page.locator('#supportTicketForm').evaluate(form => form.dispatchEvent(new Event('submit', { cancelable: true })));
        assert.ok(await page.locator('#ticketMessageError').evaluate(el => el.classList.contains('visible')));
        await click('.custom-dropdown-trigger');
        await click('.custom-dropdown-item');
        await page.locator('#ticketMessage').fill('Regression test support request');
        await page.locator('#supportTicketForm').evaluate(form => form.dispatchEvent(new Event('submit', { cancelable: true })));
        assert.equal(await page.locator('#ticketMessage').inputValue(), '');
        assert.ok((await page.locator('#profileToastText').textContent()).includes('Support request submitted'));
        await click('.faq-question-btn');
        assert.equal(await page.locator('.faq-question-btn').first().getAttribute('aria-expanded'), 'true');
    }
};
