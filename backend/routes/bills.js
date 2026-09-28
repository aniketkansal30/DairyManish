const router = require("express").Router();
const authMiddleware = require("../middleware/auth");
const Bill = require("../models/Bill");


// ─── Helper: IST date range ───────────────────────────────────────────────────
function istRange(dateStr, endDateStr) {
  const start = new Date(dateStr + "T00:00:00+05:30");
  const end = new Date((endDateStr || dateStr) + "T23:59:59+05:30");
  return { $gte: start, $lte: end };
}
function getTodayISTRange() {
  const todayStr = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return istRange(todayStr);
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

    // ✅ Pagination — default 50 for normal use, no cap when export explicitly requests all data
    const requestedLimit = parseInt(req.query.limit) || 50;
    const limit = req.query.noLimit === "true" ? requestedLimit : Math.min(requestedLimit, 10000);
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
// Global discount for selected date range
router.post("/apply-discount", authMiddleware, async (req, res) => {
  try {
    const {
      discount,
      fromDate,
      toDate
    } = req.body;

    const discountNumber = Number(discount);

    // Validate discount
    if (
      !Number.isFinite(discountNumber) ||
      discountNumber <= 0 ||
      discountNumber >= 100
    ) {
      return res.status(400).json({
        error: "Invalid discount"
      });
    }

    // Validate dates
    if (!fromDate || !toDate) {
      return res.status(400).json({
        error: "From date and To date are required"
      });
    }

    const start = new Date(`${fromDate}T00:00:00+05:30`);
    const end = new Date(`${toDate}T23:59:59+05:30`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: "Invalid date"
      });
    }

    if (start > end) {
      return res.status(400).json({
        error: "From date cannot be greater than To date"
      });
    }

    const d = discountNumber / 100;

    // Sirf selected date range ke bills
    // aur jinpar global discount pehle apply nahi hua
    const bills = await Bill.find({
      date: {
        $gte: start,
        $lte: end
      },
      $or: [
        { discountApplied: { $exists: false } },
        { discountApplied: false }
      ]
    }).lean();

    if (!bills.length) {
      return res.json({
        success: true,
        updated: 0,
        message: "No eligible bills found in selected date range."
      });
    }

    const bulkOps = bills.map((bill) => {

      // ONLY SELLING PRICE CHANGE
      const newItems = (bill.items || []).map((item) => {

        const oldPrice = Number(item.price) || 0;
        const qty = Number(item.qty) || 0;

        const newPrice = +(oldPrice * (1 - d)).toFixed(2);

        return {
          ...item,

          // New selling rate
          price: newPrice,

          // New item total
          total: +(newPrice * qty).toFixed(2),

          // COST SAME
          cost: item.cost
        };
      });

      // New bill total
      const newSubtotal = +newItems
        .reduce(
          (sum, item) => sum + Number(item.total || 0),
          0
        )
        .toFixed(2);

      const oldSubtotal = Number(bill.subtotal) || 0;

      const discountAmt = +(oldSubtotal - newSubtotal).toFixed(2);

      return {
        updateOne: {
          filter: {
            _id: bill._id
          },

          update: {
            $set: {
              items: newItems,

              // Sales amount
              subtotal: newSubtotal,
              total: newSubtotal,

              // Discount information
              discountPct: discountNumber,
              discountAmt: discountAmt,

              // Mark as already discounted
              discountApplied: true

              // cost/profit NOT TOUCHED
            }
          }
        }
      };
    });

    const result = await Bill.bulkWrite(
      bulkOps,
      { ordered: false }
    );

    console.log(
      `✅ ${discountNumber}% discount applied`,
      `| ${fromDate} → ${toDate}`,
      `| Bills: ${result.modifiedCount}`
    );

    res.json({
      success: true,
      updated: result.modifiedCount,
      discount: discountNumber,
      fromDate,
      toDate
    });

  } catch (err) {
    console.error("❌ DISCOUNT ERROR:", err);

    res.status(500).json({
      error: err.message
    });
  }
});

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
// ─── GET /api/bills/item-report ───────────────────────────────────────────────
router.get("/item-report", async (req, res) => {
  try {
    const { from, to } = req.query;
    const match = {};
    if (from && to) match.date = istRange(from, to);

    const data = await Bill.aggregate([
      { $match: match },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          category: { $first: "$items.category" },
          unit: { $first: "$items.unit" },
          qty: { $sum: "$items.qty" },
          revenue: { $sum: "$items.total" },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          category: 1,
          unit: 1,
          qty: 1,
          revenue: 1,
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    res.json(data);
  } catch (err) {
    console.error("❌ ITEM REPORT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
// ─── DELETE /api/bills/delete-by-date ────────────────────────────────────────
// Delete bills only from selected date range
router.delete("/delete-by-date", authMiddleware, async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        error: "From date and To date are required"
      });
    }

    const start = new Date(`${fromDate}T00:00:00+05:30`);
    const end = new Date(`${toDate}T23:59:59+05:30`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: "Invalid date"
      });
    }

    if (start > end) {
      return res.status(400).json({
        error: "From date cannot be greater than To date"
      });
    }

    const result = await Bill.deleteMany({
      date: {
        $gte: start,
        $lte: end
      }
    });

    console.log(
      `🗑️ Deleted ${result.deletedCount} bills | ${fromDate} → ${toDate}`
    );

    res.json({
      success: true,
      deleted: result.deletedCount,
      fromDate,
      toDate
    });

  } catch (err) {
    console.error("❌ DELETE BY DATE ERROR:", err);

    res.status(500).json({
      error: err.message
    });
  }
});
// ─── DELETE /api/bills/all ────────────────────────────────────────────────────
// Delete ALL bills
router.delete("/all", authMiddleware, async (req, res) => {
  try {
    const result = await Bill.deleteMany({});

    console.log(
      `🗑️ ALL BILLS DELETED: ${result.deletedCount}`
    );

    res.json({
      success: true,
      deleted: result.deletedCount
    });

  } catch (err) {
    console.error("❌ DELETE ALL ERROR:", err);

    res.status(500).json({
      error: err.message
    });
  }
});
// ─── GET /api/bills/sales-summary ────────────────────────────────────────────
// SalesView ke KPI cards ke liye summary
router.get("/sales-summary", async (req, res) => {
  try {
    const filter = {};

    // Date filter
    if (req.query.date && req.query.endDate) {
      filter.date = istRange(req.query.date, req.query.endDate);
    } else if (req.query.date) {
      filter.date = istRange(req.query.date);
    }

    // Month filter
    if (req.query.month) {
      const [year, month] = req.query.month.split("-").map(Number);
      const lastDay = new Date(year, month, 0).getDate();

      filter.date = istRange(
        `${year}-${String(month).padStart(2, "0")}-01`,
        `${year}-${String(month).padStart(2, "0")}-${lastDay}`
      );
    }

    const bills = await Bill.find(filter).lean();

    let totalSales = 0;
    let totalProfit = 0;
    let totalDiscount = 0;

    let cashSales = 0;
    let cashCount = 0;

    let upiSales = 0;
    let upiCount = 0;

    for (const bill of bills) {
      const total = Number(bill.total) || 0;
      const profit = Number(bill.profit) || 0;
      const discount = Number(bill.discountAmt) || 0;

      totalSales += total;
      totalProfit += profit;
      totalDiscount += discount;

      const paymentMode = bill.paymentMode || "CASH";

      if (paymentMode === "UPI") {
        upiSales += total;
        upiCount++;
      } else {
        cashSales += total;
        cashCount++;
      }
    }

    res.json({
      totalSales,
      totalProfit,
      totalDiscount,
      billsCount: bills.length,

      cashSales,
      cashCount,

      upiSales,
      upiCount
    });

  } catch (err) {
    console.error("❌ SALES SUMMARY ERROR:", err);

    res.status(500).json({
      error: err.message
    });
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