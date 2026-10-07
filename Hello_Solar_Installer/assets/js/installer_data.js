/**
 * ==========================================================================
 * HELLO SOLAR INSTALLER PORTAL — DATA ENGINE & REACTIVE STATE MANAGER
 * Single centralized source of truth for Installer job data.
 * Reactive subscribers, state mutations (acceptJob, declineJob, startInstallation,
 * updateProgress, completeInstallation, activateSystem), standardized status badge
 * rendering, and schema validation.
 * ==========================================================================
 */

const InstallerData = (() => {
    'use strict';

    const STORAGE_KEY_JOBS_STATE = 'hello_solar_installer_jobs_state_v2';
    const STORAGE_KEY_OVERRIDE = 'hello_solar_installer_json_override';
    const STORAGE_KEY_CACHE = 'hello_solar_installer_json_cache';

    let cachedData = null;
    const subscribers = new Set();

    const PROJECT_STORE = 'HELLO_SOLAR_SUPER_ADMIN_DATA_V2';

    /**
     * Resolves the current installer context and shared Super Admin store
     */
    // Shared records go through the shared layer (localStorage in local mode, backend cache + commands in api mode)
    function readShared() {
        if (typeof window !== 'undefined' && window.HSShared && typeof window.HSShared.read === 'function') return window.HSShared.read();
        return JSON.parse(localStorage.getItem(PROJECT_STORE) || 'null');
    }
    function persistShared(data, cmd) {
        try {
            if (typeof window !== 'undefined' && window.HSShared && typeof window.HSShared.persist === 'function') window.HSShared.persist(data, cmd);
            else localStorage.setItem(PROJECT_STORE, JSON.stringify(data));
        } catch (e) { /* storage unavailable */ }
    }
    const DEMO_DATA = !(typeof window !== 'undefined' && window.HS_CONFIG && (window.HS_CONFIG.isApi || window.HS_CONFIG.demoData === false));

    function projectContext() {
        try {
            const data = readShared();
            const user = JSON.parse(localStorage.getItem('hello_solar_installer_user') || 'null');
            if (!data || !Array.isArray(data.applications) || !user) return null;
            // Identity = the signed-in partner installer's shared INS-### account. No default installer.
            const email = String(user.email || '').toLowerCase();
            const account = (data.installers || []).find(i => i.type !== 'Internal' &&
                ((user.accountId && i.id === user.accountId) || (!user.accountId && email && String(i.email || '').toLowerCase() === email)));
            if (!account) return null;
            return {
                data,
                user,
                account,
                installerId: account.id,
                installerName: account.name || user.businessName || user.fullName || account.id,
                installerStatus: account.status || 'Active'
            };
        } catch {
            return null;
        }
    }

    // Keeps the matching Super Admin Installation job (data.installations, linked by APP ID) in step with the
    // shared application, so Super Admin → Installations shows the partner installer's real status.
    function syncInstallationJob(data, appId, fields) {
        if (!data || !Array.isArray(data.installations)) return null;
        const install = data.installations.find(j => j.appId === appId);
        if (!install) return null;
        Object.assign(install, fields);
        if (Array.isArray(data.installers)) {
            data.installers.forEach(inst => {
                if (inst.id !== install.installerId) return;
                inst.activeJobs = data.installations.filter(j =>
                    (j.installerId === inst.id || j.installer === inst.name) && !['Completed', 'Cancelled'].includes(j.status)).length;
            });
        }
        return install;
    }

    function shortDate(d) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    }

    // Installation milestones are pushed to the application's customer only (shared notification store)
    function notifyCustomer(app, title, message) {
        if (!app || !app.customerId || typeof window === 'undefined' || !window.HSShared) return;
        window.HSShared.notify({
            recipientRole: 'customer',
            recipientId: app.customerId,
            eventType: 'installation_update',
            recordId: app.id,
            title,
            message,
            targetUrl: 'install-status.html',
            actionLabel: 'View Installation'
        });
    }

    /**
     * Identifies if a record is a maintenance job (kept strictly separate from new installations)
     */
    function isMaintenanceJob(j) {
        if (!j) return false;
        const status = String(j.status || '').toLowerCase();
        const type = String(j.type || j.jobType || j.serviceType || '').toLowerCase();
        return j.isMaintenance === true ||
            status === 'maintenance' ||
            type.includes('maintenance') ||
            type.includes('repair') ||
            type.includes('service');
    }

    /**
     * Maintenance progress stages (separate from installation stages)
     */
    const MAINTENANCE_STAGES = ['Scheduled', 'Diagnostic', 'Repair In Progress', 'Testing', 'Completed'];

    function getMaintenanceStage(pct) {
        const p = parseInt(pct, 10) || 0;
        if (p >= 100) return 'Completed';
        if (p >= 80) return 'Testing';
        if (p >= 40) return 'Repair In Progress';
        if (p > 0) return 'Diagnostic';
        return 'Scheduled';
    }

    function isMaintenanceCompleted(j) {
        return isMaintenanceJob(j) &&
            (String(j.maintenanceStatus || '').toUpperCase() === 'COMPLETED' || (parseInt(j.progress, 10) || 0) >= 100);
    }

    // Active (open) maintenance work — completed maintenance stays a MAINTENANCE job for history only
    function isActiveMaintenanceJob(j) {
        return isMaintenanceJob(j) && !isMaintenanceCompleted(j);
    }

    /**
     * Identifies if an application qualifies as a New Job:
     * User requirement: Only applications with applicationStatus = READY_FOR_INSTALLATION should appear as New Job.
     */
    function isNewJob(j) {
        if (!j || isMaintenanceJob(j)) return false;
        if (j.isDeclined || String(j.status || '').toLowerCase() === 'declined') return false;

        const instStatus = String(j.installationStatus || '').toUpperCase();
        if (instStatus === 'AWAITING_INSTALLATION' ||
            instStatus === 'INSTALLATION_IN_PROGRESS' ||
            instStatus === 'COMPLETED') {
            return false;
        }

        const appStatus = String(j.applicationStatus || '').toUpperCase();
        const rawStatus = String(j.status || '').toLowerCase();

        return appStatus === 'READY_FOR_INSTALLATION' || rawStatus === 'new job';
    }

    /**
     * Identifies if a job is actively In Progress (installation flow: Awaiting Installation or In Progress)
     */
    function isInProgressJob(j) {
        if (!j || isMaintenanceJob(j) || isNewJob(j)) return false;

        const instStatus = String(j.installationStatus || '').toUpperCase();
        if (instStatus === 'AWAITING_INSTALLATION' || instStatus === 'INSTALLATION_IN_PROGRESS') {
            return true;
        }

        const rawStatus = String(j.status || '').toLowerCase();
        if (rawStatus === 'in progress' && instStatus !== 'COMPLETED' && String(j.systemStatus || '').toUpperCase() !== 'ACTIVE') {
            return true;
        }

        return false;
    }

    /**
     * Identifies if a job is Completed or Active
     */
    function isCompletedJob(j) {
        if (!j || isMaintenanceJob(j)) return false;

        const instStatus = String(j.installationStatus || '').toUpperCase();
        const sysStatus = String(j.systemStatus || '').toUpperCase();
        const appStatus = String(j.applicationStatus || '').toUpperCase();
        const rawStatus = String(j.status || '').toLowerCase();

        return instStatus === 'COMPLETED' ||
            sysStatus === 'ACTIVE' ||
            appStatus === 'ACTIVE' ||
            rawStatus === 'completed' ||
            rawStatus === 'active';
    }

    /**
     * Loads cross-portal applications from Super Admin / Financer shared storage
     */
    function sharedJobs(includeDeclined = false) {
        const context = projectContext();
        if (!context || !context.data) return [];
        const { data, installerId } = context;
        // Account-status guard: Inactive / Suspended installer accounts receive no shared projects
        if (context.installerStatus && context.installerStatus !== 'Active') return [];

        // Visibility rules are shared with every portal (shared/hello-solar-shared.js): own jobs, plus cleared and
        // unassigned partner jobs not declined by this installer. Never Hello Solar Direct or other installers' jobs.
        const shared = typeof window !== 'undefined' ? window.HSShared : null;
        if (!shared || typeof shared.isVisibleToInstaller !== 'function') return [];
        return data.applications
            .filter(a => shared.isVisibleToInstaller(a, context.account, includeDeclined))
            .map(a => {
                const isDeclined = (a.declinedInstallerIds || []).includes(installerId);
                const isComp = a.systemStatus === 'Active' || a.systemStatus === 'ACTIVE' || a.applicationStatus === 'ACTIVE';
                const isAssigned = Boolean(a.assignedInstallerId && a.assignedInstallerId === installerId);
                // Super Admin assignment waits for this installer to Accept or Decline
                const awaitingAcceptance = isAssigned && a.installerAcceptance === 'Pending';

                let status = 'New Job';
                let installationStatus = 'PENDING_ACCEPTANCE';

                if (isDeclined) {
                    status = 'Declined';
                    installationStatus = 'DECLINED';
                } else if (isComp) {
                    status = 'Completed';
                    installationStatus = 'COMPLETED';
                } else if (isAssigned && !awaitingAcceptance) {
                    status = 'In Progress';
                    installationStatus = a.installationStatus || 'AWAITING_INSTALLATION';
                }

                return {
                    ...a,
                    sharedProject: true,
                    id: a.id,
                    applicantId: a.id,
                    applicationId: a.id,
                    customer: a.customer || a.applicant?.name || '—',
                    site: a.location || '—',
                    location: a.location || '—',
                    region: a.location || '—',
                    system: a.system?.title || a.system || '—',
                    capacityKwp: parseFloat(a.system?.systemSize || a.system) || 0,
                    status,
                    applicationStatus: a.applicationStatus || (isComp ? 'ACTIVE' : 'READY_FOR_INSTALLATION'),
                    installationStatus,
                    systemStatus: a.systemStatus || (isComp ? 'ACTIVE' : 'PENDING_INSTALLATION'),
                    progress: isComp ? 100 : (installationStatus === 'INSTALLATION_IN_PROGRESS' ? (a.progress || 50) : (installationStatus === 'COMPLETED' ? (a.progress || 100) : 0)),
                    stage: awaitingAcceptance ? 'Pending Confirmation' : (a.stage || (isComp ? 'Commissioned' : (isAssigned ? 'Awaiting Installation' : 'Pending Confirmation'))),
                    step: (isAssigned && !awaitingAcceptance) ? 'Proceed to site and begin installation' : 'Accept or decline application',
                    date: a.date || a.scheduledDate || 'Not scheduled',
                    isDeclined
                };
            });
    }

    /**
     * Canonicalizes job status to ensure system-wide consistency:
     * - Maintenance (Red)
     * - In Progress (Orange)
     * - Completed (Green)
     * - New Job (Subtle Blue)
     * - Active (Green)
     */
    function canonicalizeStatus(status) {
        const s = String(status || '').trim().toLowerCase();
        if (s === 'maintenance' || s === 'needs attention' || s === 'action needed' || s === 'delayed' || s === 'issue' || s === 'repair') {
            return 'Maintenance';
        }
        if (s === 'on hold' || s === 'on_hold') {
            return 'On Hold';
        }
        if (s === 'approved') {
            return 'Approved';
        }
        if (s === 'scheduled') {
            return 'Scheduled';
        }
        if (s === 'pending review' || s === 'pending_review' || s === 'pending audit') {
            return 'Pending Review';
        }
        if (s === 'paid') {
            return 'Paid';
        }
        if (s === 'in progress' || s === 'in_progress' || s === 'awaiting installation' || s === 'awaiting_installation' || s === 'installation_in_progress') {
            return 'In Progress';
        }
        if (s === 'active' || s === 'system active' || s === 'commissioned') {
            return 'Active';
        }
        if (s === 'completed' || s === 'done' || s === 'installation complete') {
            return 'Completed';
        }
        if (s === 'new job' || s === 'new' || s === 'pending' || s === 'ready_for_installation' || s === 'ready for installation' || s === 'pending confirmation') {
            return 'New Job';
        }
        if (s === 'declined') {
            return 'Declined';
        }
        return 'In Progress';
    }

    /**
     * Validates an installer dataset object according to schema rules.
     */
    function validateDataset(data) {
        const errors = [];
        if (!data || typeof data !== 'object') {
            return { valid: false, errors: ['Dataset must be a valid JSON object.'] };
        }

        if (!Array.isArray(data.jobs) || data.jobs.length === 0) {
            errors.push('Dataset must contain a non-empty "jobs" array.');
        } else {
            const jobIds = new Set();
            data.jobs.forEach((job, index) => {
                const prefix = `Job #${index + 1} (${job.id || 'unidentified'})`;
                const id = job.id || job.applicantId || job.applicationId;
                if (!id || typeof id !== 'string') {
                    errors.push(`${prefix}: Missing or invalid "id" or "applicationId".`);
                } else if (jobIds.has(id)) {
                    errors.push(`${prefix}: Duplicate job ID "${id}".`);
                } else {
                    jobIds.add(id);
                }

                if (!job.system || typeof job.system !== 'string') {
                    errors.push(`${prefix}: Missing solar system description.`);
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Normalizes job and payout properties according to the authoritative core flow schema
     */
    function normalizeData(raw) {
        const data = JSON.parse(JSON.stringify(raw));

        if (Array.isArray(data.jobs)) {
            data.jobs = data.jobs.map(job => {
                const id = job.id || job.applicantId || job.applicationId || 'APP-1000';
                const applicantId = id;
                const applicationId = id;
                const customer = job.customer || job.name || 'Client';
                const site = job.site || job.location || 'Metro Manila';
                const location = job.location || (site.includes(',') ? site.split(',').pop().trim() : site);
                const region = job.region || location;
                const capacityKwp = job.capacityKwp || parseFloat(job.system) || 5.0;

                const isMaintenance = isMaintenanceJob(job);
                let applicationStatus = job.applicationStatus;
                let installationStatus = job.installationStatus;
                let systemStatus = job.systemStatus;
                let installer = job.installer;
                let status = job.status;

                if (isMaintenance) {
                    job.jobType = job.jobType || 'MAINTENANCE';
                    status = isMaintenanceCompleted(job) ? 'Completed' : 'Maintenance';
                    applicationStatus = applicationStatus || 'ACTIVE';
                    installationStatus = installationStatus || 'COMPLETED';
                    systemStatus = systemStatus || 'ACTIVE';
                    installer = installer || 'SolarTech Manila Installers';
                } else {
                    const rawStatus = String(job.status || '').trim().toLowerCase();
                    if (rawStatus === 'new job' || rawStatus === 'new') {
                        status = 'New Job';
                        applicationStatus = 'READY_FOR_INSTALLATION';
                        installationStatus = installationStatus || 'PENDING_ACCEPTANCE';
                        systemStatus = systemStatus || 'PENDING_INSTALLATION';
                        installer = installer || 'Unassigned';
                    } else if (rawStatus === 'completed' || rawStatus === 'active') {
                        status = rawStatus === 'active' ? 'Active' : 'Completed';
                        applicationStatus = applicationStatus || 'ACTIVE';
                        installationStatus = 'COMPLETED';
                        systemStatus = systemStatus || (rawStatus === 'active' ? 'ACTIVE' : 'PENDING_ACTIVATION');
                    } else {
                        status = 'In Progress';
                        applicationStatus = applicationStatus || 'READY_FOR_INSTALLATION';
                        installationStatus = installationStatus || (job.progress > 20 ? 'INSTALLATION_IN_PROGRESS' : 'AWAITING_INSTALLATION');
                        systemStatus = systemStatus || 'PENDING_ACTIVATION';
                        installer = installer || 'SolarTech Manila Installers';
                    }
                }

                // Awaiting Installation always shows 0% until Start Installation
                const progress = (!isMaintenance && installationStatus === 'AWAITING_INSTALLATION')
                    ? 0
                    : (typeof job.progress === 'number'
                        ? job.progress
                        : (status === 'Completed' || status === 'Active' ? 100 : (status === 'New Job' ? 0 : 50)));

                const step = job.step || (
                    status === 'New Job' ? 'Awaiting installer confirmation & site acceptance' :
                    installationStatus === 'AWAITING_INSTALLATION' ? 'Proceed to site and begin rooftop installation' :
                    installationStatus === 'INSTALLATION_IN_PROGRESS' ? 'Complete rooftop mounting and electrical wiring' :
                    systemStatus === 'ACTIVE' ? 'System commissioned and generating solar power' :
                    'Ready for system activation'
                );

                return {
                    ...job,
                    id,
                    applicantId,
                    applicationId,
                    customer,
                    site,
                    location,
                    region,
                    status,
                    applicationStatus,
                    installationStatus,
                    systemStatus,
                    installer,
                    isMaintenance,
                    step,
                    capacityKwp,
                    progress
                };
            });
        }

        if (Array.isArray(data.payouts)) {
            data.payouts = data.payouts.map(p => {
                const jobId = p.job || p.jobId || p.applicationId;
                const netAmount = typeof p.amount === 'number' ? p.amount : (p.netAmount || 0);
                const grossAmount = typeof p.grossAmount === 'number' ? p.grossAmount : Math.round(netAmount / 0.98);
                const cwtPercent = p.cwtPercent || 2;
                const cwtDeduction = p.cwtDeduction || (grossAmount - netAmount);
                const status = canonicalizeStatus(p.status);

                return {
                    ...p,
                    jobId,
                    job: jobId,
                    applicationId: jobId,
                    status: p.status ? canonicalizeStatus(p.status) : status,
                    amount: netAmount,
                    netAmount,
                    grossAmount,
                    cwtPercent,
                    cwtDeduction
                };
            });
        }

        return data;
    }

    /**
     * Synchronizes and persists active jobs state
     */
    function persistJobsState(jobs) {
        try {
            localStorage.setItem(STORAGE_KEY_JOBS_STATE, JSON.stringify(jobs));
        } catch (e) {
            console.warn('Could not save jobs state to localStorage:', e);
        }
    }

    /**
     * Runtime fields owned by installer actions. When merging, these come from saved
     * state; all other fields come from the source data so source updates still appear.
     */
    const RUNTIME_JOB_FIELDS = [
        'status', 'installationStatus', 'systemStatus', 'applicationStatus',
        'progress', 'stage', 'step', 'isDeclined', 'installer', 'assignedInstallerId',
        'siteNotes', 'activatedAt', 'jobType', 'maintenanceStatus', 'maintenanceCompletedAt'
    ];

    /**
     * Merges saved runtime job state into freshly loaded source jobs by APP ID:
     * - jobs in the source keep their source data + saved runtime fields
     * - new source jobs (not yet saved) appear as-is
     * - saved jobs no longer present in the source are dropped
     */
    function mergeSavedJobs(sourceJobs, savedJobs) {
        if (!Array.isArray(sourceJobs)) return Array.isArray(savedJobs) ? savedJobs : [];
        if (!Array.isArray(savedJobs) || savedJobs.length === 0) return sourceJobs;
        const keyOf = j => String(j.applicationId || j.applicantId || j.id || '').toLowerCase();
        const savedById = new Map(savedJobs.map(j => [keyOf(j), j]));
        return sourceJobs.map(src => {
            const saved = savedById.get(keyOf(src));
            if (!saved) return src;
            const merged = { ...src };
            RUNTIME_JOB_FIELDS.forEach(field => {
                if (saved[field] !== undefined) merged[field] = saved[field];
            });
            if (!isMaintenanceJob(merged) && String(merged.installationStatus || '').toUpperCase() === 'AWAITING_INSTALLATION') {
                merged.progress = 0;
            }
            return merged;
        });
    }

    /**
     * Loads persisted jobs state if available
     */
    function loadPersistedJobsState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_JOBS_STATE);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('Could not read jobs state from localStorage:', e);
        }
        return null;
    }

    /**
     * Notify all reactive subscribers
     */
    function notifySubscribers(event) {
        subscribers.forEach(fn => {
            try {
                fn(event);
            } catch (err) {
                console.error('Subscriber error:', err);
            }
        });
    }

    /**
     * Subscribe to data mutations
     */
    function subscribe(fn) {
        if (typeof fn === 'function') {
            subscribers.add(fn);
            return () => subscribers.delete(fn);
        }
        return () => {};
    }

    /**
     * Loads the installer dataset
     */
    async function loadData() {
        if (cachedData) return cachedData;

        // api mode / demo data off: no sample profile, jobs or payouts — jobs come only from shared records and the
        // profile from the signed-in INS-### account (payout history needs the payouts API, see BACKEND_INTEGRATION.md)
        if (!DEMO_DATA) {
            const ctx = projectContext();
            const acc = ctx ? ctx.account : {};
            cachedData = normalizeData({
                profile: {
                    businessName: acc.name || '', fullName: acc.contact || '', email: acc.email || '', phone: acc.phone || '',
                    coverageArea: acc.location || acc.coverageArea || '', verificationStatus: acc.status || ''
                },
                jobs: [],
                payouts: []
            });
            return cachedData;
        }

        // 1. Check for manual override in localStorage
        try {
            const overrideRaw = localStorage.getItem(STORAGE_KEY_OVERRIDE);
            if (overrideRaw) {
                const parsed = JSON.parse(overrideRaw);
                const validation = validateDataset(parsed);
                if (validation.valid) {
                    cachedData = normalizeData(parsed);
                    const savedJobs = loadPersistedJobsState();
                    if (savedJobs) cachedData.jobs = mergeSavedJobs(cachedData.jobs, savedJobs);
                    return cachedData;
                }
            }
        } catch (e) {}

        // 2. Fetch assets/data/installer.json
        if (typeof location !== 'undefined' && location.protocol !== 'file:') {
            try {
                const res = await fetch('assets/data/installer.json', { cache: 'no-cache' });
                if (res.ok) {
                    const fetched = await res.json();
                    const validation = validateDataset(fetched);
                    if (validation.valid) {
                        cachedData = normalizeData(fetched);
                        const savedJobs = loadPersistedJobsState();
                        if (savedJobs) {
                            cachedData.jobs = mergeSavedJobs(cachedData.jobs, savedJobs);
                        } else {
                            persistJobsState(cachedData.jobs);
                        }
                        try {
                            localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(fetched));
                        } catch (err) {}
                        return cachedData;
                    }
                }
            } catch (err) {
                console.warn('Fetch installer.json failed, falling back:', err);
            }
        }

        // 3. Fallback to cache in localStorage
        try {
            const cachedRaw = localStorage.getItem(STORAGE_KEY_CACHE);
            if (cachedRaw) {
                const parsed = JSON.parse(cachedRaw);
                cachedData = normalizeData(parsed);
                const savedJobs = loadPersistedJobsState();
                if (savedJobs) cachedData.jobs = mergeSavedJobs(cachedData.jobs, savedJobs);
                return cachedData;
            }
        } catch (e) {}

        // 4. Default in-memory bootstrap fallback
        const fallbackBootstrap = {
            profile: {
                businessName: "SolarTech Manila Installers",
                fullName: "Engr. Alex Rivera",
                email: "installer@hellosolar.ph",
                phone: "+63 917 555 0199",
                licenseNo: "PCAB Solar Contractor Lic. #2024-8841",
                prcNo: "PRC Reg. Electrical Engineer #0078421",
                coverageArea: "Metro Manila, Cavite, Laguna, Rizal, Batangas, Cebu",
                specialization: "Rooftop Grid-Tie Systems, Hybrid Storage, Net-Metering Commissioning",
                tier: "Hello Solar Tier 1 Certified",
                partnerRating: 4.95,
                completedJobs: 48,
                totalCapacityKwp: 288,
                safetyRecord: "100% Zero-Incident",
                payoutMethod: "BDO Unibank · Acct ending in 8841 (On File)",
                verificationStatus: "Accreditation on file · Pending seasonal re-audit"
            },
            jobs: [
                {
                    id: "APP-1024",
                    applicantId: "APP-1024",
                    applicationId: "APP-1024",
                    customer: "Caballero Residence",
                    system: "5.4 kW Hybrid",
                    capacityKwp: 5.4,
                    type: "Hybrid PV + Battery Storage",
                    location: "Cebu City",
                    site: "Banilad, Cebu City",
                    region: "Cebu",
                    status: "New Job",
                    applicationStatus: "READY_FOR_INSTALLATION",
                    installationStatus: "PENDING_ACCEPTANCE",
                    systemStatus: "PENDING_INSTALLATION",
                    installer: "Unassigned",
                    date: "Today · 10:00 AM",
                    step: "Awaiting installer confirmation & site acceptance",
                    progress: 0,
                    stage: "Pending Installer Confirmation",
                    coordinator: "Engr. Mark Villanueva (+63 917 800 1234)",
                    technicalSpecs: {
                        panels: "10x Trina Solar 540W Vertex S+ Dual-Glass",
                        inverter: "1x Deye 5kW Hybrid Single-Phase (SUN-5K-SG04LP1)",
                        battery: "1x 5.12 kWh Dyness Wall-Mounted LiFePO4",
                        mounting: "Kliplok Standing Seam Aluminum Clamps",
                        sldPermit: "PEE-Stamped SLD Approved by Cebu City Engineering Office",
                        siteAccess: "Subdivision security pass required at main guardhouse."
                    },
                    checklist: [
                        "Confirm job assignment and safety dispatch",
                        "Homeowner appointment verification",
                        "Main electrical breaker rating check",
                        "Rooftop rafter inspection",
                        "Safety fall arrest gear preparation"
                    ],
                    siteNotes: "Customer requested inverter installation in garage area beside main electrical panel."
                },
                {
                    id: "APP-1027",
                    applicantId: "APP-1027",
                    applicationId: "APP-1027",
                    customer: "Tan Commercial Warehouse",
                    system: "8.2 kW Grid-Tied",
                    capacityKwp: 8.2,
                    type: "Grid-Tied Commercial Rooftop",
                    location: "Mandaue City",
                    site: "Subangdaku, Mandaue City",
                    region: "Cebu",
                    status: "New Job",
                    applicationStatus: "READY_FOR_INSTALLATION",
                    installationStatus: "PENDING_ACCEPTANCE",
                    systemStatus: "PENDING_INSTALLATION",
                    installer: "Unassigned",
                    date: "Tomorrow · 8:30 AM",
                    step: "Confirm job assignment and review staging plan",
                    progress: 0,
                    stage: "Pending Installer Confirmation",
                    coordinator: "Ms. Clarisse Santos (+63 917 800 5678)",
                    technicalSpecs: {
                        panels: "15x Longi 550W Hi-MO 6 Explorer Mono",
                        inverter: "1x Huawei SUN2000-8KTL-M1 Three-Phase",
                        battery: "None (Grid-Tied Net-Metering)",
                        mounting: "Trapezoidal Sheet Metal Rail Mount with EPDM Gaskets",
                        sldPermit: "Mandaue City Electrical Permit Stamped",
                        siteAccess: "Loading dock 2 allocated for panel hauling."
                    },
                    checklist: [
                        "Acknowledge assignment dispatch",
                        "Commercial roof access orientation",
                        "Three-phase AC balance check",
                        "Earth grounding resistance test < 5 Ohms",
                        "Anti-islanding switch test preparation"
                    ],
                    siteNotes: "Elevator access available between 8:00 AM and 10:30 AM."
                },
                {
                    id: "APP-1035",
                    applicantId: "APP-1035",
                    applicationId: "APP-1035",
                    customer: "Lim Villa",
                    system: "6.0 kW Hybrid",
                    capacityKwp: 6.0,
                    type: "Hybrid PV + Battery Storage",
                    location: "Lapu-Lapu City",
                    site: "Marigondon, Lapu-Lapu City",
                    region: "Cebu",
                    status: "New Job",
                    applicationStatus: "READY_FOR_INSTALLATION",
                    installationStatus: "PENDING_ACCEPTANCE",
                    systemStatus: "PENDING_INSTALLATION",
                    installer: "Unassigned",
                    date: "Sept 26, 2026 · 9:00 AM",
                    step: "Confirm assignment and coastal weather check",
                    progress: 0,
                    stage: "Pending Installer Confirmation",
                    coordinator: "Engr. Mark Villanueva (+63 917 800 1234)",
                    technicalSpecs: {
                        panels: "11x Jinko Solar 545W Tiger Neo N-Type",
                        inverter: "1x GoodWe 6kW Hybrid Dual-MPPT",
                        battery: "1x 5.12 kWh Pylontech LiFePO4",
                        mounting: "Corrosion-Resistant Marine Grade Clamps",
                        sldPermit: "Lapu-Lapu City PEE SLD Approved",
                        siteAccess: "Resort community pass at gate."
                    },
                    checklist: [
                        "Accept assignment order",
                        "Check weather & wind tolerance (>30km/h)",
                        "DC isolator marine seal check",
                        "Battery ESS clearance verification",
                        "Rapid shutdown orientation"
                    ],
                    siteNotes: "Coastal proximity: verify all anodized rail coatings."
                },
                {
                    id: "APP-1021",
                    applicantId: "APP-1021",
                    applicationId: "APP-1021",
                    customer: "Makati Logistics Hub",
                    system: "15.0 kW Commercial",
                    capacityKwp: 15.0,
                    type: "Three-Phase Grid-Tied PV",
                    location: "Makati City",
                    site: "San Antonio, Makati City",
                    region: "Metro Manila",
                    status: "In Progress",
                    applicationStatus: "READY_FOR_INSTALLATION",
                    installationStatus: "INSTALLATION_IN_PROGRESS",
                    systemStatus: "PENDING_ACTIVATION",
                    installer: "SolarTech Manila Installers",
                    date: "September 16, 2026 · 8:00 AM",
                    step: "String Voc testing and net-metering CT verification",
                    progress: 80,
                    stage: "Testing & Net-Metering Preparation",
                    coordinator: "Ms. Clarisse Santos (+63 917 800 5678)",
                    technicalSpecs: {
                        panels: "28x Canadian Solar 540W HiKu6 Monocrystalline",
                        inverter: "1x SMA Sunny Tripower 15000TL",
                        battery: "None (Commercial Net-Metering Export)",
                        mounting: "Corrugated Galvanized Iron Deck Solar Rails",
                        sldPermit: "Makati City Electrical Inspection Certificate Ready",
                        siteAccess: "Warehouse dock 4 allocated for contractor truck parking."
                    },
                    checklist: [
                        "String Voc and Isc verification with solar irradiance meter",
                        "Insulation resistance (megger) test on all DC cables",
                        "Inverter grid synchronization & anti-islanding trip check",
                        "Bi-directional net-metering CT installation verification",
                        "Hazard warning decals applied to all inverter and AC breaker boxes"
                    ],
                    siteNotes: "Final Meralco joint commissioning inspection tentatively set for Friday afternoon."
                },
                {
                    id: "APP-1025",
                    applicantId: "APP-1025",
                    applicationId: "APP-1025",
                    customer: "Pasig Auto Spares HQ",
                    system: "8.2 kW Grid-Tied",
                    capacityKwp: 8.2,
                    type: "Grid-Tied Commercial Rooftop",
                    location: "Pasig City",
                    site: "Kapitolyo, Pasig City",
                    region: "Metro Manila",
                    status: "In Progress",
                    applicationStatus: "READY_FOR_INSTALLATION",
                    installationStatus: "AWAITING_INSTALLATION",
                    systemStatus: "PENDING_ACTIVATION",
                    installer: "SolarTech Manila Installers",
                    date: "September 19, 2026 · 8:00 AM",
                    step: "Inverter mounting and three-phase AC balance test",
                    progress: 15,
                    stage: "Awaiting Installation",
                    coordinator: "Ms. Clarisse Santos (+63 917 800 5678)",
                    technicalSpecs: {
                        panels: "15x Longi 550W Hi-MO 6 Explorer Mono",
                        inverter: "1x Huawei SUN2000-8KTL-M1 Three-Phase",
                        battery: "None (Grid-Tied with Net-Metering provisions)",
                        mounting: "Trapezoidal Sheet Metal Rail Mount with EPDM Gaskets",
                        sldPermit: "Building Permit & SLD stamped by Pasig City Engineering",
                        siteAccess: "Building freight elevator available between 7:30 AM and 10:00 AM for panel hauling."
                    },
                    checklist: [
                        "Fall protection harnesses & roof anchor verification",
                        "DC cable crimping & UV-resistant conduit routing",
                        "Three-phase inverter AC balance test",
                        "Digital earth resistance tester reading < 5 Ohms",
                        "Anti-islanding test preparation"
                    ],
                    siteNotes: "Main distribution panel is located in basement level B1 near electrical riser 2."
                },
                {
                    id: "APP-1031",
                    applicantId: "APP-1031",
                    applicationId: "APP-1031",
                    customer: "Gomez Solar Facility",
                    system: "5.0 kW Hybrid Storage",
                    capacityKwp: 5.0,
                    type: "Maintenance",
                    isMaintenance: true,
                    location: "Mandaue City",
                    site: "Tipolo, Mandaue City",
                    region: "Cebu",
                    status: "Maintenance",
                    applicationStatus: "ACTIVE",
                    installationStatus: "COMPLETED",
                    systemStatus: "ACTIVE",
                    installer: "SolarTech Manila Installers",
                    date: "Today, 9:30 AM",
                    step: "Inverter error code diagnosis and ESS firmware flash",
                    progress: 30,
                    stage: "On-Site Diagnostic & Repair",
                    coordinator: "Engr. Mark Villanueva (+63 917 800 1234)",
                    technicalSpecs: {
                        panels: "10x Trina Solar 500W Monocrystalline",
                        inverter: "1x Deye 5kW Hybrid Single-Phase",
                        battery: "1x 5.12 kWh Dyness Wall-Mounted LiFePO4",
                        mounting: "Corrugated Tile Flashings",
                        sldPermit: "Annual Maintenance Certificate on File",
                        siteAccess: "Security gate open. Customer on-site."
                    },
                    checklist: [
                        "Thermal imaging scan of DC disconnect breakers",
                        "Battery management system (BMS) cell balance test",
                        "Firmware upgrade for Deye inverter communication card",
                        "Tighten DC terminal screws to 2.5 Nm spec",
                        "Customer confirmation and sign-off report"
                    ],
                    siteNotes: "Homeowner reported intermittent grid sync fault during peak afternoon heat."
                },
                {
                    id: "APP-1033",
                    applicantId: "APP-1033",
                    applicationId: "APP-1033",
                    customer: "Bautista Residence",
                    system: "5.4 kW Hybrid",
                    capacityKwp: 5.4,
                    type: "Maintenance",
                    isMaintenance: true,
                    location: "Quezon City",
                    site: "Batasan Hills, Quezon City",
                    region: "Metro Manila",
                    status: "Maintenance",
                    applicationStatus: "ACTIVE",
                    installationStatus: "COMPLETED",
                    systemStatus: "ACTIVE",
                    installer: "SolarTech Manila Installers",
                    date: "September 18, 2026 · 8:30 AM",
                    step: "DC isolator switch inspection and attic conduit repair",
                    progress: 50,
                    stage: "Preventive Maintenance",
                    coordinator: "Engr. Mark Villanueva (+63 917 800 1234)",
                    technicalSpecs: {
                        panels: "10x Trina Solar 540W Vertex S+ Dual-Glass",
                        inverter: "1x Deye 5kW Hybrid Single-Phase (SUN-5K-SG04LP1)",
                        battery: "1x 5.12 kWh Dyness Wall-Mounted LiFePO4",
                        mounting: "Kliplok Standing Seam Aluminum Clamps",
                        sldPermit: "PEE-Stamped SLD Approved by QC Engineering Office",
                        siteAccess: "Gate pass confirmed with village guardhouse. Use secondary contractor driveway."
                    },
                    checklist: [
                        "DC array open-circuit voltage (Voc) verification",
                        "Attic conduit support bracket inspection",
                        "Inverter earth fault check",
                        "Rapid shutdown button actuation test",
                        "Clean glass surface of panel string 1"
                    ],
                    siteNotes: "Homeowner requested conduit routing through rear attic to maintain clean front facade."
                },
                {
                    id: "APP-1018",
                    applicantId: "APP-1018",
                    applicationId: "APP-1018",
                    customer: "Sy Residence",
                    system: "6.5 kW Grid-Tied",
                    capacityKwp: 6.5,
                    type: "Grid-Tied Residential PV",
                    location: "Muntinlupa City",
                    site: "Ayala Alabang Village, Muntinlupa",
                    region: "Metro Manila",
                    status: "Completed",
                    applicationStatus: "ACTIVE",
                    installationStatus: "COMPLETED",
                    systemStatus: "ACTIVE",
                    installer: "SolarTech Manila Installers",
                    date: "Yesterday",
                    step: "Commissioning report and CFEI sign-off",
                    progress: 100,
                    stage: "Commissioned & Handed Over",
                    coordinator: "Engr. Mark Villanueva (+63 917 800 1234)",
                    technicalSpecs: {
                        panels: "12x JA Solar 545W DeepBlue 3.0",
                        inverter: "1x GoodWe 6kW Single-Phase Dual-MPPT",
                        battery: "None (Grid-tied net-metering)",
                        mounting: "Concrete Spanish Barrel Tile Hooks with Waterproof Sealant",
                        sldPermit: "Muntinlupa Certificate of Final Electrical Inspection (CFEI)",
                        siteAccess: "HOA work permits complete and deposit refunded."
                    },
                    checklist: [
                        "Complete installation report signed by client",
                        "As-built single-line electrical diagram handed over",
                        "Inverter Wi-Fi monitoring app paired with customer phone",
                        "Customer orientation on emergency rapid shutdown completed",
                        "Handover certificate uploaded to Hello Solar portal"
                    ],
                    siteNotes: "Customer commended the neat electrical cable trunking along the exterior wall."
                },
                {
                    id: "APP-1015",
                    applicantId: "APP-1015",
                    applicationId: "APP-1015",
                    customer: "Ridgeview Villa Estates",
                    system: "10.8 kW Hybrid",
                    capacityKwp: 10.8,
                    type: "Hybrid PV + High-Voltage Storage",
                    location: "Taguig City",
                    site: "BGC, Taguig City",
                    region: "Metro Manila",
                    status: "Completed",
                    applicationStatus: "ACTIVE",
                    installationStatus: "COMPLETED",
                    systemStatus: "ACTIVE",
                    installer: "SolarTech Manila Installers",
                    date: "September 10, 2026",
                    step: "Final commissioning completed",
                    progress: 100,
                    stage: "Handover Completed",
                    coordinator: "Engr. Mark Villanueva (+63 917 800 1234)",
                    technicalSpecs: {
                        panels: "20x Jinko Solar 540W Tiger Neo N-Type",
                        inverter: "1x Growatt SPH 10000TL3-BH-UP Three-Phase",
                        battery: "2x 5.12 kWh Pylontech Force-H2 High Voltage Stack",
                        mounting: "Asphalt Shingle Roof Tile Flashing Brackets",
                        sldPermit: "Cavite PEE Stamped SLD & Barangay Clearance Verified",
                        siteAccess: "Security gate cleared."
                    },
                    checklist: [
                        "Inverter grid synchronization confirmed",
                        "Battery management system paired",
                        "Client handover sign-off",
                        "Meralco net-metering documents submitted",
                        "Warranty documentation provided"
                    ],
                    siteNotes: "System performing at 104% projected output."
                }
            ],
            payouts: [
                {
                    id: "PAY-2026-101",
                    job: "APP-1018",
                    jobId: "APP-1018",
                    applicationId: "APP-1018",
                    legacyJob: "JOB-2026-085",
                    customer: "Sy Residence",
                    milestone: "Final Commissioning & Handover (20%)",
                    amount: 18130,
                    grossAmount: 18500,
                    cwtPercent: 2,
                    cwtDeduction: 370,
                    status: "Paid",
                    date: "September 12, 2026",
                    bank: "BDO Unibank · Acct ending in 8841",
                    refCode: "BDO-FT-20260912-9921",
                    note: "Final 20% milestone disbursed upon receipt of signed customer handover and CFEI."
                },
                {
                    id: "PAY-2026-102",
                    job: "APP-1018",
                    jobId: "APP-1018",
                    applicationId: "APP-1018",
                    legacyJob: "JOB-2026-085",
                    customer: "Sy Residence",
                    milestone: "Inverter Mounting & DC Stringing (50%)",
                    amount: 25480,
                    grossAmount: 26000,
                    cwtPercent: 2,
                    cwtDeduction: 520,
                    status: "Paid",
                    date: "September 8, 2026",
                    bank: "BDO Unibank · Acct ending in 8841",
                    refCode: "BDO-FT-20260908-4102",
                    note: "Sign-off completed for electrical and solar inverter stringing."
                },
                {
                    id: "PAY-2026-103",
                    job: "APP-1021",
                    jobId: "APP-1021",
                    applicationId: "APP-1021",
                    legacyJob: "JOB-2026-084",
                    customer: "Makati Logistics Hub",
                    milestone: "Inverter Mounting & DC Stringing (50%)",
                    amount: 34300,
                    grossAmount: 35000,
                    cwtPercent: 2,
                    cwtDeduction: 700,
                    status: "Pending Review",
                    date: "Estimated Sept 20, 2026",
                    bank: "BDO Unibank · Acct ending in 8841",
                    refCode: "PENDING-REV-084",
                    note: "Field photos submitted. Coordinator awaiting joint testing sign-off. Pending review confirms audit in progress."
                },
                {
                    id: "PAY-2026-104",
                    job: "APP-1025",
                    jobId: "APP-1025",
                    applicationId: "APP-1025",
                    legacyJob: "JOB-2026-082",
                    customer: "Pasig Auto Spares HQ",
                    milestone: "Rooftop Mounting Structure (30%)",
                    amount: 16170,
                    grossAmount: 16500,
                    cwtPercent: 2,
                    cwtDeduction: 330,
                    status: "Approved",
                    date: "September 22, 2026",
                    bank: "BDO Unibank · Acct ending in 8841",
                    refCode: "APPV-PAY-1025",
                    note: "Mounting rail torque check photos approved by engineering audit. Queued for scheduled disbursement."
                },
                {
                    id: "PAY-2026-105",
                    job: "APP-1033",
                    jobId: "APP-1033",
                    applicationId: "APP-1033",
                    legacyJob: "JOB-2026-081",
                    customer: "Bautista Residence",
                    milestone: "Initial Mobilization & Equipment Staging (30%)",
                    amount: 13720,
                    grossAmount: 14000,
                    cwtPercent: 2,
                    cwtDeduction: 280,
                    status: "Scheduled",
                    date: "Scheduled for Sept 25, 2026",
                    bank: "BDO Unibank · Acct ending in 8841",
                    refCode: "SCHED-PAY-081",
                    note: "Triggered upon confirmed physical site access and equipment staging verification."
                },
                {
                    id: "PAY-2026-106",
                    job: "APP-1025",
                    jobId: "APP-1025",
                    applicationId: "APP-1025",
                    legacyJob: "JOB-2026-082",
                    customer: "Pasig Auto Spares HQ",
                    milestone: "Inverter Mounting & Electrical Tie-in (50%)",
                    amount: 26950,
                    grossAmount: 27500,
                    cwtPercent: 2,
                    cwtDeduction: 550,
                    status: "Pending Review",
                    date: "Estimated Sept 28, 2026",
                    bank: "BDO Unibank · Acct ending in 8841",
                    refCode: "PENDING-REV-1025B",
                    note: "DC conduit and inverter breaker installation photos submitted for engineering review."
                },
                {
                    id: "PAY-2026-107",
                    job: "APP-1031",
                    jobId: "APP-1031",
                    applicationId: "APP-1031",
                    legacyJob: "JOB-2026-083",
                    customer: "Villanueva Compound",
                    milestone: "Annual System Inverter Warranty Service",
                    amount: 9310,
                    grossAmount: 9500,
                    cwtPercent: 2,
                    cwtDeduction: 190,
                    status: "On Hold",
                    date: "On Hold",
                    bank: "BDO Unibank · Acct ending in 8841",
                    refCode: "HOLD-REV-1031",
                    note: "Customer requested warranty rescheduling due to weather. Payout held pending revised site visit completion."
                }
            ]
        };

        cachedData = normalizeData(fallbackBootstrap);
        const savedJobs = loadPersistedJobsState();
        if (savedJobs) {
            cachedData.jobs = mergeSavedJobs(cachedData.jobs, savedJobs);
        } else {
            persistJobsState(cachedData.jobs);
        }
        return cachedData;
    }

    /**
     * Returns all active jobs (excluding declined unless requested)
     */
    function getJobs(includeDeclined = false) {
        if (!cachedData) return [];
        // Jobs come only from shared application records (APP ID / HS ID). The portal's sample jobs are not
        // merged: they reused APP IDs that belong to other shared projects.
        const jobs = sharedJobs(includeDeclined);
        return includeDeclined ? jobs : jobs.filter(j => j.status !== 'Declined' && !j.isDeclined);
    }

    /**
     * Finds a single job by id, applicantId, or applicationId
     */
    function getJobById(id) {
        if (!id || !cachedData || !Array.isArray(cachedData.jobs)) return null;
        const needle = String(id).trim().toLowerCase();
        return getJobs(true).find(j =>
            String(j.id || '').toLowerCase() === needle ||
            String(j.applicationId || '').toLowerCase() === needle ||
            String(j.applicantId || '').toLowerCase() === needle ||
            String(j.legacyId || '').toLowerCase() === needle
        ) || null;
    }

    /**
     * Returns all normalized payout records
     */
    function getPayouts() {
        if (!cachedData || !Array.isArray(cachedData.payouts)) return [];
        return cachedData.payouts;
    }

    // ----------------------------------------------------------------------
    // Support requests — saved locally and to the shared Super Admin store
    // (data.support, same ticket shape), so dispatch can see them.
    // ----------------------------------------------------------------------
    const STORAGE_KEY_SUPPORT_REQUESTS = 'hello_solar_installer_support_requests';

    function readSupportRequests() {
        try {
            const list = JSON.parse(localStorage.getItem(STORAGE_KEY_SUPPORT_REQUESTS) || '[]');
            return Array.isArray(list) ? list : [];
        } catch {
            return [];
        }
    }

    function nextSupportId(existing) {
        const max = existing.reduce((m, t) => {
            const n = parseInt(String(t?.id || '').replace(/^SUP-/i, ''), 10);
            return isNaN(n) ? m : Math.max(m, n);
        }, 0);
        return `SUP-${String(max + 1).padStart(3, '0')}`;
    }

    // This installer's tickets: the shared record (with Super Admin status/replies) wins over the local copy
    function getSupportRequests() {
        const context = projectContext();
        if (!context) return [];
        const shared = (context.data.support || []).filter(t => t.accountType === 'Installer' && t.accountId === context.installerId);
        const ids = new Set(shared.map(t => t.id));
        const local = readSupportRequests().filter(t => t.accountId === context.installerId && !ids.has(t.id));
        return [...shared, ...local];
    }

    function submitSupportRequest({ topic, reference, details, subject } = {}) {
        const text = String(details || '').trim();
        if (!text) return { success: false, error: 'Please tell us what you need help with.' };

        const context = projectContext();
        if (!context) return { success: false, error: 'Your installer account could not be verified. Please sign in again.' };
        const local = readSupportRequests();
        const shared = Array.isArray(context?.data?.support) ? context.data.support : [];
        const now = new Date().toISOString();
        const id = nextSupportId([...local, ...shared]);
        const by = context?.user?.fullName || context?.installerName || 'Installer';
        const ref = String(reference || '').trim();
        const cleanTopic = String(topic || 'Other').trim();

        const record = {
            id,
            accountType: 'Installer',
            accountId: context.installerId,
            accountName: context.installerName || by,
            relatedId: ref,
            topic: cleanTopic,
            subject: String(subject || `[${cleanTopic}]${ref ? ' ' + ref : ''} Support Request`),
            concern: `${cleanTopic}${ref ? ' · ' + ref : ''}`,
            priority: 'Medium',
            status: 'Open',
            created: 'Just now',
            createdAt: now,
            assignedTo: null,
            notes: text,
            resolutionNote: null,
            resolvedBy: null,
            resolvedAt: null,
            messages: [{ id: `MSG-${id}-1`, sender: `${by} (Installer)`, role: 'Installer', time: 'Just now', createdAt: now, text }],
            history: [{ id: `TH-${id}-1`, time: 'Just now', createdAt: now, user: 'System', action: 'Ticket created via Installer Portal', type: 'create' }]
        };

        try {
            localStorage.setItem(STORAGE_KEY_SUPPORT_REQUESTS, JSON.stringify([record, ...local]));
        } catch (e) {
            return { success: false, error: 'Unable to save your request on this device. Please try again.' };
        }

        if (context?.data) {
            if (!Array.isArray(context.data.support)) context.data.support = [];
            context.data.support.unshift(record);
            if (Array.isArray(context.data.activity)) {
                context.data.activity.unshift({
                    id: `ACT-${Date.now()}`,
                    timestamp: now,
                    role: 'Installer',
                    actorId: record.accountId,
                    user: record.accountName,
                    action: `Submitted support request ${id}${ref ? ' for ' + ref : ''}`,
                    record: id,
                    recordType: 'Support'
                });
            }
            persistShared(context.data, { name: 'support.create', payload: { ticket: record } });
        }

        notifySubscribers({ type: 'SUPPORT_REQUEST_SUBMITTED', requestId: id, record });
        return { success: true, record };
    }

    /**
     * Parses a payout's release date. Prefers ISO fields (scheduledDate / payoutDate)
     * for backend data; falls back to display text such as "Scheduled for Sept 25, 2026".
     * Returns a Date at local midnight, or null when no valid date exists.
     */
    function parsePayoutDate(p) {
        const raw = p && (p.scheduledDate || p.payoutDate || p.date);
        if (!raw) return null;
        const text = String(raw)
            .replace(/^\s*(scheduled\s+for|estimated|est\.?|on)\s+/i, '')
            .replace(/\bSept\b/i, 'Sep')
            .trim();
        const d = new Date(text);
        if (isNaN(d)) return null;
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    /**
     * Payout KPI summary (net amounts):
     * - totalPaid: sum of Paid payouts
     * - totalPendingReview: sum of Pending Review payouts
     * - nextPayout: nearest Scheduled payout dated today or later (never a past date), else null
     */
    function getPayoutSummary(now = new Date()) {
        const payouts = getPayouts();
        const statusOf = p => String(p.status || '').trim().toLowerCase();
        const net = p => Number(p.netAmount ?? p.amount) || 0;
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const nextPayout = payouts
            .filter(p => statusOf(p) === 'scheduled')
            .map(p => ({ payout: p, date: parsePayoutDate(p) }))
            .filter(x => x.date && x.date >= today)
            .sort((a, b) => a.date - b.date)[0] || null;

        return {
            totalPaid: payouts.filter(p => statusOf(p) === 'paid').reduce((s, p) => s + net(p), 0),
            totalPendingReview: payouts.filter(p => statusOf(p) === 'pending review').reduce((s, p) => s + net(p), 0),
            nextPayout: nextPayout ? {
                date: nextPayout.date,
                payId: nextPayout.payout.id,
                appId: nextPayout.payout.applicationId || nextPayout.payout.job,
                netAmount: net(nextPayout.payout)
            } : null
        };
    }

    /**
     * Calculates live KPI counts across categories from the single source of truth
     * User requirements:
     * - New Jobs: Only applications with applicationStatus = READY_FOR_INSTALLATION
     * - In Progress: Active installation jobs
     * - Maintenance Work: Separate from new installations
     */
    function getKpiCounts() {
        const jobs = getJobs();
        return {
            newJobs: jobs.filter(isNewJob).length,
            inProgress: jobs.filter(isInProgressJob).length,
            maintenance: jobs.filter(isActiveMaintenanceJob).length,
            completed: jobs.filter(j => isCompletedJob(j) || isMaintenanceCompleted(j)).length,
            total: jobs.length
        };
    }

    /**
     * Filters jobs by category:
     * - 'new': newly assigned jobs requiring confirmation
     * - 'in_progress': active installation jobs (Awaiting Installation or In Progress)
     * - 'maintenance': repair, inspection, or service work
     * - 'completed': finished installations and active systems
     */
    function getJobsByCategory(category) {
        const jobs = getJobs();
        const cat = String(category || '').toLowerCase();
        if (cat === 'new' || cat === 'new jobs' || cat === 'new job') {
            return jobs.filter(isNewJob);
        }
        if (cat === 'in_progress' || cat === 'inprogress' || cat === 'in progress') {
            return jobs.filter(isInProgressJob);
        }
        if (cat === 'maintenance' || cat === 'maintenance work') {
            return jobs.filter(isActiveMaintenanceJob);
        }
        if (cat === 'completed') {
            return jobs.filter(j => isCompletedJob(j) || isMaintenanceCompleted(j));
        }
        if (cat === 'maintenance_history' || cat === 'completed maintenance') {
            return jobs.filter(isMaintenanceCompleted);
        }
        return jobs;
    }

    /**
     * Accepts a newly assigned job:
     * User requirement:
     * - installationStatus = AWAITING_INSTALLATION
     * - assign the installer to the application
     * - updates KPI totals and persists state
     */
    function acceptJob(jobId) {
        const job = getJobById(jobId);
        if (!job) return { success: false, error: 'Job not found' };
        if (!isNewJob(job)) {
            return { success: false, error: 'Only new jobs awaiting confirmation can be accepted.' };
        }

        const context = projectContext();
        if (!context) return { success: false, error: 'Your installer account could not be verified.' };
        const { installerId, installerName } = context;

        job.installationStatus = 'AWAITING_INSTALLATION';
        job.assignedInstallerId = installerId;
        job.installer = installerName;
        job.status = 'In Progress';
        // Progress stays at 0% until Start Installation
        job.progress = 0;
        job.stage = 'Awaiting Installation';
        job.step = 'Proceed to site and begin rooftop installation';

        // Update shared Super Admin data store if present
        if (context?.data) {
            const app = context.data.applications.find(a => a.id === job.id);
            if (app) {
                app.assignedInstallerId = installerId;
                app.installer = installerName;
                app.installationStatus = 'AWAITING_INSTALLATION';
                app.dispatchStatus = 'Accepted';
                app.installerAcceptance = 'Accepted';
                app.stage = 'Installation';
                app.acceptedAt = new Date().toISOString();
                syncInstallationJob(context.data, app.id, { installer: installerName, installerId, installerType: 'Partner Installer', acceptedAt: app.acceptedAt });
                context.data.activity.unshift({
                    id: `ACT-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    role: 'Installer',
                    actorId: installerId,
                    user: installerName,
                    action: `Accepted ${app.id} for installation`,
                    record: app.id,
                    recordType: 'Application'
                });
                persistShared(context.data, { name: 'installer.accept', payload: { appId: app.id, installerId } });
                notifyCustomer(app, 'Installer Assigned', `${app.installer} accepted ${app.id} and will schedule your installation.`);
            }
        }

        persistJobsState(cachedData.jobs);

        // Dispatch specific operational notification
        if (typeof window !== 'undefined' && window.HelloSolarNotifications && typeof window.HelloSolarNotifications.dispatch === 'function') {
            window.HelloSolarNotifications.dispatch({
                id: `notif-acc-${Date.now()}`,
                recipientRole: 'installer',
                eventType: 'job_accepted',
                recordId: job.applicationId || job.id,
                title: 'Job Accepted',
                message: `${job.applicationId || job.id} moved to In Progress · ${job.location || job.site}`,
                timestamp: new Date().toISOString(),
                targetUrl: `myjob.html?job=${encodeURIComponent(job.applicationId || job.id)}`,
                actionLabel: 'View Work Order'
            });
        }

        notifySubscribers({ type: 'JOB_ACCEPTED', jobId: job.id, job });
        return { success: true, job };
    }

    /**
     * Declines a newly assigned job:
     * User requirement:
     * - do not decline the customer application.
     * - set installer back to Unassigned and return the job for reassignment.
     */
    function declineJob(jobId) {
        const job = getJobById(jobId);
        if (!job) return { success: false, error: 'Job not found' };

        const context = projectContext();
        if (!context) return { success: false, error: 'Your installer account could not be verified.' };
        const { installerId, installerName } = context;

        job.status = 'Declined';
        job.isDeclined = true;
        job.installer = 'Unassigned';
        job.assignedInstallerId = null;

        if (context?.data) {
            const app = context.data.applications.find(a => a.id === job.id);
            if (app) {
                app.installer = 'Unassigned';
                app.assignedInstallerId = null;
                delete app.installerAcceptance;
                app.dispatchStatus = 'Declined by Installer';
                app.declinedInstallerIds = [...(app.declinedInstallerIds || []), installerId];
                syncInstallationJob(context.data, app.id, { installer: 'Unassigned', installerId: null, notes: `Declined by ${installerName}; awaiting reassignment.` });
                // Note: applicationStatus remains READY_FOR_INSTALLATION so customer application is NOT declined!
                context.data.activity.unshift({
                    id: `ACT-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    role: 'Installer',
                    actorId: installerId,
                    user: installerName,
                    action: `Declined assignment for ${app.id} (returned for reassignment)`,
                    record: app.id,
                    recordType: 'Application'
                });
                persistShared(context.data, { name: 'installer.decline', payload: { appId: app.id, installerId } });
            }
        }

        persistJobsState(cachedData.jobs);

        if (typeof window !== 'undefined' && window.HelloSolarNotifications && typeof window.HelloSolarNotifications.dispatch === 'function') {
            window.HelloSolarNotifications.dispatch({
                id: `notif-dec-${Date.now()}`,
                recipientRole: 'installer',
                eventType: 'job_declined',
                recordId: job.applicationId || job.id,
                title: 'Job Declined',
                message: `${job.applicationId || job.id} returned for reassignment`,
                timestamp: new Date().toISOString(),
                targetUrl: 'myjob.html',
                actionLabel: 'My Jobs'
            });
        }

        notifySubscribers({ type: 'JOB_DECLINED', jobId: job.id, job });
        return { success: true, job };
    }

    /**
     * Starts installation:
     * User requirement:
     * - installationStatus = INSTALLATION_IN_PROGRESS
     */
    function startInstallation(jobId) {
        const job = getJobById(jobId);
        if (!job) return { success: false, error: 'Job not found' };
        if (isMaintenanceJob(job) || String(job.installationStatus || '').toUpperCase() !== 'AWAITING_INSTALLATION') {
            return { success: false, error: 'Installation can only be started for accepted jobs awaiting installation.' };
        }

        job.installationStatus = 'INSTALLATION_IN_PROGRESS';
        job.status = 'In Progress';
        job.progress = Math.max(job.progress || 0, 25);
        job.stage = 'Installation in Progress';
        job.step = 'Rooftop mounting and electrical wiring in progress';

        const context = projectContext();
        if (context?.data) {
            const app = context.data.applications.find(a => a.id === job.id);
            if (app) {
                app.installationStatus = 'INSTALLATION_IN_PROGRESS';
                app.systemStatus = 'Installation in Progress';
                app.progress = job.progress;
                app.stage = 'Installation';
                syncInstallationJob(context.data, app.id, { status: 'In Progress', progress: job.progress, startedAt: new Date().toISOString() });
                persistShared(context.data, { name: 'installer.start', payload: { appId: app.id, installerId: context.installerId } });
                notifyCustomer(app, 'Installation Started', `Installation of ${app.id} has started.`);
            }
        }

        persistJobsState(cachedData.jobs);

        if (typeof window !== 'undefined' && window.HelloSolarNotifications && typeof window.HelloSolarNotifications.dispatch === 'function') {
            window.HelloSolarNotifications.dispatch({
                id: `notif-start-${Date.now()}`,
                recipientRole: 'installer',
                eventType: 'installation_started',
                recordId: job.applicationId || job.id,
                title: 'Installation Started',
                message: `${job.applicationId || job.id} is now in progress`,
                timestamp: new Date().toISOString(),
                targetUrl: `myjob.html?job=${encodeURIComponent(job.applicationId || job.id)}`,
                actionLabel: 'View Job Details'
            });
        }

        notifySubscribers({ type: 'INSTALLATION_STARTED', jobId: job.id, job });
        return { success: true, job };
    }

    /**
     * Updates installation progress (percentage and optional notes)
     */
    function updateProgress(jobId, newProgress, notes) {
        const job = getJobById(jobId);
        if (!job) return { success: false, error: 'Job not found' };

        const pct = Math.min(100, Math.max(0, parseInt(newProgress, 10) || 0));
        job.progress = pct;
        if (notes) job.siteNotes = notes;

        // Maintenance jobs: separate flow — never touches installation/activation status
        if (isMaintenanceJob(job)) {
            const stage = getMaintenanceStage(pct);
            job.stage = stage;
            job.maintenanceStatus = pct === 100 ? 'COMPLETED' : 'IN_PROGRESS';
            // jobType stays MAINTENANCE for history; current status reflects completion.
            // installationStatus / systemStatus are intentionally left unchanged.
            job.jobType = 'MAINTENANCE';
            job.status = pct === 100 ? 'Completed' : 'Maintenance';
            if (pct === 100) job.maintenanceCompletedAt = new Date().toISOString();
            job.step = pct === 100
                ? 'Maintenance Completed · Service report ready for customer sign-off'
                : `Maintenance ${stage} (${pct}%)`;
            persistJobsState(cachedData.jobs);
            notifySubscribers({ type: 'MAINTENANCE_PROGRESS_UPDATED', jobId: job.id, job, progress: pct });
            return { success: true, job };
        }

        if (pct === 100) {
            job.installationStatus = 'COMPLETED';
            job.status = 'Completed';
            job.stage = 'Installation Completed';
            job.step = 'Installation completed · Ready for activation';
        } else {
            job.installationStatus = 'INSTALLATION_IN_PROGRESS';
            job.status = 'In Progress';
            job.stage = `Installation in Progress (${pct}%)`;
            job.step = `Field installation milestone reached (${pct}%)`;
        }

        const context = projectContext();
        if (context?.data) {
            const app = context.data.applications.find(a => a.id === job.id);
            if (app) {
                app.progress = pct;
                app.installationStatus = job.installationStatus;
                persistShared(context.data, { name: 'installation.progress', payload: { appId: app.id, progress: { percent: app.progress, notes: notes || '' } } });
            }
        }

        persistJobsState(cachedData.jobs);
        notifySubscribers({ type: 'PROGRESS_UPDATED', jobId: job.id, job, progress: pct });
        return { success: true, job };
    }

    // ----------------------------------------------------------------------
    // Installation Progress records (Reference No., Battery, Inverter, Solar
    // Panels, Progress) — keyed by APP ID and shared with Super Admin.
    // Backend-ready: record shape mirrors a future
    //   GET/PUT /api/applications/{appId}/installation-progress
    // ----------------------------------------------------------------------
    const STORAGE_KEY_INSTALL_PROGRESS = 'hello_solar_installation_progress';
    const INSTALL_PROGRESS_STAGES = [
        'Site Preparation',
        'Mounting & Racking',
        'Solar Panel Installation',
        'DC Wiring & Stringing',
        'Inverter Installation',
        'Battery Installation',
        'AC Wiring & Grid Connection',
        'Testing & Commissioning'
    ];

    function getAppId(job) {
        return job ? (job.applicationId || job.applicantId || job.id) : null;
    }

    function isCancelledJob(j) {
        const raw = String(j?.status || '').toLowerCase();
        const inst = String(j?.installationStatus || '').toUpperCase();
        return raw === 'cancelled' || raw === 'canceled' || inst === 'CANCELLED' || inst === 'CANCELED';
    }

    // Progress button: accepted installation jobs only (not new/declined/cancelled/maintenance)
    function canShowProgress(job) {
        if (!job || isMaintenanceJob(job) || isNewJob(job) || isCancelledJob(job)) return false;
        if (job.isDeclined || String(job.status || '').toLowerCase() === 'declined' ||
            String(job.installationStatus || '').toUpperCase() === 'DECLINED') return false;
        return isInProgressJob(job) || isCompletedJob(job);
    }

    // Editable only while the installation is ongoing
    function canEditProgress(job) {
        return canShowProgress(job) && isInProgressJob(job);
    }

    function readProgressStore() {
        try {
            const parsed = (typeof window !== 'undefined' && window.HSStore)
                ? window.HSStore.json(STORAGE_KEY_INSTALL_PROGRESS, {})
                : JSON.parse(localStorage.getItem(STORAGE_KEY_INSTALL_PROGRESS) || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    }

    function defaultProgressRecord(job) {
        const specs = job.technicalSpecs || {};
        return {
            appId: getAppId(job),
            jobId: job.id,
            referenceNumber: '',
            battery: { brand: '', model: specs.battery || '', capacityKwh: '', quantity: '', serialNumbers: '' },
            inverter: { brand: '', model: specs.inverter || '', capacityKw: '', serialNumber: '' },
            solarPanels: { brand: '', model: specs.panels || '', wattage: '', quantity: '', serialNumbers: '' },
            progress: { percent: parseInt(job.progress, 10) || 0, stage: '', notes: '' },
            updatedAt: null,
            updatedBy: null,
            history: []
        };
    }

    function isAwaitingInstallation(job) {
        return String(job?.installationStatus || '').toUpperCase() === 'AWAITING_INSTALLATION';
    }

    function getInstallationProgress(jobId) {
        const job = getJobById(jobId);
        if (!job) return null;
        const appId = getAppId(job);
        const stored = readProgressStore()[appId];
        const base = defaultProgressRecord(job);
        const record = !stored ? base : {
            ...base,
            ...stored,
            battery: { ...base.battery, ...(stored.battery || {}) },
            inverter: { ...base.inverter, ...(stored.inverter || {}) },
            solarPanels: { ...base.solarPanels, ...(stored.solarPanels || {}) },
            progress: { ...base.progress, ...(stored.progress || {}) },
            history: Array.isArray(stored.history) ? stored.history : []
        };
        // Installation progress stays at 0% until Start Installation; afterwards the
        // job's own progress (updated by Start / Save / Complete) is the source of truth.
        if (isAwaitingInstallation(job)) {
            record.progress = { ...record.progress, percent: 0 };
        } else if (job.progress !== undefined && job.progress !== null && job.progress !== '') {
            record.progress = { ...record.progress, percent: parseInt(job.progress, 10) || 0 };
        }
        return record;
    }

    function saveInstallationProgress(jobId, payload = {}) {
        const job = getJobById(jobId);
        if (!job) return { success: false, error: 'Job not found' };
        if (!canEditProgress(job)) {
            return { success: false, error: 'Installation progress can only be updated while the installation is ongoing.' };
        }

        const referenceNumber = String(payload.referenceNumber || '').trim();
        if (!referenceNumber) return { success: false, error: 'Reference Number is required.' };

        const isInstalling = String(job.installationStatus || '').toUpperCase() === 'INSTALLATION_IN_PROGRESS';
        const existing = getInstallationProgress(jobId);
        let percent = existing.progress.percent;
        let stage = String(payload.progress?.stage || '').trim();
        let notes = String(payload.progress?.notes || '').trim();
        if (!isInstalling) {
            // AWAITING_INSTALLATION: only Reference Number + equipment are saved; progress stays 0%
            percent = 0;
            stage = existing.progress.stage || '';
            notes = existing.progress.notes || '';
        } else if (payload.progress && payload.progress.percent !== undefined && payload.progress.percent !== '') {
            percent = parseInt(payload.progress.percent, 10);
            // 100% is reached through "Complete" so the existing completion flow is preserved
            if (isNaN(percent) || percent < 0 || percent > 99) {
                return { success: false, error: 'Progress must be between 0 and 99%. Use "Complete" to finish the installation.' };
            }
        }

        const context = projectContext();
        if (!context) return { success: false, error: 'Your installer account could not be verified.' };
        const now = new Date().toISOString();
        const by = { installerId: context.installerId, name: context.installerName };
        const clean = (obj, keys) => keys.reduce((acc, k) => { acc[k] = String((obj || {})[k] ?? '').trim(); return acc; }, {});

        const record = {
            appId: getAppId(job),
            jobId: job.id,
            referenceNumber,
            battery: clean(payload.battery, ['brand', 'model', 'capacityKwh', 'quantity', 'serialNumbers']),
            inverter: clean(payload.inverter, ['brand', 'model', 'capacityKw', 'serialNumber']),
            solarPanels: clean(payload.solarPanels, ['brand', 'model', 'wattage', 'quantity', 'serialNumbers']),
            progress: { percent, stage, notes },
            updatedAt: now,
            updatedBy: by,
            history: [{ at: now, by: by.name, percent, stage }, ...existing.history].slice(0, 50)
        };

        const store = readProgressStore();
        store[record.appId] = record;
        try {
            if (typeof window !== 'undefined' && window.HSShared && window.HSShared.saveInstallationProgress) {
                window.HSShared.saveInstallationProgress(record, null); // backend command sent with the application update below
            } else {
                localStorage.setItem(STORAGE_KEY_INSTALL_PROGRESS, JSON.stringify(store));
            }
        } catch (e) {
            return { success: false, error: 'Unable to save progress on this device.' };
        }

        // Mirror onto the shared Super Admin application record (same APP ID)
        if (context?.data) {
            const app = context.data.applications.find(a => a.id === record.appId);
            if (app) {
                app.installationProgress = record;
                if (Array.isArray(context.data.activity)) {
                    context.data.activity.unshift({
                        id: `ACT-${Date.now()}`,
                        timestamp: now,
                        role: 'Installer',
                        actorId: by.installerId,
                        user: by.name,
                        action: `Updated installation progress for ${app.id} (${percent}%)`,
                        record: app.id,
                        recordType: 'Application'
                    });
                }
                persistShared(context.data, { name: 'installation.progress', payload: { appId: app.id, progress: record } });
            }
        }

        // Keep the job's percentage in sync through the existing progress flow
        if (isInstalling) {
            if (percent !== (parseInt(job.progress, 10) || 0)) updateProgress(job.id, percent);
            if (record.progress.stage) {
                job.stage = record.progress.stage;
                persistJobsState(cachedData.jobs);
            }
        }

        notifySubscribers({ type: 'INSTALLATION_PROGRESS_SAVED', jobId: job.id, appId: record.appId, record });
        return { success: true, record };
    }

    /**
     * Marks installation complete:
     * User requirement:
     * - installationStatus = COMPLETED
     */
    function completeInstallation(jobId) {
        const job = getJobById(jobId);
        if (!job) return { success: false, error: 'Job not found' };
        if (isMaintenanceJob(job) || String(job.installationStatus || '').toUpperCase() !== 'INSTALLATION_IN_PROGRESS') {
            return { success: false, error: 'Only installations in progress can be marked complete.' };
        }

        job.installationStatus = 'COMPLETED';
        job.status = 'Completed';
        job.progress = 100;
        job.stage = 'Installation Completed';
        job.step = 'Final commissioning complete · Ready for activation';

        const context = projectContext();
        if (context?.data) {
            const app = context.data.applications.find(a => a.id === job.id);
            if (app) {
                app.installationStatus = 'COMPLETED';
                app.progress = 100;
                app.stage = 'Installation Completed';
                syncInstallationJob(context.data, app.id, { status: 'Completed', progress: 100, completedDate: shortDate(new Date()) });
                persistShared(context.data, { name: 'installer.complete', payload: { appId: app.id, installerId: context.installerId } });
                notifyCustomer(app, 'Installation Completed', `Installation of ${app.id} is complete. Your installer will activate the system after final commissioning.`);
            }
        }

        persistJobsState(cachedData.jobs);

        if (typeof window !== 'undefined' && window.HelloSolarNotifications && typeof window.HelloSolarNotifications.dispatch === 'function') {
            window.HelloSolarNotifications.dispatch({
                id: `notif-comp-${Date.now()}`,
                recipientRole: 'installer',
                eventType: 'installation_completed',
                recordId: job.applicationId || job.id,
                title: 'Installation Complete',
                message: `${job.applicationId || job.id} marked complete · Ready for activation`,
                timestamp: new Date().toISOString(),
                targetUrl: `myjob.html?job=${encodeURIComponent(job.applicationId || job.id)}`,
                actionLabel: 'Activate System'
            });
        }

        notifySubscribers({ type: 'INSTALLATION_COMPLETED', jobId: job.id, job });
        return { success: true, job };
    }

    /**
     * Activates system:
     * User requirement:
     * When Activate System is clicked:
     * - installationStatus = COMPLETED
     * - systemStatus = ACTIVE
     * - applicationStatus = ACTIVE
     */
    function activateSystem(jobId) {
        const job = getJobById(jobId);
        if (!job) return { success: false, error: 'Job not found' };
        const alreadyActive = String(job.systemStatus || '').toUpperCase() === 'ACTIVE' ||
            String(job.applicationStatus || '').toUpperCase() === 'ACTIVE';
        if (isMaintenanceJob(job)) {
            return { success: false, error: 'Maintenance jobs cannot be activated.' };
        }
        if (String(job.installationStatus || '').toUpperCase() !== 'COMPLETED' || alreadyActive) {
            return { success: false, error: alreadyActive
                ? 'This system is already active.'
                : 'Only completed installations can be activated.' };
        }

        job.installationStatus = 'COMPLETED';
        job.systemStatus = 'ACTIVE';
        job.applicationStatus = 'ACTIVE';
        job.status = 'Completed';
        job.progress = 100;
        job.stage = 'System Active & Commissioned';
        job.step = 'System operational · Producing solar energy';
        job.activatedAt = new Date().toISOString();

        const context = projectContext();
        if (context?.data) {
            const app = context.data.applications.find(a => a.id === job.id);
            if (app) {
                app.installationStatus = 'COMPLETED';
                app.systemStatus = 'ACTIVE';
                app.applicationStatus = 'ACTIVE';
                app.stage = 'Completed';
                app.activatedAt = job.activatedAt;
                app.activatedBy = context.installerId;
                syncInstallationJob(context.data, app.id, { status: 'Completed', progress: 100, systemStatus: 'ACTIVE', activatedAt: job.activatedAt });

                const customer = context.data.customers?.find(c => c.id === app.customerId || c.appId === app.id);
                if (customer) {
                    customer.systemStatus = 'Active';
                }

                context.data.activity.unshift({
                    id: `ACT-${Date.now()}`,
                    timestamp: job.activatedAt,
                    role: 'Installer',
                    actorId: context.installerId,
                    user: context.installerName,
                    action: `Activated system for ${app.id}`,
                    record: app.id,
                    recordType: 'Application'
                });

                persistShared(context.data, { name: 'installer.activate', payload: { appId: app.id, installerId: context.installerId } });
                notifyCustomer(app, 'System Activated', `${app.id} is now active and generating solar energy.`);
            }
        }

        persistJobsState(cachedData.jobs);

        if (typeof window !== 'undefined' && window.HelloSolarNotifications && typeof window.HelloSolarNotifications.dispatch === 'function') {
            window.HelloSolarNotifications.dispatch({
                id: `notif-act-${Date.now()}`,
                recipientRole: 'installer',
                eventType: 'system_activated',
                recordId: job.applicationId || job.id,
                title: 'System Activated',
                message: `${job.applicationId || job.id} is now ACTIVE and generating solar energy`,
                timestamp: new Date().toISOString(),
                targetUrl: `myjob.html?job=${encodeURIComponent(job.applicationId || job.id)}`,
                actionLabel: 'View Job Details'
            });
        }

        notifySubscribers({ type: 'SYSTEM_ACTIVATED', jobId: job.id, job });
        return { success: true, job };
    }

    /**
     * Backward-compatible alias for activateSystem
     */
    function activateModel(jobId) {
        return activateSystem(jobId);
    }

    /**
     * Saves user-imported JSON override
     */
    function saveOverride(jsonData) {
        const validation = validateDataset(jsonData);
        if (!validation.valid) return validation;

        try {
            localStorage.setItem(STORAGE_KEY_OVERRIDE, JSON.stringify(jsonData));
            cachedData = normalizeData(jsonData);
            persistJobsState(cachedData.jobs);
            notifySubscribers({ type: 'DATA_RELOADED' });
            return { valid: true };
        } catch (e) {
            return { valid: false, errors: ['Local storage quota exceeded or disabled.'] };
        }
    }

    /**
     * Resets local override and stored jobs state
     */
    function resetOverride() {
        try {
            localStorage.removeItem(STORAGE_KEY_OVERRIDE);
            localStorage.removeItem(STORAGE_KEY_JOBS_STATE);
        } catch (e) {}
        cachedData = null;
        notifySubscribers({ type: 'DATA_RESET' });
    }

    /**
     * Formatter for Philippine Peso (₱)
     */
    function formatMoney(amount) {
        const val = Number(amount) || 0;
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            maximumFractionDigits: 0
        }).format(val);
    }

    /**
     * Escape special HTML characters to prevent XSS
     */
    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));
    }

    /**
     * Render semantic status badge:
     * - Maintenance — Red
     * - In Progress / Awaiting Installation — Orange
     * - Completed — Green
     * - Active — Green
     * - New Job — Subtle Blue
     * - Declined — Neutral
     */
    function renderStatusBadge(status, job = null) {
        let label = status;
        let badgeClass = 'badge-progress';

        if (job) {
            if (isMaintenanceCompleted(job)) {
                label = 'Completed';
                badgeClass = 'badge-success';
            } else if (isMaintenanceJob(job)) {
                label = 'Maintenance';
                badgeClass = 'badge-danger';
            } else if (isNewJob(job)) {
                label = 'New Job';
                badgeClass = 'badge-new';
            } else if (isInProgressJob(job)) {
                if (String(job.installationStatus).toUpperCase() === 'AWAITING_INSTALLATION') {
                    label = 'Awaiting Installation';
                    badgeClass = 'badge-progress';
                } else {
                    label = 'In Progress';
                    badgeClass = 'badge-progress';
                }
            } else if (isCompletedJob(job)) {
                if (String(job.systemStatus).toUpperCase() === 'ACTIVE' || String(job.applicationStatus).toUpperCase() === 'ACTIVE') {
                    label = 'Active';
                    badgeClass = 'badge-success';
                } else {
                    label = 'Completed';
                    badgeClass = 'badge-success';
                }
            }
        } else {
            const s = canonicalizeStatus(status);
            label = s;
            if (s === 'Completed' || s === 'Paid') {
                badgeClass = 'badge-success';
            } else if (s === 'Active') {
                badgeClass = 'badge-success';
            } else if (s === 'Approved') {
                badgeClass = 'badge-approved';
            } else if (s === 'Scheduled') {
                badgeClass = 'badge-scheduled';
            } else if (s === 'Pending Review') {
                badgeClass = 'badge-pending';
            } else if (s === 'On Hold') {
                badgeClass = 'badge-danger';
            } else if (s === 'In Progress') {
                badgeClass = 'badge-progress';
            } else if (s === 'Maintenance') {
                badgeClass = 'badge-danger';
            } else if (s === 'New Job') {
                badgeClass = 'badge-new';
            } else if (s === 'Declined') {
                badgeClass = 'badge-declined';
            }
        }

        const activeCustomStyle = (label === 'Active')
            ? ' style="background:#ecfdf5!important;color:#047857!important;border:1px solid #6ee7b7!important;"'
            : '';

        return `<span class="status-badge ${badgeClass}"${activeCustomStyle}><span class="badge-dot">●</span> ${escapeHtml(label)}</span>`;
    }

    /**
     * Download text / CSV file
     */
    function downloadFile(filename, content, type = 'text/csv;charset=utf-8;') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('storage', event => {
            if (event.key === PROJECT_STORE) notifySubscribers({ type: 'PROJECT_UPDATED' });
        });
    }

    return {
        loadData,
        getJobs,
        getJobById,
        getPayouts,
        getPayoutSummary,
        submitSupportRequest,
        getSupportRequests,
        parsePayoutDate,
        getKpiCounts,
        getJobsByCategory,
        isNewJob,
        isInProgressJob,
        isMaintenanceJob,
        isMaintenanceCompleted,
        isActiveMaintenanceJob,
        getMaintenanceStage,
        MAINTENANCE_STAGES,
        isCompletedJob,
        acceptJob,
        declineJob,
        startInstallation,
        updateProgress,
        canShowProgress,
        canEditProgress,
        getInstallationProgress,
        saveInstallationProgress,
        INSTALL_PROGRESS_STAGES,
        completeInstallation,
        activateSystem,
        activateModel,
        subscribe,
        canonicalizeStatus,
        validateDataset,
        saveOverride,
        resetOverride,
        formatMoney,
        escapeHtml,
        renderStatusBadge,
        downloadFile
    };
})();

if (typeof window !== 'undefined') {
    window.InstallerData = InstallerData;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InstallerData;
}
