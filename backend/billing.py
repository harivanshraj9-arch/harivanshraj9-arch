"""
Vendor Billing Automation — Rate Master + Invoice Generator (with WCC AI parsing).
Phase 1: CRUD + Excel import/export + rate history + audit log +
invoice creation + WCC PDF parse via pdfplumber + fuzzy product matching.
"""
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime, timezone, date
import uuid
import io
import re
import logging
from openpyxl import Workbook, load_workbook
import pdfplumber
from rapidfuzz import process, fuzz

billing_router = APIRouter(prefix="/api/billing", tags=["billing"])

# ============================================================
# CONSTANTS
# ============================================================
WORK_CATEGORIES = [
    "Meter Installation", "Survey", "Cable Installation", "DT Meter",
    "Government Meter", "NSC Meter", "Consumer Meter", "Incentive", "Other Work",
]

SEED_RATES = [
    {"name": "DT Meter", "rate": 1100.00, "category": "DT Meter", "unit": "No.", "gst_pct": 18.0, "hsn": "9954"},
    {"name": "DT Survey", "rate": 25.00, "category": "Survey", "unit": "No.", "gst_pct": 18.0, "hsn": "9983"},
    {"name": "DCU Meter", "rate": 550.00, "category": "Meter Installation", "unit": "No.", "gst_pct": 18.0, "hsn": "9954"},
    {"name": "1-PH Meter Consumer", "rate": 215.00, "category": "Consumer Meter", "unit": "No.", "gst_pct": 18.0, "hsn": "9954"},
    {"name": "1-PH Meter NSC", "rate": 215.00, "category": "NSC Meter", "unit": "No.", "gst_pct": 18.0, "hsn": "9954"},
    {"name": "1-PH Meter Govt", "rate": 450.00, "category": "Government Meter", "unit": "No.", "gst_pct": 18.0, "hsn": "9954"},
    {"name": "Consumer Survey", "rate": 25.00, "category": "Survey", "unit": "No.", "gst_pct": 18.0, "hsn": "9983"},
    {"name": "1 PH Cable Installation", "rate": 140.00, "category": "Cable Installation", "unit": "No.", "gst_pct": 18.0, "hsn": "9954"},
    {"name": "3 PH Cable Installation", "rate": 600.00, "category": "Cable Installation", "unit": "No.", "gst_pct": 18.0, "hsn": "9954"},
    {"name": "Incentive", "rate": 100.00, "category": "Incentive", "unit": "No.", "gst_pct": 18.0, "hsn": "9954"},
    {"name": "3-PH Meter Consumer", "rate": 230.00, "category": "Consumer Meter", "unit": "No.", "gst_pct": 18.0, "hsn": "9954"},
    {"name": "3-PH Meter NSC", "rate": 230.00, "category": "NSC Meter", "unit": "No.", "gst_pct": 18.0, "hsn": "9954"},
]

# ============================================================
# MODELS
# ============================================================
def _uuid(): return str(uuid.uuid4())
def _now(): return datetime.now(timezone.utc).isoformat()


class Rate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    name: str
    description: str = ""
    category: str = "Other Work"
    unit: str = "No."
    rate: float = 0.0
    hsn: str = ""
    gst_pct: float = 18.0
    active: bool = True
    effective_from: str = Field(default_factory=lambda: date.today().isoformat())
    created_at: str = Field(default_factory=_now)
    updated_at: str = Field(default_factory=_now)


class RateCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    category: Optional[str] = "Other Work"
    unit: Optional[str] = "No."
    rate: float
    hsn: Optional[str] = ""
    gst_pct: Optional[float] = 18.0
    active: Optional[bool] = True
    effective_from: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_req(cls, v):
        v = (v or "").strip()
        if len(v) < 2:
            raise ValueError("Product name is required")
        return v[:120]

    @field_validator("rate")
    @classmethod
    def rate_pos(cls, v):
        if v is None or v < 0:
            raise ValueError("Rate must be >= 0")
        return round(float(v), 2)


class RateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    rate: Optional[float] = None
    hsn: Optional[str] = None
    gst_pct: Optional[float] = None
    active: Optional[bool] = None
    effective_from: Optional[str] = None


class RateHistory(BaseModel):
    id: str = Field(default_factory=_uuid)
    rate_id: str
    old_rate: float
    new_rate: float
    effective_from: str
    changed_at: str = Field(default_factory=_now)
    changed_by: str = "admin"


