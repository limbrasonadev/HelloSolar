/**
 * Hello Solar — unified login (window.HSLogin)
 *
 * One sign-in for every dashboard. The account decides where the user lands:
 *   Customer  (CUS-####) → Hello_Solar_Customer/mysystem.html
 *   Financer  (FIN-###)  → Hello_Solar_Financer/dashboard.html
 *   Installer (INS-###)  → Hello_Solar_Installer/myjob.html
 *   Merchant  (MER-###)  → Hello_Solar_Merchant/dashboard.html
 *   Super Admin / Direct Engineer (ENG-###) → hello_solar_super_admin/index.html
 *
 * Sessions stay per role (HSShared.session / SuperAdminAuth), with the same payload each portal's own
 * auth.js used to write, so the dashboards need no changes.
 *
 * Load order: shared/hello-solar-config.js → hello_solar_super_admin/js/data.js → shared/hello-solar-shared.js
 *             → hello_solar_super_admin/js/auth.js → shared/hello-solar-login.js
 *
 * api mode: POST /auth/login { identifier, password, role? } with no role (or the ?portal= hint) and the backend
 * answers with { token, account: { role, ... } }. See BACKEND_INTEGRATION.md §6.
 */
(function (window) {
    "use strict";

    const PORTAL_ROLES = ["customer", "financer", "installer", "merchant"];
    const ADMIN_ROLES = ["super-admin", "direct-engineer"];

    const DESTINATIONS = {
        customer: { label: "Customer Portal", url: "Hello_Solar_Customer/mysystem.html" },
        financer: { label: "Financer Portal", url: "Hello_Solar_Financer/dashboard.html" },
        installer: { label: "Installer Portal", url: "Hello_Solar_Installer/myjob.html" },
        merchant: { label: "Merchant Portal", url: "Hello_Solar_Merchant/dashboard.html" },
        "super-admin": { label: "Super Admin", url: "hello_solar_super_admin/index.html" },
        "direct-engineer": { label: "Hello Solar Direct", url: "hello_solar_super_admin/index.html" }
    };

    // ?portal= values accepted from the old per-portal login pages
    const PORTAL_HINTS = { customer: "customer", financer: "financer", installer: "installer", merchant: "merchant", admin: "super-admin", "super-admin": "super-admin", engineer: "direct-engineer" };

    const GENERIC_ERROR = "Invalid email/account ID or password. Please try again.";

    const config = () => window.HS_CONFIG || { isApi: false, demoData: true };
    const shared = () => window.HSShared || null;
    const admin = () => window.SuperAdminAuth || null;

    // Session payloads — identical to each portal's own setSession()
    function sessionExtras(role, account) {
        switch (role) {
            case "customer":
                return { accountNo: account.hsId || "", role };
            case "financer":
                return { businessName: account.name || "", fullName: account.contact || account.name || "", partnerId: account.id, financerId: account.id, role };
            case "installer":
                return { businessName: account.name || "", fullName: account.contact || account.name || "", installerId: account.id, avatarUrl: "" };
            case "merchant":
                return { businessName: account.name || "", contactPerson: account.contact || "", merchantId: account.id };
            default:
                return {};
        }
    }

    function startPortalSession(role, account) {
        shared().session.start(role, account, sessionExtras(role, account));
    }

    function normalizeHint(hint) {
        return PORTAL_HINTS[String(hint || "").trim().toLowerCase()] || null;
    }

    function destinationFor(role) {
        return DESTINATIONS[role] || null;
    }

    // Already signed in to the hinted portal → that dashboard (used when an old portal login link is opened)
    function activeSessionFor(hint) {
        const role = normalizeHint(hint);
        if (!role) return null;
        try {
            if (PORTAL_ROLES.includes(role)) return shared() && shared().session.isValid(role) ? role : null;
            const a = admin();
            return a && a.isSignedIn() ? a.getRole() : null;
        } catch (e) { return null; }
    }

    // ------------------------------------------------------------------
    // Local mode: find which registry the identifier belongs to, then authenticate there
    // ------------------------------------------------------------------
    function loginLocal(identifier, password, hint) {
        const S = shared();
        if (!S) return { ok: false, error: "Sign-in is unavailable right now. Please try again later." };
        const data = S.read();
        if (!data) return { ok: false, error: "Shared records are unavailable. Open the portals from the shared Hello Solar origin." };

        let candidates = PORTAL_ROLES.filter(role => S.findAccount(role, identifier, data));
        if (hint && candidates.includes(hint)) candidates = [hint].concat(candidates.filter(r => r !== hint));

        let error = "";
        for (const role of candidates) {
            const res = S.authenticate(role, identifier, password);
            if (res.ok) {
                startPortalSession(role, res.account);
                return { ok: true, role, account: res.account };
            }
            // A specific message (e.g. pending review) means the password matched — keep it over the generic one
            if (res.error && res.error !== "Invalid email/username or password. Please try again.") error = error || res.error;
        }

        // Super Admin and Direct Installation Engineer accounts
        const A = admin();
        if (A) {
            if (A.login(identifier, password)) return { ok: true, role: A.getRole() };
            error = error || A.getLastError() || "";
        }
        return { ok: false, error: error || GENERIC_ERROR };
    }

    // ------------------------------------------------------------------
    // api mode: the backend identifies the account and its role
    // ------------------------------------------------------------------
    function loginApi(identifier, password, hint) {
        const API = window.HSApi;
        if (!API) return { ok: false, error: "Sign-in is unavailable right now. Please try again later." };
        const body = { identifier, password };
        if (hint) body.role = PORTAL_ROLES.includes(hint) ? hint : "admin";
        const res = API.requestSync("POST", "/auth/login", body, { role: "public", auth: false });
        const account = res.data && res.data.account;
        if (!res.ok || !account) {
            return { ok: false, error: (res.data && res.data.error) || (res.status === 0 ? res.error : GENERIC_ERROR) };
        }
        const role = account.role;
        if (PORTAL_ROLES.includes(role)) {
            API.tokens.set(role, res.data.token);
            const clean = Object.assign({}, account);
            delete clean.password;
            startPortalSession(role, clean);
            return { ok: true, role, account: clean };
        }
        if (ADMIN_ROLES.includes(role) && admin() && admin().acceptApiLogin(res.data)) {
            return { ok: true, role };
        }
        return { ok: false, error: "This account has no Hello Solar dashboard access." };
    }

    function login(identifier, password, hint) {
        const id = String(identifier || "").trim();
        const pass = String(password || "");
        if (!id) return { ok: false, field: "identifier", error: "Please enter your email or account ID." };
        if (!pass) return { ok: false, field: "password", error: "Please enter your password." };
        const role = normalizeHint(hint);
        try {
            return config().isApi ? loginApi(id, pass, role) : loginLocal(id, pass, role);
        } catch (e) {
            return { ok: false, error: "Unable to start your session. Allow browser storage and try again." };
        }
    }

    // Local demo mode only: one sample account per dashboard, for quick testing
    function demoAccounts() {
        const cfg = config();
        if (cfg.isApi || cfg.demoData === false) return [];
        const S = shared();
        const data = S && S.read();
        const list = [];
        if (data) {
            PORTAL_ROLES.forEach(role => {
                const acc = S.accountsFor(role, data).find(a => a.status === "Active" && a.password && a.email);
                if (acc) list.push({ role, label: DESTINATIONS[role].label.replace(" Portal", ""), identifier: acc.email, password: acc.password });
            });
        }
        list.push({ role: "super-admin", label: "Super Admin", identifier: "admin@hellosolar.ph", password: "admin123" });
        list.push({ role: "direct-engineer", label: "Engineer", identifier: "engineer@hellosolar.ph", password: "engineer123" });
        return list;
    }

    // ------------------------------------------------------------------
    // Passwords: forgot-password.html and set-password.html
    // api mode (see BACKEND_INTEGRATION.md §6):
    //   POST /auth/password/forgot { identifier }            → 200 always (never reveals whether the account exists)
    //   GET  /auth/password/token?token=…                    → { purpose: "activate" | "reset", email }
    //   POST /auth/password/set    { token, password }       → 200 on success; 400/410 when the link is invalid/expired
    // local mode has no email service: requests succeed without sending anything, and any non-empty token opens the form.
    // ------------------------------------------------------------------
    const PASSWORD_MIN = 8;

    function passwordChecks(password) {
        const pw = String(password || "");
        return {
            length: pw.length >= PASSWORD_MIN,
            letter: /[A-Za-z]/.test(pw),
            number: /\d/.test(pw)
        };
    }

    function validatePassword(password, confirm) {
        const checks = passwordChecks(password);
        if (!checks.length || !checks.letter || !checks.number) {
            return { ok: false, field: "password", error: `Use at least ${PASSWORD_MIN} characters with a letter and a number.` };
        }
        if (confirm !== undefined && String(confirm) !== String(password)) {
            return { ok: false, field: "confirm", error: "The passwords don't match." };
        }
        return { ok: true };
    }

    const delay = (value, ms) => new Promise(resolve => setTimeout(() => resolve(value), ms || 400));
    const api = () => (config().isApi && window.HSApi ? window.HSApi : null);
    const apiError = (res, fallback) => (res && res.data && res.data.error) || (res && res.status === 0 ? res.error : "") || fallback;

    function requestPasswordReset(identifier) {
        const id = String(identifier || "").trim();
        if (!id) return Promise.resolve({ ok: false, field: "identifier", error: "Please enter your email or account ID." });
        const API = api();
        if (!API) return delay({ ok: true });
        return API.request("POST", "/auth/password/forgot", { identifier: id }, { role: "public", auth: false })
            .then(res => (res.ok || res.status === 404) ? { ok: true }
                : { ok: false, error: apiError(res, "We couldn't send the link right now. Please try again.") });
    }

    function verifyPasswordToken(token) {
        const t = String(token || "").trim();
        if (!t) return Promise.resolve({ ok: false, error: "This link is incomplete. Open the full link from your email." });
        const API = api();
        if (!API) return delay({ ok: true, purpose: null, email: "" }, 150);
        return API.request("GET", `/auth/password/token?token=${encodeURIComponent(t)}`, null, { role: "public", auth: false })
            .then(res => res.ok
                ? { ok: true, purpose: (res.data && res.data.purpose) || null, email: (res.data && res.data.email) || "" }
                : { ok: false, error: apiError(res, "This link is invalid or has expired.") });
    }

    function setPassword(token, password, confirm) {
        const check = validatePassword(password, confirm);
        if (!check.ok) return Promise.resolve(check);
        const t = String(token || "").trim();
        if (!t) return Promise.resolve({ ok: false, error: "This link is incomplete. Open the full link from your email." });
        const API = api();
        if (!API) return delay({ ok: true });
        return API.request("POST", "/auth/password/set", { token: t, password: String(password) }, { role: "public", auth: false })
            .then(res => res.ok ? { ok: true }
                : { ok: false, expired: res.status === 400 || res.status === 410, error: apiError(res, "We couldn't save your password. Please try again.") });
    }

    window.HSLogin = {
        login, destinationFor, activeSessionFor, normalizeHint, demoAccounts, sessionExtras, DESTINATIONS,
        PASSWORD_MIN, passwordChecks, validatePassword, requestPasswordReset, verifyPasswordToken, setPassword
    };
})(window);
