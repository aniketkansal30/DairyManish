const router = require("express").Router();
const authMiddleware = require("../middleware/auth");
const Product = require("../models/Product");
const cache = require("../utils/cache");

// GET /api/products
router.get("/", async (req, res) => {
  try {
    const cached = cache.get("products:list");
    if (cached) return res.json(cached);

    let products = await Product.find().lean();

    // Sort by numeric value of id (p1, p2, ... p10, p11)
    products.sort((a, b) => {
      const numA = parseInt(String(a.id || "").replace("p", "")) || 0;
      const numB = parseInt(String(b.id || "").replace("p", "")) || 0;
      return numA - numB;
    });

    cache.set("products:list", products, 60 * 1000);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products — naya product banao (fixed ID generation)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const allProducts = await Product.find();

    // Sab numbers nikalo aur max dhundo (string sort ki problem avoid)
    const maxNum = allProducts.reduce((max, p) => {
      const num = parseInt(String(p.id || "").replace("p", "")) || 0;
      return num > max ? num : max;
    }, 0);

    const newId = `p${maxNum + 1}`;
    const product = new Product({ ...req.body, id: newId });
    await product.save();
    cache.clear("products:");
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/products/:id
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: "Product not found" });
    cache.clear("products:");
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/products/:id
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ id: req.params.id });
    if (!product) return res.status(404).json({ error: "Product not found" });
    cache.clear("products:");
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;