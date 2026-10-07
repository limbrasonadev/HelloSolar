
        const loginForm = document.getElementById("loginForm");
        const loginBtn = document.getElementById("loginBtn");
        const loginBtnText = document.getElementById("loginBtnText");
        const quickDemoBtn = document.getElementById("quickDemoBtn");
        const passwordInput = document.getElementById("password");
        const passwordToggle = document.getElementById("passwordToggle");
        const usernameInput = document.getElementById("username");
        const forgotPasswordLink = document.getElementById("forgotPasswordLink");
        const loginErrorMsg = document.getElementById("loginErrorMsg");
        const loginErrorText = document.getElementById("loginErrorText");

        function showError(msg) {
            if (loginErrorMsg && loginErrorText) {
                loginErrorText.textContent = msg;
                loginErrorMsg.classList.add("visible");
            }
        }

        function hideError() {
            if (loginErrorMsg) {
                loginErrorMsg.classList.remove("visible");
            }
        }

        // Toggle password visibility
        passwordToggle.addEventListener("click", (e) => {
            e.preventDefault();
            const isPassword = passwordInput.type === "password";
            passwordInput.type = isPassword ? "text" : "password";
            passwordToggle.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
            passwordToggle.setAttribute("aria-pressed", isPassword ? "true" : "false");

            const eyeIcon = document.getElementById("eyeIcon");
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

        forgotPasswordLink.addEventListener("click", (e) => {
            e.preventDefault();
            if (window.HelloSolar && window.HelloSolar.toast) {
                window.HelloSolar.toast("Password Reset Demo", "A reset simulation link has been sent to your registered email address.");
            } else {
                alert("Please contact Hello Solar Support at support@hellosolar.ph to reset your customer credentials.");
            }
        });

        function performLogin(identifier = null, password = null) {
            hideError();

            const id = (identifier || usernameInput.value).trim();
            const pass = password !== null ? password : passwordInput.value;

            if (!id) {
                showError("Please enter your email or account ID.");
                usernameInput.focus();
                return;
            }

            if (!pass) {
                showError("Please enter your password.");
                passwordInput.focus();
                return;
            }

            loginBtn.disabled = true;
            loginBtnText.textContent = "Verifying...";

            setTimeout(() => {
                // Check credentials against HelloSolarAuth
                const matchedUser = window.HelloSolarAuth ? window.HelloSolarAuth.authenticate(id, pass) : null;

                if (matchedUser) {
                    window.HelloSolarAuth.setSession(matchedUser);
                    loginBtnText.textContent = "Access Granted ✓";
                    loginBtn.style.background = "#16a34a";

                    setTimeout(() => {
                        window.location.href = "mysystem.html";
                    }, 350);
                } else {
                    loginBtn.disabled = false;
                    loginBtnText.textContent = "Log In";
                    showError((window.HelloSolarAuth && window.HelloSolarAuth.getLastError()) || "Invalid email/account ID or password. Please try again.");
                    passwordInput.focus();
                }
            }, 500);
        }

        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            performLogin();
        });

        if (quickDemoBtn) {
            quickDemoBtn.addEventListener("click", () => {
                usernameInput.value = "customer@hellosolar.ph";
                passwordInput.value = "password123";
                performLogin("customer@hellosolar.ph", "password123");
            });
        }
    