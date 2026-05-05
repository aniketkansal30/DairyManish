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
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}