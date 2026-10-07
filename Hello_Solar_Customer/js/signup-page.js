
        const signupForm = document.getElementById("signupForm");
        const fullNameInput = document.getElementById("fullName");
        const phoneInput = document.getElementById("phone");
        const emailInput = document.getElementById("email");
        const passwordInput = document.getElementById("password");
        const confirmPasswordInput = document.getElementById("confirmPassword");
        const matchBadge = document.getElementById("matchBadge");
        const passwordToggle = document.getElementById("passwordToggle");
        const eyeIcon = document.getElementById("eyeIcon");
        const signupButton = document.getElementById("signupButton");
        const signupBtnText = document.getElementById("signupBtnText");
        const signupArrow = document.getElementById("signupArrow");
        const quickFillBtn = document.getElementById("quickFillBtn");

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

        // ------------------------------------------------------------------
        // Password Visibility Toggle
        // ------------------------------------------------------------------
        passwordToggle.addEventListener("click", (e) => {
            e.preventDefault();
            const isPassword = passwordInput.type === "password";
            passwordInput.type = isPassword ? "text" : "password";
            confirmPasswordInput.type = isPassword ? "text" : "password";
            passwordToggle.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
            passwordToggle.setAttribute("aria-pressed", isPassword ? "true" : "false");

            if (eyeIcon) {
                if (isPassword) {
                    eyeIcon.innerHTML = `
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                        <line x1="2" y1="2" x2="22" y2="22"/>
                    `;
                } else {
                    eyeIcon.innerHTML = `
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                        <circle cx="12" cy="12" r="3"/>
                    `;
                }
            }
        });

        // ------------------------------------------------------------------
        // Password Strength Calculation & Confirmation Matching
        // ------------------------------------------------------------------
        function checkPasswordMatch() {
            const pass = passwordInput.value;
            const conf = confirmPasswordInput.value;
            if (conf && pass === conf) {
                matchBadge.classList.add("visible");
                confirmPasswordGroup.classList.remove("invalid");
            } else {
                matchBadge.classList.remove("visible");
            }
        }

        passwordInput.addEventListener("input", () => {
            const val = passwordInput.value;
            if (!val) {
                passwordStrengthWrap.classList.remove("active");
                if (passwordMeterLine) passwordMeterLine.style.width = "0%";
                matchBadge.classList.remove("visible");
                return;
            }

            passwordStrengthWrap.classList.add("active");
            let score = 0;
            if (val.length >= 6) score++;
            if (val.length >= 9) score++;
            if (/[0-9]/.test(val)) score++;
            if (/[^A-Za-z0-9]/.test(val) || /[A-Z]/.test(val)) score++;

            const colors = {
                1: "#ef4444", // red
                2: "#f59e0b", // amber
                3: "#3b82f6", // blue
                4: "#10b981"  // green
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
                    if (idx < score) {
                        seg.style.background = colors[score] || "#ef4444";
                    } else {
                        seg.style.background = "var(--gray-200)";
                    }
                }
            });

            if (passwordMeterLine) {
                passwordMeterLine.style.width = widths[score] || "25%";
                passwordMeterLine.style.background = colors[score] || "#ef4444";
            }

            strengthText.textContent = labels[score] || "Weak";
            strengthText.style.color = colors[score] || "var(--gray-500)";

            if (val.length >= 6) {
                passwordGroup.classList.remove("invalid");
            }

            checkPasswordMatch();
        });

        confirmPasswordInput.addEventListener("input", () => {
            checkPasswordMatch();
        });

        // Clear error on input
        fullNameInput.addEventListener("input", () => {
            if (fullNameInput.value.trim()) fullNameGroup.classList.remove("invalid");
        });

        phoneInput.addEventListener("input", () => {
            if (phoneInput.value.trim()) phoneGroup.classList.remove("invalid");
        });

        emailInput.addEventListener("input", () => {
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (regex.test(emailInput.value.trim())) emailGroup.classList.remove("invalid");
        });

        // ------------------------------------------------------------------
        // Auto-Fill Sample Customer
        // ------------------------------------------------------------------
        if (quickFillBtn) quickFillBtn.addEventListener("click", () => {
            fullNameInput.value = "Maria Santos";
            phoneInput.value = "0917 555 0199";
            emailInput.value = "maria.santos@hellosolar.ph";
            passwordInput.value = "SolarPower2026!";
            confirmPasswordInput.value = "SolarPower2026!";
            passwordInput.dispatchEvent(new Event("input"));
            confirmPasswordInput.dispatchEvent(new Event("input"));
            fullNameGroup.classList.remove("invalid");
            phoneGroup.classList.remove("invalid");
            emailGroup.classList.remove("invalid");
            passwordGroup.classList.remove("invalid");
            confirmPasswordGroup.classList.remove("invalid");

            if (window.HelloSolar && window.HelloSolar.toast) {
                window.HelloSolar.toast("Demo Loaded", "Sample customer credentials filled in.");
            }
        });

        // ------------------------------------------------------------------
        // Form Submission & Account Creation
        // ------------------------------------------------------------------
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const nameVal = fullNameInput.value.trim();
            const phoneVal = phoneInput.value.trim();
            const emailVal = emailInput.value.trim();
            const passVal = passwordInput.value;
            const confirmVal = confirmPasswordInput.value;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            let isValid = true;

            if (!nameVal) {
                fullNameGroup.classList.add("invalid");
                isValid = false;
            } else {
                fullNameGroup.classList.remove("invalid");
            }

            if (!phoneVal) {
                phoneGroup.classList.add("invalid");
                isValid = false;
            } else {
                phoneGroup.classList.remove("invalid");
            }

            if (!emailVal || !emailRegex.test(emailVal)) {
                emailGroup.classList.add("invalid");
                isValid = false;
            } else {
                emailGroup.classList.remove("invalid");
            }

            if (!passVal || passVal.length < 6) {
                passwordGroup.classList.add("invalid");
                isValid = false;
            } else {
                passwordGroup.classList.remove("invalid");
            }

            if (passVal !== confirmVal) {
                confirmPasswordGroup.classList.add("invalid");
                isValid = false;
            } else {
                confirmPasswordGroup.classList.remove("invalid");
            }

            if (!isValid) {
                if (!nameVal) fullNameInput.focus();
                else if (!phoneVal) phoneInput.focus();
                else if (!emailVal || !emailRegex.test(emailVal)) emailInput.focus();
                else if (!passVal || passVal.length < 6) passwordInput.focus();
                else confirmPasswordInput.focus();
                return;
            }

            function showEmailTaken(message) {
                emailGroup.classList.add("invalid");
                const emailError = emailGroup.querySelector(".error-message");
                if (emailError) {
                    emailError.innerHTML = `
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            ${message}
                        `;
                }
                emailInput.focus();
            }

            // Loading state
            signupButton.disabled = true;
            signupBtnText.innerHTML = `
                <span style="display: inline-flex; align-items: center; gap: 8px;">
                    <span class="spinner"></span>
                    Creating your account...
                </span>
            `;
            signupArrow.style.display = "none";

            setTimeout(() => {
                // Registers a Pending Review customer in the shared registry. No session, HS ID or system is
                // created here: Hello Solar reviews the account and links the purchased system (APP ID / HS ID).
                const result = window.HelloSolarAuth
                    ? window.HelloSolarAuth.register({ name: nameVal, phone: phoneVal, email: emailVal, username: emailVal.split("@")[0], password: passVal })
                    : { ok: false, error: "Account registration is unavailable right now. Please try again later." };

                if (!result.ok) {
                    signupButton.disabled = false;
                    signupBtnText.textContent = "Create Account";
                    signupArrow.style.display = "inline-flex";
                    showEmailTaken(/exists/i.test(result.error || "") ? "An account with this email already exists. Please log in instead." : result.error);
                    return;
                }

                // Success visual state
                signupBtnText.textContent = "Account Created!";
                signupArrow.style.display = "inline-flex";
                signupArrow.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                `;

                if (window.HelloSolar && window.HelloSolar.toast) {
                    window.HelloSolar.toast("Account Submitted", `Account ${result.account.id} is pending Hello Solar review. You can log in once it is activated.`);
                }

                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1800);
            }, 800);
        });
    