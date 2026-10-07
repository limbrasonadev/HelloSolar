/**
 * ==========================================================================
 * HELLO SOLAR CUSTOMER — AUTHENTICATION
 * Customer accounts live in the shared Hello Solar registry (window.HSShared).
 * Sessions are customer-only: this portal never reads or writes another role's session.
 * ==========================================================================
 */

(function () {
    "use strict";

    const ROLE = "customer";
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

    function setSession(account) {
        return shared().session.start(ROLE, account, { accountNo: account.hsId || "", role: ROLE });
    }

    // Portal signup: registers a Pending Review account; Super Admin activates it before first login.
    function register(profile) {
        return shared().registerPendingAccount(ROLE, profile);
    }

    function isAuthenticated() {
        return shared().session.isValid(ROLE);
    }

    function logout() {
        shared().session.clear(ROLE);
        window.location.href = "login.html";
    }

    function requireAuth() {
        return !!shared().session.require(ROLE, "login.html");
    }

    window.HelloSolarAuth = {
        authenticate,
        getLastError,
        setSession,
        register,
        isAuthenticated,
        logout,
        requireAuth
    };

})();
