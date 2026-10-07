/**
 * ==========================================================================
 * HELLO SOLAR INSTALLER DASHBOARD
 * Mobile drawer navigation, profile management, any-size avatar upload,
 * dynamic initials & instant topbar avatar synchronization
 * ==========================================================================
 */

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
    // 1B. STICKY TOPBAR SCROLL STATE
    // --------------------------------------------------------------------------
    const topbarEl = document.querySelector(".topbar");
    if (topbarEl) {
        const handleTopbarScroll = () => {
            if (window.scrollY > 4) {
                topbarEl.classList.add("scrolled");
            } else {
                topbarEl.classList.remove("scrolled");
            }
        };
        window.addEventListener("scroll", handleTopbarScroll, { passive: true });
        handleTopbarScroll();
    }

    // --------------------------------------------------------------------------
    // 2. LOGOUT HANDLER (STATIC & DYNAMIC DELEGATION)
    // --------------------------------------------------------------------------
    document.addEventListener("click", (e) => {
        const logoutTrigger = e.target.closest(".logout, #logout, [data-action='logout']");
        if (logoutTrigger) {
            if (window.HSShared) window.HSShared.session.clear("installer");
        }
    });

    document.querySelectorAll(".logout, #logout").forEach(btn => {
        btn.addEventListener("click", () => {
            if (window.HSShared) window.HSShared.session.clear("installer");
        });
    });

    // --------------------------------------------------------------------------
    // 3. PROFILE DATA & AVATAR HELPERS
    // --------------------------------------------------------------------------
    // Installer profile = shared INS-### account record (+ its installer-owned profile details) and the
    // installer session. No demo profile defaults are applied to other accounts.
    const PROFILE_EXTRAS = {
        licenseNo: "",
        prcNo: "",
        coverageArea: "",
        specialization: "",
        bio: "",
        payoutMethod: "",
        totalCapacityKwp: 0
    };
    const DEFAULT_INSTALLER_PROFILE = Object.assign({ avatarUrl: "" }, PROFILE_EXTRAS);
    const avatarKey = accountId => "hello_solar_installer_avatar:" + accountId;

    function getStoredProfile() {
        const session = window.HSShared ? window.HSShared.session.get("installer") : null;
        if (!session) return Object.assign({}, DEFAULT_INSTALLER_PROFILE);
        const record = window.HSShared.getAccount("installer", session.accountId) || {};
        let avatarUrl = "";
        try { avatarUrl = localStorage.getItem(avatarKey(session.accountId)) || ""; } catch (e) { avatarUrl = ""; }
        return Object.assign({}, PROFILE_EXTRAS, record.profile || {}, {
            username: session.username || record.email || "",
            email: record.email || session.email || "",
            businessName: record.name || session.businessName || "",
            fullName: record.contact || session.fullName || "",
            phone: record.phone || "",
            installerId: session.accountId,
            completedJobs: record.completedJobs != null ? record.completedJobs : 0,
            rating: record.rating != null ? record.rating : null,
            avatarUrl
        });
    }

    function saveStoredProfile(profileObj) {
        const session = window.HSShared ? window.HSShared.session.get("installer") : null;
        if (!session) return;
        const extras = {};
        Object.keys(PROFILE_EXTRAS).forEach(key => {
            if (profileObj[key] !== undefined) extras[key] = profileObj[key];
        });
        const result = window.HSShared.update(store => {
            const record = (store.installers || []).find(i => i.id === session.accountId);
            if (!record) return { ok: false, error: "Installer account not found." };
            if (profileObj.businessName) record.name = profileObj.businessName;
            if (profileObj.fullName) record.contact = profileObj.fullName;
            if (profileObj.phone !== undefined) record.phone = profileObj.phone;
            record.profile = Object.assign({}, record.profile || {}, extras);
        }, { name: "profile.update", payload: { role: "installer", accountId: session.accountId, fields: { name: profileObj.businessName, contact: profileObj.fullName, phone: profileObj.phone, profile: extras } } });
        if (!result.ok) console.error("Could not save profile:", result.error);
        try {
            if (profileObj.avatarUrl) localStorage.setItem(avatarKey(session.accountId), profileObj.avatarUrl);
            else localStorage.removeItem(avatarKey(session.accountId));
        } catch (e) {
            console.error("Could not save profile photo:", e);
        }
        window.HSShared.session.patch("installer", { businessName: profileObj.businessName, fullName: profileObj.fullName, phone: profileObj.phone });
    }

    function computeInitials(name) {
        if (!name) return "SI";
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return "SI";
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function renderAvatar(el, profileObj) {
        if (!el) return;
        const name = profileObj.businessName || profileObj.fullName || profileObj.username || "SolarTech Installer";
        const initials = computeInitials(name);

        if (profileObj.avatarUrl && profileObj.avatarUrl.trim() !== "") {
            el.innerHTML = `<img class="profile-avatar-img" src="${profileObj.avatarUrl}" alt="${name}">`;
        } else {
            el.innerHTML = initials;
        }
    }

    // --------------------------------------------------------------------------
    // 4. ANY-SIZE CLIENT-SIDE IMAGE PROCESSOR & COMPRESSOR
    // Automatically downscales and center-crops ANY image file size (1MB to 50MB+)
    // to a high-definition 480x480 square JPEG data URL (~25-45KB).
    // --------------------------------------------------------------------------
    function processImageFile(file, callback, errorCallback) {
        if (!file) return;
        if (!file.type || !file.type.startsWith("image/")) {
            if (errorCallback) errorCallback("Please choose an image file (PNG, JPG, WebP, SVG).");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            if (file.type === "image/svg+xml") {
                callback(event.target.result);
                return;
            }

            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement("canvas");
                    const maxDim = 480;
                    const w = img.width;
                    const h = img.height;

                    const minSide = Math.min(w, h);
                    const sx = (w - minSide) / 2;
                    const sy = (h - minSide) / 2;

                    canvas.width = Math.min(minSide, maxDim);
                    canvas.height = Math.min(minSide, maxDim);

                    const ctx = canvas.getContext("2d");
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = "high";
                    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, canvas.width, canvas.height);

                    const compressed = canvas.toDataURL("image/jpeg", 0.88);
                    callback(compressed);
                } catch (err) {
                    console.warn("Canvas crop fallback:", err);
                    callback(event.target.result);
                }
            };
            img.onerror = () => {
                if (errorCallback) errorCallback("Could not decode image file.");
            };
            img.src = event.target.result;
        };
        reader.onerror = () => {
            if (errorCallback) errorCallback("Failed to read image file.");
        };
        reader.readAsDataURL(file);
    }

    // Realistic SVG Picture Presets
    const PRESET_PICTURES = {
        officer: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="#0f172a"/><circle cx="60" cy="46" r="24" fill="#fed7aa"/><path d="M22 110c0-25 18-38 38-38s38 13 38 38" fill="#1e293b"/><path d="M48 72h24l-8 24h-8z" fill="#ff8a00"/><circle cx="88" cy="88" r="16" fill="#ff8a00"/><text x="88" y="93" font-size="14" font-weight="bold" text-anchor="middle" fill="#ffffff">👔</text></svg>`),
        engineer: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="#1e293b"/><circle cx="60" cy="48" r="24" fill="#fde68a"/><path d="M22 110c0-25 18-38 38-38s38 13 38 38" fill="#ea580c"/><circle cx="88" cy="88" r="16" fill="#10b981"/><text x="88" y="93" font-size="14" font-weight="bold" text-anchor="middle" fill="#ffffff">👷</text></svg>`),
        pro: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="#0c4a6e"/><circle cx="60" cy="46" r="24" fill="#fed7aa"/><path d="M22 110c0-25 18-38 38-38s38 13 38 38" fill="#0369a1"/><circle cx="88" cy="88" r="16" fill="#f59e0b"/><text x="88" y="93" font-size="14" font-weight="bold" text-anchor="middle" fill="#ffffff">⚡</text></svg>`),
        solar: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="#18181b"/><circle cx="60" cy="40" r="18" fill="#facc15"/><g fill="#38bdf8"><polygon points="26,68 56,68 52,106 18,106"/><polygon points="64,68 94,68 102,106 70,106"/></g></svg>`),
        storage: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="#064e3b"/><rect x="35" y="32" width="50" height="74" rx="8" fill="#10b981"/><rect x="48" y="24" width="24" height="8" rx="2" fill="#34d399"/><text x="60" y="74" font-size="28" font-weight="bold" text-anchor="middle" fill="#ffffff">⚡</text></svg>`)
    };

    function syncAllProfileDisplays() {
        const profile = getStoredProfile();
        const fullName = profile.fullName || "Alex Rivera";
        const teamName = profile.businessName || "SolarTech Installer";
        const displayName = teamName;
        const initials = computeInitials(fullName);

        // 1. Topbar elements - IMMEDIATELY updates every topbar avatar with chosen picture!
        document.querySelectorAll(".profile-name").forEach(el => {
            el.textContent = displayName;
        });

        document.querySelectorAll(".profile-avatar").forEach(el => {
            renderAvatar(el, profile);
        });

        // 2. Simplified Profile Page Elements
        const displayProfileName = document.getElementById("displayProfileName");
        if (displayProfileName) displayProfileName.textContent = fullName;

        const displayProfileSub = document.getElementById("displayProfileSub");
        if (displayProfileSub) displayProfileSub.textContent = `Installer · ${teamName}`;

        const displayEmail = document.getElementById("displayEmail");
        if (displayEmail) displayEmail.textContent = profile.email || "installer@hellosolar.ph";

        const displayPhone = document.getElementById("displayPhone");
        if (displayPhone) displayPhone.textContent = profile.phone || "+63 917 555 0199";

        const displayTeam = document.getElementById("displayTeam");
        if (displayTeam) displayTeam.textContent = teamName;

        const displayCoverageArea = document.getElementById("displayCoverageArea");
        if (displayCoverageArea) displayCoverageArea.textContent = profile.coverageArea || "Metro Manila, Cavite, Laguna, Rizal";

        const displaySpecialization = document.getElementById("displaySpecialization");
        if (displaySpecialization) displaySpecialization.textContent = profile.specialization || "Rooftop Grid-Tie & Hybrid Solar";

        const displayPayoutMethod = document.getElementById("displayPayoutMethod");
        if (displayPayoutMethod) displayPayoutMethod.textContent = profile.payoutMethod || "BDO Unibank · Acct ending in 8841 (On File)";

        const displayLicenseNo = document.getElementById("displayLicenseNo");
        if (displayLicenseNo) displayLicenseNo.textContent = `#${(profile.licenseNo || "2024-8841").replace(/^[^\d]*/, "") || "2024-8841"}`;

        const displayPrcNo = document.getElementById("displayPrcNo");
        if (displayPrcNo) displayPrcNo.textContent = `#${(profile.prcNo || "0078421").replace(/^[^\d]*/, "") || "0078421"}`;

        // 1C. Header Quick Profile Modal Synchronization
        const headerModalAvatar = document.getElementById("headerModalAvatar");
        if (headerModalAvatar) renderAvatar(headerModalAvatar, profile);
        const headerModalName = document.getElementById("headerModalName");
        if (headerModalName) headerModalName.textContent = fullName;
        const headerModalTeam = document.getElementById("headerModalTeam");
        if (headerModalTeam) headerModalTeam.textContent = teamName;
        const headerModalEmail = document.getElementById("headerModalEmail");
        if (headerModalEmail) headerModalEmail.textContent = profile.email || "installer@hellosolar.ph";
        const headerModalPhone = document.getElementById("headerModalPhone");
        if (headerModalPhone) headerModalPhone.textContent = profile.phone || "+63 917 555 0199";

        // Backward compatibility for hero elements
        const heroNameEl = document.getElementById("heroProfileName");
        if (heroNameEl) heroNameEl.textContent = fullName;

        const heroSubEl = document.getElementById("heroProfileSub");
        if (heroSubEl) {
            heroSubEl.innerHTML = `
                <span>${fullName}</span> · 
                <span class="installer-status-pill status-pill-green">Verified Partner</span>
            `;
        }

        const heroAvatarEl = document.getElementById("heroProfileAvatar");
        if (heroAvatarEl) {
            const photoBtn = heroAvatarEl.querySelector(".avatar-photo-btn");
            if (profile.avatarUrl && profile.avatarUrl.trim() !== "") {
                heroAvatarEl.innerHTML = `<img class="profile-avatar-img" src="${profile.avatarUrl}" alt="${fullName}">`;
            } else {
                heroAvatarEl.innerHTML = `<span id="heroAvatarInitials">${initials}</span>`;
            }
            if (photoBtn) {
                heroAvatarEl.appendChild(photoBtn);
            }
        }

        // 3. Modal live preview & avatar
        const avatarWrap = document.getElementById("modalAvatarWrap");
        if (avatarWrap) {
            if (profile.avatarUrl && profile.avatarUrl.trim() !== "") {
                avatarWrap.innerHTML = `<img class="profile-avatar-img" src="${profile.avatarUrl}" alt="${fullName}">`;
            } else {
                avatarWrap.innerHTML = `<span id="modalAvatarInitials">${initials}</span>`;
            }
        }

        const previewLiveName = document.getElementById("previewLiveName");
        if (previewLiveName) previewLiveName.textContent = fullName;

        const previewLiveSub = document.getElementById("previewLiveSub");
        if (previewLiveSub) previewLiveSub.textContent = `Installer · ${teamName}`;

        const previewLiveArea = document.getElementById("previewLiveArea");
        if (previewLiveArea) previewLiveArea.textContent = (profile.coverageArea || "Metro Manila").split(',')[0].trim();

        // 4. Update Initials buttons
        document.querySelectorAll(".avatar-preset-btn.initials-btn").forEach(el => {
            el.textContent = initials;
            el.classList.toggle("active", !profile.avatarUrl || profile.avatarUrl.trim() === "");
        });

        // 5. Update active preset button highlight
        document.querySelectorAll(".avatar-preset-btn:not(.initials-btn)").forEach(btn => {
            const key = btn.getAttribute("data-preset");
            const isMatch = profile.avatarUrl && PRESET_PICTURES[key] && profile.avatarUrl === PRESET_PICTURES[key];
            btn.classList.toggle("active", Boolean(isMatch));
        });

        // 6. Stats elements
        const statJobs = document.getElementById("statCompletedJobs");
        if (statJobs) statJobs.textContent = `${profile.completedJobs || 48} Projects`;

        const statCap = document.getElementById("statInstalledCapacity");
        if (statCap) statCap.textContent = `${profile.totalCapacityKwp || 288} kWp`;

        const statRate = document.getElementById("statCustomerRating");
        if (statRate) statRate.textContent = `${profile.rating || 4.95} ★`;

        const payoutEl = document.getElementById("sidebarPayoutMethod");
        if (payoutEl) payoutEl.textContent = profile.payoutMethod || "BDO Unibank (Verified)";

        // 7. Form fields on profile.html (only sync if not currently being typed in)
        const formFields = [
            { id: "pageBusinessName", val: profile.businessName },
            { id: "pageFullName", val: profile.fullName },
            { id: "pageEmail", val: profile.email },
            { id: "pagePhone", val: profile.phone },
            { id: "pageLicenseNo", val: profile.licenseNo },
            { id: "pagePrcNo", val: profile.prcNo },
            { id: "pageCoverageArea", val: profile.coverageArea },
            { id: "pageSpecialization", val: profile.specialization },
            { id: "pageBio", val: profile.bio }
        ];

        formFields.forEach(item => {
            const input = document.getElementById(item.id);
            if (input && document.activeElement !== input) {
                input.value = item.val || "";
            }
        });

        // 8. Digital Installer Gate Pass / ID Badge elements
        const badgeContractorName = document.getElementById("badgeContractorName");
        if (badgeContractorName) badgeContractorName.textContent = fullName;

        const badgeContractorCompany = document.getElementById("badgeContractorCompany");
        if (badgeContractorCompany) badgeContractorCompany.textContent = teamName;

        const badgeLicenseVal = document.getElementById("badgeLicenseVal");
        if (badgeLicenseVal) badgeLicenseVal.textContent = profile.licenseNo || "#2024-8841";

        const badgePrcVal = document.getElementById("badgePrcVal");
        if (badgePrcVal) badgePrcVal.textContent = profile.prcNo || "#0078421";

        const badgeAvatarWrap = document.getElementById("badgeAvatarWrap");
        if (badgeAvatarWrap) {
            if (profile.avatarUrl && profile.avatarUrl.trim() !== "") {
                badgeAvatarWrap.innerHTML = `<img src="${profile.avatarUrl}" alt="${fullName}">`;
            } else {
                badgeAvatarWrap.innerHTML = `<span id="badgeAvatarInitials">${initials}</span>`;
            }
        }
    }

    // Initial render
    syncAllProfileDisplays();

    // --------------------------------------------------------------------------
    // 5. PROFILE HELPERS & DEDICATED PROFILE PAGE
    // --------------------------------------------------------------------------
    let currentAvatarDataUrl = "";
    const pageBusinessName = document.getElementById("pageBusinessName");
    const pageFullName = document.getElementById("pageFullName");
    const pageEmail = document.getElementById("pageEmail");
    const pagePhone = document.getElementById("pagePhone");
    const pageLicenseNo = document.getElementById("pageLicenseNo");
    const pagePrcNo = document.getElementById("pagePrcNo");
    const pageCoverageArea = document.getElementById("pageCoverageArea");
    const pageSpecialization = document.getElementById("pageSpecialization");
    const pageBio = document.getElementById("pageBio");

    const heroAvatarEl = document.getElementById("heroProfileAvatar");
    const pageAvatarInput = document.getElementById("pageAvatarFileInput");
    const btnPageRemoveAvatar = document.getElementById("btnPageRemoveAvatar");
    const btnSavePageProfile = document.getElementById("btnSavePageProfile");

    // Real-time initials update as user types business or contractor name
    function handlePageNameInput() {
        const currentProfile = getStoredProfile();
        const liveName = (pageBusinessName && pageBusinessName.value.trim()) ||
                         (pageFullName && pageFullName.value.trim()) ||
                         "SolarTech Installer";

        // Update hero title in real time
        const heroNameEl = document.getElementById("heroProfileName");
        if (heroNameEl) heroNameEl.textContent = liveName;

        // If no custom picture is set, dynamically update initials on hero & topbar!
        if (!currentProfile.avatarUrl || currentProfile.avatarUrl.trim() === "") {
            const initials = computeInitials(liveName);
            if (heroAvatarEl) heroAvatarEl.textContent = initials;
            document.querySelectorAll(".profile-avatar").forEach(el => {
                el.textContent = initials;
            });
            document.querySelectorAll(".avatar-preset-btn.initials-btn").forEach(el => {
                el.textContent = initials;
            });
        }
    }

    if (pageBusinessName) pageBusinessName.addEventListener("input", handlePageNameInput);
    if (pageFullName) pageFullName.addEventListener("input", handlePageNameInput);

    // Modal Elements & Handlers: Edit Profile Studio
    const editProfileModal = document.getElementById("editProfileModal");
    const btnOpenEditProfile = document.getElementById("btnOpenEditProfile");
    const btnCloseEditProfile = document.getElementById("btnCloseEditProfile");
    const btnCancelEditProfile = document.getElementById("btnCancelEditProfile");
    const modalAvatarInput = document.getElementById("modalAvatarFileInput");

    function openEditProfileModal() {
        if (!editProfileModal) return;
        syncAllProfileDisplays();
        editProfileModal.style.display = "flex";
        editProfileModal.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function closeEditProfileModal() {
        if (!editProfileModal) return;
        editProfileModal.classList.remove("open");
        editProfileModal.style.display = "none";
        document.body.style.overflow = "";
    }

    if (btnOpenEditProfile) btnOpenEditProfile.addEventListener("click", openEditProfileModal);
    if (btnCloseEditProfile) btnCloseEditProfile.addEventListener("click", closeEditProfileModal);
    if (btnCancelEditProfile) btnCancelEditProfile.addEventListener("click", closeEditProfileModal);

    if (editProfileModal) {
        editProfileModal.addEventListener("click", (e) => {
            if (e.target === editProfileModal) closeEditProfileModal();
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && editProfileModal.style.display === "flex") {
                closeEditProfileModal();
            }
        });
    }

    // Modal Elements & Handlers: Digital Installer Gate Pass / ID Card
    const digitalIdModal = document.getElementById("digitalIdModal");
    const btnOpenDigitalId = document.getElementById("btnOpenDigitalId");
    const btnOpenDigitalIdFromCard = document.getElementById("btnOpenDigitalIdFromCard");
    const btnCloseDigitalIdHeader = document.getElementById("btnCloseDigitalIdHeader");
    const btnCloseDigitalId = document.getElementById("btnCloseDigitalId");
    const btnCopyVerifyLink = document.getElementById("btnCopyVerifyLink");
    const btnPrintIdPass = document.getElementById("btnPrintIdPass");

    function openDigitalIdModal() {
        if (!digitalIdModal) return;
        syncAllProfileDisplays();
        digitalIdModal.style.display = "flex";
        digitalIdModal.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function closeDigitalIdModal() {
        if (!digitalIdModal) return;
        digitalIdModal.classList.remove("open");
        digitalIdModal.style.display = "none";
        document.body.style.overflow = "";
    }

    if (btnOpenDigitalId) btnOpenDigitalId.addEventListener("click", openDigitalIdModal);
    if (btnOpenDigitalIdFromCard) btnOpenDigitalIdFromCard.addEventListener("click", openDigitalIdModal);
    if (btnCloseDigitalIdHeader) btnCloseDigitalIdHeader.addEventListener("click", closeDigitalIdModal);
    if (btnCloseDigitalId) btnCloseDigitalId.addEventListener("click", closeDigitalIdModal);

    if (digitalIdModal) {
        digitalIdModal.addEventListener("click", (e) => {
            if (e.target === digitalIdModal) closeDigitalIdModal();
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && digitalIdModal.style.display === "flex") {
                closeDigitalIdModal();
            }
        });
    }

    if (btnCopyVerifyLink) {
        btnCopyVerifyLink.addEventListener("click", async () => {
            const verifyUrl = "https://portal.hellosolar.ph/verify/HS-INST-2026-08841";
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(verifyUrl);
                } else {
                    const tempInput = document.createElement("input");
                    tempInput.value = verifyUrl;
                    document.body.appendChild(tempInput);
                    tempInput.select();
                    document.execCommand("copy");
                    document.body.removeChild(tempInput);
                }
                const originalHtml = btnCopyVerifyLink.innerHTML;
                btnCopyVerifyLink.innerHTML = `<span>Copied Link! ✓</span>`;
                showProfileToast("Verification link copied to clipboard! ✓");
                setTimeout(() => {
                    btnCopyVerifyLink.innerHTML = originalHtml;
                }, 2000);
            } catch (err) {
                console.warn("Clipboard copy failed:", err);
                showProfileToast("Verification ID: HS-INST-2026-08841");
            }
        });
    }

    if (btnPrintIdPass) {
        btnPrintIdPass.addEventListener("click", () => {
            window.print();
        });
    }

    // Avatar File Upload Handler
    function handleAvatarFileUpload(file) {
        if (!file) return;
        processImageFile(file, (optimizedDataUrl) => {
            const profile = getStoredProfile();
            profile.avatarUrl = optimizedDataUrl;
            saveStoredProfile(profile);
            currentAvatarDataUrl = optimizedDataUrl;
            syncAllProfileDisplays();
            showProfileToast("Profile picture updated! ✓");
            window.dispatchEvent(new CustomEvent("helloSolarProfileUpdated", { detail: profile }));
        }, (errMsg) => {
            showProfileToast(errMsg);
        });
    }

    if (pageAvatarInput) {
        pageAvatarInput.addEventListener("change", (e) => {
            const file = e.target.files && e.target.files[0];
            handleAvatarFileUpload(file);
        });
    }

    if (modalAvatarInput) {
        modalAvatarInput.addEventListener("change", (e) => {
            const file = e.target.files && e.target.files[0];
            handleAvatarFileUpload(file);
        });
    }

    // Preset Pictures: Clicking ANY preset button immediately changes avatar!
    document.addEventListener("click", (e) => {
        const presetBtn = e.target.closest(".avatar-preset-btn");
        if (!presetBtn) return;
        e.preventDefault();

        const presetKey = presetBtn.getAttribute("data-preset");

        // If user clicked the Initials button:
        if (presetBtn.classList.contains("initials-btn") || presetKey === "initials") {
            const profile = getStoredProfile();
            profile.avatarUrl = "";
            currentAvatarDataUrl = "";
            saveStoredProfile(profile);
            syncAllProfileDisplays();
            showProfileToast("Switched to dynamic name initials! ✓");
            window.dispatchEvent(new CustomEvent("helloSolarProfileUpdated", { detail: profile }));
            return;
        }

        // If user clicked a Picture Preset:
        const dataUrl = PRESET_PICTURES[presetKey];
        if (dataUrl) {
            currentAvatarDataUrl = dataUrl;
            const profile = getStoredProfile();
            profile.avatarUrl = dataUrl;
            saveStoredProfile(profile);
            syncAllProfileDisplays();
            showProfileToast("Chosen picture displayed! ✓");
            window.dispatchEvent(new CustomEvent("helloSolarProfileUpdated", { detail: profile }));
        }
    });

    // Revert to initials button on profile page / modal
    if (btnPageRemoveAvatar) {
        btnPageRemoveAvatar.addEventListener("click", () => {
            const profile = getStoredProfile();
            profile.avatarUrl = "";
            saveStoredProfile(profile);
            currentAvatarDataUrl = "";
            if (pageAvatarInput) pageAvatarInput.value = "";
            if (modalAvatarInput) modalAvatarInput.value = "";

            syncAllProfileDisplays();
            showProfileToast("Picture removed. Showing dynamic initials! ✓");
            window.dispatchEvent(new CustomEvent("helloSolarProfileUpdated", { detail: profile }));
        });
    }

    // Philippine phone validation: +63 or 0 followed by 9–10 digits (spaces, dashes, parentheses allowed)
    function validateProfilePhone() {
        if (!pagePhone) return true;
        const raw = pagePhone.value.trim();
        const digits = raw.replace(/[\s\-()]/g, "");
        const valid = !raw || (/^[+\d\s\-()]+$/.test(raw) && /^(\+63|0)\d{9,10}$/.test(digits));
        pagePhone.setCustomValidity(valid ? "" : "Enter a valid Philippine phone number, e.g. +63 917 555 0199 or 0917 555 0199.");
        return valid;
    }
    if (pagePhone) pagePhone.addEventListener("input", validateProfilePhone);

    // Save Profile Changes from edit profile modal
    if (btnSavePageProfile) {
        btnSavePageProfile.addEventListener("click", (e) => {
            e.preventDefault();

            const form = document.getElementById("pageProfileForm");
            validateProfilePhone();
            if (form && !form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const profile = getStoredProfile();

            if (pageBusinessName && pageBusinessName.value.trim()) {
                profile.businessName = pageBusinessName.value.trim();
            }
            if (pageFullName && pageFullName.value.trim()) {
                profile.fullName = pageFullName.value.trim();
            }
            if (pageEmail && pageEmail.value.trim()) {
                profile.email = pageEmail.value.trim();
            }
            if (pagePhone && pagePhone.value.trim()) {
                profile.phone = pagePhone.value.trim();
            }
            if (pageLicenseNo) profile.licenseNo = pageLicenseNo.value.trim();
            if (pagePrcNo) profile.prcNo = pagePrcNo.value.trim();
            if (pageCoverageArea) profile.coverageArea = pageCoverageArea.value.trim();
            if (pageSpecialization) profile.specialization = pageSpecialization.value.trim();
            if (pageBio) profile.bio = pageBio.value.trim();

            saveStoredProfile(profile);
            syncAllProfileDisplays();
            closeEditProfileModal();
            showProfileToast("Profile changes saved successfully! ✓");

            window.dispatchEvent(new CustomEvent("helloSolarProfileUpdated", { detail: profile }));
        });
    }

    // Modal Tabs Switching (Personal, Team, Licenses)
    document.querySelectorAll(".modal-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            document.querySelectorAll(".modal-tab-btn").forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-selected", "false");
            });
            btn.classList.add("active");
            btn.setAttribute("aria-selected", "true");

            document.querySelectorAll(".tab-pane").forEach(pane => {
                const isActive = (pane.id === targetTab);
                pane.style.display = isActive ? "block" : "none";
                pane.classList.toggle("active", isActive);
            });
        });
    });

    // Real-Time Modal Live Preview Sync as user types
    function handleLivePreviewInput() {
        const liveName = (pageFullName && pageFullName.value.trim()) || "Alex Rivera";
        const liveTeam = (pageBusinessName && pageBusinessName.value.trim()) || "SolarTech Installer";
        const liveArea = (pageCoverageArea && pageCoverageArea.value.trim()) || "Metro Manila";

        const pName = document.getElementById("previewLiveName");
        if (pName) pName.textContent = liveName;

        const pSub = document.getElementById("previewLiveSub");
        if (pSub) pSub.textContent = `Installer · ${liveTeam}`;

        const pArea = document.getElementById("previewLiveArea");
        if (pArea) pArea.textContent = liveArea.split(",")[0].trim();
    }

    if (pageFullName) pageFullName.addEventListener("input", handleLivePreviewInput);
    if (pageBusinessName) pageBusinessName.addEventListener("input", handleLivePreviewInput);
    if (pageCoverageArea) pageCoverageArea.addEventListener("input", handleLivePreviewInput);

    // Interactive Copy-to-Clipboard Buttons
    document.querySelectorAll(".btn-copy").forEach(btn => {
        btn.addEventListener("click", async () => {
            const targetId = btn.getAttribute("data-copy-target");
            const targetEl = document.getElementById(targetId);
            if (!targetEl) return;
            const textToCopy = targetEl.textContent.trim();
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(textToCopy);
                } else {
                    const tempInput = document.createElement("input");
                    tempInput.value = textToCopy;
                    document.body.appendChild(tempInput);
                    tempInput.select();
                    document.execCommand("copy");
                    document.body.removeChild(tempInput);
                }
                const originalHtml = btn.innerHTML;
                btn.classList.add("copied");
                btn.innerHTML = `<span>Copied! ✓</span>`;
                setTimeout(() => {
                    btn.classList.remove("copied");
                    btn.innerHTML = originalHtml;
                }, 1800);
            } catch (err) {
                console.warn("Clipboard copy failed:", err);
            }
        });
    });

    // Reset Defaults Action inside Edit Profile Modal
    const btnResetDefaults = document.getElementById("btnResetProfileDefaults");
    if (btnResetDefaults) {
        btnResetDefaults.addEventListener("click", () => {
            if (confirm("Restore demo profile settings to defaults?")) {
                saveStoredProfile(Object.assign(getStoredProfile(), DEFAULT_INSTALLER_PROFILE));
                syncAllProfileDisplays();
                showProfileToast("Restored profile defaults! ✓");
            }
        });
    }

    // Toggle Accreditation Extra Details
    const btnToggleAccreditation = document.getElementById("btnToggleAccreditation");
    const accreditationExtraDetails = document.getElementById("accreditationExtraDetails");
    if (btnToggleAccreditation && accreditationExtraDetails) {
        btnToggleAccreditation.addEventListener("click", () => {
            const isHidden = accreditationExtraDetails.hidden;
            accreditationExtraDetails.hidden = !isHidden;
            btnToggleAccreditation.textContent = isHidden ? "See less" : "See details";
            btnToggleAccreditation.setAttribute("aria-expanded", String(isHidden));
        });
    }

    // Cross-tab and global synchronization
    window.addEventListener("helloSolarProfileUpdated", () => {
        syncAllProfileDisplays();
    });

    window.addEventListener("storage", (e) => {
        if (e.key && e.key.includes("hello_solar")) {
            syncAllProfileDisplays();
        }
    });

    // --------------------------------------------------------------------------
    // 7. TOAST NOTIFICATION HELPER
    // --------------------------------------------------------------------------
    function showProfileToast(message) {
        let toastEl = document.getElementById("profileToast");
        if (!toastEl) {
            toastEl = document.createElement("div");
            toastEl.id = "profileToast";
            toastEl.className = "profile-toast";
            document.body.appendChild(toastEl);
        }

        toastEl.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>${message}</span>
        `;

        toastEl.classList.add("show");
        clearTimeout(window._profileToastTimer);
        window._profileToastTimer = setTimeout(() => {
            toastEl.classList.remove("show");
        }, 3500);
    }

    // --------------------------------------------------------------------------
    // 8. HEADER QUICK PROFILE MODAL & LOGOUT CONTROLLER
    // Injects and handles quick profile modal with profile info and logout action
    // --------------------------------------------------------------------------
    function initHeaderProfileModal() {
        let modalEl = document.getElementById("headerProfileModal");
        if (!modalEl) {
            modalEl = document.createElement("div");
            modalEl.id = "headerProfileModal";
            modalEl.className = "header-profile-modal-backdrop";
            modalEl.setAttribute("role", "dialog");
            modalEl.setAttribute("aria-modal", "true");
            modalEl.setAttribute("aria-labelledby", "headerProfileTitle");
            modalEl.innerHTML = `
                <div class="header-profile-modal-card">
                    <div class="header-profile-modal-header">
                        <span class="header-profile-modal-title" id="headerProfileTitle">Installer Account</span>
                        <button type="button" class="header-profile-modal-close" id="btnCloseHeaderProfileModal" aria-label="Close profile modal">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="header-profile-modal-body">
                        <div class="header-profile-identity">
                            <div class="header-profile-avatar-large" id="headerModalAvatar">SI</div>
                            <div class="header-profile-info">
                                <div class="header-profile-name" id="headerModalName">Alex Rivera</div>
                                <div class="header-profile-team" id="headerModalTeam">SolarTech Installer</div>
                                <span class="header-profile-badge">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                    <span>Tier 1 Accredited</span>
                                </span>
                            </div>
                        </div>

                        <div class="header-profile-details">
                            <div class="header-profile-detail-item">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                                <span id="headerModalEmail">installer@hellosolar.ph</span>
                            </div>
                            <div class="header-profile-detail-item">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                </svg>
                                <span id="headerModalPhone">+63 917 555 0199</span>
                            </div>
                        </div>

                        <div class="header-profile-nav">
                            <a href="profile.html" class="header-profile-link" id="headerModalLinkProfile">
                                <div class="header-profile-link-left">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                    <span>View / Edit Profile</span>
                                </div>
                                <span class="header-profile-link-arrow">→</span>
                            </a>
                            <a href="profile.html?action=digital-id" class="header-profile-link" id="headerModalLinkDigitalId">
                                <div class="header-profile-link-left">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                                        <line x1="7" y1="8" x2="17" y2="8"></line>
                                        <line x1="7" y1="12" x2="13" y2="12"></line>
                                        <circle cx="16" cy="14" r="1.5"></circle>
                                    </svg>
                                    <span>Digital Installer Gate Pass</span>
                                </div>
                                <span class="header-profile-link-arrow">→</span>
                            </a>
                        </div>
                    </div>

                    <div class="header-profile-modal-footer">
                        <a href="login.html" class="profile-modal-logout-btn logout" id="headerModalLogoutBtn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            <span>Log Out</span>
                        </a>
                    </div>
                </div>
            `;
            document.body.appendChild(modalEl);
        }

        const closeBtn = document.getElementById("btnCloseHeaderProfileModal");
        const linkProfile = document.getElementById("headerModalLinkProfile");
        const linkDigitalId = document.getElementById("headerModalLinkDigitalId");

        function openModal() {
            syncAllProfileDisplays();
            modalEl.classList.add("open");
            document.body.style.overflow = "hidden";
        }

        function closeModal() {
            modalEl.classList.remove("open");
            document.body.style.overflow = "";
        }

        // Attach triggers to topbar profile elements
        document.querySelectorAll(".topbar .profile, .topbar a.profile").forEach(trigger => {
            trigger.addEventListener("click", (e) => {
                e.preventDefault();
                openModal();
            });
        });

        if (closeBtn) closeBtn.addEventListener("click", closeModal);

        modalEl.addEventListener("click", (e) => {
            if (e.target === modalEl) closeModal();
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && modalEl.classList.contains("open")) {
                closeModal();
            }
        });

        if (window.location.pathname.includes("profile.html")) {
            if (linkProfile && typeof openEditProfileModal === "function") {
                linkProfile.addEventListener("click", (e) => {
                    e.preventDefault();
                    closeModal();
                    openEditProfileModal();
                });
            }
            if (linkDigitalId && typeof openDigitalIdModal === "function") {
                linkDigitalId.addEventListener("click", (e) => {
                    e.preventDefault();
                    closeModal();
                    openDigitalIdModal();
                });
            }
        }

        // Export controls to window
        window.openHeaderProfileModal = openModal;
        window.closeHeaderProfileModal = closeModal;
    }

    initHeaderProfileModal();

    // Deep link action handler for digital-id
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("action") === "digital-id" && typeof openDigitalIdModal === "function") {
        setTimeout(() => {
            openDigitalIdModal();
        }, 150);
    }

    // Export helpers to window
    window.HelloSolarProfile = {
        getProfile: getStoredProfile,
        saveProfile: saveStoredProfile,
        syncDisplays: syncAllProfileDisplays,
        openModal: () => {
            if (typeof window.openHeaderProfileModal === "function") {
                window.openHeaderProfileModal();
            }
        },
        closeModal: () => {
            if (typeof window.closeHeaderProfileModal === "function") {
                window.closeHeaderProfileModal();
            }
        },
        showToast: showProfileToast,
        computeInitials: computeInitials,
        processImageFile: processImageFile
    };

    // Auto-highlight active navigation item in bottom nav
    const activePath = window.location.pathname.split("/").pop() || "myjob.html";
    document.querySelectorAll(".mobile-bottom-nav-item").forEach(item => {
        const href = item.getAttribute("href");
        if (href && href.includes(activePath)) {
            item.classList.add("active");
            item.setAttribute("aria-current", "page");
        } else {
            item.classList.remove("active");
            item.removeAttribute("aria-current");
        }
    });
});
