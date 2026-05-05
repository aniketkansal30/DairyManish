// ─── UTILITY FUNCTIONS ────────────────────────────────────────────────────────

export function formatINR(n) {
  return "₹" + Math.round(Number(n)).toLocaleString("en-IN");
}

export function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatTime(d) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function thisMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function formatQty(qty, unit) {
  if (unit === "kg") return qty < 1 ? `${Math.round(qty * 1000)} g` : `${+qty.toFixed(3)} kg`;
  if (unit === "litre") return qty < 1 ? `${Math.round(qty * 1000)} ml` : `${+qty.toFixed(3)} L`;
  return `${qty} ${unit}`;
}