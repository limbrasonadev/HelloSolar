(function () {
    "use strict";

    const $ = id => document.getElementById(id);
    const portal = window.HelloSolar;
    const form = $("supportTicketForm");
    const fields = { category: $("categorySelect"), priority: $("prioritySelect"), subject: $("ticketSubject"), description: $("ticketDescription") };
    const drafts = new Map();
    const savedDrafts = new Map();
    let currentPackage = null;
    let currentTickets = [];
    let expanded = false;
    let modalTrigger = null;
    let previousOverflow = "";

    function setText(id, value) {
        const el = $(id);
        if (el) el.textContent = value == null ? "" : String(value);
    }
    function readForm() { return Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, field ? field.value : ""])); }
    function hasInput() { return (fields.subject && fields.subject.value.trim()) || (fields.description && fields.description.value.trim()) || (fields.category && fields.category.value !== "") || (fields.priority && fields.priority.value !== "normal"); }
    function packageKey(pkg = currentPackage) {
        if (!pkg) throw new Error("No selected system");
        const customer = portal ? portal.getCustomer() : {};
        const identity = customer.accountNo || customer.email || customer.name || "user";
        return `hello_solar_support_v1:${encodeURIComponent(identity)}:${encodeURIComponent(pkg.id)}:${encodeURIComponent(pkg.accountNo || "")}`;
    }
    function readLocal(kind) {
        const raw = localStorage.getItem(`${packageKey()}:${kind}`);
        if (!raw) return kind === "requests" ? [] : null;
        const value = JSON.parse(raw);
        if (kind === "requests" && (!Array.isArray(value) || value.some(item => !item || typeof item !== "object" || Array.isArray(item)))) throw new Error("Invalid request data");
        if (kind === "draft" && (!value || typeof value !== "object" || Array.isArray(value))) throw new Error("Invalid draft data");
        return value;
    }
    function writeLocal(kind, value) { localStorage.setItem(`${packageKey()}:${kind}`, JSON.stringify(value)); }
    function showError(message) {
        setText("ticketErrorAlert", message);
        if ($("ticketErrorAlert")) $("ticketErrorAlert").hidden = !message;
    }
    function rememberDraft() { if (currentPackage) drafts.set(currentPackage.id, readForm()); }
    function restoreDraft() {
        if (!form) return;
        form.reset();
        showError("");
        setText("draftFeedback", "");
        if ($("ticketSuccessAlert")) $("ticketSuccessAlert").classList.remove("visible");
        let draft = drafts.get(currentPackage.id);
        try {
            const stored = readLocal("draft");
            if (stored) savedDrafts.set(currentPackage.id, JSON.stringify(stored));
            if (!draft) draft = stored;
        } catch {
            // Draft read fallback
        }
        if (draft) Object.entries(fields).forEach(([name, field]) => {
            if (field && typeof draft[name] === "string") {
                field.value = draft[name];
                field.dispatchEvent(new Event("change", { bubbles: true }));
            }
        });
        Object.values(fields).forEach(field => { if (field) field.setCustomValidity(""); });
    }
    if (portal && portal.registerDirtyCheck) {
        portal.registerDirtyCheck(() => hasInput() && JSON.stringify(readForm()) !== savedDrafts.get(currentPackage && currentPackage.id)
            ? "a support request for this system is being written" : null);
    }

    function telephone(phone) {
        const number = String(phone || "").replace(/[^+0-9]/g, "");
        return /\d{5}/.test(number) ? `tel:${number}` : "";
    }
    function renderContact(pkg) {
        const hasInstaller = Boolean(pkg && pkg.assignedInstaller && pkg.assignedInstaller.name);

        let name = "";
        let role = "";
        let phone = "";
        let availability = "";

        if (hasInstaller) {
            // If an installer is assigned, show the assigned installer as the primary support contact
            name = pkg.assignedInstaller.name;
            role = `${pkg.assignedInstaller.role || "Certified Solar Master Installer"} (Assigned Installer)`;
            phone = pkg.assignedInstaller.phone || "+63 917 555 0101";
            availability = pkg.assignedInstaller.note || "Primary on-site installer and warranty technician. Mon–Sat, 8am–5pm.";
        } else {
            // If no installer is assigned yet, route support to Hello Solar / Super Admin
            name = "Hello Solar Super Admin / Central Support";
            role = "Super Admin & Central Dispatch (No installer assigned yet)";
            phone = "+63 2 8888 0100";
            availability = "Your solar application is in pre-installation processing. Direct support is routed to Super Admin.";
        }

        const href = telephone(phone) || "mailto:support@hellosolarph.com";

        setText("routingLeadName", name);
        setText("routingLeadRole", role);
        setText("sidebarContactRole", hasInstaller ? "Assigned Installer" : "Super Admin Support");
        setText("sidebarContactName", name);

        if ($("routingLeadPhoneLink")) {
            $("routingLeadPhoneLink").href = href;
            $("routingLeadPhoneLink").setAttribute("aria-label", telephone(phone) ? `Call ${name} at ${phone}` : "Email Hello Solar Support");
        }
        if ($("supportHotlineBtn")) {
            $("supportHotlineBtn").href = href;
            $("supportHotlineBtn").setAttribute("aria-label", telephone(phone) ? `Call ${name}` : "Email Hello Solar Support");
        }
        setText("routingLeadPhone", telephone(phone) ? `Call ${phone}` : "Email support");
        setText("supportHotlineText", telephone(phone) ? `Call ${phone}` : "Email support");

        setText("contactAvailability", availability);
        if ($("contactAvailability")) $("contactAvailability").hidden = false;

        if ($("installerContact")) {
            $("installerContact").hidden = true;
        }

        setText("responseTarget", hasInstaller ? "Within 12 hours (Direct Field Lead)" : "Within 2 hours (Super Admin Priority)");
        setText("supportHours", hasInstaller ? "Mon–Sat, 8am–5pm" : "Mon–Sun, 24/7 Priority Desk");
    }

    function status(ticket) { return ticket.status || "Submitted"; }
    function isResolved(ticket) { return /^(resolved|closed)$/i.test(ticket.status || ""); }
    function isOpen(ticket) { return /^(open|pending|under review|in progress|submitted|new|awaiting response)$/i.test(ticket.status || ""); }
    function statusBadge(ticket) {
        const badge = document.createElement("span");
        badge.className = "support-request-status" + (isResolved(ticket) ? " resolved" : " open");
        badge.textContent = status(ticket);
        return badge;
    }
    function ticketDate(ticket) {
        if (ticket.date) return String(ticket.date);
        if (ticket.createdAt && !Number.isNaN(Date.parse(ticket.createdAt))) {
            return new Date(ticket.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        }
        return "Recent";
    }
    function element(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text != null) el.textContent = text;
        return el;
    }

    // This customer's tickets for the selected system, from the shared support queue
    function sharedTickets() {
        const customer = portal ? portal.getCustomer() : {};
        if (!window.HSShared || !customer.accountId || !currentPackage) return [];
        return window.HSShared.supportTicketsFor("Customer", customer.accountId)
            .filter(t => t.relatedId === currentPackage.appId)
            .map(t => ({
                id: t.id,
                subject: t.subject || t.concern,
                description: t.notes,
                category: t.topic || "General",
                priority: t.priority,
                createdAt: t.createdAt,
                status: t.status,
                resolutionNote: t.resolutionNote || "",
                technician: t.assignedTo || "Hello Solar Support",
                packageId: currentPackage.id,
                accountNo: currentPackage.accountNo
            }));
    }

    function refreshHistory() {
        let local = [];
        if ($("historyStorageWarning")) $("historyStorageWarning").hidden = true;
        try {
            local = readLocal("requests");
        } catch {
            if ($("historyStorageWarning")) {
                setText("historyStorageWarning", "Could not load previously saved requests on this device.");
                $("historyStorageWarning").hidden = false;
            }
        }
        // Shared support queue (Super Admin → Support) is the record; requests saved only on this device before
        // the shared queue existed are still listed.
        currentTickets = [...sharedTickets(), ...local];
        renderHistory();
    }

    function renderHistory() {
        const container = $("ticketHistoryContainer");
        if (!container) return;
        container.replaceChildren();
        const total = currentTickets.length;
        const tools = document.querySelector(".support-history-tools");
        const footer = document.querySelector(".support-history-footer");
        if (tools) tools.hidden = total === 0;
        if (footer) footer.hidden = total === 0;

        setText("ticketCountBadge", `${total} request${total === 1 ? "" : "s"}`);
        setText("ticketHistorySubtitle", `${currentPackage ? currentPackage.name : "Selected system"} · ${total} total request${total === 1 ? "" : "s"}`);

        const query = $("ticketSearchInput") ? $("ticketSearchInput").value.trim().toLowerCase() : "";
        const filter = $("ticketStatusFilter") ? $("ticketStatusFilter").value : "all";
        const filtered = currentTickets.filter(ticket => {
            if (filter === "resolved" && !isResolved(ticket)) return false;
            if (filter === "open" && !isOpen(ticket)) return false;
            return !query || [ticket.subject, ticket.title, ticket.id, ticket.category].some(value => String(value || "").toLowerCase().includes(query));
        });
        const visible = expanded ? filtered : filtered.slice(0, 3);
        if (!visible.length) {
            container.appendChild(element("p", "support-empty-history", total ? "No requests match this search or filter." : "No support requests yet for this system."));
        }
        visible.forEach(ticket => {
            const row = element("article", "support-request-row");
            const info = element("div");
            info.appendChild(element("h3", "", ticket.subject || ticket.title || "Untitled request"));
            const meta = element("div", "support-request-meta");
            meta.append(
                element("span", "", `Reference: ${ticket.id || "Not recorded"}`),
                element("span", "", ticketDate(ticket)),
                element("span", "", ticket.category || "General")
            );
            info.appendChild(meta);

            const actions = element("div", "support-request-actions");
            actions.appendChild(statusBadge(ticket));
            const view = element("button", "support-request-details", "View Details");
            view.type = "button";
            view.setAttribute("aria-label", `View details: ${ticket.subject || ticket.title || ticket.id || "request"}`);
            view.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>');
            view.addEventListener("click", () => openModal(ticket, view));
            actions.appendChild(view);
            row.append(info, actions);
            container.appendChild(row);
        });
        const toggle = $("supportHistoryToggleBtn");
        if (toggle) {
            toggle.hidden = filtered.length <= 3;
            toggle.setAttribute("aria-expanded", String(expanded));
            toggle.textContent = expanded ? "See Less" : "See More";
        }
        setText("historyVisibleCount", filtered.length ? `Showing ${visible.length} of ${filtered.length}${query || filter !== "all" ? " matching requests" : " requests"}` : "");
    }

    const modal = $("ticketDetailModal");
    function openModal(ticket, trigger) {
        if (!modal) return;
        modalTrigger = trigger;
        setText("modalTicketTitle", ticket.id || "Request details");
        setText("modalTicketSubject", ticket.subject || ticket.title || "Untitled request");
        setText("modalTicketCategory", ticket.category || "General");
        setText("modalTicketDate", ticketDate(ticket));
        setText("modalTicketPriority", ticket.priority ? String(ticket.priority).replace(/^./, c => c.toUpperCase()) : "Normal");
        const defaultTech = ($("routingLeadName") && $("routingLeadName").textContent) || "Hello Solar Support";
        setText("modalTicketTechnician", ticket.technician || ticket.assignedTechnician || defaultTech);
        if ($("modalTicketStatus")) $("modalTicketStatus").replaceChildren(statusBadge(ticket));
        const notes = [ticket.description, ticket.notes].filter((note, index, list) => note && list.indexOf(note) === index);
        setText("modalTicketNotes", notes.length ? notes.join("\n\n") : "No additional notes recorded.");
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        modal.classList.add("is-active");
        if ($("modalCloseBtn")) $("modalCloseBtn").focus();
    }
    function closeModal() {
        if (!modal || !modal.classList.contains("is-active")) return;
        modal.classList.remove("is-active");
        document.body.style.overflow = previousOverflow;
        if (modalTrigger && modalTrigger.isConnected) modalTrigger.focus();
    }
    if ($("modalCloseBtn")) $("modalCloseBtn").addEventListener("click", closeModal);
    if ($("modalCloseBtnBottom")) $("modalCloseBtnBottom").addEventListener("click", closeModal);
    if (modal) {
        modal.addEventListener("click", event => { if (event.target === modal) closeModal(); });
    }
    window.addEventListener("keydown", event => {
        if (!modal || !modal.classList.contains("is-active")) return;
        if (event.key === "Escape") { event.preventDefault(); closeModal(); }
        if (event.key === "Tab") {
            const first = $("modalCloseBtn"), last = $("modalCloseBtnBottom");
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); if (last) last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); if (first) first.focus(); }
        }
    });

    function renderPackage(pkg) {
        if (!pkg) {
            closeModal();
            rememberDraft();
            currentPackage = null;
            currentTickets = [];
            if (form) form.reset();
            if ($("submitTicketBtn")) $("submitTicketBtn").disabled = true;
            setText("ticketTargetPackageLabel", "No system selected");
            setText("ticketTargetAccountLabel", "Choose a system in My System to request help.");
            renderContact({});
            renderHistory();
            return;
        }
        const changed = !currentPackage || currentPackage.id !== pkg.id;
        if (changed) { closeModal(); rememberDraft(); }
        currentPackage = pkg;
        if ($("submitTicketBtn")) $("submitTicketBtn").disabled = false;
        if (changed) {
            expanded = false;
            if ($("ticketSearchInput")) $("ticketSearchInput").value = "";
            if ($("ticketStatusFilter")) $("ticketStatusFilter").value = "all";
            restoreDraft();
        }
        setText("ticketTargetPackageLabel", [pkg.name, pkg.capacity].filter(Boolean).join(" · "));
        setText("ticketTargetAccountLabel", `Account reference: ${pkg.accountNo || "Not available"}`);
        renderContact(pkg);
        refreshHistory();
    }

    Object.values(fields).forEach(field => {
        if (!field) return;
        field.addEventListener("input", () => {
            field.setCustomValidity("");
            showError("");
            if ($("ticketSuccessAlert")) $("ticketSuccessAlert").classList.remove("visible");
            setText("draftFeedback", "");
            if (currentPackage) {
                try { writeLocal("draft", readForm()); } catch { /* Ignore draft write errors */ }
            }
        });
    });

    if (form) {
        form.addEventListener("submit", event => {
            event.preventDefault();
            showError("");
            if ($("ticketSuccessAlert")) $("ticketSuccessAlert").classList.remove("visible");
            if (!currentPackage) { showError("Choose a system before submitting a request."); return; }
            if (fields.category && !fields.category.value) {
                showError("Please choose an issue category.");
                const trigger = $("categoryTrigger");
                if (trigger) trigger.focus();
                return;
            }
            if (!fields.description || !fields.description.value.trim()) {
                showError("Please describe the problem.");
                if (fields.description) fields.description.focus();
                return;
            }

            const submitBtn = $("submitTicketBtn");
            if (submitBtn) submitBtn.disabled = true;
            setText("submitBtnText", "Submitting…");

            try {
                const customer = portal ? portal.getCustomer() : {};
                const subject = (fields.subject && fields.subject.value.trim()) || (fields.description && fields.description.value.trim().slice(0, 80)) || "Service Request";
                const category = (fields.category && fields.category.selectedIndex >= 0 && fields.category.options[fields.category.selectedIndex].text) || "General";
                const result = window.HSShared
                    ? window.HSShared.createSupportTicket({
                        accountType: "Customer",
                        accountId: customer.accountId,
                        accountName: customer.name,
                        relatedId: currentPackage.appId,
                        hsId: currentPackage.hsId,
                        subject,
                        category,
                        priority: (fields.priority && fields.priority.value === "urgent") ? "High" : "Medium",
                        description: fields.description ? fields.description.value.trim() : ""
                    })
                    : { ok: false };
                if (!result.ok) throw new Error(result.error || "Support queue unavailable");
                const ticket = result.ticket;
                form.reset();
                drafts.delete(currentPackage.id);
                savedDrafts.delete(currentPackage.id);
                try { localStorage.removeItem(`${packageKey()}:draft`); } catch { /* Ignore */ }

                setText("draftFeedback", "");
                setText("ticketNumberDisplay", `Request Submitted (#${ticket.id})`);
                setText("ticketSuccessMsg", "Your service request has been logged. Our support team will follow up within 24 hours.");
                if ($("ticketSuccessAlert")) $("ticketSuccessAlert").classList.add("visible");
                expanded = false;
                if ($("ticketSearchInput")) $("ticketSearchInput").value = "";
                if ($("ticketStatusFilter")) $("ticketStatusFilter").value = "all";
                refreshHistory();

                if (portal && portal.toast) {
                    portal.toast("Request Submitted", `Ticket #${ticket.id} created for ${currentPackage.name}.`);
                }
            } catch {
                showError("Your request could not be saved right now. Please call or email your contact for immediate help.");
            } finally {
                if (submitBtn) submitBtn.disabled = false;
                setText("submitBtnText", "Submit Request");
            }
        });
    }

    if ($("supportHistoryToggleBtn")) {
        $("supportHistoryToggleBtn").addEventListener("click", () => { expanded = !expanded; renderHistory(); });
    }
    if ($("ticketSearchInput")) {
        $("ticketSearchInput").addEventListener("input", () => { expanded = false; renderHistory(); });
    }
    if ($("ticketStatusFilter")) {
        $("ticketStatusFilter").addEventListener("change", () => { expanded = false; renderHistory(); });
    }

    document.querySelectorAll(".faq-question").forEach((button, index) => {
        const item = button.closest(".faq-item");
        const answer = item.querySelector(".faq-answer");
        if (answer) {
            answer.id = `supportFaqAnswer${index + 1}`;
            answer.hidden = true;
            button.setAttribute("aria-controls", answer.id);
            button.addEventListener("click", () => {
                const open = button.getAttribute("aria-expanded") !== "true";
                button.setAttribute("aria-expanded", String(open));
                answer.hidden = !open;
                item.classList.toggle("open", open);
                const path = button.querySelector("path");
                if (path) path.setAttribute("d", open ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6");
            });
        }
    });

    function initCustomDropdowns() {
        const dropdownContainers = document.querySelectorAll(".custom-dropdown");
        if (!dropdownContainers.length) return;

        dropdownContainers.forEach(dropdown => {
            const trigger = dropdown.querySelector(".custom-dropdown-trigger");
            const menu = dropdown.querySelector(".custom-dropdown-menu");
            const selectedText = dropdown.querySelector(".custom-dropdown-selected");
            const hiddenSelect = dropdown.querySelector("select");
            const items = dropdown.querySelectorAll(".custom-dropdown-item");

            if (!trigger || !menu) return;

            function syncFromSelect() {
                if (!hiddenSelect) return;
                const val = hiddenSelect.value;
                let matched = false;
                items.forEach(it => {
                    const itemVal = it.getAttribute("data-value") || "";
                    if (itemVal === val) {
                        it.classList.add("active");
                        it.setAttribute("aria-selected", "true");
                        const textEl = it.querySelector(".custom-dropdown-item-text");
                        if (selectedText) selectedText.textContent = textEl ? textEl.textContent.trim() : it.textContent.trim();
                        matched = true;
                    } else {
                        it.classList.remove("active");
                        it.setAttribute("aria-selected", "false");
                    }
                });
                if (!matched && items.length > 0) {
                    items[0].classList.add("active");
                    items[0].setAttribute("aria-selected", "true");
                    const textEl = items[0].querySelector(".custom-dropdown-item-text");
                    if (selectedText) selectedText.textContent = textEl ? textEl.textContent.trim() : items[0].textContent.trim();
                }
            }

            function closeDropdown() {
                dropdown.classList.remove("open");
                trigger.setAttribute("aria-expanded", "false");
            }

            function openDropdown() {
                document.querySelectorAll(".custom-dropdown.open").forEach(d => {
                    if (d !== dropdown) {
                        d.classList.remove("open");
                        const otherTrigger = d.querySelector(".custom-dropdown-trigger");
                        if (otherTrigger) otherTrigger.setAttribute("aria-expanded", "false");
                    }
                });
                dropdown.classList.add("open");
                trigger.setAttribute("aria-expanded", "true");
            }

            function toggleDropdown(e) {
                e.stopPropagation();
                if (dropdown.classList.contains("open")) {
                    closeDropdown();
                } else {
                    openDropdown();
                }
            }

            trigger.addEventListener("click", toggleDropdown);

            items.forEach(item => {
                item.addEventListener("click", e => {
                    e.stopPropagation();
                    const value = item.getAttribute("data-value") || "";
                    const textEl = item.querySelector(".custom-dropdown-item-text");
                    const label = textEl ? textEl.textContent.trim() : item.textContent.trim();

                    if (selectedText) selectedText.textContent = label;

                    items.forEach(it => {
                        it.classList.remove("active");
                        it.setAttribute("aria-selected", "false");
                    });
                    item.classList.add("active");
                    item.setAttribute("aria-selected", "true");

                    if (hiddenSelect) {
                        hiddenSelect.value = value;
                        hiddenSelect.dispatchEvent(new Event("input", { bubbles: true }));
                        hiddenSelect.dispatchEvent(new Event("change", { bubbles: true }));
                    }

                    closeDropdown();
                    trigger.focus();
                });

                item.addEventListener("keydown", e => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        item.click();
                    } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        const next = item.nextElementSibling;
                        if (next && next.classList.contains("custom-dropdown-item")) {
                            next.focus();
                        }
                    } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        const prev = item.previousElementSibling;
                        if (prev && prev.classList.contains("custom-dropdown-item")) {
                            prev.focus();
                        } else {
                            trigger.focus();
                        }
                    } else if (e.key === "Escape") {
                        e.preventDefault();
                        closeDropdown();
                        trigger.focus();
                    }
                });
            });

            trigger.addEventListener("keydown", e => {
                if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (!dropdown.classList.contains("open")) {
                        openDropdown();
                    }
                    const activeItem = dropdown.querySelector(".custom-dropdown-item.active") || items[0];
                    if (activeItem) activeItem.focus();
                } else if (e.key === "Escape") {
                    e.preventDefault();
                    closeDropdown();
                }
            });

            if (hiddenSelect) {
                hiddenSelect.addEventListener("change", syncFromSelect);
            }

            const parentForm = dropdown.closest("form");
            if (parentForm) {
                parentForm.addEventListener("reset", () => {
                    setTimeout(() => {
                        syncFromSelect();
                        closeDropdown();
                    }, 10);
                });
            }

            // Initial sync
            syncFromSelect();
        });

        document.addEventListener("click", e => {
            if (!e.target.closest(".custom-dropdown")) {
                document.querySelectorAll(".custom-dropdown.open").forEach(d => {
                    d.classList.remove("open");
                    const trigger = d.querySelector(".custom-dropdown-trigger");
                    if (trigger) trigger.setAttribute("aria-expanded", "false");
                });
            }
        });
    }

    initCustomDropdowns();
    document.body.setAttribute("data-dropdowns-ready", "true");

    window.addEventListener("helloSolarPackageChanged", event => renderPackage(event.detail && event.detail.package));
    window.addEventListener("helloSolarDataLoaded", () => renderPackage(portal && portal.getActivePackage()));
    window.addEventListener("storage", event => {
        if (!currentPackage) return;
        try { if (!event.key || event.key === `${packageKey()}:requests`) refreshHistory(); } catch { /* Ignore */ }
    });
    renderPackage(portal && portal.getActivePackage());
})();
