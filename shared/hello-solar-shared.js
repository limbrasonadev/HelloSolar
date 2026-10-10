/**
 * Hello Solar — shared data access layer (window.HSShared)
 *
 * The single way portals read and write shared records. The system of record is the Super Admin store
 * (HELLO_SOLAR_SUPER_ADMIN_DATA_V2, seeded by hello_solar_super_admin/js/data.js) and stands in for the backend API.
 * All portals must be served from one origin for these records to be shared (see INTEGRATION_PLAN.md).
 *
 * Load order on every portal page: ../hello_solar_super_admin/js/data.js → ../shared/hello-solar-shared.js → portal scripts.
 */
(function (window) {
    "use strict";

    const DATA_KEY = "HELLO_SOLAR_SUPER_ADMIN_DATA_V2";
    const DOCUMENTS_KEY = "hello_solar_shared_documents";
    const NOTIFICATIONS_KEY = "hello_solar_notifications_store";
    const INSTALLATION_PROGRESS_KEY = "hello_solar_installation_progress";
    const NOTIFICATION_CHANNEL = "hello_solar_notifications_bus";

    // Runtime mode (shared/hello-solar-config.js). Without the config file (e.g. Node tests) → local mode.
    const CONFIG = window.HS_CONFIG || { mode: "local", isApi: false, demoData: true };
    const IS_API = !!CONFIG.isApi;
    const API = window.HSApi || null;
    // Shared records go through HSStore: localStorage in local mode, the backend-fed cache in api mode
    const backing = () => window.HSStore || window.localStorage;
    // Sends a write to the backend as a named command (no-op in local mode)
    function sendCommand(cmd, result) {
        if (!IS_API || !API || !cmd) return;
        const c = typeof cmd === "function" ? cmd(result) : cmd;
        if (c && c.name) API.command(c.name, c.payload || {});
    }

    // One session per role. A portal only ever reads/writes its own keys.
    const ROLES = {
        customer: { collection: "customers", flagKey: "hello_solar_logged_in", userKey: "hello_solar_user", label: "Customer", idPrefix: "CUS-" },
        financer: { collection: "financers", flagKey: "hello_solar_financer_logged_in", userKey: "hello_solar_financer_user", label: "Financer", idPrefix: "FIN-" },
        installer: { collection: "installers", flagKey: "hello_solar_installer_logged_in", userKey: "hello_solar_installer_user", label: "Installer", idPrefix: "INS-" },
        merchant: { collection: "merchants", flagKey: "hello_solar_merchant_logged_in", userKey: "hello_solar_merchant_user", label: "Merchant", idPrefix: "MER-" }
    };

    const storage = {
        get(key) { try { return backing().getItem(key); } catch (e) { return null; } },
        set(key, value) { backing().setItem(key, value); },
        remove(key) { try { backing().removeItem(key); } catch (e) { /* storage unavailable */ } },
        json(key, fallback) {
            try {
                const raw = backing().getItem(key);
                return raw ? JSON.parse(raw) : fallback;
            } catch (e) { return fallback; }
        }
    };

    const norm = value => String(value == null ? "" : value).trim().toLowerCase();
    const nowISO = () => new Date().toISOString();

    // ------------------------------------------------------------------
    // Shared store access
    // ------------------------------------------------------------------
    function ensureSeeded() {
        if (storage.get(DATA_KEY)) return true;
        if (IS_API) return false; // api mode: records come from the backend bootstrap, never from seed data
        const db = window.HELLO_SOLAR_DB;
        if (db && typeof db.save === "function") {
            db.save();
            return !!storage.get(DATA_KEY);
        }
        return false;
    }

    function read() {
        ensureSeeded();
        const data = storage.json(DATA_KEY, null);
        return data && Array.isArray(data.applications) ? data : null;
    }

    // Read-modify-write against the latest stored copy so other tabs' changes are never overwritten.
    // cmd: { name, payload } or (result) => ({ name, payload }) — the backend command for this write (api mode).
    function update(mutator, cmd) {
        const data = read();
        if (!data) return { ok: false, error: "Shared records are unavailable. Open the portals from the shared Hello Solar origin." };
        const result = mutator(data);
        if (result && result.ok === false) return result;
        try {
            storage.set(DATA_KEY, JSON.stringify(data));
        } catch (e) {
            return { ok: false, error: "Could not save to browser storage." };
        }
        const out = Object.assign({ ok: true }, result || {});
        if (IS_API && !cmd) console.warn("[HSShared] update() without a backend command — this change stays in the page cache.");
        sendCommand(cmd, out);
        return out;
    }

    // Saves a full copy of the shared records that the caller already changed (legacy portal write path, e.g. the
    // Installer portal), plus the backend command describing the change.
    function persist(data, cmd) {
        if (!data || !Array.isArray(data.applications)) return { ok: false, error: "Nothing to save." };
        try {
            storage.set(DATA_KEY, JSON.stringify(data));
        } catch (e) {
            return { ok: false, error: "Could not save to browser storage." };
        }
        sendCommand(cmd, { ok: true });
        return { ok: true };
    }

    function logActivity(data, entry) {
        if (!Array.isArray(data.activity)) data.activity = [];
        const ts = nowISO();
        data.activity.unshift(Object.assign({
            id: `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: ts,
            details: {}
        }, entry));
    }

    // ------------------------------------------------------------------
    // Accounts & identity
    // ------------------------------------------------------------------
    function accountsFor(role, data) {
        const cfg = ROLES[role];
        if (!cfg || !data) return [];
        const list = Array.isArray(data[cfg.collection]) ? data[cfg.collection] : [];
        // The internal installation team is Hello Solar Direct, not a partner installer login
        return role === "installer" ? list.filter(a => a.type !== "Internal") : list;
    }

    function findAccount(role, identifier, data) {
        const id = norm(identifier);
        if (!id) return null;
        return accountsFor(role, data || read()).find(a =>
            norm(a.email) === id || norm(a.username) === id || norm(a.id) === id) || null;
    }

    function getAccount(role, accountId, data) {
        if (!accountId) return null;
        return accountsFor(role, data || read()).find(a => a.id === accountId) || null;
    }

    function authenticate(role, identifier, password) {
        if (IS_API) {
            // Backend verifies the password and the account status, and returns { token, account, bootstrap? }
            const res = API.requestSync("POST", "/auth/login", { role, identifier, password }, { role, auth: false });
            if (!res.ok || !res.data || !res.data.account) {
                return { ok: false, error: (res.data && res.data.error) || (res.status === 0 ? res.error : "Invalid email/username or password. Please try again.") };
            }
            API.tokens.set(role, res.data.token);
            if (res.data.bootstrap && window.HSStore) window.HSStore.cache.load(res.data.bootstrap);
            const account = Object.assign({}, res.data.account);
            delete account.password;
            return { ok: true, account };
        }
        const data = read();
        if (!data) return { ok: false, error: "Shared records are unavailable. Open the portals from the shared Hello Solar origin." };
        const account = findAccount(role, identifier, data);
        if (!account || !account.password || account.password !== String(password || "")) {
            return { ok: false, error: "Invalid email/username or password. Please try again." };
        }
        if (account.status !== "Active") {
            return {
                ok: false,
                error: account.status === "Pending Review"
                    ? "Your account is pending Hello Solar review. You can log in once it has been activated."
                    : "This account is not active. Please contact Hello Solar support."
            };
        }
        // First login of an invited customer completes the invitation (same fields as Super Admin activation)
        if (role === "customer" && account.invitationStatus && account.invitationStatus !== "Active") {
            update(d => {
                const c = (d.customers || []).find(x => x.id === account.id);
                if (c) {
                    c.invitationStatus = "Active";
                    c.activatedAt = nowISO();
                    logActivity(d, {
                        role: "Customer", actorId: c.id, user: c.name, record: c.id, recordType: "Customer Account",
                        action: `Customer ${c.id} (${c.name}) activated portal account on first login`,
                        details: { customerId: c.id, invitationStatus: "Active" }
                    });
                }
            });
        }
        return { ok: true, account };
    }

    function nextId(list, prefix, pad) {
        const max = list.reduce((m, r) => {
            const match = String(r.id || "").match(new RegExp("^" + prefix + "(\\d+)$"));
            return match ? Math.max(m, parseInt(match[1], 10)) : m;
        }, prefix === "CUS-" ? 1000 : 0);
        return prefix + String(max + 1).padStart(pad, "0");
    }

    // Portal self-signup: registers a Pending Review account. Super Admin activates it before it can log in.
    function registerPendingAccount(role, profile) {
        const cfg = ROLES[role];
        if (!cfg) return { ok: false, error: "Unknown account type." };
        const email = String(profile.email || "").trim();
        if (IS_API) {
            // Backend creates the Pending Review account and assigns the ID (password is hashed server-side)
            const res = API.requestSync("POST", "/auth/register", { role, profile }, { role, auth: false });
            return res.ok ? { ok: true, account: (res.data && res.data.account) || null }
                : { ok: false, error: (res.data && res.data.error) || res.error };
        }
        return update(data => {
            if (!Array.isArray(data[cfg.collection])) data[cfg.collection] = [];
            const all = ["customers", "financers", "installers", "merchants"].flatMap(k => data[k] || []);
            if (all.some(a => norm(a.email) === norm(email))) {
                return { ok: false, error: "An account with this email already exists." };
            }
            const id = nextId(data[cfg.collection], cfg.idPrefix, role === "customer" ? 4 : 3);
            const record = Object.assign({}, profile, {
                id, email, status: "Pending Review", joined: nowISO().slice(0, 10), source: `${cfg.label} portal signup`
            });
            if (role === "installer") record.type = "Partner";
            if (role === "customer") record.invitationStatus = "Pending Activation";
            data[cfg.collection].unshift(record);
            logActivity(data, {
                role: cfg.label, actorId: id, user: record.name || email, record: id, recordType: `${cfg.label} Account`,
                action: `${cfg.label} account ${id} registered via portal signup — pending Super Admin review`,
                details: { id, email, status: "Pending Review" }
            });
            return { account: record };
        });
    }

    // ------------------------------------------------------------------
    // Sessions (per role, never shared between portals)
    // ------------------------------------------------------------------
    const session = {
        start(role, account, extra) {
            const cfg = ROLES[role];
            const payload = Object.assign({
                role,
                accountId: account.id,
                email: account.email,
                username: account.username || account.email,
                name: account.name || account.contact || account.email,
                contact: account.contact || "",
                phone: account.phone || ""
            }, extra || {});
            delete payload.password;
            storage.set(cfg.flagKey, "true");
            storage.set(cfg.userKey, JSON.stringify(payload));
            return payload;
        },
        get(role) {
            const cfg = ROLES[role];
            if (!cfg || storage.get(cfg.flagKey) !== "true") return null;
            const user = storage.json(cfg.userKey, null);
            if (!user || typeof user !== "object" || user.role !== role || !user.accountId) return null;
            return user;
        },
        // Updates profile fields on the current session (never identity fields)
        patch(role, fields) {
            const cfg = ROLES[role];
            const current = session.get(role);
            if (!current) return null;
            const next = Object.assign({}, current, fields, { role, accountId: current.accountId });
            delete next.password;
            storage.set(cfg.userKey, JSON.stringify(next));
            return next;
        },
        clear(role) {
            const cfg = ROLES[role];
            if (!cfg) return;
            if (IS_API && API && API.tokens.get(role)) {
                API.request("POST", "/auth/logout", {}, { role });
                API.tokens.clear(role);
            }
            storage.remove(cfg.flagKey);
            storage.remove(cfg.userKey);
        },
        // Valid when the session is for this role and the account still exists and is Active.
        isValid(role) {
            const user = session.get(role);
            if (!user) return false;
            if (IS_API && !(API && API.tokens.get(role))) return false;
            const account = getAccount(role, user.accountId);
            return !!account && account.status === "Active";
        },
        require(role, loginUrl) {
            if (session.isValid(role)) return session.get(role);
            session.clear(role);
            window.location.replace(loginUrl || "login.html");
            return null;
        }
    };

    // ------------------------------------------------------------------
    // Applications
    // ------------------------------------------------------------------
    function getApplication(appId, data) {
        const d = data || read();
        return d ? (d.applications || []).find(a => a.id === appId) || null : null;
    }

    function findApplicationByHsId(hsId, data) {
        const d = data || read();
        const id = norm(hsId);
        return d && id ? (d.applications || []).find(a => norm(a.hsId) === id) || null : null;
    }

    function applicationsForCustomer(customerId, data) {
        const d = data || read();
        return d && customerId ? (d.applications || []).filter(a => a.customerId === customerId) : [];
    }

    function applicationsForFinancer(financerId, data) {
        const d = data || read();
        return d && financerId ? (d.applications || []).filter(a => a.financerId === financerId) : [];
    }

    const isFullPayment = app => /full/i.test(String(app && (app.paymentType || app.paymentPreference) || "")) || (app && app.financer === "Not Required");
    const isDirect = app => !!app && (app.installerType === "Hello Solar Direct" || app.installerType === "Maintenance" || app.assignedInstallerId === "INS-001" || app.installer === "Hello Solar Internal Team");

    // Cleared for installation: financing approved (installment) or payment verified (full payment)
    function isClearedForInstallation(app) {
        if (!app || app.stage === "Declined" || app.dispatchStatus === "Cancelled") return false;
        const stage = String(app.stage || "");
        if (isFullPayment(app)) {
            const paid = ["Verified / Paid", "Verified", "Paid", "Completed"].includes(app.paymentStatus) || app.receiptVerificationStatus === "Verified";
            return paid && ["Ready for Installation", "Approved", "Installation"].includes(stage);
        }
        return ["Approved", "Ready for Installation", "Installation"].includes(stage)
            || String(app.applicationStatus || "").toUpperCase() === "READY_FOR_INSTALLATION";
    }

    // Partner installer job visibility (see INTEGRATION_PLAN.md §4)
    function isVisibleToInstaller(app, installer, includeDeclined) {
        if (!app || !installer || isDirect(app)) return false;
        const declined = (app.declinedInstallerIds || []).includes(installer.id);
        if (declined && !includeDeclined) return false;
        if (app.assignedInstallerId) return app.assignedInstallerId === installer.id;
        // Assigned by name only (legacy record): treat as assigned to that installer
        if (app.installer && app.installer !== "Unassigned") return norm(app.installer) === norm(installer.name);
        return isClearedForInstallation(app) || declined;
    }

    // ------------------------------------------------------------------
    // Customer operations on shared records
    // ------------------------------------------------------------------
    const digits = v => String(v || "").replace(/\D/g, "").slice(-10);

    // Links an existing system (by HS ID) to the signed-in customer after verifying the owner contact on record.
    function claimApplicationByHsId(customerId, hsId, contact) {
        const id = String(hsId || "").trim().toUpperCase();
        if (!/^HS-\d{5}$/.test(id)) return { ok: false, field: "hsId", error: "Enter a valid HS ID (format HS-12345)." };
        if (IS_API) {
            const res = API.requestSync("POST", "/applications/claim", { customerId, hsId: id, contact }, { role: "customer" });
            if (!res.ok) return { ok: false, field: (res.data && res.data.field) || "hsId", error: (res.data && res.data.error) || res.error };
            if (window.HSStore) window.HSStore.cache.merge(res.data);
            return { ok: true, app: (res.data && res.data.app) || null };
        }
        return update(data => {
            const app = (data.applications || []).find(a => norm(a.hsId) === norm(id));
            if (!app) return { ok: false, field: "hsId", error: `No Hello Solar system was found for ${id}.` };
            if (app.customerId === customerId) return { ok: false, field: "hsId", error: `${id} is already linked to your account.` };
            if (app.customerId) return { ok: false, field: "contact", error: "Cannot link another customer’s system. Ownership verification failed." };
            const c = String(contact || "").trim();
            const emailOk = c && norm(c) === norm(app.contactEmail);
            const phoneOk = digits(c).length >= 7 && digits(c) === digits(app.contactPhone);
            if (!emailOk && !phoneOk) {
                return { ok: false, field: "contact", error: `Verification failed. The contact details do not match the registered owner records for ${id}.` };
            }
            const customer = (data.customers || []).find(x => x.id === customerId);
            app.customerId = customerId;
            if (customer) app.customer = customer.name;
            app.updated = "Just now";
            logActivity(data, {
                role: "Customer", actorId: customerId, user: customer ? customer.name : customerId, record: app.id, recordType: "Application",
                action: `Customer ${customerId} linked existing system ${app.id} (${app.hsId}) after owner contact verification`,
                details: { appId: app.id, hsId: app.hsId, customerId }
            });
            return { app };
        });
    }

    // Customer payment receipt → Super Admin verification. Full payment uses the application's receipt fields
    // (the existing Super Admin Verify / Reject flow); installment receipts are recorded as pending submissions.
    function submitReceipt(customerId, appId, payload) {
        return update(data => {
            const app = (data.applications || []).find(a => a.id === appId && a.customerId === customerId);
            if (!app) return { ok: false, error: "This system is not linked to your account." };
            const customer = (data.customers || []).find(x => x.id === customerId);
            const amount = Number(String(payload.amount || "").replace(/[^0-9.]/g, "")) || null;
            // Billing periods this receipt pays (installment): { billId, period, dueDate (ISO), amount }
            const bills = (Array.isArray(payload.bills) ? payload.bills : []).filter(b => b && (b.billId || b.dueDate)).map(b => ({
                billId: b.billId || null,
                period: b.period || "",
                dueDate: b.dueDate || "",
                amount: Number(String(b.amount == null ? "" : b.amount).replace(/[^0-9.]/g, "")) || null
            }));
            if (!isFullPayment(app) && bills.length && (app.receiptSubmissions || []).some(s =>
                s.status === "Pending Verification" && (s.bills || []).some(x => bills.some(b => b.billId && b.billId === x.billId)))) {
                return { ok: false, error: "A receipt for this billing period is already awaiting verification." };
            }
            const submission = {
                id: `RCPT-${app.id.replace(/\D/g, "")}-${Date.now().toString().slice(-6)}`,
                appId: app.id,
                customerId,
                fileName: payload.fileName || "",
                channel: payload.channel || "",
                amount,
                date: payload.date || nowISO().slice(0, 10),
                reference: payload.reference || "",
                bills,
                billIds: bills.length ? bills.map(b => b.billId).filter(Boolean) : (Array.isArray(payload.billIds) ? payload.billIds : []),
                submittedAt: nowISO(),
                status: "Pending Verification"
            };
            app.receiptSubmissions = [submission].concat(app.receiptSubmissions || []).slice(0, 50);
            app.receiptVerificationStatus = "Pending Verification";
            if (isFullPayment(app)) {
                app.uploadedReceipt = submission.fileName;
                app.receiptUploadedAt = submission.date;
                app.receiptBank = submission.channel;
                app.receiptReference = submission.reference;
                app.receiptAmount = amount;
                app.paymentStatus = "Verification Required";
                const sched = data.paymentSchedules && data.paymentSchedules[app.id];
                if (sched && sched.installments && sched.installments[0]) {
                    sched.installments[0].status = "Verification Required";
                    sched.installments[0].reference = submission.reference;
                }
            } else if (submission.billIds.length) {
                app.receiptForBills = submission.billIds;
            }
            app.updated = "Just now";
            logActivity(data, {
                role: "Customer", actorId: customerId, user: customer ? customer.name : customerId, record: app.id, recordType: "Payment",
                action: `Customer uploaded payment receipt for ${app.id} (${app.customer}) · Status: Verification Required.`,
                details: { appId: app.id, receipt: submission.fileName, ref: submission.reference, submissionId: submission.id }
            });
            return { submission };
        }, r => ({ name: "receipt.submit", payload: { appId, customerId, submission: r.submission } }));
    }

    // Installment schedule of an application — the single source for billing periods, due dates, installment
    // status and payment history in every portal. A schedule Super Admin has not generated yet is generated with
    // the Super Admin rules and saved on first read, so its dates never change afterwards.
    function paymentScheduleFor(appId) {
        const data = read();
        if (!data || !getApplication(appId, data)) return null;
        const stored = data.paymentSchedules && data.paymentSchedules[appId];
        if (stored && Array.isArray(stored.installments)) return stored;
        if (IS_API) return null; // api mode: the backend generates and owns payment schedules
        const db = window.HELLO_SOLAR_DB;
        if (!db || typeof db.getPaymentSchedule !== "function") return null;
        let created = null;
        update(d => {
            if (!d.paymentSchedules || typeof d.paymentSchedules !== "object") d.paymentSchedules = {};
            if (!d.paymentSchedules[appId]) {
                const saved = db.data;
                db.data = d;
                try { db.getPaymentSchedule(appId); } finally { db.data = saved; }
            }
            created = d.paymentSchedules[appId] || null;
        });
        return created;
    }

    function nextSupportId(list) {
        const max = (list || []).reduce((m, t) => {
            const n = parseInt(String(t && t.id || "").replace(/^SUP-/i, ""), 10);
            return isNaN(n) ? m : Math.max(m, n);
        }, 0);
        return `SUP-${String(max + 1).padStart(3, "0")}`;
    }

    // Opens a ticket in the shared support queue (Super Admin → Support)
    function createSupportTicket(ticket) {
        return update(data => {
            if (!Array.isArray(data.support)) data.support = [];
            const now = nowISO();
            const id = nextSupportId(data.support);
            const role = ticket.accountType || "Customer";
            const record = {
                id,
                accountType: role,
                accountId: ticket.accountId,
                accountName: ticket.accountName,
                relatedId: ticket.relatedId || "",
                hsId: ticket.hsId || "",
                topic: ticket.category || "Other",
                subject: ticket.subject || "Support Request",
                concern: ticket.subject || ticket.category || "Support Request",
                priority: ticket.priority || "Medium",
                status: "Open",
                created: "Just now",
                createdAt: now,
                assignedTo: null,
                notes: ticket.description || "",
                resolutionNote: null,
                resolvedBy: null,
                resolvedAt: null,
                messages: [{ id: `MSG-${id}-1`, sender: `${ticket.accountName} (${role})`, role, time: "Just now", createdAt: now, text: ticket.description || "" }],
                history: [{ id: `TH-${id}-1`, time: "Just now", createdAt: now, user: "System", action: `Ticket created via ${role} Portal`, type: "create" }]
            };
            data.support.unshift(record);
            logActivity(data, {
                role, actorId: ticket.accountId, user: ticket.accountName, record: id, recordType: "Support Ticket",
                action: `Submitted support request ${id}${record.relatedId ? " for " + record.relatedId : ""}`,
                details: { ticketId: id, relatedId: record.relatedId, priority: record.priority }
            });
            return { ticket: record };
        }, r => ({ name: "support.create", payload: { ticket: r.ticket } }));
    }

    function supportTicketsFor(accountType, accountId, data) {
        const d = data || read();
        return d ? (d.support || []).filter(t => t.accountType === accountType && t.accountId === accountId) : [];
    }

    // Required documents live in their own shared store keyed by APP ID (files kept out of the main store).
    // One record per installment application, read and written by the Customer portal (uploads), the Financer
    // review and Super Admin (verdicts). Record: { appId, paymentType, updatedAt, documents: [
    //   { id, name, optional, status, submitted, note, fileName, fileType, fileSize, fileData, uploadedAt, reviewedAt } ] }
    // status: NOT_SUBMITTED | SUBMITTED | UNDER_REVIEW | ACCEPTED | REUPLOAD_REQUIRED
    const DOCUMENT_STATUSES = ["NOT_SUBMITTED", "SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REUPLOAD_REQUIRED"];
    const DOCUMENT_SUBMITTED_STATES = ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED"];
    // Documents requested for installment financing. optional → "if applicable" (not required while Not Submitted)
    const DOCUMENT_REQUESTS = [
        { id: "gov_id_front", name: "Valid Government ID — Front / Main Page" },
        { id: "gov_id_back", name: "Valid Government ID — Back", optional: true },
        { id: "proof_of_income", name: "Proof of Income" },
        { id: "proof_of_billing", name: "Proof of Billing / Utility Bill" },
        { id: "bank_statement", name: "Bank Statement" },
        { id: "other_requested", name: "Other Requested Document", optional: true }
    ];
    // Earlier document ids carried over to the current list
    const LEGACY_DOCUMENT_IDS = { government_id: "gov_id_front", meralco_bill: "proof_of_billing" };

    function normalizeDocumentStatus(s) {
        const key = String(s || "").trim().toUpperCase().replace(/[\s-]+/g, "_").replace(/^RE_UPLOAD/, "REUPLOAD");
        return DOCUMENT_STATUSES.includes(key) ? key : "NOT_SUBMITTED";
    }

    function readDocumentStore() {
        const store = storage.json(DOCUMENTS_KEY, {});
        return store && typeof store === "object" ? store : {};
    }

    function normalizeDocumentRecord(rec) {
        return Object.assign({}, rec, {
            documents: (rec.documents || []).map(d => {
                const status = normalizeDocumentStatus(d.status || (d.submitted ? "SUBMITTED" : "NOT_SUBMITTED"));
                return Object.assign({}, d, { status, submitted: DOCUMENT_SUBMITTED_STATES.includes(status) });
            })
        });
    }

    // Brings a stored record up to the current request list, keeping uploaded files and review decisions
    function migrateDocumentRecord(rec) {
        const byId = {};
        (rec.documents || []).forEach(d => {
            const id = LEGACY_DOCUMENT_IDS[d.id] || d.id;
            byId[id] = Object.assign({}, d, { id });
        });
        const docs = DOCUMENT_REQUESTS.map(def => {
            const prev = byId[def.id];
            delete byId[def.id];
            return prev ? Object.assign({}, prev, { name: def.name, optional: !!def.optional })
                : { id: def.id, name: def.name, optional: !!def.optional, status: "NOT_SUBMITTED", submitted: false, note: "" };
        });
        // Keep any extra document that already has a file or a review decision
        Object.values(byId).forEach(d => {
            if (d.fileName || normalizeDocumentStatus(d.status) !== "NOT_SUBMITTED") docs.push(d);
        });
        const changed = JSON.stringify(docs.map(d => [d.id, d.name, !!d.optional])) !==
            JSON.stringify((rec.documents || []).map(d => [d.id, d.name, !!d.optional]));
        rec.documents = docs;
        return changed;
    }

    const isApplicationActive = app => String(app.systemStatus || "").toUpperCase() === "ACTIVE" || String(app.applicationStatus || "").toUpperCase() === "ACTIVE";

    // Read-only: the stored record for an APP ID, or null
    function documentsFor(appId) {
        const rec = readDocumentStore()[appId];
        return rec && Array.isArray(rec.documents) ? normalizeDocumentRecord(rec) : null;
    }

    // The APP's document record, created with the standard request list the first time any portal opens it
    // (commissioned systems start with the required documents Accepted). Installment applications only.
    function documentRecordFor(appId) {
        const app = getApplication(appId);
        if (!app || isFullPayment(app)) return documentsFor(appId);
        const store = readDocumentStore();
        let rec = store[appId];
        let changed = false;
        if (!rec || !Array.isArray(rec.documents)) {
            const done = isApplicationActive(app);
            rec = store[appId] = {
                appId,
                paymentType: "installment",
                updatedAt: nowISO(),
                documents: DOCUMENT_REQUESTS.map(d => {
                    const status = done && !d.optional ? "ACCEPTED" : "NOT_SUBMITTED";
                    return { id: d.id, name: d.name, optional: !!d.optional, status, submitted: status === "ACCEPTED", note: "" };
                })
            };
            changed = true;
        } else {
            changed = migrateDocumentRecord(rec);
        }
        if (changed) {
            // api mode: the backend creates/migrates document records — keep the computed view in the page cache only
            try { storage.set(DOCUMENTS_KEY, JSON.stringify(store)); } catch (e) { /* storage full — record still returned */ }
        }
        return normalizeDocumentRecord(rec);
    }

    // Review verdict on one document (Financer / Super Admin). docRef: document id or exact name.
    function setDocumentStatus(appId, docRef, status, note) {
        documentRecordFor(appId);
        const store = readDocumentStore();
        const rec = store[appId];
        const doc = rec && Array.isArray(rec.documents) ? rec.documents.find(d => d.id === docRef || d.name === docRef) : null;
        if (!doc) return null;
        doc.status = normalizeDocumentStatus(status);
        doc.submitted = DOCUMENT_SUBMITTED_STATES.includes(doc.status);
        if (note !== undefined) doc.note = note;
        doc.reviewedAt = nowISO();
        rec.updatedAt = doc.reviewedAt;
        storage.set(DOCUMENTS_KEY, JSON.stringify(store));
        sendCommand({ name: "document.review", payload: { appId, docId: doc.id, status: doc.status, note: doc.note || "" } });
        return Object.assign({}, doc);
    }

    // Customer upload of one required document. Local mode keeps the file (data URL) in the document store;
    // api mode sends the file to the backend (multipart) and keeps only metadata in the page cache.
    function uploadDocument(appId, docId, file, fileData) {
        documentRecordFor(appId);
        const store = readDocumentStore();
        const rec = store[appId];
        const doc = rec && Array.isArray(rec.documents) ? rec.documents.find(d => d.id === docId) : null;
        if (!doc) return { ok: false, error: "Document request not found." };
        const now = nowISO();
        Object.assign(doc, {
            fileName: file && file.name || doc.fileName || "",
            fileType: file && file.type || "",
            fileSize: file && file.size || 0,
            fileData: IS_API ? null : (fileData || null),
            uploadedAt: now,
            status: "SUBMITTED",
            submitted: true,
            note: ""
        });
        rec.updatedAt = now;
        storage.set(DOCUMENTS_KEY, JSON.stringify(store)); // throws on quota in local mode — callers handle
        if (IS_API && API) {
            const form = new window.FormData();
            if (file) form.append("file", file, file.name);
            form.append("appId", appId);
            form.append("docId", docId);
            API.command("document.upload", { appId, docId }, { formData: form });
        }
        return { ok: true, document: Object.assign({}, doc) };
    }

    function writeDocumentStore(store) {
        storage.set(DOCUMENTS_KEY, JSON.stringify(store || {}));
    }

    // ------------------------------------------------------------------
    // Installation progress (one record per APP ID; Installer portal and Direct Engineer)
    // ------------------------------------------------------------------
    function installationProgressStore() {
        const store = storage.json(INSTALLATION_PROGRESS_KEY, {});
        return store && typeof store === "object" ? store : {};
    }
    function installationProgressFor(appId) {
        return installationProgressStore()[appId] || null;
    }
    function saveInstallationProgress(record, cmd) {
        if (!record || !record.appId) return { ok: false, error: "Missing APP ID." };
        const store = installationProgressStore();
        store[record.appId] = record;
        storage.set(INSTALLATION_PROGRESS_KEY, JSON.stringify(store));
        sendCommand(cmd === undefined ? { name: "installation.progress", payload: { appId: record.appId, progress: record } } : cmd);
        return { ok: true, record };
    }

    // Counts on the shared record: required documents, how many have a file received, and how many are accepted
    function documentSummary(rec) {
        const docs = rec && Array.isArray(rec.documents) ? rec.documents : [];
        const required = docs.filter(d => !d.optional);
        return {
            required: required.length,
            submitted: required.filter(d => DOCUMENT_SUBMITTED_STATES.includes(normalizeDocumentStatus(d.status))).length,
            accepted: required.filter(d => normalizeDocumentStatus(d.status) === "ACCEPTED").length,
            reuploadRequired: docs.filter(d => normalizeDocumentStatus(d.status) === "REUPLOAD_REQUIRED").length
        };
    }

    // ------------------------------------------------------------------
    // Notifications (single shared store; recipients by role and, when known, account ID)
    // ------------------------------------------------------------------
    function notify(notification) {
        const record = Object.assign({
            id: `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            sourceEventId: `evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            timestamp: nowISO(),
            readAt: null,
            recipientId: "*"
        }, notification);
        // api mode: the backend creates notifications as a side effect of each command; this only updates the page
        try {
            const list = storage.json(NOTIFICATIONS_KEY, []);
            const next = Array.isArray(list) ? list : [];
            next.unshift(record);
            storage.set(NOTIFICATIONS_KEY, JSON.stringify(next.slice(0, 300)));
            if (typeof window.BroadcastChannel !== "undefined") {
                const channel = new window.BroadcastChannel(NOTIFICATION_CHANNEL);
                channel.postMessage({ type: "NEW_NOTIFICATION", payload: { notification: record } });
                channel.close();
            }
        } catch (e) { /* notifications are best effort */ }
        return record;
    }

    // Notification store access for the portal notification centers
    function readNotifications() {
        const list = storage.json(NOTIFICATIONS_KEY, null);
        return Array.isArray(list) ? list : null;
    }
    // Saves the list; cmd describes the change for the backend (e.g. mark read). Seeding passes no command.
    function writeNotifications(list, cmd) {
        storage.set(NOTIFICATIONS_KEY, JSON.stringify(Array.isArray(list) ? list : []));
        sendCommand(cmd);
    }

    window.HSShared = {
        CONFIG,
        IS_API,
        DATA_KEY,
        DOCUMENTS_KEY,
        NOTIFICATIONS_KEY,
        INSTALLATION_PROGRESS_KEY,
        NOTIFICATION_CHANNEL,
        ROLES,
        read,
        update,
        persist,
        sendCommand,
        logActivity,
        accountsFor,
        findAccount,
        getAccount,
        authenticate,
        registerPendingAccount,
        session,
        getApplication,
        findApplicationByHsId,
        applicationsForCustomer,
        applicationsForFinancer,
        isFullPayment,
        isDirect,
        isClearedForInstallation,
        isVisibleToInstaller,
        claimApplicationByHsId,
        submitReceipt,
        paymentScheduleFor,
        createSupportTicket,
        supportTicketsFor,
        documentsFor,
        documentRecordFor,
        setDocumentStatus,
        uploadDocument,
        writeDocumentStore,
        readDocumentStore,
        installationProgressFor,
        saveInstallationProgress,
        readNotifications,
        writeNotifications,
        documentSummary,
        normalizeDocumentStatus,
        migrateDocumentRecord,
        DOCUMENT_REQUESTS,
        DOCUMENT_SUBMITTED_STATES,
        notify
    };
})(typeof window !== "undefined" ? window : this);
