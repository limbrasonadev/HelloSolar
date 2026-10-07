// Browser regression check. Requires Playwright (set NODE_PATH to its installation).
// Record before a structural edit, then compare with the same baseline directory:
// node scripts/verify-pages.cjs --record --baseline <temporary-directory>
// node scripts/verify-pages.cjs --baseline <temporary-directory> [--page dashboard]
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
const root = args.includes('--root') ? path.resolve(option('--root')) : path.resolve(__dirname, '..');
const baseline = args.includes('--baseline') ? option('--baseline') : null;
if (!baseline) throw new Error('Pass --baseline <directory> (outside the source tree).');
const record = args.includes('--record');
const pages = args.includes('--page') ? option('--page').split(',') : ['login', 'signup', 'dashboard', 'applications', 'approved', 'rejected', 'support'];
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', (mime[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8');
    res.end(fs.readFileSync(file));
});
async function snapshot(page) {
    await page.evaluate(() => document.fonts.ready);
    return page.evaluate(() => {
        const props = ['display', 'position', 'width', 'height', 'padding', 'margin', 'gap', 'grid-template-columns', 'flex-direction', 'align-items', 'justify-content', 'font-family', 'font-size', 'font-weight', 'line-height', 'color', 'background-color', 'border', 'border-radius', 'box-shadow', 'overflow', 'visibility', 'opacity', 'text-align', 'white-space', 'min-width', 'max-width', 'min-height', 'max-height', 'z-index'];
        return [...document.body.querySelectorAll('*')].filter(el => !['SCRIPT', 'STYLE'].includes(el.tagName)).map(el => {
            const style = getComputedStyle(el);
            const values = Object.fromEntries(props.map(p => [p, style.getPropertyValue(p)]));
            return { tag: el.tagName, id: el.id, hidden: el.hidden, styles: values };
        });
    });
}
async function main() {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch({ headless: true, channel: 'msedge' });
    fs.mkdirSync(baseline, { recursive: true });
    let failures = 0;
    try {
        for (const name of pages) for (const width of [1440, 768, 390]) {
            const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
            await context.route('https://**/*', route => route.abort());
            const page = await context.newPage();
            const errors = [];
            page.on('pageerror', e => errors.push(e.message));
            page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
            await page.goto(`${origin}/${name}.html`, { waitUntil: 'networkidle' });
            await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
            const results = { initial: await snapshot(page) };
            const capture = async (label, selector) => {
                if (await page.locator(selector).count()) {
                    await page.locator(selector).first().evaluate(el => el.click());
                    if (label === 'notifications') await page.waitForFunction(() => getComputedStyle(document.getElementById('notificationBadge')).display === 'none');
                    results[label] = await snapshot(page);
                }
            };
            if (!['login', 'signup'].includes(name)) {
                await capture('profile', '.profile');
                await page.keyboard.press('Escape');
                // Close any modal before taking the next component snapshot.
                await page.evaluate(() => { document.querySelectorAll('.modal.open').forEach(el => el.classList.remove('open')); document.body.classList.remove('nav-open'); });
                await capture('notifications', '#notificationBellBtn');
                await page.keyboard.press('Escape');
            }
            if (['dashboard', 'applications'].includes(name)) {
                await capture('documents', '.doc-status-text-btn, .btn-underwrite');
                await page.keyboard.press('Escape');
                await capture('underwriting', '.btn-applicant-id, .btn-underwrite');
            }
            if (name === 'dashboard') await capture('kpi', '.stat-details-toggle, .stat-info-btn');
            if (name === 'approved') {
                const appId = await page.locator('tr[data-appid]').first().getAttribute('data-appid');
                await page.evaluate(id => window.openPaymentPlanModal(id), appId);
                results.payments = await snapshot(page);
            }
            if (name === 'rejected') await capture('decline', '.btn-open-decline-modal, .btn-toggle-decline-detail');
            if (name === 'support') { await capture('dropdown', '.custom-dropdown-trigger'); await capture('faq', '.faq-question-btn'); }
            if (name === 'login') await capture('password', '#passwordToggle');
            if (name === 'signup') await capture('password', '#passwordToggle');
            results.errors = errors;
            const file = path.join(baseline, `${name}-${width}.json`);
            if (record) fs.writeFileSync(file, JSON.stringify(results));
            else {
                const expected = JSON.parse(fs.readFileSync(file, 'utf8'));
                try { assert.deepEqual(JSON.parse(JSON.stringify(results)), expected); }
                catch {
                    failures++;
                    const diffs = [];
                    for (const state of Object.keys(expected)) {
                        if (JSON.stringify(results[state]) === JSON.stringify(expected[state])) continue;
                        for (let i = 0; i < Math.max(results[state]?.length || 0, expected[state]?.length || 0); i++) {
                            const a = expected[state]?.[i], b = results[state]?.[i];
                            if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push({ state, index: i, before: a, after: b });
                        }
                    }
                    fs.writeFileSync(path.join(baseline, `${name}-${width}-diff.json`), JSON.stringify(diffs, null, 2));
                    console.error(`${name} ${width}: ${diffs.length} differences (see baseline directory)`);
                }
            }
            console.log(`${record ? 'Recorded' : 'Checked'} ${name} at ${width}px; states: ${Object.keys(results).join(', ')}; runtime errors: ${errors.length}`);
            if (args.includes('--smoke') && width === 1440) {
                await page.goto(`${origin}/${name}.html`, { waitUntil: 'networkidle' });
                await require('./verify-behavior.cjs')(page, name, origin);
                assert.equal(errors.length, 0, errors.join('\n'));
                console.log(`Passed ${name} behavior checks`);
            }
            await context.close();
        }
    } finally { await browser.close(); }
    assert.equal(failures, 0, `${failures} page/viewport comparisons failed`);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
