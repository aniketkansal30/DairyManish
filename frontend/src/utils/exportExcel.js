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
export function exportToExcel(data, filename = "export") {
  if (!data || data.length === 0) {
    alert("Export ke liye koi data nahi hai.");
    return;
  }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}