class AuditLog(BaseModel):
    id: str = Field(default_factory=_uuid)
    action: str
    entity: str
    entity_id: Optional[str] = None
    detail: str = ""
    actor: str = "admin"
    timestamp: str = Field(default_factory=_now)


class InvoiceLine(BaseModel):
    """One line item — rate is SNAPSHOT at invoice time, immune to later edits."""
    id: str = Field(default_factory=_uuid)
    rate_id: Optional[str] = None
    name: str
    hsn: str = ""
    unit: str = "No."
    quantity: float
    rate: float
    gst_pct: float = 18.0
    amount: float = 0.0


class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    invoice_no: str
    date: str = Field(default_factory=lambda: date.today().isoformat())
    customer: str = ""
    customer_gstin: str = ""
    customer_address: str = ""
    place_of_supply: str = ""
    is_igst: bool = False   # if buyer in different state, use IGST
    lines: List[InvoiceLine] = []
    subtotal: float = 0.0
    cgst: float = 0.0
    sgst: float = 0.0
    igst: float = 0.0
    round_off: float = 0.0
    grand_total: float = 0.0
    notes: str = ""
    wcc_filename: Optional[str] = None
    created_at: str = Field(default_factory=_now)


class InvoiceLineIn(BaseModel):
    rate_id: Optional[str] = None
    name: str
    hsn: Optional[str] = ""
    unit: Optional[str] = "No."
    quantity: float
    rate: Optional[float] = None  # if None -> pull from rate_id or Rate Master
    gst_pct: Optional[float] = None


class InvoiceCreate(BaseModel):
    customer: str = ""
    customer_gstin: str = ""
    customer_address: str = ""
    place_of_supply: str = ""
    is_igst: bool = False
    lines: List[InvoiceLineIn]
    notes: str = ""
    wcc_filename: Optional[str] = None


# ============================================================
# DB REFERENCE
# ============================================================
_db_ref = {"db": None}
def _db(): return _db_ref["db"]


async def seed_rates_if_empty():
    if await _db().rates.count_documents({}) == 0:
        for r in SEED_RATES:
            doc = Rate(**r).model_dump()
            await _db().rates.insert_one(doc)
        logging.info(f"Seeded {len(SEED_RATES)} rates for RK Enterprises")


async def _next_invoice_no() -> str:
    yr = date.today().strftime("%Y-%m")
    prefix = f"RKE/{yr}/"
    last = await _db().invoices.find_one(
        {"invoice_no": {"$regex": f"^{re.escape(prefix)}"}},
        sort=[("invoice_no", -1)],
    )
    n = 1
    if last and last.get("invoice_no"):
        m = re.match(r"RKE/\d{4}-\d{2}/(\d+)", last["invoice_no"])
        if m:
            n = int(m.group(1)) + 1
    return f"{prefix}{n:04d}"


async def audit(action: str, entity: str, entity_id: str = None, detail: str = "", actor: str = "admin"):
    log = AuditLog(action=action, entity=entity, entity_id=entity_id, detail=detail, actor=actor).model_dump()
    await _db().audit_logs.insert_one(log)


# ============================================================
# RATE MASTER CRUD
# ============================================================
@billing_router.get("/rates")
async def list_rates(
    q: Optional[str] = None,
    category: Optional[str] = None,
    active: Optional[bool] = None,
    limit: int = Query(500, le=5000),
):
    query = {}
    if category and category != "All": query["category"] = category
    if active is not None: query["active"] = active
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"category": {"$regex": q, "$options": "i"}},
            {"hsn": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]
    docs = await _db().rates.find(query, {"_id": 0}).sort("name", 1).limit(limit).to_list(limit)
    return {"total": len(docs), "items": docs, "categories": WORK_CATEGORIES}


@billing_router.post("/rates")
async def create_rate(payload: RateCreate):
    r = Rate(**payload.model_dump(exclude_none=True))
    doc = r.model_dump()
    await _db().rates.insert_one(doc)
    await audit("create", "rate", r.id, f"Created '{r.name}' @ ₹{r.rate}")
    doc.pop("_id", None)
    return doc


