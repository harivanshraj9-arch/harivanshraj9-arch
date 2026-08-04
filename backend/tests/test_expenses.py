"""Backend tests for Prathvi Power Solutions - Expense module + existing resources."""
import os
import pytest
import requests
from datetime import date, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL') or open('/app/frontend/.env').read().split('REACT_APP_BACKEND_URL=')[1].split('\n')[0]
BASE_URL = BASE_URL.rstrip('/')
API = f"{BASE_URL}/api"

session = requests.Session()
session.headers.update({"Content-Type": "application/json"})

created_ids = []


# ---------- Existing resource endpoints (regression) ----------
class TestResourcesRegression:
    def test_root(self):
        r = session.get(f"{API}/")
        assert r.status_code == 200

    def test_resources_19(self):
        r = session.get(f"{API}/resources")
        assert r.status_code == 200
        assert len(r.json()) == 19

    def test_stats(self):
        r = session.get(f"{API}/stats")
        assert r.status_code == 200
        assert r.json()["total_resources"] == 19

    def test_activity_list(self):
        r = session.get(f"{API}/activity?limit=5")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_categories(self):
        r = session.get(f"{API}/categories")
        assert r.status_code == 200
        assert "categories" in r.json()

    def test_patch_resource(self):
        res = session.get(f"{API}/resources").json()
        rid = res[0]["id"]
        r = session.patch(f"{API}/resources/{rid}", json={"starred": True})
        assert r.status_code == 200
        # reset
        session.patch(f"{API}/resources/{rid}", json={"starred": False})


# ---------- Expense categories ----------
class TestExpenseCategories:
    def test_categories_payment_modes(self):
        r = session.get(f"{API}/expenses/categories")
        assert r.status_code == 200
        data = r.json()
        assert "Food" in data["categories"]
        assert set(["Cash", "UPI", "Bank", "Card"]).issubset(set(data["payment_modes"]))


