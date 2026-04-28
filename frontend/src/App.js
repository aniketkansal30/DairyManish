import { useState, useEffect, useMemo } from "react";

// ─── API BASE URL ─────────────────────────────────────────────────────────────
const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// ─── API HELPER ───────────────────────────────────────────────────────────────
async function apiCall(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json"
    },
  };

  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API}${path}`, opts);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Server error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}
const CAT_ICONS = { Dairy: "🥛", Sweets: "🍬", Snacks: "🥨", Tandoor: "🔥", All: "🏪" };
const CAT_COLORS = { Dairy: "#3b82f6", Sweets: "#ec4899", Snacks: "#f59e0b", Tandoor: "#ef4444" };

// ─── UTILITY FUNCTIONS ────────────────────────────────────────────────────────
function formatINR(n) {
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function formatTime(d) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function today() { return new Date().toISOString().slice(0, 10); }
function thisMonth() { return new Date().toISOString().slice(0, 7); }
function formatQty(qty, unit) {
  if (unit === "kg") return qty < 1 ? `${Math.round(qty * 1000)} g` : `${+qty.toFixed(3)} kg`;
  if (unit === "litre") return qty < 1 ? `${Math.round(qty * 1000)} ml` : `${+qty.toFixed(3)} L`;
  return `${qty} ${unit}`;
}

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 18 }) => {
  const icons = {
    home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    cart: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z M3 6h18 M16 10a4 4 0 01-8 0",
    products: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    analytics: "M18 20V10 M12 20V4 M6 20v-6",
    customers: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
    plus: "M12 5v14 M5 12h14",
    minus: "M5 12h14",
    trash: "M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6",
    edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
    search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
    print: "M6 9V2h12v7 M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2 M6 14h12v8H6z",
    whatsapp: "M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z",
    close: "M18 6L6 18 M6 6l12 12",
    check: "M20 6L9 17l-5-5",
    repeat: "M17 1l4 4-4 4 M3 11V9a4 4 0 014-4h14 M7 23l-4-4 4-4 M21 13v2a4 4 0 01-4 4H3",
    phone: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.18 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.72 6.72l1.06-1.35a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
    calendar: "M3 4h18v18H3z M16 2v4 M8 2v4 M3 10h18",
    profit: "M12 2v20 M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
    tag: "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z M7 7h.01",
    save: "M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z M17 21v-8H7v8 M7 3v5h8",
    menu: "M3 12h18 M3 6h18 M3 18h18",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {(icons[name] || "").split(" M").map((d, i) => <path key={i} d={(i === 0 ? "" : "M") + d} />)}
    </svg>
  );
};

// ─── BILL PRINT ───────────────────────────────────────────────────────────────
function printBill(bill) {
  const w = window.open("", "_blank", "width=380,height=600");
  w.document.write(`<!DOCTYPE html><html><head><style>
    *{margin:0;padding:0;box-sizing:border-box;font-family:'Courier New',monospace;}
    body{padding:16px;font-size:13px;max-width:320px;margin:auto;}
    .hdr{text-align:center;border-bottom:2px dashed #333;padding-bottom:10px;margin-bottom:10px;}
    .hdr h1{font-size:20px;font-weight:900;letter-spacing:2px;}
    .hdr p{font-size:11px;color:#555;}
    .row{display:flex;justify-content:space-between;padding:3px 0;}
    .row.bold{font-weight:700;}
    .divider{border-top:1px dashed #999;margin:8px 0;}
    .footer{text-align:center;margin-top:12px;font-size:11px;color:#777;}
    .total-row{display:flex;justify-content:space-between;font-size:15px;font-weight:900;padding:6px 0;border-top:2px solid #333;}
    @media print{button{display:none;}}
  </style></head><body>
  <div class="hdr">
    <h1>🥛 MANISH DAIRY</h1>
    <p>Ganga Nagar, Meerut</p>
    <p>Ph: +91-XXXXXXXXXX</p>
  </div>
  <div class="row"><span>Date:</span><span>${formatDate(bill.date)} ${formatTime(bill.date)}</span></div>
  <div class="row"><span>Bill No:</span><span>${bill.id}</span></div>
  ${bill.customer?.name ? `<div class="row"><span>Customer:</span><span>${bill.customer.name}</span></div>` : ""}
  ${bill.customer?.phone ? `<div class="row"><span>Phone:</span><span>${bill.customer.phone}</span></div>` : ""}
  <div class="divider"></div>
  <div class="row bold"><span style="flex:2">Item</span><span style="flex:1;text-align:right;padding-right:8px">Qty</span><span style="flex:1;text-align:right">Amt</span></div>
  <div class="divider"></div>
  ${bill.items.map(i => `
    <div class="row">
      <span style="flex:2">${i.name}</span>
      <span style="flex:1;text-align:right;padding-right:8px">${formatQty(i.qty, i.unit)}</span>
      <span style="flex:1;text-align:right">${formatINR(i.total)}</span>
    </div>
  `).join("")}
  <div class="divider"></div>
  ${bill.discountPct > 0 ? `
  <div class="row"><span>Subtotal</span><span>${formatINR(bill.subtotal)}</span></div>
  <div class="row" style="color:#16a34a;font-weight:700"><span>Discount (${bill.discountPct}%)</span><span>-${formatINR(bill.discountAmt)}</span></div>
  ` : ""}
  <div class="total-row"><span>TOTAL</span><span>${formatINR(bill.total)}</span></div>
  <div class="footer">
    <p>Thank you for visiting!</p>
    <p>Manish Dairy – Quality Since Day One</p>
    <p style="margin-top:8px">🕌 Ganga Nagar, Meerut</p>
  </div>
  <br/><button onclick="window.print()" style="width:100%;padding:8px;background:#2563eb;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;">🖨️ Print</button>
  </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  useEffect(() => {
    const handleKey = async (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        const pass = prompt("Enter Admin Password");

        if (pass === "aniket123") {
          let discount = prompt("Enter Global Discount %");

          
          const confirmApply = window.confirm("Are you sure? This will apply discount permanently.");

          if (confirmApply) {
            await apiCall("/bills/apply-discount", "POST", { discount });
            alert("Discount applied to existing data");
            window.location.reload();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);
  const [view, setView] = useState("billing");

  const [products, setProducts] = useState([]);
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "" });
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true);
        const [prods, bls, custs] = await Promise.all([
          apiCall("/products"),
          apiCall("/bills"),
          apiCall("/customers"),
        ]);
        setProducts(prods);
        setBills(bls);
        setCustomers(custs);
      } catch (e) {
        setError("Server se connect nahi ho paya. Backend chal raha hai? " + e.message);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  const filtered = useMemo(() => products.filter(p =>
    (category === "All" || p.category === category) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  ), [products, category, search]);

  const addToCart = (product) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id);
      if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.price } : i);
      return [...prev, { ...product, qty: 1, total: product.price }];
    });
  };
  const updateQty = (id, qty) => {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.id !== id)); return; }
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty, total: qty * i.price } : i));
  };
  const setQtyPreset = (id, preset, unit) => {
    const qty = unit === "kg" || unit === "litre" ? preset : Math.round(preset);
    updateQty(id, qty);
  };

  const cartSubtotal = cart.reduce((s, i) => s + i.total, 0);
  const cartCost = cart.reduce((s, i) => s + i.qty * i.cost, 0);
  const discountAmt = cartSubtotal * (discount / 100);
  const cartTotal = cartSubtotal - discountAmt;

  const checkoutBill = async () => {
    if (!cart.length) return;
    const bill = {
      id: "MD" + Date.now(),
      date: new Date().toISOString(),
      items: cart,
      subtotal: cartSubtotal,
      discountPct: discount,
      discountAmt,
      total: cartTotal,
      cost: cartCost,
      profit: cartTotal - cartCost,
      customer: customerForm.name || customerForm.phone ? { ...customerForm } : null,
    };
    try {
      const saved = await apiCall("/bills", "POST", bill);
      setBills(prev => [saved, ...prev]);
      if (customerForm.phone) {
        const updatedCustomers = await apiCall("/customers");
        setCustomers(updatedCustomers);
      }
      printBill(bill);
      setCart([]);
      setCustomerForm({ name: "", phone: "" });
      setDiscount(0);
    } catch (e) {
      alert("Bill save karne mein error: " + e.message);
    }
  };

  const handleSaveProduct = async (formData, editingId) => {
    try {
      if (editingId) {
        const updated = await apiCall(`/products/${editingId}`, "PUT", {
          ...formData, price: +formData.price, cost: +formData.cost,
        });
        setProducts(prev => prev.map(p => p.id === editingId ? updated : p));
      } else {
        const created = await apiCall("/products", "POST", {
          ...formData, price: +formData.price, cost: +formData.cost,
        });
        setProducts(prev => [...prev, created]);
      }
      return true;
    } catch (e) {
      alert("Product save karne mein error: " + e.message);
      return false;
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      await apiCall(`/products/${id}`, "DELETE");
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      alert("Product delete karne mein error: " + e.message);
    }
  };

  // ─── BILL DELETE FUNCTIONS ───────────────────────────────────────────────────
  const handleDeleteBill = async (id) => {
    try {
      await apiCall(`/bills/${id}`, "DELETE");
      setBills(prev => prev.filter(b => b.id !== id));
    } catch (e) {
      alert("Bill delete karne mein error: " + e.message);
    }
  };

  const handleDeleteAllBills = async () => {
    try {
      await apiCall("/bills/all", "DELETE");
      setBills([]);
    } catch (e) {
      alert("Saari bills delete karne mein error: " + e.message);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8f5f0", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 48 }}>🥛</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1310" }}>MANISH DAIRY</div>
      <div style={{ fontSize: 14, color: "#8a7e6e" }}>Data load ho raha hai...</div>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8f5f0", flexDirection: "column", gap: 16, padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 48 }}>❌</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#ef4444" }}>{error}</div>
      <button onClick={() => window.location.reload()} style={{ padding: "10px 24px", background: "#1a1310", color: "#f59e0b", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
        Dobara Try Karo
      </button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f8f5f0", fontFamily: "'Segoe UI', sans-serif" }}>
      <Navbar view={view} setView={setView} />
      <div style={{ padding: "24px", maxWidth: 1400, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        {view === "billing" && <BillingView products={products} filtered={filtered} category={category} setCategory={setCategory} search={search} setSearch={setSearch} cart={cart} setCart={setCart} addToCart={addToCart} updateQty={updateQty} setQtyPreset={setQtyPreset} cartTotal={cartTotal} cartSubtotal={cartSubtotal} discountAmt={discountAmt} discount={discount} setDiscount={setDiscount} customerForm={customerForm} setCustomerForm={setCustomerForm} checkoutBill={checkoutBill} />}
        {view === "products" && <ProductsView products={products} onSave={handleSaveProduct} onDelete={handleDeleteProduct} />}
        {view === "sales" && <SalesView bills={bills} onDelete={handleDeleteBill} onDeleteAll={handleDeleteAllBills} />}
        {view === "analytics" && <AnalyticsView bills={bills} />}
        {view === "customers" && <CustomersView customers={customers} bills={bills} setCart={setCart} setView={setView} />}
      </div>
    </div>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
function Navbar({ view, setView }) {
  const nav = [
    { id: "billing", label: "Billing", icon: "cart" },
    { id: "products", label: "Products", icon: "products" },
    { id: "sales", label: "Sales", icon: "profit" },
    { id: "analytics", label: "Analytics", icon: "analytics" },
    { id: "customers", label: "Customers", icon: "customers" },
  ];
  return (
    <div style={{ background: "#1a1310", position: "sticky", top: 0, zIndex: 99, display: "flex", alignItems: "center", padding: "0 24px", gap: 8, boxShadow: "0 2px 12px rgba(0,0,0,0.18)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 16, padding: "14px 0" }}>
        <span style={{ fontSize: 22 }}>🥛</span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#f59e0b", letterSpacing: 1, lineHeight: 1 }}>MANISH</div>
          <div style={{ fontSize: 9, color: "#8a7e6e", letterSpacing: 3, fontWeight: 700, lineHeight: 1 }}>DAIRY</div>
        </div>
      </div>
      <div style={{ width: 1, height: 32, background: "#2d2420", marginRight: 8 }} />
      <nav style={{ display: "flex", gap: 4, flex: 1 }}>
        {nav.map(n => (
          <button key={n.id} onClick={() => setView(n.id)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: view === n.id ? 800 : 500, transition: "all 0.15s", background: view === n.id ? "#f59e0b" : "transparent", color: view === n.id ? "#1a1310" : "#c9b9a8" }}>
            <Icon name={n.icon} size={15} />
            {n.label}
          </button>
        ))}
      </nav>
      <div style={{ fontSize: 12, color: "#8a7e6e", flexShrink: 0 }}>
        {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
      </div>
    </div>
  );
}

// ─── BILLING VIEW ─────────────────────────────────────────────────────────────
function BillingView({ products, filtered, category, setCategory, search, setSearch, cart, setCart, addToCart, updateQty, setQtyPreset, cartTotal, cartSubtotal, discountAmt, discount, setDiscount, customerForm, setCustomerForm, checkoutBill }) {
  const [popup, setPopup] = useState(null);

  const openPopup = (product) => {
    const existing = cart.find(i => i.id === product.id);
    setPopup({ ...product, tempQty: existing ? existing.qty : (product.unit === "piece" ? 1 : 0.5), tempAmt: "" });
  };

  const confirmPopup = () => {
    if (!popup) return;
    const qty = parseFloat(popup.tempQty) || 0;
    if (qty <= 0) { updateQty(popup.id, 0); setPopup(null); return; }
    const inCart = cart.find(i => i.id === popup.id);
    if (!inCart) addToCart(popup);
    updateQty(popup.id, qty);
    setPopup(null);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 100, flexShrink: 0 }}>
          {["All", "Dairy", "Sweets", "Snacks", "Tandoor"].map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, padding: "12px 8px", borderRadius: 14, border: "2px solid", borderColor: category === c ? (CAT_COLORS[c] || "#f59e0b") : "#e5e0d8", background: category === c ? (CAT_COLORS[c] || "#f59e0b") : "#fff", color: category === c ? "#fff" : "#4a3f35", fontSize: 12, fontWeight: category === c ? 800 : 500, cursor: "pointer", transition: "all 0.15s", boxShadow: category === c ? `0 4px 12px ${(CAT_COLORS[c] || "#f59e0b")}44` : "none" }}>
              <span style={{ fontSize: 20 }}>{CAT_ICONS[c]}</span>
              {c}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8a7e6e" }}><Icon name="search" size={16} /></span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: 10, border: "1px solid #e5e0d8", background: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
            {filtered.map(p => {
              const inCart = cart.find(i => i.id === p.id);
              return (
                <button key={p.id} onClick={() => openPopup(p)} style={{ background: "#fff", border: `2px solid ${inCart ? CAT_COLORS[p.category] || "#f59e0b" : "#e5e0d8"}`, borderRadius: 14, padding: "14px 12px", textAlign: "left", cursor: "pointer", transition: "all 0.15s", position: "relative", boxShadow: inCart ? `0 0 0 3px ${CAT_COLORS[p.category]}22` : "none" }}>
                  {inCart && (
                    <div style={{ position: "absolute", top: 8, right: 8, background: CAT_COLORS[p.category] || "#f59e0b", color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 800, padding: "2px 7px" }}>×{formatQty(inCart.qty, inCart.unit)}</div>
                  )}
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{CAT_ICONS[p.category]}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1310", marginBottom: 2, lineHeight: 1.3 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "#8a7e6e", marginBottom: 6 }}>{p.category}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: CAT_COLORS[p.category] || "#f59e0b" }}>₹{p.price}<span style={{ fontSize: 10, fontWeight: 500, color: "#8a7e6e" }}>/{p.unit}</span></div>
                </button>
              );
            })}
          </div>
          {filtered.length === 0 && <div style={{ textAlign: "center", color: "#8a7e6e", padding: "40px 0", fontSize: 15 }}>No products found</div>}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e0d8", overflow: "hidden", position: "sticky", top: 80 }}>
        <div style={{ padding: "14px 16px", background: "#1a1310", display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="cart" size={15} />
          <span style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>Current Bill</span>
          {cart.length > 0 && <span style={{ marginLeft: "auto", background: "#f59e0b", color: "#1a1310", borderRadius: 999, fontSize: 11, fontWeight: 900, padding: "2px 8px" }}>{cart.length}</span>}
        </div>
        <div style={{ padding: "10px 12px", borderBottom: "1px solid #f0ebe4", display: "flex", flexDirection: "column", gap: 6 }}>
          <input value={customerForm.name} onChange={e => setCustomerForm(p => ({ ...p, name: e.target.value }))} placeholder="👤 Customer Name" style={{ width: "100%", padding: "7px 10px", border: "1px solid #e5e0d8", borderRadius: 8, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
          <input value={customerForm.phone} onChange={e => setCustomerForm(p => ({ ...p, phone: e.target.value }))} placeholder="📱 Phone" style={{ width: "100%", padding: "7px 10px", border: "1px solid #e5e0d8", borderRadius: 8, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ maxHeight: 260, overflowY: "auto" }}>
          {cart.length === 0 && <div style={{ textAlign: "center", color: "#c9b9a8", padding: "28px 0", fontSize: 13 }}>Product select karo</div>}
          {cart.map((item, i) => (
            <div key={item.id} onClick={() => openPopup(item)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderTop: i > 0 ? "1px solid #f0ebe4" : "none", cursor: "pointer", transition: "background 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f8f5f0"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1310", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                <div style={{ fontSize: 11, color: "#8a7e6e" }}>{formatQty(item.qty, item.unit)} × ₹{item.price}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#2563eb" }}>{formatINR(item.total)}</span>
                <button onClick={e => { e.stopPropagation(); updateQty(item.id, 0); }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 2, display: "flex", alignItems: "center" }}>
                  <Icon name="trash" size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div style={{ padding: "12px 14px", borderTop: "2px dashed #e5e0d8" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, background: "#fff8ee", border: "1.5px dashed #f59e0b", borderRadius: 10, padding: "8px 12px" }}>
              <span style={{ fontSize: 13, color: "#92400e", fontWeight: 700 }}>🏷️ Discount %</span>
              <input type="number" min="0" max="100" value={discount || ""} onChange={e => setDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} placeholder="0"
                style={{ width: 60, padding: "5px 6px", border: "1.5px solid #f59e0b", borderRadius: 8, fontSize: 14, fontWeight: 700, outline: "none", textAlign: "center", marginLeft: "auto", background: "#fff" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8a7e6e", marginBottom: 3 }}>
              <span>Subtotal</span><span>{formatINR(cartSubtotal)}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#16a34a", fontWeight: 700, marginBottom: 3 }}>
                <span>Discount ({discount}%)</span><span>− {formatINR(discountAmt)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 19, fontWeight: 900, color: "#1a1310", marginBottom: 12, borderTop: "1.5px solid #e5e0d8", paddingTop: 8, marginTop: 4 }}>
              <span>Total</span><span style={{ color: "#2563eb" }}>{formatINR(cartTotal)}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setCart([])} style={{ width: 40, height: 42, borderRadius: 10, border: "1.5px solid #fca5a5", background: "#fff", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name="trash" size={15} />
              </button>
              <button onClick={checkoutBill} style={{ flex: 1, height: 42, borderRadius: 10, background: "#1a1310", color: "#f59e0b", border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Icon name="print" size={15} /> Print & Save
              </button>
            </div>
            {customerForm.phone && (
              <button onClick={() => {
                const msg = `*MANISH DAIRY*\nGanga Nagar, Meerut\n\n${cart.map(i => `${i.name} x${formatQty(i.qty, i.unit)} = ${formatINR(i.total)}`).join("\n")}\n\nSubtotal: ${formatINR(cartSubtotal)}${discount > 0 ? `\nDiscount (${discount}%): -${formatINR(discountAmt)}` : ""}\n*TOTAL: ${formatINR(cartTotal)}*\n\nThank you! 🥛`;
                window.open(`https://wa.me/91${customerForm.phone}?text=${encodeURIComponent(msg)}`);
              }} style={{ marginTop: 8, width: "100%", padding: "9px", borderRadius: 10, background: "#25d366", color: "#fff", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Icon name="whatsapp" size={14} /> Send on WhatsApp
              </button>
            )}
          </div>
        )}
      </div>

      {popup && (
        <>
          <div onClick={() => setPopup(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 20, padding: 28, width: 340, zIndex: 201, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
              <div style={{ fontSize: 36 }}>{CAT_ICONS[popup.category]}</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1310" }}>{popup.name}</div>
                <div style={{ fontSize: 13, color: "#8a7e6e" }}>₹{popup.price} / {popup.unit}</div>
              </div>
              <button onClick={() => setPopup(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#8a7e6e", padding: 4 }}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8a7e6e", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                {popup.unit === "piece" ? "Kitne piece?" : "Kitna weight?"}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(popup.unit === "piece" ? [1, 2, 5, 10] : [0.25, 0.5, 1, 2]).map(p => (
                  <button key={p} onClick={() => setPopup(prev => ({ ...prev, tempQty: p, tempAmt: "" }))} style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", border: "2px solid", borderColor: popup.tempQty === p ? (CAT_COLORS[popup.category] || "#f59e0b") : "#e5e0d8", background: popup.tempQty === p ? (CAT_COLORS[popup.category] || "#f59e0b") : "#f8f5f0", color: popup.tempQty === p ? "#fff" : "#4a3f35" }}>
                    {popup.unit === "piece" ? p : formatQty(p, popup.unit)}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
              <button onClick={() => setPopup(p => ({ ...p, tempQty: Math.max(0, +((+p.tempQty - (p.unit === "piece" ? 1 : 0.25)).toFixed(3))) }))} style={popBtn}><Icon name="minus" size={14} /></button>
              <input type="number" value={popup.tempQty} min="0" step={popup.unit === "piece" ? 1 : 0.25}
                onChange={e => setPopup(p => ({ ...p, tempQty: e.target.value, tempAmt: "" }))}
                style={{ flex: 1, textAlign: "center", padding: "10px", border: "2px solid #e5e0d8", borderRadius: 10, fontSize: 18, fontWeight: 900, outline: "none" }} />
              <button onClick={() => setPopup(p => ({ ...p, tempQty: +((+p.tempQty + (p.unit === "piece" ? 1 : 0.25)).toFixed(3)) }))} style={popBtn}><Icon name="plus" size={14} /></button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 18, alignItems: "center" }}>
              <input type="number" value={popup.tempAmt} onChange={e => {
                const amt = e.target.value;
                setPopup(p => ({ ...p, tempAmt: amt, tempQty: amt ? +((+amt / p.price).toFixed(3)) : p.tempQty }));
              }} placeholder="Ya amount type karo (₹)" style={{ flex: 1, padding: "9px 12px", border: "1.5px solid #e5e0d8", borderRadius: 10, fontSize: 13, outline: "none" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, background: "#f8f5f0", borderRadius: 10, padding: "10px 14px" }}>
              <span style={{ fontSize: 13, color: "#8a7e6e", fontWeight: 600 }}>Amount</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: "#2563eb" }}>{formatINR((+popup.tempQty || 0) * popup.price)}</span>
            </div>
            <button onClick={confirmPopup} style={{ width: "100%", padding: "13px", borderRadius: 12, background: "#1a1310", color: "#f59e0b", border: "none", fontWeight: 900, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Icon name="check" size={18} /> Bill Mein Add Karo
            </button>
          </div>
        </>
      )}
    </div>
  );
}
const popBtn = { width: 44, height: 44, borderRadius: 10, border: "1.5px solid #e5e0d8", background: "#f8f5f0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#4a3f35", flexShrink: 0, fontSize: 18 };

// ─── PRODUCTS VIEW ────────────────────────────────────────────────────────────
function ProductsView({ products, onSave, onDelete }) {
  const [form, setForm] = useState({ name: "", category: "Dairy", price: "", cost: "", unit: "kg" });
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name || !form.price || !form.cost) return;
    setSaving(true);
    const ok = await onSave(form, editing);
    if (ok) {
      setEditing(null);
      setForm({ name: "", category: "Dairy", price: "", cost: "", unit: "kg" });
    }
    setSaving(false);
  };

  const edit = (p) => {
    setEditing(p.id);
    setForm({ name: p.name, category: p.category, price: p.price, cost: p.cost, unit: p.unit });
  };

  const del = async (id) => {
    if (window.confirm("Yeh product delete karna chahte ho?")) {
      await onDelete(id);
    }
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24, alignItems: "start" }}>
      <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e0d8", padding: 20, position: "sticky", top: 80 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1310", marginBottom: 16 }}>{editing ? "✏️ Edit Product" : "➕ Add Product"}</div>
        {[["Product Name", "name", "text", "Paneer"], ["Selling Price (₹)", "price", "number", "400"], ["Cost Price (₹)", "cost", "number", "280"]].map(([label, key, type, placeholder]) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#8a7e6e", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</label>
            <input type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder}
              style={{ width: "100%", padding: "9px 12px", border: "1px solid #e5e0d8", borderRadius: 8, fontSize: 14, outline: "none", marginTop: 4, boxSizing: "border-box" }} />
          </div>
        ))}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#8a7e6e", letterSpacing: 0.5, textTransform: "uppercase" }}>Category</label>
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={{ width: "100%", padding: "9px 12px", border: "1px solid #e5e0d8", borderRadius: 8, fontSize: 14, outline: "none", marginTop: 4, background: "#fff" }}>
            {["Dairy", "Sweets", "Snacks", "Tandoor"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#8a7e6e", letterSpacing: 0.5, textTransform: "uppercase" }}>Unit</label>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {["kg", "litre", "piece"].map(u => (
              <button key={u} onClick={() => setForm(p => ({ ...p, unit: u }))} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1.5px solid ${form.unit === u ? "#1a1310" : "#e5e0d8"}`, background: form.unit === u ? "#1a1310" : "#fff", color: form.unit === u ? "#f59e0b" : "#4a3f35", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{u}</button>
            ))}
          </div>
        </div>
        {form.price && form.cost && (
          <div style={{ marginBottom: 12, padding: "8px 12px", background: "#f0fdf4", borderRadius: 8, fontSize: 12 }}>
            Margin: <strong style={{ color: "#16a34a" }}>₹{+form.price - +form.cost}</strong> ({Math.round(((+form.price - +form.cost) / +form.price) * 100)}%)
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          {editing && <button onClick={() => { setEditing(null); setForm({ name: "", category: "Dairy", price: "", cost: "", unit: "kg" }); }} style={{ flex: "0 0 44px", height: 44, borderRadius: 10, border: "1px solid #e5e0d8", background: "#fff", cursor: "pointer", color: "#8a7e6e", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={16} /></button>}
          <button onClick={save} disabled={saving} style={{ flex: 1, padding: "11px", background: "#1a1310", color: "#f59e0b", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: saving ? 0.7 : 1 }}>
            <Icon name="save" size={16} /> {saving ? "Saving..." : editing ? "Update" : "Add Product"}
          </button>
        </div>

      </div>

      <div>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8a7e6e" }}><Icon name="search" size={16} /></span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: 10, border: "1px solid #e5e0d8", background: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e0d8", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px", padding: "10px 16px", background: "#f8f5f0", fontSize: 11, fontWeight: 700, color: "#8a7e6e", textTransform: "uppercase", letterSpacing: 0.5 }}>
            <span>Product</span><span>Category</span><span>Sell Price</span><span>Cost</span><span>Margin</span><span>Actions</span>
          </div>
          {filtered.map((p, i) => (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px", padding: "12px 16px", borderTop: i > 0 ? "1px solid #f0ebe4" : "none", alignItems: "center", fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 700, color: "#1a1310" }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "#8a7e6e" }}>{p.unit}</div>
              </div>
              <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 20, background: CAT_COLORS[p.category] + "22", color: CAT_COLORS[p.category], fontSize: 11, fontWeight: 700 }}>{p.category}</span>
              <span style={{ fontWeight: 700, color: "#2563eb" }}>₹{p.price}</span>
              <span style={{ color: "#ef4444" }}>₹{p.cost}</span>
              <span style={{ color: "#16a34a", fontWeight: 700 }}>₹{p.price - p.cost} <span style={{ fontSize: 10, color: "#8a7e6e" }}>({Math.round(((p.price - p.cost) / p.price) * 100)}%)</span></span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => edit(p)} style={{ padding: "6px", borderRadius: 7, border: "1px solid #e5e0d8", background: "#fff", cursor: "pointer", color: "#2563eb" }}><Icon name="edit" size={13} /></button>
                <button onClick={() => del(p.id)} style={{ padding: "6px", borderRadius: 7, border: "1px solid #e5e0d8", background: "#fff", cursor: "pointer", color: "#ef4444" }}><Icon name="trash" size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SALES VIEW ───────────────────────────────────────────────────────────────
function SalesView({ bills, onDelete, onDeleteAll }) {
  const [filter, setFilter] = useState("today");
  const [selected, setSelected] = useState([]);
  const todayStr = today();
  const monthStr = thisMonth();

  const filtered = bills.filter(b => {
    if (filter === "today") return b.date?.slice(0, 10) === todayStr;
    if (filter === "month") return b.date?.slice(0, 7) === monthStr;
    return true;
  });

  const totalSales = filtered.reduce((s, b) => s + b.total, 0);
  const totalProfit = filtered.reduce((s, b) => s + b.profit, 0);
  const totalDiscount = filtered.reduce((s, b) => s + (b.discountAmt || 0), 0);
  const margin = totalSales > 0 ? Math.round((totalProfit / totalSales) * 100) : 0;
  const labels = { today: "Today", month: "This Month", all: "All Time" };

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const deleteSelected = async () => {
    if (!selected.length) return;
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1310" }}>💰 Sales Overview</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["today", "month", "all"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "8px 18px", borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: "pointer", border: "1.5px solid", borderColor: filter === f ? "#f59e0b" : "#e5e0d8", background: filter === f ? "#f59e0b" : "#fff", color: filter === f ? "#1a1310" : "#8a7e6e" }}>{labels[f]}</button>
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
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
        {[
          { label: "Total Sales", value: formatINR(totalSales), color: "#2563eb", icon: "💳", sub: `${filtered.length} bills` },
          { label: "Total Profit", value: formatINR(totalProfit), color: "#16a34a", icon: "📈", sub: `${margin}% margin` },
          { label: "Discount Given", value: formatINR(totalDiscount), color: "#f59e0b", icon: "🏷️", sub: `${filtered.filter(b => b.discountPct > 0).length} discounted bills` },
          { label: "Avg Bill Value", value: filtered.length ? formatINR(totalSales / filtered.length) : "₹0.00", color: "#7c3aed", icon: "🧾", sub: "per bill" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 16, padding: "20px", border: "1px solid #e5e0d8" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8a7e6e", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: k.color, marginBottom: 2 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "#8a7e6e" }}>{k.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e0d8", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e0d8", fontSize: 14, fontWeight: 800, color: "#1a1310" }}>🧾 Bills — {labels[filter]}</div>
        {filtered.length === 0 && <div style={{ textAlign: "center", color: "#c9b9a8", padding: "40px 0", fontSize: 14 }}>Koi bill nahi {labels[filter].toLowerCase()} mein</div>}
        {filtered.map((b, i) => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", padding: "13px 20px", borderTop: i > 0 ? "1px solid #f0ebe4" : "none", gap: 16, flexWrap: "wrap", background: selected.includes(b.id) ? "#fff8ee" : "transparent" }}>
            <input type="checkbox" checked={selected.includes(b.id)} onChange={() => toggleSelect(b.id)} style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1310" }}>{b.id}</div>
              <div style={{ fontSize: 11, color: "#8a7e6e" }}>{formatDate(b.date)} · {formatTime(b.date)}</div>
            </div>
            {b.customer?.name && <div style={{ fontSize: 12, color: "#4a3f35" }}>👤 {b.customer.name}</div>}
            <div style={{ fontSize: 12, color: "#8a7e6e" }}>{b.items?.length} items</div>
            {b.discountPct > 0 && <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>🏷️ {b.discountPct}% off</div>}
            <div style={{ textAlign: "right" }}>
              {formatINR(b.total)}
              <div style={{ fontSize: 11, color: "#16a34a" }}>+{formatINR(b.profit)} profit</div>
            </div>
            <button onClick={() => printBill(b)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e0d8", background: "#fff", cursor: "pointer", fontSize: 11, color: "#4a3f35", display: "flex", gap: 4, alignItems: "center" }}>
              <Icon name="print" size={12} /> Print
            </button>
            <button onClick={() => { if (window.confirm("Yeh bill delete karein?")) onDelete(b.id); }} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fff", cursor: "pointer", fontSize: 11, color: "#ef4444", display: "flex", gap: 4, alignItems: "center" }}>
              <Icon name="trash" size={12} /> Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ANALYTICS VIEW ───────────────────────────────────────────────────────────
function AnalyticsView({ bills }) {
  const todayBills = bills.filter(b => b.date?.slice(0, 10) === today());
  const monthBills = bills.filter(b => b.date?.slice(0, 7) === thisMonth());

  const totalSales = bills.reduce((s, b) => s + b.total, 0);
  const totalProfit = bills.reduce((s, b) => s + b.profit, 0);
  const todaySales = todayBills.reduce((s, b) => s + b.total, 0);
  const todayProfit = todayBills.reduce((s, b) => s + b.profit, 0);

  const dailyMap = {};
  monthBills.forEach(b => {
    const d = b.date?.slice(0, 10);
    if (!dailyMap[d]) dailyMap[d] = { sales: 0, profit: 0, count: 0 };
    dailyMap[d].sales += b.total;
    dailyMap[d].profit += b.profit;
    dailyMap[d].count++;
  });
  const dailyData = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b));
  const maxSales = Math.max(...dailyData.map(([, v]) => v.sales), 1);

  const itemMap = {};
  bills.forEach(b => b.items?.forEach(i => {
    if (!itemMap[i.name]) itemMap[i.name] = { qty: 0, revenue: 0, count: 0 };
    itemMap[i.name].qty += i.qty;
    itemMap[i.name].revenue += i.total;
    itemMap[i.name].count++;
  }));
  const topItems = Object.entries(itemMap).sort(([, a], [, b]) => b.revenue - a.revenue).slice(0, 8);
  const maxRev = Math.max(...topItems.map(([, v]) => v.revenue), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {[
          { label: "Today Sales", value: formatINR(todaySales), color: "#2563eb", sub: `${todayBills.length} bills` },
          { label: "Today Profit", value: formatINR(todayProfit), color: "#16a34a", sub: `${todaySales > 0 ? Math.round((todayProfit / todaySales) * 100) : 0}% margin` },
          { label: "Total Sales", value: formatINR(totalSales), color: "#7c3aed", sub: `${bills.length} bills ever` },
          { label: "Total Profit", value: formatINR(totalProfit), color: "#ea580c", sub: `${totalSales > 0 ? Math.round((totalProfit / totalSales) * 100) : 0}% margin` },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 16, padding: "20px", border: "1px solid #e5e0d8" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8a7e6e", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: k.color, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "#8a7e6e" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
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
              <div style={{ fontSize: 11, color: "#16a34a" }}>+{formatINR(b.profit)} profit</div>
            </div>
            <button onClick={() => printBill(b)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e0d8", background: "#fff", cursor: "pointer", fontSize: 11, color: "#4a3f35", display: "flex", gap: 4, alignItems: "center" }}>
              <Icon name="print" size={12} /> Print
            </button>
          </div>
        ))}
        {bills.length === 0 && <div style={{ textAlign: "center", color: "#c9b9a8", padding: "30px 0" }}>No bills yet. Start billing!</div>}
      </div>
    </div>
  );
}

// ─── CUSTOMERS VIEW ───────────────────────────────────────────────────────────
function CustomersView({ customers, bills, setCart, setView }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const customerBills = selected ? bills.filter(b => selected.bills?.includes(b.id)) : [];

  const repeatOrder = (bill) => {
    setCart(bill.items.map(i => ({ ...i, qty: i.qty, total: i.qty * i.price })));
    setView("billing");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24, alignItems: "start" }}>
      <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e0d8", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e0d8" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#8a7e6e" }}><Icon name="search" size={14} /></span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..." style={{ width: "100%", padding: "8px 10px 8px 32px", border: "1px solid #e5e0d8", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {filtered.length === 0 && <div style={{ textAlign: "center", color: "#c9b9a8", padding: "30px 0", fontSize: 13 }}>No customers yet</div>}
          {filtered.map(c => (
            <button key={c.phone} onClick={() => setSelected(c)} style={{ width: "100%", textAlign: "left", padding: "13px 16px", borderBottom: "1px solid #f0ebe4", background: selected?.phone === c.phone ? "#f8f5f0" : "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1a1310", display: "flex", alignItems: "center", justifyContent: "center", color: "#f59e0b", fontSize: 16, fontWeight: 900, flexShrink: 0 }}>
                {c.name ? c.name[0].toUpperCase() : "?"}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1310" }}>{c.name || "Unknown"}</div>
                <div style={{ fontSize: 11, color: "#8a7e6e" }}><Icon name="phone" size={10} /> {c.phone} · {c.bills?.length || 0} orders</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected ? (
        <div>
          <div style={{ background: "#1a1310", borderRadius: 18, padding: 24, marginBottom: 20, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1310", fontSize: 26, fontWeight: 900 }}>
              {selected.name ? selected.name[0].toUpperCase() : "?"}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#f59e0b" }}>{selected.name || "Unknown Customer"}</div>
              <div style={{ fontSize: 13, color: "#c9b9a8" }}>{selected.phone}</div>
              <div style={{ fontSize: 12, color: "#8a7e6e", marginTop: 4 }}>{selected.bills?.length || 0} total orders · Total spent: {formatINR(customerBills.reduce((s, b) => s + b.total, 0))}</div>
            </div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1310", marginBottom: 12 }}>Purchase History</div>
          {customerBills.length === 0 && <div style={{ color: "#c9b9a8", textAlign: "center", padding: "30px 0" }}>No bills found</div>}
          {customerBills.map(b => (
            <div key={b.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e0d8", padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1310" }}>{b.id}</div>
                  <div style={{ fontSize: 11, color: "#8a7e6e" }}>{formatDate(b.date)} {formatTime(b.date)}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "#2563eb" }}>{formatINR(b.total)}</div>
                  </div>
                  <button onClick={() => repeatOrder(b)} style={{ padding: "7px 12px", borderRadius: 8, background: "#f59e0b", color: "#1a1310", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800, display: "flex", gap: 5, alignItems: "center" }}>
                    <Icon name="repeat" size={12} /> Repeat
                  </button>
                  <button onClick={() => printBill(b)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e5e0d8", background: "#fff", cursor: "pointer", fontSize: 12, color: "#4a3f35", display: "flex", gap: 4, alignItems: "center" }}>
                    <Icon name="print" size={12} />
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 6 }}>
                {b.items?.map(i => (
                  <div key={i.id} style={{ fontSize: 11, color: "#4a3f35", background: "#f8f5f0", borderRadius: 6, padding: "4px 8px" }}>
                    {i.name} × {formatQty(i.qty, i.unit)} = <strong>{formatINR(i.total)}</strong>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#c9b9a8", fontSize: 15 }}>
          Select a customer to view history
        </div>
      )}
    </div>
  );
}