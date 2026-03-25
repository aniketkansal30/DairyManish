const router   = require("express").Router();
const Customer = require("../models/Customer");
const Bill     = require("../models/Bill");

// GET /api/customers — saare customers, optional ?search=
router.get("/", async (req, res) => {
  try {
    let customers;

    if (req.query.search) {
      const regex = new RegExp(req.query.search, "i");
      customers = await Customer.find({
        $or: [{ name: regex }, { phone: regex }],
      }).sort({ updatedAt: -1 });
    } else {
      customers = await Customer.find().sort({ updatedAt: -1 });
    }

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
router.put("/:phone", async (req, res) => {
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
