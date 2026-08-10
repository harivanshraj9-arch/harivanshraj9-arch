"""
Smart Meter & Material Inventory Management — Session A
--------------------------------------------------------
Master Data + Smart Meter / Old Meter / Cable stock + Dashboard + Auto-movement ledger + Excel import.

Collections:
- inv_master (division/sub_division/sdo/store/agency/installer/meter_make/meter_model/cable_type/cable_size)
- inv_smart_meters
- inv_old_meters
- inv_cables (per drum / batch)
- inv_ledger (immutable audit / movement history)
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, timezone
import uuid
import io
import openpyxl
import logging

from auth import dep_current, dep_admin, _log_activity  # reuse existing auth

log = logging.getLogger(__name__)
_db = None

def init_inventory(db):
    global _db
    _db = db


inventory_router = APIRouter(prefix="/api/inventory", tags=["inventory"])

MASTER_TYPES = {"division", "sub_division", "sdo", "store", "agency",
                "installer", "meter_make", "meter_model", "cable_type",
                "cable_size", "document_type"}

SM_STATUSES = ("Available", "Issued", "Installed", "Returned", "Damaged", "Defective")
OM_CONDITIONS = ("Good", "Repairable", "Damaged", "Burnt", "Defective", "Scrap")
OM_DEPOSITS = ("Pending", "Deposited", "Verified")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


async def _ledger(actor_email: Optional[str], entity: str, entity_id: str,
                   action: str, before: Any = None, after: Any = None,
                   detail: str = ""):
    await _db.inv_ledger.insert_one({
        "id": str(uuid.uuid4()),
        "entity": entity,
        "entity_id": entity_id,
        "action": action,
        "before": before,
        "after": after,
        "detail": detail[:500],
        "actor": actor_email,
        "timestamp": _now(),
    })


# ================================================================
#                       MASTER DATA
# ================================================================
class MasterIn(BaseModel):
    type: Literal["division", "sub_division", "sdo", "store", "agency",
                  "installer", "meter_make", "meter_model", "cable_type",
                  "cable_size", "document_type"]
    name: str
    code: Optional[str] = None
    parent: Optional[str] = None  # e.g. sub_division has parent = division id
    active: bool = True
    extra: Optional[Dict[str, Any]] = None


@inventory_router.get("/masters")
async def list_masters(type: Optional[str] = None, user: dict = Depends(dep_current)):
    q = {}
    if type:
        if type not in MASTER_TYPES:
            raise HTTPException(400, "Unknown master type")
        q["type"] = type
    docs = await _db.inv_master.find(q, {"_id": 0}).sort([("type", 1), ("name", 1)]).to_list(2000)
    return {"items": docs}


@inventory_router.post("/masters")
async def add_master(payload: MasterIn, user: dict = Depends(dep_admin)):
    exists = await _db.inv_master.find_one({"type": payload.type,
                                             "name": {"$regex": f"^{payload.name.strip()}$",
                                                       "$options": "i"}})
    if exists:
        raise HTTPException(409, f"{payload.type} '{payload.name}' already exists")
    doc = {"id": str(uuid.uuid4()), **payload.model_dump(), "name": payload.name.strip(),
           "created_at": _now(), "created_by": user["email"]}
    await _db.inv_master.insert_one(doc)
    await _ledger(user["email"], "master", doc["id"], "created", None, doc)
    return _clean(doc)


@inventory_router.patch("/masters/{mid}")
async def update_master(mid: str, patch: Dict[str, Any], user: dict = Depends(dep_admin)):
    before = await _db.inv_master.find_one({"id": mid}, {"_id": 0})
    if not before:
        raise HTTPException(404, "Not found")
    allowed = {"name", "code", "parent", "active", "extra"}
    updates = {k: v for k, v in patch.items() if k in allowed}
    updates["updated_at"] = _now()
    await _db.inv_master.update_one({"id": mid}, {"$set": updates})
    after = await _db.inv_master.find_one({"id": mid}, {"_id": 0})
    await _ledger(user["email"], "master", mid, "updated", before, after)
    return after


@inventory_router.delete("/masters/{mid}")
async def delete_master(mid: str, user: dict = Depends(dep_admin)):
    doc = await _db.inv_master.find_one({"id": mid})
    if not doc:
        raise HTTPException(404, "Not found")
    # Soft delete = mark inactive
    await _db.inv_master.update_one({"id": mid}, {"$set": {"active": False, "deleted_at": _now()}})
    await _ledger(user["email"], "master", mid, "deleted", doc, None)
    return {"ok": True}


# ================================================================
#                    SMART METER INVENTORY
# ================================================================
SM_FIELDS = ["serial_number", "meter_make", "meter_model", "meter_type",
             "rating", "batch_number", "purchase_date", "received_qty",
             "status", "division", "sub_division", "sdo", "store_location",
             "vendor", "remarks"]


class SmartMeterIn(BaseModel):
    serial_number: str
    meter_make: Optional[str] = None
    meter_model: Optional[str] = None
    meter_type: Optional[str] = None
    rating: Optional[str] = None
    batch_number: Optional[str] = None
    purchase_date: Optional[str] = None
    received_qty: int = 1
    status: Literal["Available", "Issued", "Installed", "Returned", "Damaged", "Defective"] = "Available"
    division: Optional[str] = None
    sub_division: Optional[str] = None
    sdo: Optional[str] = None
    store_location: Optional[str] = None
    vendor: Optional[str] = None
    remarks: Optional[str] = None


@inventory_router.get("/smart-meters")
async def list_smart_meters(
    q: Optional[str] = None,
    status: Optional[str] = None,
    division: Optional[str] = None,
    make: Optional[str] = None,
    page: int = 1, page_size: int = Query(25, le=200),
    user: dict = Depends(dep_current),
):
    query: Dict[str, Any] = {"deleted_at": {"$exists": False}}
    if status: query["status"] = status
    if division: query["division"] = division
    if make: query["meter_make"] = make
    if q:
        rex = {"$regex": q, "$options": "i"}
        query["$or"] = [{"serial_number": rex}, {"batch_number": rex},
                        {"meter_make": rex}, {"meter_model": rex}, {"vendor": rex}]
    skip = (max(1, page) - 1) * page_size
    total = await _db.inv_smart_meters.count_documents(query)
    docs = await _db.inv_smart_meters.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)
    return {"items": docs, "total": total, "page": page, "page_size": page_size}


@inventory_router.post("/smart-meters")
async def add_smart_meter(payload: SmartMeterIn, user: dict = Depends(dep_admin)):
    sn = payload.serial_number.strip().upper()
    if not sn:
        raise HTTPException(400, "Serial number required")
    if await _db.inv_smart_meters.find_one({"serial_number": sn, "deleted_at": {"$exists": False}}):
        raise HTTPException(409, f"Duplicate serial number: {sn}")
    doc = {"id": str(uuid.uuid4()), **payload.model_dump(),
           "serial_number": sn, "created_at": _now(), "created_by": user["email"]}
    await _db.inv_smart_meters.insert_one(doc)
    await _ledger(user["email"], "smart_meter", doc["id"], "created", None,
                   {"serial": sn, "status": doc["status"]}, "Received")
    return _clean(doc)


@inventory_router.get("/smart-meters/{mid}")
async def get_smart_meter(mid: str, user: dict = Depends(dep_current)):
    doc = await _db.inv_smart_meters.find_one({"id": mid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    # Attach history — all ledger entries for this meter
    history = await _db.inv_ledger.find({"entity": "smart_meter", "entity_id": mid},
                                         {"_id": 0}).sort("timestamp", 1).to_list(200)
    doc["history"] = history
    return doc


@inventory_router.patch("/smart-meters/{mid}")
async def update_smart_meter(mid: str, patch: Dict[str, Any], user: dict = Depends(dep_admin)):
    before = await _db.inv_smart_meters.find_one({"id": mid}, {"_id": 0})
    if not before:
        raise HTTPException(404, "Not found")
    allowed = set(SM_FIELDS)
    updates = {k: v for k, v in patch.items() if k in allowed}
    if "serial_number" in updates:
        sn = updates["serial_number"].strip().upper()
        if sn != before["serial_number"]:
            if await _db.inv_smart_meters.find_one({"serial_number": sn, "id": {"$ne": mid}}):
                raise HTTPException(409, f"Duplicate serial number: {sn}")
            updates["serial_number"] = sn
    updates["updated_at"] = _now()
    updates["updated_by"] = user["email"]
    await _db.inv_smart_meters.update_one({"id": mid}, {"$set": updates})
    after = await _db.inv_smart_meters.find_one({"id": mid}, {"_id": 0})
    await _ledger(user["email"], "smart_meter", mid, "updated", before, after)
    return after


@inventory_router.delete("/smart-meters/{mid}")
async def delete_smart_meter(mid: str, user: dict = Depends(dep_admin)):
    doc = await _db.inv_smart_meters.find_one({"id": mid})
    if not doc:
        raise HTTPException(404, "Not found")
    await _db.inv_smart_meters.update_one({"id": mid}, {"$set": {"deleted_at": _now()}})
    await _ledger(user["email"], "smart_meter", mid, "deleted", doc, None)
    return {"ok": True}


# ================================================================
#                    OLD DIGITAL METER INVENTORY
# ================================================================
class OldMeterIn(BaseModel):
    serial_number: str
    meter_make: Optional[str] = None
    meter_model: Optional[str] = None
    meter_type: Optional[str] = None
    consumer_number: Optional[str] = None
    consumer_name: Optional[str] = None
    removal_date: Optional[str] = None
    division: Optional[str] = None
    sub_division: Optional[str] = None
    sdo: Optional[str] = None
    installer: Optional[str] = None
    condition: Literal["Good", "Repairable", "Damaged", "Burnt", "Defective", "Scrap"] = "Good"
    deposit_status: Literal["Pending", "Deposited", "Verified"] = "Pending"
    deposit_date: Optional[str] = None
    store_location: Optional[str] = None
    remarks: Optional[str] = None


@inventory_router.get("/old-meters")
async def list_old_meters(
    q: Optional[str] = None,
    deposit_status: Optional[str] = None,
    condition: Optional[str] = None,
    division: Optional[str] = None,
    page: int = 1, page_size: int = Query(25, le=200),
    user: dict = Depends(dep_current),
):
    query: Dict[str, Any] = {"deleted_at": {"$exists": False}}
    if deposit_status: query["deposit_status"] = deposit_status
    if condition: query["condition"] = condition
    if division: query["division"] = division
    if q:
        rex = {"$regex": q, "$options": "i"}
        query["$or"] = [{"serial_number": rex}, {"consumer_number": rex},
                        {"consumer_name": rex}, {"meter_make": rex}]
    skip = (max(1, page) - 1) * page_size
    total = await _db.inv_old_meters.count_documents(query)
    docs = await _db.inv_old_meters.find(query, {"_id": 0}).sort("removal_date", -1).skip(skip).limit(page_size).to_list(page_size)
    return {"items": docs, "total": total, "page": page, "page_size": page_size}


@inventory_router.post("/old-meters")
async def add_old_meter(payload: OldMeterIn, user: dict = Depends(dep_admin)):
    sn = payload.serial_number.strip().upper()
    if await _db.inv_old_meters.find_one({"serial_number": sn, "deleted_at": {"$exists": False}}):
        raise HTTPException(409, f"Duplicate old meter serial: {sn}")
    doc = {"id": str(uuid.uuid4()), **payload.model_dump(),
           "serial_number": sn, "created_at": _now(), "created_by": user["email"]}
    await _db.inv_old_meters.insert_one(doc)
    await _ledger(user["email"], "old_meter", doc["id"], "created", None, doc, "Removed & received in store")
    return _clean(doc)


@inventory_router.patch("/old-meters/{mid}")
async def update_old_meter(mid: str, patch: Dict[str, Any], user: dict = Depends(dep_admin)):
    before = await _db.inv_old_meters.find_one({"id": mid}, {"_id": 0})
    if not before:
        raise HTTPException(404, "Not found")
    updates = {k: v for k, v in patch.items() if k not in ("id", "_id", "created_at", "created_by")}
    updates["updated_at"] = _now()
    updates["updated_by"] = user["email"]
    # Auto-set deposit_date when moving to Deposited
    if updates.get("deposit_status") == "Deposited" and not before.get("deposit_date"):
        updates["deposit_date"] = updates.get("deposit_date") or datetime.now(timezone.utc).date().isoformat()
    await _db.inv_old_meters.update_one({"id": mid}, {"$set": updates})
    after = await _db.inv_old_meters.find_one({"id": mid}, {"_id": 0})
    await _ledger(user["email"], "old_meter", mid, "updated", before, after)
    return after


@inventory_router.delete("/old-meters/{mid}")
async def delete_old_meter(mid: str, user: dict = Depends(dep_admin)):
    doc = await _db.inv_old_meters.find_one({"id": mid})
    if not doc:
        raise HTTPException(404, "Not found")
    await _db.inv_old_meters.update_one({"id": mid}, {"$set": {"deleted_at": _now()}})
    await _ledger(user["email"], "old_meter", mid, "deleted", doc, None)
    return {"ok": True}


# ================================================================
#                    CABLE INVENTORY (per drum)
# ================================================================
class CableIn(BaseModel):
    cable_type: str
    cable_size: str
    cable_spec: Optional[str] = None
    make: Optional[str] = None
    batch_number: Optional[str] = None
    drum_number: str
    unit: str = "meter"
    opening_stock: float = 0
    received_qty: float = 0
    issued_qty: float = 0
    used_qty: float = 0
    returned_qty: float = 0
    damaged_qty: float = 0
    division: Optional[str] = None
    sub_division: Optional[str] = None
    sdo: Optional[str] = None
    store_location: Optional[str] = None
    receipt_date: Optional[str] = None
    remarks: Optional[str] = None


def _cable_balance(d: dict) -> float:
    return round(
        (d.get("opening_stock") or 0)
        + (d.get("received_qty") or 0)
        + (d.get("returned_qty") or 0)
        - (d.get("issued_qty") or 0)
        - (d.get("damaged_qty") or 0),
        3,
    )


@inventory_router.get("/cables")
async def list_cables(
    q: Optional[str] = None,
    cable_type: Optional[str] = None,
    division: Optional[str] = None,
    page: int = 1, page_size: int = Query(25, le=200),
    user: dict = Depends(dep_current),
):
    query: Dict[str, Any] = {"deleted_at": {"$exists": False}}
    if cable_type: query["cable_type"] = cable_type
    if division: query["division"] = division
    if q:
        rex = {"$regex": q, "$options": "i"}
        query["$or"] = [{"drum_number": rex}, {"batch_number": rex},
                        {"cable_type": rex}, {"cable_size": rex}, {"make": rex}]
    skip = (max(1, page) - 1) * page_size
    total = await _db.inv_cables.count_documents(query)
    docs = await _db.inv_cables.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)
    for d in docs:
        d["balance_qty"] = _cable_balance(d)
    return {"items": docs, "total": total, "page": page, "page_size": page_size}


@inventory_router.post("/cables")
async def add_cable(payload: CableIn, user: dict = Depends(dep_admin)):
    drum = payload.drum_number.strip().upper()
    if not drum:
        raise HTTPException(400, "Drum number required")
    if await _db.inv_cables.find_one({"drum_number": drum, "deleted_at": {"$exists": False}}):
        raise HTTPException(409, f"Duplicate drum: {drum}")
    doc = {"id": str(uuid.uuid4()), **payload.model_dump(),
           "drum_number": drum, "created_at": _now(), "created_by": user["email"]}
    doc["balance_qty"] = _cable_balance(doc)
    await _db.inv_cables.insert_one(doc)
    await _ledger(user["email"], "cable", doc["id"], "created", None,
                   {"drum": drum, "opening": doc["opening_stock"], "received": doc["received_qty"]})
    return _clean(doc)


@inventory_router.patch("/cables/{cid}")
async def update_cable(cid: str, patch: Dict[str, Any], user: dict = Depends(dep_admin)):
    before = await _db.inv_cables.find_one({"id": cid}, {"_id": 0})
    if not before:
        raise HTTPException(404, "Not found")
    updates = {k: v for k, v in patch.items() if k not in ("id", "_id", "created_at", "created_by")}
    updates["updated_at"] = _now()
    updates["updated_by"] = user["email"]
    await _db.inv_cables.update_one({"id": cid}, {"$set": updates})
    after = await _db.inv_cables.find_one({"id": cid}, {"_id": 0})
    after["balance_qty"] = _cable_balance(after)
    await _db.inv_cables.update_one({"id": cid}, {"$set": {"balance_qty": after["balance_qty"]}})
    await _ledger(user["email"], "cable", cid, "updated", before, after)
    return after


@inventory_router.delete("/cables/{cid}")
async def delete_cable(cid: str, user: dict = Depends(dep_admin)):
    doc = await _db.inv_cables.find_one({"id": cid})
    if not doc:
        raise HTTPException(404, "Not found")
    await _db.inv_cables.update_one({"id": cid}, {"$set": {"deleted_at": _now()}})
    await _ledger(user["email"], "cable", cid, "deleted", doc, None)
    return {"ok": True}


# ================================================================
#                     DASHBOARD (aggregated KPIs)
# ================================================================
@inventory_router.get("/dashboard")
async def dashboard(user: dict = Depends(dep_current)):
    async def _count_sm(status=None):
        q = {"deleted_at": {"$exists": False}}
        if status: q["status"] = status
        return await _db.inv_smart_meters.count_documents(q)

    async def _count_om(**kw):
        q = {"deleted_at": {"$exists": False}, **kw}
        return await _db.inv_old_meters.count_documents(q)

    sm_total = await _count_sm()
    smart = {
        "total": sm_total,
        "available": await _count_sm("Available"),
        "issued": await _count_sm("Issued"),
        "installed": await _count_sm("Installed"),
        "returned": await _count_sm("Returned"),
        "damaged": await _count_sm("Damaged"),
    }
    old = {
        "total_removed": await _count_om(),
        "deposited": await _count_om(deposit_status="Deposited"),
        "pending_deposit": await _count_om(deposit_status="Pending"),
        "damaged": await _count_om(condition="Damaged"),
        "available_in_store": await _count_om(deposit_status="Pending"),
    }

    # Cable aggregates
    cable_agg = await _db.inv_cables.aggregate([
        {"$match": {"deleted_at": {"$exists": False}}},
        {"$group": {"_id": None,
                    "received": {"$sum": "$received_qty"},
                    "issued": {"$sum": "$issued_qty"},
                    "used": {"$sum": "$used_qty"},
                    "returned": {"$sum": "$returned_qty"},
                    "damaged": {"$sum": "$damaged_qty"},
                    "opening": {"$sum": "$opening_stock"}}}
    ]).to_list(1)
    ca = cable_agg[0] if cable_agg else {"received": 0, "issued": 0, "used": 0,
                                          "returned": 0, "damaged": 0, "opening": 0}
    balance = (ca["opening"] + ca["received"] + ca["returned"]
               - ca["issued"] - ca["damaged"])
    cable = {
        "total_received": round(ca["received"] + ca["opening"], 2),
        "total_issued": round(ca["issued"], 2),
        "total_used": round(ca["used"], 2),
        "available_balance": round(balance, 2),
        "returned": round(ca["returned"], 2),
        "damaged": round(ca["damaged"], 2),
    }

    # Division-wise smart meter stock
    div_agg = await _db.inv_smart_meters.aggregate([
        {"$match": {"deleted_at": {"$exists": False}}},
        {"$group": {"_id": "$division", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]).to_list(20)
    division_stock = [{"division": d["_id"] or "—", "count": d["count"]} for d in div_agg]

    # Status distribution for pie
    status_dist = [
        {"name": "Available", "value": smart["available"]},
        {"name": "Issued", "value": smart["issued"]},
        {"name": "Installed", "value": smart["installed"]},
        {"name": "Returned", "value": smart["returned"]},
        {"name": "Damaged", "value": smart["damaged"]},
    ]

    # Recent ledger transactions
    recent = await _db.inv_ledger.find({}, {"_id": 0}).sort("timestamp", -1).to_list(15)

    return {
        "smart": smart, "old": old, "cable": cable,
        "documents": {"total_gate_pass": 0, "gate_pass_pending": 0, "gate_pass_verified": 0,
                       "total_bisignoff": 0, "bisignoff_pending": 0, "bisignoff_verified": 0},
        "division_stock": division_stock,
        "status_distribution": status_dist,
        "recent_transactions": recent,
    }


# ================================================================
#                     EXCEL IMPORT (per collection)
# ================================================================
@inventory_router.post("/import/smart-meters")
async def import_smart_meters(file: UploadFile = File(...), user: dict = Depends(dep_admin)):
    return await _generic_import(file, "inv_smart_meters", "smart_meter",
                                  key_field="serial_number", user=user,
                                  required=["serial_number"],
                                  transform_key=lambda v: str(v).strip().upper())


@inventory_router.post("/import/old-meters")
async def import_old_meters(file: UploadFile = File(...), user: dict = Depends(dep_admin)):
    return await _generic_import(file, "inv_old_meters", "old_meter",
                                  key_field="serial_number", user=user,
                                  required=["serial_number"],
                                  transform_key=lambda v: str(v).strip().upper())


@inventory_router.post("/import/cables")
async def import_cables(file: UploadFile = File(...), user: dict = Depends(dep_admin)):
    return await _generic_import(file, "inv_cables", "cable",
                                  key_field="drum_number", user=user,
                                  required=["drum_number", "cable_type", "cable_size"],
                                  transform_key=lambda v: str(v).strip().upper())


@inventory_router.post("/import/masters")
async def import_masters(type: str, file: UploadFile = File(...), user: dict = Depends(dep_admin)):
    if type not in MASTER_TYPES:
        raise HTTPException(400, "Unknown master type")
    content = await file.read()
    wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows or len(rows) < 2:
        raise HTTPException(400, "Empty file")
    headers = [str(h).strip().lower().replace(" ", "_") if h else "" for h in rows[0]]
    imported = 0; skipped = 0; errors = []
    for i, r in enumerate(rows[1:], start=2):
        rec = {h: (str(v).strip() if v is not None else "") for h, v in zip(headers, r) if h}
        name = rec.get("name") or rec.get(type) or rec.get(type.replace("_", ""))
        if not name:
            skipped += 1; continue
        exists = await _db.inv_master.find_one({"type": type,
                                                 "name": {"$regex": f"^{name}$", "$options": "i"}})
        if exists:
            skipped += 1; continue
        doc = {"id": str(uuid.uuid4()), "type": type, "name": name,
               "code": rec.get("code"), "active": True,
               "created_at": _now(), "created_by": user["email"]}
        try:
            await _db.inv_master.insert_one(doc)
            imported += 1
        except Exception as e:
            errors.append({"row": i, "error": str(e)[:200]})
    return {"imported": imported, "skipped": skipped, "errors": errors, "type": type}


async def _generic_import(file: UploadFile, coll: str, entity: str,
                           key_field: str, user: dict, required: List[str],
                           transform_key=lambda v: v):
    content = await file.read()
    try:
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
    except Exception:
        raise HTTPException(400, "Cannot read Excel file")
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows or len(rows) < 2:
        raise HTTPException(400, "Empty file")
    headers = [str(h).strip().lower().replace(" ", "_").replace("-", "_") if h else "" for h in rows[0]]

    imported = 0; skipped = 0; errors = []
    coll_ref = getattr(_db, coll)
    for i, r in enumerate(rows[1:], start=2):
        rec = {h: v for h, v in zip(headers, r) if h}
        # Normalise empties
        rec = {k: (str(v).strip() if isinstance(v, str) else v) for k, v in rec.items()
                if v is not None and v != ""}
        # Required fields
        missing = [f for f in required if not rec.get(f)]
        if missing:
            errors.append({"row": i, "error": f"Missing {missing}"}); skipped += 1; continue
        key = transform_key(rec[key_field])
        rec[key_field] = key
        # Dedupe
        if await coll_ref.find_one({key_field: key, "deleted_at": {"$exists": False}}):
            skipped += 1; continue
        doc = {"id": str(uuid.uuid4()), **rec,
               "created_at": _now(), "created_by": user["email"], "import": True}
        if entity == "cable":
            for numf in ("opening_stock", "received_qty", "issued_qty", "used_qty",
                          "returned_qty", "damaged_qty"):
                try: doc[numf] = float(doc.get(numf) or 0)
                except Exception: doc[numf] = 0
            doc["balance_qty"] = _cable_balance(doc)
        try:
            await coll_ref.insert_one(doc)
            await _ledger(user["email"], entity, doc["id"], "imported", None,
                           {"key": key}, f"Row {i}")
            imported += 1
        except Exception as e:
            errors.append({"row": i, "error": str(e)[:200]})
    return {"imported": imported, "skipped": skipped, "errors": errors,
            "sample_columns": headers[:15]}


# ================================================================
#                     LEDGER (view)
# ================================================================
@inventory_router.get("/ledger")
async def get_ledger(
    entity: Optional[str] = None,
    entity_id: Optional[str] = None,
    limit: int = Query(100, le=500),
    user: dict = Depends(dep_current),
):
    q = {}
    if entity: q["entity"] = entity
    if entity_id: q["entity_id"] = entity_id
    docs = await _db.inv_ledger.find(q, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return {"items": docs}


async def ensure_inventory_indexes(db):
    await db.inv_master.create_index([("type", 1), ("name", 1)], unique=False)
    await db.inv_smart_meters.create_index("serial_number", unique=False)
    await db.inv_smart_meters.create_index("status")
    await db.inv_smart_meters.create_index("division")
    await db.inv_old_meters.create_index("serial_number")
    await db.inv_old_meters.create_index("deposit_status")
    await db.inv_cables.create_index("drum_number")
    await db.inv_ledger.create_index([("timestamp", -1)])
    await db.inv_ledger.create_index([("entity", 1), ("entity_id", 1)])


async def seed_inventory_masters(db):
    """Seed a minimal set of common masters if empty."""
    count = await db.inv_master.count_documents({})
    if count > 0:
        return
    seeds = [
        ("meter_make", ["L&T", "HPL", "Genus", "Secure", "Schneider", "Iskraemeco"]),
        ("meter_model", ["Single Phase Smart", "Three Phase Smart", "LT-CT Smart"]),
        ("cable_type", ["Aluminium", "Copper", "ABC"]),
        ("cable_size", ["16 sq.mm", "25 sq.mm", "50 sq.mm", "95 sq.mm", "185 sq.mm"]),
        ("division", ["Sitapur Division-I", "Sitapur Division-II", "Biswan Division-III", "Mahmudabad Division-IV"]),
        ("document_type", ["Gate Pass", "BISignoff", "Issue Slip", "Return Slip", "Photo"]),
    ]
    docs = []
    for t, names in seeds:
        for n in names:
            docs.append({"id": str(uuid.uuid4()), "type": t, "name": n,
                          "active": True, "created_at": _now(), "created_by": "seed"})
    if docs:
        await db.inv_master.insert_many(docs)
        log.info(f"Seeded {len(docs)} inventory master rows")
