import { useState, useMemo } from "react";
import Icon from "./Icon";
import { CAT_ICONS, CAT_COLORS } from "../utils/constants";
import { formatINR, formatQty } from "../utils/helpers";


const popBtn = {
  width: 44,
  height: 44,
  borderRadius: 10,
  border: "1.5px solid #e5e0d8",
  background: "#f8f5f0",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#4a3f35",
  flexShrink: 0,
  fontSize: 18,
};

// ─── BILLING VIEW ─────────────────────────────────────────────────────────────
export default function BillingView({
  products,
  filtered,
  bills,
  category,
  setCategory,
  search,
  setSearch,
  cart,
  setCart,
  addToCart,
  updateQty,
  setQtyPreset,
  cartTotal,
  cartSubtotal,
  discountAmt,
  discount,
  setDiscount,
  customerForm,
  setCustomerForm,
  checkoutBill,
  dbCats,
}) {
  const [popup, setPopup] = useState(null);
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [heldBills, setHeldBills] = useState([]);
  const [holdCounter, setHoldCounter] = useState(1);

  const holdBill = () => {
  if (!cart.length) return;
  const name = customerForm.name || `Bill #${holdCounter}`;
  setHoldCounter((prev) => prev + 1);
  setHeldBills((prev) => [
    ...prev,
    { name, cart, customerForm, discount, paymentMode },
  ]);
  setCart([]);
  setCustomerForm({ name: "", phone: "" });
  setDiscount(0);
  setPaymentMode("CASH");
};

  const resumeBill = (index) => {
    const held = heldBills[index];
    setCart(held.cart);
    setCustomerForm(held.customerForm);
    setDiscount(held.discount);
    setPaymentMode(held.paymentMode);
    setHeldBills((prev) => prev.filter((_, i) => i !== index));
  };

  const popularIds = useMemo(() => {
    const countMap = {};
    bills.forEach((b) =>
      b.items?.forEach((i) => {
        countMap[i.id] = (countMap[i.id] || 0) + 1;
      })
    );
    return Object.entries(countMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);
  }, [bills]);

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aIdx = popularIds.indexOf(a.id);
      const bIdx = popularIds.indexOf(b.id);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  }, [filtered, popularIds]);

  const openPopup = (product) => {
    const cartId = popup?.selectedVariation
      ? `${product.id}_${product.selectedVariation}`
      : product.id;
    const existing = cart.find((i) => i.id === cartId);
    setPopup({
      ...product,
      tempQty: existing
        ? existing.qty
        : product.unit === "piece"
          ? 1
          : 0.5,
      tempAmt: "",
      selectedVariation: product.hasVariation
        ? existing?.selectedVariation || null
        : null,
    });
  };

  const confirmPopup = () => {
    if (!popup) return;
    let qty;
    let overrideTotal = null;

    if (popup.tempAmt !== "" && popup.tempAmt !== undefined && +popup.tempAmt > 0) {
      if (popup.price > 0) {
        qty = +((+popup.tempAmt / popup.price).toFixed(3));
      } else {
        qty = parseFloat(popup.tempQty) || 1;
        overrideTotal = +popup.tempAmt * qty;
      }
    } else {
      qty = parseFloat(popup.tempQty) || 0;
    }

    if (qty <= 0) {
      updateQty(popup.id, 0);
      setPopup(null);
      return;
    }

    const cartId = popup.selectedVariation
      ? `${popup.id}_${popup.selectedVariation}`
      : popup.id;

    const cartItem = { ...popup, cartId, id: cartId };
    const inCart = cart.find((i) => i.id === cartId);
    if (!inCart) addToCart(cartItem);

    if (overrideTotal !== null) {
      setCart((prev) =>
        prev.map((i) =>
          i.id === cartId
            ? { ...i, qty, total: overrideTotal, price: overrideTotal / qty }
            : i
        )
      );
    } else {
      updateQty(cartId, qty);
    }

    setPopup(null);
  };

  const CATEGORY_LIST = [
    "Milk", "Dahi", "Paneer", "Namkeen", "Kachori", "Sweets",
    "Amul", "Snacks", "Tandoor", "Cookies", "Dry Fruit Thal", "Other", "Gravy Items",
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
      {/* Left: Category sidebar + product grid */}
      <div style={{ display: "flex", gap: 16 }}>
        {/* Category sidebar */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            width: 90,
            flexShrink: 0,
            maxHeight: "calc(100vh - 160px)",
            overflowY: "auto",
          }}
        >
          {CATEGORY_LIST.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                padding: "6px 4px",
                borderRadius: 10,
                border: "2px solid",
                borderColor: category === c ? (CAT_COLORS[c] || "#f59e0b") : "#e5e0d8",
                background: category === c ? (CAT_COLORS[c] || "#f59e0b") : "#fff",
                color: category === c ? "#fff" : "#4a3f35",
                fontSize: 10,
                fontWeight: category === c ? 800 : 500,
                cursor: "pointer",
                transition: "all 0.15s",
                boxShadow: category === c ? `0 4px 12px ${(CAT_COLORS[c] || "#f59e0b")}44` : "none",
              }}
            >
              <span style={{ fontSize: 16 }}>{CAT_ICONS[c] || "🏷️"}</span>
              {c}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8a7e6e" }}>
              <Icon name="search" size={16} />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              style={{
                width: "100%",
                padding: "10px 12px 10px 36px",
                borderRadius: 10,
                border: "1px solid #e5e0d8",
                background: "#fff",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
            {sortedFiltered.map((p) => {
              const inCart = cart.find((i) => i.id === p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => openPopup(p)}
                  style={{
                    background: "#fff",
                    border: `2px solid ${inCart ? CAT_COLORS[p.category] || "#f59e0b" : "#e5e0d8"}`,
                    borderRadius: 14,
                    padding: "14px 12px",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    position: "relative",
                    boxShadow: inCart ? `0 0 0 3px ${CAT_COLORS[p.category]}22` : "none",
                  }}
                >
                  {popularIds.includes(p.id) && !inCart && (
                    <div style={{ position: "absolute", top: 8, right: 8, background: "#f59e0b", color: "#1a1310", borderRadius: 999, fontSize: 9, fontWeight: 800, padding: "2px 6px" }}>
                      ⭐ TOP
                    </div>
                  )}
                  {inCart && (
                    <div style={{ position: "absolute", top: 8, right: 8, background: CAT_COLORS[p.category] || "#f59e0b", color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 800, padding: "2px 7px" }}>
                      ×{formatQty(inCart.qty, inCart.unit)}
                    </div>
                  )}
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{CAT_ICONS[p.category]}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1310", marginBottom: 2, lineHeight: 1.3 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "#8a7e6e", marginBottom: 6 }}>{p.category}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: CAT_COLORS[p.category] || "#f59e0b" }}>
                    ₹{p.price}
                    <span style={{ fontSize: 10, fontWeight: 500, color: "#8a7e6e" }}>/{p.unit}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", color: "#8a7e6e", padding: "40px 0", fontSize: 15 }}>
              No products found
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart panel */}
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          border: "1px solid #e5e0d8",
          overflow: "hidden",
          position: "sticky",
          top: 80,
        }}
      >
        <div style={{ padding: "14px 16px", background: "#1a1310", display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="cart" size={15} />
          <span style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>Current Bill</span>
          {cart.length > 0 && (
            <span style={{ marginLeft: "auto", background: "#f59e0b", color: "#1a1310", borderRadius: 999, fontSize: 11, fontWeight: 900, padding: "2px 8px" }}>
              {cart.length}
            </span>
          )}
          {heldBills.length > 0 && (
            <span style={{ marginLeft: 4, background: "#ef4444", color: "#fff", borderRadius: 999, fontSize: 11, fontWeight: 900, padding: "2px 8px", cursor: "pointer" }}>
              ⏸️ {heldBills.length}
            </span>
          )}
        </div>

        {/* Held bills */}
        {heldBills.length > 0 && (
          <div style={{ padding: "8px 12px", background: "#fff8ee", borderBottom: "1px solid #f0ebe4" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>
              ⏸️ HELD BILLS ({heldBills.length})
            </div>
            {heldBills.map((b, i) => (
              <div
                key={i}
                onClick={() => resumeBill(i)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "5px 8px",
                  background: "#fff",
                  borderRadius: 8,
                  marginBottom: 4,
                  cursor: "pointer",
                  border: "1px solid #f59e0b",
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1310" }}>{b.name}</span>
                <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>{b.cart.length} items →</span>
              </div>
            ))}
          </div>
        )}

        {/* Customer form */}
        <div style={{ padding: "10px 12px", borderBottom: "1px solid #f0ebe4", display: "flex", flexDirection: "column", gap: 6 }}>
          <input
            value={customerForm.name}
            onChange={(e) => setCustomerForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="👤 Customer Name"
            style={{ width: "100%", padding: "7px 10px", border: "1px solid #e5e0d8", borderRadius: 8, fontSize: 12, outline: "none", boxSizing: "border-box" }}
          />
          <input
            value={customerForm.phone}
            onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))}
            placeholder="📱 Phone"
            style={{ width: "100%", padding: "7px 10px", border: "1px solid #e5e0d8", borderRadius: 8, fontSize: 12, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Cart items */}
        <div style={{ maxHeight: 260, overflowY: "auto" }}>
          {cart.length === 0 && (
            <div style={{ textAlign: "center", color: "#c9b9a8", padding: "28px 0", fontSize: 13 }}>
              Product select karo
            </div>
          )}
          {cart.map((item, i) => (
            <div
              key={item.id}
              onClick={() => openPopup(item)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                borderTop: i > 0 ? "1px solid #f0ebe4" : "none",
                cursor: "pointer",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f8f5f0")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1310", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.name}{item.selectedVariation ? ` (${item.selectedVariation === "half" ? "Half" : "Full"})` : ""}
                </div>
                <div style={{ fontSize: 11, color: "#8a7e6e" }}>
                  {formatQty(item.qty, item.unit)} × ₹{item.price}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#2563eb" }}>{formatINR(item.total)}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); updateQty(item.id, 0); }}
                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 2, display: "flex", alignItems: "center" }}
                >
                  <Icon name="trash" size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout panel */}
        {cart.length > 0 && (
          <div style={{ padding: "12px 14px", borderTop: "2px dashed #e5e0d8" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {["CASH", "UPI"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  style={{
                    flex: 1,
                    padding: "9px",
                    borderRadius: 10,
                    border: "2px solid",
                    borderColor: paymentMode === mode ? "#f59e0b" : "#e5e0d8",
                    background: paymentMode === mode ? "#1a1310" : "#fff",
                    color: paymentMode === mode ? "#f59e0b" : "#8a7e6e",
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {mode === "CASH" ? "💵 CASH" : "📲 UPI"}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8a7e6e", marginBottom: 3 }}>
              <span>Subtotal</span>
              <span>{formatINR(cartSubtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 19, fontWeight: 900, color: "#1a1310", marginBottom: 12, borderTop: "1.5px solid #e5e0d8", paddingTop: 8, marginTop: 4 }}>
              <span>Total</span>
              <span style={{ color: "#2563eb" }}>{formatINR(cartTotal)}</span>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setCart([])}
                style={{ width: 40, height: 42, borderRadius: 10, border: "1.5px solid #fca5a5", background: "#fff", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <Icon name="trash" size={15} />
              </button>
              <button
                onClick={holdBill}
                style={{ height: 42, padding: "0 14px", borderRadius: 10, background: "#f59e0b", color: "#1a1310", border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer" }}
              >
                ⏸️ Hold
              </button>
              <button
                onClick={() => { checkoutBill(paymentMode); setPaymentMode("CASH"); }}
                style={{ flex: 1, height: 42, borderRadius: 10, background: "#1a1310", color: "#f59e0b", border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <Icon name="print" size={15} /> Print & Save
              </button>
            </div>

            {customerForm.phone && (
              <button
                onClick={() => {
                  const msg = `*MANISH DAIRY*\nGanga Nagar, Meerut\n\n${cart
                    .map((i) => `${i.name} x${formatQty(i.qty, i.unit)} = ${formatINR(i.total)}`)
                    .join("\n")}\n\nSubtotal: ${formatINR(cartSubtotal)}${discount > 0 ? `\nDiscount (${discount}%): -${formatINR(discountAmt)}` : ""}\n*TOTAL: ${formatINR(cartTotal)}*\n\nThank you! 🥛`;
                  window.open(`https://wa.me/91${customerForm.phone}?text=${encodeURIComponent(msg)}`);
                }}
                style={{ marginTop: 8, width: "100%", padding: "9px", borderRadius: 10, background: "#25d366", color: "#fff", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <Icon name="whatsapp" size={14} /> Send on WhatsApp
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quantity popup */}
      {popup && (
        <>
          <div
            onClick={() => setPopup(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200 }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              background: "#fff",
              borderRadius: 20,
              padding: 28,
              width: 340,
              zIndex: 201,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
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

            {popup.hasVariation && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#8a7e6e", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                  Half ya Full?
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setPopup((p) => ({ ...p, tempQty: 1, tempAmt: "", selectedVariation: "half", price: p.halfPrice }))}
                    style={{ flex: 1, padding: "14px", borderRadius: 12, fontWeight: 900, fontSize: 15, cursor: "pointer", border: "2px solid", borderColor: popup.selectedVariation === "half" ? "#f59e0b" : "#e5e0d8", background: popup.selectedVariation === "half" ? "#1a1310" : "#f8f5f0", color: popup.selectedVariation === "half" ? "#f59e0b" : "#4a3f35" }}
                  >
                    HALF<br /><span style={{ fontSize: 13, fontWeight: 700 }}>₹{popup.halfPrice}</span>
                  </button>
                  <button
                    onClick={() => setPopup((p) => ({ ...p, tempQty: 1, tempAmt: "", selectedVariation: "full", price: p.fullPrice }))}
                    style={{ flex: 1, padding: "14px", borderRadius: 12, fontWeight: 900, fontSize: 15, cursor: "pointer", border: "2px solid", borderColor: popup.selectedVariation === "full" ? "#ef4444" : "#e5e0d8", background: popup.selectedVariation === "full" ? "#ef4444" : "#f8f5f0", color: popup.selectedVariation === "full" ? "#fff" : "#4a3f35" }}
                  >
                    FULL<br /><span style={{ fontSize: 13, fontWeight: 700 }}>₹{popup.fullPrice}</span>
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8a7e6e", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                {popup.unit === "piece" ? "Kitne piece?" : "Kitna weight?"}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(popup.unit === "piece" ? [1, 2, 5, 10] : [0.25, 0.5, 1, 2]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPopup((prev) => ({ ...prev, tempQty: p, tempAmt: "" }))}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: 10,
                      fontWeight: 800,
                      fontSize: 14,
                      cursor: "pointer",
                      border: "2px solid",
                      borderColor: popup.tempQty === p ? (CAT_COLORS[popup.category] || "#f59e0b") : "#e5e0d8",
                      background: popup.tempQty === p ? (CAT_COLORS[popup.category] || "#f59e0b") : "#f8f5f0",
                      color: popup.tempQty === p ? "#fff" : "#4a3f35",
                    }}
                  >
                    {popup.unit === "piece" ? p : formatQty(p, popup.unit)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
              <button
                onClick={() => setPopup((p) => ({ ...p, tempQty: Math.max(0, +((+p.tempQty - (p.unit === "piece" ? 1 : 0.25)).toFixed(3))) }))}
                style={popBtn}
              >
                <Icon name="minus" size={14} />
              </button>
              <input
                type="number"
                value={popup.tempQty}
                min="0"
                step={popup.unit === "piece" ? 1 : 0.25}
                onChange={(e) => setPopup((p) => ({ ...p, tempQty: e.target.value, tempAmt: "" }))}
                style={{ flex: 1, textAlign: "center", padding: "10px", border: "2px solid #e5e0d8", borderRadius: 10, fontSize: 18, fontWeight: 900, outline: "none" }}
              />
              <button
                onClick={() => setPopup((p) => ({ ...p, tempQty: +((+p.tempQty + (p.unit === "piece" ? 1 : 0.25)).toFixed(3)) }))}
                style={popBtn}
              >
                <Icon name="plus" size={14} />
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 18, alignItems: "center" }}>
              <input
                type="number"
                value={popup.tempAmt}
                onChange={(e) => {
                  const amt = e.target.value;
                  setPopup((p) => ({
                    ...p,
                    tempAmt: amt,
                    tempQty: amt && p.price > 0 ? +((+amt / p.price).toFixed(3)) : p.tempQty,
                  }));
                }}
                placeholder="Ya amount type karo (₹)"
                style={{ flex: 1, padding: "9px 12px", border: "1.5px solid #e5e0d8", borderRadius: 10, fontSize: 13, outline: "none" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, background: "#f8f5f0", borderRadius: 10, padding: "10px 14px" }}>
              <span style={{ fontSize: 13, color: "#8a7e6e", fontWeight: 600 }}>Amount</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: "#2563eb" }}>
                {formatINR((+popup.tempQty || 0) * (popup.price > 0 ? popup.price : +popup.tempAmt || 0))}
              </span>
            </div>

            <button
              onClick={confirmPopup}
              style={{ width: "100%", padding: "13px", borderRadius: 12, background: "#1a1310", color: "#f59e0b", border: "none", fontWeight: 900, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <Icon name="check" size={18} /> Bill Mein Add Karo
            </button>
          </div>
        </>
      )}
    </div>
  );
}