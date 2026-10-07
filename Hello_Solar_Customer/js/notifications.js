/**
 * Hello Solar Shared Notification Engine
 * Real-time BroadcastChannel event bus, responsive panel UI, role isolation,
 * unread badge management & customer package-context routing.
 */
(function () {
    "use strict";

    const STORAGE_KEY = "hello_solar_notifications_store";
    const CHANNEL_NAME = "hello_solar_notifications_bus";

    // Detect active portal role from directory path or window context
    const CURRENT_ROLE = "customer"; // explicit: never inferred from the URL path

    // Notifications are addressed by role and, when known, by account ID (shared session of this portal).
    // Portal demo notifications belong to the portal's demo account in the shared registry.
    const DEMO_RECIPIENT = { customer: "CUS-1010", financer: "FIN-005", installer: "INS-006", merchant: "MER-026" };
    function currentAccountId() {
        const session = window.HSShared ? window.HSShared.session.get(CURRENT_ROLE) : null;
        return session ? session.accountId : null;
    }
    function isVisible(n, role) {
        if (!(n.recipientRole === role || n.recipientRole === "*")) return false;
        return !n.recipientId || n.recipientId === "*" || n.recipientId === currentAccountId();
    }

    // Default seed dataset
    const DEFAULT_SEED = [
        {
            id: "notif-fin-001",
            recipientRole: "financer",
            recipientId: "*",
            eventType: "application_submitted",
            sourceEventId: "evt-app-4091-sub",
            recordId: "APP-4091",
            title: "New Financing Application Received",
            message: "Ricardo Gomez applied for ₱285,000 hybrid solar loan via SunPower Manila.",
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            readAt: null,
            targetUrl: "applications.html",
            actionLabel: "Review Application"
        },
        {
            id: "notif-fin-002",
            recipientRole: "financer",
            recipientId: "*",
            eventType: "document_uploaded",
            sourceEventId: "evt-doc-4088-meralco",
            recordId: "APP-4088",
            title: "Utility Offset Proof Uploaded",
            message: "3-Month Meralco electric bill uploaded for Maria Elena Cruz (Quezon City).",
            timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            readAt: null,
            targetUrl: "applications.html",
            actionLabel: "Inspect Proof"
        },
        {
            id: "notif-fin-003",
            recipientRole: "financer",
            recipientId: "*",
            eventType: "application_approved",
            sourceEventId: "evt-app-4085-approved",
            recordId: "APP-4085",
            title: "Promissory Note Signed",
            message: "David Tan (Cebu City) signed promissory note for ₱780,000 commercial solar facility.",
            timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
            readAt: new Date(Date.now() - 100 * 60 * 1000).toISOString(),
            targetUrl: "approved.html",
            actionLabel: "View Contract"
        },
        {
            id: "notif-cust-001",
            recipientRole: "customer",
            recipientId: "*",
            eventType: "payment_confirmed",
            sourceEventId: "evt-pay-2026-0901",
            recordId: "PAY-2026-904",
            packageId: "pkg-01",
            packageName: "5.4 kWp Hybrid System",
            title: "Monthly Amortization Confirmed",
            message: "Payment of ₱8,400 successfully cleared via Auto-Debit for your Makati Hybrid System.",
            timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
            readAt: null,
            targetUrl: "myPayments.html",
            actionLabel: "View Receipt"
        },
        {
            id: "notif-cust-002",
            recipientRole: "customer",
            recipientId: "*",
            eventType: "schedule_updated",
            sourceEventId: "evt-sched-2026-0914",
            recordId: "JOB-4086",
            packageId: "pkg-02",
            packageName: "3.6 kWp Micro-Inverter",
            title: "Site Inspection Confirmed",
            message: "Installer team confirmed site structural inspection for Friday, Sep 18 at 09:00 AM.",
            timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
            readAt: null,
            targetUrl: "installStatus.html",
            actionLabel: "Check Status"
        },
        {
            id: "notif-inst-001",
            recipientRole: "installer",
            recipientId: "*",
            eventType: "job_assigned",
            sourceEventId: "evt-job-4091-assign",
            recordId: "HS-JOB-4091",
            title: "New Installation Job Assigned",
            message: "5.4 kWp Hybrid rooftop installation assigned at Makati City. Customer: Ricardo Gomez.",
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            readAt: null,
            targetUrl: "myjob.html",
            actionLabel: "View Work Order"
        },
        {
            id: "notif-merch-001",
            recipientRole: "merchant",
            recipientId: "*",
            eventType: "payout_cleared",
            sourceEventId: "evt-merch-disb-902",
            recordId: "DISB-2026-902",
            title: "Equipment Payout Cleared",
            message: "Batch payout of ₱145,000 scheduled for automated 3:00 PM ACH clearing.",
            timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            readAt: null,
            targetUrl: "payments.html",
            actionLabel: "View Remittance"
        }
    ];

    // --------------------------------------------------------------------------
    // STORAGE & PERSISTENCE
    // --------------------------------------------------------------------------
    DEFAULT_SEED.forEach(n => {
        if (!n.recipientId || n.recipientId === "*") n.recipientId = DEMO_RECIPIENT[n.recipientRole] || n.recipientId;
    });

    // Demo notifications only in local demo mode; api mode lists come from the backend (bootstrap / commands)
    const DEMO_NOTIFICATIONS = !(window.HS_CONFIG && (window.HS_CONFIG.isApi || window.HS_CONFIG.demoData === false));

    function loadStoredNotifications() {
        try {
            const raw = window.HSStore ? window.HSStore.getItem(STORAGE_KEY) : localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Add this portal's seed items once; address previously stored seed items to their demo account
                    let updated = false;
                    (DEMO_NOTIFICATIONS ? DEFAULT_SEED : []).forEach(seed => {
                        const existing = parsed.find(item => item.id === seed.id);
                        if (!existing) {
                            parsed.unshift(seed);
                            updated = true;
                        } else if ((!existing.recipientId || existing.recipientId === "*") && seed.recipientId) {
                            existing.recipientId = seed.recipientId;
                            updated = true;
                        }
                    });
                    if (updated) saveNotifications(parsed);
                    return parsed;
                }
            }
        } catch (e) {
            console.warn("Error loading notifications from storage:", e);
        }
        // Initialize with default seed
        const initial = DEMO_NOTIFICATIONS ? DEFAULT_SEED : [];
        saveNotifications(initial);
        return initial;
    }

    // cmd: backend command for user actions (mark read); seeding and local dispatch send none
    function saveNotifications(list, cmd) {
        try {
            if (window.HSShared && window.HSShared.writeNotifications) window.HSShared.writeNotifications(list, cmd);
            else localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (e) {
            console.warn("Error saving notifications to storage:", e);
        }
    }

    // --------------------------------------------------------------------------
    // BROADCAST CHANNEL & CROSS-TAB SYNC
    // --------------------------------------------------------------------------
    let broadcastChannel = null;
    try {
        if (typeof window.BroadcastChannel !== "undefined") {
            broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
        }
    } catch (e) {
        console.warn("BroadcastChannel not supported, using storage event fallback.");
    }

    function broadcastEvent(type, payload) {
        if (broadcastChannel) {
            broadcastChannel.postMessage({ type, payload });
        } else {
            // Storage fallback trigger
            try {
                localStorage.setItem("hello_solar_notif_sync_trigger", JSON.stringify({ type, payload, time: Date.now() }));
            } catch (e) {}
        }
    }

    // --------------------------------------------------------------------------
    // NOTIFICATION CORE SERVICE
    // --------------------------------------------------------------------------
    const NotificationService = {
        getRoleNotifications(role = CURRENT_ROLE) {
            const all = loadStoredNotifications();
            return all.filter((n) => isVisible(n, role));
        },

        getUnreadCount(role = CURRENT_ROLE) {
            const notifs = this.getRoleNotifications(role);
            return notifs.filter((n) => !n.readAt).length;
        },

        markAsRead(ids) {
            if (!ids || ids.length === 0) return;
            const all = loadStoredNotifications();
            const now = new Date().toISOString();
            let changed = false;

            all.forEach((n) => {
                if (ids.includes(n.id) && !n.readAt) {
                    n.readAt = now;
                    changed = true;
                }
            });

            if (changed) {
                saveNotifications(all, { name: "notification.markRead", payload: { ids } });
                broadcastEvent("NOTIFICATIONS_READ", { ids, role: CURRENT_ROLE });
            }
        },

        markAllAsRead(role = CURRENT_ROLE) {
            const all = loadStoredNotifications();
            const now = new Date().toISOString();
            let changed = false;

            all.forEach((n) => {
                if ((isVisible(n, role)) && !n.readAt) {
                    n.readAt = now;
                    changed = true;
                }
            });

            if (changed) {
                saveNotifications(all, { name: "notification.markRead", payload: { all: true, role } });
                broadcastEvent("NOTIFICATIONS_ALL_READ", { role });
            }
        },

        dispatch(event) {
            // Deduplication by sourceEventId
            const all = loadStoredNotifications();
            if (event.sourceEventId && all.some((n) => n.sourceEventId === event.sourceEventId)) {
                console.log(`[Notifications] Deduplicated duplicate source event: ${event.sourceEventId}`);
                return null;
            }

            const newNotif = {
                id: event.id || `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                recipientRole: event.recipientRole || CURRENT_ROLE,
                recipientId: event.recipientId || (((event.recipientRole || CURRENT_ROLE) === CURRENT_ROLE && currentAccountId()) || "*"),
                eventType: event.eventType || "system",
                sourceEventId: event.sourceEventId || `evt-${Date.now()}`,
                recordId: event.recordId || "",
                packageId: event.packageId || null,
                packageName: event.packageName || null,
                title: event.title || "Notification",
                message: event.message || "",
                timestamp: event.timestamp || new Date().toISOString(),
                readAt: null,
                targetUrl: event.targetUrl || "#",
                actionLabel: event.actionLabel || "View"
            };

            all.unshift(newNotif);
            saveNotifications(all);
            broadcastEvent("NEW_NOTIFICATION", { notification: newNotif });

            // If this portal is the target recipient, trigger UI pulse & toast
            if (isVisible(newNotif, CURRENT_ROLE)) {
                showLiveToast(newNotif);
                updateBadge();
            }

            return newNotif;
        }
    };

    // --------------------------------------------------------------------------
    // TOAST BANNER NOTIFICATION
    // --------------------------------------------------------------------------
    function showLiveToast(notif) {
        let toast = document.getElementById("notificationLiveToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "notificationLiveToast";
            toast.className = "notification-live-toast";
            toast.setAttribute("role", "alert");
            toast.setAttribute("aria-live", "polite");
            toast.innerHTML = `
                <div class="notification-live-toast-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                </div>
                <div>
                    <div class="notification-live-toast-title" id="toastTitle"></div>
                    <div class="notification-live-toast-msg" id="toastMsg"></div>
                </div>
            `;
            document.body.appendChild(toast);
        }

        const titleEl = toast.querySelector("#toastTitle");
        const msgEl = toast.querySelector("#toastMsg");
        if (titleEl) titleEl.textContent = notif.title;
        if (msgEl) msgEl.textContent = notif.message;

        toast.classList.add("show");
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.classList.remove("show");
        }, 4500);
    }

    // --------------------------------------------------------------------------
    // FORMATTING HELPERS
    // --------------------------------------------------------------------------
    function formatRelativeTime(isoString) {
        if (!isoString) return "Just now";
        const date = new Date(isoString);
        const diffMs = Date.now() - date.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        if (diffSecs < 60) return "Just now";
        const diffMins = Math.floor(diffSecs / 60);
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    function getEventIconSvg(type) {
        switch (type) {
            case "payment_confirmed":
                return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`;
            case "schedule_updated":
            case "job_rescheduled":
                return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
            case "application_submitted":
            case "document_uploaded":
                return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
            case "job_assigned":
            case "project_assigned":
                return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;
            case "payout_cleared":
            case "payout_approved":
                return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
            case "support_response":
                return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
            default:
                return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
        }
    }

    function getIconTypeClass(type) {
        if (type.includes("pay")) return "type-payment";
        if (type.includes("job") || type.includes("project")) return "type-job";
        if (type.includes("sched")) return "type-schedule";
        if (type.includes("app") || type.includes("doc")) return "type-application";
        if (type.includes("alert")) return "type-alert";
        return "type-milestone";
    }

    // --------------------------------------------------------------------------
    // UI BUILDER & INTERACTION
    // --------------------------------------------------------------------------
    let currentFilter = "all"; // 'all' or 'unread'

    // Delayed Payment Reminders (customer, installment only). Computed live from
    // HelloSolar.getDelayedPaymentReminder() on every render — never stored — so they stay pinned while a bill
    // is past due, switch to "Payment Under Review" on receipt submission, return to overdue on rejection, and
    // disappear once verified/paid.
    function getPaymentReminderItems() {
        if (CURRENT_ROLE !== "customer") return [];
        const H = window.HelloSolar;
        if (!H || typeof H.getDelayedPaymentReminder !== "function" || typeof H.getLinkedPackages !== "function") return [];
        const fmtDate = (iso) => {
            const dt = iso ? new Date(iso + "T00:00:00") : null;
            return dt && !isNaN(dt) ? dt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—";
        };
        return H.getLinkedPackages()
            .map((pkg) => H.getDelayedPaymentReminder(pkg))
            .filter(Boolean)
            .map((r) => {
                const isReview = r.state === "under_review";
                return {
                    id: `payment-reminder-${r.packageId}`,
                    isPaymentReminder: true,
                    reminderState: r.state,
                    eventType: isReview ? "payment_review" : "payment_overdue",
                    title: isReview ? "Payment Under Review" : "Payment Overdue",
                    message: isReview
                        ? "Your receipt has been submitted and is awaiting verification by Hello Solar."
                        : "Your installment payment is past due. Please settle the overdue amount.",
                    details: [
                        ["Overdue Amount", r.formattedOverdueAmount],
                        ["Billing Period", r.missedPeriods.join(", ") || "—"],
                        ["Due Date", fmtDate(r.dueDate)]
                    ],
                    packageId: r.packageId,
                    packageName: r.packageName,
                    // Overdue reminders stay unread (badge) until resolved; under review is informational
                    readAt: isReview ? "reminder" : null,
                    targetUrl: isReview ? "payments.html" : "payments.html?action=upload-receipt",
                    actionLabel: isReview ? "View Payment" : "Upload Receipt / Pay Now"
                };
            });
    }

    function updateBadge() {
        const count = NotificationService.getUnreadCount(CURRENT_ROLE)
            + getPaymentReminderItems().filter((r) => !r.readAt).length;
        const badge = document.getElementById("notificationBadge");
        const bellBtn = document.getElementById("notificationBellBtn");

        if (badge) {
            if (count > 0) {
                badge.classList.remove("hidden");
                badge.textContent = count > 99 ? "99+" : String(count);
                badge.classList.remove("pulse");
                void badge.offsetWidth; // trigger reflow
                badge.classList.add("pulse");
            } else {
                badge.classList.add("hidden");
                badge.textContent = "0";
            }
        }

        if (bellBtn) {
            const accessibleText = count === 0 ? "Notifications, no unread" : `Notifications, ${count} unread`;
            bellBtn.setAttribute("aria-label", accessibleText);
            bellBtn.title = accessibleText;
        }

        const unreadChip = document.getElementById("notifUnreadChip");
        if (unreadChip) {
            unreadChip.textContent = `${count} unread`;
            unreadChip.style.display = count > 0 ? "inline-block" : "none";
        }
    }

    function renderNotificationList() {
        const listEl = document.getElementById("notificationList");
        if (!listEl) return;

        const notifs = NotificationService.getRoleNotifications(CURRENT_ROLE);
        const reminders = getPaymentReminderItems();
        const filtered = [...reminders, ...notifs].filter((n) => currentFilter !== "unread" || !n.readAt);

        if (filtered.length === 0) {
            listEl.innerHTML = `
                <div class="notification-empty-state">
                    <svg class="notification-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="m9 12 2 2 4-4"></path>
                    </svg>
                    <h4>All caught up!</h4>
                    <p>${currentFilter === "unread" ? "No unread notifications right now." : "No notifications in your history."}</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = filtered
            .map((item) => {
                const isUnread = !item.readAt;
                const iconClass = getIconTypeClass(item.eventType);
                const iconSvg = getEventIconSvg(item.eventType);
                const packageTag = item.packageName ? `<span class="notification-package-tag">${escapeHtml(item.packageName)}</span>` : "";

                if (item.isPaymentReminder) {
                    const isReview = item.reminderState === "under_review";
                    return `
                    <div class="notification-item notification-reminder ${isReview ? "is-review" : "is-overdue unread"}"
                         tabindex="0"
                         role="button"
                         data-id="${item.id}"
                         data-target="${item.targetUrl}"
                         data-pkg="${escapeHtml(item.packageId || "")}"
                         aria-label="${escapeHtml(item.title)}: ${escapeHtml(item.packageName || "")}">
                        <div class="notification-item-icon ${isReview ? "type-schedule" : "type-alert"}">
                            ${getEventIconSvg(item.eventType)}
                        </div>
                        <div class="notification-item-body">
                            <div class="notification-item-title">${escapeHtml(item.title)}</div>
                            <div class="notification-item-message">${escapeHtml(item.message)}</div>
                            <dl class="notification-reminder-details">
                                ${item.details.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join("")}
                            </dl>
                            <div class="notification-item-meta">
                                <span class="notification-reminder-pin">${isReview ? "Pending verification" : "Action required"}</span>
                                ${packageTag}
                                <span class="notification-action-tag">${escapeHtml(item.actionLabel)} →</span>
                            </div>
                        </div>
                        ${isReview ? "" : '<span class="notification-unread-dot" aria-hidden="true"></span>'}
                    </div>
                `;
                }

                return `
                    <div class="notification-item ${isUnread ? "unread" : ""}"
                         tabindex="0" 
                         role="button" 
                         data-id="${item.id}" 
                         data-target="${item.targetUrl}" 
                         data-pkg="${item.packageId || ""}" 
                         aria-label="${escapeHtml(item.title)}">
                        <div class="notification-item-icon ${iconClass}">
                            ${iconSvg}
                        </div>
                        <div class="notification-item-body">
                            <div class="notification-item-title">${escapeHtml(item.title)}</div>
                            <div class="notification-item-message">${escapeHtml(item.message)}</div>
                            <div class="notification-item-meta">
                                <span>${formatRelativeTime(item.timestamp)}</span>
                                ${packageTag}
                                <span class="notification-action-tag">${escapeHtml(item.actionLabel || "View")} →</span>
                            </div>
                        </div>
                        ${isUnread ? '<span class="notification-unread-dot" aria-hidden="true"></span>' : ""}
                    </div>
                `;
            })
            .join("");

        // Attach click listeners to notification items
        listEl.querySelectorAll(".notification-item").forEach((el) => {
            el.addEventListener("click", () => handleNotificationClick(el));
            el.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleNotificationClick(el);
                }
            });
        });
    }

    function handleNotificationClick(el) {
        const id = el.dataset.id;
        const targetUrl = el.dataset.target;
        const packageId = el.dataset.pkg;

        if (id) {
            NotificationService.markAsRead([id]);
        }

        function proceedNavigation() {
            closePanel();
            if (targetUrl && targetUrl !== "#") {
                window.location.href = targetUrl;
            }
        }

        // Already on the target package: requestPackageSwitch is a no-op there, so navigate directly
        const activeId = window.HelloSolar && typeof window.HelloSolar.getActivePackageId === "function"
            ? window.HelloSolar.getActivePackageId() : null;
        if (packageId && activeId && packageId === activeId) {
            proceedNavigation();
            return;
        }

        // Customer package-switching context integration with draft protection
        if (packageId && window.HelloSolar && typeof window.HelloSolar.requestPackageSwitch === "function") {
            window.HelloSolar.requestPackageSwitch(packageId, () => {
                proceedNavigation();
            });
        } else {
            if (packageId) {
                try {
                    localStorage.setItem("hello_solar_active_package_id", packageId);
                } catch (e) {}
            }
            proceedNavigation();
        }
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function positionPanel() {
        const panel = document.getElementById("notificationPanel");
        const bellBtn = document.getElementById("notificationBellBtn");
        if (!panel || !bellBtn) return;

        if (window.innerWidth > 768) {
            const bellRect = bellBtn.getBoundingClientRect();
            panel.style.position = "fixed";
            panel.style.top = `${Math.round(bellRect.bottom + 8)}px`;
            const rightOffset = Math.max(16, Math.round(window.innerWidth - bellRect.right));
            panel.style.right = `${rightOffset}px`;
            panel.style.left = "auto";
            panel.style.bottom = "auto";
            panel.style.width = "390px";
            panel.style.transform = "";
        } else {
            panel.style.position = "";
            panel.style.top = "";
            panel.style.right = "";
            panel.style.left = "";
            panel.style.bottom = "";
            panel.style.width = "";
            panel.style.transform = "";
        }
    }

    function openPanel() {
        const panel = document.getElementById("notificationPanel");
        const backdrop = document.getElementById("notificationBackdrop");
        const bellBtn = document.getElementById("notificationBellBtn");

        if (!panel || !backdrop) return;

        positionPanel();
        panel.classList.add("open");
        backdrop.classList.add("open");
        document.body.classList.add("notification-panel-open");

        if (bellBtn) {
            bellBtn.setAttribute("aria-expanded", "true");
        }

        renderNotificationList();

        // Mark visible unread items as read upon opening
        const unreadIds = NotificationService.getRoleNotifications(CURRENT_ROLE)
            .filter((n) => !n.readAt)
            .map((n) => n.id);

        if (unreadIds.length > 0) {
            // Small delay to let user see unread state before transitioning badge
            setTimeout(() => {
                NotificationService.markAsRead(unreadIds);
                updateBadge();
            }, 600);
        }
    }

    function closePanel() {
        const panel = document.getElementById("notificationPanel");
        const backdrop = document.getElementById("notificationBackdrop");
        const bellBtn = document.getElementById("notificationBellBtn");

        if (panel) panel.classList.remove("open");
        if (backdrop) backdrop.classList.remove("open");
        document.body.classList.remove("notification-panel-open");

        if (bellBtn) {
            bellBtn.setAttribute("aria-expanded", "false");
            bellBtn.focus();
        }
    }

    // --------------------------------------------------------------------------
    // DOM INJECTION & INITIALIZATION
    // --------------------------------------------------------------------------
    function injectNotificationUI() {
        if (document.getElementById("notificationBellContainer")) return;

        // Target topbar-right in any portal
        const topbarRight = document.querySelector(".topbar-right");
        if (!topbarRight) return;

        const container = document.createElement("div");
        container.className = "notification-bell-container";
        container.id = "notificationBellContainer";
        container.innerHTML = `
            <button class="notification-bell-btn" id="notificationBellBtn" type="button" aria-label="Notifications" aria-haspopup="dialog" aria-expanded="false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span class="notification-badge hidden" id="notificationBadge">0</span>
            </button>
        `;

        // Prepend before profile in topbar-right
        const profile = topbarRight.querySelector(".profile");
        if (profile) {
            topbarRight.insertBefore(container, profile);
        } else {
            topbarRight.appendChild(container);
        }

        // Add panel directly to document.body to avoid parent overflow or backdrop-filter clipping
        if (!document.getElementById("notificationPanel")) {
            const panel = document.createElement("div");
            panel.className = "notification-panel";
            panel.id = "notificationPanel";
            panel.setAttribute("role", "dialog");
            panel.setAttribute("aria-labelledby", "notifTitle");
            panel.setAttribute("aria-modal", "true");
            panel.innerHTML = `
                <div class="notification-panel-header">
                    <div class="notification-header-left">
                        <h3 class="notification-title" id="notifTitle">Notifications</h3>
                        <span class="notification-unread-chip" id="notifUnreadChip" style="display: none;">0 unread</span>
                    </div>
                    <button class="notification-mark-all-btn" id="notifMarkAllBtn" type="button">Mark all as read</button>
                </div>

                <div class="notification-filter-tabs">
                    <button class="notification-filter-tab active" data-tab="all" type="button">All</button>
                    <button class="notification-filter-tab" data-tab="unread" type="button">Unread</button>
                </div>

                <div class="notification-list" id="notificationList"></div>

                <div class="notification-panel-footer">
                    <div class="notification-footer-status">
                        <span class="notification-live-pill"><span class="dot"></span> Real-Time Sync Active</span>
                        <button class="notification-simulator-toggle" id="simToggleBtn" type="button">Event Simulator</button>
                    </div>

                    <!-- Simulator Drawer for Demo Testing -->
                    <div class="notification-simulator-box" id="simulatorBox">
                        <div class="notification-simulator-title">Dispatch Test Event:</div>
                        <div class="notification-simulator-btns">
                            <button type="button" class="sim-btn" id="simPaymentBtn">Customer Pay ✓</button>
                            <button type="button" class="sim-btn" id="simApproveBtn">Financer Approve ✓</button>
                            <button type="button" class="sim-btn" id="simJobBtn">Installer Job ✓</button>
                            <button type="button" class="sim-btn" id="simPayoutBtn">Merchant Payout ✓</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(panel);
        }

        // Add backdrop to body
        if (!document.getElementById("notificationBackdrop")) {
            const backdrop = document.createElement("div");
            backdrop.className = "notification-backdrop";
            backdrop.id = "notificationBackdrop";
            backdrop.setAttribute("aria-hidden", "true");
            document.body.appendChild(backdrop);
        }

        bindUIEvents();
        updateBadge();
    }

    function bindUIEvents() {
        const bellBtn = document.getElementById("notificationBellBtn");
        const backdrop = document.getElementById("notificationBackdrop");
        const markAllBtn = document.getElementById("notifMarkAllBtn");
        const simToggleBtn = document.getElementById("simToggleBtn");
        const simulatorBox = document.getElementById("simulatorBox");

        if (bellBtn) {
            bellBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const panel = document.getElementById("notificationPanel");
                if (panel && panel.classList.contains("open")) {
                    closePanel();
                } else {
                    openPanel();
                }
            });
        }

        if (backdrop) {
            backdrop.addEventListener("click", closePanel);
        }

        if (markAllBtn) {
            markAllBtn.addEventListener("click", () => {
                NotificationService.markAllAsRead(CURRENT_ROLE);
                renderNotificationList();
                updateBadge();
            });
        }

        // Tab filters
        const tabs = document.querySelectorAll(".notification-filter-tab");
        tabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                tabs.forEach((t) => t.classList.remove("active"));
                tab.classList.add("active");
                currentFilter = tab.dataset.tab;
                renderNotificationList();
            });
        });

        // Simulator toggle & action triggers
        if (simToggleBtn && simulatorBox) {
            simToggleBtn.addEventListener("click", () => {
                simulatorBox.classList.toggle("open");
            });
        }

        // Simulation Triggers
        const simPayment = document.getElementById("simPaymentBtn");
        if (simPayment) {
            simPayment.addEventListener("click", () => {
                NotificationService.dispatch({
                    recipientRole: "customer",
                    eventType: "payment_confirmed",
                    sourceEventId: `sim-pay-${Date.now()}`,
                    packageId: "pkg-01",
                    packageName: "5.4 kWp Hybrid System",
                    title: "Amortization Payment Confirmed",
                    message: `Payment of ₱8,400 confirmed for Hybrid System via Auto-Debit clearing.`,
                    targetUrl: "myPayments.html",
                    actionLabel: "View Receipt"
                });
                renderNotificationList();
            });
        }

        const simApprove = document.getElementById("simApproveBtn");
        if (simApprove) {
            simApprove.addEventListener("click", () => {
                NotificationService.dispatch({
                    recipientRole: "financer",
                    eventType: "application_approved",
                    sourceEventId: `sim-app-${Date.now()}`,
                    recordId: "APP-4091",
                    title: "Application Approved & Disbursal Queued",
                    message: `Credit Committee approved term sheet for Ricardo Gomez (₱285,000).`,
                    targetUrl: "approved.html",
                    actionLabel: "View Contract"
                });
                renderNotificationList();
            });
        }

        const simJob = document.getElementById("simJobBtn");
        if (simJob) {
            simJob.addEventListener("click", () => {
                NotificationService.dispatch({
                    recipientRole: "installer",
                    eventType: "job_assigned",
                    sourceEventId: `sim-job-${Date.now()}`,
                    recordId: "HS-JOB-4091",
                    title: "Priority Installation Assigned",
                    message: `5.4 kWp Hybrid installation assigned at Makati City. Site survey ready.`,
                    targetUrl: "myjob.html",
                    actionLabel: "Accept Job"
                });
                renderNotificationList();
            });
        }

        const simPayout = document.getElementById("simPayoutBtn");
        if (simPayout) {
            simPayout.addEventListener("click", () => {
                NotificationService.dispatch({
                    recipientRole: "merchant",
                    eventType: "payout_cleared",
                    sourceEventId: `sim-payout-${Date.now()}`,
                    recordId: "DISB-2026-908",
                    title: "Equipment Payout Cleared",
                    message: `Installer procurement batch payout of ₱180,000 completed via ACH.`,
                    targetUrl: "payments.html",
                    actionLabel: "View Remittance"
                });
                renderNotificationList();
            });
        }

        // Close on outside click
        document.addEventListener("click", (e) => {
            const panel = document.getElementById("notificationPanel");
            const bell = document.getElementById("notificationBellContainer");
            if (panel && panel.classList.contains("open")) {
                if (bell && !bell.contains(e.target) && !panel.contains(e.target)) {
                    closePanel();
                }
            }
        });

        // Reposition on resize
        window.addEventListener("resize", () => {
            const panel = document.getElementById("notificationPanel");
            if (panel && panel.classList.contains("open")) {
                positionPanel();
            }
        });

        // Keyboard navigation: Escape to close
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                const panel = document.getElementById("notificationPanel");
                if (panel && panel.classList.contains("open")) {
                    closePanel();
                }
            }
        });
    }

    // --------------------------------------------------------------------------
    // CROSS-TAB LISTENER
    // --------------------------------------------------------------------------
    if (broadcastChannel) {
        broadcastChannel.onmessage = (e) => {
            const { type, payload } = e.data || {};
            if (type === "NEW_NOTIFICATION") {
                const notif = payload.notification;
                if (notif && isVisible(notif, CURRENT_ROLE)) {
                    showLiveToast(notif);
                    updateBadge();
                    renderNotificationList();
                }
            } else if (type === "NOTIFICATIONS_READ" || type === "NOTIFICATIONS_ALL_READ") {
                updateBadge();
                renderNotificationList();
            }
        };
    } else {
        window.addEventListener("storage", (e) => {
            if (e.key === STORAGE_KEY || e.key === "hello_solar_notif_sync_trigger") {
                updateBadge();
                renderNotificationList();
            }
        });
    }

    // Payment reminders depend on customer package data: refresh when it loads or a package's status changes
    // (receipt submitted / verified / rejected).
    ["helloSolarDataLoaded", "helloSolarPackageChanged"].forEach((evt) => {
        window.addEventListener(evt, () => {
            updateBadge();
            renderNotificationList();
        });
    });

    // Public API on window
    window.HelloSolarNotifications = NotificationService;

    // Auto-mount on DOM ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", injectNotificationUI);
    } else {
        injectNotificationUI();
    }
})();
