import Icon from "./Icon";
import { CAT_COLORS } from "../utils/constants";
import { formatINR, formatDate, formatTime, formatQty } from "../utils/helpers";
import { useState, useMemo, useEffect } from "react";
import { apiCall } from "../utils/api";


function AnalyticsContent() {
  const getIndiaDate = (d = new Date()) =>
    new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).toLocaleDateString("en-CA");

  const [period, setPeriod] = useState("today"); // today | yesterday | month | all | custom
  const [customFrom, setCustomFrom] = useState(getIndiaDate());
  const [customTo, setCustomTo] = useState(getIndiaDate());
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  const isMobile = window.innerWidth < 768;

  // ─── Fetch overall analytics on mount ──────────────────────────────────────
  async function fetchAnalytics() {
    if (!analytics) setLoading(true);
    try {
      const res = await apiCall("/bills/analytics");
      setAnalytics(res);
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // ─── Compute date range from selected period ───────────────────────────────
  const { fromDate, toDate } = useMemo(() => {
    const todayStr = getIndiaDate();
    if (period === "today") return { fromDate: todayStr, toDate: todayStr };
    if (period === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = getIndiaDate(y);
      return { fromDate: yStr, toDate: yStr };
    }
    if (period === "month") {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const first = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("en-CA");
      return { fromDate: first, toDate: todayStr };
    }
    if (period === "all") return { fromDate: "", toDate: "" };
    return { fromDate: customFrom, toDate: customTo }; // custom
  }, [period, customFrom, customTo]);

  // ─── Fetch date-wise item report ───────────────────────────────────────────
  async function fetchReport(ignoreRef) {
    setReportLoading(true);
    try {
      const params = fromDate && toDate ? `?from=${fromDate}&to=${toDate}` : "";
      const res = await apiCall(`/bills/item-report${params}`);
      if (!ignoreRef || !ignoreRef.current) {
        setReportData(res || []);
      }
    } catch (err) {
      if (!ignoreRef || !ignoreRef.current) console.error("Item report fetch error:", err);
    } finally {
      if (!ignoreRef || !ignoreRef.current) setReportLoading(false);
    }
  }

  useEffect(() => {
    const ignoreRef = { current: false };
    fetchReport(ignoreRef);
    return () => {
      ignoreRef.current = true;
    };
  }, [fromDate, toDate]);

  // Listen to background mutation event
  useEffect(() => {
    const handleDataChanged = (e) => {
      if (e.detail?.path?.includes("/bills")) {
        fetchAnalytics();
        fetchReport();
      }
    };
    window.addEventListener("dairy_data_changed", handleDataChanged);
    return () => window.removeEventListener("dairy_data_changed", handleDataChanged);
  }, [fromDate, toDate]);
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

  // Category-wise subtotals (selected period ke hisab se)
  const categoryTotals = useMemo(() => {
    const map = {};
    reportData.forEach((i) => {
      const c = i.category || "Other";
      if (!map[c]) map[c] = { revenue: 0, items: 0 };
      map[c].revenue += i.revenue;
      map[c].items += 1;
    });
    return map;
  }, [reportData]);

  const selectedTotal = useMemo(
    () => filteredItemData.reduce((s, i) => s + i.revenue, 0),
    [filteredItemData]
  );

  const maxSales = useMemo(() => {
    if (!analytics || !analytics.daily || !analytics.daily.length) return 1;
    return Math.max(...analytics.daily.map(d => d.sales), 1);
  }, [analytics]);

  const maxRev = useMemo(() => {
    if (!analytics || !analytics.topItems || !analytics.topItems.length) return 1;
    return Math.max(...analytics.topItems.map(i => i.revenue), 1);
  }, [analytics]);

  // ─── Export current (filtered) item report to Excel ────────────────────────
  const periodLabelForFile = () => {
    if (period === "all") return "All-Time";
    if (period === "today") return `Today-${fromDate}`;
    if (period === "yesterday") return `Yesterday-${fromDate}`;
    if (period === "month") return `This-Month-${fromDate}_to_${toDate}`;
    return `${fromDate}_to_${toDate}`;
  };

  const periodLabelForSheet = () => {
    if (period === "all") return "All Time";
    if (period === "today") return `Today (${fromDate})`;
    if (period === "yesterday") return `Yesterday (${fromDate})`;
    if (period === "month") return `This Month (${fromDate} to ${toDate})`;
    return `${fromDate} to ${toDate}`;
  };

  const handleExportExcel = async () => {
    if (!filteredItemData.length) return;
    const XLSX = await import("xlsx");

    // Title / meta rows on top of the sheet
    const metaRows = [
      ["MANISH DAIRY JAILCHUNGI - Date-wise Item Report"],
      [periodLabelForSheet()],
      [],
    ];

    const headerRow = ["Category", "Item Name", "Quantity", "Unit", "Amount (₹)"];

    const dataRows = filteredItemData.map((item) => [
      item.category || "Other",
      item.name,
      item.qty,
      item.unit,
      item.revenue,
    ]);

    const totalRow = ["", "", "", selectedCategory === "All" ? "Total" : `${selectedCategory} Total`, selectedTotal];

    const sheetData = [...metaRows, headerRow, ...dataRows, totalRow];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Column widths
    ws["!cols"] = [{ wch: 16 }, { wch: 32 }, { wch: 12 }, { wch: 10 }, { wch: 14 }];

    // Merge title row across columns A-E
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Item Report");

    XLSX.writeFile(wb, `Manish-Dairy-Item-Report-${periodLabelForFile()}.xlsx`);
  };

  if (!analytics && loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0", fontSize: 15, color: "#8a7e6e" }}>
        ⏳ Loading Manish Dairy Analytics...
      </div>
    );
  }

  const { today, allTime, daily, topItems} = analytics;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(2, 1fr)", gap: isMobile ? 10 : 16 }}>
        {[
  {
    label: "Today Sales",
    value: formatINR(today.revenue),
    color: "#2563eb",
    sub: `${today.bills} bills today`
  },
  {
    label: "Total Sales",
    value: formatINR(allTime.revenue),
    color: "#7c3aed",
    sub: `${allTime.bills} bills total`
  },
].map((k) => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 16, padding: "20px", border: "1px solid #e5e0d8" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8a7e6e", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: k.color, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "#8a7e6e" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Top Selling Items - full width */}
      <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e0d8", padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1310", marginBottom: 16 }}>🏆 Top Selling Items</div>
        {topItems.length === 0 && <div style={{ color: "#c9b9a8", textAlign: "center", padding: "30px 0" }}>No data yet</div>}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "8px 24px" }}>
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

      {/* Date-wise Item Report */}
      <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e0d8", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1310" }}>📦 Date-wise Item Report</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {[
              { key: "today", label: "Today" },
              { key: "yesterday", label: "Yesterday" },
              { key: "month", label: "This Month" },
              { key: "all", label: "All Time" },
            ].map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e5e0d8", background: period === p.key ? "#f59e0b" : "#fff", color: period === p.key ? "#1a1310" : "#4a3f35", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {p.label}
              </button>
            ))}
            <input type="date" value={customFrom}
              onChange={(e) => { setCustomFrom(e.target.value); setPeriod("custom"); }}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e0d8", fontSize: 12, outline: "none" }} />
            <span style={{ fontSize: 12, color: "#8a7e6e" }}>→</span>
            <input type="date" value={customTo}
              onChange={(e) => { setCustomTo(e.target.value); setPeriod("custom"); }}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e0d8", fontSize: 12, outline: "none" }} />

            {/* Export to Excel */}
            <button
              onClick={handleExportExcel}
              disabled={!filteredItemData.length}
              title={filteredItemData.length ? "Export this report to Excel" : "No data to export"}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid #16a34a",
                background: "#16a34a",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                cursor: filteredItemData.length ? "pointer" : "not-allowed",
                opacity: filteredItemData.length ? 1 : 0.5,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="download" size={12} /> Export Excel
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {allCategories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              style={{ padding: "7px 14px", borderRadius: 10, border: "1px solid #e5e0d8", background: selectedCategory === cat ? "#1a1310" : "#fff", color: selectedCategory === cat ? "#f59e0b" : "#4a3f35", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              {cat}{" "}
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>
                ({formatINR(cat === "All" ? filteredTotal : categoryTotals[cat]?.revenue || 0)})
              </span>
            </button>
          ))}
        </div>

        <div style={{ background: "#fff8ee", borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>
            {period === "all" ? "📊 All Time" : period === "today" ? `📅 Today (${fromDate})` : period === "yesterday" ? `📅 Yesterday (${fromDate})` : period === "month" ? `📅 This Month (${fromDate} → ${toDate})` : `📅 ${fromDate} → ${toDate}`}
          </span>
          <span style={{ fontSize: 14, fontWeight: 900, color: "#2563eb" }}>{formatINR(filteredTotal)}</span>
        </div>

        {/* Category Subtotal */}
        {!reportLoading && reportData.length > 0 && (
          selectedCategory === "All" ? (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 16 }}>
              {Object.entries(categoryTotals)
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([cat, v]) => (
                  <div key={cat} onClick={() => setSelectedCategory(cat)}
                    style={{ cursor: "pointer", background: "#fff", border: `2px solid ${CAT_COLORS[cat] || "#e5e0d8"}`, borderRadius: 12, padding: "10px 14px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: CAT_COLORS[cat] || "#8a7e6e", textTransform: "uppercase" }}>{cat}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1310" }}>{formatINR(v.revenue)}</div>
                    <div style={{ fontSize: 11, color: "#8a7e6e" }}>{v.items} items</div>
                  </div>
                ))}
            </div>
          ) : (
            <div style={{ background: "#1a1310", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#c9b9a8", textTransform: "uppercase", letterSpacing: 1 }}>{selectedCategory} Subtotal</div>
                <div style={{ fontSize: 12, color: "#8a7e6e", marginTop: 2 }}>
                  {filteredItemData.length} items · {filteredTotal > 0 ? ((selectedTotal / filteredTotal) * 100).toFixed(1) : 0}% of total
                </div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#f59e0b" }}>{formatINR(selectedTotal)}</div>
            </div>
          )
        )}

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
// ─── PASSWORD GATE ───────────────────────────────────────────
export default function AnalyticsView() {
  const [unlocked, setUnlocked] = useState(false);
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [checking, setChecking] = useState(false);

  const unlock = async () => {
    if (!pwd || checking) return;
    setChecking(true);
    setErr("");
    try {
      await apiCall("/auth/verify-admin", "POST", { password: pwd });
      setUnlocked(true);
      setPwd("");
    } catch (e) {
      setErr("❌ " + e.message);
    } finally {
      setChecking(false);
    }
  };

  if (unlocked) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button
            onClick={() => setUnlocked(false)}
            style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #e5e0d8", background: "#fff", color: "#4a3f35", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            🔒 Lock
          </button>
        </div>
        <AnalyticsContent />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px 16px" }}>
      <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e0d8", padding: 28, width: 320, maxWidth: "100%", textAlign: "center", boxSizing: "border-box" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
        <div style={{ fontSize: 17, fontWeight: 900, color: "#1a1310", marginBottom: 4 }}>Analytics Locked</div>
        <div style={{ fontSize: 12, color: "#8a7e6e", marginBottom: 18 }}>Admin password daalo</div>
        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && unlock()}
          placeholder="Password"
          autoFocus
          style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e5e0d8", borderRadius: 10, fontSize: 14, outline: "none", marginBottom: 12, boxSizing: "border-box" }}
        />
        {err && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <button
          onClick={unlock}
          disabled={checking}
          style={{ width: "100%", padding: 12, background: "#1a1310", color: "#f59e0b", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", opacity: checking ? 0.7 : 1 }}
        >
          {checking ? "Checking..." : "Unlock"}
        </button>
      </div>
    </div>
  );
}