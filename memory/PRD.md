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
