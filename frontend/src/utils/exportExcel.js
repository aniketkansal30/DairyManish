import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { formatDate, formatTime } from "./helpers";

function formatItems(items) {
  return items.map((i) => {
    let qty;
    if (i.unit === "kg") {
      qty = i.qty >= 1 ? `${i.qty}kg` : `${Math.round(i.qty * 1000)}g`;
    } else if (i.unit === "litre") {
      qty = i.qty >= 1 ? `${i.qty}L` : `${Math.round(i.qty * 1000)}ml`;
    } else {
      qty = `x${i.qty}`;
    }
    return `${i.name} ${qty}`;
  }).join(", ");
}

export function exportToExcel(bills, filter, customDate) {
  const totalCash = Math.round(bills.filter((b) => (b.paymentMode || "CASH") === "CASH").reduce((s, b) => s + b.total, 0));
  const totalUPI  = Math.round(bills.filter((b) => b.paymentMode === "UPI").reduce((s, b) => s + b.total, 0));
  const grandTotal = Math.round(bills.reduce((s, b) => s + b.total, 0));

  const summaryRow = {
    "Token ID": `Total Bills: ${bills.length}`,
    "Date": `Cash: ₹${totalCash}`,
    "Time": `UPI: ₹${totalUPI}`,
    "Items": `Grand Total: ₹${grandTotal}`,
    "Bill Total (₹)": "",
    "Payment Mode": "",
  };

  const rows = [...bills]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((b) => ({
      "Token ID": `#${b.id?.slice(-3)}`,
      "Date": formatDate(b.date),
      "Time": formatTime(b.date),
      "Items": formatItems(b.items || []),
      "Bill Total (₹)": Math.round(b.total),
      "Payment Mode": b.paymentMode || "CASH",
    }));

  const ws = XLSX.utils.json_to_sheet([summaryRow, ...rows]);
  ws["!cols"] = [
    { wch: 12 }, { wch: 14 }, { wch: 10 },
    { wch: 55 }, { wch: 14 }, { wch: 12 },
  ];

  // File naam
  const todayIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  let fileDate;
  if (filter === "today") fileDate = todayIST;
  else if (filter === "yesterday") fileDate = new Date(Date.now() + 5.5 * 60 * 60 * 1000 - 86400000).toISOString().slice(0, 10);
  else if (filter === "month") fileDate = todayIST.slice(0, 7);
  else if (filter === "custom" && customDate) fileDate = customDate;
  else fileDate = todayIST;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Sales ${fileDate}`.slice(0, 31));

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buf], { type: "application/octet-stream" }),
    `Sales_${fileDate}.xlsx`
  );
}