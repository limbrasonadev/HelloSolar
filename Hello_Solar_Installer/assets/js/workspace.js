/**
 * ==========================================================================
 * HELLO SOLAR INSTALLER PORTAL — WORKSPACE INTERACTION MANAGER
 * Orchestrates My Jobs, Payouts, Support views, and JSON preview loader.
 * Features:
 * - Next Assignment hero answering "What is my next assignment & what do I need to do?"
 * - Search & status filters with instant update
 * - Filtered CSV export
 * - Interactive checklist and local job notes persistence
 * - Support draft auto-preservation on input/change
 * - Deep linking via URL query parameters
 * - Compact JSON preview loader with schema validation and instant re-render
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
    'use strict';

    const path = window.location.pathname.split('/').pop() || 'myjob.html';
    const isJobPage = path === 'myjob.html' || path === '' || path === 'index.html';
    const isPayoutPage = path === 'payout.html';
    const isSupportPage = path === 'support.html';
    const isProfilePage = path === 'profile.html';

    // Load installer dataset from InstallerData module
    let data;
    try {
        data = await InstallerData.loadData();
    } catch (e) {
        console.error('Failed to load installer data:', e);
        data = { jobs: [], payouts: [], checklist: [], faqs: [] };
    }

    let { jobs = [], payouts = [], checklist: defaultChecklist = [], faqs = [], sop = [] } = data;

    // Load active profile from localStorage to update greetings and topbar
    const installerSession = window.HSShared ? window.HSShared.session.get('installer') : null;
    let userProfile = { fullName: installerSession ? (installerSession.fullName || installerSession.name || '') : '', businessName: installerSession ? (installerSession.businessName || '') : '' };

    // Update greeting if present
    const greetingEl = document.getElementById('installerGreeting');
    if (greetingEl) {
        greetingEl.textContent = `Welcome back, ${userProfile.fullName || 'Installer Team'}`;
    }

    // --------------------------------------------------------------------------
    // SHARED ACCESSIBLE CUSTOM FILTER DROPDOWN
    // --------------------------------------------------------------------------
    function initCustomFilterDropdown(dropdownEl) {
        if (!dropdownEl) return;
        const trigger = dropdownEl.querySelector('.custom-filter-trigger');
        const items = dropdownEl.querySelectorAll('.custom-filter-item');
        const selectedText = dropdownEl.querySelector('.custom-filter-selected');
        const statusDot = dropdownEl.querySelector('.custom-filter-status-dot');
        const nativeSelect = dropdownEl.querySelector('.filter-native-select-hidden') || dropdownEl.parentElement?.querySelector('.filter-native-select-hidden') || dropdownEl.querySelector('select');

        function toggleMenu(force) {
            const isOpen = typeof force === 'boolean' ? force : !dropdownEl.classList.contains('open');
            document.querySelectorAll('.custom-filter-dropdown.open').forEach(d => {
                if (d !== dropdownEl) d.classList.remove('open');
            });
            dropdownEl.classList.toggle('open', isOpen);
            if (trigger) trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }

        if (trigger) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleMenu();
            });
            trigger.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleMenu(true);
                    const activeItem = dropdownEl.querySelector('.custom-filter-item.active') || items[0];
                    if (activeItem) activeItem.focus();
                } else if (e.key === 'Escape') {
                    toggleMenu(false);
                }
            });
        }

        items.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const val = item.getAttribute('data-value');
                const textEl = item.querySelector('.custom-filter-item-text');
                const label = textEl ? textEl.textContent.trim() : val;
                const itemDot = item.querySelector('.custom-filter-status-dot');

                if (selectedText) selectedText.textContent = label;
                if (statusDot && itemDot) {
                    statusDot.className = itemDot.className;
                }

                items.forEach(it => {
                    it.classList.remove('active');
                    it.setAttribute('aria-selected', 'false');
                });
                item.classList.add('active');
                item.setAttribute('aria-selected', 'true');

                if (nativeSelect) {
                    nativeSelect.value = val;
                    nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
                toggleMenu(false);
                if (trigger) trigger.focus();
            });

            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const next = item.nextElementSibling;
                    if (next && next.classList.contains('custom-filter-item')) next.focus();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prev = item.previousElementSibling;
                    if (prev && prev.classList.contains('custom-filter-item')) prev.focus();
                } else if (e.key === 'Escape') {
                    toggleMenu(false);
                    if (trigger) trigger.focus();
                }
            });
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!dropdownEl.contains(e.target)) {
                dropdownEl.classList.remove('open');
                if (trigger) trigger.setAttribute('aria-expanded', 'false');
            }
        });

        // Sync if nativeSelect changed externally
        if (nativeSelect) {
            nativeSelect.addEventListener('change', () => {
                const currentVal = nativeSelect.value;
                items.forEach(it => {
                    if (it.getAttribute('data-value') === currentVal) {
                        it.classList.add('active');
                        it.setAttribute('aria-selected', 'true');
                        const textEl = it.querySelector('.custom-filter-item-text');
                        if (selectedText) selectedText.textContent = textEl ? textEl.textContent.trim() : currentVal;
                        const itemDot = it.querySelector('.custom-filter-status-dot');
                        if (statusDot && itemDot) statusDot.className = itemDot.className;
                    } else {
                        it.classList.remove('active');
                        it.setAttribute('aria-selected', 'false');
                    }
                });
            });
        }
    }

    // --------------------------------------------------------------------------
    // 1. MY JOBS VIEW LOGIC (myjob.html)
    // --------------------------------------------------------------------------
    if (isJobPage && document.getElementById('jobsTableBody')) {
        const tableBody = document.getElementById('jobsTableBody');
        const searchInput = document.getElementById('jobSearchInput');
        const statusFilter = document.getElementById('jobStatusFilter');
        initCustomFilterDropdown(document.getElementById('jobsStatusFilterDropdown'));

        // Modal elements: 6-Tier Job Details
        const jobModal = document.getElementById('jobModal');
        const modalTitle = document.getElementById('modalJobTitle');
        const modalSub = document.getElementById('modalJobSub');
        const modalSpecsGrid = document.getElementById('modalSpecsGrid');
        const modalChecklist = document.getElementById('modalChecklist');
        const modalSiteNotes = document.getElementById('modalSiteNotes');
        const btnSaveJobNotes = document.getElementById('btnSaveJobNotes');
        const modalSupportBtn = document.getElementById('modalSupportBtn');
        const closeJobModalBtn = document.getElementById('closeJobModal');
        const btnCloseJobModalFooter = document.getElementById('btnCloseJobModalFooter');

        // KPI Modal elements
        const kpiModal = document.getElementById('kpiModal');
        const modalKpiTitle = document.getElementById('modalKpiTitle');
        const modalKpiCount = document.getElementById('modalKpiCount');
        const modalKpiSubtitle = document.getElementById('modalKpiSubtitle');
        const modalKpiList = document.getElementById('modalKpiList');
        const closeKpiModalBtn = document.getElementById('closeKpiModal');

        // KPI Card Buttons
        const kpiCardNewJobs = document.getElementById('kpiCardNewJobs');
        const kpiCardInProgress = document.getElementById('kpiCardInProgress');
        const kpiCardMaintenance = document.getElementById('kpiCardMaintenance');

        let currentActiveJob = null;
        let isJobsExpanded = false;
        let activeKpiCategory = null;

        function parseJobDate(dateStr) {
            if (!dateStr) return 0;
            const cleaned = dateStr.replace(/·/g, ' ').replace(/\s+/g, ' ').trim();
            const ts = Date.parse(cleaned);
            if (!isNaN(ts)) return ts;
            const match = cleaned.match(/([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})/);
            if (match) {
                return new Date(`${match[1]} ${match[2]}, ${match[3]}`).getTime();
            }
            return 0;
        }

        // Render exactly 3 core KPI metrics from centralized store: New Jobs, In Progress, Maintenance Work
        function renderJobKpis() {
            const counts = InstallerData.getKpiCounts();

            const statNewEl = document.getElementById('statNewJobs');
            const statInProgEl = document.getElementById('statInProgress');
            const statMaintEl = document.getElementById('statMaintenance');

            if (statNewEl) statNewEl.textContent = counts.newJobs;
            if (statInProgEl) statInProgEl.textContent = counts.inProgress;
            if (statMaintEl) statMaintEl.textContent = counts.maintenance;
        }

        // Returns human-friendly metadata for KPI categories
        function getCategoryMeta(cat) {
            const c = String(cat || '').toLowerCase();
            if (c === 'new' || c === 'new jobs' || c === 'new job') {
                return {
                    title: 'New Jobs',
                    subtitle: 'Awaiting your confirmation',
                    emptyTitle: 'No New Jobs',
                    emptyText: 'All incoming job assignments have been reviewed.'
                };
            }
            if (c === 'in_progress' || c === 'inprogress' || c === 'in progress') {
                return {
                    title: 'In Progress Jobs',
                    subtitle: 'Accepted installations underway',
                    emptyTitle: 'No Jobs In Progress',
                    emptyText: 'No installations are currently in active execution.'
                };
            }
            if (c === 'maintenance' || c === 'maintenance work') {
                return {
                    title: 'Maintenance Work',
                    subtitle: 'Open service and repair tickets',
                    emptyTitle: 'No Maintenance Jobs',
                    emptyText: 'All system maintenance tickets have been resolved.'
                };
            }
            return {
                title: 'Jobs',
                subtitle: 'Assigned installation and maintenance jobs',
                emptyTitle: 'No Jobs Found',
                emptyText: 'No jobs currently match this category.'
            };
        }

        // Renders contents of the KPI category modal
        function renderKpiModalContent(category) {
            if (!modalKpiList) return;
            const meta = getCategoryMeta(category);
            const categoryJobs = InstallerData.getJobsByCategory(category);

            if (modalKpiTitle) modalKpiTitle.textContent = meta.title;
            if (modalKpiSubtitle) modalKpiSubtitle.textContent = meta.subtitle || 'Review assigned projects';
            if (modalKpiCount) modalKpiCount.textContent = `${categoryJobs.length} ${categoryJobs.length === 1 ? 'Job' : 'Jobs'}`;

            if (categoryJobs.length === 0) {
                modalKpiList.innerHTML = `
                    <div class="kpi-modal-empty">
                        <div class="kpi-empty-icon-wrap">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="m9 12 2 2 4-4"/>
                            </svg>
                        </div>
                        <h4>${InstallerData.escapeHtml(meta.emptyTitle || 'No Jobs')}</h4>
                        <p>${InstallerData.escapeHtml(meta.emptyText || 'No jobs currently belong to this category.')}</p>
                    </div>
                `;
                return;
            }

            modalKpiList.innerHTML = categoryJobs.map(job => {
                const jobId = InstallerData.escapeHtml(job.id);
                const appIdText = InstallerData.escapeHtml(job.applicationId || job.applicantId || job.id);
                const customerText = job.customer ? InstallerData.escapeHtml(job.customer) : '';
                const metaParts = [job.location || job.site, job.system, job.date]
                    .filter(Boolean)
                    .map(v => InstallerData.escapeHtml(v));

                // List stays read-only: a single View opens Job Details, where all workflow actions live
                return `
                    <div class="kpi-job-item" data-item-job-id="${jobId}">
                        <div class="kpi-job-main">
                            <div class="kpi-job-title-group">
                                <span class="kpi-id-text">${appIdText}</span>
                                ${customerText ? `<span class="kpi-job-customer">${customerText}</span>` : ''}
                            </div>
                            ${metaParts.length ? `<div class="kpi-job-meta">${metaParts.join('<span aria-hidden="true"> · </span>')}</div>` : ''}
                        </div>
                        <div class="kpi-job-side">
                            ${InstallerData.renderStatusBadge(job.status, job)}
                            <button type="button" class="btn-action btn-view-job-details" data-job-id="${jobId}" aria-label="View details for ${appIdText}">View</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function openKpiModal(category) {
            if (!kpiModal) return;
            activeKpiCategory = category;
            renderKpiModalContent(category);
            kpiModal.classList.add('open');
            kpiModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }

        function closeKpiModal() {
            if (!kpiModal) return;
            kpiModal.classList.remove('open');
            kpiModal.setAttribute('aria-hidden', 'true');
            if (!jobModal || !jobModal.classList.contains('open')) {
                document.body.style.overflow = '';
            }
            activeKpiCategory = null;
        }

        function filterJobs() {
            const currentJobs = InstallerData.getJobs();
            const query = (searchInput?.value || '').toLowerCase().trim();
            const selectedStatus = (statusFilter?.value || 'ALL');

            return currentJobs.filter(job => {
                let matchesStatus = true;
                if (selectedStatus === 'New Job' || selectedStatus === 'new') {
                    matchesStatus = InstallerData.isNewJob(job);
                } else if (selectedStatus === 'In Progress' || selectedStatus === 'in_progress') {
                    matchesStatus = InstallerData.isInProgressJob(job);
                } else if (selectedStatus === 'Maintenance' || selectedStatus === 'maintenance') {
                    matchesStatus = InstallerData.isActiveMaintenanceJob(job);
                } else if (selectedStatus === 'Completed' || selectedStatus === 'completed') {
                    matchesStatus = InstallerData.isCompletedJob(job) || InstallerData.isMaintenanceCompleted(job);
                } else if (selectedStatus !== 'ALL') {
                    matchesStatus = (job.status || '').toLowerCase() === selectedStatus.toLowerCase();
                }

                const textHaystack = [
                    job.id,
                    job.applicationId,
                    job.applicantId,
                    job.customer,
                    job.system,
                    job.site,
                    job.location,
                    job.region,
                    job.step,
                    job.stage,
                    job.status,
                    job.jobType
                ].join(' ').toLowerCase();

                const matchesQuery = !query || textHaystack.includes(query);
                return matchesStatus && matchesQuery;
            });
        }

        // Render Primary Section: Assigned Jobs Table (Application ID | Status | Action)
        function renderJobsTable() {
            const filtered = filterJobs();
            const total = filtered.length;
            const paginationFooter = document.getElementById('jobsPaginationFooter');
            const seeMoreText = document.getElementById('seeMoreJobsText');
            const toggleBtn = document.getElementById('btnToggleJobsExpand');

            // Limit to 3 items initially unless expanded
            const visibleJobs = (!isJobsExpanded && total > 3) ? filtered.slice(0, 3) : filtered;

            if (paginationFooter) {
                if (total > 3) {
                    paginationFooter.style.display = 'flex';
                    if (isJobsExpanded) {
                        if (seeMoreText) seeMoreText.textContent = 'See less';
                        toggleBtn?.classList.add('expanded');
                    } else {
                        if (seeMoreText) seeMoreText.textContent = 'See more';
                        toggleBtn?.classList.remove('expanded');
                    }
                } else {
                    paginationFooter.style.display = 'none';
                }
            }

            if (total === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="3">
                            <div class="table-empty">
                                <strong>No matching installation jobs found</strong>
                                <p>Try selecting "All Jobs" in the filter.</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            tableBody.innerHTML = visibleJobs.map(job => {
                const jobId = InstallerData.escapeHtml(job.id);
                const appId = InstallerData.escapeHtml(job.applicationId || job.applicantId || job.id);
                // One compact sub-line: location · HS ID · model (empty parts skipped)
                const subParts = [job.location || job.site];
                if (job.sharedProject) subParts.push(job.hsId, job.purchasedModel);
                const subLine = subParts.filter(Boolean).map(v => InstallerData.escapeHtml(v)).join(' · ');

                // Table stays simple: workflow actions (Accept, Start, Complete, Activate, Progress) live in Job Details
                return `
                    <tr>
                        <td data-label="Application ID">
                            <button type="button" class="cell-applicant-link" data-job-id="${jobId}" aria-label="Open job details for ${appId}">
                                <span class="applicant-id-text">${appId}</span>
                                ${subLine ? `<span class="applicant-location-sub">${subLine}</span>` : ''}
                            </button>
                        </td>
                        <td data-label="Status">
                            ${InstallerData.renderStatusBadge(job.status, job)}
                        </td>
                        <td data-label="Action">
                            <button type="button" class="btn-action btn-view-job-details" data-job-id="${jobId}" aria-label="View details for ${appId}">View</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Render Secondary Section: Today's Tasks
        function renderTodaysTasks() {
            const tasksTableBody = document.getElementById('todaysTasksTableBody');
            if (!tasksTableBody) return;

            // Pick active upcoming tasks (not completed), sorted by date
            const activeJobs = InstallerData.getJobs()
                .filter(j => j.status !== 'Completed' && j.step)
                .slice()
                .sort((a, b) => parseJobDate(a.date) - parseJobDate(b.date));

            if (activeJobs.length === 0) {
                tasksTableBody.innerHTML = `
                    <tr>
                        <td colspan="5">
                            <div class="table-empty">
                                <strong>All assigned tasks completed</strong>
                                <p>No immediate field tasks require your attention today.</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            tasksTableBody.innerHTML = activeJobs.map(job => {
                return `
                    <tr>
                        <td data-label="Visit / Date">
                            <span class="job-schedule-date">${InstallerData.escapeHtml(job.date)}</span>
                        </td>
                        <td data-label="Task / Next Step">
                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                <span style="font-weight: 700; color: var(--navy); font-size: 13.5px;">${InstallerData.escapeHtml(job.step)}</span>
                                <span style="font-size: 11.5px; color: var(--gray-500);">${InstallerData.escapeHtml(job.stage || 'Field Preparation')}</span>
                            </div>
                        </td>
                        <td data-label="Customer & Site">
                            <div class="cell-primary">
                                <span class="job-customer-name">${InstallerData.escapeHtml(job.customer)}</span>
                                <span class="cell-sub">${InstallerData.escapeHtml(job.site)}</span>
                            </div>
                        </td>
                        <td data-label="Status">
                            ${InstallerData.renderStatusBadge(job.status, job)}
                        </td>
                        <td data-label="Action" style="text-align: right;">
                            <button type="button" class="btn-action btn-view-job-details" data-job-id="${job.id}">
                                Open
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Populates 6-Tier Organized Job Details Modal with Working Actions
        function openJobModal(jobId) {
            const job = InstallerData.getJobById(jobId);
            if (!job) return;
            currentActiveJob = job;

            const isNew = InstallerData.isNewJob(job);
            const isProgress = InstallerData.isInProgressJob(job);
            const isCompleted = InstallerData.isCompletedJob(job);
            const isMaintenance = InstallerData.isMaintenanceJob(job);
            const instStatus = String(job.installationStatus || '').toUpperCase();
            const sysStatus = String(job.systemStatus || '').toUpperCase();
            const appStatus = String(job.applicationStatus || '').toUpperCase();
            const isActivated = sysStatus === 'ACTIVE' || appStatus === 'ACTIVE';

            // 1. Header
            const modalJobIdEl = document.getElementById('modalJobId');
            const displayId = job.applicationId || job.applicantId || job.id;
            if (modalJobIdEl) modalJobIdEl.textContent = displayId;
            modalTitle.textContent = job.customer || displayId;
            modalSub.textContent = [job.system, job.location || job.site].filter(Boolean).join(' · ');

            // 2. Current Status & Schedule
            const modalJobStatus = document.getElementById('modalJobStatus');
            if (modalJobStatus) modalJobStatus.innerHTML = InstallerData.renderStatusBadge(job.status, job);
            const modalJobDate = document.getElementById('modalJobDate');
            if (modalJobDate) modalJobDate.textContent = job.date || 'Not scheduled';

            // 3. Next Task Highlight
            const modalJobNextTask = document.getElementById('modalJobNextTask');
            let nextTaskText = job.step;
            if (isNew) {
                nextTaskText = 'Review the job details, then accept or decline.';
            } else if (instStatus === 'AWAITING_INSTALLATION') {
                nextTaskText = 'Go to site, verify mounting points and start the installation.';
            } else if (instStatus === 'INSTALLATION_IN_PROGRESS') {
                nextTaskText = 'Finish mounting, DC stringing and inverter testing.';
            } else if (instStatus === 'COMPLETED' && !isActivated) {
                nextTaskText = 'Run grid sync and anti-islanding tests, then activate the system.';
            } else if (isActivated) {
                nextTaskText = 'System is active and commissioned. No action needed.';
            } else if (isMaintenance) {
                nextTaskText = 'Run on-site diagnostics, fix the issue and get customer sign-off.';
            }
            // Maintenance jobs follow their own flow (never installation/activation wording)
            const isMaintenanceDone = isMaintenance && InstallerData.isMaintenanceCompleted(job);
            if (isMaintenance) {
                nextTaskText = isMaintenanceDone
                    ? 'Maintenance completed. Service report ready for customer sign-off.'
                    : (job.step || 'Run on-site diagnostics, fix the issue and get customer sign-off.');
            }
            if (modalJobNextTask) modalJobNextTask.textContent = nextTaskText;

            // 4. Job Snapshot
            const modalSnapshotSystem = document.getElementById('modalSnapshotSystem');
            if (modalSnapshotSystem) modalSnapshotSystem.textContent = String(job.system || '').includes(String(job.capacityKwp || 5.0)) ? `${job.system} system` : `${job.system} (${job.capacityKwp || 5.0} kWp)`;
            const modalSnapshotCoord = document.getElementById('modalSnapshotCoord');
            if (modalSnapshotCoord) modalSnapshotCoord.textContent = job.coordinator || 'Hello Solar Dispatch (+63 917 800 1234)';
            const modalSnapshotAccess = document.getElementById('modalSnapshotAccess');
            const specs = job.technicalSpecs || {};
            if (modalSnapshotAccess) {
                const place = [...new Set([job.site, job.region].filter(Boolean))].join(', ');
                modalSnapshotAccess.textContent = `${place ? place + ' — ' : ''}${specs.siteAccess || 'Present Hello Solar contractor ID at main village gate.'}`;
            }

            // 5. Installation Progress
            const modalProgressPct = document.getElementById('modalProgressPct');
            if (modalProgressPct) modalProgressPct.textContent = `${job.progress || 0}%`;
            const modalProgressBar = document.getElementById('modalProgressBar');
            if (modalProgressBar) modalProgressBar.style.width = `${job.progress || 0}%`;
            const modalProgressStage = document.getElementById('modalProgressStage');
            if (modalProgressStage) modalProgressStage.textContent = job.stage || 'In progress';
            const modalProgressSection = document.querySelector('#jobModal .modal-progress-section');
            if (modalProgressSection) modalProgressSection.hidden = isNew;
            const modalProgressLabel = document.querySelector('.modal-progress-section .modal-section-label');
            if (modalProgressLabel) modalProgressLabel.textContent = isMaintenance ? 'Maintenance Progress' : 'Installation Progress';
            const progressUpdaterLabel = document.querySelector('#modalProgressUpdater .progress-updater-label');
            if (progressUpdaterLabel) {
                progressUpdaterLabel.textContent = isMaintenance
                    ? 'Set maintenance progress'
                    : 'Set installation progress';
            }
            if (isMaintenance && modalProgressStage) {
                modalProgressStage.textContent = isMaintenanceDone
                    ? 'Maintenance Completed'
                    : InstallerData.getMaintenanceStage(job.progress || 0);
            }

            // 6. Technical Specifications Grid (if present)
            if (modalSpecsGrid) {
                modalSpecsGrid.innerHTML = `
                    <div class="spec-item">
                        <span class="spec-label">Solar Modules</span>
                        <span class="spec-value">${InstallerData.escapeHtml(specs.panels || 'PV Modules on specification')}</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Inverter Hardware</span>
                        <span class="spec-value">${InstallerData.escapeHtml(specs.inverter || 'On-grid inverter')}</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Battery ESS</span>
                        <span class="spec-value">${InstallerData.escapeHtml(specs.battery || 'None (Grid-tied net-metering)')}</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Rooftop Mounting</span>
                        <span class="spec-value">${InstallerData.escapeHtml(specs.mounting || 'Standard aluminum rail mount')}</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Approved SLD & Permit</span>
                        <span class="spec-value">${InstallerData.escapeHtml(specs.sldPermit || 'PEE-Stamped SLD on site')}</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">System Architecture</span>
                        <span class="spec-value">${InstallerData.escapeHtml(job.type || 'Rooftop Solar PV')}</span>
                    </div>
                `;
            }

            // 7. Dynamic Workflow Actions
            const modalWorkflowStatusTag = document.getElementById('modalWorkflowStatusTag');
            const modalWorkflowActions = document.getElementById('modalWorkflowActions');
            const modalProgressUpdater = document.getElementById('modalProgressUpdater');
            const inputCustomProgress = document.getElementById('inputCustomProgress');
            const modalFooterPrimaryActions = document.getElementById('modalFooterPrimaryActions');

            if (modalProgressUpdater) modalProgressUpdater.style.display = 'none';
            if (inputCustomProgress) inputCustomProgress.value = job.progress || 0;

            let actionsHtml = '';
            let footerPrimaryHtml = '';

            if (isNew) {
                if (modalWorkflowStatusTag) modalWorkflowStatusTag.textContent = 'Pending Installer Confirmation';
                actionsHtml = `
                    <button type="button" class="btn btn-workflow-primary btn-modal-accept" data-job-id="${InstallerData.escapeHtml(job.id)}">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>Accept</span>
                    </button>
                    <button type="button" class="btn btn-workflow-secondary btn-modal-decline" data-job-id="${InstallerData.escapeHtml(job.id)}">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        <span>Decline</span>
                    </button>
                `;
                footerPrimaryHtml = `
                    <button type="button" class="btn btn-workflow-primary btn-modal-accept" data-job-id="${InstallerData.escapeHtml(job.id)}">
                        Accept Job
                    </button>
                `;
            } else if (instStatus === 'AWAITING_INSTALLATION') {
                if (modalWorkflowStatusTag) modalWorkflowStatusTag.textContent = 'Ready for Field Deployment';
                actionsHtml = `
                    <button type="button" class="btn btn-workflow-primary btn-modal-start" data-job-id="${InstallerData.escapeHtml(job.id)}">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        <span>Start Installation</span>
                    </button>
                `;
                footerPrimaryHtml = `
                    <button type="button" class="btn btn-workflow-primary btn-modal-start" data-job-id="${InstallerData.escapeHtml(job.id)}">
                        Start Installation
                    </button>
                `;
            } else if (instStatus === 'INSTALLATION_IN_PROGRESS') {
                if (modalWorkflowStatusTag) modalWorkflowStatusTag.textContent = 'Installation in Progress';
                actionsHtml = `
                    <button type="button" class="btn btn-workflow-secondary btn-job-progress" data-job-id="${InstallerData.escapeHtml(job.id)}">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 6l-9.5 9.5-5-5L1 18"/></svg>
                        <span>Update Progress</span>
                    </button>
                    <button type="button" class="btn btn-workflow-primary btn-modal-complete" data-job-id="${InstallerData.escapeHtml(job.id)}">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>Mark Complete</span>
                    </button>
                `;
                footerPrimaryHtml = `
                    <button type="button" class="btn btn-workflow-primary btn-modal-complete" data-job-id="${InstallerData.escapeHtml(job.id)}">
                        Mark Installation Complete
                    </button>
                `;
            } else if (instStatus === 'COMPLETED' && !isActivated) {
                if (modalWorkflowStatusTag) modalWorkflowStatusTag.textContent = 'Installation Complete · Ready to Activate';
                actionsHtml = `
                    <button type="button" class="btn btn-workflow-activate btn-modal-activate" data-job-id="${InstallerData.escapeHtml(job.id)}">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        <span>Activate System</span>
                    </button>
                `;
                footerPrimaryHtml = `
                    <button type="button" class="btn btn-workflow-activate btn-modal-activate" data-job-id="${InstallerData.escapeHtml(job.id)}">
                        Activate System
                    </button>
                `;
            } else if (isActivated) {
                if (modalWorkflowStatusTag) modalWorkflowStatusTag.textContent = 'System Active & Commissioned';
                actionsHtml = ''; // status + next step already say it's done
                footerPrimaryHtml = '';
            } else if (isMaintenance) {
                if (modalWorkflowStatusTag) modalWorkflowStatusTag.textContent = 'Maintenance Work Ticket';
                actionsHtml = `
                    <button type="button" class="btn btn-workflow-secondary btn-modal-update-progress" data-job-id="${InstallerData.escapeHtml(job.id)}">
                        <span>Update Progress</span>
                    </button>
                `;
                footerPrimaryHtml = '';
            }

            if (isMaintenance) {
                if (isMaintenanceDone) {
                    if (modalWorkflowStatusTag) modalWorkflowStatusTag.textContent = 'Maintenance Completed';
                    actionsHtml = ''; // status + next step already say it's done
                } else {
                    if (modalWorkflowStatusTag) modalWorkflowStatusTag.textContent = `Maintenance · ${InstallerData.getMaintenanceStage(job.progress || 0)}`;
                    actionsHtml = `
                    <button type="button" class="btn btn-workflow-secondary btn-modal-update-progress" data-job-id="${InstallerData.escapeHtml(job.id)}">
                        <span>Update Progress</span>
                    </button>
                `;
                }
                footerPrimaryHtml = '';
            }

            if (InstallerData.canShowProgress && InstallerData.canShowProgress(job) && !actionsHtml.includes('btn-job-progress')) {
                actionsHtml += `
                    <button type="button" class="btn btn-workflow-secondary btn-job-progress" data-job-id="${InstallerData.escapeHtml(job.id)}">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                        <span>${InstallerData.canEditProgress(job) ? 'Update Progress' : 'View Progress'}</span>
                    </button>
                `;
            }
            if (modalWorkflowActions) modalWorkflowActions.innerHTML = actionsHtml;
            // Footer keeps only Contact Coordinator + Close; primary actions are shown once, above.
            if (modalFooterPrimaryActions) modalFooterPrimaryActions.innerHTML = '';

            // Preparation checklist: load saved checks from localStorage per job (if present)
            if (modalChecklist) {
                const checklistItems = job.checklist && job.checklist.length > 0 ? job.checklist : defaultChecklist;
                let savedChecks = {};
                try {
                    savedChecks = JSON.parse(localStorage.getItem(`hello_solar_installer_checklist_${job.id}`) || '{}');
                } catch (e) { }

                modalChecklist.innerHTML = checklistItems.map((item, idx) => {
                    const isChecked = savedChecks[idx] ? 'checked' : '';
                    return `
                        <label class="checklist-row">
                            <input type="checkbox" data-check-index="${idx}" ${isChecked}>
                            <span>${InstallerData.escapeHtml(item)}</span>
                        </label>
                    `;
                }).join('');
            }

            // Site installation notes (local storage per job) (if present)
            if (modalSiteNotes) {
                const savedNotes = localStorage.getItem(`hello_solar_installer_notes_${job.id}`) || job.siteNotes || '';
                modalSiteNotes.value = savedNotes;
            }

            // Contextual support button
            if (modalSupportBtn) {
                modalSupportBtn.href = `support.html?topic=Site%20Access%20%26%20Scheduling&reference=${encodeURIComponent(job.id)}`;
            }

            jobModal.classList.add('open');
            jobModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }

        function closeJobModal() {
            if (!jobModal) return;
            jobModal.classList.remove('open');
            jobModal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        if (btnCloseJobModalFooter) {
            btnCloseJobModalFooter.addEventListener('click', closeJobModal);
        }

        // Save local notes and checklist
        if (btnSaveJobNotes && modalChecklist && modalSiteNotes) {
            btnSaveJobNotes.addEventListener('click', () => {
                if (!currentActiveJob) return;

                const checks = {};
                modalChecklist.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    const idx = cb.getAttribute('data-check-index');
                    checks[idx] = cb.checked;
                });

                localStorage.setItem(`hello_solar_installer_checklist_${currentActiveJob.id}`, JSON.stringify(checks));
                localStorage.setItem(`hello_solar_installer_notes_${currentActiveJob.id}`, modalSiteNotes.value);

                btnSaveJobNotes.textContent = '✓ Saved Locally';
                btnSaveJobNotes.style.background = '#059669';
                setTimeout(() => {
                    btnSaveJobNotes.textContent = 'Save Notes & Checklist';
                    btnSaveJobNotes.style.background = '';
                }, 1800);
            });
        }

        // Event delegation for Accept, Decline, Start, Update Progress, Complete, and Activate
        document.addEventListener('click', (e) => {
            // 1. Accept Job
            const acceptBtn = e.target.closest('.btn-job-accept, .btn-modal-accept');
            if (acceptBtn) {
                e.preventDefault();
                e.stopPropagation();
                const jobId = acceptBtn.getAttribute('data-job-id');
                if (jobId) {
                    const result = InstallerData.acceptJob(jobId);
                    if (!result.success) {
                        window.alert(result.error);
                    } else if (jobModal && jobModal.classList.contains('open') && currentActiveJob && currentActiveJob.id === jobId) {
                        openJobModal(jobId);
                    }
                }
                return;
            }

            // 2. Decline Job
            const declineBtn = e.target.closest('.btn-job-decline, .btn-modal-decline');
            if (declineBtn) {
                e.preventDefault();
                e.stopPropagation();
                const jobId = declineBtn.getAttribute('data-job-id');
                if (jobId) {
                    const result = InstallerData.declineJob(jobId);
                    if (!result.success) {
                        window.alert(result.error);
                    } else if (jobModal && jobModal.classList.contains('open') && currentActiveJob && currentActiveJob.id === jobId) {
                        closeJobModal();
                    }
                }
                return;
            }

            // 3. Start Installation
            const startBtn = e.target.closest('.btn-job-start, .btn-modal-start');
            if (startBtn) {
                e.preventDefault();
                e.stopPropagation();
                const jobId = startBtn.getAttribute('data-job-id');
                if (jobId) {
                    const result = InstallerData.startInstallation(jobId);
                    if (!result.success) {
                        window.alert(result.error);
                    } else if (jobModal && jobModal.classList.contains('open') && currentActiveJob && currentActiveJob.id === jobId) {
                        openJobModal(jobId);
                    }
                }
                return;
            }

            // 4. Mark Installation Complete
            const completeBtn = e.target.closest('.btn-job-complete, .btn-modal-complete');
            if (completeBtn) {
                e.preventDefault();
                e.stopPropagation();
                const jobId = completeBtn.getAttribute('data-job-id');
                if (jobId) {
                    const result = InstallerData.completeInstallation(jobId);
                    if (!result.success) {
                        window.alert(result.error);
                    } else if (jobModal && jobModal.classList.contains('open') && currentActiveJob && currentActiveJob.id === jobId) {
                        openJobModal(jobId);
                    }
                }
                return;
            }

            // 5. Activate System
            const activateBtn = e.target.closest('.btn-job-activate, .btn-modal-activate');
            if (activateBtn) {
                e.preventDefault();
                e.stopPropagation();
                const jobId = activateBtn.getAttribute('data-job-id');
                if (jobId) {
                    const result = InstallerData.activateSystem(jobId);
                    if (!result.success) {
                        window.alert(result.error);
                    } else if (jobModal && jobModal.classList.contains('open') && currentActiveJob && currentActiveJob.id === jobId) {
                        openJobModal(jobId);
                    }
                }
                return;
            }

            // 6. Toggle Progress Updater Drawer
            const toggleProgressBtn = e.target.closest('.btn-modal-update-progress');
            if (toggleProgressBtn) {
                e.preventDefault();
                const updater = document.getElementById('modalProgressUpdater');
                if (updater) {
                    updater.style.display = (updater.style.display === 'none' || !updater.style.display) ? 'flex' : 'none';
                }
                return;
            }

            // 7. Progress Preset Chips
            const chip = e.target.closest('.chip-progress');
            if (chip) {
                e.preventDefault();
                const pct = chip.getAttribute('data-pct');
                const inputCustom = document.getElementById('inputCustomProgress');
                if (inputCustom && pct) {
                    inputCustom.value = pct;
                }
                document.querySelectorAll('.chip-progress').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                return;
            }

            // 8. Save Progress
            const saveProgressBtn = e.target.closest('#btnSaveProgress');
            if (saveProgressBtn) {
                e.preventDefault();
                if (!currentActiveJob) return;
                const inputCustom = document.getElementById('inputCustomProgress');
                const pct = parseInt(inputCustom?.value, 10);
                if (isNaN(pct) || pct < 0 || pct > 100) {
                    window.alert('Please enter a valid percentage between 0 and 100.');
                    return;
                }
                InstallerData.updateProgress(currentActiveJob.id, pct);
                openJobModal(currentActiveJob.id);
                return;
            }

            // 9. Cancel Progress Drawer
            const cancelProgressBtn = e.target.closest('#btnCancelProgress');
            if (cancelProgressBtn) {
                e.preventDefault();
                const updater = document.getElementById('modalProgressUpdater');
                if (updater) updater.style.display = 'none';
                return;
            }

            // 10. View Details / Modal Opener
            const viewBtn = e.target.closest('.btn-view-job-details, .cell-applicant-link, .kpi-job-id-btn');
            if (viewBtn) {
                e.preventDefault();
                const jobId = viewBtn.getAttribute('data-job-id');
                if (jobId) {
                    openJobModal(jobId);
                }
                return;
            }
        });

        // KPI Card Triggers
        if (kpiCardNewJobs) {
            kpiCardNewJobs.addEventListener('click', () => openKpiModal('new'));
        }
        if (kpiCardInProgress) {
            kpiCardInProgress.addEventListener('click', () => openKpiModal('in_progress'));
        }
        if (kpiCardMaintenance) {
            kpiCardMaintenance.addEventListener('click', () => openKpiModal('maintenance'));
        }

        // KPI Modal Close Bindings
        if (closeKpiModalBtn) {
            closeKpiModalBtn.addEventListener('click', closeKpiModal);
        }
        if (kpiModal) {
            kpiModal.addEventListener('click', (e) => {
                if (e.target === kpiModal) closeKpiModal();
            });
        }

        const toggleJobsExpandBtn = document.getElementById('btnToggleJobsExpand');
        if (toggleJobsExpandBtn) {
            toggleJobsExpandBtn.addEventListener('click', () => {
                isJobsExpanded = !isJobsExpanded;
                renderJobsTable();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                isJobsExpanded = false;
                renderJobsTable();
            });
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                isJobsExpanded = false;
                renderJobsTable();
            });
        }

        if (closeJobModalBtn) closeJobModalBtn.addEventListener('click', closeJobModal);
        if (jobModal) {
            jobModal.addEventListener('click', (e) => {
                if (e.target === jobModal) closeJobModal();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (jobModal && jobModal.classList.contains('open')) {
                    closeJobModal();
                }
                if (kpiModal && kpiModal.classList.contains('open')) {
                    closeKpiModal();
                }
            }
        });

        // Global opener for deep links and notifications
        window.openInstallerJobModal = openJobModal;

        // Reactive subscription: auto-updates KPI counts, My Jobs table, and KPI modal if open
        InstallerData.subscribe((evt) => {
            renderJobKpis();
            renderJobsTable();
            if (activeKpiCategory && kpiModal && kpiModal.classList.contains('open')) {
                renderKpiModalContent(activeKpiCategory);
            }
        });

        // Render initial view
        renderJobKpis();
        renderJobsTable();

        // Check for deep link in query string (?job=APP-1024 or ?job=JOB-2026-081)
        const urlParams = new URLSearchParams(window.location.search);
        const deepJob = urlParams.get('job');
        if (deepJob) {
            setTimeout(() => openJobModal(deepJob), 150);
        }
    }

    // --------------------------------------------------------------------------
    // 2. PAYOUTS VIEW LOGIC (payout.html)
    // --------------------------------------------------------------------------
    if (isPayoutPage && document.getElementById('payoutsTableBody')) {
        const tableBody = document.getElementById('payoutsTableBody');
        const searchInput = document.getElementById('payoutSearchInput');
        const statusFilter = document.getElementById('payoutStatusFilter');
        initCustomFilterDropdown(document.getElementById('payoutStatusFilterDropdown'));
        const btnExportCsv = document.getElementById('btnExportCsv');

        let isPayoutsExpanded = false;

        // Modal elements
        const payoutModal = document.getElementById('payoutModal');
        const modalPayoutTitle = document.getElementById('modalPayoutTitle');
        const modalPayoutSub = document.getElementById('modalPayoutSub');
        const closePayoutModalBtn = document.getElementById('closePayoutModal');
        const btnClosePayoutModal = document.getElementById('btnClosePayoutModal');
        const modalGrossAmount = document.getElementById('modalGrossAmount');
        const modalCwtDeduction = document.getElementById('modalCwtDeduction');
        const modalNetAmount = document.getElementById('modalNetAmount');
        const modalPayoutId = document.getElementById('modalPayoutId');
        const modalJobRef = document.getElementById('modalJobRef');
        const modalMilestoneStage = document.getElementById('modalMilestoneStage');
        const modalPayoutStatus = document.getElementById('modalPayoutStatus');
        const modalPayoutDate = document.getElementById('modalPayoutDate');
        const modalBankRef = document.getElementById('modalBankRef');
        const modalPayoutNote = document.getElementById('modalPayoutNote');
        const modalPayoutSupportBtn = document.getElementById('modalPayoutSupportBtn');

        // Helper to format compact payout dates for the main table (e.g. "Sep 12", "Est. Sep 20")
        function formatCompactPayoutDate(dateStr) {
            if (!dateStr) return '—';
            let s = String(dateStr).trim();
            let prefix = '';
            if (/^estimated\s+/i.test(s)) {
                prefix = 'Est. ';
                s = s.replace(/^estimated\s+/i, '');
            } else if (/^scheduled\s+for\s+/i.test(s)) {
                s = s.replace(/^scheduled\s+for\s+/i, '');
            }
            s = s.replace(/,\s*\d{4}$/, '');
            s = s.replace(/September|Sept\b/gi, 'Sep')
                .replace(/October/gi, 'Oct')
                .replace(/November/gi, 'Nov')
                .replace(/December/gi, 'Dec')
                .replace(/January/gi, 'Jan')
                .replace(/February/gi, 'Feb')
                .replace(/March/gi, 'Mar')
                .replace(/April/gi, 'Apr')
                .replace(/August/gi, 'Aug');
            return prefix + s;
        }

        // Render Payout KPI cards
        function renderPayoutKpis() {
            // Paid / Pending Review net totals and nearest future Scheduled payout (never a past date)
            const summary = InstallerData.getPayoutSummary();
            const next = summary.nextPayout;
            const nextReleaseText = next
                ? next.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'No payout scheduled';

            const statPaidTotalEl = document.getElementById('statPaidTotal');
            const statPendingTotalEl = document.getElementById('statPendingTotal');
            const statNextReleaseEl = document.getElementById('statNextRelease');
            const statNextReleaseSubEl = document.getElementById('statNextReleaseSub');

            if (statPaidTotalEl) statPaidTotalEl.textContent = InstallerData.formatMoney(summary.totalPaid);
            if (statPendingTotalEl) statPendingTotalEl.textContent = InstallerData.formatMoney(summary.totalPendingReview);
            if (statNextReleaseEl) {
                statNextReleaseEl.textContent = nextReleaseText;
                statNextReleaseEl.title = next
                    ? `${next.payId} · ${next.appId} · ${InstallerData.formatMoney(next.netAmount)}`
                    : 'No future payout with Scheduled status';
            }
            if (statNextReleaseSubEl) statNextReleaseSubEl.textContent = '';
        }

        function filterPayouts() {
            const status = (statusFilter?.value || 'ALL').trim();
            if (status === 'ALL') return payouts;
            return payouts.filter(p => (p.status || '').trim().toLowerCase() === status.toLowerCase());
        }

        function renderPayoutsTable() {
            const filtered = filterPayouts();
            const total = filtered.length;
            const paginationFooter = document.getElementById('payoutPaginationFooter');
            const seeMoreText = document.getElementById('seeMorePayoutsText');
            const toggleBtn = document.getElementById('btnTogglePayoutsExpand');

            // Limit to 3 items initially unless expanded
            const visiblePayouts = (!isPayoutsExpanded && total > 3) ? filtered.slice(0, 3) : filtered;

            if (paginationFooter) {
                if (total > 3) {
                    paginationFooter.style.display = 'flex';
                    if (isPayoutsExpanded) {
                        if (seeMoreText) seeMoreText.textContent = 'See less';
                        toggleBtn?.classList.add('expanded');
                    } else {
                        if (seeMoreText) seeMoreText.textContent = 'See more';
                        toggleBtn?.classList.remove('expanded');
                    }
                } else {
                    paginationFooter.style.display = 'none';
                }
            }

            if (total === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5">
                            <div class="table-empty">
                                <strong>No matching payout records found</strong>
                                <p>Try another filter selection to see other milestones.</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            tableBody.innerHTML = visiblePayouts.map(p => {
                const linkedJobId = p.jobId || p.job || '—';
                return `
                    <tr>
                        <td data-label="Job">
                            <div class="cell-primary">
                                <span class="payout-customer-name">${InstallerData.escapeHtml(p.customer || 'Client Site')}</span>
                                <span class="cell-sub payout-job-id">${InstallerData.escapeHtml(linkedJobId)} · ${InstallerData.escapeHtml(p.id)}</span>
                            </div>
                        </td>
                        <td data-label="Net Amount">
                            <span class="payout-table-amount">${InstallerData.formatMoney(p.netAmount)}</span>
                        </td>
                        <td data-label="Status">
                            ${InstallerData.renderStatusBadge(p.status)}
                        </td>
                        <td data-label="Date">
                            <span class="payout-table-date">${InstallerData.escapeHtml(formatCompactPayoutDate(p.date))}</span>
                        </td>
                        <td data-label="Action">
                            <button type="button" class="btn-action btn-view-payout-breakdown" data-payout-id="${p.id}" aria-label="View breakdown for ${InstallerData.escapeHtml(p.customer)}">
                                View
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        function openPayoutModal(payoutId) {
            const p = payouts.find(item => item.id === payoutId);
            if (!p) return;

            const linkedJobId = p.jobId || p.job || '—';
            if (modalPayoutTitle) modalPayoutTitle.textContent = 'Payout Breakdown';
            if (modalPayoutSub) modalPayoutSub.textContent = `${p.customer || 'Project Site'} · ${p.id}`;

            if (modalPayoutId) modalPayoutId.textContent = p.id;
            if (modalJobRef) modalJobRef.textContent = linkedJobId;
            if (modalMilestoneStage) modalMilestoneStage.textContent = p.milestone || 'Installation Milestone';

            if (modalGrossAmount) modalGrossAmount.textContent = InstallerData.formatMoney(p.grossAmount);
            if (modalCwtDeduction) modalCwtDeduction.textContent = `− ${InstallerData.formatMoney(p.cwtDeduction)}`;
            if (modalNetAmount) modalNetAmount.textContent = InstallerData.formatMoney(p.netAmount);

            if (modalPayoutStatus) modalPayoutStatus.innerHTML = InstallerData.renderStatusBadge(p.status);
            if (modalPayoutDate) modalPayoutDate.textContent = p.date || '—';
            if (modalBankRef) modalBankRef.textContent = p.refCode || 'Pending transfer batch';
            if (modalPayoutNote) modalPayoutNote.textContent = p.note || 'Milestone labor payout recorded for field technical operations.';

            if (modalPayoutSupportBtn) {
                modalPayoutSupportBtn.href = `support.html?topic=Payout%20%26%20BIR%202307&reference=${encodeURIComponent(p.id)}`;
            }

            payoutModal.classList.add('open');
            payoutModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }

        function closePayoutModal() {
            if (!payoutModal) return;
            payoutModal.classList.remove('open');
            payoutModal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        // Export ALL matching filtered payouts (including collapsed rows)
        if (btnExportCsv) {
            btnExportCsv.addEventListener('click', () => {
                const filtered = filterPayouts();
                if (filtered.length === 0) {
                    alert('No payout records match the current filter to export.');
                    return;
                }

                const headers = ['Payout ID', 'Linked APP ID', 'Customer', 'Milestone Stage', 'Gross Labor (PHP)', '2% CWT Deduction (PHP)', 'Net Payout (PHP)', 'Status', 'Date', 'Bank Reference', 'Audit Notes'];
                const csvRows = [headers.join(',')];

                filtered.forEach(p => {
                    const linkedJobId = p.jobId || p.job || '';
                    const row = [
                        `"${p.id}"`,
                        `"${linkedJobId}"`,
                        `"${(p.customer || '').replace(/"/g, '""')}"`,
                        `"${(p.milestone || '').replace(/"/g, '""')}"`,
                        p.grossAmount,
                        p.cwtDeduction,
                        p.netAmount,
                        `"${p.status}"`,
                        `"${p.date}"`,
                        `"${p.refCode || ''}"`,
                        `"${(p.note || '').replace(/"/g, '""')}"`
                    ];
                    csvRows.push(row.join(','));
                });

                const csvContent = '\uFEFF' + csvRows.join('\r\n');
                InstallerData.downloadFile(`Hello_Solar_Payouts_${new Date().toISOString().slice(0, 10)}.csv`, csvContent, 'text/csv;charset=utf-8;');
            });
        }

        const togglePayoutsExpandBtn = document.getElementById('btnTogglePayoutsExpand');
        if (togglePayoutsExpandBtn) {
            togglePayoutsExpandBtn.addEventListener('click', () => {
                isPayoutsExpanded = !isPayoutsExpanded;
                renderPayoutsTable();
            });
        }

        document.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-payout-id]');
            if (btn) {
                openPayoutModal(btn.getAttribute('data-payout-id'));
            }
        });

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                isPayoutsExpanded = false;
                renderPayoutsTable();
            });
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                isPayoutsExpanded = false;
                renderPayoutsTable();
            });
        }

        if (closePayoutModalBtn) closePayoutModalBtn.addEventListener('click', closePayoutModal);
        if (btnClosePayoutModal) btnClosePayoutModal.addEventListener('click', closePayoutModal);
        if (payoutModal) {
            payoutModal.addEventListener('click', (e) => {
                if (e.target === payoutModal) closePayoutModal();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && payoutModal && payoutModal.classList.contains('open')) {
                closePayoutModal();
            }
        });

        window.openInstallerPayoutModal = openPayoutModal;

        renderPayoutKpis();
        renderPayoutsTable();

        const urlParams = new URLSearchParams(window.location.search);
        const deepPayout = urlParams.get('payout');
        if (deepPayout) {
            setTimeout(() => openPayoutModal(deepPayout), 150);
        }
    }

    // --------------------------------------------------------------------------
    // 3. SUPPORT VIEW LOGIC (support.html)
    // --------------------------------------------------------------------------
    if (isSupportPage && document.getElementById('supportForm')) {
        const form = document.getElementById('supportForm');
        const topicSelect = document.getElementById('supportTopic');
        const refInput = document.getElementById('supportRef');
        const subjectInput = document.getElementById('supportSubject');
        const detailsInput = document.getElementById('supportDetails');
        const statusMsg = document.getElementById('supportStatusMsg');
        const btnSaveDraft = document.getElementById('btnSaveDraft');
        const btnDownloadDraft = document.getElementById('btnDownloadDraft');
        const faqList = document.getElementById('faqList');
        const faqSearchInput = document.getElementById('faqSearchInput');
        const faqToggle = document.getElementById('faqToggle');
        let faqsExpanded = false;

        const DRAFT_KEY = 'hello_solar_installer_support_draft';

        // Auto-save helper for preservation across navigation & context changes
        function autoSaveDraft() {
            const draft = {
                topic: topicSelect?.value || '',
                reference: refInput?.value || '',
                subject: subjectInput?.value || '',
                details: detailsInput?.value || '',
                updatedAt: new Date().toISOString()
            };
            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
                return true;
            } catch (e) {
                if (statusMsg) {
                    statusMsg.textContent = 'Unable to save on this device. Download your request to keep a copy.';
                    statusMsg.className = 'status-msg-error';
                }
                return false;
            }
        }

        // Attach auto-save to input & change events
        [topicSelect, refInput, subjectInput, detailsInput].forEach(field => {
            if (field) {
                field.addEventListener('input', () => {
                    autoSaveDraft();
                    if (statusMsg && statusMsg.textContent && statusMsg.className === 'status-msg-success') {
                        clearTimeout(statusClearTimer);
                        statusMsg.textContent = '';
                        statusMsg.className = '';
                    }
                });
                field.addEventListener('change', autoSaveDraft);
            }
        });

        // Parse query params for pre-filling
        const params = new URLSearchParams(window.location.search);
        const qTopic = params.get('topic');
        const qRef = params.get('reference');

        // Restore draft from storage
        try {
            const savedDraft = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
            if (savedDraft.subject && !subjectInput.value) subjectInput.value = savedDraft.subject;
            if (savedDraft.details && !detailsInput.value) detailsInput.value = savedDraft.details;
            if (savedDraft.reference && !refInput.value) refInput.value = savedDraft.reference;
            if (savedDraft.topic && topicSelect && !qTopic) topicSelect.value = savedDraft.topic;
        } catch (e) { }

        if (qTopic && topicSelect) {
            for (let i = 0; i < topicSelect.options.length; i++) {
                if (topicSelect.options[i].value.toLowerCase().includes(qTopic.toLowerCase())) {
                    topicSelect.selectedIndex = i;
                    break;
                }
            }
        }
        if (qRef && refInput) {
            refInput.value = qRef;
        }

        // --------------------------------------------------------------------------
        // Custom Accessible Dropdown Handler for Support Topic
        // --------------------------------------------------------------------------
        const topicDropdown = document.getElementById('supportTopicDropdown');
        function syncTopicDropdown(val) {
            if (!topicDropdown) return;
            const selectedText = document.getElementById('supportTopicSelected');
            const items = topicDropdown.querySelectorAll('.custom-dropdown-item');
            items.forEach(it => {
                const itemVal = it.getAttribute('data-value');
                if (itemVal === val) {
                    it.classList.add('active');
                    it.setAttribute('aria-selected', 'true');
                    const textEl = it.querySelector('.custom-dropdown-item-text');
                    if (selectedText) selectedText.textContent = textEl ? textEl.textContent.trim() : itemVal;
                } else {
                    it.classList.remove('active');
                    it.setAttribute('aria-selected', 'false');
                }
            });
        }

        if (topicDropdown) {
            const trigger = topicDropdown.querySelector('.custom-dropdown-trigger');
            const items = topicDropdown.querySelectorAll('.custom-dropdown-item');
            const selectedText = topicDropdown.querySelector('.custom-dropdown-selected');

            function toggleTopicDropdown(force) {
                const isOpen = typeof force === 'boolean' ? force : !topicDropdown.classList.contains('open');
                topicDropdown.classList.toggle('open', isOpen);
                if (trigger) trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            }

            if (trigger) {
                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleTopicDropdown();
                });
                trigger.addEventListener('keydown', (e) => {
                    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleTopicDropdown(true);
                        const activeItem = topicDropdown.querySelector('.custom-dropdown-item.active') || items[0];
                        if (activeItem) activeItem.focus();
                    } else if (e.key === 'Escape') {
                        toggleTopicDropdown(false);
                    }
                });
            }

            items.forEach((item, index) => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const val = item.getAttribute('data-value');
                    const textEl = item.querySelector('.custom-dropdown-item-text');
                    const label = textEl ? textEl.textContent.trim() : val;
                    if (selectedText) selectedText.textContent = label;
                    if (topicSelect) {
                        topicSelect.value = val;
                        topicSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    items.forEach(it => {
                        it.classList.remove('active');
                        it.setAttribute('aria-selected', 'false');
                    });
                    item.classList.add('active');
                    item.setAttribute('aria-selected', 'true');
                    toggleTopicDropdown(false);
                    if (trigger) trigger.focus();
                });

                item.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        item.click();
                    } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        const next = items[index + 1] || items[0];
                        if (next) next.focus();
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const prev = items[index - 1] || items[items.length - 1];
                        if (prev) prev.focus();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        toggleTopicDropdown(false);
                        if (trigger) trigger.focus();
                    }
                });
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('#supportTopicDropdown')) {
                    toggleTopicDropdown(false);
                }
            });

            if (topicSelect) {
                topicSelect.addEventListener('change', () => syncTopicDropdown(topicSelect.value));
                syncTopicDropdown(topicSelect.value);
            }
        }

        // Common Answers FAQ Modal
        const btnToggleFaq = document.getElementById('btnToggleFaq');
        const faqModal = document.getElementById('faqModal');
        const closeFaqModal = document.getElementById('closeFaqModal');
        const btnCloseFaqModalFooter = document.getElementById('btnCloseFaqModalFooter');

        function openFaqModal() {
            if (!faqModal) return;
            faqModal.classList.add('open');
            faqModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            renderFaqs();
            if (faqSearchInput) setTimeout(() => faqSearchInput.focus(), 150);
        }

        function closeFaqModalDialog() {
            if (!faqModal) return;
            faqModal.classList.remove('open');
            faqModal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        if (btnToggleFaq) {
            btnToggleFaq.addEventListener('click', openFaqModal);
        }
        if (closeFaqModal) {
            closeFaqModal.addEventListener('click', closeFaqModalDialog);
        }
        if (btnCloseFaqModalFooter) {
            btnCloseFaqModalFooter.addEventListener('click', closeFaqModalDialog);
        }
        if (faqModal) {
            faqModal.addEventListener('click', (e) => {
                if (e.target === faqModal) closeFaqModalDialog();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && faqModal.classList.contains('open')) {
                    closeFaqModalDialog();
                }
            });
        }

        // Category Cards click handlers (if present)
        const categoryCards = document.querySelectorAll('.category-card');
        if (categoryCards.length > 0) {
            categoryCards.forEach(card => {
                card.setAttribute('role', 'button');
                card.tabIndex = 0;
                card.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        card.click();
                    }
                });
                card.addEventListener('click', () => {
                    const cat = card.getAttribute('data-category');
                    if (cat && topicSelect) {
                        for (let i = 0; i < topicSelect.options.length; i++) {
                            if (topicSelect.options[i].value.toLowerCase().includes(cat.toLowerCase())) {
                                topicSelect.selectedIndex = i;
                                break;
                            }
                        }
                        topicSelect.dispatchEvent(new Event('change', { bubbles: true }));
                        autoSaveDraft();
                        detailsInput?.focus();
                    }
                });
            });

            function updateSelectedCategory() {
                categoryCards.forEach(card => {
                    card.setAttribute('aria-pressed', String(card.dataset.category === topicSelect.value));
                });
            }
            topicSelect.addEventListener('change', updateSelectedCategory);
            categoryCards.forEach(card => card.addEventListener('click', updateSelectedCategory));
            updateSelectedCategory();
        }

        let statusClearTimer = null;

        // Primary Support Submission Action (Send Request)
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const topic = topicSelect?.value || 'Site Access & Scheduling';
                const ref = refInput?.value.trim() || '';
                const details = detailsInput?.value.trim() || '';

                if (!details) {
                    if (statusMsg) {
                        statusMsg.textContent = 'Please tell us what you need help with.';
                        statusMsg.className = 'status-msg-error';
                    }
                    detailsInput?.focus();
                    return;
                }

                // Sync derived subject for backend compatibility
                if (subjectInput) {
                    subjectInput.value = `[${topic}]${ref ? ' ' + ref : ''} Support Request`;
                }

                // Save the request record (local + shared Super Admin store)
                const result = InstallerData.submitSupportRequest({
                    topic,
                    reference: ref,
                    details,
                    subject: subjectInput?.value || ''
                });
                if (!result.success) {
                    if (statusMsg) {
                        statusMsg.textContent = result.error;
                        statusMsg.className = 'status-msg-error';
                    }
                    return;
                }

                // Clear the submitted message and its saved draft
                if (detailsInput) detailsInput.value = '';
                try { localStorage.removeItem(DRAFT_KEY); } catch (err) { }

                if (statusMsg) {
                    statusMsg.textContent = `✓ Request ${result.record.id} sent to Hello Solar Dispatch! Our coordinator will review and contact you shortly.`;
                    statusMsg.className = 'status-msg-success';
                    clearTimeout(statusClearTimer);
                    statusClearTimer = setTimeout(() => {
                        if (statusMsg) {
                            statusMsg.textContent = '';
                            statusMsg.className = '';
                        }
                    }, 7000);
                }

                if (window.HelloSolarProfile && typeof window.HelloSolarProfile.showToast === 'function') {
                    window.HelloSolarProfile.showToast(`Request ${result.record.id} sent to Hello Solar Dispatch! ✓`);
                }
            });
        }

        // Download Request as .txt file
        if (btnDownloadDraft) {
            btnDownloadDraft.addEventListener('click', () => {
                const topic = topicSelect?.value || 'General';
                const ref = refInput?.value.trim() || 'None Specified';
                const subject = subjectInput?.value.trim() || 'Untitled Request';
                const details = detailsInput?.value.trim() || 'No details provided.';

                const content = [
                    'HELLO SOLAR INSTALLER PORTAL — DISPATCH REQUEST',
                    '====================================================',
                    `Generated: ${new Date().toLocaleString('en-PH')}`,
                    `Installer: ${userProfile.fullName || 'Installer Team'} (${userProfile.businessName || 'SolarTech'})`,
                    '',
                    `Inquiry Topic: ${topic}`,
                    `Reference ID:  ${ref}`,
                    `Subject:       ${subject}`,
                    '',
                    'MESSAGE DETAILS:',
                    '----------------------------------------------------',
                    details,
                    '',
                    '====================================================',
                    'NOTE: This draft was generated from your local browser.',
                    'Copy and send via Hello Solar Dispatch SMS / Viber group.'
                ].join('\r\n');

                InstallerData.downloadFile(`Installer_Request_${ref.replace(/[^a-zA-Z0-9]/g, '_')}.txt`, content, 'text/plain;charset=utf-8;');
            });
        }

        // Render Searchable FAQs
        function renderFaqs() {
            if (!faqList) return;
            const query = (faqSearchInput?.value || '').toLowerCase().trim();

            const filtered = faqs.filter(item => {
                if (!query) return true;
                return item.q.toLowerCase().includes(query) ||
                    item.a.toLowerCase().includes(query) ||
                    item.category.toLowerCase().includes(query);
            });

            if (faqToggle) {
                faqToggle.hidden = Boolean(query) || filtered.length <= 3;
                faqToggle.textContent = faqsExpanded ? 'See less' : 'See more';
                faqToggle.setAttribute('aria-expanded', String(faqsExpanded));
            }

            if (filtered.length === 0) {
                faqList.innerHTML = `
                    <div class="table-empty" style="padding: 24px 10px;">
                        <strong>No answers match your search</strong>
                        <p>Try searching for keywords like "schedule", "payout", "CWT", or "accreditation".</p>
                    </div>
                `;
                return;
            }

            const visible = query || faqsExpanded ? filtered : filtered.slice(0, 3);
            faqList.innerHTML = visible.map(item => `
                <details class="faq-item">
                    <summary>
                        <span>${InstallerData.escapeHtml(item.q)}</span>
                        <svg class="accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                    </summary>
                    <div class="faq-answer">
                        <span style="display: inline-block; font-size: 11px; font-weight: 700; color: var(--solar-orange); text-transform: uppercase; margin-bottom: 6px;">
                            ${InstallerData.escapeHtml(item.category)}
                        </span>
                        <p>${InstallerData.escapeHtml(item.a)}</p>
                    </div>
                </details>
            `).join('');
        }

        if (faqSearchInput) {
            faqSearchInput.addEventListener('input', renderFaqs);
        }
        faqToggle?.addEventListener('click', () => {
            faqsExpanded = !faqsExpanded;
            renderFaqs();
        });

        renderFaqs();
    }

    // --------------------------------------------------------------------------
    // 4. COMPACT PREVIEW DATA LOADER ACCORDION (On all authenticated pages)
    // --------------------------------------------------------------------------
    const jsonFileInput = document.getElementById('jsonFileInput');
    const btnResetJson = document.getElementById('btnResetJsonOverride');
    const jsonStatusAlert = document.getElementById('jsonStatusAlert');

    if (jsonFileInput) {
        jsonFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsed = JSON.parse(event.target.result);
                    const result = InstallerData.saveOverride(parsed);

                    if (result.valid) {
                        if (jsonStatusAlert) {
                            jsonStatusAlert.className = 'json-status-alert success';
                            jsonStatusAlert.textContent = '✓ Validated and loaded edited installer dataset successfully. Refreshing view...';
                        }
                        setTimeout(() => window.location.reload(), 800);
                    } else {
                        if (jsonStatusAlert) {
                            jsonStatusAlert.className = 'json-status-alert error';
                            jsonStatusAlert.innerHTML = `<strong>Validation Error:</strong><br>${result.errors.join('<br>')}`;
                        }
                    }
                } catch (err) {
                    if (jsonStatusAlert) {
                        jsonStatusAlert.className = 'json-status-alert error';
                        jsonStatusAlert.textContent = `Invalid JSON format: ${err.message}`;
                    }
                }
            };
            reader.readAsText(file);
        });
    }

    if (btnResetJson) {
        btnResetJson.addEventListener('click', () => {
            InstallerData.resetOverride();
            if (jsonStatusAlert) {
                jsonStatusAlert.className = 'json-status-alert success';
                jsonStatusAlert.textContent = 'Reset to default installer.json dataset. Refreshing...';
            }
            setTimeout(() => window.location.reload(), 600);
        });
    }
});
