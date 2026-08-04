"""
HRMS & Payroll module — Phase 1.
Adds a full APIRouter that server.py can include without disturbing the
existing dashboard / expenses code.
"""
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime, timezone, date, timedelta
import uuid
import io
import re
import calendar
from openpyxl import Workbook

hrms_router = APIRouter(prefix="/api/hrms", tags=["hrms"])

# ============================================================
# CONSTANTS & DEFAULT SETTINGS
# ============================================================
DEPARTMENTS = ["Engineering", "Operations", "HR", "Finance", "Sales", "Admin", "Support"]
DESIGNATIONS = ["Executive", "Sr. Executive", "Manager", "Sr. Manager", "AGM", "GM", "Director", "Intern"]
EMPLOYMENT_TYPES = ["Full-Time", "Part-Time", "Contract", "Intern", "Consultant"]
GENDERS = ["Male", "Female", "Other"]
BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]
LEAVE_TYPES = ["Casual", "Sick", "Paid", "Earned", "Maternity", "LWP"]
LEAVE_STATUSES = ["Pending", "Approved", "Rejected", "Cancelled"]
ATT_STATUSES = ["Present", "Absent", "Half Day", "Weekly Off", "Holiday", "Leave"]
SHIFTS = ["Morning", "Evening", "Night", "General", "Custom"]

DEFAULT_SETTINGS = {
    "company_name": "Prathvi Power Solutions",
    "company_address": "",
    "company_logo": None,
    "financial_year": "2025-26",
    "working_days_per_month": 26,
    "office_start": "09:00",
    "office_end": "18:00",
    "late_threshold_minutes": 15,
    "shift_hours": 9,
    "pf_employee_pct": 12.0,
    "pf_employer_pct": 12.0,
    "pf_wage_cap": 15000.0,
    "esic_employee_pct": 0.75,
    "esic_employer_pct": 3.25,
    "esic_wage_ceiling": 21000.0,
    "professional_tax": 200.0,
    "holidays": [],  # list of ISO dates
    "weekly_offs": [6],  # 0=Mon .. 6=Sun
}


# ============================================================
# MODELS
# ============================================================
def _uuid(): return str(uuid.uuid4())
def _now_iso(): return datetime.now(timezone.utc).isoformat()


