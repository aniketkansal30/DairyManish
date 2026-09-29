const express = require("express");
const Bill = require("./models/Bill");
const mongoose = require("mongoose");
const cors = require("cors");
const compression = require("compression");

require("dotenv").config();

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(compression());
app.use(express.json());

// ─── MongoDB Connection ───────────────────────────────────────────────────────
mongoose.set("bufferCommands", false);
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/manish_dairy", {
  serverSelectionTimeoutMS: 10000,
})
  .then(async () => {
    console.log("✅ MongoDB connected");
  })
    .catch(err => {
    console.error("MongoDB error:", err.message);
    if (process.env.RENDER) process.exit(1); // production mein fake DB nahi chalega
    console.warn("⚠️ MongoDB not connected — Using high-performance in-memory fallback database!");
  });

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/products",  require("./routes/products"));
app.use("/api/bills",     require("./routes/bills"));
app.use("/api/customers", require("./routes/customers"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/categories", require("./routes/categories"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

// Root route — sirf confirm karne ke liye ki backend zinda hai
app.get("/", (req, res) => {
  res.json({ status: "DairyManish backend running", frontend: "hosted separately on Vercel" });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on http://0.0.0.0:${PORT}`));