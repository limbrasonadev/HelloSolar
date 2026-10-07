/**
 * Hello Solar Financer Portal - Support Page Logic
 * Handles support channel details toggle, accessible dropdowns, ticket inquiry form submission,
 * and interactive FAQ accordions.
 */

document.addEventListener("DOMContentLoaded", () => {
    function triggerToast(msg) {
        if (typeof window.showToast === "function") {
            window.showToast(msg);
        }
    }

    // 8a. Contact Card "See details" toggle
    const contactToggleBtns = document.querySelectorAll(".support-toggle-btn");
    contactToggleBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            const targetId = btn.dataset.target;
            const targetBox = document.getElementById(targetId);
            const toggleText = btn.querySelector(".toggle-text");
            if (!targetBox) return;

            const isOpen = targetBox.classList.contains("open");
            if (isOpen) {
                targetBox.classList.remove("open");
                btn.setAttribute("aria-expanded", "false");
                if (toggleText) toggleText.textContent = "See details";
            } else {
                targetBox.classList.add("open");
                btn.setAttribute("aria-expanded", "true");
                if (toggleText) toggleText.textContent = "See less";
            }
        });
    });

    // 8b. Support Request Form Submission & Validation
    const supportForm = document.getElementById("supportTicketForm");
    const ticketMessageInput = document.getElementById("ticketMessage");
    const ticketMessageError = document.getElementById("ticketMessageError");

    if (ticketMessageInput && ticketMessageError) {
        ticketMessageInput.addEventListener("input", () => {
            if (ticketMessageInput.value.trim().length > 0) {
                ticketMessageInput.classList.remove("support-field-error");
                ticketMessageError.classList.remove("visible");
            }
        });
    }

    if (supportForm) {
        supportForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const message = (ticketMessageInput ? ticketMessageInput.value : "").trim();
            if (!message) {
                if (ticketMessageInput) {
                    ticketMessageInput.classList.add("support-field-error");
                    ticketMessageInput.focus();
                }
                if (ticketMessageError) {
                    ticketMessageError.classList.add("visible");
                }
                triggerToast("Please enter your message before submitting.");
                return;
            }

            // Generate ticket reference and show confirmation
            const ticketNum = "TKT-2026-" + Math.floor(1000 + Math.random() * 9000);
            triggerToast(`Support request submitted! Ticket #${ticketNum} logged. ✓`);
            supportForm.reset();
            if (ticketMessageError) {
                ticketMessageError.classList.remove("visible");
            }
            if (ticketMessageInput) {
                ticketMessageInput.classList.remove("support-field-error");
            }
        });
    }

    // Legacy global fallback
    window.showSupportToast = function () {
        if (supportForm) {
            supportForm.dispatchEvent(new Event("submit", { cancelable: true }));
        }
    };

    // 8c. FAQ Accordions (Question toggle)
    const faqButtons = document.querySelectorAll(".faq-question-btn");
    faqButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("aria-controls");
            const panel = document.getElementById(targetId);
            const isExpanded = btn.getAttribute("aria-expanded") === "true";

            if (isExpanded) {
                btn.setAttribute("aria-expanded", "false");
                if (panel) panel.classList.remove("open");
            } else {
                btn.setAttribute("aria-expanded", "true");
                if (panel) panel.classList.add("open");
            }
        });
    });

    // Also support any legacy .faq-question clicks if present
    const legacyFaqQuestions = document.querySelectorAll(".faq-question");
    legacyFaqQuestions.forEach((q) => {
        q.addEventListener("click", () => {
            const item = q.closest(".faq-item");
            if (item) {
                item.classList.toggle("active");
            }
        });
    });

    // 8d. FAQ See More / See Fewer Questions Toggle
    const toggleFaqsBtn = document.getElementById("toggleFaqsBtn");
    const toggleFaqsText = document.getElementById("toggleFaqsText");
    const extraFaqItems = document.querySelectorAll(".faq-extra-item");

    if (toggleFaqsBtn && extraFaqItems.length > 0) {
        toggleFaqsBtn.addEventListener("click", () => {
            const isShowingMore = toggleFaqsBtn.getAttribute("aria-expanded") === "true";
            if (isShowingMore) {
                extraFaqItems.forEach((item) => item.classList.remove("visible"));
                toggleFaqsBtn.setAttribute("aria-expanded", "false");
                if (toggleFaqsText) toggleFaqsText.textContent = `See more questions (${extraFaqItems.length})`;
            } else {
                extraFaqItems.forEach((item) => item.classList.add("visible"));
                toggleFaqsBtn.setAttribute("aria-expanded", "true");
                if (toggleFaqsText) toggleFaqsText.textContent = "See fewer questions";
            }
        });
    }

    // 8e. Toggle Common Help (Hide / Show FAQ section)
    const toggleCommonHelpBtn = document.getElementById("toggleCommonHelpBtn");
    const faqContentWrapper = document.getElementById("faqContentWrapper");
    if (toggleCommonHelpBtn && faqContentWrapper) {
        toggleCommonHelpBtn.addEventListener("click", () => {
            const isHidden = faqContentWrapper.style.display === "none" || window.getComputedStyle(faqContentWrapper).display === "none";
            if (isHidden) {
                faqContentWrapper.style.display = "block";
                toggleCommonHelpBtn.innerHTML = "Hide common help &uarr;";
                toggleCommonHelpBtn.setAttribute("aria-expanded", "true");
            } else {
                faqContentWrapper.style.display = "none";
                toggleCommonHelpBtn.innerHTML = "Show common help &darr;";
                toggleCommonHelpBtn.setAttribute("aria-expanded", "false");
            }
        });
    }

    // Generic Export Button Handler
    const exportBtns = [
        document.getElementById("exportBtn")
    ];
    exportBtns.forEach((btn) => {
        if (btn) {
            btn.addEventListener("click", () => {
                triggerToast("Generating institutional CSV report... Download ready! ✓");
            });
        }
    });
});
