import { useState, useEffect } from "react";
import Icon from "./Icon";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

export default function Navbar({ view, setView, onLogout }) {
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [pwdForm, setPwdForm] = useState({ username: "", oldPassword: "", newPassword: "", confirm: "" });
  const [pwdMsg, setPwdMsg] = useState("");
  const mobile = useIsMobile();

  const changePassword = async () => {
    if (pwdForm.newPassword !== pwdForm.confirm) { setPwdMsg("❌ Passwords match nahi kar rahe!"); return; }
    if (pwdForm.newPassword.length < 4) { setPwdMsg("❌ Password 4+ characters ka hona chahiye!"); return; }
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: pwdForm.username, oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwdMsg("✅ Password change ho gaya! Dobara login karo.");
      setTimeout(() => { setShowChangePwd(false); setPwdMsg(""); onLogout(); }, 2000);
    } catch (e) { setPwdMsg("❌ " + e.message); }
  };

  const nav = [
    { id: "billing",   label: "Billing",   icon: "cart" },
    { id: "products",  label: "Products",  icon: "products" },
    { id: "sales",     label: "Sales",     icon: "profit" },
    { id: "analytics", label: "Analytics", icon: "analytics" },
    { id: "customers", label: "Customers", icon: "customers" },
  ];

  return (
    <>
      {/* ─── Top Bar ─── */}
      <div style={{ background: "#1a1310", position: "sticky", top: 0, zIndex: 99, display: "flex", alignItems: "center", padding: mobile ? "0 14px" : "0 24px", gap: 8, boxShadow: "0 2px 12px rgba(0,0,0,0.18)" }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: mobile ? 0 : 16, padding: "12px 0", flex: mobile ? 1 : "unset" }}>
          <span style={{ fontSize: 20 }}>🥛</span>
          <div>
            <div style={{ fontSize: mobile ? 14 : 18, fontWeight: 900, color: "#f59e0b", letterSpacing: 2, lineHeight: 1 }}>MANISH DAIRY</div>
            <div style={{ fontSize: 10, color: "#c9b9a8", letterSpacing: 2, fontWeight: 600, lineHeight: 1, marginTop: 4 }}>JAILCHUNGI</div>
          </div>
        </div>

        {/* Desktop Nav */}
        {!mobile && (
          <>
            <div style={{ width: 1, height: 32, background: "#2d2420", marginRight: 8 }} />
            <nav style={{ display: "flex", gap: 4, flex: 1 }}>
              {nav.map((n) => (
                <button key={n.id} onClick={() => setView(n.id)}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: view === n.id ? 800 : 500, transition: "all 0.15s", background: view === n.id ? "#f59e0b" : "transparent", color: view === n.id ? "#1a1310" : "#c9b9a8" }}
                >
                  <Icon name={n.icon} size={15} />
                  {n.label}
                </button>
              ))}
            </nav>
            <div style={{ fontSize: 12, color: "#8a7e6e", flexShrink: 0 }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
            </div>
            <button onClick={() => setShowChangePwd(true)}
              style={{ marginLeft: 8, padding: "8px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              🔑 Password
            </button>
            <button onClick={onLogout}
              style={{ marginLeft: 6, padding: "8px 16px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              Logout
            </button>
          </>
        )}

        {/* Mobile: hamburger */}
        {mobile && (
          <button onClick={() => setShowMobileMenu(true)}
            style={{ background: "none", border: "none", color: "#f59e0b", cursor: "pointer", padding: 6, display: "flex", alignItems: "center" }}>
            <Icon name="menu" size={22} />
          </button>
        )}
      </div>

      {/* ─── Mobile Bottom Tab Bar ─── */}
      {mobile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 98, background: "#1a1310", display: "flex", borderTop: "1px solid #2d2420", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {nav.map((n) => (
            <button key={n.id} onClick={() => setView(n.id)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: "10px 4px", border: "none", cursor: "pointer", background: "transparent", color: view === n.id ? "#f59e0b" : "#8a7e6e", transition: "color 0.15s" }}>
              <Icon name={n.icon} size={view === n.id ? 22 : 20} />
              <span style={{ fontSize: 9, fontWeight: view === n.id ? 800 : 500, letterSpacing: 0.5 }}>{n.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ─── Mobile Slide-out Menu (Password + Logout) ─── */}
      {mobile && showMobileMenu && (
        <>
          <div onClick={() => setShowMobileMenu(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200 }} />
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 240, background: "#1a1310", zIndex: 201, padding: 20, display: "flex", flexDirection: "column", gap: 12, boxShadow: "-4px 0 20px rgba(0,0,0,0.4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#f59e0b" }}>Menu</span>
              <button onClick={() => setShowMobileMenu(false)} style={{ background: "none", border: "none", color: "#8a7e6e", cursor: "pointer" }}>
                <Icon name="close" size={18} />
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#8a7e6e" }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
            </div>
            <div style={{ height: 1, background: "#2d2420", margin: "4px 0" }} />
            <button onClick={() => { setShowMobileMenu(false); setShowChangePwd(true); }}
              style={{ padding: "12px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", textAlign: "left" }}>
              🔑 Password Change
            </button>
            <button onClick={() => { setShowMobileMenu(false); onLogout(); }}
              style={{ padding: "12px 16px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", textAlign: "left" }}>
              🚪 Logout
            </button>
          </div>
        </>
      )}

      {/* ─── Change Password Modal ─── */}
      {showChangePwd && (
        <>
          <div onClick={() => setShowChangePwd(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 20, padding: 28, width: mobile ? "calc(100% - 40px)" : 360, zIndex: 1000, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", boxSizing: "border-box" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1310", marginBottom: 20 }}>🔑 Password Change Karo</div>
            {[
              ["Username", "username", "text"],
              ["Purana Password", "oldPassword", "password"],
              ["Naya Password", "newPassword", "password"],
              ["Naya Confirm Karo", "confirm", "password"],
            ].map(([label, key, type]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#8a7e6e", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
                <input type={type} value={pwdForm[key]}
                  onChange={(e) => setPwdForm(p => ({ ...p, [key]: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #e5e0d8", borderRadius: 8, fontSize: 14, outline: "none", marginTop: 4, boxSizing: "border-box" }} />
              </div>
            ))}
            {pwdMsg && (
              <div style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 700, background: pwdMsg.includes("✅") ? "#f0fdf4" : "#fef2f2", color: pwdMsg.includes("✅") ? "#16a34a" : "#ef4444" }}>
                {pwdMsg}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowChangePwd(false); setPwdMsg(""); }}
                style={{ flex: 1, padding: "11px", background: "#f8f5f0", color: "#4a3f35", border: "1px solid #e5e0d8", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={changePassword}
                style={{ flex: 1, padding: "11px", background: "#1a1310", color: "#f59e0b", border: "none", borderRadius: 10, fontWeight: 800, cursor: "pointer" }}>
                Change Karo 🔐
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}