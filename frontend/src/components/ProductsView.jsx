import { useState } from "react";
import Icon from "./Icon";
import { CAT_COLORS } from "../utils/constants";
import { apiCall } from "../utils/api";

// ─── PRODUCTS VIEW ────────────────────────────────────────────────────────────
export default function ProductsView({ products, onSave, onDelete, dbCats, setDbCats }) {
  const [form, setForm] = useState({
    name: "",
    category: "Sweets",
    price: "",
    cost: "",
    unit: "kg",
    hasVariation: false,
    halfPrice: "",
    fullPrice: "",
  });
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [cats, setCats] = useState([...["Sweets", "Snacks", "Tandoor"], ...dbCats]);
  const [newCat, setNewCat] = useState("");

  const addCategory = async () => {
    const trimmed = newCat.trim();
    if (!trimmed || cats.includes(trimmed)) return;
    try {
      await apiCall("/categories", "POST", { name: trimmed });
      setDbCats((prev) => [...prev, trimmed]);
      setCats((prev) => [...prev, trimmed]);
      setNewCat("");
    } catch (e) {
      alert("Category save nahi hui: " + e.message);
    }
  };

  const deleteCategory = async (catName) => {
    if (!window.confirm(`"${catName}" category delete karein?`)) return;
    try {
      await apiCall(`/categories/${catName}`, "DELETE");
      setDbCats((prev) => prev.filter((c) => c !== catName));
      setCats((prev) => prev.filter((c) => c !== catName));
    } catch (e) {
      alert("Delete nahi hui: " + e.message);
    }
  };

  const save = async () => {
    if (!form.name || form.price === "" || form.cost === "") return;
    setSaving(true);
    const ok = await onSave(form, editing);
    if (ok) {
      setEditing(null);
      setForm({ name: "", category: "Sweets", price: "", cost: "", unit: "kg" });
    }
    setSaving(false);
  };

  const edit = (p) => {
    setEditing(p.id);
    setForm({
      name: p.name,
      category: p.category,
      price: p.price,
      cost: p.cost,
      unit: p.unit,
      hasVariation: p.hasVariation || false,
      halfPrice: p.halfPrice || "",
      fullPrice: p.fullPrice || "",
    });
  };

  const del = async (id) => {
    if (window.confirm("Yeh product delete karna chahte ho?")) {
      await onDelete(id);
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24, alignItems: "start" }}>
      {/* Form panel */}
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          border: "1px solid #e5e0d8",
          padding: 20,
          position: "sticky",
          top: 80,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1310", marginBottom: 16 }}>
          {editing ? "✏️ Edit Product" : "➕ Add Product"}
        </div>

        {[
          ["Product Name", "name", "text", "Paneer"],
          ["Selling Price (₹)", "price", "number", "400"],
          ["Cost Price (₹)", "cost", "number", "280"],
        ].map(([label, key, type, placeholder]) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#8a7e6e", letterSpacing: 0.5, textTransform: "uppercase" }}>
              {label}
            </label>
            <input
              type={type}
              value={form[key]}
              onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
              placeholder={placeholder}
              style={{ width: "100%", padding: "9px 12px", border: "1px solid #e5e0d8", borderRadius: 8, fontSize: 14, outline: "none", marginTop: 4, boxSizing: "border-box" }}
            />
          </div>
        ))}

        {/* Category */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#8a7e6e", letterSpacing: 0.5, textTransform: "uppercase" }}>
            Category
          </label>
          <select
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
            style={{ width: "100%", padding: "9px 12px", border: "1px solid #e5e0d8", borderRadius: 8, fontSize: 14, outline: "none", marginTop: 4, background: "#fff" }}
          >
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              placeholder="Nai category..."
              style={{ flex: 1, padding: "7px 10px", border: "1px solid #e5e0d8", borderRadius: 8, fontSize: 13, outline: "none" }}
            />
            <button
              onClick={addCategory}
              style={{ padding: "7px 14px", background: "#1a1310", color: "#f59e0b", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer" }}
            >
              + Add
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {cats.map((c) => (
              <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f0ebe4", borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 600, color: "#4a3f35" }}>
                {c}
                <button
                  onClick={() => deleteCategory(c)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontWeight: 900, fontSize: 13, padding: 0, lineHeight: 1 }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Unit selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#8a7e6e", letterSpacing: 0.5, textTransform: "uppercase" }}>Unit</label>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {["kg", "litre", "piece"].map((u) => (
              <button
                key={u}
                onClick={() => setForm((p) => ({ ...p, unit: u }))}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: 8,
                  border: `1.5px solid ${form.unit === u ? "#1a1310" : "#e5e0d8"}`,
                  background: form.unit === u ? "#1a1310" : "#fff",
                  color: form.unit === u ? "#f59e0b" : "#4a3f35",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Variation toggle */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#8a7e6e", letterSpacing: 0.5, textTransform: "uppercase" }}>
            Half / Full Variation
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            <button
              onClick={() => setForm((p) => ({ ...p, hasVariation: !p.hasVariation }))}
              style={{
                padding: "7px 16px",
                borderRadius: 8,
                border: `1.5px solid ${form.hasVariation ? "#f59e0b" : "#e5e0d8"}`,
                background: form.hasVariation ? "#1a1310" : "#fff",
                color: form.hasVariation ? "#f59e0b" : "#8a7e6e",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {form.hasVariation ? "✅ ON" : "OFF"}
            </button>
            <span style={{ fontSize: 12, color: "#8a7e6e" }}>Toggle for Tandoor/Gravy items</span>
          </div>
          {form.hasVariation && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#8a7e6e" }}>HALF Price (₹)</label>
                <input
                  type="number"
                  value={form.halfPrice}
                  onChange={(e) => setForm((p) => ({ ...p, halfPrice: e.target.value }))}
                  placeholder="e.g. 130"
                  style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #f59e0b", borderRadius: 8, fontSize: 14, outline: "none", marginTop: 4, boxSizing: "border-box" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#8a7e6e" }}>FULL Price (₹)</label>
                <input
                  type="number"
                  value={form.fullPrice}
                  onChange={(e) => setForm((p) => ({ ...p, fullPrice: e.target.value }))}
                  placeholder="e.g. 230"
                  style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #f59e0b", borderRadius: 8, fontSize: 14, outline: "none", marginTop: 4, boxSizing: "border-box" }}
                />
              </div>
            </div>
          )}
        </div>

        {form.price && form.cost && (
          <div style={{ marginBottom: 12, padding: "8px 12px", background: "#f0fdf4", borderRadius: 8, fontSize: 12 }}>
            Margin: <strong style={{ color: "#16a34a" }}>₹{+form.price - +form.cost}</strong>{" "}
            ({Math.round(((+form.price - +form.cost) / +form.price) * 100)}%)
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {editing && (
            <button
              onClick={() => {
                setEditing(null);
                setForm({ name: "", category: "Sweets", price: "", cost: "", unit: "kg" });
              }}
              style={{ flex: "0 0 44px", height: 44, borderRadius: 10, border: "1px solid #e5e0d8", background: "#fff", cursor: "pointer", color: "#8a7e6e", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <Icon name="close" size={16} />
            </button>
          )}
          <button
            onClick={save}
            disabled={saving}
            style={{
              flex: 1,
              padding: "11px",
              background: "#1a1310",
              color: "#f59e0b",
              border: "none",
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: saving ? 0.7 : 1,
            }}
          >
            <Icon name="save" size={16} /> {saving ? "Saving..." : editing ? "Update" : "Add Product"}
          </button>
        </div>
      </div>

      {/* Products list */}
      <div style={{ maxHeight: "calc(100vh - 100px)", overflowY: "auto", paddingRight: 4 }}>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8a7e6e" }}>
            <Icon name="search" size={16} />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: 10, border: "1px solid #e5e0d8", background: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e0d8", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px", padding: "10px 16px", background: "#f8f5f0", fontSize: 11, fontWeight: 700, color: "#8a7e6e", textTransform: "uppercase", letterSpacing: 0.5 }}>
            <span>Product</span>
            <span>Category</span>
            <span>Sell Price</span>
            <span>Cost</span>
            <span>Margin</span>
            <span>Actions</span>
          </div>
          {filtered.map((p, i) => (
            <div
              key={p.id}
              style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px", padding: "12px 16px", borderTop: i > 0 ? "1px solid #f0ebe4" : "none", alignItems: "center", fontSize: 13 }}
            >
              <div>
                <div style={{ fontWeight: 700, color: "#1a1310" }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "#8a7e6e" }}>{p.unit}</div>
              </div>
              <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 20, background: (CAT_COLORS[p.category] || "#8a7e6e") + "22", color: CAT_COLORS[p.category] || "#8a7e6e", fontSize: 11, fontWeight: 700 }}>
                {p.category}
              </span>
              <span style={{ fontWeight: 700, color: "#2563eb" }}>₹{p.price}</span>
              <span style={{ color: "#ef4444" }}>₹{p.cost}</span>
              <span style={{ color: "#16a34a", fontWeight: 700 }}>
                ₹{p.price - p.cost}{" "}
                <span style={{ fontSize: 10, color: "#8a7e6e" }}>
                  ({Math.round(((p.price - p.cost) / p.price) * 100)}%)
                </span>
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => edit(p)} style={{ padding: "6px", borderRadius: 7, border: "1px solid #e5e0d8", background: "#fff", cursor: "pointer", color: "#2563eb" }}>
                  <Icon name="edit" size={13} />
                </button>
                <button onClick={() => del(p.id)} style={{ padding: "6px", borderRadius: 7, border: "1px solid #e5e0d8", background: "#fff", cursor: "pointer", color: "#ef4444" }}>
                  <Icon name="trash" size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}