/**
 * ==========================================================================
 * HELLO SOLAR MERCHANT — DASHBOARD & PORTAL INTERACTIONS
 * Shared navigation, mobile bottom nav, dynamic topbar profile,
 * modal dialogs, search & filtering, CSV exports, support draft preservation,
 * deep-linking router, and local preview data loader.
 * ==========================================================================
 */

// Merchant-only page guard: a valid merchant session for an Active shared MER-### account is required.
if (!window.HSShared || !window.HSShared.session.isValid("merchant")) {
    if (window.HSShared) window.HSShared.session.clear("merchant");
    window.location.replace("login.html");
}

document.addEventListener("DOMContentLoaded", async () => {
    'use strict';

    // --------------------------------------------------------------------------
    // 1. PAGE IDENTIFICATION & ACTIVE NAVIGATION
    // --------------------------------------------------------------------------
    const rawPath = window.location.pathname.split("/").pop().toLowerCase() || "dashboard.html";
    let currentPage = document.body.dataset.page || rawPath.replace(".html", "") || "dashboard";
    if (currentPage === "index" || currentPage === "") currentPage = "dashboard";

    const navItems = [
        {
            id: "dashboard",
            label: "Dashboard",
            href: "dashboard.html",
            icon: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z"/></svg>'
        },
        {
            id: "payments",
            label: "Payments",
            href: "payments.html",
            icon: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h3" stroke-linecap="round"/></svg>'
        },
        {
            id: "installers",
            label: "Installers",
            href: "installers.html",
            icon: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14.5 6.5 3-3 3 3-3 3m-2 0-6 6m-2 0-4 4 1 1 4-4m2-10 7 7"/></svg>'
        },
        {
            id: "support",
            label: "Support",
            href: "support.html",
            icon: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13v-2a8 8 0 0 1 16 0v2M6 18H5a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2h1v5Zm12 0h1a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2h-1v5Zm0 0c0 2-2 3-5 3"/></svg>'
        }
    ];

    const logoutIcon = '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5m5-4 4-3-4-3m4 3H9"/></svg>';

    // Build sidebar
    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
        const navMarkup = navItems.map(item => {
            const isActive = currentPage === item.id;
            return `
                <li class="nav-item">
                    <a class="nav-link${isActive ? " active" : ""}" href="${item.href}"${isActive ? ' aria-current="page"' : ""}>
                        ${item.icon}
                        <span>${item.label}</span>
                    </a>
                </li>`;
        }).join("");

        sidebar.innerHTML = `
            <div class="sidebar-inner">
                <a class="logo" href="dashboard.html" aria-label="Hello Solar Merchant dashboard">
                    <img src="assets/images/hello_solar.png" alt="Hello Solar">
                </a>
                <div class="portal-tag">Merchant Portal</div>
                <nav class="nav" id="nav" aria-label="Primary navigation">
                    <ul class="nav-list">${navMarkup}</ul>
                </nav>
                <div class="logout">
                    <a class="nav-link" href="login.html" id="logoutBtn">
                        ${logoutIcon}
                        <span>Logout</span>
                    </a>
                </div>
            </div>`;

        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                if (window.HSShared) window.HSShared.session.clear("merchant");
                try { sessionStorage.removeItem("hello_solar_merchant_logged_in"); } catch (e) { /* legacy flag */ }
            });
        }
    }

    // Highlight mobile bottom navigation items
    document.querySelectorAll(".mobile-bottom-nav-item").forEach(item => {
        const href = item.getAttribute("href") || "";
        const itemPage = href.replace(".html", "").toLowerCase();
        const isActive = currentPage === itemPage;
        item.classList.toggle("active", isActive);
        if (isActive) {
            item.setAttribute("aria-current", "page");
        } else {
            item.removeAttribute("aria-current");
        }
    });

    // --------------------------------------------------------------------------
    // 2. MOBILE DRAWER NAVIGATION & BACKDROP
    // --------------------------------------------------------------------------
    const menuBtn = document.getElementById("menu-btn");
    const backdrop = document.getElementById("backdrop");

    function setMenu(open) {
        if (!sidebar || !menuBtn || !backdrop) return;
        sidebar.classList.toggle("open", open);
        menuBtn.classList.toggle("open", open);
        backdrop.classList.toggle("open", open);
        document.body.classList.toggle("nav-open", open);
        menuBtn.setAttribute("aria-expanded", String(open));
        menuBtn.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
        backdrop.setAttribute("aria-hidden", String(!open));
    }

    if (menuBtn && backdrop) {
        menuBtn.addEventListener("click", () => {
            const isOpen = sidebar.classList.contains("open");
            setMenu(!isOpen);
        });
        backdrop.addEventListener("click", () => setMenu(false));
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            if (sidebar && sidebar.classList.contains("open")) {
                setMenu(false);
                menuBtn.focus();
            }
            closeActiveModal();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth >= 768 && sidebar && sidebar.classList.contains("open")) {
            setMenu(false);
        }
    });

    // --------------------------------------------------------------------------
    // 3. TOAST NOTIFICATION UTILITY
    // --------------------------------------------------------------------------
    function showToast(message, duration = 3500) {
        let toast = document.getElementById("portalToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "portalToast";
            toast.className = "toast";
            toast.setAttribute("role", "status");
            toast.setAttribute("aria-live", "polite");
            document.body.appendChild(toast);
        }
        toast.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>${message}</span>`;
        toast.classList.add("show");
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.remove("show");
        }, duration);
    }

    // --------------------------------------------------------------------------
    // 4. TOPBAR PROFILE RENDERING & PROFILE MODAL
    // --------------------------------------------------------------------------
    const allDataset = await window.MerchantData.loadAllData();
    let merchantData = allDataset.merchant || {};

    function renderTopbarProfile() {
        const profileContainer = document.getElementById("topbarProfile");
        if (!profileContainer) return;

        const initials = (merchantData.contactPerson || "Marco Santos")
            .split(" ")
            .map(n => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

        profileContainer.setAttribute("aria-label", `${merchantData.companyName || "Merchant"} Profile & Settings`);

        profileContainer.innerHTML = `
            <div class="profile-text" style="display:none;" aria-hidden="true">
                <span class="profile-name">${merchantData.companyName || "SolarTech Manila"}</span>
                <span class="profile-role">${merchantData.accountType || "Merchant Partner"} · ${merchantData.verificationStatus || "Accreditation on File"}</span>
            </div>
            <div class="profile-avatar" title="${merchantData.companyName || "Merchant"} Profile (${merchantData.contactPerson || "User"})">${initials}</div>`;

        const topbarName = document.getElementById("topbarMerchantName");
        if (topbarName) topbarName.textContent = merchantData.companyName || "SolarTech Manila";

        const bannerName = document.getElementById("bannerMerchantName");
        if (bannerName) bannerName.textContent = merchantData.companyName || "SolarTech Manila";
    }
    renderTopbarProfile();

    const profileTrigger = document.getElementById("topbarProfile");
    if (profileTrigger) {
        profileTrigger.addEventListener("click", openProfileModal);
        profileTrigger.setAttribute("tabindex", "0");
        profileTrigger.setAttribute("role", "button");
        profileTrigger.setAttribute("aria-haspopup", "dialog");
        profileTrigger.setAttribute("aria-label", `${merchantData.companyName || "Merchant"} Profile & Settings`);
        profileTrigger.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openProfileModal();
            }
        });
    }

    function openProfileModal() {
        let modal = document.getElementById("profileModal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "profileModal";
            modal.className = "modal-backdrop";
            modal.setAttribute("role", "dialog");
            modal.setAttribute("aria-modal", "true");
            modal.setAttribute("aria-labelledby", "profileModalTitle");
            document.body.appendChild(modal);
        }

        const prefs = merchantData.payoutPreferences || {};

        modal.innerHTML = `
            <div class="modal-dialog profile-modal-dialog">
                <div class="modal-header">
                    <div>
                        <h2 id="profileModalTitle">Merchant Profile & Settings</h2>
                        <p class="modal-subtitle">Manage merchant company details and payout bank preferences.</p>
                    </div>
                    <button class="modal-close" id="closeProfileModal" type="button" aria-label="Close dialog">✕</button>
                </div>
                <form id="profileForm">
                    <div class="modal-body">
                        <div class="profile-stats-card">
                            <div class="detail-item">
                                <span class="detail-label">Merchant ID</span>
                                <span class="detail-value">${merchantData.merchantId}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Partner Tier</span>
                                <span class="detail-value tier-value">${merchantData.partnerTier}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Commission Rate</span>
                                <span class="detail-value">${merchantData.commissionRate}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Account Manager</span>
                                <span class="detail-value">${merchantData.accountManager}</span>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="profCompanyName">Company Name</label>
                            <input class="form-input" id="profCompanyName" name="companyName" type="text" value="${merchantData.companyName}" required>
                        </div>

                        <div class="form-row-2col">
                            <div class="form-group">
                                <label class="form-label" for="profContactPerson">Contact Person</label>
                                <input class="form-input" id="profContactPerson" name="contactPerson" type="text" value="${merchantData.contactPerson}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="profPhone">Contact Phone</label>
                                <input class="form-input" id="profPhone" name="phone" type="text" value="${merchantData.phone}" required>
                            </div>
                        </div>

                        <div class="profile-section-divider"></div>
                        <h3 class="profile-section-title">Payout Bank Preferences</h3>

                        <div class="form-row-2col">
                            <div class="form-group">
                                <label class="form-label" for="profBank">Preferred Bank</label>
                                <select class="form-select" id="profBank" name="preferredBank">
                                    <option value="BDO Unibank"${prefs.preferredBank === "BDO Unibank" ? " selected" : ""}>BDO Unibank</option>
                                    <option value="Bank of the Philippine Islands (BPI)"${prefs.preferredBank && prefs.preferredBank.includes("BPI") ? " selected" : ""}>BPI</option>
                                    <option value="Metrobank"${prefs.preferredBank === "Metrobank" ? " selected" : ""}>Metrobank</option>
                                    <option value="UnionBank of the Philippines"${prefs.preferredBank && prefs.preferredBank.includes("UnionBank") ? " selected" : ""}>UnionBank</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="profAcctName">Account Display Name</label>
                                <input class="form-input" id="profAcctName" name="accountName" type="text" value="${prefs.accountName || ""}" required>
                            </div>
                        </div>

                        <div class="form-group form-group-last">
                            <label class="form-label" for="profAcctNumber">Masked Account Number</label>
                            <input class="form-input" id="profAcctNumber" name="accountNumberMasked" type="text" value="${prefs.accountNumberMasked || "**** **** 9012"}" required>
                            <small class="form-helper-text">Sensitive full bank account numbers are kept confidential and managed via compliance desk.</small>
                        </div>
                    </div>

                    <div class="modal-footer modal-footer-profile">
                        <div class="profile-action-group">
                            <button class="btn btn-secondary" id="cancelProfileBtn" type="button">Cancel</button>
                            <button class="btn btn-primary" type="submit">Save Changes</button>
                        </div>
                        <button class="btn btn-danger-outline" id="modalLogoutBtn" type="button" aria-label="Log out of merchant portal">
                            <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            <span>Logout</span>
                        </button>
                    </div>
                </form>
            </div>`;

        modal.classList.add("open");
        document.body.classList.add("nav-open");

        modal.querySelector("#closeProfileModal").onclick = () => closeActiveModal();
        modal.querySelector("#cancelProfileBtn").onclick = () => closeActiveModal();
        const modalLogoutBtn = modal.querySelector("#modalLogoutBtn");
        if (modalLogoutBtn) {
            modalLogoutBtn.onclick = () => {
                if (window.HSShared) window.HSShared.session.clear("merchant");
                try { sessionStorage.removeItem("hello_solar_merchant_logged_in"); } catch (e) { /* legacy flag */ }
                window.location.href = "login.html";
            };
        }
        modal.onclick = (e) => {
            if (e.target === modal) closeActiveModal();
        };

        modal.querySelector("#profileForm").onsubmit = (e) => {
            e.preventDefault();
            const form = e.target;
            const updated = {
                companyName: form.elements.companyName.value.trim(),
                contactPerson: form.elements.contactPerson.value.trim(),
                phone: form.elements.phone.value.trim(),
                preferredBank: form.elements.preferredBank.value,
                accountName: form.elements.accountName.value.trim(),
                accountNumberMasked: form.elements.accountNumberMasked.value.trim()
            };

            window.MerchantData.saveUserPreferences(updated);
            merchantData.companyName = updated.companyName;
            merchantData.contactPerson = updated.contactPerson;
            merchantData.phone = updated.phone;
            if (!merchantData.payoutPreferences) merchantData.payoutPreferences = {};
            merchantData.payoutPreferences.preferredBank = updated.preferredBank;
            merchantData.payoutPreferences.accountName = updated.accountName;
            merchantData.payoutPreferences.accountNumberMasked = updated.accountNumberMasked;

            renderTopbarProfile();
            closeActiveModal();
            showToast("Merchant profile & payout preferences saved successfully.");
        };
    }

    function closeActiveModal() {
        document.querySelectorAll(".modal-backdrop.open").forEach(modal => {
            modal.classList.remove("open");
        });
        document.body.classList.remove("nav-open");
    }

    function closeProjectModal() {
        const projectModal = document.getElementById("projectModal");
        if (projectModal) {
            projectModal.classList.remove("open");
        }
        document.body.classList.remove("nav-open");
    }
    window.closeProjectModal = closeProjectModal;
    window.closeActiveModal = closeActiveModal;
    window.openProfileModal = openProfileModal;
    if (!window.HelloSolarMerchant) window.HelloSolarMerchant = {};
    window.HelloSolarMerchant.openProfileSettings = openProfileModal;

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeActiveModal();
    });

    // --------------------------------------------------------------------------
    // 5. STAGE HELPERS, ACTION SHORTENERS & DETAIL MODALS
    // --------------------------------------------------------------------------
    function getStageClass(stage) {
        if (!stage) return "in-progress";
        const s = stage.toLowerCase();
        if (s.includes("completed")) return "completed";
        if (s.includes("structural") || s.includes("mounting")) return "structural-mounting";
        if (s.includes("survey")) return "site-survey";
        if (s.includes("engineering")) return "engineering-approval";
        if (s.includes("permit")) return "permitting";
        if (s.includes("testing") || s.includes("grid")) return "testing";
        return "in-progress";
    }

    function getPlainLanguageStage(stage) {
        if (!stage) return "In Progress";
        const s = stage.toLowerCase();
        if (s.includes("survey")) return "Site Survey";
        if (s.includes("engineering")) return "Engineering Design";
        if (s.includes("permit")) return "Permitting";
        if (s.includes("structural") || s.includes("mounting")) return "Installation & Mounting";
        if (s.includes("testing") || s.includes("grid")) return "Grid Testing & Inspection";
        if (s.includes("completed")) return "Completed";
        return stage;
    }

    function getShortenedNextAction(action) {
        if (!action) return "Verify next milestone with crew lead";
        const a = action.trim();
        if (a.includes("Meralco Bi-Directional Meter inspection")) return "Schedule Meralco meter inspection";
        if (a.includes("warehouse delivery receipt")) return "Upload delivery receipt to clear hold";
        if (a.includes("Muntinlupa City Hall")) return "Follow up city CFEI permit release";
        if (a.includes("financer 30% milestone")) return "Await financer engineering sign-off";
        if (a.includes("All installation stages completed")) return "Installation complete & commission released";
        if (a.includes("Nuvali Estate Architectural review")) return "Confirm estate architectural approval";
        if (a.length > 50) {
            return a.slice(0, 47).trim() + "…";
        }
        return a;
    }

    function getSemanticStatusClass(status) {
        if (!status) return 'status-orange';
        const s = String(status).toLowerCase();
        // RED = NEEDS ATTENTION
        if (s.includes('action') || s.includes('hold') || s.includes('delay') || s.includes('issue') || s.includes('urgent') || s.includes('problem') || s.includes('alert')) {
            return 'status-red';
        }
        // GREEN = GOOD / COMPLETED / ACTIVE / RELEASED / AVAILABLE / DONE / RESOLVED
        if (s.includes('complete') || s.includes('release') || s.includes('active') || s.includes('avail') || s.includes('done') || s.includes('resolve') || s.includes('paid')) {
            return 'status-green';
        }
        // ORANGE = WAITING / IN PROGRESS / PENDING / PROCESSING / SCHEDULED / PERMITTING / REVIEW
        return 'status-orange';
    }

    window.openProjectModal = async function (projectId) {
        const project = await window.MerchantData.getProjectById(projectId);
        if (!project) return;

        let modal = document.getElementById("projectModal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "projectModal";
            modal.className = "modal-backdrop";
            modal.style.zIndex = "1100";
            modal.setAttribute("role", "dialog");
            modal.setAttribute("aria-modal", "true");
            document.body.appendChild(modal);
        } else {
            modal.style.zIndex = "1100";
        }

        const crew = await window.MerchantData.getInstallerById(project.assignedCrewId);
        const crewName = crew ? `${crew.teamName} · ${crew.leadEngineer}` : (project.assignedCrewId || "Unassigned");
        const displayStage = getPlainLanguageStage(project.currentStage);
        const stageStatusClass = getSemanticStatusClass(displayStage);
        const formattedValue = window.MerchantData.formatCurrency(project.projectValue);

        function formatShortDate(dStr) {
            if (!dStr) return "—";
            const months = {
                january: "Jan", february: "Feb", march: "Mar", april: "Apr", may: "May", june: "Jun",
                july: "Jul", august: "Aug", september: "Sep", october: "Oct", november: "Nov", december: "Dec"
            };
            return dStr.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/gi, (m) => months[m.toLowerCase()] || m);
        }
        const shortCompletion = formatShortDate(project.targetDate);
        const capacityAndType = `${project.systemCapacity} · ${project.systemType}`;

        modal.innerHTML = `
            <div class="modal-dialog project-modal-compact">
                <!-- 1. PROJECT HEADER -->
                <div class="modal-header project-modal-header">
                    <div class="project-modal-header-info">
                        <div class="project-modal-badge-row">
                            <span class="status-pill ${stageStatusClass}">
                                ${displayStage}
                            </span>
                        </div>
                        <h2 class="project-modal-customer">${project.customerName}</h2>
                        <p class="project-modal-meta">${project.id} · ${project.location}</p>
                    </div>
                    <button class="modal-close" onclick="closeProjectModal();" type="button" aria-label="Close dialog">✕</button>
                </div>

                <div class="modal-body project-modal-body">
                    <!-- 2. NEXT ACTION CALLOUT -->
                    <div class="project-next-action-callout">
                        <div class="next-action-tag">NEXT ACTION</div>
                        <div class="next-action-text">${project.nextAction || "No pending action recorded."}</div>
                    </div>

                    <!-- 3. PROJECT SNAPSHOT -->
                    <div class="project-section-title">Project Snapshot</div>
                    <div class="project-snapshot-grid">
                        <div class="snapshot-cell">
                            <span class="compact-label">Capacity</span>
                            <span class="compact-value">${capacityAndType}</span>
                        </div>
                        <div class="snapshot-cell">
                            <span class="compact-label">Value</span>
                            <span class="compact-value">${formattedValue}</span>
                        </div>
                        <div class="snapshot-cell">
                            <span class="compact-label">Completion</span>
                            <span class="compact-value">${shortCompletion}</span>
                        </div>
                        <div class="snapshot-cell">
                            <span class="compact-label">Crew</span>
                            <span class="compact-value">${crewName}</span>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary btn-sm" onclick="closeProjectModal();" type="button">Close</button>
                    <button class="btn btn-primary btn-sm" id="inquireSupportBtn" type="button">Inquire with Support</button>
                </div>
            </div>`;

        modal.classList.add("open");
        document.body.classList.add("nav-open");

        const inquireSupportBtn = modal.querySelector("#inquireSupportBtn");
        if (inquireSupportBtn) {
            inquireSupportBtn.addEventListener("click", () => {
                // Close current project modal first
                closeProjectModal();

                // Go to Support page without project parameters
                window.location.href = "support.html";
            });
        }

        modal.onclick = (e) => {
            if (e.target === modal) closeProjectModal();
        };
    };

    window.openPayoutModal = async function (payoutId) {
        const payout = await window.MerchantData.getPayoutById(payoutId);
        if (!payout) return;

        let modal = document.getElementById("payoutModal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "payoutModal";
            modal.className = "modal-backdrop";
            modal.style.zIndex = "1100";
            modal.setAttribute("role", "dialog");
            modal.setAttribute("aria-modal", "true");
            document.body.appendChild(modal);
        } else {
            modal.style.zIndex = "1100";
        }

        const statusClass = getSemanticStatusClass(payout.status);

        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-header">
                    <div>
                        <div class="status-pill ${statusClass}" style="margin-bottom:8px;">${payout.status}</div>
                        <h2>${payout.payoutId}</h2>
                        <p style="font-size:12.5px;color:var(--gray-500);">${payout.projectName} (${payout.projectId})</p>
                    </div>
                    <button class="modal-close" onclick="document.getElementById('payoutModal').classList.remove('open');document.body.classList.remove('nav-open');" type="button" aria-label="Close dialog">✕</button>
                </div>
                <div class="modal-body">
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Gross Sales Commission</span>
                            <span class="detail-value">${window.MerchantData.formatCurrency(payout.grossCommission)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">2% Creditable Withholding Tax (BIR CWT)</span>
                            <span class="detail-value" style="color:var(--red);">- ${window.MerchantData.formatCurrency(payout.withholdingTax)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Net Disbursement Amount</span>
                            <span class="detail-value" style="font-size:18px;color:var(--navy);font-weight:700;">${window.MerchantData.formatCurrency(payout.netDisbursement)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Release / Scheduled Date</span>
                            <span class="detail-value">${payout.releaseDate}</span>
                        </div>
                        <div class="detail-item-full">
                            <span class="detail-label">Milestone Justification</span>
                            <span class="detail-value" style="font-size:13.5px;">${payout.milestone}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Bank Destination</span>
                            <span class="detail-value" style="font-size:13px;">${payout.bankDestination}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Disbursement Confirmation Reference</span>
                            <span class="detail-value" style="font-size:13px;color:var(--navy);font-weight:700;">${payout.bankConfirmation}</span>
                        </div>
                        <div class="detail-item-full">
                            <span class="detail-label">${payout.status === 'On Hold' ? 'Hold Explanation & Audit Notes' : 'Audit & Clearance Notes'}</span>
                            <p style="font-size:12.5px;color:${payout.status === 'On Hold' ? '#92400e' : 'var(--gray-600)'};background:${payout.status === 'On Hold' ? '#fffbeb' : 'var(--gray-50)'};padding:10px;border-radius:var(--radius-xs);border:1px solid ${payout.status === 'On Hold' ? '#fde68a' : 'var(--gray-200)'};">${payout.auditNotes}</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary btn-sm" onclick="document.getElementById('payoutModal').classList.remove('open');document.body.classList.remove('nav-open');" type="button">Close</button>
                    <a class="btn btn-primary btn-sm" href="support.html?payout=${payout.payoutId}">Ask About This Payout</a>
                </div>
            </div>`;

        modal.classList.add("open");
        document.body.classList.add("nav-open");
        modal.onclick = (e) => {
            if (e.target === modal) closeActiveModal();
        };
    };

    function closeCrewModal() {
        const modal = document.getElementById("crewModal");
        if (modal) modal.classList.remove("open");
        document.body.classList.remove("nav-open");
    }
    window.closeCrewModal = closeCrewModal;

    window.openCrewModal = async function (crewId) {
        const dataset = await window.MerchantData.loadAllData();
        const installers = dataset.crews || [];
        const projects = dataset.projects || [];
        const crew = installers.find(c => c.crewId === crewId);
        if (!crew) return;

        let modal = document.getElementById("crewModal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "crewModal";
            modal.className = "modal-backdrop";
            modal.style.zIndex = "1100";
            modal.setAttribute("role", "dialog");
            modal.setAttribute("aria-modal", "true");
            document.body.appendChild(modal);
        } else {
            modal.style.zIndex = "1100";
        }

        const assignedProjects = projects.filter(p => p.assignedCrewId === crew.crewId);
        const activeProjects = assignedProjects.filter(p => p.progress < 100);
        const phoneNum = (crew.contact || '').split(" · ")[0].trim();
        const isStandby = (crew.availability || '').toLowerCase().includes("standby");
        const statusClass = isStandby ? "status-blue" : "status-green";

        const projectsHtml = assignedProjects.length > 0 ? assignedProjects.map(p => `
            <div class="crew-modal-job-item">
                <div class="crew-modal-job-header">
                    <span class="crew-modal-job-id">${p.id}</span>
                    <span class="status-pill ${getSemanticStatusClass(p.currentStage)}" style="font-size:11px;">${p.currentStage}</span>
                </div>
                <div class="crew-modal-job-name">${p.customerName}</div>
                <div class="crew-modal-job-footer">
                    <span class="crew-modal-job-loc">
                        <svg class="loc-pin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;display:inline-block;vertical-align:-1px;margin-right:2px;color:var(--text-light);"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <span>${p.location}</span>
                    </span>
                    <button type="button" class="subtle-link-btn" onclick="closeCrewModal(); openProjectModal('${p.id}');" style="font-size:12px;">View Project →</button>
                </div>
            </div>
        `).join("") : `<div class="state-empty" style="padding:16px 0;"><p>No current installation jobs assigned to this team.</p></div>`;

        modal.innerHTML = `
            <div class="modal-dialog project-modal-compact">
                <!-- 1. CREW HEADER -->
                <div class="modal-header project-modal-header">
                    <div class="project-modal-header-info">
                        <div class="project-modal-badge-row">
                            <span class="status-pill ${statusClass}">
                                ${crew.availability || 'Active Deployment'}
                            </span>
                        </div>
                        <h2 class="project-modal-customer" style="color:var(--orange);">${crew.teamName}</h2>
                        <p class="project-modal-meta">${crew.leadEngineer} · ${crew.technicianHeadcount} Technicians</p>
                    </div>
                    <button class="modal-close" onclick="closeCrewModal();" type="button" aria-label="Close dialog">✕</button>
                </div>

                <div class="modal-body project-modal-body">
                    <!-- 2. TEAM OVERVIEW SNAPSHOT -->
                    <div class="project-section-title">Team Overview</div>
                    <div class="project-snapshot-grid">
                        <div class="snapshot-cell">
                            <span class="compact-label">Field Technicians</span>
                            <span class="compact-value">${crew.technicianHeadcount} Members</span>
                        </div>
                        <div class="snapshot-cell">
                            <span class="compact-label">Active Jobs</span>
                            <span class="compact-value">${activeProjects.length} Active</span>
                        </div>
                        <div class="snapshot-cell">
                            <span class="compact-label">Direct Phone</span>
                            <span class="compact-value" style="font-size:12.5px;">${phoneNum || 'N/A'}</span>
                        </div>
                        <div class="snapshot-cell">
                            <span class="compact-label">Service Vehicle</span>
                            <span class="compact-value" style="font-size:12.5px;">${crew.vehiclesAssigned ? crew.vehiclesAssigned.split('#')[0].trim() : 'Service Vehicle'}</span>
                        </div>
                    </div>

                    <!-- 3. ASSIGNED INSTALLATION JOBS -->
                    <div class="project-section-title" style="margin-top:16px;">Assigned Solar Installations (${assignedProjects.length})</div>
                    <div class="crew-modal-jobs-list">
                        ${projectsHtml}
                    </div>

                    <!-- 4. SPECIALIZATION & SAFETY COMPLIANCE -->
                    <div class="project-section-title" style="margin-top:16px;">Specialization & Safety</div>
                    <div class="project-system-details">
                        <div class="system-detail-row">
                            <span class="compact-label">Focus Area</span>
                            <div class="compact-value">${crew.specialization || 'Solar PV Installations'}</div>
                        </div>
                        <div class="system-detail-row">
                            <span class="compact-label">Safety Compliance</span>
                            <div class="compact-value">${crew.safetyCompliance || 'Audit Passed · DOLE Verified'}</div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary btn-sm" onclick="closeCrewModal();" type="button">Close</button>
                    ${phoneNum ? `<a href="tel:${phoneNum}" class="btn btn-primary btn-sm">Call Team</a>` : ''}
                </div>
            </div>`;

        modal.classList.add("open");
        document.body.classList.add("nav-open");
        modal.onclick = (e) => {
            if (e.target === modal) closeCrewModal();
        };
    };

    // --------------------------------------------------------------------------
    // 6. PAGE 1: DASHBOARD (dashboard.html)
    // --------------------------------------------------------------------------
    if (currentPage === "dashboard") {
        const dataset = await window.MerchantData.loadAllData();
        const summary = window.MerchantData.calculateSummary(dataset);
        const projects = dataset.projects || [];
        const crews = dataset.crews || [];
        const payouts = dataset.payouts || [];

        // Dynamic Summary KPI updates (exact calculation mappings)
        const kpiInstalls = document.getElementById("kpiActiveInstalls");
        if (kpiInstalls) kpiInstalls.textContent = summary.activeInstallsCount ?? "—";

        const kpiPortfolio = document.getElementById("kpiPortfolioValue");
        if (kpiPortfolio) kpiPortfolio.textContent = window.MerchantData.formatCurrency(summary.portfolioValuePhp);

        const kpiPending = document.getElementById("kpiPendingPayouts");
        if (kpiPending) kpiPending.textContent = window.MerchantData.formatCurrency(summary.pendingPayoutsPhp);

        const kpiCrews = document.getElementById("kpiActiveCrews");
        if (kpiCrews) kpiCrews.textContent = summary.activeCrewsCount ?? "3";

        // Render Active Projects Table with Search, Filter & See More/Less
        let projectsExpanded = false;
        const DEFAULT_PROJECT_LIMIT = 4;
        const searchInput = document.getElementById("projectSearch");
        const stageFilter = document.getElementById("projectStageFilter");
        const tableBody = document.getElementById("projectsTableBody");
        const projectsToggleBtn = document.getElementById("projectsToggleBtn");

        function renderProjects() {
            if (!tableBody) return;
            const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
            const stage = stageFilter ? stageFilter.value : "All";

            const filtered = projects.filter(p => {
                const textMatch = !query ||
                    p.id.toLowerCase().includes(query) ||
                    p.customerName.toLowerCase().includes(query) ||
                    p.location.toLowerCase().includes(query) ||
                    p.systemCapacity.toLowerCase().includes(query) ||
                    p.currentStage.toLowerCase().includes(query) ||
                    getPlainLanguageStage(p.currentStage).toLowerCase().includes(query) ||
                    (p.nextAction && p.nextAction.toLowerCase().includes(query));

                const stageMatch = stage === "All" ||
                    (stage === "In Progress" && p.progress < 100) ||
                    (stage === "Completed" && p.progress === 100) ||
                    p.currentStage === stage ||
                    getPlainLanguageStage(p.currentStage) === stage;

                return textMatch && stageMatch;
            });

            const seeMoreWrap = document.getElementById("projectsSeeMoreWrap");
            const toggleBtn = document.getElementById("projectsToggleBtn");
            const toggleText = document.getElementById("projectsToggleText");

            if (!filtered.length) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="3">
                            <div class="state-empty">
                                <svg class="state-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                                <h3>No projects matched</h3>
                                <p>Try clearing your search query or adjusting the stage filter.</p>
                            </div>
                        </td>
                    </tr>`;
                if (seeMoreWrap) seeMoreWrap.style.display = "none";
                return;
            }

            function getConciseStage(stage) {
                if (!stage) return "In Progress";
                if (stage.includes("Grid") || stage.includes("Testing")) return "Grid Testing";
                if (stage.includes("Mounting") || stage.includes("Structural")) return "Mounting";
                if (stage.includes("Permit")) return "Permitting";
                if (stage.includes("Engineering") || stage.includes("Approval")) return "Engineering";
                if (stage.includes("Survey")) return "Site Survey";
                if (stage.includes("Complete")) return "Completed";
                return stage;
            }

            const isFiltered = query !== "" || stage !== "All";
            const displayList = (projectsExpanded || isFiltered) ? filtered : filtered.slice(0, DEFAULT_PROJECT_LIMIT);

            tableBody.innerHTML = displayList.map(p => {
                const hasUrgentIssue = payouts.some(pay => pay.projectId === p.id && pay.status === 'On Hold') || p.id === 'PRJ-MKT-102';
                const displayStatus = hasUrgentIssue ? 'Action Needed' : getConciseStage(p.currentStage);
                const statusClass = hasUrgentIssue ? 'status-red' : getSemanticStatusClass(displayStatus);

                return `
                    <tr>
                        <td data-label="Customer">
                            <span class="td-strong">${p.customerName}</span>
                        </td>
                        <td data-label="Status">
                            <span class="status-pill installer-status-badge ${statusClass}">
                                ${displayStatus}
                            </span>
                        </td>
                        <td data-label="Open" class="td-action-cell" style="text-align:right;">
                            <button class="btn btn-secondary btn-sm" onclick="openProjectModal('${p.id}')" type="button">
                                View
                            </button>
                        </td>
                    </tr>`;
            }).join("");

            if (seeMoreWrap && toggleBtn && toggleText) {
                if (filtered.length > DEFAULT_PROJECT_LIMIT && !isFiltered) {
                    seeMoreWrap.style.display = "flex";
                    if (projectsExpanded) {
                        toggleText.textContent = "See Less";
                        toggleBtn.classList.add("expanded");
                        toggleBtn.setAttribute("aria-expanded", "true");
                    } else {
                        const remaining = filtered.length - DEFAULT_PROJECT_LIMIT;
                        toggleText.textContent = `See More (${remaining} more projects)`;
                        toggleBtn.classList.remove("expanded");
                        toggleBtn.setAttribute("aria-expanded", "false");
                    }
                } else {
                    seeMoreWrap.style.display = "none";
                }
            }
        }

        if (projectsToggleBtn) {
            projectsToggleBtn.addEventListener("click", () => {
                projectsExpanded = !projectsExpanded;
                renderProjects();
            });
        }

        if (searchInput) searchInput.addEventListener("input", renderProjects);
        if (stageFilter) stageFilter.addEventListener("change", renderProjects);
        renderProjects();

        // --------------------------------------------------------------------------
        // Tab switching: Upcoming Tasks & Recent Activity
        // --------------------------------------------------------------------------
        const tabUpcoming = document.getElementById("tabUpcomingTasks");
        const tabActivity = document.getElementById("tabRecentActivity");
        const panelUpcoming = document.getElementById("panelUpcomingTasks");
        const panelActivity = document.getElementById("panelRecentActivity");

        function switchTab(target) {
            if (target === "tasks") {
                if (tabUpcoming) {
                    tabUpcoming.classList.add("active");
                    tabUpcoming.setAttribute("aria-selected", "true");
                }
                if (tabActivity) {
                    tabActivity.classList.remove("active");
                    tabActivity.setAttribute("aria-selected", "false");
                }
                if (panelUpcoming) {
                    panelUpcoming.style.display = "block";
                    panelUpcoming.classList.add("active");
                }
                if (panelActivity) {
                    panelActivity.style.display = "none";
                    panelActivity.classList.remove("active");
                }
            } else {
                if (tabActivity) {
                    tabActivity.classList.add("active");
                    tabActivity.setAttribute("aria-selected", "true");
                }
                if (tabUpcoming) {
                    tabUpcoming.classList.remove("active");
                    tabUpcoming.setAttribute("aria-selected", "false");
                }
                if (panelActivity) {
                    panelActivity.style.display = "block";
                    panelActivity.classList.add("active");
                }
                if (panelUpcoming) {
                    panelUpcoming.style.display = "none";
                    panelUpcoming.classList.remove("active");
                }
            }
        }

        if (tabUpcoming) tabUpcoming.addEventListener("click", () => switchTab("tasks"));
        if (tabActivity) tabActivity.addEventListener("click", () => switchTab("activity"));

        // --------------------------------------------------------------------------
        // Upcoming Tasks & Dates (Initial 3 + See More/Less + Modal View)
        // --------------------------------------------------------------------------
        const milestones = dataset.milestones || [];
        const milestonesContainer = document.getElementById("milestonesList");
        const milestonesSeeMoreWrap = document.getElementById("milestonesSeeMoreWrap");
        const milestonesToggleBtn = document.getElementById("milestonesToggleBtn");
        const milestonesToggleText = document.getElementById("milestonesToggleText");
        const viewAllMilestonesBtn = document.getElementById("viewAllMilestonesBtn");
        const allMilestonesModal = document.getElementById("allMilestonesModal");
        const closeMilestonesModalBtn = document.getElementById("closeMilestonesModalBtn");
        const closeMilestonesModalFooterBtn = document.getElementById("closeMilestonesModalFooterBtn");
        const allMilestonesList = document.getElementById("allMilestonesList");

        let milestonesExpanded = false;
        const DEFAULT_MILESTONE_LIMIT = 3;

        function getMilestoneBadgeClass(status) {
            if (!status) return "in-progress";
            const s = status.toLowerCase();
            if (s.includes("completed") || s.includes("released") || s.includes("done")) return "completed";
            if (s.includes("process")) return "processing";
            if (s.includes("pending")) return "pending-review";
            if (s.includes("sched")) return "in-progress";
            return "in-progress";
        }

        // Sort milestones chronologically (nearest upcoming first)
        const sortedMilestones = [...milestones].sort((a, b) => {
            const da = new Date(a.date);
            const db = new Date(b.date);
            if (isNaN(da.getTime())) return 1;
            if (isNaN(db.getTime())) return -1;
            return da - db;
        });

        function formatMilestoneDate(dateStr) {
            if (!dateStr) return "—";
            const match = String(dateStr).match(/^([A-Za-z]+)\.?\s+(\d{1,2}),?\s*(\d{4})?/);
            if (match) {
                let mName = match[1];
                const mLower = mName.toLowerCase();
                if (mLower.startsWith("sept") || mLower.startsWith("sep")) mName = "Sept";
                else if (mLower.startsWith("jan")) mName = "Jan";
                else if (mLower.startsWith("feb")) mName = "Feb";
                else if (mLower.startsWith("mar")) mName = "Mar";
                else if (mLower.startsWith("apr")) mName = "Apr";
                else if (mLower.startsWith("may")) mName = "May";
                else if (mLower.startsWith("jun")) mName = "Jun";
                else if (mLower.startsWith("jul")) mName = "Jul";
                else if (mLower.startsWith("aug")) mName = "Aug";
                else if (mLower.startsWith("oct")) mName = "Oct";
                else if (mLower.startsWith("nov")) mName = "Nov";
                else if (mLower.startsWith("dec")) mName = "Dec";

                const day = parseInt(match[2], 10);
                const year = match[3] || "2026";
                return `${mName} ${day}, ${year}`;
            }
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
                return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
            }
            return dateStr;
        }

        function buildMilestoneItemHtml(m) {
            const formattedDate = formatMilestoneDate(m.date);

            const isPayout = m.title.toLowerCase().includes("payout") || m.title.toLowerCase().includes("disbursement");
            let actionBtnHtml = "";
            if (isPayout) {
                const targetPayout = payouts.find(p => p.projectId === m.projectId && p.status !== 'Released') ||
                    payouts.find(p => p.projectId === m.projectId) ||
                    payouts.find(p => p.payoutId === "PAY-2026-083");
                const pId = targetPayout ? targetPayout.payoutId : "PAY-2026-083";
                actionBtnHtml = `<button class="subtle-link-btn" onclick="openPayoutModal('${pId}')" type="button">View →</button>`;
            } else if (m.projectId) {
                actionBtnHtml = `<button class="subtle-link-btn" onclick="openProjectModal('${m.projectId}')" type="button">View →</button>`;
            } else {
                actionBtnHtml = `<button class="subtle-link-btn" onclick="openProjectModal('PRJ-MKT-101')" type="button">View →</button>`;
            }

            const statusClass = getSemanticStatusClass(m.status);

            return `
                <div class="next-up-item">
                    <div class="next-up-date">
                        <svg class="next-up-date-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <span>${formattedDate}</span>
                    </div>
                    <div class="next-up-title">${m.title}</div>
                    <div class="next-up-status">
                        <span class="status-pill installer-status-badge ${statusClass}">${m.status}</span>
                    </div>
                    <div class="next-up-action">
                        ${actionBtnHtml}
                    </div>
                </div>`;
        }

        function renderMilestones() {
            if (!milestonesContainer) return;
            if (sortedMilestones.length === 0) {
                milestonesContainer.innerHTML = `
                    <div class="state-empty" style="padding:20px 16px;">
                        <p>No upcoming tasks or dates scheduled.</p>
                    </div>`;
                if (milestonesSeeMoreWrap) milestonesSeeMoreWrap.style.display = "none";
                return;
            }

            const displayList = sortedMilestones.slice(0, DEFAULT_MILESTONE_LIMIT);
            milestonesContainer.innerHTML = displayList.map(buildMilestoneItemHtml).join("");
        }

        if (milestonesToggleBtn) {
            milestonesToggleBtn.addEventListener("click", () => {
                milestonesExpanded = !milestonesExpanded;
                renderMilestones();
            });
        }

        function openAllMilestonesModal() {
            if (!allMilestonesModal || !allMilestonesList) return;
            if (sortedMilestones.length === 0) {
                allMilestonesList.innerHTML = `
                    <div class="state-empty" style="padding:32px 16px;">
                        <p>No tasks or dates recorded in the current dataset.</p>
                    </div>`;
            } else {
                allMilestonesList.innerHTML = sortedMilestones.map(buildMilestoneItemHtml).join("");
            }
            allMilestonesModal.classList.add("open");
            document.body.classList.add("nav-open");
        }

        function closeAllMilestonesModal() {
            if (allMilestonesModal) allMilestonesModal.classList.remove("open");
            document.body.classList.remove("nav-open");
        }

        if (viewAllMilestonesBtn) viewAllMilestonesBtn.addEventListener("click", openAllMilestonesModal);
        if (closeMilestonesModalBtn) closeMilestonesModalBtn.addEventListener("click", closeAllMilestonesModal);
        if (closeMilestonesModalFooterBtn) closeMilestonesModalFooterBtn.addEventListener("click", closeAllMilestonesModal);
        if (allMilestonesModal) {
            allMilestonesModal.addEventListener("click", (e) => {
                if (e.target === allMilestonesModal) closeAllMilestonesModal();
            });
        }

        renderMilestones();

        // --------------------------------------------------------------------------
        // Recent Activity (Initial 3 + See More/Less + Modal View)
        // --------------------------------------------------------------------------
        const activities = dataset.activity || [];
        const activityContainer = document.getElementById("activityFeed");
        const activitySeeMoreWrap = document.getElementById("activitySeeMoreWrap");
        const activityToggleBtn = document.getElementById("activityToggleBtn");
        const activityToggleText = document.getElementById("activityToggleText");
        const viewAllActivityBtn = document.getElementById("viewAllActivityBtn");
        const allActivityModal = document.getElementById("allActivityModal");
        const closeActivityModalBtn = document.getElementById("closeActivityModalBtn");
        const closeActivityModalFooterBtn = document.getElementById("closeActivityModalFooterBtn");
        const allActivityFeed = document.getElementById("allActivityFeed");

        let activityExpanded = false;
        const DEFAULT_ACTIVITY_LIMIT = 3;

        function buildActivityItemHtml(a, showFullDetail = false) {
            let actionBtnHtml = "";
            const isPayout = a.title.toLowerCase().includes("payout") || (a.detail && a.detail.includes("PAY-"));
            if (isPayout) {
                const payoutMatch = a.detail && a.detail.match(/PAY-\d{4}-\d{3}/);
                const pId = payoutMatch ? payoutMatch[0] : "PAY-2026-081";
                actionBtnHtml = `<button class="subtle-link" onclick="openPayoutModal('${pId}')" type="button">View →</button>`;
            } else if (a.projectId) {
                actionBtnHtml = `<button class="subtle-link" onclick="openProjectModal('${a.projectId}')" type="button">View →</button>`;
            }

            const detailNoteHtml = showFullDetail && a.detail ? `
                <div class="activity-detail-block">${a.detail}</div>` : "";

            return `
                <div class="compact-row-item">
                    <div class="compact-row-main">
                        <div class="compact-row-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                            </svg>
                        </div>
                        <div class="compact-row-content">
                            <div class="compact-row-title-line">
                                <strong class="compact-row-title">${a.title}</strong>
                            </div>
                            <div class="compact-row-meta">
                                <span class="compact-meta-project">${a.projectName || a.projectId}</span>
                                <span class="compact-meta-sep">·</span>
                                <span>${a.timestamp}</span>
                                ${a.crewName ? `<span class="compact-meta-sep">·</span><span>${a.crewName}</span>` : ""}
                            </div>
                            ${detailNoteHtml}
                        </div>
                    </div>
                    <div class="compact-row-action">
                        ${actionBtnHtml}
                    </div>
                </div>`;
        }

        function renderActivity() {
            if (!activityContainer) return;
            if (activities.length === 0) {
                activityContainer.innerHTML = `
                    <div class="state-empty" style="padding:20px 16px;">
                        <p>No recent operational activities recorded.</p>
                    </div>`;
                if (activitySeeMoreWrap) activitySeeMoreWrap.style.display = "none";
                return;
            }

            const displayList = activityExpanded ? activities : activities.slice(0, DEFAULT_ACTIVITY_LIMIT);
            activityContainer.innerHTML = displayList.map(a => buildActivityItemHtml(a, false)).join("");

            if (activitySeeMoreWrap && activityToggleBtn && activityToggleText) {
                if (activities.length > DEFAULT_ACTIVITY_LIMIT) {
                    activitySeeMoreWrap.style.display = "flex";
                    if (activityExpanded) {
                        activityToggleText.textContent = "See Less";
                        activityToggleBtn.classList.add("expanded");
                        activityToggleBtn.setAttribute("aria-expanded", "true");
                    } else {
                        const remaining = activities.length - DEFAULT_ACTIVITY_LIMIT;
                        activityToggleText.textContent = `See More (${remaining} more updates)`;
                        activityToggleBtn.classList.remove("expanded");
                        activityToggleBtn.setAttribute("aria-expanded", "false");
                    }
                } else {
                    activitySeeMoreWrap.style.display = "none";
                }
            }
        }

        if (activityToggleBtn) {
            activityToggleBtn.addEventListener("click", () => {
                activityExpanded = !activityExpanded;
                renderActivity();
            });
        }

        function openAllActivityModal() {
            if (!allActivityModal || !allActivityFeed) return;
            if (activities.length === 0) {
                allActivityFeed.innerHTML = `
                    <div class="state-empty" style="padding:32px 16px;">
                        <p>No activity logs recorded in the current dataset.</p>
                    </div>`;
            } else {
                allActivityFeed.innerHTML = activities.map(a => buildActivityItemHtml(a, true)).join("");
            }
            allActivityModal.classList.add("open");
            document.body.classList.add("nav-open");
        }

        function closeAllActivityModal() {
            if (allActivityModal) allActivityModal.classList.remove("open");
            document.body.classList.remove("nav-open");
        }

        if (viewAllActivityBtn) viewAllActivityBtn.addEventListener("click", openAllActivityModal);
        if (closeActivityModalBtn) closeActivityModalBtn.addEventListener("click", closeAllActivityModal);
        if (closeActivityModalFooterBtn) closeActivityModalFooterBtn.addEventListener("click", closeAllActivityModal);
        if (allActivityModal) {
            allActivityModal.addEventListener("click", (e) => {
                if (e.target === allActivityModal) closeAllActivityModal();
            });
        }

        renderActivity();
    }

    // --------------------------------------------------------------------------
    // 7. PAGE 2: PAYMENTS (payments.html)
    // --------------------------------------------------------------------------
    if (currentPage === "payments") {
        const dataset = await window.MerchantData.loadAllData();
        const summary = window.MerchantData.calculateSummary(dataset);
        const payouts = dataset.payouts || [];

        const totalPaidEl = document.getElementById("payTotalPaid");
        if (totalPaidEl) totalPaidEl.textContent = window.MerchantData.formatCurrency(summary.totalPaidPhp);

        const pendingEl = document.getElementById("payPendingReview");
        if (pendingEl) pendingEl.textContent = window.MerchantData.formatCurrency(summary.pendingPayoutsPhp);

        const onHoldEl = document.getElementById("payOnHold");
        if (onHoldEl) onHoldEl.textContent = window.MerchantData.formatCurrency(summary.onHoldPayoutsPhp);

        const nextReleaseEl = document.getElementById("payNextRelease");
        if (nextReleaseEl) nextReleaseEl.textContent = summary.nextReleaseDate || "Sept 15, 2026";

        const searchInput = document.getElementById("payoutSearch");
        const statusFilter = document.getElementById("payoutStatusFilter");
        const tableBody = document.getElementById("payoutsTableBody");
        const exportBtn = document.getElementById("exportCsvBtn");
        const payoutsSeeMoreWrap = document.getElementById("payoutsSeeMoreWrap");
        const payoutsToggleBtn = document.getElementById("payoutsToggleBtn");
        const payoutsToggleText = document.getElementById("payoutsToggleText");

        let currentFilteredPayouts = [...payouts];
        let payoutsExpanded = false;
        const DEFAULT_PAYOUT_LIMIT = 3;

        function renderPayouts() {
            if (!tableBody) return;
            const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
            const status = statusFilter ? statusFilter.value : "All";

            currentFilteredPayouts = payouts.filter(p => {
                const textMatch = !query ||
                    p.payoutId.toLowerCase().includes(query) ||
                    p.projectId.toLowerCase().includes(query) ||
                    p.projectName.toLowerCase().includes(query) ||
                    p.milestone.toLowerCase().includes(query);

                const statusMatch = status === "All" || p.status === status;

                return textMatch && statusMatch;
            });

            if (!currentFilteredPayouts.length) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5">
                            <div class="state-empty">
                                <svg class="state-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                                    <rect x="3" y="5" width="18" height="14" rx="3"></rect>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <h3>No payouts found</h3>
                                <p>Try adjusting your search query or status filter.</p>
                            </div>
                        </td>
                    </tr>`;
                if (exportBtn) exportBtn.disabled = true;
                if (payoutsSeeMoreWrap) payoutsSeeMoreWrap.style.display = "none";
                return;
            }

            if (exportBtn) exportBtn.disabled = false;

            // Same See More behaviour as the other merchant tables
            const isFiltered = Boolean(query) || status !== "All";
            const displayList = (payoutsExpanded || isFiltered) ? currentFilteredPayouts : currentFilteredPayouts.slice(0, DEFAULT_PAYOUT_LIMIT);

            function formatConcisePayoutDate(dateStr, status) {
                if (!dateStr || status === "On Hold" || dateStr.toLowerCase().includes("audit") || dateStr.toLowerCase().includes("hold")) {
                    return "—";
                }
                const match = dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})/i);
                if (match) {
                    const mon = match[1].slice(0, 3);
                    const day = match[2].padStart(2, "0");
                    return `${mon} ${day}`;
                }
                return dateStr;
            }

            function getConcisePayoutStatus(status) {
                if (!status) return "Pending";
                if (status.includes("Pending")) return "Pending";
                if (status.includes("Hold")) return "On Hold";
                if (status.includes("Release")) return "Released";
                return status;
            }

            tableBody.innerHTML = displayList.map(p => {
                const conciseStatus = getConcisePayoutStatus(p.status);
                const conciseDate = formatConcisePayoutDate(p.releaseDate, conciseStatus);
                const statusClass = getSemanticStatusClass(conciseStatus);

                return `
                    <tr>
                        <td data-label="Project">
                            <span class="td-strong">${p.projectName}</span>
                        </td>
                        <td data-label="Amount">
                            <span class="payout-amount-text">${window.MerchantData.formatCurrency(p.netDisbursement)}</span>
                        </td>
                        <td data-label="Status">
                            <span class="status-pill payout-status-badge ${statusClass}">
                                ${conciseStatus}
                            </span>
                        </td>
                        <td data-label="Date">
                            <span class="payout-date-text">${conciseDate}</span>
                        </td>
                        <td data-label="Open" class="td-action-cell" style="text-align:right;">
                            <button class="btn btn-secondary btn-sm" onclick="openPayoutModal('${p.payoutId}')" type="button">
                                View
                            </button>
                        </td>
                    </tr>`;
            }).join("");

            if (payoutsSeeMoreWrap && payoutsToggleBtn && payoutsToggleText) {
                if (currentFilteredPayouts.length > DEFAULT_PAYOUT_LIMIT && !isFiltered) {
                    payoutsSeeMoreWrap.style.display = "flex";
                    if (payoutsExpanded) {
                        payoutsToggleText.textContent = "See Less";
                        payoutsToggleBtn.classList.add("expanded");
                        payoutsToggleBtn.setAttribute("aria-expanded", "true");
                    } else {
                        const remaining = currentFilteredPayouts.length - DEFAULT_PAYOUT_LIMIT;
                        payoutsToggleText.textContent = `See More (${remaining} more payouts)`;
                        payoutsToggleBtn.classList.remove("expanded");
                        payoutsToggleBtn.setAttribute("aria-expanded", "false");
                    }
                } else {
                    payoutsSeeMoreWrap.style.display = "none";
                }
            }
        }

        if (payoutsToggleBtn) {
            payoutsToggleBtn.addEventListener("click", () => {
                payoutsExpanded = !payoutsExpanded;
                renderPayouts();
            });
        }

        if (searchInput) searchInput.addEventListener("input", renderPayouts);
        if (statusFilter) statusFilter.addEventListener("change", renderPayouts);
        renderPayouts();

        if (exportBtn) {
            exportBtn.addEventListener("click", () => {
                const exportData = currentFilteredPayouts.map(p => ({
                    PayoutReference: p.payoutId,
                    ProjectID: p.projectId,
                    ProjectName: p.projectName,
                    Milestone: p.milestone,
                    GrossCommissionPHP: p.grossCommission,
                    WithholdingTax2PctPHP: p.withholdingTax,
                    NetDisbursementPHP: p.netDisbursement,
                    Status: p.status,
                    ReleaseOrExpectedDate: p.releaseDate,
                    BankDestination: p.bankDestination,
                    BankConfirmation: p.bankConfirmation,
                    AuditNotes: p.auditNotes
                }));
                window.MerchantData.downloadCSV(exportData, `hello-solar-merchant-payouts-${new Date().toISOString().slice(0, 10)}.csv`);
                showToast("Filtered payouts exported as CSV successfully.");
            });
        }
    }

    // --------------------------------------------------------------------------
    // 8. PAGE 3: INSTALLERS (installers.html)
    // --------------------------------------------------------------------------
    if (currentPage === "installers") {
        const dataset = await window.MerchantData.loadAllData();
        const payouts = dataset.payouts || [];
        const installers = dataset.crews || [];
        const projects = dataset.projects || [];

        // Render Installer Team Cards
        const teamsContainer = document.getElementById("installerTeamsGrid");
        if (teamsContainer) {
            teamsContainer.innerHTML = installers.map(c => {
                const assignedProjects = projects.filter(p => p.assignedCrewId === c.crewId);
                const activeCount = assignedProjects.filter(p => p.progress < 100).length;
                const phoneNum = (c.contact || '').split(" · ")[0].trim();

                return `
                    <div class="crew-card" id="crewCard-${c.crewId}">
                        <div class="crew-card-main">
                            <div class="crew-header-simple">
                                <h2 class="crew-name">${c.teamName}</h2>
                                <div class="crew-lead">${c.leadEngineer}</div>
                                <div class="crew-meta">${c.technicianHeadcount} members · ${activeCount} active jobs</div>
                            </div>
                        </div>
                        <div class="crew-actions">
                            <button type="button" class="btn btn-secondary btn-sm" onclick="openCrewModal('${c.crewId}')">
                                View Team
                            </button>
                            <a href="tel:${phoneNum}" class="btn btn-secondary btn-sm">
                                Call Team
                            </a>
                        </div>
                    </div>`;
            }).join("");
        }

        // Installation Tracker Table
        const searchInput = document.getElementById("installerSearch");
        const crewFilter = document.getElementById("crewFilter");
        const stageFilter = document.getElementById("stageFilter");
        const tableBody = document.getElementById("installationsTableBody");
        const seeMoreWrap = document.getElementById("installationsSeeMoreWrap");
        const toggleBtn = document.getElementById("installationsToggleBtn");
        const toggleText = document.getElementById("installationsToggleText");

        let installationsExpanded = false;
        const DEFAULT_INSTALLATION_LIMIT = 3;

        function renderInstallations() {
            if (!tableBody) return;
            const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
            const selCrew = crewFilter ? crewFilter.value : "All";
            const selStage = stageFilter ? stageFilter.value : "All";

            const filtered = projects.filter(p => {
                const textMatch = !query ||
                    p.id.toLowerCase().includes(query) ||
                    p.customerName.toLowerCase().includes(query) ||
                    p.location.toLowerCase().includes(query) ||
                    p.systemCapacity.toLowerCase().includes(query) ||
                    p.currentStage.toLowerCase().includes(query);

                const crewMatch = selCrew === "All" ||
                    (selCrew === "Unassigned" && (!p.assignedCrewId || p.assignedCrewId === "Unassigned")) ||
                    p.assignedCrewId === selCrew;

                const stageMatch = selStage === "All" ||
                    p.currentStage === selStage ||
                    (selStage === "Inverter & Grid-Tie Testing" && p.currentStage.includes("Grid-Tie")) ||
                    (selStage === "Grid-Tie Testing" && p.currentStage.includes("Grid-Tie"));

                return textMatch && crewMatch && stageMatch;
            });

            if (!filtered.length) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="4">
                            <div class="state-empty">
                                <svg class="state-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                                    <path d="M14.5 6.5l3-3 3 3-3 3m-2 0l-6 6m-2 0l-4 4 1 1 4-4m2-10l7 7"></path>
                                </svg>
                                <h3>No installations found</h3>
                                <p>Try adjusting your search query or assigned team selector.</p>
                            </div>
                        </td>
                    </tr>`;
                if (seeMoreWrap) seeMoreWrap.style.display = "none";
                return;
            }

            const isFiltered = query !== "" || selCrew !== "All" || selStage !== "All";
            const displayList = (installationsExpanded || isFiltered) ? filtered : filtered.slice(0, DEFAULT_INSTALLATION_LIMIT);

            tableBody.innerHTML = displayList.map(p => {
                const assignedCrew = installers.find(c => c.crewId === p.assignedCrewId);
                const crewName = assignedCrew ? assignedCrew.teamName : (p.assignedCrewId || "Unassigned");
                const hasUrgentIssue = payouts.some(pay => pay.projectId === p.id && pay.status === 'On Hold') || p.id === 'PRJ-MKT-102';
                const statusClass = getSemanticStatusClass(p.currentStage);

                return `
                    <tr>
                        <td data-label="Customer">
                            <div class="project-cell-name">
                                <span class="td-strong">${p.customerName}</span>
                                ${hasUrgentIssue ? '<span class="urgent-indicator status-red">Action Needed</span>' : ''}
                            </div>
                        </td>
                        <td data-label="Team">
                            <span class="crew-team-name">${crewName}</span>
                        </td>
                        <td data-label="Status">
                            <span class="status-pill installer-status-badge ${statusClass}">
                                ${p.currentStage}
                            </span>
                        </td>
                        <td data-label="Open" class="td-action-cell" style="text-align:right;">
                            <button class="btn btn-secondary btn-sm" onclick="openProjectModal('${p.id}')" type="button">
                                Open
                            </button>
                        </td>
                    </tr>`;
            }).join("");

            if (seeMoreWrap && toggleBtn && toggleText) {
                if (filtered.length > DEFAULT_INSTALLATION_LIMIT && !isFiltered) {
                    seeMoreWrap.style.display = "flex";
                    if (installationsExpanded) {
                        toggleText.textContent = "See Less";
                        toggleBtn.classList.add("expanded");
                        toggleBtn.setAttribute("aria-expanded", "true");
                    } else {
                        const remaining = filtered.length - DEFAULT_INSTALLATION_LIMIT;
                        toggleText.textContent = `See More (${remaining} more projects)`;
                        toggleBtn.classList.remove("expanded");
                        toggleBtn.setAttribute("aria-expanded", "false");
                    }
                } else {
                    seeMoreWrap.style.display = "none";
                }
            }
        }

        if (toggleBtn) {
            toggleBtn.addEventListener("click", () => {
                installationsExpanded = !installationsExpanded;
                renderInstallations();
            });
        }

        if (searchInput) searchInput.addEventListener("input", renderInstallations);
        if (crewFilter) crewFilter.addEventListener("change", renderInstallations);
        if (stageFilter) stageFilter.addEventListener("change", renderInstallations);
        renderInstallations();
    }

    // --------------------------------------------------------------------------
    // 9. PAGE 4: SUPPORT (support.html)
    // --------------------------------------------------------------------------
    if (currentPage === "support") {
        const dataset = await window.MerchantData.loadAllData();
        const faqs = (dataset.support && dataset.support.faqs) ? dataset.support.faqs : [];
        const form = document.getElementById("supportTicketForm");
        const DRAFT_KEY = "hello_solar_merchant_support_draft";

        // Load existing draft
        let existingDraft = {};
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (raw) existingDraft = JSON.parse(raw);
        } catch (e) { }

        if (form) {
            if (existingDraft.topic) form.elements.topic.value = existingDraft.topic;
            if (existingDraft.projectRef) form.elements.projectRef.value = existingDraft.projectRef;
            if (existingDraft.priority) form.elements.priority.value = existingDraft.priority;
            if (existingDraft.subject) form.elements.subject.value = existingDraft.subject;
            if (existingDraft.description) form.elements.description.value = existingDraft.description;

            // Safe prefill check: if URL has ?project=... or ?payout=...
            const urlParams = new URLSearchParams(window.location.search);
            const incomingRef = urlParams.get("project") || urlParams.get("reference") || urlParams.get("payout");
            const incomingTopic = urlParams.get("topic");

            if (incomingRef) {
                const hasExistingText = Boolean((form.elements.subject.value && form.elements.subject.value.trim()) ||
                    (form.elements.description.value && form.elements.description.value.trim()));

                if (!hasExistingText && !form.elements.projectRef.value) {
                    // Safe to populate immediately
                    form.elements.projectRef.value = incomingRef;
                    if (incomingTopic) form.elements.topic.value = incomingTopic;
                    else if (incomingRef.startsWith("PAY-")) form.elements.topic.value = "Payout and Billing";
                } else if (form.elements.projectRef.value !== incomingRef) {
                    // Show non-destructive notification banner
                    const banner = document.getElementById("incomingContextNotice");
                    const bannerText = document.getElementById("incomingContextText");
                    const applyBtn = document.getElementById("applyContextBtn");
                    if (banner && bannerText && applyBtn) {
                        bannerText.textContent = `Incoming reference from link: "${incomingRef}". Apply without overwriting your draft text?`;
                        banner.style.display = "block";
                        applyBtn.onclick = () => {
                            form.elements.projectRef.value = incomingRef;
                            if (incomingRef.startsWith("PAY-")) form.elements.topic.value = "Payout and Billing";
                            banner.style.display = "none";
                            showToast(`Reference ${incomingRef} applied to support request.`);
                        };
                    }
                }
            }

            // Auto-save on every keystroke
            const autoSave = () => {
                const draftObj = {
                    topic: form.elements.topic.value,
                    projectRef: form.elements.projectRef.value.trim(),
                    priority: form.elements.priority.value,
                    subject: form.elements.subject.value.trim(),
                    description: form.elements.description.value.trim(),
                    lastUpdated: new Date().toISOString()
                };
                localStorage.setItem(DRAFT_KEY, JSON.stringify(draftObj));
                const statusMsg = document.getElementById("draftStatusMessage");
                if (statusMsg) statusMsg.textContent = "Draft preserved locally";
            };

            form.addEventListener("input", autoSave);
            form.addEventListener("change", autoSave);
        }

        const saveDraftBtn = document.getElementById("saveDraftBtn");
        if (saveDraftBtn && form) {
            saveDraftBtn.addEventListener("click", () => {
                const draftObj = {
                    topic: form.elements.topic.value,
                    projectRef: form.elements.projectRef.value.trim(),
                    priority: form.elements.priority.value,
                    subject: form.elements.subject.value.trim(),
                    description: form.elements.description.value.trim(),
                    lastUpdated: new Date().toISOString()
                };
                localStorage.setItem(DRAFT_KEY, JSON.stringify(draftObj));
                showToast("Support draft saved on this device.");
            });
        }

        const clearDraftBtn = document.getElementById("clearDraftBtn");
        if (clearDraftBtn && form) {
            clearDraftBtn.addEventListener("click", () => {
                localStorage.removeItem(DRAFT_KEY);
                form.reset();
                const statusMsg = document.getElementById("draftStatusMessage");
                if (statusMsg) statusMsg.textContent = "";
                showToast("Support ticket draft cleared.");
            });
        }

        const downloadDraftBtn = document.getElementById("downloadDraftBtn");
        if (downloadDraftBtn && form) {
            downloadDraftBtn.addEventListener("click", () => {
                if (!form.reportValidity()) return;

                const content = [
                    "===========================================================",
                    "HELLO SOLAR MERCHANT — OFFICIAL SUPPORT REQUEST",
                    "===========================================================",
                    `Date Generated:     ${new Date().toLocaleString("en-PH")}`,
                    `Merchant Company:   ${merchantData.companyName || "SolarTech Manila"} (ID: ${merchantData.merchantId || "—"})`,
                    `Contact Person:     ${merchantData.contactPerson} (${merchantData.phone})`,
                    "-----------------------------------------------------------",
                    `Category / Topic:   ${form.elements.topic.value}`,
                    `Priority Level:     ${form.elements.priority.value.toUpperCase()}`,
                    `Reference ID:       ${form.elements.projectRef.value.trim() || "General Partner Account Inquiry"}`,
                    `Subject:            ${form.elements.subject.value.trim()}`,
                    "-----------------------------------------------------------",
                    "PROBLEM DESCRIPTION & DETAILS:",
                    form.elements.description.value.trim(),
                    "===========================================================",
                    "NOTICE: Unsent draft. Submit this official text request file to",
                    "Hello Solar Account Manager: David Ramos (support@hellosolar.ph)"
                ].join("\r\n");

                const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `hello-solar-merchant-request-${merchantData.merchantId || 'MCH'}-${Date.now().toString().slice(-4)}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                showToast("Official Support Request text file downloaded.");
            });
        }

        // Support Category Selectable Buttons
        const catBtns = document.querySelectorAll(".support-cat-btn, .support-category-card");
        catBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const cat = btn.dataset.category;
                catBtns.forEach(b => {
                    b.classList.remove("active");
                    b.setAttribute("aria-selected", "false");
                });
                btn.classList.add("active");
                btn.setAttribute("aria-selected", "true");

                const faqCatSelect = document.getElementById("faqCategoryFilter");
                if (faqCatSelect) {
                    faqCatSelect.value = cat;
                    renderFaqs();
                }

                if (form && form.elements.topic) {
                    if (cat.includes("Payout")) form.elements.topic.value = "Payout and Billing";
                    if (cat.includes("Technical")) form.elements.topic.value = "Technical Requirements";
                    if (cat.includes("Warranty")) form.elements.topic.value = "Warranty and RMA";
                    if (cat.includes("Net-Metering")) form.elements.topic.value = "Net-Metering";
                }
            });
        });

        // Sync category buttons if topic select changes directly
        if (form && form.elements.topic) {
            form.elements.topic.addEventListener("change", () => {
                const topicVal = form.elements.topic.value;
                catBtns.forEach(btn => {
                    const matches = (topicVal === "Payout and Billing" && btn.dataset.category === "Payout and Billing") ||
                        (topicVal === "Technical Requirements" && btn.dataset.category === "Technical Requirements") ||
                        (topicVal === "Permitting" && btn.dataset.category === "Technical Requirements") ||
                        (topicVal === "Net-Metering" && btn.dataset.category === "Net-Metering") ||
                        (topicVal === "Warranty and RMA" && btn.dataset.category === "Warranty and RMA");
                    btn.classList.toggle("active", matches);
                    btn.setAttribute("aria-selected", matches ? "true" : "false");
                });
            });
        }

        // FAQ Accordion & Live Keyword Search
        const faqSearchInput = document.getElementById("faqSearch");
        const faqCatSelect = document.getElementById("faqCategoryFilter");
        const faqContainer = document.getElementById("faqList");
        const faqSeeMoreWrap = document.getElementById("faqSeeMoreWrap");
        const faqToggleBtn = document.getElementById("faqToggleBtn");
        const faqToggleText = document.getElementById("faqToggleText");

        let faqsExpanded = false;
        const DEFAULT_FAQ_LIMIT = 3;

        function renderFaqs() {
            if (!faqContainer) return;
            const query = faqSearchInput ? faqSearchInput.value.toLowerCase().trim() : "";
            const selCat = faqCatSelect ? faqCatSelect.value : "All";

            const filtered = faqs.filter(f => {
                const catMatch = selCat === "All" ||
                    f.category === selCat ||
                    (selCat === "Warranty and RMA" && f.category.includes("Warranty")) ||
                    (selCat === "Technical Requirements" && (f.category.includes("Technical") || f.category.includes("Permitting")));
                const textMatch = !query ||
                    f.question.toLowerCase().includes(query) ||
                    f.answer.toLowerCase().includes(query) ||
                    (f.keywords && f.keywords.some(k => k.toLowerCase().includes(query)));
                return catMatch && textMatch;
            });

            if (!filtered.length) {
                faqContainer.innerHTML = `
                    <div class="state-empty" style="padding:28px 16px;">
                        <svg class="state-empty-icon" style="width:32px;height:32px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <h3 style="font-size:14px;">No answers found</h3>
                        <p style="font-size:12px;">Try adjusting your search query or category filter.</p>
                    </div>`;
                if (faqSeeMoreWrap) faqSeeMoreWrap.style.display = "none";
                return;
            }

            const isFiltered = query !== "" || selCat !== "All";
            const displayList = (faqsExpanded || isFiltered) ? filtered : filtered.slice(0, DEFAULT_FAQ_LIMIT);

            faqContainer.innerHTML = displayList.map(f => `
                <div class="faq-item" id="faqItem-${f.id}">
                    <button class="faq-header" type="button" aria-expanded="false" aria-controls="faqBody-${f.id}">
                        <span>${f.question}</span>
                        <svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    <div class="faq-body" id="faqBody-${f.id}">
                        <p>${f.answer}</p>
                        <span class="badge badge-site-survey" style="font-size:10.5px;margin-top:10px;">${f.category}</span>
                    </div>
                </div>`).join("");

            if (faqSeeMoreWrap && faqToggleBtn && faqToggleText) {
                if (filtered.length > DEFAULT_FAQ_LIMIT && !isFiltered) {
                    faqSeeMoreWrap.style.display = "flex";
                    if (faqsExpanded) {
                        faqToggleText.textContent = "See Less";
                        faqToggleBtn.classList.add("expanded");
                        faqToggleBtn.setAttribute("aria-expanded", "true");
                    } else {
                        const remaining = filtered.length - DEFAULT_FAQ_LIMIT;
                        faqToggleText.textContent = `See More (${remaining} more questions)`;
                        faqToggleBtn.classList.remove("expanded");
                        faqToggleBtn.setAttribute("aria-expanded", "false");
                    }
                } else {
                    faqSeeMoreWrap.style.display = "none";
                }
            }

            faqContainer.querySelectorAll(".faq-header").forEach(btn => {
                btn.addEventListener("click", () => {
                    const item = btn.closest(".faq-item");
                    const isOpen = item.classList.contains("open");

                    faqContainer.querySelectorAll(".faq-item").forEach(other => {
                        other.classList.remove("open");
                        const otherBtn = other.querySelector(".faq-header");
                        if (otherBtn) otherBtn.setAttribute("aria-expanded", "false");
                    });

                    if (!isOpen) {
                        item.classList.add("open");
                        btn.setAttribute("aria-expanded", "true");
                    }
                });
            });
        }

        if (faqToggleBtn) {
            faqToggleBtn.addEventListener("click", () => {
                faqsExpanded = !faqsExpanded;
                renderFaqs();
            });
        }

        if (faqSearchInput) faqSearchInput.addEventListener("input", renderFaqs);
        if (faqCatSelect) faqCatSelect.addEventListener("change", renderFaqs);
        renderFaqs();
    }

    // --------------------------------------------------------------------------
    // 10. LOCAL PREVIEW DATA LOADER ACCORDION (All Pages)
    // --------------------------------------------------------------------------
    const previewAccordion = document.getElementById("previewDataAccordion");
    if (previewAccordion) {
        const fileInput = document.getElementById("previewFileInput");
        const loadBtn = document.getElementById("loadCurrentJsonBtn");
        const applyBtn = document.getElementById("applyPreviewJsonBtn");
        const resetBtn = document.getElementById("resetPreviewJsonBtn");
        const textarea = document.getElementById("previewJsonTextarea");
        const statusEl = document.getElementById("previewStatus");

        if (loadBtn && textarea) {
            loadBtn.addEventListener("click", async () => {
                const currentData = await window.MerchantData.loadAllData();
                textarea.value = JSON.stringify(currentData, null, 2);
                showToast("Loaded active dataset to editor.");
            });
        }

        if (fileInput && textarea) {
            fileInput.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    textarea.value = evt.target.result;
                    showToast(`Loaded ${file.name} to editor.`);
                };
                reader.readAsText(file);
            });
        }

        if (applyBtn && textarea && statusEl) {
            applyBtn.addEventListener("click", () => {
                const raw = textarea.value.trim();
                if (!raw) {
                    statusEl.className = "preview-data-status error";
                    statusEl.textContent = "Please paste or load JSON before applying.";
                    return;
                }

                const res = window.MerchantData.applyCustomDataset(raw);
                if (res.success) {
                    statusEl.className = "preview-data-status success";
                    statusEl.textContent = "✓ Schema validated successfully! Dataset applied. Reloading view in 1 second...";
                    setTimeout(() => window.location.reload(), 900);
                } else {
                    statusEl.className = "preview-data-status error";
                    statusEl.textContent = "Validation Errors:\n• " + res.errors.join("\n• ");
                }
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener("click", () => {
                if (confirm("Reset to the default merchant dataset and clear local overrides?")) {
                    window.MerchantData.resetDefaultDataset();
                    showToast("Restored default dataset.");
                    setTimeout(() => window.location.reload(), 500);
                }
            });
        }
    }

    // --------------------------------------------------------------------------
    // 11. DEEP-LINKING ROUTER (?project=... or ?payout=...)
    // --------------------------------------------------------------------------
    const urlParams = new URLSearchParams(window.location.search);
    const linkedProject = urlParams.get("project");
    const linkedPayout = urlParams.get("payout");

    // Guard: Support page must open as a normal Support page; never auto-open project modals
    if (currentPage !== "support") {
        if (linkedProject && typeof window.openProjectModal === "function") {
            setTimeout(() => window.openProjectModal(linkedProject), 250);
        } else if (linkedPayout && typeof window.openPayoutModal === "function") {
            setTimeout(() => window.openPayoutModal(linkedPayout), 250);
        }
    }
});
