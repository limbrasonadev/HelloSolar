// Shared test environment: Super Admin seed + shared data layer in an isolated VM with in-memory storage.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '../..');

function environment(preset) {
  const store = new Map(preset || []);
  const redirects = [];
  const context = {
    console, crypto,
    location: { protocol: 'http:', replace: url => redirects.push(url) },
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k)
    },
    addEventListener() {}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'hello_solar_super_admin/js/data.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/hello-solar-shared.js'), 'utf8'), context);
  return { c: context, S: context.HSShared, store, redirects };
}
module.exports = { environment, ROOT };