@billing_router.get("/rates/audit")
async def rate_audit(limit: int = 100):
    docs = await _db().audit_logs.find({"entity": {"$in": ["rate", "invoice"]}}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return {"items": docs}


@billing_router.get("/rates/categories")
async def rate_categories():
    return {"categories": WORK_CATEGORIES}


@billing_router.post("/rates/import")
async def import_rates(file: UploadFile = File(...)):
    fn = (file.filename or "").lower()
    if not fn.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Only .xlsx supported")
    content = await file.read()
    try:
        wb = load_workbook(io.BytesIO(content), data_only=True, read_only=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot read: {e}")
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        raise HTTPException(status_code=400, detail="Empty sheet")
    header = [str(h or "").strip().lower() for h in rows[0]]
    def col(name):
        for i, h in enumerate(header):
            if h == name.lower(): return i
        return None
    ci = {k: col(k) for k in ["name", "rate", "category", "unit", "hsn", "gst_pct", "description", "active"]}
    if ci["name"] is None or ci["rate"] is None:
        raise HTTPException(status_code=400, detail="Sheet needs at least 'name' and 'rate' columns")
    imported = 0; updated = 0
    for row in rows[1:]:
        if not row or all(c is None or str(c).strip() == "" for c in row):
            continue
        name = str(row[ci["name"]] or "").strip()
        if not name: continue
        rate = float(row[ci["rate"]] or 0)
        existing = await _db().rates.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}, {"_id": 0})
        payload = {
            "name": name,
            "rate": round(rate, 2),
            "category": (row[ci["category"]] if ci["category"] is not None else None) or "Other Work",
            "unit": (row[ci["unit"]] if ci["unit"] is not None else None) or "No.",
            "hsn": str(row[ci["hsn"]] or "") if ci["hsn"] is not None else "",
            "gst_pct": float(row[ci["gst_pct"]] or 18) if ci["gst_pct"] is not None else 18.0,
            "description": str(row[ci["description"]] or "") if ci["description"] is not None else "",
            "active": True if ci["active"] is None else bool(row[ci["active"]]),
        }
        if existing:
            payload["updated_at"] = _now()
            await _db().rates.update_one({"id": existing["id"]}, {"$set": payload})
            if abs(existing["rate"] - payload["rate"]) > 0.001:
                await _db().rate_history.insert_one(RateHistory(
                    rate_id=existing["id"], old_rate=existing["rate"],
                    new_rate=payload["rate"], effective_from=date.today().isoformat(),
                ).model_dump())
            updated += 1
        else:
            r = Rate(**payload)
            await _db().rates.insert_one(r.model_dump())
            imported += 1
    await audit("bulk_import", "rate", None, f"Imported {imported}, updated {updated}")
    return {"imported": imported, "updated": updated}


