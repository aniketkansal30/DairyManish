import { useState } from "react";
import Icon from "./Icon";
import { API } from "../utils/constants";

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
export default function Navbar({ view, setView, onLogout }) {
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({
    username: "",
    oldPassword: "",
    newPassword: "",
    confirm: "",
  });
  const [pwdMsg, setPwdMsg] = useState("");

  const changePassword = async () => {
    if (pwdForm.newPassword !== pwdForm.confirm) {
      setPwdMsg("❌ Passwords match nahi kar rahe!");
      return;
    }
    if (pwdForm.newPassword.length < 4) {
      setPwdMsg("❌ Password 4+ characters ka hona chahiye!");
      return;
    }
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: pwdForm.username,
          oldPassword: pwdForm.oldPassword,
          newPassword: pwdForm.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwdMsg("✅ Password change ho gaya! Dobara login karo.");
      setTimeout(() => {
        setShowChangePwd(false);
        setPwdMsg("");
        onLogout();
      }, 2000);
    } catch (e) {
      setPwdMsg("❌ " + e.message);
    }
  };

  const nav = [
    { id: "billing", label: "Billing", icon: "cart" },
    { id: "products", label: "Products", icon: "products" },
    { id: "sales", label: "Sales", icon: "profit" },
    { id: "analytics", label: "Analytics", icon: "analytics" },
    { id: "customers", label: "Customers", icon: "customers" },
  ];

  return (
    <>
      <div
        style={{
          background: "#1a1310",
          position: "sticky",
          top: 0,
          zIndex: 99,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          gap: 8,
          boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginRight: 16,
            padding: "14px 0",
          }}
        >
          <span style={{ fontSize: 22 }}>🥛</span>
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: "#f59e0b",
                letterSpacing: 1,
                lineHeight: 1,
              }}
            >
              MANISH
            </div>
            <div
              style={{
                fontSize: 9,
                color: "#8a7e6e",
                letterSpacing: 3,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              DAIRY
            </div>
          </div>
        </div>
        <div style={{ width: 1, height: 32, background: "#2d2420", marginRight: 8 }} />
        <nav style={{ display: "flex", gap: 4, flex: 1 }}>
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: view === n.id ? 800 : 500,
                transition: "all 0.15s",
                background: view === n.id ? "#f59e0b" : "transparent",
                color: view === n.id ? "#1a1310" : "#c9b9a8",
              }}
            >
              <Icon name={n.icon} size={15} />
              {n.label}
            </button>
          ))}
        </nav>
        <div style={{ fontSize: 12, color: "#8a7e6e", flexShrink: 0 }}>
          {new Date().toLocaleDateString("en-IN", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </div>
        <button
          onClick={() => setShowChangePwd(true)}
          style={{
            marginLeft: 8,
            padding: "8px 14px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          🔑 Password
        </button>
        <button
          onClick={onLogout}
          style={{
            marginLeft: 6,
            padding: "8px 16px",
            background: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      {showChangePwd && (
        <>
          <div
            onClick={() => setShowChangePwd(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 999,
            }}
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
              width: 360,
              zIndex: 1000,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{ fontSize: 18, fontWeight: 900, color: "#1a1310", marginBottom: 20 }}
            >
              🔑 Password Change Karo
            </div>
            {[
              ["Username", "username", "text"],
              ["Purana Password", "oldPassword", "password"],
              ["Naya Password", "newPassword", "password"],
              ["Naya Confirm Karo", "confirm", "password"],
            ].map(([label, key, type]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#8a7e6e",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {label}
                </label>
                <input
                  type={type}
                  value={pwdForm[key]}
                  onChange={(e) =>
                    setPwdForm((p) => ({ ...p, [key]: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1px solid #e5e0d8",
                    borderRadius: 8,
                    fontSize: 14,
                    outline: "none",
                    marginTop: 4,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            ))}
            {pwdMsg && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  marginBottom: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  background: pwdMsg.includes("✅") ? "#f0fdf4" : "#fef2f2",
                  color: pwdMsg.includes("✅") ? "#16a34a" : "#ef4444",
                }}
              >
                {pwdMsg}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  setShowChangePwd(false);
                  setPwdMsg("");
                }}
                style={{
                  flex: 1,
                  padding: "11px",
                  background: "#f8f5f0",
                  color: "#4a3f35",
                  border: "1px solid #e5e0d8",
                  borderRadius: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={changePassword}
                style={{
                  flex: 1,
                  padding: "11px",
                  background: "#1a1310",
                  color: "#f59e0b",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Change Karo 🔐
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}