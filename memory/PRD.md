# POLARIS × MVVNL Master Dashboard – PRD

## Problem Statement
Create a professional dashboard for the MVVNL/POLARIS electrical utility project using details from an uploaded Excel "MASTER DASHBOARD" containing 19 categorized resource links (Google Drive docs / spreadsheets / folders + STYRA dashboard URL).

## User Choices
- Language: **English only**
- Theme: **Modern Vibrant (colorful, energetic)** — light + dark mode toggle

## Architecture
- **Backend**: FastAPI on 0.0.0.0:8001, MongoDB (via MONGO_URL). All routes prefixed with `/api`. Auto-seeds 19 resources on startup.
- **Frontend**: React (CRA + craco), Tailwind, Framer Motion, Recharts, lucide-react icons, `Outfit` + `Manrope` fonts.

## Data Model
- `Resource` — id (uuid), sno, title, description, category, kind, url, starred, created_at
- `ActivityLog` — id, resource_id, resource_title, action, timestamp
- Categories: Operations, HR, Finance, Inventory, Reports, Legal, Customer
- Kinds: dashboard, spreadsheet, document, folder

## APIs
- `GET /api/resources?category=&q=` list/filter/search
- `GET /api/resources/{id}` fetch one
- `PATCH /api/resources/{id}` toggle starred
- `GET /api/stats` totals + charts data
- `GET /api/categories` list
- `POST /api/activity` log open/star
- `GET /api/activity?limit=` recent

## Implemented (2026-02-03)
- Sidebar with category counts + theme toggle
- Hero with grid image, live badge, CTA to STYRA
- Bento KPI grid (Total, Categories, Starred, Activity, FY badge)
- Recharts donut (by category) + bar (by kind)
- Activity feed
- Category filter pills, live search
- Star / unstar, opens external in new tab and logs activity
- Light + dark mode with localStorage persistence
- Fully responsive with mobile sidebar overlay
- Sonner toaster for feedback
- 19 real resource links seeded from Excel

## Testing (iteration_1.json)
- Backend: 100% pass
- Frontend: 94% pass (2 optional suggestions applied)

## Backlog (P1 / P2)
- P1: Sort/pin favorites persistence per user
- P1: Bulk CSV export of resources
- P2: Custom resource creation UI (admin add/edit)
- P2: Team activity dashboard with per-user attribution
- P2: Rich analytics page (opens over time)

## Update — 2026-02-04 · Daily Expenses Module + Rebrand

### Rebrand
- Company/domain name now shown as **Prathvi Power Solutions** in sidebar, hero badge, page title, footer.
- Existing POLARIS/MVVNL data (19 resources) and design system unchanged.

### Daily Expenses Module (`/expenses`)
- Menu: new **Modules → Daily Expenses** entry in sidebar. Overview shows compact snapshot with "Open module" CTA.
- **Data model**: Expense (id, date, category, amount, payment_mode, description, attachment, created_at, updated_at) + Budget (month, amount).
- **APIs**: `/api/expenses` (list/create), `/api/expenses/item/{id}` (get/patch/delete), `/api/expenses/count`, `/api/expenses/categories`, `/api/expenses/summary/dashboard`, `/api/expenses/analytics/{monthly,category,weekly,payment}`, `/api/expenses/export/excel`, `/api/expenses/backup`, `/api/expenses/restore`, `/api/budget`.
- **Form**: date (default today), category (preset + custom), amount, payment mode toggle (Cash/UPI/Bank/Card), description, attachment (≤2MB base64), Save/Update/Reset/Cancel, validation via pydantic + client.
- **History**: responsive table + mobile cards, search, category/mode/date filters, sort date/amount, pagination (10/page), edit-inline, delete with confirmation modal.
- **Analytics**: Recharts monthly bar, weekly line, category donut, top categories, budget-vs-actual bar.
- **Budget**: monthly upsert; utilization bar; auto warning banner ≥80%; over-budget red state.
- **Export**: Excel (openpyxl backend), Print/PDF via popup (browser print → save PDF), JSON backup download + merge restore.
- **Security**: pydantic validation, sanitization (trim + length caps), amount coerced to positive float, indexed columns.

