"""Backend tests for HRMS module Phase 1."""
import os
import pytest
import requests
from datetime import date, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fall back to frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"
HRMS = f"{API}/hrms"


@pytest.fixture(scope="module")
def s():
    ses = requests.Session()
    ses.headers.update({"Content-Type": "application/json"})
    return ses


# ---------------- Regression on existing endpoints ----------------
class TestRegression:
    def test_resources(self, s):
        r = s.get(f"{API}/resources")
        assert r.status_code == 200

    def test_expenses(self, s):
        r = s.get(f"{API}/expenses")
        assert r.status_code == 200

    def test_expense_dashboard(self, s):
        r = s.get(f"{API}/expenses/summary/dashboard")
        assert r.status_code == 200


# ---------------- Lookups & settings ----------------
class TestLookupsSettings:
    def test_lookups(self, s):
        r = s.get(f"{HRMS}/lookups")
        assert r.status_code == 200
        d = r.json()
        for k in ["departments", "designations", "employment_types", "genders",
                  "blood_groups", "leave_types", "leave_statuses", "attendance_statuses"]:
            assert k in d and isinstance(d[k], list) and len(d[k]) > 0

    def test_settings_get(self, s):
        r = s.get(f"{HRMS}/settings")
        assert r.status_code == 200
        d = r.json()
        assert d["pf_employee_pct"] == 12.0
        assert d["esic_wage_ceiling"] == 21000.0

    def test_settings_save(self, s):
        cur = s.get(f"{HRMS}/settings").json()
        r = s.post(f"{HRMS}/settings", json={"professional_tax": 250.0})
        assert r.status_code == 200
        assert r.json()["professional_tax"] == 250.0
        # restore
        s.post(f"{HRMS}/settings", json={"professional_tax": cur.get("professional_tax", 200.0)})


# ---------------- Seed ----------------
class TestSeed:
    def test_seed_skip_when_exists(self, s):
        # existing seed already done; should skip
        r = s.post(f"{HRMS}/seed/demo")
        assert r.status_code == 200
        d = r.json()
        assert "skipped" in d or "inserted" in d


# ---------------- Employees ----------------
class TestEmployees:
    def test_list(self, s):
        r = s.get(f"{HRMS}/employees")
        assert r.status_code == 200
        d = r.json()
        assert "total" in d and "items" in d
        assert d["total"] >= 8

    def test_filter_department(self, s):
        r = s.get(f"{HRMS}/employees", params={"department": "Engineering"})
        assert r.status_code == 200
        for e in r.json()["items"]:
            assert e["department"] == "Engineering"

    def test_search(self, s):
        r = s.get(f"{HRMS}/employees", params={"q": "Anita"})
        assert r.status_code == 200
        items = r.json()["items"]
        assert any("Anita" in e["name"] for e in items)

    def test_crud_flow(self, s):
        # Create
        payload = {"name": "TEST_John Doe", "department": "Engineering",
                   "designation": "Executive", "basic": 20000, "hra": 8000, "da": 2000}
        r = s.post(f"{HRMS}/employees", json=payload)
        assert r.status_code == 200
        emp = r.json()
        assert emp["name"] == "TEST_John Doe"
        assert emp["emp_code"].startswith("EMP-")
        emp_id = emp["id"]

        # Get
        r2 = s.get(f"{HRMS}/employees/{emp_id}")
        assert r2.status_code == 200
        assert r2.json()["id"] == emp_id

        # Patch
        r3 = s.patch(f"{HRMS}/employees/{emp_id}", json={"designation": "Sr. Executive"})
        assert r3.status_code == 200
        assert r3.json()["designation"] == "Sr. Executive"

        # Bad id
        assert s.get(f"{HRMS}/employees/bad-id").status_code == 404
        assert s.patch(f"{HRMS}/employees/bad-id", json={"designation": "X"}).status_code == 404

        # Add document
        r4 = s.post(f"{HRMS}/employees/{emp_id}/documents",
                    json={"type": "PAN", "name": "pan.pdf", "data": "data:application/pdf;base64,AAAA"})
        assert r4.status_code == 200
        # verify document exists
        emp_after = s.get(f"{HRMS}/employees/{emp_id}").json()
        doc_id = emp_after["documents"][0]["id"]
        r5 = s.delete(f"{HRMS}/employees/{emp_id}/documents/{doc_id}")
        assert r5.status_code == 200

        # Delete
        r6 = s.delete(f"{HRMS}/employees/{emp_id}")
        assert r6.status_code == 200
        assert s.get(f"{HRMS}/employees/{emp_id}").status_code == 404
        assert s.delete(f"{HRMS}/employees/nonexistent").status_code == 404

    def test_name_validation(self, s):
        r = s.post(f"{HRMS}/employees", json={"name": "A"})
        assert r.status_code == 422


