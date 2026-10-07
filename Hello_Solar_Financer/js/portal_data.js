/**
 * Hello Solar Financer Portal — Data Management Module
 * Loads and provides structured JSON data across all portal tabs.
 * Single source of truth for applications, approvals, and declinations.
 * Supports asynchronous fetch from financer_data.json with safe fallback for local file:// execution.
 */

const FINANCER_DEFAULT_DATA = {
    "financerProfile": {
        "businessName": "SolarTech Financer",
        "fullName": "Finance Officer",
        "email": "financer@hellosolar.ph",
        "phone": "0917 888 2345",
        "partnerId": "",
        "financerId": null,
        "tier": "Tier 1 Accredited Financer",
        "role": "Financer Portal",
        "avatarUrl": ""
    },
    "dashboardStats": [
        {
            "id": "capital_financed",
            "value": "₱48,920,000",
            "label": "Total Funded Solar Capital",
            "subtext": "214 active borrower loans",
            "trend": "+14.2% from last month",
            "trendType": "up",
            "iconType": "orange"
        },
        {
            "id": "pending_queue",
            "value": "4 Pending",
            "label": "Applications to Review",
            "subtext": "₱1,240,000 requested financing",
            "trend": "Avg turnaround: 4.2 hours",
            "trendType": "neutral",
            "iconType": "blue"
        },
        {
            "id": "approved_month",
            "value": "₱6,850,000",
            "label": "Approved in September 2026",
            "subtext": "38 solar installations funded",
            "trend": "38 loans funded",
            "trendType": "up",
            "iconType": "green"
        },
        {
            "id": "repayment_rate",
            "value": "99.2% On-Time",
            "label": "Loan On-Time Repayment Rate",
            "subtext": "0.8% 30+ day arrears (214 loans)",
            "trend": "Zero write-offs",
            "trendType": "up",
            "iconType": "purple"
        }
    ],
    "portfolioAllocation": [
        {
            "category": "Residential Rooftop Solar",
            "amount": "₱31.3M",
            "percentage": 64,
            "color": "var(--solar-orange)"
        },
        {
            "category": "Commercial & SME Solar",
            "amount": "₱12.7M",
            "percentage": 26,
            "color": "#2563eb"
        },
        {
            "category": "Battery Storage Add-ons",
            "amount": "₱4.9M",
            "percentage": 10,
            "color": "#10b981"
        }
    ],
    "environmentalImpact": {
        "cleanEnergy": "2.1 MWp Generated",
        "carbonOffset": "1,420 Tons/Yr"
    },
    "recentActivities": [
        {
            "id": "ACT-100",
            "title": "New solar financing application submitted by <strong>Carlos Villanueva</strong> (APP-1103)",
            "time": "5 minutes ago · Pending Review Queue",
            "type": "submission"
        },
        {
            "id": "ACT-101",
            "title": "Disbursement cleared for <strong>APP-1109</strong> (₱315,000)",
            "time": "18 minutes ago · Automated ACH Clearing",
            "type": "disbursement"
        },
        {
            "id": "ACT-102",
            "title": "Credit Bureau check completed for <strong>Maria Elena Cruz</strong> (APP-1105)",
            "time": "45 minutes ago · Bureau Score: 742 (Prime)",
            "type": "credit"
        },
        {
            "id": "ACT-103",
            "title": "Electric bill utility proof verified for <strong>Ricardo Gomez</strong> (APP-1104)",
            "time": "2 hours ago · Meralco 3-mo avg verified",
            "type": "utility"
        }
    ],
    "applications": [
        {
            "id": "APP-1103",
            "paymentType": "Installment",
            "applicant": {
                "name": "Carlos Villanueva",
                "location": "Taguig City",
                "phone": "0917 638 4921",
                "email": "carlos.villanueva@gmail.com",
                "income": "₱115,000/mo",
                "avgElectricBill": "₱11,200/mo",
                "creditScore": 752,
                "dti": "23%"
            },
            "system": {
                "title": "6.4 kWp Hybrid Storage System",
                "sizeCategory": "standard",
                "systemSize": "6.4 kWp",
                "merchant": "SolarTech Manila",
                "cost": "₱375,000",
                "downPayment": "₱35,000",
                "covenantsVerified": true
            },
            "loan": {
                "amount": "₱340,000",
                "fundedAmount": "₱340,000",
                "monthlyPayment": "₱10,750/mo",
                "term": "36 Months",
                "financingTerm": "36 Months",
                "status": "pending",
                "statusText": "Financing Review",
                "submittedDate": "Sep 28, 2026",
                "nextStep": "Verify 3-month Meralco electric bill for utility offset",
                "missingRequirement": "Proof of utility bill consumption",
                "declineReason": null,
                "declineDate": null
            },
            "documents": [
                { "name": "Government ID", "submitted": true },
                { "name": "Proof of Income", "submitted": true },
                { "name": "Meralco Bill", "submitted": false },
                { "name": "Roof Ownership", "submitted": true }
            ],
            "financingStatus": "FINANCING_REVIEW",
            "applicationStatus": "FINANCING_REVIEW",
            "fundedAmount": "₱340,000",
            "monthlyPayment": "₱10,750/mo",
            "financingTerm": "36 Months",
            "repaymentStatus": "Pending Disbursement",
            "installerEligible": false,
            "declineReason": null,
            "decisionDate": null
        },
        {
            "id": "APP-1104",
            "paymentType": "Installment",
            "applicant": {
                "name": "Ricardo Gomez",
                "location": "Makati City",
                "phone": "0917 555 0192",
                "email": "ricardo.gomez@gmail.com",
                "income": "₱95,000/mo",
                "avgElectricBill": "₱8,400/mo",
                "creditScore": 748,
                "dti": "21%"
            },
            "system": {
                "title": "5.4 kWp Hybrid System",
                "sizeCategory": "standard",
                "systemSize": "5.4 kWp",
                "merchant": "SunPower Manila",
                "cost": "₱320,000",
                "downPayment": "₱35,000",
                "covenantsVerified": true
            },
            "loan": {
                "amount": "₱285,000",
                "fundedAmount": "₱285,000",
                "monthlyPayment": "₱8,997/mo",
                "term": "36 Months",
                "financingTerm": "36 Months",
                "status": "docs_required",
                "statusText": "Documents Required",
                "submittedDate": "Sep 08, 2026",
                "nextStep": "Verify 3-month Meralco electric bill for utility offset",
                "missingRequirement": "Proof of utility bill consumption",
                "declineReason": null,
                "declineDate": null
            },
            "documents": [
                { "name": "Government ID", "submitted": true },
                { "name": "Proof of Income", "submitted": true },
                { "name": "Meralco Bill", "submitted": false },
                { "name": "Roof Ownership", "submitted": true }
            ],
            "financingStatus": "DOCUMENTS_REQUIRED",
            "applicationStatus": "DOCUMENTS_REQUIRED",
            "fundedAmount": "₱285,000",
            "monthlyPayment": "₱8,997/mo",
            "financingTerm": "36 Months",
            "repaymentStatus": "Pending Disbursement",
            "installerEligible": false,
            "declineReason": null,
            "decisionDate": null
        },
        {
            "id": "APP-1105",
            "paymentType": "Installment",
            "applicant": {
                "name": "Maria Elena Cruz",
                "location": "Quezon City",
                "phone": "0918 444 8921",
                "email": "elena.cruz@gmail.com",
                "income": "₱130,000/mo",
                "avgElectricBill": "₱14,200/mo",
                "creditScore": 742,
                "dti": "26%"
            },
            "system": {
                "title": "8.2 kWp Grid-Tied",
                "sizeCategory": "standard",
                "systemSize": "8.2 kWp",
                "merchant": "Helios Solar PH",
                "cost": "₱465,000",
                "downPayment": "₱45,000",
                "covenantsVerified": true
            },
            "loan": {
                "amount": "₱420,000",
                "fundedAmount": "₱420,000",
                "monthlyPayment": "₱12,850/mo",
                "term": "36 Months",
                "financingTerm": "36 Months",
                "status": "review",
                "statusText": "Under Review",
                "submittedDate": "Sep 07, 2026",
                "nextStep": "Evaluate prime bureau score (742) and debt-to-income (26%)",
                "missingRequirement": "Underwriter credit sign-off",
                "declineReason": null,
                "declineDate": null
            },
            "documents": [
                { "name": "Government ID", "submitted": true },
                { "name": "Proof of Income", "submitted": true },
                { "name": "Meralco Bill", "submitted": true },
                { "name": "Roof Ownership", "submitted": true }
            ],
            "financingStatus": "UNDER_REVIEW",
            "applicationStatus": "UNDER_REVIEW",
            "fundedAmount": "₱420,000",
            "monthlyPayment": "₱12,850/mo",
            "financingTerm": "36 Months",
            "repaymentStatus": "Pending Disbursement",
            "installerEligible": false,
            "declineReason": null,
            "decisionDate": null
        },
        {
            "id": "APP-1106",
            "paymentType": "Installment",
            "applicant": {
                "name": "Jonathan Dela Cruz",
                "location": "Pasig City",
                "phone": "0920 111 4455",
                "email": "jonathan.delacruz@gmail.com",
                "income": "₱72,000/mo",
                "avgElectricBill": "₱5,800/mo",
                "creditScore": 710,
                "dti": "28%"
            },
            "system": {
                "title": "3.6 kWp Micro-Inverter",
                "sizeCategory": "small",
                "systemSize": "3.6 kWp",
                "merchant": "SunPower Manila",
                "cost": "₱220,000",
                "downPayment": "₱25,000",
                "covenantsVerified": true
            },
            "loan": {
                "amount": "₱195,000",
                "fundedAmount": "₱195,000",
                "monthlyPayment": "₱6,120/mo",
                "term": "36 Months",
                "financingTerm": "36 Months",
                "status": "docs_required",
                "statusText": "Documents Required",
                "submittedDate": "Sep 06, 2026",
                "nextStep": "Verify employer certificate of compensation & tenure",
                "missingRequirement": "Proof of employment income",
                "declineReason": null,
                "declineDate": null
            },
            "documents": [
                { "name": "Government ID", "submitted": true },
                { "name": "Proof of Income", "submitted": false },
                { "name": "Meralco Bill", "submitted": true },
                { "name": "Roof Ownership", "submitted": true }
            ],
            "financingStatus": "DOCUMENTS_REQUIRED",
            "applicationStatus": "DOCUMENTS_REQUIRED",
            "fundedAmount": "₱195,000",
            "monthlyPayment": "₱6,120/mo",
            "financingTerm": "36 Months",
            "repaymentStatus": "Pending Disbursement",
            "installerEligible": false,
            "declineReason": null,
            "decisionDate": null
        },
        {
            "id": "APP-1107",
            "paymentType": "Installment",
            "applicant": {
                "name": "David Tan",
                "location": "Cebu City",
                "phone": "0917 890 1234",
                "email": "david.tan@tanholdings.ph",
                "income": "₱240,000/mo",
                "avgElectricBill": "₱26,500/mo",
                "creditScore": 780,
                "dti": "18%"
            },
            "system": {
                "title": "12.0 kWp Commercial",
                "sizeCategory": "commercial",
                "systemSize": "12.0 kWp",
                "merchant": "Visayas Green Energy",
                "cost": "₱850,000",
                "downPayment": "₱70,000",
                "covenantsVerified": true
            },
            "loan": {
                "amount": "₱780,000",
                "fundedAmount": "₱780,000",
                "monthlyPayment": "₱15,920/mo",
                "term": "60 Months",
                "financingTerm": "60 Months",
                "status": "approved",
                "statusText": "Approved",
                "submittedDate": "Sep 04, 2026",
                "nextStep": "Promissory note signed; awaiting installer delivery milestone",
                "missingRequirement": "None — approved for disbursement",
                "declineReason": null,
                "declineDate": null
            },
            "documents": [
                { "name": "Government ID", "submitted": true },
                { "name": "Proof of Income", "submitted": true },
                { "name": "Meralco Bill", "submitted": true },
                { "name": "Roof Ownership", "submitted": true }
            ],
            "financingStatus": "APPROVED",
            "applicationStatus": "READY_FOR_INSTALLATION",
            "fundedAmount": "₱780,000",
            "monthlyPayment": "₱15,920/mo",
            "financingTerm": "60 Months",
            "repaymentStatus": "Paid",
            "installerEligible": true,
            "declineReason": null,
            "decisionDate": "Sep 02, 2026",
            "contractNumber": "HS-CTR-2026-1107"
        },
        {
            "id": "APP-1108",
            "paymentType": "Installment",
            "applicant": {
                "name": "Rosanna Valenzuela",
                "location": "Taguig City",
                "phone": "0919 777 6622",
                "email": "rosanna.valenzuela@gmail.com",
                "income": "₱88,000/mo",
                "avgElectricBill": "₱10,200/mo",
                "creditScore": 695,
                "dti": "32%"
            },
            "system": {
                "title": "6.8 kWp Residential",
                "sizeCategory": "standard",
                "systemSize": "6.8 kWp",
                "merchant": "Luzon Solar Direct",
                "cost": "₱390,000",
                "downPayment": "₱40,000",
                "covenantsVerified": true
            },
            "loan": {
                "amount": "₱350,000",
                "fundedAmount": "₱350,000",
                "monthlyPayment": "₱11,020/mo",
                "term": "36 Months",
                "financingTerm": "36 Months",
                "status": "review",
                "statusText": "Under Review",
                "submittedDate": "Sep 03, 2026",
                "nextStep": "Underwrite 32% DTI (check utility savings offset)",
                "missingRequirement": "Co-maker or utility savings mitigation",
                "declineReason": null,
                "declineDate": null
            },
            "documents": [
                { "name": "Government ID", "submitted": true },
                { "name": "Proof of Income", "submitted": true },
                { "name": "Meralco Bill", "submitted": true },
                { "name": "Roof Ownership", "submitted": true }
            ],
            "financingStatus": "UNDER_REVIEW",
            "applicationStatus": "UNDER_REVIEW",
            "fundedAmount": "₱350,000",
            "monthlyPayment": "₱11,020/mo",
            "financingTerm": "36 Months",
            "repaymentStatus": "Pending Disbursement",
            "installerEligible": false,
            "declineReason": null,
            "decisionDate": null
        },
        {
            "id": "APP-1109",
            "paymentType": "Installment",
            "applicant": {
                "name": "Patricia Santos",
                "location": "Davao City",
                "phone": "0917 222 3456",
                "email": "patricia.santos@gmail.com",
                "income": "₱110,000/mo",
                "avgElectricBill": "₱11,400/mo",
                "creditScore": 760,
                "dti": "19%"
            },
            "system": {
                "title": "6.0 kWp Residential",
                "sizeCategory": "standard",
                "systemSize": "6.0 kWp",
                "merchant": "Mindanao Solar Corp",
                "cost": "₱350,000",
                "downPayment": "₱35,000",
                "covenantsVerified": true
            },
            "loan": {
                "amount": "₱315,000",
                "fundedAmount": "₱315,000",
                "monthlyPayment": "₱9,890/mo",
                "term": "36 Months",
                "financingTerm": "36 Months",
                "status": "approved",
                "statusText": "Approved",
                "submittedDate": "Aug 28, 2026",
                "nextStep": "Disbursed — monthly ACH amortization active",
                "missingRequirement": "None — contract active",
                "declineReason": null,
                "declineDate": null
            },
            "documents": [
                { "name": "Government ID", "submitted": true },
                { "name": "Proof of Income", "submitted": true },
                { "name": "Meralco Bill", "submitted": true },
                { "name": "Roof Ownership", "submitted": true }
            ],
            "financingStatus": "APPROVED",
            "applicationStatus": "READY_FOR_INSTALLATION",
            "fundedAmount": "₱315,000",
            "monthlyPayment": "₱9,890/mo",
            "financingTerm": "36 Months",
            "repaymentStatus": "Due Date",
            "installerEligible": true,
            "declineReason": null,
            "decisionDate": "Aug 28, 2026",
            "contractNumber": "HS-CTR-2026-1109"
        },
        {
            "id": "APP-1110",
            "paymentType": "Installment",
            "applicant": {
                "name": "Antonio Reyes",
                "location": "Cavite",
                "phone": "0922 444 7890",
                "email": "antonio.reyes@gmail.com",
                "income": "₱45,000/mo",
                "avgElectricBill": "₱7,100/mo",
                "creditScore": 590,
                "dti": "48%"
            },
            "system": {
                "title": "4.8 kWp Residential",
                "sizeCategory": "small",
                "systemSize": "4.8 kWp",
                "merchant": "SolarTech Luzon",
                "cost": "₱270,000",
                "downPayment": "₱30,000",
                "covenantsVerified": false
            },
            "loan": {
                "amount": "₱240,000",
                "fundedAmount": "₱240,000",
                "monthlyPayment": "₱7,540/mo",
                "term": "36 Months",
                "financingTerm": "36 Months",
                "status": "rejected",
                "statusText": "Declined",
                "submittedDate": "Aug 25, 2026",
                "nextStep": "Declined — DTI at 48% exceeds 40% cap; eligible with co-maker",
                "missingRequirement": "Qualified co-maker required for appeal",
                "declineReason": "Excessive Debt-to-Income (48%) exceeds 40% threshold",
                "declineDate": "Sep 05, 2026"
            },
            "documents": [
                { "name": "Government ID", "submitted": true },
                { "name": "Proof of Income", "submitted": true },
                { "name": "Meralco Bill", "submitted": true },
                { "name": "Roof Ownership", "submitted": false }
            ],
            "financingStatus": "DECLINED",
            "applicationStatus": "FINANCING_DECLINED",
            "fundedAmount": "₱240,000",
            "monthlyPayment": "₱7,540/mo",
            "financingTerm": "36 Months",
            "repaymentStatus": "Declined",
            "installerEligible": false,
            "declineReason": "Excessive Debt-to-Income (48%) exceeds 40% threshold",
            "decisionDate": "Sep 05, 2026"
        },
        {
            "id": "APP-1111",
            "paymentType": "Installment",
            "applicant": {
                "name": "Benjamin Alcantara",
                "location": "Iloilo City",
                "phone": "0917 444 3322",
                "email": "benjamin.alcantara@gmail.com",
                "income": "₱85,000/mo",
                "avgElectricBill": "₱7,800/mo",
                "creditScore": 735,
                "dti": "22%"
            },
            "system": {
                "title": "4.8 kWp Residential",
                "sizeCategory": "small",
                "systemSize": "4.8 kWp",
                "merchant": "SunPower Manila",
                "cost": "₱290,000",
                "downPayment": "₱30,000",
                "covenantsVerified": true
            },
            "loan": {
                "amount": "₱260,000",
                "fundedAmount": "₱260,000",
                "monthlyPayment": "₱8,160/mo",
                "term": "36 Months",
                "financingTerm": "36 Months",
                "status": "approved",
                "statusText": "Approved",
                "submittedDate": "Aug 15, 2026",
                "nextStep": "Active Disbursed loan",
                "missingRequirement": "None",
                "declineReason": null,
                "declineDate": null
            },
            "documents": [
                { "name": "Government ID", "submitted": true },
                { "name": "Proof of Income", "submitted": true },
                { "name": "Meralco Bill", "submitted": true },
                { "name": "Roof Ownership", "submitted": true }
            ],
            "financingStatus": "APPROVED",
            "applicationStatus": "READY_FOR_INSTALLATION",
            "fundedAmount": "₱260,000",
            "monthlyPayment": "₱8,160/mo",
            "financingTerm": "36 Months",
            "repaymentStatus": "Unpaid",
            "installerEligible": true,
            "declineReason": null,
            "decisionDate": "Aug 19, 2026",
            "contractNumber": "HS-CTR-2026-1111"
        },
        {
            "id": "APP-1112",
            "paymentType": "Installment",
            "applicant": {
                "name": "Corazon Aquino-Lim",
                "location": "Mandaluyong City",
                "phone": "0918 333 7788",
                "email": "corazon.lim@gmail.com",
                "income": "₱140,000/mo",
                "avgElectricBill": "₱13,500/mo",
                "creditScore": 770,
                "dti": "24%"
            },
            "system": {
                "title": "7.2 kWp Residential",
                "sizeCategory": "standard",
                "systemSize": "7.2 kWp",
                "merchant": "Helios Solar PH",
                "cost": "₱540,000",
                "downPayment": "₱50,000",
                "covenantsVerified": true
            },
            "loan": {
                "amount": "₱490,000",
                "fundedAmount": "₱490,000",
                "monthlyPayment": "₱11,980/mo",
                "term": "48 Months",
                "financingTerm": "48 Months",
                "status": "approved",
                "statusText": "Approved",
                "submittedDate": "Aug 05, 2026",
                "nextStep": "Active Disbursed loan",
                "missingRequirement": "None",
                "declineReason": null,
                "declineDate": null
            },
            "documents": [
                { "name": "Government ID", "submitted": true },
                { "name": "Proof of Income", "submitted": true },
                { "name": "Meralco Bill", "submitted": true },
                { "name": "Roof Ownership", "submitted": true }
            ],
            "financingStatus": "APPROVED",
            "applicationStatus": "READY_FOR_INSTALLATION",
            "fundedAmount": "₱490,000",
            "monthlyPayment": "₱11,980/mo",
            "financingTerm": "48 Months",
            "repaymentStatus": "Paid",
            "installerEligible": true,
            "declineReason": null,
            "decisionDate": "Aug 11, 2026",
            "contractNumber": "HS-CTR-2026-1112"
        },
        {
            "id": "APP-1113",
            "paymentType": "Installment",
            "applicant": {
                "name": "Ferdinand Mendoza",
                "location": "Bulacan",
                "phone": "0917 333 9102",
                "email": "ferdinand.mendoza@gmail.com",
                "income": "₱65,000/mo",
                "avgElectricBill": "₱8,900/mo",
                "creditScore": 574,
                "dti": "34%"
            },
            "system": {
                "title": "5.4 kWp Residential",
                "sizeCategory": "standard",
                "systemSize": "5.4 kWp",
                "merchant": "SunPower Manila",
                "cost": "₱420,000",
                "downPayment": "₱40,000",
                "covenantsVerified": false
            },
            "loan": {
                "amount": "₱380,000",
                "fundedAmount": "₱380,000",
                "monthlyPayment": "₱11,920/mo",
                "term": "36 Months",
                "financingTerm": "36 Months",
                "status": "rejected",
                "statusText": "Declined",
                "submittedDate": "Aug 20, 2026",
                "nextStep": "Declined due to low bureau credit score",
                "missingRequirement": "Credit repair or qualified co-maker",
                "declineReason": "Low Credit Bureau Score (574)",
                "declineDate": "Aug 29, 2026"
            },
            "documents": [
                { "name": "Government ID", "submitted": true },
                { "name": "Proof of Income", "submitted": true },
                { "name": "Meralco Bill", "submitted": true },
                { "name": "Roof Ownership", "submitted": true }
            ],
            "financingStatus": "DECLINED",
            "applicationStatus": "FINANCING_DECLINED",
            "fundedAmount": "₱380,000",
            "monthlyPayment": "₱11,920/mo",
            "financingTerm": "36 Months",
            "repaymentStatus": "Declined",
            "installerEligible": false,
            "declineReason": "Low Credit Bureau Score (574)",
            "decisionDate": "Aug 29, 2026"
        },
        {
            "id": "APP-1114",
            "paymentType": "Installment",
            "applicant": {
                "name": "Lourdes Villamor",
                "location": "Batangas",
                "phone": "0920 888 1234",
                "email": "lourdes.villamor@gmail.com",
                "income": "₱78,000/mo",
                "avgElectricBill": "₱9,400/mo",
                "creditScore": 680,
                "dti": "29%"
            },
            "system": {
                "title": "5.0 kWp Residential",
                "sizeCategory": "standard",
                "systemSize": "5.0 kWp",
                "merchant": "Helios Solar PH",
                "cost": "₱345,000",
                "downPayment": "₱35,000",
                "covenantsVerified": false
            },
            "loan": {
                "amount": "₱310,000",
                "fundedAmount": "₱310,000",
                "monthlyPayment": "₱9,750/mo",
                "term": "36 Months",
                "financingTerm": "36 Months",
                "status": "rejected",
                "statusText": "Declined",
                "submittedDate": "Aug 18, 2026",
                "nextStep": "Declined — meter registered under tenant name without consent",
                "missingRequirement": "Owner consent authorization",
                "declineReason": "Missing Electric Bill Consent / Incomplete Utility Proof",
                "declineDate": "Aug 22, 2026"
            },
            "documents": [
                { "name": "Government ID", "submitted": true },
                { "name": "Proof of Income", "submitted": true },
                { "name": "Meralco Bill", "submitted": false },
                { "name": "Roof Ownership", "submitted": true }
            ],
            "financingStatus": "DECLINED",
            "applicationStatus": "FINANCING_DECLINED",
            "fundedAmount": "₱310,000",
            "monthlyPayment": "₱9,750/mo",
            "financingTerm": "36 Months",
            "repaymentStatus": "Declined",
            "installerEligible": false,
            "declineReason": "Missing Electric Bill Consent / Incomplete Utility Proof",
            "decisionDate": "Aug 22, 2026"
        },
        {
            "id": "APP-1115",
            "paymentType": "Installment",
            "applicant": {
                "name": "Manuel Pangilinan Jr.",
                "location": "Pampanga",
                "phone": "0917 555 9900",
                "email": "manuel.pj@pangilinan.ph",
                "income": "₱310,000/mo",
                "avgElectricBill": "₱38,000/mo",
                "creditScore": 790,
                "dti": "16%"
            },
            "system": {
                "title": "15.0 kWp Agricultural",
                "sizeCategory": "commercial",
                "systemSize": "15.0 kWp",
                "merchant": "Visayas Green Energy",
                "cost": "₱1,020,000",
                "downPayment": "₱100,000",
                "covenantsVerified": true
            },
            "loan": {
                "amount": "₱920,000",
                "fundedAmount": "₱920,000",
                "monthlyPayment": "₱18,780/mo",
                "term": "60 Months",
                "financingTerm": "60 Months",
                "status": "approved",
                "statusText": "Approved",
                "submittedDate": "Jul 25, 2026",
                "nextStep": "Active Disbursed agricultural solar facility",
                "missingRequirement": "None",
                "declineReason": null,
                "declineDate": null
            },
            "documents": [
                { "name": "Government ID", "submitted": true },
                { "name": "Proof of Income", "submitted": true },
                { "name": "Meralco Bill", "submitted": true },
                { "name": "Roof Ownership", "submitted": true }
            ],
            "financingStatus": "APPROVED",
            "applicationStatus": "READY_FOR_INSTALLATION",
            "fundedAmount": "₱920,000",
            "monthlyPayment": "₱18,780/mo",
            "financingTerm": "60 Months",
            "repaymentStatus": "Due Date",
            "installerEligible": true,
            "declineReason": null,
            "decisionDate": "Jul 30, 2026",
            "contractNumber": "HS-CTR-2026-1115"
        },
        {
            "id": "APP-1116",
            "paymentType": "Installment",
            "applicant": {
                "name": "Gregorio Santos",
                "location": "Rizal",
                "phone": "0918 666 4545",
                "email": "gregorio.santos@gmail.com",
                "income": "₱58,000/mo",
                "avgElectricBill": "₱6,400/mo",
                "creditScore": 640,
                "dti": "30%"
            },
            "system": {
                "title": "3.8 kWp Residential",
                "sizeCategory": "small",
                "systemSize": "3.8 kWp",
                "merchant": "SolarTech Luzon",
                "cost": "₱245,000",
                "downPayment": "₱30,000",
                "covenantsVerified": false
            },
            "loan": {
                "amount": "₱215,000",
                "fundedAmount": "₱215,000",
                "monthlyPayment": "₱6,750/mo",
                "term": "36 Months",
                "financingTerm": "36 Months",
                "status": "rejected",
                "statusText": "Declined",
                "submittedDate": "Aug 10, 2026",
                "nextStep": "Declined due to structural roof truss ineligibility",
                "missingRequirement": "Structural reinforcement required",
                "declineReason": "Roof Structural Ineligibility",
                "declineDate": "Aug 14, 2026"
            },
            "documents": [
                { "name": "Government ID", "submitted": true },
                { "name": "Proof of Income", "submitted": true },
                { "name": "Meralco Bill", "submitted": true },
                { "name": "Roof Ownership", "submitted": false }
            ],
            "financingStatus": "DECLINED",
            "applicationStatus": "FINANCING_DECLINED",
            "fundedAmount": "₱215,000",
            "monthlyPayment": "₱6,750/mo",
            "financingTerm": "36 Months",
            "repaymentStatus": "Declined",
            "installerEligible": false,
            "declineReason": "Roof Structural Ineligibility",
            "decisionDate": "Aug 14, 2026"
        },
        {
            "id": "APP-1120",
            "paymentType": "Cash",
            "applicant": {
                "name": "Juan Dela Cruz",
                "location": "Pasay City",
                "phone": "0917 111 2233",
                "email": "juan.delacruz@example.com",
                "income": "₱150,000/mo",
                "avgElectricBill": "₱12,000/mo",
                "creditScore": 760,
                "dti": "15%"
            },
            "system": {
                "title": "5.0 kWp Grid-Tied System",
                "sizeCategory": "standard",
                "systemSize": "5.0 kWp",
                "merchant": "SunPower Manila",
                "cost": "₱260,000",
                "downPayment": "₱260,000",
                "covenantsVerified": true
            },
            "loan": {
                "amount": "₱0",
                "fundedAmount": "₱0",
                "monthlyPayment": "₱0/mo",
                "term": "None",
                "financingTerm": "None",
                "status": "not_applicable",
                "statusText": "Full Cash Payment",
                "submittedDate": "Sep 20, 2026",
                "nextStep": "Direct merchant cash fulfillment",
                "missingRequirement": "None",
                "declineReason": null,
                "declineDate": null
            },
            "documents": [
                { "name": "Government ID", "submitted": true },
                { "name": "Proof of Income", "submitted": true },
                { "name": "Meralco Bill", "submitted": true },
                { "name": "Roof Ownership", "submitted": true }
            ],
            "financingStatus": "NOT_APPLICABLE",
            "applicationStatus": "READY_FOR_INSTALLATION",
            "fundedAmount": "₱0",
            "monthlyPayment": "₱0/mo",
            "financingTerm": "None",
            "repaymentStatus": "Paid in Full",
            "installerEligible": true,
            "declineReason": null,
            "decisionDate": null
        }
    ],
    "approvedContracts": [
        {
            "contractNumber": "HS-CTR-2026-1107",
            "appId": "APP-1107",
            "borrower": {
                "name": "David Tan",
                "location": "Cebu City · Commercial"
            },
            "merchant": "Visayas Green Energy",
            "fundedAmount": "₱780,000",
            "terms": "60 mos · ₱15,920/mo",
            "disbursedDate": "Sep 02, 2026",
            "status": "Active Disbursed"
        },
        {
            "contractNumber": "HS-CTR-2026-1109",
            "appId": "APP-1109",
            "borrower": {
                "name": "Patricia Santos",
                "location": "Davao City · Residential"
            },
            "merchant": "Mindanao Solar Corp",
            "fundedAmount": "₱315,000",
            "terms": "36 mos · ₱9,890/mo",
            "disbursedDate": "Aug 28, 2026",
            "status": "Active Disbursed"
        },
        {
            "contractNumber": "HS-CTR-2026-1111",
            "appId": "APP-1111",
            "borrower": {
                "name": "Benjamin Alcantara",
                "location": "Iloilo City · Residential"
            },
            "merchant": "SunPower Manila",
            "fundedAmount": "₱260,000",
            "terms": "36 mos · ₱8,160/mo",
            "disbursedDate": "Aug 19, 2026",
            "status": "Active Disbursed"
        },
        {
            "contractNumber": "HS-CTR-2026-1112",
            "appId": "APP-1112",
            "borrower": {
                "name": "Corazon Aquino-Lim",
                "location": "Mandaluyong City · Residential"
            },
            "merchant": "Helios Solar PH",
            "fundedAmount": "₱490,000",
            "terms": "48 mos · ₱11,980/mo",
            "disbursedDate": "Aug 11, 2026",
            "status": "Active Disbursed"
        },
        {
            "contractNumber": "HS-CTR-2026-1115",
            "appId": "APP-1115",
            "borrower": {
                "name": "Manuel Pangilinan Jr.",
                "location": "Pampanga · Agricultural Solar"
            },
            "merchant": "Visayas Green Energy",
            "fundedAmount": "₱920,000",
            "terms": "60 mos · ₱18,780/mo",
            "disbursedDate": "Jul 30, 2026",
            "status": "Active Disbursed"
        }
    ],
    "rejectedApplications": [
        {
            "id": "APP-1110",
            "applicant": {
                "name": "Antonio Reyes",
                "location": "Cavite · 0922 444 7890"
            },
            "requestedAmount": "₱240,000",
            "merchant": "SolarTech Luzon",
            "reasonCode": "dti",
            "primaryReason": "Excessive DTI (48%)",
            "reasonDetail": "Max allowed threshold is 40%",
            "declineDate": "Sep 05, 2026",
            "statusBadge": "Co-Maker Eligible"
        },
        {
            "id": "APP-1113",
            "applicant": {
                "name": "Ferdinand Mendoza",
                "location": "Bulacan · 0917 333 9102"
            },
            "requestedAmount": "₱380,000",
            "merchant": "SunPower Manila",
            "reasonCode": "score",
            "primaryReason": "Low Bureau Score (574)",
            "reasonDetail": "Unresolved past-due credit card line",
            "declineDate": "Aug 29, 2026",
            "statusBadge": "Reapply in 90 Days"
        },
        {
            "id": "APP-1114",
            "applicant": {
                "name": "Lourdes Villamor",
                "location": "Batangas · 0920 888 1234"
            },
            "requestedAmount": "₱310,000",
            "merchant": "Helios Solar PH",
            "reasonCode": "utility",
            "primaryReason": "Utility Proof Incomplete",
            "reasonDetail": "Meter registered under tenant name without consent",
            "declineDate": "Aug 22, 2026",
            "statusBadge": "Co-Maker Eligible"
        },
        {
            "id": "APP-1116",
            "applicant": {
                "name": "Gregorio Santos",
                "location": "Rizal · 0918 666 4545"
            },
            "requestedAmount": "₱215,000",
            "merchant": "SolarTech Luzon",
            "reasonCode": "roof",
            "primaryReason": "Roof Structural Ineligibility",
            "reasonDetail": "Engineer report cited truss reinforcement required",
            "declineDate": "Aug 14, 2026",
            "statusBadge": "Structural Hold"
        }
    ],
    "supportChannels": [
        {
            "title": "Priority Underwriting Hotline",
            "description": "Direct line to senior credit underwriters for time-sensitive application escalations and exceptions.",
            "contact": "(02) 8888-SOLAR (Ext. 2)",
            "schedule": "Mon – Sat: 8:00 AM – 6:00 PM PHT"
        },
        {
            "title": "ACH Disbursement Operations",
            "description": "Batch settlement inquiries, bank clearing receipts, and installer payout confirmation status.",
            "contact": "disbursement@hellosolar.ph",
            "schedule": "Automated clearing daily at 3:00 PM"
        },
        {
            "title": "Institutional Relationship Officer",
            "description": "Elena Santos · Head of Institutional Partnerships for credit facility expansions and covenant audits.",
            "contact": "+63 917 888 1234",
            "schedule": "elena.santos@hellosolar.ph"
        }
    ],
    "faqs": [
        {
            "question": "What are the maximum Debt-To-Income (DTI) thresholds?",
            "answer": "Our standard policy allows a maximum DTI of 40% for tier-1 residential borrowers. If DTI falls between 40% and 48%, loan approval can proceed subject to an employed co-maker or proof of 30%+ electric utility bill savings offsetting the debt service."
        },
        {
            "question": "How are equipment liens secured on funded solar panels?",
            "answer": "Every funded installation executes a Chattel Mortgage over the solar PV modules, hybrid inverters, and battery storage units, registered with the Registry of Deeds and backed by a comprehensive warranty covenant from the accredited installer."
        },
        {
            "question": "What is the merchant installer disbursement schedule?",
            "answer": "Installers receive 40% mobilization upon borrower signing and initial permit issuance, 40% upon delivery of equipment on site, and the remaining 20% retention upon final net metering inspection and customer commissioning acceptance."
        },
        {
            "question": "Are early pre-payments or loan buyouts permitted?",
            "answer": "Yes. Hello Solar encourages customer pre-payments with 0% penalty fees. The financer receives the remaining principal in full plus accrued interest up to the settlement date."
        }
    ]
};

