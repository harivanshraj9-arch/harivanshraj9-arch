"""
DISCOM Master Data Module
-------------------------
Handles UPPCL consumer master data for 4 divisions under EDC Sitapur:
- SITAPUR-I, SITAPUR-II, BISWAN-III, MAHMUDABAD-IV

Each division CSV has 141 identical columns. Because files are large (140-220 MB each)
we support URL ingest (stream + batch insert) and small direct-upload for testing.

Search focuses on high-value fields: KNO, SCNO, ACCT_ID, NAME, FATHER_NAME,
MOBILE_NO, ADDRESS, METER_BADGE_NO, VILLAGE_NAME.
"""
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, timezone
import asyncio
import csv
import io
import uuid
import logging
import httpx

log = logging.getLogger(__name__)

discom_router = APIRouter(prefix="/api/discom", tags=["discom"])
_db = None


def init_discom(db):
    global _db
    _db = db


DIVISIONS = [
    {"code": "SITAPUR-I", "name": "Sitapur Division-I", "edc": "EDC Sitapur"},
    {"code": "SITAPUR-II", "name": "Sitapur Division-II", "edc": "EDC Sitapur"},
    {"code": "BISWAN-III", "name": "Biswan Division-III", "edc": "EDC Sitapur"},
    {"code": "MAHMUDABAD-IV", "name": "Mahmudabad Division-IV", "edc": "EDC Sitapur"},
]
DIVISION_CODES = {d["code"] for d in DIVISIONS}

# Fields we lift up as top-level for indexing / fast search / column display.
# Everything else is preserved under `raw`.
SEARCH_FIELDS = [
    "ACCT_ID", "KNO", "SCNO", "NAME", "FATHER_NAME",
    "MOBILE_NO", "LANDLINE_NO", "ADDRESS", "TOWN",
    "VILLAGE_NAME", "DISTRICT", "SUPPLY_TYPE", "CONNECTION_TYPE",
    "LOAD", "LOAD_UNIT", "CON_STATUS", "PROJECT_AREA",
    "METER_BADGE_NO", "MTR_MAKE", "SERIAL_NBR",
    "SS_NAME", "FEEDER_NAME", "DT_NAME",
    "BILLED_AMOUNT", "TOTAL_OUTSTANDING", "PAY_AMT",
    "BILL_BASIS", "LAST_BILL_DATE",
]

# Fields shown in the compact table view
TABLE_COLUMNS = [
    "KNO", "NAME", "FATHER_NAME", "MOBILE_NO",
    "SUPPLY_TYPE", "LOAD", "CON_STATUS",
    "TOWN", "VILLAGE_NAME", "TOTAL_OUTSTANDING",
]


# ============================================================
#                    MODELS
# ============================================================
class IngestJob(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    division: str
    source: str  # "url" | "file"
    filename: Optional[str] = None
    status: Literal["queued", "running", "done", "failed"] = "queued"
    total_rows: int = 0
    inserted: int = 0
    skipped: int = 0
    error: Optional[str] = None
    started_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    finished_at: Optional[str] = None
    replaced: bool = True  # existing rows for division wiped before ingest


class UrlIngest(BaseModel):
    division: str
    url: str
    replace: bool = True


# ============================================================
#                    HELPERS
# ============================================================
def _num(v: Any) -> Optional[float]:
    if v is None or v == "":
        return None
    try:
        return float(str(v).replace(",", "").strip())
    except Exception:
        return None


def _clean_val(v: Any) -> Any:
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


def _row_to_doc(row: Dict[str, str], division: str) -> Dict[str, Any]:
    top: Dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "division": division,
    }
    for f in SEARCH_FIELDS:
        top[f] = _clean_val(row.get(f))
    # Coerce numerics
    for nf in ("LOAD", "BILLED_AMOUNT", "TOTAL_OUTSTANDING", "PAY_AMT"):
        val = _num(top.get(nf))
        if val is not None:
            top[nf] = round(val, 2)
    top["raw"] = {k: (str(v).strip() if v is not None else None) for k, v in row.items()}
    return top


async def _bulk_insert(division: str, docs: List[Dict[str, Any]]) -> int:
    if not docs:
        return 0
    try:
        res = await _db.discom_consumers.insert_many(docs, ordered=False)
        return len(res.inserted_ids)
    except Exception as e:
        log.error(f"discom bulk insert failed for {division}: {e}")
        return 0


async def _update_job(job_id: str, patch: Dict[str, Any]):
    await _db.discom_jobs.update_one({"id": job_id}, {"$set": patch})