# ---------------- Attendance ----------------
class TestAttendance:
    @pytest.fixture(scope="class")
    def emp_id(self, s):
        items = s.get(f"{HRMS}/employees").json()["items"]
        return items[0]["id"]

    def test_upsert_and_compute(self, s, emp_id):
        today = date.today().isoformat()
        r = s.post(f"{HRMS}/attendance", json={
            "employee_id": emp_id, "date": today,
            "check_in": "09:30", "check_out": "19:00", "status": "Present"
        })
        assert r.status_code == 200
        d = r.json()
        # 9.5 hours worked, shift 9h -> overtime 0.5
        assert d["working_hours"] == 9.5
        assert d["overtime"] == 0.5
        # 9:30 vs 9:00 + 15min threshold -> late
        assert d["late_minutes"] == 30

    def test_upsert_idempotent(self, s, emp_id):
        today = date.today().isoformat()
        r1 = s.post(f"{HRMS}/attendance", json={
            "employee_id": emp_id, "date": today, "status": "Present",
            "check_in": "09:00", "check_out": "18:00"
        })
        r2 = s.post(f"{HRMS}/attendance", json={
            "employee_id": emp_id, "date": today, "status": "Present",
            "check_in": "09:00", "check_out": "18:00"
        })
        assert r1.json()["id"] == r2.json()["id"]

    def test_bulk(self, s):
        emps = s.get(f"{HRMS}/employees").json()["items"]
        entries = [{"employee_id": e["id"], "date": date.today().isoformat(),
                    "status": "Present", "check_in": "09:00", "check_out": "18:00"} for e in emps[:3]]
        r = s.post(f"{HRMS}/attendance/bulk", json={"entries": entries})
        assert r.status_code == 200
        d = r.json()
        assert (d["inserted"] + d["updated"]) == 3

    def test_list_filter(self, s, emp_id):
        r = s.get(f"{HRMS}/attendance", params={"employee_id": emp_id})
        assert r.status_code == 200
        for a in r.json()["items"]:
            assert a["employee_id"] == emp_id

    def test_monthly_register(self, s):
        m = date.today().strftime("%Y-%m")
        r = s.get(f"{HRMS}/attendance/register/{m}")
        assert r.status_code == 200
        d = r.json()
        assert d["month"] == m
        assert "employees" in d
        assert d["days_in_month"] >= 28


# ---------------- Leaves ----------------
class TestLeaves:
    @pytest.fixture(scope="class")
    def emp_id(self, s):
        items = s.get(f"{HRMS}/employees").json()["items"]
        return items[1]["id"]

    def test_apply_and_approve(self, s, emp_id):
        d1 = (date.today() + timedelta(days=10)).isoformat()
        d2 = (date.today() + timedelta(days=12)).isoformat()
        r = s.post(f"{HRMS}/leaves", json={
            "employee_id": emp_id, "type": "Casual",
            "from_date": d1, "to_date": d2, "reason": "family"
        })
        assert r.status_code == 200
        lv = r.json()
        assert lv["days"] == 3
        assert lv["status"] == "Pending"

        # Approve
        r2 = s.patch(f"{HRMS}/leaves/{lv['id']}", json={"status": "Approved"})
        assert r2.status_code == 200
        assert r2.json()["status"] == "Approved"

        # Verify attendance rows written
        r3 = s.get(f"{HRMS}/attendance", params={"employee_id": emp_id, "start": d1, "end": d2})
        atts = r3.json()["items"]
        assert len([a for a in atts if a["status"] == "Leave"]) == 3

    def test_apply_invalid_type(self, s, emp_id):
        r = s.post(f"{HRMS}/leaves", json={
            "employee_id": emp_id, "type": "BogusType",
            "from_date": "2026-02-01", "to_date": "2026-02-02"
        })
        assert r.status_code == 422

    def test_balance(self, s, emp_id):
        r = s.get(f"{HRMS}/leaves/balance/{emp_id}")
        assert r.status_code == 200
        d = r.json()
        assert "quota" in d and "used" in d and "balance" in d
        assert d["quota"]["Casual"] == 12


