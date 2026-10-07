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
    const CURRENT_ROLE = "merchant"; // explicit: never inferred from the URL path

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
            id: "notif-merch-001",
            recipientRole: "merchant",
            recipientId: "*",
            eventType: "payout_cleared",
            sourceEventId: "evt-merch-disb-902",
            recordId: "PAY-2026-081",
            title: "Equipment Payout Cleared",
            message: "Disbursement of ₱44,844.80 for Artisanal Brew Cafe (PRJ-TGG-105) successfully deposited via BDO PESONet.",
            timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
            readAt: null,
            targetUrl: "payments.html?payout=PAY-2026-081",
            actionLabel: "View Payout"
        },
        {
            id: "notif-merch-002",
            recipientRole: "merchant",
            recipientId: "*",
            eventType: "stage_changed",
            sourceEventId: "evt-proj-qc-stage",
            recordId: "PRJ-QC-101",
            title: "Project Stage Advanced",
            message: "Quezon City Residential Solar (PRJ-QC-101) advanced to Inverter & Grid-Tie Testing.",
            timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
            readAt: null,
            targetUrl: "dashboard.html?project=PRJ-QC-101",
            actionLabel: "View Project"
        },
        {
            id: "notif-merch-003",
            recipientRole: "merchant",
            recipientId: "*",
            eventType: "crew_assigned",
            sourceEventId: "evt-crew-alb-assign",
            recordId: "PRJ-ALB-103",
            title: "Installer Crew Assigned",
            message: "Team Alpha (Engr. Ramon Torres) allocated to Alabang Luxury Villa Hybrid (PRJ-ALB-103).",
            timestamp: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
            readAt: null,
            targetUrl: "installers.html?project=PRJ-ALB-103",
            actionLabel: "View Crew Tracker"
        },
        {
            id: "notif-merch-004",
            recipientRole: "merchant",
            recipientId: "*",
            eventType: "milestone_scheduled",
            sourceEventId: "evt-ms-qc-date",
            recordId: "MS-01",
            title: "Milestone Inspection Scheduled",
            message: "Final Meralco Net-Metering inspection confirmed for Sept 15, 2026 for Quezon City site.",
            timestamp: new Date(Date.now() - 220 * 60 * 1000).toISOString(),
            readAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
            targetUrl: "dashboard.html?project=PRJ-QC-101",
            actionLabel: "View Schedule"
        },
        {
            id: "notif-merch-005",
            recipientRole: "merchant",
            recipientId: "*",
            eventType: "support_response",
            sourceEventId: "evt-supp-tkt-9912",
            recordId: "TKT-9912",
            title: "Account Manager Response Received",
            message: "David Ramos replied to your inquiry regarding quarterly 2% BIR CWT Form 2307 certificates.",
            timestamp: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
            readAt: new Date(Date.now() - 300 * 60 * 1000).toISOString(),
            targetUrl: "support.html?topic=Payout%20and%20Billing",
            actionLabel: "Open Support"
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

    function updateBadge() {
        const count = NotificationService.getUnreadCount(CURRENT_ROLE);
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
        const filtered = currentFilter === "unread" ? notifs.filter((n) => !n.readAt) : notifs;

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

        // Customer package-switching context integration
        if (packageId && typeof window.setActivePackageId === "function") {
            try {
                window.setActivePackageId(packageId);
            } catch (e) {
                console.warn("Could not set active package:", e);
            }
        } else if (packageId) {
            try {
                localStorage.setItem("hello_solar_active_package_id", packageId);
            } catch (e) {}
        }

        closePanel();

        // Navigate if target is valid
        if (targetUrl && targetUrl !== "#") {
            window.location.href = targetUrl;
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
                        <span class="notification-live-pill" style="background:#f1f5f9;color:#475569;"><span class="dot" style="background:#94a3b8;"></span> Local Browser Simulation · Backend push server not connected</span>
                        <button class="notification-simulator-toggle" id="simToggleBtn" type="button">Event Simulator</button>
                    </div>

                    <!-- Simulator Drawer for Demo Testing -->
                    <div class="notification-simulator-box" id="simulatorBox">
                        <div class="notification-simulator-title">Dispatch Merchant Test Event:</div>
                        <div class="notification-simulator-btns">
                            <button type="button" class="sim-btn" id="simStageBtn">Stage Changed ✓</button>
                            <button type="button" class="sim-btn" id="simCrewBtn">Crew Assigned ✓</button>
                            <button type="button" class="sim-btn" id="simMilestoneBtn">Milestone Date ✓</button>
                            <button type="button" class="sim-btn" id="simPayoutBtn">Payout Cleared ✓</button>
                            <button type="button" class="sim-btn" id="simSupportBtn">Support Reply ✓</button>
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

        // Simulation Triggers for Merchant Portal Events
        const simStage = document.getElementById("simStageBtn");
        if (simStage) {
            simStage.addEventListener("click", () => {
                NotificationService.dispatch({
                    recipientRole: "merchant",
                    eventType: "stage_changed",
                    sourceEventId: `sim-stage-${Date.now()}`,
                    recordId: "PRJ-QC-101",
                    title: "Project Stage Advanced",
                    message: "Quezon City Residential Solar (PRJ-QC-101) advanced to Inverter & Grid-Tie Testing.",
                    targetUrl: "dashboard.html?project=PRJ-QC-101",
                    actionLabel: "View Project"
                });
                renderNotificationList();
            });
        }

        const simCrew = document.getElementById("simCrewBtn");
        if (simCrew) {
            simCrew.addEventListener("click", () => {
                NotificationService.dispatch({
                    recipientRole: "merchant",
                    eventType: "crew_assigned",
                    sourceEventId: `sim-crew-${Date.now()}`,
                    recordId: "PRJ-ALB-103",
                    title: "Installer Crew Assigned",
                    message: "Team Alpha (Engr. Ramon Torres) allocated to Alabang Luxury Villa Hybrid (PRJ-ALB-103).",
                    targetUrl: "installers.html?project=PRJ-ALB-103",
                    actionLabel: "View Crew Tracker"
                });
                renderNotificationList();
            });
        }

        const simMilestone = document.getElementById("simMilestoneBtn");
        if (simMilestone) {
            simMilestone.addEventListener("click", () => {
                NotificationService.dispatch({
                    recipientRole: "merchant",
                    eventType: "milestone_scheduled",
                    sourceEventId: `sim-ms-${Date.now()}`,
                    recordId: "MS-01",
                    title: "Milestone Inspection Scheduled",
                    message: "Final Meralco Net-Metering inspection confirmed for Sept 15, 2026 for Quezon City site.",
                    targetUrl: "dashboard.html?project=PRJ-QC-101",
                    actionLabel: "View Schedule"
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
                    recordId: "PAY-2026-081",
                    title: "Equipment Payout Cleared",
                    message: "Disbursement of ₱44,844.80 for Artisanal Brew Cafe (PRJ-TGG-105) successfully deposited via BDO.",
                    targetUrl: "payments.html?payout=PAY-2026-081",
                    actionLabel: "View Payout"
                });
                renderNotificationList();
            });
        }

        const simSupport = document.getElementById("simSupportBtn");
        if (simSupport) {
            simSupport.addEventListener("click", () => {
                NotificationService.dispatch({
                    recipientRole: "merchant",
                    eventType: "support_response",
                    sourceEventId: `sim-supp-${Date.now()}`,
                    recordId: "TKT-9912",
                    title: "Account Manager Response Received",
                    message: "David Ramos replied regarding 2% BIR CWT Form 2307 certificates.",
                    targetUrl: "support.html?topic=Payout%20and%20Billing",
                    actionLabel: "Open Support"
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

    // Public API on window
    window.HelloSolarNotifications = NotificationService;

    // Auto-mount on DOM ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", injectNotificationUI);
    } else {
        injectNotificationUI();
    }
})();
