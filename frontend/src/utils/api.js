import { API } from "./constants";

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
    const errMsg = err.error || `HTTP ${res.status}`;
    if (res.status === 401 || errMsg === "Invalid or expired token" || errMsg === "Login required" || errMsg.toLowerCase().includes("token")) {
      localStorage.removeItem("dairy_token");
      window.dispatchEvent(new Event("auth_expired"));
    }
    throw new Error(errMsg);
  }

  return res.json();
}