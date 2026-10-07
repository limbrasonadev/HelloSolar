/**
 * Hello Solar Financer Portal
 * Shared navigation, profile/avatar settings, logout, toast, accessible dropdowns,
 * underwriting and document checklist components. Load before the page script.
 */
// Financer-only page guard: a valid financer session for an Active shared FIN-### account is required.
if (!window.HSShared || !window.HSShared.session.isValid("financer")) {
    if (window.HSShared) window.HSShared.session.clear("financer");
    window.location.replace("login.html");
}

document.addEventListener("DOMContentLoaded", () => {
    // --------------------------------------------------------------------------
    // 1. MOBILE DRAWER NAVIGATION
    // --------------------------------------------------------------------------
    const sidebar = document.getElementById("sidebar");
    const menuBtn = document.getElementById("menu");
    const backdrop = document.getElementById("backdrop");

    if (sidebar && menuBtn && backdrop) {
        function openMenu() {
            sidebar.classList.add("open");
            backdrop.classList.add("open");
            document.body.classList.add("nav-open");
            menuBtn.setAttribute("aria-expanded", "true");
            backdrop.setAttribute("aria-hidden", "false");
        }

        function closeMenu() {
            sidebar.classList.remove("open");
            backdrop.classList.remove("open");
            document.body.classList.remove("nav-open");
            menuBtn.setAttribute("aria-expanded", "false");
            backdrop.setAttribute("aria-hidden", "true");
        }

        menuBtn.addEventListener("click", () => {
            const isOpen = sidebar.classList.contains("open");
            if (isOpen) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        backdrop.addEventListener("click", closeMenu);

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && sidebar.classList.contains("open")) {
                closeMenu();
                menuBtn.focus();
            }
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 768 && sidebar.classList.contains("open")) {
                closeMenu();
            }
        });
    }

    // --------------------------------------------------------------------------
    // 2. LOGOUT HANDLER
    // --------------------------------------------------------------------------
    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (window.HSShared) window.HSShared.session.clear("financer");
        });
    }

    // --------------------------------------------------------------------------
    // 3. PROFILE DATA HELPERS & INITIALS COMPUTATION
    // --------------------------------------------------------------------------
    // Signed-in financer = shared FIN-### account record + financer session. No demo profile defaults.
    const avatarKey = accountId => "hello_solar_financer_avatar:" + accountId;

    function getFinancerUser() {
        const session = window.HSShared ? window.HSShared.session.get("financer") : null;
        if (!session) return { businessName: "", fullName: "", email: "", phone: "", partnerId: "", role: "Financer Portal", avatarUrl: "" };
        const record = window.HSShared.getAccount("financer", session.accountId) || {};
        let avatarUrl = "";
        try { avatarUrl = localStorage.getItem(avatarKey(session.accountId)) || ""; } catch (e) { avatarUrl = ""; }
        return {
            ...session,
            businessName: record.name || session.businessName || "",
            fullName: record.contact || session.fullName || "",
            email: record.email || session.email || "",
            phone: record.phone || session.phone || "",
            partnerId: session.accountId,
            financerId: session.accountId,
            tier: record.category || "",
            role: "Financer Portal",
            avatarUrl
        };
    }

    // Profile edits update the shared financer record (name/contact/phone) and this financer's session.
    function saveFinancerUser(userData) {
        const session = window.HSShared ? window.HSShared.session.get("financer") : null;
        if (!session) return false;
        const result = window.HSShared.update(store => {
            const record = (store.financers || []).find(f => f.id === session.accountId);
            if (!record) return { ok: false, error: "Financer account not found." };
            if (userData.businessName) record.name = userData.businessName;
            if (userData.fullName) record.contact = userData.fullName;
            if (userData.phone !== undefined) record.phone = userData.phone;
        }, { name: "profile.update", payload: { role: "financer", accountId: session.accountId, fields: { name: userData.businessName, contact: userData.fullName, phone: userData.phone } } });
        try {
            if (userData.avatarUrl) localStorage.setItem(avatarKey(session.accountId), userData.avatarUrl);
            else localStorage.removeItem(avatarKey(session.accountId));
        } catch (e) {
            console.warn("Could not save profile photo:", e);
        }
        window.HSShared.session.patch("financer", { businessName: userData.businessName, fullName: userData.fullName, phone: userData.phone });
        return result.ok;
    }

    /**
     * Compute clean, matching initials from any user or business name
     * Examples:
     * - "SolarTech Financer" -> "SF"
     * - "Elena Santos" -> "ES"
     * - "Juan dela Cruz" -> "JC"
     * - "Financer" -> "FI"
     */
    function computeInitials(name) {
        if (!name || typeof name !== "string") return "SF";
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return "SF";
        if (parts.length === 1) {
            return parts[0].substring(0, 2).toUpperCase();
        }
        // First letter of first word + first letter of second (or last) word
        const first = parts[0].charAt(0).toUpperCase();
        const second = (parts.length > 2 ? parts[parts.length - 1] : parts[1]).charAt(0).toUpperCase();
        return (first + second) || "SF";
    }

    function renderAvatarElement(avatarEl, user) {
        if (!avatarEl) return;
        const initials = computeInitials(user.fullName || user.businessName);
        if (user.avatarUrl && typeof user.avatarUrl === "string" && user.avatarUrl.trim()) {
            avatarEl.innerHTML = `<img src="${user.avatarUrl}" alt="${user.fullName || user.businessName || 'Profile'}" class="profile-avatar-img">`;
            const img = avatarEl.querySelector("img");
            if (img) {
                img.onerror = () => {
                    avatarEl.textContent = initials;
                };
            }
        } else {
            avatarEl.textContent = initials;
        }
    }

    function updateTopbarProfile() {
        const user = getFinancerUser();
        const profileNameEl = document.querySelector(".profile-name");
        const profileRoleEl = document.querySelector(".profile-role");
        const profileAvatarEl = document.querySelector(".profile-avatar");

        if (profileNameEl) {
            profileNameEl.textContent = user.fullName || user.businessName || "SolarTech Financer";
        }
        if (profileRoleEl) {
            profileRoleEl.textContent = user.businessName ? `${user.businessName} · Financer` : "Financer Portal";
        }
        if (profileAvatarEl) {
            renderAvatarElement(profileAvatarEl, user);
        }

        const topbarName = document.getElementById("topbarFinancerName");
        if (topbarName) {
            topbarName.textContent = user.businessName || "SolarTech Financer";
        }
        const bannerName = document.getElementById("bannerFinancerName");
        if (bannerName) {
            bannerName.textContent = user.businessName || "SolarTech Financer";
        }
    }

    // Initial render in topbar
    updateTopbarProfile();

    // --------------------------------------------------------------------------
    // 4. INTERACTIVE PROFILE MODAL & AVATAR UPLOAD
    // --------------------------------------------------------------------------
    const PRESET_AVATARS = [
        {
            id: "female-exec-1",
            title: "Corporate Executive (Female)",
            src: "assets/images/avatars/avatar_female_2.jpg"
        },
        {
            id: "male-exec-1",
            title: "Finance Director (Male)",
            src: "assets/images/avatars/avatar_male_2.jpg"
        },
        {
            id: "female-exec-2",
            title: "Senior Underwriter (Female)",
            src: "assets/images/avatars/avatar_female_1.jpg"
        },
        {
            id: "male-exec-2",
            title: "Investment Officer (Male)",
            src: "assets/images/avatars/avatar_male_1.jpg"
        }
    ];

    let currentTempAvatar = null;

    function createToastElement() {
        let toast = document.getElementById("profileToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "profileToast";
            toast.className = "profile-toast";
            toast.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span id="profileToastText">Profile updated successfully!</span>
            `;
            document.body.appendChild(toast);
        }
        return toast;
    }

    function showToast(message) {
        const toast = createToastElement();
        const textEl = document.getElementById("profileToastText");
        if (textEl) textEl.textContent = message;
        toast.classList.add("show");
        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }

    function ensureProfileModal() {
        let modal = document.getElementById("profileModalBackdrop");
        if (modal) return modal;

        modal = document.createElement("div");
        modal.id = "profileModalBackdrop";
        modal.className = "profile-modal-backdrop";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-labelledby", "profileModalTitle");

        modal.innerHTML = `
            <div class="profile-modal-card">
                <!-- Header -->
                <div class="profile-modal-header">
                    <div class="profile-modal-header-info">
                        <div class="profile-modal-badge">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </div>
                        <div>
                            <h2 class="profile-modal-title" id="profileModalTitle">Financer Profile & Settings</h2>
                            <p class="profile-modal-subtitle">Manage your institution details, avatar photo, and underwriting credentials.</p>
                        </div>
                    </div>
                    <button type="button" class="profile-modal-close" id="profileModalCloseBtn" aria-label="Close modal">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <!-- Body -->
                <div class="profile-modal-body">
                    <!-- Avatar Section -->
                    <div class="profile-avatar-section">
                        <div class="profile-modal-avatar-wrap" id="modalAvatarWrap" title="Click to upload custom photo or pick a picture below">
                            <span id="modalAvatarInitials">SF</span>
                            <div class="profile-avatar-overlay">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                    <circle cx="12" cy="13" r="4"></circle>
                                </svg>
                            </div>
                        </div>

                        <div class="profile-avatar-controls">
                            <div class="profile-avatar-title">Profile Avatar Photo</div>
                            <p class="profile-avatar-desc">Choose an official photo below, upload a custom picture, or use your initials.</p>

                            <input type="file" id="profileAvatarFileInput" accept="image/png,image/jpeg,image/webp,image/svg+xml" style="display: none;">

                            <div class="profile-avatar-actions">
                                <label for="profileAvatarFileInput" class="btn-upload-avatar" role="button">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="17 8 12 3 7 8"></polyline>
                                        <line x1="12" y1="3" x2="12" y2="15"></line>
                                    </svg>
                                    Upload Photo
                                </label>
                                <button type="button" class="btn-remove-avatar" id="btnRemoveAvatar">
                                    Use Initials
                                </button>
                            </div>

                            <!-- Quick Preset Pictures Picker -->
                            <div class="avatar-presets-wrap">
                                <div class="avatar-presets-label">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                                        <circle cx="8.5" cy="8.5" r="1.5"/>
                                        <polyline points="21 15 16 10 5 21"/>
                                    </svg>
                                    Choose Preset Picture:
                                </div>
                                <div class="avatar-presets-grid" id="avatarPresetsGrid">
                                    <button type="button" class="avatar-preset-btn initials-btn" id="presetBtnInitials" data-type="initials" title="Use Initials">
                                        <span id="presetInitialsText">SF</span>
                                    </button>
                                    <button type="button" class="avatar-preset-btn" data-src="assets/images/avatars/avatar_female_2.jpg" title="Corporate Executive (Female)">
                                        <img src="assets/images/avatars/avatar_female_2.jpg" alt="Corporate Executive">
                                    </button>
                                    <button type="button" class="avatar-preset-btn" data-src="assets/images/avatars/avatar_male_2.jpg" title="Finance Director (Male)">
                                        <img src="assets/images/avatars/avatar_male_2.jpg" alt="Finance Director">
                                    </button>
                                    <button type="button" class="avatar-preset-btn" data-src="assets/images/avatars/avatar_female_1.jpg" title="Senior Underwriter (Female)">
                                        <img src="assets/images/avatars/avatar_female_1.jpg" alt="Senior Underwriter">
                                    </button>
                                    <button type="button" class="avatar-preset-btn" data-src="assets/images/avatars/avatar_male_1.jpg" title="Investment Officer (Male)">
                                        <img src="assets/images/avatars/avatar_male_1.jpg" alt="Investment Officer">
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Project Badges & Accreditation Info -->
                    <div class="financer-project-info">
                        <div class="financer-info-item">
                            <span class="financer-info-label">Partner Accreditation</span>
                            <span class="financer-status-pill">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Verified Financer
                            </span>
                        </div>
                        <div class="financer-info-item">
                            <span class="financer-info-label">Partner Code</span>
                            <span class="financer-info-val" id="infoPartnerCode">—</span>
                        </div>
                        <div class="financer-info-item">
                            <span class="financer-info-label">Financing Facility Cap</span>
                            <span class="financer-info-val">₱50,000,000 Portfolio</span>
                        </div>
                        <div class="financer-info-item">
                            <span class="financer-info-label">Program Scope</span>
                            <span class="financer-info-val">Rooftop Solar Underwriting</span>
                        </div>
                    </div>

                    <!-- Editable Profile Form -->
                    <form id="profileEditForm" class="profile-form-grid" novalidate>
                        <div class="profile-field profile-form-full">
                            <label for="profBusinessName">Financing Institution / Firm Name</label>
                            <input type="text" id="profBusinessName" placeholder="e.g. SolarTech Financer" required>
                        </div>

                        <div class="profile-field">
                            <label for="profFullName">Authorized Representative</label>
                            <input type="text" id="profFullName" placeholder="e.g. Elena Santos" required>
                        </div>

                        <div class="profile-field">
                            <label for="profPhone">Mobile / Direct Phone</label>
                            <input type="tel" id="profPhone" placeholder="0917 888 2345">
                        </div>

                        <div class="profile-field profile-form-full">
                            <label for="profEmail">Work Email Address</label>
                            <input type="email" id="profEmail" placeholder="financer@hellosolar.ph" required>
                        </div>
                    </form>
                </div>

                <!-- Footer Actions -->
                <div class="profile-modal-footer">
                    <a href="login.html" class="btn btn-outline-danger btn-sm" id="modalSignOutBtn" style="margin-right: auto; min-height: 42px; display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1px solid var(--red); color: var(--red); border-radius: var(--radius-xs); text-decoration: none; font-weight: 700;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 15px; height: 15px;">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Log Out
                    </a>
                    <button type="button" class="btn-modal-cancel" id="profileModalCancelBtn">Cancel</button>
                    <button type="button" class="btn-modal-save" id="profileModalSaveBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Save Changes
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup event handlers inside modal
        const closeBtn = document.getElementById("profileModalCloseBtn");
        const cancelBtn = document.getElementById("profileModalCancelBtn");
        const saveBtn = document.getElementById("profileModalSaveBtn");
        const modalSignOut = document.getElementById("modalSignOutBtn");
        const fileInput = document.getElementById("profileAvatarFileInput");
        const removeAvatarBtn = document.getElementById("btnRemoveAvatar");
        const avatarWrap = document.getElementById("modalAvatarWrap");
        const businessNameInput = document.getElementById("profBusinessName");
        const fullNameInput = document.getElementById("profFullName");

        function closeModal() {
            modal.classList.remove("open");
            document.body.classList.remove("nav-open");
        }

        if (closeBtn) closeBtn.addEventListener("click", closeModal);
        if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
        if (modalSignOut) {
            modalSignOut.addEventListener("click", () => {
                if (window.HSShared) window.HSShared.session.clear("financer");
            });
        }

        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModal();
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && modal.classList.contains("open")) {
                closeModal();
            }
        });

        // Trigger file select by clicking avatar wrap
        if (avatarWrap && fileInput) {
            avatarWrap.addEventListener("click", () => {
                fileInput.click();
            });
        }

        const presetButtons = modal.querySelectorAll(".avatar-preset-btn");
        const presetInitialsText = document.getElementById("presetInitialsText");
        const presetBtnInitials = document.getElementById("presetBtnInitials");

        // Live preview of initials or picture when typing name or choosing photo
        function updateModalAvatarPreview() {
            const name = fullNameInput.value || businessNameInput.value || "SolarTech Financer";
            const initials = computeInitials(name);
            if (presetInitialsText) {
                presetInitialsText.textContent = initials;
            }

            if (currentTempAvatar && typeof currentTempAvatar === "string" && currentTempAvatar.trim()) {
                // Instantly transform initial into chosen picture
                avatarWrap.innerHTML = `
                    <img src="${currentTempAvatar}" alt="Preview" class="profile-modal-avatar-img">
                    <div class="profile-avatar-overlay">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                    </div>
                `;

                // Update active state across preset buttons
                let matchedPreset = false;
                presetButtons.forEach(btn => {
                    const src = btn.getAttribute("data-src");
                    if (src && src === currentTempAvatar) {
                        btn.classList.add("active");
                        matchedPreset = true;
                    } else {
                        btn.classList.remove("active");
                    }
                });
                if (presetBtnInitials) presetBtnInitials.classList.remove("active");
            } else {
                // Instantly transform picture back into initials
                avatarWrap.innerHTML = `
                    <span id="modalAvatarInitials">${initials}</span>
                    <div class="profile-avatar-overlay">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                    </div>
                `;

                // Mark Initials as active
                presetButtons.forEach(btn => {
                    if (btn.getAttribute("data-type") === "initials") {
                        btn.classList.add("active");
                    } else {
                        btn.classList.remove("active");
                    }
                });
            }
        }

        // Attach listeners to preset picture buttons
        presetButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                const type = btn.getAttribute("data-type");
                if (type === "initials") {
                    currentTempAvatar = "";
                    if (fileInput) fileInput.value = "";
                } else {
                    const src = btn.getAttribute("data-src");
                    if (src) {
                        currentTempAvatar = src;
                        if (fileInput) fileInput.value = "";
                    }
                }
                updateModalAvatarPreview();
            });
        });

        if (fullNameInput) fullNameInput.addEventListener("input", updateModalAvatarPreview);
        if (businessNameInput) businessNameInput.addEventListener("input", updateModalAvatarPreview);

        // Handle Image File Upload
        if (fileInput) {
            fileInput.addEventListener("change", (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;

                if (!file.type.startsWith("image/")) {
                    alert("Please select a valid image file (PNG, JPG, WebP, or SVG).");
                    return;
                }

                if (file.size > 5 * 1024 * 1024) {
                    alert("Image size exceeds 5MB. Please choose a smaller image.");
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    currentTempAvatar = event.target.result;
                    updateModalAvatarPreview();
                };
                reader.readAsDataURL(file);
            });
        }

        // Handle Remove Photo / Use Initials
        if (removeAvatarBtn) {
            removeAvatarBtn.addEventListener("click", () => {
                currentTempAvatar = "";
                if (fileInput) fileInput.value = "";
                updateModalAvatarPreview();
            });
        }

        // Handle Save Changes
        if (saveBtn) {
            saveBtn.addEventListener("click", () => {
                const bName = (businessNameInput.value || "").trim();
                const fName = (fullNameInput.value || "").trim();
                const email = (document.getElementById("profEmail").value || "").trim();
                const phone = (document.getElementById("profPhone").value || "").trim();

                if (!bName && !fName) {
                    alert("Please enter your name or institution name.");
                    return;
                }

                const currentUser = getFinancerUser();
                const updatedUser = {
                    ...currentUser,
                    businessName: bName || currentUser.businessName,
                    fullName: fName || currentUser.fullName,
                    email: email || currentUser.email,
                    phone: phone || currentUser.phone,
                    avatarUrl: currentTempAvatar !== null ? currentTempAvatar : (currentUser.avatarUrl || "")
                };

                saveFinancerUser(updatedUser);
                updateTopbarProfile();
                closeModal();
                showToast("Profile and avatar photo updated successfully! ✓");
            });
        }

        modal.updateModalAvatarPreview = updateModalAvatarPreview;
        return modal;
    }

    function openProfileModal() {
        const modal = ensureProfileModal();
        const user = getFinancerUser();
        currentTempAvatar = user.avatarUrl || "";

        const bNameInput = document.getElementById("profBusinessName");
        const fNameInput = document.getElementById("profFullName");
        const emailInput = document.getElementById("profEmail");
        const phoneInput = document.getElementById("profPhone");
        const partnerCodeEl = document.getElementById("infoPartnerCode");

        if (bNameInput) bNameInput.value = user.businessName || "";
        if (fNameInput) fNameInput.value = user.fullName || "";
        if (emailInput) emailInput.value = user.email || "";
        if (phoneInput) phoneInput.value = user.phone || "";
        if (partnerCodeEl) partnerCodeEl.textContent = user.partnerId || "—";

        if (typeof modal.updateModalAvatarPreview === "function") {
            modal.updateModalAvatarPreview();
        }

        modal.classList.add("open");
        document.body.classList.add("nav-open");
    }

    // Expose showToast globally
    window.showToast = showToast;

    // Attach click listener to topbar profile triggers
    const profileTriggers = document.querySelectorAll(".profile");
    profileTriggers.forEach((trigger) => {
        trigger.setAttribute("tabindex", "0");
        trigger.setAttribute("role", "button");
        trigger.setAttribute("aria-haspopup", "dialog");
        trigger.setAttribute("title", "Click to view and edit financer profile");

        trigger.addEventListener("click", openProfileModal);

        trigger.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openProfileModal();
            }
        });
    });


    // Shared review, document checklist, decisions and table data used by Dashboard and Applications.
    // --------------------------------------------------------------------------
    // SHARED UNDERWRITING MODAL (Dashboard and Applications)
    // --------------------------------------------------------------------------
    const reviewModal = document.getElementById("reviewModal");
    const closeReviewBtn = document.getElementById("closeReviewModalBtn");
    let activeUnderwriteRow = null;
    let currentAppId = "";
    let currentBorrowerName = "";
    let reviewTrigger = null;

    function closeReviewModal() {
        if (reviewModal) {
            reviewModal.classList.remove("open");
            reviewModal.setAttribute("aria-hidden", "true");
            document.body.classList.remove("nav-open");
            reviewTrigger?.focus();
        }
    }

    if (closeReviewBtn) {
        closeReviewBtn.addEventListener("click", closeReviewModal);
    }

    if (reviewModal) {
        reviewModal.addEventListener("click", (e) => {
            if (e.target === reviewModal) {
                closeReviewModal();
            }
        });
    }

    // Helper: calculate monthly payment estimate based on amount & term
    function calculateEstimatedMonthly(principal, termMonths) {
        const p = parseFloat(String(principal).replace(/[^0-9.]/g, "")) || 285000;
        const months = parseInt(termMonths, 10) || 36;
        const annualRate = 0.085;
        const monthlyRate = annualRate / 12;
        const emi = (p * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
        return "₱" + Math.round(emi).toLocaleString("en-PH") + "/mo";
    }

    // --------------------------------------------------------------------------
    // DOCUMENTS CHECKLIST MODAL (Click Documents "3/4" Text to View Passed / Missing)
    // --------------------------------------------------------------------------
    const docChecklistModal = document.getElementById("docChecklistModal");
    const closeDocModalBtn = document.getElementById("closeDocModalBtn");
    const closeDocModalFooterBtn = document.getElementById("closeDocModalFooterBtn");
    const docModalOpenReviewBtn = document.getElementById("docModalOpenReviewBtn");

    function closeDocChecklistModal() {
        if (docChecklistModal) {
            docChecklistModal.classList.remove("open");
            docChecklistModal.setAttribute("aria-hidden", "true");
            document.body.classList.remove("nav-open");
        }
    }

    if (closeDocModalBtn) closeDocModalBtn.addEventListener("click", closeDocChecklistModal);
    if (closeDocModalFooterBtn) closeDocModalFooterBtn.addEventListener("click", closeDocChecklistModal);
    if (docChecklistModal) {
        docChecklistModal.addEventListener("click", (e) => {
            if (e.target === docChecklistModal) closeDocChecklistModal();
        });
    }

    // Open Documents Checklist Modal on clicking documents text
    document.addEventListener("click", (e) => {
        const docBtn = e.target.closest(".doc-status-text-btn");
        if (docBtn) {
            const row = docBtn.closest("tr");
            const appId = docBtn.dataset.appid || row?.dataset?.appid || "";
            if (!appId) return;
            let appRecord = null;
            if (window.HelloSolarStore) {
                const store = window.HelloSolarStore.getPortalData();
                appRecord = store?.applications?.find(a => a.id === appId);
            }

            const applicantName = appRecord?.applicant?.name || row?.dataset?.borrower || "Applicant";
            const docs = getApplicationDocuments(appRecord || { id: appId });
            const passedCount = docs.filter(d => d.submitted).length;
            const acceptedCount = docs.filter(d => d.status === "ACCEPTED").length;
            const totalCount = docs.length;

            const nameEl = document.getElementById("docModalApplicantName");
            const appIdEl = document.getElementById("docModalAppId");
            const countEl = document.getElementById("docSummaryCount");
            const statusEl = document.getElementById("docSummaryStatus");
            const itemsContainer = document.getElementById("docChecklistItems");

            if (nameEl) nameEl.textContent = applicantName;
            if (appIdEl) appIdEl.textContent = appId;
            if (countEl) countEl.textContent = `${passedCount} of ${totalCount} Documents Submitted · ${acceptedCount} Accepted`;
            if (statusEl) {
                if (totalCount && acceptedCount === totalCount) {
                    statusEl.textContent = "All required documents verified ✓";
                    statusEl.style.color = "#059669";
                } else if (totalCount && passedCount === totalCount) {
                    statusEl.textContent = `${totalCount - acceptedCount} submitted document${totalCount - acceptedCount > 1 ? "s" : ""} awaiting review`;
                    statusEl.style.color = "#B45309";
                } else if (!totalCount) {
                    statusEl.textContent = "No document requests on record for this application";
                    statusEl.style.color = "#B45309";
                } else {
                    const missingCount = totalCount - passedCount;
                    statusEl.textContent = `${missingCount} document${missingCount > 1 ? "s" : ""} required before disbursement`;
                    statusEl.style.color = "#B45309";
                }
            }

            if (itemsContainer) {
                itemsContainer.innerHTML = docs.map(doc => {
                    const isPassed = !!doc.submitted;
                    // Same file and status the customer sees on the shared APP document record
                    const fileLine = doc.fileName
                        ? (doc.hasFile ? `<a href="#" data-view-shared-doc="${escapeDocHtml(doc.id)}" data-appid="${escapeDocHtml(appId)}">${escapeDocHtml(doc.fileName)}</a>` : escapeDocHtml(doc.fileName))
                            + (doc.uploadedAt ? ` · uploaded ${new Date(doc.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}` : "")
                        : "";
                    const note = [fileLine, doc.note ? escapeDocHtml(doc.note) : ""].filter(Boolean).join(" · ")
                        || (isPassed ? "Document submitted" : "Pending upload from applicant");
                    if (isPassed) {
                        return `
                        <div class="doc-checklist-item doc-item-passed">
                            <div class="doc-item-left">
                                <div class="doc-check-icon passed" title="Passed">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                                <div class="doc-item-details">
                                    <div class="doc-item-title">${escapeDocHtml(doc.name)}${doc.optional ? " (if applicable)" : ""}</div>
                                    <div class="doc-item-note">${note}</div>
                                </div>
                            </div>
                            <div class="doc-item-right">
                                <span class="doc-badge passed">${doc.status === "ACCEPTED" ? "✓ " : ""}${doc.statusLabel}</span>
                            </div>
                        </div>`;
                    } else {
                        return `
                        <div class="doc-checklist-item doc-item-missing">
                            <div class="doc-item-left">
                                <div class="doc-check-icon missing" title="Not Passed Yet">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/>
                                    </svg>
                                </div>
                                <div class="doc-item-details">
                                    <div class="doc-item-title">${escapeDocHtml(doc.name)}${doc.optional ? " (if applicable)" : ""}</div>
                                    <div class="doc-item-note">${note}</div>
                                </div>
                            </div>
                            <div class="doc-item-right">
                                <span class="doc-badge missing">${doc.statusLabel}</span>
                            </div>
                        </div>`;
                    }
                }).join("");
            }

            // Link footer button to open full review
            if (docModalOpenReviewBtn) {
                docModalOpenReviewBtn.onclick = () => {
                    closeDocChecklistModal();
                    const appReviewBtn = row?.querySelector(".btn-applicant-id, .btn-underwrite");
                    if (appReviewBtn) {
                        appReviewBtn.click();
                    }
                };
            }

            if (docChecklistModal) {
                docChecklistModal.classList.add("open");
                docChecklistModal.setAttribute("aria-hidden", "false");
                document.body.classList.add("nav-open");
            }
        }
    });

    // Open & Populate 6-Section Underwriting Review Modal (via Applicant ID or Review trigger)
    document.addEventListener("click", (e) => {
        const underwriteBtn = e.target.closest(".btn-underwrite, .btn-applicant-id, [data-trigger-review]");
        if (underwriteBtn) {
            reviewTrigger = underwriteBtn;
            activeUnderwriteRow = underwriteBtn.closest("tr");
            currentAppId = underwriteBtn.dataset.appid || activeUnderwriteRow?.dataset?.appid || "APP-1103";
            currentBorrowerName = underwriteBtn.dataset.name || activeUnderwriteRow?.dataset?.borrower || "Borrower";

            // Attempt to look up live record in HelloSolarStore
            let appRecord = null;
            if (window.HelloSolarStore) {
                if (typeof window.HelloSolarStore.getApplicationById === "function") {
                    appRecord = window.HelloSolarStore.getApplicationById(currentAppId);
                } else {
                    const portalData = window.HelloSolarStore.getPortalData();
                    if (portalData && Array.isArray(portalData.applications)) {
                        appRecord = portalData.applications.find(a => a.id === currentAppId);
                    }
                }
            }

            const applicant = appRecord ? (appRecord.applicant || {}) : {};
            const loan = appRecord ? (appRecord.loan || {}) : {};
            const system = appRecord ? (appRecord.system || {}) : {};

            const bName = applicant.name || currentBorrowerName;
            const appId = appRecord ? appRecord.id : currentAppId;
            const phone = applicant.phone || underwriteBtn.dataset.phone || "0917 555 0192";
            const location = applicant.location || underwriteBtn.dataset.loc || "Taguig City";
            const subDate = loan.submittedDate || underwriteBtn.dataset.date || "Sep 28, 2026";
            const status = loan.status || "pending";

            const amount = loan.amount || appRecord?.fundedAmount || underwriteBtn.dataset.amount || "₱340,000";
            const fundedAmount = appRecord?.fundedAmount || loan.fundedAmount || amount;
            const term = appRecord?.financingTerm || loan.financingTerm || loan.term || underwriteBtn.dataset.term || "36 Months";
            let monthlyPayment = appRecord?.monthlyPayment || loan.monthlyPayment || underwriteBtn.dataset.payment;
            if (!monthlyPayment) {
                monthlyPayment = calculateEstimatedMonthly(amount, term);
            }

            const income = applicant.income || underwriteBtn.dataset.income || "₱95,000/mo";
            const dti = applicant.dti || underwriteBtn.dataset.dti || "21%";
            const creditScore = applicant.creditScore || underwriteBtn.dataset.score || 748;
            const nextStep = loan.nextStep || underwriteBtn.dataset.nextstep || "Verify 3-mo electric bill & proof of income";

            const sysTitle = system.title || system.systemSize || underwriteBtn.dataset.system || "5.4 kWp Hybrid System";
            const merchant = system.merchant || underwriteBtn.dataset.merchant || "SunPower Manila";
            const sysCost = system.cost || underwriteBtn.dataset.cost || "₱375,000";
            const downPayment = (system.downPayment || underwriteBtn.dataset.down || "₱35,000").replace(/\s*\([^)]*\)/g, "").trim();

            // Header Elements
            const nameHeaderEl = document.getElementById("modalBorrowerName");
            const customerHeaderEl = document.getElementById("modalCustomerHeader");
            const applicantFullEl = document.getElementById("modalApplicantFullName");
            const appIdEl = document.getElementById("modalAppId");
            const phoneEl = document.getElementById("modalPhone");
            const locEl = document.getElementById("modalLocation");
            const statusBadgeEl = document.getElementById("modalStatusBadge");

            if (nameHeaderEl) nameHeaderEl.textContent = bName;
            if (customerHeaderEl) customerHeaderEl.textContent = bName;
            if (applicantFullEl) applicantFullEl.textContent = bName;
            if (appIdEl) appIdEl.textContent = appId;
            if (phoneEl) phoneEl.textContent = phone;
            if (locEl) locEl.textContent = location;

            // Accurate Status Badge
            const finStatus = (appRecord?.financingStatus || "").toUpperCase();
            if (statusBadgeEl) {
                if (finStatus === "APPROVED" || status === "approved" || status === "disbursed") {
                    statusBadgeEl.className = "badge badge-approved";
                    statusBadgeEl.textContent = "Approved";
                } else if (finStatus === "DECLINED" || status === "rejected") {
                    statusBadgeEl.className = "badge badge-rejected";
                    statusBadgeEl.textContent = "Declined";
                } else if (finStatus === "DOCUMENTS_REQUIRED" || status === "docs_required") {
                    statusBadgeEl.className = "badge badge-docs-required";
                    statusBadgeEl.textContent = "Documents Required";
                } else if (finStatus === "UNDER_REVIEW" || status === "review") {
                    statusBadgeEl.className = "badge badge-review";
                    statusBadgeEl.textContent = "Under Review";
                } else {
                    statusBadgeEl.className = "badge badge-pending";
                    statusBadgeEl.textContent = "Financing Review";
                }
            }

            // Financial Assessment
            const loanAmountEl = document.getElementById("modalLoanAmount");
            const fundedAmountEl = document.getElementById("modalFundedAmount");
            const loanTermEl = document.getElementById("modalLoanTerm");
            const monthlyPaymentEl = document.getElementById("modalMonthlyPayment");

            if (loanAmountEl) loanAmountEl.textContent = amount;
            if (fundedAmountEl) fundedAmountEl.textContent = fundedAmount;
            if (loanTermEl) loanTermEl.textContent = term;
            if (monthlyPaymentEl) monthlyPaymentEl.textContent = monthlyPayment;

            const incomeEl = document.getElementById("modalIncome");
            const dtiEl = document.getElementById("modalDti");
            const scoreEl = document.getElementById("modalCreditScore");

            if (incomeEl) incomeEl.textContent = income;
            if (dtiEl) {
                const cleanDti = String(dti).replace(/\s*\([^)]*\)/g, "").trim();
                dtiEl.textContent = cleanDti;
                const dtiVal = parseInt(cleanDti.replace(/[^0-9]/g, ""), 10) || 21;
                dtiEl.className = "fin-metric-val " + (dtiVal <= 30 ? "val-green" : (dtiVal <= 40 ? "val-amber" : "val-red"));
            }

            if (scoreEl) {
                const s = parseInt(String(creditScore), 10) || 748;
                scoreEl.textContent = s;
                scoreEl.className = "fin-metric-val " + (s >= 720 ? "val-green" : (s >= 650 ? "val-amber" : "val-red"));
            }

            // Solar Project
            const systemEl = document.getElementById("modalSystem");
            const merchantEl = document.getElementById("modalMerchant");
            const costEl = document.getElementById("modalSystemCost");
            const downEl = document.getElementById("modalDownPayment");

            if (systemEl) systemEl.textContent = sysTitle;
            if (merchantEl) merchantEl.textContent = merchant;
            if (costEl) costEl.textContent = sysCost;
            if (downEl) downEl.textContent = downPayment;

            // Documents List & Ratio
            const docs = getApplicationDocuments(appRecord);
            const passedCount = docs.filter(d => d.submitted).length;
            const totalCount = docs.length;

            const docRatioBadge = document.getElementById("modalDocRatioBadge");
            if (docRatioBadge) docRatioBadge.textContent = `${passedCount}/${totalCount}`;

            const docListEl = document.getElementById("modalDocList");
            if (docListEl) {
                docListEl.innerHTML = docs.map(doc => {
                    const isPassed = !!doc.submitted;
                    const icon = isPassed ? "✓" : "⚠";
                    const cls = isPassed ? "passed" : "warning";
                    return `<div class="doc-item-row ${cls}">
                        <span class="doc-icon ${cls}">${icon}</span>
                        <span class="doc-name">${escapeDocHtml(doc.name)}</span>
                        <span class="doc-status">${escapeDocHtml(doc.statusLabel)}</span>
                    </div>`;
                }).join("");
            }

            // Timeline & Next Step
            const subDateEl = document.getElementById("modalSubmittedDate");
            const nextStepEl = document.getElementById("modalNextStep");
            if (subDateEl) subDateEl.textContent = subDate;
            if (nextStepEl) nextStepEl.textContent = nextStep;

            // Reset Collapsibles
            const appDetailsToggle = document.getElementById("toggleApplicantDetailsBtn");
            const appDetailsCollapse = document.getElementById("applicantDetailsCollapse");
            if (appDetailsToggle && appDetailsCollapse) {
                appDetailsToggle.setAttribute("aria-expanded", "false");
                appDetailsCollapse.hidden = true;
            }

            // Decline reason stays hidden until the user chooses Decline
            resetDeclineReason();

            // Reflect contract state on financing actions (viewing stays available; non-Active contracts are read-only)
            const contractBlocked = typeof window.HelloSolarStore?.getNewFinancingBlockReason === "function"
                && !!window.HelloSolarStore.getNewFinancingBlockReason();
            ["approveLoanBtn", "requestDocBtn", "declineLoanBtn"].forEach(id => {
                const btn = document.getElementById(id);
                if (!btn) return;
                btn.disabled = contractBlocked;
                btn.title = contractBlocked ? "Financing actions require an Active contract." : "";
            });

            if (reviewModal) {
                reviewModal.classList.add("open");
                reviewModal.setAttribute("aria-hidden", "false");
                document.body.classList.add("nav-open");
                closeReviewBtn?.focus();
            }
        }
    });

    // Wire Document View button inside review modal
    const modalViewDocsBtn = document.getElementById("modalViewDocsBtn");
    modalViewDocsBtn?.addEventListener("click", () => {
        closeReviewModal();
        const fakeDocBtn = document.querySelector(`.doc-status-text-btn[data-appid="${currentAppId}"]`);
        if (fakeDocBtn) {
            fakeDocBtn.click();
        } else {
            // Open docChecklistModal directly
            const openDocEvent = new MouseEvent("click", { bubbles: true });
            document.querySelector(".doc-status-text-btn")?.dispatchEvent(openDocEvent);
        }
    });

    // Wire Applicant Details collapsible
    const toggleApplicantDetailsBtn = document.getElementById("toggleApplicantDetailsBtn");
    const applicantDetailsCollapse = document.getElementById("applicantDetailsCollapse");
    toggleApplicantDetailsBtn?.addEventListener("click", () => {
        if (!applicantDetailsCollapse) return;
        const isHidden = applicantDetailsCollapse.hidden;
        applicantDetailsCollapse.hidden = !isHidden;
        toggleApplicantDetailsBtn.setAttribute("aria-expanded", isHidden ? "true" : "false");
    });

    // Decline Reason: hidden by default, revealed only when the user chooses Decline
    const declineReasonWrap = document.getElementById("declineReasonWrap");
    const declineReasonSelect = document.getElementById("declineReasonSelect");
    const declineReasonCustomInput = document.getElementById("declineReasonCustomInput");
    const declineReasonError = document.getElementById("declineReasonError");

    function setDeclineReasonError(show) {
        if (declineReasonError) declineReasonError.hidden = !show;
        declineReasonSelect?.classList.toggle("is-invalid", !!show);
        declineReasonCustomInput?.classList.toggle("is-invalid", !!show && declineReasonSelect?.value === "custom");
    }

    function resetDeclineReason() {
        if (declineReasonWrap) declineReasonWrap.hidden = true;
        if (declineReasonSelect) declineReasonSelect.value = "";
        if (declineReasonCustomInput) {
            declineReasonCustomInput.value = "";
            declineReasonCustomInput.hidden = true;
        }
        setDeclineReasonError(false);
        const btn = document.getElementById("declineLoanBtn");
        if (btn) btn.textContent = "Decline";
    }

    declineReasonSelect?.addEventListener("change", () => {
        if (declineReasonCustomInput) {
            declineReasonCustomInput.hidden = declineReasonSelect.value !== "custom";
            if (!declineReasonCustomInput.hidden) declineReasonCustomInput.focus();
        }
        setDeclineReasonError(false);
    });
    declineReasonCustomInput?.addEventListener("input", () => setDeclineReasonError(false));

    // Helper: Trigger toast notifications safely
    function triggerToast(msg) {
        if (typeof window.showToast === "function") {
            window.showToast(msg);
        }
    }

    // Contract guard: only an Active financer contract may approve, request documents or decline applications.
    function getContractBlockReason() {
        return typeof window.HelloSolarStore?.getNewFinancingBlockReason === "function"
            ? window.HelloSolarStore.getNewFinancingBlockReason()
            : null;
    }

    // Handle Loan Approval (Single Source of Truth, Backend Ready)
    const approveLoanBtn = document.getElementById("approveLoanBtn");
    function acceptApplication() {
        if (!currentAppId) return;
        const contractBlock = getContractBlockReason();
        if (contractBlock) {
            triggerToast(contractBlock);
            return;
        }

        // Empty values fall back to the application's own loan terms in the store (no hardcoded amounts)
        let fundedAmount = "";
        let monthlyPayment = "";
        let financingTerm = "";

        const fundedEl = document.getElementById("modalFundedAmount") || document.getElementById("modalLoanAmount");
        if (fundedEl && fundedEl.textContent.trim()) fundedAmount = fundedEl.textContent.trim();
        const paymentEl = document.getElementById("modalMonthlyPayment");
        if (paymentEl && paymentEl.textContent.trim()) monthlyPayment = paymentEl.textContent.trim();
        const termEl = document.getElementById("modalLoanTerm");
        if (termEl && termEl.textContent.trim()) financingTerm = termEl.textContent.trim();

        const approved = window.HelloSolarStore && typeof window.HelloSolarStore.approveFinancing === "function"
            ? window.HelloSolarStore.approveFinancing(currentAppId, {
                fundedAmount: fundedAmount,
                monthlyPayment: monthlyPayment,
                financingTerm: financingTerm
            })
            : null;
        if (!approved) {
            triggerToast(`${currentAppId} could not be approved. Refresh and try again.`);
            return;
        }

        closeReviewModal();
        triggerToast(`Financing for ${currentAppId} approved! Status set to READY_FOR_INSTALLATION. ✓`);

        if (typeof window.renderApplicationsTable === "function") {
            window.renderApplicationsTable();
        } else if (typeof refreshPortalTables === "function") {
            refreshPortalTables();
        }
        window.updateAppTabCounts?.();
        window.filterApplications?.();
        if (typeof window.updateDashboardDynamicMetrics === "function") {
            window.updateDashboardDynamicMetrics();
        }

    }
    approveLoanBtn?.addEventListener("click", acceptApplication);

    // Handle Loan Decline (Strictly Require Decline Reason)
    const declineLoanBtn = document.getElementById("declineLoanBtn");
    function declineApplication() {
        if (!currentAppId) return;
        const contractBlock = getContractBlockReason();
        if (contractBlock) {
            triggerToast(contractBlock);
            return;
        }

        // First click reveals the decline reason; the second click confirms
        if (declineReasonWrap && declineReasonWrap.hidden) {
            declineReasonWrap.hidden = false;
            if (declineLoanBtn) declineLoanBtn.textContent = "Confirm Decline";
            declineReasonWrap.scrollIntoView({ block: "nearest" });
            declineReasonSelect?.focus();
            return;
        }

        let selectedReason = declineReasonSelect ? declineReasonSelect.value.trim() : "";
        if (selectedReason === "custom") {
            selectedReason = declineReasonCustomInput ? declineReasonCustomInput.value.trim() : "";
        }

        // Require decline reason
        if (!selectedReason) {
            setDeclineReasonError(true);
            (declineReasonSelect?.value === "custom" ? declineReasonCustomInput : declineReasonSelect)?.focus();
            return;
        }

        const declined = window.HelloSolarStore && typeof window.HelloSolarStore.declineFinancing === "function"
            ? window.HelloSolarStore.declineFinancing(currentAppId, { reason: selectedReason })
            : null;
        if (!declined) {
            triggerToast(`${currentAppId} could not be declined. Refresh and try again.`);
            return;
        }

        closeReviewModal();
        triggerToast(`Financing application ${currentAppId} declined. Adverse reason recorded.`);

        if (typeof window.renderApplicationsTable === "function") {
            window.renderApplicationsTable();
        } else if (typeof refreshPortalTables === "function") {
            refreshPortalTables();
        }
        window.updateAppTabCounts?.();
        window.filterApplications?.();
        if (typeof window.updateDashboardDynamicMetrics === "function") {
            window.updateDashboardDynamicMetrics();
        }

    }
    declineLoanBtn?.addEventListener("click", declineApplication);

    // Documents for the table and review modal = the shared APP document record the Customer portal uploads to
    // (HSShared.documentRecordFor). Same files and statuses as the customer sees; there is no separate checklist.
    // "If applicable" documents are listed once the customer has uploaded them or they have a review decision.
    const DOC_STATUS_LABEL = { NOT_SUBMITTED: "Not Submitted", SUBMITTED: "Submitted", UNDER_REVIEW: "Under Review", ACCEPTED: "Accepted", REUPLOAD_REQUIRED: "Re-upload Required" };
    function escapeDocHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
    }
    function getApplicationDocuments(app) {
        const rec = app?.id && window.HSShared ? window.HSShared.documentRecordFor(app.id) : null;
        if (!rec) return [];
        return rec.documents
            .filter(d => !(d.optional && d.status === "NOT_SUBMITTED"))
            .map(d => ({
                id: d.id,
                name: d.name,
                optional: !!d.optional,
                status: d.status,
                statusLabel: DOC_STATUS_LABEL[d.status] || d.status,
                fileName: d.fileName || "",
                hasFile: !!d.fileData,
                uploadedAt: d.uploadedAt || null,
                note: d.note || "",
                submitted: d.submitted
            }));
    }

    // Opens the customer-uploaded file from the shared record
    document.addEventListener("click", (e) => {
        const link = e.target.closest("[data-view-shared-doc]");
        if (!link || !window.HSShared) return;
        e.preventDefault();
        const rec = window.HSShared.documentsFor(link.dataset.appid);
        const doc = rec && rec.documents.find(d => d.id === link.dataset.viewSharedDoc);
        if (!doc || !doc.fileData) return;
        const win = window.open();
        if (!win) return;
        win.document.title = doc.fileName;
        win.document.body.style.margin = "0";
        const frame = win.document.createElement(doc.fileType === "application/pdf" ? "iframe" : "img");
        frame.src = doc.fileData;
        frame.style.cssText = doc.fileType === "application/pdf" ? "border:0;width:100vw;height:100vh" : "max-width:100%";
        win.document.body.appendChild(frame);
    });

    function refreshPortalTables() {
        if (!window.HelloSolarStore) return;
        const data = window.HelloSolarStore.getPortalData();
        document.querySelectorAll("#attentionTable tbody tr, #applicationsTable tbody tr").forEach(row => {
            const app = data.applications.find(item => item.id === row.dataset.appid);
            if (!app) return;
            const statusMeta = (typeof getStatusMeta === "function") ? getStatusMeta(app) : null;
            row.dataset.status = statusMeta ? statusMeta.key : (app.loan?.status || "pending");
            row.dataset.search = (app.id + " " + app.applicant?.name + " " + app.applicant?.location).trim();
            
            // Dynamic Current Status badge update based on loan decision
            const badge = row.querySelector('[data-label="Current Status"] .badge');
            if (badge) {
                const finStatus = (app.financingStatus || "").toUpperCase();
                if (finStatus === "APPROVED" || app.loan?.status === "approved" || app.loan?.status === "disbursed") {
                    badge.textContent = "Approved";
                    badge.className = "badge badge-approved";
                } else if (finStatus === "DECLINED" || app.loan?.status === "rejected") {
                    badge.textContent = "Declined";
                    badge.className = "badge badge-rejected";
                } else if (finStatus === "DOCUMENTS_REQUIRED" || app.loan?.status === "docs_required") {
                    badge.textContent = "Documents Required";
                    badge.className = "badge badge-docs-required";
                } else if (finStatus === "UNDER_REVIEW" || app.loan?.status === "review") {
                    badge.textContent = "Under Review";
                    badge.className = "badge badge-review";
                } else {
                    badge.textContent = "Financing Review";
                    badge.className = "badge badge-pending";
                }
            }

            const docs = getApplicationDocuments(app);
            const docBtn = row.querySelector(".doc-status-text-btn, .btn-underwrite");
            if (docBtn) {
                const countText = docs.filter(doc => doc.submitted).length + "/" + docs.length;
                docBtn.textContent = countText;
                docBtn.setAttribute("aria-label", "View documents for " + app.id + ": " + countText + " submitted");
                docBtn.setAttribute("aria-haspopup", "dialog");
            }

            // Keep decision buttons enabled and clickable at all times
            row.querySelectorAll("[data-decision], .btn-decision-accept, .btn-decision-decline").forEach(button => {
                button.disabled = false;
                button.removeAttribute("disabled");
            });

            if (row.closest("#attentionTable")) {
                row.hidden = !["pending", "review", "docs_required"].includes(app.loan?.status);
            }
        });
        document.querySelectorAll("#approvedTable tbody tr").forEach(row => {
            const contract = data.approvedContracts?.find(c => c.appId === row.dataset.appid);
            const app = data.applications?.find(a => a.id === row.dataset.appid);
            const decision = contract?.decision || app?.loan?.status;
            if (contract?.decision) row.dataset.status = contract.decision === "approved" ? "Approved" : "Declined";
            const completed = row.querySelector('[data-label="Repayment Status"] .btn-status-pill, [data-label="Status"] .btn-status-pill');
            if (completed && app?.repaymentStatus) {
                completed.innerHTML = `<span class="dot"></span> ${app.repaymentStatus}`;
            }
        });
    }

    document.addEventListener("click", event => {
        const button = event.target.closest("[data-decision], .btn-decision-accept, .btn-decision-decline");
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        activeUnderwriteRow = button.closest("tr");
        currentAppId = button.dataset.appid || activeUnderwriteRow?.dataset?.appid;
        if (!currentAppId) return;
        const store = window.HelloSolarStore ? window.HelloSolarStore.getPortalData() : null;
        const app = store?.applications?.find(a => a.id === currentAppId);
        currentBorrowerName = app?.applicant?.name || activeUnderwriteRow?.dataset?.borrower || "Applicant";
        const decision = button.dataset.decision || (button.classList.contains("btn-decision-accept") ? "approved" : "rejected");
        if (decision === "approved") {
            acceptApplication();
        } else {
            declineApplication();
        }
    });

    // Handle Request Documents Action
    const requestDocBtn = document.getElementById("requestDocBtn");
    if (requestDocBtn) {
        requestDocBtn.addEventListener("click", () => {
            if (!currentAppId) return;
            const contractBlock = getContractBlockReason();
            if (contractBlock) {
                triggerToast(contractBlock);
                return;
            }

            const requested = window.HelloSolarStore && typeof window.HelloSolarStore.requestDocuments === "function"
                ? window.HelloSolarStore.requestDocuments(currentAppId)
                : null;
            if (!requested) {
                triggerToast(`Documents could not be requested for ${currentAppId}. Refresh and try again.`);
                return;
            }

            closeReviewModal();
            triggerToast(`Document verification request dispatched for ${currentAppId}. Status set to Documents Required.`);

            if (typeof window.renderApplicationsTable === "function") {
                window.renderApplicationsTable();
            } else if (typeof refreshPortalTables === "function") {
                refreshPortalTables();
            }
            window.updateAppTabCounts?.();
            window.filterApplications?.();
            if (typeof window.updateDashboardDynamicMetrics === "function") {
                window.updateDashboardDynamicMetrics();
            }

        });
    }

    window.refreshPortalTables = refreshPortalTables;
    window.getApplicationDocuments = getApplicationDocuments;

    // 8a-2. Custom Accessible Dropdowns
    function initCustomDropdowns() {
        const dropdownContainers = document.querySelectorAll(".custom-dropdown");
        if (!dropdownContainers.length) return;

        dropdownContainers.forEach((dropdown) => {
            const trigger = dropdown.querySelector(".custom-dropdown-trigger");
            const menu = dropdown.querySelector(".custom-dropdown-menu");
            const selectedText = dropdown.querySelector(".custom-dropdown-selected");
            const hiddenSelect = dropdown.querySelector("select");
            const items = dropdown.querySelectorAll(".custom-dropdown-item");

            if (!trigger || !menu) return;

            function closeDropdown() {
                dropdown.classList.remove("open");
                trigger.setAttribute("aria-expanded", "false");
            }

            function openDropdown() {
                // Close any other open dropdowns first
                document.querySelectorAll(".custom-dropdown.open").forEach((d) => {
                    if (d !== dropdown) {
                        d.classList.remove("open");
                        const otherTrigger = d.querySelector(".custom-dropdown-trigger");
                        if (otherTrigger) otherTrigger.setAttribute("aria-expanded", "false");
                    }
                });
                dropdown.classList.add("open");
                trigger.setAttribute("aria-expanded", "true");
            }

            function toggleDropdown(e) {
                e.stopPropagation();
                if (dropdown.classList.contains("open")) {
                    closeDropdown();
                } else {
                    openDropdown();
                }
            }

            trigger.addEventListener("click", toggleDropdown);

            items.forEach((item) => {
                item.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const value = item.getAttribute("data-value");
                    const textEl = item.querySelector(".custom-dropdown-item-text");
                    const label = textEl ? textEl.textContent.trim() : item.textContent.trim();

                    // Update trigger label
                    if (selectedText) selectedText.textContent = label;

                    // Update items active state
                    items.forEach((it) => {
                        it.classList.remove("active");
                        it.setAttribute("aria-selected", "false");
                    });
                    item.classList.add("active");
                    item.setAttribute("aria-selected", "true");

                    // Synchronize underlying select
                    if (hiddenSelect) {
                        hiddenSelect.value = value;
                        hiddenSelect.dispatchEvent(new Event("change", { bubbles: true }));
                    }

                    closeDropdown();
                    trigger.focus();
                });

                // Keyboard handling on items
                item.addEventListener("keydown", (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        item.click();
                    } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        const next = item.nextElementSibling;
                        if (next && next.classList.contains("custom-dropdown-item")) {
                            next.focus();
                        }
                    } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        const prev = item.previousElementSibling;
                        if (prev && prev.classList.contains("custom-dropdown-item")) {
                            prev.focus();
                        } else {
                            trigger.focus();
                        }
                    } else if (e.key === "Escape") {
                        e.preventDefault();
                        closeDropdown();
                        trigger.focus();
                    }
                });
            });

            // Trigger keyboard navigation
            trigger.addEventListener("keydown", (e) => {
                if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (!dropdown.classList.contains("open")) {
                        openDropdown();
                    }
                    const activeItem = dropdown.querySelector(".custom-dropdown-item.active") || items[0];
                    if (activeItem) activeItem.focus();
                } else if (e.key === "Escape") {
                    e.preventDefault();
                    closeDropdown();
                }
            });

            // Reset handling with parent form
            const parentForm = dropdown.closest("form");
            if (parentForm) {
                parentForm.addEventListener("reset", () => {
                    setTimeout(() => {
                        const firstItem = items[0];
                        if (firstItem) {
                            const textEl = firstItem.querySelector(".custom-dropdown-item-text");
                            const label = textEl ? textEl.textContent.trim() : firstItem.textContent.trim();
                            if (selectedText) selectedText.textContent = label;
                            items.forEach((it, idx) => {
                                if (idx === 0) {
                                    it.classList.add("active");
                                    it.setAttribute("aria-selected", "true");
                                } else {
                                    it.classList.remove("active");
                                    it.setAttribute("aria-selected", "false");
                                }
                            });
                        }
                        closeDropdown();
                    }, 10);
                });
            }
        });

        // Close when clicking outside
        document.addEventListener("click", (e) => {
            if (!e.target.closest(".custom-dropdown")) {
                document.querySelectorAll(".custom-dropdown.open").forEach((d) => {
                    d.classList.remove("open");
                    const trigger = d.querySelector(".custom-dropdown-trigger");
                    if (trigger) trigger.setAttribute("aria-expanded", "false");
                });
            }
        });
    }

    initCustomDropdowns();


});
