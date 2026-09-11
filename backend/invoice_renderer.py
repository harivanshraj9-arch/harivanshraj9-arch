"""
Server-side invoice renderer — mirrors /app/frontend/src/lib/invoiceRenderer.js
Produces the same HTML so that browser Print and server PDF export are visually identical.

Used by the /api/billing/invoices/{id}/pdf endpoint (WeasyPrint → PDF).
"""
from datetime import datetime, date
from typing import Any, Dict, List, Optional
import re
import html


def _esc(v: Any) -> str:
    return html.escape("" if v is None else str(v))


def _inr(n: Any) -> str:
    try:
        val = float(n or 0)
    except Exception:
        val = 0.0
    # Indian grouping: last 3 digits, then groups of 2
    negative = val < 0
    val = abs(val)
    int_part = int(val)
    frac = f"{val - int_part:.2f}"[2:]
    s = str(int_part)
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        head = re.sub(r"(\d)(?=(\d{2})+$)", r"\1,", head)
        s = f"{head},{tail}"
    return ("-" if negative else "") + s + "." + frac


def _fmt_date(v: Any) -> str:
    if not v:
        return ""
    if isinstance(v, (datetime, date)):
        return v.strftime("%d/%m/%Y")
    s = str(v).strip()
    if re.match(r"^\d{2}/\d{2}/\d{4}$", s):
        return s
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return f"{m.group(3)}/{m.group(2)}/{m.group(1)}"
    return s


# ---- Indian-format amount in words (same output as amountInWords.js) ----
_ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
         "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
         "Seventeen", "Eighteen", "Nineteen"]
_TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]


def _two(v: int) -> str:
    if v < 20:
        return _ONES[v]
    return f"{_TENS[v // 10]}{' ' + _ONES[v % 10] if v % 10 else ''}"


def _three(v: int) -> str:
    h = v // 100
    r = v % 100
    out = ""
    if h:
        out += _ONES[h] + " Hundred"
        if r:
            out += " and "
    if r:
        out += _two(r)
    return out


def _in_words(n: int) -> str:
    if n == 0:
        return ""
    parts = []
    crore = n // 10000000
    n %= 10000000
    lakh = n // 100000
    n %= 100000
    thou = n // 1000
    n %= 1000
    if crore:
        parts.append(f"{_two(crore)} Crore")
    if lakh:
        parts.append(f"{_two(lakh)} Lakh")
    if thou:
        parts.append(f"{_two(thou)} Thousand")
    if n:
        parts.append(_three(n))
    return " ".join(parts).strip()


def amount_to_words(amount: float) -> str:
    if not amount:
        return "Zero Rupees Only"
    n = round(float(amount) * 100) / 100
    rupees = int(n)
    paise = round((n - rupees) * 100)
    result = "Rupees " + _in_words(rupees)
    if paise > 0:
        result += " and " + _two(paise) + " Paise"
    return re.sub(r"\s+", " ", result).strip() + " Only"