async def _ingest_stream(job_id: str, division: str, source: str, aiter_lines,
                        filename: Optional[str], replace: bool):
    """Run the streaming ingest in background."""
    try:
        await _update_job(job_id, {"status": "running"})

        if replace:
            del_res = await _db.discom_consumers.delete_many({"division": division})
            log.info(f"discom: cleared {del_res.deleted_count} rows for {division}")

        reader = csv.reader(aiter_lines)
        try:
            header = next(reader)
        except StopIteration:
            await _update_job(job_id, {"status": "failed", "error": "Empty file",
                                       "finished_at": datetime.now(timezone.utc).isoformat()})
            return
        header = [h.strip() for h in header]

        batch: List[Dict[str, Any]] = []
        BATCH_SIZE = 5000
        total = 0
        inserted = 0
        skipped = 0
        for row in reader:
            if not row or all((c is None or c == "") for c in row):
                skipped += 1
                continue
            # Ensure length matches header
            if len(row) < len(header):
                row = row + [""] * (len(header) - len(row))
            elif len(row) > len(header):
                row = row[:len(header)]
            record = dict(zip(header, row))
            doc = _row_to_doc(record, division)
            batch.append(doc)
            total += 1

            if len(batch) >= BATCH_SIZE:
                got = await _bulk_insert(division, batch)
                inserted += got
                batch = []
                await _update_job(job_id, {"total_rows": total, "inserted": inserted,
                                            "skipped": skipped})

        if batch:
            got = await _bulk_insert(division, batch)
            inserted += got

        await _update_job(job_id, {
            "status": "done", "total_rows": total, "inserted": inserted,
            "skipped": skipped,
            "finished_at": datetime.now(timezone.utc).isoformat(),
        })
        # Record division metadata
        await _db.discom_meta.update_one(
            {"division": division},
            {"$set": {
                "division": division,
                "filename": filename,
                "row_count": inserted,
                "source": source,
                "last_ingested_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
        log.info(f"discom ingest done for {division}: {inserted}/{total} inserted")
    except Exception as e:
        log.exception(f"discom ingest failed for {division}")
        await _update_job(job_id, {"status": "failed", "error": str(e)[:500],
                                    "finished_at": datetime.now(timezone.utc).isoformat()})


# ============================================================
#                    ROUTES
# ============================================================
@discom_router.get("/divisions")
async def list_divisions():
    meta_docs = {}
    async for m in _db.discom_meta.find({}, {"_id": 0}):
        meta_docs[m["division"]] = m
    out = []
    for d in DIVISIONS:
        m = meta_docs.get(d["code"], {})
        # Get live count in case meta is stale
        live = await _db.discom_consumers.count_documents({"division": d["code"]})
        out.append({
            **d,
            "row_count": live,
            "filename": m.get("filename"),
            "last_ingested_at": m.get("last_ingested_at"),
            "source": m.get("source"),
        })
    return {"divisions": out, "table_columns": TABLE_COLUMNS}


@discom_router.post("/ingest/url")
async def ingest_from_url(payload: UrlIngest, background: BackgroundTasks):
    if payload.division not in DIVISION_CODES:
        raise HTTPException(400, f"Unknown division. Use one of {sorted(DIVISION_CODES)}")
    if not payload.url.startswith(("http://", "https://")):
        raise HTTPException(400, "URL must be http(s)")

    job = IngestJob(division=payload.division, source="url",
                    filename=payload.url.rsplit("/", 1)[-1], replaced=payload.replace)
    await _db.discom_jobs.insert_one(job.model_dump())

    async def runner():
        try:
            timeout = httpx.Timeout(60.0, connect=15.0, read=None)
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                async with client.stream("GET", payload.url) as resp:
                    if resp.status_code != 200:
                        await _update_job(job.id, {"status": "failed",
                                                    "error": f"HTTP {resp.status_code}",
                                                    "finished_at": datetime.now(timezone.utc).isoformat()})
                        return
                    # Handle gzip
                    is_gz = payload.url.lower().endswith(".gz")
                    if is_gz:
                        import gzip
                        buf = io.BytesIO()
                        async for chunk in resp.aiter_bytes():
                            buf.write(chunk)
                        buf.seek(0)
                        text_stream = io.TextIOWrapper(gzip.GzipFile(fileobj=buf), encoding="utf-8", errors="replace")
                        line_iter = iter(text_stream)
                    else:
                        # Stream chunks and split lines
                        async def line_gen():
                            async for line in resp.aiter_lines():
                                yield line
                        # csv.reader needs a sync iterator — collect into list
                        # For non-gz, buffer to memory (streaming line-by-line to sync csv is tricky)
                        buf_txt = io.StringIO()
                        async for line in resp.aiter_lines():
                            buf_txt.write(line + "\n")
                        buf_txt.seek(0)
                        line_iter = iter(buf_txt)
                    await _ingest_stream(job.id, payload.division, "url", line_iter,
                                        job.filename, payload.replace)
        except Exception as e:
            log.exception("ingest url failed")
            await _update_job(job.id, {"status": "failed", "error": str(e)[:500],
                                        "finished_at": datetime.now(timezone.utc).isoformat()})

    asyncio.create_task(runner())
    return {"job_id": job.id, "status": "queued"}


@discom_router.post("/ingest/upload")
async def ingest_from_upload(division: str = Form(...), replace: bool = Form(True),
                              file: UploadFile = File(...)):
    if division not in DIVISION_CODES:
        raise HTTPException(400, f"Unknown division")

    filename = file.filename or "upload"
    content = await file.read()
    if filename.lower().endswith(".gz"):
        import gzip
        text_stream = io.TextIOWrapper(gzip.GzipFile(fileobj=io.BytesIO(content)),
                                        encoding="utf-8", errors="replace")
        line_iter = iter(text_stream)
    else:
        line_iter = iter(io.StringIO(content.decode("utf-8", errors="replace")))

    job = IngestJob(division=division, source="file", filename=filename, replaced=replace)
    await _db.discom_jobs.insert_one(job.model_dump())

    asyncio.create_task(_ingest_stream(job.id, division, "file", line_iter, filename, replace))
    return {"job_id": job.id, "status": "queued"}


@discom_router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    doc = await _db.discom_jobs.find_one({"id": job_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Job not found")
    return doc


@discom_router.get("/jobs")
async def list_jobs(division: Optional[str] = None, limit: int = 20):
    q = {"division": division} if division else {}
    docs = await _db.discom_jobs.find(q, {"_id": 0}).sort("started_at", -1).to_list(limit)
    return {"items": docs}


@discom_router.get("/consumers")
async def list_consumers(
    division: str = Query(...),
    q: Optional[str] = None,
    field: Optional[str] = None,  # limit search to one field (KNO/SCNO/NAME/MOBILE_NO/METER_BADGE_NO)
    con_status: Optional[str] = None,
    supply_type: Optional[str] = None,
    town: Optional[str] = None,
    outstanding_gt: Optional[float] = None,
    page: int = 1,
    page_size: int = Query(25, le=200),
):
    if division not in DIVISION_CODES:
        raise HTTPException(400, "Unknown division")
    query: Dict[str, Any] = {"division": division}
    if con_status:
        query["CON_STATUS"] = con_status
    if supply_type:
        query["SUPPLY_TYPE"] = supply_type
    if town:
        query["TOWN"] = {"$regex": f"^{town}$", "$options": "i"}
    if outstanding_gt is not None:
        query["TOTAL_OUTSTANDING"] = {"$gt": outstanding_gt}
    if q:
        qs = q.strip()
        rex = {"$regex": qs, "$options": "i"}
        if field and field in SEARCH_FIELDS:
            query[field] = rex
        else:
            query["$or"] = [
                {"KNO": rex}, {"SCNO": rex}, {"ACCT_ID": rex},
                {"NAME": rex}, {"FATHER_NAME": rex},
                {"MOBILE_NO": rex}, {"METER_BADGE_NO": rex},
                {"ADDRESS": rex}, {"VILLAGE_NAME": rex},
            ]

    skip = (max(1, page) - 1) * page_size
    total = await _db.discom_consumers.count_documents(query)
    projection = {"_id": 0, "raw": 0}  # keep table light
    docs = await _db.discom_consumers.find(query, projection).skip(skip).limit(page_size).to_list(page_size)
    return {"total": total, "page": page, "page_size": page_size,
            "items": docs, "columns": TABLE_COLUMNS}


@discom_router.get("/consumers/{cid}")
async def get_consumer(cid: str):
    doc = await _db.discom_consumers.find_one({"id": cid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Consumer not found")
    return doc


@discom_router.get("/stats")
async def discom_stats():
    out = {"divisions": [], "totals": {"consumers": 0, "outstanding": 0.0, "active": 0}}
    grand_total = 0
    grand_out = 0.0
    grand_active = 0
    for d in DIVISIONS:
        c = await _db.discom_consumers.count_documents({"division": d["code"]})
        active = await _db.discom_consumers.count_documents(
            {"division": d["code"], "CON_STATUS": {"$in": ["ACTIVE", "Active", "active"]}}
        )
        agg = await _db.discom_consumers.aggregate([
            {"$match": {"division": d["code"]}},
            {"$group": {"_id": None, "outstanding": {"$sum": "$TOTAL_OUTSTANDING"}}}
        ]).to_list(1)
        outstanding = round(float(agg[0]["outstanding"]) if agg else 0.0, 2)
        out["divisions"].append({
            "code": d["code"], "name": d["name"],
            "consumers": c, "active": active, "outstanding": outstanding,
        })
        grand_total += c
        grand_out += outstanding
        grand_active += active
    out["totals"] = {"consumers": grand_total, "outstanding": round(grand_out, 2),
                     "active": grand_active}
    return out


@discom_router.delete("/division/{division}")
async def clear_division(division: str):
    if division not in DIVISION_CODES:
        raise HTTPException(400, "Unknown division")
    res = await _db.discom_consumers.delete_many({"division": division})
    await _db.discom_meta.delete_one({"division": division})
    return {"deleted": res.deleted_count, "division": division}


async def ensure_indexes(db):
    await db.discom_consumers.create_index([("division", 1)])
    await db.discom_consumers.create_index([("division", 1), ("KNO", 1)])
    await db.discom_consumers.create_index([("division", 1), ("SCNO", 1)])
    await db.discom_consumers.create_index([("division", 1), ("MOBILE_NO", 1)])
    await db.discom_consumers.create_index([("division", 1), ("NAME", 1)])
    await db.discom_consumers.create_index([("division", 1), ("METER_BADGE_NO", 1)])
    await db.discom_jobs.create_index([("started_at", -1)])
