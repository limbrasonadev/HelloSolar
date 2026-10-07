/**
 * ==========================================================================
 * HELLO SOLAR MERCHANT — AUTH SCRIPT
 * Static client-side authentication using JSON credentials & localStorage
 * Includes Password Strength Checker & Password Visibility Toggle
 * ==========================================================================
 */

// ==========================================================================
// 1. DEFAULT MERCHANT CREDENTIALS (JSON)
// Edit or add default accounts here:
// ==========================================================================
const DEFAULT_ACCOUNTS = [
    {
        username: "merchant@hellosolar.ph",
        email: "merchant@hellosolar.ph",
        password: "password123",
        businessName: "SolarTech Manila",
        contactPerson: "Marco Santos",
        phone: "+63 917 888 2026",
        avatarUrl: null
    },
    {
        username: "merchant",
        email: "merchant@hellosolar.ph",
        password: "password123",
        businessName: "SolarTech Manila",
        contactPerson: "Marco Santos",
        phone: "+63 917 888 2026",
        avatarUrl: null
    }
];

const STORAGE_KEY = "hello_solar_merchant_accounts";
const SESSION_KEY = "hello_solar_merchant_logged_in";
const USER_KEY = "hello_solar_merchant_user";

// ==========================================================================
// 2. ACCOUNT STORAGE HELPERS
// ==========================================================================
function getAccounts() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                // Merge default accounts with stored accounts (avoid duplicates by email/username)
                const combined = [...DEFAULT_ACCOUNTS];
                parsed.forEach(acc => {
                    const exists = combined.some(item => 
                        item.username.toLowerCase() === acc.username.toLowerCase() ||
                        item.email.toLowerCase() === acc.email.toLowerCase()
                    );
                    if (!exists) combined.push(acc);
                });
                return combined;
            }
        }
    } catch (err) {
        console.warn("Error reading stored merchant accounts:", err);
    }
    return [...DEFAULT_ACCOUNTS];
}

function saveNewAccount(newAccount) {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        let accountsList = [];
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) accountsList = parsed;
        }
        accountsList.push(newAccount);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(accountsList));
        return true;
    } catch (err) {
        console.error("Error saving account:", err);
        return false;
    }
}

// ==========================================================================
// 3. AUTH LOGIC
// ==========================================================================
function authenticate(identifier, password) {
    const accounts = getAccounts();
    const cleanId = (identifier || "").trim().toLowerCase();
    const cleanPass = password || "";

    return accounts.find(acc => {
        const matchUser = acc.username && acc.username.toLowerCase() === cleanId;
        const matchEmail = acc.email && acc.email.toLowerCase() === cleanId;
        const matchPass = acc.password === cleanPass;
        return (matchUser || matchEmail) && matchPass;
    }) || null;
}

function setSession(account) {
    localStorage.setItem(SESSION_KEY, "true");
    localStorage.setItem(USER_KEY, JSON.stringify({
        username: account.username,
        email: account.email,
        businessName: account.businessName || "SolarTech Manila",
        contactPerson: account.contactPerson || "Marco Santos",
        phone: account.phone || "+63 917 888 2026",
        address: account.address || "Unit 802, Solar Tower, Ortigas Center, Pasig City",
        merchantId: account.merchantId || "MCH-77412",
        status: account.status || "Verified",
        partnerTier: account.partnerTier || "Gold Merchant",
        activeInstalls: account.activeInstalls || "48 Projects",
        commissionRate: account.commissionRate || "5.2% Tier A",
        accountManager: account.accountManager || "David Ramos",
        preferredPayout: account.preferredPayout || "bdo",
        payoutAccount: account.payoutAccount || "0045 8821 9012",
        avatarUrl: account.avatarUrl || null
    }));
}

// ==========================================================================
// 4. PASSWORD VISIBILITY TOGGLE & STRENGTH CHECKER
// ==========================================================================
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
    });

    // Password Strength Checker
    const signupPassInput = document.getElementById("signup-password");
    const confirmPassInput = document.getElementById("confirm-password");
    const strengthWrap = document.getElementById("passwordStrengthWrap");
    const strengthText = document.getElementById("strengthText");
    const meterLine = document.getElementById("passwordMeterLine");
    const matchBadge = document.getElementById("matchBadge");
    const segments = [
        document.getElementById("strSeg1"),
        document.getElementById("strSeg2"),
        document.getElementById("strSeg3"),
        document.getElementById("strSeg4")
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

            // Minimum 1 if length > 0
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

// ==========================================================================
// 5. UI EVENT HANDLERS (SIGN IN & SIGN UP)
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    // Initialize password visibility toggle & strength meter
    initPasswordFeatures();

    // --- SIGN IN FORM HANDLER ---
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        const userInput = document.getElementById("login-email");
        const passInput = document.getElementById("login-password");
        const errorBox = document.getElementById("error-msg") || document.getElementById("login-error-msg");

        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const identifier = userInput ? userInput.value : "";
            const password = passInput ? passInput.value : "";

            const matchedAccount = authenticate(identifier, password);

            if (matchedAccount) {
                if (errorBox) errorBox.style.display = "none";
                setSession(matchedAccount);
                window.location.href = "dashboard.html";
            } else {
                if (errorBox) {
                    errorBox.textContent = "Invalid username/email or password. Please try again.";
                    errorBox.style.display = "block";
                }
            }
        });
    }

    // --- SIGN UP FORM HANDLER ---
    const signupForm = document.getElementById("signup-form");
    if (signupForm) {
        const businessNameInput = document.getElementById("business-name");
        const emailInput = document.getElementById("signup-email");
        const passInput = document.getElementById("signup-password");
        const confirmPassInput = document.getElementById("confirm-password");
        const errorBox = document.getElementById("signup-error-msg") || document.getElementById("error-msg");

        signupForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const businessName = businessNameInput ? businessNameInput.value.trim() : "";
            const email = emailInput ? emailInput.value.trim() : "";
            const password = passInput ? passInput.value : "";
            const confirmPassword = confirmPassInput ? confirmPassInput.value : "";

            // Validate matching passwords
            if (password !== confirmPassword) {
                if (errorBox) {
                    errorBox.textContent = "Passwords do not match. Please re-enter.";
                    errorBox.style.display = "block";
                }
                return;
            }

            // Validate password length
            if (password.length < 6) {
                if (errorBox) {
                    errorBox.textContent = "Password must be at least 6 characters long.";
                    errorBox.style.display = "block";
                }
                return;
            }

            // Check if email already registered
            const accounts = getAccounts();
            const emailExists = accounts.some(acc => acc.email.toLowerCase() === email.toLowerCase());
            if (emailExists) {
                if (errorBox) {
                    errorBox.textContent = "An account with this email already exists. Please sign in.";
                    errorBox.style.display = "block";
                }
                return;
            }

            // Create and store new merchant account
            const newMerchant = {
                username: email,
                email: email,
                password: password,
                businessName: businessName || "SolarTech Partner"
            };

            saveNewAccount(newMerchant);
            setSession(newMerchant);

            if (errorBox) errorBox.style.display = "none";

            // Redirect directly to dashboard
            window.location.href = "dashboard.html";
        });
    }
});
