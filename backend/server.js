const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

// ─── MongoDB Connection ───────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/manish_dairy")
  .then(() => console.log("✅ MongoDB connected — Manish Dairy DB ready"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/products",  require("./routes/products"));
app.use("/api/bills",     require("./routes/bills"));
app.use("/api/customers", require("./routes/customers"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
