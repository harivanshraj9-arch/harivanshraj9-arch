from fastapi import FastAPI, APIRouter, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import re
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Literal, Dict, Any
import uuid
from datetime import datetime, timezone, date, timedelta
from openpyxl import Workbook, load_workbook

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Prathvi Power Solutions API")
api_router = APIRouter(prefix="/api")

# ============================================================
#                    RESOURCE MODULE (existing)
# ============================================================
class Resource(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sno: int
    title: str
    description: str
    category: str
    kind: str
    url: str
    starred: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ResourceUpdate(BaseModel):
    starred: Optional[bool] = None


class ActivityLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    resource_id: str
    resource_title: str
    action: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ActivityCreate(BaseModel):
    resource_id: str
    action: str = "opened"


SEED_RESOURCES = [
    {"sno": 1, "title": "STYRA Dashboard", "description": "Daily and monthly progress of Quality Control (QC), KPIs and performance monitoring dashboard.", "category": "Operations", "kind": "dashboard", "url": "https://wfm.saryu.mvvnl.polarisgrids.com/login"},
    {"sno": 2, "title": "Invest (POLARIS)", "description": "Investment, expenditure and financial details related to the Polaris project.", "category": "Finance", "kind": "spreadsheet", "url": "https://docs.google.com/spreadsheets/d/1bWMuSGt5JzM80HdRkOkaNh8wSF5JJcOD_6XIp5xi6f4/edit?usp=drive_link"},
    {"sno": 3, "title": "Employee Details & ID", "description": "Employee personal info, IDs, roles, departments and contact records.", "category": "HR", "kind": "spreadsheet", "url": "https://docs.google.com/spreadsheets/u/0/d/1_jGnE8n5k4N0fW9fYjr0dpZdnXAumMv-EU2F6d4grtg/edit"},
    {"sno": 4, "title": "Final Salary Sheet 2026", "description": "Final salary list for FY 2026 containing every employee's payout details.", "category": "Finance", "kind": "spreadsheet", "url": "https://docs.google.com/spreadsheets/u/0/d/1brpklQ9mfqeFjvSFZvrp2lRoOq4UTzb2BbKpwKKbxfk/edit"},
    {"sno": 5, "title": "Daily Reports", "description": "Daily tasks, progress and activity reports across teams.", "category": "Reports", "kind": "spreadsheet", "url": "https://docs.google.com/spreadsheets/u/0/d/1gFSrjfwZRYHe9hUQgI3HCoH-uLzAV2Eu8wh5NlhLsWY/edit"},
    {"sno": 6, "title": "BI Signoff Sheet", "description": "Approval sign-off list for BI (Billing / Business Intelligence) tasks.", "category": "Reports", "kind": "spreadsheet", "url": "https://docs.google.com/spreadsheets/d/1Duzm2L8xs48XYJzNh2sZTsr-d2v-b4vbCI5K22VXInw/edit?usp=drive_link"},
    {"sno": 7, "title": "New CI Data", "description": "New Consumer Index (CI) and customer information records.", "category": "Customer", "kind": "spreadsheet", "url": "https://docs.google.com/spreadsheets/d/1-Hs-Qnn61KD_fWBCGx47GCWUdIJqd8lG/edit?usp=drive_link"},
    {"sno": 8, "title": "Old Meter Stock Details", "description": "Stock, availability and status of old meters.", "category": "Inventory", "kind": "spreadsheet", "url": "https://docs.google.com/spreadsheets/d/1tl58XESwqVPx6J-QwhSI4GGyYnqM3JHdZNBH7C-M2Vc/edit?usp=drive_link"},
    {"sno": 9, "title": "Invoice Format Polaris", "description": "Standard invoice format and billing template for the Polaris project.", "category": "Finance", "kind": "spreadsheet", "url": "https://docs.google.com/spreadsheets/d/1kFCb6m3yULOM1a3aYQtZUl3FX_YC1yKu7oXvhh-Ch8Q/edit?usp=drive_link"},
    {"sno": 10, "title": "Salary Sheet", "description": "Employee salaries, allowances, deductions and total payments.", "category": "Finance", "kind": "spreadsheet", "url": "https://docs.google.com/spreadsheets/u/1/d/1krEu8qDiJObWqTAOgibE4C9GQRL0d2EgqsBZ5P0z_ZQ/edit"},
    {"sno": 11, "title": "All DT Cable Signoff", "description": "Sign-off and approval list for all Distribution Transformer (DT) cable works.", "category": "Operations", "kind": "spreadsheet", "url": "https://docs.google.com/spreadsheets/d/189WxVbg2kmpFHa9pgzlEU0oYaHLeca6o3CDSYY1Ets8/edit?usp=drive_link"},
    {"sno": 12, "title": "Deposited Stock Old Meters", "description": "Tracking record of deposited old meter inventory.", "category": "Inventory", "kind": "spreadsheet", "url": "https://docs.google.com/spreadsheets/d/1M-qxJRZYPtU2qBkUh5vQTa61ggMxuRaUYHp6zKVouk8/edit?usp=drive_link"},
    {"sno": 13, "title": "WCC Declaration Polaris", "description": "Work Completion Certificate (WCC) declaration records for Polaris.", "category": "Legal", "kind": "document", "url": "https://docs.google.com/document/d/1BkonbBQky_M9yifhc3jVBdiZqn48Dt4A/edit?usp=drive_link"},
    {"sno": 14, "title": "Indent Material", "description": "Indent requests and issuance details for required materials.", "category": "Operations", "kind": "spreadsheet", "url": "https://docs.google.com/spreadsheets/d/1HGy2drx-p5uH02uI0wlLi3HbYnrgvQ-9/edit?usp=drive_link"},
    {"sno": 15, "title": "Offer Letter Format", "description": "Standard offer letter template for new employees.", "category": "HR", "kind": "document", "url": "https://docs.google.com/document/d/1kXi8TeT5NDtCV_FZyqL646z_moERDsOX/edit?usp=drive_link"},
    {"sno": 16, "title": "Employee Application Form", "description": "Application form format for job candidates.", "category": "HR", "kind": "document", "url": "https://docs.google.com/document/d/1uPY6L0-Nx2BfPJtucstLw_Q6Zim7x5w_wbUVvvv-kd4/edit?usp=drive_link"},
    {"sno": 17, "title": "PTW – Electrical Shutdown Work", "description": "Permit to Work (PTW) records and approvals for electrical shutdown activities.", "category": "Operations", "kind": "document", "url": "https://docs.google.com/document/d/1V8cEPSA0ZMQpA-jUaVipkqivMXxVymXq/edit?usp=drive_link"},
    {"sno": 18, "title": "Agreement Form", "description": "Agreement formats and records between company and employees/vendors.", "category": "Legal", "kind": "document", "url": "https://docs.google.com/document/d/1H4r7AcWANa5qIVQ9uIxnef_xWO6ZJWzsSqJJckgcU7k/edit?usp=drive_link"},
    {"sno": 19, "title": "BI Sign-off PDF Files", "description": "Archive of all BI sign-off related PDF documents.", "category": "Reports", "kind": "folder", "url": "https://drive.google.com/drive/folders/131iWhIsctOgvk_43eGHvaZsPTFmk58ED?usp=drive_link"},
]


async def seed_resources_if_empty():
    if await db.resources.count_documents({}) == 0:
        docs = []
        for item in SEED_RESOURCES:
            r = Resource(**item)
            d = r.model_dump()
            d['created_at'] = d['created_at'].isoformat()
            docs.append(d)
        await db.resources.insert_many(docs)
        logging.info(f"Seeded {len(docs)} resources")


@api_router.get("/")
async def root():
    return {"message": "Prathvi Power Solutions API", "status": "ok"}


@api_router.get("/resources", response_model=List[Resource])
async def list_resources(category: Optional[str] = None, q: Optional[str] = None):
    query = {}
    if category and category.lower() != "all":
        query["category"] = category
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.resources.find(query, {"_id": 0}).sort("sno", 1).to_list(200)
    for d in docs:
        if isinstance(d.get('created_at'), str):
            d['created_at'] = datetime.fromisoformat(d['created_at'])
    return docs


@api_router.get("/resources/{resource_id}", response_model=Resource)
async def get_resource(resource_id: str):
    doc = await db.resources.find_one({"id": resource_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Resource not found")
    if isinstance(doc.get('created_at'), str):
        doc['created_at'] = datetime.fromisoformat(doc['created_at'])
    return doc


@api_router.patch("/resources/{resource_id}", response_model=Resource)
async def update_resource(resource_id: str, patch: ResourceUpdate):
    updates = {k: v for k, v in patch.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.resources.find_one_and_update(
        {"id": resource_id}, {"$set": updates},
        return_document=True, projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Resource not found")
    if isinstance(result.get('created_at'), str):
        result['created_at'] = datetime.fromisoformat(result['created_at'])
    return result


@api_router.get("/stats")
async def get_stats():
    total = await db.resources.count_documents({})
    starred = await db.resources.count_documents({"starred": True})
    cats = await db.resources.aggregate([
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(50)
    kinds = await db.resources.aggregate([
        {"$group": {"_id": "$kind", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(50)
    activity_count = await db.activity.count_documents({})
    return {
        "total_resources": total, "starred": starred, "categories": len(cats),
        "activity_count": activity_count,
        "by_category": [{"name": c["_id"], "count": c["count"]} for c in cats],
        "by_kind": [{"name": k["_id"], "count": k["count"]} for k in kinds],
    }


@api_router.post("/activity", response_model=ActivityLog)
async def log_activity(payload: ActivityCreate):
    resource = await db.resources.find_one({"id": payload.resource_id}, {"_id": 0})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    log = ActivityLog(resource_id=payload.resource_id, resource_title=resource["title"], action=payload.action)
    d = log.model_dump()
    d['timestamp'] = d['timestamp'].isoformat()
    await db.activity.insert_one(d)
    return log


@api_router.get("/activity", response_model=List[ActivityLog])
async def list_activity(limit: int = 10):
    docs = await db.activity.find({}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    for d in docs:
        if isinstance(d.get('timestamp'), str):
            d['timestamp'] = datetime.fromisoformat(d['timestamp'])
    return docs


@api_router.get("/categories")
async def list_categories():
    cats = await db.resources.distinct("category")
    return {"categories": sorted(cats)}


# ============================================================
#                    EXPENSE MODULE (new)
# ============================================================
EXPENSE_CATEGORIES = ["Food", "Fuel", "Travel", "Office", "Electricity", "Salary", "Shopping", "Medical", "Miscellaneous"]
PAYMENT_MODES = ["Cash", "UPI", "Bank", "Card"]


def _sanitize(text: Optional[str], max_len: int = 500) -> Optional[str]:
    if text is None:
        return None
    return str(text).strip()[:max_len]


class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # ISO date "YYYY-MM-DD"
    category: str
    amount: float
    payment_mode: str
    description: Optional[str] = ""
    attachment: Optional[str] = None  # base64 or url
    attachment_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ExpenseCreate(BaseModel):
    date: Optional[str] = None
    category: str
    amount: float
    payment_mode: str
    description: Optional[str] = ""
    attachment: Optional[str] = None
    attachment_name: Optional[str] = None

    @field_validator('amount')
    @classmethod
    def amount_positive(cls, v):
        if v is None or v <= 0:
            raise ValueError("Amount must be greater than 0")
        return round(float(v), 2)

    @field_validator('category')
    @classmethod
    def category_non_empty(cls, v):
        v = (v or "").strip()
        if not v:
            raise ValueError("Category is required")
        return v[:60]

    @field_validator('payment_mode')
    @classmethod
    def payment_valid(cls, v):
        v = (v or "").strip()
        if v not in PAYMENT_MODES:
            raise ValueError(f"Payment mode must be one of {PAYMENT_MODES}")
        return v


class ExpenseUpdate(BaseModel):
    date: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    payment_mode: Optional[str] = None
    description: Optional[str] = None
    attachment: Optional[str] = None
    attachment_name: Optional[str] = None


class Budget(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    month: str  # "YYYY-MM"
    amount: float
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BudgetSet(BaseModel):
    month: Optional[str] = None
    amount: float

    @field_validator('amount')
    @classmethod
    def positive(cls, v):
        if v is None or v < 0:
            raise ValueError("Budget amount must be >= 0")
        return round(float(v), 2)


def _today_str() -> str:
    return date.today().isoformat()


def _month_str(dt: Optional[date] = None) -> str:
    dt = dt or date.today()
    return dt.strftime("%Y-%m")


def _parse_date(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()


def _clean_expense_doc(d: dict) -> dict:
    if isinstance(d.get('created_at'), str):
        d['created_at'] = datetime.fromisoformat(d['created_at'])
    if isinstance(d.get('updated_at'), str):
        d['updated_at'] = datetime.fromisoformat(d['updated_at'])
    return d


@api_router.get("/expenses/categories")
async def expense_categories():
    return {"categories": EXPENSE_CATEGORIES, "payment_modes": PAYMENT_MODES}


@api_router.get("/expenses", response_model=List[Expense])
async def list_expenses(
    q: Optional[str] = None,
    category: Optional[str] = None,
    payment_mode: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    sort_by: Literal["date", "amount"] = "date",
    order: Literal["asc", "desc"] = "desc",
    limit: int = Query(1000, le=5000),
    skip: int = 0,
):
    query = {}
    if category and category.lower() != "all":
        query["category"] = category
    if payment_mode and payment_mode.lower() != "all":
        query["payment_mode"] = payment_mode
    if start or end:
        dq = {}
        if start:
            dq["$gte"] = start
        if end:
            dq["$lte"] = end
        query["date"] = dq
    if q:
        query["$or"] = [
            {"description": {"$regex": q, "$options": "i"}},
            {"category": {"$regex": q, "$options": "i"}},
            {"payment_mode": {"$regex": q, "$options": "i"}},
        ]

    direction = -1 if order == "desc" else 1
    sort_field = sort_by
    docs = await db.expenses.find(query, {"_id": 0}).sort(sort_field, direction).skip(skip).limit(limit).to_list(limit)
    return [_clean_expense_doc(d) for d in docs]


@api_router.get("/expenses/count")
async def count_expenses(
    q: Optional[str] = None,
    category: Optional[str] = None,
    payment_mode: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
):
    query = {}
    if category and category.lower() != "all":
        query["category"] = category
    if payment_mode and payment_mode.lower() != "all":
        query["payment_mode"] = payment_mode
    if start or end:
        dq = {}
        if start:
            dq["$gte"] = start
        if end:
            dq["$lte"] = end
        query["date"] = dq
    if q:
        query["$or"] = [
            {"description": {"$regex": q, "$options": "i"}},
            {"category": {"$regex": q, "$options": "i"}},
            {"payment_mode": {"$regex": q, "$options": "i"}},
        ]
    total = await db.expenses.count_documents(query)
    return {"total": total}


@api_router.post("/expenses", response_model=Expense)
async def create_expense(payload: ExpenseCreate):
    d = payload.model_dump()
    d['date'] = d['date'] or _today_str()
    try:
        _parse_date(d['date'])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format (expected YYYY-MM-DD)")
    d['description'] = _sanitize(d.get('description'), 1000) or ""
    d['attachment_name'] = _sanitize(d.get('attachment_name'), 200)
    exp = Expense(**d)
    doc = exp.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.expenses.insert_one(doc)
    return exp


@api_router.get("/expenses/item/{expense_id}", response_model=Expense)
async def get_expense(expense_id: str):
    doc = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Expense not found")
    return _clean_expense_doc(doc)


@api_router.patch("/expenses/item/{expense_id}", response_model=Expense)
async def update_expense(expense_id: str, patch: ExpenseUpdate):
    updates = {k: v for k, v in patch.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    if 'amount' in updates:
        if updates['amount'] <= 0:
            raise HTTPException(status_code=400, detail="Amount must be > 0")
        updates['amount'] = round(float(updates['amount']), 2)
    if 'payment_mode' in updates and updates['payment_mode'] not in PAYMENT_MODES:
        raise HTTPException(status_code=400, detail=f"Payment mode must be one of {PAYMENT_MODES}")
    if 'date' in updates:
        try:
            _parse_date(updates['date'])
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid date format")
    if 'description' in updates:
        updates['description'] = _sanitize(updates['description'], 1000) or ""
    if 'attachment_name' in updates:
        updates['attachment_name'] = _sanitize(updates['attachment_name'], 200)
    updates['updated_at'] = datetime.now(timezone.utc).isoformat()
    result = await db.expenses.find_one_and_update(
        {"id": expense_id}, {"$set": updates},
        return_document=True, projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Expense not found")
    return _clean_expense_doc(result)


@api_router.delete("/expenses/item/{expense_id}")
async def delete_expense(expense_id: str):
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"deleted": True, "id": expense_id}



@api_router.get("/budget")
async def get_budget(month: Optional[str] = None):
    m = month or _month_str()
    doc = await db.budgets.find_one({"month": m}, {"_id": 0})
    amount = doc["amount"] if doc else 0.0
    return {"month": m, "amount": amount}


@api_router.post("/budget")
async def set_budget(payload: BudgetSet):
    m = payload.month or _month_str()
    now = datetime.now(timezone.utc).isoformat()
    await db.budgets.update_one(
        {"month": m},
        {"$set": {"amount": payload.amount, "updated_at": now, "month": m},
         "$setOnInsert": {"id": str(uuid.uuid4())}},
        upsert=True,
    )
    return {"month": m, "amount": payload.amount}


# ---------- Summary ----------
async def _sum_range(start: str, end: str) -> float:
    pipeline = [
        {"$match": {"date": {"$gte": start, "$lte": end}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    res = await db.expenses.aggregate(pipeline).to_list(1)
    return float(res[0]["total"]) if res else 0.0


@api_router.get("/expenses/summary/dashboard")
async def expense_summary():
    today = date.today()
    today_s = today.isoformat()
    week_start = today - timedelta(days=today.weekday())  # Monday
    week_start_s = week_start.isoformat()
    month_start = today.replace(day=1)
    month_start_s = month_start.isoformat()

    total_today = await _sum_range(today_s, today_s)
    total_week = await _sum_range(week_start_s, today_s)
    total_month = await _sum_range(month_start_s, today_s)

    month_key = _month_str(today)
    budget_doc = await db.budgets.find_one({"month": month_key}, {"_id": 0})
    budget = float(budget_doc["amount"]) if budget_doc else 0.0
    remaining = round(budget - total_month, 2)
    utilization = round((total_month / budget * 100), 2) if budget > 0 else 0.0

    entries = await db.expenses.count_documents({})
    entries_month = await db.expenses.count_documents({"date": {"$gte": month_start_s, "$lte": today_s}})

    # avg daily = total this month / days elapsed in month
    days_elapsed = (today - month_start).days + 1
    avg_daily = round(total_month / days_elapsed, 2) if days_elapsed else 0.0

    return {
        "today": round(total_today, 2),
        "week": round(total_week, 2),
        "month": round(total_month, 2),
        "budget": round(budget, 2),
        "remaining": remaining,
        "utilization": utilization,
        "entries_total": entries,
        "entries_month": entries_month,
        "avg_daily": avg_daily,
        "over_budget": budget > 0 and total_month > budget,
        "warn": budget > 0 and total_month >= budget * 0.8,
        "month_key": month_key,
    }


@api_router.get("/expenses/analytics/monthly")
async def analytics_monthly(months: int = 6):
    """Total per month for last N months (including current)."""
    today = date.today()
    start_month = (today.replace(day=1) - timedelta(days=(months - 1) * 31)).replace(day=1)
    start_s = start_month.isoformat()
    pipeline = [
        {"$match": {"date": {"$gte": start_s}}},
        {"$project": {"month": {"$substr": ["$date", 0, 7]}, "amount": 1}},
        {"$group": {"_id": "$month", "total": {"$sum": "$amount"}}},
        {"$sort": {"_id": 1}},
    ]
    res = await db.expenses.aggregate(pipeline).to_list(200)
    data_map = {r["_id"]: round(float(r["total"]), 2) for r in res}

    # Fill missing months
    result = []
    y, m = start_month.year, start_month.month
    for _ in range(months):
        key = f"{y:04d}-{m:02d}"
        result.append({"month": key, "total": data_map.get(key, 0)})
        m += 1
        if m > 12:
            m = 1
            y += 1
    return {"data": result}


@api_router.get("/expenses/analytics/category")
async def analytics_category(month: Optional[str] = None):
    """Category breakdown for a given month (default current)."""
    m = month or _month_str()
    start_s = f"{m}-01"
    # end of month
    y, mm = map(int, m.split("-"))
    if mm == 12:
        end_first = f"{y+1:04d}-01-01"
    else:
        end_first = f"{y:04d}-{mm+1:02d}-01"
    pipeline = [
        {"$match": {"date": {"$gte": start_s, "$lt": end_first}}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
        {"$sort": {"total": -1}},
    ]
    res = await db.expenses.aggregate(pipeline).to_list(50)
    return {"month": m, "data": [{"category": r["_id"], "total": round(float(r["total"]), 2), "count": r["count"]} for r in res]}


@api_router.get("/expenses/analytics/weekly")
async def analytics_weekly(days: int = 14):
    """Daily totals for last N days."""
    today = date.today()
    start = today - timedelta(days=days - 1)
    start_s = start.isoformat()
    pipeline = [
        {"$match": {"date": {"$gte": start_s}}},
        {"$group": {"_id": "$date", "total": {"$sum": "$amount"}}},
        {"$sort": {"_id": 1}},
    ]
    res = await db.expenses.aggregate(pipeline).to_list(500)
    dmap = {r["_id"]: round(float(r["total"]), 2) for r in res}
    out = []
    for i in range(days):
        d = start + timedelta(days=i)
        ds = d.isoformat()
        out.append({"date": ds, "total": dmap.get(ds, 0)})
    return {"data": out}


@api_router.get("/expenses/analytics/payment")
async def analytics_payment_mode(month: Optional[str] = None):
    m = month or _month_str()
    start_s = f"{m}-01"
    y, mm = map(int, m.split("-"))
    end_first = f"{y+1 if mm == 12 else y:04d}-{1 if mm == 12 else mm+1:02d}-01"
    pipeline = [
        {"$match": {"date": {"$gte": start_s, "$lt": end_first}}},
        {"$group": {"_id": "$payment_mode", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
        {"$sort": {"total": -1}},
    ]
    res = await db.expenses.aggregate(pipeline).to_list(50)
    return {"month": m, "data": [{"mode": r["_id"], "total": round(float(r["total"]), 2), "count": r["count"]} for r in res]}


# ---------- Export ----------
@api_router.get("/expenses/export/excel")
async def export_excel(
    q: Optional[str] = None, category: Optional[str] = None,
    payment_mode: Optional[str] = None, start: Optional[str] = None, end: Optional[str] = None,
):
    query = {}
    if category and category.lower() != "all":
        query["category"] = category
    if payment_mode and payment_mode.lower() != "all":
        query["payment_mode"] = payment_mode
    if start or end:
        dq = {}
        if start: dq["$gte"] = start
        if end: dq["$lte"] = end
        query["date"] = dq
    if q:
        query["$or"] = [
            {"description": {"$regex": q, "$options": "i"}},
            {"category": {"$regex": q, "$options": "i"}},
            {"payment_mode": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.expenses.find(query, {"_id": 0}).sort("date", -1).to_list(10000)
    wb = Workbook()
    ws = wb.active
    ws.title = "Expenses"
    ws.append(["Date", "Category", "Amount (₹)", "Payment Mode", "Description", "Attachment"])
    for d in docs:
        ws.append([
            d.get("date", ""), d.get("category", ""), d.get("amount", 0),
            d.get("payment_mode", ""), d.get("description", ""),
            d.get("attachment_name", "") or "",
        ])
    for col_idx, width in enumerate([12, 15, 12, 14, 40, 25], start=1):
        ws.column_dimensions[chr(64 + col_idx)].width = width
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    filename = f"expenses_{date.today().isoformat()}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------- Backup / Restore ----------
@api_router.get("/expenses/backup")
async def backup_expenses():
    expenses = await db.expenses.find({}, {"_id": 0}).to_list(100000)
    budgets = await db.budgets.find({}, {"_id": 0}).to_list(1000)
    return {
        "version": 1,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "expenses": expenses,
        "budgets": budgets,
    }


class RestorePayload(BaseModel):
    expenses: List[dict] = []
    budgets: List[dict] = []
    mode: Literal["merge", "replace"] = "merge"


@api_router.post("/expenses/restore")
async def restore_expenses(payload: RestorePayload):
    if payload.mode == "replace":
        await db.expenses.delete_many({})
        await db.budgets.delete_many({})

    added = 0
    for e in payload.expenses:
        try:
            if not e.get("id"):
                e["id"] = str(uuid.uuid4())
            if isinstance(e.get("created_at"), datetime):
                e["created_at"] = e["created_at"].isoformat()
            if isinstance(e.get("updated_at"), datetime):
                e["updated_at"] = e["updated_at"].isoformat()
            await db.expenses.update_one({"id": e["id"]}, {"$set": e}, upsert=True)
            added += 1
        except Exception as ex:
            logging.warning(f"restore skip: {ex}")

    for b in payload.budgets:
        try:
            if not b.get("month"):
                continue
            await db.budgets.update_one({"month": b["month"]}, {"$set": b}, upsert=True)
        except Exception:
            pass

    return {"restored_expenses": added, "restored_budgets": len(payload.budgets), "mode": payload.mode}

# ---------- Excel Import ----------
HEADER_ALIASES = {
    "date": ["date", "dt", "expense date", "exp date", "day date", "txn date", "transaction date"],
    "category": ["category", "cat", "type", "expense category", "head"],
    "amount": ["amount", "amt", "value", "cost", "price", "total", "expense", "rs", "inr", "amount (rs)", "amount (inr)", "amount (₹)"],
    "payment_mode": ["payment mode", "paymentmode", "mode", "payment", "pay mode", "pay method", "method", "pay"],
    "description": ["description", "desc", "remarks", "remark", "notes", "note", "details", "detail", "particulars", "narration"],
    "attachment": ["attachment", "attach", "bill", "receipt", "file", "attachment name"],
}


def _norm_header(s: Any) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(s or "").strip().lower()).strip()


def _map_headers(header_row: List[Any]) -> Dict[str, int]:
    """Return field_name -> column_index (0-based), None if not found."""
    normalized = [_norm_header(h) for h in header_row]
    mapping: Dict[str, int] = {}
    for field, aliases in HEADER_ALIASES.items():
        alias_norms = [_norm_header(a) for a in aliases]
        for idx, h in enumerate(normalized):
            if h and h in alias_norms:
                mapping[field] = idx
                break
    return mapping


def _parse_cell_date(v: Any) -> Optional[str]:
    if v is None or v == "":
        return None
    if isinstance(v, datetime):
        return v.date().isoformat()
    if isinstance(v, date):
        return v.isoformat()
    s = str(v).strip()
    if not s:
        return None
    # Try ISO first, then common formats
    formats = ["%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y",
               "%d.%m.%Y", "%Y/%m/%d", "%d-%b-%Y", "%d %b %Y",
               "%d-%B-%Y", "%d %B %Y", "%b %d, %Y", "%B %d, %Y"]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def _parse_cell_amount(v: Any) -> Optional[float]:
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        return float(v) if v > 0 else None
    s = str(v).strip()
    # Strip currency symbols, commas, spaces
    s = re.sub(r"[₹$€£,\s]", "", s)
    # Handle parentheses (negative) - treat as invalid for expense
    if "(" in s or ")" in s:
        return None
    try:
        val = float(s)
        return val if val > 0 else None
    except (ValueError, TypeError):
        return None


def _normalize_payment_mode(v: Any) -> str:
    s = str(v or "").strip().lower()
    if not s:
        return "Cash"
    if "upi" in s or "gpay" in s or "phonepe" in s or "paytm" in s:
        return "UPI"
    if "card" in s or "credit" in s or "debit" in s:
        return "Card"
    if "bank" in s or "neft" in s or "rtgs" in s or "imps" in s or "transfer" in s or "cheque" in s or "check" in s:
        return "Bank"
    if "cash" in s:
        return "Cash"
    return "Cash"


def _sanitize_str(v: Any, max_len: int = 500) -> str:
    return str(v or "").strip()[:max_len]


class PreviewRow(BaseModel):
    row: int
    date: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    payment_mode: Optional[str] = None
    description: Optional[str] = None
    attachment_name: Optional[str] = None
    valid: bool = True
    is_duplicate: bool = False
    errors: List[str] = []


class ImportCommitPayload(BaseModel):
    rows: List[Dict[str, Any]]
    skip_duplicates: bool = True


async def _existing_signatures() -> set:
    """Return set of duplicate signatures already in DB."""
    docs = await db.expenses.find({}, {"_id": 0, "date": 1, "amount": 1, "category": 1, "description": 1}).to_list(200000)
    sigs = set()
    for d in docs:
        sig = f"{d.get('date','')}|{round(float(d.get('amount',0) or 0), 2)}|{(d.get('category','') or '').strip().lower()}|{(d.get('description','') or '').strip().lower()}"
        sigs.add(sig)
    return sigs


@api_router.post("/expenses/import/preview")
async def import_preview(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()
    if not (filename.endswith(".xlsx") or filename.endswith(".xls") or filename.endswith(".xlsm")):
        raise HTTPException(status_code=400, detail="Only .xlsx / .xls / .xlsm files supported")

    try:
        content = await file.read()
        wb = load_workbook(filename=io.BytesIO(content), data_only=True, read_only=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read Excel file: {e}")

    ws = wb.active
    rows_iter = ws.iter_rows(values_only=True)
    try:
        header = list(next(rows_iter))
    except StopIteration:
        raise HTTPException(status_code=400, detail="Excel file is empty")

    mapping = _map_headers(header)
    required = ["date", "category", "amount"]
    missing = [r for r in required if r not in mapping]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {', '.join(missing)}. Found headers: {header}",
        )

    existing_sigs = await _existing_signatures()

    known_categories = set(c.lower() for c in EXPENSE_CATEGORIES)

    parsed: List[PreviewRow] = []
    empty_skipped = 0
    row_num = 1
    for raw_row in rows_iter:
        row_num += 1
        if raw_row is None:
            empty_skipped += 1
            continue
        # empty row: all None/empty
        if all(c is None or str(c).strip() == "" for c in raw_row):
            empty_skipped += 1
            continue

        def cell(field):
            idx = mapping.get(field)
            return raw_row[idx] if idx is not None and idx < len(raw_row) else None

        pr = PreviewRow(row=row_num, errors=[])
        # Date
        dstr = _parse_cell_date(cell("date"))
        if not dstr:
            pr.errors.append("Invalid or missing date")
        else:
            pr.date = dstr
        # Amount
        amt = _parse_cell_amount(cell("amount"))
        if amt is None:
            pr.errors.append("Amount must be a positive number")
        else:
            pr.amount = round(amt, 2)
        # Category
        cat = _sanitize_str(cell("category"), 60)
        if not cat:
            pr.errors.append("Category is required")
        else:
            # Match preset case-insensitively, else keep as custom
            matched = next((c for c in EXPENSE_CATEGORIES if c.lower() == cat.lower()), None)
            pr.category = matched or cat
        # Payment mode
        pm_raw = cell("payment_mode")
        pr.payment_mode = _normalize_payment_mode(pm_raw)
        # Description
        pr.description = _sanitize_str(cell("description"), 1000)
        # Attachment
        att = cell("attachment")
        pr.attachment_name = _sanitize_str(att, 200) or None

        pr.valid = len(pr.errors) == 0

        if pr.valid:
            sig = f"{pr.date}|{round(float(pr.amount), 2)}|{pr.category.strip().lower()}|{(pr.description or '').strip().lower()}"
            pr.is_duplicate = sig in existing_sigs

        parsed.append(pr)

    counts = {
        "total_rows": len(parsed),
        "valid": sum(1 for p in parsed if p.valid),
        "invalid": sum(1 for p in parsed if not p.valid),
        "duplicates": sum(1 for p in parsed if p.valid and p.is_duplicate),
        "empty_skipped": empty_skipped,
    }

    # New (custom) categories detected among valid rows
    new_categories = sorted({
        p.category for p in parsed
        if p.valid and p.category and p.category.lower() not in known_categories
    })

    return {
        "filename": file.filename,
        "headers": [str(h) if h is not None else "" for h in header],
        "header_map": mapping,
        "counts": counts,
        "new_categories": new_categories,
        "rows": [p.model_dump() for p in parsed],
    }


@api_router.post("/expenses/import/commit")
async def import_commit(payload: ImportCommitPayload):
    """Bulk-insert rows previously validated by /import/preview."""
    to_insert = []
    imported = 0
    skipped_duplicate = 0
    failed = 0
    errors: List[Dict[str, Any]] = []

    existing_sigs = await _existing_signatures()

    now_iso = datetime.now(timezone.utc).isoformat()

    for r in payload.rows:
        try:
            if not r.get("valid", True):
                failed += 1
                errors.append({"row": r.get("row"), "error": "; ".join(r.get("errors", []))})
                continue

            date_s = r.get("date")
            amount = r.get("amount")
            category = _sanitize_str(r.get("category"), 60)
            payment_mode = r.get("payment_mode") or "Cash"
            description = _sanitize_str(r.get("description"), 1000)
            attachment_name = _sanitize_str(r.get("attachment_name"), 200) or None

            if not date_s or amount is None or amount <= 0 or not category:
                failed += 1
                errors.append({"row": r.get("row"), "error": "Missing required fields"})
                continue

            if payment_mode not in PAYMENT_MODES:
                payment_mode = "Cash"

            sig = f"{date_s}|{round(float(amount), 2)}|{category.strip().lower()}|{description.strip().lower()}"
            if sig in existing_sigs:
                if payload.skip_duplicates:
                    skipped_duplicate += 1
                    continue
                # else: allow duplicate (fall through)

            doc = {
                "id": str(uuid.uuid4()),
                "date": date_s,
                "category": category,
                "amount": round(float(amount), 2),
                "payment_mode": payment_mode,
                "description": description,
                "attachment": None,
                "attachment_name": attachment_name,
                "created_at": now_iso,
                "updated_at": now_iso,
            }
            to_insert.append(doc)
            existing_sigs.add(sig)  # avoid duplicates within batch
            imported += 1

            # Batch insert every 1000
            if len(to_insert) >= 1000:
                await db.expenses.insert_many(to_insert, ordered=False)
                to_insert = []
        except Exception as e:
            failed += 1
            errors.append({"row": r.get("row"), "error": str(e)[:200]})

    if to_insert:
        try:
            await db.expenses.insert_many(to_insert, ordered=False)
        except Exception as e:
            failed += len(to_insert)
            imported -= len(to_insert)
            errors.append({"row": 0, "error": f"Batch insert failed: {str(e)[:200]}"})

    return {
        "total_rows": len(payload.rows),
        "imported": imported,
        "skipped_duplicate": skipped_duplicate,
        "failed": failed,
        "errors": errors[:200],  # cap
    }





# ============================================================
app.include_router(api_router)

# HRMS module
from hrms import hrms_router, init_hrms
init_hrms(db)
app.include_router(hrms_router)

# Vendor Billing module (Rate Master + WCC AI + Invoice generator)
from billing import billing_router, init_billing, seed_rates_if_empty
init_billing(db)
app.include_router(billing_router)

# DISCOM Master Data module
from discom import discom_router, init_discom, ensure_indexes as ensure_discom_indexes
init_discom(db)
app.include_router(discom_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    await seed_resources_if_empty()
    await seed_rates_if_empty()
    # Ensure indexes
    await db.expenses.create_index([("date", -1)])
    await db.expenses.create_index([("category", 1)])
    await db.expenses.create_index([("payment_mode", 1)])
    await db.budgets.create_index([("month", 1)], unique=True)
    await ensure_discom_indexes(db)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
