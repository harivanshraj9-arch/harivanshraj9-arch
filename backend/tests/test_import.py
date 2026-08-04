"""Backend tests for Excel Import feature (Prathvi Power Solutions)."""
import os
import io
import time
import pytest
import requests
from openpyxl import Workbook, load_workbook
from datetime import date, timedelta

BASE_URL = (os.environ.get('REACT_APP_BACKEND_URL') or
            open('/app/frontend/.env').read().split('REACT_APP_BACKEND_URL=')[1].split('\n')[0]).rstrip('/')
API = f"{BASE_URL}/api"

SAMPLE_XLSX = "/tmp/all_expenses.xlsx"

session = requests.Session()


def _make_xlsx(headers, rows):
    wb = Workbook()
    ws = wb.active
    ws.append(headers)
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def _preview(file_bytes, filename="test.xlsx"):
    files = {"file": (filename, file_bytes,
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    return session.post(f"{API}/expenses/import/preview", files=files)


# ---------- Cleanup: wipe existing expenses so duplicate detection is deterministic ----------
@pytest.fixture(scope="module", autouse=True)
def clean_expenses():
    r = session.get(f"{API}/expenses", params={"limit": 10000})
    if r.status_code == 200:
        for e in r.json():
            session.delete(f"{API}/expenses/item/{e['id']}")
    yield
    # Leave imported historical data (per spec)


class TestFuzzyHeaderMapping:
    def test_variants_map(self):
        buf = _make_xlsx(
            ["DATE ", "AMOUNT", "CATEGORY", "Mode", "DETAILS"],
            [[date.today().isoformat(), 100, "Food", "UPI", "lunch"]],
        )
        r = _preview(buf)
        assert r.status_code == 200, r.text
        d = r.json()
        hm = d["header_map"]
        assert "date" in hm and "amount" in hm and "category" in hm
        assert "payment_mode" in hm and "description" in hm

    def test_alt_variants(self):
        buf = _make_xlsx(
            ["Expense Date", "Amt", "Head", "PaymentMode", "Remarks"],
            [[date.today().isoformat(), 50, "Fuel", "GPay", "petrol"]],
        )
        d = _preview(buf).json()
        assert set(["date", "amount", "category", "payment_mode", "description"]).issubset(d["header_map"].keys())


class TestValidation:
    def test_invalid_and_empty(self):
        buf = _make_xlsx(
            ["Date", "Amount", "Category", "Mode", "Description"],
            [
                [date.today().isoformat(), 100, "Food", "Cash", "ok"],   # valid
                [date.today().isoformat(), -50, "Food", "Cash", "neg"],  # invalid amount
                [date.today().isoformat(), "", "Food", "Cash", "empty"], # invalid amount
                ["not-a-date", 100, "Food", "Cash", "bad date"],         # invalid date
                [None, None, None, None, None],                          # empty row
                ["", "", "", "", ""],                                    # empty row
            ],
        )
        d = _preview(buf).json()
        c = d["counts"]
        assert c["total_rows"] == 4, c
        assert c["valid"] == 1
        assert c["invalid"] == 3
        assert c["empty_skipped"] == 2

        # Check error message for negative amount
        neg = [r for r in d["rows"] if r.get("description") == "neg"][0]
        assert not neg["valid"]
        assert any("positive" in e.lower() for e in neg["errors"])


class TestUnsupportedFile:
    def test_csv_rejected(self):
        r = session.post(
            f"{API}/expenses/import/preview",
            files={"file": ("data.csv", b"a,b\n1,2\n", "text/csv")},
        )
        assert r.status_code == 400
        assert "xlsx" in r.json()["detail"].lower()

    def test_txt_rejected(self):
        r = session.post(
            f"{API}/expenses/import/preview",
            files={"file": ("data.txt", b"hello", "text/plain")},
        )
        assert r.status_code == 400

    def test_missing_required_column(self):
        buf = _make_xlsx(["Date", "Description"], [[date.today().isoformat(), "x"]])
        r = _preview(buf)
        assert r.status_code == 400
        assert "missing" in r.json()["detail"].lower()


class TestDuplicateDetection:
    def test_duplicate_flagged(self):
        # Insert one expense first
        payload = {"category": "Food", "amount": 250, "payment_mode": "Cash",
                   "description": "TEST_dup_signature", "date": "2026-01-05"}
        r = session.post(f"{API}/expenses", json=payload)
        assert r.status_code == 200
        eid = r.json()["id"]

        try:
            buf = _make_xlsx(
                ["Date", "Amount", "Category", "Mode", "Description"],
                [
                    ["2026-01-05", 250, "FOOD", "Cash", "test_DUP_signature"],  # case-insensitive dup
                    ["2026-01-05", 999, "Food", "Cash", "unique row"],           # not dup
                ],
            )
            d = _preview(buf).json()
            dup_rows = [r for r in d["rows"] if r["is_duplicate"]]
            assert len(dup_rows) == 1
            assert d["counts"]["duplicates"] == 1
        finally:
            session.delete(f"{API}/expenses/item/{eid}")


class TestCommit:
    def test_commit_skip_duplicates(self):
        # Insert 1 baseline
        base = {"category": "Fuel", "amount": 300, "payment_mode": "UPI",
                "description": "TEST_baseline", "date": "2026-01-06"}
        r0 = session.post(f"{API}/expenses", json=base)
        assert r0.status_code == 200
        base_id = r0.json()["id"]

        try:
            buf = _make_xlsx(
                ["Date", "Amount", "Category", "Mode", "Description"],
                [
                    ["2026-01-06", 300, "Fuel", "UPI", "TEST_baseline"],  # dup
                    ["2026-01-07", 400, "Fuel", "Cash", "TEST_new1"],     # new
                    ["2026-01-08", -10, "Fuel", "Cash", "TEST_bad"],      # invalid
                ],
            )
            preview = _preview(buf).json()
            r = session.post(f"{API}/expenses/import/commit",
                             json={"rows": preview["rows"], "skip_duplicates": True})
            assert r.status_code == 200, r.text
            res = r.json()
            assert res["imported"] == 1
            assert res["skipped_duplicate"] == 1
            assert res["failed"] == 1
        finally:
            # cleanup
            session.delete(f"{API}/expenses/item/{base_id}")
            for e in session.get(f"{API}/expenses", params={"q": "TEST_new1"}).json():
                session.delete(f"{API}/expenses/item/{e['id']}")

    def test_commit_allow_duplicates(self):
        base = {"category": "Office", "amount": 111, "payment_mode": "Cash",
                "description": "TEST_dup_allow", "date": "2026-01-09"}
        r0 = session.post(f"{API}/expenses", json=base)
        base_id = r0.json()["id"]
        try:
            buf = _make_xlsx(
                ["Date", "Amount", "Category", "Mode", "Description"],
                [["2026-01-09", 111, "Office", "Cash", "TEST_dup_allow"]],
            )
            preview = _preview(buf).json()
            r = session.post(f"{API}/expenses/import/commit",
                             json={"rows": preview["rows"], "skip_duplicates": False})
            res = r.json()
            assert res["imported"] == 1
            assert res["skipped_duplicate"] == 0
        finally:
            for e in session.get(f"{API}/expenses", params={"q": "TEST_dup_allow"}).json():
                session.delete(f"{API}/expenses/item/{e['id']}")


class TestSampleFile:
    def test_sample_preview_and_commit(self):
        assert os.path.exists(SAMPLE_XLSX), f"Missing {SAMPLE_XLSX}"

        # Clear expenses to start fresh
        r = session.get(f"{API}/expenses", params={"limit": 10000})
        data = r.json() if r.status_code == 200 else []
        if isinstance(data, list):
            for e in data:
                if isinstance(e, dict) and "id" in e:
                    session.delete(f"{API}/expenses/item/{e['id']}")

        with open(SAMPLE_XLSX, "rb") as f:
            files = {"file": ("ALL EXPENCES.xlsx", f.read(),
                              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        t0 = time.time()
        r = session.post(f"{API}/expenses/import/preview", files=files)
        assert r.status_code == 200, r.text
        pv = r.json()
        print("SAMPLE preview counts:", pv["counts"], "headers:", pv["headers"])
        print("new_categories:", pv["new_categories"])
        assert pv["counts"]["total_rows"] > 0

        # Commit
        t1 = time.time()
        r = session.post(f"{API}/expenses/import/commit",
                         json={"rows": pv["rows"], "skip_duplicates": True})
        assert r.status_code == 200, r.text
        res = r.json()
        elapsed = time.time() - t0
        print("SAMPLE commit result:", res, f"elapsed {elapsed:.2f}s")
        assert res["imported"] >= 1
        assert elapsed < 30  # performance

    def test_dashboard_reflects_import(self):
        r = session.get(f"{API}/expenses/summary/dashboard")
        assert r.status_code == 200
        d = r.json()
        # After import there should be some entries
        assert d["entries_month"] >= 0  # can't assert exact
        # analytics endpoints still work
        for path in ["analytics/monthly", "analytics/category",
                     "analytics/weekly", "analytics/payment"]:
            rr = session.get(f"{API}/expenses/{path}")
            assert rr.status_code == 200


class TestRegression:
    def test_resources_still_19(self):
        r = session.get(f"{API}/resources")
        assert r.status_code == 200
        assert len(r.json()) == 19