### Testing (iteration_2.json)
- Backend: 36/36 pytest green
- Frontend: 100% of scoped flows

### Backlog notes surfaced by testing agent
- (Optional) Split server.py into routers by module
- (Optional) Stricter validation on restore payloads
- (Optional) Add authentication for write endpoints

## Update — 2026-02-04 · Excel Import feature

- **Import Excel** button added to `/expenses` toolbar (next to Export/Backup/Restore); opens 3-step wizard.
- Backend endpoints: `POST /api/expenses/import/preview` (multipart .xlsx/.xls/.xlsm, fuzzy header mapping, per-row validation, duplicate detection, empty-row skip, custom-category detection) and `POST /api/expenses/import/commit` (batched insert 1000/batch, skip_duplicates toggle).
- Header aliases matched: Date/DATE/Dt/Expense Date · Category/Cat/Type/Head · Amount/Amt/Value/Total · PaymentMode/Payment Mode/Mode · Description/Remarks/Details/Notes · Attachment.
- Payment mode normalized: UPI/GPay/PhonePe/Paytm→UPI, card/credit/debit→Card, bank/neft/imps/rtgs/transfer/cheque→Bank, else Cash.
- Duplicate signature: `date|round(amount,2)|category.lower()|description.lower()`.
- On successful commit, ExpensesPage calls `refreshAll` → summary cards, table, charts and budget update automatically.
- Testing (iteration_3.json): 12/12 new backend tests + 36/36 regression pass; frontend flow 100%. Sample file imports 172/180 rows correctly with 8 amount-missing rows correctly flagged invalid.

## Backlog notes surfaced by testing agent (all optional)
- Split server.py into per-module routers
- Use Mongo unique compound index for duplicates instead of loading all sigs
- Reuse pydantic Expense model in import commit for defense-in-depth
- For very large imports, use server-side upload token instead of round-tripping rows

## Update — 2026-02-04 · HRMS & Payroll Module (Phase 1)

### Scope delivered (Phase 1)
- **Employee Master**: auto emp_code (EMP-XXXX), 25 fields (personal, job, statutory, salary, bank), photo + multi-document upload (Aadhaar/PAN/Resume/Appointment/ID Card/Increment/Experience/Warning/Relieving/Other), tabbed dialog, search + department/designation/status/joining/salary filters.
- **Attendance**: daily marking with per-row status/check-in/check-out/remarks, bulk-mark buttons, computed working_hours/overtime/late_minutes; monthly register with per-day color-coded cells and P/A/L totals; upsert-on-key `(employee_id, date)`.
- **Leaves**: apply / approve / reject; approval auto-writes 'Leave' attendance rows for the date range; annual balance by type (Casual/Sick/Paid/Earned/Maternity/LWP with default quotas).
- **Payroll**: one-click `POST /payroll/generate` for a month — prorates fixed structure by attendance ratio, computes PF (12%/12% capped at ₹15,000), ESIC (0.75%/3.25% only when gross ≤ ₹21,000), PT (₹200 default), overtime at 1.5× per-hour basic+DA; per-employee payslip modal with Print/PDF (client-side window.print).
- **Reports**: Excel exports for Employees, Attendance, Payroll, PF register, ESIC register (all via openpyxl).
- **HRMS Dashboard**: KPI cards (Total/Present/Absent/On-Leave/Late/Pending-Leaves/Today Cost/Monthly Payroll/PF/ESIC), attendance trend (14 days), department pie, payroll bar (6 months), YTD leave stats, upcoming birthdays & work anniversaries.
- **Settings**: company details, working days, office timings, late threshold, PF/ESIC percentages, PT — all persisted and used by payroll.

### Architecture
- Backend: new `/app/backend/hrms.py` (`hrms_router`, `init_hrms(db)`), included by `server.py`. Parameterized routes use segments like `/employees/{id}`, `/leaves/{id}` — no shadowing.
- Frontend: new pages under `/app/frontend/src/pages/hrms/`, shared `HrmsLayout` + `hrmsApi.js`, routes `/hrms`, `/hrms/{employees,attendance,leaves,payroll,reports,settings}`.
- Sidebar gained a single "HRMS & Payroll" entry keeping the existing look intact.

