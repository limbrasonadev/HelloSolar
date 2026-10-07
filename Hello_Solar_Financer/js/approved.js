/**
 * Hello Solar Financer Portal - Approved Loans Page Logic
 * Handles approved table search and merchant filtering, contract details modal,
 * repayment & payment plan schedule modal, pagination expansion, and CSV export.
 */

document.addEventListener("DOMContentLoaded", () => {
    const approvedSearchInput = document.getElementById("approvedSearchInput");
    const merchantFilterSelect = document.getElementById("merchantFilterSelect");
    const approvedTable = document.getElementById("approvedTable");
    const approvedRecordsCount = document.getElementById("approvedRecordsCount");
    const toggleApprovedRowsBtn = document.getElementById("toggleApprovedRowsBtn");
    const toggleApprovedText = document.getElementById("toggleApprovedText");
    const approvedPaginationFooter = document.getElementById("approvedPaginationFooter");
    const approvedEmptyState = document.getElementById("approvedEmptyState");
    const exportApprovedBtn = document.getElementById("exportApprovedBtn");
    let approvedExpanded = false;

    function triggerToast(msg) {
        if (typeof window.showToast === "function") {
            window.showToast(msg);
        }
    }

    function filterApproved() {
        if (!approvedTable) return;
        const query = (approvedSearchInput ? approvedSearchInput.value.toLowerCase().trim() : "");
        const merchant = (merchantFilterSelect ? merchantFilterSelect.value : "all");

        const recordRows = approvedTable.querySelectorAll("tbody tr.loan-record-row");
        const matchingPairs = [];

        recordRows.forEach((row) => {
            const contract = (row.dataset.contract || "").toLowerCase();
            const borrower = (row.dataset.borrower || "").toLowerCase();
            const location = (row.dataset.location || "").toLowerCase();
            const rowMerchant = (row.dataset.merchant || "").toLowerCase();
            const textContent = row.textContent.toLowerCase();

            const matchesQuery = !query ||
                contract.includes(query) ||
                borrower.includes(query) ||
                location.includes(query) ||
                rowMerchant.includes(query) ||
                textContent.includes(query);

            const matchesMerchant = (merchant === "all") || rowMerchant.includes(merchant.toLowerCase());

            if (matchesQuery && matchesMerchant) {
                matchingPairs.push({ row });
            } else {
                row.style.setProperty("display", "none", "important");
                row.hidden = true;
                row.setAttribute("hidden", "");
                row.classList.add("is-hidden");
            }
        });

        const totalMatches = matchingPairs.length;

        // Update records count badge
        if (approvedRecordsCount) {
            approvedRecordsCount.textContent = totalMatches === 1 ? "1 matching loan" : `${totalMatches} matching loans`;
        }

        // Empty state handling
        if (approvedEmptyState) {
            approvedEmptyState.style.display = (totalMatches === 0) ? "block" : "none";
        }

        // Pagination / See more toggle handling (Initial 3 records display)
        if (totalMatches === 0) {
            if (approvedPaginationFooter) approvedPaginationFooter.style.setProperty("display", "none", "important");
        } else if (totalMatches <= 3) {
            matchingPairs.forEach(({ row }) => {
                row.style.removeProperty("display");
                row.hidden = false;
                row.removeAttribute("hidden");
                row.classList.remove("is-hidden");
            });
            if (approvedPaginationFooter) approvedPaginationFooter.style.setProperty("display", "none", "important");
        } else {
            // More than 3 matching records
            if (approvedPaginationFooter) approvedPaginationFooter.style.setProperty("display", "flex", "important");

            const limit = approvedExpanded ? totalMatches : 3;

            matchingPairs.forEach(({ row }, index) => {
                if (index < limit) {
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

            if (approvedExpanded) {
                if (toggleApprovedText) toggleApprovedText.textContent = "See less";
                if (toggleApprovedRowsBtn) {
                    toggleApprovedRowsBtn.setAttribute("aria-expanded", "true");
                    toggleApprovedRowsBtn.classList.add("expanded");
                }
            } else {
                const hiddenCount = totalMatches - 3;
                if (toggleApprovedText) {
                    toggleApprovedText.textContent = `See more (${hiddenCount} more ${hiddenCount === 1 ? "loan" : "loans"})`;
                }
                if (toggleApprovedRowsBtn) {
                    toggleApprovedRowsBtn.setAttribute("aria-expanded", "false");
                    toggleApprovedRowsBtn.classList.remove("expanded");
                }
            }
        }
    }

    if (approvedSearchInput) {
        approvedSearchInput.addEventListener("input", () => {
            approvedExpanded = false;
            filterApproved();
        });
    }

    if (merchantFilterSelect) {
        merchantFilterSelect.addEventListener("change", () => {
            approvedExpanded = false;
            filterApproved();
        });
    }

    if (toggleApprovedRowsBtn) {
        toggleApprovedRowsBtn.addEventListener("click", (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            approvedExpanded = !approvedExpanded;
            filterApproved();
        });
    }

    // Loan Contract Details Modal Controller
    const loanDetailModal = document.getElementById("loanDetailModal");
    const closeLoanModalBtn = document.getElementById("closeLoanModalBtn");
    const closeLoanModalFooterBtn = document.getElementById("closeLoanModalFooterBtn");
    const downloadNoteBtn = document.getElementById("downloadNoteBtn");

    function openLoanDetailsModal(data) {
        if (!loanDetailModal) return;

        const borrowerTitle = document.getElementById("modalBorrowerTitle");
        const loanContract = document.getElementById("modalLoanContract");
        const loanBorrower = document.getElementById("modalLoanBorrower");
        const loanMerchant = document.getElementById("modalLoanMerchant");
        const loanLocation = document.getElementById("modalLoanLocation");
        const loanLocation2 = document.getElementById("modalLoanLocation2");
        const loanAmount = document.getElementById("modalLoanAmount");
        const loanPayment = document.getElementById("modalLoanPayment");
        const loanTerm = document.getElementById("modalLoanTerm");
        const loanDate = document.getElementById("modalLoanDate");
        const loanSchedule = document.getElementById("modalLoanSchedule");
        const loanSystem = document.getElementById("modalLoanSystem");
        const statusBadge = document.getElementById("modalLoanStatusBadge");

        const appId = data.appid || data.appId || "APP-1107";
        const contractId = data.contract || `HS-CTR-2026-${appId.replace(/[^0-9]/g, "")}` || "HS-CTR-2026-1107";

        const loanAppId = document.getElementById("modalLoanAppId");
        const loanAppIdDetail = document.getElementById("modalLoanAppIdDetail");
        const loanContractDetail = document.getElementById("modalLoanContractDetail");

        if (borrowerTitle) borrowerTitle.textContent = data.borrower || "Borrower";
        if (loanContract) loanContract.textContent = contractId;
        if (loanContractDetail) loanContractDetail.textContent = contractId;
        if (loanAppId) loanAppId.textContent = appId;
        if (loanAppIdDetail) loanAppIdDetail.textContent = appId;
        if (loanBorrower) loanBorrower.textContent = data.borrower || "Borrower";
        if (loanMerchant) loanMerchant.textContent = data.merchant || "Accredited Installer";
        if (loanLocation) loanLocation.textContent = data.location || "Philippines";
        if (loanLocation2) loanLocation2.textContent = data.location || "Philippines";
        if (loanAmount) loanAmount.textContent = data.amount || "₱0";
        if (loanPayment) loanPayment.textContent = data.payment || "₱0/mo";
        if (loanTerm) loanTerm.textContent = (data.term || "36 mos").replace(/\s*\(\d+\s*Years?\)/gi, "").trim();
        if (loanDate) loanDate.textContent = data.date || "Sep 2026";
        if (loanSchedule) loanSchedule.textContent = (data.schedule || "15th monthly (ACH Auto-Debit)")
            .replace(/^Due\s+/i, "")
            .replace(/of each month via Automated ACH Debit/i, "monthly (ACH Auto-Debit)")
            .replace(/of each month via ACH Auto-Debit/i, "monthly (ACH Auto-Debit)");
        if (loanSystem) loanSystem.textContent = data.system || "Standard Solar PV System";

        if (statusBadge) {
            const status = (data.status || "Approved").toLowerCase();
            if (status === "declined") {
                statusBadge.className = "badge badge-rejected";
                statusBadge.innerHTML = '<span class="dot"></span> Declined';
            } else if (status.includes("disbursed")) {
                statusBadge.className = "badge badge-disbursed";
                statusBadge.innerHTML = '<span class="dot"></span> Active Disbursed';
            } else {
                statusBadge.className = "badge badge-approved";
                statusBadge.innerHTML = '<span class="dot"></span> Approved';
            }
        }

        loanDetailModal.classList.add("open");
        loanDetailModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function closeLoanDetailsModal() {
        if (!loanDetailModal) return;
        loanDetailModal.classList.remove("open");
        loanDetailModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    if (closeLoanModalBtn) closeLoanModalBtn.addEventListener("click", closeLoanDetailsModal);
    if (closeLoanModalFooterBtn) closeLoanModalFooterBtn.addEventListener("click", closeLoanDetailsModal);
    if (loanDetailModal) {
        loanDetailModal.addEventListener("click", (e) => {
            if (e.target === loanDetailModal) closeLoanDetailsModal();
        });
    }

    if (downloadNoteBtn) {
        downloadNoteBtn.addEventListener("click", () => {
            const contract = document.getElementById("modalLoanContract")?.textContent || "HS-CTR";
            alert(`Downloading Promissory Note & Chattel Mortgage PDF for Contract #${contract}...`);
        });
    }

    // Delegate click for View Details buttons on approved page
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-open-loan-modal, .btn-toggle-loan-detail");
        if (!btn) return;
        const row = btn.closest("tr.loan-record-row");
        const dataset = row ? Object.assign({}, row.dataset, btn.dataset) : btn.dataset;
        openLoanDetailsModal(dataset);
    });

    // --------------------------------------------------------------------------
    // REPAYMENT & PAYMENT PLAN MODAL CONTROLLER (Approved Loans)
    // --------------------------------------------------------------------------
    const APPROVED_PAYMENT_PLANS = {
        "APP-1107": {
            appId: "APP-1107",
            borrower: "David Tan",
            location: "Cebu City",
            merchant: "Visayas Green Energy",
            contractNumber: "HS-CTR-2026-1107",
            status: "paid",
            statusLabel: "Paid",
            statusClass: "badge-approved",
            fundedAmount: "₱780,000",
            monthlyPayment: "₱15,920/mo",
            planMonths: 60,
            planTerm: "60 Months",
            completedPayments: 18,
            totalPaid: "₱286,560",
            remainingBalance: "₱493,440",
            remainingPayments: 42,
            nextDueDate: "Oct 15, 2026",
            scheduleNote: "15th monthly (ACH Auto-Debit)",
            recentInstallments: [
                { num: 18, date: "Sep 15, 2026", ref: "ACH-98212", amount: "₱15,920", status: "Paid", statusClass: "badge-approved" },
                { num: 17, date: "Aug 15, 2026", ref: "ACH-89104", amount: "₱15,920", status: "Paid", statusClass: "badge-approved" },
                { num: 16, date: "Jul 15, 2026", ref: "ACH-77291", amount: "₱15,920", status: "Paid", statusClass: "badge-approved" }
            ]
        },
        "APP-1109": {
            appId: "APP-1109",
            borrower: "Patricia Santos",
            location: "Davao City",
            merchant: "Mindanao Solar Corp",
            contractNumber: "HS-CTR-2026-1109",
            status: "due",
            statusLabel: "Due Date",
            statusClass: "badge-pending",
            fundedAmount: "₱315,000",
            monthlyPayment: "₱9,890/mo",
            planMonths: 36,
            planTerm: "36 Months",
            completedPayments: 8,
            totalPaid: "₱79,120",
            remainingBalance: "₱235,880",
            remainingPayments: 28,
            nextDueDate: "Oct 05, 2026",
            scheduleNote: "5th monthly (ACH Auto-Debit)",
            recentInstallments: [
                { num: 9, date: "Oct 05, 2026", ref: "ACH-PENDING", amount: "₱9,890", status: "Due Soon", statusClass: "badge-pending" },
                { num: 8, date: "Sep 05, 2026", ref: "ACH-95110", amount: "₱9,890", status: "Paid", statusClass: "badge-approved" },
                { num: 7, date: "Aug 05, 2026", ref: "ACH-83921", amount: "₱9,890", status: "Paid", statusClass: "badge-approved" }
            ]
        },
        "APP-1111": {
            appId: "APP-1111",
            borrower: "Benjamin Alcantara",
            location: "Iloilo City",
            merchant: "SunPower Manila",
            contractNumber: "HS-CTR-2026-1111",
            status: "unpaid",
            statusLabel: "Unpaid",
            statusClass: "badge-rejected",
            fundedAmount: "₱260,000",
            monthlyPayment: "₱8,160/mo",
            planMonths: 36,
            planTerm: "36 Months",
            completedPayments: 4,
            totalPaid: "₱32,640",
            remainingBalance: "₱227,360",
            remainingPayments: 32,
            nextDueDate: "Sep 20, 2026 (Overdue)",
            scheduleNote: "20th monthly (ACH Auto-Debit)",
            recentInstallments: [
                { num: 5, date: "Sep 20, 2026", ref: "ACH-FAILED", amount: "₱8,160", status: "Overdue", statusClass: "badge-rejected" },
                { num: 4, date: "Aug 20, 2026", ref: "ACH-81190", amount: "₱8,160", status: "Paid", statusClass: "badge-approved" },
                { num: 3, date: "Jul 20, 2026", ref: "ACH-69482", amount: "₱8,160", status: "Paid", statusClass: "badge-approved" }
            ]
        },
        "APP-1112": {
            appId: "APP-1112",
            borrower: "Corazon Aquino-Lim",
            location: "Mandaluyong City",
            merchant: "Helios Solar PH",
            contractNumber: "HS-CTR-2026-1112",
            status: "paid",
            statusLabel: "Paid",
            statusClass: "badge-approved",
            fundedAmount: "₱490,000",
            monthlyPayment: "₱11,980/mo",
            planMonths: 48,
            planTerm: "48 Months",
            completedPayments: 12,
            totalPaid: "₱143,760",
            remainingBalance: "₱346,240",
            remainingPayments: 36,
            nextDueDate: "Oct 10, 2026",
            scheduleNote: "10th monthly (ACH Auto-Debit)",
            recentInstallments: [
                { num: 12, date: "Sep 10, 2026", ref: "ACH-96711", amount: "₱11,980", status: "Paid", statusClass: "badge-approved" },
                { num: 11, date: "Aug 10, 2026", ref: "ACH-84910", amount: "₱11,980", status: "Paid", statusClass: "badge-approved" },
                { num: 10, date: "Jul 10, 2026", ref: "ACH-73199", amount: "₱11,980", status: "Paid", statusClass: "badge-approved" }
            ]
        },
        "APP-1115": {
            appId: "APP-1115",
            borrower: "Manuel Pangilinan Jr.",
            location: "Pampanga",
            merchant: "Visayas Green Energy",
            contractNumber: "HS-CTR-2026-1115",
            status: "due",
            statusLabel: "Due Date",
            statusClass: "badge-pending",
            fundedAmount: "₱920,000",
            monthlyPayment: "₱18,780/mo",
            planMonths: 60,
            planTerm: "60 Months",
            completedPayments: 10,
            totalPaid: "₱187,800",
            remainingBalance: "₱732,200",
            remainingPayments: 50,
            nextDueDate: "Sep 25, 2026",
            scheduleNote: "25th monthly (ACH Auto-Debit)",
            recentInstallments: [
                { num: 11, date: "Sep 25, 2026", ref: "ACH-PENDING", amount: "₱18,780", status: "Due Soon", statusClass: "badge-pending" },
                { num: 10, date: "Aug 25, 2026", ref: "ACH-88902", amount: "₱18,780", status: "Paid", statusClass: "badge-approved" },
                { num: 9, date: "Jul 25, 2026", ref: "ACH-76619", amount: "₱18,780", status: "Paid", statusClass: "badge-approved" }
            ]
        }
    };

    function renderApprovedTable() {
        if (!approvedTable) return;
        const tbody = approvedTable.querySelector("tbody");
        if (!tbody) return;

        if (window.HelloSolarStore && typeof window.HelloSolarStore.getApprovedApplications === "function") {
            const approvedApps = window.HelloSolarStore.getApprovedApplications();
            if (Array.isArray(approvedApps)) {
                tbody.innerHTML = approvedApps.map((app, idx) => {
                    const contractNo = `HS-CTR-2026-${app.id.replace(/[^0-9]/g, "") || (900 + idx)}`;
                    const borrower = app.applicant?.name || "Applicant";
                    const location = app.applicant?.location || "";
                    const systemSize = app.system?.systemSize || "5.4 kWp";
                    const systemTitle = app.system?.title || `${systemSize} System`;
                    const merchant = app.system?.merchant || "Accredited Installer";
                    const fundedAmount = app.fundedAmount || app.loan?.fundedAmount || app.loan?.amount || "₱340,000";
                    const monthlyPayment = app.monthlyPayment || app.loan?.monthlyPayment || "₱10,750/mo";
                    const term = app.financingTerm || app.loan?.financingTerm || app.loan?.term || "36 Months";
                    const repStatus = app.repaymentStatus || "Paid";
                    
                    let pillClass = "status-paid";
                    if (repStatus.toLowerCase().includes("due")) pillClass = "status-due";
                    else if (repStatus.toLowerCase().includes("unpaid") || repStatus.toLowerCase().includes("overdue")) pillClass = "status-unpaid";

                    const isHiddenInitial = !approvedExpanded && idx >= 3;
                    return `
                        <tr class="loan-record-row ${idx >= 3 ? "app-row-extra" : ""} ${isHiddenInitial ? "is-hidden" : ""}" ${isHiddenInitial ? 'hidden style="display: none !important;"' : ''}
                            data-contract="${contractNo}" data-borrower="${borrower}" data-location="${location}"
                            data-system="${systemTitle}" data-merchant="${merchant}" data-amount="${fundedAmount}"
                            data-term="${term}" data-payment="${monthlyPayment}" data-date="Sep 02, 2026"
                            data-schedule="15th monthly (ACH Auto-Debit)" data-status="Approved" data-appid="${app.id}">
                            <td data-label="Applicant ID">
                                <button type="button" class="table-applicant portal-applicant-link btn-open-loan-modal"
                                    aria-label="View details for ${app.id}">
                                    <span class="table-applicant-name">${app.id}</span>
                                    <span class="table-applicant-sub">${borrower} · ${location}</span>
                                </button>
                            </td>
                            <td data-label="System Size" class="text-center">${systemSize}</td>
                            <td data-label="Funded Amount" class="table-amount text-center">${fundedAmount}</td>
                            <td data-label="Monthly Payment" class="table-payment text-center">${monthlyPayment}</td>
                            <td data-label="Term" class="text-center">${term}</td>
                            <td data-label="Repayment Status" class="text-center">
                                <button type="button" class="btn-status-pill ${pillClass}" data-appid="${app.id}"
                                    title="Click to view payment plan &amp; payments completed"
                                    aria-label="Payment status: ${repStatus}. Click to view payment plan &amp; payments completed">
                                    <span class="dot"></span> ${repStatus}
                                </button>
                            </td>
                        </tr>
                    `;
                }).join("");
            }
        }
        filterApproved();
    }

    const paymentPlanModal = document.getElementById("paymentPlanModal");
    const closePaymentPlanModalBtn = document.getElementById("closePaymentPlanModalBtn");
    const closePaymentPlanModalFooterBtn = document.getElementById("closePaymentPlanModalFooterBtn");
    const openFullFacilityFromPlanBtn = document.getElementById("openFullFacilityFromPlanBtn");
    let activePlanAppId = null;

    function openPaymentPlanModal(appId) {
        if (!paymentPlanModal) return;
        activePlanAppId = appId;
        // Sample repayment plans are demo data only (local demo mode)
        let plan = !(window.HS_CONFIG && (window.HS_CONFIG.isApi || window.HS_CONFIG.demoData === false)) ? APPROVED_PAYMENT_PLANS[appId] : null;

        if (window.HelloSolarStore && typeof window.HelloSolarStore.getApplicationById === "function") {
            const app = window.HelloSolarStore.getApplicationById(appId);
            if (app) {
                const sched = app.repaymentSchedule || {};
                const funded = app.fundedAmount || app.loan?.fundedAmount || app.loan?.amount || "₱340,000";
                const payment = app.monthlyPayment || app.loan?.monthlyPayment || "₱10,750/mo";
                const termStr = app.financingTerm || app.loan?.financingTerm || app.loan?.term || "36 Months";
                const months = parseInt(termStr, 10) || 36;
                const status = (app.repaymentStatus || "Paid").toLowerCase();
                let statusLabel = app.repaymentStatus || "Paid";
                let statusClass = "badge-approved";
                if (status.includes("due")) {
                    statusLabel = "Due Date";
                    statusClass = "badge-pending";
                } else if (status.includes("unpaid") || status.includes("overdue")) {
                    statusLabel = "Unpaid";
                    statusClass = "badge-rejected";
                } else if (status.includes("paid")) {
                    statusLabel = "Paid";
                    statusClass = "badge-approved";
                }

                plan = {
                    borrower: app.applicant?.name || plan?.borrower || "Borrower",
                    contractNumber: plan?.contractNumber || `HS-CTR-2026-${app.id.replace(/[^0-9]/g, "")}`,
                    status: plan?.status || (statusClass === "badge-approved" ? "paid" : (statusClass === "badge-pending" ? "due" : "unpaid")),
                    statusLabel: statusLabel,
                    statusClass: statusClass,
                    fundedAmount: funded,
                    monthlyPayment: payment,
                    planMonths: sched.planMonths || months,
                    planTerm: sched.planTerm || `${months} Months`,
                    completedPayments: sched.completedPayments ?? (plan ? plan.completedPayments : 0),
                    totalPaid: sched.totalPaid || (plan ? plan.totalPaid : "₱0"),
                    remainingBalance: sched.remainingBalance || (plan ? plan.remainingBalance : funded),
                    remainingPayments: sched.remainingPayments ?? (plan ? plan.remainingPayments : months),
                    nextDueDate: sched.nextDueDate || (plan ? plan.nextDueDate : "Oct 15, 2026"),
                    scheduleNote: sched.scheduleNote || (plan ? plan.scheduleNote : "15th monthly (ACH Auto-Debit)"),
                    recentInstallments: (sched.recentInstallments && sched.recentInstallments.length > 0) ? sched.recentInstallments : (plan ? plan.recentInstallments : [
                        { num: 1, date: "Oct 15, 2026", ref: "ACH-SCHEDULED", amount: payment, status: "Scheduled", statusClass: "badge-pending" }
                    ])
                };
            }
        }

        if (!plan) {
            plan = {
                borrower: "Borrower",
                contractNumber: "HS-CTR-2026-000",
                status: "paid",
                statusLabel: "Paid",
                statusClass: "badge-approved",
                fundedAmount: "₱500,000",
                monthlyPayment: "₱10,000/mo",
                planMonths: 36,
                planTerm: "36 Months",
                completedPayments: 12,
                totalPaid: "₱120,000",
                remainingBalance: "₱380,000",
                remainingPayments: 24,
                nextDueDate: "Next Month",
                scheduleNote: "Due monthly via ACH",
                recentInstallments: []
            };
        }

        const titleEl = document.getElementById("planBorrowerTitle");
        if (titleEl) titleEl.innerHTML = `${plan.borrower} <span class="modal-title-appid">(${appId})</span>`;

        const planAppIdTag = document.getElementById("planAppIdTag");
        const planContractTag = document.getElementById("planContractTag");
        if (planAppIdTag) planAppIdTag.textContent = appId;
        if (planContractTag) planContractTag.textContent = plan?.contractNumber || `HS-CTR-2026-${appId.replace(/[^0-9]/g, "")}`;

        const labelEl = document.getElementById("planProgressLabel");
        if (labelEl) labelEl.textContent = `${plan.completedPayments} of ${plan.planMonths} Payments Completed`;

        const badgeEl = document.getElementById("planStatusBadge");
        if (badgeEl) {
            badgeEl.className = `badge ${plan.statusClass}`;
            badgeEl.innerHTML = `<span class="dot"></span> ${plan.statusLabel}`;
        }

        const barEl = document.getElementById("planProgressBar");
        if (barEl) {
            const pct = Math.round((plan.completedPayments / plan.planMonths) * 100);
            barEl.style.width = `${pct}%`;
            barEl.className = `plan-progress-bar bar-${plan.status}`;
        }

        const fundedEl = document.getElementById("planMetricFunded");
        if (fundedEl) fundedEl.textContent = plan.fundedAmount;

        const paidEl = document.getElementById("planMetricPaid");
        if (paidEl) paidEl.textContent = plan.totalPaid;

        const remEl = document.getElementById("planMetricRemaining");
        if (remEl) remEl.textContent = plan.remainingBalance;

        const termEl = document.getElementById("planDataTerm");
        if (termEl) termEl.textContent = plan.planTerm;

        const payEl = document.getElementById("planDataPayment");
        if (payEl) payEl.textContent = plan.monthlyPayment;

        const nextEl = document.getElementById("planDataNextDue");
        if (nextEl) nextEl.textContent = plan.nextDueDate;

        const remMonthsEl = document.getElementById("planDataRemainingMonths");
        if (remMonthsEl) remMonthsEl.textContent = `${plan.remainingPayments} Months`;

        const schedEl = document.getElementById("planDataSchedule");
        if (schedEl) schedEl.textContent = plan.scheduleNote;

        const listEl = document.getElementById("planInstallmentsList");
        if (listEl) {
            listEl.innerHTML = plan.recentInstallments.map(inst => `
                <tr class="plan-inst-row">
                    <td class="plan-inst-meta">
                        <strong class="inst-num">#${inst.num}</strong>
                        <span class="inst-date">${inst.date}</span>
                    </td>
                    <td class="plan-inst-ref"><code class="inst-code">${inst.ref}</code></td>
                    <td class="plan-inst-amount"><strong>${inst.amount}</strong></td>
                    <td class="plan-inst-status" style="text-align: right;"><span class="badge ${inst.statusClass}"><span class="dot"></span> ${inst.status}</span></td>
                </tr>
            `).join("");
        }

        paymentPlanModal.classList.add("open");
        paymentPlanModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function closePaymentPlanModal() {
        if (!paymentPlanModal) return;
        paymentPlanModal.classList.remove("open");
        paymentPlanModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    if (closePaymentPlanModalBtn) closePaymentPlanModalBtn.addEventListener("click", closePaymentPlanModal);
    if (closePaymentPlanModalFooterBtn) closePaymentPlanModalFooterBtn.addEventListener("click", closePaymentPlanModal);

    if (paymentPlanModal) {
        paymentPlanModal.addEventListener("click", (e) => {
            if (e.target === paymentPlanModal) closePaymentPlanModal();
        });
    }

    if (openFullFacilityFromPlanBtn) {
        openFullFacilityFromPlanBtn.addEventListener("click", () => {
            closePaymentPlanModal();
            if (activePlanAppId) {
                const row = document.querySelector(`tr[data-appid="${activePlanAppId}"]`);
                if (row) {
                    openLoanDetailsModal({
                        borrower: row.dataset.borrower,
                        contract: row.dataset.contract,
                        merchant: row.dataset.merchant,
                        location: row.dataset.location,
                        amount: row.dataset.amount,
                        payment: row.dataset.payment,
                        term: row.dataset.term,
                        date: row.dataset.date,
                        schedule: row.dataset.schedule,
                        status: row.dataset.status,
                        system: row.dataset.system
                    });
                }
            }
        });
    }

    // Status pill click delegation
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-status-pill");
        if (btn) {
            e.preventDefault();
            e.stopPropagation();
            const appId = btn.dataset.appid;
            if (appId) {
                openPaymentPlanModal(appId);
            }
        }
    });

    // Institutional CSV Export Function (preserves full scope & hidden records)
    function exportApprovedLoansCSV() {
        if (!approvedTable) return;
        const recordRows = approvedTable.querySelectorAll("tbody tr.loan-record-row");
        const query = (approvedSearchInput ? approvedSearchInput.value.toLowerCase().trim() : "");
        const merchant = (merchantFilterSelect ? merchantFilterSelect.value : "all");

        const matchingData = [];
        recordRows.forEach((row) => {
            const contract = row.dataset.contract || "";
            const borrower = row.dataset.borrower || "";
            const location = row.dataset.location || "";
            const rowMerchant = row.dataset.merchant || "";
            const amount = row.dataset.amount || "";
            const term = row.dataset.term || "";
            const payment = row.dataset.payment || "";
            const date = row.dataset.date || "";
            const status = row.dataset.status || "";

            const rowText = `${row.dataset.appid || ""} ${contract} ${borrower} ${location} ${rowMerchant}`.toLowerCase();
            const matchesQuery = !query || rowText.includes(query);
            const matchesMerchant = (merchant === "all") || rowMerchant.toLowerCase().includes(merchant.toLowerCase());

            if (matchesQuery && matchesMerchant) {
                matchingData.push([
                    contract,
                    borrower,
                    location,
                    rowMerchant,
                    amount,
                    term,
                    payment,
                    date,
                    status
                ]);
            }
        });

        if (matchingData.length === 0) {
            triggerToast("No matching loan records found to export.");
            return;
        }

        const headers = ["Contract #", "Borrower Name", "Location & Type", "Merchant Installer", "Funded Principal", "Loan Term", "Monthly Payment", "Approval / Disbursal Date", "Status"];
        const csvRows = [headers.map((h) => `"${h}"`).join(",")];
        matchingData.forEach((r) => {
            csvRows.push(r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","));
        });

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csvRows.join("\r\n"));
        const downloadLink = document.createElement("a");
        downloadLink.setAttribute("href", csvContent);
        downloadLink.setAttribute("download", `HelloSolar_Approved_Loans_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        triggerToast("Generating institutional CSV report... Download ready! ✓");
    }

    if (exportApprovedBtn) {
        exportApprovedBtn.addEventListener("click", exportApprovedLoansCSV);
    }

    // Initialize Approved Table on page load
    if (approvedTable) {
        renderApprovedTable();
    }

    window.renderApprovedTable = renderApprovedTable;

    // Expose helpers globally
    window.filterApproved = filterApproved;
    window.openLoanDetailsModal = openLoanDetailsModal;
    window.openPaymentPlanModal = openPaymentPlanModal;
    window.exportApprovedLoansCSV = exportApprovedLoansCSV;
    // Approved Page Quick Actions
    const quickExportApproved = document.getElementById("quickExportApproved");
    if (quickExportApproved) {
        quickExportApproved.addEventListener("click", () => {
            const exp = document.getElementById("exportApprovedBtn");
            if (exp) exp.click();
        });
    }

    const quickFilterSunpower = document.getElementById("quickFilterSunpower");
    if (quickFilterSunpower) {
        quickFilterSunpower.addEventListener("click", () => {
            const merchantFilterSelect = document.getElementById("merchantFilterSelect");
            if (merchantFilterSelect) {
                merchantFilterSelect.value = "SunPower Manila";
                approvedExpanded = false;
                if (typeof window.filterApproved === "function") window.filterApproved();
            }
        });
    }

    const quickFilterVisayas = document.getElementById("quickFilterVisayas");
    if (quickFilterVisayas) {
        quickFilterVisayas.addEventListener("click", () => {
            const merchantFilterSelect = document.getElementById("merchantFilterSelect");
            if (merchantFilterSelect) {
                merchantFilterSelect.value = "Visayas Green Energy";
                approvedExpanded = false;
                if (typeof window.filterApproved === "function") window.filterApproved();
            }
        });
    }

    const quickFilterAllApproved = document.getElementById("quickFilterAllApproved");
    if (quickFilterAllApproved) {
        quickFilterAllApproved.addEventListener("click", () => {
            const merchantFilterSelect = document.getElementById("merchantFilterSelect");
            if (merchantFilterSelect) {
                merchantFilterSelect.value = "all";
                approvedExpanded = false;
                if (typeof window.filterApproved === "function") window.filterApproved();
            }
        });
    }

});
