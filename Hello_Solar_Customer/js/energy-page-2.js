
        (function () {
            "use strict";

            let currentPackage = null;
            let activeModalEquipmentKey = null;
            let lastActiveTrigger = null;

            // Modal elements
            const modalBackdrop = document.getElementById("equipmentModalBackdrop");
            const modalPanel = document.getElementById("equipmentModalPanel");
            const modalCloseBtn = document.getElementById("modalCloseBtn");
            const modalSecondaryCloseBtn = document.getElementById("modalSecondaryCloseBtn");
            const modalEquipmentIcon = document.getElementById("modalEquipmentIcon");
            const modalEquipmentTitle = document.getElementById("modalEquipmentTitle");
            const modalEquipmentModel = document.getElementById("modalEquipmentModel");
            const modalSpecGrid = document.getElementById("modalSpecGrid");
            const modalWarrantyCard = document.getElementById("modalWarrantyCard");

            const EQUIPMENT_ICONS = {
                panels: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M3 10h18M9 4v13M15 4v13M8 21h8M12 17v4"/></svg>`,
                inverter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="m13 7-4 6h6l-4 5"/></svg>`,
                battery: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="17" height="12" rx="3"/><path d="M23 10v4M7 12h3M14 10v4M12 12h4"/></svg>`,
                workmanship: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/></svg>`
            };

            function getEquipmentModalData(key, pkg) {
                if (!pkg) return null;

                if (key === "panels") {
                    const cellTech = (pkg.panelsModel && pkg.panelsModel.includes("Bifacial"))
                        ? "Bifacial Monocrystalline PERC"
                        : "Monocrystalline N-Type TOPCon";
                    const termText = (pkg.warranties && pkg.warranties.panels && pkg.warranties.panels.termText)
                        || "25-Year Performance · 12-Year Product Warranty";

                    return {
                        title: "Solar Panels",
                        model: pkg.panelsModel || "Trina Solar Vertex S+ 450W",
                        icon: EQUIPMENT_ICONS.panels,
                        specs: [
                            { label: "Installed Model", value: pkg.panelsModel || "Trina Solar Vertex S+ 450W" },
                            { label: "Total DC Capacity", value: `${pkg.capacity || "5.4 kW"} DC (${pkg.panelsCount || 12} Panels)` },
                            { label: "Cell Technology", value: cellTech }
                        ],
                        warranty: {
                            duration: termText,
                            coverage: "Guarantees power output efficiency and protects against manufacturing defects."
                        }
                    };
                }

                if (key === "inverter") {
                    const termText = (pkg.warranties && pkg.warranties.inverter && pkg.warranties.inverter.termText)
                        || "5-Year Warranty";
                    const serial = pkg.inverterSerial || "SOLIS-5K-202503-8891";

                    return {
                        title: "Inverter",
                        model: pkg.inverterModel || "Solis 5kW Hybrid Inverter",
                        icon: EQUIPMENT_ICONS.inverter,
                        specs: [
                            { label: "Installed Model", value: pkg.inverterModel || "Solis 5kW Hybrid Inverter" },
                            { label: "Serial Number", value: serial, isMonospace: true },
                            { label: "System Type", value: pkg.systemType || "Residential Hybrid Inverter" }
                        ],
                        warranty: {
                            duration: termText,
                            coverage: "Full coverage for repairs, internal electronics, and datalogger components."
                        }
                    };
                }

                if (key === "battery") {
                    if (pkg.hasBattery === false) {
                        return {
                            title: "Battery Storage",
                            model: "Grid-Tied Architecture (No Battery Unit)",
                            icon: EQUIPMENT_ICONS.battery,
                            specs: [
                                { label: "System Architecture", value: "Direct Grid-Tied Solar System" },
                                { label: "Battery Unit", value: "None (Direct Solar Daytime Export)" }
                            ],
                            warranty: {
                                duration: "Grid-Tied Configuration",
                                coverage: "Not applicable — this system operates without a battery storage unit."
                            }
                        };
                    }

                    const termText = (pkg.warranties && pkg.warranties.battery && pkg.warranties.battery.termText)
                        || "10-Year / 6,000 Cycles";
                    const usableCap = (pkg.energy && pkg.energy.batteryReserve)
                        ? `${pkg.energy.batteryReserve} Usable Reserve`
                        : (pkg.batteryCapacity || "—");

                    return {
                        title: "Battery Storage",
                        model: pkg.batteryCapacity || "10 kWh Lithium-ion Reserve",
                        icon: EQUIPMENT_ICONS.battery,
                        specs: [
                            { label: "Battery Model", value: pkg.batteryCapacity || "10 kWh Lithium-ion Reserve" },
                            { label: "Cell Chemistry", value: "LiFePO4 (Lithium Iron Phosphate)" },
                            { label: "Usable Capacity", value: usableCap }
                        ],
                        warranty: {
                            duration: termText,
                            coverage: "Guarantees capacity retention above 70% and battery management system protection."
                        }
                    };
                }

                if (key === "workmanship") {
                    const installer = (pkg.assignedInstaller && pkg.assignedInstaller.name)
                        || (pkg.install && pkg.install.assignedTeam && pkg.install.assignedTeam.name)
                        || "Hello Solar Support";
                    const phone = (pkg.assignedInstaller && pkg.assignedInstaller.phone)
                        || "+63 2 8888 0100";
                    const termText = (pkg.warranties && pkg.warranties.workmanship && pkg.warranties.workmanship.termText)
                        || "5-Year Coverage";

                    return {
                        title: "Workmanship & Installation",
                        model: `Certified by ${installer}`,
                        icon: EQUIPMENT_ICONS.workmanship,
                        specs: [
                            { label: "Certified Lead Installer", value: installer },
                            { label: "Direct Field Contact", value: phone },
                            { label: "Included Scope", value: "Roof penetrations, racking security & electrical connections" }
                        ],
                        warranty: {
                            duration: termText,
                            coverage: "100% labor, weather-tight roof penetrations, and electrical wiring."
                        }
                    };
                }

                return null;
            }

            function populateModal(key, pkg) {
                const data = getEquipmentModalData(key, pkg);
                if (!data) return;

                if (modalEquipmentIcon) modalEquipmentIcon.innerHTML = data.icon;
                if (modalEquipmentTitle) modalEquipmentTitle.textContent = data.title;
                if (modalEquipmentModel) modalEquipmentModel.textContent = data.model;

                if (modalSpecGrid) {
                    modalSpecGrid.innerHTML = data.specs.map(s => `
                        <div class="modal-spec-row">
                            <span class="modal-spec-label">${s.label}</span>
                            <span class="modal-spec-value"${s.isMonospace ? ' style="font-family: monospace; font-size: 12px;"' : ""}>${s.value}</span>
                        </div>
                    `).join("");
                }

                if (modalWarrantyCard) {
                    modalWarrantyCard.innerHTML = `
                        <div class="warranty-sub-item">
                            <span class="warranty-sub-label">Duration</span>
                            <span class="warranty-sub-value"><strong>${data.warranty.duration}</strong></span>
                        </div>
                        <div class="warranty-sub-item">
                            <span class="warranty-sub-label">Coverage</span>
                            <span class="warranty-sub-value">${data.warranty.coverage}</span>
                        </div>
                    `;
                }
            }

            function openEquipmentModal(key) {
                if (!modalBackdrop) return;
                activeModalEquipmentKey = key;
                lastActiveTrigger = document.activeElement;

                const pkg = currentPackage || ((window.HelloSolar && window.HelloSolar.getActivePackage)
                    ? window.HelloSolar.getActivePackage()
                    : null);
                populateModal(key, pkg);

                // Prevent page shift when modal opens by compensating for scrollbar width
                const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
                if (scrollbarWidth > 0) {
                    document.body.style.paddingRight = `${scrollbarWidth}px`;
                }
                document.body.style.overflow = "hidden";

                modalBackdrop.classList.add("is-open");
                modalBackdrop.setAttribute("aria-hidden", "false");

                // Focus close button for accessibility
                if (modalCloseBtn) {
                    setTimeout(() => modalCloseBtn.focus(), 50);
                }
            }

            function closeEquipmentModal() {
                if (!modalBackdrop) return;
                modalBackdrop.classList.remove("is-open");
                modalBackdrop.setAttribute("aria-hidden", "true");
                document.body.style.overflow = "";
                document.body.style.paddingRight = "";
                activeModalEquipmentKey = null;

                if (lastActiveTrigger && typeof lastActiveTrigger.focus === "function") {
                    lastActiveTrigger.focus();
                }
            }

            function renderSystemDetailsAndWarranties(pkg) {
                if (!pkg) return;

                // Section Account Name
                const specCurrentPkgName = document.getElementById("specCurrentPkgName");
                if (specCurrentPkgName) specCurrentPkgName.textContent = pkg.name || "Home Primary";

                // 1. Solar Panels Card
                const panelCountPill = document.getElementById("panelCountPill");
                const specPanelsModel = document.getElementById("specPanelsModel");
                const warrantyPanelsTerm = document.getElementById("warrantyPanelsTerm");

                if (panelCountPill) panelCountPill.textContent = `${pkg.panelsCount || 12} Panels`;
                if (specPanelsModel) specPanelsModel.textContent = pkg.panelsModel || "Trina Solar Vertex S+ 450W";
                if (warrantyPanelsTerm) {
                    const term = (pkg.warranties && pkg.warranties.panels && pkg.warranties.panels.termText)
                        || "25-Year Performance · 12-Year Product";
                    warrantyPanelsTerm.textContent = term;
                }

                // 2. Inverter Card
                const inverterTypePill = document.getElementById("inverterTypePill");
                const specInverterModel = document.getElementById("specInverterModel");
                const warrantyInverterTerm = document.getElementById("warrantyInverterTerm");

                if (inverterTypePill) inverterTypePill.textContent = "System Inverter";
                if (specInverterModel) specInverterModel.textContent = pkg.inverterModel || "Solis 5kW Hybrid Inverter";
                if (warrantyInverterTerm) {
                    const term = (pkg.warranties && pkg.warranties.inverter && pkg.warranties.inverter.termText)
                        || "5-Year Warranty";
                    warrantyInverterTerm.textContent = term;
                }

                // 3. Battery Card
                const batteryCapacityPill = document.getElementById("batteryCapacityPill");
                const batteryPurposeText = document.getElementById("batteryPurposeText");
                const specBatteryModel = document.getElementById("specBatteryModel");
                const warrantyBatteryTerm = document.getElementById("warrantyBatteryTerm");

                if (pkg.hasBattery === false) {
                    if (batteryCapacityPill) {
                        batteryCapacityPill.textContent = "No Battery Storage";
                        batteryCapacityPill.className = "equipment-metric-pill neutral";
                    }
                    if (batteryPurposeText) {
                        batteryPurposeText.textContent = "Direct daytime solar power (no battery unit installed).";
                    }
                    if (specBatteryModel) specBatteryModel.textContent = "Grid-Tied (No Battery)";
                    if (warrantyBatteryTerm) {
                        warrantyBatteryTerm.textContent = "Grid-Tied (No Battery)";
                    }
                } else {
                    if (batteryCapacityPill) {
                        const rawCap = (pkg.energy && pkg.energy.batteryReserve)
                            ? pkg.energy.batteryReserve
                            : (pkg.batteryCapacity || "10 kWh");
                        const cleanCap = rawCap.replace(/Lithium-ion /i, "").replace(/Reserve/i, "").trim();
                        batteryCapacityPill.textContent = cleanCap.includes("Storage") ? cleanCap : `${cleanCap} Storage`;
                        batteryCapacityPill.className = "equipment-metric-pill";
                    }
                    if (batteryPurposeText) {
                        batteryPurposeText.textContent = "Stores electricity for later use.";
                    }
                    if (specBatteryModel) specBatteryModel.textContent = pkg.batteryCapacity || "10 kWh Lithium-ion Reserve";
                    if (warrantyBatteryTerm) {
                        const term = (pkg.warranties && pkg.warranties.battery && pkg.warranties.battery.termText)
                            || "10-Year / 6,000 Cycles";
                        warrantyBatteryTerm.textContent = term;
                    }
                }

                // 4. Workmanship Card
                const warrantyInstallerName = document.getElementById("warrantyInstallerName");
                const warrantyWorkmanshipTerm = document.getElementById("warrantyWorkmanshipTerm");

                if (warrantyInstallerName) {
                    warrantyInstallerName.textContent = (pkg.assignedInstaller && pkg.assignedInstaller.name)
                        || (pkg.install && pkg.install.assignedTeam && pkg.install.assignedTeam.name)
                        || "Hello Solar Support";
                }
                if (warrantyWorkmanshipTerm) {
                    const term = (pkg.warranties && pkg.warranties.workmanship && pkg.warranties.workmanship.termText)
                        || "5-Year Coverage";
                    warrantyWorkmanshipTerm.textContent = term;
                }

                // Before ACTIVE vs After ACTIVE Equipment Details
                const isAct = (window.HelloSolar && window.HelloSolar.isSystemActive)
                    ? window.HelloSolar.isSystemActive(pkg)
                    : (pkg.projectStatus === "Active");

                const noticeEl = document.getElementById("equipmentActivationNotice");
                const stageTextEl = document.getElementById("equipmentStageText");
                if (noticeEl) {
                    noticeEl.style.display = isAct ? "none" : "block";
                }
                if (stageTextEl) {
                    stageTextEl.textContent = (window.HelloSolar && window.HelloSolar.getProjectStatus)
                        ? window.HelloSolar.getProjectStatus(pkg)
                        : (pkg.projectStatus || "Installation In Progress");
                }

                // Update detail buttons text & locked state
                document.querySelectorAll(".btn-view-details").forEach(btn => {
                    if (!isAct) {
                        btn.innerHTML = `Available after system activation <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;margin-left:4px;"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
                        btn.style.color = "#ea580c";
                        btn.style.fontSize = "12px";
                    } else {
                        btn.innerHTML = `View Details <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
                        btn.style.color = "";
                        btn.style.fontSize = "";
                    }
                });

                // Refresh modal content if currently open
                if (activeModalEquipmentKey && modalBackdrop && modalBackdrop.classList.contains("is-open")) {
                    populateModal(activeModalEquipmentKey, pkg);
                }
            }

            function renderEnergyPage(pkg) {
                if (!pkg) return;
                currentPackage = pkg;
                renderSystemDetailsAndWarranties(pkg);
            }

            // Keyboard and Modal event listeners
            if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeEquipmentModal);
            if (modalSecondaryCloseBtn) modalSecondaryCloseBtn.addEventListener("click", closeEquipmentModal);
            if (modalBackdrop) {
                modalBackdrop.addEventListener("click", (e) => {
                    if (e.target === modalBackdrop) closeEquipmentModal();
                });
            }

            window.addEventListener("keydown", (e) => {
                if (e.key === "Escape" && modalBackdrop && modalBackdrop.classList.contains("is-open")) {
                    closeEquipmentModal();
                }
            });

            // Focus trap within modal
            if (modalPanel) {
                modalPanel.addEventListener("keydown", (e) => {
                    if (e.key === "Tab") {
                        const focusables = modalPanel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                        if (!focusables || focusables.length === 0) return;
                        const first = focusables[0];
                        const last = focusables[focusables.length - 1];
                        if (e.shiftKey && document.activeElement === first) {
                            e.preventDefault();
                            last.focus();
                        } else if (!e.shiftKey && document.activeElement === last) {
                            e.preventDefault();
                            first.focus();
                        }
                    }
                });
            }

            // Bind "View Details" buttons
            document.querySelectorAll(".btn-view-details").forEach(btn => {
                btn.addEventListener("click", () => {
                    const pkg = currentPackage || ((window.HelloSolar && window.HelloSolar.getActivePackage)
                        ? window.HelloSolar.getActivePackage()
                        : null);
                    const isAct = (window.HelloSolar && window.HelloSolar.isSystemActive)
                        ? window.HelloSolar.isSystemActive(pkg)
                        : (pkg && pkg.projectStatus === "Active");

                    if (!isAct) {
                        if (window.HelloSolar && window.HelloSolar.toast) {
                            window.HelloSolar.toast(
                                "Available After Activation",
                                `Full equipment serial numbers and warranty registration for ${pkg ? pkg.name : 'this system'} are available after system activation.`
                            );
                        }
                        return;
                    }

                    const eqKey = btn.dataset.equipment;
                    if (eqKey) openEquipmentModal(eqKey);
                });
            });

            // Initial Render
            const initialPkg = (window.HelloSolar && window.HelloSolar.getActivePackage)
                ? window.HelloSolar.getActivePackage()
                : null;
            if (initialPkg) renderEnergyPage(initialPkg);

            // Listen for package changes from other tabs / sources
            window.addEventListener("helloSolarPackageChanged", (e) => {
                if (e.detail && e.detail.package) {
                    renderEnergyPage(e.detail.package);
                }
            });

            // Listen for dataset async load completion
            window.addEventListener("helloSolarDataLoaded", () => {
                const active = window.HelloSolar ? window.HelloSolar.getActivePackage() : null;
                if (active) {
                    renderEnergyPage(active);
                }
            });
        })();
    