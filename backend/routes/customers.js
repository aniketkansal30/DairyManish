const router   = require("express").Router();
const authMiddleware = require("../middleware/auth");
const Customer = require("../models/Customer");
const Bill     = require("../models/Bill");

router.get("/", async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const rx = search ? new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;

    const pipeline = [
      { $addFields: {
          cPhone: { $trim: { input: { $ifNull: ["$customer.phone", ""] } } },
          cName:  { $trim: { input: { $ifNull: ["$customer.name", ""] } } },
      } },
      { $match: { $expr: { $or: [{ $ne: ["$cPhone", ""] }, { $ne: ["$cName", ""] }] } } },
      { $addFields: {
          key: {
            $cond: [
              { $ne: ["$cPhone", ""] }, { $concat: ["phone:", "$cPhone"] },
              { $cond: [
                { $ne: ["$cName", ""] }, { $concat: ["name:", { $toLower: "$cName" }] },
                "walkin",
              ] },
            ],
          },
      } },
      { $group: {
          _id: "$key",
          phone: { $max: "$cPhone" },
          name:  { $max: "$cName" },
          bills: { $push: "$id" },
          last:  { $max: "$date" },
      } },
      { $project: {
          _id: 0,
          key: "$_id",
          phone: 1,
          bills: 1,
          last: 1,
          name: "$name",
      } },
    ];
    if (rx) pipeline.push({ $match: { $or: [{ name: rx }, { phone: rx }] } });
    pipeline.push({ $sort: { last: -1 } }, { $limit: 500 });

    const customers = await Bill.aggregate(pipeline);
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:phone — single customer + uski bills
router.get("/:phone", async (req, res) => {
  try {
    const customer = await Customer.findOne({ phone: req.params.phone });
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const bills = await Bill.find({ id: { $in: customer.bills } }).sort({ date: -1 });

    res.json({ ...customer.toObject(), billDetails: bills });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/customers/:phone — customer update karo
router.put("/:phone",authMiddleware, async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { phone: req.params.phone },
      { $set: { name: req.body.name } },
      { new: true }
    );
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json(customer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
