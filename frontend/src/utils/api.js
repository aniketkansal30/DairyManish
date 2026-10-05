import { API } from "./constants";

// ─── CLIENT-SIDE IN-MEMORY CACHE & REQUEST DEDUPLICATION ───────────────────────
const responseCache = new Map();
const inFlightRequests = new Map();

function getTtlForPath(path) {
  if (path.startsWith("/categories") || path.startsWith("/products")) return 60 * 1000;
  if (path.startsWith("/bills/analytics") || path.startsWith("/bills/item-report")) return 30 * 1000;
  if (path.startsWith("/bills/sales-summary")) return 20 * 1000;
  if (path.startsWith("/customers")) return 30 * 1000;
  if (path.startsWith("/bills")) return 15 * 1000;
  return 10 * 1000;
}

export function clearApiCache(prefix = "") {
  if (!prefix) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.includes(prefix)) {
      responseCache.delete(key);
    }
  }
}

export function prefetchApi(path) {
  if (responseCache.has(path)) {
    const entry = responseCache.get(path);
    if (Date.now() - entry.timestamp < entry.ttl) return Promise.resolve(entry.data);
  }
  return apiCall(path, "GET").catch(() => {});
}

// ─── API HELPER ───────────────────────────────────────────────────────────────
export async function apiCall(path, method = "GET", body = null, options = {}) {
  const isGet = method.toUpperCase() === "GET";
  const bypassCache = options.bypassCache === true;

  // 1. Check client-side memory cache for GET requests
  if (isGet && !bypassCache) {
    const cached = responseCache.get(path);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    // 2. In-flight request deduplication for GET requests
    if (inFlightRequests.has(path)) {
      return inFlightRequests.get(path);
    }
  }

  const token = localStorage.getItem("dairy_token");
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  if (body) opts.body = JSON.stringify(body);
    let timer;
  if (options.timeout) {
    const ctrl = new AbortController();
    opts.signal = ctrl.signal;
    timer = setTimeout(() => ctrl.abort(), options.timeout);
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(`${API}${path}`, opts);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Server error" }));
        const errMsg = err.error || `HTTP ${res.status}`;
        if (
          res.status === 401 ||
          errMsg === "Invalid or expired token" ||
          errMsg === "Login required" ||
          errMsg.toLowerCase().includes("token")
        ) {
          localStorage.removeItem("dairy_token");
          window.dispatchEvent(new Event("auth_expired"));
        }
        throw new Error(errMsg);
      }

      const data = await res.json();

      // Store successful GET in cache
      if (isGet) {
        responseCache.set(path, {
          data,
          timestamp: Date.now(),
          ttl: getTtlForPath(path),
        });
      } else {
        // Auto-invalidate cache on mutations
        if (path.includes("/bills")) clearApiCache("/bills");
        if (path.includes("/products")) clearApiCache("/products");
        if (path.includes("/categories")) {
          clearApiCache("/categories");
          clearApiCache("/products");
        }
        if (path.includes("/customers")) clearApiCache("/customers");

        window.dispatchEvent(
          new CustomEvent("dairy_data_changed", {
            detail: { path, method },
          })
        );
      }

      return data;
        } finally {
      if (timer) clearTimeout(timer);
      if (isGet) {
        inFlightRequests.delete(path);
      }
    }
  })();

  if (isGet && !bypassCache) {
    inFlightRequests.set(path, fetchPromise);
  }

  return fetchPromise;
}
