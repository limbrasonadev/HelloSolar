# Editing Installer Information

Edit `installer.json` to configure the data displayed in the Hello Solar Installer Portal. Ensure strict JSON syntax: use double quotes around strings and keys, separate entries with commas, and avoid trailing commas or comments.

---

## Dataset Structure

The authoritative dataset contains the following top-level keys:

| Section | Controls |
| --- | --- |
| `profile` | Default contractor profile details, credentials, and business info |
| `jobs` | My Jobs assignments, technical specs, site access, and summary counts |
| `payouts` | Milestone payouts linked to jobs, calculations, status badges, and CSV export |
| `checklist` | Default technical preparation checklist items |
| `faqs` | Searchable FAQs displayed on the Support page |
| `sop` | Standard operating procedures and safety standards |

---

## Field Specifications & Validation Rules

### Job Fields (`jobs`)

- `id` *(string, required)*: Unique, stable identifier (e.g., `"JOB-2026-081"`). Used for deep-linking, notes persistence, and payout linking.
- `customer` *(string, required)*: Client or project site name (e.g., `"Bautista Residence"`).
- `site` *(string, required)*: Physical installation address or barangay/city (e.g., `"Batasan Hills, Quezon City"`).
- `region` *(string, required)*: Region / province (e.g., `"Metro Manila"`).
- `system` *(string, required)*: Solar system package name and capacity (e.g., `"5.4 kW Hybrid"`).
- `capacityKwp` *(number, required)*: Numeric capacity in kWp (e.g., `5.4`).
- `status` *(string, required)*: Exactly one of:
  - `"Scheduled"`
  - `"In progress"`
  - `"Completed"`
- `date` *(string, required)*: Scheduled appointment or completion date text.
- `step` *(string, required)*: The specific next action for the installer technician.
- `progress` *(number, required)*: Integer from `0` to `100`.
- `stage` *(string, optional)*: High-level milestone name (e.g., `"Pre-Installation & Site Access"`).
- `coordinator` *(string, optional)*: Assigned field coordinator name and contact phone.
- `technicalSpecs` *(object, optional)*: Detailed hardware specifications:
  - `panels`: Solar PV panel make, model, and quantity.
  - `inverter`: Inverter specifications.
  - `battery`: Battery ESS specs (or `"None"`).
  - `mounting`: Mounting hardware type.
  - `sldPermit`: Single-Line Diagram and LGU building/electrical permit status.
  - `siteAccess`: Site access, parking, and security protocols.
- `checklist` *(array of strings, optional)*: Job-specific preparation checklist items.
- `siteNotes` *(string, optional)*: Approved field notes or customer routing instructions.

---

### Payout Fields (`payouts`)

- `id` *(string, required)*: Unique stable payout reference (e.g., `"PAY-2026-101"`).
- `job` *(string, required)*: Must match an existing job `id` in the `jobs` list.
- `customer` *(string, optional)*: Display customer name matching the job.
- `milestone` *(string, optional)*: Milestone stage (e.g., `"Final Commissioning & Handover (20%)"`).
- `amount` *(number, required)*: Net payable or disbursed amount in Philippine Pesos (numeric, non-negative, e.g. `18130`). Enter numeric value, not formatted strings.
- `grossAmount` *(number, optional)*: Total labor milestone fee before statutory deductions.
- `cwtPercent` *(number, optional)*: Creditable withholding tax percentage (default `2`).
- `cwtDeduction` *(number, optional)*: Withholding tax deduction amount.
- `status` *(string, required)*: Exactly one of:
  - `"Paid"`: Disbursed to registered bank account.
  - `"Pending review"`: Field photos submitted and under review. *Note: Does not imply funds released.*
  - `"Scheduled"`: Milestone queued for future release upon site staging or completion.
- `date` *(string, required)*: Actual or estimated release date string.
- `bank` *(string, optional)*: Registered bank account identifier.
- `refCode` *(string, optional)*: Bank transfer reference or pending audit code.
- `note` *(string, optional)*: Itemized breakdown explanation or verification notes.

---

### Checklist Items (`checklist`)

An array of text strings representing the safety and equipment checks to perform prior to rooftop ascent. Saved checks on each device are tracked per job, preserving contractor input across sessions.

---

### FAQs (`faqs`)

- `category` *(string, required)*: One of `"Site Access & Scheduling"`, `"Payout & BIR 2307"`, `"Equipment & Permits"`, `"Safety & Quality Standards"`, `"Profile & Credentials"`, or `"Customer Handover"`.
- `q` *(string, required)*: The frequently asked question.
- `a` *(string, required)*: Clear, approved answer and protocol.

---

## Loading and Validating Changes

### 1. Hosted Web Server (HTTP / HTTPS)
When hosted on a static web server or local development server, simply save `assets/data/installer.json` and refresh your browser. The portal automatically re-fetches and validates the file.

### 2. Direct File Access (`file:///`)
When opening the HTML files directly from disk without a local server, browsers restrict cross-origin `fetch()` calls. Use the collapsible **"Edit preview data"** panel at the bottom of any page:
1. Click **"Edit preview data"** in the footer to expand the tool.
2. Select your edited `installer.json` file.
3. The engine automatically validates required fields, status values, and linked references.
4. If valid, the new data is saved to browser storage and instantly updates the page without needing a server.
5. If invalid, a clear error message is displayed and the previous valid data is retained.
