// Test environment: Super Admin seed + shared data layer + Financer store, signed in as a shared FIN-### account.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');

function makeFinancerContext(sharedStorage = {}, financerId = 'FIN-005') {
    const storage = { ...sharedStorage };
    const context = {
        console,
        crypto: require('crypto'),
        location: { protocol: 'http:', replace() {} },
        document: { addEventListener: () => {}, querySelectorAll: () => [], getElementById: () => null },
        localStorage: {
            getItem: (k) => (k in storage ? storage[k] : null),
            setItem: (k, v) => { storage[k] = String(v); },
            removeItem: (k) => { delete storage[k]; }
        },
        addEventListener() {}
    };
    context.window = context;
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'hello_solar_super_admin/data.js'), 'utf8'), context);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/hello-solar-shared.js'), 'utf8'), context);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'Hello_Solar_Financer/js/portal_data.js'), 'utf8'), context);
    const account = context.HSShared.getAccount('financer', financerId);
    if (account) context.HSShared.session.start('financer', account, { businessName: account.name, fullName: account.contact, partnerId: account.id, financerId: account.id });
    context.storage = storage;
    return context;
}

module.exports = { makeFinancerContext };
