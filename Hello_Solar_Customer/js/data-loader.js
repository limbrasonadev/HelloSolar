/**
 * ============================================================================
 * HELLO SOLAR CUSTOMER PORTAL — SHARED DATA LOADER MODULE
 * Decoupled data-loading layer for browser-native fetch() of JSON datasets.
 * Keeps data fetching strictly separated from UI rendering so backend engineers
 * can easily swap static JSON sources for live REST/GraphQL APIs.
 * ============================================================================
 */

(function (window) {
    "use strict";

    const DATA_BASE_PATH = "data";
    const FETCH_TIMEOUT_MS = 3500;

    /**
     * Browser-native fetch with timeout and error trapping.
     * Handles local file:/// CORS restrictions and network dropouts gracefully.
     */
    async function fetchJson(endpoint) {
        try {
            const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
            const timer = controller ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS) : null;

            const url = endpoint.startsWith("http") || endpoint.startsWith("/")
                ? endpoint
                : `${DATA_BASE_PATH}/${endpoint}`;

            const response = await fetch(url, {
                cache: "no-cache",
                signal: controller ? controller.signal : undefined
            });

            if (timer) clearTimeout(timer);

            if (!response.ok) {
                console.warn(`[DataLoader] HTTP ${response.status} fetching ${url}`);
                return null;
            }

            return await response.json();
        } catch (err) {
            console.warn(`[DataLoader] Fetch failed for ${endpoint} (likely file:/// protocol or offline):`, err.message);
            return null;
        }
    }

    /**
     * Assemble separate domain JSON records into unified package structures
     * matching the portal's presentation and calculation contracts.
     */
    // Presentation detail for one system. Identity and status fields are overwritten by the shared application
    // record in portal.js; values unknown here stay empty (no sample fallbacks).
    function assemblePackage(system, telemetryMap = new Map(), paymentsMap = new Map(), savingsMap = new Map(), equipmentMap = new Map(), warrantiesMap = new Map()) {
        if (!system || !system.id) return null;
        const pesoFmt = n => "₱" + Number(n || 0).toLocaleString("en-PH");
        const id = system.id;

        const telem = telemetryMap.get(id) || null;
        const pay = paymentsMap.get(id) || null;
        const save = savingsMap.get(id) || null;
        const equip = equipmentMap.get(id) || null;
        const warr = warrantiesMap.get(id) || null;

        const paymentType = system.paymentType || (pay && pay.paymentType) || "installment";
        const isOnline = system.status && system.status.includes("Online");
        const defaultProjectStatus = isOnline ? "Active" : (paymentType === "full_payment" ? "Payment Required" : "Installation In Progress");
        const projectStatus = system.projectStatus || defaultProjectStatus;
        const isActive = projectStatus === "Active" || isOnline;

        // Extract paymentPlan as single source of truth
        const plan = (system.paymentPlan && typeof system.paymentPlan === "object")
            ? system.paymentPlan
            : ((pay && pay.paymentPlan && typeof pay.paymentPlan === "object") ? pay.paymentPlan : null);

        const packageName = system.packageName || (plan && plan.packageName) || (pay && pay.packageName) || system.name || "Solar Package";

        const downPayment = (plan && plan.downPayment !== undefined)
            ? plan.downPayment
            : (system.downPayment !== undefined ? system.downPayment : (pay && pay.downPayment !== undefined ? pay.downPayment : 0));
        const formattedDownPayment = (plan && plan.formattedDownPayment)
            || system.formattedDownPayment
            || (pay && pay.formattedDownPayment)
            || (downPayment ? `₱${downPayment.toLocaleString("en-PH")}` : "₱0");

        const monthlyPayment = (plan && plan.monthlyInstallment !== undefined)
            ? plan.monthlyInstallment
            : (pay && pay.monthlyInstallmentAmount !== undefined
                ? pay.monthlyInstallmentAmount
                : (system.monthlyPayment !== undefined ? system.monthlyPayment : 0));
        const formattedMonthlyPayment = (plan && plan.formattedMonthlyPayment)
            || system.formattedMonthlyPayment
            || (pay && pay.formattedMonthlyPayment)
            || (monthlyPayment ? `₱${monthlyPayment.toLocaleString("en-PH", { minimumFractionDigits: monthlyPayment % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}` : "₱0");

        const totalInstallmentsCount = (function() {
            if (plan && plan.totalInstallments) return plan.totalInstallments;
            if (pay && pay.totalInstallments) return pay.totalInstallments;
            if (system.totalInstallments) return system.totalInstallments;
            const rawTerm = (plan && plan.term) || (typeof system.paymentPlan === "string" ? system.paymentPlan : "") || (pay && pay.planTerm) || "";
            const m = typeof rawTerm === "string" ? rawTerm.match(/(\d+)[-\s]*year/i) : null;
            return m ? parseInt(m[1], 10) * 12 : 60;
        })();

        const paymentsCompletedStr = (function() {
            const sched = (pay && pay.schedule) || (system.payments && system.payments.schedule) || [];
            const paidCount = sched.filter(s => (s.status || '').toLowerCase() === 'paid').length;
            return `${paidCount} of ${totalInstallmentsCount}`;
        })();

        const totalPaidStr = (function() {
            const sched = (pay && pay.schedule) || (system.payments && system.payments.schedule) || [];
            const paidSum = sched.filter(s => (s.status || '').toLowerCase() === 'paid').reduce((sum, s) => {
                const amt = typeof s.amount === 'number' ? s.amount : (parseFloat(String(s.amount || 0).replace(/[^0-9.]/g, '')) || 0);
                return sum + amt;
            }, 0);
            return "₱" + paidSum.toLocaleString("en-PH", {
                minimumFractionDigits: paidSum % 1 !== 0 ? 2 : 0,
                maximumFractionDigits: 2
            });
        })();

        // Unified assigned installer resolution:
        const assignedInstaller = (system.assignedInstaller !== undefined)
            ? system.assignedInstaller
            : (warr && warr.assignedInstaller)
                ? warr.assignedInstaller
                : null;

        return {
            id: system.id,
            appId: system.appId || null,
            hsId: system.hsId || system.accountNo || "",
            jobId: system.jobId || null,
            accountNo: system.accountNo || system.hsId || "",
            name: system.name || "Solar Package",
            packageName: packageName,
            shortLabel: system.shortLabel || system.name || "",
            capacity: system.capacity || (system.capacityKw ? `${system.capacityKw} kW` : ""),
            capacityKw: typeof system.capacityKw === "number" ? system.capacityKw : (parseFloat(system.capacity) || 0),
            location: system.location || "",
            status: system.status || (isActive ? "Online · Normal" : "Setup Pending"),
            installerAcceptanceStatus: system.installerAcceptanceStatus || "accepted",
            systemType: system.systemType || "Residential Hybrid",
            hasBattery: system.hasBattery !== false,
            installationDate: system.installationDate || "",
            notice: system.notice || "",

            // Unified Flow & Status Architecture
            paymentType: paymentType,
            projectStatus: projectStatus,
            accountStatus: system.accountStatus || "Active",
            applicationStatus: system.applicationStatus || (paymentType === "full_payment" ? "Approved" : (isActive ? "Approved" : "Financing Approved")),
            paymentStatus: (function() {
                if (system.paymentStatus && system.paymentStatus !== "Financing Approved") return system.paymentStatus;
                if (pay && pay.standing && pay.standing !== "Financing Approved") return pay.standing;
                if (paymentType === "full_payment") return isActive ? "Paid" : "Payment Required";
                const hasUnpaid = pay && pay.schedule && pay.schedule.some(s => (s.status || "").toLowerCase() === "unpaid" || (s.status || "").toLowerCase() === "overdue");
                if (hasUnpaid) return "Overdue";
                return isActive ? "Paid" : "Up to Date";
            })(),
            installationStatus: system.installationStatus || (isActive ? "Completed" : (paymentType === "full_payment" ? "Ready for Installation" : "Installation In Progress")),
            systemStatus: system.systemStatus || (isActive ? "Active" : "Pending"),
            receiptVerificationStatus: system.receiptVerificationStatus || (pay && pay.receiptVerificationStatus) || (isActive ? "Verified" : "Awaiting Submission"),

            // Full Payment Fields
            totalAmount: (pay && pay.totalAmount) || system.totalAmount || 0,
            amountDue: (pay && pay.amountDue !== undefined) ? pay.amountDue : (system.amountDue !== undefined ? system.amountDue : (isActive ? 0 : ((pay && pay.totalAmount) || system.totalAmount || 0))),
            formattedTotalAmount: (pay && pay.formattedTotalAmount) || system.formattedTotalAmount || pesoFmt((pay && pay.totalAmount) || system.totalAmount),
            formattedAmountDue: (pay && pay.formattedAmountDue) || system.formattedAmountDue || (isActive ? "₱0" : pesoFmt((pay && pay.totalAmount) || system.totalAmount)),

            // Installment Fields & Single Source of Truth Payment Plan
            paymentPlan: plan || (typeof system.paymentPlan === "string" ? system.paymentPlan : (pay && pay.planTerm) || ""),
            monthlyPayment: monthlyPayment,
            formattedMonthlyPayment: formattedMonthlyPayment,
            downPayment: downPayment,
            formattedDownPayment: formattedDownPayment,
            nextDueDate: system.nextDueDate || (pay && pay.schedule && pay.schedule.find(s => s.status !== "Paid") ? (pay.schedule.find(s => s.status !== "Paid").dueDate || pay.schedule.find(s => s.status !== "Paid").due) : ""),
            totalInstallments: totalInstallmentsCount,
            paymentsCompleted: paymentsCompletedStr,
            totalPaid: totalPaidStr,

            // Hardware & Specifications (from equipment.json)
            panelsCount: equip && equip.panels ? equip.panels.count : (system.panelsCount || null),
            panelsModel: equip && equip.panels ? equip.panels.model : (system.panelsModel || ""),
            inverterModel: equip && equip.inverter ? equip.inverter.model : (system.inverterModel || ""),
            batteryCapacity: equip && equip.battery ? equip.battery.model : (system.batteryCapacity || (system.hasBattery ? "10 kWh Lithium-ion Reserve" : "None (Grid-Tie Architecture)")),
            inverterSerial: (equip && equip.inverter && equip.inverter.serialNumber) || (warr && warr.inverterSerial) || system.inverterSerial || "",
            equipment: equip,

            // Warranties & Support Routing
            warranties: warr ? warr.warranties : null,
            assignedInstaller: assignedInstaller,

            // Live Telemetry (from telemetry.json)
            telemetry: telem ? {
                status: telem.status || "live",
                lastUpdated: telem.lastUpdated || new Date().toISOString(),
                baseSolar: typeof telem.solarKw === "number" ? telem.solarKw : 0,
                baseHome: typeof telem.homeKw === "number" ? telem.homeKw : 0,
                baseBattery: typeof telem.batteryKw === "number" ? telem.batteryKw : 0,
                batterySoc: telem.batterySoc,
                pvStrings: telem.pvStrings || "",
                gridSync: telem.gridSync || "",
                inverterTemp: telem.inverterTemp || (telem.inverterTempC ? `${telem.inverterTempC}°C` : "Normal"),
                gridStatus: telem.gridStatus || "",
                backupReady: telem.backupReady !== false,
                backupStatusText: telem.backupStatusText || (system.hasBattery ? "Backup Ready" : "Battery not included")
            } : null,

            // Energy & Savings (from savings.json)
            energy: save ? {
                hasReadings: save.hasReadings !== false,
                todayGenerated: save.todayGenerated || (save.todayGeneratedKwh ? `${save.todayGeneratedKwh} kWh` : "0 kWh"),
                billSaved: save.billSaved || (save.estimatedMonthlySavings ? `₱${save.estimatedMonthlySavings.toLocaleString()}` : "₱0"),
                savingsPeriod: save.savingsPeriod || "This month",
                batteryReserve: save.batteryReserve || (save.batteryReserveKwh ? `${save.batteryReserveKwh} kWh` : (system.hasBattery ? "10 kWh" : "Battery not included")),
                batterySoc: save.batterySoc,
                backupHours: save.backupHours ? `${save.backupHours} hrs` : (system.hasBattery ? "18 hrs" : "Not supported"),
                chart: save.chart || null,
                breakdown: save.breakdown || null,
                ecoImpact: save.ecoImpact || { trees: "0", co2Kg: "0" }
            } : null,

            // Payments (from payments.json)
            payments: pay ? {
                hasBills: pay.hasBills !== false,
                paymentType: paymentType,
                packageName: packageName,
                paymentPlan: plan || pay.paymentPlan || null,
                totalAmount: (pay && pay.totalAmount) || system.totalAmount || 0,
                amountDue: (pay && pay.amountDue !== undefined) ? pay.amountDue : (system.amountDue !== undefined ? system.amountDue : (isActive ? 0 : ((pay && pay.totalAmount) || system.totalAmount || 0))),
                formattedTotalAmount: (pay && pay.formattedTotalAmount) || system.formattedTotalAmount || pesoFmt((pay && pay.totalAmount) || system.totalAmount),
                formattedAmountDue: (pay && pay.formattedAmountDue) || system.formattedAmountDue || (isActive ? "₱0" : pesoFmt((pay && pay.totalAmount) || system.totalAmount)),
                receiptVerificationStatus: pay.receiptVerificationStatus || system.receiptVerificationStatus || (isActive ? "Verified" : "Awaiting Submission"),
                downPayment: downPayment,
                formattedDownPayment: formattedDownPayment,
                monthlyInstallmentAmount: monthlyPayment,
                formattedMonthlyPayment: formattedMonthlyPayment,
                nextPaymentAmount: formattedMonthlyPayment,
                totalInstallments: totalInstallmentsCount,
                paidInstallments: paymentsCompletedStr,
                totalPaid: totalPaidStr,
                term: (function() {
                    if (plan && plan.term) return plan.term;
                    const t = pay.planTerm || (typeof system.paymentPlan === "string" ? system.paymentPlan : "");
                    if (!t) return paymentType === "full_payment" ? "Full Payment" : "5 Years";
                    const m = t.match(/^(\d+)[-\s]*year/i);
                    return m ? `${m[1]} Years` : t;
                })(),
                termBadge: pay.termBadge || ((plan && plan.term) ? `${plan.term.replace(/s$/i, '')} Term` : (paymentType === "full_payment" ? "Full Payment" : "5-Year Term")),
                standing: pay.standing || (isActive ? "Good" : (paymentType === "full_payment" ? "Payment Required" : "Up to Date")),
                standingMeta: pay.standingMeta || (isActive ? "Account up to date" : "Installation / Payment in progress"),
                currentBillRef: pay.currentBillRef || (paymentType === "full_payment" ? `${system.accountNo}-FP` : system.accountNo),
                schedule: Array.isArray(pay.schedule) ? pay.schedule : []
            } : {
                hasBills: false,
                paymentType: paymentType,
                totalAmount: Number(system.totalAmount) || 0,
                amountDue: Number(system.totalAmount) || 0,
                formattedTotalAmount: pesoFmt(system.totalAmount),
                formattedAmountDue: pesoFmt(system.totalAmount),
                receiptVerificationStatus: "Awaiting Submission",
                term: paymentType === "full_payment" ? "Full Payment" : (system.termMonths ? `${system.termMonths} Months` : "Pending Setup"),
                termBadge: paymentType === "full_payment" ? "Full Payment" : "Pending Assessment",
                standing: paymentType === "full_payment" ? "Payment Required" : "Pending Billing",
                standingMeta: "Billing setup in progress",
                currentBillRef: system.accountNo,
                schedule: []
            },

            // Installation Progression & Crew
            install: {
                hasInstallation: true,
                phase: isActive ? "Completed" : "In Progress",
                phaseStatusText: isActive ? "Commissioned" : "Stage 4 of 5",
                phaseMeta: isActive ? "Active rooftop generation" : "Active grid synchronization",
                completionPct: isActive ? 100 : (paymentType === "full_payment" ? 20 : 60),
                milestonesAchieved: isActive ? "5 of 5 milestones achieved" : (paymentType === "full_payment" ? "1 of 5 milestones achieved" : "3 of 5 milestones achieved"),
                nextMilestone: isActive ? "Routine Maintenance" : "Installation",
                assignedTeam: assignedInstaller ? {
                    name: assignedInstaller.name,
                    initials: String(assignedInstaller.name || "").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase(),
                    role: assignedInstaller.role,
                    phone: assignedInstaller.phone,
                    note: assignedInstaller.note || "Assigned project lead for installation craftsmanship and warranty support."
                } : null,
                milestones: []
            },

            // Support Context
            support: {
                hasSupport: true,
                leadTechnician: assignedInstaller ? assignedInstaller.name : "Hello Solar Central Dispatch",
                leadRole: assignedInstaller ? (assignedInstaller.role || "Certified Solar Master Installer") : "Hello Solar Support / Super Admin",
                leadPhone: assignedInstaller ? assignedInstaller.phone : "+63 2 8888 0100",
                leadContact: assignedInstaller ? `${assignedInstaller.phone} (${assignedInstaller.name})` : "+63 2 8888 0100 (Central Dispatch)",
                tickets: []
            }
        };
    }

    /**
     * DataLoader API
     */
    const DataLoader = {
        fetchJson,
        assemblePackage,

        loadAccounts: () => fetchJson("accounts.json"),
        loadSystems: () => fetchJson("systems.json"),
        loadTelemetry: () => fetchJson("telemetry.json"),
        loadPayments: () => fetchJson("payments.json"),
        loadSavings: () => fetchJson("savings.json"),
        loadEquipment: () => fetchJson("equipment.json"),
        loadWarranties: () => fetchJson("warranties.json"),
        loadFaqs: () => fetchJson("faqs.json"),

        /**
         * Loads all modular JSON files and builds comprehensive portal datasets.
         * Returns { customer, packages, faqs }
         */
        async loadAll() {
            // api mode / demo data off: no sample systems, telemetry, savings, equipment, warranties or accounts.
            // Systems are built only from the customer's shared applications; FAQs are static site content.
            if (window.HS_CONFIG && (window.HS_CONFIG.isApi || window.HS_CONFIG.demoData === false)) {
                const faqs = await fetchJson("faqs.json");
                return { customer: null, packages: [], faqs: Array.isArray(faqs) ? faqs : [] };
            }

            // Check for user-defined custom dataset in localStorage first (persisted editability)
            const storedCustom = localStorage.getItem("hello_solar_customer_custom_dataset");
            if (storedCustom) {
                try {
                    const parsed = JSON.parse(storedCustom);
                    if (parsed && Array.isArray(parsed.packages) && parsed.packages.length > 0) {
                        return {
                            customer: parsed.customer || null,
                            packages: parsed.packages,
                            faqs: parsed.faqs || []
                        };
                    }
                } catch (e) {
                    console.warn("[DataLoader] Failed to parse custom stored dataset:", e);
                }
            }

            // Fetch modular JSON files concurrently
            const [
                accountsRes,
                systemsRes,
                telemetryRes,
                paymentsRes,
                savingsRes,
                equipmentRes,
                warrantiesRes,
                faqsRes
            ] = await Promise.all([
                fetchJson("accounts.json"),
                fetchJson("systems.json"),
                fetchJson("telemetry.json"),
                fetchJson("payments.json"),
                fetchJson("savings.json"),
                fetchJson("equipment.json"),
                fetchJson("warranties.json"),
                fetchJson("faqs.json")
            ]);

            // If modular systems file is successfully loaded:
            if (Array.isArray(systemsRes) && systemsRes.length > 0) {
                const telemetryMap = new Map((Array.isArray(telemetryRes) ? telemetryRes : []).map(t => [t.systemId, t]));
                const paymentsMap = new Map((Array.isArray(paymentsRes) ? paymentsRes : []).map(p => [p.systemId, p]));
                const savingsMap = new Map((Array.isArray(savingsRes) ? savingsRes : []).map(s => [s.systemId, s]));
                const equipmentMap = new Map((Array.isArray(equipmentRes) ? equipmentRes : []).map(e => [e.systemId, e]));
                const warrantiesMap = new Map((Array.isArray(warrantiesRes) ? warrantiesRes : []).map(w => [w.systemId, w]));

                const assembledPackages = systemsRes
                    .map(sys => assemblePackage(sys, telemetryMap, paymentsMap, savingsMap, equipmentMap, warrantiesMap))
                    .filter(Boolean);

                // Select primary account for session customer profile
                const primaryAccount = Array.isArray(accountsRes) && accountsRes.length > 0
                    ? accountsRes[0]
                    : null;

                return {
                    customer: primaryAccount,
                    packages: assembledPackages,
                    faqs: Array.isArray(faqsRes) ? faqsRes : []
                };
            }

            // Fallback to legacy customer.json if modular files failed (e.g. offline / CORS)
            const legacyData = await fetchJson("customer.json");
            if (legacyData && Array.isArray(legacyData.packages) && legacyData.packages.length > 0) {
                return {
                    customer: legacyData.customer || null,
                    packages: legacyData.packages,
                    faqs: legacyData.faqs || []
                };
            }

            // Return null so consumer knows to rely on in-memory defaults
            return null;
        }
    };

    // Expose to window namespace
    window.HelloSolarDataLoader = DataLoader;

})(typeof window !== "undefined" ? window : this);
