import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { formatDate, formatTime, today } from "./helpers";

function formatItems(items) {
  return items.map((i) => {
    const qty = i.unit === "kg" || i.unit === "litre"
      ? `${i.qty * 1000}ml`.replace("000ml", "L").replace(/(\d+)ml/, (_, n) => n >= 1000 ? `${n/1000}L` : `${n}ml`)
      : `x${i.qty}`;
    return `${i.name} ${qty}`;
  }).join(", ");
}

export function exportToExcel(bills, filterLabel) {
 const totalCash = Math.round(bills.filter((b) => (b.paymentMode || "CASH") === "CASH").reduce((s, b) => s + b.total, 0));
const totalUPI  = Math.round(bills.filter((b) => b.paymentMode === "UPI").reduce((s, b) => s + b.total, 0));
const grandTotal = Math.round(bills.reduce((s, b) => s + b.total, 0));


  // Row 1: Summary
  const summaryRow = {
    "Token ID": `Total Bills: ${bills.length}`,
    "Date": `Cash: ₹${totalCash}`,
    "Time": `UPI: ₹${totalUPI}`,
    "Items": `Grand Total: ₹${grandTotal}`,
    "Bill Total (₹)": "",
    "Payment Mode": "",
  };

  // Bill rows
  const rows = bills.map((b) => ({
    "Token ID": `#${b.id?.slice(-3)}`,
    "Date": formatDate(b.date),
    "Time": formatTime(b.date),
    "Items": formatItems(b.items || []),
   "Bill Total (₹)": Math.round(b.total),
    "Payment Mode": b.paymentMode || "CASH",
  }));

  const ws = XLSX.utils.json_to_sheet([summaryRow, ...rows]);
  ws["!cols"] = [
    { wch: 14 }, { wch: 14 }, { wch: 10 },
    { wch: 50 }, { wch: 14 }, { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  const sheetName = `Sales ${filterLabel}`;
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buf], { type: "application/octet-stream" }),
   `Sales_${filterLabel}_${today()}.xlsx`
  );
}