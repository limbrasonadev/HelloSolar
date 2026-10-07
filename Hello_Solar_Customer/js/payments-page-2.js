
        (function () {
            "use strict";

            const proofFileInput = document.getElementById("proofFileInput");
            const uploadDropzone = document.getElementById("uploadDropzone");
            const selectedFileBadge = document.getElementById("selectedFileBadge");
            const selectedFileName = document.getElementById("selectedFileName");
            const uploadProofBtn = document.getElementById("uploadProofBtn");
            const downloadReceiptBtn = document.getElementById("downloadReceiptBtn");

            // Summary card elements
            const paymentNextAmount = document.getElementById("paymentNextAmount");
            const paymentNextDueMeta = document.getElementById("paymentNextDueMeta");
            const paymentPlanTerm = document.getElementById("paymentPlanTerm");
            const paymentPlanMeta = document.getElementById("paymentPlanMeta");
            const paymentPaidCount = document.getElementById("paymentPaidCount");
            const paymentTotalPaidMeta = document.getElementById("paymentTotalPaidMeta");
            const paymentStandingVal = document.getElementById("paymentStandingVal");
            const paymentStandingMeta = document.getElementById("paymentStandingMeta");

            // Schedule table and card elements
            const paymentScheduleSubtitle = document.getElementById("paymentScheduleSubtitle");
            const paymentScheduleBadge = document.getElementById("paymentScheduleBadge");
            const paymentScheduleTableBody = document.getElementById("paymentScheduleTableBody");
            const paymentScheduleCards = document.getElementById("paymentScheduleCards");
            const paymentsSearchInput = document.getElementById("paymentsSearchInput");
            const paymentsFilterChips = document.getElementById("paymentsFilterChips");

            // Due callout elements
            const dueCalloutBox = document.getElementById("dueCalloutBox");
            const dueCalloutTitle = document.getElementById("dueCalloutTitle");
            const dueCalloutAmount = document.getElementById("dueCalloutAmount");
            const dueCalloutPeriod = document.getElementById("dueCalloutPeriod");
            const dueCalloutPeriodLabel = document.getElementById("dueCalloutPeriodLabel");
            const dueCalloutDueDate = document.getElementById("dueCalloutDueDate");
            const dueCalloutPaymentType = document.getElementById("dueCalloutPaymentType");
            const dueCalloutRef = document.getElementById("dueCalloutRef");
            const howToPayRefBadge = document.getElementById("howToPayRefBadge");

            // Submit Payment Proof Modal elements
            const submitPaymentProofModal = document.getElementById("submitPaymentProofModal");
            const closeProofModalBtn = document.getElementById("closeProofModalBtn");
            const modalCancelProofBtn = document.getElementById("modalCancelProofBtn");
            const proofModalTitle = document.getElementById("proofModalTitle");
            const proofModalSubtitle = document.getElementById("proofModalSubtitle");
            const paymentProofModalForm = document.getElementById("paymentProofModalForm");
            const proofChannelInput = document.getElementById("proofChannelInput");
            const proofAmountInput = document.getElementById("proofAmountInput");
            const proofDateInput = document.getElementById("proofDateInput");
            const proofRefInput = document.getElementById("proofRefInput");
            const modalProofFileInput = document.getElementById("modalProofFileInput");
            const modalProofDropzone = document.getElementById("modalProofDropzone");
            const modalSelectedFileBadge = document.getElementById("modalSelectedFileBadge");
            const modalSelectedFileName = document.getElementById("modalSelectedFileName");
            const modalSubmitProofBtn = document.getElementById("modalSubmitProofBtn");

            // Mobile expandable action panels
            const howToPayToggleBtn = document.getElementById("howToPayToggleBtn");
            const howToPaySection = document.getElementById("howToPaySection");
            const uploadReceiptToggleBtn = document.getElementById("uploadReceiptToggleBtn");
            const submitProofSection = document.getElementById("submitProofSection");

            // Payment History toggle elements
            const paymentsHistoryToggleWrap = document.getElementById("paymentsHistoryToggleWrap");
            const paymentsHistoryToggleBtn = document.getElementById("paymentsHistoryToggleBtn");
            const paymentsHistoryToggleText = document.getElementById("paymentsHistoryToggleText");
            const COLLAPSED_RECORD_LIMIT = 3;
            let isHistoryExpanded = false;

            let currentPackage = null;
            let renderToken = 0;
            let selectedFile = null;
            let activeFilter = "all";
            let activeSearchQuery = "";
            const packageFileDrafts = {};
            // Latest receipt awaiting Super Admin verification, from the shared application record
            function getPendingProof(pkg) {
                const latest = pkg && Array.isArray(pkg.receiptSubmissions) ? pkg.receiptSubmissions[0] : null;
                if (!latest || latest.status !== "Pending Verification") return null;
                const at = latest.submittedAt ? new Date(latest.submittedAt) : null;
                return {
                    fileName: latest.fileName,
                    channel: latest.channel,
                    amount: latest.amount != null ? "₱" + Number(latest.amount).toLocaleString("en-PH", { maximumFractionDigits: 2 }) : "",
                    date: latest.date,
                    ref: latest.reference,
                    timestamp: at ? at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
                    status: "Payment Submitted (Pending Super Admin Verification)"
                };
            }

            // ----------------------------------------------------------------------
            // 1. UNFINISHED INPUT / DIRTY CHECK PROTECTION
            // ----------------------------------------------------------------------
            function setupDirtyCheck() {
                if (window.HelloSolar && window.HelloSolar.registerDirtyCheck) {
                    window.HelloSolar.registerDirtyCheck(() => {
                        if (selectedFile) {
                            return `payment proof file "${selectedFile.name}" is selected but not submitted`;
                        }
                        return null;
                    });
                }
            }

            function clearSelectedFile(preserveInDraft = true) {
                if (preserveInDraft && currentPackage && selectedFile) {
                    packageFileDrafts[currentPackage.id] = selectedFile;
                }
                selectedFile = null;
                if (proofFileInput) proofFileInput.value = "";
                if (modalProofFileInput) modalProofFileInput.value = "";
                if (selectedFileName) selectedFileName.textContent = "";
                if (modalSelectedFileName) modalSelectedFileName.textContent = "";
                if (selectedFileBadge) selectedFileBadge.classList.remove("visible");
                if (modalSelectedFileBadge) modalSelectedFileBadge.classList.remove("visible");
            }

            function restoreSelectedFile(file) {
                if (!file) return;
                selectedFile = file;
                const fileText = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
                if (selectedFileName) selectedFileName.textContent = fileText;
                if (modalSelectedFileName) modalSelectedFileName.textContent = fileText;
                if (selectedFileBadge) selectedFileBadge.classList.add("visible");
                if (modalSelectedFileBadge) modalSelectedFileBadge.classList.add("visible");
            }

            function handleFileSelected(file) {
                if (!file) return;
                selectedFile = file;
                if (currentPackage) {
                    packageFileDrafts[currentPackage.id] = file;
                }
                restoreSelectedFile(file);
            }

            function openPaymentProofModal() {
                if (!submitPaymentProofModal) return;
                if (submitPaymentProofModal.open) return;

                if (currentPackage) {
                    if (proofModalSubtitle) {
                        proofModalSubtitle.textContent = `Submit payment receipt for ${currentPackage.name} (#${currentPackage.accountNo})`;
                    }
                    if (proofAmountInput) {
                        const isFullPay = currentPackage.paymentType === "full_payment";
                        const amt = isFullPay
                            ? (currentPackage.formattedAmountDue || currentPackage.totalAmountFormatted || "")
                            : (currentPackage.formattedMonthlyPayment || "");
                        proofAmountInput.value = amt;
                    }
                    if (proofDateInput) {
                        proofDateInput.value = new Date().toISOString().split("T")[0];
                    }
                    if (proofRefInput) {
                        const isFullPay = currentPackage.paymentType === "full_payment";
                        const ref = isFullPay
                            ? `${currentPackage.accountNo}-FP`
                            : (currentPackage.currentBillRef || (currentPackage.payments && currentPackage.payments.currentBillRef) || currentPackage.accountNo || "");
                        proofRefInput.value = ref;
                    }
                }

                if (selectedFile) {
                    restoreSelectedFile(selectedFile);
                } else if (modalSelectedFileBadge) {
                    modalSelectedFileBadge.classList.remove("visible");
                }

                const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
                if (scrollbarWidth > 0) {
                    document.body.style.paddingRight = `${scrollbarWidth}px`;
                }
                submitPaymentProofModal.showModal();
                document.body.style.overflow = "hidden";
            }

            function closePaymentProofModal() {
                if (!submitPaymentProofModal) return;
                if (submitPaymentProofModal.open) {
                    submitPaymentProofModal.close();
                }
                document.body.style.overflow = "";
                document.body.style.paddingRight = "";
            }

            // Close buttons in modal
            if (closeProofModalBtn) {
                closeProofModalBtn.addEventListener("click", () => closePaymentProofModal());
            }
            if (modalCancelProofBtn) {
                modalCancelProofBtn.addEventListener("click", () => closePaymentProofModal());
            }

            // Dropzone & file input events on main page
            if (uploadDropzone) {
                uploadDropzone.addEventListener("click", () => openPaymentProofModal());
                uploadDropzone.addEventListener("keydown", (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openPaymentProofModal();
                    }
                });
                uploadDropzone.addEventListener("dragover", (e) => {
                    e.preventDefault();
                    uploadDropzone.classList.add("dragover");
                });
                uploadDropzone.addEventListener("dragleave", () => {
                    uploadDropzone.classList.remove("dragover");
                });
                uploadDropzone.addEventListener("drop", (e) => {
                    e.preventDefault();
                    uploadDropzone.classList.remove("dragover");
                    if (e.dataTransfer.files.length > 0) {
                        handleFileSelected(e.dataTransfer.files[0]);
                        openPaymentProofModal();
                    }
                });
            }

            if (proofFileInput) {
                proofFileInput.addEventListener("change", () => {
                    if (proofFileInput.files.length > 0) {
                        handleFileSelected(proofFileInput.files[0]);
                        openPaymentProofModal();
                    }
                });
            }

            if (uploadProofBtn) {
                uploadProofBtn.addEventListener("click", () => {
                    openPaymentProofModal();
                });
            }

            // Modal internal dropzone and file input
            if (modalProofDropzone && modalProofFileInput) {
                modalProofDropzone.addEventListener("click", () => modalProofFileInput.click());
                modalProofDropzone.addEventListener("keydown", (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        modalProofFileInput.click();
                    }
                });
                modalProofDropzone.addEventListener("dragover", (e) => {
                    e.preventDefault();
                    modalProofDropzone.classList.add("dragover");
                });
                modalProofDropzone.addEventListener("dragleave", () => {
                    modalProofDropzone.classList.remove("dragover");
                });
                modalProofDropzone.addEventListener("drop", (e) => {
                    e.preventDefault();
                    modalProofDropzone.classList.remove("dragover");
                    if (e.dataTransfer.files.length > 0) {
                        handleFileSelected(e.dataTransfer.files[0]);
                    }
                });
                modalProofFileInput.addEventListener("change", () => {
                    if (modalProofFileInput.files.length > 0) {
                        handleFileSelected(modalProofFileInput.files[0]);
                    }
                });
            }

            // Modal form submission: sets Payment Under Review only. Super Admin verification is required before Paid.
            if (paymentProofModalForm) {
                paymentProofModalForm.addEventListener("submit", (e) => {
                    e.preventDefault();
                    if (!currentPackage) return;
                    if (!selectedFile) {
                        if (window.HelloSolar && window.HelloSolar.toast) {
                            window.HelloSolar.toast("Receipt Required", "Please attach a deposit slip or payment confirmation before submitting.");
                        } else {
                            alert("Please attach a receipt file.");
                        }
                        return;
                    }

                    if (modalSubmitProofBtn) {
                        modalSubmitProofBtn.disabled = true;
                        modalSubmitProofBtn.textContent = "Processing submission...";
                    }

                    const channelVal = proofChannelInput ? proofChannelInput.value : "GCash";
                    const amountVal = proofAmountInput ? proofAmountInput.value : (currentPackage.formattedMonthlyPayment || "");
                    const dateVal = proofDateInput ? proofDateInput.value : new Date().toISOString().split("T")[0];
                    const refVal = proofRefInput ? proofRefInput.value : (currentPackage.accountNo || "");
                    const fileName = selectedFile.name;
                    const pkgName = currentPackage.name;
                    const pkgAcc = currentPackage.accountNo;

                    setTimeout(() => {
                        // Receipt goes to the shared application record for Super Admin verification
                        // (Payment Under Review only — never marked Paid from the customer side).
                        const reminder = currentPackage.paymentType !== "full_payment" && window.HelloSolar && window.HelloSolar.getDelayedPaymentReminder
                            ? window.HelloSolar.getDelayedPaymentReminder(currentPackage)
                            : null;
                        // Billing periods this receipt pays: the past-due bills, otherwise the next unpaid bill
                        const isoOf = row => {
                            const raw = String(row.dueDate || row.due || "");
                            if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
                            const d = new Date(raw);
                            return isNaN(d) ? "" : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                        };
                        const schedule = (currentPackage.payments && Array.isArray(currentPackage.payments.schedule)) ? currentPackage.payments.schedule : [];
                        const coveredRows = currentPackage.paymentType === "full_payment" ? []
                            : ((reminder && reminder.bills && reminder.bills.length)
                                ? reminder.bills
                                : schedule.filter(row => !/^(paid|pending verification)/i.test(String(row.status || ""))).slice(0, 1));
                        const bills = coveredRows.map(row => ({ billId: row.id, period: row.period, dueDate: isoOf(row), amount: row.formattedAmount || row.amount }));
                        const customer = window.HelloSolar && window.HelloSolar.getCustomer ? window.HelloSolar.getCustomer() : {};
                        const result = window.HSShared
                            ? window.HSShared.submitReceipt(customer.accountId, currentPackage.appId, {
                                fileName,
                                channel: channelVal,
                                amount: amountVal,
                                date: dateVal,
                                reference: refVal,
                                bills
                            })
                            : { ok: false, error: "Receipt submission is unavailable right now." };

                        if (modalSubmitProofBtn) {
                            modalSubmitProofBtn.disabled = false;
                            modalSubmitProofBtn.textContent = "Submit Payment Proof";
                        }
                        if (!result.ok) {
                            if (window.HelloSolar && window.HelloSolar.toast) {
                                window.HelloSolar.toast("Receipt Not Submitted", result.error || "Please try again.");
                            }
                            return;
                        }

                        delete packageFileDrafts[currentPackage.id];
                        clearSelectedFile(false);
                        closePaymentProofModal();

                        if (window.HelloSolar && window.HelloSolar.refreshSharedPackages) {
                            window.HelloSolar.refreshSharedPackages();
                        }

                        if (uploadProofBtn) {
                            uploadProofBtn.textContent = "Proof Submitted (Pending Review) ✓";
                        }

                        if (window.HelloSolar && window.HelloSolar.toast) {
                            window.HelloSolar.toast(
                                "Payment Proof Submitted",
                                `Receipt (${fileName}) for ${pkgName} (#${pkgAcc}) submitted via ${channelVal}. Status set to Payment Under Review pending Super Admin verification.`
                            );
                        }

                        const refreshed = (window.HelloSolar && window.HelloSolar.getActivePackage)
                            ? window.HelloSolar.getActivePackage()
                            : currentPackage;
                        renderPaymentsPage(refreshed);
                    }, 600);
                });
            }

            // ----------------------------------------------------------------------
            // 2. RENDER PAYMENTS FOR ACTIVE PACKAGE
            // ----------------------------------------------------------------------
            function renderTableRows(schedule, pkg) {
                if (paymentScheduleTableBody) paymentScheduleTableBody.innerHTML = "";
                if (paymentScheduleCards) paymentScheduleCards.innerHTML = "";

                if (!Array.isArray(schedule) || schedule.length === 0) {
                    if (paymentsHistoryToggleWrap) paymentsHistoryToggleWrap.style.display = "none";
                    if (paymentScheduleTableBody) {
                        paymentScheduleTableBody.innerHTML = `
                            <tr>
                                <td colspan="5" style="text-align: center; padding: 24px; color: var(--gray-500);">
                                    No payment records found.
                                </td>
                            </tr>
                        `;
                    }
                    if (paymentScheduleCards) {
                        paymentScheduleCards.innerHTML = `
                            <div style="text-align: center; padding: 24px; color: var(--gray-500); background: #f8fafc; border-radius: var(--radius-md); border: 1px dashed #cbd5e1;">
                                No payment records found.
                            </div>
                        `;
                    }
                    return;
                }

                // Check if user submitted proof for this package
                const pendingProof = getPendingProof(pkg);

                // Filter rows (applied to complete dataset before limiting visible records)
                const filtered = schedule.filter(row => {
                    // Status filter
                    const rowStatusLower = (row.status || "").toLowerCase();
                    const isPaidRow = (rowStatusLower === "paid" || rowStatusLower.startsWith("paid")) && !rowStatusLower.includes("unpaid");
                    const isUnpaidRow = rowStatusLower.includes("unpaid") || rowStatusLower.includes("overdue");
                    const isUpcomingRow = (rowStatusLower.includes("upcoming") || rowStatusLower.includes("due")) && !isUnpaidRow;

                    if (activeFilter === "paid" && !isPaidRow) return false;
                    if ((activeFilter === "upcoming" || activeFilter === "due") && !isUpcomingRow) return false;
                    if (activeFilter === "unpaid" && !isUnpaidRow) return false;

                    // Search filter
                    if (activeSearchQuery) {
                        const q = activeSearchQuery.toLowerCase();
                        const periodMatch = (row.period || "").toLowerCase().includes(q);
                        const dueMatch = (row.due || "").toLowerCase().includes(q);
                        const statusMatch = (row.status || "").toLowerCase().includes(q);
                        const receiptMatch = (row.receiptId || "").toLowerCase().includes(q);
                        const amountMatch = (row.amount || "").toLowerCase().includes(q);
                        if (!periodMatch && !dueMatch && !statusMatch && !receiptMatch && !amountMatch) return false;
                    }

                    return true;
                });

                if (filtered.length === 0) {
                    if (paymentsHistoryToggleWrap) paymentsHistoryToggleWrap.style.display = "none";
                    if (paymentScheduleTableBody) {
                        paymentScheduleTableBody.innerHTML = `
                            <tr>
                                <td colspan="5" style="text-align: center; padding: 32px 16px; color: var(--gray-500);">
                                    <strong>No records match your filter</strong>
                                    <p style="font-size: 12px; margin-top: 4px;">Try searching for another period or resetting the filter chips.</p>
                                </td>
                            </tr>
                        `;
                    }
                    if (paymentScheduleCards) {
                        paymentScheduleCards.innerHTML = `
                            <div style="text-align: center; padding: 28px 16px; color: var(--gray-500); background: #f8fafc; border-radius: var(--radius-md); border: 1px dashed #cbd5e1;">
                                <strong style="color: var(--navy); display: block; margin-bottom: 4px;">No records match your filter</strong>
                                <span style="font-size: 12px;">Try searching for another period or resetting the filter chips.</span>
                            </div>
                        `;
                    }
                    return;
                }

                // Manage toggle visibility and button label
                const needsToggle = filtered.length > COLLAPSED_RECORD_LIMIT;
                if (paymentsHistoryToggleWrap) {
                    if (needsToggle) {
                        paymentsHistoryToggleWrap.style.display = "flex";
                        if (paymentsHistoryToggleBtn) {
                            paymentsHistoryToggleBtn.setAttribute("aria-expanded", isHistoryExpanded ? "true" : "false");
                        }
                        if (paymentsHistoryToggleText) {
                            paymentsHistoryToggleText.textContent = isHistoryExpanded ? "See less" : "See more";
                        }
                    } else {
                        paymentsHistoryToggleWrap.style.display = "none";
                    }
                }

                // Limit visible records to 3 when collapsed, preserving existing sort order
                const visibleRecords = (needsToggle && !isHistoryExpanded)
                    ? filtered.slice(0, COLLAPSED_RECORD_LIMIT)
                    : filtered;

                visibleRecords.forEach(row => {
                    let displayStatus = row.status;
                    let displayBadge = row.badgeClass || 'badge-neutral';
                    let isHighlighted = false;

                    const rowStatusLower = (row.status || "").toLowerCase();
                    const isUnpaid = rowStatusLower.includes("unpaid") || rowStatusLower.includes("overdue");

                    if (pendingProof && (row.status === "Due Soon" || row.status === "Due")) {
                        displayStatus = "Payment Submitted (Pending Verification)";
                        displayBadge = "badge-warning";
                        isHighlighted = true;
                    } else if (isUnpaid) {
                        displayBadge = row.badgeClass || "badge-overdue";
                    } else if (rowStatusLower === "paid") {
                        displayBadge = row.badgeClass || "badge-paid";
                    } else if (rowStatusLower.includes("upcoming") || rowStatusLower.includes("due")) {
                        displayBadge = row.badgeClass || "badge-upcoming";
                    }

                    // 1. Desktop Table Row
                    if (paymentScheduleTableBody) {
                        const tr = document.createElement("tr");
                        if (isHighlighted) {
                            tr.style.background = "#fffdf5";
                        } else if (isUnpaid) {
                            tr.style.background = "#fff5f5";
                        } else if (row.status === "Due Soon") {
                            tr.style.background = "#fffbf2";
                        }

                        const receiptCell = row.receiptId ? `
                            <button type="button" class="btn btn-outline btn-xs download-row-receipt" data-receipt="${row.receiptId}" data-period="${row.period}" title="Download receipt for ${row.period}">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                <span>${row.receiptId}</span>
                            </button>
                        ` : (pendingProof && (row.status === "Due Soon" || row.status === "Due")
                            ? `<span style="color: var(--solar-orange-dark); font-size: 11.5px; font-weight: 700;">Uploaded (${pendingProof.fileName})</span>`
                            : (isUnpaid
                                ? `<span style="color: #dc2626; font-size: 11.5px; font-weight: 700;">Past Due</span>`
                                : `<span style="color: var(--gray-400); font-size: 12px;">—</span>`));

                        const amountStyle = isUnpaid
                            ? 'style="color: #dc2626; font-weight: 800;"'
                            : (isHighlighted || row.status === 'Due Soon' ? 'style="color: var(--solar-orange-dark); font-weight: 800;"' : '');

                        tr.innerHTML = `
                            <td><strong>${row.period}</strong></td>
                            <td>${row.due}</td>
                            <td><span class="badge ${displayBadge}">${displayStatus}</span></td>
                            <td ${amountStyle}>${row.amount}</td>
                            <td>${receiptCell}</td>
                        `;
                        paymentScheduleTableBody.appendChild(tr);
                    }

                    // 2. Mobile Stacked Card
                    if (paymentScheduleCards) {
                        const card = document.createElement("article");
                        card.className = "payment-mobile-card";
                        if (isHighlighted) {
                            card.style.borderColor = "var(--solar-orange-light)";
                            card.style.background = "#fffdf5";
                        } else if (isUnpaid) {
                            card.style.borderColor = "#fca5a5";
                            card.style.background = "#fffafb";
                        } else if (row.status === "Due Soon") {
                            card.style.borderColor = "rgba(255, 122, 0, 0.35)";
                        }

                        let cardActionHtml = "";
                        if (row.receiptId) {
                            cardActionHtml = `
                                <div class="mobile-card-action">
                                    <button type="button" class="btn btn-outline btn-sm download-row-receipt" data-receipt="${row.receiptId}" data-period="${row.period}" style="width: 100%; justify-content: center; font-size: 12px; gap: 6px; padding: 7px 12px;">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="7 10 12 15 17 10"></polyline>
                                            <line x1="12" y1="15" x2="12" y2="3"></line>
                                        </svg>
                                        <span>Download Receipt</span>
                                    </button>
                                </div>
                            `;
                        } else if (pendingProof && (row.status === "Due Soon" || row.status === "Due")) {
                            cardActionHtml = `
                                <div style="font-size: 11.5px; color: var(--solar-orange-dark); font-weight: 700; background: #fff8eb; padding: 6px 10px; border-radius: var(--radius-sm); text-align: center;">
                                    Receipt Uploaded (${pendingProof.fileName})
                                </div>
                            `;
                        } else if (isUnpaid) {
                            cardActionHtml = `
                                <div style="font-size: 11.5px; color: #dc2626; font-weight: 700; background: #fee2e2; padding: 6px 10px; border-radius: var(--radius-sm); text-align: center;">
                                    Payment Overdue for ${row.period}
                                </div>
                            `;
                        }

                        const mobileAmountClass = (isHighlighted || row.status === 'Due Soon') ? 'highlight' : '';
                        const mobileAmountStyle = isUnpaid ? 'style="color: #dc2626 !important; font-weight: 800;"' : '';

                        card.innerHTML = `
                            <div class="mobile-card-header">
                                <span class="mobile-card-month">${row.period}</span>
                                <span class="badge ${displayBadge}">${displayStatus}</span>
                            </div>
                            <div class="mobile-card-body">
                                <div class="mobile-card-col">
                                    <span class="mobile-card-label">Amount</span>
                                    <span class="mobile-card-val ${mobileAmountClass}" ${mobileAmountStyle}>${row.amount}</span>
                                </div>
                                <div class="mobile-card-col" style="text-align: right;">
                                    <span class="mobile-card-label">Due Date</span>
                                    <span class="mobile-card-val-meta">${row.due}</span>
                                </div>
                            </div>
                            ${cardActionHtml}
                        `;
                        paymentScheduleCards.appendChild(card);
                    }
                });

                // Wire row download handlers for both table and mobile cards
                document.querySelectorAll(".download-row-receipt").forEach(btn => {
                    btn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        const rec = btn.dataset.receipt;
                        const per = btn.dataset.period;
                        if (window.HelloSolar && window.HelloSolar.toast) {
                            window.HelloSolar.toast(
                                "Receipt Downloaded",
                                `Receipt #${rec} for ${pkg.name} (${per}) downloaded.`
                            );
                        }
                    });
                });
            }

            function renderPaymentsPage(pkg) {
                if (!pkg) return;
                renderToken++;
                const thisToken = renderToken;

                currentPackage = pkg;
                isHistoryExpanded = false; // Reset to collapsed on account/package change

                // Restore or clear draft input for this system
                if (packageFileDrafts[pkg.id]) {
                    restoreSelectedFile(packageFileDrafts[pkg.id]);
                } else {
                    clearSelectedFile(false);
                }

                // Update account reference badge in instructions
                if (howToPayRefBadge) {
                    howToPayRefBadge.textContent = pkg.paymentType === "full_payment" ? `${pkg.accountNo}-FP` : (pkg.accountNo || "");
                }

                const summaryCard1Label = document.getElementById("summaryCard1Label");
                const summaryCard2Label = document.getElementById("summaryCard2Label");
                const summaryCard3Label = document.getElementById("summaryCard3Label");
                const summaryCard4Label = document.getElementById("summaryCard4Label");

                const isFullPayment = (pkg.paymentType === "full_payment");
                const pendingProof = getPendingProof(pkg);
                const isAct = (window.HelloSolar && window.HelloSolar.isSystemActive)
                    ? window.HelloSolar.isSystemActive(pkg)
                    : (pkg.projectStatus === "Active");

                if (isFullPayment) {
                    // ------------------------------------------------------------------
                    // FULL PAYMENT FLOW
                    // Show: Total Amount Due, How to Pay, Upload Receipt, Payment Status,
                    // and Receipt Verification Status. (No monthly installments)
                    // ------------------------------------------------------------------
                    if (summaryCard1Label) summaryCard1Label.textContent = "Total Amount Due";
                    if (summaryCard2Label) summaryCard2Label.textContent = "Payment Status";
                    if (summaryCard3Label) summaryCard3Label.textContent = "Payment Terms";
                    if (summaryCard4Label) summaryCard4Label.textContent = "Receipt Verification";

                    const totalFormatted = pkg.formattedTotalAmount || (pkg.payments && pkg.payments.formattedTotalAmount) || "—";
                    const isPaid = isAct || (pkg.paymentStatus === "Paid") || (pkg.amountDue === 0);
                    const amtDueFormatted = pendingProof ? "Under Review" : (isPaid ? "₱0" : (pkg.formattedAmountDue || totalFormatted));

                    // 1. Total Amount Due Card
                    if (paymentNextAmount) {
                        paymentNextAmount.textContent = amtDueFormatted;
                    }
                    if (paymentNextDueMeta) {
                        paymentNextDueMeta.textContent = pendingProof
                            ? `Receipt submitted (${pendingProof.fileName})`
                            : (isPaid ? "Full payment cleared" : `Total Contract: ${totalFormatted}`);
                    }

                    // 2. Payment Status Card
                    const payStatus = pendingProof ? "Payment Under Review" : (pkg.paymentStatus || (isPaid ? "Paid" : "Payment Required"));
                    if (paymentStandingVal) {
                        paymentStandingVal.textContent = payStatus;
                    }
                    if (paymentStandingMeta) {
                        if (pendingProof || payStatus === "Payment Under Review") {
                            paymentStandingMeta.innerHTML = `<span class="status-dot warning"></span>Payment proof under review`;
                        } else if (isPaid) {
                            paymentStandingMeta.innerHTML = `<span class="status-dot"></span>Account fully cleared`;
                        } else {
                            paymentStandingMeta.innerHTML = `<span class="status-dot warning"></span>Action required: payment proof`;
                        }
                    }

                    // 3. Payment Terms Card
                    if (paymentPlanTerm) {
                        paymentPlanTerm.textContent = "Full Payment";
                    }
                    if (paymentPlanMeta) {
                        paymentPlanMeta.textContent = "Single upfront payment";
                    }

                    // 4. Receipt Verification Status Card
                    const verifyStatus = pendingProof ? "Under Review" : (pkg.receiptVerificationStatus || (isPaid ? "Verified" : "Awaiting Submission"));
                    if (paymentPaidCount) {
                        paymentPaidCount.textContent = verifyStatus;
                    }
                    if (paymentTotalPaidMeta) {
                        paymentTotalPaidMeta.textContent = verifyStatus === "Verified" ? "Verified by Hello Solar Finance" : "Receipt submission verification";
                    }

                    // 5. Due Callout Box
                    if (dueCalloutBox) {
                        dueCalloutBox.style.background = isPaid ? "var(--gray-50)" : "#fff5e5";
                        dueCalloutBox.style.borderLeftColor = isPaid ? "var(--gray-300)" : "var(--solar-orange)";
                    }
                    if (dueCalloutTitle) {
                        dueCalloutTitle.textContent = isPaid ? "Payment Status" : (pendingProof ? "Verification Status" : "Total Amount Due");
                    }
                    if (dueCalloutAmount) {
                        dueCalloutAmount.textContent = pendingProof ? "Under Review" : (isPaid ? "Paid" : amtDueFormatted);
                    }
                    if (dueCalloutPaymentType) {
                        dueCalloutPaymentType.textContent = "Full Payment";
                    }
                    if (dueCalloutPeriodLabel) {
                        dueCalloutPeriodLabel.textContent = "Order";
                    }
                    if (dueCalloutPeriod) {
                        dueCalloutPeriod.textContent = `Full Contract Order (${pkg.appId || 'APP-8821'})`;
                    }
                    if (dueCalloutDueDate) {
                        dueCalloutDueDate.textContent = pkg.installationDate || "Upon Installation Scheduling";
                    }
                    if (dueCalloutRef) {
                        dueCalloutRef.textContent = `Ref: ${pkg.accountNo}-FP`;
                    }
                    if (uploadProofBtn) {
                        uploadProofBtn.textContent = (pendingProof || pkg.paymentStatus === "Payment Under Review" || pkg.receiptVerificationStatus === "Under Review")
                            ? "Proof Submitted (Pending Review) ✓"
                            : "Submit Proof of Payment";
                        uploadProofBtn.disabled = false;
                    }

                    // 6. Schedule Panel (Single Contract Order Invoice)
                    if (paymentScheduleSubtitle) {
                        paymentScheduleSubtitle.textContent = `Full payment record & contract invoice for ${pkg.name} (#${pkg.accountNo})`;
                    }
                    if (paymentScheduleBadge) {
                        paymentScheduleBadge.textContent = "Full Payment Terms";
                    }

                    const fullPaymentRecord = [
                        {
                            period: `Full System Payment (${pkg.appId || 'APP-8821'})`,
                            due: pkg.installationDate || "Upon Installation Scheduling",
                            amount: totalFormatted,
                            status: payStatus,
                            badgeClass: isPaid ? "badge-success" : (payStatus.includes("Review") ? "badge-warning" : "badge-upcoming"),
                            receiptId: `${pkg.accountNo}-FP`
                        }
                    ];
                    renderTableRows(fullPaymentRecord, pkg);

                } else {
                    // ------------------------------------------------------------------
                    // INSTALLMENT FLOW
                    // Show: Monthly Payment, Next Due Date, Payment Plan, Payments
                    // Completed, Total Paid, Payment History, and Receipt Upload.
                    // ------------------------------------------------------------------
                    if (summaryCard1Label) summaryCard1Label.textContent = "Monthly Payment";
                    if (summaryCard2Label) summaryCard2Label.textContent = "Payment Status";
                    if (summaryCard3Label) summaryCard3Label.textContent = "Payment Plan";
                    if (summaryCard4Label) summaryCard4Label.textContent = "Payments Completed";

                    const p = pkg.payments || {};
                    const schedule = Array.isArray(p.schedule) ? p.schedule : [];

                    // Extract paymentPlan as single source of truth
                    const plan = (pkg.paymentPlan && typeof pkg.paymentPlan === "object")
                        ? pkg.paymentPlan
                        : ((p.paymentPlan && typeof p.paymentPlan === "object") ? p.paymentPlan : null);

                    // Filter history records dynamically
                    const paidRecords = schedule.filter(r => {
                        const s = (r.status || "").toLowerCase();
                        return (s === "paid" || s.startsWith("paid")) && !s.includes("unpaid");
                    });
                    const unpaidRecords = schedule.filter(r => {
                        const s = (r.status || "").toLowerCase();
                        // A rejected receipt's bill is overdue only once its due date has passed
                        const pastDue = window.HelloSolar && typeof window.HelloSolar.isBillPastDue === "function" && window.HelloSolar.isBillPastDue(r);
                        return s.includes("unpaid") || s.includes("overdue") || (s.includes("re-upload") && pastDue);
                    });
                    const upcomingRecords = schedule.filter(r => {
                        const s = (r.status || "").toLowerCase();
                        return (s.includes("upcoming") || s.includes("due") || s.includes("re-upload")) && !s.includes("unpaid") && !s.includes("overdue") && !unpaidRecords.includes(r);
                    });

                    // Payment Plan details from the single source of truth
                    const rawTerm = (plan && plan.term)
                        || (typeof pkg.paymentPlan === "string" ? pkg.paymentPlan : "")
                        || p.term
                        || "5 Years";
                    const yearMatch = String(rawTerm).match(/^(\d+)[-\s]*year/i);
                    const termDisplay = yearMatch ? `${yearMatch[1]} Years` : rawTerm;

                    let totalInstallments = (plan && plan.totalInstallments) || p.totalInstallments || pkg.totalInstallments;
                    if (!totalInstallments) {
                        const m = String(rawTerm).match(/(\d+)[-\s]*year/i);
                        totalInstallments = m ? parseInt(m[1], 10) * 12 : (schedule.length || 60);
                    }

                    const downPaymentFormatted = (plan && plan.formattedDownPayment)
                        || pkg.formattedDownPayment
                        || (p.formattedDownPayment)
                        || (plan && plan.downPayment ? `₱${plan.downPayment.toLocaleString("en-PH")}` : "")
                        || (pkg.downPayment ? `₱${pkg.downPayment.toLocaleString("en-PH")}` : "");

                    // Payments Completed = number of Paid installments / total installments from the plan (e.g. 5 of 60)
                    const paymentsCompletedCount = paidRecords.length;
                    const paymentsCompletedText = `${paymentsCompletedCount} of ${totalInstallments}`;

                    // Total Paid (calculate ONLY from Paid records)
                    let totalPaidSum = 0;
                    paidRecords.forEach(r => {
                        if (typeof r.amount === "number") {
                            totalPaidSum += r.amount;
                        } else if (typeof r.amount === "string") {
                            const parsed = parseFloat(r.amount.replace(/[^\d.-]/g, "")) || 0;
                            totalPaidSum += parsed;
                        }
                    });
                    const totalPaidFormatted = "₱" + totalPaidSum.toLocaleString("en-PH", {
                        minimumFractionDigits: totalPaidSum % 1 !== 0 ? 2 : 0,
                        maximumFractionDigits: 2
                    });

                    const hasUnpaid = unpaidRecords.length > 0;
                    const firstUnpaid = unpaidRecords[0];
                    const nextUpcoming = upcomingRecords[0];

                    // Actual monthly payment from selected payment plan without hardcoding or recalculating
                    const monthlyAmt = (plan && (plan.formattedMonthlyPayment || plan.formattedMonthlyInstallment))
                        || pkg.formattedMonthlyPayment
                        || p.formattedMonthlyPayment
                        || p.nextPaymentAmount
                        || "—";
                    const nextDueDate = pkg.nextDueDate || p.nextDueDate || (nextUpcoming ? nextUpcoming.due : "—");

                    // Sidebar "Next Bill Due" follows the same shared schedule bill
                    const sidebarBill = firstUnpaid || nextUpcoming;
                    const sidebarDue = document.querySelector(".sidebar-status-card .sidebar-status-val");
                    const sidebarAmt = document.querySelector(".sidebar-status-card .badge");
                    if (sidebarDue) sidebarDue.textContent = sidebarBill ? sidebarBill.due : "None Due";
                    if (sidebarAmt) {
                        sidebarAmt.textContent = sidebarBill ? (sidebarBill.formattedAmount || sidebarBill.amount) : "₱0";
                        sidebarAmt.className = `badge ${hasUnpaid ? "badge-overdue" : "badge-upcoming"}`;
                    }

                    // 1. Monthly Payment Card
                    if (paymentNextAmount) {
                        if (hasUnpaid) {
                            paymentNextAmount.textContent = firstUnpaid.amount || monthlyAmt;
                        } else {
                            paymentNextAmount.textContent = monthlyAmt;
                        }
                    }
                    if (paymentNextDueMeta) {
                        if (pendingProof || pkg.paymentStatus === "Payment Under Review") {
                            paymentNextDueMeta.textContent = pendingProof
                                ? `Receipt uploaded at ${pendingProof.timestamp} (Pending Verification)`
                                : "Receipt uploaded · Pending Verification";
                        } else if (hasUnpaid) {
                            paymentNextDueMeta.innerHTML = `<span style="color: #dc2626; font-weight: 700;">Missed: ${firstUnpaid.period}</span> (Due ${firstUnpaid.due})`;
                        } else {
                            paymentNextDueMeta.textContent = nextDueDate ? `Due on ${nextDueDate}` : "No payment due";
                        }
                    }

                    // 2. Payment Status Card
                    // Rules: "If any installment is Unpaid, main Payment Status = Overdue"
                    // "Show missed billing period and unpaid amount"
                    if (paymentStandingVal) {
                        if (pendingProof || pkg.paymentStatus === "Payment Under Review") {
                            paymentStandingVal.textContent = "Payment Under Review";
                            paymentStandingVal.style.color = "var(--solar-orange-dark)";
                        } else if (hasUnpaid) {
                            paymentStandingVal.textContent = "Overdue";
                            paymentStandingVal.style.color = "#dc2626";
                        } else {
                            paymentStandingVal.textContent = pkg.paymentStatus || p.standing || "Up to Date";
                            paymentStandingVal.style.color = "";
                        }
                    }
                    if (paymentStandingMeta) {
                        if (pendingProof || pkg.paymentStatus === "Payment Under Review") {
                            paymentStandingMeta.innerHTML = `<span class="status-dot warning"></span>Proof under review`;
                        } else if (hasUnpaid) {
                            paymentStandingMeta.innerHTML = `<span class="status-dot error" style="background:#dc2626;"></span>Missed payment: ${firstUnpaid.period} (${firstUnpaid.amount || monthlyAmt})`;
                        } else {
                            const isDueSoon = (pkg.paymentStatus === "Due Soon" || p.standing === "Due Soon");
                            const dotClass = isDueSoon ? "status-dot warning" : "status-dot";
                            paymentStandingMeta.innerHTML = `<span class="${dotClass}"></span>${p.standingMeta || "Account up to date"}`;
                        }
                    }

                    // 3. Payment Plan Card
                    if (paymentPlanTerm) {
                        paymentPlanTerm.textContent = termDisplay;
                    }
                    if (paymentPlanMeta) {
                        paymentPlanMeta.textContent = downPaymentFormatted ? `Down Payment: ${downPaymentFormatted}` : "Fixed monthly payments";
                    }

                    // 4. Payments Completed Card
                    // "Payments Completed must count only Paid records"
                    // "Total Paid must be calculated only from Paid records"
                    // "Do not hardcode these values separately from Payment History"
                    if (paymentPaidCount) {
                        paymentPaidCount.textContent = paymentsCompletedText;
                    }
                    if (paymentTotalPaidMeta) {
                        paymentTotalPaidMeta.textContent = `${totalPaidFormatted} total paid`;
                    }

                    // 5. Due Callout Box
                    if (dueCalloutBox) {
                        if (hasUnpaid) {
                            dueCalloutBox.style.background = "#fef2f2";
                            dueCalloutBox.style.borderLeftColor = "#dc2626";
                        } else {
                            dueCalloutBox.style.background = "#fff5e5";
                            dueCalloutBox.style.borderLeftColor = "var(--solar-orange)";
                        }
                    }
                    if (dueCalloutTitle) {
                        if (pendingProof || pkg.paymentStatus === "Payment Under Review") {
                            dueCalloutTitle.textContent = "Verification Status";
                            dueCalloutTitle.style.color = "";
                        } else if (hasUnpaid) {
                            dueCalloutTitle.textContent = "Overdue Amount";
                            dueCalloutTitle.style.color = "#dc2626";
                        } else {
                            dueCalloutTitle.textContent = "Amount Due";
                            dueCalloutTitle.style.color = "";
                        }
                    }
                    if (dueCalloutAmount) {
                        if (pendingProof || pkg.paymentStatus === "Payment Under Review") {
                            dueCalloutAmount.textContent = "Pending Approval";
                        } else if (hasUnpaid) {
                            dueCalloutAmount.textContent = firstUnpaid.amount || monthlyAmt;
                        } else {
                            dueCalloutAmount.textContent = monthlyAmt;
                        }
                    }
                    if (dueCalloutPaymentType) {
                        dueCalloutPaymentType.textContent = (plan && plan.term ? `${plan.term} Installment` : "Monthly Installment");
                    }
                    if (dueCalloutPeriodLabel) {
                        dueCalloutPeriodLabel.textContent = "Period";
                    }
                    if (dueCalloutPeriod) {
                        if (hasUnpaid) {
                            dueCalloutPeriod.textContent = `${firstUnpaid.period} (Past Due)`;
                        } else {
                            dueCalloutPeriod.textContent = p.currentBillPeriod || nextDueDate || "Current";
                        }
                    }
                    if (dueCalloutDueDate) {
                        dueCalloutDueDate.textContent = hasUnpaid ? (firstUnpaid.due || "Immediate") : nextDueDate;
                    }
                    if (dueCalloutRef) {
                        if (hasUnpaid) {
                            dueCalloutRef.textContent = `Ref: ${firstUnpaid.receiptId || pkg.accountNo}`;
                        } else {
                            dueCalloutRef.textContent = `Ref: ${p.currentBillRef || pkg.accountNo}`;
                        }
                    }
                    if (uploadProofBtn) {
                        uploadProofBtn.textContent = (pendingProof || pkg.paymentStatus === "Payment Under Review" || pkg.receiptVerificationStatus === "Under Review")
                            ? "Proof Submitted (Pending Review) ✓"
                            : "Submit Proof of Payment";
                        uploadProofBtn.disabled = false;
                    }

                    // 6. Schedule Panel & Table
                    if (paymentScheduleSubtitle) {
                        paymentScheduleSubtitle.textContent = `Monthly installment status for ${pkg.name} (#${pkg.accountNo})`;
                    }
                    if (paymentScheduleBadge) {
                        const badgeText = (plan && plan.term ? `${plan.term} Term` : null)
                            || p.termBadge
                            || (typeof pkg.paymentPlan === "string" ? pkg.paymentPlan : "Standard Term");
                        paymentScheduleBadge.textContent = badgeText;
                    }

                    renderTableRows(schedule, pkg);
                }
            }

            // Filter chips & search input event listeners
            if (paymentsFilterChips) {
                paymentsFilterChips.querySelectorAll(".filter-chip").forEach(chip => {
                    chip.addEventListener("click", () => {
                        paymentsFilterChips.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
                        chip.classList.add("active");
                        activeFilter = chip.dataset.filter || "all";
                        isHistoryExpanded = false; // Reset to collapsed when filter changes
                        if (currentPackage && currentPackage.payments && currentPackage.payments.schedule) {
                            renderTableRows(currentPackage.payments.schedule, currentPackage);
                        }
                    });
                });
            }

            if (paymentsSearchInput) {
                paymentsSearchInput.addEventListener("input", (e) => {
                    activeSearchQuery = (e.target.value || "").trim();
                    isHistoryExpanded = false; // Reset to collapsed when search query changes
                    if (currentPackage && currentPackage.payments && currentPackage.payments.schedule) {
                        renderTableRows(currentPackage.payments.schedule, currentPackage);
                    }
                });
            }

            // See More / See Less toggle handler
            if (paymentsHistoryToggleBtn) {
                paymentsHistoryToggleBtn.addEventListener("click", () => {
                    isHistoryExpanded = !isHistoryExpanded;
                    if (currentPackage && currentPackage.payments && currentPackage.payments.schedule) {
                        renderTableRows(currentPackage.payments.schedule, currentPackage);
                    }
                    // When collapsing back to 3 records, keep history section comfortably in view
                    if (!isHistoryExpanded) {
                        const historySection = document.getElementById("paymentHistorySection");
                        if (historySection) {
                            const rect = historySection.getBoundingClientRect();
                            if (rect.top < 80) {
                                historySection.scrollIntoView({ behavior: "smooth", block: "start" });
                            }
                        }
                    }
                });
            }

            // Mobile expandable action panels toggle listeners
            if (howToPayToggleBtn && howToPaySection) {
                howToPayToggleBtn.addEventListener("click", () => {
                    const isOpen = howToPaySection.classList.toggle("is-open");
                    howToPayToggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
                });
            }

            if (uploadReceiptToggleBtn && submitProofSection) {
                uploadReceiptToggleBtn.addEventListener("click", () => {
                    const isOpen = submitProofSection.classList.toggle("is-open");
                    uploadReceiptToggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
                });
            }

            // ----------------------------------------------------------------------
            // 3. CTA HANDLERS TIED TO ACTIVE PACKAGE
            // ----------------------------------------------------------------------
            if (downloadReceiptBtn) {
                downloadReceiptBtn.addEventListener("click", () => {
                    const pkg = currentPackage || (window.HelloSolar && window.HelloSolar.getActivePackage());
                    if (!pkg) return;

                    if (pkg.payments && pkg.payments.hasBills) {
                        if (window.HelloSolar && window.HelloSolar.toast) {
                            window.HelloSolar.toast(
                                "Statement Downloaded",
                                `Official billing statement generated for ${pkg.name} (#${pkg.accountNo}).`
                            );
                        } else {
                            alert(`Downloading official statement for ${pkg.name} (${pkg.accountNo})...`);
                        }
                    } else {
                        if (window.HelloSolar && window.HelloSolar.toast) {
                            window.HelloSolar.toast(
                                "No Statement Available",
                                `No issued billing statement exists yet for ${pkg.name} (#${pkg.accountNo}).`
                            );
                        } else {
                            alert(`No statement available yet for ${pkg.name}.`);
                        }
                    }
                });
            }

            // ----------------------------------------------------------------------
            // 4. INITIALIZE PAGE & LISTENERS
            // ----------------------------------------------------------------------
            setupDirtyCheck();

            // Initial render
            const initialPkg = (window.HelloSolar && window.HelloSolar.getActivePackage)
                ? window.HelloSolar.getActivePackage()
                : null;
            if (initialPkg) renderPaymentsPage(initialPkg);
            if (initialPkg) openUploadFromReminderLink();

            // Listen for package changes triggered from elsewhere
            window.addEventListener("helloSolarPackageChanged", (e) => {
                if (e.detail && e.detail.package) {
                    renderPaymentsPage(e.detail.package);
                }
            });

            // Listen for dataset async load completion
            window.addEventListener("helloSolarDataLoaded", () => {
                const active = window.HelloSolar ? window.HelloSolar.getActivePackage() : null;
                if (active) {
                    renderPaymentsPage(active);
                }
                openUploadFromReminderLink();
            });

            // Deep link from the dashboard Delayed Payment Reminder: payments.html?action=upload-receipt
            function openUploadFromReminderLink() {
                const params = new URLSearchParams(window.location.search);
                if (params.get("action") !== "upload-receipt" || !currentPackage) return;
                params.delete("action");
                const query = params.toString();
                history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : "") + window.location.hash);
                openPaymentProofModal();
            }
        })();
    