// Global Store & API Architecture Helper
// Applications are SHARED records (window.HSShared → Super Admin store): this portal shows the applications whose
// financerId is the signed-in financer and writes its decisions (approve / decline / request documents) back to
// those records. FINANCER_DEFAULT_DATA.applications only supplies underwriting presentation detail, joined by APP ID.
// Everything else in this store (profile display, dashboard tiles, FAQs, support channels) is portal-local.
window.HelloSolarStore = {
    DEFAULT_DATA: FINANCER_DEFAULT_DATA,
    LOCAL_KEY: "hello_solar_portal_data",
    SHARED_COLLECTIONS: ["applications", "approvedContracts", "rejectedApplications"],

    // ----------------------------------------------------------------------
    // Shared application book
    // ----------------------------------------------------------------------
    financerSession: function () {
        return window.HSShared ? window.HSShared.session.get("financer") : null;
    },

    peso: function (n) {
        const num = Number(n) || 0;
        return "₱" + num.toLocaleString("en-PH", { minimumFractionDigits: num % 1 ? 2 : 0, maximumFractionDigits: 2 });
    },

    formatDate: function (d) {
        return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    },

    // Financer vocabulary derived from the shared application stage (Super Admin vocabulary)
    stageState: function (app) {
        const stage = String(app.stage || "");
        const active = String(app.systemStatus || "").toUpperCase() === "ACTIVE" || String(app.applicationStatus || "").toUpperCase() === "ACTIVE";
        if (stage === "Declined") return { financingStatus: "DECLINED", applicationStatus: "FINANCING_DECLINED", loanStatus: "rejected", statusText: "Declined" };
        if (stage === "Missing Documents") return { financingStatus: "DOCUMENTS_REQUIRED", applicationStatus: "DOCUMENTS_REQUIRED", loanStatus: "docs_required", statusText: "Documents Required" };
        if (stage === "Under Review") return { financingStatus: "UNDER_REVIEW", applicationStatus: "UNDER_REVIEW", loanStatus: "review", statusText: "Under Review" };
        if (stage === "Financing Review" || stage === "Submitted" || stage === "") return { financingStatus: "FINANCING_REVIEW", applicationStatus: "FINANCING_REVIEW", loanStatus: "pending", statusText: "Financing Review" };
        return { financingStatus: "APPROVED", applicationStatus: active ? "ACTIVE" : "READY_FOR_INSTALLATION", loanStatus: "approved", statusText: "Approved" };
    },

    // Base detail for an application: the portal's underwriting detail for that APP ID, else built from the
    // shared record itself (no invented figures — unknown values stay empty).
    // Sample presentation data (FINANCER_DEFAULT_DATA) is used only in local demo mode
    demoData: function () {
        return !(window.HS_CONFIG && (window.HS_CONFIG.isApi || window.HS_CONFIG.demoData === false));
    },

    baseDetail: function (app) {
        const detail = this.demoData() ? (FINANCER_DEFAULT_DATA.applications || []).find(a => a.id === app.id) : null;
        if (detail) return JSON.parse(JSON.stringify(detail));
        const months = Number(app.termMonths) > 0 ? Number(app.termMonths)
            : (app.amount && app.monthly ? Math.round(Number(app.amount) / Number(app.monthly)) : null);
        const term = months ? `${months} Months` : "—";
        const created = app.createdAt ? this.formatDate(new Date(app.createdAt)) : "—";
        return {
            id: app.id,
            paymentType: "Installment",
            applicant: { name: app.customer || "—", location: app.location || "—", phone: app.contactPhone || app.phone || "—", email: app.contactEmail || app.email || "—" },
            system: { title: app.purchasedModel || app.system || "—", sizeCategory: "standard", systemSize: app.system || "—", merchant: "—", cost: app.amount ? this.peso(app.amount) : "—" },
            loan: {
                amount: app.amount ? this.peso(app.amount) : "—",
                fundedAmount: app.amount ? this.peso(app.amount) : "—",
                monthlyPayment: app.monthly ? `${this.peso(app.monthly)}/mo` : "—",
                term, financingTerm: term,
                submittedDate: created,
                nextStep: "",
                missingRequirement: null,
                declineReason: null,
                declineDate: null
            },
            fundedAmount: app.amount ? this.peso(app.amount) : "—",
            monthlyPayment: app.monthly ? `${this.peso(app.monthly)}/mo` : "—",
            downPayment: app.downPayment != null ? this.peso(app.downPayment) : "—",
            financingTerm: term,
            repaymentStatus: "Pending Disbursement",
            installerEligible: false,
            declineReason: null,
            decisionDate: null
        };
    },

    // Financer view of one shared application record
    toView: function (app) {
        const base = this.baseDetail(app);
        const f = app.financing || {};
        const state = this.stageState(app);
        const view = {
            ...base,
            ...f,
            id: app.id,
            hsId: app.hsId || null,
            customerId: app.customerId || null,
            financerId: app.financerId,
            paymentType: "Installment",
            applicant: { ...(base.applicant || {}), ...(f.applicant || {}) },
            system: { ...(base.system || {}), ...(f.system || {}) },
            loan: { ...(base.loan || {}), ...(f.loan || {}) },
            installationStatus: app.installationStatus || null,
            systemStatus: app.systemStatus || null
        };
        view.financingStatus = state.financingStatus;
        view.applicationStatus = state.applicationStatus;
        view.loan.status = state.loanStatus;
        view.loan.statusText = state.statusText;
        view.installerEligible = state.financingStatus === "APPROVED";
        return view;
    },

    getSharedApplications: function () {
        const session = this.financerSession();
        if (!session || !window.HSShared) return [];
        return window.HSShared.applicationsForFinancer(session.accountId)
            .filter(a => !window.HSShared.isFullPayment(a))
            .map(a => this.toView(a));
    },

    contractEntryFor: function (view) {
        if (view.approvedContract) return view.approvedContract;
        const seed = this.demoData() ? (FINANCER_DEFAULT_DATA.approvedContracts || []).find(c => c.appId === view.id) : null;
        if (seed) return JSON.parse(JSON.stringify(seed));
        const months = parseInt(view.financingTerm, 10) || null;
        return {
            contractNumber: view.contractNumber || `HS-CTR-${view.id.replace(/\D/g, "")}`,
            appId: view.id,
            borrower: { name: view.applicant?.name, location: `${view.applicant?.location} · ${view.system?.sizeCategory || "Residential"}` },
            merchant: view.system?.merchant,
            fundedAmount: view.fundedAmount,
            terms: months ? `${months} mos · ${view.monthlyPayment}` : view.monthlyPayment,
            disbursedDate: view.decisionDate || "—",
            status: "Active Disbursed",
            decision: "approved"
        };
    },

    rejectedEntryFor: function (view) {
        if (view.rejectedEntry) return view.rejectedEntry;
        const seed = this.demoData() ? (FINANCER_DEFAULT_DATA.rejectedApplications || []).find(r => r.id === view.id) : null;
        if (seed) return JSON.parse(JSON.stringify(seed));
        return this.buildRejectedEntry(view, view.declineReason || view.loan?.declineReason || "—", view.decisionDate || "—");
    },

    buildRejectedEntry: function (view, reason, decisionDate) {
        let reasonCode = "dti";
        const lReason = String(reason).toLowerCase();
        if (lReason.includes("score") || lReason.includes("bureau")) reasonCode = "score";
        else if (lReason.includes("utility") || lReason.includes("bill") || lReason.includes("meter")) reasonCode = "utility";
        else if (lReason.includes("roof") || lReason.includes("structural")) reasonCode = "roof";
        return {
            id: view.id,
            applicant: { name: view.applicant?.name, location: `${view.applicant?.location} · ${view.applicant?.phone}` },
            requestedAmount: view.loan?.amount,
            merchant: view.system?.merchant,
            reasonCode,
            primaryReason: reason,
            reasonDetail: reason,
            declineDate: decisionDate,
            statusBadge: "Co-Maker Eligible"
        };
    },

    // ----------------------------------------------------------------------
    // Portal data (local display data + shared application book)
    // ----------------------------------------------------------------------
    getLocalData: function () {
        let local = null;
        try {
            local = JSON.parse(localStorage.getItem(this.LOCAL_KEY) || "null");
        } catch (e) {
            local = null;
        }
        const base = JSON.parse(JSON.stringify(FINANCER_DEFAULT_DATA));
        if (!this.demoData()) {
            // No sample portfolio figures or activity against real records (identity comes from the session account)
            base.dashboardStats = [];
            base.portfolioAllocation = [];
            base.recentActivities = [];
            base.environmentalImpact = {};
        }
        const merged = (local && typeof local === "object") ? { ...base, ...local } : base;
        this.SHARED_COLLECTIONS.forEach(k => { delete merged[k]; });
        return merged;
    },

    getPortalData: function () {
        const data = this.getLocalData();
        const session = this.financerSession();
        if (session) {
            const account = window.HSShared.getAccount("financer", session.accountId) || {};
            // Identity fields always come from the signed-in shared FIN-### account
            data.financerProfile = {
                ...(data.financerProfile || {}),
                businessName: account.name || session.businessName || "",
                fullName: account.contact || session.fullName || "",
                email: account.email || session.email || "",
                phone: account.phone || session.phone || "",
                partnerId: session.accountId,
                financerId: session.accountId
            };
        } else if (data.financerProfile) {
            data.financerProfile.financerId = null;
            data.financerProfile.partnerId = "";
        }
        const apps = this.getSharedApplications();
        data.applications = apps;
        data.approvedContracts = apps.filter(a => a.financingStatus === "APPROVED").map(a => this.contractEntryFor(a));
        data.rejectedApplications = apps.filter(a => a.financingStatus === "DECLINED").map(a => this.rejectedEntryFor(a));
        return data;
    },

    // Persists portal-local display data only; applications are shared records changed through decisions.
    savePortalData: function (data) {
        try {
            const local = { ...(data || {}) };
            this.SHARED_COLLECTIONS.forEach(k => { delete local[k]; });
            localStorage.setItem(this.LOCAL_KEY, JSON.stringify(local));
        } catch (e) {
            console.warn("Error saving portal data:", e);
        }
    },

    loadAsync: async function () {
        return this.getPortalData();
    },

    // --------------------------------------------------------------------------
    // Financer Contract (READ-ONLY consumer of the Super Admin contract system)
    // --------------------------------------------------------------------------
    // Contracts are created and managed in Super Admin → Accounts → Financers. This portal never edits them;
    // it only reads the shared fields below. Sources, in priority order:
    //   1. data.financerContract           — object injected by the backend / API for the signed-in financer
    //   2. data.financerProfile            — the same fields flattened onto the profile
    //   3. Super Admin shared record       — financers[] matched by the signed-in financer's FIN-### ID
    // A shared financer record without contract dates is "No Contract": Hello Solar owns funding and the financer
    // cannot take financing decisions (same rule as Super Admin).
    CONTRACT_FIELDS: ["contractTermMonths", "annualRate", "contractStartDate", "contractEndDate", "contractStatusOverride", "fundingOwner", "fundingOwnerId"],
    SUPER_ADMIN_STORAGE_KEY: "HELLO_SOLAR_SUPER_ADMIN_DATA_V2",
    HELLO_SOLAR_OWNER: { name: "Hello Solar", id: "HELLO-SOLAR" },

    getContractSource: function (data) {
        const hasContractFields = (obj) => !!obj && this.CONTRACT_FIELDS.some(k => obj[k] !== undefined && obj[k] !== null && obj[k] !== "");
        const profile = data?.financerProfile || {};
        if (hasContractFields(data?.financerContract)) return { record: data.financerContract, source: "api" };
        if (hasContractFields(profile)) return { record: profile, source: "profile" };
        if (profile.financerId) {
            try {
                const shared = window.HSShared ? window.HSShared.read() : JSON.parse(localStorage.getItem(this.SUPER_ADMIN_STORAGE_KEY) || "null");
                const match = (shared?.financers || []).find(f => f.id === profile.financerId);
                if (match) return { record: match, source: "super-admin" };
            } catch (_) {}
        }
        return { record: null, source: null };
    },

    // Normalizes the shared fields into a display-ready view. Status is evaluated from the shared dates at read
    // time so an expiry takes effect even before the backend recomputes the stored status/owner.
    getFinancerContract: function (asOf) {
        const data = this.getPortalData();
        const profile = data?.financerProfile || {};
        const { record, source } = this.getContractSource(data);
        const unavailable = {
            available: false, source: null, status: null, termMonths: null, annualRate: null,
            startDate: null, endDate: null, ownerName: null, ownerId: null, ownerType: null,
            daysRemaining: null, canAcceptNewFinancing: true
        };
        if (!record) return unavailable;

        const isoDate = (v) => (/^\d{4}-\d{2}-\d{2}/.test(String(v || "")) ? String(v).slice(0, 10) : null);
        const d = asOf ? new Date(asOf) : new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const start = isoDate(record.contractStartDate);
        const end = isoDate(record.contractEndDate);
        const num = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

        let status = null;
        if (record.contractStatusOverride === "Terminated") status = "Terminated";
        else if (start && end) status = today < start ? "Pending Start" : (today >= end ? "Expired" : "Active");
        else if (["Active", "Expired", "Terminated", "Pending Start"].includes(record.contractStatus)) status = record.contractStatus;
        else if (source === "super-admin") status = "No Contract";

        const financerId = record.id || record.financerId || profile.financerId || profile.partnerId || null;
        const financerName = (record.fundingOwnerId && record.fundingOwnerId === financerId && record.fundingOwner)
            || record.name || profile.businessName || "Financer";
        let owner = { name: null, id: null, type: null };
        if (status === "Active") owner = { name: financerName, id: financerId, type: "Financer" };
        else if (status) owner = { name: this.HELLO_SOLAR_OWNER.name, id: this.HELLO_SOLAR_OWNER.id, type: "Hello Solar" };

        return {
            available: true,
            source,
            status,
            termMonths: num(record.contractTermMonths),
            annualRate: num(record.annualRate),
            startDate: start,
            endDate: end,
            ownerName: owner.name,
            ownerId: owner.id,
            ownerType: owner.type,
            daysRemaining: status === "Active" ? Math.ceil((new Date(end + "T00:00:00") - new Date(today + "T00:00:00")) / 86400000) : null,
            // Only an Active contract may approve, request documents or process financing applications.
            // Pending Start / Expired / Terminated / No Contract are read-only (history stays visible).
            canAcceptNewFinancing: status === null || status === "Active"
        };
    },

    // Returns a user-facing reason when new financing is blocked by the contract, otherwise null.
    getNewFinancingBlockReason: function () {
        const c = this.getFinancerContract();
        if (c.canAcceptNewFinancing) return null;
        const state = c.status === "Pending Start"
            ? `has not started yet${c.startDate ? ` (starts ${c.startDate})` : ""}`
            : (c.status === "No Contract" ? "has not been set up by Hello Solar yet" : `is ${c.status.toLowerCase()}`);
        return `Your financing contract ${state}. Financing actions (approve, request documents, decline) are available only while the contract is Active; funding/revenue ownership is with Hello Solar. Existing applications remain available read-only for history.`;
    },

    // --------------------------------------------------------------------------
    // Reads
    // --------------------------------------------------------------------------
    getInstallmentApplications: function () {
        return this.getSharedApplications();
    },

    getApplicationById: function (appId) {
        return this.getSharedApplications().find(a => a.id === appId) || null;
    },

    getApprovedApplications: function () {
        return this.getSharedApplications().filter(a => a.financingStatus === "APPROVED");
    },

    getDeclinedApplications: function () {
        return this.getSharedApplications().filter(a => a.financingStatus === "DECLINED");
    },

    // --------------------------------------------------------------------------
    // Decisions — written to the shared application record
    // --------------------------------------------------------------------------
    // Applies a decision to an application owned by the signed-in financer. Returns the updated financer view,
    // or null when blocked (contract not Active, not signed in, or not this financer's application).
    writeDecision: function (appId, label, apply, message) {
        if (this.getNewFinancingBlockReason()) return null; // contract not Active — read-only
        const session = this.financerSession();
        if (!session || !window.HSShared) return null;
        let customerId = null;
        let decided = null;
        const result = window.HSShared.update(store => {
            const app = (store.applications || []).find(a => a.id === appId && a.financerId === session.accountId);
            if (!app) return { ok: false, error: "Application not found for this financer." };
            const view = this.toView(app);
            apply(app, view);
            app.updated = "Just now";
            app.financingDecision = { decision: label, by: session.accountId, at: new Date().toISOString() };
            customerId = app.customerId || null;
            decided = { appId: app.id, decision: label, stage: app.stage, financingStatus: app.financingStatus, applicationStatus: app.applicationStatus, financing: app.financing || null };
            window.HSShared.logActivity(store, {
                role: "Financer",
                actorId: session.accountId,
                user: `${session.accountId} (${session.businessName || session.name || "Financer"})`,
                action: `Financer ${session.accountId} ${label.toLowerCase()} for ${app.id} (${app.customer})`,
                record: app.id,
                recordType: "Application",
                details: { appId: app.id, decision: label, stage: app.stage }
            });
        }, () => ({ name: "financing.decision", payload: decided }));
        if (!result.ok) return null;
        // Targeted to the application's customer only (never broadcast to every customer)
        if (customerId && message) {
            window.HSShared.notify(Object.assign({
                recipientRole: "customer",
                recipientId: customerId,
                eventType: "financing_" + label.toLowerCase().replace(/\s+/g, "_"),
                recordId: appId,
                targetUrl: "mysystem.html",
                actionLabel: "View My System"
            }, message(appId)));
        }
        return this.getApplicationById(appId);
    },

    // Approve Financing
    approveFinancing: function (appId, approvalData = {}) {
        const now = new Date();
        const decisionDate = this.formatDate(now);
        const firstDue = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        const firstDueISO = `${firstDue.getFullYear()}-${String(firstDue.getMonth() + 1).padStart(2, "0")}-${String(firstDue.getDate()).padStart(2, "0")}`;
        return this.writeDecision(appId, "Approved", (app, view) => {
            const fundedAmount = approvalData.fundedAmount || view.loan?.fundedAmount || view.loan?.amount;
            const monthlyPayment = approvalData.monthlyPayment || view.loan?.monthlyPayment;
            const financingTerm = approvalData.financingTerm || view.loan?.financingTerm || view.loan?.term;
            const planMonths = parseInt(financingTerm, 10) || null;
            const contractNumber = `HS-CTR-2026-${appId.replace(/\D/g, "")}`;
            const f = app.financing || {};
            // Financing approved → the shared application is ready for installation (Super Admin can assign
            // Direct / Partner installation; installers see it under the clearance rule)
            app.stage = "Ready for Installation";
            app.financingStatus = "APPROVED";
            app.applicationStatus = "READY_FOR_INSTALLATION";
            app.paymentStatus = "On Time";
            app.nextDue = firstDueISO;
            app.notes = (app.notes ? app.notes + " • " : "") + `Financing approved by ${app.financer || app.financerId} on ${decisionDate}.`;
            const updated = {
                ...f,
                financingStatus: "APPROVED",
                applicationStatus: "READY_FOR_INSTALLATION",
                fundedAmount, monthlyPayment, financingTerm,
                decisionDate,
                contractNumber,
                repaymentStatus: approvalData.repaymentStatus || "Active Disbursed",
                installerEligible: true,
                declineReason: null,
                loan: { ...(f.loan || {}), fundedAmount, monthlyPayment, financingTerm, declineReason: null, declineDate: null },
                installerIntegration: {
                    eligible: true,
                    status: "READY_FOR_INSTALLATION",
                    merchant: view.system?.merchant || "—",
                    systemModel: view.system?.title,
                    systemSize: view.system?.systemSize || app.system,
                    readyDate: decisionDate,
                    customer: { name: view.applicant?.name, phone: view.applicant?.phone, location: view.applicant?.location }
                },
                repaymentSchedule: {
                    appId,
                    contractNumber,
                    borrower: view.applicant?.name,
                    location: view.applicant?.location,
                    merchant: view.system?.merchant,
                    status: "paid",
                    statusLabel: "Active Disbursed",
                    statusClass: "badge-approved",
                    fundedAmount,
                    monthlyPayment,
                    planMonths,
                    planTerm: financingTerm,
                    completedPayments: 0,
                    totalPaid: "₱0",
                    remainingBalance: fundedAmount,
                    remainingPayments: planMonths,
                    nextDueDate: this.formatDate(firstDue),
                    scheduleNote: "15th monthly (ACH Auto-Debit)",
                    recentInstallments: []
                }
            };
            updated.approvedContract = {
                contractNumber,
                appId,
                borrower: { name: view.applicant?.name, location: `${view.applicant?.location} · ${view.system?.sizeCategory || "Residential"}` },
                merchant: view.system?.merchant,
                fundedAmount,
                terms: planMonths ? `${planMonths} mos · ${monthlyPayment}` : monthlyPayment,
                disbursedDate: decisionDate,
                status: "Active Disbursed",
                decision: "approved"
            };
            delete updated.rejectedEntry;
            app.financing = updated;
        }, id => ({ title: "Solar Financing Approved!", message: `Financing approved for ${id}. Your system is cleared for installation scheduling.` }));
    },

    // Decline Financing
    declineFinancing: function (appId, declineData = {}) {
        const decisionDate = this.formatDate(new Date());
        return this.writeDecision(appId, "Declined", (app, view) => {
            const reason = declineData.reason || view.loan?.declineReason || "Underwriting Criteria Unmet";
            const f = app.financing || {};
            app.stage = "Declined";
            app.paymentStatus = "Declined";
            app.nextDue = "N/A";
            app.notes = (app.notes ? app.notes + " • " : "") + `Financing declined on ${decisionDate}: ${reason}.`;
            const updated = {
                ...f,
                financingStatus: "DECLINED",
                applicationStatus: "FINANCING_DECLINED",
                declineReason: reason,
                decisionDate,
                repaymentStatus: "Declined",
                installerEligible: false,
                installerIntegration: { eligible: false, status: "FINANCING_DECLINED" },
                loan: { ...(f.loan || {}), declineReason: reason, declineDate: decisionDate }
            };
            updated.rejectedEntry = this.buildRejectedEntry(view, reason, decisionDate);
            delete updated.approvedContract;
            delete updated.repaymentSchedule;
            app.financing = updated;
        }, id => ({ title: "Financing Application Update", message: `Application ${id} was declined by the credit assessment committee.`, targetUrl: "support.html", actionLabel: "Contact Support" }));
    },

    // Request Documents
    requestDocuments: function (appId) {
        return this.writeDecision(appId, "Documents Requested", (app, view) => {
            const f = app.financing || {};
            app.stage = "Missing Documents";
            app.paymentStatus = "Financing Review";
            app.financing = {
                ...f,
                financingStatus: "DOCUMENTS_REQUIRED",
                applicationStatus: "DOCUMENTS_REQUIRED",
                loan: { ...(f.loan || {}), nextStep: "Pending applicant upload of missing document verification" }
            };
        }, id => ({ title: "Additional Document Required", message: `Please upload the missing requirements for application ${id}.`, actionLabel: "Upload Document" }));
    }
};
