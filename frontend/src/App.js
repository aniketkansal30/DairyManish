import React, { Suspense, lazy, useState, useEffect, useMemo, useRef } from "react";
import Login from "./Login";

import { apiCall } from "./utils/api";
import { today } from "./utils/helpers";
import { printBill } from "./utils/printBill";
import Navbar from "./components/Navbar";

// Lazy load — sirf jo view active hai wahi load hoga
const BillingView = lazy(() => import("./components/BillingView"));
const ProductsView = lazy(() => import("./components/ProductsView"));
const SalesView = lazy(() => import("./components/SalesView"));
const AnalyticsView = lazy(() => import("./components/AnalyticsView"));
const CustomersView = lazy(() => import("./components/CustomersView"));

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(localStorage.getItem("dairy_token"));
  const [view, setView] = useState("billing");
  const [tapCount, setTapCount] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Track responsive screen size
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle automatic session logout on expired/invalid token
  useEffect(() => {
    const handleAuthExpired = () => {
      setToken(null);
      alert("Aapka session expire ho gaya hai. Kripya fir se login karein (Your session has expired. Please login again).");
    };
    window.addEventListener("auth_expired", handleAuthExpired);
    return () => window.removeEventListener("auth_expired", handleAuthExpired);
  }, []);

  // ─── ADMIN SHORTCUTS ────────────────────────────────────────────────────────
  // Ctrl + Shift + D → Discount
  // Ctrl + Shift + X → Delete

  const triggerDiscount = async () => {
    const pass = prompt("Enter Admin Password");

    if (pass !== "aniket123") {
      alert("❌ Wrong Password!");
      return;
    }

    const fromDate = prompt(
      "Enter FROM Date (YYYY-MM-DD)\nExample: 2026-09-01"
    );
    if (!fromDate) return;

    const toDate = prompt(
      "Enter TO Date (YYYY-MM-DD)\nExample: 2026-09-30"
    );
    if (!toDate) return;

    const discount = prompt("Enter Global Discount %");

    if (!discount || Number(discount) <= 0 || Number(discount) >= 100) {
      alert("❌ Invalid discount percentage");
      return;
    }

    const confirmApply = window.confirm(
      `Apply ${discount}% discount?\n\n` +
      `From: ${fromDate}\n` +
      `To: ${toDate}\n\n` +
      `Only bills in this date range will be affected.`
    );

    if (!confirmApply) return;

    try {
      const result = await apiCall("/bills/apply-discount", "POST", {
        discount: Number(discount),
        fromDate,
        toDate
      });

      alert(
        `✅ Discount Applied!\n\n` +
        `Discount: ${discount}%\n` +
        `Date: ${fromDate} → ${toDate}\n` +
        `Bills Updated: ${result.updated}`
      );

      window.location.reload();
    } catch (error) {
      alert("❌ Discount apply nahi hua: " + error.message);
    }
  };


