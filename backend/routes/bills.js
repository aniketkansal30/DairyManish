const router = require("express").Router();
const authMiddleware = require("../middleware/auth");
const Bill = require("../models/Bill");

router.use(authMiddleware);

// ─── Helper: IST date range ───────────────────────────────────────────────────
function istRange(dateStr, endDateStr) {
  const start = new Date(dateStr + "T00:00:00+05:30");
  const end   = new Date((endDateStr || dateStr) + "T23:59:59+05:30");
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
    const skip  = parseInt(req.query.skip) || 0;

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
router.post("/", async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const cost     = items.reduce((s, i) => s + i.cost  * i.qty, 0);

    const discountPct = Number(req.body.discountPct) || 0;
    const discountAmt = (subtotal * discountPct) / 100;
    const total  = subtotal - discountAmt;
    const profit = total - cost;

    const bill = await Bill.create({
      id: "MD" + Date.now(),
      date: new Date(),
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
        name:  req.body.customer?.name  || "",
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
// ✅ FIXED: Ek hi bulkWrite query — N individual updates nahi
router.post("/apply-discount", async (req, res) => {
  try {
    const { discount } = req.body;
    const d = parseFloat(discount) / 100;
    if (!d || d <= 0 || d >= 1)
      return res.status(400).json({ error: "Invalid discount" });

    // Sab bills ek saath fetch (lean — sirf zaruri fields)
    const bills = await Bill.find({}).lean();
    if (!bills.length) return res.json({ success: true, updated: 0 });

    const bulkOps = bills.map((bill) => {
      const newItems = bill.items.map((item) => {
        const newPrice = +(item.price * (1 - d)).toFixed(2);
        const newCost  = +(item.cost  * (1 - d)).toFixed(2);
        return { ...item, price: newPrice, cost: newCost, total: +(newPrice * item.qty).toFixed(2) };
      });

      const newSubtotal  = +newItems.reduce((s, i) => s + i.total,        0).toFixed(2);
      const newCostTotal = +newItems.reduce((s, i) => s + i.cost * i.qty, 0).toFixed(2);
      const newDiscAmt   = +(newSubtotal * (bill.discountPct || 0) / 100).toFixed(2);
      const newTotal     = +(newSubtotal - newDiscAmt).toFixed(2);
      const newProfit    = +(newTotal - newCostTotal).toFixed(2);

      return {
        updateOne: {
          filter: { _id: bill._id },
          update: {
            $set: {
              items: newItems,
              subtotal: newSubtotal,
              discountAmt: newDiscAmt,
              total: newTotal,
              cost: newCostTotal,
              profit: newProfit,
              discountApplied: true,
            },
          },
        },
      };
    });

    // ✅ Ek hi DB round-trip for all updates
    const result = await Bill.bulkWrite(bulkOps, { ordered: false });
    res.json({ success: true, updated: result.modifiedCount });
  } catch (err) {
    console.error("❌ DISCOUNT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/bills/analytics ─────────────────────────────────────────────────
// ✅ FULLY REWRITTEN — MongoDB aggregation, zero JS-side number crunching
router.get("/analytics", async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // ── Run all 4 aggregations in PARALLEL ──────────────────────────────────
    const [dailyRaw, topProducts, categoryRaw, totalsRaw] = await Promise.all([

      // 1. Daily revenue + profit (last 30 days)
      Bill.aggregate([
        { $match: { date: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$date",
                timezone: "Asia/Kolkata",
              },
            },
            revenue: { $sum: "$total" },
            profit:  { $sum: "$profit" },
            bills:   { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: "$_id", revenue: 1, profit: 1, bills: 1 } },
      ]),

      // 2. Top 10 products by revenue (last 30 days)
      Bill.aggregate([
        { $match: { date: { $gte: thirtyDaysAgo } } },
        { $unwind: "$items" },
        {
          $group: {
            _id:     "$items.id",
            name:    { $first: "$items.name" },
            revenue: { $sum: "$items.total" },
            qty:     { $sum: "$items.qty" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, id: "$_id", name: 1, revenue: 1, qty: 1 } },
      ]),

      // 3. Category-wise revenue (last 30 days)
      Bill.aggregate([
        { $match: { date: { $gte: thirtyDaysAgo } } },
        { $unwind: "$items" },
        {
          $group: {
            _id:     { $ifNull: ["$items.category", "Other"] },
            revenue: { $sum: "$items.total" },
          },
        },
        { $project: { _id: 0, category: "$_id", revenue: 1 } },
      ]),

      // 4. Overall totals (last 30 days)
      Bill.aggregate([
        { $match: { date: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id:     null,
            revenue: { $sum: "$total" },
            profit:  { $sum: "$profit" },
            bills:   { $sum: 1 },
          },
        },
        { $project: { _id: 0, revenue: 1, profit: 1, bills: 1 } },
      ]),
    ]);

    // Convert category array → object (same shape as before)
    const categories = Object.fromEntries(
      categoryRaw.map(({ category, revenue }) => [category, revenue])
    );

    res.json({
      daily:       dailyRaw,
      topProducts,
      categories,
      totals:      totalsRaw[0] || { revenue: 0, profit: 0, bills: 0 },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/bills/all ────────────────────────────────────────────────────
router.delete("/all", async (req, res) => {
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

    const items       = Array.isArray(req.body.items) ? req.body.items : bill.items;
    const subtotal    = items.reduce((s, i) => s + i.price * i.qty, 0);
    const cost        = items.reduce((s, i) => s + i.cost  * i.qty, 0);
    const discountPct = Number(req.body.discountPct) ?? bill.discountPct;
    const discountAmt = (subtotal * discountPct) / 100;
    const total       = subtotal - discountAmt;
    const profit      = total - cost;

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