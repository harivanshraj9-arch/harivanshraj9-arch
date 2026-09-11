"""
Historical Invoice Excel Import Module
--------------------------------------
Imports old invoice/payment data from Excel files (e.g. Book1.xlsx) into the
existing billing system, PRESERVING original invoice numbers and all raw
financial values (Tax Value, GST, Invoice Value, TDS, SLA Penalty, Retention,
Holds, Payments). Historical invoices are tagged `source="historical"` so they
are clearly distinguished from WCC-generated ones.

Workflow:
  1. POST /api/billing/historical/preview  – upload → parse → group → return preview
  2. POST /api/billing/historical/commit   – user confirms → write to DB
  3. GET  /api/billing/historical/history  – list of past imports
  4. GET  /api/billing/historical/template – downloadable template (3 sheets)

Grouping rule (critical, per user spec):
  A row with a BLANK Invoice Number is a CONTINUATION LINE-ITEM of the last
  invoice seen above it. Multiple rows → multiple line items under ONE invoice.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timezone, date
import io
import uuid
import hashlib
import logging
import re
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

log = logging.getLogger(__name__)

historical_router = APIRouter(prefix="/api/billing/historical", tags=["billing-historical"])

_db_ref = {"db": None}
def _db(): return _db_ref["db"]


def init_historical(db):
    _db_ref["db"] = db


TEMPLATE_VERSION = "1.0.0"

# Column name variants — matches Book1.xlsx headers with slight fuzziness
COL_MAP = {
    "sr_no":            ["sr. no.", "sr no", "sno", "s.no", "s no"],
    "entry_date":       ["invoice date", "date", "entry date"],  # first "Invoice Date" in Book1 = entry date
    "work":             ["work details", "work description", "description", "material"],
    "rate":             ["rate", "rate (rs/-)", "rate rs", "rate per unit"],
    "qty":              ["work qty.", "work qty", "quantity", "qty", "qty (nos.)", "qty nos"],
    "invoice_no":       ["invoice number", "invoice no", "invoice no."],
    "invoice_date":     ["invoice date"],  # SECOND occurrence — actual invoice date
    "tax_value":        ["tax. value", "tax value", "taxable value", "taxable"],
    "gst":              ["gst 18%", "gst", "gst amount", "tax", "gst (18%)"],
    "invoice_value":    ["invoice value", "total", "gross total"],
    "tds":              ["tds amount @1%", "tds amount", "tds", "tds @1%"],
    "sla_penalty":      ["sla penalty", "penalty"],
    "retention":        ["retention of fnf", "retention"],
    "other_deduct":     ["other then retention", "other deductions"],
    "unsync_hold":      ["unsync hold"],
    "bi_signoff_hold":  ["bi signoff hold", "bi hold", "bi sign off hold"],
    "total_payable":    ["total payable"],
    "net_payable":      ["net payable"],
    "paid_amt":         ["invoice payment paid amount", "paid amount", "amount paid"],
    "paid_date":        ["invoice payment paid date"],
    "ret_paid":         ["payment received retention"],
    "ret_paid_date":    ["retention payment date"],
    "unsync_paid":      ["payment received of unsync hold", "unsync paid"],
    "unsync_paid_date": ["unsync payment date"],
    "bi_paid":          ["payment received of bi signoff hold", "bi signoff paid"],
    "bi_paid_date":     ["bi signoff payment date"],
    "total_recd":       ["total invoices balance received", "total received"],
    "pending":          ["total pending invoices balance", "pending balance"],
    "remarks":          ["invoice clearence remarks", "invoice clearance remarks", "remarks", "clearance remarks"],
}


def _norm(s: Any) -> str:
    return re.sub(r"\s+", " ", str(s or "").replace("\n", " ").strip().lower())


def _to_num(v: Any) -> Optional[float]:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return round(float(v), 2)
    s = str(v).strip()
    if s in ("", "-", "—", "NA", "N/A"):
        return None
    s = re.sub(r"[₹,\s]", "", s)
    try:
        return round(float(s), 2)
    except Exception:
        return None


def _to_date_str(v: Any) -> Optional[str]:
    """Normalize date to ISO YYYY-MM-DD. Accepts datetime, date, or DD/MM/YYYY string."""
    if v is None or v == "":
        return None
    if isinstance(v, datetime):
        if v.year < 1970 or v.year > 2100:   # bad Excel dates (like 3793 seen in row 3)
            return None
        return v.date().isoformat()
    if isinstance(v, date):
        if v.year < 1970 or v.year > 2100:
            return None
        return v.isoformat()
    s = str(v).strip()
    if not s:
        return None
    # DD/MM/YYYY
    m = re.match(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$", s)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y < 100:
            y += 2000
        if 1970 <= y <= 2100 and 1 <= mo <= 12 and 1 <= d <= 31:
            try:
                return date(y, mo, d).isoformat()
            except ValueError:
                return None
    return None


def _to_str(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, (datetime, date)):
        return _to_date_str(v) or ""
    return re.sub(r"\s+", " ", str(v).strip())


def _detect_columns(header_rows: List[Tuple[Any, ...]]) -> Dict[str, int]:
    """Map logical field → column index using fuzzy header matching."""
    joined = []
    for r in header_rows:
        joined.append([_norm(c) for c in r])
    n_cols = max(len(r) for r in joined)
    per_col = [" ".join(r[i] if i < len(r) else "" for r in joined).strip() for i in range(n_cols)]

    mapping: Dict[str, int] = {}
    used_cols = set()

    # Special handling: "Invoice Date" appears twice — first is entry_date, second is invoice_date
    invoice_date_indices = [i for i, s in enumerate(per_col) if s.strip() == "invoice date"]

    if invoice_date_indices:
        mapping["entry_date"] = invoice_date_indices[0]
        used_cols.add(invoice_date_indices[0])
        if len(invoice_date_indices) > 1:
            mapping["invoice_date"] = invoice_date_indices[1]
            used_cols.add(invoice_date_indices[1])

    # Fuzzy match remaining columns
    for logical, aliases in COL_MAP.items():
        if logical in mapping:
            continue
        best_idx = None
        for a in aliases:
            an = _norm(a)
            for i, txt in enumerate(per_col):
                if i in used_cols:
                    continue
                # exact or substring match
                if txt == an or an in txt or txt in an:
                    best_idx = i
                    break
            if best_idx is not None:
                break
        if best_idx is not None:
            mapping[logical] = best_idx
            used_cols.add(best_idx)

    return mapping


def _parse_sheet(ws) -> Dict[str, Any]:
    """Parse a single worksheet into grouped invoice list."""
    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 3:
        raise ValueError("Sheet is too short — need at least header + 1 data row")

    # First 2 rows are typically header (Book1 has merged header cells)
    header_rows = rows[:2]
    data_rows = rows[2:]
    cols = _detect_columns(header_rows)

    required = ["work", "invoice_no"]
    missing = [k for k in required if k not in cols]
    if missing:
        raise ValueError(f"Could not detect required columns: {missing}. Header seen: {[_norm(c) for c in header_rows[0]]}")

    invoices: Dict[str, Dict[str, Any]] = {}
    order: List[str] = []
    warnings: List[Dict[str, Any]] = []
    current_inv_no: Optional[str] = None
    row_number = 3  # human-friendly (1-indexed, counting from data start = row 3)

    def cell(row, key):
        idx = cols.get(key)
        if idx is None or idx >= len(row):
            return None
        return row[idx]

    for raw in data_rows:
        row_number += 1
        if raw is None or all(v is None or v == "" for v in raw):
            continue

        work = _to_str(cell(raw, "work"))
        inv_no_raw = cell(raw, "invoice_no")
        inv_no = _to_str(inv_no_raw)
        # Skip category-total rows (row 3 in Book1: DCU / 0 / CONSUMER CI / 81691 / MI / 31)
        # Heuristic: no invoice_no AND work is all-caps short code AND next cell is int
        if not inv_no and not current_inv_no and not work:
            continue
        # Detect the header-summary junk row: Sr No == 'DCU' or work == 'CONSUMER CI' etc.
        sr_no_raw = cell(raw, "sr_no")
        if (isinstance(sr_no_raw, str) and sr_no_raw.strip().upper() in ("DCU", "MI", "CI")):
            warnings.append({"row": row_number, "issue": "Skipped summary/totals row", "detail": str(raw[:6])})
            continue

        rate = _to_num(cell(raw, "rate"))
        qty = _to_num(cell(raw, "qty"))

        if inv_no:
            # New invoice starts
            current_inv_no = inv_no
            if inv_no in invoices:
                warnings.append({"row": row_number, "issue": "Duplicate invoice number within file",
                                 "invoice_no": inv_no, "detail": "Second occurrence will be merged as extra line items"})
            else:
                inv_date = _to_date_str(cell(raw, "invoice_date")) or _to_date_str(cell(raw, "entry_date"))
                invoices[inv_no] = {
                    "invoice_no": inv_no,
                    "date": inv_date or date.today().isoformat(),
                    "lines": [],
                    "tax_value_raw":     _to_num(cell(raw, "tax_value")),
                    "gst_pct_raw":       18.0 if _to_num(cell(raw, "gst")) else None,   # column header says "GST 18%"
                    "gst_amount_raw":    _to_num(cell(raw, "gst")),
                    "invoice_value_raw": _to_num(cell(raw, "invoice_value")),
                    "tds":               _to_num(cell(raw, "tds")),
                    "sla_penalty":       _to_num(cell(raw, "sla_penalty")),
                    "retention":         _to_num(cell(raw, "retention")),
                    "other_deductions":  _to_num(cell(raw, "other_deduct")),
                    "unsync_hold":       _to_num(cell(raw, "unsync_hold")),
                    "bi_signoff_hold":   _to_num(cell(raw, "bi_signoff_hold")),
                    "total_payable_raw": _to_num(cell(raw, "total_payable")),
                    "net_payable_raw":   _to_num(cell(raw, "net_payable")),
                    "payment_received":  _to_num(cell(raw, "total_recd")),
                    "pending_balance":   _to_num(cell(raw, "pending")),
                    "remarks":           _to_str(cell(raw, "remarks")) or None,
                    "payments": [],
                    "source_rows": [row_number],
                }
                # Build payment records if paid amounts exist
                for kind, amt_key, date_key in [
                    ("invoice",  "paid_amt",    "paid_date"),
                    ("retention", "ret_paid",   "ret_paid_date"),
                    ("unsync",   "unsync_paid", "unsync_paid_date"),
                    ("bi_hold",  "bi_paid",     "bi_paid_date"),
                ]:
                    amt = _to_num(cell(raw, amt_key))
                    if amt and amt > 0:
                        invoices[inv_no]["payments"].append({
                            "kind": kind,
                            "amount": amt,
                            "date": _to_date_str(cell(raw, date_key)) or "",
                        })
                order.append(inv_no)

        elif current_inv_no:
            # Continuation line-item row
            invoices[current_inv_no]["source_rows"].append(row_number)
        else:
            warnings.append({"row": row_number, "issue": "Line-item row before any invoice number",
                             "detail": f"work={work!r}, rate={rate}, qty={qty}"})
            continue

        # Add line item if we have work + qty
        if current_inv_no and work and qty and qty > 0:
            invoices[current_inv_no]["lines"].append({
                "name": work,
                "rate": rate or 0.0,
                "quantity": qty,
                "amount": round((rate or 0.0) * qty, 2),
                "hsn": "",     # historical rows have no HSN in this sheet
                "unit": "No.",
                "gst_pct": 18.0,
            })
        elif current_inv_no and work and (qty is None or qty == 0):
            warnings.append({"row": row_number, "issue": "Missing quantity — line-item skipped",
                             "invoice_no": current_inv_no, "detail": work})

    # Sanity check: invoices with 0 lines
    for inv_no, inv in invoices.items():
        if not inv["lines"]:
            warnings.append({"row": inv["source_rows"][0], "issue": "Invoice has no line items",
                             "invoice_no": inv_no})

    return {
        "invoices": [invoices[k] for k in order],
        "warnings": warnings,
        "columns_detected": cols,
    }


def _file_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


@historical_router.post("/preview")
async def preview_import(file: UploadFile = File(...)):
    """Parse the uploaded Excel and return a preview (no DB writes)."""
    fn = (file.filename or "").lower()
    if not (fn.endswith(".xlsx") or fn.endswith(".xls")):
        raise HTTPException(400, "Please upload an .xlsx or .xls file")

    content = await file.read()
    fhash = _file_hash(content)

    try:
        wb = load_workbook(io.BytesIO(content), data_only=True)
    except Exception as e:
        raise HTTPException(400, f"Could not read Excel: {e}")

    ws = wb.active
    try:
        parsed = _parse_sheet(ws)
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Duplicate detection against existing invoices in DB
    existing_nos = set()
    async for d in _db().invoices.find(
        {"invoice_no": {"$in": [i["invoice_no"] for i in parsed["invoices"]]}},
        {"_id": 0, "invoice_no": 1},
    ):
        existing_nos.add(d["invoice_no"])

    for inv in parsed["invoices"]:
        inv["exists_in_db"] = inv["invoice_no"] in existing_nos
        # Recalculate to help user spot inconsistencies (do NOT overwrite raw)
        calc_subtotal = round(sum(l["amount"] for l in inv["lines"]), 2)
        inv["_calc_subtotal"] = calc_subtotal
        if inv["tax_value_raw"] is not None and abs(calc_subtotal - inv["tax_value_raw"]) > 1:
            parsed["warnings"].append({
                "row": inv["source_rows"][0],
                "issue": f"Line-item total (₹{calc_subtotal}) differs from Excel Tax Value (₹{inv['tax_value_raw']})",
                "invoice_no": inv["invoice_no"],
            })

    return {
        "filename": file.filename,
        "file_hash": fhash,
        "sheet_name": ws.title,
        "template_version": TEMPLATE_VERSION,
        "total_invoices": len(parsed["invoices"]),
        "total_line_items": sum(len(i["lines"]) for i in parsed["invoices"]),
        "duplicates": [i["invoice_no"] for i in parsed["invoices"] if i["exists_in_db"]],
        "warnings": parsed["warnings"],
        "invoices": parsed["invoices"],
        "columns_detected": parsed["columns_detected"],
    }


class CommitPayload(BaseModel):
    filename: str
    file_hash: str
    invoices: List[Dict[str, Any]]
    skip_duplicates: bool = True


@historical_router.post("/commit")
async def commit_import(payload: CommitPayload):
    """Persist the previewed invoices with source='historical'.
    Preserves original invoice number and all raw financial fields.
    Never overwrites existing invoices unless skip_duplicates=False (and even then, we insert history)."""
    default_customer = (await _db().company.find_one({"_id": "default"}) or {}).get(
        "default_customer", "GOMATI SMART METERING PRIVATE LIMITED"
    )
    default_customer_state = (await _db().company.find_one({"_id": "default"}) or {}).get(
        "default_customer_state", "Uttar Pradesh"
    )
    default_customer_state_code = (await _db().company.find_one({"_id": "default"}) or {}).get(
        "default_customer_state_code", "09"
    )

    imported: List[str] = []
    skipped: List[Dict[str, Any]] = []
    failed: List[Dict[str, Any]] = []

    for inv in payload.invoices:
        inv_no = inv.get("invoice_no")
        if not inv_no:
            failed.append({"invoice_no": None, "reason": "Missing invoice number"})
            continue

        exists = await _db().invoices.find_one({"invoice_no": inv_no}, {"_id": 0, "id": 1})
        if exists and payload.skip_duplicates:
            skipped.append({"invoice_no": inv_no, "reason": "Already exists in database"})
            continue

        # Build lines
        lines = []
        for l in inv.get("lines", []):
            lines.append({
                "id": str(uuid.uuid4()),
                "rate_id": None,
                "name": l["name"],
                "hsn": l.get("hsn", ""),
                "unit": l.get("unit", "No."),
                "quantity": float(l["quantity"]),
                "rate": float(l["rate"]),
                "gst_pct": float(l.get("gst_pct", 18.0)),
                "amount": round(float(l["rate"]) * float(l["quantity"]), 2),
            })

        # Preserve raw financials; compute displayed subtotal from lines
        tax_value = inv.get("tax_value_raw")
        gst_amount = inv.get("gst_amount_raw")
        invoice_value = inv.get("invoice_value_raw")
        subtotal = tax_value if tax_value is not None else round(sum(l["amount"] for l in lines), 2)
        gst_total = gst_amount if gst_amount is not None else round(subtotal * 0.18, 2)
        # Historical invoices are all intra-state (Bill-To in same state as Bill-From = UP)
        cgst = round(gst_total / 2, 2)
        sgst = round(gst_total / 2, 2)
        grand = invoice_value if invoice_value is not None else round(subtotal + gst_total, 2)
        round_off = round(round(grand) - grand, 2) if invoice_value is None else 0.0

        # Payment status
        total_recd = inv.get("payment_received") or 0
        pending = inv.get("pending_balance") or 0
        if grand > 0:
            if total_recd >= grand - 0.5:
                status = "Paid"
            elif total_recd > 0:
                status = "Partly Paid"
            else:
                status = "Unpaid"
        else:
            status = "Unpaid"

        # Extract first payment date if any
        first_pay = None
        for p in inv.get("payments", []) or []:
            if p.get("date"):
                first_pay = p["date"]; break

        doc = {
            "id": str(uuid.uuid4()),
            "invoice_no": inv_no,
            "date": inv.get("date") or date.today().isoformat(),
            "customer": default_customer,
            "customer_gstin": "",
            "customer_address": "",
            "customer_state": default_customer_state,
            "customer_state_code": default_customer_state_code,
            "shipped_to": "",
            "shipped_to_gstin": "",
            "place_of_supply": default_customer_state,
            "is_igst": False,
            "lines": lines,
            "subtotal": subtotal,
            "cgst": cgst,
            "sgst": sgst,
            "igst": 0.0,
            "round_off": round_off,
            "grand_total": grand,
            "notes": "",
            "wcc_filename": None,
            "wcc_file_hash": None,
            "source": "historical",
            "payment_status": status,
            "paid_amount": total_recd,
            "due_date": None,
            # ---- historical raw fields ----
            "tax_value_raw":     tax_value,
            "gst_pct_raw":       inv.get("gst_pct_raw"),
            "invoice_value_raw": invoice_value,
            "sla_penalty":       inv.get("sla_penalty"),
            "retention":         inv.get("retention"),
            "other_deductions":  inv.get("other_deductions"),
            "unsync_hold":       inv.get("unsync_hold"),
            "bi_signoff_hold":   inv.get("bi_signoff_hold"),
            "tds":               inv.get("tds"),
            "payment_received":  total_recd,
            "payment_date":      first_pay,
            "pending_balance":   pending,
            "remarks":           inv.get("remarks"),
            "historical_source_row": inv.get("source_rows", [None])[0],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        try:
            if exists:
                # Overwrite (user chose not to skip)
                await _db().invoices.replace_one({"invoice_no": inv_no}, doc)
            else:
                await _db().invoices.insert_one(doc)
            # Save associated payments as separate records
            for p in inv.get("payments", []) or []:
                if p.get("amount"):
                    await _db().payments.insert_one({
                        "id": str(uuid.uuid4()),
                        "invoice_id": doc["id"],
                        "invoice_no": inv_no,
                        "amount": float(p["amount"]),
                        "date": p.get("date") or "",
                        "method": "Historical",
                        "reference": f"kind={p.get('kind', 'invoice')}",
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    })
            imported.append(inv_no)
        except Exception as e:
            log.exception("Failed to import invoice %s", inv_no)
            failed.append({"invoice_no": inv_no, "reason": str(e)})

    # Record the import batch
    batch = {
        "id": str(uuid.uuid4()),
        "filename": payload.filename,
        "file_hash": payload.file_hash,
        "template_version": TEMPLATE_VERSION,
        "imported_count": len(imported),
        "skipped_count": len(skipped),
        "failed_count": len(failed),
        "total_provided": len(payload.invoices),
        "imported_invoice_nos": imported,
        "skipped": skipped,
        "failed": failed,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db().historical_imports.insert_one(batch)
    # Audit log entry
    await _db().audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "import",
        "entity": "invoice",
        "entity_id": batch["id"],
        "detail": f"Historical Excel import · {len(imported)} imported · {len(skipped)} skipped · {len(failed)} failed · file={payload.filename}",
        "actor": "admin",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    batch.pop("_id", None)
    return batch


@historical_router.get("/history")
async def list_imports(limit: int = 100):
    docs = await _db().historical_imports.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"total": len(docs), "items": docs}


@historical_router.get("/template")
async def download_template():
    """Return a downloadable Excel template with 3 sheets:
    Sheet 1: Invoice Data — column headers matching this importer
    Sheet 2: Instructions — how to use
    Sheet 3: Example — sample rows including line-item continuation, payments, TDS
    """
    wb = Workbook()

    # ==== Sheet 1: Invoice Data ====
    ws = wb.active
    ws.title = "Invoice Data"

    HEADERS = [
        "Sr. No.", "Entry Date", "Work Details", "Rate (Rs/-)", "Work Qty. (Nos.)",
        "Invoice Number", "Invoice Date", "Tax. Value", "GST 18%", "Invoice Value",
        "TDS Amount @1%", "SLA Penalty", "Retention of FNF", "Other Then Retention",
        "Unsync Hold", "BI Signoff Hold", "Total payable", "Net payable",
        "Invoice Payment Paid Amount", "Invoice Payment Paid Date",
        "Payment Received Retention", "Retention Payment Date",
        "Payment Received Of Unsync Hold", "Unsync Payment Date",
        "Payment Received Of BI Signoff Hold", "BI Signoff Payment Date",
        "Total Invoices Balance Received", "Total Pending Invoices Balance",
        "Invoice Clearence Remarks",
    ]

    header_font = Font(bold=True, color="FFFFFF", size=10)
    header_fill = PatternFill("solid", fgColor="1F3A8A")
    align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    thin_border = Border(left=Side(style="thin"), right=Side(style="thin"),
                          top=Side(style="thin"), bottom=Side(style="thin"))

    for c, h in enumerate(HEADERS, 1):
        cell = ws.cell(row=1, column=c, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = align_center
        cell.border = thin_border

    for col in range(1, len(HEADERS) + 1):
        ws.column_dimensions[ws.cell(row=1, column=col).column_letter].width = 18
    ws.row_dimensions[1].height = 34
    ws.freeze_panes = "A2"

    # ==== Sheet 2: Instructions ====
    ws2 = wb.create_sheet("Instructions")
    lines = [
        (f"Template Version: {TEMPLATE_VERSION}",                                              {"bold": True, "size": 14}),
        ("Prathvi Power Solutions — Historical Invoice Import Template",                        {"bold": True, "size": 12}),
        ("",                                                                                    {}),
        ("REQUIRED FIELDS (must not be blank on the FIRST row of each invoice):",              {"bold": True}),
        ("  • Invoice Number   e.g. RK/25-26/101201",                                          {}),
        ("  • Invoice Date     DD/MM/YYYY or Excel date",                                       {}),
        ("  • Work Details, Rate (Rs/-), Work Qty. (Nos.)  — for the first line item",         {}),
        ("",                                                                                    {}),
        ("OPTIONAL FIELDS:",                                                                    {"bold": True}),
        ("  • Tax. Value, GST 18%, Invoice Value  — preserved as-imported (not recalculated)", {}),
        ("  • TDS Amount, SLA Penalty, Retention, Unsync Hold, BI Signoff Hold",              {}),
        ("  • Total payable, Net payable, Payment amounts & dates",                             {}),
        ("  • Invoice Clearence Remarks",                                                       {}),
        ("",                                                                                    {}),
        ("INVOICE GROUPING RULE — critical:",                                                   {"bold": True, "color": "B91C1C"}),
        ("  When an invoice has multiple line items, put each item on its OWN row.",           {}),
        ("  Fill Invoice Number & Invoice Date ONLY on the FIRST row of the invoice.",         {}),
        ("  Leave those columns BLANK on continuation rows — they will be grouped under the",  {}),
        ("  invoice above. Financial totals (Tax Value, GST, Invoice Value, etc.) go on the", {}),
        ("  first row only.",                                                                   {}),
        ("",                                                                                    {}),
        ("DATE FORMAT:  DD/MM/YYYY  (e.g. 15/12/2025). Excel date cells are also accepted.",   {}),
        ("NUMBER FORMAT: plain numbers. Commas and ₹ symbols are ignored. Blank = 0.",         {}),
        ("",                                                                                    {}),
        ("DUPLICATE HANDLING:",                                                                 {"bold": True}),
        ("  If an Invoice Number already exists in the system, it will be SKIPPED by default.",{}),
        ("  You can choose to overwrite duplicates from the import preview screen.",           {}),
        ("",                                                                                    {}),
        ("GST FIELDS:",                                                                         {"bold": True}),
        ("  All historical invoices are treated as intra-state (Uttar Pradesh → 09).",          {}),
        ("  SGST + CGST are split evenly from the 'GST 18%' column value.",                    {}),
        ("",                                                                                    {}),
        ("TDS / RETENTION / HOLD FIELDS:",                                                      {"bold": True}),
        ("  These are preserved verbatim as historical values — the system does NOT",           {}),
        ("  recalculate them from current rate master or tax rules.",                            {}),
        ("",                                                                                    {}),
        ("PAYMENT FIELDS:",                                                                     {"bold": True}),
        ("  Fill amount + date columns for each payment kind (invoice / retention / unsync /", {}),
        ("  BI hold). Each becomes a separate payment record linked to the invoice.",           {}),
        ("",                                                                                    {}),
        ("VALIDATION WARNINGS:",                                                                {"bold": True}),
        ("  The preview screen will flag rows with missing fields, ambiguous grouping,",       {}),
        ("  duplicate invoices, or line-item totals that disagree with the Excel Tax Value.",   {}),
        ("  Warnings do NOT block import — you can review and decide.",                        {}),
    ]
    for i, (text, style) in enumerate(lines, 1):
        c = ws2.cell(row=i, column=1, value=text)
        c.font = Font(
            bold=style.get("bold", False),
            size=style.get("size", 10),
            color=style.get("color", "111111"),
        )
    ws2.column_dimensions["A"].width = 110

    # ==== Sheet 3: Example ====
    ws3 = wb.create_sheet("Example")
    for c, h in enumerate(HEADERS, 1):
        cell = ws3.cell(row=1, column=c, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = align_center
        cell.border = thin_border
    ws3.row_dimensions[1].height = 34
    for col in range(1, len(HEADERS) + 1):
        ws3.column_dimensions[ws3.cell(row=1, column=col).column_letter].width = 18

    # Example 1: single line item
    ws3.append([
        1, "15/12/2025", "DCU Meter", 550, 3, "RK/25-26/101201", "15/12/2025",
        1650, 297, 1947, 17, 0, 195, 0, 0, 0, 1931, 0,
        1736, "02/06/2026", 0, "", 0, "", 0, "", 1736, 195, "Ret. Due",
    ])
    # Example 2: invoice with 3 line items (2 continuation rows)
    ws3.append([
        2, "15/12/2025", "1-PH Meter NSC", 215, 6, "RK/25-26/101202", "15/12/2025",
        66650, 11997, 78647, 667, 3932, 7865, 0, 0, 0, 74049, 0,
        29818, "02/06/2026", 0, "", 28500, "17/02/2026", 7865, "14/05/2026", 66183, 7866, "Ret. Due",
    ])
    ws3.append(["", "", "1-PH Meter Consumer", 215, 304, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""])
    ws3.append(["", "", "DT Meter With Box", 1100, 5,   "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""])
    # Example 3: fully paid invoice
    ws3.append([
        3, "01/06/2026", "DCU Meter", 550, 4, "RK/25-26/101204", "06/01/2026",
        2200, 396, 2596, 22, 0, 0, 0, 0, 0, 2574, 0,
        2314, "29/01/2026", 260, "15/04/2026", 0, "", 0, "", 2574, 0, "Yes",
    ])

    ws3.freeze_panes = "A2"

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="pps-historical-import-template-v{TEMPLATE_VERSION}.xlsx"'},
    )
