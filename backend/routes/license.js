const express = require("express");
const router = express.Router();
const License = require("../models/License");

// ── Verify License ────────────────────────────────────────────────────────────
router.post("/verify", async (req, res) => {
  const { key, deviceFingerprint } = req.body;

  if (!key || !deviceFingerprint)
    return res.status(400).json({ error: "Key aur device info chahiye" });

  const license = await License.findOne({ key });
  if (!license)
    return res.status(404).json({ error: "❌ Invalid License Key!" });

  // Expire check
  if (license.expiresAt && new Date() > license.expiresAt)
    return res.status(403).json({ error: "❌ License expire ho gayi! Admin se contact karo." });

  // ── Case 1: Admin ne pehle se device bind ki hai ──────────────────────────
  if (license.deviceFingerprint && !license.isActivated) {
    // Admin ne FP bind ki, user ne abhi activate nahi kiya
    if (license.deviceFingerprint !== deviceFingerprint)
      return res.status(403).json({
        error: "❌ Yeh license is device ke liye nahi hai!"
      });
    // Sahi device - activate karo
    license.isActivated = true;
    license.activatedAt = new Date();
    await license.save();
    return res.json({ success: true, shopName: license.shopName, message: "✅ License Activated!" });
  }

  // ── Case 2: Already activated ─────────────────────────────────────────────
  if (license.isActivated) {
    if (license.deviceFingerprint !== deviceFingerprint)
      return res.status(403).json({
        error: "❌ Yeh license doosre device pe activate hai! Admin se contact karo."
      });
    return res.json({ success: true, shopName: license.shopName, message: "✅ License Valid!" });
  }

  // ── Case 3: Fresh key, no FP bound yet (admin ne bind nahi ki) ────────────
  // Yeh case tab hoga jab admin ne FP bind kiye bina key di
  // Security ke liye - BLOCK karo, pehle admin se FP bind karwao
  return res.status(403).json({
    error: "❌ License abhi activate nahi hui. Pehle Admin ko apna Device ID bhejo."
  });
});

// ── Create + Bind License (Admin only) ───────────────────────────────────────
router.post("/create", async (req, res) => {
  const { adminSecret, shopName, deviceFingerprint, daysValid } = req.body;

  if (adminSecret !== process.env.ADMIN_SECRET)
    return res.status(403).json({ error: "Not authorized" });

  const key =
    "MD-" +
    Math.random().toString(36).substr(2, 4).toUpperCase() +
    "-" +
    Math.random().toString(36).substr(2, 4).toUpperCase() +
    "-" +
    Math.random().toString(36).substr(2, 4).toUpperCase();

  const expiresAt = daysValid
    ? new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000)
    : null;

  // Device fingerprint bhi saath mein save karo
  const license = new License({
    key,
    shopName,
    deviceFingerprint: deviceFingerprint || null,
    isActivated: false,
    expiresAt,
  });
  await license.save();

  res.json({ success: true, key, shopName, deviceFingerprint, expiresAt });
});

// ── Bind Device to Existing Key (Admin only) ──────────────────────────────────
router.post("/bind", async (req, res) => {
  const { adminSecret, key, deviceFingerprint } = req.body;

  if (adminSecret !== process.env.ADMIN_SECRET)
    return res.status(403).json({ error: "Not authorized" });

  const license = await License.findOne({ key });
  if (!license)
    return res.status(404).json({ error: "License nahi mili" });

  if (license.isActivated)
    return res.status(400).json({ error: "License already activated hai. Reset karo pehle." });

  license.deviceFingerprint = deviceFingerprint;
  await license.save();

  res.json({ success: true, message: "✅ Device bind ho gaya!", key, deviceFingerprint });
});

// ── Reset License (Admin only) ────────────────────────────────────────────────
router.post("/reset", async (req, res) => {
  const { adminSecret, key } = req.body;

  if (adminSecret !== process.env.ADMIN_SECRET)
    return res.status(403).json({ error: "Not authorized" });

  const license = await License.findOne({ key });
  if (!license)
    return res.status(404).json({ error: "License nahi mili" });

  license.isActivated = false;
  license.deviceFingerprint = null;
  license.activatedAt = null;
  await license.save();

  res.json({ success: true, message: "✅ License reset ho gayi!" });
});

// ── List All Licenses (Admin only) ────────────────────────────────────────────
router.post("/list", async (req, res) => {
  const { adminSecret } = req.body;

  if (adminSecret !== process.env.ADMIN_SECRET)
    return res.status(403).json({ error: "Not authorized" });

  const licenses = await License.find().sort({ _id: -1 });
  res.json({ success: true, licenses });
});

module.exports = router;
