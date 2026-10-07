/**
 * ==========================================================================
 * HELLO SOLAR — PORTAL CORE JAVASCRIPT
 * Helper utilities, notifications, & UI helpers
 * ==========================================================================
 */

(function () {
    window.HelloSolar = window.HelloSolar || {};

    // Toast notification helper
    window.HelloSolar.toast = function (title, message, type = "info") {
        let toastEl = document.getElementById("hello-solar-toast");
        if (!toastEl) {
            toastEl = document.createElement("div");
            toastEl.id = "hello-solar-toast";
            toastEl.style.cssText = `
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: #101a2e;
                color: #ffffff;
                padding: 14px 20px;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                font-family: 'Plus Jakarta Sans', sans-serif;
                font-size: 13.5px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 4px;
                max-width: 340px;
                border-left: 4px solid #ff8a00;
                animation: toastSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            `;
            document.body.appendChild(toastEl);

            const style = document.createElement("style");
            style.textContent = `
                @keyframes toastSlide {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        toastEl.innerHTML = `
            <strong style="color: #ff8a00; font-size: 14px;">${title}</strong>
            <span style="color: #cbd5e1; line-height: 1.4;">${message}</span>
        `;
        toastEl.style.display = "flex";

        clearTimeout(window.HelloSolar._toastTimer);
        window.HelloSolar._toastTimer = setTimeout(() => {
            if (toastEl) toastEl.style.display = "none";
        }, 4000);
    };
})();
