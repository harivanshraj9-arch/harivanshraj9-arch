from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="POLARIS / MVVNL Master Dashboard API")
api_router = APIRouter(prefix="/api")


# ------------------------ Models ------------------------
class Resource(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sno: int
    title: str
    description: str
    category: str
    kind: str  # spreadsheet | document | folder | dashboard
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
    action: str  # opened | starred | unstarred
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ActivityCreate(BaseModel):
    resource_id: str
    action: str = "opened"


# ------------------------ Seed Data ------------------------
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
    count = await db.resources.count_documents({})
    if count == 0:
        docs = []
        for item in SEED_RESOURCES:
            r = Resource(**item)
            d = r.model_dump()
            d['created_at'] = d['created_at'].isoformat()
            docs.append(d)
        await db.resources.insert_many(docs)
        logging.info(f"Seeded {len(docs)} resources")


# ------------------------ Routes ------------------------
@api_router.get("/")
async def root():
    return {"message": "POLARIS Master Dashboard API", "status": "ok"}


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
        {"id": resource_id},
        {"$set": updates},
        return_document=True,
        projection={"_id": 0},
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
        "total_resources": total,
        "starred": starred,
        "categories": len(cats),
        "activity_count": activity_count,
        "by_category": [{"name": c["_id"], "count": c["count"]} for c in cats],
        "by_kind": [{"name": k["_id"], "count": k["count"]} for k in kinds],
    }


@api_router.post("/activity", response_model=ActivityLog)
async def log_activity(payload: ActivityCreate):
    resource = await db.resources.find_one({"id": payload.resource_id}, {"_id": 0})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    log = ActivityLog(
        resource_id=payload.resource_id,
        resource_title=resource["title"],
        action=payload.action,
    )
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


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    await seed_resources_if_empty()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
