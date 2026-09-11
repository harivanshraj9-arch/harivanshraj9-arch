/**
 * Invoice Renderer — single source of truth for invoice HTML layout.
 *
 * Used by:
 *   - Single WCC invoice print
 *   - Bulk WCC invoice print
 *   - Manually created invoice print
 *   - Historical invoice viewing/print
 *   - Invoice preview modal
 *   - Invoice "Download PDF" (opens browser print → user saves as PDF)
 *
 * Layout follows the reference PDF (R K Enterprises target format):
 *   - Company header (name / address / GSTIN / PAN / phone / email)
 *   - Right-aligned invoice metadata (Date + Invoice No)
 *   - 3 side-by-side bordered blocks: Billed To | Shipped To | Billed From
 *   - Item table: Sr.No | Description | HSN | Unit | Qty | Rate | Total Amount
 *   - Right-aligned tax summary box: Subtotal / SGST 9% / CGST 9% / Round Off / G. Total
 *   - Bottom-left bank details block
 *   - Amount in Words + Authorized Signatory footer
 *
 * All values are dynamic (from `inv` + `company`). No hard-coded sample values.
 */
import { amountToWords } from "./amountInWords";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const inr = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (isoOrDmy) => {
  if (!isoOrDmy) return "";
  // Accept both YYYY-MM-DD and DD/MM/YYYY — return DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(isoOrDmy)) return isoOrDmy;
  const d = new Date(isoOrDmy);
  if (isNaN(d.getTime())) return isoOrDmy;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

/** Render invoice HTML — returns a full self-contained HTML document string. */
export function renderInvoiceHTML(inv, company = {}) {
  const co = company || {};
  const words = amountToWords(inv.grand_total || inv.invoice_value_raw || 0);

  // Tax rates — dynamic from the first line (invoices in this system currently use uniform rate)
  const firstGst = inv.lines?.[0]?.gst_pct ?? 18;
  const halfGst = (firstGst / 2).toFixed(0);

  const linesHtml = (inv.lines || [])
    .map(
      (l, i) => `
    <tr>
      <td class="c num">${i + 1}</td>
      <td class="desc">${esc(l.name)}</td>
      <td class="c">${esc(l.hsn || "")}</td>
      <td class="c">${esc(l.unit || "No.")}</td>
      <td class="num">${Number(l.quantity || 0).toLocaleString("en-IN")}</td>
      <td class="num">${inr(l.rate)}</td>
      <td class="num">${inr(l.amount)}</td>
    </tr>`
    )
    .join("");

  // Fill blank rows so the item table stretches a bit for a cleaner professional look
  const minRows = 6;
  const padRows = Math.max(0, minRows - (inv.lines?.length || 0));
  const padHtml = Array.from({ length: padRows })
    .map(() => `<tr><td class="c">&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`)
    .join("");

  const billTo = {
    name: inv.customer || "-",
    address: inv.customer_address || "-",
    gstin: inv.customer_gstin || "-",
    state: inv.customer_state || "-",
    stateCode: inv.customer_state_code || "-",
  };
  const shipTo = {
    // If shipped_to blank, mirror bill-to
    address: inv.shipped_to || inv.customer_address || "-",
    gstin: inv.shipped_to_gstin || inv.customer_gstin || "-",
    state: inv.customer_state || "-",
    stateCode: inv.customer_state_code || "-",
  };

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<title>${esc(inv.invoice_no)} — ${esc(co.name || "Invoice")}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
    font-size: 11px; color: #111; margin: 0; padding: 0; background: #fff;
  }
  .invoice { max-width: 186mm; margin: 0 auto; }
  .company-hdr {
    display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
    padding: 6px 0 10px;
  }
  .company-hdr .brand { flex: 1; }
  .company-hdr h1 {
    margin: 0 0 2px; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;
    color: #1f3a8a;
  }
  .company-hdr .addr { color: #333; font-size: 10.5px; line-height: 1.45; }
  .company-hdr .meta { text-align: right; font-size: 10.5px; }
  .company-hdr .meta .label { color: #666; }
  .company-hdr .meta .val { font-weight: 700; color: #111; }
  .logo { max-height: 55px; max-width: 90px; object-fit: contain; }

  .tax-invoice-title {
    text-align: center; font-size: 13px; font-weight: 800; letter-spacing: 3px;
    padding: 4px 0; border-top: 1.5px solid #111; border-bottom: 1.5px solid #111;
    margin: 4px 0 8px;
  }

  .party-row {
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0;
    border: 1px solid #111;
  }
  .party {
    padding: 6px 8px; border-right: 1px solid #111; font-size: 10.5px;
    line-height: 1.4;
  }
  .party:last-child { border-right: 0; }
  .party .h { font-weight: 800; font-size: 10.5px; margin-bottom: 3px;
              padding-bottom: 2px; border-bottom: 1px dashed #666; text-transform: uppercase; letter-spacing: 0.5px; }
  .party .name { font-weight: 700; font-size: 11px; margin-bottom: 2px; }
  .party .kv { margin-top: 2px; }
  .party .kv b { display: inline-block; min-width: 82px; }

  table.items {
    width: 100%; border-collapse: collapse; margin-top: 8px;
    font-size: 10.5px;
  }
  table.items th, table.items td {
    border: 1px solid #111; padding: 4px 6px; vertical-align: top;
  }
  table.items thead th {
    background: #f2f4f7; font-weight: 800; text-align: center; font-size: 10.5px;
    letter-spacing: 0.3px;
  }
  table.items td.c { text-align: center; }
  table.items td.num { text-align: right; font-variant-numeric: tabular-nums; }
  table.items td.desc { text-align: left; }
  table.items col.sn      { width: 6%; }
  table.items col.desc    { width: 34%; }
  table.items col.hsn     { width: 9%; }
  table.items col.unit    { width: 7%; }
  table.items col.qty     { width: 10%; }
  table.items col.rate    { width: 13%; }
  table.items col.total   { width: 15%; }

  .totals-row {
    display: grid; grid-template-columns: 1.35fr 1fr; gap: 0;
    border: 1px solid #111; border-top: 0;
  }
  .bank-block { padding: 6px 8px; border-right: 1px solid #111; font-size: 10.5px; line-height: 1.5; }
  .bank-block .h { font-weight: 800; margin-bottom: 4px; letter-spacing: 0.5px;
                   border-bottom: 1px dashed #666; padding-bottom: 2px; text-transform: uppercase; }
  .bank-block b { display: inline-block; min-width: 105px; }
  .tax-block {
    padding: 0;
  }
  .tax-block table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  .tax-block td { padding: 3px 8px; border-bottom: 1px solid #ddd; }
  .tax-block td.label { text-align: left; font-weight: 600; }
  .tax-block td.val { text-align: right; font-variant-numeric: tabular-nums; }
  .tax-block tr.grand td {
    background: #1f3a8a; color: #fff; font-size: 12px; font-weight: 800; border-bottom: 0;
    padding: 6px 8px;
  }

  .words {
    border: 1px solid #111; border-top: 0; padding: 5px 8px; font-size: 10.5px;
    background: #fafafa;
  }
  .words b { text-transform: uppercase; letter-spacing: 0.5px; margin-right: 4px; }

  .signatory {
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 20px;
    font-size: 10.5px;
  }
  .signatory .left { color: #555; }
  .signatory .right { text-align: right; }
  .signatory .right .sig-space { height: 40px; }
  .signatory .right b { font-weight: 800; }

  .footnote {
    margin-top: 14px; padding-top: 6px; border-top: 1px dashed #999;
    text-align: center; color: #666; font-size: 9.5px;
  }

  .badge-source {
    display: inline-block; padding: 1px 6px; font-size: 9px; font-weight: 800;
    letter-spacing: 0.5px; border-radius: 3px; margin-left: 6px;
    text-transform: uppercase;
  }
  .badge-source.historical { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }
  .badge-source.wcc { background: #dbeafe; color: #1e3a8a; border: 1px solid #3b82f6; }
  .badge-source.manual { background: #f3f4f6; color: #374151; border: 1px solid #9ca3af; }

  .paid-stamp {
    position: fixed; top: 42%; left: 50%; transform: translate(-50%, -50%) rotate(-18deg);
    font-size: 72px; font-weight: 900; color: rgba(16, 185, 129, 0.14);
    letter-spacing: 8px; pointer-events: none; z-index: 0;
  }

  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="invoice">

  ${inv.payment_status === "Paid" ? `<div class="paid-stamp">PAID</div>` : ""}

  <!-- Header -->
  <div class="company-hdr">
    <div class="brand">
      ${co.logo ? `<img src="${esc(co.logo)}" class="logo" alt="logo" />` : ""}
      <h1>${esc(co.name || "R K ENTERPRISES")}</h1>
      <div class="addr">${esc(co.address || "")}</div>
      <div class="addr">
        ${co.gstin ? `<b>GSTIN:</b> ${esc(co.gstin)}` : ""}
        ${co.pan ? ` &nbsp;·&nbsp; <b>PAN:</b> ${esc(co.pan)}` : ""}
      </div>
      <div class="addr">
        ${co.phone ? `<b>Mob:</b> ${esc(co.phone)}` : ""}
        ${co.email ? ` &nbsp;·&nbsp; <b>Email:</b> ${esc(co.email)}` : ""}
      </div>
    </div>
    <div class="meta">
      <div><span class="label">Dated:</span> <span class="val">${esc(fmtDate(inv.date))}</span></div>
      <div style="margin-top:4px"><span class="label">Invoice No. —</span> <span class="val">${esc(inv.invoice_no)}</span></div>
      ${
        inv.source
          ? `<div style="margin-top:6px"><span class="badge-source ${esc(inv.source)}">${esc(inv.source)}</span></div>`
          : ""
      }
    </div>
  </div>

  <div class="tax-invoice-title">TAX INVOICE</div>

  <!-- Billed To / Shipped To / Billed From -->
  <div class="party-row">
    <div class="party">
      <div class="h">Billed To</div>
      <div class="name">${esc(billTo.name)}</div>
      <div>${esc(billTo.address)}</div>
      <div class="kv"><b>GST No.:</b> ${esc(billTo.gstin)}</div>
      <div class="kv"><b>State:</b> ${esc(billTo.state)}</div>
      <div class="kv"><b>State Code:</b> ${esc(billTo.stateCode)}</div>
    </div>
    <div class="party">
      <div class="h">Shipped To</div>
      <div>${esc(shipTo.address)}</div>
      <div class="kv"><b>GST No.:</b> ${esc(shipTo.gstin)}</div>
      <div class="kv"><b>State:</b> ${esc(shipTo.state)}</div>
      <div class="kv"><b>State Code:</b> ${esc(shipTo.stateCode)}</div>
    </div>
    <div class="party">
      <div class="h">Billed From</div>
      <div class="name">${esc(co.name || "R K ENTERPRISES")}</div>
      <div>${esc(co.address || "")}</div>
      <div class="kv"><b>GST No.:</b> ${esc(co.gstin || "-")}</div>
      <div class="kv"><b>State:</b> ${esc(co.state || "-")}</div>
      <div class="kv"><b>State Code:</b> ${esc(co.state_code || "-")}</div>
    </div>
  </div>

  <!-- Item table -->
  <table class="items">
    <colgroup>
      <col class="sn" /><col class="desc" /><col class="hsn" />
      <col class="unit" /><col class="qty" /><col class="rate" /><col class="total" />
    </colgroup>
    <thead>
      <tr>
        <th>Sr. No.</th><th>Description</th><th>HSN</th><th>Unit</th>
        <th>Qty.</th><th>Rate</th><th>Total Amount</th>
      </tr>
    </thead>
    <tbody>
      ${linesHtml}
      ${padHtml}
    </tbody>
  </table>

  <!-- Bank + Tax summary -->
  <div class="totals-row">
    <div class="bank-block">
      <div class="h">Bank Details</div>
      <div><b>BANK NAME:</b> ${esc(co.bank_name || "-")}</div>
      <div><b>IFSC CODE:</b> ${esc(co.ifsc || "-")}</div>
      <div><b>ACCOUNT NUMBER:</b> ${esc(co.account_number || "-")}</div>
      <div><b>ACCOUNT NAME:</b> ${esc(co.account_name || co.name || "-")}</div>
      ${co.branch ? `<div><b>BRANCH:</b> ${esc(co.branch)}</div>` : ""}
    </div>
    <div class="tax-block">
      <table>
        <tr><td class="label">Subtotal</td><td class="val">₹ ${inr(inv.subtotal)}</td></tr>
        ${
          inv.is_igst
            ? `<tr><td class="label">IGST ${firstGst}%</td><td class="val">₹ ${inr(inv.igst)}</td></tr>`
            : `<tr><td class="label">SGST ${halfGst}%</td><td class="val">₹ ${inr(inv.sgst)}</td></tr>
               <tr><td class="label">CGST ${halfGst}%</td><td class="val">₹ ${inr(inv.cgst)}</td></tr>`
        }
        <tr><td class="label">Round Off</td><td class="val">₹ ${inr(inv.round_off)}</td></tr>
        <tr class="grand"><td>G. Total</td><td style="text-align:right">₹ ${inr(inv.grand_total)}</td></tr>
      </table>
    </div>
  </div>

  <!-- Amount in Words -->
  <div class="words">
    <b>In Words:</b> ${esc(words)}
  </div>

  <!-- Signatory -->
  <div class="signatory">
    <div class="left">
      ${inv.wcc_filename ? `<div><b>WCC Ref:</b> ${esc(inv.wcc_filename)}</div>` : ""}
      ${inv.notes ? `<div style="margin-top:6px">${esc(inv.notes)}</div>` : ""}
      ${inv.remarks ? `<div style="margin-top:6px"><i>${esc(inv.remarks)}</i></div>` : ""}
    </div>
    <div class="right">
      <div><b>For ${esc(co.name || "R K ENTERPRISES")}</b></div>
      <div class="sig-space"></div>
      <div>${esc(co.authorized_signatory || "Authorized Signatory")}</div>
    </div>
  </div>

  <div class="footnote">
    ${esc(co.invoice_footer || "")} · This is a computer-generated invoice.
  </div>

</div>
</body></html>`;
}

/** Open a print-ready window with the invoice. User can print or save-as-PDF. */
export function printInvoice(inv, company) {
  const html = renderInvoiceHTML(inv, company);
  const w = window.open("", "_blank", "width=980,height=1200");
  if (!w) {
    // popup blocked
    // eslint-disable-next-line no-alert
    alert("Please enable pop-ups to print/preview the invoice.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.write(
    `<script>window.onload=()=>{setTimeout(()=>window.print(),350)};<\/script>`
  );
  w.document.close();
}

/** Open a preview window WITHOUT auto-triggering print (for review before sending). */
export function previewInvoice(inv, company) {
  const html = renderInvoiceHTML(inv, company);
  const w = window.open("", "_blank", "width=980,height=1200");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
