import { useState, useEffect } from "react";
import Icon from "./Icon";
import { formatINR, formatDate, formatTime, today, thisMonth } from "../utils/helpers";
import { apiCall } from "../utils/api";
import { exportToExcel } from "../utils/exportExcel";
import { printBill } from "../utils/printBill";

// ─── SALES VIEW ───────────────────────────────────────────────────────────────
export default function SalesView({ bills: initialBills, onDelete, onDeleteAll, onEdit, products, setView, onLoadEdit }) {
  const [filter, setFilter] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bills, setBills] = useState(initialBills);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [payFilter, setPayFilter] = useState("ALL");
  const [cache, setCache] = useState({});

  // ─── Fetch bills from backend ──────────────────────────────────────────────
  useEffect(() => {
    async function fetchBills() {
      let path = "/bills";
      const todayIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const yesterdayIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000 - 86400000).toISOString().slice(0, 10);
      if (filter === "today") path = `/bills?date=${todayIST}`;
      else if (filter === "yesterday") path = `/bills?date=${yesterdayIST}`;
      else if (filter === "month") path = `/bills?month=${thisMonth()}`;
      else if (filter === "all") path = `/bills`;
      else if (filter === "custom" && startDate) path = `/bills?date=${startDate}&endDate=${endDate || startDate}`;
      else return;

      const cacheKey = path;

      // Today ka cache 30 sec baad expire, baaki filters ka 5 min
      const cacheTTL = filter === "today" ? 30000 : 300000;
      const cached = cache[cacheKey];
       if (cached && Date.now() - cached.time < cacheTTL) {
        setBills(cached.data);
        return;
      }

      setLoading(true);
      try {
  const data = await apiCall(path);
  if (filter === "today" || filter === "yesterday") {
    const dateStr = filter === "today"
      ? new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : new Date(Date.now() + 5.5 * 60 * 60 * 1000 - 86400000).toISOString().slice(0, 10);
    const istFiltered = data.filter(b => {
      const ist = new Date(new Date(b.date).getTime() + 5.5 * 60 * 60 * 1000);
      return `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, "0")}-${String(ist.getDate()).padStart(2, "0")}` === dateStr;
    });
    setBills(istFiltered);
  } else {
    // custom, month, all — backend se jo aaya seedha set karo
    setBills(data);
  }
  setCache((prev) => ({ ...prev, [cacheKey]: { data, time: Date.now() } }));
} catch (e) {
  console.error(e);
} finally {
  setLoading(false);
} 
    }
    fetchBills();
  }, [filter, startDate, endDate]);

  // ─── Filter by payment mode + custom date range ────────────────────────────
  const filtered = bills.filter((b) => {
    if (payFilter !== "ALL" && (b.paymentMode || "CASH") !== payFilter) return false;
    if (filter === "custom") {
      const d = b.date?.slice(0, 10);
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
    }
    return true;
  });

  const totalSales = filtered.reduce((s, b) => s + b.total, 0);
  const totalDiscount = filtered.reduce((s, b) => s + (b.discountAmt || 0), 0);

  const labels = {
    today: "Today",
    yesterday: "Yesterday",
    month: "This Month",
    all: "All Time",
    custom: startDate && endDate ? `${startDate} → ${endDate}` : startDate ? `From ${startDate}` : "Custom Range",
  };

  const toggleSelect = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const deleteSelected = async () => {
    if (!selected.length) return;
    const pass = prompt("Admin Password Enter Karo:");
    if (pass !== "aniket123") { alert("❌ Wrong Password!"); return; }
    if (!window.confirm(`${selected.length} bills delete karne hain?`)) return;
    for (const id of selected) await onDelete(id);
    setSelected([]);
  };

  const deleteAll = () => {
    if (!window.confirm("Saari history delete karna chahte ho? Yeh action undo nahi hoga!")) return;
    onDeleteAll();
    setSelected([]);
  };

  const isMobile = window.innerWidth < 768;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 12 : 20, padding: isMobile ? "0 4px" : 0 }}>
      {/* Header + filters */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1310" }}>💰 Sales Overview</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: isMobile ? "center" : "flex-start" }}>
          {["today", "yesterday", "month", "all"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "8px 18px", borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: "pointer", border: "1.5px solid", borderColor: filter === f ? "#f59e0b" : "#e5e0d8", background: filter === f ? "#f59e0b" : "#fff", color: filter === f ? "#1a1310" : "#8a7e6e" }}>
              {labels[f]}
            </button>
          ))}

          {/* ─── Start → End Date Range ─── */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, border: `1.5px solid ${filter === "custom" ? "#f59e0b" : "#e5e0d8"}`, background: filter === "custom" ? "#fff8ee" : "#fff" }}>
            <input type="date" value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setFilter("custom"); }}
              style={{ border: "none", background: "transparent", fontSize: 12, fontWeight: 700, color: "#1a1310", outline: "none", cursor: "pointer" }}
            />
            <span style={{ fontSize: 12, color: "#8a7e6e", fontWeight: 700 }}>→</span>
            <input type="date" value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setFilter("custom"); }}
              style={{ border: "none", background: "transparent", fontSize: 12, fontWeight: 700, color: "#1a1310", outline: "none", cursor: "pointer" }}
            />
          </div>

          <div style={{ width: 1, height: 24, background: "#e5e0d8" }} />

          {["ALL", "CASH", "UPI"].map((pm) => (
            <button key={pm} onClick={() => setPayFilter(pm)}
              style={{ padding: "8px 18px", borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: "pointer", border: "1.5px solid", borderColor: payFilter === pm ? "#2563eb" : "#e5e0d8", background: payFilter === pm ? "#2563eb" : "#fff", color: payFilter === pm ? "#fff" : "#8a7e6e" }}>
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
        <button onClick={() => exportToExcel(filtered, filter, filter === "custom" ? (startDate === endDate || !endDate ? startDate : `${startDate}_${endDate}`) : null)} style={{ padding: "8px 18px", borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: "pointer", border: "1.5px solid #16a34a", background: "#f0fdf4", color: "#16a34a" }}>
          📊 Export Excel
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fill, minmax(200px, 1fr))", gap: isMobile ? 10 : 16 }}>
        {[
          { label: "Total Sales", value: formatINR(totalSales), color: "#2563eb", icon: "💳", sub: `${filtered.length} bills` },
          { label: "Total Profit", value: "₹0.00", color: "#16a34a", icon: "📈", sub: "" },
          { label: "Discount Given", value: formatINR(totalDiscount), color: "#f59e0b", icon: "🏷️", sub: `${filtered.filter((b) => b.discountPct > 0).length} discounted bills` },
          { label: "Avg Bill Value", value: filtered.length ? formatINR(totalSales / filtered.length) : "₹0.00", color: "#7c3aed", icon: "🧾", sub: "per bill" },
        ].map((k) => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 16, padding: isMobile ? "14px" : "20px", border: "1px solid #e5e0d8" }}>
            <div style={{ fontSize: isMobile ? 18 : 22, marginBottom: 4 }}>{k.icon}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#8a7e6e", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 900, color: k.color, marginBottom: 2 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#8a7e6e" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Cash / UPI split */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 10 : 16 }}>
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
        {[...filtered].sort((a, b) => new Date(b.date) - new Date(a.date)).map((b, i) => (
          <div key={b.id}
            style={{ display: "flex", alignItems: "center", padding: isMobile ? "10px 12px" : "13px 20px", borderTop: i > 0 ? "1px solid #f0ebe4" : "none", gap: isMobile ? 8 : 16, flexWrap: "wrap", background: selected.includes(b.id) ? "#fff8ee" : "transparent" }}>
            <input type="checkbox" checked={selected.includes(b.id)} onChange={() => toggleSelect(b.id)} style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1310" }}>
                Token: {b.id?.slice(-3)}
              </div>
              <div style={{ fontSize: 11, color: "#8a7e6e" }}>{formatDate(b.date)} · {formatTime(b.date)}</div>
            </div>
            {b.customer?.name && <div style={{ fontSize: 12, color: "#4a3f35" }}>👤 {b.customer.name}</div>}
            <div style={{ fontSize: 12, color: "#8a7e6e" }}>{b.items?.length} items</div>
            {b.discountPct > 0 && <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>🏷️ {b.discountPct}% off</div>}
            <div style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 20, background: (b.paymentMode || "CASH") === "UPI" ? "#eff6ff" : "#f0fdf4", color: (b.paymentMode || "CASH") === "UPI" ? "#2563eb" : "#16a34a" }}>
              {(b.paymentMode || "CASH") === "UPI" ? "📲 UPI" : "💵 CASH"}
            </div>
            <div style={{ textAlign: "right" }}>{formatINR(b.total)}</div>
            <button onClick={() => onLoadEdit(b)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid #2563eb", background: "#eff6ff", cursor: "pointer", fontSize: 11, color: "#2563eb", fontWeight: 700, display: "flex", gap: 4, alignItems: "center" }}>
              <Icon name="edit" size={12} /> Edit
            </button>
            <button onClick={() => printBill(b)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e0d8", background: "#fff", cursor: "pointer", fontSize: 11, color: "#4a3f35", display: "flex", gap: 4, alignItems: "center" }}>
              <Icon name="print" size={12} /> Print
            </button>
            <button onClick={async () => {
              if (window.confirm("Yeh bill delete karein?")) {
                setBills((prev) => prev.filter((x) => x.id !== b.id));
                await onDelete(b.id);
              }
            }}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fff", cursor: "pointer", fontSize: 11, color: "#ef4444", display: "flex", gap: 4, alignItems: "center" }}>
              <Icon name="trash" size={12} /> Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}