/**
 * ==========================================================================
 * HELLO SOLAR MERCHANT — DATA MANAGEMENT & SCHEMA ENGINE
 * Single authoritative source loader for assets/data/merchant.json.
 * Dynamic summary calculation, strict schema validation, referential
 * integrity checks, offline resilience, and preview dataset loader.
 * ==========================================================================
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.MerchantData = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const STORAGE_KEY_CUSTOM_DATA = 'hello_solar_merchant_custom_dataset';
    const STORAGE_KEY_PREFS = 'hello_solar_merchant_user_prefs';

    // --------------------------------------------------------------------------
    // 1. IN-MEMORY CACHE
    // --------------------------------------------------------------------------
    let cachedDataset = null;

    // --------------------------------------------------------------------------
    // 2. SCHEMA VALIDATOR & REFERENTIAL INTEGRITY
    // --------------------------------------------------------------------------
    const ALLOWED_STAGES = [
        "Site Survey",
        "Engineering Approval",
        "Permitting",
        "Structural Mounting",
        "Inverter & Grid-Tie Testing",
        "Completed"
    ];

    const ALLOWED_PAYOUT_STATUSES = [
        "Released",
        "Pending Review",
        "On Hold"
    ];

    function validateDataset(data) {
        const errors = [];

        if (!data || typeof data !== 'object') {
            return { valid: false, errors: ['Dataset must be a valid JSON object.'] };
        }

        // 1. Merchant profile validation
        if (!data.merchant || typeof data.merchant !== 'object') {
            errors.push('Missing "merchant" object section.');
        } else {
            if (!data.merchant.companyName) errors.push('merchant.companyName is required.');
            if (!data.merchant.merchantId) errors.push('merchant.merchantId is required.');
        }

        // 2. Projects array validation
        const projectIds = new Set();
        if (!Array.isArray(data.projects)) {
            errors.push('"projects" must be an array.');
        } else {
            data.projects.forEach((p, idx) => {
                const prefix = `projects[${idx}]`;
                if (!p.id || typeof p.id !== 'string') {
                    errors.push(`${prefix}: Missing or invalid "id".`);
                } else {
                    if (projectIds.has(p.id)) {
                        errors.push(`${prefix}: Duplicate project ID "${p.id}".`);
                    }
                    projectIds.add(p.id);
                }
                if (!p.customerName) errors.push(`${prefix}: Missing "customerName".`);
                if (!p.location) errors.push(`${prefix}: Missing "location".`);
                if (!p.systemCapacity) errors.push(`${prefix}: Missing "systemCapacity".`);
                if (typeof p.progress !== 'number' || p.progress < 0 || p.progress > 100) {
                    errors.push(`${prefix} ("${p.id || 'unknown'}"): "progress" must be a number between 0 and 100.`);
                }
                if (typeof p.projectValue !== 'number' || p.projectValue < 0) {
                    errors.push(`${prefix} ("${p.id || 'unknown'}"): "projectValue" must be a non-negative number.`);
                }
            });
        }

        // 3. Payouts array validation & referential integrity check
        if (!Array.isArray(data.payouts)) {
            errors.push('"payouts" must be an array.');
        } else {
            data.payouts.forEach((pay, idx) => {
                const prefix = `payouts[${idx}]`;
                if (!pay.payoutId) errors.push(`${prefix}: Missing "payoutId".`);
                if (!pay.projectId) {
                    errors.push(`${prefix}: Missing "projectId".`);
                } else if (!projectIds.has(pay.projectId)) {
                    errors.push(`${prefix} ("${pay.payoutId || 'unknown'}"): References unknown projectId "${pay.projectId}".`);
                }
                if (typeof pay.netDisbursement !== 'number' || pay.netDisbursement < 0) {
                    errors.push(`${prefix} ("${pay.payoutId || 'unknown'}"): "netDisbursement" must be a non-negative number.`);
                }
                if (!ALLOWED_PAYOUT_STATUSES.includes(pay.status)) {
                    errors.push(`${prefix} ("${pay.payoutId || 'unknown'}"): Invalid status "${pay.status}". Allowed: ${ALLOWED_PAYOUT_STATUSES.join(', ')}.`);
                }
            });
        }

        // 4. Crews validation
        if (!Array.isArray(data.crews)) {
            errors.push('"crews" must be an array.');
        } else {
            data.crews.forEach((c, idx) => {
                if (!c.crewId) errors.push(`crews[${idx}]: Missing "crewId".`);
                if (!c.teamName) errors.push(`crews[${idx}]: Missing "teamName".`);
            });
        }

        // 5. Milestones validation
        if (data.milestones && Array.isArray(data.milestones)) {
            data.milestones.forEach((m, idx) => {
                if (m.projectId && !projectIds.has(m.projectId)) {
                    errors.push(`milestones[${idx}]: References unknown projectId "${m.projectId}".`);
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // --------------------------------------------------------------------------
    // 3. DYNAMIC SUMMARY & KPI CALCULATIONS (Derived from data)
    // --------------------------------------------------------------------------
    function calculateSummary(dataset) {
        if (!dataset) return {};

        const projects = Array.isArray(dataset.projects) ? dataset.projects : [];
        const payouts = Array.isArray(dataset.payouts) ? dataset.payouts : [];
        const crews = Array.isArray(dataset.crews) ? dataset.crews : [];

        const activeProjects = projects.filter(p => p.progress < 100);
        const completedProjects = projects.filter(p => p.progress === 100);

        const totalPortfolioValue = projects.reduce((sum, p) => sum + (Number(p.projectValue) || 0), 0);
        const totalPaidAmount = payouts
            .filter(p => p.status === 'Released')
            .reduce((sum, p) => sum + (Number(p.netDisbursement) || 0), 0);

        const pendingPayoutsAmount = payouts
            .filter(p => p.status === 'Pending Review')
            .reduce((sum, p) => sum + (Number(p.netDisbursement) || 0), 0);

        const onHoldPayoutsAmount = payouts
            .filter(p => p.status === 'On Hold')
            .reduce((sum, p) => sum + (Number(p.netDisbursement) || 0), 0);

        // Find next scheduled release date from pending records
        const scheduledPayout = payouts.find(p => p.status === 'Pending Review' && p.releaseDate && p.releaseDate.includes('Sept'));
        const nextReleaseDate = scheduledPayout ? scheduledPayout.releaseDate.replace('Scheduled for ', '') : 'Sept 15, 2026';

        return {
            activeInstallsCount: activeProjects.length,
            completedProjectsCount: completedProjects.length,
            portfolioValuePhp: totalPortfolioValue,
            totalPaidPhp: totalPaidAmount,
            pendingPayoutsPhp: pendingPayoutsAmount,
            onHoldPayoutsPhp: onHoldPayoutsAmount,
            activeCrewsCount: crews.length,
            nextReleaseDate: nextReleaseDate
        };
    }

    // --------------------------------------------------------------------------
    // 4. USER PROFILE PREFERENCES PERSISTENCE
    // --------------------------------------------------------------------------
    function merchantSession() {
        return (typeof window !== 'undefined' && window.HSShared) ? window.HSShared.session.get('merchant') : null;
    }

    // Preferences are stored per merchant account (never shared between merchants)
    function prefsKey() {
        const session = merchantSession();
        return session ? STORAGE_KEY_PREFS + ':' + session.accountId : STORAGE_KEY_PREFS;
    }

    // Identity always comes from the signed-in shared MER-### account, never from sample data
    function applySessionIdentity(merchant) {
        const session = merchantSession();
        if (!merchant || !session) return merchant;
        const record = window.HSShared.getAccount('merchant', session.accountId) || {};
        merchant.merchantId = session.accountId;
        merchant.companyName = record.name || session.name || merchant.companyName;
        merchant.contactPerson = record.contact || merchant.contactPerson;
        merchant.email = record.email || session.email || merchant.email;
        merchant.phone = record.phone || merchant.phone;
        return merchant;
    }

    function applyUserPreferences(merchant) {
        if (!merchant) return merchant;
        applySessionIdentity(merchant);
        try {
            const raw = localStorage.getItem(prefsKey());
            if (raw) {
                const prefs = JSON.parse(raw);
                if (prefs && typeof prefs === 'object') {
                    if (prefs.companyName) merchant.companyName = prefs.companyName;
                    if (prefs.contactPerson) merchant.contactPerson = prefs.contactPerson;
                    if (prefs.phone) merchant.phone = prefs.phone;
                    if (merchant.payoutPreferences) {
                        if (prefs.preferredBank) merchant.payoutPreferences.preferredBank = prefs.preferredBank;
                        if (prefs.accountName) merchant.payoutPreferences.accountName = prefs.accountName;
                        if (prefs.accountNumberMasked) merchant.payoutPreferences.accountNumberMasked = prefs.accountNumberMasked;
                    }
                }
            }
        } catch (e) {
            console.warn('[MerchantData] Error loading user preferences:', e);
        }
        return merchant;
    }

    function saveUserPreferences(prefs) {
        try {
            localStorage.setItem(prefsKey(), JSON.stringify(prefs));
            const session = merchantSession();
            if (session && prefs) {
                window.HSShared.update(store => {
                    const record = (store.merchants || []).find(m => m.id === session.accountId);
                    if (!record) return { ok: false, error: 'Merchant account not found.' };
                    if (prefs.companyName) record.name = prefs.companyName;
                    if (prefs.contactPerson) record.contact = prefs.contactPerson;
                    if (prefs.phone) record.phone = prefs.phone;
                }, { name: 'profile.update', payload: { role: 'merchant', accountId: session.accountId, fields: { name: prefs.companyName, contact: prefs.contactPerson, phone: prefs.phone } } });
            }
            if (cachedDataset && cachedDataset.merchant) {
                applyUserPreferences(cachedDataset.merchant);
            }
            return true;
        } catch (e) {
            console.error('[MerchantData] Error saving user preferences:', e);
            return false;
        }
    }

    // --------------------------------------------------------------------------
    // 5. MODULAR DATA ENDPOINTS & AUTHORITATIVE DATA LOADER (Backend-Ready)
    // --------------------------------------------------------------------------
    const ENDPOINTS = {
        projects: 'assets/data/projects.json',
        installers: 'assets/data/installers.json',
        payouts: 'assets/data/payouts.json',
        payments: 'assets/data/payouts.json',
        faqs: 'assets/data/faqs.json',
        merchant: 'assets/data/merchant_data.json',
        notifications: 'assets/data/notifications_seed.json',
        composite: 'assets/data/merchant.json'
    };

    async function fetchJsonResource(filename) {
        if (filename === 'payments.json') filename = 'payouts.json';

        const candidateUrls = [
            `assets/data/${filename}`,
            `data/${filename}`,
            `./assets/data/${filename}`,
            `../assets/data/${filename}`
        ];

        for (const url of candidateUrls) {
            try {
                const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;
                const res = await fetch(url, {
                    cache: 'no-cache',
                    signal: controller ? controller.signal : undefined
                });
                if (timeoutId) clearTimeout(timeoutId);
                if (res.ok) {
                    return await res.json();
                }
            } catch (e) {
                // Try next candidate URL
            }
        }
        throw new Error(`Failed to load JSON resource: ${filename}`);
    }

    async function loadAllData(forceReload = false) {
        if (!forceReload && cachedDataset) {
            return cachedDataset;
        }

        // api mode / demo data off: no sample projects, payouts, crews or activity — the merchant profile comes from
        // the signed-in MER-### account (merchant projects/payouts need their APIs, see BACKEND_INTEGRATION.md)
        if (window.HS_CONFIG && (window.HS_CONFIG.isApi || window.HS_CONFIG.demoData === false)) {
            cachedDataset = getBaselineDataset();
            ["companyName", "contactPerson", "email", "phone", "partnerTier", "commissionRate", "verificationStatus"]
                .forEach(k => { if (k in cachedDataset.merchant) cachedDataset.merchant[k] = ""; });
            applyUserPreferences(cachedDataset.merchant);
            return cachedDataset;
        }

        // Check if user uploaded a custom preview dataset
        try {
            const customRaw = localStorage.getItem(STORAGE_KEY_CUSTOM_DATA);
            if (customRaw) {
                const parsed = JSON.parse(customRaw);
                const validation = validateDataset(parsed);
                if (validation.valid) {
                    cachedDataset = parsed;
                    applyUserPreferences(cachedDataset.merchant);
                    return cachedDataset;
                }
            }
        } catch (e) {
            console.warn('[MerchantData] Error reading custom dataset from localStorage:', e);
        }

        // Primary source: Load existing modular JSON files concurrently
        try {
            const [projectsData, installersData, payoutsData, faqsData, merchantInfoData] = await Promise.all([
                fetchJsonResource('projects.json'),
                fetchJsonResource('installers.json'),
                fetchJsonResource('payouts.json'),
                fetchJsonResource('faqs.json'),
                fetchJsonResource('merchant_data.json')
            ]);

            const merchantObj = {
                companyName: merchantInfoData.companyName || "SolarTech Manila",
                merchantId: merchantInfoData.merchantId || "",
                accountType: merchantInfoData.accountType || "Merchant Partner",
                verificationStatus: merchantInfoData.verificationStatus || "Accreditation on File",
                contactPerson: merchantInfoData.contactPerson || "Marco Santos",
                email: merchantInfoData.email || "merchant@hellosolar.ph",
                phone: merchantInfoData.phone || "+63 917 888 2026",
                partnerTier: merchantInfoData.partnerTier || "Gold Certified Partner",
                commissionRate: merchantInfoData.commissionRate || "5.2% Tier A Commission",
                accountManager: merchantInfoData.accountManager || "David Ramos",
                payoutPreferences: merchantInfoData.payoutPreferences || {
                    preferredBank: "BDO Unibank",
                    accountName: "SolarTech Manila Corp.",
                    accountNumberMasked: "**** **** 9012",
                    payoutSchedule: "Bi-Monthly (1st & 15th)"
                }
            };

            const combined = {
                merchant: merchantObj,
                projects: Array.isArray(projectsData) ? projectsData : [],
                payouts: Array.isArray(payoutsData) ? payoutsData : [],
                crews: Array.isArray(installersData) ? installersData : [],
                milestones: Array.isArray(merchantInfoData.upcomingMilestones) ? merchantInfoData.upcomingMilestones : [],
                support: {
                    categories: [
                        { id: "CAT-PAY", name: "Payout and Billing", description: "Commission cycles, tax deductions, and bank preferences." },
                        { id: "CAT-TECH", name: "Technical Requirements", description: "System sizing, SLD, roof engineering, and equipment specs." },
                        { id: "CAT-PERMIT", name: "Permitting", description: "LGU electrical permits, OBO clearances, and CFEI processing." },
                        { id: "CAT-NET", name: "Net-Metering", description: "Distribution impact studies and Meralco meter activation." },
                        { id: "CAT-WARR", name: "Warranty and RMA", description: "Manufacturer warranties and hardware replacement SLAs." },
                        { id: "CAT-CREW", name: "Installer Assignment", description: "Crew routing, site scheduling, and lead engineer allocation." },
                        { id: "CAT-COMM", name: "Merchant Commissions", description: "Partner tier progressions, rate reviews, and earnings tracking." }
                    ],
                    faqs: Array.isArray(faqsData) ? faqsData : []
                },
                activity: Array.isArray(merchantInfoData.operationalActivityLogs) ? merchantInfoData.operationalActivityLogs : []
            };

            const validation = validateDataset(combined);
            if (validation.valid) {
                cachedDataset = combined;
                applyUserPreferences(cachedDataset.merchant);
                try {
                    localStorage.setItem('hello_solar_merchant_cached_default', JSON.stringify(combined));
                } catch (e) {}
                return cachedDataset;
            } else {
                console.warn('[MerchantData] Combined modular dataset validation warnings:', validation.errors);
            }
        } catch (err) {
            console.warn('[MerchantData] Modular fetch failed, attempting composite merchant.json fallback:', err);
            try {
                const fallbackRes = await fetchJsonResource('merchant.json');
                const validation = validateDataset(fallbackRes);
                if (validation.valid) {
                    cachedDataset = fallbackRes;
                    applyUserPreferences(cachedDataset.merchant);
                    return cachedDataset;
                }
            } catch (e2) {
                console.warn('[MerchantData] Composite fetch failed. Using offline cache.');
            }
        }

        // Fallback: Check cached default in localStorage
        try {
            const storedDefault = localStorage.getItem('hello_solar_merchant_cached_default');
            if (storedDefault) {
                const parsed = JSON.parse(storedDefault);
                if (validateDataset(parsed).valid) {
                    cachedDataset = parsed;
                    applyUserPreferences(cachedDataset.merchant);
                    return cachedDataset;
                }
            }
        } catch (e) {}

        // Fallback default structure if all else fails
        cachedDataset = getBaselineDataset();
        applyUserPreferences(cachedDataset.merchant);
        return cachedDataset;
    }

    function getBaselineDataset() {
        return {
            merchant: {
                companyName: "SolarTech Manila",
                merchantId: "",
                accountType: "Merchant Partner",
                verificationStatus: "Accreditation on File",
                contactPerson: "Marco Santos",
                email: "merchant@hellosolar.ph",
                phone: "+63 917 888 2026",
                partnerTier: "Gold Certified Partner",
                commissionRate: "5.2% Tier A Commission",
                accountManager: "David Ramos",
                payoutPreferences: {
                    preferredBank: "BDO Unibank",
                    accountName: "SolarTech Manila Corp.",
                    accountNumberMasked: "**** **** 9012",
                    payoutSchedule: "Bi-Monthly (1st & 15th)"
                }
            },
            projects: [],
            payouts: [],
            crews: [],
            milestones: [],
            support: { categories: [], faqs: [] },
            activity: []
        };
    }

    // --------------------------------------------------------------------------
    // 6. CUSTOM DATASET APPLIER & RESET
    // --------------------------------------------------------------------------
    function applyCustomDataset(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            const validation = validateDataset(data);
            if (!validation.valid) {
                return { success: false, errors: validation.errors };
            }

            localStorage.setItem(STORAGE_KEY_CUSTOM_DATA, JSON.stringify(data));
            cachedDataset = data;
            applyUserPreferences(cachedDataset.merchant);
            return { success: true };
        } catch (err) {
            return { success: false, errors: [`JSON Parse Error: ${err.message}`] };
        }
    }

    function resetDefaultDataset() {
        try {
            localStorage.removeItem(STORAGE_KEY_CUSTOM_DATA);
            cachedDataset = null;
            return true;
        } catch (e) {
            return false;
        }
    }

    // --------------------------------------------------------------------------
    // 7. SPECIFIC GETTERS
    // --------------------------------------------------------------------------
    async function loadMerchantData(forceReload = false) {
        const dataset = await loadAllData(forceReload);
        return dataset.merchant;
    }

    async function loadProjects(forceReload = false) {
        const dataset = await loadAllData(forceReload);
        return Array.isArray(dataset.projects) ? dataset.projects : [];
    }

    async function loadPayouts(forceReload = false) {
        const dataset = await loadAllData(forceReload);
        return Array.isArray(dataset.payouts) ? dataset.payouts : [];
    }

    async function loadInstallers(forceReload = false) {
        const dataset = await loadAllData(forceReload);
        return Array.isArray(dataset.crews) ? dataset.crews : [];
    }

    async function loadMilestones(forceReload = false) {
        const dataset = await loadAllData(forceReload);
        return Array.isArray(dataset.milestones) ? dataset.milestones : [];
    }

    async function loadFAQs(forceReload = false) {
        const dataset = await loadAllData(forceReload);
        if (dataset.support && Array.isArray(dataset.support.faqs)) {
            return dataset.support.faqs;
        }
        return [];
    }

    async function loadSupportCategories(forceReload = false) {
        const dataset = await loadAllData(forceReload);
        if (dataset.support && Array.isArray(dataset.support.categories)) {
            return dataset.support.categories;
        }
        return [];
    }

    async function loadActivityLogs(forceReload = false) {
        const dataset = await loadAllData(forceReload);
        return Array.isArray(dataset.activity) ? dataset.activity : [];
    }

    async function getProjectById(projectId) {
        const list = await loadProjects();
        return list.find(p => p.id === projectId) || null;
    }

    async function getPayoutById(payoutId) {
        const list = await loadPayouts();
        return list.find(p => p.payoutId === payoutId) || null;
    }

    async function getInstallerById(crewId) {
        const list = await loadInstallers();
        return list.find(c => c.crewId === crewId) || null;
    }

    // --------------------------------------------------------------------------
    // 8. FORMATTERS & UTILITIES
    // --------------------------------------------------------------------------
    function formatCurrency(amount) {
        const num = Number(amount) || 0;
        try {
            return new Intl.NumberFormat('en-PH', {
                style: 'currency',
                currency: 'PHP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(num);
        } catch (e) {
            return '₱' + Math.round(num).toLocaleString('en-US');
        }
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        return String(dateStr);
    }

    function escapeCSV(value) {
        const str = String(value ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }

    function downloadCSV(records, filename = 'merchant-records.csv') {
        if (!records || !records.length) {
            alert('No records available to download.');
            return;
        }

        const headers = Object.keys(records[0]);
        const csvRows = [];

        // Header row
        csvRows.push(headers.map(h => escapeCSV(h.replace(/([A-Z])/g, ' $1').trim())).join(','));

        // Value rows
        records.forEach(row => {
            csvRows.push(headers.map(header => escapeCSV(row[header])).join(','));
        });

        const csvContent = '\uFEFF' + csvRows.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // --------------------------------------------------------------------------
    // 9. PUBLIC API EXPORT (Modular & Backend-Ready)
    // --------------------------------------------------------------------------
    return {
        ENDPOINTS,
        fetchJsonResource,
        fetchProjects: () => fetchJsonResource('projects.json'),
        fetchInstallers: () => fetchJsonResource('installers.json'),
        fetchPayouts: () => fetchJsonResource('payouts.json'),
        fetchPayments: () => fetchJsonResource('payouts.json'),
        fetchFaqs: () => fetchJsonResource('faqs.json'),
        fetchMerchantData: () => fetchJsonResource('merchant_data.json'),
        loadAllData,
        loadMerchantData,
        loadProjects,
        loadPayouts,
        loadInstallers,
        loadMilestones,
        loadFAQs,
        loadSupportCategories,
        loadActivityLogs,
        getProjectById,
        getPayoutById,
        getInstallerById,
        formatCurrency,
        formatDate,
        downloadCSV,
        escapeCSV,
        saveUserPreferences,
        applyUserPreferences,
        validateDataset,
        calculateSummary,
        applyCustomDataset,
        resetDefaultDataset
    };
}));
