/**
 * Hello Solar Financer Portal — Authentication & Session Manager
 * Financer accounts live in the shared Hello Solar registry (window.HSShared, FIN-### records).
 * Sessions are financer-only: this portal never reads or writes another role's session.
 */
(function () {
    const ROLE = "financer";
    let lastError = "";

    function shared() {
        if (!window.HSShared) throw new Error("Shared Hello Solar data layer is not loaded.");
        return window.HSShared;
    }

    // Returns the account on success, otherwise null (see getLastError()).
    function authenticate(identifier, password) {
        lastError = "";
        const result = shared().authenticate(ROLE, identifier, password);
        if (!result.ok) {
            lastError = result.error;
            return null;
        }
        return result.account;
    }

    function getLastError() {
        return lastError;
    }

    // Session payload keeps the field names the portal UI already uses (businessName, fullName, partnerId).
    function setSession(account) {
        return shared().session.start(ROLE, account, {
            businessName: account.name || "",
            fullName: account.contact || account.name || "",
            partnerId: account.id,
            financerId: account.id,
            role: ROLE
        });
    }

    // Portal signup: registers a Pending Review financer; Super Admin activates it (and sets the contract).
    function register(profile) {
        return shared().registerPendingAccount(ROLE, profile);
    }

    function getSession() {
        return shared().session.get(ROLE);
    }

    function isLoggedIn() {
        return shared().session.isValid(ROLE);
    }

    function logout() {
        shared().session.clear(ROLE);
    }

    window.HelloSolarAuth = {
        authenticate,
        getLastError,
        setSession,
        register,
        getSession,
        isLoggedIn,
        logout
    };
})();
