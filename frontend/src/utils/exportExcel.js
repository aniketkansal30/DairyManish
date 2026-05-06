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
export function exportToExcel(data, filter = "export", overrideDate = null) {
  if (!data || data.length === 0) {
    alert("Export ke liye koi data nahi hai.");
    return;
  }

  const toIST = (dateStr) => new Date(new Date(dateStr).getTime() + 5.5 * 60 * 60 * 1000);

  const rows = data.map((b) => {
    const ist = toIST(b.date);
    const dd = String(ist.getDate()).padStart(2, "0");
    const mm = String(ist.getMonth() + 1).padStart(2, "0");
    const yyyy = ist.getFullYear();
    const date = `${dd}/${mm}/${yyyy}`; const time = ist.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();

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
      "Token ID": `#${String(b.id).slice(-3)}`,   // ✅ #602 format
      "Date": date,
      "Time": time,
      "Items": itemsStr,
      "Bill Total (₹)": Math.round(b.total),
      "Payment Mode": b.paymentMode || "CASH",
    };
  });

  const totalCash = rows.filter(r => r["Payment Mode"] === "CASH").reduce((s, r) => s + r["Bill Total (₹)"], 0);
  const totalUpi = rows.filter(r => r["Payment Mode"] === "UPI").reduce((s, r) => s + r["Bill Total (₹)"], 0);
  const grandTotal = rows.reduce((s, r) => s + r["Bill Total (₹)"], 0);

  // ✅ Summary ek row mein upar, phir blank, phir headings + data
  const summaryRow = {
    "Token ID": `Total Bills: ${rows.length}`,
    "Date": `Cash: ₹${totalCash}`,
    "Time": `UPI: ₹${totalUpi}`,
    "Items": `Grand Total: ₹${grandTotal}`,
    "Bill Total (₹)": "",
    "Payment Mode": "",
  };

  const ws = XLSX.utils.json_to_sheet([summaryRow, {}, ...rows]);

  ws["!cols"] = [
    { wch: 10 }, // Token ID — #602 format, chhota
    { wch: 13 }, // Date
    { wch: 11 }, // Time
    { wch: 42 }, // Items
    { wch: 14 }, // Bill Total
    { wch: 14 }, // Payment Mode
  ];

  const wb = XLSX.utils.book_new();

  // ✅ Filename fix — pehle bill ki IST date use karo
  const fileDate = overrideDate
    ? overrideDate.split("-").reverse().join("-")
    : data[0]?.date
      ? toIST(data[0].date)
        .toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
        .replace(/\//g, "-")
      : filter;

  XLSX.utils.book_append_sheet(wb, ws, `Sales ${fileDate}`);
  XLSX.writeFile(wb, `Sales_${fileDate}.xlsx`);
}