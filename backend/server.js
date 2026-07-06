const express = require("express");
const Bill = require("./models/Bill");
const mongoose = require("mongoose");
const cors = require("cors");


require("dotenv").config();

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" })); 
app.use(express.json());

// ─── MongoDB Connection ───────────────────────────────────────────────────────
mongoose.set("bufferCommands", false);
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/manish_dairy", {
  serverSelectionTimeoutMS: 2000, // Fail fast (2s) if DB is offline
})
  .then(async () => {
    console.log("✅ MongoDB connected");
  })
  .catch(err => {
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

// ─── Static Files & SPA Fallback ─────────────────────────────────────────────
const path = require("path");
const distPath = path.join(__dirname, "../frontend/build");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on http://0.0.0.0:${PORT}`));