### Deferred to Phase 2 (per user)
- Shift Management module, Loans & Advances tracking, standalone Documents module page, Notifications (birthdays/reminders/holidays), User Roles + login, Google Sheets 2-way sync, Audit Logs, backup/restore for HRMS collections, holiday calendar UI.

### Testing (iteration_4.json)
- Backend: 29/29 pytest green (employee CRUD + filters + docs, attendance upsert + bulk + register, leave approve→attendance cascade, payroll math for PF/ESIC/PT/net, dashboard aggregates, 5 exports, regression on legacy endpoints).
- Frontend: all pages render, KPIs populated from real seeded data, test-ids intact.

## Update — 2026-02-04 · Payroll — Import Old Salary Sheets

- New **Import Old Sheet** button on `/hrms/payroll` opens a 3-step wizard (pick month + file → preview & confirm → result).
- Backend endpoints: `POST /api/hrms/payroll/import/preview` (multipart file + month) and `POST /api/hrms/payroll/import/commit` (JSON rows + `create_missing`/`overwrite` flags).
- Header aliases mapped: Name/Employee/Staff · Emp Code/Code/ID · Basic/HRA/DA/Conveyance/Special · Bonus/Incentive/Overtime/Arrears/Reimbursements · Gross/Total Earnings · PF (employee/employer) · ESIC (employee/employer) · Prof Tax/TDS/Advance/Loan EMI/Other/Total Deductions · Net/Take Home · Present/Leave/Absent/Working Days.
- Employee matching: Emp Code → Name (case-insensitive) → auto-create minimal employee (default option). Missing gross/net/total_deductions are auto-derived from the other numbers.
- Duplicate detection: by `(employee_id, month)`; user can choose overwrite (default) or skip.
- Verified end-to-end with a sample sheet: 4 rows, 3 matched (2 by code + 1 by name) + 1 new employee auto-created, correct gross/PF/ESIC/net inr amounts imported. UI dialog with color-coded rows (green=matched, yellow=new, blue=duplicate, red=invalid), summary chips, and result step. Reports and dashboard aggregates immediately reflect the imported months.

## Update — 2026-02-04 · Vendor Billing (Rate Master + WCC AI + Invoice) — Phase 1

- New **Vendor Billing** module at `/billing` with 4 tabs: Rate Master · New Invoice (WCC) · Invoices · Audit Log.
- **Rate Master** seeded with all 12 R K Enterprises rates (DT Meter ₹1100, Consumer Survey ₹25, 1-PH Cable ₹140, etc.). Full CRUD + activate/deactivate + Excel import/export + rate history + audit logging on every change.
- **WCC AI parsing** (`POST /api/billing/wcc/parse`) uses pdfplumber table extraction to find the "Billable Quantity" column and rapidfuzz WRatio for product name matching. Tested with your 3 uploaded WCC PDFs:
  - MI: 5 items matched (1-PH Consumer 50, 3-PH Consumer 4, 1-PH NSC 293, 3-PH NSC 3, DT Meter 81)
  - CI: 2 items matched (Consumer Survey 11,518, DT Survey 2)
  - Cable: 1 item matched (1 PH Cable Installation 113)
- **Invoice Generation**: auto invoice number (RKE/YYYY-MM/0001), CGST+SGST or IGST, round-off, editable lines. **Rates are snapshotted** on the invoice so future rate edits never affect past invoices.
- **New product prompt**: if AI finds an unknown product, a popup lets you set the rate; it's saved to Rate Master and reused forever.
- **Exports**: Rate Master (Excel), each invoice (Excel), printable PDF (browser print).
- Sidebar entry "Vendor Billing" added under Modules; existing HRMS, Daily Expenses and Overview untouched.

## Update — 2026-02-04 · Billing Phase 2 (Bulk WCC + Branded PDF + Payment Tracker)

### Bulk WCC Import
- New "Bulk WCC" tab lets user drop multiple PDFs, sets one customer, hits "AI Extract All" (loops each file through `/wcc/parse`), reviews per-file matched line items and unknowns, then one click "Create N Invoices" fires one invoice per PDF.

