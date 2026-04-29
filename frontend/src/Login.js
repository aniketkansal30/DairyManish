import { useState } from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("dairy_token", data.token);
        localStorage.setItem("dairy_shop", data.shopName);
        onLogin(data.token);
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Server se connect nahi ho paya");
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center",
      height: "100vh", background: "#f8f5f0" }}>
      <div style={{ background: "#fff", padding: 40, borderRadius: 20,
        border: "1px solid #e5e0d8", width: 320, boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#1a1310" }}>ADMIN LOGIN</div>
          <div style={{ fontSize: 12, color: "#8a7e6e" }}>Please login to continue</div>
        </div>
        <input
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e5e0d8",
            borderRadius: 10, fontSize: 14, outline: "none", marginBottom: 12,
            boxSizing: "border-box" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e5e0d8",
            borderRadius: 10, fontSize: 14, outline: "none", marginBottom: 16,
            boxSizing: "border-box" }}
        />
        {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12,
          textAlign: "center" }}>{error}</div>}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: "100%", padding: 13, background: "#1a1310", color: "#f59e0b",
            border: "none", borderRadius: 10, fontWeight: 800, fontSize: 15,
            cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>
    </div>
  );
}