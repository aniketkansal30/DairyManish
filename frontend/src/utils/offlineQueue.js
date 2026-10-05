import { apiCall } from "./api";

const KEY = "dairy_pending_bills";
let syncing = false;

export function getPending() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}

function savePending(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("offline_queue_changed"));
}

export function queueBill(bill) {
  const list = getPending();
  if (!list.some((b) => b.id === bill.id)) {
    list.push(bill);
    savePending(list);
  }
}

// fetch fail (net nahi) ya timeout = network error. Server ka HTTP error alag hai.
export function isNetworkError(e) {
  return e instanceof TypeError || e?.name === "AbortError" || e?.name === "TimeoutError";
}

export async function syncPending() {
  if (syncing) return;
  if (!localStorage.getItem("dairy_token")) return;
  syncing = true;
  try {
    for (const bill of getPending()) {
      try {
        await apiCall("/bills", "POST", bill, { timeout: 15000 });
        savePending(getPending().filter((b) => b.id !== bill.id));
      } catch (e) {
        if (isNetworkError(e)) break;                       // net abhi bhi nahi, baad me try
        if (!localStorage.getItem("dairy_token")) break;    // session expire, login ke baad sync
        // koi aur server error: ye bill queue me rahega, agla bill try karo
      }
    }
  } finally {
    syncing = false;
  }
}