/**
 * Hello Solar Financer Portal - Dashboard Page Logic
 * Handles dynamic KPI computation, action-required notices synchronization,
 * summary stat drawer toggles, attention table row expansion, and portfolio tabs.
 */

document.addEventListener("DOMContentLoaded", () => {
    // Applications to Review: rows come only from the signed-in financer's shared applications (no sample rows)
    function renderAttentionRows(list) {
        const tbody = document.querySelector("#attentionTable tbody");
        if (!tbody) return;
        const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
        if (!list.length) {
            tbody.innerHTML = `<tr class="attention-empty-row"><td colspan="4" class="text-center" style="padding:24px;color:#64748B;">No applications assigned to you need review.</td></tr>`;
            return;
        }
        tbody.innerHTML = list.map(app => {
            const id = esc(app.id);
            const borrower = esc(app.applicant?.name || "Applicant");
            const fin = (app.financingStatus || "").toUpperCase();
            const loan = (app.loan?.status || "").toLowerCase();
            let badge = ["badge-pending", "Financing Review"];
            if (fin === "DOCUMENTS_REQUIRED" || loan === "docs_required") badge = ["badge-docs-required", "Documents Required"];
            else if (fin === "UNDER_REVIEW" || loan === "review") badge = ["badge-review", "Under Review"];
            const docs = typeof window.getApplicationDocuments === "function" ? window.getApplicationDocuments(app) : [];
            const docText = `${docs.filter(d => d.submitted).length}/${docs.length}`;
            return `
                <tr data-appid="${id}" data-borrower="${borrower}">
                    <td data-label="Applicant ID">
                        <button type="button" class="btn-applicant-id" data-appid="${id}" data-name="${borrower}" title="Review applicant details for ${id}">
                            <span class="table-applicant-name">${id}</span>
                        </button>
                    </td>
                    <td data-label="Current Status" class="text-center"><span class="badge ${badge[0]}">${badge[1]}</span></td>
                    <td data-label="Documents" class="text-center">
                        <button type="button" class="doc-status-text-btn" data-appid="${id}" title="View documents checklist for ${id}" aria-label="View documents checklist for ${id}: ${docText} submitted">${docText}</button>
                    </td>
                    <td data-label="Action" class="table-action-cell text-center">
                        <div class="portal-decisions">
                            <button type="button" class="btn btn-review-action btn-underwrite" data-trigger-review data-appid="${id}" data-name="${borrower}" title="Review financing application for ${id}">Review</button>
                            <button type="button" class="btn-decision-proxy" data-decision="approved" data-appid="${id}" hidden style="display:none !important;" aria-hidden="true"></button>
                            <button type="button" class="btn-decision-proxy" data-decision="rejected" data-appid="${id}" hidden style="display:none !important;" aria-hidden="true"></button>
                        </div>
                    </td>
                </tr>`;
        }).join("");
    }

    // 10. FINANCER DASHBOARD REFINEMENTS (Dynamic Metrics, Notices, Drawers, Tabs)
    function updateDashboardDynamicMetrics() {
        if (!window.HelloSolarStore) return;
        const data = window.HelloSolarStore.getPortalData();
        const apps = (data && Array.isArray(data.applications)) ? data.applications : [];

        // 1. Applications Needing Review Calculation
        const needingReview = apps.filter(a => {
            const fin = (a.financingStatus || "").toUpperCase();
            const loan = (a.loan?.status || "").toLowerCase();
            return ["FINANCING_REVIEW", "DOCUMENTS_REQUIRED", "UNDER_REVIEW"].includes(fin) ||
                ["pending", "review", "docs_required"].includes(loan);
        });
        renderAttentionRows(needingReview);
        let pendingCount = 0;
        let docsRequiredCount = 0;
        let underwritingCount = 0;
        let totalRequestedPrincipal = 0;

        needingReview.forEach(a => {
            const fin = (a.financingStatus || "").toUpperCase();
            const loan = (a.loan?.status || "").toLowerCase();
            if (fin === "DOCUMENTS_REQUIRED" || loan === "docs_required") docsRequiredCount++;
            else if (fin === "UNDER_REVIEW" || loan === "review") underwritingCount++;
            else pendingCount++;

            const num = parseFloat(String(a.loan?.amount || a.fundedAmount || "").replace(/[^0-9.]/g, "")) || 0;
            totalRequestedPrincipal += num;
        });

        const valReviewEl = document.getElementById("dashValReview");
        const subReviewEl = document.getElementById("dashSubReview");
        const detailPrincipalEl = document.getElementById("dashDetailReviewPrincipal");
        const attentionCountEl = document.getElementById("attentionTableCount");

        if (valReviewEl) valReviewEl.textContent = needingReview.length.toString();
        if (subReviewEl) subReviewEl.textContent = `${pendingCount} financing review · ${docsRequiredCount} docs required · ${underwritingCount} under review`;
        if (detailPrincipalEl) detailPrincipalEl.textContent = "₱" + (totalRequestedPrincipal > 0 ? totalRequestedPrincipal.toLocaleString("en-PH") : "0");
        if (attentionCountEl) attentionCountEl.textContent = needingReview.length.toString();

        // 2. DYNAMIC 3 KPI CARDS CALCULATION (Customer Applications, Approved Financing, Ongoing Installation)
        // Card 1: Customer Applications — total Installment applications assigned to the financer
        const installmentApps = (typeof window.HelloSolarStore?.getInstallmentApplications === "function")
            ? window.HelloSolarStore.getInstallmentApplications()
            : apps.filter(a => (a.paymentType || "").toLowerCase() === "installment" || !a.paymentType);
        const valCustomerAppsEl = document.getElementById("dashValCustomerApps");
        if (valCustomerAppsEl) {
            valCustomerAppsEl.textContent = installmentApps.length.toLocaleString();
        }

        // Card 2: Approved Financing — total applications with approved financing
        const contracts = data.approvedContracts || [];
        const isAppApproved = (a) => {
            const fin = (a.financingStatus || "").toUpperCase();
            const loanStatus = (a.loan?.status || "").toLowerCase();
            return fin === "APPROVED" || ["approved", "disbursed"].includes(loanStatus);
        };
        const approvedIds = new Set(contracts.filter(c => c.decision !== "rejected").map(c => c.appId));
        apps.filter(isAppApproved).forEach(a => approvedIds.add(a.id));
        const approvedFinancingCount = approvedIds.size;
        const valApprovedFinancingEl = document.getElementById("dashValApprovedFinancing");
        if (valApprovedFinancingEl) {
            valApprovedFinancingEl.textContent = approvedFinancingCount.toLocaleString();
        }

        // Card 3: Ongoing Installation — approved financed applications currently in Awaiting Installation or Installation In Progress
        // Counts ONLY installationStatus AWAITING_INSTALLATION / INSTALLATION_IN_PROGRESS.
        // READY_FOR_INSTALLATION, COMPLETED, CANCELLED and declined/ineligible applications are excluded.
        const ONGOING_INSTALLATION_STATUSES = ["AWAITING_INSTALLATION", "INSTALLATION_IN_PROGRESS"];
        const normalizeStatus = (s) => String(s || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
        const isDeclinedOrIneligible = (a) => {
            const fin = normalizeStatus(a.financingStatus);
            const appStatus = normalizeStatus(a.applicationStatus);
            const loan = (a.loan?.status || "").toLowerCase();
            return fin === "DECLINED" || ["FINANCING_DECLINED", "DECLINED", "INELIGIBLE"].includes(appStatus) ||
                loan === "rejected" || a.installerEligible === false || a.installerIntegration?.eligible === false;
        };
        const ongoingApps = apps.filter(a => {
            if (!approvedIds.has(a.id) && !isAppApproved(a)) return false;
            if (isDeclinedOrIneligible(a)) return false;
            const instStatus = normalizeStatus(a.installationStatus);
            return ONGOING_INSTALLATION_STATUSES.includes(instStatus);
        });
        const ongoingInstallationCount = ongoingApps.length;
        const valOngoingInstallationEl = document.getElementById("dashValOngoingInstallation");
        if (valOngoingInstallationEl) {
            valOngoingInstallationEl.textContent = ongoingInstallationCount.toLocaleString();
        }

        // Legacy / Secondary Element Backwards Compatibility
        const valApprovedEl = document.getElementById("dashValApproved");
        if (valApprovedEl) valApprovedEl.textContent = approvedIds.size.toLocaleString();
        const valFundedEl = document.getElementById("dashValFunded");
        const fundedStat = data.dashboardStats?.find(stat => stat.id === "capital_financed");
        if (valFundedEl) {
            const amount = Number(String(fundedStat?.value || "").replace(/[^0-9.]/g, ""));
            valFundedEl.textContent = fundedStat?.value ? new Intl.NumberFormat("en-PH", {
                style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 2
            }).format(amount) : "—";
            valFundedEl.title = fundedStat?.value || "Funded amount not recorded";
        }
        const valRepaymentEl = document.getElementById("dashValRepayment");
        const paymentStat = data.dashboardStats?.find(stat => stat.id === "successful_payments");
        const hasPaymentCounts = contracts.length && contracts.every(c => Number.isInteger(c.paymentsCompleted));
        if (valRepaymentEl) {
            valRepaymentEl.textContent = paymentStat?.value ?? (hasPaymentCounts ? contracts.reduce((sum, c) => sum + c.paymentsCompleted, 0).toLocaleString() : "—");
            valRepaymentEl.title = paymentStat || hasPaymentCounts ? "Successful payments" : "Successful payment counts are not recorded yet";
        }

        // Action Required Notices Dynamic Sync
        const noticesCard = document.getElementById("dashboardNoticesCard");
        const noticesCountBadge = document.getElementById("noticesCountBadge");
        if (noticesCard) {
            const noticeItems = noticesCard.querySelectorAll(".notice-item");
            let activeNoticesCount = 0;
            noticeItems.forEach(item => {
                const appId = item.dataset.appid;
                const app = apps.find(a => a.id === appId);
                if (app && (app.loan.status === "approved" || app.loan.status === "rejected")) {
                    item.style.display = "none";
                } else {
                    item.style.display = "flex";
                    activeNoticesCount++;
                }
            });
            if (noticesCountBadge) noticesCountBadge.textContent = activeNoticesCount.toString();
            if (activeNoticesCount === 0) {
                noticesCard.style.display = "none";
            } else {
                noticesCard.style.display = "block";
            }
        }
    }

    // Contract Information (read-only view of the shared contract fields managed in Super Admin)
    function renderContractInformation() {
        const NA = "Not available";
        const contract = typeof window.HelloSolarStore?.getFinancerContract === "function"
            ? window.HelloSolarStore.getFinancerContract()
            : { available: false };
        const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
        const formatDate = (iso) => {
            if (!iso) return null;
            const d = new Date(iso + "T00:00:00");
            return isNaN(d) ? null : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        };
        const setField = (id, html) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.toggle("is-unavailable", !html);
            el.innerHTML = html || NA;
        };
        const statusBadgeClass = { "Active": "badge-active", "Pending Start": "badge-pending", "Expired": "badge-rejected", "Terminated": "badge-rejected" };

        const c = contract.available ? contract : {};
        setField("contractInfoStatus", c.status
            ? `<span class="badge ${statusBadgeClass[c.status] || ""}">${escapeHtml(c.status)}</span>${c.daysRemaining !== null && c.daysRemaining !== undefined ? `<span class="contract-info-sub">${c.daysRemaining} day${c.daysRemaining === 1 ? "" : "s"} remaining</span>` : ""}`
            : null);
        setField("contractInfoTerm", c.termMonths ? `${c.termMonths} months${c.termMonths % 12 === 0 ? `<span class="contract-info-sub">${c.termMonths / 12} year${c.termMonths / 12 > 1 ? "s" : ""}</span>` : ""}` : null);
        setField("contractInfoRate", c.annualRate !== null && c.annualRate !== undefined ? `${escapeHtml(Number(c.annualRate).toFixed(2).replace(/\.?0+$/, ""))}% p.a.` : null);
        setField("contractInfoStart", formatDate(c.startDate));
        setField("contractInfoEnd", formatDate(c.endDate));
        setField("contractInfoOwner", c.ownerName
            ? `${escapeHtml(c.ownerName)}<span class="contract-info-sub">${c.ownerType === "Financer" ? "Active contract — you are the current owner" : `Contract ${escapeHtml(String(c.status).toLowerCase())} — ownership is with Hello Solar`}</span>`
            : null);

        const notice = document.getElementById("contractInfoNotice");
        if (notice) {
            const reason = typeof window.HelloSolarStore?.getNewFinancingBlockReason === "function"
                ? window.HelloSolarStore.getNewFinancingBlockReason()
                : null;
            notice.hidden = !reason;
            notice.textContent = reason || "";
        }
    }
    window.renderContractInformation = renderContractInformation;

    // Expose updateDashboardDynamicMetrics globally
    window.updateDashboardDynamicMetrics = updateDashboardDynamicMetrics;

    // Run dynamic metrics calculation on initial load
    updateDashboardDynamicMetrics();
    renderContractInformation();

    // Keep KPIs in sync when installation status changes (installer accepts/starts/completes/cancels),
    // whether from another tab/portal (storage event) or this tab (custom event).
    window.addEventListener("storage", (e) => {
        if (e.key === "hello_solar_portal_data") updateDashboardDynamicMetrics();
        // Contract changes from the backend payload or Super Admin shared storage
        if (e.key === "hello_solar_portal_data" || e.key === window.HelloSolarStore?.SUPER_ADMIN_STORAGE_KEY) renderContractInformation();
    });
    window.addEventListener("hellosolar:installation-updated", updateDashboardDynamicMetrics);

    // Summary Card Details Expand/Collapse (Accessible click, keyboard, and mobile tap)
    const statDetailsToggles = document.querySelectorAll(".stat-details-toggle, .stat-info-btn");
    statDetailsToggles.forEach((btn) => {
        function toggleStatDrawer(e) {
            if (e) e.preventDefault();
            const targetId = btn.getAttribute("aria-controls");
            const drawer = targetId ? document.getElementById(targetId) : null;
            if (!drawer) return;

            const isExpanded = btn.getAttribute("aria-expanded") === "true";
            const newExpanded = !isExpanded;
            btn.setAttribute("aria-expanded", String(newExpanded));
            drawer.hidden = !newExpanded;

            const span = btn.querySelector("span");
            if (span) {
                span.textContent = newExpanded ? "Hide details" : "View details";
            }
        }

        btn.addEventListener("click", toggleStatDrawer);
        btn.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                toggleStatDrawer(e);
            }
        });
    });

    // Applications Needing Attention "See more / See less" Toggle
    const toggleAttentionBtn = document.getElementById("toggleAttentionRowsBtn");
    if (toggleAttentionBtn) {
        toggleAttentionBtn.addEventListener("click", () => {
            const extraRows = document.querySelectorAll(".attention-row-extra");
            const isExpanded = toggleAttentionBtn.getAttribute("aria-expanded") === "true";
            const newExpanded = !isExpanded;

            toggleAttentionBtn.setAttribute("aria-expanded", String(newExpanded));
            extraRows.forEach((row) => {
                row.hidden = !newExpanded;
            });

            const textEl = document.getElementById("toggleAttentionText");
            if (textEl) {
                textEl.textContent = newExpanded ? "See less" : `See more (${extraRows.length} more application)`;
            }
        });
    }

    // Compact Supporting Information Tabs (Portfolio Breakdown / Recent Activity)
    const supportingTabBtns = document.querySelectorAll(".supporting-tab-btn");
    const supportingTabPanels = document.querySelectorAll(".supporting-tab-panel");

    supportingTabBtns.forEach((tabBtn) => {
        tabBtn.addEventListener("click", () => {
            const targetPanelId = tabBtn.getAttribute("aria-controls");

            supportingTabBtns.forEach((b) => {
                b.classList.remove("active");
                b.setAttribute("aria-selected", "false");
            });
            tabBtn.classList.add("active");
            tabBtn.setAttribute("aria-selected", "true");

            supportingTabPanels.forEach((panel) => {
                if (panel.id === targetPanelId) {
                    panel.classList.add("active");
                    panel.hidden = false;
                } else {
                    panel.classList.remove("active");
                    panel.hidden = true;
                }
            });
        });
    });

    // Recent Activity "See more / See less" Toggle
    const toggleActivityBtn = document.getElementById("toggleActivityBtn");
    if (toggleActivityBtn) {
        toggleActivityBtn.addEventListener("click", () => {
            const extraItems = document.querySelectorAll(".activity-item-extra");
            const isExpanded = toggleActivityBtn.getAttribute("aria-expanded") === "true";
            const newExpanded = !isExpanded;

            toggleActivityBtn.setAttribute("aria-expanded", String(newExpanded));
            extraItems.forEach((item) => {
                item.hidden = !newExpanded;
            });

            const textEl = document.getElementById("toggleActivityText");
            if (textEl) {
                textEl.textContent = newExpanded ? "See less" : `See more (${extraItems.length} more updates)`;
            }
        });
    }

    // Refresh shared attention-table data after computing dashboard metrics.
    if (typeof window.refreshPortalTables === "function") window.refreshPortalTables();
});