def render_invoice_html(inv: Dict[str, Any], company: Dict[str, Any]) -> str:
    """Produce the full self-contained HTML document for a single invoice.
    Mirrors /app/frontend/src/lib/invoiceRenderer.js so print and PDF match visually."""
    co = company or {}
    words = amount_to_words(inv.get("grand_total") or inv.get("invoice_value_raw") or 0)

    lines = inv.get("lines") or []
    first_gst = (lines[0].get("gst_pct") if lines else None) or 18
    half_gst = f"{first_gst / 2:.0f}"

    lines_html = "".join(
        f"""
        <tr>
          <td class="c num">{i + 1}</td>
          <td class="desc">{_esc(l.get('name'))}</td>
          <td class="c">{_esc(l.get('hsn') or '')}</td>
          <td class="c">{_esc(l.get('unit') or 'No.')}</td>
          <td class="num">{_esc(l.get('quantity'))}</td>
          <td class="num">{_inr(l.get('rate'))}</td>
          <td class="num">{_inr(l.get('amount'))}</td>
        </tr>"""
        for i, l in enumerate(lines)
    )
    # Pad blank rows so table stretches like the reference layout
    pad = max(0, 6 - len(lines))
    pad_html = ('<tr><td class="c">&nbsp;</td><td></td><td></td><td></td>'
                '<td></td><td></td><td></td></tr>' * pad)

    bill_to_name = _esc(inv.get("customer") or "-")
    bill_to_addr = _esc(inv.get("customer_address") or "-")
    bill_to_gstin = _esc(inv.get("customer_gstin") or "-")
    bill_to_state = _esc(inv.get("customer_state") or "-")
    bill_to_sc = _esc(inv.get("customer_state_code") or "-")

    ship_addr = _esc(inv.get("shipped_to") or inv.get("customer_address") or "-")
    ship_gstin = _esc(inv.get("shipped_to_gstin") or inv.get("customer_gstin") or "-")

    tax_row = (
        f'<tr><td class="label">IGST {first_gst}%</td><td class="val">₹ {_inr(inv.get("igst"))}</td></tr>'
        if inv.get("is_igst") else
        f'<tr><td class="label">SGST {half_gst}%</td><td class="val">₹ {_inr(inv.get("sgst"))}</td></tr>'
        f'<tr><td class="label">CGST {half_gst}%</td><td class="val">₹ {_inr(inv.get("cgst"))}</td></tr>'
    )

    src = _esc(inv.get("source") or "manual")

    return f"""<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<title>{_esc(inv.get('invoice_no'))} — {_esc(co.get('name') or 'Invoice')}</title>
<style>
  @page {{ size: A4; margin: 12mm; }}
  * {{ box-sizing: border-box; }}
  body {{ font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
         font-size: 11px; color: #111; margin: 0; padding: 0; background: #fff; }}
  .invoice {{ max-width: 186mm; margin: 0 auto; }}
  .company-hdr {{ display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 6px 0 10px; }}
  .company-hdr .brand {{ flex: 1; }}
  .company-hdr h1 {{ margin: 0 0 2px; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; color: #1f3a8a; }}
  .company-hdr .addr {{ color: #333; font-size: 10.5px; line-height: 1.45; }}
  .company-hdr .meta {{ text-align: right; font-size: 10.5px; }}
  .company-hdr .meta .label {{ color: #666; }}
  .company-hdr .meta .val {{ font-weight: 700; color: #111; }}
  .tax-invoice-title {{ text-align: center; font-size: 13px; font-weight: 800; letter-spacing: 3px;
                        padding: 4px 0; border-top: 1.5px solid #111; border-bottom: 1.5px solid #111; margin: 4px 0 8px; }}
  .party-row {{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; border: 1px solid #111; }}
  .party {{ padding: 6px 8px; border-right: 1px solid #111; font-size: 10.5px; line-height: 1.4; }}
  .party:last-child {{ border-right: 0; }}
  .party .h {{ font-weight: 800; font-size: 10.5px; margin-bottom: 3px; padding-bottom: 2px;
              border-bottom: 1px dashed #666; text-transform: uppercase; letter-spacing: 0.5px; }}
  .party .name {{ font-weight: 700; font-size: 11px; margin-bottom: 2px; }}
  .party .kv {{ margin-top: 2px; }}
  .party .kv b {{ display: inline-block; min-width: 82px; }}
  table.items {{ width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10.5px; }}
  table.items th, table.items td {{ border: 1px solid #111; padding: 4px 6px; vertical-align: top; }}
  table.items thead th {{ background: #f2f4f7; font-weight: 800; text-align: center; font-size: 10.5px; }}
  table.items td.c {{ text-align: center; }}
  table.items td.num {{ text-align: right; font-variant-numeric: tabular-nums; }}
  .totals-row {{ display: grid; grid-template-columns: 1.35fr 1fr; gap: 0; border: 1px solid #111; border-top: 0; }}
  .bank-block {{ padding: 6px 8px; border-right: 1px solid #111; font-size: 10.5px; line-height: 1.5; }}
  .bank-block .h {{ font-weight: 800; margin-bottom: 4px; letter-spacing: 0.5px; border-bottom: 1px dashed #666;
                    padding-bottom: 2px; text-transform: uppercase; }}
  .bank-block b {{ display: inline-block; min-width: 105px; }}
  .tax-block table {{ width: 100%; border-collapse: collapse; font-size: 10.5px; }}
  .tax-block td {{ padding: 3px 8px; border-bottom: 1px solid #ddd; }}
  .tax-block td.label {{ text-align: left; font-weight: 600; }}
  .tax-block td.val {{ text-align: right; font-variant-numeric: tabular-nums; }}
  .tax-block tr.grand td {{ background: #1f3a8a; color: #fff; font-size: 12px; font-weight: 800; border-bottom: 0; padding: 6px 8px; }}
  .words {{ border: 1px solid #111; border-top: 0; padding: 5px 8px; font-size: 10.5px; background: #fafafa; }}
  .words b {{ text-transform: uppercase; letter-spacing: 0.5px; margin-right: 4px; }}
  .signatory {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 20px; font-size: 10.5px; }}
  .signatory .right {{ text-align: right; }}
  .signatory .right .sig-space {{ height: 40px; }}
  .footnote {{ margin-top: 14px; padding-top: 6px; border-top: 1px dashed #999;
               text-align: center; color: #666; font-size: 9.5px; }}
  .badge-source {{ display: inline-block; padding: 1px 6px; font-size: 9px; font-weight: 800;
                   letter-spacing: 0.5px; border-radius: 3px; margin-left: 6px; text-transform: uppercase; }}
  .badge-source.historical {{ background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }}
  .badge-source.wcc {{ background: #dbeafe; color: #1e3a8a; border: 1px solid #3b82f6; }}
  .badge-source.manual {{ background: #f3f4f6; color: #374151; border: 1px solid #9ca3af; }}
</style></head>
<body>
<div class="invoice">
  <div class="company-hdr">
    <div class="brand">
      <h1>{_esc(co.get('name') or 'R K ENTERPRISES')}</h1>
      <div class="addr">{_esc(co.get('address') or '')}</div>
      <div class="addr">
        {f"<b>GSTIN:</b> {_esc(co.get('gstin'))}" if co.get('gstin') else ""}
        {f" &nbsp;·&nbsp; <b>PAN:</b> {_esc(co.get('pan'))}" if co.get('pan') else ""}
      </div>
      <div class="addr">
        {f"<b>Mob:</b> {_esc(co.get('phone'))}" if co.get('phone') else ""}
        {f" &nbsp;·&nbsp; <b>Email:</b> {_esc(co.get('email'))}" if co.get('email') else ""}
      </div>
    </div>
    <div class="meta">
      <div><span class="label">Dated:</span> <span class="val">{_esc(_fmt_date(inv.get('date')))}</span></div>
      <div style="margin-top:4px"><span class="label">Invoice No. —</span> <span class="val">{_esc(inv.get('invoice_no'))}</span></div>
      <div style="margin-top:6px"><span class="badge-source {src}">{src}</span></div>
    </div>
  </div>

  <div class="tax-invoice-title">TAX INVOICE</div>

  <div class="party-row">
    <div class="party">
      <div class="h">Billed To</div>
      <div class="name">{bill_to_name}</div>
      <div>{bill_to_addr}</div>
      <div class="kv"><b>GST No.:</b> {bill_to_gstin}</div>
      <div class="kv"><b>State:</b> {bill_to_state}</div>
      <div class="kv"><b>State Code:</b> {bill_to_sc}</div>
    </div>
    <div class="party">
      <div class="h">Shipped To</div>
      <div>{ship_addr}</div>
      <div class="kv"><b>GST No.:</b> {ship_gstin}</div>
      <div class="kv"><b>State:</b> {bill_to_state}</div>
      <div class="kv"><b>State Code:</b> {bill_to_sc}</div>
    </div>
    <div class="party">
      <div class="h">Billed From</div>
      <div class="name">{_esc(co.get('name') or 'R K ENTERPRISES')}</div>
      <div>{_esc(co.get('address') or '')}</div>
      <div class="kv"><b>GST No.:</b> {_esc(co.get('gstin') or '-')}</div>
      <div class="kv"><b>State:</b> {_esc(co.get('state') or '-')}</div>
      <div class="kv"><b>State Code:</b> {_esc(co.get('state_code') or '-')}</div>
    </div>
  </div>

  <table class="items">
    <colgroup>
      <col style="width:6%" /><col style="width:34%" /><col style="width:9%" />
      <col style="width:7%" /><col style="width:10%" /><col style="width:13%" /><col style="width:15%" />
    </colgroup>
    <thead>
      <tr>
        <th>Sr. No.</th><th>Description</th><th>HSN</th><th>Unit</th>
        <th>Qty.</th><th>Rate</th><th>Total Amount</th>
      </tr>
    </thead>
    <tbody>
      {lines_html}
      {pad_html}
    </tbody>
  </table>

  <div class="totals-row">
    <div class="bank-block">
      <div class="h">Bank Details</div>
      <div><b>BANK NAME:</b> {_esc(co.get('bank_name') or '-')}</div>
      <div><b>IFSC CODE:</b> {_esc(co.get('ifsc') or '-')}</div>
      <div><b>ACCOUNT NUMBER:</b> {_esc(co.get('account_number') or '-')}</div>
      <div><b>ACCOUNT NAME:</b> {_esc(co.get('account_name') or co.get('name') or '-')}</div>
      {f"<div><b>BRANCH:</b> {_esc(co.get('branch'))}</div>" if co.get('branch') else ""}
    </div>
    <div class="tax-block">
      <table>
        <tr><td class="label">Subtotal</td><td class="val">₹ {_inr(inv.get('subtotal'))}</td></tr>
        {tax_row}
        <tr><td class="label">Round Off</td><td class="val">₹ {_inr(inv.get('round_off'))}</td></tr>
        <tr class="grand"><td>G. Total</td><td style="text-align:right">₹ {_inr(inv.get('grand_total'))}</td></tr>
      </table>
    </div>
  </div>

  <div class="words"><b>In Words:</b> {_esc(words)}</div>

  <div class="signatory">
    <div class="left">
      {f'<div><b>WCC Ref:</b> {_esc(inv.get("wcc_filename"))}</div>' if inv.get("wcc_filename") else ""}
      {f'<div style="margin-top:6px">{_esc(inv.get("notes"))}</div>' if inv.get("notes") else ""}
      {f'<div style="margin-top:6px"><i>{_esc(inv.get("remarks"))}</i></div>' if inv.get("remarks") else ""}
    </div>
    <div class="right">
      <div><b>For {_esc(co.get('name') or 'R K ENTERPRISES')}</b></div>
      <div class="sig-space"></div>
      <div>{_esc(co.get('authorized_signatory') or 'Authorized Signatory')}</div>
    </div>
  </div>

  <div class="footnote">
    {_esc(co.get('invoice_footer') or '')} · This is a computer-generated invoice.
  </div>
</div>
</body></html>"""
