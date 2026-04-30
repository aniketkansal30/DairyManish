const router = require("express").Router();
const authMiddleware = require("../middleware/auth");
const Category = require("../models/Category");

router.use(authMiddleware); // ← MISSING THA

router.get("/", async (req, res) => {
  try {
    const cats = await Category.find();
    res.json(cats.map(c => c.name));
  } catch (err) {
    res.status(500).json({ error: err.message }); // ← ERROR HANDLING MISSING THA
  }
});

router.post("/", async (req, res) => {
  try {
    const cat = new Category({ name: req.body.name });
    await cat.save();
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.delete("/:name", async (req, res) => {
  try {
    await Category.findOneAndDelete({ name: req.params.name });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;