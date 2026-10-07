/**
 * ==========================================================================
 * HELLO SOLAR INSTALLER — AUTH SCRIPT
 * Partner installer accounts live in the shared Hello Solar registry (window.HSShared, INS-### records).
 * Sessions are installer-only: this portal never reads or writes another role's session.
 * Also provides the Password Strength Meter & Visibility Toggle.
 * ==========================================================================
 */

const INSTALLER_ROLE = "installer";
let installerAuthError = "";

function installerShared() {
    if (!window.HSShared) throw new Error("Shared Hello Solar data layer is not loaded.");
    return window.HSShared;
}

// --------------------------------------------------------------------------
// 1. AUTHENTICATION & SESSION
// --------------------------------------------------------------------------
function authenticate(identifier, password) {
    installerAuthError = "";
    const result = installerShared().authenticate(INSTALLER_ROLE, identifier, password);
    if (!result.ok) {
        installerAuthError = result.error;
        return null;
    }
    return result.account;
}

function setSession(account) {
    return installerShared().session.start(INSTALLER_ROLE, account, {
        businessName: account.name || "",
        fullName: account.contact || account.name || "",
        installerId: account.id,
        avatarUrl: ""
    });
}

function clearSession() {
    installerShared().session.clear(INSTALLER_ROLE);
}

// Portal signup: registers a Pending Review partner installer; Super Admin activates it.
function register(profile) {
    return installerShared().registerPendingAccount(INSTALLER_ROLE, profile);
}

// Expose globally as window.HelloSolarAuth for template compatibility
window.HelloSolarAuth = {
    authenticate: authenticate,
    getLastError: () => installerAuthError,
    setSession: setSession,
    clearSession: clearSession,
    register: register
};

// --------------------------------------------------------------------------
// 3. PASSWORD VISIBILITY TOGGLE & STRENGTH METER
// --------------------------------------------------------------------------
function initPasswordFeatures() {
    // Show/Hide Password Toggle
    const toggleButtons = document.querySelectorAll(".password-toggle-btn");
    toggleButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const wrap = btn.closest(".password-wrap");
            if (!wrap) return;
            const input = wrap.querySelector("input");
            if (!input) return;

            const isPassword = input.type === "password";
            input.type = isPassword ? "text" : "password";
            btn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
            btn.setAttribute("aria-pressed", isPassword ? "true" : "false");

            const eyeIcon = btn.querySelector("svg");
            if (eyeIcon) {
                if (isPassword) {
                    // Slashed eye (hide)
                    eyeIcon.innerHTML = `
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                        <line x1="2" y1="2" x2="22" y2="22"/>
                    `;
                } else {
                    // Open eye
                    eyeIcon.innerHTML = `
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                        <circle cx="12" cy="12" r="3"/>
                    `;
                }
            }
        });
    });

    // Password Strength Meter & Confirm Match
    const signupPassInput = document.getElementById("signup-password");
    const confirmPassInput = document.getElementById("signup-confirm-password");
    const strengthWrap = document.getElementById("strength-meter");
    const meterLine = document.getElementById("meter-line");
    const strengthText = document.getElementById("strength-text");
    const matchBadge = document.getElementById("match-badge");
    const segments = [
        document.getElementById("seg1"),
        document.getElementById("seg2"),
        document.getElementById("seg3"),
        document.getElementById("seg4")
    ];

    function checkMatch() {
        if (!signupPassInput || !confirmPassInput || !matchBadge) return;
        const pass = signupPassInput.value;
        const conf = confirmPassInput.value;
        if (conf && pass === conf) {
            matchBadge.classList.add("visible");
        } else {
            matchBadge.classList.remove("visible");
        }
    }

    if (signupPassInput) {
        signupPassInput.addEventListener("input", () => {
            const val = signupPassInput.value;
            if (!val) {
                if (strengthWrap) strengthWrap.classList.remove("active");
                if (meterLine) meterLine.style.width = "0%";
                if (matchBadge) matchBadge.classList.remove("visible");
                return;
            }

            if (strengthWrap) strengthWrap.classList.add("active");

            let score = 0;
            if (val.length >= 6) score++;
            if (val.length >= 9) score++;
            if (/[0-9]/.test(val)) score++;
            if (/[^A-Za-z0-9]/.test(val) || /[A-Z]/.test(val)) score++;

            if (score === 0 && val.length > 0) score = 1;

            const colors = {
                1: "#ef4444", // Weak (red)
                2: "#f59e0b", // Fair (amber)
                3: "#3b82f6", // Good (blue)
                4: "#10b981"  // Strong (green)
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

            segments.forEach((seg, idx) => {
                if (seg) {
                    seg.style.background = idx < score ? colors[score] : "#e2e8f0";
                }
            });

            if (meterLine) {
                meterLine.style.width = widths[score] || "25%";
                meterLine.style.background = colors[score] || "#ef4444";
            }

            if (strengthText) {
                strengthText.textContent = labels[score] || "Weak";
                strengthText.style.color = colors[score] || "#64748b";
            }

            checkMatch();
        });
    }

    if (confirmPassInput) {
        confirmPassInput.addEventListener("input", checkMatch);
    }
}

