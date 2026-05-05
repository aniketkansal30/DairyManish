import { useState, useEffect } from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// ── Device Fingerprint ────────────────────────────────────────────────────────
function getDeviceFingerprint() {
  const nav = window.navigator;
  const scr = window.screen;
  const raw = [
    nav.userAgent,
    nav.language,
    scr.colorDepth,
    scr.width + "x" + scr.height,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency || "?",
    nav.platform,
  ].join("|");

  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    hash = (hash << 5) - hash + c;
    hash = hash & hash;
  }
  return "FP-" + Math.abs(hash).toString(16).toUpperCase().padStart(8, "0");
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LicenseGate({ children }) {
  const [status, setStatus] = useState("checking"); // checking | waitingAdmin | enterKey | valid
  const [licenseKey, setLicenseKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fingerprint] = useState(getDeviceFingerprint);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem("dairy_license");
    const savedFP = localStorage.getItem("dairy_fp");

    if (savedKey && savedFP === fingerprint) {
      // Same device - silently verify
      silentVerify(savedKey, fingerprint);
    } else {
      // Pehli baar - pehle admin se approve karo
      setStatus("waitingAdmin");
    }
  }, [fingerprint]);

  const silentVerify = async (key, fp) => {
    try {
      const res = await fetch(`${API}/license/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, deviceFingerprint: fp }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("valid");
      } else {
        localStorage.removeItem("dairy_license");
        localStorage.removeItem("dairy_fp");
        setStatus("waitingAdmin");
      }
    } catch {
      setStatus("waitingAdmin");
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/license/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: licenseKey.trim().toUpperCase(),
          deviceFingerprint: fingerprint,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem("dairy_license", licenseKey.trim().toUpperCase());
        localStorage.setItem("dairy_fp", fingerprint);
        setStatus("valid");
      } else {
        setError(data.error || "License invalid hai");
      }
    } catch {
      setError("Server se connect nahi ho paya");
    }
    setLoading(false);
  };

  const copyFP = () => {
    navigator.clipboard.writeText(fingerprint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Checking ────────────────────────────────────────────────────────────────
  if (status === "checking")
    return (
      <div style={styles.center}>
        <div style={{ fontSize: 48 }}>🔐</div>
        <div style={{ fontSize: 14, color: "#8a7e6e", marginTop: 12 }}>
          Verify ho raha hai...
        </div>
      </div>
    );

  // ── Valid ───────────────────────────────────────────────────────────────────
  if (status === "valid") return children;

  // ── Waiting for Admin / Enter Key ───────────────────────────────────────────
  return (
    <div style={styles.center}>
      <div style={styles.card}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🥛</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#1a1310", letterSpacing: 1 }}>
            MANISH DAIRY
          </div>
          <div style={{ fontSize: 12, color: "#8a7e6e", marginTop: 4 }}>
            Billing System — License Required
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#e5e0d8", marginBottom: 24 }} />

        {/* Step 1 - Device ID */}
        <div style={styles.step}>
          <div style={styles.stepNum}>1</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1310", marginBottom: 6 }}>
              Apna Device ID Admin ko bhejo
            </div>
            <div
              style={styles.fpBox}
              onClick={copyFP}
              title="Click to copy"
            >
              <span style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 800,
                letterSpacing: 2, color: "#1a1310" }}>
                {fingerprint}
              </span>
              <span style={{ fontSize: 11, color: copied ? "#22c55e" : "#f59e0b",
                fontWeight: 700, marginLeft: 10 }}>
                {copied ? "✅ Copied!" : "📋 Copy"}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#8a7e6e", marginTop: 6 }}>
              Admin ko yeh ID aur apna naam WhatsApp karo:<br />
              <strong>+91-8126700718</strong>
            </div>
          </div>
        </div>

        {/* Step 2 - Enter Key */}
        <div style={{ ...styles.step, marginTop: 20, alignItems: "flex-start" }}>
          <div style={styles.stepNum}>2</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1310", marginBottom: 8 }}>
              Admin se mili License Key daalo
            </div>
            <input
              placeholder="MD-XXXX-XXXX-XXXX"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleActivate()}
              style={styles.input}
            />
            {error && (
              <div style={{ color: "#ef4444", fontSize: 12, marginTop: 6, fontWeight: 600 }}>
                ❌ {error}
              </div>
            )}
          </div>
        </div>

        {/* Activate Button */}
        <button
          onClick={handleActivate}
          disabled={loading || !licenseKey.trim()}
          style={{
            ...styles.btn,
            opacity: loading || !licenseKey.trim() ? 0.6 : 1,
            marginTop: 24,
          }}
        >
          {loading ? "Verify ho raha hai..." : "🔓 Activate Karo"}
        </button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  center: {
    display: "flex", justifyContent: "center", alignItems: "center",
    height: "100vh", background: "#f8f5f0", flexDirection: "column",
  },
  card: {
    background: "#fff", padding: "36px 32px", borderRadius: 20,
    border: "1px solid #e5e0d8", width: 380,
    boxShadow: "0 12px 40px rgba(0,0,0,0.10)",
  },
  step: {
    display: "flex", alignItems: "center", gap: 14,
  },
  stepNum: {
    width: 28, height: 28, borderRadius: "50%",
    background: "#1a1310", color: "#f59e0b",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 900, fontSize: 13, flexShrink: 0, marginTop: 2,
  },
  fpBox: {
    background: "#f8f5f0", border: "1.5px dashed #d4c9b8",
    borderRadius: 10, padding: "10px 14px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    cursor: "pointer",
    transition: "border-color 0.2s",
  },
  input: {
    width: "100%", padding: "11px 14px",
    border: "1.5px solid #e5e0d8", borderRadius: 10,
    fontSize: 14, outline: "none", boxSizing: "border-box",
    textAlign: "center", letterSpacing: 2, fontWeight: 700,
    fontFamily: "monospace",
  },
  btn: {
    width: "100%", padding: 13, background: "#1a1310",
    color: "#f59e0b", border: "none", borderRadius: 10,
    fontWeight: 800, fontSize: 15, cursor: "pointer",
    transition: "opacity 0.2s",
  },
};
