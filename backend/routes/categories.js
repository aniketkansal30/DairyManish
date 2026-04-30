const router = require("express").Router();
const Category = require("../models/Category");

router.get("/", async (req, res) => {
  const cats = await Category.find();
  res.json(cats.map(c => c.name));
});

router.post("/", async (req, res) => {
  const cat = new Category({ name: req.body.name });
  await cat.save();
  res.json(cat);
});

module.exports = router;