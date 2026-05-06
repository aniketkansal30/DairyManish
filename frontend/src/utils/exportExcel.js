import { API } from "./constants";
import * as XLSX from "xlsx";

// ─── API HELPER ───────────────────────────────────────────────────────────────
export async function apiCall(path, method = "GET", body = null) {
  const token = localStorage.getItem("dairy_token");
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API}${path}`, opts);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Server error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── EXPORT TO EXCEL ──────────────────────────────────────────────────────────
export function exportToExcel(data, filter = "export") {
  if (!data || data.length === 0) {
    alert("Export ke liye koi data nahi hai.");
    return;
  }

  const toIST = (dateStr) => new Date(new Date(dateStr).getTime() + 5.5 * 60 * 60 * 1000);

  const rows = data.map((b) => {
  const ist = toIST(b.date);
  const date = ist.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = ist.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();

  // ✅ Items column: "Milk x2, Curd x1, Paneer x0.5kg"
  const itemsStr = (b.items || [])
    .map((item) => {
      const qty = item.unit === "kg"
        ? item.qty < 1 ? `${Math.round(item.qty * 1000)}g` : `${+item.qty.toFixed(2)}kg`
        : item.unit === "litre"
        ? item.qty < 1 ? `${Math.round(item.qty * 1000)}ml` : `${+item.qty.toFixed(2)}L`
        : `x${item.qty}`;
      return `${item.name} ${qty}`;
    })
    .join(", ");

  return {
    "Token ID": b.id,
    "Date": date,
    "Time": time,
    "Items": itemsStr,                          // ✅ New column
    "Bill Total (₹)": Math.round(b.total),
    "Payment Mode": b.paymentMode || "CASH",
  };
});

  const totalCash = rows.filter(r => r["Payment Mode"] === "CASH").reduce((s, r) => s + r["Bill Total (₹)"], 0);
  const totalUpi  = rows.filter(r => r["Payment Mode"] === "UPI").reduce((s, r)  => s + r["Bill Total (₹)"], 0);
  const grandTotal = rows.reduce((s, r) => s + r["Bill Total (₹)"], 0);

  const summaryRow = {
  "Token ID": `Total Bills: ${rows.length}`,
  "Date": `Cash: ₹${totalCash}`,
  "Time": `UPI: ₹${totalUpi}`,
  "Items": "",                    // ✅ blank
  "Bill Total (₹)": grandTotal,
  "Payment Mode": "GRAND TOTAL",
};

  const ws = XLSX.utils.json_to_sheet([summaryRow, {}, ...rows]);
  ws["!cols"] = [
  { wch: 22 }, // Token ID
  { wch: 13 }, // Date
  { wch: 11 }, // Time
  { wch: 40 }, // Items ✅ wide column
  { wch: 16 }, // Bill Total
  { wch: 14 }, // Payment Mode
];

  const wb = XLSX.utils.book_new();

  // ✅ Fix: IST date from first bill for filename
  const fileDate = data[0]?.date
    ? toIST(data[0].date)
        .toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
        .replace(/\//g, "-")
    : filter;

  XLSX.utils.book_append_sheet(wb, ws, `Sales ${fileDate}`);
  XLSX.writeFile(wb, `Sales_${fileDate}.xlsx`);
}