/** Applications page: pipeline search, filters, counts and mobile shortcuts.
 * Shared underwriting/documents are initialized by portal.js. */
document.addEventListener("DOMContentLoaded", () => {
    // --------------------------------------------------------------------------
    // 6. PIPELINE SEARCH & FILTERS (APPLICATIONS)
    // --------------------------------------------------------------------------
    const appSearchInput = document.getElementById("appSearchInput");
    const statusFilterTabs = document.getElementById("statusFilterTabs");
    const systemSizeSelect = document.getElementById("systemSizeSelect");
    const appTable = document.getElementById("applicationsTable");
    const toggleAppRowsBtn = document.getElementById("toggleAppRowsBtn");
    const toggleAppRowsText = document.getElementById("toggleAppRowsText");
    let isAppsExpanded = false;

    function getStatusMeta(app) {
        const finStatus = (app.financingStatus || "").toUpperCase();
        const loanStatus = (app.loan?.status || "").toLowerCase();

        if (finStatus === "APPROVED" || loanStatus === "approved" || loanStatus === "disbursed") {
            return { key: "approved", label: "Approved", badgeClass: "badge-approved" };
        }
        if (finStatus === "DECLINED" || loanStatus === "rejected") {
            return { key: "rejected", label: "Declined", badgeClass: "badge-rejected" };
        }
        if (finStatus === "DOCUMENTS_REQUIRED" || loanStatus === "docs_required") {
            return { key: "docs_required", label: "Documents Required", badgeClass: "badge-docs-required" };
        }
        if (finStatus === "UNDER_REVIEW" || loanStatus === "review") {
            return { key: "review", label: "Under Review", badgeClass: "badge-review" };
        }
        return { key: "pending", label: "Financing Review", badgeClass: "badge-pending" };
    }

    // --------------------------------------------------------------------------
    // KPI CARDS — computed from the same shared application records as the table
    // --------------------------------------------------------------------------
    const ONGOING_INSTALLATION_STATUSES = ["AWAITING_INSTALLATION", "INSTALLATION_IN_PROGRESS"];
    const normalizeStatus = (s) => String(s || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

    // Applications assigned to the signed-in financer (HelloSolarStore scopes them by session.accountId)
    function getFinancerApplications() {
        const store = window.HelloSolarStore;
        if (!store || typeof store.getInstallmentApplications !== "function") return [];
        const apps = store.getInstallmentApplications();
        return Array.isArray(apps) ? apps : [];
    }

    function computeApplicationKpis(apps) {
        // Approved uses the exact status mapping as the table badges / "Approved" filter tab
        const approved = apps.filter((app) => getStatusMeta(app).key === "approved");
        const ongoing = approved.filter((app) => ONGOING_INSTALLATION_STATUSES.includes(normalizeStatus(app.installationStatus)));
        return {
            customerApplications: apps.length,
            approvedFinancing: approved.length,
            ongoingInstallation: ongoing.length
        };
    }

    function updateApplicationKpis(apps) {
        const list = Array.isArray(apps) ? apps : getFinancerApplications();
        const kpis = computeApplicationKpis(list);
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value.toLocaleString();
        };
        setValue("appKpiCustomerApps", kpis.customerApplications);
        setValue("appKpiApprovedFinancing", kpis.approvedFinancing);
        setValue("appKpiOngoingInstallation", kpis.ongoingInstallation);
        return kpis;
    }

    function renderApplicationsTable() {
        if (!appTable) {
            updateApplicationKpis();
            return;
        }
        const tbody = appTable.querySelector("tbody");
        if (!tbody) return;

        // Fetch single source of truth - strictly only Installment applications
        if (window.HelloSolarStore && typeof window.HelloSolarStore.getInstallmentApplications === "function") {
            const apps = getFinancerApplications();
            updateApplicationKpis(apps);
            {
                // Only the signed-in financer's shared applications; an empty list shows the empty state
                tbody.innerHTML = apps.map((app) => {
                    const statusMeta = getStatusMeta(app);
                    const size = app.system?.sizeCategory || "standard";
                    const borrower = app.applicant?.name || "Applicant";
                    const location = app.applicant?.location || "";
                    const searchStr = `${app.id} ${borrower} ${location}`.trim();
                    // Shared APP document record (same record as the Customer portal) — no separate checklist
                    const docs = window.getApplicationDocuments ? window.getApplicationDocuments(app) : [];
                    const passedDocs = docs.filter(d => d.submitted).length;
                    const totalDocs = docs.length;

                    return `
                        <tr data-status="${statusMeta.key}" data-size="${size}" data-appid="${app.id}"
                            data-borrower="${borrower}" data-search="${searchStr}">
                            <td data-label="Applicant ID">
                                <button type="button" class="btn-applicant-id" data-appid="${app.id}"
                                    data-name="${borrower}"
                                    title="Review applicant details for ${app.id}">
                                    <span class="table-applicant-name">${app.id}</span>
                                    <span class="table-applicant-sub">${borrower}${location ? ` · ${location}` : ""}</span>
                                </button>
                            </td>
                            <td data-label="Current Status" class="text-center">
                                <span class="badge ${statusMeta.badgeClass}">${statusMeta.label}</span>
                            </td>
                            <td data-label="Documents" class="text-center">
                                <button type="button" class="doc-status-text-btn" data-appid="${app.id}"
                                    title="View documents checklist for ${app.id}"
                                    aria-label="View documents checklist for ${app.id}: ${passedDocs}/${totalDocs} submitted">${passedDocs}/${totalDocs}</button>
                            </td>
                            <td data-label="Action" class="table-action-cell text-center">
                                <div class="portal-decisions">
                                    <button type="button" class="btn btn-review-action btn-underwrite"
                                        data-trigger-review data-appid="${app.id}" data-name="${borrower}"
                                        title="Review financing application for ${app.id}">Review</button>
                                    <button type="button" class="btn-decision-proxy" data-decision="approved" data-appid="${app.id}" hidden style="display:none !important;" aria-hidden="true"></button>
                                    <button type="button" class="btn-decision-proxy" data-decision="rejected" data-appid="${app.id}" hidden style="display:none !important;" aria-hidden="true"></button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join("");
            }
        }

        updateAppTabCounts();
        filterApplications();
    }

    function updateAppTabCounts() {
        if (!appTable || !statusFilterTabs) return;
        const allRows = appTable.querySelectorAll("tbody tr");
        let pending = 0;
        let docsRequired = 0;
        let review = 0;
        let approved = 0;
        let rejected = 0;

        allRows.forEach((r) => {
            const s = r.dataset.status;
            if (s === "pending") pending++;
            else if (s === "docs_required") docsRequired++;
            else if (s === "review") review++;
            else if (s === "approved" || s === "disbursed") approved++;
            else if (s === "rejected") rejected++;
        });

        const total = allRows.length;
        const tabAll = statusFilterTabs.querySelector('[data-filter="all"]');
        const tabPending = statusFilterTabs.querySelector('[data-filter="pending"]');
        const tabDocsRequired = statusFilterTabs.querySelector('[data-filter="docs_required"]');
        const tabReview = statusFilterTabs.querySelector('[data-filter="review"]');
        const tabApproved = statusFilterTabs.querySelector('[data-filter="approved"]');
        const tabRejected = statusFilterTabs.querySelector('[data-filter="rejected"]');

        if (tabAll) tabAll.textContent = `All Applications (${total})`;
        if (tabPending) tabPending.textContent = `Financing Review (${pending})`;
        if (tabDocsRequired) tabDocsRequired.textContent = `Documents Required (${docsRequired})`;
        if (tabReview) tabReview.textContent = `Under Review (${review})`;
        if (tabApproved) tabApproved.textContent = `Approved (${approved})`;
        if (tabRejected) tabRejected.textContent = `Declined (${rejected})`;
    }

    function filterApplications() {
        if (!appTable) return;
        const query = (appSearchInput ? appSearchInput.value.toLowerCase().trim() : "");
        const activeTab = statusFilterTabs ? statusFilterTabs.querySelector(".filter-tab.active") : null;
        const statusFilter = activeTab ? activeTab.dataset.filter : "all";
        const sizeFilter = systemSizeSelect ? systemSizeSelect.value : "all";

        const rows = Array.from(appTable.querySelectorAll("tbody tr"));
        const matchingRows = [];

        rows.forEach((row) => {
            const rowText = (row.textContent + " " + (row.dataset.search || "")).toLowerCase();
            const matchesQuery = !query || rowText.includes(query);
            let matchesStatus = (statusFilter === "all");
            if (!matchesStatus) {
                if (statusFilter === "approved") {
                    matchesStatus = (row.dataset.status === "approved" || row.dataset.status === "disbursed" || rowText.includes("disbursed") || rowText.includes("approved"));
                } else {
                    matchesStatus = (row.dataset.status === statusFilter);
                }
            }
            const matchesSize = (sizeFilter === "all") || (row.dataset.size === sizeFilter);

            if (matchesQuery && matchesStatus && matchesSize) {
                matchingRows.push(row);
            } else {
                row.style.setProperty("display", "none", "important");
                row.hidden = true;
                row.setAttribute("hidden", "");
                row.classList.add("is-hidden");
            }
        });

        // Visible limit: 3 rows initially, or all matching if expanded
        const limit = isAppsExpanded ? matchingRows.length : 3;
        matchingRows.forEach((row, idx) => {
            if (idx < limit) {
                row.style.removeProperty("display");
                row.hidden = false;
                row.removeAttribute("hidden");
                row.classList.remove("is-hidden");
            } else {
                row.style.setProperty("display", "none", "important");
                row.hidden = true;
                row.setAttribute("hidden", "");
                row.classList.add("is-hidden");
            }
        });

        const footerAction = document.getElementById("appsPaginationFooter") || (toggleAppRowsBtn ? toggleAppRowsBtn.closest(".panel-footer-action") : null);
        if (toggleAppRowsBtn) {
            if (matchingRows.length > 3) {
                if (footerAction) footerAction.style.setProperty("display", "flex", "important");
                toggleAppRowsBtn.style.setProperty("display", "inline-flex", "important");
                toggleAppRowsBtn.setAttribute("aria-expanded", String(isAppsExpanded));
                toggleAppRowsBtn.classList.toggle("expanded", isAppsExpanded);
                if (toggleAppRowsText) {
                    const remaining = matchingRows.length - 3;
                    toggleAppRowsText.textContent = isAppsExpanded
                        ? "See less"
                        : `See more (${remaining} more application${remaining === 1 ? "" : "s"})`;
                }
            } else {
                if (footerAction) footerAction.style.setProperty("display", "none", "important");
                toggleAppRowsBtn.style.setProperty("display", "none", "important");
            }
        }

        const recordsCount = document.getElementById("appsRecordsCount");
        if (recordsCount) {
            recordsCount.textContent = `${matchingRows.length} application${matchingRows.length === 1 ? "" : "s"}`;
        }

        const emptyState = document.getElementById("appsEmptyState");
        if (emptyState) {
            emptyState.style.display = (matchingRows.length === 0) ? "block" : "none";
        }
    }

    if (toggleAppRowsBtn) {
        toggleAppRowsBtn.addEventListener("click", (e) => {
            e.preventDefault();
            isAppsExpanded = !isAppsExpanded;
            filterApplications();
        });
    }

    if (appSearchInput) {
        appSearchInput.addEventListener("input", () => {
            isAppsExpanded = false;
            filterApplications();
        });
    }

    if (statusFilterTabs) {
        const tabs = statusFilterTabs.querySelectorAll(".filter-tab");
        tabs.forEach((tab) => {
            tab.addEventListener("click", (e) => {
                e.preventDefault();
                tabs.forEach((t) => {
                    t.classList.remove("active");
                    t.setAttribute("aria-selected", "false");
                });
                tab.classList.add("active");
                tab.setAttribute("aria-selected", "true");
                isAppsExpanded = false;
                filterApplications();
            });
        });
    }

    if (systemSizeSelect) {
        systemSizeSelect.addEventListener("change", () => {
            isAppsExpanded = false;
            filterApplications();
        });
    }

    // Initialize application tab counts, KPI cards and initial filter display
    renderApplicationsTable();

    // Keep KPI cards in sync with the shared records when they change outside this page's own actions
    // (another tab/portal writing shared storage, installer status updates, back/forward cache restores).
    // In-page financing decisions already re-run renderApplicationsTable() via portal.js.
    window.addEventListener("storage", () => updateApplicationKpis());
    window.addEventListener("hellosolar:installation-updated", () => updateApplicationKpis());
    window.addEventListener("pageshow", (e) => { if (e.persisted) updateApplicationKpis(); });

    // Expose helpers globally for dashboard or cross-component interoperability
    window.renderApplicationsTable = renderApplicationsTable;
    window.updateAppTabCounts = updateAppTabCounts;
    window.updateApplicationKpis = updateApplicationKpis;
    window.filterApplications = filterApplications;
    // Applications Page Quick Actions
    const quickUnderwriteFirst = document.getElementById("quickUnderwriteFirst");
    if (quickUnderwriteFirst) {
        quickUnderwriteFirst.addEventListener("click", () => {
            const firstUnderwriteBtn = document.querySelector(".btn-applicant-id, .btn-underwrite");
            if (firstUnderwriteBtn) firstUnderwriteBtn.click();
        });
    }

    const quickExportApp = document.getElementById("quickExportApp");
    if (quickExportApp) {
        quickExportApp.addEventListener("click", () => {
            const exp = document.getElementById("exportBtn");
            if (exp) exp.click();
        });
    }

    const quickFilterPending = document.getElementById("quickFilterPending");
    if (quickFilterPending) {
        quickFilterPending.addEventListener("click", () => {
            const statusFilterTabs = document.getElementById("statusFilterTabs");
            const tab = statusFilterTabs ? statusFilterTabs.querySelector('[data-filter="pending"]') : null;
            if (tab) tab.click();
        });
    }

    const quickFilterReview = document.getElementById("quickFilterReview");
    if (quickFilterReview) {
        quickFilterReview.addEventListener("click", () => {
            const statusFilterTabs = document.getElementById("statusFilterTabs");
            const tab = statusFilterTabs ? statusFilterTabs.querySelector('[data-filter="review"]') : null;
            if (tab) tab.click();
        });
    }

});
