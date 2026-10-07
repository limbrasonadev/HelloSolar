const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const portals = ['dashboard', 'applications', 'approved', 'rejected', 'support'];
for (const name of [...portals, 'login', 'signup', 'index']) {
    const html = fs.readFileSync(path.join(root, name + '.html'), 'utf8');
    for (const [, ref] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
        if (/^(?:[a-z]+:|#|\/\/)/i.test(ref)) continue;
        assert.ok(fs.existsSync(path.join(root, ref.split(/[?#]/)[0])), `${name}: missing ${ref}`);
    }
    if (portals.includes(name)) {
        const styles = [...html.matchAll(/<link[^>]+href="(css\/[^"]+)"/g)].map(m => m[1]);
        const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
        assert.deepEqual(styles, ['css/portal.css', `css/${name}.css`, 'css/notifications.css']);
        // Shared data layer (Super Admin seed + HSShared) loads before every portal script
        assert.deepEqual(scripts, ['../hello_solar_super_admin/data.js', '../shared/hello-solar-shared.js', 'js/portal_data.js', 'js/portal.js', `js/${name}.js`, 'js/notifications.js']);
    }
    if (['login', 'signup'].includes(name)) {
        assert.ok(html.includes('href="css/auth.css"'));
        assert.ok(html.includes(`src="js/${name}.js"`));
        assert.ok(html.indexOf('src="js/auth.js"') < html.indexOf(`src="js/${name}.js"`));
        assert.ok(!/<style\b|\sstyle=|\son\w+=|<script(?![^>]*\bsrc=)/i.test(html), `${name}: inline CSS/JS remains`);
    }
    assert.ok(!/assets\/(?:css|js|data)\//.test(html), `${name}: stale asset path`);
}
for (const file of fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js'))) {
    execFileSync(process.execPath, ['--check', path.join(root, 'js', file)], { stdio: 'pipe' });
}
JSON.parse(fs.readFileSync(path.join(root, 'data/financer_data.json'), 'utf8'));
console.log('Passed: all HTML references, page asset ownership, authentication extraction, JSON parsing and JS syntax.');
