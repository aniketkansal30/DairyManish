import { useState, useEffect } from "react";
import Icon from "./Icon";
import { formatINR, formatDate, formatTime, formatQty } from "../utils/helpers";
import { printBill } from "../utils/printBill";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

export default function CustomersView({ customers, bills, setCart, setView }) {
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState(null);
  const mobile = useIsMobile();

  const filtered = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  const customerBills = selected
    ? bills.filter((b) => selected.bills?.includes(b.id))
    : [];

  const repeatOrder = (bill) => {
    setCart(bill.items.map((i) => ({ ...i, qty: i.qty, total: i.qty * i.price })));
    setView("billing");
  };

  // Mobile: detail panel shown when customer selected
  const showDetail = selected && mobile;

  return (
    <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "320px 1fr", gap: 24, alignItems: "start" }}>

      {/* ─── Customer List (hidden on mobile when detail is open) ─── */}
      {(!mobile || !showDetail) && (
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e0d8", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e0d8" }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#8a7e6e" }}>
                <Icon name="search" size={14} />
              </span>
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
                placeholder="Search by name or phone..."
                style={{ width: "100%", padding: "8px 10px 8px 32px", border: "1px solid #e5e0d8", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>
          <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", color: "#c9b9a8", padding: "30px 0", fontSize: 13 }}>No customers yet</div>
            )}
            {filtered.map((c) => (
              <button
                key={c.phone}
                onClick={() => setSelected(c)}
                style={{ width: "100%", textAlign: "left", padding: "13px 16px", borderBottom: "1px solid #f0ebe4", background: selected?.phone === c.phone ? "#f8f5f0" : "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
              >
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1a1310", display: "flex", alignItems: "center", justifyContent: "center", color: "#f59e0b", fontSize: 16, fontWeight: 900, flexShrink: 0 }}>
                  {c.name ? c.name[0].toUpperCase() : "?"}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1310" }}>{c.name || "Unknown"}</div>
                  <div style={{ fontSize: 11, color: "#8a7e6e" }}>
                    <Icon name="phone" size={10} /> {c.phone} · {c.bills?.length || 0} orders
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Customer Detail ─── */}
      {selected ? (
        <div>
          {/* Mobile back button */}
          {mobile && (
            <button
              onClick={() => setSelected(null)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#4a3f35", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 14, padding: 0 }}
            >
              <Icon name="arrow-left" size={16} /> Back to Customers
            </button>
          )}

          <div style={{ background: "#1a1310", borderRadius: 18, padding: mobile ? 16 : 24, marginBottom: 20, display: "flex", alignItems: "center", gap: mobile ? 14 : 20 }}>
            <div style={{ width: mobile ? 48 : 60, height: mobile ? 48 : 60, borderRadius: "50%", background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1310", fontSize: mobile ? 20 : 26, fontWeight: 900, flexShrink: 0 }}>
              {selected.name ? selected.name[0].toUpperCase() : "?"}
            </div>
            <div>
              <div style={{ fontSize: mobile ? 16 : 20, fontWeight: 900, color: "#f59e0b" }}>{selected.name || "Unknown Customer"}</div>
              <div style={{ fontSize: 13, color: "#c9b9a8" }}>{selected.phone}</div>
              <div style={{ fontSize: 12, color: "#8a7e6e", marginTop: 4 }}>
                {selected.bills?.length || 0} total orders · Total spent: {formatINR(customerBills.reduce((s, b) => s + b.total, 0))}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1310", marginBottom: 12 }}>Purchase History</div>
          {customerBills.length === 0 && (
            <div style={{ color: "#c9b9a8", textAlign: "center", padding: "30px 0" }}>No bills found</div>
          )}
          {customerBills.map((b) => (
            <div key={b.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e0d8", padding: mobile ? 12 : 16, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1310" }}>{b.id}</div>
                  <div style={{ fontSize: 11, color: "#8a7e6e" }}>{formatDate(b.date)} {formatTime(b.date)}</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#2563eb" }}>{formatINR(b.total)}</div>
                  <button onClick={() => repeatOrder(b)} style={{ padding: "7px 10px", borderRadius: 8, background: "#f59e0b", color: "#1a1310", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800, display: "flex", gap: 5, alignItems: "center" }}>
                    <Icon name="repeat" size={12} />{!mobile && " Repeat"}
                  </button>
                  <button onClick={() => printBill(b)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e5e0d8", background: "#fff", cursor: "pointer", fontSize: 12, color: "#4a3f35", display: "flex", gap: 4, alignItems: "center" }}>
                    <Icon name="print" size={12} />
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(auto-fill, minmax(140px, 1fr))", gap: 6 }}>
                {b.items?.map((i) => (
                  <div key={i.id} style={{ fontSize: 11, color: "#4a3f35", background: "#f8f5f0", borderRadius: 6, padding: "4px 8px" }}>
                    {i.name} × {formatQty(i.qty, i.unit)} = <strong>{formatINR(i.total)}</strong>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        !mobile && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#c9b9a8", fontSize: 15 }}>
            Select a customer to view history
          </div>
        )
      )}
    </div>
  );
}