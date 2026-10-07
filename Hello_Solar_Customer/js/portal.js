/**
 * HELLO SOLAR CUSTOMER PORTAL — CORE SCRIPT
 * Manages Auth Guard, Customer Data Store, Mobile Navigation, and Realistic Demo Feedback.
 */

(function () {
    "use strict";

    // --------------------------------------------------------------------------
    // 1. CUSTOMER PROFILE SHAPE (identity comes from the shared registry — no demo defaults)
    // --------------------------------------------------------------------------
    const EMPTY_CUSTOMER = {
        accountId: "",
        name: "",
        email: "",
        phone: "",
        accountNo: "",
        address: "",
        preferredPayment: "gcash",
        paymentAccount: "",
        avatarUrl: null
    };

    // --------------------------------------------------------------------------
    // 2. CUSTOMER DATA STORE HELPERS
    // --------------------------------------------------------------------------
    function getInitials(name) {
        if (!name || typeof name !== "string" || !name.trim()) return "HS";
        const clean = name.trim();
        const capitals = clean.match(/[A-Z]/g);
        if (capitals && capitals.length >= 2) {
            return capitals.slice(0, 2).join("");
        }
        const parts = clean.split(/\s+/).filter(Boolean);
        if (parts.length === 0) return "HS";
        if (parts.length === 1) {
            return parts[0].substring(0, 2).toUpperCase();
        }
        return parts.slice(0, 2).map(w => w.charAt(0).toUpperCase()).join("");
    }

    const PROFILE_FIELDS = ["name", "phone", "address", "preferredPayment", "paymentAccount"];
    const avatarKey = accountId => `hello_solar_customer_avatar:${accountId}`;

    function getSessionUser() {
        return window.HSShared ? window.HSShared.session.get("customer") : null;
    }

    // Signed-in customer = shared account record (authoritative) + session identity. Never a demo default.
    function getCustomer() {
        const user = getSessionUser();
        if (!user) return { ...EMPTY_CUSTOMER };
        const record = window.HSShared.getAccount("customer", user.accountId) || {};
        const { password, ...profile } = record;
        let avatarUrl = null;
        try { avatarUrl = localStorage.getItem(avatarKey(user.accountId)); } catch (e) { avatarUrl = null; }
        return {
            ...EMPTY_CUSTOMER,
            ...user,
            ...profile,
            accountId: user.accountId,
            accountNo: profile.hsId || "",
            avatarUrl: avatarUrl || null
        };
    }

    // Saves profile edits to the shared customer record (and the session copy of name/email/phone).
    function setCustomer(data) {
        const user = getSessionUser();
        if (!user || !data || typeof data !== "object") return { ok: false, error: "Not signed in." };
        const result = window.HSShared.update(store => {
            const record = (store.customers || []).find(c => c.id === user.accountId);
            if (!record) return { ok: false, error: "Customer account not found." };
            const email = String(data.email || record.email || "").trim();
            if (email.toLowerCase() !== String(record.email || "").toLowerCase()) {
                const taken = ["customers", "financers", "installers", "merchants"]
                    .some(k => (store[k] || []).some(a => a.id !== record.id && String(a.email || "").toLowerCase() === email.toLowerCase()));
                if (taken) return { ok: false, error: "That email is already used by another account." };
                record.email = email;
            }
            PROFILE_FIELDS.forEach(field => {
                if (data[field] !== undefined) record[field] = data[field];
            });
            return { record };
        }, r => ({ name: "profile.update", payload: { role: "customer", accountId: user.accountId, fields: Object.assign({ email: r.record.email }, ...PROFILE_FIELDS.map(f => ({ [f]: r.record[f] }))) } }));
        if (!result.ok) return result;
        try {
            if (data.avatarUrl) localStorage.setItem(avatarKey(user.accountId), data.avatarUrl);
            else localStorage.removeItem(avatarKey(user.accountId));
        } catch (e) {
            console.warn("Could not save profile photo:", e);
        }
        window.HSShared.session.patch("customer", { name: result.record.name, email: result.record.email, phone: result.record.phone });
        return { ok: true };
    }

    // --------------------------------------------------------------------------
    // 3. AUTHENTICATION GUARD
    // --------------------------------------------------------------------------
    function isAuthenticated() {
        return !!(window.HSShared && window.HSShared.session.isValid("customer"));
    }

    function requireAuth() {
        if (!window.HSShared) {
            window.location.replace("login.html");
            return false;
        }
        return !!window.HSShared.session.require("customer", "login.html");
    }

    function logout() {
        if (window.HSShared) window.HSShared.session.clear("customer");
        window.location.href = "login.html";
    }

    // --------------------------------------------------------------------------
    // 4. UI INITIALIZATION: USER INFO, DATES, ACTIVE LINKS
    // --------------------------------------------------------------------------
    function initUserDisplay() {
        const customer = getCustomer();

        // Target profile elements across desktop topbar & mobile views
        const profileNameEls = document.querySelectorAll("#profileName, .profile-name");
        const profileAvatarEls = document.querySelectorAll("#profileAvatar, .profile-avatar");
        const customerNameEls = document.querySelectorAll("#customerName, .customer-name");

        profileNameEls.forEach(el => {
            el.textContent = customer.name;
        });

        customerNameEls.forEach(el => {
            el.textContent = customer.name;
        });

        const initials = getInitials(customer.name);

        profileAvatarEls.forEach(el => {
            if (customer.avatarUrl) {
                el.innerHTML = `<img src="${customer.avatarUrl}" alt="${customer.name}" class="avatar-img">`;
            } else {
                el.textContent = initials || "HS";
            }
            el.setAttribute("title", customer.name);
        });

        // Initialize date display
        const dateDisplays = document.querySelectorAll("#dateDisplay, #currentDate, .date-display");
        if (dateDisplays.length > 0) {
            const today = new Date();
            const formatted = today.toLocaleDateString("en-PH", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric"
            });
            dateDisplays.forEach(el => {
                el.textContent = formatted;
            });
        }
    }

    // --------------------------------------------------------------------------
    // 5. MOBILE DRAWER & BOTTOM NAV CONTROLLER
    // --------------------------------------------------------------------------
    function initNavigation() {
        const sidebar = document.getElementById("sidebar");
        const mobileMenuButton = document.getElementById("mobileMenuButton");
        const mobileBackdrop = document.getElementById("mobileBackdrop");
        const menuIcon = document.getElementById("menuIcon");
        const logoutButtons = document.querySelectorAll("#logoutButton, .logout-button");

        // Logout handlers
        logoutButtons.forEach(btn => {
            btn.addEventListener("click", event => {
                event.preventDefault();
                logout();
            });
        });

        if (!sidebar || !mobileMenuButton) return;

        function openMenu() {
            sidebar.classList.add("open");
            if (mobileBackdrop) mobileBackdrop.classList.add("visible");
            mobileMenuButton.setAttribute("aria-expanded", "true");
            mobileMenuButton.setAttribute("aria-label", "Close navigation");
            document.body.style.overflow = "hidden";

            if (menuIcon) {
                menuIcon.innerHTML = `
                    <line x1="6" y1="6" x2="18" y2="18" stroke-width="2" stroke-linecap="round"/>
                    <line x1="18" y1="6" x2="6" y2="18" stroke-width="2" stroke-linecap="round"/>
                `;
            }
        }

        function closeMenu() {
            sidebar.classList.remove("open");
            if (mobileBackdrop) mobileBackdrop.classList.remove("visible");
            mobileMenuButton.setAttribute("aria-expanded", "false");
            mobileMenuButton.setAttribute("aria-label", "Open navigation");
            document.body.style.overflow = "";

            if (menuIcon) {
                menuIcon.innerHTML = `
                    <line x1="4" y1="6" x2="20" y2="6" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="4" y1="12" x2="20" y2="12" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="4" y1="18" x2="20" y2="18" stroke-width="1.8" stroke-linecap="round"/>
                `;
            }
        }

        mobileMenuButton.addEventListener("click", () => {
            if (sidebar.classList.contains("open")) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        if (mobileBackdrop) {
            mobileBackdrop.addEventListener("click", closeMenu);
        }

        // Close when any sidebar link is clicked on mobile
        document.querySelectorAll(".sidebar .nav-link").forEach(link => {
            link.addEventListener("click", () => {
                if (window.innerWidth <= 768) {
                    closeMenu();
                }
            });
        });

        // Close on Escape key
        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && sidebar.classList.contains("open")) {
                closeMenu();
            }
        });

        // Auto close if viewport resized to desktop
        window.addEventListener("resize", () => {
            if (window.innerWidth > 768 && sidebar.classList.contains("open")) {
                closeMenu();
            }
        });

        // Wire bottom nav menu trigger if present
        const bottomMenuBtn = document.getElementById("bottomNavMenuBtn");
        if (bottomMenuBtn) {
            bottomMenuBtn.addEventListener("click", event => {
                event.preventDefault();
                if (sidebar.classList.contains("open")) {
                    closeMenu();
                } else {
                    openMenu();
                }
            });
        }

        // Wire bottom nav profile trigger if present
        const bottomNavProfileBtn = document.getElementById("bottomNavProfileBtn");
        if (bottomNavProfileBtn) {
            bottomNavProfileBtn.addEventListener("click", event => {
                event.preventDefault();
                if (window.HelloSolar && window.HelloSolar.openProfileSettings) {
                    window.HelloSolar.openProfileSettings();
                }
            });
        }

        // Synchronize active states for mobile bottom nav items based on URL
        const currentPath = window.location.pathname.toLowerCase();
        const currentFile = currentPath.split("/").pop() || "mysystem.html";
        const bottomNavItems = document.querySelectorAll(".mobile-bottom-nav .mobile-nav-item");
        bottomNavItems.forEach(item => {
            const href = item.getAttribute("href");
            if (href && !href.startsWith("#")) {
                const target = href.toLowerCase().split("/").pop();
                if (target === currentFile || (currentFile === "" && (target === "mysystem.html" || target === "my-system.html")) || (currentFile === "mysystem.html" && target === "mysystem.html")) {
                    item.classList.add("active");
                    item.setAttribute("aria-current", "page");
                } else {
                    item.classList.remove("active");
                    item.removeAttribute("aria-current");
                }
            }
        });
    }

    // --------------------------------------------------------------------------
    // 6. REALISTIC DEMO FEEDBACK (TOAST SYSTEM)
    // --------------------------------------------------------------------------
    let toastTimeout = null;

    function showToast(title, message, duration = 4500) {
        let toastEl = document.getElementById("portalToast");

        if (!toastEl) {
            toastEl = document.createElement("div");
            toastEl.id = "portalToast";
            toastEl.className = "portal-toast";
            toastEl.setAttribute("role", "status");
            toastEl.setAttribute("aria-live", "polite");
            toastEl.innerHTML = `
                <div class="portal-toast-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                </div>
                <div class="portal-toast-content">
                    <div class="portal-toast-title" id="portalToastTitle">Notice</div>
                    <div class="portal-toast-message" id="portalToastMessage">Action completed.</div>
                </div>
            `;
            document.body.appendChild(toastEl);
        }

        const titleEl = document.getElementById("portalToastTitle");
        const msgEl = document.getElementById("portalToastMessage");

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;

        toastEl.classList.add("visible");

        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toastEl.classList.remove("visible");
        }, duration);
    }

    // --------------------------------------------------------------------------
    // 7. PROFILE SETTINGS CONTROLLER (EASY & SIMPLE UX)
    // --------------------------------------------------------------------------
    let profileModalInstance = null;

    function getPaymentLabel(method) {
        switch (method) {
            case "gcash":
                return "GCash Mobile Number";
            case "maya":
                return "Maya Mobile Number";
            case "bdo":
                return "Bank Account / Depositor Name";
            case "card":
                return "Cardholder Name (Auto-Debit)";
            default:
                return "Payment Mobile Number or Account Reference";
        }
    }

    function getPaymentPlaceholder(method) {
        switch (method) {
            case "gcash":
            case "maya":
                return "+63 917 555 0199";
            case "bdo":
                return "Account name or reference";
            case "card":
                return "Name as printed on Visa / Mastercard";
            default:
                return "Account reference";
        }
    }

    function getPaymentDisplayName(method) {
        switch (method) {
            case "gcash":
                return "GCash";
            case "maya":
                return "Maya";
            case "bdo":
                return "BDO Bank Transfer";
            case "card":
                return "Credit / Debit Card";
            default:
                return "GCash";
        }
    }

    function updatePaymentsPagePreferred() {
        const customer = getCustomer();
        const preferred = (customer.preferredPayment || "gcash").toLowerCase();
        const boxes = document.querySelectorAll(".payment-method-box");

        boxes.forEach(box => {
            box.classList.remove("preferred-channel");
            const existingBadge = box.querySelector(".preferred-channel-badge");
            if (existingBadge) existingBadge.remove();
        });

        if (boxes.length >= 2) {
            if (preferred === "gcash" || preferred === "maya") {
                boxes[0].classList.add("preferred-channel");
                const badge = document.createElement("span");
                badge.className = "preferred-channel-badge";
                badge.innerHTML = `★ Preferred Method (${getPaymentDisplayName(preferred)})`;
                boxes[0].insertBefore(badge, boxes[0].firstChild);
            } else if (preferred === "bdo") {
                boxes[1].classList.add("preferred-channel");
                const badge = document.createElement("span");
                badge.className = "preferred-channel-badge";
                badge.innerHTML = `★ Preferred Method (BDO Bank)`;
                boxes[1].insertBefore(badge, boxes[1].firstChild);
            } else if (preferred === "card") {
                boxes[0].classList.add("preferred-channel");
                const badge = document.createElement("span");
                badge.className = "preferred-channel-badge";
                badge.innerHTML = `★ Preferred Method (Card Auto-Debit)`;
                boxes[0].insertBefore(badge, boxes[0].firstChild);
            }
        }
    }

    function initProfileSettings() {
        let modalEl = document.getElementById("profileSettingsModal");

        if (!modalEl) {
            modalEl = document.createElement("div");
            modalEl.id = "profileSettingsModal";
            modalEl.className = "profile-modal-backdrop";
            modalEl.setAttribute("role", "dialog");
            modalEl.setAttribute("aria-modal", "true");
            modalEl.setAttribute("aria-labelledby", "profileModalTitle");
            modalEl.innerHTML = `
                <div class="profile-modal">
                    <!-- Header -->
                    <div class="profile-modal-header">
                        <div class="profile-modal-user">
                            <div class="profile-avatar-wrapper">
                                <div class="profile-modal-avatar" id="modalProfileAvatar" title="Click to upload profile photo">JD</div>
                                <button type="button" class="avatar-edit-badge" id="avatarUploadBadge" title="Upload profile picture" aria-label="Upload photo">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                </button>
                                <input type="file" id="profileAvatarFileInput" accept="image/*" style="display: none;">
                            </div>
                            <div>
                                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                    <h2 class="profile-modal-title" id="profileModalTitle">My Profile & Settings</h2>
                                    <span class="badge badge-online" style="font-size: 11px; padding: 2px 8px;">Active Customer</span>
                                </div>
                                <div class="profile-modal-sub" style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                                    <span id="modalCustomerName"></span>
                                    <span>·</span>
                                    <button type="button" class="profile-copy-badge" id="modalAccountCopyBtn" title="Click to copy Solar Account ID">
                                        <span id="modalAccountNo"></span>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </svg>
                                    </button>
                                </div>
                                <div class="avatar-actions-row">
                                    <button type="button" class="avatar-action-btn" id="uploadPhotoTextBtn">Upload photo</button>
                                    <span id="avatarActionSeparator" style="font-size: 11px; color: var(--gray-400); display: none;">·</span>
                                    <button type="button" class="avatar-action-btn remove" id="removePhotoBtn" style="display: none;">Remove photo</button>
                                </div>
                            </div>
                        </div>
                        <button type="button" class="profile-modal-close" id="closeProfileModalBtn" aria-label="Close Profile Settings">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    <!-- Clean, Simple Modal Body -->
                    <div class="profile-modal-body">
                        <!-- SECTION 1: Personal Contact Details -->
                        <div class="profile-section">
                            <div class="profile-section-title">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                Contact Information
                            </div>
                            <div class="profile-field-row">
                                <div class="form-group">
                                    <label class="form-label" for="profileInputName">Full Name</label>
                                    <input class="form-input" id="profileInputName" type="text" placeholder="Full Name" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="profileInputPhone">Mobile Phone</label>
                                    <input class="form-input" id="profileInputPhone" type="tel" placeholder="+63 917 555 0199" required>
                                </div>
                            </div>
                            <div class="profile-field-row">
                                <div class="form-group">
                                    <label class="form-label" for="profileInputEmail">Email Address</label>
                                    <input class="form-input" id="profileInputEmail" type="email" placeholder="name@email.com" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="profileInputPlan">Financing & Plan</label>
                                    <input class="form-input" id="profileInputPlan" type="text" readonly style="background: var(--gray-100); cursor: default; font-weight: 600; color: var(--navy);">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="profileInputAddress">Installation Address</label>
                                <input class="form-input" id="profileInputAddress" type="text" placeholder="House/Street, Barangay, City">
                            </div>
                        </div>

                        <!-- SECTION 2: Preferred Payment Method -->
                        <div class="profile-section">
                            <div class="profile-section-title">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                                Preferred Payment Method
                            </div>
                            <p class="profile-section-desc">Select your preferred channel for monthly solar amortization receipts:</p>
                            
                            <div class="payment-selector-grid" id="paymentMethodSelector">
                                <label class="payment-option-card selected" data-method="gcash">
                                    <input type="radio" name="preferredPayment" value="gcash" class="payment-radio" checked>
                                    <div class="payment-option-inner">
                                        <div class="payment-option-header">
                                            <span class="payment-badge-pill gcash-pill">GCash</span>
                                            <span class="payment-check-circle">✓</span>
                                        </div>
                                        <div class="payment-option-title">GCash e-Wallet</div>
                                        <div class="payment-option-desc">Fast mobile QR or send money</div>
                                    </div>
                                </label>

                                <label class="payment-option-card" data-method="maya">
                                    <input type="radio" name="preferredPayment" value="maya" class="payment-radio">
                                    <div class="payment-option-inner">
                                        <div class="payment-option-header">
                                            <span class="payment-badge-pill maya-pill">Maya</span>
                                            <span class="payment-check-circle">✓</span>
                                        </div>
                                        <div class="payment-option-title">Maya Digital Wallet</div>
                                        <div class="payment-option-desc">Scan to pay or Maya transfer</div>
                                    </div>
                                </label>

                                <label class="payment-option-card" data-method="bdo">
                                    <input type="radio" name="preferredPayment" value="bdo" class="payment-radio">
                                    <div class="payment-option-inner">
                                        <div class="payment-option-header">
                                            <span class="payment-badge-pill bdo-pill">BDO / Bank</span>
                                            <span class="payment-check-circle">✓</span>
                                        </div>
                                        <div class="payment-option-title">BDO Bank Transfer</div>
                                        <div class="payment-option-desc">InstaPay or Over-the-counter</div>
                                    </div>
                                </label>

                                <label class="payment-option-card" data-method="card">
                                    <input type="radio" name="preferredPayment" value="card" class="payment-radio">
                                    <div class="payment-option-inner">
                                        <div class="payment-option-header">
                                            <span class="payment-badge-pill card-pill">Card</span>
                                            <span class="payment-check-circle">✓</span>
                                        </div>
                                        <div class="payment-option-title">Credit / Debit Card</div>
                                        <div class="payment-option-desc">Visa or Mastercard Auto-Debit</div>
                                    </div>
                                </label>
                            </div>

                            <div class="form-group" style="margin-top: 4px;">
                                <label class="form-label" for="profilePaymentAccount" id="profilePaymentAccountLabel">GCash Mobile Number</label>
                                <input class="form-input" id="profilePaymentAccount" type="text" placeholder="+63 917 555 0199">
                                <span style="font-size: 11px; color: var(--gray-400); margin-top: 4px; display: block;">Used as reference for verified receipt uploads.</span>
                            </div>
                        </div>

                        <!-- SECTION 3: Password & Security -->
                        <div class="profile-section">
                            <div class="profile-section-title">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                Password & Security
                            </div>
                            <div class="profile-security-box">
                                <div>
                                    <div style="font-size: 13px; font-weight: 700; color: var(--navy);">Customer Portal Password</div>
                                    <div style="font-size: 12px; color: var(--gray-500); margin-top: 2px;">Need to update your password or secure your account?</div>
                                </div>
                                <button type="button" class="btn btn-outline btn-sm" id="profileResetPassBtn" style="white-space: nowrap; font-size: 12px; padding: 6px 14px; font-weight: 600;">
                                    Send Reset Link
                                </button>
                            </div>
                        </div>

                        <!-- SECTION 4: System Hardware At A Glance -->
                        <div class="profile-hardware-summary">
                            <div class="profile-section-title" style="font-size: 12.5px; color: var(--gray-600); margin-bottom: 8px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path></svg>
                                System Hardware At A Glance
                            </div>
                            <div class="simple-chips-row">
                                <div class="simple-chip">
                                    <span class="simple-chip-k">System</span>
                                    <span class="simple-chip-v" id="modalChipSystem">—</span>
                                </div>
                                <div class="simple-chip">
                                    <span class="simple-chip-k">Inverter</span>
                                    <span class="simple-chip-v" id="modalChipInverter">—</span>
                                </div>
                                <div class="simple-chip">
                                    <span class="simple-chip-k">Battery</span>
                                    <span class="simple-chip-v" id="modalChipBattery">—</span>
                                </div>
                                <div class="simple-chip">
                                    <span class="simple-chip-k">Installer</span>
                                    <span class="simple-chip-v" id="modalChipInstaller">—</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer Actions -->
                    <div class="profile-modal-footer">
                        <button type="button" class="btn btn-outline btn-sm" id="modalLogoutBtn" style="color: var(--red); border-color: #fecaca;">
                            Logout
                        </button>
                        <div style="display: flex; gap: 10px;">
                            <button type="button" class="btn btn-outline btn-sm" id="cancelProfileBtn">Close</button>
                            <button type="button" class="btn btn-primary btn-sm" id="saveProfileBtn">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Save Profile
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modalEl);
        }

        const closeBtn = document.getElementById("closeProfileModalBtn");
        const cancelBtn = document.getElementById("cancelProfileBtn");
        const saveBtn = document.getElementById("saveProfileBtn");
        const modalLogoutBtn = document.getElementById("modalLogoutBtn");
        const nameInput = document.getElementById("profileInputName");
        const emailInput = document.getElementById("profileInputEmail");
        const phoneInput = document.getElementById("profileInputPhone");
        const planInput = document.getElementById("profileInputPlan");
        const addressInput = document.getElementById("profileInputAddress");
        const paymentAccountInput = document.getElementById("profilePaymentAccount");
        const paymentAccountLabel = document.getElementById("profilePaymentAccountLabel");
        const modalCustomerName = document.getElementById("modalCustomerName");
        const modalProfileAvatar = document.getElementById("modalProfileAvatar");
        const avatarUploadBadge = document.getElementById("avatarUploadBadge");
        const profileAvatarFileInput = document.getElementById("profileAvatarFileInput");
        const uploadPhotoTextBtn = document.getElementById("uploadPhotoTextBtn");
        const removePhotoBtn = document.getElementById("removePhotoBtn");
        const avatarActionSeparator = document.getElementById("avatarActionSeparator");
        const modalAccountNo = document.getElementById("modalAccountNo");
        const modalAccountCopyBtn = document.getElementById("modalAccountCopyBtn");
        const profileResetPassBtn = document.getElementById("profileResetPassBtn");
        const modalChipSystem = document.getElementById("modalChipSystem");
        const modalChipInverter = document.getElementById("modalChipInverter");
        const modalChipBattery = document.getElementById("modalChipBattery");
        const modalChipInstaller = document.getElementById("modalChipInstaller");

        let currentAvatarUrl = null;

        function updateAvatarDisplay() {
            if (!modalProfileAvatar) return;
            if (currentAvatarUrl) {
                modalProfileAvatar.innerHTML = `<img src="${currentAvatarUrl}" alt="Profile Avatar" class="avatar-img">`;
                if (removePhotoBtn) removePhotoBtn.style.display = "inline-block";
                if (avatarActionSeparator) avatarActionSeparator.style.display = "inline-block";
                if (uploadPhotoTextBtn) uploadPhotoTextBtn.textContent = "Change photo";
            } else {
                const currentName = (nameInput && nameInput.value.trim()) || (getCustomer().name) || "Customer";
                modalProfileAvatar.textContent = getInitials(currentName);
                if (removePhotoBtn) removePhotoBtn.style.display = "none";
                if (avatarActionSeparator) avatarActionSeparator.style.display = "none";
                if (uploadPhotoTextBtn) uploadPhotoTextBtn.textContent = "Upload photo";
            }
        }

        // Real-time name input listener: updates both name heading and avatar initials if no custom photo
        if (nameInput) {
            nameInput.addEventListener("input", () => {
                const val = nameInput.value.trim();
                if (modalCustomerName) {
                    modalCustomerName.textContent = val || "Customer";
                }
                if (!currentAvatarUrl && modalProfileAvatar) {
                    modalProfileAvatar.textContent = getInitials(val);
                }
            });
        }

        // Photo upload handling
        function triggerPhotoPicker() {
            if (profileAvatarFileInput) {
                profileAvatarFileInput.click();
            }
        }

        if (modalProfileAvatar) {
            modalProfileAvatar.addEventListener("click", triggerPhotoPicker);
        }
        if (avatarUploadBadge) {
            avatarUploadBadge.addEventListener("click", (e) => {
                e.stopPropagation();
                triggerPhotoPicker();
            });
        }
        if (uploadPhotoTextBtn) {
            uploadPhotoTextBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                triggerPhotoPicker();
            });
        }

        if (profileAvatarFileInput) {
            profileAvatarFileInput.addEventListener("change", (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;

                if (!file.type.startsWith("image/")) {
                    showToast("Invalid Image", "Please select a valid image file (JPG, PNG, WebP).");
                    profileAvatarFileInput.value = "";
                    return;
                }

                const reader = new FileReader();
                reader.onload = (uploadEvent) => {
                    const img = new Image();
                    img.onload = () => {
                        // Canvas scale down to max 256x256 to conserve storage
                        const canvas = document.createElement("canvas");
                        const maxSize = 256;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > maxSize) {
                                height = Math.round((height * maxSize) / width);
                                width = maxSize;
                            }
                        } else {
                            if (height > maxSize) {
                                width = Math.round((width * maxSize) / height);
                                height = maxSize;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext("2d");
                        ctx.drawImage(img, 0, 0, width, height);

                        currentAvatarUrl = canvas.toDataURL("image/jpeg", 0.88);
                        updateAvatarDisplay();
                        showToast("Photo Preview", "Profile photo loaded! Click 'Save Profile' to apply changes.");
                    };
                    img.src = uploadEvent.target.result;
                };
                reader.readAsDataURL(file);
                profileAvatarFileInput.value = "";
            });
        }

        if (removePhotoBtn) {
            removePhotoBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                currentAvatarUrl = null;
                updateAvatarDisplay();
                showToast("Photo Removed", "Reverted to initials avatar. Click 'Save Profile' to save.");
            });
        }

        // Payment Option Cards Interaction
        const optionCards = modalEl.querySelectorAll(".payment-option-card");
        optionCards.forEach(card => {
            card.addEventListener("click", () => {
                const method = card.dataset.method;
                const radio = card.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;

                optionCards.forEach(c => c.classList.remove("selected"));
                card.classList.add("selected");

                if (paymentAccountLabel) {
                    paymentAccountLabel.textContent = getPaymentLabel(method);
                }
                if (paymentAccountInput) {
                    paymentAccountInput.placeholder = getPaymentPlaceholder(method);
                }
            });
        });

        function openModal() {
            const customer = getCustomer();
            currentAvatarUrl = customer.avatarUrl || null;

            if (nameInput) nameInput.value = customer.name || "";
            if (emailInput) emailInput.value = customer.email || "";
            if (phoneInput) phoneInput.value = customer.phone || "";
            // System chips describe the selected system (shared application record + presentation detail)
            const activePkg = getLinkedPackages().length ? getActivePackage() : null;
            const planLabel = activePkg && activePkg.paymentPlan && typeof activePkg.paymentPlan === "object"
                ? (activePkg.paymentPlan.term || "") : (activePkg && typeof activePkg.paymentPlan === "string" ? activePkg.paymentPlan : "");
            if (planInput) planInput.value = planLabel || (activePkg && activePkg.paymentType === "full_payment" ? "Full Payment" : "");
            if (addressInput) addressInput.value = customer.address || "";
            if (modalCustomerName) modalCustomerName.textContent = customer.name || "Customer";
            if (modalAccountNo) modalAccountNo.textContent = (activePkg && activePkg.hsId) || customer.accountNo || customer.accountId || "—";

            if (modalChipSystem) modalChipSystem.textContent = activePkg && activePkg.capacity ? activePkg.capacity : "—";
            if (modalChipInverter) modalChipInverter.textContent = activePkg && activePkg.inverterModel ? activePkg.inverterModel.replace(" Inverter", "") : "—";
            if (modalChipBattery) modalChipBattery.textContent = activePkg && activePkg.batteryCapacity ? activePkg.batteryCapacity.replace(" Lithium-ion Reserve", " Reserve") : "—";
            if (modalChipInstaller) modalChipInstaller.textContent = activePkg && activePkg.assignedInstaller && activePkg.assignedInstaller.name ? activePkg.assignedInstaller.name : "Not assigned";

            const selectedMethod = (customer.preferredPayment || "gcash").toLowerCase();
            const targetRadio = modalEl.querySelector(`input[name="preferredPayment"][value="${selectedMethod}"]`);
            if (targetRadio) {
                targetRadio.checked = true;
            }

            optionCards.forEach(c => {
                if (c.dataset.method === selectedMethod) {
                    c.classList.add("selected");
                } else {
                    c.classList.remove("selected");
                }
            });

            if (paymentAccountLabel) {
                paymentAccountLabel.textContent = getPaymentLabel(selectedMethod);
            }
            if (paymentAccountInput) {
                paymentAccountInput.value = customer.paymentAccount || customer.phone || "";
                paymentAccountInput.placeholder = getPaymentPlaceholder(selectedMethod);
            }

            updateAvatarDisplay();

            modalEl.classList.add("visible");
            document.body.style.overflow = "hidden";
            if (nameInput) nameInput.focus();
        }

        // Copy Solar Account ID button
        if (modalAccountCopyBtn) {
            modalAccountCopyBtn.addEventListener("click", (e) => {
                e.preventDefault();
                const acc = (modalAccountNo && modalAccountNo.textContent) || "";
                if (!acc || acc === "—") return;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(acc).then(() => {
                        showToast("Account ID Copied", `${acc} copied to your clipboard.`);
                    }).catch(() => {
                        showToast("Solar Account ID", acc);
                    });
                } else {
                    showToast("Solar Account ID", acc);
                }
            });
        }

        // Reset Password Link button
        if (profileResetPassBtn) {
            profileResetPassBtn.addEventListener("click", (e) => {
                e.preventDefault();
                const custEmail = (emailInput && emailInput.value.trim()) || getCustomer().email || "your registered email";
                showToast("Password Reset Link Sent", `Security instructions sent to ${custEmail}. Please check your inbox.`);
            });
        }

        function closeModal() {
            modalEl.classList.remove("visible");
            document.body.style.overflow = "";
        }

        // Attach to all profile triggers across the portal
        const profileTriggers = document.querySelectorAll(".profile, .profile-avatar, #profileAvatar, #profileName");
        profileTriggers.forEach(el => {
            el.setAttribute("title", "Click to open Profile & Settings");
            el.setAttribute("tabindex", "0");
            el.setAttribute("role", "button");
            el.setAttribute("aria-haspopup", "dialog");
            el.addEventListener("click", event => {
                event.preventDefault();
                openModal();
            });
            el.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openModal();
                }
            });
        });

        if (closeBtn) closeBtn.addEventListener("click", closeModal);
        if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

        modalEl.addEventListener("click", event => {
            if (event.target === modalEl) {
                closeModal();
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && modalEl.classList.contains("visible")) {
                closeModal();
            }
        });

        if (modalLogoutBtn) {
            modalLogoutBtn.addEventListener("click", () => {
                closeModal();
                logout();
            });
        }

        // Save Profile Changes
        if (saveBtn) {
            saveBtn.addEventListener("click", () => {
                const currentCustomer = getCustomer();
                const newName = (nameInput && nameInput.value.trim()) || currentCustomer.name;
                const newEmail = (emailInput && emailInput.value.trim()) || currentCustomer.email;
                const newPhone = (phoneInput && phoneInput.value.trim()) || currentCustomer.phone;
                const newAddress = (addressInput && addressInput.value.trim()) || currentCustomer.address;

                const checkedRadio = modalEl.querySelector('input[name="preferredPayment"]:checked');
                const selectedMethod = checkedRadio ? checkedRadio.value : (currentCustomer.preferredPayment || "gcash");
                const newPaymentAccount = (paymentAccountInput && paymentAccountInput.value.trim()) || currentCustomer.paymentAccount || newPhone;

                const updated = {
                    ...currentCustomer,
                    name: newName,
                    email: newEmail,
                    phone: newPhone,
                    address: newAddress,
                    preferredPayment: selectedMethod,
                    paymentAccount: newPaymentAccount,
                    avatarUrl: currentAvatarUrl
                };

                const saved = setCustomer(updated);
                if (!saved.ok) {
                    showToast("Profile Not Saved", saved.error || "Your profile could not be saved. Please try again.");
                    return;
                }
                initUserDisplay();
                updatePaymentsPagePreferred();
                closeModal();

                showToast("Profile Updated", `Saved! Profile details and profile photo updated successfully.`);
            });
        }

        // Update payments page on initial load if present
        updatePaymentsPagePreferred();

        profileModalInstance = { openModal, closeModal };
        return profileModalInstance;
    }

    // --------------------------------------------------------------------------
    // 7. CUSTOMER SYSTEMS (shared application records + presentation detail joined by APP ID)
    // --------------------------------------------------------------------------
    // Dynamic aggregation engine for packages
    function enrichPackageMetrics(pkg) {
        if (!pkg) return pkg;

        // Status and IDs come from the shared application record (see overlaySharedRecord); no local overrides.
        if (!pkg.paymentType) pkg.paymentType = "installment";

        const isOnline = (pkg.status && pkg.status.includes("Online")) || pkg.systemStatus === "Active";
        if (!pkg.projectStatus) {
            pkg.projectStatus = isOnline ? "Active" : (pkg.paymentType === "full_payment" ? "Payment Required" : "Installation In Progress");
        }
        const isActive = pkg.projectStatus === "Active";

        if (!pkg.accountStatus) pkg.accountStatus = "Active";
        if (!pkg.applicationStatus) {
            pkg.applicationStatus = (pkg.paymentType === "full_payment" ? "Approved" : (isActive ? "Approved" : "Financing Approved"));
        }
        if (!pkg.paymentStatus || pkg.paymentStatus === "Financing Approved") {
            pkg.paymentStatus = (pkg.paymentType === "full_payment" ? (isActive ? "Paid" : "Payment Required") : (isActive ? "Paid" : "Up to Date"));
        }
        if (!pkg.installationStatus) {
            pkg.installationStatus = isActive ? "Completed" : (pkg.paymentType === "full_payment" ? "Ready for Installation" : "Installation In Progress");
        }
        if (!pkg.systemStatus) {
            pkg.systemStatus = isActive ? "Active" : "Pending";
        }
        if (!pkg.receiptVerificationStatus) {
            pkg.receiptVerificationStatus = isActive ? "Verified" : (pkg.paymentStatus === "Payment Under Review" ? "Under Review" : "Awaiting Submission");
        }

        // Full Payment enrichment
        if (pkg.paymentType === "full_payment") {
            if (!pkg.payments) pkg.payments = {};
            pkg.payments.paymentType = "full_payment";
            const total = Number(pkg.totalAmount) || 0;
            const peso = n => "₱" + Number(n || 0).toLocaleString("en-PH");
            const paid = pkg.paymentStatus === "Paid";
            pkg.payments.totalAmount = total;
            pkg.payments.formattedTotalAmount = pkg.formattedTotalAmount || peso(total);
            pkg.payments.amountDue = (isActive || paid) ? 0 : (pkg.amountDue !== undefined ? pkg.amountDue : total);
            pkg.payments.formattedAmountDue = (isActive || paid) ? "₱0" : (pkg.formattedAmountDue || peso(pkg.payments.amountDue));
            pkg.payments.receiptVerificationStatus = pkg.receiptVerificationStatus || (isActive ? "Verified" : "Awaiting Submission");
            pkg.payments.term = "Full Upfront Payment";
            pkg.payments.termBadge = "Full Payment";
            pkg.payments.standing = pkg.paymentStatus || (isActive ? "Paid" : "Payment Required");
            pkg.payments.standingMeta = isActive ? "Payment completed and verified" : "Awaiting initial upfront payment or deposit receipt";
            pkg.payments.currentBillRef = `${pkg.accountNo}-FP`;
            pkg.payments.nextPaymentAmount = pkg.payments.formattedAmountDue;
            pkg.payments.nextDueDate = (isActive || pkg.paymentStatus === "Paid") ? "Paid in Full" : (pkg.nextDueDate || "—");
            pkg.payments.status = pkg.payments.standing;
            pkg.payments.statusBadgeClass = isActive ? "badge-paid" : (pkg.paymentStatus === "Payment Under Review" ? "badge-upcoming" : "badge-due");
            pkg.payments.statusBadgeText = pkg.payments.standing;
        }

        // Support contact resolution
        if (!pkg.assignedInstaller && pkg.install && pkg.install.assignedTeam) {
            pkg.assignedInstaller = { ...pkg.install.assignedTeam };
        }
        if (pkg.assignedInstaller) {
            if (!pkg.support) pkg.support = {};
            pkg.support.leadTechnician = pkg.assignedInstaller.name;
            pkg.support.leadRole = pkg.assignedInstaller.role || "Certified Solar Master Installer";
            pkg.support.leadPhone = pkg.assignedInstaller.phone;
            pkg.support.leadContact = `${pkg.assignedInstaller.phone} (${pkg.assignedInstaller.name})`;
        } else {
            if (!pkg.support) pkg.support = {};
            pkg.support.leadTechnician = "Hello Solar Central Dispatch";
            pkg.support.leadRole = "Hello Solar Support / Super Admin";
            pkg.support.leadPhone = "+63 2 8888 0100";
            pkg.support.leadContact = "+63 2 8888 0100 (Central Dispatch)";
        }

        // 1. Dynamic payments calculations (for Installment)
        if (pkg.paymentType !== "full_payment" && pkg.payments && Array.isArray(pkg.payments.schedule)) {
            let totalPaidSum = 0;
            let paidCount = 0;
            let unpaidItem = null;
            let upcomingItem = null;

            pkg.payments.schedule.forEach(item => {
                item.due = item.due ?? item.dueDate ?? "—";
                item.amount = item.formattedAmount ?? item.amount;
                const num = parseFloat(String(item.amount ?? "").replace(/[^0-9.]/g, "")) || 0;
                const st = (item.status || "").toLowerCase();
                // A rejected receipt (Re-upload Required) makes a bill overdue only once its due date has passed
                const reupload = st === "re-upload required";
                if (st === "paid") {
                    totalPaidSum += num;
                    paidCount++;
                } else if (!unpaidItem && (st === "unpaid" || st === "overdue" || (reupload && isBillPastDue(item)))) {
                    unpaidItem = item;
                } else if (!upcomingItem && (st === "upcoming" || st === "due soon" || st === "due" || reupload)) {
                    upcomingItem = item;
                }
            });

            const plan = (pkg.paymentPlan && typeof pkg.paymentPlan === "object")
                ? pkg.paymentPlan
                : ((pkg.payments && pkg.payments.paymentPlan && typeof pkg.payments.paymentPlan === "object") ? pkg.payments.paymentPlan : null);

            let totalInstallmentsCount = (plan && plan.totalInstallments) || (pkg.payments && pkg.payments.totalInstallments) || pkg.totalInstallments;
            if (!totalInstallmentsCount) {
                const rawTerm = (plan && plan.term) || (typeof pkg.paymentPlan === "string" ? pkg.paymentPlan : "") || (pkg.payments && (pkg.payments.term || pkg.payments.planTerm)) || "";
                const termMatch = typeof rawTerm === "string" ? rawTerm.match(/(\d+)[-\s]*year/i) : null;
                totalInstallmentsCount = termMatch ? parseInt(termMatch[1], 10) * 12 : 60;
            }
            // Payments Completed must count only Paid records
            pkg.payments.paidInstallments = `${paidCount} of ${totalInstallmentsCount}`;
            pkg.paymentsCompleted = `${paidCount} of ${totalInstallmentsCount}`;
            // Total Paid must be calculated only from Paid records
            const formattedTotalPaid = "₱" + totalPaidSum.toLocaleString("en-PH", {
                minimumFractionDigits: totalPaidSum % 1 !== 0 ? 2 : 0,
                maximumFractionDigits: 2
            });
            pkg.payments.totalPaid = formattedTotalPaid;
            pkg.totalPaid = formattedTotalPaid;

            if (plan) {
                pkg.paymentPlan = plan;
                if (plan.downPayment !== undefined) {
                    pkg.downPayment = plan.downPayment;
                    pkg.formattedDownPayment = plan.formattedDownPayment || `₱${plan.downPayment.toLocaleString("en-PH")}`;
                }
                if (plan.monthlyInstallment !== undefined) {
                    pkg.monthlyPayment = plan.monthlyInstallment;
                    pkg.formattedMonthlyPayment = plan.formattedMonthlyPayment || `₱${plan.monthlyInstallment.toLocaleString("en-PH", { minimumFractionDigits: plan.monthlyInstallment % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}`;
                }
            }

            // A previously overdue account is up to date once every past-due bill is settled (verified receipts)
            if (!unpaidItem && pkg.paymentStatus === "Overdue") {
                pkg.paymentStatus = "Up to Date";
                if (pkg.payments.standing === "Overdue") pkg.payments.standing = "Up to Date";
                pkg.payments.hasUnpaid = false;
            }

            if (unpaidItem) {
                pkg.paymentStatus = "Overdue";
                pkg.payments.standing = "Overdue";
                pkg.payments.status = "Overdue";
                pkg.payments.hasUnpaid = true;
                pkg.payments.missedPeriod = unpaidItem.period;
                pkg.payments.unpaidAmount = unpaidItem.formattedAmount || `₱${unpaidItem.amount}`;
                pkg.payments.nextPaymentAmount = unpaidItem.formattedAmount || `₱${unpaidItem.amount}`;
                pkg.payments.nextDueDate = unpaidItem.due;
                pkg.payments.currentDueDate = unpaidItem.due;
                pkg.payments.currentBillPeriod = unpaidItem.period;
                pkg.payments.statusBadgeClass = "badge-overdue";
                pkg.payments.statusBadgeText = "Overdue";
            } else if (upcomingItem) {
                const planMonthly = plan ? (plan.formattedMonthlyPayment || plan.formattedMonthlyInstallment) : null;
                pkg.payments.nextPaymentAmount = planMonthly || upcomingItem.amount || pkg.formattedMonthlyPayment;
                pkg.payments.nextDueDate = upcomingItem.due;
                pkg.payments.currentDueDate = upcomingItem.due;
                pkg.payments.status = upcomingItem.status;
                pkg.payments.currentBillPeriod = upcomingItem.period;
                pkg.payments.statusBadgeClass = "badge-upcoming";
                pkg.payments.statusBadgeText = upcomingItem.status === "Re-upload Required" ? "Re-upload Required" : "Upcoming";
            } else if (paidCount === pkg.payments.schedule.length && paidCount > 0) {
                pkg.payments.status = "Paid";
                pkg.payments.statusBadgeClass = "badge-paid";
                pkg.payments.statusBadgeText = "Paid";
                pkg.payments.nextPaymentAmount = "₱0";
                pkg.payments.nextDueDate = "None Due";
            }
        }

        // 2. Dynamic install milestone progression
        // Shared installer progress (overlaySharedRecord) is authoritative; only legacy milestone lists are counted
        if (pkg.install && !pkg.install.sharedProgress && Array.isArray(pkg.install.milestones) && pkg.install.milestones.length > 0) {
            const total = pkg.install.milestones.length;
            const completed = pkg.install.milestones.filter(m => m.status === "Completed").length;
            pkg.install.completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
            pkg.install.milestonesAchieved = `${completed} of ${total} milestones achieved`;
        }

        // 3. Technical Solar & Battery accuracy
        if (pkg.hasBattery === false) {
            if (pkg.energy) {
                pkg.energy.batteryReserve = "Battery not included";
                pkg.energy.batterySoc = null;
                pkg.energy.backupHours = "Not supported";
            }
            if (pkg.telemetry) {
                pkg.telemetry.batterySoc = null;
                pkg.telemetry.baseBattery = 0;
                pkg.telemetry.backupReady = false;
                pkg.telemetry.backupStatusText = "Battery not included";
            }
        }

        return pkg;
    }

    let activePackagesStore = [];
    let detailPackages = [];
    let cachedFaqs = [];

    const SHARED_INSTALL_LABEL = {
        AWAITING_INSTALLATION: "Awaiting Installation",
        INSTALLATION_IN_PROGRESS: "Installation In Progress",
        COMPLETED: "Completed"
    };

    // Read-only milestone view of the installer's progress percentage (installer / Direct Engineer own progress)
    const INSTALL_MILESTONES = [
        { num: "1", title: "1. Site Assessment & Engineering Survey", desc: "Structural audit and solar panel mounting geometry inspection.", at: 1 },
        { num: "2", title: "2. Solar PV Panels Installed", desc: "Monocrystalline solar PV modules mounted and wired.", at: 25 },
        { num: "3", title: "3. Inverter & Storage Setup", desc: "Hybrid inverter, electrical safety disconnects, and conduit setup.", at: 50 },
        { num: "4", title: "4. Utility Grid Connection (Net Metering)", desc: "Distribution utility bi-directional meter testing and grid connection.", at: 75 },
        { num: "5", title: "5. Final Safety Commissioning & Handover", desc: "Electrical engineering sign-off, live energization, and customer handover.", at: 100 }
    ];

    function isSharedActive(app) {
        return String(app.systemStatus || "").toUpperCase() === "ACTIVE" || String(app.applicationStatus || "").toUpperCase() === "ACTIVE";
    }

    // Customer-facing project status derived from the shared record (Super Admin / Financer / Installer own it)
    function sharedProjectStatus(app) {
        const S = window.HSShared;
        const inst = String(app.installationStatus || "").toUpperCase();
        if (isSharedActive(app)) return "Active";
        if (inst === "INSTALLATION_IN_PROGRESS" || inst === "COMPLETED") return "Installation In Progress";
        if (inst === "AWAITING_INSTALLATION") return "Awaiting Installation";
        const stage = String(app.stage || "");
        if (S.isFullPayment(app)) {
            if (S.isClearedForInstallation(app)) return "Ready for Installation";
            if (app.paymentStatus === "Verification Required" || app.receiptVerificationStatus === "Pending Verification") return "Payment Under Review";
            return "Payment Required";
        }
        if (stage === "Declined") return "Financing Declined";
        if (stage === "Missing Documents") return "Documents Required / Under Review";
        if (stage === "Financing Review" || stage === "Under Review" || stage === "Submitted") return "Financing Review";
        if (stage === "Ready for Installation") return "Ready for Installation";
        return "Financing Approved";
    }

    function sharedReceiptStatus(app) {
        const v = String(app.receiptVerificationStatus || "");
        if (v === "Pending Verification") return "Under Review";
        if (v === "Verified" || v === "Rejected") return v;
        return "";
    }

    // Applies the shared application record onto a package (shared values always win over presentation data)
    function overlaySharedRecord(pkg, app) {
        const S = window.HSShared;
        const full = S.isFullPayment(app);
        const active = isSharedActive(app);
        const inst = String(app.installationStatus || "").toUpperCase();
        pkg.appId = app.id;
        pkg.hsId = app.hsId || "";
        pkg.accountNo = app.hsId || "";
        pkg.customerId = app.customerId || null;
        pkg.paymentType = full ? "full_payment" : "installment";
        pkg.projectStatus = sharedProjectStatus(app);
        pkg.applicationStatus = app.stage || pkg.applicationStatus;
        pkg.systemStatus = active ? "Active" : "Pending";
        pkg.installationStatus = active ? "Completed" : (SHARED_INSTALL_LABEL[inst] || (S.isClearedForInstallation(app) ? "Ready for Installation" : "Pending"));
        pkg.installerAcceptanceStatus = (app.assignedInstallerId && (app.dispatchStatus === "Accepted" || inst)) ? "accepted" : "pending";
        if (!active && /online/i.test(String(pkg.status || ""))) pkg.status = "Setup Pending";
        if (active && !/online/i.test(String(pkg.status || ""))) pkg.status = "Online · Normal";
        if (full) {
            const paid = ["Verified / Paid", "Verified", "Paid", "Completed"].includes(app.paymentStatus);
            pkg.paymentStatus = paid ? "Paid" : (app.paymentStatus === "Verification Required" ? "Payment Under Review" : "Payment Required");
            pkg.totalAmount = Number(app.amount) || pkg.totalAmount;
        }
        const receipt = sharedReceiptStatus(app);
        if (receipt) pkg.receiptVerificationStatus = receipt;
        pkg.receiptSubmissions = Array.isArray(app.receiptSubmissions) ? app.receiptSubmissions : [];
        if (!full) {
            // The shared APP schedule is the only source of billing periods, due dates, installment status and
            // payment history (portal demo bill rows are not used for systems with a shared record).
            // Installment billing starts once financing is approved.
            const financed = S.isClearedForInstallation(app) || active || !!app.installationStatus;
            if (!pkg.payments) pkg.payments = {};
            pkg.payments.schedule = financed ? sharedScheduleRows(app) : [];
            pkg.payments.hasBills = pkg.payments.schedule.length > 0;
            pkg.payments.paymentType = "installment";
            const nextBill = pkg.payments.schedule.find(row => row.status !== "Paid");
            pkg.nextDueDate = nextBill ? nextBill.due : "";
            const schedule = financed ? S.paymentScheduleFor(app.id) : null;
            if (schedule && Array.isArray(schedule.installments) && schedule.installments.length) {
                pkg.totalInstallments = schedule.installments.length;
                pkg.payments.totalInstallments = schedule.installments.length;
                if (pkg.paymentPlan && typeof pkg.paymentPlan === "object") pkg.paymentPlan.totalInstallments = schedule.installments.length;
            }
            applySharedBillResults(pkg, app);
        }
        if (Array.isArray(app.receiptForBills)) pkg.receiptForBills = app.receiptForBills;
        if (app.rejectionReason && app.receiptVerificationStatus === "Rejected") pkg.receiptRejectionReason = app.rejectionReason;
        // Installer of record (presentation detail may name the lead technician)
        if (!app.assignedInstallerId || app.installer === "Unassigned") {
            pkg.assignedInstaller = null;
            if (pkg.install) pkg.install.assignedTeam = null;
        } else if (!pkg.assignedInstaller) {
            const isDirect = S.isDirect(app);
            const partner = isDirect ? null : S.getAccount("installer", app.assignedInstallerId);
            pkg.assignedInstaller = {
                name: isDirect ? (app.assignedEngineer || app.installer || "Hello Solar Internal Team") : (app.installer || (partner && partner.name) || ""),
                role: isDirect ? "Hello Solar Direct Installation" : "Partner Installer",
                phone: (partner && partner.phone) || ""
            };
        }
        // Installation progress is owned by the installer / Direct Engineer — read-only here
        const progressPct = active ? 100 : (Number.isFinite(Number(app.progress)) ? Number(app.progress) : 0);
        pkg.installationProgress = app.installationProgress || null;
        pkg.installProgressPct = progressPct;
        if (!pkg.install) pkg.install = { hasInstallation: true, milestones: [] };
        const recordedOn = app.installationProgress && app.installationProgress.updatedAt
            ? new Date(app.installationProgress.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : (app.activatedAt ? new Date(app.activatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "installer record");
        let current = false;
        pkg.install.milestones = INSTALL_MILESTONES.map(step => {
            const done = progressPct >= step.at;
            const inProgress = !done && !current && !!inst && inst !== "AWAITING_INSTALLATION";
            if (inProgress) current = true;
            return {
                num: step.num,
                title: step.title,
                desc: step.desc,
                status: done ? "Completed" : (inProgress ? "In Progress" : "Pending"),
                badgeClass: done ? "badge-paid" : (inProgress ? "badge-upcoming" : "badge-neutral"),
                date: done ? recordedOn : "To be scheduled by your installer"
            };
        });
        const doneCount = pkg.install.milestones.filter(m => m.status === "Completed").length;
        pkg.install.milestonesAchieved = `${doneCount} of ${INSTALL_MILESTONES.length} milestones achieved`;
        pkg.install.completionPct = progressPct;
        pkg.install.sharedProgress = true;
        pkg.install.phase = active ? "Completed" : (inst ? "In Progress" : "Not Started");
        pkg.install.phaseStatusText = active ? "Commissioned" : (pkg.installationStatus || "Pending");
        pkg.install.nextMilestone = active ? "Routine Maintenance" : (inst === "COMPLETED" ? "System Activation" : "Installation");
        if (!pkg.install.assignedTeam && pkg.assignedInstaller) pkg.install.assignedTeam = { ...pkg.assignedInstaller, initials: "" };
        return pkg;
    }

    // Installment billing rows reflect Super Admin's receipt decisions on the shared record:
    // verified → Paid, awaiting review → Pending Verification, rejected → Re-upload Required.
    function applySharedBillResults(pkg, app) {
        const rows = pkg.payments && Array.isArray(pkg.payments.schedule) ? pkg.payments.schedule : null;
        if (!rows) return;
        const results = app.billStatus || {};
        const pending = new Set((app.receiptSubmissions || [])
            .filter(s => s.status === "Pending Verification")
            .flatMap(s => (s.bills || []).map(b => b.billId))
            .filter(Boolean));
        rows.forEach(row => {
            const result = results[row.id];
            if (result && result.status === "Paid") {
                row.status = "Paid";
                row.badgeClass = "badge-paid";
            } else if (pending.has(row.id)) {
                row.status = "Pending Verification";
                row.badgeClass = "badge-upcoming";
            } else if (result && result.status === "Re-upload Required") {
                row.status = "Re-upload Required";
                row.badgeClass = isBillPastDue(row) ? "badge-overdue" : "badge-due";
                row.rejectionReason = result.reason || "";
            }
        });
        const latest = (app.receiptSubmissions || [])[0];
        if (latest) {
            pkg.receiptVerificationStatus = latest.status === "Pending Verification" ? "Under Review"
                : (latest.status === "Verified" ? "Verified" : "Rejected");
        }
    }

    // Billing rows from the shared APP installment schedule: past and paid installments plus the next one due.
    // Row IDs are the schedule installment IDs (APP-####-I#) so receipts match installments exactly.
    function sharedScheduleRows(app) {
        const schedule = window.HSShared.paymentScheduleFor(app.id);
        const installments = schedule && Array.isArray(schedule.installments) ? schedule.installments : [];
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const peso = n => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 });
        const label = iso => {
            const d = new Date(String(iso) + "T00:00:00");
            return isNaN(d) ? { period: "", due: String(iso) } : {
                period: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
                due: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            };
        };
        const rows = [];
        let nextAdded = false;
        installments.forEach(i => {
            // Past due = after the due date; a bill due today is still "Due", not overdue
            const past = String(i.dueDate) < today;
            if (!(i.status === "Paid" || past || !nextAdded)) return;
            if (!past && i.status !== "Paid") nextAdded = true;
            const status = i.status === "Paid" ? "Paid"
                : (i.status === "Overdue" ? "Overdue"
                    : (i.status === "Re-upload Required" ? "Re-upload Required"
                        : (past ? "Unpaid" : (String(i.dueDate) === today ? "Due" : "Upcoming"))));
            const l = label(i.dueDate);
            rows.push({
                id: `${app.id}-I${i.no}`,
                installmentNo: i.no,
                period: l.period,
                due: l.due,
                dueDate: i.dueDate,
                status,
                badgeClass: status === "Paid" ? "badge-paid" : (status === "Upcoming" ? "badge-upcoming" : ((status === "Due" || (status === "Re-upload Required" && !past)) ? "badge-due" : "badge-overdue")),
                amount: peso(i.amount),
                formattedAmount: peso(i.amount),
                paidDate: i.paidDate || null,
                receiptId: i.status === "Paid" ? (i.reference || "") : null
            });
        });
        return rows;
    }

    // Minimal package for an application that has no presentation detail (built only from the shared record)
    function packageFromApplication(app) {
        const loader = window.HelloSolarDataLoader;
        const full = window.HSShared.isFullPayment(app);
        const system = {
            id: app.id,
            appId: app.id,
            hsId: app.hsId,
            accountNo: app.hsId,
            name: app.purchasedModel || (app.system ? `${app.system} Solar System` : app.id),
            shortLabel: app.system || "",
            capacity: app.system || "",
            location: app.location || "",
            paymentType: full ? "full_payment" : "installment",
            hasBattery: false,
            panelsModel: app.panels || "",
            inverterModel: app.inverter || "",
            batteryCapacity: "",
            inverterSerial: "",
            totalAmount: Number(app.amount) || 0,
            monthlyPayment: Number(app.monthly) || 0,
            downPayment: Number(app.downPayment) || 0,
            termMonths: Number(app.termMonths) || null,
            nextDueDate: app.nextDue && app.nextDue !== "N/A" ? app.nextDue : "",
            assignedInstaller: null
        };
        // Installment billing rows come from the shared APP schedule (overlaySharedRecord)
        return loader && typeof loader.assemblePackage === "function" ? loader.assemblePackage(system) : system;
    }

    // Systems of the signed-in customer = shared applications with customerId === this account
    function buildCustomerPackages() {
        const user = getSessionUser();
        if (!user || !window.HSShared) return [];
        return window.HSShared.applicationsForCustomer(user.accountId).map(app => {
            const detail = detailPackages.find(p => p.appId === app.id);
            const pkg = detail ? JSON.parse(JSON.stringify(detail)) : packageFromApplication(app);
            return enrichPackageMetrics(overlaySharedRecord(pkg, app));
        });
    }

    // Re-reads the shared records (after a submission or another portal's update) and notifies the page
    function refreshSharedPackages() {
        activePackagesStore = buildCustomerPackages();
        window.dispatchEvent(new CustomEvent("helloSolarDataLoaded", { detail: { packages: activePackagesStore, faqs: cachedFaqs } }));
        const active = getActivePackage();
        if (active) {
            window.dispatchEvent(new CustomEvent("helloSolarPackageChanged", { detail: { packageId: active.id, package: active } }));
        }
        return activePackagesStore;
    }

    // Loads presentation detail (telemetry, savings, schedules) and builds the customer's systems from shared records
    async function loadCustomerDatasetAsync() {
        let loaded = null;
        if (window.HelloSolarDataLoader && typeof window.HelloSolarDataLoader.loadAll === "function") {
            try {
                loaded = await window.HelloSolarDataLoader.loadAll();
            } catch (e) {
                console.warn("[Portal] DataLoader.loadAll error:", e);
            }
        }
        detailPackages = (loaded && Array.isArray(loaded.packages)) ? loaded.packages : [];
        if (loaded && Array.isArray(loaded.faqs)) cachedFaqs = loaded.faqs;
        activePackagesStore = buildCustomerPackages();
        window.dispatchEvent(new CustomEvent("helloSolarDataLoaded", { detail: { packages: activePackagesStore, faqs: cachedFaqs } }));
        return { packages: activePackagesStore, faqs: cachedFaqs };
    }

    // --------------------------------------------------------------------------
    // 7A. PROJECT STATUS & LIFECYCLE FLOW DEFINITIONS
    // --------------------------------------------------------------------------
    const FULL_PAYMENT_FLOW = [
        { key: "Payment Required", label: "Payment Required", desc: "Order confirmed. Awaiting full payment proof upload.", step: 1 },
        { key: "Payment Under Review", label: "Payment Under Review", desc: "Payment receipt submitted. Finance verification in progress.", step: 2 },
        { key: "Ready for Installation", label: "Ready for Installation", desc: "Payment verified. Equipment allocated and installation queued.", step: 3 },
        { key: "Awaiting Installation", label: "Awaiting Installation", desc: "Installer assigned. Site installation schedule confirmed.", step: 4 },
        { key: "Installation In Progress", label: "Installation In Progress", desc: "Solar PV panels, inverter mounting, and wiring on-site.", step: 5 },
        { key: "Active", label: "Active", desc: "System energized, utility grid connected, and live telemetry active.", step: 6 }
    ];

    const INSTALLMENT_FLOW = [
        { key: "Financing Review", label: "Financing Review", desc: "Credit assessment and loan terms under financer review.", step: 1 },
        { key: "Documents Required / Under Review", label: "Documents Required / Under Review", desc: "Required documentation submitted and undergoing review.", step: 2 },
        { key: "Financing Approved", label: "Financing Approved", desc: "Amortization schedule approved and financing agreement cleared.", step: 3 },
        { key: "Ready for Installation", label: "Ready for Installation", desc: "Financing cleared. Equipment dispatched to installation team.", step: 4 },
        { key: "Awaiting Installation", label: "Awaiting Installation", desc: "Installer assigned. On-site engineering team scheduled.", step: 5 },
        { key: "Installation In Progress", label: "Installation In Progress", desc: "Solar modules mounted, inverter wired, and safety audit in progress.", step: 6 },
        { key: "Active", label: "Active", desc: "System energized, utility grid connected, and live telemetry active.", step: 7 }
    ];

    function isSystemActive(pkg) {
        if (!pkg) return false;
        return pkg.projectStatus === "Active" || pkg.systemStatus === "Active";
    }

    function getProjectStatus(pkg) {
        if (!pkg) return "Active";
        if (pkg.projectStatus) return pkg.projectStatus;
        if (isSystemActive(pkg)) return "Active";
        return pkg.paymentType === "full_payment" ? "Payment Required" : "Installation In Progress";
    }

    function getFlowMilestones(pkg) {
        const type = (pkg && pkg.paymentType) || "installment";
        return type === "full_payment" ? FULL_PAYMENT_FLOW : INSTALLMENT_FLOW;
    }

    // Delayed Payment Reminder state for an INSTALLMENT package, derived from its payment schedule and
    // receipt status (no stored copies). Returns null when no reminder applies (full payment, nothing past due,
    // or the covering receipt has been verified).
    //  - Past due + unpaid               → state "overdue"
    //  - Receipt submitted for it        → state "under_review"
    //  - Verified / Paid                 → null (reminder removed)
    // True once a bill's due date is before today (a bill due today is not yet past due)
    function isBillPastDue(row, asOf) {
        const d = asOf ? new Date(asOf) : new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const raw = String((row && (row.dueDate || row.due)) || "");
        let iso = /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : null;
        if (!iso) {
            const parsed = new Date(raw);
            if (isNaN(parsed)) return false;
            iso = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
        }
        return iso < today;
    }

    function getDelayedPaymentReminder(pkg, asOf) {
        if (!pkg || pkg.paymentType === "full_payment") return null;
        const schedule = (pkg.payments && Array.isArray(pkg.payments.schedule)) ? pkg.payments.schedule : [];
        if (!schedule.length) return null;

        const d = asOf ? new Date(asOf) : new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const isoOf = (row) => {
            const raw = String(row.dueDate || row.due || "");
            if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
            const parsed = new Date(raw);
            return isNaN(parsed) ? null : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
        };
        const statusOf = (row) => String(row.status || "").toLowerCase();
        const isPaid = (row) => { const s = statusOf(row); return (s === "paid" || s.startsWith("paid") || s === "verified") && !s.includes("unpaid"); };
        const amountOf = (row) => typeof row.amount === "number" ? row.amount
            : (parseFloat(String(row.formattedAmount ?? row.amount ?? "").replace(/[^0-9.]/g, "")) || 0);

        // Bills covered by a submitted receipt (recorded on submission as receiptForBills)
        const coveredIds = Array.isArray(pkg.receiptForBills) ? pkg.receiptForBills : [];
        const verification = String(pkg.receiptVerificationStatus || "");

        let pastDue = schedule.filter(row => {
            if (isPaid(row)) return false;
            const s = statusOf(row);
            const iso = isoOf(row);
            return s.includes("unpaid") || s.includes("overdue") || (iso && iso < today);
        });
        // Verified receipt → the bills it covered are settled
        if (verification === "Verified" && coveredIds.length) {
            pastDue = pastDue.filter(row => !coveredIds.includes(row.id));
        }
        if (!pastDue.length) return null;

        pastDue.sort((a, b) => String(isoOf(a)).localeCompare(String(isoOf(b))));
        const total = pastDue.reduce((sum, row) => sum + amountOf(row), 0);
        const pendingRow = row => /review|submitted|pending verification/.test(statusOf(row));
        // Shared schedule rows carry their own receipt status: under review only while every past-due bill has a
        // receipt awaiting verification
        const sharedRows = pastDue.every(row => /^APP-\d+-I\d+$/.test(String(row.id || "")));
        const underReview = sharedRows
            ? pastDue.every(pendingRow)
            : (verification === "Under Review" || pkg.paymentStatus === "Payment Under Review" || pastDue.some(pendingRow));

        return {
            state: underReview ? "under_review" : "overdue",
            packageId: pkg.id,
            packageName: pkg.name,
            accountNo: pkg.accountNo,
            bills: pastDue,
            billIds: pastDue.map(row => row.id).filter(Boolean),
            missedPeriods: pastDue.map(row => row.period).filter(Boolean),
            dueDate: isoOf(pastDue[0]),
            overdueAmount: total,
            formattedOverdueAmount: "₱" + total.toLocaleString("en-PH", { minimumFractionDigits: total % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })
        };
    }

    function getLinkedPackages() {
        return activePackagesStore;
    }

    function getFaqs() {
        return cachedFaqs;
    }

    // Genuinely user-scoped storage key
    function getCustomerIdentifier() {
        const customer = getCustomer();
        return customer.accountId || "signed_out";
    }

    function getActivePackageStorageKey() {
        return `hello_solar_active_package_id:${getCustomerIdentifier()}`;
    }

    function getActivePackageId() {
        const key = getActivePackageStorageKey();
        const stored = localStorage.getItem(key);
        const pkgs = getLinkedPackages();
        if (stored && pkgs.some(p => p.id === stored)) {
            return stored;
        }
        // Fallback to first available package
        return pkgs.length > 0 ? pkgs[0].id : "";
    }

    function setActivePackageId(id) {
        const pkgs = getLinkedPackages();
        if (pkgs.some(p => p.id === id)) {
            const key = getActivePackageStorageKey();
            localStorage.setItem(key, id);
            // Also maintain legacy fallback for backwards compatibility
            localStorage.setItem("hello_solar_active_package_id", id);

            const selectedPkg = getActivePackage();
            window.dispatchEvent(new CustomEvent("helloSolarPackageChanged", {
                detail: { packageId: id, package: selectedPkg }
            }));
            return true;
        }
        return false;
    }

    function getActivePackage() {
        const id = getActivePackageId();
        const pkgs = getLinkedPackages();
        return pkgs.find(p => p.id === id) || pkgs[0] || null;
    }

    // --------------------------------------------------------------------------
    // 7B. UNFINISHED INPUT DRAFT & DIRTY CHECK PROTECTION
    // --------------------------------------------------------------------------
    let formDirtyCheckFn = null;

    function registerDirtyCheck(fn) {
        formDirtyCheckFn = fn;
    }

    function unregisterDirtyCheck() {
        formDirtyCheckFn = null;
    }

    function requestPackageSwitch(targetPackageId, onConfirmed) {
        if (targetPackageId === getActivePackageId()) return;

        if (typeof formDirtyCheckFn === "function") {
            const reason = formDirtyCheckFn();
            if (reason) {
                const proceed = window.confirm(
                    `You have unsaved changes (${reason}). Switching to another solar system will discard your draft for this system.\n\nDo you want to continue?`
                );
                if (!proceed) return;
            }
        }

        const success = setActivePackageId(targetPackageId);
        if (success && typeof onConfirmed === "function") {
            onConfirmed(getActivePackage());
        }
    }

    // --------------------------------------------------------------------------
    // 7C. SHARED REUSABLE PACKAGE SELECTOR COMPONENT
    // Automatically renders button, dropdown, keyboard controls, and checkmarks
    // --------------------------------------------------------------------------
    function renderPackageSelectorComponent(container, options = {}) {
        if (!container) return;

        const currentPkg = getActivePackage();
        const packages = getLinkedPackages();

        container.innerHTML = `
            <div class="package-selector" id="packageSelector">
                <button type="button" class="package-selector-btn" id="packageSelectorBtn"
                    aria-haspopup="listbox" aria-expanded="false" aria-controls="packageDropdownMenu">
                    <span class="package-btn-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m3 10 9-7 9 7M5 9v11h14V9M9 20v-7h6v7"/>
                        </svg>
                    </span>
                    <span class="package-btn-content">
                        <span class="package-btn-label">System</span>
                        <span class="package-btn-name" id="selectedPackageName"></span>
                    </span>
                    <svg class="package-dropdown-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="m6 9 6 6 6-6"/>
                    </svg>
                </button>
                <div class="package-dropdown-menu" id="packageDropdownMenu" role="listbox" aria-label="Available solar packages" tabindex="-1">
                    <div class="package-dropdown-header">
                        <span>Linked Solar Systems</span>
                    </div>
                    <div class="package-items-list" id="packageItemsList" role="presentation">
                    </div>
                    <div class="package-dropdown-footer">
                        <button type="button" class="package-add-account-btn" id="openAddAccountBtn" aria-label="Link Existing System">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                            </svg>
                            <span>Link Existing System</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        const btn = container.querySelector("#packageSelectorBtn");
        const menu = container.querySelector("#packageDropdownMenu");
        const list = container.querySelector("#packageItemsList");
        const addBtn = container.querySelector("#openAddAccountBtn");
        container.querySelector("#selectedPackageName").textContent = currentPkg
            ? (currentPkg.shortLabel || currentPkg.name) : "Select system";

        function renderItems() {
            if (!list) return;
            list.innerHTML = "";
            const activeId = getActivePackageId();

            packages.forEach(pkg => {
                const item = document.createElement("div");
                const isSelected = pkg.id === activeId;
                item.className = "package-item" + (isSelected ? " selected" : "");
                item.setAttribute("role", "option");
                item.setAttribute("aria-selected", isSelected ? "true" : "false");
                item.setAttribute("tabindex", "0");
                item.setAttribute("data-package-id", pkg.id);

                item.innerHTML = `
                    <div class="package-item-main">
                        <div class="package-item-top">
                            <span class="package-item-title">${pkg.name}</span>
                            <span class="package-item-capacity">${pkg.capacity}</span>
                        </div>
                        <div class="package-item-meta" style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 4px;">
                            <span class="package-item-location" style="font-weight: 600;">${pkg.appId || 'APP'} · ${pkg.accountNo || 'HS-ID'}</span>
                            <span style="font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 4px; background: ${pkg.paymentType === 'full_payment' ? '#f0fdf4; color: #166534; border: 1px solid #bbf7d0;' : '#eff6ff; color: #1e40af; border: 1px solid #bfdbfe;'}">${pkg.paymentType === 'full_payment' ? 'Full Payment' : 'Installment'}</span>
                            <span style="font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 4px; background: ${pkg.projectStatus === 'Active' ? '#ecfdf5; color: #047857; border: 1px solid #a7f3d0;' : '#fff7ed; color: #c2410c; border: 1px solid #fed7aa;'}">${pkg.projectStatus || 'In Progress'}</span>
                        </div>
                    </div>
                    <div class="package-item-check" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                `;

                function selectThis() {
                    requestPackageSwitch(pkg.id, (switchedPkg) => {
                        close();
                        const labelEl = container.querySelector("#selectedPackageName");
                        if (labelEl) labelEl.textContent = switchedPkg.shortLabel || switchedPkg.name;
                        renderItems();

                        showToast(
                            "Package Switched",
                            `Viewing ${switchedPkg.name} (${switchedPkg.capacity}) · ${switchedPkg.location.split('·')[0].trim()}`
                        );

                        if (typeof options.onPackageChanged === "function") {
                            options.onPackageChanged(switchedPkg);
                        }
                    });
                }

                item.addEventListener("click", (e) => {
                    e.stopPropagation();
                    selectThis();
                });

                item.addEventListener("keydown", (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectThis();
                    } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        const next = item.nextElementSibling;
                        if (next && next.classList.contains("package-item")) next.focus();
                    } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        const prev = item.previousElementSibling;
                        if (prev && prev.classList.contains("package-item")) prev.focus();
                        else if (btn) btn.focus();
                    } else if (e.key === "Escape") {
                        close();
                        if (btn) btn.focus();
                    }
                });

                list.appendChild(item);
            });
        }

        function open() {
            menu.classList.add("open");
            btn.setAttribute("aria-expanded", "true");
            renderItems();
            const selectedItem = menu.querySelector(".package-item.selected") || menu.querySelector(".package-item");
            if (selectedItem) setTimeout(() => selectedItem.focus(), 50);
        }

        function close() {
            menu.classList.remove("open");
            btn.setAttribute("aria-expanded", "false");
        }

        function toggle() {
            if (menu.classList.contains("open")) close();
            else open();
        }

        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggle();
        });

        btn.addEventListener("keydown", (e) => {
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                open();
            } else if (e.key === "Escape") {
                close();
            }
        });

        document.addEventListener("click", (e) => {
            if (!container.contains(e.target)) close();
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") close();
        });

        if (addBtn) {
            addBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                close();
                openAddAccountModal();
            });
        }

        renderItems();
    }

    // Modal dialog or redirection for "Link Existing System"
    function openAddAccountModal() {
        const localModal = document.getElementById("addAccountModalBackdrop");
        if (localModal) {
            localModal.classList.add("open");
            localModal.setAttribute("aria-hidden", "false");
            document.body.classList.add("modal-open");
            const input = document.getElementById("serviceAccountIdInput");
            if (input) setTimeout(() => input.focus(), 100);
            return;
        }

        // If on another page, navigate to mysystem.html with link action
        window.location.href = "mysystem.html?action=link";
    }

    // --------------------------------------------------------------------------
    // 8. EXPOSE GLOBAL PORTAL API
    // --------------------------------------------------------------------------
    window.HelloSolar = {
        getCustomer,
        setCustomer,
        isAuthenticated,
        requireAuth,
        logout,
        initUserDisplay,
        initNavigation,
        initProfileSettings,
        openProfileSettings: () => {
            if (!profileModalInstance) {
                profileModalInstance = initProfileSettings();
            }
            if (profileModalInstance) {
                profileModalInstance.openModal();
            }
        },
        loadCustomerDataset: loadCustomerDatasetAsync,
        loadCustomerDatasetAsync: loadCustomerDatasetAsync,
        getFaqs,
        enrichPackageMetrics,
        toast: showToast,
        getLinkedPackages,
        getActivePackageId,
        setActivePackageId,
        getActivePackage,
        initPackageSelector: renderPackageSelectorComponent,
        requestPackageSwitch,
        registerDirtyCheck,
        unregisterDirtyCheck,
        openAddAccountModal,
        dataLoader: window.HelloSolarDataLoader || null,
        isSystemActive,
        getProjectStatus,
        getFlowMilestones,
        refreshSharedPackages,
        getDelayedPaymentReminder,
        isBillPastDue,
        FULL_PAYMENT_FLOW,
        INSTALLMENT_FLOW
    };

    // Auto-init on DOMContentLoaded
    document.addEventListener("DOMContentLoaded", async () => {
        // If current page is NOT login or signup, enforce authentication
        const path = window.location.pathname.toLowerCase();
        const isAuthPage = path.endsWith("login.html") || path.endsWith("signup.html") || path.endsWith("index.html");

        if (!isAuthPage) {
            if (!requireAuth()) return;
        }

        // Initialize user display & navigation
        initUserDisplay();
        initNavigation();
        initProfileSettings();

        // Load authoritative JSON dataset
        await loadCustomerDatasetAsync();

        // Auto-mount package selector into any dedicated slot
        const selectorSlots = document.querySelectorAll(".package-selector-slot, #pagePackageSelector");
        selectorSlots.forEach(slot => {
            if (!slot.querySelector(".package-selector")) {
                renderPackageSelectorComponent(slot);
            }
        });
    });
})();
