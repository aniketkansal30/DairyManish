import { useState, useEffect } from "react";
import Icon from "./Icon";
import { formatINR, formatDate, formatTime, today, thisMonth } from "../utils/helpers";
import { apiCall } from "../utils/api";
import { exportToExcel } from "../utils/exportExcel";
import { printBill } from "../utils/printBill";

// ─── SALES VIEW ───────────────────────────────────────────────────────────────
export default function SalesView({ bills: initialBills, onDelete, onDeleteAll, onEdit, products }) {
  const [filter, setFilter] = useState("today");
  const [customDate, setCustomDate] = useState("");
  const [bills, setBills] = useState(initialBills);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [editingBill, setEditingBill] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [editSaving, setEditSaving] = useState(false);
  const [payFilter, setPayFilter] = useState("ALL");

  useEffect(() => {
    async function fetchBills() {
      let path = "/bills";
      if (filter === "today") path = `/bills?date=${today()}`;
      else if (filter === "yesterday")
        path = `/bills?date=${new Date(Date.now() - 86400000).toISOString().slice(0, 10)}`;
      else if (filter === "month") path = `/bills?month=${thisMonth()}`;
      else if (filter === "custom" && customDate) path = `/bills?date=${customDate}`;
      setLoading(true);
      try {
        const data = await apiCall(path);
        setBills(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchBills();
  }, [filter, customDate]);

  const openEdit = (bill) => {
    setEditingBill(bill);
    setEditItems(bill.items.map((i) => ({ ...i })));
  };

  const updateEditQty = (itemId, qty) => {
    if (qty <= 0) {
      setEditItems((prev) => prev.filter((i) => i.id !== itemId));
    } else {
      setEditItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, qty, total: qty * i.price } : i))
      );
    }
  };

  const addEditItem = (product) => {
    const exists = editItems.find((i) => i.id === product.id);
    if (exists) {
      updateEditQty(product.id, exists.qty + 1);
    } else {
      setEditItems((prev) => [...prev, { ...product, qty: 1, total: product.price }]);
    }
  };

  const saveEdit = async () => {
    if (!editItems.length) { alert("Bill mein kam se kam 1 item hona chahiye!"); return; }
    setEditSaving(true);
    const ok = await onEdit(editingBill.id, editItems, 0);
    if (ok) setEditingBill(null);
    setEditSaving(false);
  };

  const filtered = bills.filter((b) => {
    if (payFilter !== "ALL" && (b.paymentMode || "CASH") !== payFilter) return false;
    return true;
  });

  const totalSales = filtered.reduce((s, b) => s + b.total, 0);
  const totalDiscount = filtered.reduce((s, b) => s + (b.discountAmt || 0), 0);

  const labels = {
    today: "Today",
    yesterday: "Yesterday",
    month: "This Month",
    all: "All Time",
    custom: customDate || "Custom",
  };

  const toggleSelect = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const deleteSelected = async () => {
    if (!selected.length) return;
    const pass = prompt("Admin Password Enter Karo:");
    if (pass !== "aniket123") { alert("❌ Wrong Password!"); return; }
    if (!window.confirm(`${selected.length} bills delete karne hain?`)) return;
    for (const id of selected) {
      await onDelete(id);
    }
    setSelected([]);
  };

  const deleteAll = () => {
    if (!window.confirm("Saari history delete karna chahte ho? Yeh action undo nahi hoga!")) return;
    onDeleteAll();
    setSelected([]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header + filters */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1310" }}>💰 Sales Overview</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["today", "yesterday", "month", "all"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ padding: "8px 18px", borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: "pointer", border: "1.5px solid", borderColor: filter === f ? "#f59e0b" : "#e5e0d8", background: filter === f ? "#f59e0b" : "#fff", color: filter === f ? "#1a1310" : "#8a7e6e" }}
            >
              {labels[f]}
            </button>
          ))}
          <input
            type="date"
            value={customDate}
            onChange={(e) => { setCustomDate(e.target.value); setFilter("custom"); }}
            style={{ padding: "8px 12px", borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: "pointer", border: `1.5px solid ${filter === "custom" ? "#f59e0b" : "#e5e0d8"}`, background: filter === "custom" ? "#fff8ee" : "#fff", color: "#1a1310", outline: "none" }}
          />
          <div style={{ width: 1, height: 24, background: "#e5e0d8" }} />
          {["ALL", "CASH", "UPI"].map((pm) => (
            <button
              key={pm}
              onClick={() => setPayFilter(pm)}
              style={{ padding: "8px 18px", borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: "pointer", border: "1.5px solid", borderColor: payFilter === pm ? "#2563eb" : "#e5e0d8", background: payFilter === pm ? "#2563eb" : "#fff", color: payFilter === pm ? "#fff" : "#8a7e6e" }}
            >
              {pm === "ALL" ? "💳 All" : pm === "CASH" ? "💵 Cash" : "📲 UPI"}
            </button>
          ))}
          {selected.length > 0 && (
            <button onClick={deleteSelected} style={{ padding: "8px 18px", borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: "pointer", border: "1.5px solid #ef4444", background: "#ef4444", color: "#fff" }}>
              🗑️ Delete Selected ({selected.length})
            </button>
          )}
          <button onClick={deleteAll} style={{ padding: "8px 18px", borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: "pointer", border: "1.5px solid #ef4444", background: "#fff", color: "#ef4444" }}>
            🗑️ Delete All
          </button>
        </div>
        <button onClick={() => exportToExcel(filtered, filter)} style={{ padding: "8px 18px", borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: "pointer", border: "1.5px solid #16a34a", background: "#f0fdf4", color: "#16a34a" }}>
          📊 Export Excel
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
        {[
          { label: "Total Sales", value: formatINR(totalSales), color: "#2563eb", icon: "💳", sub: `${filtered.length} bills` },
          { label: "Total Profit", value: "₹0.00", color: "#16a34a", icon: "📈", sub: "" },
          { label: "Discount Given", value: formatINR(totalDiscount), color: "#f59e0b", icon: "🏷️", sub: `${filtered.filter((b) => b.discountPct > 0).length} discounted bills` },
          { label: "Avg Bill Value", value: filtered.length ? formatINR(totalSales / filtered.length) : "₹0.00", color: "#7c3aed", icon: "🧾", sub: "per bill" },
        ].map((k) => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 16, padding: "20px", border: "1px solid #e5e0d8" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8a7e6e", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: k.color, marginBottom: 2 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "#8a7e6e" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Cash / UPI split */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {[
          { label: "Cash Sales", value: formatINR(filtered.filter((b) => (b.paymentMode || "CASH") === "CASH").reduce((s, b) => s + b.total, 0)), color: "#16a34a", icon: "💵", sub: `${filtered.filter((b) => (b.paymentMode || "CASH") === "CASH").length} bills` },
          { label: "UPI Sales", value: formatINR(filtered.filter((b) => b.paymentMode === "UPI").reduce((s, b) => s + b.total, 0)), color: "#2563eb", icon: "📲", sub: `${filtered.filter((b) => b.paymentMode === "UPI").length} bills` },
        ].map((k) => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 16, padding: "20px", border: "1px solid #e5e0d8" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8a7e6e", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: k.color, marginBottom: 2 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "#8a7e6e" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Bills list */}
      <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e0d8", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e0d8", fontSize: 14, fontWeight: 800, color: "#1a1310" }}>
          🧾 Bills — {labels[filter]}
        </div>
        {loading && <div style={{ textAlign: "center", padding: "40px 0", fontSize: 15, color: "#8a7e6e" }}>⏳ Data load ho raha hai...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", color: "#c9b9a8", padding: "40px 0", fontSize: 14 }}>
            Koi bill nahi {labels[filter].toLowerCase()} mein
          </div>
        )}
        {filtered.map((b, i) => (
          <div
            key={b.id}
            style={{ display: "flex", alignItems: "center", padding: "13px 20px", borderTop: i > 0 ? "1px solid #f0ebe4" : "none", gap: 16, flexWrap: "wrap", background: selected.includes(b.id) ? "#fff8ee" : "transparent" }}
          >
            <input type="checkbox" checked={selected.includes(b.id)} onChange={() => toggleSelect(b.id)} style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1310" }}>{b.id}</div>
              <div style={{ fontSize: 11, color: "#8a7e6e" }}>{formatDate(b.date)} · {formatTime(b.date)}</div>
            </div>
            {b.customer?.name && <div style={{ fontSize: 12, color: "#4a3f35" }}>👤 {b.customer.name}</div>}
            <div style={{ fontSize: 12, color: "#8a7e6e" }}>{b.items?.length} items</div>
            {b.discountPct > 0 && <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>🏷️ {b.discountPct}% off</div>}
            <div style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 20, background: (b.paymentMode || "CASH") === "UPI" ? "#eff6ff" : "#f0fdf4", color: (b.paymentMode || "CASH") === "UPI" ? "#2563eb" : "#16a34a" }}>
              {(b.paymentMode || "CASH") === "UPI" ? "📲 UPI" : "💵 CASH"}
            </div>
            <div style={{ textAlign: "right" }}>{formatINR(b.total)}</div>
            <button onClick={() => openEdit(b)} style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid #2563eb", background: "#eff6ff", cursor: "pointer", fontSize: 11, color: "#2563eb", fontWeight: 700, display: "flex", gap: 4, alignItems: "center" }}>
              <Icon name="edit" size={12} /> Edit
            </button>
            <button onClick={() => printBill(b)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e0d8", background: "#fff", cursor: "pointer", fontSize: 11, color: "#4a3f35", display: "flex", gap: 4, alignItems: "center" }}>
              <Icon name="print" size={12} /> Print
            </button>
            <button onClick={() => { if (window.confirm("Yeh bill delete karein?")) onDelete(b.id); }} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fff", cursor: "pointer", fontSize: 11, color: "#ef4444", display: "flex", gap: 4, alignItems: "center" }}>
              <Icon name="trash" size={12} /> Delete
            </button>
          </div>
        ))}
      </div>

      {/* Edit bill modal */}
      {editingBill && (
        <>
          <div onClick={() => setEditingBill(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 20, padding: 28, width: 520, maxHeight: "85vh", overflowY: "auto", zIndex: 301, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#1a1310" }}>✏️ Edit Bill — {editingBill.id}</div>
                <div style={{ fontSize: 12, color: "#8a7e6e" }}>{formatDate(editingBill.date)} · {formatTime(editingBill.date)}</div>
              </div>
              <button onClick={() => setEditingBill(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8a7e6e" }}>
                <Icon name="close" size={20} />
              </button>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: "#8a7e6e", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Items</div>
            <div style={{ background: "#f8f5f0", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
              {editItems.map((item, i) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderTop: i > 0 ? "1px solid #e5e0d8" : "none" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1310" }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: "#8a7e6e" }}>₹{item.price}/{item.unit}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => updateEditQty(item.id, +(item.qty - (item.unit === "piece" ? 1 : 0.25)).toFixed(3))} style={{ width: 30, height: 30, borderRadius: 8, border: "1.5px solid #e5e0d8", background: "#fff", cursor: "pointer", fontWeight: 900, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                    <input type="number" value={item.qty} min="0" step={item.unit === "piece" ? 1 : 0.25} onChange={(e) => updateEditQty(item.id, +e.target.value)} style={{ width: 64, textAlign: "center", padding: "6px", border: "1.5px solid #e5e0d8", borderRadius: 8, fontSize: 14, fontWeight: 800, outline: "none" }} />
                    <button onClick={() => updateEditQty(item.id, +(item.qty + (item.unit === "piece" ? 1 : 0.25)).toFixed(3))} style={{ width: 30, height: 30, borderRadius: 8, border: "1.5px solid #e5e0d8", background: "#fff", cursor: "pointer", fontWeight: 900, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>
                  <div style={{ width: 80, textAlign: "right", fontSize: 13, fontWeight: 800, color: "#2563eb" }}>{formatINR(item.qty * item.price)}</div>
                  <button onClick={() => updateEditQty(item.id, 0)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4 }}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              ))}
              {editItems.length === 0 && <div style={{ padding: "20px", textAlign: "center", color: "#c9b9a8", fontSize: 13 }}>Koi item nahi — neeche se add karo</div>}
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: "#8a7e6e", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Naya Item Add Karo</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20, maxHeight: 150, overflowY: "auto" }}>
              {products.map((p) => (
                <button key={p.id} onClick={() => addEditItem(p)} style={{ padding: "6px 12px", borderRadius: 20, border: "1.5px solid #e5e0d8", background: editItems.find((i) => i.id === p.id) ? "#1a1310" : "#f8f5f0", color: editItems.find((i) => i.id === p.id) ? "#f59e0b" : "#4a3f35", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  + {p.name} ₹{p.price}
                </button>
              ))}
            </div>

            {(() => {
              const sub = editItems.reduce((s, i) => s + i.qty * i.price, 0);
              const tot = sub;
              const diff = tot - editingBill.total;
              return (
                <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8a7e6e", marginBottom: 4 }}>
                    <span>Subtotal</span><span>{formatINR(sub)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 900, color: "#1a1310", borderTop: "1px solid #bae6fd", paddingTop: 8, marginTop: 4 }}>
                    <span>New Total</span><span style={{ color: "#2563eb" }}>{formatINR(tot)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 6, fontWeight: 700, color: diff >= 0 ? "#16a34a" : "#ef4444" }}>
                    <span>Sales Change</span><span>{diff >= 0 ? "+" : ""}{formatINR(diff)}</span>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setEditingBill(null)} style={{ flex: "0 0 44px", height: 46, borderRadius: 10, border: "1px solid #e5e0d8", background: "#fff", cursor: "pointer", color: "#8a7e6e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="close" size={16} />
              </button>
              <button onClick={saveEdit} disabled={editSaving} style={{ flex: 1, padding: "13px", background: "#1a1310", color: "#f59e0b", border: "none", borderRadius: 10, fontWeight: 900, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: editSaving ? 0.7 : 1 }}>
                <Icon name="save" size={16} /> {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}