const triggerDelete = async () => {
  const pass = prompt("Enter Admin Password");

  if (pass !== "aniket123") {
    alert("❌ Wrong Password!");
    return;
  }

  // TOKEN ENTER KARO
  const tokenNumber = prompt(
    "Enter Token Number\n\nExample: 356"
  );

  if (!tokenNumber) return;

  try {
    // Saari bills me token search
    const result = await apiCall("/bills?limit=10000");

    const allBills = result.bills || result || [];

    const bill = allBills.find(
      (b) => String(b.id?.slice(-3)) === String(tokenNumber).padStart(3, "0")
    );

    if (!bill) {
      alert(`❌ Token ${tokenNumber} ka bill nahi mila.`);
      return;
    }

    if (!bill.items || bill.items.length === 0) {
      alert("❌ Is bill mein koi item nahi hai.");
      return;
    }

    // ITEMS SHOW KARO
    const itemList = bill.items
      .map(
        (item, index) =>
          `${index + 1}. ${item.name} | Qty: ${item.qty} | ₹${item.total}`
      )
      .join("\n");

    const itemInput = prompt(
      `TOKEN: ${tokenNumber}\n\n` +
      `ITEMS:\n${itemList}\n\n` +
      `Delete karne wale item numbers enter karo.\n` +
      `Example: 1,3`
    );

    if (!itemInput) return;

    // Selected indexes
    const indexes = itemInput
      .split(",")
      .map((x) => Number(x.trim()) - 1)
      .filter(
        (x) =>
          Number.isInteger(x) &&
          x >= 0 &&
          x < bill.items.length
      );

    if (!indexes.length) {
      alert("❌ Invalid item number.");
      return;
    }

    const uniqueIndexes = [...new Set(indexes)];

    const deletedItems = uniqueIndexes.map(
      (index) => bill.items[index]
    );

    const remainingItems = bill.items.filter(
      (_, index) => !uniqueIndexes.includes(index)
    );

    if (remainingItems.length === 0) {
      alert(
        "❌ Saare items delete nahi kar sakte.\n\n" +
        "Agar poora bill delete karna hai to alag se bill deletion use karo."
      );
      return;
    }

    const deletedList = deletedItems
      .map((item) => `• ${item.name} - ₹${item.total}`)
      .join("\n");

    const confirmDelete = window.confirm(
      `⚠️ CONFIRM ITEM DELETE\n\n` +
      `Token: ${tokenNumber}\n\n` +
      `Delete hone wale items:\n` +
      `${deletedList}\n\n` +
      `Remaining Items: ${remainingItems.length}\n\n` +
      `Continue?`
    );

    if (!confirmDelete) return;

    // Existing PUT route se bill update
    const updated = await apiCall(
      `/bills/${bill.id}`,
      "PUT",
      {
        items: remainingItems,
        discountPct: bill.discountPct || 0,
      }
    );

    // Local state update
    setBills((prev) =>
      prev.map((b) => (b.id === bill.id ? updated : b))
    );

    alert(
      `✅ Items Deleted!\n\n` +
      `Token: ${tokenNumber}\n` +
      `Deleted: ${deletedItems.length} item(s)\n` +
      `Remaining: ${remainingItems.length} item(s)\n` +
      `New Total: ₹${Math.round(updated.total)}`
    );

    window.location.reload();

  } catch (error) {
    console.error("❌ TOKEN ITEM DELETE ERROR:", error);
    alert("❌ Item delete nahi hua: " + error.message);
  }
};

  useEffect(() => {
    const handleKey = (e) => {

      // Ctrl + Shift + D
      if (
        e.ctrlKey &&
        e.shiftKey &&
        e.key.toLowerCase() === "d"
      ) {
        e.preventDefault();
        triggerDiscount();
        return;
      }

      // Ctrl + Shift + X
      if (
        e.ctrlKey &&
        e.shiftKey &&
        e.key.toLowerCase() === "x"
      ) {
        e.preventDefault();
        triggerDelete();
      }
    };

    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, []);  // ─── DATA STATE ─────────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [dbCats, setDbCats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ─── BILLING STATE ──────────────────────────────────────────────────────────
  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState("Milk");
  const [search, setSearch] = useState("");
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "" });
  const [discount, setDiscount] = useState(0);
  const [editingBillId, setEditingBillId] = useState(null);
  const isSubmittingBill = useRef(false);

  // ─── LOAD DATA ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    async function loadAll() {
      try {
        setLoading(true);
        const [prods, cats] = await Promise.all([
          apiCall("/products"),
          apiCall("/categories"),
        ]);
        setProducts(prods);
        setDbCats(cats);
        // Bills aur customers background mein load karo
        const todayIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
        apiCall("/bills?limit=250").then(res => setBills(res.bills || res)).catch(() => { });
        apiCall("/customers").then(custs => setCustomers(custs)).catch(() => { });
      } catch (e) {
        setError(
          "Server se connect nahi ho paya. Backend chal raha hai? " + e.message
        );
      } finally {
        setLoading(false);
      }
    }
    loadAll(); }, [token]);

  // ─── CUSTOMER AUTO-COMPLETE ──────────────────────────────────────────────────
  useEffect(() => {
    const phone = customerForm.phone?.trim();
    if (phone && phone.length >= 10) {
      const localMatch = customers.find(c => c.phone === phone);
      if (localMatch) {
        if (!customerForm.name) {
          setCustomerForm(prev => ({ ...prev, name: localMatch.name }));
        }
      } else {
        apiCall(`/customers/${phone}`)
          .then(res => {
            if (res && res.name && !customerForm.name) {
              setCustomerForm(prev => ({ ...prev, name: res.name }));
            }
          })
          .catch(() => {});
      }
    }
  }, [customerForm.phone, customers]);

  // ─── FILTERED PRODUCTS ──────────────────────────────────────────────────────
  const filtered = useMemo(
    () =>
      products
        .filter(
          (p) =>
            (category === "All" || p.category === category) &&
            p.name.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [products, category, search]
  );

  // ─── CART HELPERS ───────────────────────────────────────────────────────────
  const addToCart = (product) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.id === product.id);
      if (ex)
        return prev.map((i) =>
          i.id === product.id
            ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.price }
            : i
        );
      return [...prev, { ...product, qty: 1, total: product.price }];
    });
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty, total: qty * i.price } : i))
    );
  };

  const setQtyPreset = (id, preset, unit) => {
    const qty = unit === "kg" || unit === "litre" ? preset : Math.round(preset);
    updateQty(id, qty);
  };

  // ─── CART TOTALS ────────────────────────────────────────────────────────────
  const cartSubtotal = cart.reduce((s, i) => s + i.total, 0);
  const cartCost = cart.reduce((s, i) => s + i.qty * i.cost, 0);
  const discountAmt = cartSubtotal * (discount / 100);
  const cartTotal = cartSubtotal - discountAmt;

  // ─── CHECKOUT ───────────────────────────────────────────────────────────────
  const checkoutBill = async (paymentMode = "CASH", customDate = null) => {
    if (!cart.length) return;

    if (isSubmittingBill.current) {
      console.warn("⚠️ Bill save is already in progress. Ignoring duplicate click.");
      return;
    }
    isSubmittingBill.current = true;

    // Editing mode
    if (editingBillId) {
      const ok = await handleEditBill(editingBillId, cart, discount);
      if (ok) {
        setCart([]);
        setCustomerForm({ name: "", phone: "" });
        setDiscount(0);
        setEditingBillId(null);
        setView("sales");
      }
      isSubmittingBill.current = false;
      return;
    }

    const billId = "MD" + Date.now() + Math.floor(100 + Math.random() * 900);
    const bill = {
      id: billId,
      date: customDate ? new Date(customDate + "T00:00:00+05:30").toISOString() : new Date().toISOString(),
      items: cart,
      subtotal: Math.round(cartSubtotal),
      discountPct: discount,
      discountAmt: Math.round(discountAmt),
      total: Math.round(cartTotal),
      cost: Math.round(cartCost),
      profit: Math.round(cartTotal) - Math.round(cartCost),
      customer:
        customerForm.name || customerForm.phone ? { ...customerForm } : null,
      paymentMode,
    };
    try {
      const saved = await apiCall("/bills", "POST", bill);
      setBills((prev) => [saved, ...prev]);
      apiCall("/customers").then(setCustomers).catch(() => {});
      printBill(saved);
      setCart([]);
      setCustomerForm({ name: "", phone: "" });
      setDiscount(0);
      setCategory("Milk");
    } catch (e) {
      alert("Bill save karne mein error: " + e.message);
    } finally {
      isSubmittingBill.current = false;
    }
  };

  // ─── PRODUCT CRUD ───────────────────────────────────────────────────────────
  const handleSaveProduct = async (formData, editingId) => {
    try {
      if (editingId) {
        const updated = await apiCall(`/products/${editingId}`, "PUT", {
          ...formData,
          price: +formData.price,
          cost: +formData.cost,
          hasVariation: formData.hasVariation,
          halfPrice: +formData.halfPrice || 0,
          fullPrice: +formData.fullPrice || 0,
        });
        setProducts((prev) =>
          prev.map((p) => (p.id === editingId ? updated : p))
        );
      } else {
        const created = await apiCall("/products", "POST", {
          ...formData,
          price: +formData.price,
          cost: +formData.cost,
          hasVariation: formData.hasVariation,
          halfPrice: +formData.halfPrice || 0,
          fullPrice: +formData.fullPrice || 0,
        });
        setProducts((prev) => [...prev, created]);
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
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      alert("Product delete karne mein error: " + e.message);
    }
  };


  const handleEditBill = async (billId, updatedItems, updatedDiscountPct) => {
    try {
      const updated = await apiCall(`/bills/${billId}`, "PUT", {
        items: updatedItems,
        discountPct: updatedDiscountPct,
      });
      setBills((prev) => prev.map((b) => (b.id === billId ? updated : b)));
      return true;
    } catch (e) {
      alert("Bill edit karne mein error: " + e.message);
      return false;
    }
  };
  // ─── Load bill into cart for editing ──────────────────────────────────────
  const loadBillIntoCart = (bill) => {
    setCart(bill.items.map(i => ({ ...i })));
    setCustomerForm({ name: bill.customer?.name || "", phone: bill.customer?.phone || "" });
    setDiscount(bill.discountPct || 0);
    setEditingBillId(bill.id);
    setView("billing");
  };

  // ─── LOADING / ERROR STATES ─────────────────────────────────────────────────
  if (!token) return <Login onLogin={(t) => setToken(t)} />;

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#f8f5f0",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 48 }}>🥛</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1310" }}>MANISH DAIRY</div>
        <div style={{ fontSize: 14, color: "#8a7e6e" }}>Data load ho raha hai...</div>
      </div>
    );

  if (error)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#f8f5f0",
          flexDirection: "column",
          gap: 16,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48 }}>❌</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#ef4444" }}>{error}</div>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: "10px 24px", background: "#1a1310", color: "#f59e0b", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}
        >
          Dobara Try Karo
        </button>
      </div>
    );

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: isMobile ? "auto" : "100vh",
        overflow: isMobile ? "auto" : "hidden",
        background: "#f8f5f0",
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      {/* Footer */}

      <Navbar
        view={view}
        setView={setView}
        onLogout={() => {
          localStorage.clear();
          setToken(null);
        }}
      />

            <div
        style={{
          padding: isMobile ? "12px 8px" : "16px 24px",
          maxWidth: 1400,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: isMobile ? "visible" : "auto",
        }}
      >
        <Suspense fallback={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, color: "#8a7e6e", fontSize: 14 }}>
            Loading...
          </div>
        }>
          {view === "billing" && (
            <BillingView
              products={products}
              filtered={filtered}
              bills={bills}
              category={category}
              setCategory={setCategory}
              search={search}
              setSearch={setSearch}
              cart={cart}
              setCart={setCart}
              addToCart={addToCart}
              updateQty={updateQty}
              setQtyPreset={setQtyPreset}
              cartTotal={cartTotal}
              cartSubtotal={cartSubtotal}
              discountAmt={discountAmt}
              discount={discount}
              setDiscount={setDiscount}
              customerForm={customerForm}
              setCustomerForm={setCustomerForm}
              checkoutBill={checkoutBill}
              dbCats={dbCats}
              editingBillId={editingBillId}
              onCancelEdit={() => { setEditingBillId(null); setCart([]); setView("sales"); }}
            />
          )}
          {view === "products" && (
            <ProductsView
              products={products}
              onSave={handleSaveProduct}
              onDelete={handleDeleteProduct}
              dbCats={dbCats}
              setDbCats={setDbCats}
            />
          )}
          {view === "sales" && (
            <SalesView
              bills={bills}
              onEdit={handleEditBill}
              products={products}
              setView={setView}
              onLoadEdit={loadBillIntoCart}
             
            />
          )}
          {view === "analytics" && <AnalyticsView />}
          {view === "customers" && (
            <CustomersView
              customers={customers}
              setCart={setCart}
              setView={setView}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}