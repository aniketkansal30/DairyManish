import { apiCall } from "./api";

const KEY = "dairy_pending_bills";
let syncing = false;
let rerun = false;

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