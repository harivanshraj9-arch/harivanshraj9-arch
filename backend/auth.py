"""
Auth + Admin module — Phase 3
JWT-based email/password auth, role-based access control, admin panel APIs.

Roles: super_admin, admin, staff, viewer
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Literal, Dict, Any
from datetime import datetime, timezone, timedelta
import os
import uuid
import bcrypt
import jwt
import logging

log = logging.getLogger(__name__)

_db = None
JWT_ALGORITHM = "HS256"
ACCESS_TTL_MIN = 60 * 12  # 12 hours (a work day)
REFRESH_TTL_DAYS = 30
ROLES = ("super_admin", "admin", "staff", "viewer")
MAX_ATTEMPTS = 5
LOCKOUT_MIN = 15

# --- module state ---
def init_auth(db):
    global _db
    _db = db


auth_router = APIRouter(prefix="/api/auth", tags=["auth"])
admin_router = APIRouter(prefix="/api/admin", tags=["admin"])


# ================================================================
#                     CRYPTO / TOKENS
# ================================================================
def _hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def _make_access(user_id: str, email: str, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TTL_MIN)
    return jwt.encode({"sub": user_id, "email": email, "role": role,
                       "type": "access", "exp": exp},
                      _jwt_secret(), algorithm=JWT_ALGORITHM)


def _make_refresh(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=REFRESH_TTL_DAYS)
    return jwt.encode({"sub": user_id, "type": "refresh", "exp": exp},
                      _jwt_secret(), algorithm=JWT_ALGORITHM)


def _decode(token: str) -> Dict[str, Any]:
    return jwt.decode(token, _jwt_secret(), algorithms=[JWT_ALGORITHM])


# ================================================================
#                     MODELS
# ================================================================
class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    role: str
    status: str = "active"
    mobile: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    permissions: List[str] = []
    created_at: Optional[str] = None
    last_login: Optional[str] = None


class LoginPayload(BaseModel):
    email: EmailStr
    password: str


class UserCreatePayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=120)
    role: Literal["super_admin", "admin", "staff", "viewer"] = "staff"
    mobile: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    permissions: Optional[List[str]] = None
    status: Literal["active", "inactive"] = "active"


class UserUpdatePayload(BaseModel):
    name: Optional[str] = None
    role: Optional[Literal["super_admin", "admin", "staff", "viewer"]] = None
    mobile: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    permissions: Optional[List[str]] = None
    status: Optional[Literal["active", "inactive"]] = None


class ChangePasswordPayload(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=128)


class ResetPasswordPayload(BaseModel):
    new_password: str = Field(min_length=6, max_length=128)


# ================================================================
#                     HELPERS
# ================================================================
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean_user(u: dict) -> dict:
    if not u:
        return u
    u = {k: v for k, v in u.items() if k != "_id" and k != "password_hash"}
    return u


async def _log_activity(user: Optional[dict], action: str, module: str,
                         detail: str = "", success: bool = True, ip: str = ""):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": (user or {}).get("id"),
        "user_email": (user or {}).get("email"),
        "action": action,
        "module": module,
        "detail": detail[:500],
        "success": success,
        "ip": ip[:60],
        "timestamp": _now_iso(),
    }
    try:
        await _db.audit_log.insert_one(doc)
    except Exception as e:
        log.warning(f"audit log insert failed: {e}")


async def _get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        hdr = request.headers.get("Authorization", "")
        if hdr.startswith("Bearer "):
            token = hdr[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = _decode(token)
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

    user = await _db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    if user.get("status") != "active":
        raise HTTPException(403, "Account inactive")
    return user


async def require_role(request: Request, allowed: List[str]) -> dict:
    user = await _get_current_user(request)
    if user["role"] not in allowed:
        raise HTTPException(403, f"Requires one of: {allowed}")
    return user


# FastAPI dependencies
async def dep_current(request: Request):
    return await _get_current_user(request)


async def dep_admin(request: Request):
    return await require_role(request, ["super_admin", "admin"])


async def dep_super(request: Request):
    return await require_role(request, ["super_admin"])


def _client_ip(request: Request) -> str:
    return (request.headers.get("x-forwarded-for") or request.client.host if request.client else "") or ""


async def _brute_check(email: str, ip: str):
    ident = f"{ip}:{email.lower()}"
    doc = await _db.login_attempts.find_one({"identifier": ident})
    if doc and doc.get("locked_until"):
        lu = doc["locked_until"]
        if datetime.fromisoformat(lu) > datetime.now(timezone.utc):
            raise HTTPException(429, "Too many failed attempts. Try again in 15 minutes.")


async def _brute_incr(email: str, ip: str):
    ident = f"{ip}:{email.lower()}"
    doc = await _db.login_attempts.find_one({"identifier": ident}) or {}
    fails = int(doc.get("fails", 0)) + 1
    update = {"identifier": ident, "fails": fails, "last_fail": _now_iso()}
    if fails >= MAX_ATTEMPTS:
        update["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MIN)).isoformat()
        update["fails"] = 0
    await _db.login_attempts.update_one({"identifier": ident}, {"$set": update}, upsert=True)


async def _brute_reset(email: str, ip: str):
    ident = f"{ip}:{email.lower()}"
    await _db.login_attempts.delete_one({"identifier": ident})


def _set_auth_cookies(resp: Response, access: str, refresh: str):
    # SameSite=none + secure required for cross-site (production https)
    resp.set_cookie("access_token", access, httponly=True, secure=True,
                    samesite="none", max_age=ACCESS_TTL_MIN * 60, path="/")
    resp.set_cookie("refresh_token", refresh, httponly=True, secure=True,
                    samesite="none", max_age=REFRESH_TTL_DAYS * 86400, path="/")


def _clear_auth_cookies(resp: Response):
    resp.delete_cookie("access_token", path="/")
    resp.delete_cookie("refresh_token", path="/")


# ================================================================
#                     AUTH ENDPOINTS
# ================================================================
@auth_router.post("/login")
async def login(payload: LoginPayload, request: Request, response: Response):
    email = payload.email.lower().strip()
    ip = _client_ip(request)
    await _brute_check(email, ip)

    user = await _db.users.find_one({"email": email})
    if not user or not _verify_password(payload.password, user.get("password_hash", "")):
        await _brute_incr(email, ip)
        await _log_activity({"email": email}, "login", "auth", "Invalid credentials", False, ip)
        raise HTTPException(401, "Invalid email or password")

    if user.get("status") != "active":
        raise HTTPException(403, "Account is inactive. Contact admin.")

    access = _make_access(user["id"], user["email"], user["role"])
    refresh = _make_refresh(user["id"])
    _set_auth_cookies(response, access, refresh)

    await _db.users.update_one({"id": user["id"]}, {"$set": {"last_login": _now_iso()}})
    await _brute_reset(email, ip)
    await _log_activity(user, "login", "auth", "", True, ip)

    return {"user": _clean_user(user), "access_token": access}


@auth_router.post("/logout")
async def logout(request: Request, response: Response, user: dict = Depends(dep_current)):
    _clear_auth_cookies(response)
    await _log_activity(user, "logout", "auth", "", True, _client_ip(request))
    return {"ok": True}


@auth_router.get("/me")
async def me(user: dict = Depends(dep_current)):
    return _clean_user(user)


@auth_router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    rt = request.cookies.get("refresh_token")
    if not rt:
        raise HTTPException(401, "No refresh token")
    try:
        payload = _decode(rt)
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid token type")
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Refresh expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid refresh")

    user = await _db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user or user.get("status") != "active":
        raise HTTPException(401, "User invalid")

    access = _make_access(user["id"], user["email"], user["role"])
    _set_auth_cookies(response, access, rt)
    return {"access_token": access}


@auth_router.post("/change-password")
async def change_password(payload: ChangePasswordPayload, request: Request,
                          user: dict = Depends(dep_current)):
    doc = await _db.users.find_one({"id": user["id"]})
    if not _verify_password(payload.current_password, doc.get("password_hash", "")):
        raise HTTPException(400, "Current password is incorrect")
    new_hash = _hash_password(payload.new_password)
    await _db.users.update_one({"id": user["id"]},
                                {"$set": {"password_hash": new_hash, "password_changed_at": _now_iso()}})
    await _log_activity(user, "password_change", "auth", "", True, _client_ip(request))
    return {"ok": True}


# ================================================================
#                     ADMIN — USERS
# ================================================================
@admin_router.get("/users")
async def list_users(user: dict = Depends(dep_admin),
                     q: Optional[str] = None,
                     role: Optional[str] = None,
                     status: Optional[str] = None):
    query = {}
    if role and role != "all":
        query["role"] = role
    if status and status != "all":
        query["status"] = status
    if q:
        rex = {"$regex": q, "$options": "i"}
        query["$or"] = [{"name": rex}, {"email": rex}, {"employee_id": rex},
                        {"department": rex}, {"mobile": rex}]
    docs = await _db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return {"items": docs, "total": len(docs)}


@admin_router.post("/users")
async def create_user(payload: UserCreatePayload, request: Request,
                       user: dict = Depends(dep_admin)):
    email = payload.email.lower().strip()
    if await _db.users.find_one({"email": email}):
        raise HTTPException(409, "Email already registered")

    # only super_admin can create super_admins
    if payload.role == "super_admin" and user["role"] != "super_admin":
        raise HTTPException(403, "Only super_admin can create super_admin users")

    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": _hash_password(payload.password),
        "name": payload.name.strip(),
        "role": payload.role,
        "status": payload.status,
        "mobile": payload.mobile,
        "employee_id": payload.employee_id,
        "department": payload.department,
        "designation": payload.designation,
        "permissions": payload.permissions or [],
        "created_at": _now_iso(),
        "created_by": user["email"],
        "last_login": None,
    }
    await _db.users.insert_one(doc)
    await _log_activity(user, "user_create", "users", f"Created {email}", True, _client_ip(request))
    return _clean_user(doc)


@admin_router.get("/users/{uid}")
async def get_user(uid: str, user: dict = Depends(dep_admin)):
    doc = await _db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


@admin_router.patch("/users/{uid}")
async def update_user(uid: str, patch: UserUpdatePayload, request: Request,
                       user: dict = Depends(dep_admin)):
    existing = await _db.users.find_one({"id": uid})
    if not existing:
        raise HTTPException(404, "Not found")
    updates = {k: v for k, v in patch.model_dump(exclude_none=True).items()}
    if "role" in updates:
        if updates["role"] == "super_admin" and user["role"] != "super_admin":
            raise HTTPException(403, "Only super_admin can assign super_admin")
        # cannot demote yourself
        if existing["id"] == user["id"] and updates["role"] != user["role"]:
            raise HTTPException(400, "Cannot change your own role")
    updates["updated_at"] = _now_iso()
    await _db.users.update_one({"id": uid}, {"$set": updates})
    await _log_activity(user, "user_update", "users",
                         f"Updated {existing['email']}: {list(updates.keys())}",
                         True, _client_ip(request))
    return await get_user(uid, user)


@admin_router.post("/users/{uid}/reset-password")
async def reset_password(uid: str, payload: ResetPasswordPayload, request: Request,
                          user: dict = Depends(dep_admin)):
    existing = await _db.users.find_one({"id": uid})
    if not existing:
        raise HTTPException(404, "Not found")
    new_hash = _hash_password(payload.new_password)
    await _db.users.update_one({"id": uid},
                                {"$set": {"password_hash": new_hash,
                                          "password_changed_at": _now_iso()}})
    await _log_activity(user, "password_reset", "users",
                         f"Reset for {existing['email']}", True, _client_ip(request))
    return {"ok": True}


@admin_router.delete("/users/{uid}")
async def delete_user(uid: str, request: Request, user: dict = Depends(dep_admin)):
    if uid == user["id"]:
        raise HTTPException(400, "Cannot delete yourself")
    existing = await _db.users.find_one({"id": uid})
    if not existing:
        raise HTTPException(404, "Not found")
    if existing["role"] == "super_admin" and user["role"] != "super_admin":
        raise HTTPException(403, "Only super_admin can delete super_admin")
    await _db.users.delete_one({"id": uid})
    await _log_activity(user, "user_delete", "users", f"Deleted {existing['email']}",
                         True, _client_ip(request))
    return {"ok": True}


# ================================================================
#                     ADMIN — RESOURCES
# (thin wrappers over existing db.resources)
# ================================================================
class AdminResourceIn(BaseModel):
    title: str
    description: Optional[str] = ""
    category: str
    kind: Optional[str] = "document"
    url: str
    starred: bool = False
    enabled: bool = True
    icon: Optional[str] = None
    order: Optional[int] = None
    allowed_roles: Optional[List[str]] = None  # roles that can see this resource


class AdminResourceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    kind: Optional[str] = None
    url: Optional[str] = None
    starred: Optional[bool] = None
    enabled: Optional[bool] = None
    icon: Optional[str] = None
    order: Optional[int] = None
    allowed_roles: Optional[List[str]] = None


@admin_router.get("/resources")
async def admin_list_resources(user: dict = Depends(dep_admin)):
    docs = await _db.resources.find({}, {"_id": 0}).sort([("sno", 1), ("order", 1)]).to_list(500)
    return {"items": docs, "total": len(docs)}


@admin_router.post("/resources")
async def admin_add_resource(payload: AdminResourceIn, request: Request,
                              user: dict = Depends(dep_admin)):
    max_sno_doc = await _db.resources.find_one({}, {"sno": 1}, sort=[("sno", -1)])
    next_sno = int((max_sno_doc or {}).get("sno", 0)) + 1
    doc = {
        "id": str(uuid.uuid4()),
        "sno": next_sno,
        "title": payload.title.strip()[:200],
        "description": (payload.description or "").strip()[:1000],
        "category": payload.category.strip()[:60],
        "kind": payload.kind or "document",
        "url": payload.url.strip(),
        "starred": bool(payload.starred),
        "enabled": bool(payload.enabled),
        "icon": payload.icon,
        "order": payload.order if payload.order is not None else next_sno,
        "allowed_roles": payload.allowed_roles or [],
        "created_at": _now_iso(),
        "created_by": user["email"],
    }
    await _db.resources.insert_one(doc)
    await _log_activity(user, "resource_create", "resources",
                         f"Added {doc['title']}", True, _client_ip(request))
    doc.pop("_id", None)
    return doc


@admin_router.patch("/resources/{rid}")
async def admin_update_resource(rid: str, patch: AdminResourceUpdate, request: Request,
                                 user: dict = Depends(dep_admin)):
    existing = await _db.resources.find_one({"id": rid})
    if not existing:
        raise HTTPException(404, "Not found")
    updates = {k: v for k, v in patch.model_dump(exclude_none=True).items()}
    updates["updated_at"] = _now_iso()
    await _db.resources.update_one({"id": rid}, {"$set": updates})
    await _log_activity(user, "resource_update", "resources",
                         f"Updated {existing.get('title')}: {list(updates.keys())}",
                         True, _client_ip(request))
    doc = await _db.resources.find_one({"id": rid}, {"_id": 0})
    return doc


@admin_router.delete("/resources/{rid}")
async def admin_delete_resource(rid: str, request: Request,
                                 user: dict = Depends(dep_admin)):
    existing = await _db.resources.find_one({"id": rid})
    if not existing:
        raise HTTPException(404, "Not found")
    await _db.resources.delete_one({"id": rid})
    await _log_activity(user, "resource_delete", "resources",
                         f"Deleted {existing.get('title')}", True, _client_ip(request))
    return {"ok": True}


# ================================================================
#                     ADMIN — DASHBOARD & LOGS
# ================================================================
@admin_router.get("/dashboard")
async def admin_dashboard(user: dict = Depends(dep_admin)):
    total_users = await _db.users.count_documents({})
    active_users = await _db.users.count_documents({"status": "active"})
    inactive_users = await _db.users.count_documents({"status": "inactive"})
    total_resources = await _db.resources.count_documents({})
    total_expenses = await _db.expenses.count_documents({})
    total_employees = await _db.employees.count_documents({}) if "employees" in await _db.list_collection_names() else 0
    total_invoices = await _db.billing_invoices.count_documents({}) if "billing_invoices" in await _db.list_collection_names() else 0
    total_consumers = await _db.discom_consumers.count_documents({})

    role_agg = await _db.users.aggregate([
        {"$group": {"_id": "$role", "count": {"$sum": 1}}}
    ]).to_list(50)

    # recent activity
    recent = await _db.audit_log.find({}, {"_id": 0}).sort("timestamp", -1).to_list(15)
    # recent logins
    logins = await _db.audit_log.find({"action": "login"}, {"_id": 0}).sort("timestamp", -1).to_list(10)

    return {
        "cards": {
            "total_users": total_users, "active_users": active_users,
            "inactive_users": inactive_users, "total_resources": total_resources,
            "total_modules": 5,  # Dashboard, Expenses, HRMS, Billing, DISCOM
            "total_expenses": total_expenses, "total_employees": total_employees,
            "total_invoices": total_invoices, "total_consumers": total_consumers,
        },
        "roles": [{"role": r["_id"], "count": r["count"]} for r in role_agg],
        "recent_activity": recent,
        "recent_logins": logins,
    }


@admin_router.get("/activity")
async def admin_activity(user: dict = Depends(dep_admin),
                          module: Optional[str] = None,
                          action: Optional[str] = None,
                          user_email: Optional[str] = None,
                          start: Optional[str] = None, end: Optional[str] = None,
                          limit: int = 200):
    q = {}
    if module: q["module"] = module
    if action: q["action"] = action
    if user_email: q["user_email"] = {"$regex": user_email, "$options": "i"}
    if start or end:
        rq = {}
        if start: rq["$gte"] = start
        if end: rq["$lte"] = end
        q["timestamp"] = rq
    docs = await _db.audit_log.find(q, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return {"items": docs, "total": len(docs)}


@admin_router.get("/settings/roles")
async def list_role_meta(user: dict = Depends(dep_admin)):
    return {
        "roles": [
            {"key": "super_admin", "label": "Super Admin", "desc": "Full access to everything."},
            {"key": "admin", "label": "Admin", "desc": "Manage users, resources & data (except promote to super_admin)."},
            {"key": "staff", "label": "Staff", "desc": "Access assigned modules; can add/edit business data."},
            {"key": "viewer", "label": "Viewer", "desc": "Read-only access to permitted modules."},
        ],
        "modules": [
            {"key": "dashboard", "label": "Dashboard"},
            {"key": "expenses", "label": "Daily Expenses"},
            {"key": "hrms", "label": "HRMS & Payroll"},
            {"key": "billing", "label": "Vendor Billing"},
            {"key": "discom", "label": "DISCOM"},
        ],
    }


# ================================================================
#                     SEED ADMIN
# ================================================================
async def seed_super_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "").lower().strip()
    admin_password = os.environ.get("ADMIN_PASSWORD", "")
    admin_name = os.environ.get("ADMIN_NAME", "Admin")
    if not admin_email or not admin_password:
        log.warning("ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping super admin seed")
        return

    existing = await _db.users.find_one({"email": admin_email})
    if existing is None:
        doc = {
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": _hash_password(admin_password),
            "name": admin_name,
            "role": "super_admin",
            "status": "active",
            "permissions": ["*"],
            "created_at": _now_iso(),
            "created_by": "seed",
            "last_login": None,
        }
        await _db.users.insert_one(doc)
        log.info(f"Seeded super_admin: {admin_email}")
    else:
        # keep hash in sync with env if changed
        if not _verify_password(admin_password, existing.get("password_hash", "")):
            await _db.users.update_one(
                {"email": admin_email},
                {"$set": {"password_hash": _hash_password(admin_password),
                          "role": "super_admin", "status": "active"}}
            )
            log.info(f"Updated super_admin password from env: {admin_email}")


async def ensure_auth_indexes():
    await _db.users.create_index("email", unique=True)
    await _db.users.create_index("role")
    await _db.audit_log.create_index([("timestamp", -1)])
    await _db.audit_log.create_index("user_email")
    await _db.login_attempts.create_index("identifier")
