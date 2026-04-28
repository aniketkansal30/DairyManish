const router   = require("express").Router();
const Bill     = require("../models/Bill");
const Customer = require("../models/Customer");

// GET /api/bills — saare bills (latest pehle), optional ?date=YYYY-MM-DD filter
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.date) {
      const start = new Date(req.query.date);
      const end   = new Date(req.query.date);
      end.setDate(end.getDate() + 1);
      filter.date = { $gte: start, $lt: end };
    }

    if (req.query.month) {
      const [year, month] = req.query.month.split("-").map(Number);
      const start = new Date(year, month - 1, 1);
      const end   = new Date(year, month, 1);
      filter.date = { $gte: start, $lt: end };
    }

    if (req.query.phone) {
      filter["customer.phone"] = req.query.phone;
    }

    let bills = await Bill.find(filter).sort({ date: -1 }).limit(500);
    const discount = Number(req.headers["x-discount"] || 0);

    bills = bills.map(b => {
      const d = discount / 100;

      return {
        ...b._doc,
        total: b.total - (b.total * d),
        profit: b.profit - (b.profit * d)
      };
    });

    res.json(bills);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bills — naya bill banao + customer update karo
router.post("/", async (req, res) => {
  try {
    const billData = {
      ...req.body,
      id: req.body.id || "MD" + Date.now(),
      date: req.body.date ? new Date(req.body.date) : new Date(),
    };

    const bill = new Bill(billData);
    await bill.save();

    if (billData.customer?.phone) {
      await Customer.findOneAndUpdate(
        { phone: billData.customer.phone },
        {
          $set:  { name: billData.customer.name || "" },
          $push: { bills: { $each: [bill.id], $position: 0 } },
        },
        { upsert: true, new: true }
      );
    }

    res.status(201).json(bill);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/bills/analytics — analytics data
const discount = Number(req.headers["x-discount"] || 0);
const d = discount / 100;
router.get("/analytics", async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const bills = await Bill.find({ date: { $gte: thirtyDaysAgo } }).sort({ date: 1 });

    const dailyMap = {};
    bills.forEach((b) => {
      const day = b.date.toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { date: day, revenue: 0, profit: 0, bills: 0 };
      dailyMap[day].revenue += b.total - (b.total * d);
      dailyMap[day].profit  += b.profit - (b.profit * d);
      dailyMap[day].bills   += 1;
    });

    const productMap = {};
    bills.forEach((b) => {
      b.items.forEach((item) => {
        if (!productMap[item.id]) productMap[item.id] = { id: item.id, name: item.name, revenue: 0, qty: 0 };
        productMap[item.id].revenue += item.total;
        productMap[item.id].qty     += item.qty;
      });
    });

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const catMap = {};
    bills.forEach((b) => {
      b.items.forEach((item) => {
        const cat = item.category || "Other";
        catMap[cat] = (catMap[cat] || 0) + item.total;
      });
    });

    res.json({
      daily:      Object.values(dailyMap),
      topProducts,
      categories: catMap,
      totals: {
        revenue: bills.reduce((s, b) => s + (b.total - b.total * d), 0),
        profit:  bills.reduce((s, b) => s + (b.profit - b.profit * d), 0),
        bills:   bills.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bills/all — saari bills delete karo
router.delete("/all", async (req, res) => {
  try {
    await Bill.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bills/:id — single bill delete karo
router.delete("/:id", async (req, res) => {
  try {
    await Bill.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bills/:id — single bill
router.get("/:id", async (req, res) => {
  try {
    const bill = await Bill.findOne({ id: req.params.id });
    if (!bill) return res.status(404).json({ error: "Bill not found" });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
