/**
 * Hello Solar Financer Portal - Rejected / Declined Applications Page Logic
 * Handles declined table search and adverse reason filtering, decline details modal,
 * re-evaluation / co-maker actions, pagination expansion, and CSV export.
 */

document.addEventListener("DOMContentLoaded", () => {
    const rejectedSearchInput = document.getElementById("rejectedSearchInput");
    const reasonFilterSelect = document.getElementById("reasonFilterSelect");
    const rejectedTable = document.getElementById("rejectedTable");
    const rejectedRecordsCount = document.getElementById("rejectedRecordsCount");
    const toggleRejectedRowsBtn = document.getElementById("toggleRejectedRowsBtn");
    const toggleRejectedText = document.getElementById("toggleRejectedText");
    const rejectedPaginationFooter = document.getElementById("rejectedPaginationFooter");
    const rejectedEmptyState = document.getElementById("rejectedEmptyState");
    const exportDeclinedBtn = document.getElementById("exportDeclinedBtn");
    let rejectedExpanded = false;

    function triggerToast(msg) {
        if (typeof window.showToast === "function") {
            window.showToast(msg);
        }
    }

    function renderRejectedTable() {
        if (!rejectedTable) return;
        const tbody = rejectedTable.querySelector("tbody");
        if (!tbody) return;

        if (window.HelloSolarStore && typeof window.HelloSolarStore.getDeclinedApplications === "function") {
            const declinedApps = window.HelloSolarStore.getDeclinedApplications();
            if (Array.isArray(declinedApps)) {
                tbody.innerHTML = declinedApps.map((app, idx) => {
                    const borrower = app.applicant?.name || "Applicant";
                    const phone = app.applicant?.phone || "";
                    const location = app.applicant?.location || "";
                    const systemTitle = app.system?.title || app.system?.systemSize || "Solar System";
                    const merchant = app.system?.merchant || "Accredited Installer";
                    const amount = app.loan?.amount || app.fundedAmount || "₱285,000";
                    const reason = app.declineReason || app.loan?.declineReason || "Underwriting Criteria Unmet";
                    const decisionDate = app.decisionDate || app.loan?.declineDate || "Sep 05, 2026";

                    let reasonCode = "dti";
                    const lReason = reason.toLowerCase();
                    if (lReason.includes("score") || lReason.includes("bureau")) reasonCode = "score";
                    else if (lReason.includes("utility") || lReason.includes("bill") || lReason.includes("meter")) reasonCode = "utility";
                    else if (lReason.includes("roof") || lReason.includes("structural")) reasonCode = "roof";

                    return `
                        <tr class="decline-record-row ${idx >= 3 ? "app-row-extra is-hidden" : ""}" ${idx >= 3 ? 'hidden style="display: none !important;"' : ''}
                            data-appid="${app.id}" data-name="${borrower}"
                            data-phone="${phone}" data-location="${location}"
                            data-merchant="${merchant}" data-amount="${amount}" data-reason="${reasonCode}"
                            data-primaryreason="${reason}"
                            data-reasondetail="${reason}"
                            data-date="${decisionDate}"
                            data-status="Co-Maker Eligible"
                            data-policy="Application declined according to risk policy criteria. Adverse decision reason: ${reason}"
                            data-actiontext="Invite Co-Maker">
                            <td data-label="Applicant ID">
                                <button type="button" class="table-applicant portal-applicant-link btn-open-decline-modal"
                                    aria-label="View details for ${app.id}">
                                    <span class="table-applicant-name">${app.id}</span>
                                    <span class="table-applicant-sub">${borrower} · ${location}</span>
                                </button>
                            </td>
                            <td data-label="System" class="text-center">${systemTitle}</td>
                            <td data-label="Requested Amount" class="table-amount text-center">${amount}</td>
                            <td data-label="Decline Reason" class="text-center">
                                <span class="decline-reason-primary">${reason}</span>
                            </td>
                            <td data-label="Decision Date" class="text-center" style="font-size: 12.5px; color: var(--text-muted);">${decisionDate}</td>
                        </tr>
                    `;
                }).join("");
            }
        }
        filterRejected();
    }

    function filterRejected() {
        if (!rejectedTable) return;
        const query = (rejectedSearchInput ? rejectedSearchInput.value.toLowerCase().trim() : "");
        const reason = (reasonFilterSelect ? reasonFilterSelect.value : "all");

        const recordRows = rejectedTable.querySelectorAll("tbody tr.decline-record-row");
        const matchingPairs = [];

        recordRows.forEach((row) => {
            const appId = (row.dataset.appid || "").toLowerCase();
            const name = (row.dataset.name || "").toLowerCase();
            const phone = (row.dataset.phone || "").toLowerCase();
            const location = (row.dataset.location || "").toLowerCase();
            const merchant = (row.dataset.merchant || "").toLowerCase();
            const reasonCode = (row.dataset.reason || "").toLowerCase();
            const primaryReason = (row.dataset.primaryreason || "").toLowerCase();
            const textContent = row.textContent.toLowerCase();

            const matchesQuery = !query ||
                appId.includes(query) ||
                name.includes(query) ||
                phone.includes(query) ||
                location.includes(query) ||
                merchant.includes(query) ||
                primaryReason.includes(query) ||
                textContent.includes(query);

            let matchesReason = (reason === "all");
            if (!matchesReason) {
                if (reasonCode === reason) {
                    matchesReason = true;
                } else if (reason === "dti" && (textContent.includes("dti") || textContent.includes("debt"))) {
                    matchesReason = true;
                } else if (reason === "score" && (textContent.includes("bureau") || textContent.includes("score"))) {
                    matchesReason = true;
                } else if (reason === "utility" && (textContent.includes("utility") || textContent.includes("meter"))) {
                    matchesReason = true;
                } else if (reason === "roof" && (textContent.includes("roof") || textContent.includes("structural") || textContent.includes("engineer"))) {
                    matchesReason = true;
                }
            }

            if (matchesQuery && matchesReason) {
                matchingPairs.push({ row });
            } else {
                row.style.display = "none";
                row.hidden = true;
                row.setAttribute("hidden", "");
            }
        });

        const totalMatches = matchingPairs.length;

        // Update records count badge
        if (rejectedRecordsCount) {
            rejectedRecordsCount.textContent = totalMatches === 1 ? "1 declined application" : `${totalMatches} declined applications`;
        }

        // Empty state handling
        if (rejectedEmptyState) {
            rejectedEmptyState.style.display = (totalMatches === 0) ? "block" : "none";
        }

        // Pagination / See more toggle handling (Initial 3 records display)
        if (totalMatches === 0) {
            if (rejectedPaginationFooter) rejectedPaginationFooter.style.display = "none";
        } else if (totalMatches <= 3) {
            matchingPairs.forEach(({ row }) => {
                row.style.display = "";
                row.hidden = false;
                row.removeAttribute("hidden");
            });
            if (rejectedPaginationFooter) rejectedPaginationFooter.style.display = "none";
        } else {
            // More than 3 matching records
            if (rejectedPaginationFooter) rejectedPaginationFooter.style.display = "flex";

            if (rejectedExpanded) {
                matchingPairs.forEach(({ row }) => {
                    row.style.display = "";
                    row.hidden = false;
                    row.removeAttribute("hidden");
                });
                if (toggleRejectedText) toggleRejectedText.textContent = "See less";
                if (toggleRejectedRowsBtn) {
                    toggleRejectedRowsBtn.setAttribute("aria-expanded", "true");
                    toggleRejectedRowsBtn.classList.add("expanded");
                }
            } else {
                matchingPairs.forEach(({ row }, index) => {
                    if (index < 3) {
                        row.style.display = "";
                        row.hidden = false;
                        row.removeAttribute("hidden");
                    } else {
                        row.style.display = "none";
                        row.hidden = true;
                        row.setAttribute("hidden", "");
                    }
                });
                const hiddenCount = totalMatches - 3;
                if (toggleRejectedText) {
                    toggleRejectedText.textContent = `See more (${hiddenCount} more ${hiddenCount === 1 ? "application" : "applications"})`;
                }
                if (toggleRejectedRowsBtn) {
                    toggleRejectedRowsBtn.setAttribute("aria-expanded", "false");
                    toggleRejectedRowsBtn.classList.remove("expanded");
                }
            }
        }
    }

    if (rejectedSearchInput) {
        rejectedSearchInput.addEventListener("input", () => {
            rejectedExpanded = false;
            filterRejected();
        });
    }

    if (reasonFilterSelect) {
        reasonFilterSelect.addEventListener("change", () => {
            rejectedExpanded = false;
            filterRejected();
        });
    }

    if (toggleRejectedRowsBtn) {
        toggleRejectedRowsBtn.addEventListener("click", (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            rejectedExpanded = !rejectedExpanded;
            filterRejected();
        });
    }

    // Declined Application Details Modal Controller
    const declineDetailModal = document.getElementById("declineDetailModal");
    const closeDeclineModalBtn = document.getElementById("closeDeclineModalBtn");
    const closeDeclineModalFooterBtn = document.getElementById("closeDeclineModalFooterBtn");
    const downloadAdverseNoticeBtn = document.getElementById("downloadAdverseNoticeBtn");
    const modalDeclineActionBtn = document.getElementById("modalDeclineActionBtn");

    function openDeclineDetailsModal(data) {
        if (!declineDetailModal) return;

        let appRecord = null;
        if (window.HelloSolarStore && typeof window.HelloSolarStore.getApplicationById === "function") {
            appRecord = window.HelloSolarStore.getApplicationById(data.appid);
        }

        const bName = appRecord?.applicant?.name || data.name || "Applicant";
        const appId = appRecord?.id || data.appid || "APP-XXXX";
        const merchant = appRecord?.system?.merchant || data.merchant || "Accredited Installer";
        const phone = appRecord?.applicant?.phone || data.phone || "";
        const location = appRecord?.applicant?.location || data.location || "Philippines";
        const contact = `${location}${phone ? " · " + phone : ""}`;
        const amount = appRecord?.loan?.amount || appRecord?.fundedAmount || data.amount || "₱0";
        const reason = appRecord?.declineReason || appRecord?.loan?.declineReason || data.primaryreason || "Underwriting Criteria Unmet";
        const rawDate = (appRecord?.decisionDate || appRecord?.loan?.declineDate || data.date || "Sep 05, 2026").replace(/&middot;/g, "·");
        const cleanDate = rawDate.split("·")[0].trim();
        const policy = appRecord ? `Application declined according to risk policy criteria. Adverse decision reason: ${reason}` : (data.policy || "Application declined according to risk policy criteria.");

        const applicantTitle = document.getElementById("modalDeclineApplicantTitle");
        const declineAppId = document.getElementById("modalDeclineAppId");
        const declineName = document.getElementById("modalDeclineName");
        const declineMerchant = document.getElementById("modalDeclineMerchant");
        const declineContact = document.getElementById("modalDeclineContact");
        const declineAmount = document.getElementById("modalDeclineAmount");
        const declinePrimaryReason = document.getElementById("modalDeclinePrimaryReason");
        const declineReasonDetail = document.getElementById("modalDeclineReasonDetail");
        const declineDate = document.getElementById("modalDeclineDate");
        const declinePolicy = document.getElementById("modalDeclinePolicy");
        const statusBadge = document.getElementById("modalDeclineStatusBadge");
        const actionBtn = document.getElementById("modalDeclineActionBtn");

        if (applicantTitle) applicantTitle.textContent = bName;
        if (declineAppId) declineAppId.textContent = appId;
        if (declineName) declineName.textContent = bName;
        if (declineMerchant) declineMerchant.textContent = merchant;
        if (declineContact) declineContact.textContent = contact;
        if (declineAmount) declineAmount.textContent = amount;
        if (declinePrimaryReason) declinePrimaryReason.textContent = reason;
        if (declineReasonDetail) declineReasonDetail.textContent = reason;
        if (declineDate) declineDate.textContent = cleanDate;
        if (declinePolicy) declinePolicy.textContent = policy;

        if (statusBadge) {
            const status = data.status || "Declined";
            const isEligible = status.toLowerCase().includes("eligible") || status.toLowerCase().includes("consent");
            statusBadge.className = isEligible ? "badge badge-pending" : "badge badge-rejected";
            statusBadge.innerHTML = `<span class="dot"></span> ${status}`;
        }

        if (actionBtn) {
            const actionText = data.actiontext || "Invite Co-Maker";
            actionBtn.textContent = actionText;
            actionBtn.onclick = () => {
                const name = data.name || "applicant";
                const appId = data.appid || "HS-APP";
                if (actionText.includes("Co-Maker")) {
                    alert(`Invite link sent to ${name} to add an employed Co-Maker/Guarantor.`);
                } else if (actionText.includes("Landlord")) {
                    alert(`Sent landlord consent form request to ${name}.`);
                } else if (actionText.includes("Adverse")) {
                    alert(`Displaying Credit Bureau Adverse Action Details for ${appId}.`);
                } else if (actionText.includes("Report") || actionText.includes("Structural")) {
                    alert(`Viewing Engineer Assessment report for ${appId}.`);
                } else {
                    alert(`Action processed for ${name} (${appId}).`);
                }
            };
        }

        declineDetailModal.classList.add("open");
        declineDetailModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function closeDeclineDetailsModal() {
        if (!declineDetailModal) return;
        declineDetailModal.classList.remove("open");
        declineDetailModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    if (closeDeclineModalBtn) closeDeclineModalBtn.addEventListener("click", closeDeclineDetailsModal);
    if (closeDeclineModalFooterBtn) closeDeclineModalFooterBtn.addEventListener("click", closeDeclineDetailsModal);
    if (declineDetailModal) {
        declineDetailModal.addEventListener("click", (e) => {
            if (e.target === declineDetailModal) closeDeclineDetailsModal();
        });
    }

    if (downloadAdverseNoticeBtn) {
        downloadAdverseNoticeBtn.addEventListener("click", () => {
            const appId = document.getElementById("modalDeclineAppId")?.textContent || "HS-APP";
            alert(`Downloading Official Adverse Action Notice & Statement of Credit Denial (PDF) for Application #${appId}...`);
        });
    }

    // Delegate click for View Details buttons on rejected page
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-open-decline-modal, .btn-toggle-decline-detail");
        if (!btn) return;
        const row = btn.closest("tr.decline-record-row");
        const dataset = row ? Object.assign({}, row.dataset, btn.dataset) : btn.dataset;
        openDeclineDetailsModal(dataset);
    });

    // Escape key handling
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (declineDetailModal && declineDetailModal.classList.contains("open")) {
                closeDeclineDetailsModal();
            }
        }
    });

    // Institutional Adverse Action CSV Export Function (preserves full scope & hidden records)
    function exportDeclinedApplicationsCSV() {
        if (!rejectedTable) return;
        const recordRows = rejectedTable.querySelectorAll("tbody tr.decline-record-row");
        const query = (rejectedSearchInput ? rejectedSearchInput.value.toLowerCase().trim() : "");
        const reason = (reasonFilterSelect ? reasonFilterSelect.value : "all");

        const matchingData = [];
        recordRows.forEach((row) => {
            const appId = row.dataset.appid || "";
            const name = row.dataset.name || "";
            const phone = row.dataset.phone || "";
            const location = row.dataset.location || "";
            const merchant = row.dataset.merchant || "";
            const amount = row.dataset.amount || "";
            const reasonCode = row.dataset.reason || "";
            const primaryReason = row.dataset.primaryreason || "";
            const reasonDetail = row.dataset.reasondetail || "";
            const date = row.dataset.date || "";
            const status = row.dataset.status || "";

            const textContent = `${appId} ${name} ${phone} ${location} ${merchant} ${primaryReason}`.toLowerCase();
            const matchesQuery = !query || textContent.includes(query);

            let matchesReason = (reason === "all");
            if (!matchesReason) {
                if (reasonCode === reason) matchesReason = true;
                else if (reason === "dti" && (textContent.includes("dti") || textContent.includes("debt"))) matchesReason = true;
                else if (reason === "score" && (textContent.includes("bureau") || textContent.includes("score"))) matchesReason = true;
                else if (reason === "utility" && (textContent.includes("utility") || textContent.includes("meter"))) matchesReason = true;
                else if (reason === "roof" && (textContent.includes("roof") || textContent.includes("structural") || textContent.includes("engineer"))) matchesReason = true;
            }

            if (matchesQuery && matchesReason) {
                matchingData.push([
                    appId,
                    name,
                    phone,
                    location,
                    merchant,
                    amount,
                    primaryReason,
                    reasonDetail,
                    date,
                    status
                ]);
            }
        });

        if (matchingData.length === 0) {
            triggerToast("No matching declined records found to export.");
            return;
        }

        const headers = ["Application ID", "Applicant Name", "Contact Phone", "Location", "Merchant Installer", "Requested Amount", "Primary Decline Reason", "Policy Finding Detail", "Decline Date", "Re-application Status"];
        const csvRows = [headers.map((h) => `"${h}"`).join(",")];
        matchingData.forEach((r) => {
            csvRows.push(r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","));
        });

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csvRows.join("\r\n"));
        const downloadLink = document.createElement("a");
        downloadLink.setAttribute("href", csvContent);
        downloadLink.setAttribute("download", `HelloSolar_Declined_Applications_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        triggerToast("Generating institutional CSV report... Download ready! ✓");
    }

    if (exportDeclinedBtn) {
        exportDeclinedBtn.addEventListener("click", exportDeclinedApplicationsCSV);
    }

    // Initialize Declined Table on page load
    if (rejectedTable) {
        renderRejectedTable();
    }

    // Expose helpers globally
    window.renderRejectedTable = renderRejectedTable;
    window.filterRejected = filterRejected;
    window.openDeclineDetailsModal = openDeclineDetailsModal;
    window.exportDeclinedApplicationsCSV = exportDeclinedApplicationsCSV;
    // Rejected Page Quick Actions
    const quickExportDeclined = document.getElementById("quickExportDeclined");
    if (quickExportDeclined) {
        quickExportDeclined.addEventListener("click", () => {
            const exp = document.getElementById("exportDeclinedBtn");
            if (exp) exp.click();
        });
    }

    const quickFilterDti = document.getElementById("quickFilterDti");
    if (quickFilterDti) {
        quickFilterDti.addEventListener("click", () => {
            const reasonFilterSelect = document.getElementById("reasonFilterSelect");
            if (reasonFilterSelect) {
                reasonFilterSelect.value = "dti";
                if (typeof window.filterRejected === "function") window.filterRejected();
            }
        });
    }

    const quickFilterScore = document.getElementById("quickFilterScore");
    if (quickFilterScore) {
        quickFilterScore.addEventListener("click", () => {
            const reasonFilterSelect = document.getElementById("reasonFilterSelect");
            if (reasonFilterSelect) {
                reasonFilterSelect.value = "score";
                if (typeof window.filterRejected === "function") window.filterRejected();
            }
        });
    }

    const quickFilterAllRejected = document.getElementById("quickFilterAllRejected");
    if (quickFilterAllRejected) {
        quickFilterAllRejected.addEventListener("click", () => {
            const reasonFilterSelect = document.getElementById("reasonFilterSelect");
            if (reasonFilterSelect) {
                reasonFilterSelect.value = "all";
                if (typeof window.filterRejected === "function") window.filterRejected();
            }
        });
    }

});
