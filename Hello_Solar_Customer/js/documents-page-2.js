/**
 * Documents page — shows the selected system's Required Documents (js/required-documents.js renders the shared
 * APP document record). Full-payment systems have no document requests, so a short note is shown instead.
 */
(function () {
    "use strict";

    function activePackage() {
        return window.HelloSolar && typeof window.HelloSolar.getActivePackage === "function"
            ? window.HelloSolar.getActivePackage() : null;
    }

    function render(pkg) {
        pkg = pkg || activePackage();
        if (typeof window.renderRequiredDocuments === "function") window.renderRequiredDocuments(pkg);

        const hasDocuments = !!pkg && !!pkg.appId && String(pkg.paymentType || "").toLowerCase() !== "full_payment";
        const empty = document.getElementById("documentsEmptyState");
        if (!empty) return;
        empty.hidden = hasDocuments;
        if (hasDocuments) return;
        const title = document.getElementById("documentsEmptyTitle");
        const text = document.getElementById("documentsEmptyText");
        if (title) title.textContent = pkg ? "No documents needed" : "No system linked yet";
        if (text) {
            text.textContent = pkg
                ? "Full-payment systems don’t require financing documents."
                : "Link your Hello Solar system to see its documents.";
        }
    }

    window.addEventListener("helloSolarDataLoaded", () => render());
    window.addEventListener("helloSolarPackageChanged", (e) => render(e.detail && e.detail.package));
})();
