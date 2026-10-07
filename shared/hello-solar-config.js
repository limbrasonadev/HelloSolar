/**
 * Hello Solar — runtime configuration, API client and shared-record cache.
 *
 * Load this file FIRST on every page (before hello_solar_super_admin/data.js, shared/hello-solar-shared.js,
 * Super Admin auth.js and the landing-page scripts). See BACKEND_INTEGRATION.md.
 *
 * Modes
 *   local  (default) — today's prototype: every shared record lives in this browser's localStorage and the
 *                      demo/sample data is available. No server needed.
 *   api              — records come from the backend. On each page load the signed-in role's records are fetched
 *                      once (GET {apiBase}/bootstrap) into an in-memory cache, so the existing synchronous portal
 *                      code keeps working. Every write is sent to the backend as a named command, and the records
 *                      the backend returns replace the cached ones. Demo/sample data is always off.
 *
 * Switch modes by editing DEFAULT_CONFIG below, or by defining window.HS_CONFIG before this file loads
 * (e.g. an inline <script> injected by the server): window.HS_CONFIG = { mode: "api", apiBase: "https://…/api" }.
 */
(function (window) {
    "use strict";

    const DEFAULT_CONFIG = {
        mode: "local",          // "local" | "api"
        apiBase: "/api",        // backend base URL (api mode)
        demoData: true,         // seed/demo/sample data (local mode only — forced off in api mode)
        requestTimeoutMs: 20000
    };

    // ------------------------------------------------------------------
    // Configuration
    // ------------------------------------------------------------------
    const PORTAL_ROLES = [
        ["hello_solar_customer", "customer"],
        ["hello_solar_financer", "financer"],
        ["hello_solar_installer", "installer"],
        ["hello_solar_merchant", "merchant"],
        ["hello_solar_super_admin", "admin"],
        ["hello_solar", "public"]
    ];
    function detectPortalRole() {
        let path = "";
        try { path = decodeURIComponent(String(window.location && window.location.pathname || "")).toLowerCase(); } catch (e) { path = ""; }
        if (/customer_confirmation\.html$/.test(path)) return "public"; // public inquiry confirmation page (token link)
        const hit = PORTAL_ROLES.find(([folder]) => path.includes(`/${folder}/`));
        return hit ? hit[1] : "public";
    }

    const config = Object.assign({}, DEFAULT_CONFIG, window.HS_CONFIG || {});
    config.mode = config.mode === "api" ? "api" : "local";
    if (config.mode === "api") config.demoData = false; // never mix demo data with real records
    config.apiBase = String(config.apiBase || "").replace(/\/+$/, "");
    config.portalRole = config.portalRole || detectPortalRole();
    config.isApi = config.mode === "api";
    window.HS_CONFIG = Object.freeze(config);

    // ------------------------------------------------------------------
    // Keys of the records shared between portals (system of record = backend in api mode)
    // ------------------------------------------------------------------
    const KEYS = Object.freeze({
        DATA: "HELLO_SOLAR_SUPER_ADMIN_DATA_V2",            // accounts, applications, installations, payments, support, inquiries, activity
        DOCUMENTS: "hello_solar_shared_documents",           // required documents per APP ID
        NOTIFICATIONS: "hello_solar_notifications_store",    // notifications for every portal
        INSTALLATION_PROGRESS: "hello_solar_installation_progress", // installation progress per APP ID
        CUSTOMER_INQUIRY_QUEUE: "HELLO_SOLAR_CUSTOMER_INQUIRIES",  // landing page → Super Admin (local mode only)
        PARTNER_INQUIRY_QUEUE: "HELLO_SOLAR_PARTNER_INQUIRIES"     // landing page → Super Admin (local mode only)
    });
    const CACHED_KEYS = [KEYS.DATA, KEYS.DOCUMENTS, KEYS.NOTIFICATIONS, KEYS.INSTALLATION_PROGRESS];

    // ------------------------------------------------------------------
    // Auth tokens (api mode): one per role, like the role sessions
    // ------------------------------------------------------------------
    const tokenKey = role => `hello_solar_api_token_${role}`;
    const tokens = {
        get(role) { try { return window.localStorage.getItem(tokenKey(role || config.portalRole)) || ""; } catch (e) { return ""; } },
        set(role, token) { try { if (token) window.localStorage.setItem(tokenKey(role), token); } catch (e) { /* storage unavailable */ } },
        clear(role) { try { window.localStorage.removeItem(tokenKey(role || config.portalRole)); } catch (e) { /* storage unavailable */ } }
    };

    // ------------------------------------------------------------------
    // HTTP client
    // ------------------------------------------------------------------
    function url(path) {
        return /^https?:\/\//i.test(path) ? path : `${config.apiBase}${path.startsWith("/") ? "" : "/"}${path}`;
    }
    function parse(text) {
        if (!text) return null;
        try { return JSON.parse(text); } catch (e) { return { message: text }; }
    }
    function result(status, data) {
        const ok = status >= 200 && status < 300;
        return { ok, status, data: data || null, error: ok ? null : ((data && (data.error || data.message)) || `Request failed (${status || "network error"}).`) };
    }

    /**
     * request(method, path, body, options) → Promise<{ ok, status, data, error }>
     * requestSync(...) → { ok, status, data, error } — used only where today's UI expects an immediate answer
     * (page bootstrap, login, signup). Sync XHR is a transitional bridge; see BACKEND_INTEGRATION.md §11.
     */
    function headers(options) {
        const h = { Accept: "application/json" };
        const role = (options && options.role) || config.portalRole;
        const token = options && options.auth === false ? "" : tokens.get(role);
        if (token) h.Authorization = `Bearer ${token}`;
        return h;
    }
    function request(method, path, body, options) {
        const opts = options || {};
        const h = headers(opts);
        let payload;
        if (body instanceof (window.FormData || function () {})) payload = body;
        else if (body !== undefined && body !== null) { payload = JSON.stringify(body); h["Content-Type"] = "application/json"; }
        const ctrl = typeof window.AbortController === "function" ? new window.AbortController() : null;
        const timer = ctrl ? setTimeout(() => ctrl.abort(), config.requestTimeoutMs) : null;
        return window.fetch(url(path), { method, headers: h, body: payload, credentials: "include", signal: ctrl ? ctrl.signal : undefined })
            .then(res => res.text().then(text => result(res.status, parse(text))))
            .catch(err => result(0, { error: err && err.name === "AbortError" ? "The server did not respond in time." : "Could not reach the Hello Solar server." }))
            .finally(() => { if (timer) clearTimeout(timer); });
    }
    function requestSync(method, path, body, options) {
        try {
            const xhr = new window.XMLHttpRequest();
            xhr.open(method, url(path), false);
            xhr.withCredentials = true;
            const h = headers(options || {});
            Object.keys(h).forEach(k => xhr.setRequestHeader(k, h[k]));
            if (body !== undefined && body !== null) xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(body !== undefined && body !== null ? JSON.stringify(body) : null);
            return result(xhr.status, parse(xhr.responseText));
        } catch (e) {
            return result(0, { error: "Could not reach the Hello Solar server." });
        }
    }

    // ------------------------------------------------------------------
    // Command routes — every write the UI can make. Portal commands come from window.HSShared, admin commands
    // from window.HelloSolarStore (Super Admin / Direct Engineer). Path params (:name) are filled from the payload.
    // ------------------------------------------------------------------
    const COMMAND_ROUTES = {
        // Accounts & profile
        "account.register":            ["POST",  "/auth/register"],
        "profile.update":              ["PATCH", "/me/profile"],
        // Applications & payments (customer)
        "application.claim":           ["POST",  "/applications/claim"],
        "receipt.submit":              ["POST",  "/applications/:appId/receipts"],
        // Documents
        "document.upload":             ["POST",  "/applications/:appId/documents/:docId"],   // multipart
        "document.review":             ["PATCH", "/applications/:appId/documents/:docId"],
        // Support
        "support.create":              ["POST",  "/support/tickets"],
        // Notifications
        "notification.markRead":       ["POST",  "/notifications/read"],
        // Financer decisions
        "financing.decision":          ["POST",  "/applications/:appId/financing-decision"],
        // Partner installer workflow
        "installer.accept":            ["POST",  "/installations/:appId/accept"],
        "installer.decline":           ["POST",  "/installations/:appId/decline"],
        "installer.start":             ["POST",  "/installations/:appId/start"],
        "installer.complete":          ["POST",  "/installations/:appId/complete"],
        "installer.activate":          ["POST",  "/installations/:appId/activate"],
        "installation.progress":       ["PUT",   "/installations/:appId/progress"],
        // Landing page (public, no token)
        "inquiry.submit":              ["POST",  "/public/inquiries"],
        "inquiry.respond":             ["POST",  "/public/inquiries/:inquiryId/response"],
        // Super Admin / Direct Engineer — one route per HelloSolarStore write method
        "admin.*":                     ["POST",  "/admin/commands/:method"]
    };
    function routeFor(name, payload) {
        let route = COMMAND_ROUTES[name];
        let params = Object.assign({}, payload || {});
        if (!route && name.startsWith("admin.")) {
            route = COMMAND_ROUTES["admin.*"];
            params.method = name.slice(6);
        }
        if (!route) return null;
        const path = route[1].replace(/:([a-zA-Z]+)/g, (_, k) => encodeURIComponent(params[k] == null ? "" : params[k]));
        return { method: route[0], path };
    }

    function emit(type, detail) {
        try { window.dispatchEvent(new window.CustomEvent(type, { detail })); } catch (e) { /* no window events (tests) */ }
    }

    /**
     * Sends a named write command to the backend (api mode). The UI has already applied the change to the cache
     * (same rules as local mode); the records the backend returns replace the cached ones.
     * Expected response: { records?: { applications: [...], customers: [...], ... }, documents?, notifications?,
     *                      installationProgress?, removed?: { collection: [ids] } }
     */
    function command(name, payload, options) {
        if (!config.isApi) return Promise.resolve({ ok: true, local: true });
        const route = routeFor(name, payload);
        if (!route) {
            console.warn(`[HSApi] No route for command "${name}" — add it to COMMAND_ROUTES.`);
            return Promise.resolve({ ok: false, error: "Unknown command" });
        }
        const body = options && options.formData ? options.formData : Object.assign({ command: name }, payload || {});
        return request(route.method, route.path, body, { role: options && options.role, auth: options && options.auth })
            .then(res => {
                if (res.ok && res.data) cache.merge(res.data);
                if (!res.ok) {
                    console.warn(`[HSApi] ${name} failed:`, res.error);
                    emit("hs:api-error", { command: name, payload, status: res.status, error: res.error });
                }
                return res;
            });
    }

    // ------------------------------------------------------------------
    // Shared-record cache (api mode) / localStorage passthrough (local mode)
    // ------------------------------------------------------------------
    const memory = {};
    function isCached(key) { return config.isApi && CACHED_KEYS.includes(key); }
    const store = {
        getItem(key) {
            if (isCached(key)) return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
            try { return window.localStorage.getItem(key); } catch (e) { return null; }
        },
        setItem(key, value) {
            if (isCached(key)) { memory[key] = String(value); return; }
            window.localStorage.setItem(key, value);
        },
        removeItem(key) {
            if (isCached(key)) { delete memory[key]; return; }
            try { window.localStorage.removeItem(key); } catch (e) { /* storage unavailable */ }
        },
        json(key, fallback) {
            try {
                const raw = store.getItem(key);
                return raw ? JSON.parse(raw) : fallback;
            } catch (e) { return fallback; }
        }
    };

    const COLLECTION_DEFAULTS = {
        customers: [], financers: [], installers: [], merchants: [], engineers: [],
        applications: [], installations: [], payments: [], paymentSchedules: {},
        support: [], inquiries: [], activity: [], settings: {}
    };

    const cache = {
        loaded: false,
        account: null,
        // Replaces the cache with a bootstrap payload: { account, data, documents, notifications, installationProgress }
        load(payload) {
            const p = payload || {};
            const data = Object.assign(JSON.parse(JSON.stringify(COLLECTION_DEFAULTS)), p.data || {});
            memory[KEYS.DATA] = JSON.stringify(data);
            memory[KEYS.DOCUMENTS] = JSON.stringify(p.documents || {});
            memory[KEYS.NOTIFICATIONS] = JSON.stringify(Array.isArray(p.notifications) ? p.notifications : []);
            memory[KEYS.INSTALLATION_PROGRESS] = JSON.stringify(p.installationProgress || {});
            cache.account = p.account || null;
            cache.loaded = true;
        },
        // Upserts records returned by the backend (by id) and removes deleted ones
        merge(res) {
            if (!config.isApi || !res || typeof res !== "object") return;
            const data = store.json(KEYS.DATA, null) || JSON.parse(JSON.stringify(COLLECTION_DEFAULTS));
            const records = res.records || {};
            Object.keys(records).forEach(col => {
                const incoming = records[col];
                if (Array.isArray(incoming)) {
                    if (!Array.isArray(data[col])) data[col] = [];
                    incoming.forEach(rec => {
                        if (!rec || rec.id == null) return;
                        const i = data[col].findIndex(x => x && x.id === rec.id);
                        if (i >= 0) data[col][i] = rec; else data[col].unshift(rec);
                    });
                } else if (incoming && typeof incoming === "object") {
                    data[col] = Object.assign({}, data[col] || {}, incoming); // keyed maps (paymentSchedules, settings)
                }
            });
            Object.keys(res.removed || {}).forEach(col => {
                const ids = res.removed[col] || [];
                if (Array.isArray(data[col])) data[col] = data[col].filter(x => !ids.includes(x && x.id));
            });
            memory[KEYS.DATA] = JSON.stringify(data);
            if (res.documents) memory[KEYS.DOCUMENTS] = JSON.stringify(Object.assign(store.json(KEYS.DOCUMENTS, {}), res.documents));
            if (res.installationProgress) memory[KEYS.INSTALLATION_PROGRESS] = JSON.stringify(Object.assign(store.json(KEYS.INSTALLATION_PROGRESS, {}), res.installationProgress));
            if (Array.isArray(res.notifications)) {
                const list = store.json(KEYS.NOTIFICATIONS, []);
                res.notifications.forEach(n => { const i = list.findIndex(x => x.id === n.id); if (i >= 0) list[i] = n; else list.unshift(n); });
                memory[KEYS.NOTIFICATIONS] = JSON.stringify(list);
            }
            if (window.HELLO_SOLAR_DB && typeof window.HELLO_SOLAR_DB.load === "function") {
                window.HELLO_SOLAR_DB.data = window.HELLO_SOLAR_DB.load();
            }
            emit("hs:records-updated", { records: Object.keys(records) });
        }
    };

    // Page bootstrap (api mode): load the signed-in role's records before the portal scripts run.
    function bootstrap() {
        if (!config.isApi) return { ok: true, local: true };
        const role = config.portalRole;
        if (role === "public" || !tokens.get(role)) { cache.load({}); return { ok: false, status: 401 }; }
        const res = requestSync("GET", `/bootstrap?role=${encodeURIComponent(role)}`, null, { role });
        if (res.ok) cache.load(res.data);
        else {
            cache.load({});
            if (res.status === 401 || res.status === 403) tokens.clear(role); // session ended → login page guard redirects
        }
        return res;
    }

    window.HSApi = Object.freeze({ config, KEYS, tokens, request, requestSync, command, routeFor, COMMAND_ROUTES, bootstrap });
    window.HSStore = Object.freeze({ getItem: store.getItem, setItem: store.setItem, removeItem: store.removeItem, json: store.json, cache, KEYS });

    bootstrap();
})(typeof window !== "undefined" ? window : this);
