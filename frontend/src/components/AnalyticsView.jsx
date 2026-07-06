import Icon from "./Icon";
import { CAT_COLORS } from "../utils/constants";
import { formatINR, formatDate, formatTime, formatQty } from "../utils/helpers";
import { printBill } from "../utils/printBill";
import { useState, useMemo, useEffect } from "react";
import { apiCall } from "../utils/api";

export default function AnalyticsView() {
  const [selectedDate, setSelectedDate] = useState(
    () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).toLocaleDateString("en-CA")
  );
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  const isMobile = window.innerWidth < 768;

  // ─── Fetch overall analytics on mount ──────────────────────────────────────
  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const res = await apiCall("/bills/analytics");
        setAnalytics(res);
      } catch (err) {
        console.error("Analytics fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  // ─── Fetch date-wise item report ───────────────────────────────────────────
  useEffect(() => {
    async function fetchReport() {
      setReportLoading(true);
      try {
        const res = await apiCall(`/bills/item-report?date=${selectedDate}`);
        setReportData(res || []);
      } catch (err) {
        console.error("Item report fetch error:", err);
      } finally {
        setReportLoading(false);
      }
    }
    fetchReport();
  }, [selectedDate]);

  // Date-wise totals from report data
  const filteredTotal = useMemo(() => reportData.reduce((s, i) => s + i.revenue, 0), [reportData]);

  const allCategories = useMemo(() => {
    const cats = new Set(reportData.map(i => i.category || "Other"));
    return ["All", ...Array.from(cats).sort()];
  }, [reportData]);

  const filteredItemData = useMemo(() => {
    return reportData
      .filter(i => selectedCategory === "All" || (i.category || "Other") === selectedCategory)
      .sort((a, b) => b.revenue - a.revenue);
  }, [reportData, selectedCategory]);

  const maxSales = useMemo(() => {
    if (!analytics || !analytics.daily || !analytics.daily.length) return 1;
    return Math.max(...analytics.daily.map(d => d.sales), 1);
  }, [analytics]);

  const maxRev = useMemo(() => {
    if (!analytics || !analytics.topItems || !analytics.topItems.length) return 1;
    return Math.max(...analytics.topItems.map(i => i.revenue), 1);
  }, [analytics]);

  if (loading || !analytics) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0", fontSize: 15, color: "#8a7e6e" }}>
        ⏳ Loading Manish Dairy Analytics...
      </div>
    );
  }

  const { today, allTime, daily, topItems, recent } = analytics;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 10 : 16 }}>
        {[
          { label: "Today Sales", value: formatINR(today.revenue), color: "#2563eb", sub: `${today.bills} bills today` },
          { label: "Today Profit", value: formatINR(today.profit), color: "#16a34a", sub: `${today.revenue > 0 ? Math.round((today.profit / today.revenue) * 100) : 0}% margin` },
          { label: "Total Sales", value: formatINR(allTime.revenue), color: "#7c3aed", sub: `${allTime.bills} bills total` },
          { label: "Total Profit", value: formatINR(allTime.profit), color: "#ea580c", sub: `${allTime.revenue > 0 ? Math.round((allTime.profit / allTime.revenue) * 100) : 0}% margin` },
        ].map((k) => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 16, padding: "20px", border: "1px solid #e5e0d8" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8a7e6e", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: k.color, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "#8a7e6e" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 14 : 24 }}>
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e0d8", padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1310", marginBottom: 16 }}>📅 This Month – Daily Sales</div>
          {daily.length === 0 && <div style={{ color: "#c9b9a8", textAlign: "center", padding: "30px 0" }}>No data yet</div>}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 160, overflowX: "auto" }}>
            {daily.map((v) => (
              <div key={v.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 28 }}>
                <div style={{ fontSize: 9, color: "#2563eb", fontWeight: 700 }}>₹{Math.round(v.sales / 100)}h</div>
                <div style={{ width: 20, borderRadius: "4px 4px 0 0", background: "linear-gradient(to top, #2563eb, #60a5fa)", height: Math.max(4, (v.sales / maxSales) * 130) }} />
                <div style={{ width: 20, borderRadius: "4px 4px 0 0", background: "linear-gradient(to top, #16a34a, #4ade80)", height: Math.max(2, (v.profit / maxSales) * 130) }} />
                <div style={{ fontSize: 9, color: "#8a7e6e", textAlign: "center" }}>{v.date.slice(8)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "#2563eb" }}>🔵 Sales</span>
            <span style={{ fontSize: 11, color: "#16a34a" }}>🟢 Profit</span>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e0d8", padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1310", marginBottom: 16 }}>🏆 Top Selling Items</div>
          {topItems.length === 0 && <div style={{ color: "#c9b9a8", textAlign: "center", padding: "30px 0" }}>No data yet</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {topItems.map((item, i) => (
              <div key={item.name}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, color: "#1a1310" }}>{i + 1}. {item.name}</span>
                  <span style={{ color: "#2563eb", fontWeight: 700 }}>{formatINR(item.revenue)}</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "#f0ebe4", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 999, background: `hsl(${220 - i * 20}, 70%, 55%)`, width: `${(item.revenue / maxRev) * 100}%`, transition: "width 0.5s" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent bills */}
      <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e0d8", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e0d8", fontSize: 14, fontWeight: 800, color: "#1a1310" }}>🧾 Recent Bills</div>
        {recent.map((b, i) => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderTop: i > 0 ? "1px solid #f0ebe4" : "none", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1310" }}>MD{b.id.slice(-3)}</div>
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
        {recent.length === 0 && <div style={{ textAlign: "center", color: "#c9b9a8", padding: "30px 0" }}>No bills yet. Start billing!</div>}
      </div>

      {/* Date-wise Item Report */}
      <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e0d8", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1310" }}>📦 Date-wise Item Report</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e0d8", fontSize: 13, outline: "none" }} />
            <button onClick={() => setSelectedDate(new Date().toLocaleDateString("en-CA"))}
              style={{ padding: "6px 12px", borderRadius: 8, background: "#1a1310", color: "#f59e0b", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Today
            </button>
            <button onClick={() => setSelectedDate("")}
              style={{ padding: "6px 12px", borderRadius: 8, background: "#f0ebe4", color: "#4a3f35", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              All Time
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {allCategories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              style={{ padding: "7px 14px", borderRadius: 10, border: "1px solid #e5e0d8", background: selectedCategory === cat ? "#1a1310" : "#fff", color: selectedCategory === cat ? "#f59e0b" : "#4a3f35", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              {cat}
            </button>
          ))}
        </div>

        <div style={{ background: "#fff8ee", borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>
            {selectedDate ? `📅 ${selectedDate}` : "📊 All Time"}
          </span>
          <span style={{ fontSize: 14, fontWeight: 900, color: "#2563eb" }}>{formatINR(filteredTotal)}</span>
        </div>

        {reportLoading && <div style={{ color: "#8a7e6e", textAlign: "center", padding: "20px 0", fontSize: 13 }}>⏳ Fetching report...</div>}
        {!reportLoading && filteredItemData.length === 0 && <div style={{ color: "#c9b9a8", textAlign: "center", padding: "20px 0" }}>Is date koi sale nahi</div>}
        {!reportLoading && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {filteredItemData.map((item) => (
              <div key={item.name} style={{ background: "#f8f5f0", borderRadius: 12, padding: "14px 16px", border: "1px solid #e5e0d8" }}>
                <div style={{ fontSize: 11, color: CAT_COLORS[item.category] || "#8a7e6e", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{item.category}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1310", marginBottom: 6 }}>{item.name}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: CAT_COLORS[item.category] || "#f59e0b" }}>{formatQty(item.qty, item.unit)}</div>
                <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 700, marginTop: 4 }}>{formatINR(item.revenue)}</div>
                <div style={{ fontSize: 11, color: "#8a7e6e" }}>Total sold · Total amount</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