# ---------------- Payroll ----------------
class TestPayroll:
    def test_generate(self, s):
        m = date.today().strftime("%Y-%m")
        r = s.post(f"{HRMS}/payroll/generate", json={"month": m})
        assert r.status_code == 200
        assert r.json()["generated"] >= 8

    def test_list(self, s):
        m = date.today().strftime("%Y-%m")
        r = s.get(f"{HRMS}/payroll", params={"month": m})
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 8
        # Check PF math on one item
        for it in items:
            pf_wage = min(it["basic"] + it["da"], 15000)
            expected_pf_e = round(pf_wage * 0.12, 2)
            assert abs(it["pf_employee"] - expected_pf_e) < 1.0
            # ESIC only if gross <= 21000
            if it["gross_earnings"] > 21000:
                assert it["esic_employee"] == 0.0
            # Net = gross - total_ded (approx)
            assert abs(it["net_salary"] - (it["gross_earnings"] - it["total_deductions"])) < 0.5

    def test_summary(self, s):
        m = date.today().strftime("%Y-%m")
        r = s.get(f"{HRMS}/payroll/summary/{m}")
        assert r.status_code == 200
        d = r.json()
        assert d["month"] == m
        assert "gross" in d and "net" in d and "pf_total" in d and "esic_total" in d


# ---------------- Dashboard ----------------
class TestDashboard:
    def test_dashboard(self, s):
        r = s.get(f"{HRMS}/dashboard")
        assert r.status_code == 200
        d = r.json()
        for k in ["cards", "upcoming_birthdays", "upcoming_anniversaries",
                  "department_distribution", "attendance_trend", "payroll_trend",
                  "leave_statistics"]:
            assert k in d
        cards = d["cards"]
        for k in ["total_employees", "present_today", "absent_today", "on_leave_today",
                  "late_today", "pending_leaves", "monthly_payroll", "pf_total",
                  "esic_total", "todays_salary_cost", "month"]:
            assert k in cards
        assert len(d["attendance_trend"]) == 14
        assert len(d["payroll_trend"]) == 6


# ---------------- Reports ----------------
class TestReports:
    def _check_xlsx(self, r):
        assert r.status_code == 200
        assert "spreadsheetml" in r.headers.get("content-type", "")
        assert "attachment" in r.headers.get("content-disposition", "").lower()

    def test_employees_export(self, s):
        self._check_xlsx(s.get(f"{HRMS}/reports/employees/export"))

    def test_attendance_export(self, s):
        m = date.today()
        self._check_xlsx(s.get(f"{HRMS}/reports/attendance/export",
                               params={"start": m.replace(day=1).isoformat(), "end": m.isoformat()}))

    def test_payroll_export(self, s):
        self._check_xlsx(s.get(f"{HRMS}/reports/payroll/export",
                               params={"month": date.today().strftime("%Y-%m")}))

    def test_pf_export(self, s):
        self._check_xlsx(s.get(f"{HRMS}/reports/pf/export",
                               params={"month": date.today().strftime("%Y-%m")}))

    def test_esic_export(self, s):
        self._check_xlsx(s.get(f"{HRMS}/reports/esic/export",
                               params={"month": date.today().strftime("%Y-%m")}))
