// Hello Solar Super Admin - Centralized Shared Data Model
// Connects Customer, Financer, Installer, and Merchant workflows

(function() {
  const STORAGE_KEY = "HELLO_SOLAR_SUPER_ADMIN_DATA_V2";
  // Shared queue written by the landing page Contact Us form (partner inquiries)
  const PARTNER_INQUIRY_KEY = "HELLO_SOLAR_PARTNER_INQUIRIES";
  // Shared queue written by the landing page for customer inquiries
  // (Solar Recommendation / Request Solar Proposal form and Contact Us → Customer)
  const CUSTOMER_INQUIRY_KEY = "HELLO_SOLAR_CUSTOMER_INQUIRIES";
  const PARTNER_TYPES = ["Financer", "Installer", "Merchant"];
  // Hello Solar packages (same prices as the landing page). Installment: 60 months, ₱10,000 down payment.
  const INSTALLMENT_TERM_MONTHS = 60;
  const INSTALLMENT_DOWN_PAYMENT = 10000;
  const PACKAGE_CATALOG = [
    { id: "hs6-lite", name: "HS 6 LITE", price: 270000, monthly: 7650 },
    { id: "hs6-pro", name: "HS 6 PRO", price: 320000, monthly: 9066.67 },
    { id: "hs6-max", name: "HS 6 MAX", price: 385000, monthly: 10908.33 },
    { id: "hs8-pro", name: "HS 8 PRO", price: 420000, monthly: 11900 },
    { id: "hs8-max", name: "HS 8 MAX", price: 595000, monthly: 16859 },
    { id: "hs10-pro", name: "HS 10 PRO", price: 535000, monthly: 15159 },
    { id: "hs12-max", name: "HS 12 MAX", price: 760000, monthly: 21533.33 }
  ];
  function findPackage(ref) {
    const key = String(ref || "").trim().toLowerCase();
    if (!key) return null;
    return PACKAGE_CATALOG.find(p => p.id === key) ||
      PACKAGE_CATALOG.find(p => key === p.name.toLowerCase() || key.startsWith(p.name.toLowerCase() + " ") || key.startsWith(p.name.toLowerCase() + "\u2014")) || null;
  }
  // Pricing of a new application: the inquiry's selected package, else the catalog package named by the system,
  // else explicit payload values. No hardcoded fallback amount.
  function resolvePricing(payload, inquiry, isFullPayment) {
    const num = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };
    const pkg = findPackage(inquiry?.packageId) || findPackage(payload.packageId) || findPackage(payload.system) || findPackage(inquiry?.selectedSolarModel);
    const price = num(inquiry?.packagePrice) || num(payload.amount) || (pkg ? pkg.price : null);
    const monthly = num(inquiry?.monthlyPayment) || num(payload.monthly) || (pkg ? pkg.monthly : null);
    const termMonths = num(inquiry?.termMonths) || num(payload.termMonths) || (pkg ? INSTALLMENT_TERM_MONTHS : null);
    const dpRaw = inquiry?.downPayment ?? payload.downPayment;
    const downPayment = Number.isFinite(Number(dpRaw)) && dpRaw !== null && dpRaw !== "" ? Number(dpRaw) : (pkg ? INSTALLMENT_DOWN_PAYMENT : null);
    return {
      packageId: pkg ? pkg.id : (inquiry?.packageId || null),
      amount: price,
      monthly: isFullPayment ? 0 : monthly,
      termMonths: isFullPayment ? null : termMonths,
      downPayment: isFullPayment ? 0 : downPayment
    };
  }
  // Customer document uploads, keyed by APP ID (written by the Customer portal)
  const SHARED_DOCUMENTS_KEY = "hello_solar_shared_documents";
  const INSTALLATION_PROGRESS_KEY = "hello_solar_installation_progress";

  // Runtime mode (shared/hello-solar-config.js). Without the config file (Node tests, old pages) → local + demo data.
  const HS_CONFIG = (typeof window !== "undefined" && window.HS_CONFIG) || { mode: "local", isApi: false, demoData: true };
  const IS_API = !!HS_CONFIG.isApi;
  const DEMO_DATA = !IS_API && HS_CONFIG.demoData !== false;
  // Shared records: localStorage in local mode, the backend-fed page cache in api mode
  const STORE = {
    getItem: key => ((typeof window !== "undefined" && window.HSStore) || localStorage).getItem(key),
    setItem: (key, value) => ((typeof window !== "undefined" && window.HSStore) || localStorage).setItem(key, value)
  };

  const DEFAULT_DATA = {
    schemaVersion: 5,
    customers: [
      { id: "CUS-1001", name: "Maria Elena Cruz", email: "elena.cruz@gmail.com", phone: "+63 917 234 5678", location: "Cebu City", system: "6 kW", status: "Active", appId: "APP-1024", hsId: "HS-21024", invitationStatus: "Active", joined: "2026-03-12" },
      { id: "CUS-1002", name: "Ricardo Gomez", email: "rgomez.cebu@yahoo.com", phone: "+63 920 456 7890", location: "Mandaue City", system: "8 kW", status: "Active", appId: "APP-1048", hsId: "HS-21048", invitationStatus: "Active", joined: "2026-04-05" },
      { id: "CUS-1003", name: "Andrea Lim", email: "andrea.lim@outlook.com", phone: "+63 918 345 6789", location: "Quezon City", system: "5 kW", status: "Pending Review", appId: "APP-1031", hsId: "HS-21031", invitationStatus: "Active", joined: "2026-08-14" },
      { id: "CUS-1004", name: "Joshua Tan", email: "josh.tan@gmail.com", phone: "+63 922 890 1234", location: "Lapu-Lapu City", system: "10 kW", status: "Active", appId: "APP-1050", hsId: "HS-21050", invitationStatus: "Active", joined: "2026-05-20" },
      { id: "CUS-1005", name: "Pacific Horizon Logistics", email: "procurement@pacifichorizon.ph", phone: "+63 32 412 8890", location: "Talisay City", system: "18 kW", status: "Active", appId: "APP-1056", hsId: "HS-21056", invitationStatus: "Active", joined: "2026-02-18" },
      { id: "CUS-1006", name: "Atty. Fernando Mendoza", email: "atty.mendoza@mendozalaw.ph", phone: "+63 917 889 0123", location: "Quezon City", system: "7 kW", status: "Active", appId: "APP-1062", hsId: "HS-21062", invitationStatus: "Active", joined: "2026-06-10" },
      { id: "CUS-1007", name: "Roberto Santos", email: "robert.santos@santosauto.com", phone: "+63 919 678 9012", location: "Cebu City", system: "12 kW", status: "Active", appId: "APP-1070", hsId: "HS-21070", invitationStatus: "Active", joined: "2026-01-22" },
      { id: "CUS-1008", name: "Dr. Corazon Valdez", email: "dr.valdez@medicalcity.ph", phone: "+63 915 223 3445", location: "Pasig City", system: "6.5 kW", status: "Pending Review", appId: "APP-1075", hsId: "HS-21075", invitationStatus: "Active", joined: "2026-09-18" },
      { id: "CUS-1009", name: "Clara Mendoza", email: "clara.mendoza@gmail.com", phone: "+63 917 555 0891", location: "Cebu City", system: "8.5 kW", status: "Active", appId: "APP-1058", hsId: "HS-21058", invitationStatus: "Active", joined: "2026-08-14" },
    // Portal demo identities registered in the shared registry (single identity model)
      { id: "CUS-1010", name: "Juan Dela Cruz", email: "customer@hellosolar.ph", username: "customer", phone: "+63 917 123 4567", location: "Quezon City", system: "5.4 kW", status: "Active", appId: "APP-4091", hsId: "HS-88219", invitationStatus: "Active", hasSetPassword: true, password: "password123", joined: "2025-03-01" },
      { id: "CUS-1011", name: "Maria Santos", email: "maria.santos@gmail.com", username: "maria", phone: "+63 918 765 4321", location: "Quezon City", system: "6.8 kW", status: "Active", appId: "APP-3012", hsId: "HS-72301", invitationStatus: "Active", hasSetPassword: true, password: "password123", joined: "2025-06-01" }
    ],

    // Contract fields are backend-ready: contractTermMonths, annualRate (% p.a.), contractStartDate/EndDate (YYYY-MM-DD),
    // contractStatusOverride (null | "Terminated"). contractStatus + fundingOwner/fundingOwnerId are derived by syncFinancerContracts().
    financers: [
      { id: "FIN-001", name: "SunFund Philippines", contact: "Rafael Villanueva", email: "partners@sunfund.ph", phone: "+63 2 8845 2200", activeLoans: 14, totalFunded: 4850000, status: "Active", contractTermMonths: 36, annualRate: 8.5, contractStartDate: "2025-01-15", contractEndDate: "2028-01-15", contractStatusOverride: null },
      { id: "FIN-002", name: "BDO Green Energy Financing", contact: "Clarissa Bautista", email: "greenloans@bdo.com.ph", phone: "+63 2 8631 8000", activeLoans: 9, totalFunded: 3420000, status: "Active", contractTermMonths: 24, annualRate: 7.25, contractStartDate: "2024-08-01", contractEndDate: "2026-08-01", contractStatusOverride: null },
      { id: "FIN-003", name: "UnionBank Solar Loan Program", contact: "Mark Anthony Reyes", email: "solarcredit@unionbankph.com", phone: "+63 2 8841 8600", activeLoans: 6, totalFunded: 2180000, status: "Active", contractTermMonths: 60, annualRate: 9.0, contractStartDate: "2026-03-01", contractEndDate: "2031-03-01", contractStatusOverride: null },
      { id: "FIN-004", name: "Maya Bank Sustainable Energy", contact: "Janice De Leon", email: "credit-ops@mayabank.ph", phone: "+63 2 8845 7788", activeLoans: 4, totalFunded: 1250000, status: "Active", contractTermMonths: 24, annualRate: 10.5, contractStartDate: "2025-11-10", contractEndDate: "2027-11-10", contractStatusOverride: null },
    // Portal demo identities registered in the shared registry (single identity model)
      { id: "FIN-005", name: "SolarTech Financer", contact: "Finance Officer", email: "financer@hellosolar.ph", phone: "0917 888 2345", activeLoans: 5, totalFunded: 2765000, status: "Active", password: "password123", contractTermMonths: 36, annualRate: 8.75, contractStartDate: "2026-01-01", contractEndDate: "2029-01-01", contractStatusOverride: null },
      { id: "FIN-006", name: "First Solar Capital", contact: "Elena Santos", email: "partner@hellosolar.ph", phone: "0917 888 6100", activeLoans: 0, totalFunded: 0, status: "Active", password: "password123", contractTermMonths: null, annualRate: null, contractStartDate: null, contractEndDate: null, contractStatusOverride: null }
    ],

    // Direct Installation Engineer accounts (internal; separate from partner installers)
    engineers: [],
    installers: [
      { id: "INS-001", name: "Hello Solar Internal Team", type: "Internal", contact: "Engr. Limuel Brasona", email: "engineering@hellosolar.ph", phone: "+63 32 238 9001", activeJobs: 2, completedJobs: 28, rating: 4.9, status: "Active" },
      { id: "INS-002", name: "SolarTech Visayas Solutions", type: "Partner", contact: "Dante Alcantara", email: "ops@solartechvisayas.com", phone: "+63 32 414 7712", activeJobs: 2, completedJobs: 19, rating: 4.8, status: "Active" },
      { id: "INS-003", name: "SunPower Masters Cebu", type: "Partner", contact: "Ramon Quisumbing", email: "info@sunpowermasters.ph", phone: "+63 32 340 5566", activeJobs: 2, completedJobs: 14, rating: 4.7, status: "Active" },
      { id: "INS-004", name: "GreenVolt Solutions Corp.", type: "Partner", contact: "Gilbert Soriano", email: "g.soriano@greenvolt.ph", phone: "+63 2 8721 9900", activeJobs: 1, completedJobs: 11, rating: 4.3, status: "Active" },
      { id: "INS-005", name: "Apex Solar Engineering", type: "Partner", contact: "Vicente Morales", email: "vicente@apexsolar.com.ph", phone: "+63 32 505 4421", activeJobs: 0, completedJobs: 8, rating: 4.6, status: "Inactive" },
    // Portal demo identities registered in the shared registry (single identity model)
      { id: "INS-006", name: "SolarTech Installer", type: "Partner", contact: "Alex Rivera", email: "installer@hellosolar.ph", phone: "+63 917 555 0199", activeJobs: 1, completedJobs: 48, rating: 4.95, status: "Active", password: "password123", location: "Metro Manila & Southern Luzon", profile: { licenseNo: "PCAB Solar Contractor Lic. #2024-8841", prcNo: "PRC Reg. Electrical Engineer #0078421", coverageArea: "Metro Manila, Cavite, Laguna, Rizal, Batangas", specialization: "Rooftop Grid-Tie Systems, Hybrid Storage, Net-Metering Commissioning", bio: "Over 8 years of premier residential and commercial rooftop solar installations with full PCAB safety accreditation and zero-incident track record.", payoutMethod: "BDO Unibank (On File)", totalCapacityKwp: 288 } }
    ],

    merchants: [
      { id: "MER-019", name: "SolarHub Trading", contact: "Jonathan Co", email: "sales@solarhubtrading.ph", phone: "+63 32 231 6680", projects: 5, transactions: 112, volume: 3840000, status: "Active" },
      { id: "MER-021", name: "Cebu Energy Supply Co.", contact: "Melissa Yap", email: "accounts@cebuenergysupply.com", phone: "+63 32 416 9901", projects: 3, transactions: 67, volume: 2450000, status: "Active" },
      { id: "MER-022", name: "BrightGrid Hardware", contact: "Evelyn Sy", email: "inquiry@brightgrid.ph", phone: "+63 2 8920 1144", projects: 2, transactions: 31, volume: 1120000, status: "Pending Review" },
      { id: "MER-025", name: "SunVenture Renewable Materials", contact: "Paolo Dizon", email: "distribution@sunventure.com", phone: "+63 32 344 8820", projects: 4, transactions: 85, volume: 2900000, status: "Active" },
    // Portal demo identities registered in the shared registry (single identity model)
      { id: "MER-026", name: "SolarTech Manila", contact: "Marco Santos", email: "merchant@hellosolar.ph", phone: "+63 917 888 2026", projects: 6, transactions: 48, volume: 3850000, status: "Active", password: "password123", address: "Unit 802, Solar Tower, Ortigas Center, Pasig City" }
    ],

    applications: [
      {
        id: "APP-1024",
        hsId: "HS-21024",
        customer: "Maria Elena Cruz",
        customerId: "CUS-1001",
        location: "Cebu City",
        system: "6 kW",
        panels: "12x Canadian Solar 500W",
        inverter: "Huawei SUN2000-5KTL",
        stage: "Approved", // Eligible for Hello Solar Direct!
        financer: "SunFund Philippines",
        financerId: "FIN-001",
        installer: "Unassigned",
        installerType: "Partner Installer",
        amount: 315000,
        monthly: 7200,
        docs: "5/5",
        paymentStatus: "On Time",
        nextDue: "2026-10-15",
        updated: "25 mins ago",
        notes: "Credit approved by SunFund. Ready for installer assignment or Hello Solar Direct installation."
      },
      {
        id: "APP-1031",
        hsId: "HS-21031",
        customer: "Andrea Lim",
        customerId: "CUS-1003",
        location: "Quezon City",
        system: "5 kW",
        paymentType: "Full Payment",
        paymentPreference: "Full Payment",
        panels: "10x Trina Solar 500W",
        inverter: "Growatt 5000TL",
        stage: "Payment Required",
        financer: "Not Required",
        financerId: null,
        installer: "Unassigned",
        installerType: "Partner Installer",
        amount: 245000,
        monthly: 0,
        docs: "1/1",
        paymentStatus: "Verification Required",
        uploadedReceipt: "bdo_transfer_receipt_app1031.png",
        receiptUploadedAt: "2026-09-28",
        receiptBank: "BDO Unibank Direct Transfer",
        receiptReference: "BDO-TXN-88219304",
        receiptAmount: 245000,
        nextDue: "Sep 28, 2026",
        updated: "1 hour ago",
        notes: "Full payment application. Customer uploaded bank transfer receipt, awaiting administrative verification."
      },
      {
        id: "APP-1048",
        hsId: "HS-21048",
        customer: "Ricardo Gomez",
        customerId: "CUS-1002",
        location: "Mandaue City",
        system: "8 kW",
        panels: "16x Jinko Tiger Neo 500W",
        inverter: "Deye 8kW Hybrid",
        stage: "Ready for Installation",
        financer: "UnionBank Solar Loan Program",
        financerId: "FIN-003",
        installer: "SolarTech Visayas Solutions",
        assignedInstallerId: "INS-002",
        installerType: "Partner Installer",
        amount: 420000,
        monthly: 9600,
        docs: "5/5",
        paymentStatus: "Due Soon",
        nextDue: "2026-09-29",
        updated: "2 hours ago",
        notes: "Assigned to SolarTech Visayas. Pre-installation roof structural inspection completed."
      },
      {
        id: "APP-1050",
        hsId: "HS-21050",
        customer: "Joshua Tan",
        customerId: "CUS-1004",
        location: "Lapu-Lapu City",
        system: "10 kW",
        panels: "20x Longi Hi-MO 6 500W",
        inverter: "GoodWe 10kW Hybrid",
        stage: "Approved", // Eligible for Hello Solar Direct!
        financer: "SunFund Philippines",
        financerId: "FIN-001",
        installer: "Unassigned",
        installerType: "Partner Installer",
        amount: 510000,
        monthly: 11800,
        docs: "5/5",
        paymentStatus: "On Time",
        nextDue: "2026-10-20",
        updated: "3 hours ago",
        notes: "Approved financing disbursement. High roof pitch, eligible for Hello Solar Direct Team."
      },
      {
        id: "APP-1056",
        hsId: "HS-21056",
        customer: "Pacific Horizon Logistics",
        customerId: "CUS-1005",
        location: "Talisay City",
        system: "18 kW",
        panels: "36x Canadian Solar 500W",
        inverter: "Huawei SUN2000-15KTL",
        stage: "Ready for Installation",
        financer: "BDO Green Energy Financing",
        financerId: "FIN-002",
        installer: "GreenVolt Solutions Corp.",
        assignedInstallerId: "INS-004",
        installerType: "Partner Installer",
        amount: 920000,
        monthly: 21000,
        docs: "5/5",
        paymentStatus: "Overdue",
        nextDue: "2026-09-12",
        updated: "4 hours ago",
        notes: "Installation delayed due to local utility metering review. Payment overdue by 12 days."
      },
      {
        id: "APP-1062",
        hsId: "HS-21062",
        customer: "Atty. Fernando Mendoza",
        customerId: "CUS-1006",
        location: "Quezon City",
        system: "7 kW",
        panels: "14x Trina Vertex 500W",
        inverter: "Huawei SUN2000-6KTL",
        stage: "Ready for Installation",
        financer: "Maya Bank Sustainable Energy",
        financerId: "FIN-004",
        installer: "Hello Solar Internal Team",
        assignedInstallerId: "INS-001",
        installerType: "Hello Solar Direct",
        amount: 360000,
        monthly: 8300,
        docs: "5/5",
        paymentStatus: "On Time",
        nextDue: "2026-10-05",
        updated: "Yesterday",
        notes: "Accepted for Hello Solar Direct Installation. Internal Engineering Team dispatched for mounting."
      },
      {
        id: "APP-1070",
        hsId: "HS-21070",
        customer: "Roberto Santos",
        customerId: "CUS-1007",
        location: "Cebu City",
        system: "12 kW",
        paymentType: "Full Payment",
        paymentPreference: "Full Payment",
        panels: "24x Jinko Solar 500W",
        inverter: "Solis 12kW 3-Phase",
        stage: "Approved",
        financer: "Not Required",
        financerId: null,
        installer: "Hello Solar Internal Team",
        assignedInstallerId: "INS-001",
        installerType: "Hello Solar Direct",
        amount: 640000,
        monthly: 0,
        docs: "5/5",
        paymentStatus: "Completed",
        uploadedReceipt: "metrobank_wire_app1070.pdf",
        receiptUploadedAt: "2026-09-22",
        receiptBank: "Metrobank Direct Wire",
        receiptReference: "MB-WIRE-990142",
        receiptAmount: 640000,
        nextDue: "Paid in Full",
        updated: "3 days ago",
        notes: "Commissioned by Hello Solar Direct team. Paid in full via direct bank transfer."
      },
      {
        id: "APP-1075",
        hsId: "HS-21075",
        customer: "Dr. Corazon Valdez",
        customerId: "CUS-1008",
        location: "Pasig City",
        system: "6.5 kW",
        paymentType: "Installment",
        paymentPreference: "Installment",
        panels: "13x Canadian Solar 500W",
        inverter: "Growatt 6000TL",
        stage: "Financing Review",
        financer: "UnionBank Solar Loan Program",
        financerId: "FIN-003",
        installer: "Unassigned",
        installerType: "Partner Installer",
        amount: 340000,
        monthly: 7800,
        docs: "4/5",
        paymentStatus: "On Time",
        nextDue: "2026-10-25",
        updated: "5 hours ago",
        notes: "Newly processed installment application under bank financing review."
      },
      {
        id: "APP-1082",
        hsId: "HS-21082",
        customer: "Island Gateway Resort",
        customerId: "CUS-1004",
        location: "Lapu-Lapu City",
        system: "25 kW",
        panels: "50x Trina Solar 500W",
        inverter: "Huawei 25KTL",
        stage: "Under Review",
        financer: "BDO Green Energy Financing",
        financerId: "FIN-002",
        installer: "Unassigned",
        installerType: "Partner Installer",
        amount: 1350000,
        monthly: 31000,
        docs: "5/5",
        paymentStatus: "On Time",
        nextDue: "2026-10-30",
        updated: "1 day ago",
        notes: "Commercial application undergoing final underwriter risk analysis at BDO."
      },
      {
        id: "APP-1089",
        hsId: "HS-21089",
        customer: "Manuel Pangilinan",
        customerId: "CUS-1003",
        location: "Taguig City",
        system: "9 kW",
        panels: "18x Longi 500W",
        inverter: "Deye 8kW",
        stage: "Declined",
        financer: "SunFund Philippines",
        financerId: "FIN-001",
        installer: "Unassigned",
        installerType: "Partner Installer",
        amount: 470000,
        monthly: 10800,
        docs: "2/5",
        paymentStatus: "Overdue",
        nextDue: "2026-09-08",
        updated: "2 days ago",
        notes: "Declined due to debt service ratio limit. Financer record flagged missed initial payment due Sep 8, 2026."
      },
      {
        id: "APP-1094",
        hsId: "HS-21094",
        customer: "Teresa Alcantara",
        customerId: "CUS-1002",
        location: "Mandaue City",
        system: "5 kW",
        panels: "10x Canadian Solar 500W",
        inverter: "Growatt 5000TL",
        stage: "Approved", // Eligible for Hello Solar Direct!
        financer: "Maya Bank Sustainable Energy",
        financerId: "FIN-004",
        installer: "Unassigned",
        installerType: "Partner Installer",
        amount: 260000,
        monthly: 6000,
        docs: "5/5",
        paymentStatus: "Due Soon",
        nextDue: "2026-10-01",
        updated: "6 hours ago",
        notes: "Approved and awaiting installer dispatch. Eligible for Hello Solar Direct."
      },
      {
        id: "APP-1102",
        hsId: "HS-21102",
        customer: "Northern Coast Cold Storage",
        customerId: "CUS-1001",
        location: "Cebu City",
        system: "30 kW",
        panels: "60x Jinko 500W",
        inverter: "Huawei 30KTL",
        stage: "Ready for Installation",
        financer: "SunFund Philippines",
        financerId: "FIN-001",
        installer: "Hello Solar Internal Team",
        assignedInstallerId: "INS-001",
        installerType: "Maintenance",
        amount: 1620000,
        monthly: 37200,
        docs: "5/5",
        paymentStatus: "On Time",
        nextDue: "2026-10-18",
        updated: "Just now",
        notes: "Biannual preventive inverter calibration and string thermal imaging inspection."
      },
      {
        id: "APP-1058",
        hsId: "HS-21058",
        customer: "Clara Mendoza",
        customerId: "CUS-1009",
        location: "Cebu City",
        system: "8.5 kW",
        panels: "17x Canadian Solar 500W",
        inverter: "Huawei 8KTL",
        stage: "Ready for Installation",
        financer: "SunFund Philippines",
        financerId: "FIN-001",
        installer: "Hello Solar Internal Team",
        assignedInstallerId: "INS-001",
        installerType: "Hello Solar Direct",
        amount: 430000,
        monthly: 9900,
        docs: "5/5",
        paymentStatus: "On Time",
        nextDue: "2026-10-15",
        updated: "Just now",
        notes: "Approved and ready for internal team schedule assignment."
      },
    // Portal demo identities registered in the shared registry (single identity model)
      {
        id: "APP-4091",
        hsId: "HS-88219",
        customer: "Juan Dela Cruz",
        customerId: "CUS-1010",
        contactEmail: "customer@hellosolar.ph",
        contactPhone: "+63 917 123 4567",
        location: "Quezon City",
        system: "5.4 kW",
        panels: "12x Trina Solar Vertex S+ 450W",
        inverter: "Solis 5kW Hybrid Inverter",
        paymentType: "Installment",
        paymentPreference: "Installment",
        stage: "Approved",
        financer: "SolarTech Financer",
        financerId: "FIN-005",
        installer: "SolarTech Installer",
        assignedInstallerId: "INS-006",
        installerType: "Partner Installer",
        dispatchStatus: "Accepted",
        installationStatus: "COMPLETED",
        systemStatus: "ACTIVE",
        applicationStatus: "ACTIVE",
        progress: 100,
        amount: 554000,
        monthly: 9066.67,
        docs: "4/4",
        paymentStatus: "On Time",
        nextDue: "2026-10-15",
        updated: "2 days ago",
        notes: "Commissioned residential hybrid system. Customer portal: Home Primary."
      },
      {
        id: "APP-4088",
        hsId: "HS-99402",
        customer: "Juan Dela Cruz",
        customerId: "CUS-1010",
        contactEmail: "customer@hellosolar.ph",
        contactPhone: "+63 917 123 4567",
        location: "Tagaytay, Cavite",
        system: "10.8 kW",
        panels: "24x Canadian Solar 450W HiKu6",
        inverter: "Deye 10kW Hybrid Inverter",
        paymentType: "Installment",
        paymentPreference: "Installment",
        stage: "Approved",
        financer: "SolarTech Financer",
        financerId: "FIN-005",
        installer: "SolarTech Installer",
        assignedInstallerId: "INS-006",
        installerType: "Partner Installer",
        dispatchStatus: "Accepted",
        installationStatus: "COMPLETED",
        systemStatus: "ACTIVE",
        applicationStatus: "ACTIVE",
        progress: 100,
        amount: 1490800,
        monthly: 17450,
        docs: "4/4",
        paymentStatus: "On Time",
        nextDue: "2026-10-20",
        updated: "3 days ago",
        notes: "Commissioned villa system. Customer portal: Tagaytay Villa."
      },
      {
        id: "APP-4085",
        hsId: "HS-77310",
        customer: "Juan Dela Cruz",
        customerId: "CUS-1010",
        contactEmail: "customer@hellosolar.ph",
        contactPhone: "+63 917 123 4567",
        location: "Lipa, Batangas",
        system: "3.6 kW",
        panels: "8x Longi Solar Hi-MO 5 450W",
        inverter: "Growatt 3.6kW Hybrid Inverter",
        paymentType: "Installment",
        paymentPreference: "Installment",
        stage: "Installation",
        financer: "SolarTech Financer",
        financerId: "FIN-005",
        installer: "SolarTech Installer",
        assignedInstallerId: "INS-006",
        installerType: "Partner Installer",
        dispatchStatus: "Accepted",
        installationStatus: "INSTALLATION_IN_PROGRESS",
        systemStatus: "Installation in Progress",
        progress: 60,
        amount: 231200,
        monthly: 6200,
        docs: "4/4",
        paymentStatus: "Overdue",
        nextDue: "2026-09-30",
        updated: "Yesterday",
        notes: "Partner installation in progress. Customer portal: Batangas Farmhouse."
      },
      {
        id: "APP-8821",
        hsId: "HS-10492",
        customer: "Juan Dela Cruz",
        customerId: "CUS-1010",
        contactEmail: "customer@hellosolar.ph",
        contactPhone: "+63 917 123 4567",
        location: "Ortigas, Pasig",
        system: "6.0 kW",
        panels: "12x Trina Solar Vertex 500W Commercial",
        inverter: "Huawei SUN2000-6KTL Commercial",
        paymentType: "Full Payment",
        paymentPreference: "Full Payment",
        stage: "Payment Required",
        financer: "Not Required",
        financerId: null,
        installer: "Unassigned",
        installerType: "Partner Installer",
        systemStatus: "Waiting for Installer",
        amount: 320000,
        monthly: 0,
        docs: "1/1",
        paymentStatus: "Payment Required",
        nextDue: "2026-10-15",
        updated: "4 hours ago",
        notes: "Full payment order awaiting payment receipt. Customer portal: Commercial Unit B."
      },
      {
        id: "APP-4072",
        hsId: "HS-55201",
        customer: "Juan Dela Cruz",
        customerId: null,
        contactEmail: "juan.delacruz@hellosolar.ph",
        contactPhone: "+63 917 555 0199",
        location: "Santa Rosa, Laguna",
        system: "8.2 kW",
        panels: "Pending Assessment",
        inverter: "Pending Assessment",
        paymentType: "Installment",
        paymentPreference: "Installment",
        stage: "Approved",
        financer: "SolarTech Financer",
        financerId: "FIN-005",
        installer: "SolarTech Installer",
        assignedInstallerId: "INS-006",
        installerType: "Partner Installer",
        dispatchStatus: "Accepted",
        installationStatus: "COMPLETED",
        systemStatus: "ACTIVE",
        applicationStatus: "ACTIVE",
        progress: 100,
        amount: 783000,
        monthly: 12800,
        docs: "4/4",
        paymentStatus: "On Time",
        nextDue: "2026-10-25",
        updated: "1 week ago",
        notes: "Existing commissioned system not yet linked to a portal account (link by HS ID + owner contact)."
      },
      {
        id: "APP-3012",
        hsId: "HS-72301",
        customer: "Maria Santos",
        customerId: "CUS-1011",
        contactEmail: "maria.santos@gmail.com",
        contactPhone: "+63 918 765 4321",
        location: "Quezon City",
        system: "6.8 kW",
        panels: "Pending Assessment",
        inverter: "Pending Assessment",
        paymentType: "Installment",
        paymentPreference: "Installment",
        stage: "Approved",
        financer: "SolarTech Financer",
        financerId: "FIN-005",
        installer: "SolarTech Installer",
        assignedInstallerId: "INS-006",
        installerType: "Partner Installer",
        dispatchStatus: "Accepted",
        installationStatus: "COMPLETED",
        systemStatus: "ACTIVE",
        applicationStatus: "ACTIVE",
        progress: 100,
        amount: 687000,
        monthly: 11250,
        docs: "4/4",
        paymentStatus: "On Time",
        nextDue: "2026-10-05",
        updated: "1 week ago",
        notes: "Commissioned residential system. Customer portal: Quezon Residence."
      },
      {
        id: "APP-1103",
        hsId: "HS-21103",
        customer: "Carlos Villanueva",
        customerId: null,
        location: "Taguig City",
        system: "6.4 kWp",
        panels: "Pending Assessment",
        inverter: "Pending Assessment",
        paymentType: "Installment",
        paymentPreference: "Installment",
        stage: "Financing Review",
        financer: "SolarTech Financer",
        financerId: "FIN-005",
        installer: "Unassigned",
        installerType: "Partner Installer",
        amount: 340000,
        monthly: 10750,
        docs: "3/4",
        paymentStatus: "Financing Review",
        nextDue: "N/A",
        updated: "1 week ago",
        notes: "Financer portal application book (SolarTech Financer)."
      },
      {
        id: "APP-1104",
        hsId: "HS-21104",
        customer: "Ricardo Gomez",
        customerId: null,
        location: "Makati City",
        system: "5.4 kWp",
        panels: "Pending Assessment",
        inverter: "Pending Assessment",
        paymentType: "Installment",
        paymentPreference: "Installment",
        stage: "Missing Documents",
        financer: "SolarTech Financer",
        financerId: "FIN-005",
        installer: "Unassigned",
        installerType: "Partner Installer",
        amount: 285000,
        monthly: 8997,
        docs: "3/4",
        paymentStatus: "Financing Review",
        nextDue: "N/A",
        updated: "1 week ago",
        notes: "Financer portal application book (SolarTech Financer)."
      },
      {
        id: "APP-1105",
        hsId: "HS-21105",
        customer: "Maria Elena Cruz",
        customerId: "CUS-1001",
        location: "Quezon City",
        system: "8.2 kWp",
        panels: "Pending Assessment",
        inverter: "Pending Assessment",
        paymentType: "Installment",
        paymentPreference: "Installment",
        stage: "Under Review",
        financer: "SolarTech Financer",
        financerId: "FIN-005",
        installer: "Unassigned",
        installerType: "Partner Installer",
        amount: 420000,
        monthly: 12850,
        docs: "4/4",
        paymentStatus: "Financing Review",
        nextDue: "N/A",
        updated: "1 week ago",
        notes: "Financer portal application book (SolarTech Financer)."
      },
      {
        id: "APP-1106",
        hsId: "HS-21106",
        customer: "Jonathan Dela Cruz",
        customerId: null,
        location: "Pasig City",
        system: "3.6 kWp",
        panels: "Pending Assessment",
        inverter: "Pending Assessment",
        paymentType: "Installment",
        paymentPreference: "Installment",
        stage: "Missing Documents",
        financer: "SolarTech Financer",
        financerId: "FIN-005",
        installer: "Unassigned",
        installerType: "Partner Installer",
        amount: 195000,
        monthly: 6120,
        docs: "3/4",
        paymentStatus: "Financing Review",
        nextDue: "N/A",
        updated: "1 week ago",
        notes: "Financer portal application book (SolarTech Financer)."
      },
      {
        id: "APP-1107",
        hsId: "HS-21107",
        customer: "David Tan",
        customerId: null,
        location: "Cebu City",
        system: "12.0 kWp",
        panels: "Pending Assessment",
        inverter: "Pending Assessment",
        paymentType: "Installment",
        paymentPreference: "Installment",
        stage: "Approved",
        financer: "SolarTech Financer",
        financerId: "FIN-005",
        installer: "Unassigned",
        installerType: "Partner Installer",
        amount: 780000,
        monthly: 15920,
        docs: "4/4",
        paymentStatus: "On Time",
        nextDue: "N/A",
        updated: "1 week ago",
        notes: "Financer portal application book (SolarTech Financer)."
      },
      {
        id: "APP-1108",
        hsId: "HS-21108",
        customer: "Rosanna Valenzuela",
        customerId: null,
        location: "Taguig City",
        system: "6.8 kWp",
        panels: "Pending Assessment",
        inverter: "Pending Assessment",
        paymentType: "Installment",
        paymentPreference: "Installment",
        stage: "Under Review",
        financer: "SolarTech Financer",
        financerId: "FIN-005",
        installer: "Unassigned",
        installerType: "Partner Installer",
        amount: 350000,
        monthly: 11020,
        docs: "4/4",
        paymentStatus: "Financing Review",
        nextDue: "N/A",
        updated: "1 week ago",
        notes: "Financer portal application book (SolarTech Financer)."
      },
      {
        id: "APP-1109",
        hsId: "HS-21109",
        customer: "Patricia Santos",
        customerId: null,
        location: "Davao City",
        system: "6.0 kWp",
        panels: "Pending Assessment",
        inverter: "Pending Assessment",
        paymentType: "Installment",
        paymentPreference: "Installment",
        stage: "Approved",
        financer: "SolarTech Financer",
        financerId: "FIN-005",
        installer: "Unassigned",
        installerType: "Partner Installer",
        amount: 315000,
        monthly: 9890,
        docs: "4/4",
        paymentStatus: "On Time",
        nextDue: "N/A",
        updated: "1 week ago",
        notes: "Financer portal application book (SolarTech Financer)."
      },
      {
        id: "APP-1110",
        hsId: "HS-21110",
        customer: "Antonio Reyes",
        customerId: null,
        location: "Cavite",
        system: "4.8 kWp",
        panels: "Pending Assessment",
        inverter: "Pending Assessment",
        paymentType: "Installment",
        paymentPreference: "Installment",
        stage: "Declined",
        financer: "SolarTech Financer",
        financerId: "FIN-005",
        installer: "Unassigned",
        installerType: "Partner Installer",
        amount: 240000,
        monthly: 7540,
        docs: "3/4",
        paymentStatus: "Declined",
        nextDue: "N/A",
        updated: "1 week ago",
        notes: "Financer portal application book (SolarTech Financer)."
      },
      {
        id: "APP-1111",
        hsId: "HS-21111",
        customer: "Benjamin Alcantara",
        customerId: null,
        location: "Iloilo City",
        system: "4.8 kWp",
        panels: "Pending Assessment",
        inverter: "Pending Assessment",
        paymentType: "Installment",
        paymentPreference: "Installment",
        stage: "Approved",
        financer: "SolarTech Financer",
        financerId: "FIN-005",
        installer: "Unassigned",
        installerType: "Partner Installer",
        amount: 260000,
        monthly: 8160,
        docs: "4/4",
        paymentStatus: "On Time",
        nextDue: "N/A",
        updated: "1 week ago",
        notes: "Financer portal application book (SolarTech Financer)."
      },
      {
        id: "APP-1112",
        hsId: "HS-21112",
        customer: "Corazon Aquino-Lim",
        customerId: null,
        location: "Mandaluyong City",
        system: "7.2 kWp",
        panels: "Pending Assessment",
        inverter: "Pending Assessment",
        paymentType: "Installment",
        paymentPreference: "Installment",
        stage: "Approved",
        financer: "SolarTech Financer",
        financerId: "FIN-005",
        installer: "Unassigned",
        installerType: "Partner Installer",
        amount: 490000,
        monthly: 11980,
        docs: "4/4",
        paymentStatus: "On Time",
        nextDue: "N/A",
        updated: "1 week ago",
        notes: "Financer portal application book (SolarTech Financer)."
      },
      {
        id: "APP-1113",
        hsId: "HS-21113",
        customer: "Ferdinand Mendoza",
        customerId: null,
        location: "Bulacan",
        system: "5.4 kWp",
        panels: "Pending Assessment",
        inverter: "Pending Assessment",
        paymentType: "Installment",
        paymentPreference: "Installment",
        stage: "Declined",
        financer: "SolarTech Financer",
        financerId: "FIN-005",
        installer: "Unassigned",
        installerType: "Partner Installer",
        amount: 380000,
        monthly: 11920,
        docs: "4/4",
        paymentStatus: "Declined",
        nextDue: "N/A",
        updated: "1 week ago",
        notes: "Financer portal application book (SolarTech Financer)."
      },
      {
        id: "APP-1114",
        hsId: "HS-21114",
        customer: "Lourdes Villamor",
        customerId: null,
        location: "Batangas",
        system: "5.0 kWp",
        panels: "Pending Assessment",
        inverter: "Pending Assessment",
        paymentType: "Installment",
        paymentPreference: "Installment",
        stage: "Declined",
        financer: "SolarTech Financer",
        financerId: "FIN-005",
        installer: "Unassigned",
        installerType: "Partner Installer",
        amount: 310000,
        monthly: 9750,
        docs: "3/4",
        paymentStatus: "Declined",
        nextDue: "N/A",
        updated: "1 week ago",
        notes: "Financer portal application book (SolarTech Financer)."
      },
      {
        id: "APP-1115",
        hsId: "HS-21115",
        customer: "Manuel Pangilinan Jr.",
        customerId: null,
        location: "Pampanga",
        system: "15.0 kWp",
        panels: "Pending Assessment",
        inverter: "Pending Assessment",
        paymentType: "Installment",
        paymentPreference: "Installment",
        stage: "Approved",
        financer: "SolarTech Financer",
        financerId: "FIN-005",
        installer: "Unassigned",
        installerType: "Partner Installer",
        amount: 920000,
        monthly: 18780,
        docs: "4/4",
        paymentStatus: "On Time",
        nextDue: "N/A",
        updated: "1 week ago",
        notes: "Financer portal application book (SolarTech Financer)."
      },
      {
        id: "APP-1116",
        hsId: "HS-21116",
        customer: "Gregorio Santos",
        customerId: null,
        location: "Rizal",
        system: "3.8 kWp",
        panels: "Pending Assessment",
        inverter: "Pending Assessment",
        paymentType: "Installment",
        paymentPreference: "Installment",
        stage: "Declined",
        financer: "SolarTech Financer",
        financerId: "FIN-005",
        installer: "Unassigned",
        installerType: "Partner Installer",
        amount: 215000,
        monthly: 6750,
        docs: "3/4",
        paymentStatus: "Declined",
        nextDue: "N/A",
        updated: "1 week ago",
        notes: "Financer portal application book (SolarTech Financer)."
      }
    ],

    installations: [
      {
        id: "JOB-301",
        appId: "APP-1062",
        customer: "Atty. Fernando Mendoza",
        location: "Quezon City",
        system: "7 kW",
        installer: "Hello Solar Internal Team",
        installerType: "Hello Solar Direct",
        status: "In Progress",
        schedule: "Tomorrow, 8:30 AM",
        leadTech: "Engr. Limuel Brasona",
        notes: "Racking & DC trunking 80% completed. Battery bank installation scheduled."
      },
      {
        id: "JOB-302",
        appId: "APP-1048",
        customer: "Ricardo Gomez",
        location: "Mandaue City",
        system: "8 kW",
        installer: "SolarTech Visayas Solutions",
        installerType: "Partner Installer",
        status: "Scheduled",
        schedule: "Oct 2, 2026",
        leadTech: "Dante Alcantara",
        notes: "Materials staged at customer premises. Roof structural clearance confirmed."
      },
      {
        id: "JOB-303",
        appId: "APP-1070",
        customer: "Roberto Santos",
        location: "Cebu City",
        system: "12 kW",
        installer: "Hello Solar Internal Team",
        installerType: "Hello Solar Direct",
        status: "Completed",
        schedule: "Sep 14, 2026",
        completedDate: "Sep 14, 2026",
        leadTech: "Engr. Limuel Brasona",
        notes: "Fully commissioned and certified. Utility bi-directional meter energized."
      },
      {
        id: "JOB-304",
        appId: "APP-1056",
        customer: "Pacific Horizon Logistics",
        location: "Talisay City",
        system: "18 kW",
        installer: "GreenVolt Solutions Corp.",
        installerType: "Partner Installer",
        status: "Delayed",
        schedule: "Sep 22, 2026",
        leadTech: "Gilbert Soriano",
        delayReason: "Permit Approval",
        notes: "Delayed due to pending distribution utility shutdown permit."
      },
      {
        id: "JOB-305",
        appId: "APP-1058",
        customer: "Clara Mendoza",
        location: "Cebu City",
        system: "8.5 kW",
        installer: "Hello Solar Internal Team",
        installerType: "Hello Solar Direct",
        status: "Ready",
        schedule: "Pending Schedule",
        leadTech: "Unassigned",
        notes: "Materials staged. Ready for date & time assignment by Super Admin."
      },
      {
        id: "JOB-306",
        appId: "APP-1102",
        customer: "Northern Coast Cold Storage",
        location: "Cebu City",
        system: "30 kW",
        installer: "Hello Solar Internal Team",
        installerType: "Maintenance",
        status: "In Progress",
        schedule: "Sep 28, 2026",
        leadTech: "Engr. Limuel Brasona",
        notes: "Periodic inverter firmware upgrade and DC string balance calibration."
      }
    ],

    support: [
      {
        id: "SUP-043",
        accountType: "Customer",
        relatedId: "APP-1024",
        accountName: "Maria Elena Cruz",
        concern: "Billing cycle alignment with electric utility statement",
        priority: "Medium",
        status: "Open",
        created: "2 hours ago",
        createdAt: "2026-09-24T18:00:00",
        assignedTo: "ADMIN (Limuel)",
        notes: "Customer requesting payment date adjustment from 15th to 20th of the month.",
        resolutionNote: null,
        resolvedBy: null,
        resolvedAt: null,
        messages: [
          {
            id: "MSG-043-1",
            sender: "Maria Elena Cruz (Customer)",
            role: "Customer",
            time: "2 hours ago",
            text: "Hello, my monthly electric utility meter reading occurs every 18th of the month. Can we align my solar loan amortization due date from the 15th to the 20th to prevent cash flow mismatch?"
          }
        ],
        history: [
          {
            id: "TH-043-1",
            time: "2 hours ago",
            user: "System",
            action: "Ticket created via Customer Portal",
            type: "create"
          },
          {
            id: "TH-043-2",
            time: "1 hour ago",
            user: "ADMIN (Limuel)",
            action: "Assigned ticket to ADMIN (Limuel) and set priority to Medium",
            type: "assignment"
          }
        ]
      },
      {
        id: "SUP-044",
        accountType: "Installer",
        relatedId: "JOB-304",
        accountName: "GreenVolt Solutions Corp.",
        concern: "Delayed installation permit at Talisay distribution utility",
        priority: "High",
        status: "In Progress",
        created: "3 hours ago",
        createdAt: "2026-09-24T17:00:00",
        assignedTo: "ADMIN (Limuel)",
        notes: "Super Admin intervention requested with local utility desk engineer.",
        resolutionNote: null,
        resolvedBy: null,
        resolvedAt: null,
        messages: [
          {
            id: "MSG-044-1",
            sender: "GreenVolt Solutions Corp. (Installer)",
            role: "Installer",
            time: "3 hours ago",
            text: "We are on standby for installation JOB-304 in Talisay. The distribution utility requires an expedited engineering review endorsement from Hello Solar Super Admin. Permit approval is delaying project kickoff."
          },
          {
            id: "MSG-044-2",
            sender: "ADMIN (Limuel)",
            role: "Admin",
            time: "1 hour ago",
            text: "Received. Contacting local utility regional office engineering desk today to submit expedited project documentation and technical endorsement."
          }
        ],
        history: [
          {
            id: "TH-044-1",
            time: "3 hours ago",
            user: "GreenVolt Solutions Corp.",
            action: "Ticket filed via Installer Portal with High Priority",
            type: "create"
          },
          {
            id: "TH-044-2",
            time: "2.5 hours ago",
            user: "ADMIN (Limuel)",
            action: "Status moved to In Progress by ADMIN (Limuel)",
            type: "status"
          },
          {
            id: "TH-044-3",
            time: "1 hour ago",
            user: "ADMIN (Limuel)",
            action: "Admin sent update response to GreenVolt Solutions Corp.",
            type: "message"
          }
        ]
      },
      {
        id: "SUP-045",
        accountType: "Financer",
        relatedId: "APP-1031",
        accountName: "BDO Green Energy Financing",
        concern: "Missing latest 3 months bank statements & COE verification",
        priority: "High",
        status: "Open",
        created: "4 hours ago",
        createdAt: "2026-09-24T16:00:00",
        assignedTo: "ADMIN (Limuel)",
        notes: "Automated reminder sent to customer. Credit team waiting before final sign-off.",
        resolutionNote: null,
        resolvedBy: null,
        resolvedAt: null,
        messages: [
          {
            id: "MSG-045-1",
            sender: "BDO Green Energy Financing (Financer)",
            role: "Financer",
            time: "4 hours ago",
            text: "Credit evaluation for Andrea Lim (APP-1031) is paused. We are missing the latest 3-month electric utility statement and signed COE verification. Please instruct applicant to submit via portal."
          }
        ],
        history: [
          {
            id: "TH-045-1",
            time: "4 hours ago",
            user: "BDO Green Energy Financing",
            action: "Ticket created via Financer Portal with High Priority",
            type: "create"
          },
          {
            id: "TH-045-2",
            time: "3.5 hours ago",
            user: "ADMIN (Limuel)",
            action: "Assigned ticket to ADMIN (Limuel)",
            type: "assignment"
          }
        ]
      },
      {
        id: "SUP-046",
        accountType: "Merchant",
        relatedId: "MER-021",
        accountName: "Cebu Energy Supply Co.",
        concern: "Purchase order reconciliation for 40x Trina 550W panels batch",
        priority: "Medium",
        status: "In Progress",
        created: "Yesterday",
        createdAt: "2026-09-23T14:30:00",
        assignedTo: "ADMIN (Limuel)",
        notes: "Reconciling delivery receipt #DR-8891 against invoice clearance.",
        resolutionNote: null,
        resolvedBy: null,
        resolvedAt: null,
        messages: [
          {
            id: "MSG-046-1",
            sender: "Cebu Energy Supply Co. (Merchant)",
            role: "Merchant",
            time: "Yesterday",
            text: "Discrepancy noted on PO-9921 delivery receipt #DR-8891. Invoice total reflects 40 units while delivery receipt logged 38 units. Two damaged panels were returned for immediate replacement."
          },
          {
            id: "MSG-046-2",
            sender: "ADMIN (Limuel)",
            role: "Admin",
            time: "Yesterday at 05:20 PM",
            text: "Warehouse manager notified. Awaiting replacement dispatch receipt from supplier before invoice clearance."
          }
        ],
        history: [
          {
            id: "TH-046-1",
            time: "Yesterday",
            user: "Cebu Energy Supply Co.",
            action: "Ticket filed via Merchant Portal",
            type: "create"
          },
          {
            id: "TH-046-2",
            time: "Yesterday at 04:00 PM",
            user: "ADMIN (Limuel)",
            action: "Moved ticket to In Progress",
            type: "status"
          }
        ]
      },
      {
        id: "SUP-047",
        accountType: "Customer",
        relatedId: "APP-1062",
        accountName: "Atty. Fernando Mendoza",
        concern: "Inquiry regarding Hello Solar Direct team site arrival schedule",
        priority: "Low",
        status: "Resolved",
        created: "2 days ago",
        createdAt: "2026-09-22T10:00:00",
        assignedTo: "ADMIN (Limuel)",
        notes: "Dispatch manager confirmed arrival window of 8:30 AM tomorrow with customer.",
        resolutionNote: "Dispatch manager confirmed arrival window of 8:30 AM tomorrow with customer.",
        resolvedBy: "ADMIN (Limuel)",
        resolvedAt: "Sep 23, 2026, 04:15 PM",
        messages: [
          {
            id: "MSG-047-1",
            sender: "Atty. Fernando Mendoza (Customer)",
            role: "Customer",
            time: "2 days ago",
            text: "Good day, what time will the Hello Solar Direct installation crew arrive at our Talisay site tomorrow?"
          },
          {
            id: "MSG-047-2",
            sender: "ADMIN (Limuel)",
            role: "Admin",
            time: "Yesterday at 04:15 PM",
            text: "Good day Atty. Mendoza, our direct team lead Engr. Limuel Brasona has confirmed arrival between 8:30 AM and 9:00 AM."
          }
        ],
        history: [
          {
            id: "TH-047-1",
            time: "2 days ago",
            user: "Atty. Fernando Mendoza",
            action: "Ticket created via Customer Portal",
            type: "create"
          },
          {
            id: "TH-047-2",
            time: "Yesterday at 04:15 PM",
            user: "ADMIN (Limuel)",
            action: "Resolution note recorded: Dispatch manager confirmed arrival window of 8:30 AM tomorrow with customer.",
            type: "resolution"
          },
          {
            id: "TH-047-3",
            time: "Yesterday at 04:15 PM",
            user: "ADMIN (Limuel)",
            action: "Ticket marked as Resolved",
            type: "status"
          }
        ]
      },
      {
        id: "SUP-048",
        accountType: "Installer",
        relatedId: "JOB-305",
        accountName: "SunPower Masters Cebu",
        concern: "Net metering bi-directional meter testing appointment notice",
        priority: "Medium",
        status: "Open",
        created: "5 hours ago",
        createdAt: "2026-09-24T15:00:00",
        assignedTo: "ADMIN (Limuel)",
        notes: "Customer presence needed for utility inspector meter seal verification.",
        resolutionNote: null,
        resolvedBy: null,
        resolvedAt: null,
        messages: [
          {
            id: "MSG-048-1",
            sender: "SunPower Masters Cebu (Installer)",
            role: "Installer",
            time: "5 hours ago",
            text: "Distribution utility scheduled bi-directional meter calibration for JOB-305 on Oct 2 at 10:00 AM. Please ensure homeowner or authorized representative is on-site."
          }
        ],
        history: [
          {
            id: "TH-048-1",
            time: "5 hours ago",
            user: "SunPower Masters Cebu",
            action: "Ticket created via Installer Portal",
            type: "create"
          },
          {
            id: "TH-048-2",
            time: "4.5 hours ago",
            user: "ADMIN (Limuel)",
            action: "Assigned ticket to ADMIN (Limuel)",
            type: "assignment"
          }
        ]
      }
    ],

    activity: [
      {
        id: "ACT-801",
        timestamp: "2026-09-25T14:38:00+08:00",
        exactTime: "Sep 25, 2026 · 2:38 PM",
        role: "Financer",
        actorId: "FIN-001",
        user: "FIN-001 (SunFund)",
        action: "Approved financing credit check for APP-1024",
        record: "APP-1024",
        recordType: "Application",
        details: { stage: "Approved", creditScore: "Tier 1 Compliant", financer: "SunFund Solar Financing" }
      },
      {
        id: "ACT-802",
        timestamp: "2026-09-25T14:22:00+08:00",
        exactTime: "Sep 25, 2026 · 2:22 PM",
        role: "Installer",
        actorId: "INS-002",
        user: "INS-002 (SolarTech)",
        action: "Completed roof pre-inspection for APP-1048",
        record: "JOB-302",
        recordType: "Installation",
        details: { inspectionStatus: "Passed", structuralIntegrity: "Approved", job: "JOB-302" }
      },
      {
        id: "ACT-803",
        timestamp: "2026-09-25T14:05:00+08:00",
        exactTime: "Sep 25, 2026 · 2:05 PM",
        role: "Admin",
        actorId: "ADMIN-01",
        user: "ADMIN (Limuel)",
        action: "Accepted APP-1062 for Hello Solar Direct Installation",
        record: "APP-1062",
        recordType: "Application",
        details: { installerType: "Hello Solar Direct", assignedTeam: "Central Operations (Team Alpha)" }
      },
      {
        id: "ACT-804",
        timestamp: "2026-09-25T13:50:00+08:00",
        exactTime: "Sep 25, 2026 · 1:50 PM",
        role: "Customer",
        actorId: "CUS-1003",
        user: "CUS-1003 (Andrea Lim)",
        action: "Uploaded 2 updated salary slips for review",
        record: "APP-1031",
        recordType: "Application",
        details: { documentType: "Proof of Income", filesUploaded: 2 }
      },
      {
        id: "ACT-805",
        timestamp: "2026-09-25T12:50:00+08:00",
        exactTime: "Sep 25, 2026 · 12:50 PM",
        role: "Admin",
        actorId: "ADMIN-01",
        user: "ADMIN (Limuel)",
        action: "Updated payment status to On Time for APP-1050",
        record: "APP-1050",
        recordType: "Payment",
        details: { paymentStatus: "On Time", previousStatus: "Due Soon" }
      },
      {
        id: "ACT-806",
        timestamp: "2026-09-25T11:50:00+08:00",
        exactTime: "Sep 25, 2026 · 11:50 AM",
        role: "Installer",
        actorId: "INS-004",
        user: "INS-004 (GreenVolt)",
        action: "Flagged installation delay on JOB-304 due to utility permit",
        record: "JOB-304",
        recordType: "Installation",
        details: { delayCategory: "Permit Approval", reason: "Utility bi-directional meter calibration backlog" }
      },
      {
        id: "ACT-807",
        timestamp: "2026-09-25T10:50:00+08:00",
        exactTime: "Sep 25, 2026 · 10:50 AM",
        role: "Merchant",
        actorId: "MER-019",
        user: "MER-019 (SolarHub)",
        action: "Submitted bill of materials for APP-1050",
        record: "MER-019",
        recordType: "Merchant Account",
        details: { documentType: "Bill of Materials", lineItems: 14 }
      },
      {
        id: "ACT-808",
        timestamp: "2026-09-24T16:15:00+08:00",
        exactTime: "Sep 24, 2026 · 4:15 PM",
        role: "Financer",
        actorId: "FIN-002",
        user: "FIN-002 (BDO)",
        action: "Declined APP-1089 due to debt ratio requirements",
        record: "APP-1089",
        recordType: "Application",
        details: { decision: "Declined", reason: "Debt-to-income ratio exceeds regulatory threshold" }
      },
      {
        id: "ACT-809",
        timestamp: "2026-09-24T11:30:00+08:00",
        exactTime: "Sep 24, 2026 · 11:30 AM",
        role: "Customer",
        actorId: "CUS-1007",
        user: "CUS-1007 (Roberto Santos)",
        action: "Settled final monthly amortization for APP-1070",
        record: "APP-1070",
        recordType: "Payment",
        details: { amount: 3600, scheduleRef: "PAY-1070-FINAL", paymentStatus: "Completed" }
      },
      {
        id: "ACT-810",
        timestamp: "2026-09-23T09:45:00+08:00",
        exactTime: "Sep 23, 2026 · 9:45 AM",
        role: "Admin",
        actorId: "ADMIN-01",
        user: "ADMIN (Limuel)",
        action: "Deactivated inactive installer account INS-005",
        record: "INS-005",
        recordType: "Installer Account",
        details: { accountType: "Installer", previousStatus: "Active", newStatus: "Inactive" }
      },
      {
        id: "ACT-811",
        timestamp: "2026-09-25T10:15:00+08:00",
        exactTime: "Sep 25, 2026 · 10:15 AM",
        role: "Admin",
        actorId: "ADMIN-01",
        user: "ADMIN (Limuel)",
        action: "Assigned high-priority support ticket SUP-044 to ADMIN (Limuel)",
        record: "SUP-044",
        recordType: "Support Ticket",
        details: { priority: "High", assignedTo: "ADMIN (Limuel)", ticketId: "SUP-044" }
      },
      {
        id: "ACT-812",
        timestamp: "2026-09-24T14:40:00+08:00",
        exactTime: "Sep 24, 2026 · 2:40 PM",
        role: "Merchant",
        actorId: "MER-021",
        user: "MER-021 (SolarTech Supply Corp)",
        action: "Dispatched tier-1 inverter and photovoltaic hardware for JOB-302",
        record: "MER-021",
        recordType: "Merchant Account",
        details: { inventoryDispatched: "Growatt 5kW Hybrid Inverter", linkedJob: "JOB-302" }
      }
    ],

    inquiries: [
      {
        id: "INQ-201",
        name: "Engr. Marco Villanueva",
        email: "marco.villanueva@megawide.ph",
        phone: "+63 917 554 1290",
        location: "Cebu City",
        category: "Commercial Solar",
        package: "Custom Commercial (30 kW Grid-Tied)",
        selectedSolarModel: "Custom Commercial (30 kW Grid-Tied)",
        electricBill: "₱65,000",
        paymentPreference: "Installment",
        customerResponse: "Awaiting Response",
        inquiryStatus: "Awaiting Response",
        confirmationToken: "token_inq201_m4rc0",
        confirmationEmailSentAt: "2026-09-28T17:25:00+08:00",
        subject: "Commercial Rooftop Solar for Warehouse (30 kW)",
        message: "Good day Hello Solar team, we operate a 450 sqm distribution warehouse in Mandaue and our average monthly VECO electric bill is around ₱65,000. Would like to inquire about a 30kW solar PV installation with net metering. Does your financer network support corporate commercial loans?",
        status: "Unread",
        timestamp: "2026-09-28T17:20:00+08:00",
        submitted: "45 mins ago",
        reply: null
      },
      {
        id: "INQ-202",
        name: "Beatrice Morales",
        email: "bea.morales@gmail.com",
        phone: "+63 920 331 4455",
        location: "Lapu-Lapu City",
        category: "Residential Solar",
        package: "HS 6 LITE — 4.96kW | 6kW | 4.8kWh",
        selectedSolarModel: "HS 6 LITE — 4.96kW | 6kW | 4.8kWh",
        electricBill: "₱11,000",
        paymentPreference: "Full Payment",
        customerResponse: "Proceed",
        inquiryStatus: "Proceed",
        confirmationToken: "token_inq202_b34tr1c3",
        confirmationEmailSentAt: "2026-09-28T16:10:00+08:00",
        subject: "HS 6 Lite Residential System Inquiry",
        message: "Hi, I am interested in the HS 6 Lite package for our two-storey residence. Current electric bill is ₱11,000/month. How fast can your team schedule a site inspection in Lapu-Lapu?",
        status: "Unread",
        timestamp: "2026-09-28T16:05:00+08:00",
        submitted: "2 hours ago",
        reply: null
      },
      {
        id: "INQ-203",
        name: "Dr. Lucille Santos",
        email: "lucille.santos@chonghua.com.ph",
        phone: "+63 915 678 1234",
        location: "Mandaue City",
        category: "Battery Storage",
        package: "Battery Retrofit (5kWh LFP Storage)",
        selectedSolarModel: "Battery Retrofit (5kWh LFP Storage)",
        electricBill: "₱14,500",
        paymentPreference: "Installment",
        customerResponse: "Awaiting Response",
        inquiryStatus: "Not Sent",
        confirmationToken: "token_inq203_luc1ll3",
        confirmationEmailSentAt: null,
        subject: "Battery Storage Addition to Existing System",
        message: "We currently experience frequent power fluctuations and brownouts during typhoon season. Can we integrate a 5kWh or 10kWh lithium battery backup into our existing grid-tied solar setup?",
        status: "Unread",
        timestamp: "2026-09-28T14:40:00+08:00",
        submitted: "3.5 hours ago",
        reply: null
      },
      {
        id: "INQ-204",
        name: "Atty. Carlos Gonzaga",
        email: "c.gonzaga@gonzagalaw.com",
        phone: "+63 918 890 2211",
        location: "Quezon City",
        category: "Financing Options",
        package: "HS 10 PRO — 10kW Hybrid",
        selectedSolarModel: "HS 10 PRO — 10kW Hybrid",
        electricBill: "₱18,000",
        paymentPreference: "Installment",
        customerResponse: "Proceed",
        inquiryStatus: "Proceed",
        confirmationToken: "token_inq204_c4rl0s",
        confirmationEmailSentAt: "2026-09-27T10:20:00+08:00",
        subject: "Financing Terms & Zero Cash-Out Eligibility",
        message: "Hello, what are the documentary requirements for BDO or UnionBank financing for the 10kW hybrid system? Can business owners apply using audited ITR and corporate bank statements?",
        status: "Replied",
        timestamp: "2026-09-27T10:15:00+08:00",
        submitted: "Yesterday",
        reply: {
          repliedAt: "Sep 27, 2026 · 11:30 AM",
          repliedBy: "ADMIN (Limuel)",
          replyNote: "Emailed complete checklist for BDO Green Energy and UnionBank Solar programs. CC'd customer relations desk."
        }
      },
      {
        id: "INQ-205",
        name: "Dante Valderrama",
        email: "dante.valderrama@solarpowercebu.com",
        phone: "+63 922 711 0022",
        location: "Talisay City",
        category: "Partnership",
        package: "Installer Partner Network",
        selectedSolarModel: "Installer Partner Network",
        electricBill: "₱9,000",
        paymentPreference: "Full Payment",
        customerResponse: "Not Proceed",
        inquiryStatus: "Not Proceeding",
        confirmationToken: "token_inq205_d4nt3",
        confirmationEmailSentAt: "2026-09-27T08:50:00+08:00",
        subject: "Installer Partner Program Application",
        message: "Good day, our contracting firm has 6 certified electrical engineers and TESDA-accredited solar installers. We would like to apply to be an accredited partner installer for Hello Solar in southern Cebu.",
        status: "Replied",
        timestamp: "2026-09-27T08:45:00+08:00",
        submitted: "Yesterday",
        reply: {
          repliedAt: "Sep 27, 2026 · 4:15 PM",
          repliedBy: "ADMIN (Limuel)",
          replyNote: "Forwarded Installer Partner onboarding packet, credentials verification form, and NDA."
        }
      },
      {
        id: "INQ-206",
        name: "Ramon Teves Jr.",
        email: "rteves@tevesfarms.ph",
        phone: "+63 917 220 9988",
        location: "Carcar City, Cebu",
        category: "Agricultural Solar",
        package: "Off-Grid Agricultural Pumping",
        selectedSolarModel: "Off-Grid Agricultural Pumping",
        electricBill: "₱25,000",
        paymentPreference: "Full Payment",
        customerResponse: "Proceed",
        inquiryStatus: "Proceed",
        confirmationToken: "token_inq206_r4m0n",
        confirmationEmailSentAt: "2026-09-26T11:15:00+08:00",
        subject: "Agricultural Solar Water Pumping System",
        message: "Inquiring if Hello Solar handles off-grid solar deep well water pump installations for agricultural poultry farms. Estimated pump requirement is 5HP submersible with remote telemetry.",
        status: "Replied",
        timestamp: "2026-09-26T11:00:00+08:00",
        submitted: "2 days ago",
        reply: {
          repliedAt: "Sep 26, 2026 · 2:00 PM",
          repliedBy: "ADMIN (Limuel)",
          replyNote: "Called Mr. Teves to gather pump head and flow rate specs. Assigned direct engineering lead for site survey."
        }
      },
      {
        id: "INQ-207",
        name: "Patricia Tan-Chua",
        email: "patricia.tanchua@yahoo.com",
        phone: "+63 919 443 8812",
        location: "Cebu City",
        category: "Residential Solar",
        package: "HS 8 PLUS — 8kW Hybrid",
        selectedSolarModel: "HS 8 PLUS — 8kW Hybrid",
        electricBill: "₱15,000",
        paymentPreference: "Installment",
        customerResponse: "Awaiting Response",
        inquiryStatus: "Not Sent",
        confirmationToken: "token_inq207_p4tr1c14",
        confirmationEmailSentAt: null,
        subject: "Net Metering Approval Timeline with VECO",
        message: "We want to install the 8kW system before year-end. How long does the VECO bi-directional net metering application usually take, and does Hello Solar handle the utility liaison?",
        status: "Unread",
        timestamp: "2026-09-28T11:20:00+08:00",
        submitted: "6 hours ago",
        reply: null
      },
      {
        id: "INQ-208",
        name: "Jose Maria Alcantara",
        email: "jm.alcantara@alcantaraproperties.com",
        phone: "+63 917 889 4433",
        location: "Pasig City",
        category: "Commercial Solar",
        package: "Commercial Solar Carport (50 kW)",
        selectedSolarModel: "Commercial Solar Carport (50 kW)",
        electricBill: "₱85,000",
        paymentPreference: "Installment",
        customerResponse: "Not Proceed",
        inquiryStatus: "Not Proceeding",
        confirmationToken: "token_inq208_j0s3",
        confirmationEmailSentAt: "2026-09-25T16:15:00+08:00",
        subject: "Solar Carport Structure for Commercial Plaza",
        message: "Requesting proposal for a 50kW solar canopy carport over a 24-slot parking area in Pasig. Please connect us with your corporate engineering team.",
        status: "Replied",
        timestamp: "2026-09-25T16:00:00+08:00",
        submitted: "3 days ago",
        reply: {
          repliedAt: "Sep 26, 2026 · 9:30 AM",
          repliedBy: "ADMIN (Limuel)",
          replyNote: "Sent preliminary solar canopy design deck and scheduled introductory Zoom call."
        }
      }
    ],

    settings: {
      companyName: "Hello Solar Philippines",
      timezone: "Philippine Standard Time (GMT+8)",
      currency: "PHP (₱)",
      contactEmail: "admin@hellosolar.ph",
      directInstallTeam: "Hello Solar Central Operations (Team Alpha)",
      maxDirectProjects: 12,
      directInstallConfirmation: true,
      overdueThresholdDays: 5,
      installationDelayThresholdDays: 1,
      docReviewEscalationHours: 48,
      autoNotifyInstallers: true
    }
  };

  // Shared installment schedules for the portal demo systems (billing the Customer portal shows for these APPs).
  // rows: [dueDate, status, reference] for billed periods; later installments continue monthly to the term.
  function buildSeedSchedule(appId, monthly, termMonths, rows) {
    const addMonths = (iso, n) => {
      const [y, m, d] = iso.split("-").map(Number);
      const t = (m - 1) + n;
      const yy = y + Math.floor(t / 12), mm = (t % 12) + 1;
      const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
      return `${yy}-${String(mm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
    };
    const installments = [];
    const history = [];
    for (let no = 1; no <= termMonths; no++) {
      const row = rows[no - 1];
      const dueDate = row ? row[0] : addMonths(rows[rows.length - 1][0], no - rows.length);
      const status = row ? row[1] : "Upcoming";
      const paid = status === "Paid";
      installments.push({
        no, dueDate, amount: monthly, status,
        paidDate: paid ? dueDate : null,
        paidAmount: paid ? monthly : 0,
        reference: paid ? row[2] : null,
        notes: paid ? "Monthly installment verified." : (status === "Overdue" ? "Scheduled payment date passed without required payment." : "")
      });
      if (paid) {
        history.unshift({
          id: `PAY-${appId}-${no}`, appId, date: dueDate, amount: monthly, method: "Bank Transfer", ref: row[2],
          status: "Verified", recordedBy: "ADMIN (Limuel)", installmentNo: no, notes: "Installment receipt verified."
        });
      }
    }
    return { appId, termMonths, seeded: true, installments, history };
  }

  DEFAULT_DATA.paymentSchedules = {
    "APP-4091": buildSeedSchedule("APP-4091", 9066.67, 60, [
      ["2026-05-01", "Paid", "REC-88219-05"], ["2026-06-01", "Paid", "REC-88219-06"], ["2026-07-01", "Paid", "REC-88219-07"],
      ["2026-08-01", "Paid", "REC-88219-08"], ["2026-09-01", "Paid", "REC-88219-09"], ["2026-10-15", "Upcoming"]]),
    "APP-4088": buildSeedSchedule("APP-4088", 17450, 84, [
      ["2026-06-20", "Paid", "REC-94021-06"], ["2026-07-20", "Paid", "REC-94021-07"], ["2026-08-20", "Paid", "REC-94021-08"],
      ["2026-09-20", "Paid", "REC-94021-09"], ["2026-10-20", "Upcoming"]]),
    "APP-4085": buildSeedSchedule("APP-4085", 6200, 36, [
      ["2026-07-30", "Paid", "REC-77310-07"], ["2026-08-30", "Paid", "REC-77310-08"], ["2026-09-30", "Overdue"], ["2026-10-30", "Upcoming"]]),
    "APP-4072": buildSeedSchedule("APP-4072", 12800, 60, [
      ["2026-09-25", "Paid", "REC-55201-09"], ["2026-10-25", "Upcoming"]])
  };

  function parseActivityDate(dateInput) {
    if (!dateInput) return null;
    if (dateInput instanceof Date) {
      return isNaN(dateInput.getTime()) ? null : dateInput;
    }
    if (typeof dateInput === "string") {
      // Strip middle dots or bullets if present: "Sep 25, 2026 · 2:38 PM"
      const cleaned = dateInput.replace(/[·•]/g, " ").replace(/\s+/g, " ").trim();
      const dCleaned = new Date(cleaned);
      if (!isNaN(dCleaned.getTime())) return dCleaned;

      const dDirect = new Date(dateInput);
      if (!isNaN(dDirect.getTime())) return dDirect;
    }
    return null;
  }

  function formatExactAuditTimestamp(dateInput) {
    if (!dateInput) return "";
    const d = parseActivityDate(dateInput);
    if (!d) return String(dateInput);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const m = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${m} ${day}, ${year} · ${hours}:${minutes} ${ampm}`;
  }

  function formatRelativeAuditTime(dateInput, fromDate) {
    if (!dateInput) return null;
    const targetDate = parseActivityDate(dateInput);
    if (!targetDate) return null;

    const now = (fromDate instanceof Date && !isNaN(fromDate.getTime())) ? fromDate : new Date();
    const diffMs = now.getTime() - targetDate.getTime();

    // Clock skew / sub-minute grace period (up to 5 seconds drift)
    if (diffMs < 0 && diffMs >= -5000) {
      return "Just now";
    }
    // Future timestamp cannot be reliably represented as a past relative label
    if (diffMs < -5000) {
      return null;
    }

    const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 45) {
      return "Just now";
    }
    if (diffMinutes === 1) {
      return "1 min ago";
    }
    if (diffMinutes < 60) {
      return `${diffMinutes} mins ago`;
    }
    if (diffHours === 1) {
      return "1 hour ago";
    }
    if (diffHours < 24) {
      return `${diffHours} hours ago`;
    }
    if (diffDays === 1) {
      return "Yesterday";
    }
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    if (diffDays < 14) {
      return "1 week ago";
    }
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} weeks ago`;
    }
    if (diffDays < 60) {
      return "1 month ago";
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} months ago`;
    }
    return "Over a year ago";
  }

  // Schema v3 (shared identity model): adds seed records missing from stored data by ID and backfills
  // HS IDs / installer links on stored seed records. Never overwrites a stored value.
  // Schema v4 (shared payment schedules): the portal demo systems' billing becomes their shared APP schedule.
  // A stored schedule is replaced only when it was auto-generated and no customer receipt has been applied to it.
  // Schema v5: applications a Financer approved while approval still set stage "Approved" move to
  // "Ready for Installation" (same as a new Financer approval). Only Financer decisions are moved, and only while
  // no installation has been assigned or started.
  const SCHEMA_VERSION = 5;
  function migrateSharedIdentity(parsed) {
    const version = parsed.schemaVersion || 0;
    if (version >= SCHEMA_VERSION) return false;
    if (version < 3) migrateIdentityV3(parsed);
    if (version < 4) {
      if (!parsed.paymentSchedules || typeof parsed.paymentSchedules !== "object") parsed.paymentSchedules = {};
      Object.keys(DEFAULT_DATA.paymentSchedules || {}).forEach(appId => {
        const stored = parsed.paymentSchedules[appId];
        const touched = stored && (stored.seeded || (stored.installments || []).some(i => /Customer receipt/.test(i.notes || "")));
        if (!touched) parsed.paymentSchedules[appId] = JSON.parse(JSON.stringify(DEFAULT_DATA.paymentSchedules[appId]));
      });
    }
    (parsed.applications || []).forEach(app => {
      const financerApproved = app.financingDecision && app.financingDecision.decision === "Approved";
      const active = /^ACTIVE$/i.test(String(app.systemStatus || "")) || /^ACTIVE$/i.test(String(app.applicationStatus || ""));
      const unassigned = !app.assignedInstallerId && (!app.installer || app.installer === "Unassigned");
      if (app.stage === "Approved" && financerApproved && !active && !app.installationStatus && unassigned) {
        app.stage = "Ready for Installation";
        app.financingStatus = "APPROVED";
        app.applicationStatus = "READY_FOR_INSTALLATION";
      }
    });
    parsed.schemaVersion = SCHEMA_VERSION;
    return true;
  }

  function migrateIdentityV3(parsed) {
    ["customers", "financers", "installers", "merchants", "applications"].forEach(key => {
      if (!Array.isArray(parsed[key])) parsed[key] = [];
      const stored = new Map(parsed[key].map(r => [r.id, r]));
      DEFAULT_DATA[key].forEach(seed => {
        const rec = stored.get(seed.id);
        if (!rec) {
          parsed[key].push(JSON.parse(JSON.stringify(seed)));
          return;
        }
        if (seed.hsId && !rec.hsId) rec.hsId = seed.hsId;
        // Only link the seed installer when the stored record still names the same installer
        if (seed.assignedInstallerId && !rec.assignedInstallerId && rec.installer === seed.installer) {
          rec.assignedInstallerId = seed.assignedInstallerId;
        }
      });
    });
  }

  // Seed records for local demo mode; an empty record set (same collections, default settings) otherwise
  const SEED_DATA = DEMO_DATA ? DEFAULT_DATA : Object.keys(DEFAULT_DATA).reduce((acc, key) => {
    const v = DEFAULT_DATA[key];
    acc[key] = key === "settings" || key === "schemaVersion" ? JSON.parse(JSON.stringify(v))
      : (Array.isArray(v) ? [] : (v && typeof v === "object" ? {} : v));
    return acc;
  }, {});

  class HelloSolarStore {
    constructor() {
      this.data = this.load();
      this.syncFinancerContracts({ silent: true });
    }

    load() {
      if (IS_API) {
        // api mode: the page cache filled by GET /bootstrap — no seed data, no client migrations
        let cached = null;
        try { cached = JSON.parse(STORE.getItem(STORAGE_KEY) || "null"); } catch (err) { cached = null; }
        const empty = JSON.parse(JSON.stringify(SEED_DATA));
        return Object.assign(empty, cached && typeof cached === "object" ? cached : {});
      }
      try {
        const stored = STORE.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Simple integrity check
          if (parsed && Array.isArray(parsed.applications) && Array.isArray(parsed.customers)) {
            // Data integrity reconciliation
            const app1089 = parsed.applications.find(a => a.id === "APP-1089");
            if (app1089 && (app1089.nextDue === "N/A" || !app1089.nextDue)) {
              app1089.nextDue = "2026-09-08";
            }
            const app1031 = parsed.applications.find(a => a.id === "APP-1031");
            if (app1031 && app1031.nextDue === "2026-10-02") {
              app1031.nextDue = "2026-09-30";
            }
            if (!parsed.paymentSchedules) {
              parsed.paymentSchedules = {};
            }
            if (!Array.isArray(parsed.engineers)) {
              parsed.engineers = [];
            }
            // Financer contract fields: backfill from seed for stored data that predates contract management
            if (Array.isArray(parsed.financers)) {
              parsed.financers.forEach(f => {
                if (f.contractStartDate !== undefined) return;
                const seed = DEFAULT_DATA.financers.find(s => s.id === f.id) || {};
                f.contractTermMonths = seed.contractTermMonths ?? null;
                f.annualRate = seed.annualRate ?? null;
                f.contractStartDate = seed.contractStartDate ?? null;
                f.contractEndDate = seed.contractEndDate ?? null;
                f.contractStatusOverride = null;
              });
            }

            // Ensure activity log entries have exact timestamps and metadata
            if (Array.isArray(parsed.activity)) {
              // If stored activity is missing our new entries (SUP-044, MER-021), add them
              const hasSup044 = parsed.activity.some(a => a.record === "SUP-044");
              if (!hasSup044) {
                parsed.activity.push(
                  {
                    id: "ACT-811",
                    timestamp: "2026-09-25T10:15:00+08:00",
                    exactTime: "Sep 25, 2026 · 10:15 AM",
                    role: "Admin",
                    actorId: "ADMIN-01",
                    user: "ADMIN (Limuel)",
                    action: "Assigned high-priority support ticket SUP-044 to ADMIN (Limuel)",
                    record: "SUP-044",
                    recordType: "Support Ticket",
                    details: { priority: "High", assignedTo: "ADMIN (Limuel)", ticketId: "SUP-044" }
                  },
                  {
                    id: "ACT-812",
                    timestamp: "2026-09-24T14:40:00+08:00",
                    exactTime: "Sep 24, 2026 · 2:40 PM",
                    role: "Merchant",
                    actorId: "MER-021",
                    user: "MER-021 (SolarTech Supply Corp)",
                    action: "Dispatched tier-1 inverter and photovoltaic hardware for JOB-302",
                    record: "MER-021",
                    recordType: "Merchant Account",
                    details: { inventoryDispatched: "Growatt 5kW Hybrid Inverter", linkedJob: "JOB-302" }
                  }
                );
              }

              parsed.activity.forEach((a, idx) => {
                // Delete any stale hardcoded relative times so timestamp remains single source of truth
                delete a.time;

                if (!a.timestamp) {
                  const seedMatch = DEFAULT_DATA.activity.find(s => s.id === a.id);
                  if (seedMatch && seedMatch.timestamp) {
                    a.timestamp = seedMatch.timestamp;
                    a.exactTime = seedMatch.exactTime;
                    a.details = seedMatch.details;
                  } else {
                    const d = new Date();
                    d.setHours(d.getHours() - idx);
                    a.timestamp = d.toISOString();
                    a.exactTime = formatExactAuditTimestamp(d);
                  }
                }
                if (!a.exactTime) {
                  a.exactTime = formatExactAuditTimestamp(a.timestamp);
                }
                if (!a.recordType && a.record) {
                  if (a.record.startsWith("APP-")) a.recordType = "Application";
                  else if (a.record.startsWith("JOB-")) a.recordType = "Installation";
                  else if (a.record.startsWith("SUP-") || a.record.startsWith("TIC-")) a.recordType = "Support Ticket";
                  else if (a.record.startsWith("PAY-")) a.recordType = "Payment";
                  else if (a.record.startsWith("CUS-")) a.recordType = "Customer Account";
                  else if (a.record.startsWith("FIN-")) a.recordType = "Financer Account";
                  else if (a.record.startsWith("INS-")) a.recordType = "Installer Account";
                  else if (a.record.startsWith("MER-")) a.recordType = "Merchant Account";
                  else if (a.record === "SETTINGS") a.recordType = "System Settings";
                  else a.recordType = "Record";
                }
                if (!a.actorId) {
                  const idMatch = (a.user || "").match(/([A-Z]{3}-\d+|ADMIN(-\d+)?)/i);
                  a.actorId = idMatch ? idMatch[0] : (a.role === "Admin" ? "ADMIN-01" : a.role);
                }
                if (!a.details) {
                  a.details = {};
                }
              });
            } else {
              parsed.activity = JSON.parse(JSON.stringify(SEED_DATA.activity));
            }

            if (!Array.isArray(parsed.inquiries) || !parsed.inquiries.length) {
              parsed.inquiries = JSON.parse(JSON.stringify(SEED_DATA.inquiries || []));
            } else {
              const defaultMap = new Map((DEFAULT_DATA.inquiries || []).map(i => [i.id, i]));
              parsed.inquiries.forEach(inq => {
                const def = defaultMap.get(inq.id) || {};
                if (!inq.selectedSolarModel) inq.selectedSolarModel = def.selectedSolarModel || inq.package || "Custom Solar Package";
                if (!inq.electricBill) {
                  const billMatch = inq.message && inq.message.match(/₱[\d,]+/);
                  inq.electricBill = def.electricBill || (billMatch ? billMatch[0] : (inq.monthlyBill || "₱12,000"));
                }
                if (!inq.paymentPreference) {
                  inq.paymentPreference = def.paymentPreference || (/loan|financ|terms|zero/i.test(inq.message || "") ? "Installment" : "Full Payment");
                }
                if (!inq.customerResponse) {
                  inq.customerResponse = def.customerResponse || (inq.status === "Unread" ? "Awaiting Response" : "Proceed");
                }
                if (!inq.inquiryStatus) {
                  if (inq.customerResponse === "Proceed") inq.inquiryStatus = "Proceed";
                  else if (inq.customerResponse === "Not Proceed" || inq.customerResponse === "Not Proceeding") inq.inquiryStatus = "Not Proceeding";
                  else if (def.inquiryStatus) inq.inquiryStatus = def.inquiryStatus;
                  else if (inq.confirmationEmailSentAt) inq.inquiryStatus = "Awaiting Response";
                  else inq.inquiryStatus = "Not Sent";
                }
                if (inq.confirmationEmailSentAt === undefined) {
                  inq.confirmationEmailSentAt = def.confirmationEmailSentAt || null;
                }
              });
            }

            if (Array.isArray(parsed.customers)) {
              parsed.customers.forEach(c => {
                if (!c.invitationStatus) {
                  c.invitationStatus = c.status === "Active" ? "Active" : "Pending Activation";
                }
              });
            }

            if (DEMO_DATA && migrateSharedIdentity(parsed)) {
              try { STORE.setItem(STORAGE_KEY, JSON.stringify(parsed)); } catch (err) { /* persisted on next save */ }
            }
            return parsed;
          }
        }
      } catch (err) {
        console.warn("Could not load from localStorage, using seed data:", err);
      }
      return JSON.parse(JSON.stringify(SEED_DATA));
    }

    save() {
      try {
        STORE.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (err) {
        console.warn("Could not save to localStorage:", err);
      }
    }

    // Platform settings (Super Admin → Settings)
    updateSettings(settings) {
      this.data.settings = Object.assign({}, settings || {});
      this.save();
      return { success: true, settings: this.data.settings };
    }

    reset() {
      if (IS_API) return; // demo reset is a local-mode tool only
      this.data = JSON.parse(JSON.stringify(SEED_DATA));
      this.save();
    }

    // --- ACTIVITY LOG HELPER ---
    logActivity(role, user, action, record, options = {}) {
      const now = new Date();

      let actorId = options.actorId;
      if (!actorId) {
        const idMatch = (user || "").match(/([A-Z]{3}-\d+|ADMIN(-\d+)?)/i);
        actorId = idMatch ? idMatch[0] : (role === "Admin" ? "ADMIN-01" : role);
      }

      let recordType = options.recordType;
      if (!recordType && record) {
        if (record.startsWith("APP-")) recordType = "Application";
        else if (record.startsWith("JOB-")) recordType = "Installation";
        else if (record.startsWith("SUP-") || record.startsWith("TIC-")) recordType = "Support Ticket";
        else if (record.startsWith("PAY-")) recordType = "Payment";
        else if (record.startsWith("CUS-")) recordType = "Customer Account";
        else if (record.startsWith("FIN-")) recordType = "Financer Account";
        else if (record.startsWith("INS-")) recordType = "Installer Account";
        else if (record.startsWith("ENG-")) recordType = "Engineer Account";
        else if (record.startsWith("MER-")) recordType = "Merchant Account";
        else if (record === "SETTINGS") recordType = "System Settings";
        else recordType = "Record";
      }

      const isoTimestamp = options.timestamp || now.toISOString();
      const exactTime = options.exactTime || formatExactAuditTimestamp(now);

      const nextNum = Math.floor(813 + Math.random() * 900);
      const entry = {
        id: options.id || `ACT-${nextNum}`,
        timestamp: isoTimestamp,
        exactTime: exactTime,
        actorId: actorId,
        role: role,
        user: user,
        action: action,
        record: record,
        recordId: record,
        recordType: recordType || "Record",
        details: options.details || {}
      };
      this.data.activity.unshift(entry);
      if (!options.deferSave) this.save();
      return entry;
    }

    // --- HELLO SOLAR DIRECT INSTALLATION WORKFLOW ---
    acceptDirectInstallation(appId) {
      const app = this.data.applications.find(a => a.id === appId);
      if (!app) return { success: false, message: "Application not found" };

      // Enforce configured Maximum Concurrent Direct Projects limit
      const limit = Number(this.data.settings?.maxDirectProjects) || 12;
      const designatedTeam = this.data.settings?.directInstallTeam || "Hello Solar Central Operations (Team Alpha)";

      // Count currently active Direct projects
      const activeDirectCount = this.data.installations.filter(j => 
        (j.installerType === "Hello Solar Direct" || j.installer === designatedTeam || j.installer === "Hello Solar Internal Team") &&
        !["Completed", "Cancelled"].includes(j.status)
      ).length;

      if (activeDirectCount >= limit) {
        return {
          success: false,
          capacityReached: true,
          currentActive: activeDirectCount,
          limit: limit,
          message: `Direct installation capacity reached (${activeDirectCount}/${limit} active projects). Complete existing direct projects before accepting more.`
        };
      }

      // Update Application (internal team — never offered to partner installers)
      app.installerType = "Hello Solar Direct";
      app.installer = designatedTeam;
      app.assignedInstallerId = "INS-001";
      app.stage = "Ready for Installation";
      app.updated = "Just now";
      app.notes = (app.notes ? app.notes + " • " : "") + `Accepted for Hello Solar Direct Installation by Super Admin (${designatedTeam}).`;

      // Ensure corresponding installation exists or update it
      let install = this.data.installations.find(j => j.appId === appId);
      if (install) {
        install.installer = designatedTeam;
        install.installerType = "Hello Solar Direct";
        install.leadTech = "Unassigned";
        install.status = "Ready";
        install.schedule = "Pending Schedule";
        install.notes = `Reassigned to ${designatedTeam} for Direct Installation.`;
      } else {
        const nextJobNum = 308 + this.data.installations.length;
        install = {
          id: `JOB-${nextJobNum}`,
          appId: app.id,
          customer: app.customer,
          location: app.location,
          system: app.system,
          installer: designatedTeam,
          installerType: "Hello Solar Direct",
          status: "Ready",
          schedule: "Pending Schedule",
          leadTech: "Unassigned",
          notes: `Scheduled via Hello Solar Direct acceptance. Designated unit: ${designatedTeam}.`
        };
        this.data.installations.unshift(install);
      }

      // Synchronize all installer activeJobs counts
      this.data.installers.forEach(inst => {
        inst.activeJobs = this.data.installations.filter(j => 
          (j.installer === inst.name || (inst.id === "INS-001" && (j.installerType === "Hello Solar Direct" || j.installer === designatedTeam))) &&
          !["Completed", "Cancelled"].includes(j.status)
        ).length;
      });

      // Log in audit log
      this.logActivity("Admin", "ADMIN (Limuel)", `ADMIN accepted ${appId} for Hello Solar Direct Installation`, appId, {
        actorId: "ADMIN-01",
        recordType: "Application",
        details: { installer: designatedTeam, installerType: "Hello Solar Direct", targetJob: install.id, activeCapacity: `${activeDirectCount + 1}/${limit}` }
      });

      this.save();
      return { success: true, app, install };
    }

    // --- APPLICATION WORKFLOWS ---
    updateApplicationStage(appId, newStage, options = {}) {
      const app = this.data.applications.find(a => a.id === appId);
      if (!app) return false;
      const prevStage = app.stage;
      app.stage = newStage;
      app.updated = "Just now";

      let actorRole = options.role || "Admin";
      let actorUser = options.user || "ADMIN (Limuel)";
      let actorId = options.actorId || "ADMIN-01";
      let actionText = `ADMIN updated stage for ${appId} from "${prevStage}" to "${newStage}"`;

      if (newStage === "Approved") {
        actorRole = "Financer";
        actorUser = app.financer || "FIN-001 (SunFund)";
        actorId = app.financerId || (app.financer.includes("SunFund") ? "FIN-001" : "FIN-002");
        actionText = `Financing credit check approved for ${appId} (${app.customer}) · ₱${app.amount?.toLocaleString() || app.amount}`;
      } else if (newStage === "Declined") {
        actorRole = "Financer";
        actorUser = app.financer || "FIN-002 (BDO)";
        actorId = app.financerId || "FIN-002";
        actionText = `Financing declined for ${appId} (${app.customer}) · Stage set to Declined`;
      }

      this.logActivity(actorRole, actorUser, actionText, appId, {
        actorId,
        recordType: "Application",
        details: { prevStage, newStage, customer: app.customer, ...options.details }
      });
      this.save();
      return true;
    }

    // --- PARTNER INSTALLER ASSIGNMENT WORKFLOW ---
    // Only Active partner installer accounts can be assigned. Hello Solar Direct / internal team accounts and
    // Direct Installation Engineers (data.engineers) are never partner installers.
    isAssignablePartnerInstaller(inst) {
      if (!inst || inst.status !== "Active") return false;
      if (String(inst.type || "").toLowerCase() !== "partner") return false;
      const direct = this.data.settings?.directInstallTeam || "Hello Solar Internal Team";
      return inst.id !== "INS-001" && inst.name !== direct && !/hello solar (direct|internal)/i.test(inst.name || "");
    }

    getAssignablePartnerInstallers() {
      return (this.data.installers || []).filter(i => this.isAssignablePartnerInstaller(i));
    }

    // installerRef: installer account ID (INS-###); an exact account name is accepted for older callers
    assignPartnerInstaller(appId, installerRef, schedule = "Within 5 business days") {
      this.data = this.load();
      const app = this.data.applications.find(a => a.id === appId);
      if (!app) return { success: false, message: "Application not found", error: "Application not found" };

      // Link by installer account ID so only that partner installer sees the job
      const partner = (this.data.installers || []).find(i => i.id === installerRef)
        || (this.data.installers || []).find(i => i.name === installerRef);
      if (!partner) return { success: false, message: "Installer not found", error: "Installer account not found." };
      if (!this.isAssignablePartnerInstaller(partner)) {
        const error = `${partner.name} (${partner.id}) is not an active partner installer and cannot be assigned.`;
        return { success: false, message: error, error };
      }
      const installerName = partner.name;
      app.installer = installerName;
      app.assignedInstallerId = partner.id;
      // An explicit assignment re-offers the job to an installer that declined it earlier
      if (Array.isArray(app.declinedInstallerIds)) app.declinedInstallerIds = app.declinedInstallerIds.filter(id => id !== partner.id);
      app.installerType = "Partner Installer";
      app.dispatchStatus = "Assigned";
      // The assigned partner installer must Accept or Decline in the Installer portal before starting
      if (!["INSTALLATION_IN_PROGRESS", "COMPLETED"].includes(String(app.installationStatus || "").toUpperCase())) {
        app.installerAcceptance = "Pending";
        app.installationStatus = null;
        delete app.acceptedAt;
      }
      app.stage = "Ready for Installation";
      app.updated = "Just now";
      app.notes = (app.notes ? app.notes + " • " : "") + `Assigned to partner installer ${installerName}.`;

      let install = this.data.installations.find(j => j.appId === appId);
      if (install) {
        install.installer = installerName;
        install.installerId = partner.id;
        install.installerType = "Partner Installer";
        install.leadTech = "Partner Lead Technician";
        install.schedule = schedule;
        if (install.status === "Delayed" || install.status === "Scheduled") {
          install.status = "Scheduled";
        }
        install.notes = `Assigned to ${installerName}.`;
      } else {
        const nextJobNum = 308 + this.data.installations.length;
        install = {
          id: `JOB-${nextJobNum}`,
          appId: app.id,
          customer: app.customer,
          location: app.location,
          system: app.system,
          installer: installerName,
          installerId: partner.id,
          installerType: "Partner Installer",
          status: "Scheduled",
          schedule: schedule,
          leadTech: "Partner Lead Technician",
          notes: `Assigned to partner installer ${installerName} by Super Admin.`
        };
        this.data.installations.unshift(install);
      }

      // Synchronize all installer activeJobs counts
      this.data.installers.forEach(inst => {
        inst.activeJobs = this.data.installations.filter(j => 
          (j.installerId === inst.id || j.installer === inst.name || (inst.id === "INS-001" && j.installerType === "Hello Solar Direct")) &&
          !["Completed", "Cancelled"].includes(j.status)
        ).length;
      });

      this.logActivity("Admin", "ADMIN (Limuel)", `ADMIN assigned partner installer "${installerName}" (${partner.id}) to ${appId}`, appId, {
        actorId: "ADMIN-01",
        recordType: "Application",
        details: { installer: installerName, assignedInstallerId: partner.id, installerType: "Partner Installer", schedule }
      });
      this.save();
      if (typeof window !== "undefined" && window.HSShared) {
        window.HSShared.notify({
          recipientRole: "installer", recipientId: partner.id, eventType: "job_assigned", recordId: appId,
          title: "New Installation Job", message: `${appId} (${app.customer}) was assigned to you · ${schedule}.`,
          targetUrl: `myjob.html?job=${appId}`, actionLabel: "View Job"
        });
      }
      return { success: true, app, install, installer: partner };
    }

    // --- APPLICATION DOCUMENT HELPERS ---
    // Customer uploads (Customer portal) live in a shared store keyed by APP ID — files stay out of this store
    readSharedDocuments(appId) {
      try {
        const store = JSON.parse(STORE.getItem(SHARED_DOCUMENTS_KEY) || "{}") || {};
        return store[appId] && Array.isArray(store[appId].documents) ? store[appId] : null;
      } catch (e) { return null; }
    }

    getAppDocuments(appId) {
      const app = this.data.applications.find(a => a.id === appId);
      if (!app) return [];

      // Installment applications: the shared APP document record (same record as Customer and Financer portals)
      const S = typeof window !== "undefined" ? window.HSShared : null;
      const shared = S && !this.isFullPaymentApp(app) ? S.documentRecordFor(appId) : this.readSharedDocuments(appId);
      if (!shared && app.documents && Array.isArray(app.documents)) return app.documents;
      if (shared) {
        const LABEL = { NOT_SUBMITTED: "Missing", SUBMITTED: "Submitted", UNDER_REVIEW: "Submitted", ACCEPTED: "Verified", REUPLOAD_REQUIRED: "Rejected" };
        return shared.documents
          .filter(d => !(d.optional && String(d.status).toUpperCase() === "NOT_SUBMITTED"))
          .map(d => ({
            name: d.name,
            status: LABEL[String(d.status).toUpperCase()] || "Missing",
            date: d.uploadedAt ? String(d.uploadedAt).slice(0, 10) : null,
            file: d.fileName || null
          }));
      }

      // No uploads on record: show the required checklist from the recorded count only (no invented files/dates)
      const names = [
        "Government-Issued Photo ID",
        "Latest 3-Month Electric Utility Statement",
        "Proof of Income / Certificate of Employment",
        "Roof & Property Ownership Authorization",
        "Pre-Installation Solar Site Assessment"
      ];
      const match = String(app.docs || "").match(/^(\d+)\s*\/\s*(\d+)$/);
      const verified = match ? Math.min(parseInt(match[1], 10), names.length) : 0;
      return names.map((name, i) => ({ name, status: i < verified ? "Verified" : "Missing", date: null, file: null }));
    }

    // Document counts from the same list getAppDocuments returns (the shared APP record for installment
    // applications), never from the stored app.docs string. submitted = Submitted + Verified.
    getAppDocumentCounts(appId) {
      const docs = this.getAppDocuments(appId);
      const submitted = docs.filter(d => d.status === "Verified" || d.status === "Submitted").length;
      const verified = docs.filter(d => d.status === "Verified").length;
      const missing = docs.filter(d => d.status === "Missing" || d.status === "Rejected");
      return { total: docs.length, submitted, verified, missing, label: `${submitted}/${docs.length}` };
    }

    updateDocumentStatus(appId, docName, newStatus) {
      const app = this.data.applications.find(a => a.id === appId);
      if (!app) return false;
      // Installment applications: the verdict is written only to the shared APP document record
      const S = typeof window !== "undefined" ? window.HSShared : null;
      if (S && !this.isFullPaymentApp(app)) {
        const STATUS = { Verified: "ACCEPTED", Rejected: "REUPLOAD_REQUIRED", Missing: "NOT_SUBMITTED", Submitted: "SUBMITTED" };
        const before = (S.documentRecordFor(appId)?.documents || []).find(d => d.name === docName);
        if (!before || !STATUS[newStatus]) return false;
        S.setDocumentStatus(appId, before.id, STATUS[newStatus]);
        const sum = S.documentSummary(S.documentsFor(appId));
        app.docs = `${sum.accepted}/${sum.required}`;
        delete app.documents;
        this.logActivity("Admin", "ADMIN (Limuel)", `ADMIN updated document "${docName}" to ${newStatus} for ${appId}`, appId, {
          actorId: "ADMIN-01",
          recordType: "Application",
          details: { docName, prevStatus: before.status, newStatus, verifiedDocs: app.docs }
        });
        this.save();
        return true;
      }
      if (!app.documents) {
        app.documents = this.getAppDocuments(appId);
      }
      const doc = app.documents.find(d => d.name === docName);
      if (doc) {
        const prevStatus = doc.status;
        doc.status = newStatus;
        if (newStatus === "Verified" || newStatus === "Submitted") {
          doc.date = new Date().toISOString().slice(0, 10);
        }
        this.writeSharedDocumentStatus(appId, docName, newStatus);
        const activeCount = app.documents.filter(d => d.status === "Verified" || d.status === "Submitted").length;
        app.docs = `${activeCount}/5`;
        this.logActivity("Admin", "ADMIN (Limuel)", `ADMIN updated document "${docName}" to ${newStatus} for ${appId}`, appId, {
          actorId: "ADMIN-01",
          recordType: "Application",
          details: { docName, prevStatus, newStatus, verifiedDocs: app.docs }
        });
        this.save();
        return true;
      }
      return false;
    }

    // Mirrors an admin verdict onto the customer's uploaded document so the Customer portal shows it
    writeSharedDocumentStatus(appId, docName, newStatus) {
      const STATUS = { Verified: "ACCEPTED", Rejected: "REUPLOAD_REQUIRED", Missing: "NOT_SUBMITTED", Submitted: "SUBMITTED" };
      try {
        const store = JSON.parse(STORE.getItem(SHARED_DOCUMENTS_KEY) || "{}") || {};
        const rec = store[appId];
        const doc = rec && Array.isArray(rec.documents) ? rec.documents.find(x => x.name === docName) : null;
        if (!doc || !STATUS[newStatus]) return;
        doc.status = STATUS[newStatus];
        doc.submitted = doc.status !== "NOT_SUBMITTED" && doc.status !== "REUPLOAD_REQUIRED";
        doc.reviewedAt = new Date().toISOString();
        rec.updatedAt = doc.reviewedAt;
        STORE.setItem(SHARED_DOCUMENTS_KEY, JSON.stringify(store));
      } catch (e) { /* shared documents are optional */ }
    }

    // --- APPLICATION SPECIFIC ACTIVITY TIMELINE ---
    getAppActivity(appId) {
      const app = this.data.applications.find(a => a.id === appId);
      if (!app) return [];

      const install = this.data.installations.find(j => j.appId === appId);
      const rawActivity = this.data.activity.filter(a => 
        a.record === appId || 
        (install && a.record === install.id) ||
        (a.action && a.action.includes(appId))
      );

      const list = [...rawActivity];
      if (list.length < 2) {
        list.push({
          id: `ACT-HIST-1`,
          time: app.updated || "Recent",
          role: "Financer",
          user: `${app.financer}`,
          action: `Financing status logged as: ${app.stage}`,
          record: appId
        });
        list.push({
          id: `ACT-HIST-2`,
          time: "Initial Intake",
          role: "Customer",
          user: `${app.customer} (${app.customerId})`,
          action: `Application submitted for ${app.system} solar system at ${app.location}`,
          record: appId
        });
      }

      return list;
    }

    // --- INSTALLATION WORKFLOWS ---
    getSchedulableProjects() {
      // Must only show existing projects with Status = Ready and Schedule = Pending Schedule
      return this.data.installations.filter(job => 
        job.status === "Ready" && job.schedule === "Pending Schedule"
      ).map(job => ({
        id: job.id,
        appId: job.appId || job.id,
        customer: job.customer,
        location: job.location,
        system: job.system,
        installerType: job.installerType || "Hello Solar Direct",
        installer: job.installerType === "Hello Solar Direct" ? "Hello Solar Internal Team" : (job.installer || "Partner Installer"),
        leadTech: (!job.leadTech || job.leadTech === "Hello Solar Internal Team" || job.leadTech === "Unassigned") ? "Unassigned" : job.leadTech,
        currentStatus: job.status,
        schedule: job.schedule,
        notes: job.notes
      }));
    }

    scheduleReadyProject(jobId, scheduleDate, scheduleTime, teamLead, notes) {
      // Must not create a new installation record. Strictly update existing project.
      const job = this.data.installations.find(j => j.id === jobId || j.appId === jobId);
      if (!job) return { success: false, message: "Existing installation record not found." };

      let formattedDate = scheduleDate;
      if (scheduleDate) {
        try {
          const parts = scheduleDate.split("-");
          if (parts.length === 3) {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const m = months[parseInt(parts[1], 10) - 1] || parts[1];
            formattedDate = `${m} ${parseInt(parts[2], 10)}, ${parts[0]}`;
          }
        } catch (e) {
          formattedDate = scheduleDate;
        }
      }
      const formattedSchedule = `${formattedDate} at ${scheduleTime || "09:00 AM"}`;

      job.status = "Scheduled";
      job.schedule = formattedSchedule;

      // Assign actual team lead (never "Hello Solar Internal Team" as team lead)
      const assignedLead = (teamLead && teamLead.trim() && teamLead !== "Hello Solar Internal Team" && teamLead !== "Unassigned") 
        ? teamLead.trim() 
        : "Unassigned";
      job.leadTech = assignedLead;

      // Ensure installer remains Hello Solar Internal Team for Direct projects
      if (job.installerType === "Hello Solar Direct") {
        job.installer = "Hello Solar Internal Team";
      }

      if (notes) job.notes = (job.notes ? job.notes + " • " : "") + notes;
      else job.notes = `Scheduled for ${formattedSchedule}. Assigned Lead: ${assignedLead}.`;

      // Update linked application if exists
      const targetApp = this.data.applications.find(a => a.id === job.appId);
      if (targetApp) {
        targetApp.stage = "Ready for Installation";
        targetApp.updated = "Just now";
        targetApp.notes = (targetApp.notes ? targetApp.notes + " • " : "") + `Installation scheduled for ${formattedSchedule}. Lead: ${assignedLead}.`;
      }

      // Synchronize installer activeJobs counts
      this.data.installers.forEach(inst => {
        inst.activeJobs = this.data.installations.filter(j => 
          (j.installerId === inst.id || j.installer === inst.name || (inst.id === "INS-001" && j.installerType === "Hello Solar Direct")) &&
          !["Completed", "Cancelled"].includes(j.status)
        ).length;
      });

      this.logActivity(
        "Admin",
        "ADMIN (Limuel)",
        `ADMIN scheduled installation for ${job.id} (${job.customer}) on ${formattedSchedule}. Lead: ${assignedLead}`,
        job.id,
        {
          actorId: "ADMIN-01",
          recordType: "Installation",
          details: { schedule: formattedSchedule, leadTech: assignedLead, status: "Scheduled", jobCustomer: job.customer }
        }
      );
      this.save();
      return { success: true, job, app: targetApp };
    }

    updateInstallationStatus(jobId, newStatus, newSchedule, notes, delayReason, teamLead) {
      const job = this.data.installations.find(j => j.id === jobId);
      if (!job) return false;
      const prevStatus = job.status;
      job.status = newStatus;
      if (newSchedule) job.schedule = newSchedule.replace(/\s*\(Delayed\)/gi, "").trim();
      if (notes) job.notes = notes;
      if (teamLead && teamLead !== "Hello Solar Internal Team") {
        job.leadTech = teamLead;
      }
      if (delayReason) {
        job.delayReason = delayReason;
        job.notes = (notes ? notes + " • " : "") + `Delayed: ${delayReason}`;
      } else if (newStatus !== "Delayed") {
        delete job.delayReason;
      }
      
      // Update linked application and completedDate if completed
      if (newStatus === "Completed") {
        if (!job.completedDate) {
          const now = new Date();
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          job.completedDate = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
        }
        const app = this.data.applications.find(a => a.id === job.appId);
        if (app) {
          app.stage = "Approved";
          app.updated = "Just now";
        }
      }

      // Synchronize all installer activeJobs counts
      this.data.installers.forEach(inst => {
        inst.activeJobs = this.data.installations.filter(j => 
          (j.installerId === inst.id || j.installer === inst.name || (inst.id === "INS-001" && j.installerType === "Hello Solar Direct")) &&
          !["Completed", "Cancelled"].includes(j.status)
        ).length;
      });

      this.logActivity(
        "Admin",
        "ADMIN (Limuel)",
        `ADMIN updated installation ${jobId} status from "${prevStatus}" to "${newStatus}"`,
        jobId,
        {
          actorId: "ADMIN-01",
          recordType: "Installation",
          details: { prevStatus, newStatus, schedule: newSchedule, delayReason, leadTech: teamLead }
        }
      );
      this.save();
      return true;
    }

    // --- DIRECT INSTALLATION ENGINEER WORKFLOW ---
    // Uses the same installation progress record as the Installer Portal, stored on
    // app.installationProgress (same APP ID) and in the shared
    // "hello_solar_installation_progress" store so Super Admin can monitor it.
    getDirectInstallJobs() {
      return this.data.installations.filter(j => j.installerType === "Hello Solar Direct");
    }

    getDirectJobState(job) {
      if (!job) return "unknown";
      const app = this.data.applications.find(a => a.id === job.appId);
      const active = String(app?.systemStatus || job.systemStatus || "").toUpperCase() === "ACTIVE";
      if (job.status === "Completed") return active ? "active" : "completed";
      if (["In Progress", "Testing", "Delayed"].includes(job.status)) return "in_progress";
      if (job.engineerAcceptedAt) return "accepted";
      return "pending"; // Ready / Scheduled, awaiting engineer acceptance
    }

    defaultInstallationProgress(job) {
      const app = this.data.applications.find(a => a.id === job.appId) || {};
      return {
        appId: job.appId,
        jobId: job.id,
        referenceNumber: "",
        battery: { brand: "", model: app.battery || "", capacityKwh: "", quantity: "", serialNumbers: "" },
        inverter: { brand: "", model: app.inverter || "", capacityKw: "", serialNumber: "" },
        solarPanels: { brand: "", model: app.panels || "", wattage: "", quantity: "", serialNumbers: "" },
        progress: { percent: 0, stage: "", notes: "" },
        updatedAt: null,
        updatedBy: null,
        history: []
      };
    }

    getInstallationProgress(jobOrAppId) {
      const job = typeof jobOrAppId === "object" ? jobOrAppId
        : this.data.installations.find(j => j.id === jobOrAppId || j.appId === jobOrAppId);
      if (!job) return null;
      const app = this.data.applications.find(a => a.id === job.appId);
      let stored = app?.installationProgress || null;
      if (!stored) {
        try {
          stored = (JSON.parse(STORE.getItem(INSTALLATION_PROGRESS_KEY) || "{}") || {})[job.appId] || null;
        } catch { stored = null; }
      }
      const base = this.defaultInstallationProgress(job);
      const rec = !stored ? base : {
        ...base, ...stored,
        battery: { ...base.battery, ...(stored.battery || {}) },
        inverter: { ...base.inverter, ...(stored.inverter || {}) },
        solarPanels: { ...base.solarPanels, ...(stored.solarPanels || {}) },
        progress: { ...base.progress, ...(stored.progress || {}) },
        history: Array.isArray(stored.history) ? stored.history : []
      };
      const state = this.getDirectJobState(job);
      if (state === "pending" || state === "accepted") rec.progress = { ...rec.progress, percent: 0 };
      if (state === "completed" || state === "active") rec.progress = { ...rec.progress, percent: 100 };
      return rec;
    }

    _syncDirectApp(job, fields) {
      const app = this.data.applications.find(a => a.id === job.appId);
      if (app) Object.assign(app, fields, { updated: "Just now" });
      return app;
    }

    _writeSharedProgress(record) {
      try {
        const store = JSON.parse(STORE.getItem(INSTALLATION_PROGRESS_KEY) || "{}") || {};
        store[record.appId] = record;
        STORE.setItem(INSTALLATION_PROGRESS_KEY, JSON.stringify(store));
      } catch (e) { /* storage unavailable */ }
    }

    engineerAcceptJob(jobId, engineer) {
      const job = this.data.installations.find(j => j.id === jobId);
      if (!job || job.installerType !== "Hello Solar Direct") return { success: false, message: "Direct installation job not found." };
      if (this.getDirectJobState(job) !== "pending") return { success: false, message: "Only pending direct installation jobs can be accepted." };

      job.engineerAcceptedAt = new Date().toISOString();
      job.leadTech = engineer.name;
      job.status = "Scheduled";
      job.progress = 0;
      this._syncDirectApp(job, { installationStatus: "AWAITING_INSTALLATION", progress: 0, assignedEngineer: engineer.name });
      this.logActivity("Engineer", engineer.name, `${engineer.name} accepted direct installation ${jobId} (${job.appId})`, jobId, {
        actorId: engineer.actorId, recordType: "Installation", details: { appId: job.appId, installationStatus: "AWAITING_INSTALLATION" }
      });
      return { success: true, job };
    }

    saveDirectInstallationProgress(jobId, payload, engineer) {
      const job = this.data.installations.find(j => j.id === jobId);
      if (!job || job.installerType !== "Hello Solar Direct") return { success: false, message: "Direct installation job not found." };
      const state = this.getDirectJobState(job);
      if (!["accepted", "in_progress"].includes(state)) {
        return { success: false, message: "Progress can only be updated after accepting and before completing the installation." };
      }
      const referenceNumber = String(payload.referenceNumber || "").trim();
      if (!referenceNumber) return { success: false, message: "Reference Number is required." };

      const existing = this.getInstallationProgress(job);
      let percent = parseInt(payload.progress?.percent, 10);
      if (isNaN(percent)) percent = existing.progress.percent || 0;
      if (percent < 0 || percent > 99) return { success: false, message: 'Progress must be between 0 and 99%. Use "Complete Installation" to finish.' };

      const clean = (obj, keys) => keys.reduce((acc, k) => { acc[k] = String((obj || {})[k] ?? "").trim(); return acc; }, {});
      const now = new Date().toISOString();
      const stage = String(payload.progress?.stage || "").trim();
      const record = {
        appId: job.appId,
        jobId: job.id,
        referenceNumber,
        battery: clean(payload.battery, ["brand", "model", "capacityKwh", "quantity", "serialNumbers"]),
        inverter: clean(payload.inverter, ["brand", "model", "capacityKw", "serialNumber"]),
        solarPanels: clean(payload.solarPanels, ["brand", "model", "wattage", "quantity", "serialNumbers"]),
        progress: { percent, stage, notes: String(payload.progress?.notes || "").trim() },
        updatedAt: now,
        updatedBy: { installerId: engineer.actorId, name: engineer.name },
        history: [{ at: now, by: engineer.name, percent, stage }, ...existing.history].slice(0, 50)
      };

      // Progress above 0% moves an accepted job into Installation In Progress
      if (percent > 0 && state === "accepted") job.status = "In Progress";
      job.progress = percent;
      const installationStatus = job.status === "In Progress" || state === "in_progress" ? "INSTALLATION_IN_PROGRESS" : "AWAITING_INSTALLATION";
      this._syncDirectApp(job, { installationProgress: record, installationStatus, progress: percent });
      this._writeSharedProgress(record);
      this.logActivity("Engineer", engineer.name, `${engineer.name} updated installation progress for ${job.appId} (${percent}%${stage ? ` · ${stage}` : ""})`, jobId, {
        actorId: engineer.actorId, recordType: "Installation", details: { appId: job.appId, referenceNumber, percent, stage }
      });
      return { success: true, record, job };
    }

    engineerCompleteInstallation(jobId, engineer) {
      const job = this.data.installations.find(j => j.id === jobId);
      if (!job || job.installerType !== "Hello Solar Direct") return { success: false, message: "Direct installation job not found." };
      if (this.getDirectJobState(job) !== "in_progress") return { success: false, message: "Only installations in progress can be completed." };
      const rec = this.getInstallationProgress(job);
      if (!rec.referenceNumber) return { success: false, message: "Save the Reference Number before completing the installation." };

      const now = new Date();
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      job.status = "Completed";
      job.progress = 100;
      if (!job.completedDate) job.completedDate = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
      delete job.delayReason;
      const record = { ...rec, progress: { ...rec.progress, percent: 100, stage: "Installation Completed" }, updatedAt: now.toISOString(), updatedBy: { installerId: engineer.actorId, name: engineer.name } };
      // Same linked-application side effect as the existing admin completion flow
      this._syncDirectApp(job, { installationStatus: "COMPLETED", progress: 100, installationProgress: record, stage: "Completed" });
      this._writeSharedProgress(record);
      this.data.installers.forEach(inst => {
        inst.activeJobs = this.data.installations.filter(j =>
          (j.installerId === inst.id || j.installer === inst.name || (inst.id === "INS-001" && j.installerType === "Hello Solar Direct")) &&
          !["Completed", "Cancelled"].includes(j.status)
        ).length;
      });
      this.logActivity("Engineer", engineer.name, `${engineer.name} completed direct installation ${jobId} (${job.appId})`, jobId, {
        actorId: engineer.actorId, recordType: "Installation", details: { appId: job.appId, installationStatus: "COMPLETED" }
      });
      return { success: true, job };
    }

    engineerActivateSystem(jobId, engineer) {
      const job = this.data.installations.find(j => j.id === jobId);
      if (!job || job.installerType !== "Hello Solar Direct") return { success: false, message: "Direct installation job not found." };
      const state = this.getDirectJobState(job);
      if (state === "active") return { success: false, message: "This system is already active." };
      if (state !== "completed") return { success: false, message: "Only completed installations can be activated." };

      const now = new Date().toISOString();
      job.systemStatus = "ACTIVE";
      job.activatedAt = now;
      this._syncDirectApp(job, { systemStatus: "ACTIVE", applicationStatus: "ACTIVE", stage: "Completed", activatedAt: now });
      this.logActivity("Engineer", engineer.name, `${engineer.name} activated system for ${job.appId} (${jobId})`, jobId, {
        actorId: engineer.actorId, recordType: "Installation", details: { appId: job.appId, systemStatus: "ACTIVE" }
      });
      return { success: true, job };
    }

    // --- INSTALLATION SPECIFIC ACTIVITY TIMELINE ---
    getJobActivity(jobId) {
      const job = this.data.installations.find(j => j.id === jobId);
      if (!job) return [];
      const appId = job.appId;

      const rawActivity = this.data.activity.filter(a =>
        a.record === jobId ||
        (appId && a.record === appId && (
          a.action.toLowerCase().includes("install") ||
          a.action.toLowerCase().includes("schedule") ||
          a.action.toLowerCase().includes("direct") ||
          a.action.toLowerCase().includes("tech") ||
          a.action.toLowerCase().includes("lead")
        )) ||
        (a.action && (a.action.includes(jobId) || (appId && a.action.includes(appId))))
      );

      const list = [...rawActivity];
      if (list.length < 2) {
        list.push({
          id: `ACT-JOB-INIT-1`,
          time: job.schedule ? "Schedule Logged" : "Recent",
          role: "Installer",
          user: job.installer,
          action: `Assigned installer: ${job.installer} (${job.installerType}). Current status: ${job.status}`,
          record: jobId
        });
        if (appId) {
          list.push({
            id: `ACT-JOB-INIT-2`,
            time: "Project Intake",
            role: "Admin",
            user: "ADMIN (Limuel)",
            action: `Project originated from verified application ${appId} (${job.system}, ${job.location})`,
            record: jobId
          });
        }
      }

      return list;
    }

    // --- PAYMENT WORKFLOWS ---
    getPaymentSchedule(appId) {
      if (!this.data.paymentSchedules) {
        this.data.paymentSchedules = {};
      }

      if (this.data.paymentSchedules[appId]) {
        return this.data.paymentSchedules[appId];
      }

      const app = this.data.applications.find(a => a.id === appId);
      if (!app) return null;

      const monthly = app.monthly || 5000;
      const totalAmount = app.amount || 300000;

      // Handle Full Payment obligations (Single invoice workflow)
      const isFullPayment = (app.paymentType || "").toLowerCase().includes("full") || app.financer === "Not Required";
      if (isFullPayment) {
        const isPaid = app.paymentStatus === "Verified" || app.paymentStatus === "Completed" || app.paymentStatus === "Paid" || app.paymentStatus === "Verified / Paid";
        const fullSched = {
          appId,
          installments: [
            {
              no: 1,
              dueDate: app.receiptUploadedAt || app.nextDue || "2026-09-30",
              amount: app.amount,
              status: isPaid ? "Paid" : (app.paymentStatus === "Verification Required" ? "Verification Required" : "Unpaid"),
              paidDate: isPaid ? (app.receiptUploadedAt || "2026-09-28") : null,
              paidAmount: isPaid ? app.amount : 0,
              reference: app.receiptReference || `HS-FULL-${app.id.replace('APP-', '')}`,
              notes: isPaid ? "Full invoice settled in full via direct payment." : "Awaiting payment verification."
            }
          ],
          history: isPaid ? [
            {
              id: `REC-${app.id.replace('APP-', '')}-01`,
              appId,
              date: app.receiptUploadedAt || "2026-09-28",
              amount: app.amount,
              method: app.receiptBank || "Bank Transfer",
              ref: app.receiptReference || `HS-REC-${app.id.replace('APP-', '')}`,
              status: "Verified",
              recordedBy: "ADMIN (Limuel)",
              installmentNo: 1,
              notes: "Full payment settled and verified by Super Admin."
            }
          ] : []
        };
        this.data.paymentSchedules[appId] = fullSched;
        return fullSched;
      }

      const totalInstallments = Number(app.termMonths) > 0
        ? Number(app.termMonths)
        : Math.max(12, Math.round(totalAmount / monthly));
      
      const installments = [];
      const history = [];

      if (app.id === "APP-1070" || app.paymentStatus === "Completed") {
        // Fully paid obligation
        for (let i = 1; i <= totalInstallments; i++) {
          const installmentDate = new Date("2023-09-15T00:00:00");
          installmentDate.setMonth(installmentDate.getMonth() + i - 1);
          const dateStr = installmentDate.toISOString().split("T")[0];
          installments.push({
            no: i,
            dueDate: dateStr,
            amount: monthly,
            status: "Paid",
            paidDate: i === totalInstallments ? "2026-09-23" : dateStr,
            paidAmount: monthly,
            reference: `SF-REC-1070-${String(i).padStart(2, '0')}`,
            notes: i === totalInstallments ? "Final payment settled in full. Obligation completed." : "Regular monthly amortization cleared."
          });
        }
        history.push({
          id: "PAY-1070-FINAL",
          appId: "APP-1070",
          date: "2026-09-23",
          amount: monthly,
          method: "Bank Transfer",
          ref: "SF-REC-1070-FINAL",
          status: "Verified",
          recordedBy: "ADMIN (Limuel)",
          notes: "Final amort. payment settled in full. Account marked Completed."
        });
        history.push({
          id: "PAY-1070-35",
          appId: "APP-1070",
          date: "2026-08-15",
          amount: monthly,
          method: "Auto-Debit",
          ref: "SF-REC-1070-35",
          status: "Verified",
          recordedBy: "System Mesh",
          notes: "Scheduled auto-debit cleared."
        });
        history.push({
          id: "PAY-1070-34",
          appId: "APP-1070",
          date: "2026-07-15",
          amount: monthly,
          method: "Auto-Debit",
          ref: "SF-REC-1070-34",
          status: "Verified",
          recordedBy: "System Mesh",
          notes: "Scheduled auto-debit cleared."
        });
      } else if (app.id === "APP-1056" || (app.paymentStatus === "Overdue" && app.id !== "APP-1089")) {
        // Overdue account APP-1056 where Sep 12, 2026 was missed
        const missedDate = app.nextDue || "2026-09-12";
        const paidDates = ["2026-06-12", "2026-07-12", "2026-08-12"];
        paidDates.forEach((pDate, idx) => {
          installments.push({
            no: idx + 1,
            dueDate: pDate,
            amount: monthly,
            status: "Paid",
            paidDate: pDate,
            paidAmount: monthly,
            reference: `BDO-REC-1056-0${idx + 1}`,
            notes: "Direct debit payment verified."
          });
          history.unshift({
            id: `PAY-1056-0${idx + 1}`,
            appId: "APP-1056",
            date: pDate,
            amount: monthly,
            method: "Auto-Debit",
            ref: `BDO-REC-1056-0${idx + 1}`,
            status: "Verified",
            recordedBy: "System Mesh",
            notes: "Automatic amortization deduction."
          });
        });

        // Missed installment #4
        installments.push({
          no: 4,
          dueDate: missedDate,
          amount: monthly,
          status: "Overdue",
          paidDate: null,
          paidAmount: 0,
          reference: null,
          notes: "Scheduled payment date passed without required payment (12 days overdue)."
        });

        for (let i = 5; i <= totalInstallments; i++) {
          const upDate = new Date("2026-09-12T00:00:00");
          upDate.setMonth(upDate.getMonth() + (i - 4));
          installments.push({
            no: i,
            dueDate: upDate.toISOString().split("T")[0],
            amount: monthly,
            status: "Upcoming",
            paidDate: null,
            paidAmount: 0,
            reference: null,
            notes: ""
          });
        }
      } else if (app.id === "APP-1089") {
        // Overdue account APP-1089 (due Sep 08, 2026)
        const missedDate = "2026-09-08";
        installments.push({
          no: 1,
          dueDate: missedDate,
          amount: monthly,
          status: "Overdue",
          paidDate: null,
          paidAmount: 0,
          reference: null,
          notes: "Financer record flagged missed initial payment (16 days overdue)."
        });
        for (let i = 2; i <= totalInstallments; i++) {
          const upDate = new Date("2026-09-08T00:00:00");
          upDate.setMonth(upDate.getMonth() + (i - 1));
          installments.push({
            no: i,
            dueDate: upDate.toISOString().split("T")[0],
            amount: monthly,
            status: "Upcoming",
            paidDate: null,
            paidAmount: 0,
            reference: null,
            notes: ""
          });
        }
      } else {
        // Standard active account (On Time or Due Soon)
        let baseDate = new Date(app.nextDue && app.nextDue !== "N/A" ? (app.nextDue.includes("T") ? app.nextDue : app.nextDue + "T00:00:00") : "2026-10-15T00:00:00");
        if (isNaN(baseDate.getTime())) {
          baseDate = new Date("2026-10-15T00:00:00");
        }
        const nextDueStr = baseDate.toISOString().split("T")[0];
        const isDueSoon = app.paymentStatus === "Due Soon";

        const hasHistory = ["APP-1024", "APP-1048", "APP-1050", "APP-1062", "APP-1102"].includes(app.id);
        const pastCount = hasHistory ? (app.id === "APP-1024" ? 4 : 2) : 0;

        for (let i = 1; i <= pastCount; i++) {
          const pDate = new Date(baseDate.getTime());
          pDate.setMonth(pDate.getMonth() - (pastCount - i + 1));
          const pDateStr = pDate.toISOString().split("T")[0];
          const ref = `REC-${app.id.replace('APP-', '')}-0${i}`;
          installments.push({
            no: i,
            dueDate: pDateStr,
            amount: monthly,
            status: "Paid",
            paidDate: pDateStr,
            paidAmount: monthly,
            reference: ref,
            notes: "Automatic installment debit cleared."
          });
          history.unshift({
            id: `PAY-${app.id}-${i}`,
            appId: app.id,
            date: pDateStr,
            amount: monthly,
            method: "Auto-Debit",
            ref: ref,
            status: "Verified",
            recordedBy: "System Mesh",
            notes: "Verified bank transfer received on schedule."
          });
        }

        // Current active installment
        installments.push({
          no: pastCount + 1,
          dueDate: nextDueStr,
          amount: monthly,
          status: isDueSoon ? "Due Soon" : "On Time",
          paidDate: null,
          paidAmount: 0,
          reference: null,
          notes: isDueSoon ? "Payment due within the next 7 days." : "Upcoming regular monthly installment."
        });

        // Remaining upcoming installments
        for (let i = pastCount + 2; i <= totalInstallments; i++) {
          const upDate = new Date(baseDate.getTime());
          upDate.setMonth(upDate.getMonth() + (i - pastCount - 1));
          installments.push({
            no: i,
            dueDate: upDate.toISOString().split("T")[0],
            amount: monthly,
            status: "Upcoming",
            paidDate: null,
            paidAmount: 0,
            reference: null,
            notes: ""
          });
        }
      }

      const scheduleData = {
        appId: app.id,
        termMonths: totalInstallments,
        installments,
        history
      };

      this.data.paymentSchedules[appId] = scheduleData;
      return scheduleData;
    }

    calculatePaymentStatus(app) {
      const isFull = (app.paymentType || "").toLowerCase().includes("full") || app.financer === "Not Required";
      if (isFull) {
        const isPaid = app.paymentStatus === "Verified" || app.paymentStatus === "Completed" || app.paymentStatus === "Paid" || app.paymentStatus === "Verified / Paid";
        return {
          status: app.paymentStatus || (app.uploadedReceipt ? "Verification Required" : "Payment Required"),
          nextDue: isPaid ? "Paid in Full" : (app.receiptUploadedAt ? `Uploaded: ${this.formatReadableDate(app.receiptUploadedAt)}` : (app.nextDue || "Awaiting Upload")),
          overdueCount: app.paymentStatus === "Overdue" ? 1 : 0,
          remainingBalance: isPaid ? 0 : (app.amount || 0),
          totalPaid: isPaid ? (app.amount || 0) : 0,
          progressCount: isPaid ? 1 : 0,
          totalInstallments: 1
        };
      }

      const schedule = this.getPaymentSchedule(app.id);
      if (!schedule || !schedule.installments || !schedule.installments.length) {
        return {
          status: app.paymentStatus || "On Time",
          nextDue: app.nextDue || "Paid in Full",
          overdueCount: 0,
          remainingBalance: app.amount || 0,
          totalPaid: 0,
          progressCount: 0,
          totalInstallments: 0
        };
      }

      const installments = schedule.installments;
      const paidList = installments.filter(i => i.status === "Paid");
      const totalPaid = paidList.reduce((sum, i) => sum + (i.paidAmount || i.amount || 0), 0);
      const remainingBalance = Math.max(0, (app.amount || 0) - totalPaid);

      const unpaid = installments.filter(i => i.status !== "Paid");
      if (unpaid.length === 0 || remainingBalance <= 0) {
        return {
          status: "Completed",
          nextDue: "Paid in Full",
          overdueCount: 0,
          remainingBalance: 0,
          totalPaid,
          progressCount: installments.length,
          totalInstallments: installments.length
        };
      }

      // Sort unpaid installments chronologically
      unpaid.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

      // Reference system date: Sep 25, 2026
      const refDate = new Date("2026-09-25T00:00:00");

      // Check for overdue installment: scheduled payment date has passed by configured overdueThresholdDays
      const overdueGraceDays = Number(this.data.settings?.overdueThresholdDays) || 5;
      const overdueInstallment = unpaid.find(i => {
        const d = new Date(i.dueDate + "T00:00:00");
        const daysPastDue = Math.floor((refDate - d) / (1000 * 60 * 60 * 24));
        return daysPastDue >= overdueGraceDays;
      });

      const nextInstallment = unpaid[0];
      const nextDueDate = nextInstallment.dueDate;
      const nextDateObj = new Date(nextDueDate + "T00:00:00");
      const daysDiff = Math.round((nextDateObj - refDate) / (1000 * 60 * 60 * 24));

      let status = "On Time";
      let displayDueDate = nextDueDate;

      if (overdueInstallment) {
        status = "Overdue";
        displayDueDate = overdueInstallment.dueDate; // retain actual missed due date, never N/A!
      } else if (daysDiff >= 0 && daysDiff <= 7) {
        status = "Due Soon";
        displayDueDate = nextDueDate;
      } else {
        status = "On Time";
        displayDueDate = nextDueDate;
      }

      return {
        status,
        nextDue: displayDueDate,
        overdueCount: overdueInstallment ? 1 : 0,
        remainingBalance,
        totalPaid,
        progressCount: paidList.length,
        totalInstallments: installments.length
      };
    }

    recordPayment(appId, options = {}) {
      const app = this.data.applications.find(a => a.id === appId);
      if (!app) return false;

      const schedule = this.getPaymentSchedule(appId);
      if (!schedule) return false;

      const paymentDate = options.date || "2026-09-24";
      const reference = options.reference || `HS-REC-${appId.replace('APP-', '')}-${Date.now().toString().slice(-4)}`;
      const method = options.method || "Bank Transfer";
      const adminUser = options.adminUser || "ADMIN (Limuel)";
      const notes = options.notes || "";

      // Find target unpaid installment
      const unpaid = schedule.installments.filter(i => i.status !== "Paid");
      if (!unpaid.length) return false;

      // Oldest unpaid installment
      unpaid.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      const targetInstallment = unpaid[0];

      const amountPaid = Number(options.amount) || targetInstallment.amount || app.monthly;

      // Update installment in schedule
      targetInstallment.status = "Paid";
      targetInstallment.paidDate = paymentDate;
      targetInstallment.paidAmount = amountPaid;
      targetInstallment.reference = reference;
      if (notes) targetInstallment.notes = notes;

      // Append to payment history (never overwrite existing history!)
      schedule.history.unshift({
        id: `REC-${Date.now().toString().slice(-6)}`,
        appId: appId,
        date: paymentDate,
        amount: amountPaid,
        method: method,
        ref: reference,
        status: "Verified",
        recordedBy: adminUser,
        installmentNo: targetInstallment.no,
        notes: notes || `Recorded by Super Admin for Installment #${targetInstallment.no}`
      });

      // If user indicated payInFull or remaining unpaid is 0
      if (options.payInFull) {
        schedule.installments.forEach(i => {
          if (i.status !== "Paid") {
            i.status = "Paid";
            i.paidDate = paymentDate;
            i.paidAmount = i.amount;
            i.reference = reference + "-FINAL";
          }
        });
      }

      // Dynamically calculate status from updated schedule
      const statusInfo = this.calculatePaymentStatus(app);
      app.paymentStatus = statusInfo.status;
      app.nextDue = statusInfo.nextDue;
      app.updated = "Just now";

      // Synchronize Financer record if applicable
      if (app.financerId) {
        const financer = this.data.financers.find(f => f.id === app.financerId);
        if (financer) {
          const linkedApps = this.data.applications.filter(a => a.financerId === financer.id);
          financer.activeLoans = linkedApps.filter(a => a.stage !== "Declined" && a.paymentStatus !== "Completed").length;
        }
      }

      // Audit Trail Logging
      this.logActivity(
        "Admin",
        adminUser,
        `ADMIN recorded payment of ₱${amountPaid.toLocaleString()} for ${appId} (${app.customer}) · Ref: ${reference}. Repayment status updated to ${app.paymentStatus}`,
        appId,
        {
          actorId: "ADMIN-01",
          recordType: "Payment",
          details: { amount: amountPaid, reference, method, paymentStatus: app.paymentStatus, customer: app.customer }
        }
      );

      this.save();
      return { success: true, app, statusInfo };
    }

    recordPaymentAdjustment(appId, options = {}) {
      const app = this.data.applications.find(a => a.id === appId);
      if (!app) return false;

      const schedule = this.getPaymentSchedule(appId);
      const adminUser = options.adminUser || "ADMIN (Limuel)";
      const adjType = options.type || "Payment Note";
      const notes = options.notes || "";

      if (schedule) {
        schedule.history.unshift({
          id: `ADJ-${Date.now().toString().slice(-6)}`,
          appId: appId,
          date: options.date || "2026-09-24",
          amount: 0,
          method: "Administrative Adjustment",
          ref: `ADJ-${appId.replace('APP-', '')}-${Date.now().toString().slice(-3)}`,
          status: "Logged Note",
          recordedBy: adminUser,
          notes: `[${adjType}] ${notes}`
        });
      }

      this.logActivity(
        "Admin",
        adminUser,
        `ADMIN logged payment adjustment note (${adjType}) for ${appId} (${app.customer}): ${notes}`,
        appId,
        {
          actorId: "ADMIN-01",
          recordType: "Payment",
          details: { adjType, notes, date: options.date || "2026-09-24", customer: app.customer }
        }
      );

      this.save();
      return true;
    }

    getPaymentsKpis(options = {}) {
      const apps = this.getApplications ? this.getApplications() : this.data.applications;
      const totalPortfolio = apps.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
      // Funded split stays on the original funded principal / funding source.
      const hsFunded = apps.filter(a => (a.paymentType || "").toLowerCase().includes("full") || a.financer === "Not Required" || (a.financer || "").toLowerCase().includes("hello solar")).reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
      const thirdPartyFunded = Math.max(0, totalPortfolio - hsFunded);
      // Expected Revenue = scheduled payment amounts due in the current period (calendar month), split by owner.
      const { hsRevenue, thirdPartyRevenue, period } = this.getCurrentPeriodRevenue(apps, options.asOf);
      const totalExpectedRevenue = hsRevenue + thirdPartyRevenue;
      const overdueCount = apps.filter(a => a.paymentStatus === "Overdue").length;
      const overdueActionStatus = overdueCount === 1 ? "1 account flagged" : `${overdueCount} accounts flagged`;

      return {
        totalPortfolio,
        hsFunded,
        thirdPartyFunded,
        totalExpectedRevenue,
        hsRevenue,
        thirdPartyRevenue,
        revenuePeriod: period,
        overdueCount,
        overdueActionStatus
      };
    }

    // Current-period revenue from payment schedules (installments, or the single full-payment invoice) whose
    // due date falls in the current calendar month. Ownership comes from the financer contract:
    //  - Unpaid amounts follow the CURRENT owner (Active → financer; Pending Start / Expired / Terminated → Hello Solar).
    //  - Already-collected amounts stay with whoever owned them on the collection date (no retroactive moves).
    //  - Full payments and financed apps without a matched contract keep their original funding source.
    getCurrentPeriodRevenue(apps, asOf) {
      const period = HelloSolarStore.todayISO(asOf).slice(0, 7); // YYYY-MM
      let hsRevenue = 0;
      let thirdPartyRevenue = 0;
      (apps || []).forEach(app => {
        const funding = this.getApplicationFunding(app, asOf);
        const isHsSource = !funding.isFinanced || (app.financer || "").toLowerCase().includes("hello solar");
        const financer = funding.isFinanced ? (this.data.financers || []).find(f => f.id === funding.financerId) : null;
        const schedule = this.getPaymentSchedule(app.id);
        (schedule?.installments || []).forEach(inst => {
          if (String(inst.dueDate || "").slice(0, 7) !== period) return;
          const isCollected = inst.status === "Paid" && !!inst.paidDate;
          const amount = Number(isCollected ? (inst.paidAmount || inst.amount) : inst.amount) || 0;
          let ownerIsHs;
          if (isHsSource) ownerIsHs = true;
          else if (!financer) ownerIsHs = false; // no contract record → original third-party source
          else if (isCollected) ownerIsHs = this.getFinancerOwnerOn(financer, inst.paidDate).ownerType === "Hello Solar";
          else ownerIsHs = funding.ownerType === "Hello Solar";
          if (ownerIsHs) hsRevenue += amount;
          else thirdPartyRevenue += amount;
        });
      });
      return { hsRevenue, thirdPartyRevenue, period };
    }

    // --- ACCOUNTING / ANALYTICS ---
    // Aggregates existing calculations only: getPaymentsKpis (portfolio, expected revenue split),
    // payment schedules (collected / overdue amounts) and getFinancerContract (contract counts).
    // Single entry point for the CURRENT Payments KPIs (used by both Payments and Accounting): refreshes
    // installment payment statuses from the schedules, then runs getPaymentsKpis.
    getCurrentPaymentsKpis(options = {}) {
      const apps = this.getApplications ? this.getApplications() : this.data.applications;
      apps.forEach(app => {
        const isFull = (app.paymentType || "").toLowerCase().includes("full") || app.financer === "Not Required";
        if (!isFull) {
          const statusInfo = this.calculatePaymentStatus(app);
          app.paymentStatus = statusInfo.status;
          app.nextDue = statusInfo.nextDue;
        }
      });
      return this.getPaymentsKpis(options);
    }

    getAccountingSummary(options = {}) {
      const apps = this.getApplications ? this.getApplications() : this.data.applications;
      // Exactly the Payments KPI values (same function Payments renders)
      const kpis = this.getCurrentPaymentsKpis(options);
      const period = kpis.revenuePeriod;
      let collectedRevenue = 0;
      let collectedThisPeriod = 0;
      let overdueAmount = 0;
      apps.forEach(app => {
        (this.getPaymentSchedule(app.id)?.installments || []).forEach(inst => {
          const status = String(inst.status || "");
          if (status === "Paid") {
            const amt = Number(inst.paidAmount || inst.amount) || 0;
            collectedRevenue += amt;
            if (String(inst.paidDate || "").slice(0, 7) === period) collectedThisPeriod += amt;
          } else if (status === "Overdue" && app.paymentStatus === "Overdue") {
            // Only accounts that Payments counts as overdue (same set as the Overdue Accounts KPI)
            overdueAmount += Number(inst.amount) || 0;
          }
        });
      });
      const contracts = (this.data.financers || []).map(f => this.getFinancerContract(f, options.asOf));
      const countStatus = s => contracts.filter(c => c.status === s).length;
      return {
        period,
        totalPortfolio: kpis.totalPortfolio,
        hsFunded: kpis.hsFunded,
        thirdPartyFunded: kpis.thirdPartyFunded,
        expectedRevenue: kpis.totalExpectedRevenue,
        hsRevenue: kpis.hsRevenue,
        thirdPartyRevenue: kpis.thirdPartyRevenue,
        collectedRevenue,
        collectedThisPeriod,
        overdueAmount,
        overdueAccounts: kpis.overdueCount,
        contracts: {
          active: countStatus("Active"),
          expired: countStatus("Expired"),
          terminated: countStatus("Terminated"),
          pendingStart: countStatus("Pending Start"),
          none: countStatus("No Contract"),
          total: contracts.length
        }
      };
    }

    // --- IMMEDIATE SYSTEM DISCONNECT (backend-ready; NO hardware action happens in the frontend) ---
    // Flow: Super Admin request → systemConnectionStatus "Disconnect Requested" + queued in data.disconnectRequests
    // (outbox for the backend / inverter API) → backend calls confirmSystemDisconnect() → "Disconnected".
    // Real stored HS ID only — never derived from the APP ID. Returns null when not assigned.
    getAppHsId(app) {
      const hsId = typeof app?.hsId === "string" ? app.hsId.trim() : "";
      return hsId || null;
    }

    getSystemConnectionStatus(app) {
      return app?.systemConnectionStatus || "Connected";
    }

    // --- INSTALLATION COST (Hello Solar Direct projects only, per APP ID) ---
    isDirectInstallApplication(app) {
      if (!app) return false;
      return app.installerType === "Hello Solar Direct" ||
        String(app.installer || "").trim().toLowerCase() === "hello solar internal team";
    }

    getInstallationCost(app) {
      const c = app?.installationCost || {};
      const num = v => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v) * 100) / 100 : 0);
      const materials = num(c.materials), labor = num(c.labor), transportMisc = num(c.transportMisc);
      return {
        materials, labor, transportMisc,
        total: Math.round((materials + labor + transportMisc) * 100) / 100,
        isSet: Boolean(app?.installationCost),
        updatedAt: c.updatedAt || null,
        updatedBy: c.updatedBy || null
      };
    }

    getDirectInstallationCosts() {
      const apps = this.getApplications ? this.getApplications() : (this.data.applications || []);
      return apps.filter(a => this.isDirectInstallApplication(a)).map(app => ({
        appId: app.id,
        hsId: this.getAppHsId ? this.getAppHsId(app) : (app.hsId || null),
        customer: app.customer || "—",
        location: app.location || "",
        system: app.system || "",
        stage: app.stage || "",
        ...this.getInstallationCost(app)
      }));
    }

    setInstallationCost(appId, values = {}, options = {}) {
      if (options.actorRole && options.actorRole !== "super-admin") return { success: false, error: "Only Super Admin can update installation cost." };
      const app = (this.data.applications || []).find(a => a.id === appId);
      if (!app) return { success: false, error: "Application not found." };
      if (!this.isDirectInstallApplication(app)) return { success: false, error: `${appId} is not a Hello Solar Direct project.` };
      const fields = { materials: "Materials", labor: "Labor", transportMisc: "Transport / Misc" };
      const clean = {};
      for (const [key, label] of Object.entries(fields)) {
        const raw = values[key];
        const n = raw === "" || raw === null || raw === undefined ? 0 : Number(raw);
        if (!Number.isFinite(n) || n < 0) return { success: false, error: `${label} must be a valid amount of 0 or more.` };
        if (n > 100000000) return { success: false, error: `${label} is too large.` };
        clean[key] = Math.round(n * 100) / 100;
      }
      const admin = options.adminUser || "ADMIN (Limuel)";
      const prev = app.installationCost ? this.getInstallationCost(app) : null;
      app.installationCost = { ...clean, updatedAt: new Date().toISOString(), updatedBy: admin };
      const cost = this.getInstallationCost(app);
      this.logActivity("Admin", admin, `ADMIN updated Installation Cost for ${appId} — Total ₱${cost.total.toLocaleString("en-PH")}`, appId, {
        recordType: "Installation Cost", deferSave: true,
        details: { appId, previous: prev ? { materials: prev.materials, labor: prev.labor, transportMisc: prev.transportMisc, total: prev.total } : null, materials: cost.materials, labor: cost.labor, transportMisc: cost.transportMisc, total: cost.total }
      });
      this.save();
      return { success: true, cost };
    }

    requestSystemDisconnect(appId, options = {}) {
      if (options.actorRole !== "super-admin") return { success: false, error: "Only Super Admin can request a system disconnect." };
      const app = (this.data.applications || []).find(a => a.id === appId);
      if (!app) return { success: false, error: "Application not found." };
      const reason = String(options.reason || "").trim();
      if (reason.length < 5) return { success: false, error: "A disconnect reason (at least 5 characters) is required." };
      const current = this.getSystemConnectionStatus(app);
      if (current === "Disconnect Requested") return { success: false, error: `A disconnect request for ${appId} is already pending backend confirmation.` };
      if (current === "Disconnected") return { success: false, error: `${appId} is already disconnected.` };

      const hsId = this.getAppHsId(app);
      if (!hsId) return { success: false, error: `${appId} has no HS ID assigned. A valid HS ID is required before a system disconnect can be requested.` };
      const admin = options.adminUser || "ADMIN (Limuel)";
      const now = new Date();
      const request = {
        requestId: `DSC-${String(appId).replace("APP-", "")}-${now.getTime()}`,
        appId,
        hsId,
        customer: app.customer || null,
        reason,
        requestedBy: admin,
        requestedAt: now.toISOString(),
        status: "Pending API Confirmation",
        apiReference: null,
        confirmedAt: null
      };
      app.systemConnectionStatus = "Disconnect Requested";
      app.disconnectRequest = request;
      if (!Array.isArray(this.data.disconnectRequests)) this.data.disconnectRequests = [];
      this.data.disconnectRequests.unshift({ ...request });

      this.logActivity("Admin", admin,
        `Immediate system disconnect REQUESTED for ${appId} (${hsId}) — awaiting backend/inverter API confirmation. Reason: ${reason}`,
        appId, {
          recordType: "System Disconnect", deferSave: true,
          details: { requestId: request.requestId, appId, hsId, admin, reason, requestedAt: request.requestedAt, status: "Disconnect Requested" }
        });
      this.save();
      return { success: true, request };
    }

    // Backend/API callback ONLY (inverter disconnect confirmed). Not wired to any frontend button.
    confirmSystemDisconnect(appId, confirmation = {}) {
      const app = (this.data.applications || []).find(a => a.id === appId);
      if (!app) return { success: false, error: "Application not found." };
      if (this.getSystemConnectionStatus(app) !== "Disconnect Requested" || !app.disconnectRequest) {
        return { success: false, error: "No pending disconnect request to confirm." };
      }
      if (!confirmation.apiReference) return { success: false, error: "Backend confirmation reference (apiReference) is required." };
      const confirmedAt = confirmation.confirmedAt || new Date().toISOString();
      app.systemConnectionStatus = "Disconnected";
      Object.assign(app.disconnectRequest, { status: "Confirmed", apiReference: confirmation.apiReference, confirmedAt });
      const queued = (this.data.disconnectRequests || []).find(r => r.requestId === app.disconnectRequest.requestId);
      if (queued) Object.assign(queued, { status: "Confirmed", apiReference: confirmation.apiReference, confirmedAt });

      this.logActivity("System", "SYSTEM (Inverter API)",
        `System ${appId} (${app.disconnectRequest.hsId}) DISCONNECTED — confirmed by backend (ref ${confirmation.apiReference})`,
        appId, {
          recordType: "System Disconnect", deferSave: true,
          details: { requestId: app.disconnectRequest.requestId, appId, hsId: app.disconnectRequest.hsId, apiReference: confirmation.apiReference, confirmedAt, status: "Disconnected" }
        });
      this.save();
      return { success: true, app };
    }

    // Owner on a specific date (for already-collected payments). Reuses getFinancerContract; an early termination
    // only applies from when it was recorded (contractUpdatedAt), so payments collected before it stay with the financer.
    getFinancerOwnerOn(financer, dateISO) {
      const day = String(dateISO || "").slice(0, 10);
      const terminatedOn = financer.contractStatusOverride === "Terminated" && financer.contractUpdatedAt
        ? HelloSolarStore.todayISO(financer.contractUpdatedAt) : null;
      const view = terminatedOn && day < terminatedOn ? { ...financer, contractStatusOverride: null } : financer;
      return this.getFinancerContract(view, day + "T12:00:00");
    }

    verifyPaymentReceipt(appId, options = {}) {
      const app = this.data.applications.find(a => a.id === appId);
      if (!app) return { success: false, error: "Application not found" };

      const adminUser = options.adminUser || "ADMIN (Limuel)";
      app.paymentStatus = "Verified / Paid";
      app.stage = "Ready for Installation";
      app.receiptVerificationStatus = "Verified";
      app.verifiedAt = new Date().toISOString();
      app.verifiedBy = adminUser;
      app.updated = "Just now";

      const schedule = this.getPaymentSchedule(appId);
      if (schedule) {
        if (schedule.installments && schedule.installments[0]) {
          schedule.installments[0].status = "Paid";
          schedule.installments[0].paidDate = app.receiptUploadedAt || "2026-09-28";
          schedule.installments[0].paidAmount = app.amount;
        }
        if (!schedule.history) schedule.history = [];
        schedule.history.unshift({
          id: `REC-${appId.replace('APP-', '')}-${Date.now().toString().slice(-4)}`,
          appId,
          date: app.receiptUploadedAt || "2026-09-28",
          amount: app.amount,
          method: app.receiptBank || "Bank Transfer",
          ref: app.receiptReference || `HS-FULL-${appId.replace('APP-', '')}`,
          status: "Verified",
          recordedBy: adminUser,
          installmentNo: 1,
          notes: "Full payment receipt verified by Super Admin. Project cleared for installation."
        });
      }

      this.logActivity(
        "Admin",
        adminUser,
        `ADMIN verified full payment receipt for ${appId} (${app.customer}). Application stage updated to Ready for Installation.`,
        appId,
        {
          actorId: "ADMIN-01",
          recordType: "Payment",
          details: { appId, amount: app.amount, status: app.paymentStatus, stage: app.stage }
        }
      );

      this.save();
      return { success: true, app };
    }

    rejectPaymentReceipt(appId, options = {}) {
      const app = this.data.applications.find(a => a.id === appId);
      if (!app) return { success: false, error: "Application not found" };

      const adminUser = options.adminUser || "ADMIN (Limuel)";
      const reason = options.reason || "Invalid receipt image or amount mismatch";
      app.paymentStatus = "Rejected / Reupload Required";
      app.stage = "Payment Required";
      app.receiptVerificationStatus = "Rejected";
      app.rejectionReason = reason;
      app.rejectedAt = new Date().toISOString();
      app.rejectedBy = adminUser;
      app.updated = "Just now";

      this.logActivity(
        "Admin",
        adminUser,
        `ADMIN rejected full payment receipt for ${appId} (${app.customer}): ${reason}. Payment status set to Rejected / Reupload Required.`,
        appId,
        {
          actorId: "ADMIN-01",
          recordType: "Payment",
          details: { appId, reason, status: app.paymentStatus, stage: app.stage }
        }
      );

      this.save();
      return { success: true, app };
    }

    uploadCustomerReceipt(appId, options = {}) {
      const app = this.data.applications.find(a => a.id === appId);
      if (!app) return { success: false, error: "Application not found" };

      app.uploadedReceipt = options.receipt || `bdo_transfer_receipt_${appId.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`;
      app.receiptUploadedAt = options.date || new Date().toISOString().split("T")[0];
      app.receiptBank = options.bank || "BDO Unibank Direct Transfer";
      app.receiptReference = options.reference || `BDO-TXN-${Date.now().toString().slice(-8)}`;
      app.receiptAmount = options.amount || app.amount;
      app.paymentStatus = "Verification Required";
      app.receiptVerificationStatus = "Pending Verification";
      app.updated = "Just now";

      const schedule = this.getPaymentSchedule(appId);
      if (schedule && schedule.installments && schedule.installments[0]) {
        schedule.installments[0].status = "Verification Required";
        schedule.installments[0].reference = app.receiptReference;
      }

      this.logActivity(
        "Customer",
        app.customer,
        `Customer uploaded payment receipt for ${appId} (${app.customer}) · Status: Verification Required.`,
        appId,
        {
          actorId: app.customerId || "CUS-00",
          recordType: "Payment",
          details: { appId, receipt: app.uploadedReceipt, ref: app.receiptReference }
        }
      );

      this.save();
      return { success: true, app };
    }

    // --- INSTALLMENT RECEIPT VERIFICATION (customer-submitted, per billing period) ---
    // Full-payment receipts keep using verifyPaymentReceipt / rejectPaymentReceipt above.
    getPendingInstallmentReceipt(appId) {
      const app = this.data.applications.find(a => a.id === appId);
      if (!app || this.isFullPaymentApp(app)) return null;
      return (app.receiptSubmissions || []).find(s => s.status === "Pending Verification") || null;
    }

    isFullPaymentApp(app) {
      return (app?.paymentType || "").toLowerCase().includes("full") || app?.financer === "Not Required";
    }

    // Finds the schedule installment for a billing period: exact installment link first, then same due month,
    // then the earliest unpaid installment. Each installment is used once per receipt.
    _matchInstallment(schedule, bill, used) {
      const list = (schedule?.installments || []).filter(i => !used.has(i.no));
      const exact = String(bill.billId || "").match(/-I(\d+)$/);
      if (exact) {
        const hit = list.find(i => i.no === Number(exact[1]));
        if (hit) return hit;
      }
      const month = String(bill.dueDate || "").slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(month)) {
        const hit = list.find(i => String(i.dueDate).slice(0, 7) === month);
        if (hit) return hit;
      }
      return list.filter(i => i.status !== "Paid").sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0] || null;
    }

    _notifyCustomer(app, title, message, eventType) {
      if (!app?.customerId || typeof window === "undefined" || !window.HSShared) return;
      window.HSShared.notify({ recipientRole: "customer", recipientId: app.customerId, eventType, recordId: app.id, title, message, targetUrl: "payments.html", actionLabel: "View Payments" });
    }

    verifyInstallmentReceipt(appId, submissionId, options = {}) {
      this.data = this.load();
      const app = this.data.applications.find(a => a.id === appId);
      if (!app) return { success: false, error: "Application not found" };
      if (this.isFullPaymentApp(app)) return { success: false, error: "Full payment receipts use the full payment verification flow." };
      const sub = (app.receiptSubmissions || []).find(s => s.id === submissionId && s.status === "Pending Verification");
      if (!sub) return { success: false, error: "No pending receipt to verify." };

      const adminUser = options.adminUser || "ADMIN (Limuel)";
      const now = new Date().toISOString();
      const paidDate = sub.date || now.slice(0, 10);
      const schedule = this.getPaymentSchedule(appId);
      const bills = Array.isArray(sub.bills) && sub.bills.length ? sub.bills : [{ billId: null, period: null, dueDate: null, amount: sub.amount }];
      const used = new Set();
      const settled = [];
      if (!app.billStatus) app.billStatus = {};
      bills.forEach(bill => {
        const inst = this._matchInstallment(schedule, bill, used);
        if (inst) {
          used.add(inst.no);
          inst.status = "Paid";
          inst.paidDate = paidDate;
          inst.paidAmount = Number(bill.amount) || inst.amount;
          inst.reference = sub.reference || inst.reference;
          inst.notes = `Customer receipt ${sub.id} verified by ${adminUser}.`;
          settled.push(inst.no);
        }
        if (bill.billId) {
          app.billStatus[bill.billId] = { status: "Paid", period: bill.period, dueDate: bill.dueDate, amount: bill.amount, submissionId: sub.id, installmentNo: inst ? inst.no : null, at: now };
        }
        if (schedule) {
          if (!schedule.history) schedule.history = [];
          schedule.history.unshift({
            id: `REC-${appId.replace("APP-", "")}-${Date.now().toString().slice(-5)}${settled.length}`,
            appId, date: paidDate, amount: Number(bill.amount) || (inst ? inst.amount : 0),
            method: sub.channel || "Customer Upload", ref: sub.reference || sub.id, status: "Verified",
            recordedBy: adminUser, installmentNo: inst ? inst.no : null,
            notes: `Installment receipt ${sub.id}${bill.period ? " for " + bill.period : ""} verified.`
          });
        }
      });

      sub.status = "Verified";
      sub.verifiedAt = now;
      sub.verifiedBy = adminUser;
      app.receiptVerificationStatus = "Verified";
      delete app.rejectionReason;
      const info = this.calculatePaymentStatus(app);
      app.paymentStatus = info.status;
      app.nextDue = info.nextDue;
      app.updated = "Just now";
      this.logActivity("Admin", adminUser,
        `ADMIN verified installment receipt ${sub.id} for ${appId} (${app.customer}) · installment${settled.length === 1 ? "" : "s"} #${settled.join(", #") || "—"} marked Paid.`,
        appId, { actorId: "ADMIN-01", recordType: "Payment", details: { appId, submissionId: sub.id, installments: settled, status: "Verified" } });
      this.save();
      this._notifyCustomer(app, "Payment Verified", `Your payment receipt for ${appId} was verified. ${bills.map(b => b.period).filter(Boolean).join(", ") || "The billing period"} is now marked Paid.`, "payment_verified");
      return { success: true, app, installments: settled };
    }

    rejectInstallmentReceipt(appId, submissionId, options = {}) {
      this.data = this.load();
      const app = this.data.applications.find(a => a.id === appId);
      if (!app) return { success: false, error: "Application not found" };
      if (this.isFullPaymentApp(app)) return { success: false, error: "Full payment receipts use the full payment verification flow." };
      const sub = (app.receiptSubmissions || []).find(s => s.id === submissionId && s.status === "Pending Verification");
      if (!sub) return { success: false, error: "No pending receipt to reject." };
      const reason = String(options.reason || "").trim() || "Receipt could not be matched to the billing amount or reference";

      const adminUser = options.adminUser || "ADMIN (Limuel)";
      const now = new Date().toISOString();
      const schedule = this.getPaymentSchedule(appId);
      const used = new Set();
      const flagged = [];
      if (!app.billStatus) app.billStatus = {};
      (sub.bills || []).forEach(bill => {
        const inst = this._matchInstallment(schedule, bill, used);
        if (inst && inst.status !== "Paid") {
          used.add(inst.no);
          inst.status = "Re-upload Required";
          inst.notes = `Customer receipt ${sub.id} rejected: ${reason}`;
          flagged.push(inst.no);
        }
        if (bill.billId && app.billStatus[bill.billId]?.status !== "Paid") {
          app.billStatus[bill.billId] = { status: "Re-upload Required", period: bill.period, dueDate: bill.dueDate, amount: bill.amount, submissionId: sub.id, installmentNo: inst ? inst.no : null, reason, at: now };
        }
      });

      sub.status = "Re-upload Required";
      sub.rejectedAt = now;
      sub.rejectedBy = adminUser;
      sub.reason = reason;
      app.receiptVerificationStatus = "Rejected";
      app.rejectionReason = reason;
      const info = this.calculatePaymentStatus(app);
      app.paymentStatus = info.status;
      app.nextDue = info.nextDue;
      app.updated = "Just now";
      this.logActivity("Admin", adminUser,
        `ADMIN rejected installment receipt ${sub.id} for ${appId} (${app.customer}): ${reason}. Re-upload required.`,
        appId, { actorId: "ADMIN-01", recordType: "Payment", details: { appId, submissionId: sub.id, installments: flagged, reason, status: "Re-upload Required" } });
      this.save();
      this._notifyCustomer(app, "Receipt Re-upload Required", `Your payment receipt for ${appId} was not accepted: ${reason}. Please upload a new receipt.`, "payment_reupload");
      return { success: true, app, installments: flagged };
    }

    // --- FINANCER ASSIGNMENT (installment applications) ---
    // Only Active financers with an Active contract can receive applications (same rule as funding ownership).
    getAssignableFinancers(asOf) {
      return (this.data.financers || []).filter(f =>
        f.status === "Active" && this.getFinancerContract(f, asOf).status === "Active");
    }

    assignFinancer(appId, financerId, options = {}) {
      this.data = this.load();
      const app = this.data.applications.find(a => a.id === appId);
      if (!app) return { success: false, error: "Application not found" };
      if (this.isFullPaymentApp(app)) return { success: false, error: "Full payment applications do not need a financer." };
      if (app.stage === "Declined") return { success: false, error: "Declined applications cannot be assigned to a financer." };
      const financer = (this.data.financers || []).find(f => f.id === financerId);
      if (!financer) return { success: false, error: "Financer not found" };
      if (financer.status !== "Active") return { success: false, error: `${financer.name} is not an active financer account.` };
      const contract = this.getFinancerContract(financer, options.asOf);
      if (contract.status !== "Active") return { success: false, error: `${financer.name} cannot receive applications: contract is ${String(contract.status).toLowerCase()}.` };

      const adminUser = options.adminUser || "ADMIN (Limuel)";
      const previous = app.financerId ? `${app.financer} (${app.financerId})` : null;
      app.financerId = financer.id;
      app.financer = financer.name;
      app.fundingOwner = contract.ownerName;
      app.fundingOwnerId = contract.ownerId;
      if (!app.stage || app.stage === "Submitted") app.stage = "Financing Review";
      app.updated = "Just now";
      app.notes = (app.notes ? app.notes + " • " : "") + `Assigned to financer ${financer.name} (${financer.id}).`;
      this.logActivity("Admin", adminUser,
        `ADMIN assigned ${appId} (${app.customer}) to financer ${financer.id} (${financer.name})${previous ? ` — previously ${previous}` : ""}`,
        appId, { actorId: "ADMIN-01", recordType: "Application", details: { appId, financerId: financer.id, financer: financer.name, previous } });
      this.save();
      if (typeof window !== "undefined" && window.HSShared) {
        window.HSShared.notify({
          recipientRole: "financer", recipientId: financer.id, eventType: "application_assigned", recordId: appId,
          title: "New Financing Application", message: `${appId} (${app.customer}) was assigned to you for financing review.`,
          targetUrl: "applications.html", actionLabel: "Review Application"
        });
      }
      return { success: true, app, financer };
    }

    getPaymentActivity(appId) {
      return this.data.activity.filter(a => 
        a.record === appId || 
        (a.action && a.action.toLowerCase().includes("payment") && a.action.includes(appId)) ||
        (a.action && a.action.toLowerCase().includes("amortization") && a.action.includes(appId))
      );
    }

    formatReadableDate(dateStr) {
      if (!dateStr || dateStr === "N/A" || dateStr === "—") return "—";
      if (dateStr === "Paid in Full") return "Paid in Full";
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split("-").map(Number);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${months[m - 1]} ${d}, ${y}`;
      }
      return dateStr;
    }

    // --- SUPPORT TICKET WORKFLOWS ---
    resolveSupportTicket(ticketId, resolutionNote, adminUser = "ADMIN (Limuel)") {
      const ticket = this.data.support.find(t => t.id === ticketId);
      if (!ticket) return { success: false, error: "Ticket not found" };
      if (!resolutionNote || !resolutionNote.trim()) {
        return { success: false, error: "A resolution note is required when resolving a ticket." };
      }

      ticket.status = "Resolved";
      ticket.resolutionNote = resolutionNote.trim();
      ticket.resolvedBy = adminUser;
      ticket.resolvedAt = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + 
        ", " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

      if (!ticket.history) ticket.history = [];
      ticket.history.unshift({
        id: `TH-${Date.now().toString().slice(-4)}`,
        time: "Just now",
        user: adminUser,
        action: `Ticket marked as Resolved. Resolution note: "${resolutionNote.trim()}"`,
        type: "resolution"
      });

      this.logActivity(
        "Admin",
        adminUser,
        `ADMIN resolved support ticket ${ticketId} (${ticket.accountName}) · Resolution: ${resolutionNote.trim()}`,
        ticketId,
        {
          actorId: "ADMIN-01",
          recordType: "Support Ticket",
          details: { status: "Resolved", resolutionNote: resolutionNote.trim(), ticketId, account: ticket.accountName }
        }
      );
      this.save();
      return { success: true, ticket };
    }

    reopenSupportTicket(ticketId, reason = "", adminUser = "ADMIN (Limuel)") {
      const ticket = this.data.support.find(t => t.id === ticketId);
      if (!ticket) return { success: false, error: "Ticket not found" };

      const prevResolution = ticket.resolutionNote;
      ticket.status = "In Progress";

      if (!ticket.history) ticket.history = [];
      ticket.history.unshift({
        id: `TH-${Date.now().toString().slice(-4)}`,
        time: "Just now",
        user: adminUser,
        action: `Ticket reopened${reason ? ' · Reason: ' + reason.trim() : ''} (Previous resolution preserved: "${prevResolution || 'None'}")`,
        type: "reopen"
      });

      this.logActivity(
        "Admin",
        adminUser,
        `ADMIN reopened support ticket ${ticketId} (${ticket.accountName})${reason ? ' · Reason: ' + reason.trim() : ''}`,
        ticketId,
        {
          actorId: "ADMIN-01",
          recordType: "Support Ticket",
          details: { status: "In Progress", reason: reason.trim(), ticketId, account: ticket.accountName }
        }
      );
      this.save();
      return { success: true, ticket };
    }

    addTicketMessage(ticketId, text, sender = "ADMIN (Limuel)", role = "Admin") {
      const ticket = this.data.support.find(t => t.id === ticketId);
      if (!ticket) return { success: false, error: "Ticket not found" };
      if (!text || !text.trim()) return { success: false, error: "Message text cannot be empty." };

      if (!ticket.messages) ticket.messages = [];
      const msg = {
        id: `MSG-${Date.now().toString().slice(-4)}`,
        sender: sender,
        role: role,
        time: "Just now",
        text: text.trim()
      };
      ticket.messages.push(msg);

      if (!ticket.history) ticket.history = [];
      ticket.history.unshift({
        id: `TH-${Date.now().toString().slice(-4)}`,
        time: "Just now",
        user: sender,
        action: `Sent response to requester: "${text.trim().slice(0, 70)}${text.trim().length > 70 ? '...' : ''}"`,
        type: "message"
      });

      // If open, advance to In Progress
      if (ticket.status === "Open" && role === "Admin") {
        ticket.status = "In Progress";
        ticket.history.unshift({
          id: `TH-${Date.now().toString().slice(-4)}-st`,
          time: "Just now",
          user: sender,
          action: "Status automatically updated to In Progress following admin response",
          type: "status"
        });
      }

      this.logActivity(
        role === "Admin" ? "Admin" : (ticket.accountType || role),
        sender,
        `${role === "Admin" ? "ADMIN" : role} replied to support ticket ${ticketId} (${ticket.accountName}): "${text.trim().slice(0, 60)}..."`,
        ticketId,
        {
          actorId: role === "Admin" ? "ADMIN-01" : (ticket.accountId || role),
          recordType: "Support Ticket",
          details: { ticketId, sender, textPreview: text.trim().slice(0, 80) }
        }
      );
      this.save();
      return { success: true, message: msg, ticket };
    }

    updateSupportTicket(ticketId, newStatus, priority, note, assignedTo, adminUser = "ADMIN (Limuel)") {
      const ticket = this.data.support.find(t => t.id === ticketId);
      if (!ticket) return { success: false, error: "Ticket not found" };

      if (!ticket.history) ticket.history = [];

      const statusChanged = newStatus && newStatus !== ticket.status;
      const priorityChanged = priority && priority !== ticket.priority;
      const assignedChanged = assignedTo && assignedTo !== ticket.assignedTo;

      if (newStatus === "Resolved") {
        return this.resolveSupportTicket(ticketId, note, adminUser);
      }

      if (ticket.status === "Resolved" && newStatus && newStatus !== "Resolved") {
        return this.reopenSupportTicket(ticketId, note, adminUser);
      }

      if (statusChanged) {
        const oldSt = ticket.status;
        ticket.status = newStatus;
        ticket.history.unshift({
          id: `TH-${Date.now().toString().slice(-4)}`,
          time: "Just now",
          user: adminUser,
          action: `Status changed from "${oldSt}" to "${newStatus}"`,
          type: "status"
        });
      }

      if (priorityChanged) {
        const oldP = ticket.priority;
        ticket.priority = priority;
        ticket.history.unshift({
          id: `TH-${Date.now().toString().slice(-4)}`,
          time: "Just now",
          user: adminUser,
          action: `Priority adjusted from "${oldP}" to "${priority}"`,
          type: "priority"
        });
      }

      if (assignedChanged) {
        const oldAssigned = ticket.assignedTo;
        ticket.assignedTo = assignedTo;
        ticket.history.unshift({
          id: `TH-${Date.now().toString().slice(-4)}`,
          time: "Just now",
          user: adminUser,
          action: `Assigned admin updated to ${assignedTo} (was ${oldAssigned || 'Unassigned'})`,
          type: "assignment"
        });
      }

      if (note && note.trim()) {
        ticket.notes = note.trim();
        ticket.history.unshift({
          id: `TH-${Date.now().toString().slice(-4)}`,
          time: "Just now",
          user: adminUser,
          action: `Internal note recorded: "${note.trim()}"`,
          type: "note"
        });
      }

      this.logActivity(
        "Admin",
        adminUser,
        `ADMIN updated support ticket ${ticketId} (${ticket.accountName})`,
        ticketId,
        {
          actorId: "ADMIN-01",
          recordType: "Support Ticket",
          details: { ticketId, statusChanged, priorityChanged, assignedChanged, newStatus, priority, assignedTo }
        }
      );
      this.save();
      return { success: true, ticket };
    }

    getTicketActivity(ticketId) {
      const ticket = this.data.support.find(t => t.id === ticketId);
      const ticketHistory = (ticket && ticket.history) ? ticket.history.map(h => ({
        time: h.time,
        role: (h.user && h.user.includes("ADMIN")) ? "Admin" : (ticket.accountType || "User"),
        user: h.user,
        action: h.action,
        record: ticketId
      })) : [];

      const globalLogs = this.data.activity.filter(a => a.record === ticketId || (a.action && a.action.includes(ticketId)));
      
      const combined = [...ticketHistory];
      globalLogs.forEach(g => {
        if (!combined.some(c => c.action === g.action)) {
          combined.push(g);
        }
      });
      return combined;
    }

    // --- ACCOUNT WORKFLOWS ---
    updateAccountStatus(type, id, newStatus, reason = "") {
      let list = [];
      if (type === "customers") list = this.data.customers;
      else if (type === "financers") list = this.data.financers;
      else if (type === "installers") list = this.data.installers;
      else if (type === "merchants") list = this.data.merchants;
      else if (type === "engineers") list = this.data.engineers || [];

      const acc = list.find(a => a.id === id);
      if (!acc) return false;

      const oldStatus = acc.status;
      acc.status = newStatus;

      const roleName = type.slice(0, -1).toUpperCase();
      let actionVerb = "updated status of";
      if (newStatus === "Active") actionVerb = oldStatus === "Suspended" ? "restored" : "activated";
      else if (newStatus === "Inactive") actionVerb = "deactivated";
      else if (newStatus === "Suspended") actionVerb = "suspended";
      else if (newStatus === "Pending Review") actionVerb = "flagged for review";

      const note = reason ? ` — Reason: ${reason}` : "";
      this.logActivity(
        "Admin",
        "ADMIN (Limuel)",
        `ADMIN ${actionVerb} ${roleName} ${acc.id} (${acc.name})${note}`,
        acc.id,
        {
          actorId: "ADMIN-01",
          recordType: `${roleName.charAt(0) + roleName.slice(1).toLowerCase()} Account`,
          details: { accountType: type, prevStatus: oldStatus, newStatus, reason }
        }
      );
      this.save();
      return acc.status;
    }

    toggleAccountStatus(type, id) {
      let list = [];
      if (type === "customers") list = this.data.customers;
      else if (type === "financers") list = this.data.financers;
      else if (type === "installers") list = this.data.installers;
      else if (type === "merchants") list = this.data.merchants;
      else if (type === "engineers") list = this.data.engineers || [];

      const acc = list.find(a => a.id === id);
      if (!acc) return false;
      const target = acc.status === "Active" ? "Inactive" : "Active";
      return this.updateAccountStatus(type, id, target);
    }

    getAccountActivity(id) {
      if (!id) return [];
      return this.data.activity.filter(a => 
        a.record === id || 
        (a.action && a.action.includes(id))
      );
    }

    generateProjectIds() {
      const records = [...this.data.applications, ...this.data.customers];
      const next = (prefix, field) => {
        const values = records.map(r => Number(String(r[field] || '').replace(prefix, ''))).filter(Number.isFinite);
        return `${prefix}${Math.max(1000, ...values) + 1}`;
      };
      const usedHsIds = new Set(records.map(r => r.hsId));
      const start = crypto.getRandomValues(new Uint32Array(1))[0] % 90000;
      for (let offset = 0; offset < 90000; offset++) {
        const hsId = `HS-${10000 + (start + offset) % 90000}`;
        if (!usedHsIds.has(hsId)) return { appId: next('APP-', 'id'), hsId };
      }
      throw new Error('No five-digit HS IDs are available.');
    }

    getNextEngineerId() {
      let maxNum = 0;
      (this.data.engineers || []).forEach(e => {
        const match = e.id && e.id.match(/^ENG-(\d+)$/);
        if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
      });
      return `ENG-${String(maxNum + 1).padStart(3, "0")}`;
    }

    createAccount(payload) {
      // Reload before allocating IDs and checking conversion to avoid stale-tab duplicates.
      this.data = this.load();
      const inquiry = payload.inquiryId ? this.getInquiries().find(i => i.id === payload.inquiryId) : null;
      const fail = error => ({ success: false, error });
      if (payload.inquiryId && !inquiry) return fail('The linked inquiry no longer exists.');
      if ((!payload.role || payload.role === 'Customer') && inquiry?.customerId) return fail('This inquiry already has a customer account.');
      if ((!payload.role || payload.role === 'Customer') && this.data.customers
        .some(a => a.email?.toLowerCase() === (payload.email || '').trim().toLowerCase())) {
        return fail('An account with this email already exists.');
      }
      if ((!payload.role || payload.role === 'Customer') && (!payload.system?.trim() || !payload.projectType?.trim())) {
        return fail('Select a purchased Hello Solar model and project type.');
      }
      // Partner inquiry → account: must be approved, unconverted and for the same partner type
      const partnerInquiry = payload.partnerInquiryId ? this.getInquiries().find(i => i.id === payload.partnerInquiryId) : null;
      if (payload.partnerInquiryId) {
        if (!this.isPartnerInquiry(partnerInquiry)) return fail('The linked partner inquiry no longer exists.');
        if (partnerInquiry.inquiryStatus !== 'Approved') return fail('Approve the partner inquiry before creating an account.');
        if (partnerInquiry.accountCreated) return fail(`This partner inquiry already has an account (${partnerInquiry.linkedAccountId || 'created'}).`);
        if (payload.role !== partnerInquiry.partnerType) return fail(`This inquiry is for a ${partnerInquiry.partnerType} account.`);
      }
      const snapshot = JSON.stringify(this.data);
      const role = payload.role || "Customer";
      const firstName = (payload.firstName || "").trim();
      const lastName = (payload.lastName || "").trim();
      const fullName = `${firstName} ${lastName}`.trim() || payload.name || "Unnamed Account";
      const email = (payload.email || "").trim();
      const phone = (payload.phone || "").trim();
      const status = payload.status || "Active";
      const companyName = (payload.companyName || "").trim();
      const location = (payload.location || "").trim() || "Philippines";
      const password = payload.password || "TemporaryPass123!";
      const notes = (payload.notes || "").trim();
      const today = new Date().toISOString().split("T")[0];

      let newRecord = null;
      let id = "";
      let tabKey = "customers";

      if (role === "Customer") {
        tabKey = "customers";
        let maxNum = 1000;
        (this.data.customers || []).forEach(c => {
          const match = c.id && c.id.match(/CUS-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
        id = `CUS-${maxNum + 1}`;
        const activationToken = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
          ? crypto.randomUUID()
          : ("act_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36));
        const activationLink = `https://portal.hellosolar.ph/activate?token=${activationToken}&id=${id}&email=${encodeURIComponent(email)}`;
        const invitationStatus = payload.invitationStatus || (payload.status === "Active" && !payload.inquiryId ? "Active" : "Sent");
        const inquiryPayment = inquiry?.paymentPreference === "Not specified" ? "" : inquiry?.paymentPreference;
        const rawPayment = (payload.paymentType || inquiryPayment || payload.paymentPreference || "Full Payment").trim();
        const isFullPayment = rawPayment.toLowerCase().includes("full");
        const paymentType = isFullPayment ? "Full Payment" : "Installment";

        newRecord = {
          id,
          name: fullName,
          email,
          phone,
          location: location || "Philippines",
          system: payload.system || "Pending System",
          status,
          ...this.generateProjectIds(),
          inquiryId: inquiry?.id || null,
          purchasedModel: payload.system.trim(),
          projectType: payload.projectType.trim(),
          paymentType,
          paymentPreference: paymentType,
          systemStatus: 'Waiting for Installer',
          assignedInstallerId: null,
          joined: today,
          password,
          invitationStatus,
          activationToken,
          activationLink,
          activationEmailSentAt: new Date().toISOString(),
          hasSetPassword: false,
          notes
        };
        if (!Array.isArray(this.data.customers)) this.data.customers = [];
        if (/^APP-\d+$/.test(payload.appId || '') && !this.data.applications.some(a => a.id === payload.appId)) newRecord.appId = payload.appId;
        if (/^HS-\d{5}$/.test(payload.hsId || '') && ![...this.data.customers, ...this.data.applications].some(a => a.hsId === payload.hsId)) newRecord.hsId = payload.hsId;
        this.data.customers.unshift(newRecord);

        // Rules:
        // If Full Payment -> Current Stage = Payment Required, Financer = Not Required, Installer = Unassigned
        // If Installment -> Current Stage = Financing Review, Financer = Pending/Assigned, Installer = Unassigned
        // Remove generic Submitted for this normal customer flow.
        const stage = isFullPayment ? "Payment Required" : "Financing Review";
        const pricing = resolvePricing(payload, inquiry, isFullPayment);
        const financer = isFullPayment ? "Not Required" : (payload.financer || "Pending");
        const installer = "Unassigned";

        const application = {
          id: newRecord.appId, customerId: id, customer: fullName, email, phone, location,
          hsId: newRecord.hsId, inquiryId: newRecord.inquiryId,
          inquirySnapshot: inquiry ? JSON.parse(JSON.stringify(inquiry)) : null,
          system: newRecord.system, purchasedModel: newRecord.purchasedModel,
          projectType: newRecord.projectType, paymentType, paymentPreference: paymentType,
          systemStatus: 'Waiting for Installer',
          dispatchStatus: 'New Application', assignedInstallerId: null, declinedInstallerIds: [],
          stage, installer, installerType: 'Partner Installer',
          financer, financerId: null,
          ...pricing,
          docs: isFullPayment ? '1/1' : '0/5',
          paymentStatus: isFullPayment ? 'Payment Required' : 'Financing Review',
          nextDue: 'N/A',
          panels: 'Pending Assessment', inverter: 'Pending Assessment',
          invitationStatus, activationLink,
          updated: 'Just now', createdAt: new Date().toISOString(), notes
        };
        if (!Array.isArray(this.data.applications)) this.data.applications = [];
        this.data.applications.unshift(application);
        if (inquiry) Object.assign(inquiry, {
          customerId: id, appId: newRecord.appId, hsId: newRecord.hsId,
          purchasedModel: newRecord.purchasedModel, customerResponse: 'Proceed', inquiryStatus: 'Proceed',
          invitationStatus, convertedAt: application.createdAt
        });

      } else if (role === "Installer") {
        tabKey = "installers";
        let maxNum = 0;
        (this.data.installers || []).forEach(i => {
          const match = i.id && i.id.match(/INS-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
        id = `INS-${String(maxNum + 1).padStart(3, "0")}`;
        const displayName = companyName || fullName;
        newRecord = {
          id,
          name: displayName,
          type: payload.installerType || "Partner",
          contact: fullName,
          email,
          phone,
          activeJobs: 0,
          completedJobs: 0,
          rating: 5.0,
          status,
          location: location || "Metro Manila & Visayas",
          password,
          notes
        };
        if (!Array.isArray(this.data.installers)) this.data.installers = [];
        this.data.installers.unshift(newRecord);

      } else if (role === "Financer") {
        tabKey = "financers";
        let maxNum = 0;
        (this.data.financers || []).forEach(f => {
          const match = f.id && f.id.match(/FIN-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
        id = `FIN-${String(maxNum + 1).padStart(3, "0")}`;
        const institutionName = companyName || `${fullName} Financing`;
        newRecord = {
          id,
          name: institutionName,
          contact: fullName,
          email,
          phone,
          activeLoans: 0,
          totalFunded: 0,
          status,
          category: payload.category || "Commercial Solar Loan",
          password,
          notes,
          // Contract is configured later from Accounts → Financers; until then Hello Solar owns funding/revenue
          contractTermMonths: null,
          annualRate: null,
          contractStartDate: null,
          contractEndDate: null,
          contractStatusOverride: null
        };
        if (!Array.isArray(this.data.financers)) this.data.financers = [];
        this.data.financers.unshift(newRecord);
        this.syncFinancerContracts({ silent: true });

      } else if (role === "Engineer") {
        // Direct Installation Engineer — internal account, kept separate from partner installers
        tabKey = "engineers";
        if (!Array.isArray(this.data.engineers)) this.data.engineers = [];
        const requestedId = (payload.engineerId || "").trim().toUpperCase();
        if (requestedId && !/^ENG-\d{3,}$/.test(requestedId)) return fail('Engineer ID must follow the format ENG-001.');
        if (requestedId && this.data.engineers.some(e => e.id === requestedId)) return fail(`Engineer ID ${requestedId} is already in use.`);
        if (this.data.engineers.some(e => (e.email || "").toLowerCase() === email.toLowerCase())) {
          return fail('An engineer account with this email already exists.');
        }
        id = requestedId || this.getNextEngineerId();
        newRecord = {
          id,
          name: fullName,
          email,
          phone,
          role: "Direct Installation Engineer",
          team: this.data.settings?.directInstallTeam || "Hello Solar Internal Team",
          status: payload.status || "Pending Activation",
          joined: today,
          password,
          notes
        };
        this.data.engineers.unshift(newRecord);

      } else if (role === "Merchant") {
        tabKey = "merchants";
        let maxNum = 0;
        (this.data.merchants || []).forEach(m => {
          const match = m.id && m.id.match(/MER-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
        id = `MER-${String(maxNum + 1).padStart(3, "0")}`;
        const merchantName = companyName || `${fullName} Solar Supplies`;
        newRecord = {
          id,
          name: merchantName,
          contact: fullName,
          email,
          phone,
          projects: 0,
          transactions: 0,
          volume: 0,
          status,
          category: payload.category || "Solar Equipment & PV Modules",
          password,
          notes
        };
        if (!Array.isArray(this.data.merchants)) this.data.merchants = [];
        this.data.merchants.unshift(newRecord);
      }

      // Link partner inquiry ↔ account. Saved together with the account below (rolled back if the save fails),
      // so accountCreated is true only when creation succeeds.
      if (partnerInquiry && newRecord) {
        newRecord.partnerInquiryId = partnerInquiry.id;
        if (partnerInquiry.financerProposal && role === "Financer") newRecord.proposedContract = { ...partnerInquiry.financerProposal };
        partnerInquiry.accountCreated = true;
        partnerInquiry.linkedAccountId = id;
        partnerInquiry.linkedAccountType = tabKey;
        partnerInquiry.accountCreatedAt = new Date().toISOString();
      }

      this.logActivity(
        "Admin",
        "ADMIN (Limuel)",
        `ADMIN created new ${role} account ${id} (${newRecord.name || fullName})`,
        id,
        {
          actorId: "ADMIN-01",
          recordType: `${role} Account`,
          details: { role, id, name: newRecord.name, email, phone, status, tabKey },
          deferSave: true
        }
      );

      try {
        STORE.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (error) {
        this.data = JSON.parse(snapshot);
        return fail('Account could not be saved. Check browser storage and try again.');
      }
      if (partnerInquiry) this.markPartnerQueueRecord(partnerInquiry.id, { accountCreated: true, linkedAccountId: id, inquiryStatus: partnerInquiry.inquiryStatus });
      window.HELLO_SOLAR_DATA = this.data;
      return { success: true, account: newRecord, role, id, tabKey, activationLink: newRecord?.activationLink || null };
    }

    // --- APPLICATIONS WORKFLOWS ---
    getApplications() {
      if (!this.data.applications || !Array.isArray(this.data.applications)) {
        this.data.applications = JSON.parse(JSON.stringify(SEED_DATA.applications || []));
      }
      this.data.applications.forEach(app => {
        if (!app.paymentType) {
          const isFull = (app.paymentPreference || "").toLowerCase().includes("full") || app.financer === "Not Required";
          app.paymentType = isFull ? "Full Payment" : "Installment";
        }
        if (app.id === "APP-1031" && !app.uploadedReceipt) {
          app.uploadedReceipt = "bdo_transfer_receipt_app1031.png";
          app.receiptUploadedAt = "2026-09-28";
          app.receiptBank = "BDO Unibank Direct Transfer";
          app.receiptReference = "BDO-TXN-88219304";
          app.receiptAmount = 245000;
          if (app.paymentStatus === "Payment Required") {
            app.paymentStatus = "Verification Required";
          }
        }
      });
      return this.data.applications;
    }

    // --- CONTACT INQUIRIES WORKFLOWS ---
    // --- PARTNER INQUIRIES (Financer / Installer / Merchant from Landing Page → Contact Us) ---
    // Imports new records from the shared queue written by the landing page (HELLO_SOLAR_PARTNER_INQUIRIES).
    // Imported once by id; Super Admin data is authoritative afterwards. Backend-ready: replace the queue read
    // with an API fetch returning the same record shape.
    syncPartnerInquiries() {
      if (IS_API) return 0; // api mode: landing inquiries are created on the backend (POST /public/inquiries)
      let queue = [];
      try {
        queue = JSON.parse(localStorage.getItem(PARTNER_INQUIRY_KEY) || "[]");
      } catch (err) {
        queue = [];
      }
      if (!Array.isArray(queue) || !queue.length) return 0;
      const existing = new Set(this.data.inquiries.map(i => i.id));
      let added = 0;
      queue.forEach(rec => {
        if (!rec || !rec.id || existing.has(rec.id) || !PARTNER_TYPES.includes(rec.partnerType)) return;
        this.data.inquiries.unshift({
          ...rec,
          isPartnerInquiry: true,
          name: rec.name || `${rec.firstName || ""} ${rec.lastName || ""}`.trim(),
          category: `${rec.partnerType} Partner`,
          subject: rec.subject || `${rec.partnerType} Partnership Inquiry`,
          status: rec.status || "Unread",
          inquiryStatus: rec.inquiryStatus || "Pending Review",
          accountCreated: rec.accountCreated === true
        });
        existing.add(rec.id);
        added++;
      });
      if (added) this.save();
      return added;
    }

    // Mirror status back to the shared queue record (best effort; Super Admin data stays authoritative)
    markPartnerQueueRecord(inquiryId, fields) {
      if (IS_API) return;
      try {
        const queue = JSON.parse(localStorage.getItem(PARTNER_INQUIRY_KEY) || "[]");
        if (!Array.isArray(queue)) return;
        const rec = queue.find(r => r && r.id === inquiryId);
        if (!rec) return;
        Object.assign(rec, fields);
        localStorage.setItem(PARTNER_INQUIRY_KEY, JSON.stringify(queue));
      } catch (err) { /* queue is optional */ }
    }

    // --- CUSTOMER INQUIRIES (Landing Page → Request Solar Proposal / Contact Us → Customer) ---
    // Imports new records from HELLO_SOLAR_CUSTOMER_INQUIRIES once by id (no duplicates on repeated sync).
    // Records arrive as "Not Sent" so the existing confirmation → Proceed → Create Customer Account flow applies.
    syncCustomerInquiries() {
      if (IS_API) return 0; // api mode: landing inquiries are created on the backend (POST /public/inquiries)
      let queue = [];
      try {
        queue = JSON.parse(localStorage.getItem(CUSTOMER_INQUIRY_KEY) || "[]");
      } catch (err) {
        queue = [];
      }
      if (!Array.isArray(queue) || !queue.length) return 0;
      const existing = new Set(this.data.inquiries.map(i => i.id));
      let added = 0;
      // Queue is newest-first; import oldest-first so the newest ends up on top
      queue.slice().reverse().forEach(rec => {
        if (!rec || !rec.id || existing.has(rec.id) || rec.inquiryType !== "Customer") return;
        // Never guess: Contact Us customers stay "Not specified" until they choose a payment type
        const payment = rec.paymentPreference || "Not specified";
        this.data.inquiries.unshift({
          ...rec,
          name: rec.name || `${rec.firstName || ""} ${rec.lastName || ""}`.trim(),
          email: rec.email || "",
          phone: rec.phone || "",
          location: rec.location || "Philippines",
          category: rec.category || "Residential Solar",
          package: rec.package || "Custom Solar Package",
          selectedSolarModel: rec.selectedSolarModel || rec.package || "Custom Solar Package",
          electricBill: rec.electricBill || "Not provided",
          paymentPreference: payment,
          subject: rec.subject || "Solar Inquiry",
          message: rec.message || "",
          status: rec.status || "Unread",
          customerResponse: rec.customerResponse || "Awaiting Response",
          inquiryStatus: rec.inquiryStatus || "Not Sent",
          confirmationEmailSentAt: rec.confirmationEmailSentAt || null,
          reply: null
        });
        existing.add(rec.id);
        added++;
      });
      if (added) this.save();
      return added;
    }

    isPartnerInquiry(inq) {
      return !!inq && (inq.isPartnerInquiry === true || inq.inquiryType === "Partner") && PARTNER_TYPES.includes(inq.partnerType);
    }

    approvePartnerInquiry(inquiryId, adminUser = "ADMIN (Limuel)") {
      const inq = (this.data.inquiries || []).find(i => i.id === inquiryId);
      if (!this.isPartnerInquiry(inq)) return { success: false, error: "Partner inquiry not found." };
      if (inq.inquiryStatus === "Approved") return { success: false, error: "This partner inquiry is already approved." };
      inq.inquiryStatus = "Approved";
      if (inq.status === "Unread") inq.status = "Read";
      inq.approvedAt = new Date().toISOString();
      inq.approvedBy = adminUser;
      this.markPartnerQueueRecord(inq.id, { inquiryStatus: "Approved" });
      this.logActivity("Admin", adminUser,
        `ADMIN approved ${inq.partnerType} partner inquiry ${inq.id} (${inq.name})`,
        inq.id, {
          recordType: "Partner Inquiry", deferSave: true,
          details: { inquiryId: inq.id, partnerType: inq.partnerType, email: inq.email, financerProposal: inq.financerProposal || null, status: "Approved" }
        });
      this.save();
      return { success: true, inquiry: inq };
    }

    getInquiries() {
      if (!this.data.inquiries || !Array.isArray(this.data.inquiries)) {
        this.data.inquiries = JSON.parse(JSON.stringify(SEED_DATA.inquiries || []));
      }
      this.syncPartnerInquiries();
      this.syncCustomerInquiries();
      this.data.inquiries.forEach(inq => {
        if (!inq.confirmationToken && !IS_API) { // api mode: the backend issues confirmation tokens
          inq.confirmationToken = "token_" + inq.id.toLowerCase().replace(/[^a-z0-9]/g, '') + "_" + (inq.email ? inq.email.split('@')[0].replace(/[^a-z0-9]/g, '').slice(0, 4) : 'sec') + '9a';
        }
      });
      return this.data.inquiries;
    }

    // Default text for the message Super Admin sends with the Inquiry Confirmation link.
    getDefaultInquiryConfirmationMessage(inq) {
      const first = String(inq?.name || inq?.firstName || "there").trim() || "there";
      const model = inq?.selectedSolarModel || inq?.package || "your selected Hello Solar system";
      return `Hi ${first},\n\nThank you for your inquiry about ${model}. We have reviewed your details and are ready to prepare your Hello Solar project.\n\nPlease use the link below to confirm whether you would like to proceed.\n\nHello Solar Team`;
    }

    // Saves the exact message that is sent with the Inquiry Confirmation link (no status change).
    saveInquiryConfirmationMessage(inquiryId, message, adminUser = "ADMIN (Limuel)") {
      const inq = (this.data.inquiries || []).find(i => i.id === inquiryId);
      if (!inq) return { success: false, error: "Inquiry not found" };
      const text = String(message ?? "").replace(/\r\n/g, "\n").trim();
      if (!text) return { success: false, error: "Message cannot be empty." };
      if (text.length > 2000) return { success: false, error: "Message must be 2,000 characters or fewer." };
      inq.confirmationMessage = text;
      inq.confirmationMessageUpdatedAt = new Date().toISOString();
      inq.confirmationMessageUpdatedBy = adminUser;
      this.logActivity("Admin", adminUser, `ADMIN saved the inquiry confirmation message for ${inquiryId} (${inq.name})`, inquiryId, {
        actorId: "ADMIN-01", recordType: "Contact Inquiry", deferSave: true,
        details: { inquiryId, messageLength: text.length }
      });
      this.save();
      return { success: true, inquiry: inq };
    }

    sendInquiryConfirmationEmail(inquiryId, adminUser = "ADMIN (Limuel)", message, options = {}) {
      const inq = (this.data.inquiries || []).find(i => i.id === inquiryId);
      if (!inq) return { success: false, error: "Inquiry not found" };
      if (message !== undefined && message !== null) {
        const text = String(message).replace(/\r\n/g, "\n").trim();
        if (!text) return { success: false, error: "Message cannot be empty." };
        if (text.length > 2000) return { success: false, error: "Message must be 2,000 characters or fewer." };
        inq.confirmationMessage = text;
        inq.confirmationMessageUpdatedAt = new Date().toISOString();
        inq.confirmationMessageUpdatedBy = adminUser;
      } else if (!inq.confirmationMessage) {
        inq.confirmationMessage = this.getDefaultInquiryConfirmationMessage(inq);
      }
      const now = new Date();
      inq.inquiryStatus = "Awaiting Response";
      inq.customerResponse = "Awaiting Response";
      inq.confirmationEmailSentAt = now.toISOString();
      if (!inq.confirmationToken && !IS_API) { // api mode: the backend issues the token and sends the email
        inq.confirmationToken = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
          ? crypto.randomUUID()
          : ("cnf_" + Math.random().toString(36).slice(2, 10));
      }
      this.logActivity(
        "Admin",
        adminUser,
        `ADMIN sent inquiry confirmation email to ${inq.name} (${inq.email}) for inquiry ${inquiryId}`,
        inquiryId,
        {
          actorId: "ADMIN-01",
          recordType: "Contact Inquiry",
          details: { inquiryId, recipient: inq.email, sender: inq.name, status: "Awaiting Response", message: inq.confirmationMessage, includesConfirmationLink: !!options.confirmationUrl }
        }
      );
      // Customer email payload (ready for a mail backend): the saved message plus the secure confirmation link
      if (options.confirmationUrl) {
        inq.confirmationEmail = {
          to: inq.email,
          subject: "Please confirm your Hello Solar inquiry",
          body: `${inq.confirmationMessage}\n\nOpen your Inquiry Confirmation page to choose Proceed or Not Proceeding:\n${options.confirmationUrl}`,
          confirmationUrl: options.confirmationUrl,
          sentAt: inq.confirmationEmailSentAt,
          sentBy: adminUser
        };
      }
      this.save();
      return { success: true, inquiry: inq };
    }

    updateInquiryStatus(inquiryId, newStatus, note = "", adminUser = "ADMIN (Limuel)") {
      const inq = (this.data.inquiries || []).find(i => i.id === inquiryId);
      if (!inq) return false;
      const prevStatus = inq.status;
      inq.status = newStatus;
      if (newStatus === "Replied") {
        const now = new Date();
        inq.reply = {
          repliedAt: formatExactAuditTimestamp(now),
          repliedBy: adminUser,
          replyNote: note || "Replied via administrative communication channel."
        };
      } else if (newStatus === "Unread") {
        inq.reply = null;
      }
      this.logActivity(
        "Admin",
        adminUser,
        `ADMIN marked contact inquiry ${inquiryId} (${inq.name}) as "${newStatus}"`,
        inquiryId,
        {
          actorId: "ADMIN-01",
          recordType: "Contact Inquiry",
          details: { inquiryId, prevStatus, newStatus, sender: inq.name, note }
        }
      );
      this.save();
      return inq;
    }

    replyInquiry(inquiryId, replyNote, adminUser = "ADMIN (Limuel)") {
      return this.updateInquiryStatus(inquiryId, "Replied", replyNote, adminUser);
    }

    updateInquiryCustomerResponse(inquiryId, customerResponse, adminUser = "ADMIN (Limuel)") {
      const inq = (this.data.inquiries || []).find(i => i.id === inquiryId);
      if (!inq) return false;
      const prevResponse = inq.customerResponse || "Awaiting Response";
      if (customerResponse === "Proceed" || customerResponse === "Proceed with Application") {
        inq.customerResponse = "Proceed";
        inq.inquiryStatus = "Proceed";
      } else if (customerResponse === "Not Proceed" || customerResponse === "Not Proceeding") {
        inq.customerResponse = "Not Proceed";
        inq.inquiryStatus = "Not Proceeding";
      } else if (customerResponse === "Not Sent") {
        inq.customerResponse = "Awaiting Response";
        inq.inquiryStatus = "Not Sent";
      } else {
        inq.customerResponse = "Awaiting Response";
        inq.inquiryStatus = "Awaiting Response";
      }
      inq.customerRespondedAt = new Date().toISOString();
      this.logActivity(
        "Admin",
        adminUser,
        `Customer response for inquiry ${inquiryId} (${inq.name}) updated to "${inq.inquiryStatus}"`,
        inquiryId,
        {
          actorId: "ADMIN-01",
          recordType: "Contact Inquiry",
          details: { inquiryId, prevResponse, newResponse: inq.customerResponse, inquiryStatus: inq.inquiryStatus, customer: inq.name }
        }
      );
      this.save();
      return inq;
    }

    overrideInquiryCustomerResponse(inquiryId, newStatus, reason = "", adminUser = "ADMIN (Limuel)") {
      const inq = (this.data.inquiries || []).find(i => i.id === inquiryId);
      if (!inq) return false;
      const prevResponse = inq.customerResponse || "Awaiting Response";
      const prevStatus = inq.inquiryStatus || "Not Sent";

      if (newStatus === "Proceed" || newStatus === "Proceed with Application") {
        inq.customerResponse = "Proceed";
        inq.inquiryStatus = "Proceed";
      } else if (newStatus === "Not Proceed" || newStatus === "Not Proceeding") {
        inq.customerResponse = "Not Proceed";
        inq.inquiryStatus = "Not Proceeding";
      } else if (newStatus === "Not Sent") {
        inq.customerResponse = "Awaiting Response";
        inq.inquiryStatus = "Not Sent";
      } else {
        inq.customerResponse = "Awaiting Response";
        inq.inquiryStatus = "Awaiting Response";
      }

      inq.manualOverride = {
        overriddenAt: new Date().toISOString(),
        overriddenBy: adminUser,
        reason: reason || "Manual administrator status override"
      };

      this.logActivity(
        "Admin",
        adminUser,
        `ADMIN manually overrode inquiry ${inquiryId} (${inq.name}) status to "${inq.inquiryStatus}". Reason: "${reason || 'No reason specified'}"`,
        inquiryId,
        {
          actorId: "ADMIN-01",
          recordType: "Contact Inquiry",
          details: { inquiryId, prevStatus, prevResponse, newResponse: inq.customerResponse, inquiryStatus: inq.inquiryStatus, reason, overriddenBy: adminUser }
        }
      );
      this.save();
      return inq;
    }

    // Prepares the customer activation email (with the internal activation link) for backend delivery.
    // Does not change invitation/account status — activation still happens via activateCustomerAccount().
    queueActivationEmail(customerId, adminUser = "ADMIN (Limuel)") {
      const cust = (this.data.customers || []).find(c => c.id === customerId);
      if (!cust) return { success: false, error: "Customer not found." };
      if (cust.invitationStatus === "Active") return { success: false, error: "This account is already active." };
      if (!cust.activationLink) return { success: false, error: "No activation link exists for this account." };
      const now = new Date().toISOString();
      cust.activationEmail = {
        to: cust.email,
        subject: "Activate your Hello Solar account",
        body: `Hi ${cust.name},\n\nYour Hello Solar customer account (${cust.id}) is ready. Open the link below to set your password and activate your account:\n${cust.activationLink}\n\nHello Solar Team`,
        activationLink: cust.activationLink,
        status: "Queued",
        queuedAt: now,
        queuedBy: adminUser
      };
      this.logActivity("Admin", adminUser, `ADMIN queued the activation email for ${cust.id} (${cust.name}) — awaiting email service delivery`, cust.id, {
        actorId: "ADMIN-01", recordType: "Customer Account", deferSave: true,
        details: { customerId: cust.id, recipient: cust.email, status: "Queued" }
      });
      this.save();
      return { success: true, customer: cust };
    }

    activateCustomerAccount(customerId, newPassword = null) {
      const cust = (this.data.customers || []).find(c => c.id === customerId);
      if (!cust) return { success: false, error: "Customer not found" };
      cust.invitationStatus = "Active";
      cust.status = "Active";
      cust.hasSetPassword = true;
      cust.activatedAt = new Date().toISOString();
      if (newPassword) cust.password = newPassword;
      this.logActivity(
        "Customer",
        cust.name,
        `Customer ${cust.id} (${cust.name}) activated portal account and set password`,
        cust.id,
        {
          actorId: cust.id,
          recordType: "Customer Account",
          details: { customerId: cust.id, status: "Active", invitationStatus: "Active" }
        }
      );
      this.save();
      return { success: true, customer: cust };
    }

    // --- FINANCER CONTRACT MANAGEMENT ---
    // Ownership rule: while a financer contract is Active, the financer owns funding/revenue of its financed
    // applications. Outside the active window (pending start, expired, terminated, none), ownership is Hello Solar.
    static get HELLO_SOLAR_OWNER() { return { name: "Hello Solar", id: "HELLO-SOLAR" }; }

    static todayISO(asOf) {
      const d = asOf ? new Date(asOf) : new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    static addMonthsISO(startISO, months) {
      const [y, m, d] = String(startISO).split("-").map(Number);
      if (!y || !m || !d || !Number.isFinite(Number(months))) return null;
      const totalMonths = (m - 1) + Number(months);
      const ty = y + Math.floor(totalMonths / 12);
      const tm = ((totalMonths % 12) + 12) % 12;
      const lastDay = new Date(ty, tm + 1, 0).getDate();
      return `${ty}-${String(tm + 1).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
    }

    getFinancerContract(financer, asOf) {
      const hs = HelloSolarStore.HELLO_SOLAR_OWNER;
      const today = HelloSolarStore.todayISO(asOf);
      const start = financer?.contractStartDate || null;
      const end = financer?.contractEndDate || null;
      let status;
      if (!start || !end) status = "No Contract";
      else if (financer.contractStatusOverride === "Terminated") status = "Terminated";
      else if (today < start) status = "Pending Start";
      else if (today >= end) status = "Expired";
      else status = "Active";
      const isFinancerOwned = status === "Active";
      const daysRemaining = isFinancerOwned
        ? Math.ceil((new Date(end + "T00:00:00") - new Date(today + "T00:00:00")) / 86400000)
        : null;
      return {
        financerId: financer?.id || null,
        termMonths: financer?.contractTermMonths ?? null,
        annualRate: financer?.annualRate ?? null,
        startDate: start,
        endDate: end,
        status,
        daysRemaining,
        ownerName: isFinancerOwned ? financer.name : hs.name,
        ownerId: isFinancerOwned ? financer.id : hs.id,
        ownerType: isFinancerOwned ? "Financer" : "Hello Solar"
      };
    }

    // Funding view for a single application (used by Payments). Reuses getFinancerContract — no separate
    // ownership rules. The original financer (app.financer / app.financerId) is never overwritten, so it stays
    // linked for history after ownership transfers to Hello Solar.
    getApplicationFunding(app, asOf) {
      const isFull = (app?.paymentType || "").toLowerCase().includes("full") || app?.financer === "Not Required";
      const name = (app?.financer || "").toLowerCase();
      const financer = isFull ? null : (this.data.financers || []).find(f =>
        (app.financerId && f.id === app.financerId) || (name && f.name.toLowerCase() === name)) || null;
      const contract = financer ? this.getFinancerContract(financer, asOf) : null;
      return {
        isFinanced: !isFull,
        financerName: financer ? financer.name : (isFull ? null : (app?.financer || null)),
        financerId: financer ? financer.id : (app?.financerId || null),
        fundedAmount: Number(app?.amount) || 0,
        contractStatus: contract ? contract.status : null,
        contractEndDate: contract ? contract.endDate : null,
        ownerName: contract ? contract.ownerName : (app?.fundingOwner || null),
        ownerId: contract ? contract.ownerId : (app?.fundingOwnerId || null),
        ownerType: contract ? contract.ownerType : null
      };
    }

    getApplicationsForFinancer(financer) {
      const name = (financer?.name || "").toLowerCase();
      return (this.data.applications || []).filter(a =>
        a.financerId === financer.id || (a.financer || "").toLowerCase() === name);
    }

    // Recomputes derived contract status + funding owner on financers and their linked applications.
    // Logs an audit entry whenever ownership changes hands (e.g. contract expiry -> Hello Solar).
    syncFinancerContracts(options = {}) {
      let changed = false;
      (this.data.financers || []).forEach(f => {
        const c = this.getFinancerContract(f, options.asOf);
        const prevOwnerId = f.fundingOwnerId;
        if (f.contractStatus !== c.status || f.fundingOwnerId !== c.ownerId || f.fundingOwner !== c.ownerName) {
          f.contractStatus = c.status;
          f.fundingOwner = c.ownerName;
          f.fundingOwnerId = c.ownerId;
          changed = true;
          if (prevOwnerId && prevOwnerId !== c.ownerId && !options.silent) {
            this.logActivity("System", "SYSTEM (Contract Engine)",
              `Funding/revenue ownership for ${f.id} (${f.name}) transferred to ${c.ownerName} — contract ${c.status.toLowerCase()}`,
              f.id, { recordType: "Financer Account", deferSave: true, details: { contractStatus: c.status, fundingOwner: c.ownerName, previousOwnerId: prevOwnerId } });
          }
        }
        this.getApplicationsForFinancer(f).forEach(a => {
          if (a.fundingOwnerId !== c.ownerId || a.fundingOwner !== c.ownerName) {
            a.fundingOwner = c.ownerName;
            a.fundingOwnerId = c.ownerId;
            changed = true;
          }
        });
      });
      if (changed) this.save();
      return changed;
    }

    updateFinancerContract(financerId, payload = {}) {
      const fin = (this.data.financers || []).find(f => f.id === financerId);
      if (!fin) return { success: false, error: "Financer not found." };

      const term = Number(payload.contractTermMonths);
      const rate = Number(payload.annualRate);
      const start = String(payload.contractStartDate || "").trim();
      const end = String(payload.contractEndDate || "").trim() || HelloSolarStore.addMonthsISO(start, term);
      const isoRe = /^\d{4}-\d{2}-\d{2}$/;

      if (!Number.isInteger(term) || term < 1 || term > 360) return { success: false, error: "Contract term must be a whole number of months (1–360)." };
      if (payload.annualRate === "" || payload.annualRate == null || !Number.isFinite(rate) || rate < 0 || rate > 100) return { success: false, error: "Annual rate must be between 0% and 100%." };
      if (!isoRe.test(start)) return { success: false, error: "A valid contract start date is required." };
      if (!end || !isoRe.test(end)) return { success: false, error: "A valid contract end date is required." };
      if (end <= start) return { success: false, error: "Contract end date must be after the start date." };

      const before = this.getFinancerContract(fin);
      fin.contractTermMonths = term;
      fin.annualRate = Math.round(rate * 100) / 100;
      fin.contractStartDate = start;
      fin.contractEndDate = end;
      fin.contractStatusOverride = payload.contractStatusOverride === "Terminated" ? "Terminated" : null;
      fin.contractUpdatedAt = new Date().toISOString();

      const after = this.getFinancerContract(fin);
      this.logActivity("Admin", "ADMIN (Limuel)",
        `Updated financer contract for ${fin.id} (${fin.name}): ${term} mo @ ${fin.annualRate}% p.a., ${start} to ${end} · ${after.status} · Owner: ${after.ownerName}`,
        fin.id, {
          recordType: "Financer Account", deferSave: true,
          details: { contractTermMonths: term, annualRate: fin.annualRate, contractStartDate: start, contractEndDate: end, contractStatus: after.status, fundingOwner: after.ownerName, previousStatus: before.status, previousOwner: before.ownerName }
        });
      this.syncFinancerContracts({ silent: true });
      this.save();
      return { success: true, financer: fin, contract: after };
    }

    // --- DYNAMIC ATTENTION ITEMS ---
    getAttentionItems() {
      const items = [];
      const overdueLimit = Number(this.data.settings?.overdueThresholdDays) || 5;
      const delayLimit = Number(this.data.settings?.installationDelayThresholdDays) || 1;
      const docReviewLimit = Number(this.data.settings?.docReviewEscalationHours) || 48;

      // 1. Applications waiting review or missing docs (flagged based on docReviewEscalationHours)
      this.data.applications.forEach(a => {
        if (a.stage === "Missing Documents") {
          items.push({
            id: a.id,
            type: "Application",
            issue: "Missing documents",
            title: `Missing documents for ${a.id}`,
            context: `${a.customer} · ${a.location} · ${this.getAppDocumentCounts(a.id).label} uploaded (Review SLA: ${docReviewLimit}h)`,
            kind: "warn",
            actionLabel: "Review Application",
            actionType: "view_app",
            payload: a.id
          });
        } else if (a.stage === "Submitted") {
          items.push({
            id: a.id,
            type: "Application",
            issue: "Awaiting initial review",
            title: `New application awaiting initial review`,
            context: `${a.customer} · ${a.system} · ${a.financer} (Escalate after ${docReviewLimit}h)`,
            kind: "warn",
            actionLabel: "Review",
            actionType: "view_app",
            payload: a.id
          });
        }
      });

      // 2. Delayed installations (driven by installationDelayThresholdDays)
      this.data.installations.forEach(j => {
        if (j.status === "Delayed") {
          items.push({
            id: j.id,
            type: "Installation",
            issue: "Installation delayed",
            title: `Installation delayed: ${j.id}`,
            context: `${j.customer} · ${j.location} · ${j.installer} (Threshold: >${delayLimit}d)`,
            kind: "danger",
            actionLabel: "Manage Job",
            actionType: "view_job",
            payload: j.id
          });
        }
      });

      // 3. Overdue payments (driven by overdueThresholdDays)
      this.data.applications.forEach(a => {
        if (a.paymentStatus === "Overdue") {
          items.push({
            id: a.id,
            type: "Payment",
            issue: "Overdue payment",
            title: `Overdue payment for ${a.id}`,
            context: `${a.customer} · ${a.financer} · ₱${(a.monthly || 0).toLocaleString()}/mo (Missed past ${overdueLimit}d grace: ${this.formatReadableDate(a.nextDue)})`,
            kind: "danger",
            actionLabel: "View Payment",
            actionType: "view_payment",
            payload: a.id
          });
        }
      });

      // 4. Open high-priority support tickets
      this.data.support.forEach(s => {
        if (s.status !== "Resolved" && s.priority === "High") {
          items.push({
            id: s.id,
            type: "Support",
            issue: s.concern || "High priority issue",
            title: `High Priority Issue: ${s.id}`,
            context: `${s.accountType} (${s.accountName}) · ${s.concern}`,
            kind: "danger",
            actionLabel: "Resolve Ticket",
            actionType: "view_ticket",
            payload: s.id
          });
        }
      });

      return items;
    }
  }

  HelloSolarStore.prototype.parseActivityDate = parseActivityDate;
  HelloSolarStore.prototype.formatExactAuditTimestamp = formatExactAuditTimestamp;
  HelloSolarStore.prototype.formatRelativeAuditTime = formatRelativeAuditTime;
  HelloSolarStore.prototype.calculateRelativeTime = formatRelativeAuditTime;

  // ------------------------------------------------------------------
  // Backend commands (api mode). Every Super Admin / Direct Engineer write goes through one of these
  // HelloSolarStore methods; after a successful call the method name and its arguments are sent to
  // POST {apiBase}/admin/commands/<method> (see BACKEND_INTEGRATION.md §7). Local mode is unchanged.
  // ------------------------------------------------------------------
  const ADMIN_COMMANDS = [
    "createAccount", "updateAccountStatus", "activateCustomerAccount", "queueActivationEmail",
    "assignFinancer", "updateFinancerContract", "assignPartnerInstaller", "acceptDirectInstallation",
    "updateApplicationStage", "updateDocumentStatus", "setInstallationCost",
    "verifyPaymentReceipt", "rejectPaymentReceipt", "uploadCustomerReceipt",
    "verifyInstallmentReceipt", "rejectInstallmentReceipt", "recordPayment", "recordPaymentAdjustment",
    "requestSystemDisconnect", "confirmSystemDisconnect",
    "scheduleReadyProject", "updateInstallationStatus",
    "engineerAcceptJob", "saveDirectInstallationProgress", "engineerCompleteInstallation", "engineerActivateSystem",
    "updateSupportTicket", "addTicketMessage", "resolveSupportTicket", "reopenSupportTicket",
    "approvePartnerInquiry", "updateInquiryStatus", "saveInquiryConfirmationMessage", "sendInquiryConfirmationEmail",
    "updateInquiryCustomerResponse", "overrideInquiryCustomerResponse",
    "updateSettings"
  ];
  const commandSucceeded = res => res !== false && res !== null && res !== undefined &&
    !(res && typeof res === "object" && (res.success === false || res.ok === false));
  const plainArgs = args => JSON.parse(JSON.stringify(args, (k, v) => (typeof v === "function" ? undefined : v)));
  if (IS_API && typeof window !== "undefined" && window.HSApi) {
    let depth = 0; // only the outermost call is sent (methods call each other internally)
    ADMIN_COMMANDS.forEach(name => {
      const original = HelloSolarStore.prototype[name];
      if (typeof original !== "function") return;
      HelloSolarStore.prototype[name] = function (...args) {
        depth++;
        let res;
        try { res = original.apply(this, args); } finally { depth--; }
        if (depth === 0 && commandSucceeded(res)) {
          window.HSApi.command(`admin.${name}`, { args: plainArgs(args) }, { role: "admin" });
        }
        return res;
      };
    });
  }
  HelloSolarStore.ADMIN_COMMANDS = ADMIN_COMMANDS;

  window.HelloSolarStore = HelloSolarStore;
  window.HELLO_SOLAR_PACKAGES = { catalog: PACKAGE_CATALOG, findPackage, termMonths: INSTALLMENT_TERM_MONTHS, downPayment: INSTALLMENT_DOWN_PAYMENT };
  window.HELLO_SOLAR_DB = new HelloSolarStore();
  // Maintain backward compatibility for any script accessing window.HELLO_SOLAR_DATA
  window.HELLO_SOLAR_DATA = window.HELLO_SOLAR_DB.data;
})();
