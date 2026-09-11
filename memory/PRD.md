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

## Update — 2026-02-05 · DISCOM Module (Master Data + Consumer Inquiry)

### Scope
- New sidebar entry **DISCOM** at `/discom` with two tabs: **Master Data** and **Consumer Inquiry**.
- Handles UPPCL consumer master data for 4 divisions under EDC Sitapur: SITAPUR-I, SITAPUR-II, BISWAN-III, MAHMUDABAD-IV.

### Master Data
- 4 division tiles showing live consumer counts. Click a tile to activate its panel.
- **Ingest** options per division:
  - One-tap "Load from Emergent Asset URL" (pre-wired to the 4 uploaded `.gz` artifact URLs)
  - Manual upload `.csv` / `.csv.gz`
- **Streaming ingest**: backend fetches gzip via httpx, decompresses, csv-parses, batch-inserts 5000/rows at a time into `discom_consumers`. Wipes existing division rows on ingest (replace mode). Async background task with polling `/jobs/{id}`.
- **Schema-agnostic**: preserves ALL 141 raw columns under `raw` sub-doc; lifts 27 high-value fields (KNO, SCNO, ACCT_ID, NAME, FATHER_NAME, MOBILE_NO, ADDRESS, LOAD, CON_STATUS, METER_BADGE_NO, SS_NAME, FEEDER_NAME, DT_NAME, BILLED_AMOUNT, TOTAL_OUTSTANDING, etc.) to top level with indexes for fast search.
- **Search & filter**: full-text style search across KNO/SCNO/ACCT_ID/NAME/FATHER_NAME/MOBILE/METER/ADDRESS/VILLAGE, field-scope selector, connection-status + supply-type filters, paginated 25/page.
- **Detail modal**: on "View" a full grouped record dialog (Identity / Consumer / Connection / Meter / Readings / Billing / Payment / Network) with all raw fields.
- **Clear** button per division to wipe rows + meta.

### Consumer Inquiry
- Direct link + button that opens `https://consumer.uppcl.org/wss/pay_bill_home` in a new tab.
- Embedded iframe preview (falls back gracefully if UPPCL blocks embedding).

### Backend
- New module `/app/backend/discom.py` (~350 lines) with router mounted in `server.py`.
- Endpoints: `GET /divisions`, `POST /ingest/url`, `POST /ingest/upload`, `GET /jobs`, `GET /jobs/{id}`, `GET /consumers`, `GET /consumers/{id}`, `GET /stats`, `DELETE /division/{code}`.
- Indexes on `(division, KNO)`, `(division, SCNO)`, `(division, NAME)`, `(division, MOBILE_NO)`, `(division, METER_BADGE_NO)`.

### Verified E2E
- All 4 divisions ingested from artifact URLs — total **740,217 consumers** (SITAPUR-I: 148,287 · SITAPUR-II: 234,635 · BISWAN-III: 206,451 · MAHMUDABAD-IV: 150,844).
- Field-scoped NAME search "ANITA" → 303 matches; multi-field search → 338 matches.
- Sidebar DISCOM entry active, tab switching, iframe preview, detail modal all working.

### Note
- Parallel ingest of multiple heavy gzips can stall the event loop under contention — recommend running one division at a time. Sequential ingest of all 4 completed in ~90 seconds total.

## Update — 2026-02-05 · Phase 3: Auth + Admin Panel

### Scope delivered (Phase 3)
Master 3-phase upgrade split — this is Phase 3 (Auth + Admin). Mobile responsive (Phase 1) and Android app (Phase 2) will follow in dedicated sessions.