# ---------- Expense CRUD ----------
class TestExpenseCRUD:
    def test_create_valid(self):
        payload = {"category": "Food", "amount": 500, "payment_mode": "Cash", "description": "TEST_lunch"}
        r = session.post(f"{API}/expenses", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["amount"] == 500.0
        assert d["category"] == "Food"
        assert d["date"] == date.today().isoformat()
        created_ids.append(d["id"])

    def test_get_after_create(self):
        assert created_ids
        eid = created_ids[0]
        r = session.get(f"{API}/expenses/item/{eid}")
        assert r.status_code == 200
        assert r.json()["id"] == eid

    def test_create_amount_zero_fails(self):
        r = session.post(f"{API}/expenses", json={"category": "Food", "amount": 0, "payment_mode": "Cash"})
        assert r.status_code in (400, 422)

    def test_create_negative_amount_fails(self):
        r = session.post(f"{API}/expenses", json={"category": "Food", "amount": -5, "payment_mode": "Cash"})
        assert r.status_code in (400, 422)

    def test_create_invalid_payment_mode(self):
        r = session.post(f"{API}/expenses", json={"category": "Food", "amount": 10, "payment_mode": "Crypto"})
        assert r.status_code in (400, 422)

    def test_create_missing_category(self):
        r = session.post(f"{API}/expenses", json={"category": "", "amount": 10, "payment_mode": "Cash"})
        assert r.status_code in (400, 422)

    def test_create_bad_date(self):
        r = session.post(f"{API}/expenses", json={"date": "31-01-2026", "category": "Food", "amount": 10, "payment_mode": "Cash"})
        assert r.status_code == 400

    def test_update_expense(self):
        assert created_ids
        eid = created_ids[0]
        r = session.patch(f"{API}/expenses/item/{eid}", json={"amount": 750, "description": "TEST_updated"})
        assert r.status_code == 200
        assert r.json()["amount"] == 750.0
        # verify persisted
        g = session.get(f"{API}/expenses/item/{eid}").json()
        assert g["amount"] == 750.0
        assert g["description"] == "TEST_updated"

    def test_update_invalid_amount(self):
        eid = created_ids[0]
        r = session.patch(f"{API}/expenses/item/{eid}", json={"amount": -1})
        assert r.status_code == 400

    def test_update_bad_id_404(self):
        r = session.patch(f"{API}/expenses/item/nonexistent-id-xyz", json={"amount": 10})
        assert r.status_code == 404

    def test_delete_bad_id_404(self):
        r = session.delete(f"{API}/expenses/item/nonexistent-id-xyz")
        assert r.status_code == 404


# ---------- Listing & filters ----------
class TestExpenseListing:
    @classmethod
    def setup_class(cls):
        # Seed some entries
        today = date.today()
        cls.seed_ids = []
        entries = [
            {"category": "Fuel", "amount": 200, "payment_mode": "UPI", "description": "TEST_petrol", "date": today.isoformat()},
            {"category": "Travel", "amount": 1200, "payment_mode": "Card", "description": "TEST_uber", "date": (today - timedelta(days=1)).isoformat()},
            {"category": "Office", "amount": 300, "payment_mode": "Bank", "description": "TEST_stationery", "date": (today - timedelta(days=2)).isoformat()},
        ]
        for e in entries:
            r = session.post(f"{API}/expenses", json=e)
            if r.status_code == 200:
                cls.seed_ids.append(r.json()["id"])
                created_ids.append(r.json()["id"])

    def test_list_all(self):
        r = session.get(f"{API}/expenses")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_filter_category(self):
        r = session.get(f"{API}/expenses", params={"category": "Fuel"})
        assert r.status_code == 200
        for e in r.json():
            assert e["category"] == "Fuel"

    def test_filter_payment_mode(self):
        r = session.get(f"{API}/expenses", params={"payment_mode": "Card"})
        assert r.status_code == 200
        for e in r.json():
            assert e["payment_mode"] == "Card"

    def test_search_q(self):
        r = session.get(f"{API}/expenses", params={"q": "petrol"})
        assert r.status_code == 200

    def test_date_range(self):
        today = date.today().isoformat()
        r = session.get(f"{API}/expenses", params={"start": today, "end": today})
        assert r.status_code == 200
        for e in r.json():
            assert e["date"] == today

    def test_sort_amount_asc(self):
        r = session.get(f"{API}/expenses", params={"sort_by": "amount", "order": "asc", "limit": 5})
        assert r.status_code == 200
        amounts = [e["amount"] for e in r.json()]
        assert amounts == sorted(amounts)

    def test_count_matches(self):
        r = session.get(f"{API}/expenses/count", params={"category": "Fuel"})
        assert r.status_code == 200
        assert "total" in r.json()


# ---------- Budget ----------
class TestBudget:
    def test_get_default_current(self):
        r = session.get(f"{API}/budget")
        assert r.status_code == 200
        assert "amount" in r.json()

    def test_get_specific_month_zero(self):
        r = session.get(f"{API}/budget", params={"month": "1999-01"})
        assert r.status_code == 200
        assert r.json()["amount"] == 0.0

    def test_set_and_get(self):
        r = session.post(f"{API}/budget", json={"amount": 15000})
        assert r.status_code == 200
        month = r.json()["month"]
        g = session.get(f"{API}/budget", params={"month": month})
        assert g.json()["amount"] == 15000.0


# ---------- Summary & Analytics ----------
class TestSummary:
    def test_dashboard_summary(self):
        r = session.get(f"{API}/expenses/summary/dashboard")
        assert r.status_code == 200
        d = r.json()
        for k in ["today", "week", "month", "budget", "remaining", "utilization",
                  "entries_month", "avg_daily", "over_budget", "warn", "month_key"]:
            assert k in d, f"missing {k}"

    def test_monthly(self):
        r = session.get(f"{API}/expenses/analytics/monthly", params={"months": 6})
        assert r.status_code == 200
        assert len(r.json()["data"]) == 6

    def test_category(self):
        r = session.get(f"{API}/expenses/analytics/category")
        assert r.status_code == 200
        assert "data" in r.json()

    def test_weekly(self):
        r = session.get(f"{API}/expenses/analytics/weekly", params={"days": 14})
        assert r.status_code == 200
        assert len(r.json()["data"]) == 14

    def test_payment(self):
        r = session.get(f"{API}/expenses/analytics/payment")
        assert r.status_code == 200
        assert "data" in r.json()


# ---------- Export ----------
class TestExport:
    def test_excel_export(self):
        r = session.get(f"{API}/expenses/export/excel")
        assert r.status_code == 200
        assert "attachment" in r.headers.get("Content-Disposition", "")
        assert "xlsx" in r.headers.get("Content-Disposition", "")


# ---------- Backup / Restore ----------
class TestBackupRestore:
    def test_backup(self):
        r = session.get(f"{API}/expenses/backup")
        assert r.status_code == 200
        d = r.json()
        assert "expenses" in d and "budgets" in d

    def test_restore_merge(self):
        # get backup
        b = session.get(f"{API}/expenses/backup").json()
        payload = {"expenses": b["expenses"][:2], "budgets": b["budgets"], "mode": "merge"}
        r = session.post(f"{API}/expenses/restore", json=payload)
        assert r.status_code == 200
        assert r.json()["mode"] == "merge"


# ---------- Cleanup ----------
def teardown_module(module):
    for eid in created_ids:
        try:
            session.delete(f"{API}/expenses/item/{eid}")
        except Exception:
            pass
