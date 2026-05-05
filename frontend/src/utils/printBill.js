import { formatDate, formatTime, formatQty } from "./helpers";

// ─── BILL PRINT ───────────────────────────────────────────────────────────────
export function printBill(bill) {
  const w = window.open("", "_blank", "width=302,height=600");
  w.document.write(`<!DOCTYPE html><html><head><style>
    @page { margin: 0; size: 80mm auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 13px; width: 80mm; padding: 4mm; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .center { text-align: center; }
    .bold { font-weight: 900; }
    .big { font-size: 22px; font-weight: 900; letter-spacing: 1px; }
    .shop-sub { font-size: 13px; font-weight: 900; }
    .shop-addr { font-size: 12px; font-weight: 700; }
    .divider-solid { border-top: 2px solid #000; margin: 4px 0; }
    .divider-dash { border-top: 1px dashed #000; margin: 4px 0; }
    .row { display: flex; justify-content: space-between; padding: 2px 0; color: #000; font-weight: 700; }
    .row-3 { display: flex; padding: 3px 0; color: #000; }
    .col-name { flex: 2.2; font-size: 17px; font-weight: 900; color: #000; }
    .col-qty { flex: 1; text-align: center; font-size: 17px; font-weight: 900; color: #000; }
    .col-amt { flex: 1; text-align: right; font-size: 17px; font-weight: 900; color: #000; }
    .header-row { font-size: 17px; font-weight: 900; color: #000; }
    .total-row { display: flex; justify-content: space-between; font-size: 18px; font-weight: 900; padding: 4px 0; color: #000; }
    .payment-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; padding: 2px 0; color: #000; }
    .footer { text-align: center; font-size: 12px; margin-top: 4px; font-weight: 700; color: #000; }
    @media print { button { display: none !important; } * { color: #000 !important; } }
  </style></head><body>

  <div class="center bold big">MANISH DAIRY</div>
  <div class="center shop-sub">SWEETS AND NAMKEEN</div>
  <div class="center shop-addr">24/1, Basant Vihar, Jail Chungi, Meerut</div>
  <div class="divider-solid"></div>

  <div class="row"><span>Date:</span><span>${formatDate(bill.date)} ${formatTime(bill.date)}</span></div>
  <div class="row"><span>Token No:</span><span>${bill.id}</span></div>
  ${bill.customer?.name ? `<div class="row"><span>Customer:</span><span>${bill.customer.name}</span></div>` : ""}
  ${bill.customer?.phone ? `<div class="row"><span>Phone:</span><span>${bill.customer.phone}</span></div>` : ""}

  <div class="divider-solid"></div>
  <div class="row-3 header-row bold">
    <span class="col-name">Item</span>
    <span class="col-qty">Qty</span>
    <span class="col-amt">Amt</span>
  </div>
  <div class="divider-dash"></div>

  ${bill.items
    .map(
      (i) => `
    <div class="row-3">
      <span class="col-name">${i.name}</span>
      <span class="col-qty">${formatQty(i.qty, i.unit)}</span>
      <span class="col-amt">₹${Math.round(i.total)}</span>
    </div>
  `
    )
    .join("")}

  <div class="divider-dash"></div>
  ${
    bill.discountPct > 0
      ? `
   <div class="row"><span>Subtotal</span><span>₹${Math.round(bill.subtotal)}</span></div>
    <div class="row bold"><span>Discount (${bill.discountPct}%)</span><span>-₹${Math.round(bill.discountAmt)}</span></div>
  `
      : ""
  }
  <div class="divider-solid"></div>
  <div class="total-row"><span>TOTAL</span><span>₹${Math.round(bill.total)}</span></div>
  <div class="divider-solid"></div>
  <div class="payment-row"><span>Payment:</span><span>${bill.paymentMode || "CASH"}</span></div>

  <div class="divider-dash"></div>
  <div class="footer">Thank you!! Please Visit Again!!</div>
  <br/>
  </body></html>`);
  w.document.close();
  setTimeout(() => {
    w.print();
    w.close();
  }, 500);
}