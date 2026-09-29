const store = new Map();
module.exports = {
  get(k) {
    const e = store.get(k);
    if (e && e.exp > Date.now()) return e.v;
    store.delete(k);
    return null;
  },
  set(k, v, ttlMs) { store.set(k, { v, exp: Date.now() + ttlMs }); },
  clear(prefix = "") {
    for (const k of [...store.keys()]) if (k.startsWith(prefix)) store.delete(k);
  },
};