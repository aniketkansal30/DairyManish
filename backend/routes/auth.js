const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// LOGIN
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { userId: user._id, shopName: user.shopName },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
  res.json({ token, shopName: user.shopName });
});

// REGISTER (sirf tum use karo - client setup ke time)
router.post("/register", async (req, res) => {
  try {
    const { username, password, shopName } = req.body;
    const user = new User({ username, password, shopName });
    await user.save();
    res.json({ message: "✅ User created!" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
// CHANGE PASSWORD
router.post("/change-password", async (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;
    
    // User dhundho
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "User nahi mila!" });

    // Old password verify karo
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: "❌ Purana password galat hai!" });

    // Naya password hash karke save karo
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ username }, { password: hashed });

    res.json({ success: true, message: "✅ Password change ho gaya!" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
module.exports = router;