@billing_router.get("/rates/export")
async def export_rates():
    docs = await _db().rates.find({}, {"_id": 0}).sort("name", 1).to_list(5000)
    wb = Workbook(); ws = wb.active; ws.title = "Rate Master"
    ws.append(["Name", "Category", "Unit", "Rate", "HSN", "GST %", "Description", "Active", "Effective From"])
    for d in docs:
        ws.append([d.get("name"), d.get("category"), d.get("unit"),
                   d.get("rate"), d.get("hsn"), d.get("gst_pct"),
                   d.get("description"), d.get("active"), d.get("effective_from")])
    buf = io.BytesIO(); wb.save(buf); buf.seek(0)
    return StreamingResponse(buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="rate_master_{date.today().isoformat()}.xlsx"'})


@billing_router.get("/rates/{rate_id}")
async def get_rate(rate_id: str):
    r = await _db().rates.find_one({"id": rate_id}, {"_id": 0})
    if not r: raise HTTPException(404, "Not found")
    return r


@billing_router.patch("/rates/{rate_id}")
async def update_rate(rate_id: str, patch: RateUpdate):
    existing = await _db().rates.find_one({"id": rate_id}, {"_id": 0})
    if not existing: raise HTTPException(404, "Not found")
    updates = {k: v for k, v in patch.model_dump().items() if v is not None}
    if not updates: raise HTTPException(400, "Nothing to update")
    updates["updated_at"] = _now()
    # Track rate history
    if "rate" in updates and abs(float(updates["rate"]) - float(existing["rate"])) > 0.001:
        await _db().rate_history.insert_one(RateHistory(
            rate_id=rate_id, old_rate=existing["rate"], new_rate=float(updates["rate"]),
            effective_from=updates.get("effective_from") or date.today().isoformat(),
        ).model_dump())
        await audit("rate_change", "rate", rate_id,
                    f"'{existing['name']}': ₹{existing['rate']} → ₹{updates['rate']}")
    else:
        await audit("update", "rate", rate_id, f"Updated '{existing['name']}'")
    result = await _db().rates.find_one_and_update({"id": rate_id}, {"$set": updates},
        return_document=True, projection={"_id": 0})
    return result


@billing_router.delete("/rates/{rate_id}")
async def delete_rate(rate_id: str):
    r = await _db().rates.find_one({"id": rate_id}, {"_id": 0})
    if not r: raise HTTPException(404, "Not found")
    await _db().rates.delete_one({"id": rate_id})
    await audit("delete", "rate", rate_id, f"Deleted '{r['name']}'")
    return {"deleted": True}


@billing_router.post("/rates/{rate_id}/toggle")
async def toggle_rate(rate_id: str):
    r = await _db().rates.find_one({"id": rate_id}, {"_id": 0})
    if not r: raise HTTPException(404, "Not found")
    new_val = not r.get("active", True)
    await _db().rates.update_one({"id": rate_id}, {"$set": {"active": new_val, "updated_at": _now()}})
    await audit("toggle", "rate", rate_id, f"{'Activated' if new_val else 'Deactivated'} '{r['name']}'")
    return {"id": rate_id, "active": new_val}


@billing_router.get("/rates/{rate_id}/history")
async def rate_history(rate_id: str):
    docs = await _db().rate_history.find({"rate_id": rate_id}, {"_id": 0}).sort("changed_at", -1).to_list(200)
    return {"items": docs}


# ============================================================
# WCC AI PARSING
# ============================================================
def _extract_pdf_text(content: bytes) -> str:
    out = []
    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                t = page.extract_text() or ""
                out.append(t)
    except Exception as e:
        raise HTTPException(400, f"Could not read PDF: {e}")
    return "\n".join(out)


def _clean_num(s: Any) -> Optional[float]:
    """Convert '4 ,930' / '1 1,518' / '- ' / '5 0' to float or None."""
    if s is None: return None
    txt = str(s).strip()
    if txt in ("", "-", "—", "NA"): return None
    txt = re.sub(r"[₹,\s]", "", txt)
    try:
        return float(txt)
    except Exception:
        return None


def _find_billable_col(header_row: List[Any]) -> Optional[int]:
    """Find the column index whose header contains 'Billable Quantity'."""
    for i, h in enumerate(header_row):
        if h and "billable" in str(h).lower() and "quantity" in str(h).lower():
            return i
    # Fallback: header with 'billable'
    for i, h in enumerate(header_row):
        if h and "billable" in str(h).lower():
            return i
    return None


def _find_desc_col(header_row: List[Any]) -> Optional[int]:
    for i, h in enumerate(header_row):
        if h and "material description" in str(h).lower():
            return i
    for i, h in enumerate(header_row):
        if h and "description" in str(h).lower():
            return i
    return None


def _extract_wcc_rows(content: bytes) -> List[Dict[str, Any]]:
    """Extract (name, billable_qty) rows from WCC PDF using table-aware parsing.
    Falls back to line scan when no table detected."""
    items: List[Dict[str, Any]] = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            for tbl in page.extract_tables() or []:
                if not tbl or len(tbl) < 2: continue
                # Find the header row containing 'Material Description'
                hdr_idx = None
                for i, row in enumerate(tbl):
                    if any(cell and "material description" in str(cell).lower() for cell in row):
                        hdr_idx = i; break
                if hdr_idx is None: continue
                header = tbl[hdr_idx]
                bcol = _find_billable_col(header)
                dcol = _find_desc_col(header)
                if bcol is None or dcol is None: continue
                for row in tbl[hdr_idx + 1:]:
                    if not row: continue
                    name = str(row[dcol] or "").strip() if dcol < len(row) else ""
                    if not name or "total" in name.lower():
                        continue
                    qty = _clean_num(row[bcol]) if bcol < len(row) else None
                    if qty is None or qty <= 0:
                        continue
                    items.append({"raw_name": name, "quantity": qty})
    return items


def _fuzzy_map(candidate: str, rate_names: List[str]) -> Optional[Dict[str, Any]]:
    if not candidate or not rate_names:
        return None
    result = process.extractOne(candidate, rate_names, scorer=fuzz.WRatio)
    if not result: return None
    match, score, idx = result
    if score >= 65:
        return {"name": match, "score": int(score)}
    return None


def _parse_wcc_items(pdf_bytes: bytes, rate_master: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Table-aware WCC parser. Extracts (name, billable_qty) then fuzzy-maps names."""
    rate_names = [r["name"] for r in rate_master]
    rate_map = {r["name"]: r for r in rate_master}

    rows = _extract_wcc_rows(pdf_bytes)
    matched: Dict[str, Dict[str, Any]] = {}
    unknown: List[Dict[str, Any]] = []

    for row in rows:
        raw = row["raw_name"]
        qty = row["quantity"]
        clean = re.sub(r"[.,]", "", raw).strip()
        # exact case-insensitive
        exact = next((n for n in rate_names if n.lower() == clean.lower()), None)
        if not exact:
            # try match on lowercase without punctuation
            simple = re.sub(r"[^a-z0-9]+", " ", clean.lower()).strip()
            for n in rate_names:
                if re.sub(r"[^a-z0-9]+", " ", n.lower()).strip() == simple:
                    exact = n; break
        if exact:
            r = rate_map[exact]
            m = matched.setdefault(exact, {
                "name": exact, "quantity": 0, "score": 100,
                "rate": r["rate"], "rate_id": r["id"],
                "hsn": r.get("hsn", ""), "gst_pct": r.get("gst_pct", 18.0),
                "unit": r.get("unit", "No."),
            })
            m["quantity"] += qty
            continue

        fm = _fuzzy_map(clean, rate_names)
        if fm:
            key = fm["name"]; r = rate_map[key]
            m = matched.setdefault(key, {
                "name": key, "quantity": 0, "score": fm["score"],
                "rate": r["rate"], "rate_id": r["id"],
                "hsn": r.get("hsn", ""), "gst_pct": r.get("gst_pct", 18.0),
                "unit": r.get("unit", "No."),
            })
            m["quantity"] += qty
            m["score"] = max(m["score"], fm["score"])
        else:
            unknown.append({"name": raw[:80], "quantity": qty})

    return {"matched": list(matched.values()), "unknown": unknown}


@billing_router.post("/wcc/parse")
async def parse_wcc(file: UploadFile = File(...)):
    fn = (file.filename or "").lower()
    if not fn.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files supported")
    content = await file.read()
    text = _extract_pdf_text(content)
    if not text.strip():
        raise HTTPException(400, "Could not extract any text from PDF")
    rates = await _db().rates.find({"active": True}, {"_id": 0}).to_list(500)
    parsed = _parse_wcc_items(content, rates)
    return {
        "filename": file.filename,
        "text_preview": text[:1200],
        "matched": parsed["matched"],
        "unknown": parsed["unknown"],
    }


# ============================================================
# INVOICE
# ============================================================
def _compute_totals(lines: List[Dict[str, Any]], is_igst: bool) -> Dict[str, float]:
    subtotal = 0.0
    total_tax = 0.0
    for ln in lines:
        amount = round(float(ln["quantity"]) * float(ln["rate"]), 2)
        ln["amount"] = amount
        subtotal += amount
        total_tax += round(amount * float(ln.get("gst_pct", 18.0)) / 100, 2)
    subtotal = round(subtotal, 2)
    total_tax = round(total_tax, 2)
    if is_igst:
        cgst = 0.0; sgst = 0.0; igst = total_tax
    else:
        cgst = round(total_tax / 2, 2); sgst = round(total_tax / 2, 2); igst = 0.0
    grand = subtotal + cgst + sgst + igst
    round_off = round(round(grand) - grand, 2)
    grand_total = round(grand + round_off, 2)
    return {"subtotal": subtotal, "cgst": cgst, "sgst": sgst, "igst": igst,
            "round_off": round_off, "grand_total": grand_total}


@billing_router.post("/invoices")
async def create_invoice(payload: InvoiceCreate):
    # Resolve missing rate/hsn/gst_pct from Rate Master (SNAPSHOT)
    resolved_lines: List[Dict[str, Any]] = []
    for l in payload.lines:
        rate_doc = None
        if l.rate_id:
            rate_doc = await _db().rates.find_one({"id": l.rate_id}, {"_id": 0})
        if not rate_doc and l.name:
            rate_doc = await _db().rates.find_one(
                {"name": {"$regex": f"^{re.escape(l.name)}$", "$options": "i"}}, {"_id": 0})
        rate_val = l.rate if l.rate is not None else (rate_doc["rate"] if rate_doc else 0)
        hsn_val = l.hsn or (rate_doc.get("hsn", "") if rate_doc else "")
        unit_val = l.unit or (rate_doc.get("unit", "No.") if rate_doc else "No.")
        gst_val = l.gst_pct if l.gst_pct is not None else (rate_doc.get("gst_pct", 18.0) if rate_doc else 18.0)
        resolved_lines.append({
            "id": _uuid(),
            "rate_id": rate_doc["id"] if rate_doc else None,
            "name": l.name,
            "hsn": hsn_val,
            "unit": unit_val,
            "quantity": round(float(l.quantity), 2),
            "rate": round(float(rate_val), 2),
            "gst_pct": float(gst_val),
            "amount": 0.0,
        })
    totals = _compute_totals(resolved_lines, payload.is_igst)
    inv_no = await _next_invoice_no()
    inv = Invoice(
        invoice_no=inv_no,
        customer=payload.customer, customer_gstin=payload.customer_gstin,
        customer_address=payload.customer_address, place_of_supply=payload.place_of_supply,
        is_igst=payload.is_igst,
        lines=[InvoiceLine(**l) for l in resolved_lines],
        notes=payload.notes, wcc_filename=payload.wcc_filename, **totals,
    ).model_dump()
    await _db().invoices.insert_one(inv)
    await audit("create", "invoice", inv["id"], f"Invoice {inv_no} · ₹{inv['grand_total']}")
    inv.pop("_id", None)
    return inv


@billing_router.get("/invoices")
async def list_invoices(q: Optional[str] = None, limit: int = Query(500, le=5000)):
    query = {}
    if q:
        query["$or"] = [
            {"invoice_no": {"$regex": q, "$options": "i"}},
            {"customer": {"$regex": q, "$options": "i"}},
        ]
    docs = await _db().invoices.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"total": len(docs), "items": docs}


@billing_router.get("/invoices/{inv_id}")
async def get_invoice(inv_id: str):
    doc = await _db().invoices.find_one({"id": inv_id}, {"_id": 0})
    if not doc: raise HTTPException(404, "Not found")
    return doc


@billing_router.delete("/invoices/{inv_id}")
async def delete_invoice(inv_id: str):
    r = await _db().invoices.delete_one({"id": inv_id})
    if r.deleted_count == 0: raise HTTPException(404, "Not found")
    await audit("delete", "invoice", inv_id, f"Deleted invoice {inv_id[:8]}")
    return {"deleted": True}


@billing_router.get("/invoices/{inv_id}/export")
async def export_invoice_excel(inv_id: str):
    doc = await _db().invoices.find_one({"id": inv_id}, {"_id": 0})
    if not doc: raise HTTPException(404, "Not found")
    wb = Workbook(); ws = wb.active; ws.title = "Invoice"
    ws.append(["Invoice", doc["invoice_no"]])
    ws.append(["Date", doc["date"]])
    ws.append(["Customer", doc.get("customer", "")])
    ws.append(["GSTIN", doc.get("customer_gstin", "")])
    ws.append([])
    ws.append(["#", "Item", "HSN", "Unit", "Qty", "Rate", "GST %", "Amount"])
    for i, l in enumerate(doc["lines"], 1):
        ws.append([i, l["name"], l["hsn"], l["unit"], l["quantity"], l["rate"], l["gst_pct"], l["amount"]])
    ws.append([])
    ws.append(["", "", "", "", "", "", "Subtotal", doc["subtotal"]])
    ws.append(["", "", "", "", "", "", "CGST", doc["cgst"]])
    ws.append(["", "", "", "", "", "", "SGST", doc["sgst"]])
    ws.append(["", "", "", "", "", "", "IGST", doc["igst"]])
    ws.append(["", "", "", "", "", "", "Round Off", doc["round_off"]])
    ws.append(["", "", "", "", "", "", "GRAND TOTAL", doc["grand_total"]])
    buf = io.BytesIO(); wb.save(buf); buf.seek(0)
    return StreamingResponse(buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{doc["invoice_no"].replace("/", "_")}.xlsx"'})


# ============================================================
# INIT
# ============================================================
def init_billing(db):
    _db_ref["db"] = db
