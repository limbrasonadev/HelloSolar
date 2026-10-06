# Hello Solar — Backend Integration Guide

## 1. Goal

The frontend is already complete.

The backend developer only needs to connect the existing frontend to:

- Database
- API
- Authentication
- File storage
- Email service
- Notifications
- Telemetry later

Do not redesign or rewrite the portal UI.

## 2. Architecture

All portals use a shared service layer.

Customer
Financer
Installer
Merchant
Super Admin
Landing Page
        ↓
HSShared / HelloSolarStore
        ↓
HSApi
        ↓
Backend API
        ↓
Database

### Local Mode
Uses localStorage and demo data.

### API Mode
Uses the real backend and disables demo data.

Config:

shared/hello-solar-config.js

Set:

mode: "local"

for frontend/demo testing.

Set:

mode: "api"

when connecting the real backend.

## 3. Portals and Roles

### Customer
ID: CUS-####
Can only access their own systems, payments, documents, support and notifications.

### Financer
ID: FIN-###
Can only access installment applications assigned to them.

### Installer
ID: INS-###
Can only access eligible or assigned Partner Installer jobs.

### Merchant
ID: MER-###
Merchant account and future merchant project/payout data.

### Super Admin
Can manage the entire Hello Solar system.

### Direct Engineer
ID: ENG-###
Can only manage Hello Solar Direct installations.

All portals keep their own login pages.

The backend can use one authentication system with role checks.

## 4. Main IDs

Customer: CUS-####
Financer: FIN-###
Installer: INS-###
Merchant: MER-###
Engineer: ENG-###

Application: APP-####
Solar System: HS-#####
Installation Job: JOB-###
Support Ticket: SUP-###
Receipt: RCPT-...
Inquiry: INQ-...
Partner Inquiry: PINQ-...

The backend should generate and validate these IDs.

## 5. Main Data

The backend should store:

- Accounts
- Inquiries
- Applications
- Solar systems
- Financer contracts
- Payments
- Payment schedules
- Receipts
- Documents
- Installation jobs
- Installation progress
- Support tickets
- Notifications
- Activity logs
- Settings
- Installation costs

The Application record is the main record connecting the portals.

## 6. Main API Requirements

### Authentication

POST /auth/login
POST /auth/logout
POST /auth/register
GET /bootstrap

`/bootstrap` returns only data allowed for the logged-in role.

### Landing Page

POST /public/inquiries

Customer and partner inquiries are sent here.

Customer confirmation:

GET /public/inquiries/:id?token=...
POST /public/inquiries/:id/response

The backend creates the confirmation token.

### Customer

Examples:

POST /applications/claim
POST /applications/:appId/receipts
POST /applications/:appId/documents/:docId
POST /support/tickets

### Financer

Financer can:

- Review assigned applications
- Request documents
- Approve financing
- Decline financing

The backend must verify that the application belongs to that financer.

### Installer

Installer flow:

Assigned
→ Accept / Decline
→ Start
→ Progress
→ Complete
→ Activate

Every action must update both:

- Application
- Installation Job

### Super Admin

Super Admin actions go through:

POST /admin/commands/<command>

Examples:

- Create Account
- Assign Financer
- Assign Installer
- Verify Receipt
- Reject Receipt
- Manage Contracts
- Manage Support
- Manage Inquiries
- Direct Installation
- Installation Cost
- System Disconnect
- Settings

`HelloSolarStore` already contains the frontend reference logic.

## 7. Payments

### Full Payment

Customer uploads receipt
→ Super Admin verifies
→ Payment becomes Paid
→ Application becomes Ready for Installation

### Installment

Backend owns:

- 60-month payment schedule
- ₱10,000 down payment
- due dates
- payment status
- overdue calculation
- payment history

Do not generate installment schedules in the browser.

## 8. Documents

Required documents include:

- Government ID
- Proof of Income
- Proof of Billing
- Bank Statement
- Other requested documents

Files should be uploaded to server/object storage.

Do not store files as base64 in localStorage.

Backend returns a secure `fileUrl`.

## 9. Installation

### Partner Installer

Super Admin assigns
→ Installer Accept / Decline
→ Start
→ Update Progress
→ Complete
→ Activate

### Hello Solar Direct

Super Admin assigns Direct Installation
→ Direct Engineer accepts
→ Progress
→ Complete
→ Activate

System becomes:

ACTIVE

after successful activation.

## 10. Email

Backend must send:

- Inquiry Confirmation
- Customer Account Activation
- Partner Account notifications
- Password setup/reset
- Optional payment/document/installation updates

The frontend currently only simulates these.

## 11. Notifications

Backend creates notifications based on system events.

Always target:

recipientRole
+
recipientId

Do not broadcast private notifications to every account.

## 12. File Uploads

Backend storage is needed for:

- Required documents
- Payment receipts
- Profile photos

Use secure object/file storage and return URLs to the frontend.

## 13. Telemetry

Later backend/hardware integration should provide:

GET /systems/:hsId/telemetry
GET /systems/:hsId/savings
GET /systems/:hsId/equipment
GET /systems/:hsId/warranties

These power the Customer Energy / My System pages.

## 14. Backend Responsibilities

The backend must control:

- Password hashing
- Login sessions/tokens
- Role permissions
- Database persistence
- ID generation
- Confirmation tokens
- Pricing
- Payment schedules
- Overdue calculations
- Installer visibility
- Status transitions
- Duplicate prevention
- Notifications
- Activity logs
- Email
- File storage

Do not trust the browser for these rules.

## 15. Remaining Integration Work

Still needs real backend connection:

- Customer activation / set-password page
- Receipt file upload
- Profile photo upload
- Financer support tickets
- Merchant support tickets
- Merchant projects and payouts
- Installer payout history
- Installer checklist/site notes
- Telemetry
- Equipment
- Warranty
- Savings

## 16. Testing

Local mode must continue working.

API mode must:

- show only backend data
- show no demo records
- enforce role access
- preserve APP / HS IDs
- keep statuses synchronized
- return updated records after every command
- produce no console errors

Existing frontend tests should continue passing.

## Important

Do not rewrite the portal UI.

Use:

HSShared
HelloSolarStore
HSApi

as the connection between the frontend and backend.