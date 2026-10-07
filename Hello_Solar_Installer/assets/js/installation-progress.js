/**
 * Hello Solar Installer Portal - Installation Progress Modal
 * Reference Number, Battery, Inverter, Solar Panel details and Installation Progress
 * for accepted jobs. Data is read/written via InstallerData (keyed by APP ID and
 * mirrored to the shared Super Admin application record).
 */
(function () {
    'use strict';

    const modal = document.getElementById('progressModal');
    const form = document.getElementById('progressForm');
    if (!modal || !form || typeof InstallerData === 'undefined') return;

    const $ = (id) => document.getElementById(id);
    const alertEl = $('progressFormAlert');
    const percentEl = $('pfPercent');
    const stageEl = $('pfStage');
    const barEl = $('pfProgressBar');
    const hintEl = $('pfPercentHint');
    const saveBtn = $('btnSaveProgressModal');
    const groupInputs = () => form.querySelectorAll('[data-group][data-key]');

    let activeJobId = null;
    let lastFocus = null;

    // Stage options from the data layer
    (InstallerData.INSTALL_PROGRESS_STAGES || []).forEach(stage => {
        const opt = document.createElement('option');
        opt.value = stage;
        opt.textContent = stage;
        stageEl.appendChild(opt);
    });

    function showAlert(message, type) {
        alertEl.textContent = message || '';
        alertEl.dataset.type = type || 'error';
        alertEl.hidden = !message;
    }

    function updateBar() {
        const pct = Math.min(100, Math.max(0, parseInt(percentEl.value, 10) || 0));
        barEl.style.width = `${pct}%`;
    }

    function formatDate(iso) {
        const d = iso ? new Date(iso) : null;
        return d && !isNaN(d)
            ? d.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
            : '';
    }

    // View Progress: show saved values as clean text instead of empty disabled fields
    function renderReadOnly(readOnly) {
        form.classList.toggle('is-readonly', readOnly);
        form.querySelectorAll('.progress-field').forEach(field => {
            const control = field.querySelector('input, select, textarea');
            if (!control) return;
            let ro = field.querySelector('.progress-ro');
            if (!readOnly) {
                if (ro) ro.remove();
                return;
            }
            if (!ro) {
                ro = document.createElement('div');
                ro.className = 'progress-ro';
                control.insertAdjacentElement('afterend', ro);
            }
            let value = String(control.value || '').trim();
            if (control === percentEl) value = `${parseInt(value, 10) || 0}%`;
            else if (value && control.dataset.unit) value = `${value} ${control.dataset.unit}`;
            ro.textContent = value || 'Not provided';
            ro.classList.toggle('is-empty', !value);
        });
    }

    function openProgressModal(jobId) {
        const job = InstallerData.getJobById(jobId);
        if (!job || !InstallerData.canShowProgress(job)) return;
        const record = InstallerData.getInstallationProgress(jobId);
        if (!record) return;

        activeJobId = job.id;
        lastFocus = document.activeElement;
        const editable = InstallerData.canEditProgress(job);
        const installing = String(job.installationStatus || '').toUpperCase() === 'INSTALLATION_IN_PROGRESS';

        $('progressModalAppId').textContent = record.appId;
        $('progressModalSub').textContent = `${job.customer || 'Customer'} · ${job.system || ''}`.trim();
        $('progressModalTitle').textContent = editable ? 'Update Progress' : 'View Progress';

        $('pfReference').value = record.referenceNumber || '';
        groupInputs().forEach(input => {
            const group = record[input.dataset.group] || {};
            input.value = group[input.dataset.key] ?? '';
        });
        percentEl.value = record.progress.percent ?? (job.progress || 0);
        stageEl.value = record.progress.stage || '';
        $('pfNotes').value = record.progress.notes || '';
        updateBar();

        // Read-only once installation is no longer ongoing; while AWAITING_INSTALLATION only
        // Reference Number + equipment are editable and progress stays at 0%.
        form.querySelectorAll('input, select, textarea').forEach(el => { el.disabled = !editable; });
        const progressLocked = !editable || !installing;
        [percentEl, stageEl, $('pfNotes')].forEach(el => { el.disabled = progressLocked; });
        hintEl.textContent = !editable
            ? 'Installation is completed — progress details are view only.'
            : (installing
                ? 'Use "Mark Installation Complete" to finish the installation (100%).'
                : 'Progress stays at 0% until you click Start Installation. Reference Number and equipment details can be saved now.');
        renderReadOnly(!editable);
        saveBtn.hidden = !editable;

        $('progressLastUpdated').textContent = record.updatedAt
            ? `Last updated ${formatDate(record.updatedAt)}${record.updatedBy?.name ? ` by ${record.updatedBy.name}` : ''}`
            : 'No progress saved yet.';

        showAlert('');
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        setTimeout(() => (editable ? $('pfReference') : $('closeProgressModal')).focus(), 50);
    }

    function closeProgressModal() {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        const jobModal = document.getElementById('jobModal');
        if (!jobModal || !jobModal.classList.contains('open')) document.body.style.overflow = '';
        activeJobId = null;
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    }

    function collectPayload() {
        const payload = {
            referenceNumber: $('pfReference').value,
            battery: {}, inverter: {}, solarPanels: {},
            progress: { stage: stageEl.value, notes: $('pfNotes').value }
        };
        groupInputs().forEach(input => { payload[input.dataset.group][input.dataset.key] = input.value; });
        if (!percentEl.disabled) payload.progress.percent = percentEl.value;
        return payload;
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!activeJobId) return;
        const jobId = activeJobId;
        const result = InstallerData.saveInstallationProgress(jobId, collectPayload());
        if (!result.success) {
            showAlert(result.error, 'error');
            if (/reference/i.test(result.error)) $('pfReference').focus();
            else if (/progress/i.test(result.error)) percentEl.focus();
            return;
        }
        showAlert('Installation progress saved.', 'success');
        $('progressLastUpdated').textContent =
            `Last updated ${formatDate(result.record.updatedAt)} by ${result.record.updatedBy.name}`;

        // Refresh the job details modal underneath, if it shows this job
        const jobModal = document.getElementById('jobModal');
        if (jobModal && jobModal.classList.contains('open') && typeof window.openInstallerJobModal === 'function') {
            window.openInstallerJobModal(jobId);
        }
    });

    percentEl.addEventListener('input', updateBar);

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-job-progress');
        if (btn) {
            e.preventDefault();
            e.stopPropagation();
            openProgressModal(btn.getAttribute('data-job-id'));
            return;
        }
        if (e.target === modal) closeProgressModal();
    });

    $('closeProgressModal').addEventListener('click', closeProgressModal);
    $('btnCancelProgressModal').addEventListener('click', closeProgressModal);

    // Escape closes only the top-most Progress modal (job modal stays open)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) {
            e.stopImmediatePropagation();
            closeProgressModal();
        }
    }, true);

    window.openInstallationProgressModal = openProgressModal;
})();
