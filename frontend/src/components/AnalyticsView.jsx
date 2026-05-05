import Icon from "./Icon";
import { CAT_COLORS } from "../utils/constants";
import { formatINR, formatDate, formatTime, formatQty, today, thisMonth } from "../utils/helpers";
import { printBill } from "../utils/printBill";

// ─── ANALYTICS VIEW ───────────────────────────────────────────────────────────
export default function AnalyticsView({ bills }) {
  const todayBills = bills.filter((b) => b.date?.slice(0, 10) === today());
  const monthBills = bills.filter((b) => b.date?.slice(0, 7) === thisMonth());

  const totalSales = bills.reduce((s, b) => s + b.total, 0);
  const totalProfit = bills.reduce((s, b) => s + b.profit, 0);
  const todaySales = todayBills.reduce((s, b) => s + b.total, 0);
  const todayProfit = todayBills.reduce((s, b) => s + b.profit, 0);

  // Daily chart data
  const dailyMap = {};
  monthBills.forEach((b) => {
    const d = b.date?.slice(0, 10);
    if (!dailyMap[d]) dailyMap[d] = { sales: 0, profit: 0, count: 0 };
    dailyMap[d].sales += b.total;
    dailyMap[d].profit += b.profit;
    dailyMap[d].count++;
  });
  const dailyData = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b));
  const maxSales = Math.max(...dailyData.map(([, v]) => v.sales), 1);

  // Top items by revenue
  const itemMap = {};
  bills.forEach((b) =>
    b.items?.forEach((i) => {
      if (!itemMap[i.name]) itemMap[i.name] = { qty: 0, revenue: 0, count: 0 };
      itemMap[i.name].qty += i.qty;
      itemMap[i.name].revenue += i.total;
      itemMap[i.name].count++;
    })
  );
  const topItems = Object.entries(itemMap)
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 8);
  const maxRev = Math.max(...topItems.map(([, v]) => v.revenue), 1);

  // Item quantity totals
  const itemQtyMap = {};
  bills.forEach((b) =>
    b.items?.forEach((i) => {
      if (!itemQtyMap[i.name])
        itemQtyMap[i.name] = { qty: 0, unit: i.unit, category: i.category || "Other" };
      itemQtyMap[i.name].qty += i.qty;
    })
  );
  const itemQtyData = Object.entries(itemQtyMap).sort(([, a], [, b]) => b.qty - a.qty);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {[
          { label: "Today Sales", value: formatINR(todaySales), color: "#2563eb", sub: `${todayBills.length} bills` },
          { label: "Today Profit", value: "₹0.00", color: "#16a34a", sub: `${todaySales > 0 ? Math.round((todayProfit / todaySales) * 100) : 0}% margin` },
          { label: "Total Sales", value: formatINR(totalSales), color: "#7c3aed", sub: `${bills.length} bills ever` },
          { label: "Total Profit", value: "₹0.00", color: "#ea580c", sub: `${totalSales > 0 ? Math.round((totalProfit / totalSales) * 100) : 0}% margin` },
        ].map((k) => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 16, padding: "20px", border: "1px solid #e5e0d8" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8a7e6e", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: k.color, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "#8a7e6e" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Daily bar chart */}
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e0d8", padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1310", marginBottom: 16 }}>📅 This Month – Daily Sales</div>
          {dailyData.length === 0 && <div style={{ color: "#c9b9a8", textAlign: "center", padding: "30px 0" }}>No data yet</div>}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 160, overflowX: "auto" }}>
            {dailyData.map(([date, v]) => (
              <div key={date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 28 }}>
                <div style={{ fontSize: 9, color: "#2563eb", fontWeight: 700 }}>₹{Math.round(v.sales / 100)}h</div>
                <div style={{ width: 20, borderRadius: "4px 4px 0 0", background: "linear-gradient(to top, #2563eb, #60a5fa)", height: Math.max(4, (v.sales / maxSales) * 130) }} />
                <div style={{ width: 20, borderRadius: "4px 4px 0 0", background: "linear-gradient(to top, #16a34a, #4ade80)", height: Math.max(2, (v.profit / maxSales) * 130) }} />
                <div style={{ fontSize: 9, color: "#8a7e6e", textAlign: "center" }}>{date.slice(8)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "#2563eb" }}>🔵 Sales</span>
            <span style={{ fontSize: 11, color: "#16a34a" }}>🟢 Profit</span>
          </div>
        </div>

        {/* Top items */}
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e0d8", padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1310", marginBottom: 16 }}>🏆 Top Selling Items</div>
          {topItems.length === 0 && <div style={{ color: "#c9b9a8", textAlign: "center", padding: "30px 0" }}>No data yet</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {topItems.map(([name, v], i) => (
              <div key={name}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, color: "#1a1310" }}>{i + 1}. {name}</span>
                  <span style={{ color: "#2563eb", fontWeight: 700 }}>{formatINR(v.revenue)}</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "#f0ebe4", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 999, background: `hsl(${220 - i * 20}, 70%, 55%)`, width: `${(v.revenue / maxRev) * 100}%`, transition: "width 0.5s" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent bills */}
      <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e0d8", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e0d8", fontSize: 14, fontWeight: 800, color: "#1a1310" }}>🧾 Recent Bills</div>
        {bills.slice(0, 20).map((b, i) => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderTop: i > 0 ? "1px solid #f0ebe4" : "none", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1310" }}>{b.id}</div>
              <div style={{ fontSize: 11, color: "#8a7e6e" }}>{formatDate(b.date)} {formatTime(b.date)} · {b.items?.length} items</div>
            </div>
            {b.customer?.name && <div style={{ fontSize: 12, color: "#4a3f35" }}>👤 {b.customer.name}</div>}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#2563eb" }}>{formatINR(b.total)}</div>
            </div>
            <button onClick={() => printBill(b)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e0d8", background: "#fff", cursor: "pointer", fontSize: 11, color: "#4a3f35", display: "flex", gap: 4, alignItems: "center" }}>
              <Icon name="print" size={12} /> Print
            </button>
          </div>
        ))}
        {bills.length === 0 && <div style={{ textAlign: "center", color: "#c9b9a8", padding: "30px 0" }}>No bills yet. Start billing!</div>}
      </div>

      {/* Item qty sold grid */}
      <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e0d8", padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1310", marginBottom: 16 }}>📦 Item-wise Total Quantity Sold</div>
        {itemQtyData.length === 0 && <div style={{ color: "#c9b9a8", textAlign: "center", padding: "20px 0" }}>No data yet</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {itemQtyData.map(([name, v]) => (
            <div key={name} style={{ background: "#f8f5f0", borderRadius: 12, padding: "14px 16px", border: "1px solid #e5e0d8" }}>
              <div style={{ fontSize: 11, color: CAT_COLORS[v.category] || "#8a7e6e", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
                {v.category}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1310", marginBottom: 8 }}>{name}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: CAT_COLORS[v.category] || "#f59e0b" }}>
                {formatQty(v.qty, v.unit)}
              </div>
              <div style={{ fontSize: 11, color: "#8a7e6e", marginTop: 4 }}>Total sold</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}