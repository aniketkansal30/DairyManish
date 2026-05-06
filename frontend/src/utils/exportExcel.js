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

  const rows = data.map((b) => {
    const dt = new Date(b.date);
    const ist = new Date(dt.getTime() + 5.5 * 60 * 60 * 1000);
    const date = ist.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
    const time = ist.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();
    return {
      "Token ID": b.id,
      "Date": date,
      "Time": time,
      "Bill Total (₹)": parseFloat(b.total?.toFixed(2)),
      "Payment Mode": b.paymentMode || "CASH",
    };
  });

  const totalCash = rows.filter(r => r["Payment Mode"] === "CASH").reduce((s, r) => s + r["Bill Total (₹)"], 0);
  const totalUpi = rows.filter(r => r["Payment Mode"] === "UPI").reduce((s, r) => s + r["Bill Total (₹)"], 0);
  const grandTotal = rows.reduce((s, r) => s + r["Bill Total (₹)"], 0);

  const summaryRow = {
    "Token ID": `Total Bills: ${rows.length}`,
    "Date": `Cash: ₹${totalCash.toFixed(2)}`,
    "Time": `UPI: ₹${totalUpi.toFixed(2)}`,
    "Bill Total (₹)": parseFloat(grandTotal.toFixed(2)),
    "Payment Mode": "GRAND TOTAL",
  };

  const ws = XLSX.utils.json_to_sheet([summaryRow, {}, ...rows]);

  // Column widths
  ws["!cols"] = [
    { wch: 22 },
    { wch: 13 },
    { wch: 11 },
    { wch: 16 },
    { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();

  const dateLabel = data[0]?.date
    ? new Date(new Date(data[0].date).getTime() + 5.5 * 60 * 60 * 1000)
        .toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
        .replace(/\//g, "-")
    : filter;

  XLSX.utils.book_append_sheet(wb, ws, `Sales ${dateLabel}`);
  XLSX.writeFile(wb, `Sales_${dateLabel}.xlsx`);
}