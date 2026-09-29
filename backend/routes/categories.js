const router = require("express").Router();
const authMiddleware = require("../middleware/auth");
const Category = require("../models/Category");
const cache = require("../utils/cache");

router.get("/", async (req, res) => {
  try {
    const cached = cache.get("categories:list");
    if (cached) return res.json(cached);

    const cats = await Category.find().lean();
    const result = cats.map(c => c.name);
    cache.set("categories:list", result, 60 * 1000);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const cat = new Category({ name: req.body.name });
    await cat.save();
    cache.clear("categories:");
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:name", authMiddleware, async (req, res) => {
  try {
    await Category.findOneAndDelete({ name: req.params.name });
    cache.clear("categories:");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;