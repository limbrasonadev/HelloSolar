Hello Solar Super Admin Dashboard

A central monitoring and management control center connecting the Customer, Financer, Installer, and Merchant portals.

Built with Vanilla HTML, CSS, and JavaScript only.

Files:
- index.html   : Main application markup, layout, modals, and slide-over drawers
- styles.css   : Complete design system (Plus Jakarta Sans, warm ivory palette, collapsible sidebar, responsive layout)
- data.js      : Centralized relational data model and state engine (persisted via localStorage)
- app.js       : Application controller, live filtering, KPI recomputations, and Hello Solar Direct workflow

Sidebar Structure:
- Overview
- Operations:
  * Applications
  * Installations
  * Accounts (Customers, Financers, Installers, Merchants tabs)
  * Payments
- Management:
  * Support
  * Activity (Audit log)
- System:
  * Settings

Key Features:
1. Overview: 5 Main KPI cards, Operations Overview compact summaries, Needs Attention prioritized section, and Recent Activity log.
2. Applications: Lifecycle tracking from Submitted to Installation. Contains the "🏠 Direct Install" Home icon action for eligible approved applications.
3. Hello Solar Direct Installation: Super Admin can accept projects to be installed directly by the Hello Solar Internal Engineering Team, bypassing partner installer dispatch. Automatically schedules the project under Installations -> Hello Solar Direct and updates KPIs & audit logs.
4. Installations: Central tracker with filters for Partner Installer, Hello Solar Direct, Maintenance, and Completed jobs.
5. Accounts: Single management page with tabbed views for Customers, Financers, Installers, and Merchants with live status toggling (Activate / Deactivate).
6. Payments: Repayment health, loan amortization monitoring, overdue tracking, and payment recording.
7. Support: Consolidated ticketing system across all 4 portal types.
8. Activity: Searchable audit log tracing all platform actions and decisions.
9. Settings: Platform preferences, operational alert thresholds, and demo reset controls.

How to run:
1. Open the folder in VS Code or any static server.
2. Open index.html in a web browser (e.g. with Live Server or by double clicking index.html).

Direct Installation Engineer (prototype role)
- Real accounts: Super Admin > Create Account > Direct Install Engineer (Engineer ID, name,
  email, mobile, password, status). Engineers log in with email or Engineer ID; only Active
  accounts can sign in, and deactivation ends an open session. Listed under Accounts > Engineers.
- Demo/prototype fallback login: engineer@hellosolar.ph (or "engineer") / engineer123 -> Engr. Mark Dizon
- Access: Applications (Hello Solar Direct / internal only, view-only except the Direct
  Installation action) and Installations (Hello Solar Direct jobs only).
- Actions: Accept job, Reference Number, Solar Panels, Inverter, Battery,
  Installation Progress, Complete Installation, Activate System.
- Progress is saved per APP ID on app.installationProgress and in the shared
  "hello_solar_installation_progress" store (same structure as the Installer Portal).