class Employee(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    emp_code: str
    name: str
    father_name: Optional[str] = ""
    mobile: Optional[str] = ""
    email: Optional[str] = ""
    aadhaar: Optional[str] = ""
    pan: Optional[str] = ""
    dob: Optional[str] = None
    gender: Optional[str] = ""
    blood_group: Optional[str] = ""
    address: Optional[str] = ""
    emergency_contact: Optional[str] = ""
    department: Optional[str] = ""
    designation: Optional[str] = ""
    branch: Optional[str] = ""
    reporting_manager: Optional[str] = ""
    joining_date: Optional[str] = None
    employment_type: Optional[str] = "Full-Time"
    # Salary structure — monthly base breakup
    basic: float = 0.0
    hra: float = 0.0
    da: float = 0.0
    conveyance: float = 0.0
    special_allowance: float = 0.0
    # Bank
    bank_name: Optional[str] = ""
    account_number: Optional[str] = ""
    ifsc: Optional[str] = ""
    # Statutory
    uan: Optional[str] = ""
    esic_number: Optional[str] = ""
    # Photo & documents (stored as base64 data URLs, small only)
    photo: Optional[str] = None
    documents: List[Dict[str, Any]] = []  # [{type, name, data, uploaded_at}]
    status: Literal["Active", "Inactive"] = "Active"
    created_at: str = Field(default_factory=_now_iso)
    updated_at: str = Field(default_factory=_now_iso)


class EmployeeCreate(BaseModel):
    name: str
    father_name: Optional[str] = ""
    mobile: Optional[str] = ""
    email: Optional[str] = ""
    aadhaar: Optional[str] = ""
    pan: Optional[str] = ""
    dob: Optional[str] = None
    gender: Optional[str] = ""
    blood_group: Optional[str] = ""
    address: Optional[str] = ""
    emergency_contact: Optional[str] = ""
    department: Optional[str] = ""
    designation: Optional[str] = ""
    branch: Optional[str] = ""
    reporting_manager: Optional[str] = ""
    joining_date: Optional[str] = None
    employment_type: Optional[str] = "Full-Time"
    basic: float = 0.0
    hra: float = 0.0
    da: float = 0.0
    conveyance: float = 0.0
    special_allowance: float = 0.0
    bank_name: Optional[str] = ""
    account_number: Optional[str] = ""
    ifsc: Optional[str] = ""
    uan: Optional[str] = ""
    esic_number: Optional[str] = ""
    photo: Optional[str] = None
    status: Literal["Active", "Inactive"] = "Active"

    @field_validator("name")
    @classmethod
    def name_req(cls, v):
        v = (v or "").strip()
        if len(v) < 2:
            raise ValueError("Name is required (min 2 chars)")
        return v[:120]


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    father_name: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    aadhaar: Optional[str] = None
    pan: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    branch: Optional[str] = None
    reporting_manager: Optional[str] = None
    joining_date: Optional[str] = None
    employment_type: Optional[str] = None
    basic: Optional[float] = None
    hra: Optional[float] = None
    da: Optional[float] = None
    conveyance: Optional[float] = None
    special_allowance: Optional[float] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc: Optional[str] = None
    uan: Optional[str] = None
    esic_number: Optional[str] = None
    photo: Optional[str] = None
    status: Optional[str] = None


class Attendance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    employee_id: str
    date: str  # ISO
    check_in: Optional[str] = None   # HH:MM
    check_out: Optional[str] = None  # HH:MM
    working_hours: float = 0.0
    overtime: float = 0.0
    late_minutes: int = 0
    status: str = "Present"  # ATT_STATUSES
    remarks: Optional[str] = ""
    created_at: str = Field(default_factory=_now_iso)


class AttendanceCreate(BaseModel):
    employee_id: str
    date: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    status: Optional[str] = "Present"
    remarks: Optional[str] = ""


class AttendanceBulk(BaseModel):
    entries: List[AttendanceCreate]


class Leave(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    employee_id: str
    type: str
    from_date: str
    to_date: str
    days: float
    reason: str = ""
    status: str = "Pending"  # LEAVE_STATUSES
    approved_by: Optional[str] = None
    decision_at: Optional[str] = None
    created_at: str = Field(default_factory=_now_iso)


class LeaveCreate(BaseModel):
    employee_id: str
    type: str
    from_date: str
    to_date: str
    reason: str = ""

    @field_validator("type")
    @classmethod
    def type_valid(cls, v):
        if v not in LEAVE_TYPES:
            raise ValueError(f"type must be one of {LEAVE_TYPES}")
        return v


class LeaveDecision(BaseModel):
    status: Literal["Approved", "Rejected", "Cancelled"]
    approver: Optional[str] = "HR"


class PayrollRun(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    employee_id: str
    month: str   # YYYY-MM
    days_present: float
    days_leave: float
    days_absent: float
    days_holiday: float
    working_days: int
    # Earnings
    basic: float
    hra: float
    da: float
    conveyance: float
    special_allowance: float
    bonus: float = 0.0
    incentive: float = 0.0
    overtime: float = 0.0
    arrears: float = 0.0
    reimbursements: float = 0.0
    gross_earnings: float
    # Deductions
    pf_employee: float
    pf_employer: float
    esic_employee: float
    esic_employer: float
    professional_tax: float
    tds: float = 0.0
    advance: float = 0.0
    loan_emi: float = 0.0
    other_deductions: float = 0.0
    total_deductions: float
    net_salary: float
    generated_at: str = Field(default_factory=_now_iso)


class PayrollGenerate(BaseModel):
    month: str
    employee_ids: Optional[List[str]] = None  # None = all active
    bonus: Dict[str, float] = {}  # emp_id -> bonus
    incentive: Dict[str, float] = {}
    tds: Dict[str, float] = {}
    advance: Dict[str, float] = {}
    loan_emi: Dict[str, float] = {}
    reimbursements: Dict[str, float] = {}
    arrears: Dict[str, float] = {}


# ============================================================
# HELPERS
# ============================================================
_db_ref = {"db": None}

def _db():
    return _db_ref["db"]


async def _next_emp_code() -> str:
    """Auto-increment EMP-0001 style."""
    last = await _db().hrms_employees.find_one(
        {}, {"_id": 0, "emp_code": 1}, sort=[("emp_code", -1)]
    )
    n = 1
    if last and last.get("emp_code"):
        m = re.match(r"EMP-(\d+)", last["emp_code"])
        if m:
            n = int(m.group(1)) + 1
    return f"EMP-{n:04d}"


async def _get_settings() -> Dict[str, Any]:
    s = await _db().hrms_settings.find_one({"_id": "default"}, {"_id": 0})
    return {**DEFAULT_SETTINGS, **(s or {})}


def _parse_hm(s: Optional[str]) -> Optional[int]:
    """HH:MM -> minutes since midnight."""
    if not s: return None
    try:
        h, m = map(int, s.split(":"))
        return h * 60 + m
    except Exception:
        return None


def _compute_attendance_derived(check_in: Optional[str], check_out: Optional[str], settings: Dict[str, Any]):
    """Return (working_hours, overtime, late_minutes)."""
    ci = _parse_hm(check_in)
    co = _parse_hm(check_out)
    if ci is None or co is None or co <= ci:
        return 0.0, 0.0, 0
    mins = co - ci
    working = round(mins / 60.0, 2)
    shift_hours = float(settings.get("shift_hours", 9))
    ot = max(0.0, round(working - shift_hours, 2))
    late = 0
    office_start = _parse_hm(settings.get("office_start", "09:00")) or 540
    threshold = int(settings.get("late_threshold_minutes", 15))
    if ci > office_start + threshold:
        late = ci - office_start
    return working, ot, late


def _days_between(a: str, b: str) -> List[str]:
    d1 = datetime.strptime(a, "%Y-%m-%d").date()
    d2 = datetime.strptime(b, "%Y-%m-%d").date()
    if d2 < d1:
        d1, d2 = d2, d1
    out = []
    cur = d1
    while cur <= d2:
        out.append(cur.isoformat())
        cur += timedelta(days=1)
    return out


def _month_range(month: str):
    """month = YYYY-MM -> (start_iso, end_iso, days_in_month)"""
    y, m = map(int, month.split("-"))
    _, last = calendar.monthrange(y, m)
    start = date(y, m, 1)
    end = date(y, m, last)
    return start.isoformat(), end.isoformat(), last


async def _emp_or_404(emp_id: str) -> Dict[str, Any]:
    doc = await _db().hrms_employees.find_one({"id": emp_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Employee not found")
    return doc


# ============================================================
# SETTINGS
# ============================================================
@hrms_router.get("/settings")
async def get_settings():
    return await _get_settings()


@hrms_router.post("/settings")
async def save_settings(payload: Dict[str, Any]):
    await _db().hrms_settings.update_one(
        {"_id": "default"},
        {"$set": {**payload, "updated_at": _now_iso()}},
        upsert=True,
    )
    return await _get_settings()


@hrms_router.get("/lookups")
async def lookups():
    return {
        "departments": DEPARTMENTS,
        "designations": DESIGNATIONS,
        "employment_types": EMPLOYMENT_TYPES,
        "genders": GENDERS,
        "blood_groups": BLOOD_GROUPS,
        "leave_types": LEAVE_TYPES,
        "leave_statuses": LEAVE_STATUSES,
        "attendance_statuses": ATT_STATUSES,
        "shifts": SHIFTS,
    }


# ============================================================
# EMPLOYEE CRUD
# ============================================================
@hrms_router.get("/employees")
async def list_employees(
    q: Optional[str] = None,
    department: Optional[str] = None,
    designation: Optional[str] = None,
    branch: Optional[str] = None,
    status: Optional[str] = None,
    joined_from: Optional[str] = None,
    joined_to: Optional[str] = None,
    salary_min: Optional[float] = None,
    salary_max: Optional[float] = None,
    limit: int = Query(2000, le=10000),
    skip: int = 0,
):
    query: Dict[str, Any] = {}
    if department and department != "All": query["department"] = department
    if designation and designation != "All": query["designation"] = designation
    if branch and branch != "All": query["branch"] = branch
    if status and status != "All": query["status"] = status
    if joined_from or joined_to:
        dq: Dict[str, Any] = {}
        if joined_from: dq["$gte"] = joined_from
        if joined_to: dq["$lte"] = joined_to
        query["joining_date"] = dq
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"emp_code": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"mobile": {"$regex": q, "$options": "i"}},
            {"pan": {"$regex": q, "$options": "i"}},
            {"uan": {"$regex": q, "$options": "i"}},
        ]

    docs = await _db().hrms_employees.find(query, {"_id": 0}).sort("emp_code", 1).skip(skip).limit(limit).to_list(limit)

    # Optional filter by salary total (post-load)
    if salary_min is not None or salary_max is not None:
        def total(d):
            return (d.get("basic", 0) or 0) + (d.get("hra", 0) or 0) + (d.get("da", 0) or 0) + \
                   (d.get("conveyance", 0) or 0) + (d.get("special_allowance", 0) or 0)
        docs = [d for d in docs if
                (salary_min is None or total(d) >= salary_min) and
                (salary_max is None or total(d) <= salary_max)]

    total_count = await _db().hrms_employees.count_documents(query)
    return {"total": total_count, "items": docs}


@hrms_router.post("/employees")
async def create_employee(payload: EmployeeCreate):
    emp_code = await _next_emp_code()
    emp = Employee(emp_code=emp_code, **payload.model_dump())
    doc = emp.model_dump()
    await _db().hrms_employees.insert_one(doc)
    doc.pop("_id", None)
    return doc


@hrms_router.get("/employees/{emp_id}")
async def get_employee(emp_id: str):
    return await _emp_or_404(emp_id)


@hrms_router.patch("/employees/{emp_id}")
async def update_employee(emp_id: str, patch: EmployeeUpdate):
    updates = {k: v for k, v in patch.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    updates["updated_at"] = _now_iso()
    result = await _db().hrms_employees.find_one_and_update(
        {"id": emp_id}, {"$set": updates},
        return_document=True, projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Employee not found")
    return result


@hrms_router.delete("/employees/{emp_id}")
async def delete_employee(emp_id: str):
    r = await _db().hrms_employees.delete_one({"id": emp_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    # cascade cleanup: attendance, leaves, payroll
    await _db().hrms_attendance.delete_many({"employee_id": emp_id})
    await _db().hrms_leaves.delete_many({"employee_id": emp_id})
    await _db().hrms_payroll.delete_many({"employee_id": emp_id})
    return {"deleted": True}


class DocumentUpload(BaseModel):
    type: str
    name: str
    data: str  # base64 data URL


@hrms_router.post("/employees/{emp_id}/documents")
async def add_document(emp_id: str, payload: DocumentUpload):
    emp = await _emp_or_404(emp_id)
    docs = emp.get("documents", []) or []
    docs.append({
        "id": _uuid(), "type": payload.type[:60], "name": payload.name[:200],
        "data": payload.data, "uploaded_at": _now_iso(),
    })
    await _db().hrms_employees.update_one({"id": emp_id}, {"$set": {"documents": docs, "updated_at": _now_iso()}})
    return {"ok": True, "count": len(docs)}


@hrms_router.delete("/employees/{emp_id}/documents/{doc_id}")
async def delete_document(emp_id: str, doc_id: str):
    emp = await _emp_or_404(emp_id)
    docs = [d for d in (emp.get("documents") or []) if d.get("id") != doc_id]
    await _db().hrms_employees.update_one({"id": emp_id}, {"$set": {"documents": docs}})
    return {"ok": True, "count": len(docs)}


# ============================================================
# ATTENDANCE
# ============================================================
@hrms_router.get("/attendance")
async def list_attendance(
    employee_id: Optional[str] = None,
    department: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(2000, le=10000),
):
    query: Dict[str, Any] = {}
    if employee_id: query["employee_id"] = employee_id
    if status and status != "All": query["status"] = status
    if start or end:
        dq: Dict[str, Any] = {}
        if start: dq["$gte"] = start
        if end: dq["$lte"] = end
        query["date"] = dq
    if department and department != "All":
        emp_ids = await _db().hrms_employees.distinct("id", {"department": department})
        query["employee_id"] = {"$in": emp_ids}
    docs = await _db().hrms_attendance.find(query, {"_id": 0}).sort("date", -1).limit(limit).to_list(limit)
    return {"total": len(docs), "items": docs}


@hrms_router.post("/attendance")
async def upsert_attendance(payload: AttendanceCreate):
    await _emp_or_404(payload.employee_id)
    settings = await _get_settings()
    working, ot, late = _compute_attendance_derived(payload.check_in, payload.check_out, settings)
    doc = {
        "id": _uuid(),
        "employee_id": payload.employee_id,
        "date": payload.date,
        "check_in": payload.check_in,
        "check_out": payload.check_out,
        "working_hours": working,
        "overtime": ot,
        "late_minutes": late,
        "status": payload.status or "Present",
        "remarks": (payload.remarks or "")[:400],
        "created_at": _now_iso(),
    }
    # Upsert on (employee_id, date)
    existing = await _db().hrms_attendance.find_one({"employee_id": payload.employee_id, "date": payload.date}, {"_id": 0, "id": 1})
    if existing:
        doc["id"] = existing["id"]
        await _db().hrms_attendance.update_one(
            {"employee_id": payload.employee_id, "date": payload.date},
            {"$set": doc}, upsert=True,
        )
    else:
        await _db().hrms_attendance.insert_one(doc)
    doc.pop("_id", None)
    return doc


@hrms_router.post("/attendance/bulk")
async def bulk_attendance(payload: AttendanceBulk):
    settings = await _get_settings()
    inserted = updated = 0
    for entry in payload.entries:
        exists = await _db().hrms_employees.find_one({"id": entry.employee_id}, {"_id": 0, "id": 1})
        if not exists: continue
        working, ot, late = _compute_attendance_derived(entry.check_in, entry.check_out, settings)
        doc = {
            "id": _uuid(),
            "employee_id": entry.employee_id, "date": entry.date,
            "check_in": entry.check_in, "check_out": entry.check_out,
            "working_hours": working, "overtime": ot, "late_minutes": late,
            "status": entry.status or "Present", "remarks": entry.remarks or "",
            "created_at": _now_iso(),
        }
        prev = await _db().hrms_attendance.find_one({"employee_id": entry.employee_id, "date": entry.date}, {"_id": 0, "id": 1})
        if prev:
            doc["id"] = prev["id"]
            await _db().hrms_attendance.update_one(
                {"employee_id": entry.employee_id, "date": entry.date},
                {"$set": doc}, upsert=True,
            )
            updated += 1
        else:
            await _db().hrms_attendance.insert_one(doc)
            inserted += 1
    return {"inserted": inserted, "updated": updated}


@hrms_router.delete("/attendance/{att_id}")
async def delete_attendance(att_id: str):
    r = await _db().hrms_attendance.delete_one({"id": att_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Attendance not found")
    return {"deleted": True}


@hrms_router.get("/attendance/register/{month}")
async def monthly_register(month: str):
    start, end, days = _month_range(month)
    docs = await _db().hrms_attendance.find({"date": {"$gte": start, "$lte": end}}, {"_id": 0}).to_list(50000)
    emps = await _db().hrms_employees.find({"status": "Active"}, {"_id": 0}).to_list(5000)
    # Structure: {emp_code, name, dept, dayMap: {"YYYY-MM-DD": {status, working_hours, late}}}
    by_emp: Dict[str, Dict[str, Any]] = {}
    for e in emps:
        by_emp[e["id"]] = {"emp_code": e["emp_code"], "name": e["name"], "department": e.get("department", ""), "days": {}}
    for a in docs:
        if a["employee_id"] in by_emp:
            by_emp[a["employee_id"]]["days"][a["date"]] = {
                "status": a["status"], "working_hours": a["working_hours"],
                "overtime": a["overtime"], "late_minutes": a["late_minutes"],
                "check_in": a.get("check_in"), "check_out": a.get("check_out"),
            }
    return {"month": month, "days_in_month": days, "employees": list(by_emp.values())}


# ============================================================
# LEAVE
# ============================================================
@hrms_router.get("/leaves")
async def list_leaves(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    type: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    limit: int = Query(500, le=5000),
):
    query: Dict[str, Any] = {}
    if employee_id: query["employee_id"] = employee_id
    if status and status != "All": query["status"] = status
    if type and type != "All": query["type"] = type
    if start or end:
        dq: Dict[str, Any] = {}
        if start: dq["$gte"] = start
        if end: dq["$lte"] = end
        query["from_date"] = dq
    docs = await _db().hrms_leaves.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"total": len(docs), "items": docs}


@hrms_router.post("/leaves")
async def apply_leave(payload: LeaveCreate):
    await _emp_or_404(payload.employee_id)
    days_list = _days_between(payload.from_date, payload.to_date)
    days = float(len(days_list))
    leave = Leave(
        employee_id=payload.employee_id, type=payload.type,
        from_date=payload.from_date, to_date=payload.to_date,
        days=days, reason=(payload.reason or "")[:500],
    )
    doc = leave.model_dump()
    await _db().hrms_leaves.insert_one(doc)
    doc.pop("_id", None)
    return doc


@hrms_router.patch("/leaves/{leave_id}")
async def decide_leave(leave_id: str, decision: LeaveDecision):
    updates = {"status": decision.status, "approved_by": decision.approver, "decision_at": _now_iso()}
    result = await _db().hrms_leaves.find_one_and_update(
        {"id": leave_id}, {"$set": updates},
        return_document=True, projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Leave not found")

    # If approved, mark attendance as 'Leave' for those dates
    if decision.status == "Approved":
        settings = await _get_settings()
        for d in _days_between(result["from_date"], result["to_date"]):
            att = {
                "id": _uuid(),
                "employee_id": result["employee_id"], "date": d,
                "check_in": None, "check_out": None,
                "working_hours": 0.0, "overtime": 0.0, "late_minutes": 0,
                "status": "Leave", "remarks": f"{result['type']} leave",
                "created_at": _now_iso(),
            }
            prev = await _db().hrms_attendance.find_one({"employee_id": result["employee_id"], "date": d}, {"_id": 0, "id": 1})
            if prev:
                att["id"] = prev["id"]
                await _db().hrms_attendance.update_one(
                    {"employee_id": result["employee_id"], "date": d},
                    {"$set": att}, upsert=True,
                )
            else:
                await _db().hrms_attendance.insert_one(att)
    return result


@hrms_router.get("/leaves/balance/{emp_id}")
async def leave_balance(emp_id: str, year: Optional[int] = None):
    await _emp_or_404(emp_id)
    year = year or datetime.now().year
    start = f"{year}-01-01"; end = f"{year}-12-31"
    used = {t: 0 for t in LEAVE_TYPES}
    docs = await _db().hrms_leaves.find({
        "employee_id": emp_id, "status": "Approved",
        "from_date": {"$gte": start, "$lte": end},
    }, {"_id": 0}).to_list(500)
    for d in docs:
        used[d["type"]] = used.get(d["type"], 0) + d["days"]
    # Standard annual quotas (customizable later via settings)
    quota = {"Casual": 12, "Sick": 12, "Paid": 12, "Earned": 15, "Maternity": 180, "LWP": 999}
    balance = {t: max(0, quota[t] - used[t]) for t in LEAVE_TYPES}
    return {"employee_id": emp_id, "year": year, "quota": quota, "used": used, "balance": balance}


# ============================================================
# PAYROLL
# ============================================================
def _round(x: float, n: int = 2) -> float:
    try: return round(float(x), n)
    except Exception: return 0.0


async def _compute_payroll_for_employee(emp: Dict[str, Any], month: str,
                                        extras: Dict[str, Dict[str, float]],
                                        settings: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate one payslip for one employee."""
    start, end, days_in_month = _month_range(month)
    # attendance summary
    atts = await _db().hrms_attendance.find(
        {"employee_id": emp["id"], "date": {"$gte": start, "$lte": end}}, {"_id": 0},
    ).to_list(50)
    counts = {s: 0 for s in ATT_STATUSES}
    total_overtime = 0.0
    for a in atts:
        counts[a["status"]] = counts.get(a["status"], 0) + 1
        total_overtime += float(a.get("overtime", 0) or 0)

    days_present = counts.get("Present", 0) + 0.5 * counts.get("Half Day", 0)
    days_leave = counts.get("Leave", 0)
    days_absent = counts.get("Absent", 0)
    days_holiday = counts.get("Holiday", 0) + counts.get("Weekly Off", 0)

    working_days = int(settings.get("working_days_per_month") or 26)
    paid_days = days_present + days_leave + days_holiday
    ratio = min(1.0, paid_days / working_days) if working_days else 1.0

    basic = _round(emp.get("basic", 0) * ratio)
    hra = _round(emp.get("hra", 0) * ratio)
    da = _round(emp.get("da", 0) * ratio)
    conveyance = _round(emp.get("conveyance", 0) * ratio)
    special = _round(emp.get("special_allowance", 0) * ratio)

    def _extra(name):
        return _round(extras.get(name, {}).get(emp["id"], 0))
    bonus = _extra("bonus")
    incentive = _extra("incentive")
    arrears = _extra("arrears")
    reimbursements = _extra("reimbursements")
    # Overtime = 1.5x per-hour pro-rata of basic+da
    per_hour = ((emp.get("basic", 0) + emp.get("da", 0)) / (working_days * float(settings.get("shift_hours", 9)) or 1))
    overtime = _round(total_overtime * per_hour * 1.5)

    gross = _round(basic + hra + da + conveyance + special + bonus + incentive + overtime + arrears + reimbursements)

    # PF on capped (basic + da), employee & employer
    pf_wage_base = min(basic + da, float(settings.get("pf_wage_cap", 15000)))
    pf_employee = _round(pf_wage_base * float(settings.get("pf_employee_pct", 12)) / 100)
    pf_employer = _round(pf_wage_base * float(settings.get("pf_employer_pct", 12)) / 100)

    # ESIC on gross if gross <= ceiling
    esic_wage_ceiling = float(settings.get("esic_wage_ceiling", 21000))
    if gross <= esic_wage_ceiling:
        esic_employee = _round(gross * float(settings.get("esic_employee_pct", 0.75)) / 100)
        esic_employer = _round(gross * float(settings.get("esic_employer_pct", 3.25)) / 100)
    else:
        esic_employee = esic_employer = 0.0

    pt = _round(settings.get("professional_tax", 200))
    tds = _extra("tds")
    advance = _extra("advance")
    loan_emi = _extra("loan_emi")
    other = _extra("other_deductions")
    total_ded = _round(pf_employee + esic_employee + pt + tds + advance + loan_emi + other)

    net = _round(gross - total_ded)

    payslip = PayrollRun(
        employee_id=emp["id"], month=month,
        days_present=days_present, days_leave=days_leave,
        days_absent=days_absent, days_holiday=days_holiday,
        working_days=working_days,
        basic=basic, hra=hra, da=da, conveyance=conveyance, special_allowance=special,
        bonus=bonus, incentive=incentive, overtime=overtime,
        arrears=arrears, reimbursements=reimbursements,
        gross_earnings=gross,
        pf_employee=pf_employee, pf_employer=pf_employer,
        esic_employee=esic_employee, esic_employer=esic_employer,
        professional_tax=pt, tds=tds, advance=advance,
        loan_emi=loan_emi, other_deductions=other,
        total_deductions=total_ded, net_salary=net,
    ).model_dump()
    return payslip


@hrms_router.post("/payroll/generate")
async def generate_payroll(payload: PayrollGenerate):
    settings = await _get_settings()
    query = {"status": "Active"}
    if payload.employee_ids:
        query["id"] = {"$in": payload.employee_ids}
    emps = await _db().hrms_employees.find(query, {"_id": 0}).to_list(5000)

    extras = {
        "bonus": payload.bonus, "incentive": payload.incentive,
        "tds": payload.tds, "advance": payload.advance,
        "loan_emi": payload.loan_emi, "reimbursements": payload.reimbursements,
        "arrears": payload.arrears,
    }
    generated = 0
    for emp in emps:
        slip = await _compute_payroll_for_employee(emp, payload.month, extras, settings)
        # replace existing month+emp
        await _db().hrms_payroll.update_one(
            {"employee_id": emp["id"], "month": payload.month},
            {"$set": slip}, upsert=True,
        )
        generated += 1
    return {"month": payload.month, "generated": generated}


@hrms_router.get("/payroll")
async def list_payroll(month: Optional[str] = None, employee_id: Optional[str] = None, limit: int = 2000):
    query: Dict[str, Any] = {}
    if month: query["month"] = month
    if employee_id: query["employee_id"] = employee_id
    docs = await _db().hrms_payroll.find(query, {"_id": 0}).sort("month", -1).limit(limit).to_list(limit)
    return {"total": len(docs), "items": docs}


@hrms_router.delete("/payroll/{month}")
async def delete_month_payroll(month: str):
    r = await _db().hrms_payroll.delete_many({"month": month})
    return {"deleted": r.deleted_count}


@hrms_router.get("/payroll/summary/{month}")
async def payroll_summary(month: str):
    docs = await _db().hrms_payroll.find({"month": month}, {"_id": 0}).to_list(5000)
    total_gross = sum(d["gross_earnings"] for d in docs)
    total_net = sum(d["net_salary"] for d in docs)
    total_pf_e = sum(d["pf_employee"] for d in docs)
    total_pf_r = sum(d["pf_employer"] for d in docs)
    total_esic_e = sum(d["esic_employee"] for d in docs)
    total_esic_r = sum(d["esic_employer"] for d in docs)
    return {
        "month": month, "employees": len(docs),
        "gross": _round(total_gross), "net": _round(total_net),
        "pf_employee": _round(total_pf_e), "pf_employer": _round(total_pf_r),
        "pf_total": _round(total_pf_e + total_pf_r),
        "esic_employee": _round(total_esic_e), "esic_employer": _round(total_esic_r),
        "esic_total": _round(total_esic_e + total_esic_r),
    }


# ============================================================
# DASHBOARD
# ============================================================
@hrms_router.get("/dashboard")
async def hrms_dashboard():
    today = date.today().isoformat()
    total_emp = await _db().hrms_employees.count_documents({"status": "Active"})
    all_emp = await _db().hrms_employees.count_documents({})

    # Today's attendance
    todays = await _db().hrms_attendance.find({"date": today}, {"_id": 0}).to_list(5000)
    present = sum(1 for a in todays if a["status"] == "Present")
    half = sum(1 for a in todays if a["status"] == "Half Day")
    absent = sum(1 for a in todays if a["status"] == "Absent")
    on_leave = sum(1 for a in todays if a["status"] == "Leave")
    late = sum(1 for a in todays if (a.get("late_minutes") or 0) > 0)

    # Pending leaves
    pending_leaves = await _db().hrms_leaves.count_documents({"status": "Pending"})

    # Payroll this month
    month = today[:7]
    payroll_docs = await _db().hrms_payroll.find({"month": month}, {"_id": 0}).to_list(5000)
    monthly_payroll = sum(d["net_salary"] for d in payroll_docs)
    pf_total = sum(d["pf_employee"] + d["pf_employer"] for d in payroll_docs)
    esic_total = sum(d["esic_employee"] + d["esic_employer"] for d in payroll_docs)
    todays_salary_cost = _round(monthly_payroll / 30 if monthly_payroll else 0)

    # Upcoming birthdays & anniversaries (next 30 days)
    emps = await _db().hrms_employees.find({"status": "Active"}, {"_id": 0}).to_list(5000)
    today_d = date.today()
    upcoming_birthdays = []
    upcoming_anniversaries = []
    for e in emps:
        if e.get("dob"):
            try:
                d = datetime.strptime(e["dob"], "%Y-%m-%d").date()
                nxt = d.replace(year=today_d.year)
                if nxt < today_d:
                    nxt = d.replace(year=today_d.year + 1)
                diff = (nxt - today_d).days
                if 0 <= diff <= 30:
                    upcoming_birthdays.append({"id": e["id"], "name": e["name"], "date": nxt.isoformat(), "in_days": diff})
            except Exception: pass
        if e.get("joining_date"):
            try:
                d = datetime.strptime(e["joining_date"], "%Y-%m-%d").date()
                nxt = d.replace(year=today_d.year)
                if nxt < today_d:
                    nxt = d.replace(year=today_d.year + 1)
                diff = (nxt - today_d).days
                years = today_d.year - d.year - (1 if (today_d.month, today_d.day) < (d.month, d.day) else 0)
                if 0 <= diff <= 30 and years > 0:
                    upcoming_anniversaries.append({"id": e["id"], "name": e["name"], "date": nxt.isoformat(), "years": years, "in_days": diff})
            except Exception: pass
    upcoming_birthdays.sort(key=lambda x: x["in_days"])
    upcoming_anniversaries.sort(key=lambda x: x["in_days"])

    # Department distribution
    dept_pipeline = [
        {"$match": {"status": "Active"}},
        {"$group": {"_id": {"$ifNull": ["$department", "Unassigned"]}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    dept_agg = await _db().hrms_employees.aggregate(dept_pipeline).to_list(50)

    # Attendance trend last 14 days
    start14 = (date.today() - timedelta(days=13)).isoformat()
    trend_docs = await _db().hrms_attendance.find({"date": {"$gte": start14}}, {"_id": 0}).to_list(50000)
    trend_map: Dict[str, Dict[str, int]] = {}
    for a in trend_docs:
        d = a["date"]
        trend_map.setdefault(d, {"present": 0, "absent": 0, "leave": 0})
        s = a["status"]
        if s == "Present": trend_map[d]["present"] += 1
        elif s == "Absent": trend_map[d]["absent"] += 1
        elif s == "Leave": trend_map[d]["leave"] += 1
    trend = []
    for i in range(14):
        d = (date.today() - timedelta(days=13 - i)).isoformat()
        m = trend_map.get(d, {"present": 0, "absent": 0, "leave": 0})
        trend.append({"date": d, **m})

    # Payroll trend last 6 months
    pay_trend = []
    for i in range(6):
        y = today_d.year
        mo = today_d.month - i
        while mo <= 0: mo += 12; y -= 1
        mkey = f"{y:04d}-{mo:02d}"
        docs = await _db().hrms_payroll.find({"month": mkey}, {"_id": 0}).to_list(5000)
        pay_trend.append({"month": mkey, "net": _round(sum(d["net_salary"] for d in docs))})
    pay_trend.reverse()

    # Leave statistics (this year)
    year_start = f"{today_d.year}-01-01"
    leave_pipe = [
        {"$match": {"from_date": {"$gte": year_start}, "status": "Approved"}},
        {"$group": {"_id": "$type", "days": {"$sum": "$days"}}},
    ]
    leave_agg = await _db().hrms_leaves.aggregate(leave_pipe).to_list(20)

    return {
        "cards": {
            "total_employees": total_emp,
            "total_employees_all": all_emp,
            "present_today": present + half,
            "absent_today": absent,
            "on_leave_today": on_leave,
            "late_today": late,
            "pending_leaves": pending_leaves,
            "todays_salary_cost": todays_salary_cost,
            "monthly_payroll": _round(monthly_payroll),
            "pf_total": _round(pf_total),
            "esic_total": _round(esic_total),
            "month": month,
        },
        "upcoming_birthdays": upcoming_birthdays[:8],
        "upcoming_anniversaries": upcoming_anniversaries[:8],
        "department_distribution": [{"name": d["_id"], "count": d["count"]} for d in dept_agg],
        "attendance_trend": trend,
        "payroll_trend": pay_trend,
        "leave_statistics": [{"type": l["_id"], "days": l["days"]} for l in leave_agg],
    }


# ============================================================
# EXPORTS
# ============================================================
def _xlsx(response_name: str, headers: List[str], rows: List[List[Any]]) -> StreamingResponse:
    wb = Workbook(); ws = wb.active
    ws.title = response_name[:30]
    ws.append(headers)
    for r in rows: ws.append(r)
    buf = io.BytesIO(); wb.save(buf); buf.seek(0)
    return StreamingResponse(
        buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{response_name}_{date.today().isoformat()}.xlsx"'},
    )


@hrms_router.get("/reports/employees/export")
async def export_employees():
    docs = await _db().hrms_employees.find({}, {"_id": 0}).sort("emp_code", 1).to_list(10000)
    headers = ["Emp Code", "Name", "Department", "Designation", "Branch", "Mobile", "Email",
               "Joining Date", "Basic", "HRA", "DA", "PAN", "UAN", "ESIC", "Status"]
    rows = [[d.get("emp_code"), d.get("name"), d.get("department"), d.get("designation"),
             d.get("branch"), d.get("mobile"), d.get("email"), d.get("joining_date"),
             d.get("basic"), d.get("hra"), d.get("da"), d.get("pan"), d.get("uan"),
             d.get("esic_number"), d.get("status")] for d in docs]
    return _xlsx("employees", headers, rows)


@hrms_router.get("/reports/attendance/export")
async def export_attendance(start: Optional[str] = None, end: Optional[str] = None):
    q: Dict[str, Any] = {}
    if start or end:
        dq = {}
        if start: dq["$gte"] = start
        if end: dq["$lte"] = end
        q["date"] = dq
    docs = await _db().hrms_attendance.find(q, {"_id": 0}).sort("date", 1).to_list(50000)
    emap = {e["id"]: e for e in await _db().hrms_employees.find({}, {"_id": 0}).to_list(10000)}
    headers = ["Date", "Emp Code", "Name", "Department", "Status", "Check In", "Check Out",
               "Working Hours", "Overtime", "Late Min"]
    rows = []
    for d in docs:
        e = emap.get(d["employee_id"], {})
        rows.append([d["date"], e.get("emp_code"), e.get("name"), e.get("department"),
                     d["status"], d.get("check_in"), d.get("check_out"),
                     d.get("working_hours"), d.get("overtime"), d.get("late_minutes")])
    return _xlsx("attendance", headers, rows)


@hrms_router.get("/reports/payroll/export")
async def export_payroll(month: str):
    docs = await _db().hrms_payroll.find({"month": month}, {"_id": 0}).to_list(5000)
    emap = {e["id"]: e for e in await _db().hrms_employees.find({}, {"_id": 0}).to_list(10000)}
    headers = ["Emp Code", "Name", "Dept", "Days Present", "Days Leave", "Days Absent",
               "Basic", "HRA", "DA", "Conveyance", "Special", "Bonus", "Incentive", "Overtime",
               "Arrears", "Reimb", "Gross",
               "PF (Emp)", "PF (Er)", "ESIC (Emp)", "ESIC (Er)", "PT", "TDS", "Advance",
               "Loan EMI", "Other", "Total Ded", "Net"]
    rows = []
    for d in docs:
        e = emap.get(d["employee_id"], {})
        rows.append([e.get("emp_code"), e.get("name"), e.get("department"),
                     d["days_present"], d["days_leave"], d["days_absent"],
                     d["basic"], d["hra"], d["da"], d["conveyance"], d["special_allowance"],
                     d["bonus"], d["incentive"], d["overtime"], d["arrears"], d["reimbursements"],
                     d["gross_earnings"], d["pf_employee"], d["pf_employer"],
                     d["esic_employee"], d["esic_employer"], d["professional_tax"], d["tds"],
                     d["advance"], d["loan_emi"], d["other_deductions"],
                     d["total_deductions"], d["net_salary"]])
    return _xlsx(f"payroll_{month}", headers, rows)


@hrms_router.get("/reports/pf/export")
async def export_pf(month: str):
    docs = await _db().hrms_payroll.find({"month": month}, {"_id": 0}).to_list(5000)
    emap = {e["id"]: e for e in await _db().hrms_employees.find({}, {"_id": 0}).to_list(10000)}
    headers = ["Emp Code", "Name", "UAN", "Gross", "Basic+DA", "PF Wage", "PF Employee", "PF Employer", "Total"]
    rows = []
    for d in docs:
        e = emap.get(d["employee_id"], {})
        pf_wage = min(d["basic"] + d["da"], 15000)
        rows.append([e.get("emp_code"), e.get("name"), e.get("uan"),
                     d["gross_earnings"], d["basic"] + d["da"], pf_wage,
                     d["pf_employee"], d["pf_employer"],
                     d["pf_employee"] + d["pf_employer"]])
    return _xlsx(f"pf_{month}", headers, rows)


@hrms_router.get("/reports/esic/export")
async def export_esic(month: str):
    docs = await _db().hrms_payroll.find({"month": month}, {"_id": 0}).to_list(5000)
    emap = {e["id"]: e for e in await _db().hrms_employees.find({}, {"_id": 0}).to_list(10000)}
    headers = ["Emp Code", "Name", "ESIC No", "Gross", "ESIC Employee", "ESIC Employer", "Total"]
    rows = []
    for d in docs:
        e = emap.get(d["employee_id"], {})
        rows.append([e.get("emp_code"), e.get("name"), e.get("esic_number"),
                     d["gross_earnings"], d["esic_employee"], d["esic_employer"],
                     d["esic_employee"] + d["esic_employer"]])
    return _xlsx(f"esic_{month}", headers, rows)


# ============================================================
# SEED HELPER (for demo / testing convenience)
# ============================================================
@hrms_router.post("/seed/demo")
async def seed_demo(n: int = 8):
    """Insert a small set of demo employees for exploring the module.
    Skips if any employees already exist."""
    count = await _db().hrms_employees.count_documents({})
    if count > 0:
        return {"skipped": True, "existing": count}
    demo = [
        ("Anita Sharma", "Engineering", "Sr. Manager", 32000, 15000, 3200),
        ("Ravi Kumar", "Operations", "Executive", 20000, 8000, 2000),
        ("Nisha Verma", "HR", "Manager", 28000, 12000, 2800),
        ("Amit Singh", "Finance", "Accountant", 25000, 10000, 2500),
        ("Priya Nair", "Sales", "Sr. Executive", 22000, 9000, 2200),
        ("Rahul Das", "Engineering", "Executive", 18000, 7000, 1800),
        ("Sunita Yadav", "Support", "Executive", 16000, 6500, 1600),
        ("Vikram Rao", "Admin", "Manager", 24000, 10000, 2400),
    ]
    for i, (nm, dept, desg, basic, hra, da) in enumerate(demo[:max(1, min(n, 20))], start=1):
        emp_code = f"EMP-{i:04d}"
        doc = Employee(
            emp_code=emp_code, name=nm, department=dept, designation=desg,
            joining_date=(date.today() - timedelta(days=180 * i)).isoformat(),
            dob=(date(1990, ((i % 12) + 1), min(28, (i * 3) % 28 + 1))).isoformat(),
            mobile=f"98{100000000 + i * 111}",
            email=f"{nm.lower().replace(' ', '.')}@prathvipower.co",
            basic=basic, hra=hra, da=da, conveyance=1600, special_allowance=1000,
            employment_type="Full-Time", branch="HO Lucknow",
            uan=f"10{i:010d}", esic_number=f"31{i:010d}",
            pan=f"ABCDE{1000+i}F", aadhaar=f"{4000 + i}-{5000 + i}-{6000 + i}",
        ).model_dump()
        await _db().hrms_employees.insert_one(doc)
    return {"inserted": min(n, len(demo)), "skipped": False}


# ============================================================
# INIT — called from server.py at startup
# ============================================================
def init_hrms(db):
    _db_ref["db"] = db
