
(function () {
    "use strict";

    // --------------------------------------------------------------------------
    // 1. LINKED PACKAGES REPOSITORY & CUSTOMER STATE
    // --------------------------------------------------------------------------
    const activeCustomer = (window.HelloSolar && window.HelloSolar.getCustomer)
        ? window.HelloSolar.getCustomer()
        : { name: "", accountId: "" };

    const userIdent = (window.HelloSolar && window.HelloSolar.getCustomerIdentifier)
        ? window.HelloSolar.getCustomerIdentifier()
        : (activeCustomer.accountId || "signed_out");

    let packages = (window.HelloSolar && window.HelloSolar.getLinkedPackages)
        ? window.HelloSolar.getLinkedPackages()
        : [];

    // --------------------------------------------------------------------------
    // 2. USER-OWNED SYSTEMS (shared application records scoped to this customer by portal.js)
    // --------------------------------------------------------------------------
    function getUserPackages() {
        return Array.isArray(packages) ? packages : [];
    }

    // --------------------------------------------------------------------------
    // 3. ACTIVATION STATE (read-only: set by the installer / Direct Engineer on the shared record)
    // --------------------------------------------------------------------------
    // Acceptance is supplied by the model record, independently of activation.
    function isModelAccepted(pkg) {
        return !!pkg && pkg.installerAcceptanceStatus === "accepted";
    }

    function isSystemActivated(pkg) {
        return !!pkg && (pkg.projectStatus === "Active" || pkg.systemStatus === "Active");
    }

    // --------------------------------------------------------------------------
    // 4. INSTALLATION MILESTONES (read-only view of the installer's shared progress)
    // --------------------------------------------------------------------------
    // Same read-only milestones the portal derives from the installer's shared progress
    function getSystemMilestones(pkg) {
        return pkg && pkg.install && Array.isArray(pkg.install.milestones) ? pkg.install.milestones : [];
    }

    // --------------------------------------------------------------------------
    // 5. TELEMETRY DISPLAY & STREAM CONTROLLER
    // --------------------------------------------------------------------------
    const liveSolarWattsEl = document.getElementById("liveSolarWatts");
    const liveBatteryWattsEl = document.getElementById("liveBatteryWatts");
    const liveBatterySocEl = document.getElementById("liveBatterySoc");
    const liveInverterWattsEl = document.getElementById("liveInverterWatts");
    const liveHomeWattsEl = document.getElementById("liveHomeWatts");
    const liveGridWattsEl = document.getElementById("liveGridWatts");
    const liveGridSyncEl = document.getElementById("liveGridSync");
    const livePvStringsEl = document.getElementById("livePvStrings");
    const liveInverterTempEl = document.getElementById("liveInverterTemp");
    const liveIndependenceEl = document.getElementById("liveIndependence");
    const liveGridStateEl = document.getElementById("liveGridState");
    const flowLineBattery = document.getElementById("flowLineBattery");
    const flowLineGrid = document.getElementById("flowLineGrid");
    const telemetryTimestampEl = document.getElementById("telemetryTimestamp");
    const telemetrySyncBtn = document.getElementById("telemetrySyncBtn");
    const syncBtnLabel = document.getElementById("syncBtnLabel");

    let currentPackage = null;
    let currentPackageGeneration = 0;
    let secondsSinceSync = 1;
    let baseSolar = 3.85;
    let baseHome = 1.95;
    let baseBattery = 1.25;
    let currentBatterySoc = 92;
    let telemetryIntervalId = null;
    let tickerIntervalId = null;
    let previousScrollY = 0;
    let lastTriggerElement = null;

    // --------------------------------------------------------------------------
    // Live Telemetry UI states: online | offline | loading | unavailable
    // State is derived from the existing data source (pkg.telemetry / telemetry.status);
    // a real inverter API can later feed the same fields without UI changes.
    // --------------------------------------------------------------------------
    let telemetryState = "loading";
    const telemetryPanelEl = document.getElementById("telemetryMasterPanel");
    const TELEMETRY_STATE_COPY = {
        online: { badge: "LIVE", footer: "System operating normally" },
        loading: { badge: "CONNECTING", footer: "Connecting to your inverter…" },
        offline: {
            badge: "OFFLINE",
            footer: "Inverter offline",
            title: "System Offline",
            desc: "We can't reach your inverter right now. Live readings will resume automatically once it reconnects."
        },
        unavailable: {
            badge: "NO DATA",
            footer: "Telemetry data unavailable",
            title: "Data Unavailable",
            desc: "Live telemetry hasn't been received for this system yet. Please check back later or contact support."
        }
    };
    const TELEMETRY_STATUS_ICONS = {
        online: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#16a34a"/><polyline points="16 9 10.5 15 8 12.5" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        loading: '<span class="telemetry-status-spinner" aria-hidden="true"></span>',
        offline: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#dc2626"/><path d="M15 9l-6 6M9 9l6 6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>',
        unavailable: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#94a3b8"/><path d="M12 7v6M12 16.5v.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>'
    };

    function resolveTelemetryState(pkg) {
        const t = pkg && pkg.telemetry;
        if (!t) return "unavailable";
        const status = String(t.status || "live").trim().toLowerCase();
        if (["offline", "disconnected", "down", "fault", "error"].includes(status)) return "offline";
        if (["unavailable", "no_data", "nodata", "none", "unknown"].includes(status)) return "unavailable";
        return "online";
    }

    function formatTelemetryTime(iso) {
        const d = iso ? new Date(iso) : null;
        if (!d || isNaN(d)) return "";
        return d.toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    }

    // Value + unit rendered separately for a clearer reading hierarchy
    function setReading(el, value, unit) {
        if (!el) return;
        el.innerHTML = `<span class="tel-val">${value}</span>${unit ? `<span class="tel-unit">${unit}</span>` : ""}`;
    }

    function setTelemetryState(state) {
        telemetryState = state;
        const copy = TELEMETRY_STATE_COPY[state] || TELEMETRY_STATE_COPY.unavailable;
        if (telemetryPanelEl) {
            telemetryPanelEl.dataset.state = state;
            telemetryPanelEl.setAttribute("aria-busy", state === "loading" ? "true" : "false");
        }
        const badge = telemetryPanelEl && telemetryPanelEl.querySelector(".telemetry-live-badge");
        if (badge) {
            badge.dataset.state = state;
            badge.innerHTML = `<span class="telemetry-pulse-dot" aria-hidden="true"></span><span class="telemetry-badge-label">${copy.badge}</span>`;
        }
        const msg = telemetryPanelEl && telemetryPanelEl.querySelector(".telemetry-status-msg");
        if (msg) msg.innerHTML = `${TELEMETRY_STATUS_ICONS[state] || ""}<span>${copy.footer}</span>`;
        const notice = document.getElementById("telemetryStateNotice");
        if (notice) {
            const show = state === "offline" || state === "unavailable";
            notice.hidden = !show;
            if (show) {
                const titleEl = notice.querySelector(".telemetry-state-notice-title");
                const descEl = notice.querySelector(".telemetry-state-notice-desc");
                if (titleEl) titleEl.textContent = copy.title;
                if (descEl) descEl.textContent = copy.desc;
            }
        }
        if (telemetrySyncBtn) telemetrySyncBtn.disabled = state === "loading";
    }

    function renderTelemetryPlaceholders(state) {
        const dash = "—";
        setReading(liveSolarWattsEl, dash, "kW");
        setReading(liveInverterWattsEl, dash, "kW");
        setReading(liveHomeWattsEl, dash, "kW");
        setReading(liveBatterySocEl, dash, "%");
        setReading(liveGridWattsEl, dash, "kW");
        if (liveGridWattsEl) liveGridWattsEl.style.color = "";
        const label = state === "offline" ? "Offline" : "No data";
        if (liveBatteryWattsEl) liveBatteryWattsEl.textContent = label;
        if (liveGridStateEl) liveGridStateEl.textContent = label;
        if (liveGridSyncEl) liveGridSyncEl.textContent = `${dash} V · ${dash} Hz`;
        if (livePvStringsEl) livePvStringsEl.textContent = state === "offline" ? "PV strings: Offline" : "PV strings: No data";
        if (liveInverterTempEl) liveInverterTempEl.textContent = label;
        if (liveIndependenceEl) liveIndependenceEl.textContent = label;
        if (telemetryTimestampEl) {
            const lastSeen = state === "offline" && currentPackage.telemetry
                ? formatTelemetryTime(currentPackage.telemetry.lastUpdated) : "";
            telemetryTimestampEl.textContent = lastSeen ? `Last seen ${lastSeen}` : "No data received";
        }
        setTelemetryState(state);
        updateFlowConnectors();
    }

    function updateTelemetryDisplay() {
        if (!currentPackage) return;

        const resolvedState = resolveTelemetryState(currentPackage);
        if (resolvedState !== "online") {
            renderTelemetryPlaceholders(resolvedState);
            return;
        }
        if (telemetryState !== "online") setTelemetryState("online");

        const solarJitter = (Math.random() * 0.12 - 0.06);
        const homeJitter = (Math.random() * 0.08 - 0.04);
        const batteryJitter = (Math.random() * 0.04 - 0.02);

        const currentSolar = Math.max(1.2, +(baseSolar + solarJitter).toFixed(2));
        const currentHome = Math.max(0.6, +(baseHome + homeJitter).toFixed(2));
        const currentBattery = Math.max(0.2, +(baseBattery + batteryJitter).toFixed(2));
        const currentGrid = +(currentSolar - currentHome - currentBattery).toFixed(2);

        setReading(liveSolarWattsEl, currentSolar.toFixed(2), "kW");
        setReading(liveInverterWattsEl, currentSolar.toFixed(2), "kW");
        setReading(liveHomeWattsEl, currentHome.toFixed(2), "kW");
        setReading(liveBatterySocEl, currentBatterySoc, "%");
        if (liveBatteryWattsEl) {
            const isCharging = currentBattery >= 0;
            const bState = isCharging ? "Charging" : "Discharging";
            liveBatteryWattsEl.textContent = `${bState} · ${Math.abs(currentBattery).toFixed(2)} kW`;
        }

        if (liveGridWattsEl) {
            if (currentGrid >= 0) {
                setReading(liveGridWattsEl, `+${currentGrid.toFixed(2)}`, "kW");
                liveGridWattsEl.style.color = "var(--navy)";
            } else {
                setReading(liveGridWattsEl, currentGrid.toFixed(2), "kW");
                liveGridWattsEl.style.color = "#d97706";
            }
        }

        // Dynamic Solar Independence calculation
        if (liveIndependenceEl) {
            if (currentGrid >= 0) {
                liveIndependenceEl.textContent = "100% Solar";
            } else {
                const pct = Math.min(99, Math.max(10, Math.round((currentSolar / currentHome) * 100)));
                liveIndependenceEl.textContent = `${pct}% Solar`;
            }
        }

        // Dynamic Battery Flow Direction
        if (flowLineBattery) {
            if (currentBattery > 0) {
                flowLineBattery.classList.remove("flow-reverse");
                flowLineBattery.classList.add("flow-forward");
            } else {
                flowLineBattery.classList.remove("flow-forward");
                flowLineBattery.classList.add("flow-reverse");
            }
        }
        const flowLineBatteryAnim = document.getElementById("flowLineBatteryAnim");
        if (flowLineBatteryAnim) {
            if (currentBattery > 0) {
                flowLineBatteryAnim.classList.remove("flow-reverse");
                flowLineBatteryAnim.classList.add("flow-forward");
            } else {
                flowLineBatteryAnim.classList.remove("flow-forward");
                flowLineBatteryAnim.classList.add("flow-reverse");
            }
        }

        // Dynamic Grid Flow Direction and State
        if (flowLineGrid) {
            if (currentGrid >= 0) {
                flowLineGrid.classList.remove("flow-reverse");
                flowLineGrid.classList.add("flow-forward");
                if (liveGridStateEl) liveGridStateEl.textContent = "Exporting";
            } else {
                flowLineGrid.classList.remove("flow-forward");
                flowLineGrid.classList.add("flow-reverse");
                if (liveGridStateEl) liveGridStateEl.textContent = "Importing";
            }
        }
        const flowLineGridAnim = document.getElementById("flowLineGridAnim");
        if (flowLineGridAnim) {
            if (currentGrid >= 0) {
                flowLineGridAnim.classList.remove("flow-reverse");
                flowLineGridAnim.classList.add("flow-forward");
            } else {
                flowLineGridAnim.classList.remove("flow-forward");
                flowLineGridAnim.classList.add("flow-reverse");
            }
        }

        if (currentPackage.telemetry) {
            const baseV = currentPackage.telemetry.gridSync ? currentPackage.telemetry.gridSync.split("V")[0].trim() : "230.0";
            const jitterV = (+baseV + (Math.random() * 0.6 - 0.3)).toFixed(1);
            if (liveGridSyncEl) liveGridSyncEl.textContent = `${jitterV} V · 60.0 Hz`;
            if (livePvStringsEl) livePvStringsEl.textContent = currentPackage.telemetry.pvStrings || "PV: OK";
            if (liveInverterTempEl) liveInverterTempEl.textContent = currentPackage.telemetry.inverterTemp || "Normal";
            const gridMetaEl = document.querySelector("#nodeGrid .sec-meta");
            if (gridMetaEl) gridMetaEl.textContent = currentPackage.telemetry.gridStatus || "Grid locked · PF 0.99";
        }

        secondsSinceSync = 1;
        if (telemetryTimestampEl) telemetryTimestampEl.textContent = "Sync: 1s ago";

        updateFlowConnectors();
    }

    function updateFlowConnectors() {
        requestAnimationFrame(() => {
            const stage = document.querySelector(".power-flow-stage");
            if (!stage || stage.offsetParent === null) return;
            const sRect = stage.getBoundingClientRect();
            if (sRect.width === 0 || sRect.height === 0) return;

            const nodeSolar = document.getElementById("nodeSolar");
            const nodeInverter = document.getElementById("nodeInverter");
            const nodeHome = document.getElementById("nodeHome");
            const nodeBattery = document.getElementById("nodeBattery");
            const nodeGrid = document.getElementById("nodeGrid");

            if (!nodeSolar || !nodeInverter || !nodeHome || !nodeBattery || !nodeGrid) return;

            const sL = sRect.left;
            const sT = sRect.top;

            const rSolar = nodeSolar.getBoundingClientRect();
            const rInverter = nodeInverter.getBoundingClientRect();
            const rHome = nodeHome.getBoundingClientRect();
            const rBattery = nodeBattery.getBoundingClientRect();
            const rGrid = nodeGrid.getBoundingClientRect();

            const isMobile = window.innerWidth <= 768;

            // Inverter center & radius
            const invCx = (rInverter.left + rInverter.right) / 2 - sL;
            const invCy = (rInverter.top + rInverter.bottom) / 2 - sT;
            const invR = rInverter.width / 2;

            // Battery & Grid state
            const isBatteryCharging = !flowLineBattery || !flowLineBattery.classList.contains("flow-reverse");
            const isGridExporting = !flowLineGrid || !flowLineGrid.classList.contains("flow-reverse");

            let pSolar = "";
            let dArrowSolar = "";
            let dotSolarInvPt = { x: 0, y: 0 };

            let pHome = "";
            let dArrowHome = "";
            let dotHomeInvPt = { x: 0, y: 0 };
            let dotHomeEndPt = { x: 0, y: 0 };

            let pBattery = "";
            let dArrowBattery = "";
            let dotBatteryInvPt = { x: 0, y: 0 };
            let dotBatteryEndPt = { x: 0, y: 0 };

            let pGrid = "";
            let dArrowGrid = "";
            let dotGridInvPt = { x: 0, y: 0 };
            let dotGridEndPt = { x: 0, y: 0 };

            if (!isMobile) {
                // -------------------------------------------------------------
                // DESKTOP LAYOUT (Centerline alignment & balanced pair below)
                // -------------------------------------------------------------

                // 1. Solar to Inverter (Exact horizontal centerline)
                const solX = rSolar.right - sL;
                const invSolX = invCx - invR;
                pSolar = `M ${solX} ${invCy} L ${invSolX} ${invCy}`;
                const midSolX = (solX + invSolX) / 2;
                dArrowSolar = `M ${midSolX - 5} ${invCy - 4.5} L ${midSolX + 4} ${invCy} L ${midSolX - 5} ${invCy + 4.5} Z`;
                dotSolarInvPt = { x: invSolX, y: invCy };

                // 2. Inverter to Home (Exact horizontal centerline)
                const invHomX = invCx + invR;
                const homX = rHome.left - sL;
                pHome = `M ${invHomX} ${invCy} L ${homX} ${invCy}`;
                const midHomX = (invHomX + homX) / 2;
                dArrowHome = `M ${midHomX - 5} ${invCy - 4.5} L ${midHomX + 4} ${invCy} L ${midHomX - 5} ${invCy + 4.5} Z`;
                dotHomeInvPt = { x: invHomX, y: invCy };
                dotHomeEndPt = { x: homX, y: invCy };

                // 3. Inverter to Battery (Bottom-left arc to Battery top edge)
                const dxBat = -invR * 0.44;
                const dyBat = Math.sqrt(Math.max(0, invR * invR - dxBat * dxBat));
                const invBatStartX = invCx + dxBat;
                const invBatStartY = invCy + dyBat;

                const batCenterX = (rBattery.left + rBattery.right) / 2 - sL;
                const batTopY = rBattery.top - sT;
                const batEndX = batCenterX + Math.min(24, rBattery.width * 0.12);

                const elbowBatY = (invBatStartY + batTopY) / 2;
                const crBat = Math.min(10, Math.max(3, (batTopY - invBatStartY) / 3), Math.abs(batEndX - invBatStartX) / 2);
                pBattery = `M ${invBatStartX} ${invBatStartY} L ${invBatStartX} ${elbowBatY - crBat} Q ${invBatStartX} ${elbowBatY} ${invBatStartX - crBat} ${elbowBatY} L ${batEndX + crBat} ${elbowBatY} Q ${batEndX} ${elbowBatY} ${batEndX} ${elbowBatY + crBat} L ${batEndX} ${batTopY}`;

                const arrBatX = batEndX;
                const arrBatY = (elbowBatY + crBat + batTopY) / 2;
                if (isBatteryCharging) {
                    dArrowBattery = `M ${arrBatX - 4.5} ${arrBatY - 5} L ${arrBatX} ${arrBatY + 4} L ${arrBatX + 4.5} ${arrBatY - 5} Z`;
                } else {
                    dArrowBattery = `M ${arrBatX - 4.5} ${arrBatY + 5} L ${arrBatX} ${arrBatY - 4} L ${arrBatX + 4.5} ${arrBatY + 5} Z`;
                }
                dotBatteryInvPt = { x: invBatStartX, y: invBatStartY };
                dotBatteryEndPt = { x: batEndX, y: batTopY };

                // 4. Inverter to Grid (Bottom-right arc to Grid top edge)
                const dxGrd = invR * 0.44;
                const dyGrd = Math.sqrt(Math.max(0, invR * invR - dxGrd * dxGrd));
                const invGrdStartX = invCx + dxGrd;
                const invGrdStartY = invCy + dyGrd;

                const grdCenterX = (rGrid.left + rGrid.right) / 2 - sL;
                const grdTopY = rGrid.top - sT;
                const grdEndX = grdCenterX - Math.min(24, rGrid.width * 0.12);

                const elbowGrdY = (invGrdStartY + grdTopY) / 2;
                const crGrd = Math.min(10, Math.max(3, (grdTopY - invGrdStartY) / 3), Math.abs(grdEndX - invGrdStartX) / 2);
                pGrid = `M ${invGrdStartX} ${invGrdStartY} L ${invGrdStartX} ${elbowGrdY - crGrd} Q ${invGrdStartX} ${elbowGrdY} ${invGrdStartX + crGrd} ${elbowGrdY} L ${grdEndX - crGrd} ${elbowGrdY} Q ${grdEndX} ${elbowGrdY} ${grdEndX} ${elbowGrdY + crGrd} L ${grdEndX} ${grdTopY}`;

                const arrGrdX = grdEndX;
                const arrGrdY = (elbowGrdY + crGrd + grdTopY) / 2;
                if (isGridExporting) {
                    dArrowGrid = `M ${arrGrdX - 4.5} ${arrGrdY - 5} L ${arrGrdX} ${arrGrdY + 4} L ${arrGrdX + 4.5} ${arrGrdY - 5} Z`;
                } else {
                    dArrowGrid = `M ${arrGrdX - 4.5} ${arrGrdY + 5} L ${arrGrdX} ${arrGrdY - 4} L ${arrGrdX + 4.5} ${arrGrdY + 5} Z`;
                }
                dotGridInvPt = { x: invGrdStartX, y: invGrdStartY };
                dotGridEndPt = { x: grdEndX, y: grdTopY };

            } else {
                // -------------------------------------------------------------
                // MOBILE 4-CORNER HUB ARRANGEMENT:
                // Top-Left: Solar Panels | Top-Right: Grid
                // Center: Circular Hybrid Inverter
                // Bottom-Left: Battery   | Bottom-Right: Home / Usage
                // -------------------------------------------------------------

                function getCardBorderPoint(rCard, targetX, targetY) {
                    const left = rCard.left - sL;
                    const right = rCard.right - sL;
                    const top = rCard.top - sT;
                    const bottom = rCard.bottom - sT;
                    const cx = (left + right) / 2;
                    const cy = (top + bottom) / 2;

                    const dx = targetX - cx;
                    const dy = targetY - cy;

                    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
                        return { x: cx, y: cy };
                    }

                    const hw = (right - left) / 2;
                    const hh = (bottom - top) / 2;

                    const scaleX = hw / Math.abs(dx);
                    const scaleY = hh / Math.abs(dy);

                    if (scaleX < scaleY) {
                        const edgeX = dx > 0 ? right : left;
                        const edgeY = cy + (dx > 0 ? hw : -hw) * (dy / dx);
                        return { x: edgeX, y: edgeY };
                    } else {
                        const edgeY = dy > 0 ? bottom : top;
                        const edgeX = cx + (dy > 0 ? hh : -hh) * (dx / dy);
                        return { x: edgeX, y: edgeY };
                    }
                }

                function getCircleBorderPoint(targetX, targetY) {
                    const angle = Math.atan2(targetY - invCy, targetX - invCx);
                    return {
                        x: invCx + invR * Math.cos(angle),
                        y: invCy + invR * Math.sin(angle)
                    };
                }

                function makeArrow(mx, my, angle, len = 7.5, halfWidth = 3.8) {
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    const tipX = mx + (len / 2) * cos;
                    const tipY = my + (len / 2) * sin;
                    const backX = mx - (len / 2) * cos;
                    const backY = my - (len / 2) * sin;
                    const p1X = backX - halfWidth * sin;
                    const p1Y = backY + halfWidth * cos;
                    const p2X = backX + halfWidth * sin;
                    const p2Y = backY - halfWidth * cos;
                    return `M ${p1X.toFixed(1)} ${p1Y.toFixed(1)} L ${tipX.toFixed(1)} ${tipY.toFixed(1)} L ${p2X.toFixed(1)} ${p2Y.toFixed(1)} Z`;
                }

                // 1. Solar Panels (top-left) -> Inverter
                const solCardPt = getCardBorderPoint(rSolar, invCx, invCy);
                const invSolPt = getCircleBorderPoint(solCardPt.x, solCardPt.y);
                pSolar = `M ${solCardPt.x.toFixed(1)} ${solCardPt.y.toFixed(1)} L ${invSolPt.x.toFixed(1)} ${invSolPt.y.toFixed(1)}`;
                const midSolX = (solCardPt.x + invSolPt.x) / 2;
                const midSolY = (solCardPt.y + invSolPt.y) / 2;
                const angleSolar = Math.atan2(invSolPt.y - solCardPt.y, invSolPt.x - solCardPt.x);
                dArrowSolar = makeArrow(midSolX, midSolY, angleSolar);
                dotSolarInvPt = { x: invSolPt.x, y: invSolPt.y };

                // 2. Inverter <-> Grid (top-right)
                const grdCardPt = getCardBorderPoint(rGrid, invCx, invCy);
                const invGrdPt = getCircleBorderPoint(grdCardPt.x, grdCardPt.y);
                pGrid = `M ${invGrdPt.x.toFixed(1)} ${invGrdPt.y.toFixed(1)} L ${grdCardPt.x.toFixed(1)} ${grdCardPt.y.toFixed(1)}`;
                const midGrdX = (invGrdPt.x + grdCardPt.x) / 2;
                const midGrdY = (invGrdPt.y + grdCardPt.y) / 2;
                const angleGrid = isGridExporting
                    ? Math.atan2(grdCardPt.y - invGrdPt.y, grdCardPt.x - invGrdPt.x)
                    : Math.atan2(invGrdPt.y - grdCardPt.y, invGrdPt.x - grdCardPt.x);
                dArrowGrid = makeArrow(midGrdX, midGrdY, angleGrid);
                dotGridInvPt = { x: invGrdPt.x, y: invGrdPt.y };
                dotGridEndPt = { x: grdCardPt.x, y: grdCardPt.y };

                // 3. Inverter <-> Battery (bottom-left)
                const batCardPt = getCardBorderPoint(rBattery, invCx, invCy);
                const invBatPt = getCircleBorderPoint(batCardPt.x, batCardPt.y);
                pBattery = `M ${invBatPt.x.toFixed(1)} ${invBatPt.y.toFixed(1)} L ${batCardPt.x.toFixed(1)} ${batCardPt.y.toFixed(1)}`;
                const midBatX = (invBatPt.x + batCardPt.x) / 2;
                const midBatY = (invBatPt.y + batCardPt.y) / 2;
                const angleBat = isBatteryCharging
                    ? Math.atan2(batCardPt.y - invBatPt.y, batCardPt.x - invBatPt.x)
                    : Math.atan2(invBatPt.y - batCardPt.y, invBatPt.x - batCardPt.x);
                dArrowBattery = makeArrow(midBatX, midBatY, angleBat);
                dotBatteryInvPt = { x: invBatPt.x, y: invBatPt.y };
                dotBatteryEndPt = { x: batCardPt.x, y: batCardPt.y };

                // 4. Inverter -> Home / Usage (bottom-right)
                const homCardPt = getCardBorderPoint(rHome, invCx, invCy);
                const invHomPt = getCircleBorderPoint(homCardPt.x, homCardPt.y);
                pHome = `M ${invHomPt.x.toFixed(1)} ${invHomPt.y.toFixed(1)} L ${homCardPt.x.toFixed(1)} ${homCardPt.y.toFixed(1)}`;
                const midHomX = (invHomPt.x + homCardPt.x) / 2;
                const midHomY = (invHomPt.y + homCardPt.y) / 2;
                const angleHome = Math.atan2(homCardPt.y - invHomPt.y, homCardPt.x - invHomPt.x);
                dArrowHome = makeArrow(midHomX, midHomY, angleHome);
                dotHomeInvPt = { x: invHomPt.x, y: invHomPt.y };
                dotHomeEndPt = { x: homCardPt.x, y: homCardPt.y };
            }

            // 1. Apply Solar Path, Anim, Arrow, and Dot
            const lineSolar = document.getElementById("flowLineSolar");
            const lineSolarAnim = document.getElementById("flowLineSolarAnim");
            const arrowSolar = document.getElementById("arrowSolar");
            const dotSolarInv = document.getElementById("dotSolarInv");
            if (lineSolar) lineSolar.setAttribute("d", pSolar);
            if (lineSolarAnim) lineSolarAnim.setAttribute("d", pSolar);
            if (arrowSolar) arrowSolar.setAttribute("d", dArrowSolar);
            if (dotSolarInv) {
                dotSolarInv.setAttribute("cx", dotSolarInvPt.x);
                dotSolarInv.setAttribute("cy", dotSolarInvPt.y);
            }

            // 2. Apply Home Path, Anim, Arrow, and Dots
            const lineHome = document.getElementById("flowLineHome");
            const lineHomeAnim = document.getElementById("flowLineHomeAnim");
            const arrowHome = document.getElementById("arrowHome");
            const dotHomeInv = document.getElementById("dotHomeInv");
            const dotHomeEnd = document.getElementById("dotHomeEnd");
            if (lineHome) lineHome.setAttribute("d", pHome);
            if (lineHomeAnim) lineHomeAnim.setAttribute("d", pHome);
            if (arrowHome) arrowHome.setAttribute("d", dArrowHome);
            if (dotHomeInv) {
                dotHomeInv.setAttribute("cx", dotHomeInvPt.x);
                dotHomeInv.setAttribute("cy", dotHomeInvPt.y);
            }
            if (dotHomeEnd) {
                dotHomeEnd.setAttribute("cx", dotHomeEndPt.x);
                dotHomeEnd.setAttribute("cy", dotHomeEndPt.y);
            }

            // 3. Apply Battery Path, Anim, Arrow, and Dots
            const lineBattery = document.getElementById("flowLineBattery");
            const lineBatteryAnim = document.getElementById("flowLineBatteryAnim");
            const arrowBattery = document.getElementById("arrowBattery");
            const dotBatteryInv = document.getElementById("dotBatteryInv");
            const dotBatteryEnd = document.getElementById("dotBatteryEnd");
            if (lineBattery) lineBattery.setAttribute("d", pBattery);
            if (lineBatteryAnim) lineBatteryAnim.setAttribute("d", pBattery);
            if (arrowBattery) arrowBattery.setAttribute("d", dArrowBattery);
            if (dotBatteryInv) {
                dotBatteryInv.setAttribute("cx", dotBatteryInvPt.x);
                dotBatteryInv.setAttribute("cy", dotBatteryInvPt.y);
            }
            if (dotBatteryEnd) {
                dotBatteryEnd.setAttribute("cx", dotBatteryEndPt.x);
                dotBatteryEnd.setAttribute("cy", dotBatteryEndPt.y);
            }

            // 4. Apply Grid Path, Anim, Arrow, and Dots
            const lineGrid = document.getElementById("flowLineGrid");
            const lineGridAnim = document.getElementById("flowLineGridAnim");
            const arrowGrid = document.getElementById("arrowGrid");
            const dotGridInv = document.getElementById("dotGridInv");
            const dotGridEnd = document.getElementById("dotGridEnd");
            if (lineGrid) lineGrid.setAttribute("d", pGrid);
            if (lineGridAnim) lineGridAnim.setAttribute("d", pGrid);
            if (arrowGrid) arrowGrid.setAttribute("d", dArrowGrid);
            if (dotGridInv) {
                dotGridInv.setAttribute("cx", dotGridInvPt.x);
                dotGridInv.setAttribute("cy", dotGridInvPt.y);
            }
            if (dotGridEnd) {
                dotGridEnd.setAttribute("cx", dotGridEndPt.x);
                dotGridEnd.setAttribute("cy", dotGridEndPt.y);
            }
        });
    }

    window.addEventListener("resize", () => {
        updateFlowConnectors();
        const sDetail = document.getElementById("systemDetailView");
        if (sDetail && sDetail.classList.contains("active")) {
            const isMobile = window.innerWidth <= 768;
            sDetail.style.display = isMobile ? "flex" : "block";
            if (isMobile) {
                sDetail.classList.add("mobile-fullscreen");
                document.body.classList.add("modal-open");
            } else {
                sDetail.classList.remove("mobile-fullscreen");
                document.body.classList.remove("modal-open");
            }
        }
    });
    if (window.ResizeObserver) {
        const stageEl = document.querySelector(".power-flow-stage");
        if (stageEl) {
            const ro = new ResizeObserver(() => updateFlowConnectors());
            ro.observe(stageEl);
        }
    }

    // --------------------------------------------------------------------------
    // 6. SYSTEMS OVERVIEW GRID RENDERING
    // --------------------------------------------------------------------------
    const systemsOverviewView = document.getElementById("systemsOverviewView");
    const systemDetailView = document.getElementById("systemDetailView");
    const systemsGrid = document.getElementById("systemsGrid");
    const customerGreetingName = document.getElementById("customerGreetingName");
    const backToSystemsBtn = document.getElementById("backToSystemsBtn");

    function getSelectedPackageId() {
        if (window.HelloSolar && typeof window.HelloSolar.getActivePackageId === "function") {
            return window.HelloSolar.getActivePackageId();
        }
        const key = `hello_solar_active_package_id:${userIdent}`;
        return localStorage.getItem(key) || localStorage.getItem("hello_solar_active_package_id") || "";
    }

    function setSelectedPackageId(id) {
        if (!id) return;
        const key = `hello_solar_active_package_id:${userIdent}`;
        try {
            localStorage.setItem(key, id);
            localStorage.setItem("hello_solar_active_package_id", id);
        } catch (e) { }
        if (window.HelloSolar && typeof window.HelloSolar.setActivePackageId === "function") {
            window.HelloSolar.setActivePackageId(id);
        }
    }

    function updateSelectedCardHighlight(packageId) {
        if (!systemsGrid) return;
        const cards = systemsGrid.querySelectorAll(".system-card");
        cards.forEach(c => {
            const matches = c.getAttribute("data-package-id") === packageId;
            if (matches) {
                c.classList.add("selected");
                c.setAttribute("aria-selected", "true");
            } else {
                c.classList.remove("selected");
                c.setAttribute("aria-selected", "false");
            }
        });
    }

    function renderSystemsGrid() {
        if (!systemsGrid) return;
        systemsGrid.innerHTML = "";

        if (customerGreetingName) {
            customerGreetingName.textContent = activeCustomer.name || "";
        }

        const userPkgs = getUserPackages();
        let activePackageId = getSelectedPackageId();

        const matchedPkg = userPkgs.find(p => p.id === activePackageId || p.accountNo === activePackageId);
        if (matchedPkg) {
            activePackageId = matchedPkg.id;
        } else if (userPkgs.length > 0) {
            activePackageId = userPkgs[0].id;
            setSelectedPackageId(activePackageId);
        }

        userPkgs.forEach(pkg => {
            const isAct = (window.HelloSolar && window.HelloSolar.isSystemActive)
                ? window.HelloSolar.isSystemActive(pkg)
                : (pkg.projectStatus === "Active" || isSystemActivated(pkg));
            const projectStatus = (window.HelloSolar && window.HelloSolar.getProjectStatus)
                ? window.HelloSolar.getProjectStatus(pkg)
                : (isAct ? "Active" : (pkg.projectStatus || "In Progress"));
            const isSelected = (pkg.id === activePackageId);
            const card = document.createElement("article");
            card.className = `system-card ${isAct ? "activated-card" : "deactivated-card"}${isSelected ? " selected" : ""}`;
            card.setAttribute("role", "button");
            card.setAttribute("tabindex", "0");
            card.setAttribute("data-package-id", pkg.id);
            card.setAttribute("aria-selected", isSelected ? "true" : "false");
            card.setAttribute("aria-label", `${pkg.name}, ${pkg.capacity}. Project Status: ${projectStatus}. Payment Type: ${pkg.paymentType === 'full_payment' ? 'Full Payment' : 'Installment'}.`);

            card.innerHTML = `
                            <div>
                                <div class="system-card-header">
                                    <div class="system-card-title-wrap">
                                        <h2 class="system-card-model" title="${pkg.name}">${pkg.name}</h2>
                                        <span class="system-card-capacity-pill">
                                            ${pkg.capacity}
                                        </span>
                                    </div>
                                    <div class="system-card-statuses">
                                        <span class="system-card-status-badge ${isAct ? 'badge-active' : 'badge-model-pending'}">
                                            <span class="badge-dot"></span>
                                            ${projectStatus}
                                        </span>
                                        <span class="system-card-type-badge ${pkg.paymentType === 'full_payment' ? 'is-full' : 'is-installment'}">
                                            ${pkg.paymentType === 'full_payment' ? 'Full Payment' : 'Installment'}
                                        </span>
                                    </div>
                                </div>

                                <div class="system-card-body">
                                    <div class="system-card-info-row">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                                        </svg>
                                        <span>${(pkg.location || 'Service Site').replace(/\s*·\s*HS-\w+/i, '').trim()}</span>
                                    </div>
                                    <div class="system-card-info-row" style="display: flex; gap: 14px; flex-wrap: wrap;">
                                        <span style="display: inline-flex; align-items: center; gap: 5px;">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                                            APP: <strong>${pkg.appId || 'APP-Pending'}</strong>
                                        </span>
                                        <span style="display: inline-flex; align-items: center; gap: 5px;">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                                            HS ID: <strong>${pkg.hsId || pkg.accountNo || 'HS-Pending'}</strong>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div class="system-card-footer">
                                <span class="system-card-action-text" style="font-weight: 700;">
                                    ${isAct ? 'View Live Details' : 'View Project Status'}
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="9 18 15 12 9 6"/>
                                    </svg>
                                </span>
                            </div>
                        `;

            function handleCardSelect() {
                lastTriggerElement = card;
                setSelectedPackageId(pkg.id);
                updateSelectedCardHighlight(pkg.id);
                openSystemDetail(pkg);
            }

            card.addEventListener("click", handleCardSelect);
            card.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCardSelect();
                }
            });

            systemsGrid.appendChild(card);
        });

        // Link Existing System Card in the grid
        const addCard = document.createElement("div");
        addCard.className = "add-account-card";
        addCard.setAttribute("role", "button");
        addCard.setAttribute("tabindex", "0");
        addCard.setAttribute("aria-label", "Link an existing Hello Solar system");
        addCard.innerHTML = `
                        <div class="add-account-card-icon" aria-hidden="true">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                            </svg>
                        </div>
                        <div class="add-account-card-text">
                            <div class="add-account-card-title">Link Existing System</div>
                            <div class="add-account-card-desc">Connect another purchased Hello Solar system</div>
                        </div>
                    `;

        addCard.addEventListener("click", () => {
            lastTriggerElement = addCard;
            openAddAccountModalDialog();
        });
        addCard.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                lastTriggerElement = addCard;
                openAddAccountModalDialog();
            }
        });

        systemsGrid.appendChild(addCard);

        // Auto-open live details or link modal if specified in URL query or hash
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("view") === "live" || window.location.hash === "#live") {
            const targetPkg = userPkgs.find(p => p.id === activePackageId) || userPkgs[0];
            if (targetPkg) {
                openSystemDetail(targetPkg);
            }
        } else if (urlParams.get("action") === "link" || window.location.hash === "#link") {
            setTimeout(() => {
                if (typeof openAddAccountModalDialog === "function") {
                    openAddAccountModalDialog();
                }
            }, 100);
        }
    }

    // --------------------------------------------------------------------------
    // 7. SYSTEM DETAIL VIEW CONTROLLER
    // --------------------------------------------------------------------------
    const detailModelTitle = document.getElementById("detailModelTitle");
    const detailCapacityPill = document.getElementById("detailCapacityPill");
    const detailAccountMeta = document.getElementById("detailAccountMeta");
    const paymentStatusValue = document.getElementById("paymentStatusValue");
    const systemStatusValue = document.getElementById("systemStatusValue");
    const systemStatusLabel = document.getElementById("systemStatusLabel");
    const paymentStatusLabel = document.getElementById("paymentStatusLabel");
    const detailFlowTypeLabel = document.getElementById("detailFlowTypeLabel");
    const detailProjectStatusValue = document.getElementById("detailProjectStatusValue");
    const projectStepper = document.getElementById("projectStepper");
    const telemetryLockedPanel = document.getElementById("telemetryLockedPanel");
    const telemetryMasterPanel = document.getElementById("telemetryMasterPanel");
    const lockedModelName = document.getElementById("lockedModelName");
    const lockedStageName = document.getElementById("lockedStageName");
    const supportLeadAvatar = document.getElementById("supportLeadAvatar");
    const supportLeadName = document.getElementById("supportLeadName");
    const supportLeadRole = document.getElementById("supportLeadRole");

    // 5 Separate status elements
    const statusValAccount = document.getElementById("statusValAccount");
    const statusValApplication = document.getElementById("statusValApplication");
    const statusValPayment = document.getElementById("statusValPayment");
    const statusValInstallation = document.getElementById("statusValInstallation");
    const statusValSystem = document.getElementById("statusValSystem");

    function getPaymentSummary(payData = {}) {
        if (payData.hasBills === false) return "Pending";
        const status = String(payData.status || payData.standing || "").trim().toLowerCase();
        const overdue = (payData.schedule || []).some(bill => /^(overdue|unpaid)$/i.test(bill.status));
        if (overdue || ["unpaid", "overdue", "due", "due soon"].includes(status)) return "Unpaid";
        if (["paid", "good"].includes(status)) return "Paid";
        return "Pending";
    }

    function renderProjectFlowTracker(pkg) {
        if (!projectStepper || !pkg) return;
        const flow = (window.HelloSolar && window.HelloSolar.getFlowMilestones)
            ? window.HelloSolar.getFlowMilestones(pkg)
            : (pkg.paymentType === "full_payment" ? window.HelloSolar.FULL_PAYMENT_FLOW : window.HelloSolar.INSTALLMENT_FLOW);

        const isAct = (window.HelloSolar && window.HelloSolar.isSystemActive)
            ? window.HelloSolar.isSystemActive(pkg)
            : (pkg.projectStatus === "Active");

        const currentStage = (window.HelloSolar && window.HelloSolar.getProjectStatus)
            ? window.HelloSolar.getProjectStatus(pkg)
            : (isAct ? "Active" : pkg.projectStatus);

        const currentIdx = flow.findIndex(s => s.key === currentStage);

        if (detailFlowTypeLabel) {
            detailFlowTypeLabel.textContent = pkg.paymentType === "full_payment" ? "Full Payment Project Flow" : "Installment Project Flow";
        }

        if (detailProjectStatusValue) {
            detailProjectStatusValue.textContent = currentStage;
            if (isAct) {
                detailProjectStatusValue.className = "status-highlight is-active";
            } else {
                detailProjectStatusValue.className = "status-highlight";
            }
        }

        projectStepper.innerHTML = "";
        flow.forEach((milestone, idx) => {
            const stepEl = document.createElement("div");
            const isCompleted = isAct ? true : (currentIdx !== -1 && idx < currentIdx);
            const isCurrent = !isAct && (idx === currentIdx);

            stepEl.className = `stepper-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`;
            stepEl.setAttribute("role", "listitem");
            stepEl.setAttribute("title", milestone.desc || milestone.label);

            stepEl.innerHTML = `
                        <div class="stepper-circle" aria-hidden="true">
                            ${isCompleted ? '✓' : (idx + 1)}
                        </div>
                        <div class="stepper-label">${milestone.label}</div>
                    `;
            projectStepper.appendChild(stepEl);
        });

    }

    function openSystemDetail(pkg) {
        if (!pkg) return;
        currentPackage = pkg;
        currentPackageGeneration++;

        previousScrollY = window.scrollY;

        // Switch view containers
        if (systemsOverviewView) systemsOverviewView.style.display = "none";
        if (systemDetailView) {
            const isMobile = window.innerWidth <= 768;
            systemDetailView.style.display = isMobile ? "flex" : "block";
            systemDetailView.classList.add("active");

            // Mark detail view open on body for state binding
            document.body.classList.add("detail-view-open");

            // Check mobile viewport for full-screen app experience
            if (isMobile) {
                systemDetailView.classList.add("mobile-fullscreen");
                document.body.classList.add("modal-open");
            } else {
                systemDetailView.classList.remove("mobile-fullscreen");
                document.body.classList.remove("modal-open");
            }

            const detailContent = systemDetailView.querySelector(".system-detail-content");
            if (detailContent) {
                detailContent.scrollTop = 0;
            }
            // Mobile: the whole detail view scrolls (header is not pinned)
            systemDetailView.scrollTop = 0;
        }

        // 1. Detail Header (Purchased model name, capacity, APP ID, HS ID, Location)
        if (detailModelTitle) {
            detailModelTitle.textContent = pkg.name;
            detailModelTitle.setAttribute("title", pkg.name);
        }
        if (detailCapacityPill) detailCapacityPill.textContent = pkg.capacity || "—";
        if (detailAccountMeta) {
            const locClean = (pkg.location || 'Service Site').replace(/\s*·\s*HS-\w+/i, '').trim();
            const appId = pkg.appId || 'APP-8821';
            const hsId = pkg.hsId || pkg.accountNo || 'HS-10492';
            detailAccountMeta.innerHTML = `<span class="meta-item">${locClean}</span> <span class="meta-sep">·</span> <span class="meta-item">APP: ${appId}</span> <span class="meta-sep">·</span> <span class="meta-item">HS ID: ${hsId}</span>`;
        }

        const isAct = (window.HelloSolar && window.HelloSolar.isSystemActive)
            ? window.HelloSolar.isSystemActive(pkg)
            : (pkg.projectStatus === "Active");

        // 2. Render Project Status Progression Stepper
        renderProjectFlowTracker(pkg);

        // 3. Render 5 Strictly Separated Statuses (Never use Financing Approved as Payment Status)
        if (statusValAccount) {
            statusValAccount.innerHTML = `<span class="status-pill-dot"></span>${pkg.accountStatus || 'Active'}`;
        }
        if (statusValApplication) {
            const aStatus = pkg.applicationStatus || (pkg.paymentType === "full_payment" ? "Approved" : (isAct ? "Approved" : "Financing Approved"));
            statusValApplication.innerHTML = `<span class="status-pill-dot"></span>${aStatus}`;
        }
        if (statusValPayment) {
            let pStatus = pkg.paymentStatus;
            if (pkg.paymentType === "full_payment") {
                pStatus = pStatus || (isAct ? "Paid" : "Payment Required");
            } else {
                // Installment: Do not use Financing Approved as Payment Status!
                const sched = (pkg.payments && pkg.payments.schedule) || [];
                const hasUnpaid = sched.some(s => (s.status || "").toLowerCase() === "unpaid" || (s.status || "").toLowerCase() === "overdue");
                if (hasUnpaid) {
                    pStatus = "Overdue";
                } else if (!pStatus || pStatus === "Financing Approved") {
                    pStatus = isAct ? "Paid" : "Up to Date";
                }
            }
            const isOverdue = pStatus.toLowerCase() === "overdue";
            const isPaid = pStatus.toLowerCase().includes("paid") || pStatus.toLowerCase().includes("up to date") || pStatus.toLowerCase().includes("good");
            statusValPayment.className = `status-card-value ${isOverdue ? 'state-danger' : (isPaid ? '' : 'state-orange')}`;
            statusValPayment.innerHTML = `<span class="status-pill-dot"></span>${pStatus}`;
        }
        if (statusValInstallation) {
            const iStatus = pkg.installationStatus || (isAct ? "Completed" : (pkg.paymentType === "full_payment" ? "Ready for Installation" : "Installation In Progress"));
            const isDone = iStatus.toLowerCase().includes("completed");
            statusValInstallation.className = `status-card-value ${isDone ? '' : 'state-orange'}`;
            statusValInstallation.innerHTML = `<span class="status-pill-dot"></span>${iStatus}`;
        }
        if (statusValSystem) {
            const sStatus = pkg.systemStatus || (isAct ? "Active" : "Pending");
            statusValSystem.className = `status-card-value ${isAct ? '' : 'state-neutral'}`;
            statusValSystem.innerHTML = `<span class="status-pill-dot"></span>${sStatus}`;
        }

        // Summary action cards
        if (systemStatusLabel && systemStatusValue) {
            systemStatusLabel.textContent = isAct ? "Active" : (pkg.systemStatus || "Pending");
            systemStatusValue.dataset.status = isAct ? "paid" : "unpaid";
            document.getElementById("detailSystemStatusCard").setAttribute("aria-label",
                `System Status: ${systemStatusLabel.textContent}. View equipment details`);
        }

        if (paymentStatusLabel && paymentStatusValue) {
            let pSummary = pkg.paymentStatus;
            if (pkg.paymentType !== "full_payment") {
                const sched = (pkg.payments && pkg.payments.schedule) || [];
                const hasUnpaid = sched.some(s => (s.status || "").toLowerCase() === "unpaid" || (s.status || "").toLowerCase() === "overdue");
                if (hasUnpaid) pSummary = "Overdue";
                else if (!pSummary || pSummary === "Financing Approved") pSummary = isAct ? "Paid" : "Up to Date";
            } else {
                pSummary = pSummary || (isAct ? "Paid" : "Payment Required");
            }
            paymentStatusLabel.textContent = pSummary;
            const isOverdue = pSummary.toLowerCase() === "overdue";
            const isPaid = pSummary.toLowerCase().includes("paid") || pSummary.toLowerCase().includes("up to date");
            paymentStatusValue.dataset.status = isOverdue ? "unpaid" : (isPaid ? "paid" : "pending");
            if (isOverdue) {
                paymentStatusValue.style.color = "#dc2626";
            } else {
                paymentStatusValue.style.color = "";
            }
            document.getElementById("detailPaymentStatusCard").setAttribute("aria-label",
                `Payment Status: ${pSummary}. View payments`);
        }

        // 4. Before ACTIVE vs After ACTIVE: Telemetry Locking
        if (isAct) {
            if (telemetryLockedPanel) telemetryLockedPanel.style.display = "none";
            if (telemetryMasterPanel) telemetryMasterPanel.style.display = "block";

            // Update Telemetry Base Values & Display
            if (pkg.telemetry) {
                baseSolar = pkg.telemetry.baseSolar || 3.48;
                baseHome = pkg.telemetry.baseHome || 1.85;
                baseBattery = pkg.telemetry.baseBattery || 1.15;
                currentBatterySoc = pkg.telemetry.batterySoc || 92;
            }

            // Loading state while the first reading is fetched from the data source
            setTelemetryState("loading");
            const openGeneration = currentPackageGeneration;
            setTimeout(() => {
                if (openGeneration === currentPackageGeneration) updateTelemetryDisplay();
            }, 450);
            setTimeout(updateFlowConnectors, 40);
            setTimeout(updateFlowConnectors, 250);
        } else {
            // Before ACTIVE: Hide/Lock Live Telemetry!
            if (telemetryLockedPanel) telemetryLockedPanel.style.display = "flex";
            if (telemetryMasterPanel) telemetryMasterPanel.style.display = "none";
            if (lockedModelName) lockedModelName.textContent = `${pkg.name} (${pkg.capacity})`;
            if (lockedStageName) lockedStageName.textContent = pkg.projectStatus || "Awaiting Activation";
        }

        // 5. Support Routing: Installer Assigned vs Hello Solar Super Admin
        if (pkg.assignedInstaller) {
            if (supportLeadAvatar) supportLeadAvatar.textContent = getInitials(pkg.assignedInstaller.name);
            if (supportLeadName) supportLeadName.textContent = pkg.assignedInstaller.name;
            if (supportLeadRole) supportLeadRole.textContent = `${pkg.assignedInstaller.role || 'Certified Solar Master Installer'} · Assigned Primary Contact`;
        } else {
            // Route to Hello Solar / Super Admin
            if (supportLeadAvatar) supportLeadAvatar.textContent = "HS";
            if (supportLeadName) supportLeadName.textContent = "Hello Solar Super Admin / Central Dispatch";
            if (supportLeadRole) supportLeadRole.textContent = "Central Customer Care & Engineering Support (+63 2 8888 0100)";
        }

        // 6. Required Documents (Installment only — hidden for Full Payment)
        if (typeof window.renderRequiredDocuments === "function") {
            window.renderRequiredDocuments({ ...pkg, isActivated: isAct });
        }

        // Synchronize portal active package ID
        setSelectedPackageId(pkg.id);
        updateSelectedCardHighlight(pkg.id);

        window.scrollTo({ top: 0, behavior: "smooth" });

        if (backToSystemsBtn) {
            setTimeout(() => backToSystemsBtn.focus(), 100);
        }
    }

    function closeSystemDetail() {
        if (systemDetailView) {
            systemDetailView.style.display = "none";
            systemDetailView.classList.remove("active", "mobile-fullscreen");
        }
        document.body.classList.remove("modal-open", "detail-view-open");

        if (systemsOverviewView) {
            systemsOverviewView.style.display = "block";
        }

        window.scrollTo({ top: previousScrollY, behavior: "auto" });

        if (lastTriggerElement && typeof lastTriggerElement.focus === "function") {
            lastTriggerElement.focus();
        }
    }

    if (backToSystemsBtn) {
        backToSystemsBtn.addEventListener("click", closeSystemDetail);
    }

    const detailPaymentStatusCard = document.getElementById("detailPaymentStatusCard");
    const detailSystemStatusCard = document.getElementById("detailSystemStatusCard");

    function syncSelectedPackageBeforeNav() {
        if (currentPackage && currentPackage.id) {
            setSelectedPackageId(currentPackage.id);
        }
    }

    if (detailPaymentStatusCard) {
        detailPaymentStatusCard.addEventListener("click", syncSelectedPackageBeforeNav);
    }
    if (detailSystemStatusCard) {
        detailSystemStatusCard.addEventListener("click", syncSelectedPackageBeforeNav);
    }

    window.addEventListener("resize", () => {
        if (systemDetailView && systemDetailView.classList.contains("active")) {
            const isMobile = window.innerWidth <= 768;
            systemDetailView.style.display = isMobile ? "flex" : "block";
            document.body.classList.add("detail-view-open");
            if (isMobile) {
                systemDetailView.classList.add("mobile-fullscreen");
                document.body.classList.add("modal-open");
            } else {
                systemDetailView.classList.remove("mobile-fullscreen");
                document.body.classList.remove("modal-open");
            }
        }
    });

    // --------------------------------------------------------------------------
    // 8. PER-SYSTEM INSTALLATION & ACTIVATION MODAL
    // --------------------------------------------------------------------------
    const activationModalBackdrop = document.getElementById("activationModalBackdrop");
    // Keep the fixed overlay outside potentially transformed app containers.
    if (activationModalBackdrop) document.body.appendChild(activationModalBackdrop);
    const closeActivationModalBtn = document.getElementById("closeActivationModalBtn");
    const closeActivationFooterBtn = document.getElementById("closeActivationFooterBtn");
    const activationModalModelName = document.getElementById("activationModalModelName");
    const activationModalAccountNo = document.getElementById("activationModalAccountNo");
    const activationRequirementsNotice = document.getElementById("activationRequirementsNotice");
    const activationStepsList = document.getElementById("activationStepsList");

    let targetActivationPackage = null;
    let activeMilestones = [];

    function openActivationModal(pkg) {
        if (!isModelAccepted(pkg)) return;
        if (!pkg) return;
        targetActivationPackage = pkg;
        activeMilestones = getSystemMilestones(pkg);

        if (activationModalModelName) activationModalModelName.textContent = pkg.name;
        if (activationModalAccountNo) activationModalAccountNo.textContent = pkg.accountNo || pkg.location || "HS-Pending";

        renderActivationMilestones();

        if (activationModalBackdrop) {
            activationModalBackdrop.classList.add("open");
            activationModalBackdrop.setAttribute("aria-hidden", "false");
            document.body.classList.add("modal-open");
            if (closeActivationModalBtn) setTimeout(() => closeActivationModalBtn.focus(), 80);
        }
    }

    function closeActivationModal() {
        if (activationModalBackdrop) {
            activationModalBackdrop.classList.remove("open");
            activationModalBackdrop.setAttribute("aria-hidden", "true");
        }
        document.body.classList.remove("modal-open");
        if (lastTriggerElement && typeof lastTriggerElement.focus === "function") {
            lastTriggerElement.focus();
        }
    }

    function renderActivationMilestones() {
        if (!activationStepsList) return;
        activationStepsList.innerHTML = "";

        let allCompleted = true;
        let firstIncompleteIdx = -1;

        activeMilestones.forEach((m, idx) => {
            const isDone = m.status === "Completed";
            if (!isDone && allCompleted) {
                allCompleted = false;
                firstIncompleteIdx = idx;
            }

            const item = document.createElement("div");
            item.className = `activation-step-item ${isDone ? 'completed' : (idx === firstIncompleteIdx ? 'active' : '')}`;

            item.innerHTML = `
                            <div class="activation-step-indicator" aria-hidden="true">
                                ${isDone ? '✓' : m.num}
                            </div>
                            <div class="activation-step-content">
                                <div class="activation-step-title">${m.title}</div>
                                <div class="activation-step-desc">${m.desc}</div>
                                <div style="font-size: 11.5px; color: ${isDone ? '#059669' : 'var(--gray-400)'}; margin-top: 4px; font-weight: 600;">
                                    ${m.date || (isDone ? 'Completed' : 'Pending')}
                                </div>
                            </div>
                        `;

            activationStepsList.appendChild(item);
        });

        // Read-only notice: progress and activation are recorded by the assigned installer / Hello Solar engineer
        if (allCompleted) {
            if (activationRequirementsNotice) {
                activationRequirementsNotice.innerHTML = `<strong>Installation Complete:</strong> All 5 installation milestones are completed. Your installer activates the system after final commissioning.`;
                activationRequirementsNotice.style.background = "#ecfdf5";
                activationRequirementsNotice.style.borderColor = "#a7f3d0";
                activationRequirementsNotice.style.color = "#065f46";
            }
        } else {
            if (activationRequirementsNotice) {
                activationRequirementsNotice.innerHTML = `<strong>Installation Progress:</strong> Milestones are updated by your assigned installer. System activation follows completion of all 5 milestones and engineering sign-off.`;
                activationRequirementsNotice.style.background = "#fffbeb";
                activationRequirementsNotice.style.borderColor = "#fed7aa";
                activationRequirementsNotice.style.color = "#9a3412";
            }
        }
    }

    if (closeActivationModalBtn) closeActivationModalBtn.addEventListener("click", closeActivationModal);
    if (closeActivationFooterBtn) closeActivationFooterBtn.addEventListener("click", closeActivationModal);

    if (activationModalBackdrop) {
        activationModalBackdrop.addEventListener("click", (e) => {
            if (e.target === activationModalBackdrop) closeActivationModal();
        });
    }

    // --------------------------------------------------------------------------
    // 9. IN-PAGE SUPPORT MODAL (PRE-ASSOCIATED WITH SELECTED SYSTEM)
    // --------------------------------------------------------------------------
    const openSystemSupportBtn = document.getElementById("openSystemSupportBtn");
    const systemSupportModalBackdrop = document.getElementById("systemSupportModalBackdrop");
    const closeSupportModalBtn = document.getElementById("closeSupportModalBtn");
    const cancelSupportModalBtn = document.getElementById("cancelSupportModalBtn");
    const systemSupportForm = document.getElementById("systemSupportForm");
    const supportModalSystemName = document.getElementById("supportModalSystemName");
    const supportModalAccountNo = document.getElementById("supportModalAccountNo");
    const supportModalSubject = document.getElementById("supportModalSubject");

    function openSystemSupportModal() {
        const pkg = currentPackage || getUserPackages()[0];
        if (!pkg) return;

        lastTriggerElement = openSystemSupportBtn;

        if (supportModalSystemName) supportModalSystemName.textContent = pkg.name;
        if (supportModalAccountNo) supportModalAccountNo.textContent = pkg.accountNo || pkg.location || "HS-Pending";

        if (systemSupportModalBackdrop) {
            systemSupportModalBackdrop.classList.add("open");
            systemSupportModalBackdrop.setAttribute("aria-hidden", "false");
            document.body.classList.add("modal-open");
            if (supportModalSubject) {
                setTimeout(() => supportModalSubject.focus(), 100);
            }
        }
    }

    function closeSystemSupportModal() {
        if (systemSupportModalBackdrop) {
            systemSupportModalBackdrop.classList.remove("open");
            systemSupportModalBackdrop.setAttribute("aria-hidden", "true");
        }
        document.body.classList.remove("modal-open");
        if (openSystemSupportBtn && typeof openSystemSupportBtn.focus === "function") {
            openSystemSupportBtn.focus();
        }
    }

    if (openSystemSupportBtn) {
        openSystemSupportBtn.addEventListener("click", openSystemSupportModal);
    }

    if (closeSupportModalBtn) closeSupportModalBtn.addEventListener("click", closeSystemSupportModal);
    if (cancelSupportModalBtn) cancelSupportModalBtn.addEventListener("click", closeSystemSupportModal);

    if (systemSupportModalBackdrop) {
        systemSupportModalBackdrop.addEventListener("click", (e) => {
            if (e.target === systemSupportModalBackdrop) closeSystemSupportModal();
        });
    }

    if (systemSupportForm) {
        systemSupportForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const pkg = currentPackage || getUserPackages()[0];
            const subject = supportModalSubject ? supportModalSubject.value.trim() : "System Inquiry";

            closeSystemSupportModal();
            if (systemSupportForm) systemSupportForm.reset();

            if (window.HelloSolar && window.HelloSolar.toast) {
                window.HelloSolar.toast(
                    "Support Request Sent",
                    `Ticket logged for ${pkg.name} (${pkg.accountNo || 'HS-Account'}): "${subject}". Our team will respond shortly.`
                );
            }
        });
    }

    // --------------------------------------------------------------------------
    // 10. LINK EXISTING SYSTEM MODAL CONTROLLER
    // --------------------------------------------------------------------------
    const openAddAccountOverviewBtn = document.getElementById("openAddAccountOverviewBtn");
    const addAccountModalBackdrop = document.getElementById("addAccountModalBackdrop");
    const closeAddAccountModal = document.getElementById("closeAddAccountModal");
    const cancelAddAccountBtn = document.getElementById("cancelAddAccountBtn");
    const submitAddAccountBtn = document.getElementById("submitAddAccountBtn");
    const serviceAccountIdInput = document.getElementById("serviceAccountIdInput");
    const serviceAccountContactInput = document.getElementById("serviceAccountContactInput");
    const linkSystemAlert = document.getElementById("linkSystemAlert");

    function showLinkAlert(message, type = "error") {
        if (!linkSystemAlert) return;
        const iconSvg = type === "error"
            ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;

        linkSystemAlert.className = `link-system-alert alert-${type}`;
        linkSystemAlert.innerHTML = `${iconSvg}<div>${message}</div>`;
        linkSystemAlert.style.display = "flex";
    }

    function clearLinkAlert() {
        if (!linkSystemAlert) return;
        linkSystemAlert.style.display = "none";
        linkSystemAlert.innerHTML = "";
        linkSystemAlert.className = "link-system-alert";
        if (serviceAccountIdInput) serviceAccountIdInput.classList.remove("package-modal-field-error");
        if (serviceAccountContactInput) serviceAccountContactInput.classList.remove("package-modal-field-error");
    }

    function openAddAccountModalDialog() {
        if (addAccountModalBackdrop) {
            clearLinkAlert();
            addAccountModalBackdrop.classList.add("open");
            addAccountModalBackdrop.setAttribute("aria-hidden", "false");
            document.body.classList.add("modal-open");
            if (serviceAccountIdInput) {
                setTimeout(() => serviceAccountIdInput.focus(), 100);
            }
        }
    }

    function closeAddAccountModalDialog() {
        if (addAccountModalBackdrop) {
            addAccountModalBackdrop.classList.remove("open");
            addAccountModalBackdrop.setAttribute("aria-hidden", "true");
        }
        document.body.classList.remove("modal-open");
        if (serviceAccountIdInput) serviceAccountIdInput.value = "";
        if (serviceAccountContactInput) serviceAccountContactInput.value = "";
        clearLinkAlert();
        if (lastTriggerElement && typeof lastTriggerElement.focus === "function") {
            lastTriggerElement.focus();
        }
    }

    /**
     * Backend-Ready Verification & Linking Flow
     * Verifies that the solar system exists in Hello Solar registry and belongs to the customer.
     * Prevents duplicate linking and prevents linking another customer's system.
     */
    async function verifyAndLinkExistingSystem(rawHsId, rawContact) {
        const hsId = (rawHsId || "").trim();
        const contact = (rawContact || "").trim();

        // 1. Input Presence Validation
        if (!hsId && !contact) {
            return {
                success: false,
                field: "both",
                message: "Please enter both the HS ID / Account ID and your registered email or mobile number."
            };
        }
        if (!hsId) {
            return {
                success: false,
                field: "hsId",
                message: "Please enter the HS ID or Account ID."
            };
        }
        if (!contact) {
            return {
                success: false,
                field: "contact",
                message: "Please enter your registered email address or mobile number."
            };
        }

        // 2. Verify ownership against the shared application record (HS ID + owner contact on record)
        //    and link the system to this customer account
        if (!window.HSShared) {
            return { success: false, field: "hsId", message: "System lookup is unavailable right now. Please try again later." };
        }
        const result = window.HSShared.claimApplicationByHsId(activeCustomer.accountId, hsId, contact);
        if (!result.ok) {
            return { success: false, field: result.field || "hsId", message: result.error };
        }
        return { success: true, system: { id: result.app.id, appId: result.app.id, hsId: result.app.hsId, name: result.app.purchasedModel || result.app.system || result.app.id, capacity: result.app.system || "" } };
    }

    if (openAddAccountOverviewBtn) {
        openAddAccountOverviewBtn.addEventListener("click", () => {
            lastTriggerElement = openAddAccountOverviewBtn;
            openAddAccountModalDialog();
        });
    }

    if (closeAddAccountModal) closeAddAccountModal.addEventListener("click", closeAddAccountModalDialog);
    if (cancelAddAccountBtn) cancelAddAccountBtn.addEventListener("click", closeAddAccountModalDialog);

    if (addAccountModalBackdrop) {
        addAccountModalBackdrop.addEventListener("click", (e) => {
            if (e.target === addAccountModalBackdrop) closeAddAccountModalDialog();
        });
    }

    // Input error clearing on edit
    if (serviceAccountIdInput) {
        serviceAccountIdInput.addEventListener("input", () => {
            serviceAccountIdInput.classList.remove("package-modal-field-error");
            if (linkSystemAlert && linkSystemAlert.classList.contains("alert-error")) {
                clearLinkAlert();
            }
        });
        serviceAccountIdInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                if (serviceAccountContactInput) serviceAccountContactInput.focus();
                else if (submitAddAccountBtn) submitAddAccountBtn.click();
            }
        });
    }

    if (serviceAccountContactInput) {
        serviceAccountContactInput.addEventListener("input", () => {
            serviceAccountContactInput.classList.remove("package-modal-field-error");
            if (linkSystemAlert && linkSystemAlert.classList.contains("alert-error")) {
                clearLinkAlert();
            }
        });
        serviceAccountContactInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                if (submitAddAccountBtn) submitAddAccountBtn.click();
            }
        });
    }

    if (submitAddAccountBtn) {
        submitAddAccountBtn.addEventListener("click", async () => {
            clearLinkAlert();

            const hsIdVal = serviceAccountIdInput ? serviceAccountIdInput.value.trim() : "";
            const contactVal = serviceAccountContactInput ? serviceAccountContactInput.value.trim() : "";

            // UI busy state
            submitAddAccountBtn.disabled = true;
            const originalBtnText = submitAddAccountBtn.textContent;
            submitAddAccountBtn.textContent = "Verifying Ownership...";

            try {
                const result = await verifyAndLinkExistingSystem(hsIdVal, contactVal);

                if (!result.success) {
                    submitAddAccountBtn.disabled = false;
                    submitAddAccountBtn.textContent = originalBtnText;

                    if (result.field === "hsId" || result.field === "both") {
                        if (serviceAccountIdInput) serviceAccountIdInput.classList.add("package-modal-field-error");
                    }
                    if (result.field === "contact" || result.field === "both") {
                        if (serviceAccountContactInput) serviceAccountContactInput.classList.add("package-modal-field-error");
                    }

                    showLinkAlert(result.message, "error");
                    return;
                }

                // Success: the system is now linked on the shared record — reload this customer's systems
                if (window.HelloSolar && typeof window.HelloSolar.refreshSharedPackages === "function") {
                    packages = window.HelloSolar.refreshSharedPackages();
                }

                showLinkAlert(`System verified! Connecting <strong>${result.system.name} (${result.system.capacity || result.system.capacityKw + ' kW'})</strong>...`, "success");

                setTimeout(() => {
                    submitAddAccountBtn.disabled = false;
                    submitAddAccountBtn.textContent = originalBtnText;
                    closeAddAccountModalDialog();
                    renderSystemsGrid();

                    // Automatically select newly linked system so customer sees details immediately
                    const linkedPkg = getUserPackages().find(p => p.appId === result.system.appId);
                    if (linkedPkg) {
                        setSelectedPackageId(linkedPkg.id);
                        updateSelectedCardHighlight(linkedPkg.id);
                    }

                    if (window.HelloSolar && window.HelloSolar.toast) {
                        window.HelloSolar.toast(
                            "System Linked Successfully",
                            `${result.system.name} (${result.system.hsId || result.system.accountNo}) has been added to your My System portal.`
                        );
                    }
                }, 600);

            } catch (err) {
                console.error("Error linking system:", err);
                submitAddAccountBtn.disabled = false;
                submitAddAccountBtn.textContent = originalBtnText;
                showLinkAlert("An unexpected error occurred while verifying the system. Please try again.", "error");
            }
        });
    }

    // Global Escape Key Listener
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (systemSupportModalBackdrop && systemSupportModalBackdrop.classList.contains("open")) {
                closeSystemSupportModal();
            } else if (activationModalBackdrop && activationModalBackdrop.classList.contains("open")) {
                closeActivationModal();
            } else if (addAccountModalBackdrop && addAccountModalBackdrop.classList.contains("open")) {
                closeAddAccountModalDialog();
            } else if (systemDetailView && systemDetailView.classList.contains("mobile-fullscreen")) {
                closeSystemDetail();
            }
        }
    });

    // --------------------------------------------------------------------------
    // 11. TIMING & INITIALIZATION
    // --------------------------------------------------------------------------
    // Initialize Overview Grid
    renderSystemsGrid();

    // Periodic telemetry jitter (every 4s)
    if (telemetryIntervalId) clearInterval(telemetryIntervalId);
    telemetryIntervalId = setInterval(updateTelemetryDisplay, 4000);

    // Periodic seconds ticker
    if (tickerIntervalId) clearInterval(tickerIntervalId);
    tickerIntervalId = setInterval(() => {
        secondsSinceSync++;
        if (telemetryTimestampEl && telemetryState === "online") {
            telemetryTimestampEl.textContent = `Sync: ${secondsSinceSync}s ago`;
        }
    }, 1000);

    // Manual Sync Button Handler
    if (telemetrySyncBtn) {
        telemetrySyncBtn.addEventListener("click", () => {
            telemetrySyncBtn.classList.add("syncing");
            if (syncBtnLabel) syncBtnLabel.textContent = "Syncing...";
            setTelemetryState("loading");

            setTimeout(() => {
                updateTelemetryDisplay();
                telemetrySyncBtn.classList.remove("syncing");
                const isOnline = telemetryState === "online";
                if (syncBtnLabel) syncBtnLabel.textContent = isOnline ? "Synced" : "Sync";

                if (window.HelloSolar && window.HelloSolar.toast) {
                    const name = currentPackage ? currentPackage.name : "system";
                    window.HelloSolar.toast(
                        isOnline ? "Live Telemetry Synchronized" : "Telemetry Not Available",
                        isOnline
                            ? `Inverter telemetry verified for ${name}.`
                            : `${name}: ${TELEMETRY_STATE_COPY[telemetryState].footer}. Please try again later.`
                    );
                }

                setTimeout(() => {
                    if (syncBtnLabel) syncBtnLabel.textContent = "Sync";
                }, 1800);
            }, 600);
        });
    }

    // Listen for async JSON dataset load
    window.addEventListener("helloSolarDataLoaded", (e) => {
        if (e.detail && Array.isArray(e.detail.packages)) {
            packages = e.detail.packages;
            renderSystemsGrid();
        }
    });

    // Listen for package changes triggered from elsewhere
    window.addEventListener("helloSolarPackageChanged", (e) => {
        if (e.detail && e.detail.packageId) {
            updateSelectedCardHighlight(e.detail.packageId);
        }
    });

    // Handle window resize for mobile-fullscreen class on detail view
    window.addEventListener("resize", () => {
        if (systemDetailView && systemDetailView.classList.contains("active")) {
            if (window.innerWidth <= 768) {
                systemDetailView.classList.add("mobile-fullscreen");
                document.body.classList.add("modal-open", "detail-view-open");
            } else {
                systemDetailView.classList.remove("mobile-fullscreen");
                document.body.classList.remove("modal-open", "detail-view-open");
            }
        }
    });
})();
