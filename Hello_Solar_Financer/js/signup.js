/**
 * Hello Solar Financer Portal - Sign Up Page Logic
 * Handles interactive registration form, password strength meter, match detection, avatar selection, and account persistence.
 */

document.addEventListener("DOMContentLoaded", () => {
    const signupForm = document.getElementById("signupForm");
    const businessNameInput = document.getElementById("businessName");
    const fullNameInput = document.getElementById("fullName");
    const phoneInput = document.getElementById("phone");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const matchBadge = document.getElementById("matchBadge");
    const passwordToggle = document.getElementById("passwordToggle");
    const confirmToggle = document.getElementById("confirmToggle");
    const eyeIcon = document.getElementById("eyeIcon");
    const confirmEyeIcon = document.getElementById("confirmEyeIcon");
    const signupButton = document.getElementById("signupButton");
    const signupBtnText = document.getElementById("signupBtnText");
    const signupArrow = document.getElementById("signupArrow");
    const quickFillBtn = document.getElementById("quickFillBtn");
    const termsLink = document.getElementById("termsLink");

    const businessNameGroup = document.getElementById("businessNameGroup");
    const fullNameGroup = document.getElementById("fullNameGroup");
    const phoneGroup = document.getElementById("phoneGroup");
    const emailGroup = document.getElementById("emailGroup");
    const passwordGroup = document.getElementById("passwordGroup");
    const confirmPasswordGroup = document.getElementById("confirmPasswordGroup");
    const passwordStrengthWrap = document.getElementById("passwordStrengthWrap");
    const strengthText = document.getElementById("strengthText");
    const passwordMeterLine = document.getElementById("passwordMeterLine");
    const strSeg1 = document.getElementById("strSeg1");
    const strSeg2 = document.getElementById("strSeg2");
    const strSeg3 = document.getElementById("strSeg3");
    const strSeg4 = document.getElementById("strSeg4");

    // Toggle password visibility
    function setupToggle(button, input, icon) {
        if (!button || !input) return;
        button.addEventListener("click", (e) => {
            e.preventDefault();
            const isPassword = input.type === "password";
            input.type = isPassword ? "text" : "password";
            button.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
            if (icon) {
                if (isPassword) {
                    icon.innerHTML = `
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                        <line x1="2" y1="2" x2="22" y2="22"/>
                    `;
                } else {
                    icon.innerHTML = `
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                        <circle cx="12" cy="12" r="3"/>
                    `;
                }
            }
        });
    }

    setupToggle(passwordToggle, passwordInput, eyeIcon);
    setupToggle(confirmToggle, confirmPasswordInput, confirmEyeIcon);

    // Password Strength & Match Check
    function checkPasswordMatch() {
        if (!passwordInput || !confirmPasswordInput) return;
        const pass = passwordInput.value;
        const conf = confirmPasswordInput.value;
        if (conf && pass === conf) {
            if (matchBadge) matchBadge.classList.add("visible");
            if (confirmPasswordGroup) confirmPasswordGroup.classList.remove("invalid");
        } else {
            if (matchBadge) matchBadge.classList.remove("visible");
        }
    }

    if (passwordInput) {
        passwordInput.addEventListener("input", () => {
            const val = passwordInput.value;
            if (!val) {
                if (passwordStrengthWrap) passwordStrengthWrap.classList.remove("active");
                if (passwordMeterLine) passwordMeterLine.style.width = "0%";
                if (matchBadge) matchBadge.classList.remove("visible");
                return;
            }

            if (passwordStrengthWrap) passwordStrengthWrap.classList.add("active");
            let score = 0;
            if (val.length >= 6) score++;
            if (val.length >= 9) score++;
            if (/[0-9]/.test(val)) score++;
            if (/[^A-Za-z0-9]/.test(val) || /[A-Z]/.test(val)) score++;

            const colors = {
                1: "#ef4444",
                2: "#f59e0b",
                3: "#3b82f6",
                4: "#10b981"
            };

            const labels = {
                1: "Weak",
                2: "Fair",
                3: "Good",
                4: "Strong"
            };

            const widths = {
                1: "25%",
                2: "50%",
                3: "75%",
                4: "100%"
            };

            [strSeg1, strSeg2, strSeg3, strSeg4].forEach((seg, idx) => {
                if (seg) {
                    seg.style.background = idx < score ? (colors[score] || "#ef4444") : "var(--gray-200, #e2e8f0)";
                }
            });

            if (passwordMeterLine) {
                passwordMeterLine.style.width = widths[score] || "25%";
                passwordMeterLine.style.background = colors[score] || "#ef4444";
            }

            if (strengthText) {
                strengthText.textContent = labels[score] || "Weak";
                strengthText.style.color = colors[score] || "var(--gray-500)";
            }

            if (val.length >= 6 && passwordGroup) {
                passwordGroup.classList.remove("invalid");
            }

            checkPasswordMatch();
        });
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener("input", checkPasswordMatch);
    }

    // Real-time input clearing of error states
    if (businessNameInput && businessNameGroup) {
        businessNameInput.addEventListener("input", () => {
            if (businessNameInput.value.trim()) businessNameGroup.classList.remove("invalid");
        });
    }

    if (fullNameInput && fullNameGroup) {
        fullNameInput.addEventListener("input", () => {
            if (fullNameInput.value.trim()) fullNameGroup.classList.remove("invalid");
        });
    }

    if (phoneInput && phoneGroup) {
        phoneInput.addEventListener("input", () => {
            if (phoneInput.value.trim()) phoneGroup.classList.remove("invalid");
        });
    }

    if (emailInput && emailGroup) {
        emailInput.addEventListener("input", () => {
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (regex.test(emailInput.value.trim())) emailGroup.classList.remove("invalid");
        });
    }

    // Initials computation
    function computeInitials(name) {
        if (!name || typeof name !== "string") return "ST";
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return "ST";
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        const first = parts[0].charAt(0).toUpperCase();
        const second = (parts.length > 2 ? parts[parts.length - 1] : parts[1]).charAt(0).toUpperCase();
        return (first + second) || "ST";
    }

    // Avatar switcher in signup
    const signupAvatarPreview = document.getElementById("signupAvatarPreview");
    const signupPresetInitials = document.getElementById("signupPresetInitials");
    const signupPresetInitialsText = document.getElementById("signupPresetInitialsText");
    const signupPresetsRow = document.getElementById("signupPresetsRow");
    const signupCustomAvatarInput = document.getElementById("signupCustomAvatarInput");
    const signupResetAvatar = document.getElementById("signupResetAvatar");
    let signupSelectedAvatar = "";

    function updateSignupAvatar() {
        const name = (fullNameInput && fullNameInput.value) || (businessNameInput && businessNameInput.value) || "SolarTech Financer";
        const inits = computeInitials(name);
        if (signupPresetInitialsText) signupPresetInitialsText.textContent = inits;

        if (signupSelectedAvatar && typeof signupSelectedAvatar === "string" && signupSelectedAvatar.trim()) {
            if (signupAvatarPreview) signupAvatarPreview.innerHTML = `<img src="${signupSelectedAvatar}" alt="Chosen Avatar">`;
            if (signupPresetsRow) {
                const buttons = signupPresetsRow.querySelectorAll(".avatar-preset-btn");
                buttons.forEach(btn => {
                    if (btn.getAttribute("data-src") === signupSelectedAvatar) {
                        btn.classList.add("active");
                    } else {
                        btn.classList.remove("active");
                    }
                });
            }
            if (signupPresetInitials) signupPresetInitials.classList.remove("active");
        } else {
            if (signupAvatarPreview) signupAvatarPreview.innerHTML = `<span id="signupAvatarInitials">${inits}</span>`;
            if (signupPresetsRow) {
                const buttons = signupPresetsRow.querySelectorAll(".avatar-preset-btn");
                buttons.forEach(btn => {
                    if (btn.getAttribute("data-type") === "initials") {
                        btn.classList.add("active");
                    } else {
                        btn.classList.remove("active");
                    }
                });
            }
        }
    }

    if (signupPresetsRow) {
        const buttons = signupPresetsRow.querySelectorAll(".avatar-preset-btn");
        buttons.forEach(btn => {
            btn.addEventListener("click", () => {
                if (btn.getAttribute("data-type") === "initials") {
                    signupSelectedAvatar = "";
                    if (signupCustomAvatarInput) signupCustomAvatarInput.value = "";
                } else {
                    const src = btn.getAttribute("data-src");
                    if (src) {
                        signupSelectedAvatar = src;
                        if (signupCustomAvatarInput) signupCustomAvatarInput.value = "";
                    }
                }
                updateSignupAvatar();
            });
        });
    }

    if (signupCustomAvatarInput) {
        signupCustomAvatarInput.addEventListener("change", (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            if (!file.type.startsWith("image/")) {
                alert("Please select a valid image file.");
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                signupSelectedAvatar = event.target.result;
                updateSignupAvatar();
            };
            reader.readAsDataURL(file);
        });
    }

    if (signupResetAvatar) {
        signupResetAvatar.addEventListener("click", () => {
            signupSelectedAvatar = "";
            if (signupCustomAvatarInput) signupCustomAvatarInput.value = "";
            updateSignupAvatar();
        });
    }

    // Quick Auto-Fill
    if (quickFillBtn) {
        quickFillBtn.addEventListener("click", () => {
            if (businessNameInput) businessNameInput.value = "Solar Capital & Lending Corp.";
            if (fullNameInput) fullNameInput.value = "Ma. Elena Santos";
            if (phoneInput) phoneInput.value = "0917 888 2345";
            if (emailInput) emailInput.value = "elena@solarcapital.ph";
            if (passwordInput) passwordInput.value = "SolarFinance!2026";
            if (confirmPasswordInput) confirmPasswordInput.value = "SolarFinance!2026";
            signupSelectedAvatar = "assets/images/avatars/avatar_female_2.jpg";

            if (passwordInput) passwordInput.dispatchEvent(new Event("input"));
            if (confirmPasswordInput) confirmPasswordInput.dispatchEvent(new Event("input"));

            if (businessNameGroup) businessNameGroup.classList.remove("invalid");
            if (fullNameGroup) fullNameGroup.classList.remove("invalid");
            if (phoneGroup) phoneGroup.classList.remove("invalid");
            if (emailGroup) emailGroup.classList.remove("invalid");
            if (passwordGroup) passwordGroup.classList.remove("invalid");
            if (confirmPasswordGroup) confirmPasswordGroup.classList.remove("invalid");

            updateSignupAvatar();
        });
    }

    // Real-time input initials update
    if (businessNameInput) businessNameInput.addEventListener("input", updateSignupAvatar);
    if (fullNameInput) fullNameInput.addEventListener("input", updateSignupAvatar);

    // Terms notice
    if (termsLink) {
        termsLink.addEventListener("click", (e) => {
            e.preventDefault();
            alert("Hello Solar Financer Agreement: Certified financing partners agree to uphold financial lending regulations, credit risk assessments, and secure project fund underwriting.");
        });
    }

    // Form Submit
    if (signupForm) {
        signupForm.addEventListener("submit", (e) => {
            e.preventDefault();

            let isValid = true;
            const businessName = businessNameInput.value.trim();
            const fullName = fullNameInput.value.trim();
            const phone = phoneInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!businessName) {
                businessNameGroup.classList.add("invalid");
                isValid = false;
            }

            if (!fullName) {
                fullNameGroup.classList.add("invalid");
                isValid = false;
            }

            if (!phone || phone.length < 7) {
                phoneGroup.classList.add("invalid");
                isValid = false;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                emailGroup.classList.add("invalid");
                isValid = false;
            }

            if (!password || password.length < 6) {
                passwordGroup.classList.add("invalid");
                isValid = false;
            }

            if (!confirmPassword || password !== confirmPassword) {
                confirmPasswordGroup.classList.add("invalid");
                isValid = false;
            }

            if (!isValid) {
                const firstInvalid = document.querySelector(".form-group.invalid input");
                if (firstInvalid) firstInvalid.focus();
                return;
            }

            signupButton.disabled = true;
            signupBtnText.textContent = "Creating Account...";
            if (signupArrow) signupArrow.style.display = "none";

            setTimeout(() => {
                // Registers a Pending Review financer in the shared registry (no session). Super Admin
                // activates the account and configures its financing contract before first login.
                const result = window.HelloSolarAuth
                    ? window.HelloSolarAuth.register({
                        name: businessName,
                        contact: fullName,
                        email: email,
                        phone: phone,
                        password: password,
                        category: "Commercial Solar Loan",
                        contractTermMonths: null,
                        annualRate: null,
                        contractStartDate: null,
                        contractEndDate: null,
                        contractStatusOverride: null
                    })
                    : { ok: false, error: "Account registration is unavailable right now. Please try again later." };

                if (!result.ok) {
                    signupButton.disabled = false;
                    signupBtnText.textContent = "Create Financer Account";
                    if (signupArrow) signupArrow.style.display = "";
                    emailGroup.classList.add("invalid");
                    const emailError = emailGroup.querySelector(".error-message, .field-error");
                    if (emailError) emailError.textContent = result.error;
                    emailInput.focus();
                    return;
                }

                signupBtnText.textContent = "Account Submitted ✓";
                signupButton.style.background = "#16a34a";
                if (typeof window.showToast === "function") {
                    window.showToast(`Account ${result.account.id} is pending Hello Solar review. You can log in once it is activated.`);
                }

                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1600);
            }, 500);
        });
    }
});