### JWT Authentication
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/refresh`, `POST /api/auth/change-password`
- **PyJWT + bcrypt** — playbook-verified. Access token 12h, refresh 30d, httpOnly `SameSite=none` cookies + Bearer token in JSON response.
- **Brute-force lockout**: 5 fails in 15 min = 15-min IP+email lockout. XFF handling fixed to take first client IP token.
- **Super Admin seed** — idempotent from `ADMIN_EMAIL` / `ADMIN_PASSWORD` env; re-syncs hash if env password changes.

### Admin Panel `/admin`
Frontend guard `AdminRoute` — redirects to `/admin/login` if no token, and admin API `axios` interceptor auto-signs out on any 401.

**Pages:**
- **`/admin/login`** — email+password, show/hide password, error state, session-expiry note
- **`/admin`** — KPI grid (Users active/inactive, Resources, Modules, DISCOM consumers, HRMS employees, Invoices), Users-by-Role pie chart, Recent Logins, Recent Activity
- **`/admin/users`** — search/filter (role, status), Add/Edit/Delete/Reset-Password/Toggle-Status. Mobile-friendly cards on <md screens. Cannot delete self, cannot demote self, only super_admin can create super_admin.
- **`/admin/resources`** — CRUD on existing `db.resources` (the 19 seeded Google Sheets/Docs links). Category filter pills, star, enable/disable, allowed_roles field.
- **`/admin/activity`** — audit log with filter by user email / module / action / date range.

**Backend `/api/admin/*` endpoints** — all require role `super_admin` or `admin`. Every mutation writes an entry into `audit_log`.

### Roles
`super_admin` (full) · `admin` (mgmt except demote/promote super) · `staff` (module access) · `viewer` (read-only). Roles are configurable per-user via `role` + optional `permissions[]` for future fine-grained checks.

### DB additions
- `users` (unique index on email) with fields `id, email, password_hash, name, role, status, mobile, employee_id, department, designation, permissions[], created_at, last_login`
- `login_attempts` (identifier index) for brute-force
- `audit_log` (timestamp desc index, user_email index)

### Files added / changed
- Backend: `/app/backend/auth.py` (new, 380 lines), `server.py` (+7 lines to include routers and startup seed), `backend/.env` (+ JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME)
- Frontend: `lib/adminApi.js`, `components/admin/AdminRoute.jsx`, `components/admin/AdminLayout.jsx`, `pages/admin/AdminLogin.jsx`, `pages/admin/AdminDashboard.jsx`, `pages/admin/UsersPage.jsx`, `pages/admin/ResourcesPage.jsx`, `pages/admin/ActivityLogPage.jsx`, `App.js` (+5 routes)
- `/app/memory/test_credentials.md` — super admin creds documented
- Auth playbook applied verbatim; no cross-cutting changes to existing modules

### Verified
- **iteration_6.json** 25/26 pytest — brute-force lockout initially failed due to XFF issue
- **iteration_7.json** 26/26 pytest ✅ — after XFF fix + collection name fix
- Existing modules regression: `/api/resources` 19 rows, `/api/expenses` OK, `/api/hrms/*` OK, `/api/billing/*` OK, `/api/discom/divisions` returns 4 divisions with 740,217 consumers preserved
- Frontend end-to-end: login → dashboard → users → resources → activity all render, testids intact

### Credentials (see `/app/memory/test_credentials.md`)
- **Super Admin**: `harivanshraj9@gmail.com` / `Prathvi@Admin2026`

### Pending / Next
- **Phase 1** — Mobile responsive: bottom nav, hamburger menu, all pages fluid 320px→1920px, tables→cards on mobile.
- **Phase 2** — Android app via Capacitor: package identifier, splash, app icon, APK/AAB build instructions.
- **RBAC gating on existing modules** — currently Daily Expenses / HRMS / Billing / DISCOM remain publicly accessible. Wire the `require_role` dependency into their endpoints when RBAC is turned on.
- **2FA** — foundation in place (users have profile fields); add TOTP later.
- **Forgot Password email** — endpoint pattern exists in playbook; hook up SMTP later.

## Update — 2026-02-05 · Phase 1: Mobile Responsive

### What changed
- **New `MobileBottomNav`** (`/app/frontend/src/components/MobileBottomNav.jsx`) — 5-tab bottom navigation (Home/Expenses/HRMS/Billing/DISCOM) shown only on `<lg` (< 1024px). Uses `lucide-react` icons, active-state highlight, `env(safe-area-inset-bottom)` padding for iOS.
- **Wired into all public pages** — DashboardPage, ExpensesPage, HrmsLayout, BillingPage, DiscomPage. Admin panel keeps its own layout (no bottom nav there).
- **Table → mobile cards** on
  - HRMS Employees (Edit / Delete cards with avatar, code, dept, salary, status)
  - HRMS Attendance (status dropdown + In/Out time pickers + remarks)
  - Billing Rate Master (Rate / GST / Edit / Toggle / Del)
  - Billing Invoice list (customer / invoice # / totals / pay-status pill / View / Excel / Print)
  - Expenses table already had mobile cards from Phase 1 initial build
- **Viewport meta** upgraded (`viewport-fit=cover`, `theme-color`, apple-mobile-web-app-capable) — ready for PWA / Capacitor wrap in Phase 2.
- **Global CSS**: `body { overflow-x: hidden }`, bottom padding calc(76px + safe-area) under 1024px so bottom nav never overlaps content.
- All existing desktop sidebar + top-bar preserved. Auth, HRMS backend, Billing, DISCOM ingestion — everything untouched.

### Testing (iteration_8.json)
- ~95% frontend pass. Bottom nav, card layouts, admin flow all confirmed.
- Only remaining: 4-12px overflow at 320px on /expenses & /discom (LOW priority, not user-visible due to body overflow-x hidden). 375px+ (all modern phones) is clean.

### Pending / Next
- **Phase 2** — Android app: wrap PWA using Capacitor, add app icon + splash + APK/AAB build instructions.
- **RBAC gating** on Expenses / HRMS / Billing / DISCOM endpoints (currently public — auth exists but not enforced on business modules).
- Consider making bottom-nav a Layout wrapper instead of inlined per page.
- 320px overflow polish (optional).

## Update — 2026-02-05 · Phase 2 & Extras: Android + Quick FAB + Forgot Password

### Android App (Capacitor 7)
- **App name**: PPS Connect
- **Package id**: `com.prathvipower.ppsconnect`
- Wraps the deployed website `https://prathvipowersolutions.com` inside a native WebView. Live-updates without APK rebuild.
- Branded launcher icon (dark navy P + lightning bolt + green/orange gradient ring) generated at all mipmap sizes.
- Splash screen with company wordmark generated at all portrait + landscape drawable sizes.
- Hardware Android back-button support (in-app history back, exit on home).
- Offline banner via `navigator.onLine` — works inside WebView.
- Config file: `/app/frontend/capacitor.config.json`
- Icon/splash sources: `/app/frontend/resources/icon.svg` + `splash.svg` + `generate.py`
- **Build docs**: `/app/ANDROID_BUILD.md` — step-by-step for APK (debug) + AAB (Play Store) generation. Container has no Android SDK; user builds on Windows/Mac in ~5 min once SDK is installed.
- New yarn scripts: `build:android`, `cap:sync`, `cap:open`

### Quick Expense FAB
- Global floating "+" button — visible on every public page except `/expenses` (which has its own form) and `/admin*`.
- Mobile: 56×56 pill positioned above bottom nav. Desktop: label + icon at bottom-right.
- Bottom-sheet dialog on mobile, centered modal on desktop.
- 3-tap flow: amount → category chip → payment mode → save. Remembers last category + mode.
- Uses existing `POST /api/expenses` endpoint. Toast confirmation.

### Forgot Password Flow (no email delivery — option C)
- `POST /api/auth/forgot-password` → creates one-time token (60 min TTL) in `password_reset_tokens` collection, logs the reset link to `audit_log` + server logs. Always returns 200 (does not leak email existence).
- `POST /api/auth/reset-password-with-token` → validates token, hashes new password, marks token used.
- Pages `/admin/forgot-password` and `/admin/reset-password?token=…` — branded, with show/hide password + confirm field.
- "Forgot password?" link added to admin login.
- Admin can see the reset link in `Admin → Activity Log` (search `action = password_reset_request`) and share with user.
- Verified E2E: request → link generated in audit → reset with token → login with new password → restore.

### Files added / changed (this iteration)
- Backend: `auth.py` (+forgot/reset endpoints, +password_reset_tokens indexes)
- Frontend components: `QuickExpenseFAB.jsx`, `OfflineBanner.jsx`
- Frontend pages: `admin/ForgotPassword.jsx`, `admin/ResetPassword.jsx`
- Frontend lib: `capacitor.js` (Capacitor init + hardware back button)
- App.js: mount FAB + OfflineBanner globally, add /admin/forgot-password + /admin/reset-password routes
- AdminLogin: added "Forgot password?" link
- Frontend build: `capacitor.config.json`, `resources/icon.svg`, `resources/splash.svg`, `resources/generate.py`
- Android folder: `/app/frontend/android/` (Capacitor + Gradle project)
- Build guide: `/app/ANDROID_BUILD.md`

### Pending / Next
- Real email delivery for password reset (choose Resend / SMTP / SES when ready)
- Publish APK/AAB → Google Play Store (needs signed keystore + Play Console listing)
- RBAC gating on Expenses/HRMS/Billing/DISCOM endpoints (auth exists but modules still public)
- Optional: TOTP 2FA

## Update — 2026-02-05 · Field Photo Attach on Quick FAB

- Quick Expense FAB now includes an **optional Bill Photo** section with two buttons: **Snap Bill** (opens back camera on mobile via `capture="environment"`) and **Pick from Gallery**.
- Selected image is compressed **client-side** on canvas: JPEG, max 1600px edge, iteratively lowered quality until under 2 MB. Transparent PNGs get a white background before compression.
- Preview shown inline with filename + estimated KB + one-tap remove.
- On save, attachment travels as `attachment` (base64 data URL) + `attachment_name` (filename) on the existing `POST /api/expenses` endpoint. No backend change required.
- Works in the Capacitor Android WebView (standard file input; the OS invokes native camera / gallery pickers).
- Verified E2E: uploaded a 4×4 PNG, was received as `tmpis38m6fg.jpg` in the expense document with the base64 body preserved.

### Files touched
- `/app/frontend/src/components/QuickExpenseFAB.jsx` — added photo state, camera + gallery inputs, preview, `compressImage` helper (canvas-based, no deps)

## Update — 2026-02-05 · Play Store Publish Prep

### Code-side (fully automated on repo)
- **Release signing** wired into `frontend/android/app/build.gradle` — reads `frontend/android/key.properties` (git-ignored). No signing = no config applied → dev builds still work.
- **ProGuard/R8** enabled: `minifyEnabled true`, `shrinkResources true`, plus custom rules that keep Capacitor bridge classes + WebView bindings intact.
- **App version**: `versionCode 1`, `versionName "1.0.0"`. Target SDK 35 (Google requirement met).
- **Privacy policy** at `/privacy` route (React page reading `/privacy.md`) — public URL: `https://prathvipowersolutions.com/privacy`.

### Play Store assets (`/app/frontend/resources/play-store/`)
- `icon-512.png` — 512×512 store icon
- `feature-1024x500.png` — feature graphic with branded wordmark + module chips
- `01-dashboard.png`, `02-hrms.png`, `03-billing.png`, `04-discom.png`, `05-admin.png` — five 1080×1920 phone screenshots

### Deliverables
- **`/app/PLAY_STORE_PUBLISH.md`** — 12KB step-by-step runbook covering: prerequisites, keystore, signed build, Play Console listing (with paste-ready descriptions), Data Safety form, review submission, and future release workflow.
- **`/app/frontend/resources/make-keystore.sh`** — interactive one-command keystore generator that writes `key.properties` in place.
- **`/app/frontend/resources/screenshots.py`** — headless Playwright script to regenerate Play Store screenshots after any UI change.
- Updated `.gitignore` to exclude keystore + `key.properties` + Gradle build artifacts.

### What the user must do (Play Console side)
1. Create Google Play Developer account ($25 one-time) — runbook links.
2. Run `bash frontend/resources/make-keystore.sh` once on local machine → produces `pps-release.keystore` + `key.properties`.
3. Run `yarn build && npx cap sync android && cd android && ./gradlew bundleRelease` → produces `app-release.aab`.
4. Fill Play Console listing using the paste-ready copy in the runbook.
5. Upload assets from `resources/play-store/`.
6. Submit — Google typically approves in 1–7 days.

### Files touched
- `frontend/android/app/build.gradle` (release signing + ProGuard)
- `frontend/android/app/proguard-rules.pro` (Capacitor keep rules)
- `frontend/public/privacy.md` (privacy policy content)
- `frontend/src/pages/PrivacyPolicy.jsx` (public /privacy route)
- `frontend/src/App.js` (mounted route)
- `frontend/resources/play_feature.svg`, `resources/make-keystore.sh`, `resources/screenshots.py`
- `/app/PLAY_STORE_PUBLISH.md` (master runbook)

## Update — 2026-02-05 · Direct Install (Sideload)

### GitHub Actions workflow
- `.github/workflows/android-build.yml` builds APK on GitHub-hosted runners — zero setup on user's laptop.
- Two modes via `workflow_dispatch`:
  - **debug** (default): builds unsigned debug APK, artifact `pps-connect-debug-apk`. Requires nothing.
  - **release**: builds signed release APK, artifact `pps-connect-release-apk`. Requires 4 GitHub secrets: `RELEASE_KEYSTORE_BASE64`, `RELEASE_STORE_PASSWORD`, `RELEASE_KEY_ALIAS`, `RELEASE_KEY_PASSWORD`.
- Auto-triggers on push to `main` touching `frontend/**`. Yarn + Java 21 (Temurin) + `android-actions/setup-android@v3` for SDK.
- Artifacts retained 90 days; downloadable via GitHub UI or phone browser.

### `/app/DIRECT_INSTALL.md` — sideload guide
- Path A (GitHub Actions, recommended): user pushes to GitHub → runs workflow → downloads APK on phone → taps to install. Total ~10 min.
- Path B (local Android Studio): traditional route, same as `ANDROID_BUILD.md` §Build APK.
- Signed release APK instructions for cleaner distribution to teammates over WhatsApp/Drive.
- **Auto-update trick documented**: since the app is a WebView loading the live site, most updates ship instantly without an APK rebuild. Only native/config changes need a fresh APK.
- Gotchas table for common install errors ("App not installed" signature mismatch, "unknown source" prompt, missing secrets).

### Files added / changed
- `.github/workflows/android-build.yml` — GitHub Actions build pipeline
- `/app/DIRECT_INSTALL.md` — end-to-end sideload guide

## Update — 2026-02-10 · Inventory Session A (Foundations)

### Delivered — Smart Meter & Material Inventory Management (Session A of 3)

**Backend `/app/backend/inventory.py`** (~500 lines, wired via `include_router` in `server.py`)
- **5 collections**: `inv_master`, `inv_smart_meters`, `inv_old_meters`, `inv_cables`, `inv_ledger` (immutable audit)
- **Master Data**: 11 types (division, sub_division, sdo, store, agency, installer, meter_make, meter_model, cable_type, cable_size, document_type). CRUD + Excel import. 26 masters seeded on startup.
- **Smart Meter**: full 16 fields, duplicate-serial prevention (uppercased), 6-state status pipeline, list with paginated search + filter, Excel import.
- **Old Meter**: 17 fields, 6 condition states, 3 deposit states, auto-sets deposit_date on Deposited status.
- **Cable Inventory**: per-drum with auto-balance formula `opening + received + returned − issued − damaged`, recomputed on every write.
- **Dashboard endpoint**: aggregates all 24 KPIs (Smart 6 + Old 5 + Cable 6 + placeholder Documents 6), status pie distribution, top 8 divisions bar, 15 most recent ledger entries.
- **Immutable ledger**: every create/update/delete on any inventory entity writes an entry with before/after snapshot + actor + timestamp.
- **Excel import** on all 3 stock collections + all 11 master types with duplicate detection + row-level error reporting.
- All endpoints protected by existing JWT auth (`dep_current` for read, `dep_admin` for write).

**Frontend `/app/frontend/src/pages/inventory/InventoryPage.jsx`**
- New sidebar entry **Inventory** (icon `Package`, orange indicator dot) at `/inventory`, gated by `AdminRoute`.
- 5 tabs: **Dashboard / Smart Meter / Old Meter / Cable / Master Data**.
- Dashboard: 3 KPI groups (17 tiles), pie chart of smart-meter status distribution, bar chart of division-wise stock, recent-transactions ledger feed.
- Smart/Old/Cable pages use a shared `CrudList` component with: search, per-column filters, pagination (25/page), Add/Edit/Delete, History view per row (reads from ledger), Excel import.
- Master Data page: 11-tab pill selector, inline add, code field, Excel import per type.
- Status pills with color coding (Available emerald / Issued amber / Installed blue / Returned purple / Damaged red).
- Mobile bottom nav + Quick Expense FAB still work.

**Verified E2E**
- Login → /inventory dashboard renders 3 KPI groups + charts
- Smart Meter tab shows seeded `SM-TEST-001` with Available badge
- Backend curls: create meter, duplicate serial rejected 409, add cable with balance=500 all working
- 26 seeded masters visible on Master Data tab
- Existing modules untouched (regression: /expenses, /hrms, /billing, /discom, /admin all still load)

### Pending / Next
- **Session B**: Smart Meter Installation form (photos), New Meter Gate Pass (PDF upload + serial validation), Cable Issue slip, Used Cable BISignoff (verification workflow), Document Repository
- **Session C**: Cross-linked history view, 19 reports (Excel/PDF/Print), full audit trail with previous/new value diff, advanced multi-field search, mobile card layouts, regression pass

## Update — 2026-02-10 · Inventory Session B + mini Session C (Transactions & History)

### 4 new lifecycle collections
- `inv_installations`, `inv_gate_passes`, `inv_cable_issues`, `inv_bisignoffs`
- Every mutation writes to the immutable `inv_ledger`
- Documents/photos stored as base64 data URLs (client-side compressed to <2MB JPEG for photos, PDFs pass through)

### Auto-inventory-movement rules (backend-enforced)
- **Installation.save** → sets smart meter `status="Installed"`; if `old_meter_serial` provided, auto-creates the old meter record (Good/Pending)
- **Gate Pass Approved** → sets all listed meters to `Issued`. Serial validation blocks meters that are already Issued/Installed/Damaged/Returned (returns 400 with list)
- **Cable Issue.save** → validates balance ≥ quantity, then increments `issued_qty` and recomputes drum balance
- **BISignoff status→Verified** → increments cable `used_qty` on the linked drum; the BISignoff record is then **locked** (only remarks editable)

### Frontend tabs added
`Inventory` sidebar now has **10 tabs**: Dashboard / Smart Meter / Old Meter / Cable / **Installation / Gate Pass / Cable Issue / BISignoff / History** / Master Data
- `PhotoInput` component reused across all forms — camera capture on mobile, gallery fallback, client-side JPEG compression, PDF pass-through, preview + remove
- Inline status dropdowns on list rows (Gate Pass / BISignoff) — one-click state transitions
- Verified BISignoff shows a **🔒 badge** and disables the status dropdown

### Cross-linked History view (`/inventory` → History tab)
Type any smart meter serial → renders 5 vertical stage cards:
1. **Meter Stock** (serial, make/model, current status, division)
2. **Gate Pass** (number, date, from→to, status)
3. **Installation** (consumer, date, installer, status, **after photo inline**)
4. **Old Meter Removed** (serial, condition, deposit status)
5. **BISignoff Verification** (number, used qty, status)

Green dot = stage done, amber = pending, muted = not yet started.

### Verified E2E (manual + curl)
Complete lifecycle test: Add `SM-LC-100` → create Approved `GP-001` → smart-meter status auto → Issued → create Installation → smart-meter status auto → Installed, `OLD-42` auto-created (Good/Pending). Cross-history endpoint returns all 4 linked entities.

### Files touched
- `/app/backend/inventory.py` (+380 lines): 4 new endpoint groups + `history/serial/{sn}` cross-linked endpoint + indexes
- `/app/frontend/src/lib/inventoryApi.js` (+18 methods)
- `/app/frontend/src/pages/inventory/InventoryPage.jsx` (+600 lines): PhotoInput + 5 new tab components + shared StageCard/Row for history

### Pending / Next (real Session C)
- 19 pre-built reports (Excel/PDF/Print) — I built the cross-linked view here but the 18 other tabular reports still need dedicated export endpoints
- Full audit-trail diff viewer (before/after JSON compare) — data already stored, needs UI
- Advanced multi-field search on every list module
- Mobile card layouts for the 4 new lifecycle lists (currently tables — mobile shows horizontal scroll)

## Update — 2026-02-10 · Inventory Session C (Reports & Excel Exports)

### Delivered
- **8 branded Excel reports** — one endpoint per inventory register: Smart Meters, Old Meters, Cables, Installations, Gate Passes, Cable Issues, BISignoffs, Audit Trail (ledger).
- Every file:
  - Dark-navy header row (font white bold on #0B1E3F fill)
  - Frozen top row
  - Auto-sized columns (12–40 char clamp)
  - Filename: `pps-inventory-<kind>-<YYYYMMDD-HHMM>.xlsx`
  - All non-deleted rows (up to 20,000 per report)
- **`GET /api/inventory/reports/summary`** — dashboard-style summary with row counts + last-updated timestamps used by the UI.
- **`GET /api/inventory/reports/{kind}.xlsx`** — streaming download endpoint (StreamingResponse + openpyxl).
- **New Reports tab** in `/inventory` sidebar — 8 cards, each showing name / row count / last-updated / one-click Download Excel button. Disabled + greyed for empty collections. Uses axios blob response + Blob URL for browser save.

### Verified E2E
- Playwright triggers `report-download-smart-meters` → intercepts real download → confirms `pps-inventory-smart-meters-2026-08-10.xlsx` size 5,627 bytes.
- Summary API returns all 8 reports with correct counts (2 smart, 1 old, 1 cable, 1 install, 1 GP, 8 audit).

### Files touched
- `/app/backend/inventory.py` (+120 lines): `REPORT_MAP`, `GET /reports/{kind}.xlsx`, `GET /reports/summary`
- `/app/frontend/src/lib/inventoryApi.js` (+3 methods)
- `/app/frontend/src/pages/inventory/InventoryPage.jsx` (+70 lines Reports component)

### Deferred to future sessions
- 19-plus specialised filter-based reports (date-range Excel + PDF prints) — currently exporting full snapshots per collection
- Full audit-trail diff viewer with before/after JSON compare (data is stored, needs a dedicated UI screen)
- Mobile card layouts for the 4 lifecycle lists (Installation / GP / Cable Issue / BISignoff) — currently rendering as horizontally-scrollable tables
- PDF/Print export variants (Excel covers the primary need)

## Update — 2026-02-10 · DISCOM Search Box Fixes

### Reported
- User: "PLZ FIX SEARCH BOX ABLE FOE SEARCH IN DISCOM MODULE" — Master Data search box on `/discom` wasn't behaving like a real search.

### Root causes found
1. **No live-search** — user had to hit `Enter` or click a `Search` button; no debounced auto-search as they typed.
2. **Wrong filter dropdown options** — `Any status` had ACTIVE / DISCONNECTED / PERMANENT DISCONNECTED, but real data uses `In Service`, `PD`, `TD`, `TD Migrated`. `Any supply` had URBAN/RURAL, but data uses numeric codes (10, 17, 20, 51, 60, 64). These filters silently returned 0 matches.
3. **6-second query latency** — the `$or` regex was un-anchored + case-insensitive across 9 fields → forced a full collection scan of 148k rows per division.

### Delivered
- **Auto-search with 400ms debounce** on query, field, status, supply-type — no button/keypress required. Enter still works as instant trigger, `X` in the input clears the query, and a new `Reset` button clears all filters at once.
- **Corrected filter dropdowns** to match real UPPCL data values (In Service / PD / TD / TD Migrated for status, 6 supply codes with labels).
- **Case-insensitive `CON_STATUS` matching** in the backend so filter is forgiving.
- **Backend query rewrite** for indexed search:
  - Identifier fields (KNO, SCNO, ACCT_ID, MOBILE_NO, METER_BADGE_NO): anchored case-sensitive prefix regex → uses B-tree index.
  - Text fields (NAME, FATHER_NAME, VILLAGE_NAME): anchored case-insensitive prefix regex.
  - ADDRESS: substring case-insensitive (last-resort fallback).
  - `re.escape(qs)` protects against user-typed regex metacharacters.
- **Extra indexes** added for `ACCT_ID`, `CON_STATUS`, `SUPPLY_TYPE` on `discom_consumers`.

### Measured impact
- Mobile number search: 6.0 s → ~0.5 s (12x faster)
- Address substring "KOTE": ~0.9 s
- Full-list count (148,287): ~0.2 s
- "MOHD" + "In Service" combo filter live-updates within ~1 s of the last keystroke.

### Files touched
- `/app/frontend/src/pages/discom/DiscomPage.jsx` — debounced auto-search useEffect, X-clear button, Reset button, corrected dropdown options
- `/app/backend/discom.py` — index-friendly regex query, extra indexes, case-insensitive CON_STATUS filter

## Update — 2026-02-10 · Vendor Billing Upgrade (Phases 1 + 2)

### Delivered
- **Reusable Invoice Renderer** at `/app/frontend/src/lib/invoiceRenderer.js` — the single source of truth for all invoice HTML output. Layout matches the R K Enterprises target PDF: bordered 3-column Billed To / Shipped To / Billed From, Sr.No/Description/HSN/Unit/Qty/Rate/Total Amount table, right-aligned tax summary (SGST 9% / CGST 9% / Round Off / G.Total in navy), bottom-left Bank Details, In Words + Authorized Signatory. Used by Invoices list, WCC (single + bulk), historical view, and future PDF export.
- **Data model extended** on `Invoice` (backward compatible — all new fields optional): `shipped_to`, `shipped_to_gstin`, `customer_state`, `customer_state_code`, `source` (`wcc` | `manual` | `historical`), `wcc_file_hash`, plus historical fields (`tax_value_raw`, `gst_pct_raw`, `invoice_value_raw`, `sla_penalty`, `retention`, `other_deductions`, `unsync_hold`, `bi_signoff_hold`, `tds`, `payment_received`, `payment_date`, `pending_balance`, `remarks`, `historical_source_row`).
- **`CompanySettings` extended** with `state`, `state_code`, `account_name`, `authorized_signatory`, `default_customer` (+ its GSTIN/address/state/state_code). Idempotent seed on startup fills only blank fields with real R K Enterprises values (GSTIN 09GAHPK2426K1ZF, PAN GAHPK2426K, Uttar Pradesh / 09) — never overwrites bank details user has already set.
- **WCC duplicate protection** — `wcc_file_hash` (SHA-256) checked before invoice create; returns 409 with the existing invoice number.
- **Invoice numbering** switched to `RK/YY-YY/NNNNNN` matching historical format; fiscal-year aware; new invoices continue from `101233` (right after historical 101232). Historical invoices imported keep their original numbers exactly.
- **Historical Excel Import** (`/app/backend/historical_import.py`, new module):
  - `POST /api/billing/historical/preview` — parse Book1.xlsx-style Excel, group multi-row line items under one invoice (blank Invoice Number = continuation), detect duplicates, surface warnings without silent data changes
  - `POST /api/billing/historical/commit` — persist with `source="historical"`, preserving Tax Value / GST / Invoice Value / TDS / SLA Penalty / Retention / Holds / all payment amounts + dates
  - `GET  /api/billing/historical/history` — list of past imports
  - `GET  /api/billing/historical/template` — downloadable 3-sheet Excel template (Invoice Data / Instructions / Example) with template version 1.0.0
- **New `Data Import` tab** in Billing with 3-step flow (Upload → Preview → Confirm), warnings panel, duplicate detection, per-invoice line-item expander, import history table, template download button.

### Verified end-to-end with the actual Book1.xlsx
- 31 unique invoices grouped from 69 rows → matches user's expected count
- 16 invoices correctly detected as multi-line-item (e.g. `RK/25-26/101202` has 1-PH Meter NSC ×6 + 1-PH Meter Consumer ×304)
- Original invoice numbers preserved (`RK/25-26/101201` through `RK/26-27/101232`)
- Raw financial fields intact: GST=11,997, Invoice Value=78,647, TDS=667, Retention=7,865, Paid=66,183, Pending=7,866 on invoice 101202
- Duplicate detection: re-uploading same file flags all 31 as duplicates
- Total dashboard: ₹51.37 lakh billed · ₹32.92 lakh paid · ₹18.45 lakh outstanding · 26 Partly Paid · 6 Unpaid
- Printed invoice HTML matches target PDF layout (screenshots taken for both `manual` and `historical` source badges)

### Preserved (nothing broken)
- Rate Master (all 12 seeded rates intact, CRUD + Excel import/export)
- WCC PDF parsing (`pdfplumber` + `rapidfuzz`), single + bulk flows
- Invoice creation via WCC or manual entry
- Payment tracking (`/invoices/{id}/payment`, `/invoices/{id}/payments`)
- Statement generation
- Audit log (now also records `import` action for historical batches)
- Company Settings CRUD

### Deferred to Phase 3 (next session)
- **P6 — Enterprise Dashboard redesign** (KPIs, recent invoices, pending payments, quick actions, remove neon/glow)
- **P6 — Professional navigation** (`Dashboard / Billing / Data Import / Google Files / Company Settings / Audit Log` structure)
- **P7 — Google Files module** (consolidate scattered Google Sheets/Docs/Drive cards)
- **Server-side PDF endpoint** `/api/billing/invoices/{id}/pdf` (currently users can Save-as-PDF via browser print dialog — same layout)
- **Advanced Invoice list filters** (status / date range / customer / source facets — currently only search + list)

### Files changed / added
- `/app/backend/billing.py` — Invoice + CompanySettings model, WCC dup check, seed defaults, new invoice numbering
- `/app/backend/historical_import.py` — NEW module (~450 lines)
- `/app/backend/server.py` — wire new router + startup seed
- `/app/frontend/src/lib/invoiceRenderer.js` — NEW shared renderer (~350 lines)
- `/app/frontend/src/lib/billingApi.js` — historicalPreview/Commit/History/TemplateUrl
- `/app/frontend/src/pages/billing/BillingPage.jsx` — replaced legacy inline printInvoice, added Data Import tab + `HistoricalImport` component + `Stat` tile

## Update — 2026-02-10 · PDF Download Button

### Delivered
- **`/api/billing/invoices/{id}/pdf`** — server-generated A4 PDF using **WeasyPrint 70.0** (installed + persisted in requirements.txt) driven by a new `/app/backend/invoice_renderer.py` that mirrors the JS renderer HTML → the PDF is a pixel-for-pixel match of the browser print preview.
- **Blue "PDF" button** on every invoice row (desktop table + mobile card + Invoice detail modal) — one-click download, filename set to `<invoice_no>.pdf` (slashes converted to underscores).
- **`billingApi.invoicePdfUrl(id)`** helper — canonical URL builder so any future page can add PDF export in one line.
- Verified: valid `%PDF-1.7` bytes for `manual`, `historical`, `partly paid`, and `unpaid` invoices. Layout, badges, HSN table, SGST/CGST split, In Words, signatory all render correctly.

### Files touched
- `/app/backend/invoice_renderer.py` (NEW ~450 lines)
- `/app/backend/billing.py` — added `/pdf` endpoint using WeasyPrint
- `/app/backend/requirements.txt` — pip freeze after weasyprint install
- `/app/frontend/src/lib/billingApi.js` — invoicePdfUrl helper
- `/app/frontend/src/pages/billing/BillingPage.jsx` — PDF buttons added to desktop row, mobile card, invoice detail modal
