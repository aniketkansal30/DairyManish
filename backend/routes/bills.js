const router = require("express").Router();
const authMiddleware = require("../middleware/auth");
const Bill = require("../models/Bill");
const Customer = require("../models/Customer");

// GET /api/bills — saare bills (latest pehle), optional ?date=YYYY-MM-DD filter
router.use(authMiddleware);
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.date) {
      const start = new Date(req.query.date);
      const end = new Date(req.query.date);
      end.setDate(end.getDate() + 1);
      filter.date = { $gte: start, $lt: end };
    }

    if (req.query.month) {
      const [year, month] = req.query.month.split("-").map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      filter.date = { $gte: start, $lt: end };
    }

    if (req.query.phone) {
      filter["customer.phone"] = req.query.phone;
    }

    const bills = await Bill.find(filter).sort({ date: -1 }).limit(500);

    res.json(bills); // ✅ BAS YEHI
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bills — naya bill banao + customer update karo
router.post("/", async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    const subtotal = items.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const cost     = items.reduce((sum, i) => sum + (i.cost * i.qty), 0);

    const discountPct = Number(req.body.discountPct) || 0;
    const discountAmt = (subtotal * discountPct) / 100;

    const total  = subtotal - discountAmt;
    const profit = total - cost;

    const billData = {
      id: "MD" + Date.now(),
      date: new Date(),

      items,
      subtotal,
      discountPct,
      discountAmt,
      total,
      cost,
      profit,

      discountApplied: false, // 🔥 IMPORTANT

      paymentMode: req.body.paymentMode || "CASH",

      customer: {
        name: req.body.customer?.name || "",
        phone: req.body.customer?.phone || ""
      }
    };

    const bill = new Bill(billData);
    await bill.save();

    res.json(bill);

  } catch (err) {
    console.log("❌ BILL SAVE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
// POST /api/bills/apply-discount
// POST /api/bills — naya bill save karo
router.post("/apply-discount", async (req, res) => {
  try {
    const { discount } = req.body;
    const d = parseFloat(discount) / 100;
    if (!d || d <= 0 || d >= 1) return res.status(400).json({ error: "Invalid discount" });

    const bills = await Bill.find({});
    let updated = 0;

    for (const bill of bills) {
      const newItems = bill.items.map(item => {
        const newPrice = +(item.price * (1 - d)).toFixed(2);
        const newCost = +(item.cost * (1 - d)).toFixed(2);
        const newTotal = +(newPrice * item.qty).toFixed(2);
        return {
          id: item.id,
          name: item.name,
          category: item.category,
          unit: item.unit,
          qty: item.qty,
          price: newPrice,
          cost: newCost,
          total: newTotal,
        };
      });

      const newSubtotal  = +newItems.reduce((s, i) => s + i.total, 0).toFixed(2);
      const newCostTotal = +newItems.reduce((s, i) => s + i.cost * i.qty, 0).toFixed(2);
      const newDiscountAmt = +(newSubtotal * (bill.discountPct || 0) / 100).toFixed(2);
      const newTotal     = +(newSubtotal - newDiscountAmt).toFixed(2);
      const newProfit    = +(newTotal - newCostTotal).toFixed(2);

      await Bill.updateOne(
        { _id: bill._id },
        {
          $set: {
            items: newItems,
            subtotal: newSubtotal,
            discountAmt: newDiscountAmt,
            total: newTotal,
            cost: newCostTotal,
            profit: newProfit,
            discountApplied: true,
          }
        }
      );
      updated++;
    }

    res.json({ success: true, updated });
  } catch (err) {
    console.log("❌ DISCOUNT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
// GET /api/bills/analytics — analytics data
router.get("/analytics", async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const bills = await Bill.find({ date: { $gte: thirtyDaysAgo } }).sort({ date: 1 });

    const dailyMap = {};
    bills.forEach((b) => {
      const day = b.date.toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { date: day, revenue: 0, profit: 0, bills: 0 };

      // ✅ direct use karo (NO discount here)
      dailyMap[day].revenue += b.total;
      dailyMap[day].profit += b.profit;
      dailyMap[day].bills += 1;
    });

    const productMap = {};
    bills.forEach((b) => {
      b.items.forEach((item) => {
        if (!productMap[item.id]) productMap[item.id] = { id: item.id, name: item.name, revenue: 0, qty: 0 };
        productMap[item.id].revenue += item.total;
        productMap[item.id].qty += item.qty;
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
      daily: Object.values(dailyMap),
      topProducts,
      categories: catMap,
      totals: {
        revenue: bills.reduce((s, b) => s + b.total, 0),
        profit: bills.reduce((s, b) => s + b.profit, 0),
        bills: bills.length,
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

// PUT /api/bills/:id — bill edit karo
router.put("/:id", async (req, res) => {
  try {
    const bill = await Bill.findOne({ id: req.params.id });
    if (!bill) return res.status(404).json({ error: "Bill not found" });

    const items = Array.isArray(req.body.items) ? req.body.items : bill.items;
    const subtotal = items.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const cost     = items.reduce((sum, i) => sum + (i.cost * i.qty), 0);
    const discountPct = Number(req.body.discountPct) ?? bill.discountPct;
    const discountAmt = (subtotal * discountPct) / 100;
    const total  = subtotal - discountAmt;
    const profit = total - cost;

    bill.items       = items;
    bill.subtotal    = subtotal;
    bill.discountPct = discountPct;
    bill.discountAmt = discountAmt;
    bill.total       = total;
    bill.cost        = cost;
    bill.profit      = profit;

    await bill.save();
    res.json(bill);
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
