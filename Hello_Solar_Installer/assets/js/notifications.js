/**
 * ==========================================================================
 * HELLO SOLAR SHARED NOTIFICATION ENGINE — INSTALLER SUITE
 * BroadcastChannel event bus, responsive topbar bell & sliding panel UI,
 * deep-record routing (jobs, payouts, support), unread badge management,
 * and field operations event simulator.
 * ==========================================================================
 */
(function () {
    "use strict";

    const STORAGE_KEY = "hello_solar_notifications_store"; // single shared store for every portal
    const CHANNEL_NAME = "hello_solar_notifications_bus";
    const CURRENT_ROLE = "installer"; // explicit: never inferred from the URL path

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

    // Installer Seed Events matching exact field operations requirements
    const DEFAULT_SEED = [
        {
            id: "notif-inst-001",
            recipientRole: "installer",
            recipientId: "*",
            eventType: "new_job_assigned",
            sourceEventId: "evt-app-1024-assign",
            recordId: "APP-1024",
            title: "New Job Assigned",
            message: "APP-1024 · Cebu City",
            timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            readAt: null,
            targetUrl: "myjob.html?job=APP-1024",
            actionLabel: "Review Assignment"
        },
        {
            id: "notif-inst-002",
            recipientRole: "installer",
            recipientId: "*",
            eventType: "job_accepted",
            sourceEventId: "evt-app-1027-accepted",
            recordId: "APP-1027",
            title: "Job Accepted",
            message: "APP-1027 moved to In Progress",
            timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            readAt: null,
            targetUrl: "myjob.html?job=APP-1027",
            actionLabel: "View Work Order"
        },
        {
            id: "notif-inst-003",
            recipientRole: "installer",
            recipientId: "*",
            eventType: "maintenance_required",
            sourceEventId: "evt-app-1031-maint",
            recordId: "APP-1031",
            title: "Maintenance Required",
            message: "APP-1031 · Mandaue City",
            timestamp: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
            readAt: null,
            targetUrl: "myjob.html?job=APP-1031",
            actionLabel: "Open Job Details"
        },
        {
            id: "notif-inst-004",
            recipientRole: "installer",
            recipientId: "*",
            eventType: "installation_completed",
            sourceEventId: "evt-app-1018-completed",
            recordId: "APP-1018",
            title: "Installation Completed",
            message: "APP-1018 has been completed",
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            readAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
            targetUrl: "myjob.html?job=APP-1018",
            actionLabel: "View Details"
        },
        {
            id: "notif-inst-005",
            recipientRole: "installer",
            recipientId: "*",
            eventType: "payout_status_updated",
            sourceEventId: "evt-pay-101-disbursed",
            recordId: "PAY-2026-101",
            title: "Milestone Payout Disbursed",
            message: "₱18,130 for APP-1018 credited to registered BDO account.",
            timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
            readAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
            targetUrl: "payout.html?payout=PAY-2026-101",
            actionLabel: "View Receipt"
        }
    ];

    let currentFilter = "all";

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
        console.warn("BroadcastChannel not supported, using storage fallback.");
    }

    function broadcastEvent(type, payload) {
        if (broadcastChannel) {
            broadcastChannel.postMessage({ type, payload });
        } else {
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
                broadcastEvent("NOTIFICATIONS_READ", { ids, readAt: now });
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
                broadcastEvent("NOTIFICATIONS_ALL_READ", { role, readAt: now });
            }
        },

        dispatch(notifData) {
            const all = loadStoredNotifications();

            // Prevent duplicate event ingestion
            if (notifData.sourceEventId && all.some((n) => n.sourceEventId === notifData.sourceEventId)) {
                return;
            }

            const newNotif = {
                id: notifData.id || `notif-inst-${Date.now()}`,
                recipientRole: notifData.recipientRole || CURRENT_ROLE,
                recipientId: notifData.recipientId || (((notifData.recipientRole || CURRENT_ROLE) === CURRENT_ROLE && currentAccountId()) || "*"),
                eventType: notifData.eventType || "general",
                sourceEventId: notifData.sourceEventId || `evt-${Date.now()}`,
                recordId: notifData.recordId || null,
                title: notifData.title || "Installer Operational Update",
                message: notifData.message || "",
                timestamp: notifData.timestamp || new Date().toISOString(),
                readAt: null,
                targetUrl: notifData.targetUrl || "myjob.html",
                actionLabel: notifData.actionLabel || "View Details"
            };

            all.unshift(newNotif);
            saveNotifications(all);
            broadcastEvent("NEW_NOTIFICATION", { notification: newNotif });
            showLiveToast(newNotif);
            updateBadge();
            renderNotificationList();
        }
    };

    // --------------------------------------------------------------------------
    // UI HELPERS & RENDERING
    // --------------------------------------------------------------------------
    function formatTimeAgo(isoString) {
        if (!isoString) return "";
        const diffSecs = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));
        if (diffSecs < 60) return "Just now";
        const diffMins = Math.floor(diffSecs / 60);
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    }

    function getEventIcon(eventType) {
        switch (eventType) {
            case "job_accepted":
                return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
            case "job_declined":
                return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
            case "installation_started":
                return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
            case "installation_completed":
            case "system_activated":
                return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`;
            case "new_job_assigned":
                return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`;
            case "job_schedule_changed":
                return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
            case "job_requirements_updated":
                return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
            case "payout_status_updated":
                return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><path d="M6 15h4"/></svg>`;
            case "support_response_received":
                return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
            default:
                return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
        }
    }

    function updateBadge() {
        const badge = document.getElementById("notificationBadge");
        const chip = document.getElementById("notifUnreadChip");
        const count = NotificationService.getUnreadCount(CURRENT_ROLE);

        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? "99+" : count;
                badge.classList.remove("hidden");
            } else {
                badge.classList.add("hidden");
            }
        }

        if (chip) {
            if (count > 0) {
                chip.textContent = `${count} unread`;
                chip.style.display = "inline-flex";
            } else {
                chip.style.display = "none";
            }
        }
    }

    function renderNotificationList() {
        const listEl = document.getElementById("notificationList");
        if (!listEl) return;

        const all = NotificationService.getRoleNotifications(CURRENT_ROLE);
        const filtered = currentFilter === "unread" ? all.filter((n) => !n.readAt) : all;

        if (filtered.length === 0) {
            listEl.innerHTML = `
                <div class="notification-empty-state notification-empty">
                    <div class="notification-empty-icon-wrap">
                        <svg class="notification-empty-icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                    </div>
                    <h4>All caught up!</h4>
                    <p>${currentFilter === "unread" ? "No unread alerts at this moment." : "You have no operational notifications."}</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = filtered
            .map((n) => {
                const isUnread = !n.readAt;
                const timeAgo = formatTimeAgo(n.timestamp);
                const iconSvg = getEventIcon(n.eventType);

                return `
                <div class="notification-item ${isUnread ? "unread" : "read"}" data-id="${n.id}" data-record-id="${escapeHtml(n.recordId || '')}" data-url="${n.targetUrl || "myjob.html"}">
                    <div class="notif-item-icon">
                        ${iconSvg}
                    </div>
                    <div class="notif-item-content">
                        <div class="notif-item-header">
                            <h4 class="notif-item-title">${escapeHtml(n.title)}</h4>
                            <span class="notif-item-time">${timeAgo}</span>
                        </div>
                        <p class="notif-item-msg">${escapeHtml(n.message)}</p>
                        <div class="notif-item-actions">
                            <span class="notif-action-link">${escapeHtml(n.actionLabel || "View Record")} →</span>
                            ${isUnread ? '<span class="unread-dot-inline" title="Unread">●</span>' : ""}
                        </div>
                    </div>
                </div>
            `;
            })
            .join("");

        // Bind click routing
        listEl.querySelectorAll(".notification-item").forEach((el) => {
            el.addEventListener("click", () => {
                const id = el.getAttribute("data-id");
                const targetUrl = el.getAttribute("data-url");
                const recordId = el.getAttribute("data-record-id");
                NotificationService.markAsRead([id]);
                updateBadge();
                closePanel();

                if (recordId && (recordId.startsWith('APP-') || recordId.startsWith('JOB-'))) {
                    const currentPath = window.location.pathname.split("/").pop() || "myjob.html";
                    if (currentPath === "myjob.html" || currentPath === "" || currentPath === "index.html") {
                        if (typeof window.openInstallerJobModal === 'function') {
                            window.openInstallerJobModal(recordId);
                            return;
                        }
                    } else {
                        window.location.href = `myjob.html?job=${encodeURIComponent(recordId)}`;
                        return;
                    }
                }

                if (targetUrl) {
                    handleRecordNavigation(targetUrl);
                }
            });
        });
    }

    /**
     * Intelligent record routing: handles deep-links, opens modals directly if on same page
     */
    function handleRecordNavigation(targetUrl) {
        const currentPath = window.location.pathname.split("/").pop() || "myjob.html";
        const urlObj = new URL(targetUrl, window.location.href);
        const targetPage = urlObj.pathname.split("/").pop() || "myjob.html";

        if (currentPath === targetPage) {
            // We are already on the target page: trigger modal directly if parameter present
            const jobParam = urlObj.searchParams.get("job");
            const payoutParam = urlObj.searchParams.get("payout");

            if (jobParam && window.openInstallerJobModal) {
                window.openInstallerJobModal(jobParam);
                return;
            }
            if (payoutParam && window.openInstallerPayoutModal) {
                window.openInstallerPayoutModal(payoutParam);
                return;
            }
            window.location.search = urlObj.search;
        } else {
            // Navigate to page with search params
            window.location.href = targetUrl;
        }
    }

    function showLiveToast(notif) {
        let toastContainer = document.getElementById("notificationToastContainer");
        if (!toastContainer) {
            toastContainer = document.createElement("div");
            toastContainer.id = "notificationToastContainer";
            toastContainer.className = "notification-toast-container";
            toastContainer.setAttribute("aria-live", "polite");
            toastContainer.setAttribute("aria-atomic", "true");
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement("div");
        const eventClass = (notif.eventType || "general").toLowerCase().replace(/_/g, "-");
        toast.className = `notification-toast toast-${eventClass}`;
        toast.setAttribute("role", "alert");
        toast.innerHTML = `
            <div class="notif-toast-icon" aria-hidden="true">
                ${getEventIcon(notif.eventType)}
            </div>
            <div class="notif-toast-body">
                <div class="notif-toast-title">${escapeHtml(notif.title)}</div>
                <div class="notif-toast-msg">${escapeHtml(notif.message)}</div>
            </div>
            <button type="button" class="notif-toast-close" aria-label="Dismiss notification">&times;</button>
        `;

        let dismissed = false;
        function dismissToast() {
            if (dismissed) return;
            dismissed = true;
            toast.classList.add("dismissing");
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 260);
        }

        toast.addEventListener("click", (e) => {
            if (e.target.classList.contains("notif-toast-close") || e.target.closest(".notif-toast-close")) {
                e.stopPropagation();
                dismissToast();
                return;
            }
            NotificationService.markAsRead([notif.id]);
            updateBadge();
            dismissToast();
            if (notif.targetUrl) {
                handleRecordNavigation(notif.targetUrl);
            }
        });

        toastContainer.appendChild(toast);
        setTimeout(() => {
            if (toast.parentElement && !dismissed) {
                dismissToast();
            }
        }, 4200);
    }

    function escapeHtml(str) {
        return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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
            panel.style.width = "400px";
        } else {
            panel.style.position = "";
            panel.style.top = "";
            panel.style.right = "";
            panel.style.left = "";
            panel.style.bottom = "";
            panel.style.width = "";
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
            bellBtn.classList.add("active");
        }
        renderNotificationList();
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
            bellBtn.classList.remove("active");
        }
    }

    // --------------------------------------------------------------------------
    // DOM INJECTION & INITIALIZATION
    // --------------------------------------------------------------------------
    function injectNotificationUI() {
        if (document.getElementById("notificationBellContainer")) return;

        const topbarRight = document.querySelector(".topbar-right");
        if (!topbarRight) return;

        const container = document.createElement("div");
        container.className = "notification-bell-container";
        container.id = "notificationBellContainer";
        container.innerHTML = `
            <button class="notification-bell-btn" id="notificationBellBtn" type="button" aria-label="Notifications" aria-haspopup="dialog" aria-expanded="false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span class="notification-badge hidden" id="notificationBadge">0</span>
            </button>
        `;

        const profile = topbarRight.querySelector(".profile");
        if (profile) {
            topbarRight.insertBefore(container, profile);
        } else {
            topbarRight.appendChild(container);
        }

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
                    <button class="notification-filter-tab active" data-tab="all" type="button">All Alerts</button>
                    <button class="notification-filter-tab" data-tab="unread" type="button">Unread</button>
                </div>

                <div class="notification-list" id="notificationList"></div>

                <div class="notification-panel-footer">
                    <div class="notification-footer-status">
                        <span class="notification-live-pill"><span class="dot"></span> Simulation Mode Active</span>
                    </div>

                    <div class="notification-simulator-box" id="simulatorBox">
                        <div class="notification-simulator-title">Simulate Field Operational Event:</div>
                        <div class="notification-simulator-btns">
                            <button type="button" class="sim-btn" id="simNewJobBtn">+ New Job</button>
                            <button type="button" class="sim-btn" id="simReschedBtn">⏱ Schedule</button>
                            <button type="button" class="sim-btn" id="simPayoutBtn">₱ Payout</button>
                            <button type="button" class="sim-btn" id="simSupportBtn">💬 Support</button>
                        </div>
                        <div style="font-size: 11px; color: var(--gray-400); margin-top: 6px; line-height: 1.3;">
                            BroadcastChannel syncs events across open tabs. Production WebSocket integration pending.
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(panel);
        }

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

        if (backdrop) backdrop.addEventListener("click", closePanel);

        if (markAllBtn) {
            markAllBtn.addEventListener("click", () => {
                NotificationService.markAllAsRead(CURRENT_ROLE);
                renderNotificationList();
                updateBadge();
            });
        }

        const tabs = document.querySelectorAll(".notification-filter-tab");
        tabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                tabs.forEach((t) => t.classList.remove("active"));
                tab.classList.add("active");
                currentFilter = tab.dataset.tab;
                renderNotificationList();
            });
        });

        if (simToggleBtn && simulatorBox) {
            simToggleBtn.addEventListener("click", () => {
                simulatorBox.classList.toggle("open");
            });
        }

        // Simulator Event Triggers
        const simNewJob = document.getElementById("simNewJobBtn");
        if (simNewJob) {
            simNewJob.addEventListener("click", () => {
                NotificationService.dispatch({
                    eventType: "new_job_assigned",
                    sourceEventId: `sim-job-${Date.now()}`,
                    recordId: "JOB-2026-081",
                    title: "New Job Assigned: Makati Logistics",
                    message: "15.0 kW Commercial system ready for pre-installation staging.",
                    targetUrl: "myjob.html?job=JOB-2026-084",
                    actionLabel: "View Assignment"
                });
            });
        }

        const simResched = document.getElementById("simReschedBtn");
        if (simResched) {
            simResched.addEventListener("click", () => {
                NotificationService.dispatch({
                    eventType: "job_schedule_changed",
                    sourceEventId: `sim-sched-${Date.now()}`,
                    recordId: "JOB-2026-082",
                    title: "Schedule Updated: Pasig Auto Spares",
                    message: "Inverter mounting moved to 9:00 AM due to client warehouse inspection.",
                    targetUrl: "myjob.html?job=JOB-2026-082",
                    actionLabel: "Check Schedule"
                });
            });
        }

        const simPayout = document.getElementById("simPayoutBtn");
        if (simPayout) {
            simPayout.addEventListener("click", () => {
                NotificationService.dispatch({
                    eventType: "payout_status_updated",
                    sourceEventId: `sim-pay-${Date.now()}`,
                    recordId: "PAY-2026-102",
                    title: "Payout Disbursed: ₱25,480 Released",
                    message: "Agri-Solar milestone payout transferred to registered BDO account.",
                    targetUrl: "payout.html?payout=PAY-2026-102",
                    actionLabel: "View Ledger"
                });
            });
        }

        const simSupport = document.getElementById("simSupportBtn");
        if (simSupport) {
            simSupport.addEventListener("click", () => {
                NotificationService.dispatch({
                    eventType: "support_response_received",
                    sourceEventId: `sim-sup-${Date.now()}`,
                    recordId: "SUP-2026-089",
                    title: "Support Response: Permit Verification",
                    message: "Engineering office approved your PEZA electrical clearance copy.",
                    targetUrl: "support.html?reference=JOB-2026-083",
                    actionLabel: "View Response"
                });
            });
        }

        document.addEventListener("click", (e) => {
            const panel = document.getElementById("notificationPanel");
            const bell = document.getElementById("notificationBellContainer");
            if (panel && panel.classList.contains("open")) {
                if (bell && !bell.contains(e.target) && !panel.contains(e.target)) {
                    closePanel();
                }
            }
        });

        window.addEventListener("resize", () => {
            const panel = document.getElementById("notificationPanel");
            if (panel && panel.classList.contains("open")) {
                positionPanel();
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                const panel = document.getElementById("notificationPanel");
                if (panel && panel.classList.contains("open")) {
                    closePanel();
                }
            }
        });
    }

    // Cross-tab synchronization
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

    window.HelloSolarNotifications = NotificationService;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", injectNotificationUI);
    } else {
        injectNotificationUI();
    }
})();
