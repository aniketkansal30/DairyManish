const router  = require("express").Router();
const Product = require("../models/Product");

const INITIAL_PRODUCTS = [
  { id: "p1",  name: "Paneer",           category: "Dairy",  price: 400, cost: 280, unit: "kg"     },
  { id: "p2",  name: "Doodh (Full Cream)",category: "Dairy",  price: 60,  cost: 42,  unit: "litre"  },
  { id: "p3",  name: "Dahi",             category: "Dairy",  price: 80,  cost: 55,  unit: "kg"     },
  { id: "p4",  name: "Makhan",           category: "Dairy",  price: 500, cost: 360, unit: "kg"     },
  { id: "p5",  name: "Ghee",             category: "Dairy",  price: 600, cost: 440, unit: "kg"     },
  { id: "p6",  name: "Lassi",            category: "Dairy",  price: 30,  cost: 18,  unit: "piece"  },
  { id: "p7",  name: "Gulab Jamun",      category: "Sweets", price: 320, cost: 200, unit: "kg"     },
  { id: "p8",  name: "Barfi",            category: "Sweets", price: 400, cost: 260, unit: "kg"     },
  { id: "p9",  name: "Halwa",            category: "Sweets", price: 250, cost: 160, unit: "kg"     },
  { id: "p10", name: "Rasgulla",         category: "Sweets", price: 280, cost: 180, unit: "kg"     },
  { id: "p11", name: "Jalebi",           category: "Sweets", price: 200, cost: 120, unit: "kg"     },
  { id: "p12", name: "Samosa",           category: "Snacks", price: 15,  cost: 8,   unit: "piece"  },
  { id: "p13", name: "Kachori",          category: "Snacks", price: 12,  cost: 6,   unit: "piece"  },
  { id: "p14", name: "Pakora",           category: "Snacks", price: 200, cost: 100, unit: "kg"     },
  { id: "p15", name: "Bread Pakora",     category: "Snacks", price: 25,  cost: 14,  unit: "piece"  },
  { id: "p16", name: "Tandoori Roti",    category: "Tandoor",price: 10,  cost: 5,   unit: "piece"  },
  { id: "p17", name: "Butter Naan",      category: "Tandoor",price: 20,  cost: 10,  unit: "piece"  },
  { id: "p18", name: "Tandoori Paneer",  category: "Tandoor",price: 350, cost: 220, unit: "kg"     },
  { id: "p19", name: "Tandoori Chicken", category: "Tandoor",price: 400, cost: 260, unit: "kg"     },
  { id: "p20", name: "Paratha",          category: "Tandoor",price: 25,  cost: 12,  unit: "piece"  },
];

// GET /api/products
router.get("/", async (req, res) => {
  try {
    let products = await Product.find();

    if (products.length === 0) {
      await Product.insertMany(INITIAL_PRODUCTS);
      products = await Product.find();
    }

    // Sort by numeric value of id (p1, p2, ... p10, p11)
    products.sort((a, b) => {
      const numA = parseInt(a.id.replace("p", ""));
      const numB = parseInt(b.id.replace("p", ""));
      return numA - numB;
    });

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products — naya product banao (fixed ID generation)
router.post("/", async (req, res) => {
  try {
    const allProducts = await Product.find();

    // Sab numbers nikalo aur max dhundo (string sort ki problem avoid)
    const maxNum = allProducts.reduce((max, p) => {
      const num = parseInt(p.id.replace("p", "")) || 0;
      return num > max ? num : max;
    }, 0);

    const newId = `p${maxNum + 1}`;
    const product = new Product({ ...req.body, id: newId });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/products/:id
router.put("/:id", async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/products/:id
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ id: req.params.id });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;