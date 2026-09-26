const router = require("express").Router();
const authMiddleware = require("../middleware/auth");
const Bill = require("../models/Bill");


// ─── Helper: IST date range ───────────────────────────────────────────────────
function istRange(dateStr, endDateStr) {
  const start = new Date(dateStr + "T00:00:00+05:30");
  const end = new Date((endDateStr || dateStr) + "T23:59:59+05:30");
  return { $gte: start, $lte: end };
}

// ─── GET /api/bills ───────────────────────────────────────────────────────────
// Paginated + filtered bill list (no more full-collection scans)
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.date && req.query.endDate) {
      filter.date = istRange(req.query.date, req.query.endDate);
    } else if (req.query.date) {
      filter.date = istRange(req.query.date);
    }

    if (req.query.month) {
      const [year, month] = req.query.month.split("-").map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      filter.date = istRange(
        `${year}-${String(month).padStart(2, "0")}-01`,
        `${year}-${String(month).padStart(2, "0")}-${lastDay}`
      );
    }

    if (req.query.phone) {
      filter["customer.phone"] = req.query.phone;
    }

    // ✅ Pagination — default 50, max 200
    const limit = Math.min(parseInt(req.query.limit) || 50, 10000);
    const skip = parseInt(req.query.skip) || 0;

    // ✅ lean() — plain JS object, ~30% faster, less memory
    const [bills, total] = await Promise.all([
      Bill.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      Bill.countDocuments(filter),
    ]);

    res.json({ bills, total, limit, skip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/bills ──────────────────────────────────────────────────────────
router.post("/", authMiddleware, async (req, res) => {
  console.log("RECEIVED DATE:", req.body.date);
  console.log("FULL BODY:", JSON.stringify(req.body)); 
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const cost = items.reduce((s, i) => s + i.cost * i.qty, 0);

    const discountPct = Number(req.body.discountPct) || 0;
    const discountAmt = (subtotal * discountPct) / 100;
    const total = subtotal - discountAmt;
    const profit = 0; // Cost is equal to selling price, profit is 0% as requested

    // Check if a bill with this ID already exists (idempotency / retry handling)
    if (req.body.id) {
      const existing = await Bill.findOne({ id: req.body.id });
      if (existing) {
        console.warn(`⚠️ Bill with ID ${req.body.id} already exists. Returning existing bill (idempotency).`);
        return res.json(existing);
      }
    }

    const bill = await Bill.create({
      id: req.body.id || "MD" + Date.now() + Math.floor(100 + Math.random() * 900),
      date: req.body.date ? new Date(req.body.date) : new Date(),
      items,
      subtotal,
      discountPct,
      discountAmt,
      total,
      cost,
      profit,
      discountApplied: false,
      paymentMode: req.body.paymentMode || "CASH",
      customer: {
        name: req.body.customer?.name || "",
        phone: req.body.customer?.phone || "",
      },
    });

    res.json(bill);
  } catch (err) {
    console.error("❌ BILL SAVE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/bills/apply-discount ──────────────────────────────────────────
// Global discount: ONLY selling rate + bill total
router.post("/apply-discount", authMiddleware, async (req, res) => {
  try {
    const discount = Number(req.body.discount);

    if (!Number.isFinite(discount) || discount <= 0 || discount >= 100) {
      return res.status(400).json({
        error: "Invalid discount"
      });
    }

    const d = discount / 100;

    // Sirf un bills par apply hoga jinke upar pehle global discount nahi laga
    const bills = await Bill.find({
      $or: [
        { discountApplied: { $exists: false } },
        { discountApplied: false }
      ]
    }).lean();

    if (!bills.length) {
      return res.json({
        success: true,
        updated: 0,
        message: "Discount already applied."
      });
    }

    const bulkOps = bills.map((bill) => {

      const newItems = (bill.items || []).map((item) => {
        const oldPrice = Number(item.price) || 0;
        const qty = Number(item.qty) || 0;

        // ONLY SELLING RATE REDUCE
        const newPrice = +(oldPrice * (1 - d)).toFixed(2);

        return {
          ...item,

          // Bill ke andar rate change
          price: newPrice,

          // Item total bhi change
          total: +(newPrice * qty).toFixed(2),

          // COST BILKUL SAME
          cost: item.cost
        };
      });

      // Discounted bill subtotal
      const newSubtotal = +newItems
        .reduce((sum, item) => sum + Number(item.total || 0), 0)
        .toFixed(2);

      return {
        updateOne: {
          filter: { _id: bill._id },

          update: {
            $set: {
              // Updated rates
              items: newItems,

              // Sales amount
              subtotal: newSubtotal,
              total: newSubtotal,

              // Discount information
              discountPct: discount,
              discountAmt: +(
                (Number(bill.subtotal) || 0) - newSubtotal
              ).toFixed(2),

              // IMPORTANT:
              // cost/profit ko update nahi karna
              discountApplied: true
            }
          }
        }
      };
    });

    const result = await Bill.bulkWrite(bulkOps, {
      ordered: false
    });

    res.json({
      success: true,
      updated: result.modifiedCount,
      discount
    });

  } catch (err) {
    console.error("❌ DISCOUNT ERROR:", err);
    res.status(500).json({
      error: err.message
    });
  }
});
// ─── GET /api/bills/item-report ───────────────────────────────────────────────
router.get("/item-report", async (req, res) => {
  try {
    const { date, from, to } = req.query;
    const filter = {};
    if (from && to) {
      filter.date = istRange(from, to);
    } else if (from) {
      filter.date = istRange(from);
    } else if (date) {
      filter.date = istRange(date);
    }
    // agar kuch bhi nahi diya => filter empty => All Time (sab bills)

    const report = await Bill.aggregate([
      { $match: filter },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          qty: { $sum: "$items.qty" },
          revenue: { $sum: "$items.total" },
          unit: { $first: "$items.unit" },
          category: { $first: { $ifNull: ["$items.category", "Other"] } }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    res.json(report.map(r => ({
      name: r._id,
      qty: r.qty,
      revenue: r.revenue,
      unit: r.unit,
      category: r.category
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper for today range in IST
function getTodayISTRange() {
  const now = new Date();
  const istStr = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return istRange(istStr);
}

// ─── GET /api/bills/analytics ─────────────────────────────────────────────────
router.get("/analytics", async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const lastDay = new Date(currentYear, currentMonth, 0).getDate();
    const monthStart = new Date(`${currentYear}-${String(currentMonth).padStart(2, "0")}-01T00:00:00+05:30`);
    const monthEnd = new Date(`${currentYear}-${String(currentMonth).padStart(2, "0")}-${lastDay}T23:59:59+05:30`);

    const todayFilter = { date: getTodayISTRange() };
    const monthFilter = { date: { $gte: monthStart, $lte: monthEnd } };

    const [todayRaw, allTimeRaw, dailyRaw, topItemsRaw, recentRaw] = await Promise.all([
      Bill.aggregate([
        { $match: todayFilter },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$total" },
            profit: { $sum: "$profit" },
            bills: { $sum: 1 }
          }
        }
      ]),

      Bill.aggregate([
        {
          $group: {
            _id: null,
            revenue: { $sum: "$total" },
            profit: { $sum: "$profit" },
            bills: { $sum: 1 }
          }
        }
      ]),

      Bill.aggregate([
        { $match: monthFilter },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$date",
                timezone: "Asia/Kolkata"
              }
            },
            revenue: { $sum: "$total" },
            profit: { $sum: "$profit" },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: "$_id", sales: "$revenue", profit: 1, count: 1 } }
      ]),

      Bill.aggregate([
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.name",
            revenue: { $sum: "$items.total" },
            qty: { $sum: "$items.qty" }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 16 },
        { $project: { _id: 0, name: "$_id", revenue: 1, qty: 1 } }
      ]),

      Bill.find({}).sort({ date: -1 }).limit(20).lean()
    ]);

    res.json({
      today: todayRaw[0] || { revenue: 0, profit: 0, bills: 0 },
      allTime: allTimeRaw[0] || { revenue: 0, profit: 0, bills: 0 },
      daily: dailyRaw,
      topItems: topItemsRaw,
      recent: recentRaw
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/bills/all ────────────────────────────────────────────────────
router.delete("/all", authMiddleware, async (req, res) => {
  try {
    const { confirmCode } = req.body;
    if (confirmCode !== process.env.DELETE_ALL_CODE)
      return res.status(403).json({ error: "❌ Wrong confirm code!" });
    await Bill.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/bills/:id ───────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const bill = await Bill.findOne({ id: req.params.id });
    if (!bill) return res.status(404).json({ error: "Bill not found" });

    const items = Array.isArray(req.body.items) ? req.body.items : bill.items;
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const cost = items.reduce((s, i) => s + i.cost * i.qty, 0);
    const discountPct = Number(req.body.discountPct) ?? bill.discountPct;
    const discountAmt = (subtotal * discountPct) / 100;
    const total = subtotal - discountAmt;
    const profit = 0; // Cost is equal to selling price, profit is 0% as requested

    Object.assign(bill, { items, subtotal, discountPct, discountAmt, total, cost, profit });
    await bill.save();
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/bills/:id ────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    await Bill.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/bills/:id ───────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const bill = await Bill.findOne({ id: req.params.id }).lean();
    if (!bill) return res.status(404).json({ error: "Bill not found" });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;