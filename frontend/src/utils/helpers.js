export function formatINR(n) {
  return "₹" + Math.round(Number(n)).toLocaleString("en-IN");
}

export function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export function formatTime(d) {
  return new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function today() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function thisMonth() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);
}

export function formatQty(qty, unit) {
  if (unit === "kg")
    return qty < 1 ? `${Math.round(qty * 1000)} g` : `${+qty.toFixed(3)} kg`;
  if (unit === "litre")
    return qty < 1 ? `${Math.round(qty * 1000)} ml` : `${+qty.toFixed(3)} L`;
  return `${qty} ${unit}`;
}