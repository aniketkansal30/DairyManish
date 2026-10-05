import { apiCall } from "./api";

const KEY = "dairy_pending_bills";
let syncing = false;
let rerun = false;

export function getPending() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
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

function isNetworkError(e) {
  return (
    e?.name === "AbortError" ||
    e?.name === "TypeError" ||
    !navigator.onLine ||
    /failed to fetch|network|load failed/i.test(e?.message || "")
  );
}

export async function syncPending() {
  if (syncing) { rerun = true; return; }
  if (!localStorage.getItem("dairy_token")) return;
  syncing = true;
  try {
    do {
      rerun = false;
      for (const bill of getPending()) {
        try {
          await apiCall("/bills", "POST", bill, { timeout: 15000 });
          savePending(getPending().filter((b) => b.id !== bill.id));
        } catch (e) {
          if (isNetworkError(e)) { rerun = false; return; }
          if (!localStorage.getItem("dairy_token")) { rerun = false; return; }
        }
      }
    } while (rerun);
  } finally {
    syncing = false;
  }
}