### Branded Invoice PDF
- New `/api/billing/company` endpoint stores company name, GSTIN, PAN, address, phone, email, logo (base64, ≤500KB), bank name/account/IFSC/branch, invoice_prefix and footer.
- Print PDF now shows: logo + company header, GSTIN/PAN, Bill To + Place of Supply boxes, line items, totals block, **Amount in Words** (Indian Lakh/Crore format via `amountToWords()`), bank details box, PAID stamp when applicable, dual signature line, footer text.

### Payment Tracker
- Invoice schema gained `payment_status` (Unpaid / Partly Paid / Paid / Overdue), `paid_amount`, `due_date`.
- `PATCH /api/billing/invoices/{id}/payment` — updates payment and auto-derives status from `paid_amount` when only paid amount is sent.
- Invoice list shows Paid column + Due amount + clickable status pill → payment dialog with paid amount & due date.
- New `/api/billing/dashboard/summary` returns Total Invoices / Billed / Collected / Outstanding / Overdue amount and by-status counts.
- Invoice list top now shows 5 dashboard tiles with live outstanding + overdue amounts.

### Verified E2E
- Company saved (GSTIN, HDFC bank, account).
- 3 uploaded WCC PDFs → 3 invoices auto-created in one shot (₹1,94,057 + ₹3,39,840 + ₹18,668 = ₹5,52,565).
- Partial payment of ₹50,000 on one invoice → Collected ₹50,000 · Outstanding ₹5,02,565 · tiles update instantly.


## Update — 2026-02-05 · Billing Phase 3 (Payment History + Customer Statement)

### Payment History (per invoice)
- New collection `billing_payments`. Every payment is logged as a separate entry with `date, amount, method (Bank/UPI/Cash/Cheque/Card/Other), reference/UTR, remarks`.
- Endpoints: `POST /api/billing/invoices/{id}/payments`, `GET /api/billing/invoices/{id}/payments`, `DELETE /api/billing/payments/{pid}` — each add/delete automatically recomputes invoice `paid_amount` and `payment_status` (Unpaid / Partly Paid / Paid).
- Frontend: PayDialog upgraded — status pill on invoice row opens dialog showing Invoice / Paid / Outstanding tiles, an Add Payment form (date, amount, method, reference, remarks, "Fill Outstanding" shortcut), and a live Transactions table with per-row delete.
- Cheque method requires reference (validated client-side).

### Customer Statement
- New sidebar tab `Statement`. Endpoint `GET /api/billing/statement?customer&start&end` returns opening_balance, closing_balance, total_billed, total_paid, and full invoices + payments arrays in the period.
- UI: pick customer from datalist of past customers, from/to dates, Generate → 4 KPI tiles + Invoices table + Payments table.
- Print → dedicated popup with R K ENTERPRISES branded layout: logo, GSTIN, STATEMENT OF ACCOUNT header, period, customer, 4 KPI cards, invoices & payments tables, and a bold Closing Balance bar. Auto-triggers `window.print()`.

### Testing (iteration_5.json)
- Backend: 11/11 pytest green — POST/GET/DELETE payments, statement math (incl. opening balance carried from previous period), status transitions Unpaid → Partly → Paid → Unpaid.
- Frontend: PayDialog and Statement flow verified end-to-end (₹3,000 + ₹1,000 partial payments, correct status pill, print popup opens).

### Backlog surfaced by testing agent
- Server-side validation of statement date format (return 400 on bad ISO).
- Reject overpayment (amount > outstanding) in add_payment.
- Extract `is_fully_paid` helper (50-paise fuzz) — currently duplicated in 3 places.
- Split billing.py (867 lines) into `rates.py`, `invoices.py`, `payments.py`.

## Pending / Next
- P1: Vendor Billing RBAC (Admin edits Rate Master, Operator read-only).
- P1: HRMS RBAC (Super Admin / HR / Manager / Accountant / Employee).
- P2: HRMS Shift Management, Advance & Loan (EMI recovery), Document Letters, Google Sheets sync.
- Tech-debt: refactor BillingPage.jsx (>1100 lines) into feature components; split billing.py + hrms.py.
- Fix React `useEffect` dep warnings in HRMS pages.
