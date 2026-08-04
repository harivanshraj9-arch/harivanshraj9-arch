"""
Tests for Payment History (POST/GET/DELETE /api/billing/invoices/{id}/payments,
DELETE /api/billing/payments/{pid}) and Customer Statement (GET /api/billing/statement).
"""
import os
import uuid
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE = line.split("=", 1)[1].strip()
                break
BASE = BASE.rstrip("/")
API = f"{BASE}/api/billing"

TEST_CUSTOMER = f"TEST CUSTOMER {uuid.uuid4().hex[:6]}"


def _mk_invoice(date_str, qty=1, rate=1000):
    payload = {
        "customer": TEST_CUSTOMER,
        "customer_gstin": "",
        "customer_address": "Test Addr",
        "place_of_supply": "MH",
        "is_igst": False,
        "lines": [{"name": "TEST ITEM", "hsn": "9954", "unit": "No.", "quantity": qty, "rate": rate, "gst_pct": 18.0}],
        "notes": "TEST",
    }
    r = requests.post(f"{API}/invoices", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    doc = r.json()
    # Override date to control statement math
    # There's no PATCH date route; use direct field via re-create if needed.
    # Backend uses today's date by default. To support "before start" scenario,
    # we insert one invoice, then set date via a workaround: we cannot patch date,
    # so we'll create invoices and use the returned dates plus start filter accordingly.
    return doc


created_invoice_ids = []
created_payment_ids = []


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    for pid in created_payment_ids:
        try: requests.delete(f"{API}/payments/{pid}", timeout=10)
        except Exception: pass
    for iid in created_invoice_ids:
        try: requests.delete(f"{API}/invoices/{iid}", timeout=10)
        except Exception: pass


# --------- Invoice helper for suite ---------
@pytest.fixture(scope="module")
def inv():
    d = _mk_invoice("2026-01-15", qty=1, rate=10000)  # grand_total = 11800
    created_invoice_ids.append(d["id"])
    return d


# --------- POST /invoices/{id}/payments ---------
class TestAddPayment:
    def test_partial_payment_partly_paid(self, inv):
        r = requests.post(f"{API}/invoices/{inv['id']}/payments",
                          json={"date": "2026-01-16", "amount": 5000, "method": "Bank",
                                "reference": "UTR001", "remarks": "TEST partial 1"})
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["amount"] == 5000
        assert p["method"] == "Bank"
        assert p["reference"] == "UTR001"
        assert p["invoice_id"] == inv["id"]
        created_payment_ids.append(p["id"])

        # Verify invoice status
        g = requests.get(f"{API}/invoices/{inv['id']}").json()
        assert g["paid_amount"] == 5000
        assert g["payment_status"] == "Partly Paid"

    def test_second_partial_still_partly(self, inv):
        r = requests.post(f"{API}/invoices/{inv['id']}/payments",
                          json={"date": "2026-01-17", "amount": 3000, "method": "UPI",
                                "reference": "UPI002", "remarks": "TEST partial 2"})
        assert r.status_code == 200
        created_payment_ids.append(r.json()["id"])

        g = requests.get(f"{API}/invoices/{inv['id']}").json()
        assert abs(g["paid_amount"] - 8000) < 0.01
        assert g["payment_status"] == "Partly Paid"

    def test_full_payment_flips_paid(self, inv):
        gt = inv["grand_total"]  # 11800
        remaining = gt - 8000
        r = requests.post(f"{API}/invoices/{inv['id']}/payments",
                          json={"date": "2026-01-18", "amount": remaining, "method": "Cash",
                                "reference": "", "remarks": "TEST final"})
        assert r.status_code == 200
        created_payment_ids.append(r.json()["id"])

        g = requests.get(f"{API}/invoices/{inv['id']}").json()
        assert abs(g["paid_amount"] - gt) < 0.5
        assert g["payment_status"] == "Paid"

    def test_add_payment_invalid_invoice(self):
        r = requests.post(f"{API}/invoices/nonexistent-xyz/payments",
                          json={"date": "2026-01-01", "amount": 100, "method": "Cash"})
        assert r.status_code == 404


# --------- GET /invoices/{id}/payments ---------
class TestListPayments:
    def test_list_sorted_desc(self, inv):
        r = requests.get(f"{API}/invoices/{inv['id']}/payments")
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 3
        # sorted by date desc
        dates = [i["date"] for i in items]
        assert dates == sorted(dates, reverse=True)

    def test_total_matches_invoice_paid(self, inv):
        items = requests.get(f"{API}/invoices/{inv['id']}/payments").json()["items"]
        total = sum(i["amount"] for i in items)
        g = requests.get(f"{API}/invoices/{inv['id']}").json()
        assert abs(total - g["paid_amount"]) < 0.01


# --------- DELETE /payments/{pid} ---------
class TestDeletePayment:
    def test_delete_all_flips_unpaid(self, inv):
        # Delete all payments for this invoice
        items = requests.get(f"{API}/invoices/{inv['id']}/payments").json()["items"]
        for it in items:
            r = requests.delete(f"{API}/payments/{it['id']}")
            assert r.status_code == 200
            if it["id"] in created_payment_ids:
                created_payment_ids.remove(it["id"])
        g = requests.get(f"{API}/invoices/{inv['id']}").json()
        assert g["paid_amount"] == 0
        assert g["payment_status"] == "Unpaid"

    def test_delete_nonexistent(self):
        r = requests.delete(f"{API}/payments/does-not-exist-xxx")
        assert r.status_code == 404


# --------- GET /statement ---------
class TestStatement:
    """
    Statement math depends on the invoice.date field. Since /invoices POST uses
    today's date (billing.py Invoice model default), we create both invoices
    "today" and split them using start filter to test opening_balance behaviour.
    We patch dates in DB via reusing MongoDB? No — we work with the actual
    created dates by inspecting them.
    """
    def test_statement_basic(self):
        # Create 2 invoices for the same TEST_CUSTOMER
        i1 = _mk_invoice("today", qty=1, rate=1000)  # 1180
        i2 = _mk_invoice("today", qty=1, rate=2000)  # 2360
        created_invoice_ids.append(i1["id"])
        created_invoice_ids.append(i2["id"])
        assert i1["date"] == i2["date"]

        # Add a payment to i1
        pr = requests.post(f"{API}/invoices/{i1['id']}/payments",
                           json={"date": i1["date"], "amount": 500, "method": "UPI",
                                 "reference": "UPI-STMT", "remarks": "TEST stmt"})
        assert pr.status_code == 200
        created_payment_ids.append(pr.json()["id"])

        # Statement covering today
        r = requests.get(f"{API}/statement",
                        params={"customer": TEST_CUSTOMER, "start": i1["date"], "end": i1["date"]})
        assert r.status_code == 200, r.text
        s = r.json()
        assert s["customer"] == TEST_CUSTOMER
        # At least these 2 invoices in the range
        inv_ids_in = {x["id"] for x in s["invoices"]}
        assert i1["id"] in inv_ids_in
        assert i2["id"] in inv_ids_in
        # Payments include our UPI-STMT
        assert any(p["reference"] == "UPI-STMT" for p in s["payments"])
        # opening = 0 (nothing before start for these fresh invoices — assuming clean namespace via unique TEST_CUSTOMER)
        assert s["opening_balance"] == 0.0
        # total_billed >= 1180 + 2360
        assert s["total_billed"] >= 3540 - 0.01
        assert s["total_paid"] >= 500 - 0.01
        # closing = opening + billed - paid
        assert abs(s["closing_balance"] - (s["opening_balance"] + s["total_billed"] - s["total_paid"])) < 0.01

    def test_statement_opening_balance_math(self):
        """
        Uses an artificial "future" start date so that today's invoices become
        'before start' — thereby forming the opening balance.
        """
        # Sum up all customer invoices' grand_total & payments amount as of now
        r_all = requests.get(f"{API}/statement", params={"customer": TEST_CUSTOMER})
        assert r_all.status_code == 200
        total_billed_all = r_all.json()["total_billed"]
        total_paid_all = r_all.json()["total_paid"]

        # Use future start
        r = requests.get(f"{API}/statement",
                        params={"customer": TEST_CUSTOMER, "start": "2099-01-01", "end": "2099-12-31"})
        assert r.status_code == 200
        s = r.json()
        # No invoices in range
        assert s["invoices"] == []
        assert s["payments"] == []
        # opening = billed_before - paid_before = total_billed_all - total_paid_all
        assert abs(s["opening_balance"] - (total_billed_all - total_paid_all)) < 0.01
        assert s["closing_balance"] == s["opening_balance"]

    def test_statement_customer_case_insensitive(self):
        r = requests.get(f"{API}/statement", params={"customer": TEST_CUSTOMER.lower()})
        assert r.status_code == 200
        assert r.json()["total_billed"] > 0