// --------------------------------------------------------------------------
// 4. FORM EVENT HANDLERS
// --------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    initPasswordFeatures();

    // --- LOGIN FORM ---
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        const userInput = document.getElementById("login-email");
        const passInput = document.getElementById("login-password");
        const errorBox = document.getElementById("error-msg");

        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const identifier = userInput ? userInput.value.trim() : "";
            const password = passInput ? passInput.value : "";

            if (!identifier || !password) {
                if (errorBox) {
                    errorBox.textContent = "Please enter both email/username and password.";
                    errorBox.style.display = "block";
                }
                return;
            }

            const matched = authenticate(identifier, password);
            if (matched) {
                if (errorBox) errorBox.style.display = "none";
                setSession(matched);
                window.location.href = "myjob.html";
            } else {
                if (errorBox) {
                    errorBox.textContent = "Invalid email/username or password. Please try again.";
                    errorBox.style.display = "block";
                }
            }
        });
    }

    // --- SIGN UP FORM ---
    const signupForm = document.getElementById("signup-form");
    if (signupForm) {
        const businessNameInput = document.getElementById("business-name");
        const fullNameInput = document.getElementById("full-name");
        const emailInput = document.getElementById("signup-email");
        const phoneInput = document.getElementById("signup-phone");
        const passInput = document.getElementById("signup-password");
        const confirmPassInput = document.getElementById("signup-confirm-password");
        const termsCheck = document.getElementById("terms-checkbox");
        const errorBox = document.getElementById("error-msg");

        signupForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const businessName = businessNameInput ? businessNameInput.value.trim() : "";
            const fullName = fullNameInput ? fullNameInput.value.trim() : "";
            const email = emailInput ? emailInput.value.trim() : "";
            const phone = phoneInput ? phoneInput.value.trim() : "";
            const password = passInput ? passInput.value : "";
            const confirmPassword = confirmPassInput ? confirmPassInput.value : "";

            if (!email || !password) {
                if (errorBox) {
                    errorBox.textContent = "Please fill in all required fields.";
                    errorBox.style.display = "block";
                }
                return;
            }

            if (password !== confirmPassword) {
                if (errorBox) {
                    errorBox.textContent = "Passwords do not match. Please re-enter.";
                    errorBox.style.display = "block";
                }
                return;
            }

            if (password.length < 6) {
                if (errorBox) {
                    errorBox.textContent = "Password must be at least 6 characters long.";
                    errorBox.style.display = "block";
                }
                return;
            }

            if (termsCheck && !termsCheck.checked) {
                if (errorBox) {
                    errorBox.textContent = "Please accept the Installer Terms & Conditions.";
                    errorBox.style.display = "block";
                }
                return;
            }

            const result = register({ name: businessName, contact: fullName, email, phone: phone || "", password });
            if (!result.ok) {
                if (errorBox) {
                    errorBox.textContent = result.error;
                    errorBox.style.display = "block";
                }
                return;
            }

            if (errorBox) errorBox.style.display = "none";
            window.location.href = "login.html";
        });
    }
});
