const router = require("express").Router();
const authMiddleware = require("../middleware/auth");
const Bill = require("../models/Bill");
const Customer = require("../models/Customer");
const cache = require("../utils/cache");

// Jab bhi bill create/edit/delete ho, cache saaf ho jaye
router.use((req, res, next) => {
  if (req.method !== "GET") res.on("finish", () => cache.clear("bills:"));
  next();
});


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
router.get("/", authMiddleware, async (req, res) => {
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



    if (req.query.customerKey) {
      const k = String(req.query.customerKey);
      if (k.startsWith("phone:")) {
        filter["customer.phone"] = k.slice(6);
      } else if (k.startsWith("name:")) {
        const nm = k.slice(5).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter["customer.name"] = new RegExp("^" + nm + "$", "i");
        filter["customer.phone"] = { $in: ["", null] };
      } else {
        filter["customer.phone"] = { $in: ["", null] };
        filter["customer.name"] = { $in: ["", null] };
      }
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
        const phone = (req.body.customer?.phone || "").trim();
    if (phone) {
      try {
        const name = (req.body.customer?.name || "").trim();
        const update = { $addToSet: { bills: bill.id } };
        if (name) update.$set = { name };
        await Customer.findOneAndUpdate({ phone }, update, { upsert: true });
      } catch (e) { console.error("Customer update error:", e.message); }
    }

    res.json(bill);
  } catch (err) {
    console.error("❌ BILL SAVE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/bills/apply-discount ──────────────────────────────────────────
// Delete COMPLETE BILLS whose combined total is approximately X%
// of the selected date range's total sales.
//
// Example:
// 400 bills = ₹20,000
// 50% = ₹10,000 target
// System deletes complete bills whose combined total is
// approximately ₹10,000.
// Individual bill items are NEVER partially deleted.
router.post("/apply-discount", authMiddleware, async (req, res) => {
  try {
    const {
      discount,
      fromDate,
      toDate
    } = req.body;

    const percentage = Number(discount);

    // ------------------------------------------------------------
    // Validate percentage
    // ------------------------------------------------------------

    if (
      !Number.isFinite(percentage) ||
      percentage <= 0 ||
      percentage >= 100
    ) {
      return res.status(400).json({
        error: "Invalid percentage. Enter between 1 and 99."
      });
    }

    // ------------------------------------------------------------
    // Validate dates
    // ------------------------------------------------------------

    if (!fromDate || !toDate) {
      return res.status(400).json({
        error: "From date and To date are required"
      });
    }

    const start = new Date(
      `${fromDate}T00:00:00+05:30`
    );

    const end = new Date(
      `${toDate}T23:59:59+05:30`
    );

    if (
      isNaN(start.getTime()) ||
      isNaN(end.getTime())
    ) {
      return res.status(400).json({
        error: "Invalid date"
      });
    }

    if (start > end) {
      return res.status(400).json({
        error: "From date cannot be greater than To date"
      });
    }

    // ------------------------------------------------------------
    // Get ALL bills in selected date range
    // ------------------------------------------------------------

    const bills = await Bill.find({
      date: {
        $gte: start,
        $lte: end
      }
    })
      .sort({ date: 1, _id: 1 })
      .lean();

    if (!bills.length) {
      return res.json({
        success: true,
        updated: 0,
        deleted: 0,
        deletedValue: 0,
        totalValue: 0,
        targetValue: 0,
        remainingValue: 0,
        message: "No bills found in selected date range."
      });
    }

    // ------------------------------------------------------------
    // Calculate TOTAL SALES of selected bills
    // ------------------------------------------------------------

    const totalValue = bills.reduce(
      (sum, bill) =>
        sum + (Number(bill.total) || 0),
      0
    );

    // Example:
    // Total = ₹20,000
    // 50% = ₹10,000

    const targetValue =
      totalValue * (percentage / 100);

    // ------------------------------------------------------------
    // Find COMPLETE BILLS whose combined total is closest
    // to targetValue.
    //
    // IMPORTANT:
    // We NEVER modify items inside a bill.
    // We either delete the whole bill or keep the whole bill.
    //
    // Greedy approach:
    // Pick the bill which keeps the remaining target closest.
    // ------------------------------------------------------------

    const candidates = bills
      .filter(
        bill => Number(bill.total) > 0
      )
      .map(bill => ({
        id: bill.id,
        mongoId: bill._id,
        total: Number(bill.total) || 0
      }));

    let selectedBills = [];
    let selectedValue = 0;

    // ------------------------------------------------------------
    // Sort bills by value descending.
    // This helps reach the target using fewer complete bills.
    // ------------------------------------------------------------

    candidates.sort(
      (a, b) => b.total - a.total
    );

    for (const bill of candidates) {
      const currentDifference =
        Math.abs(targetValue - selectedValue);

      const newDifference =
        Math.abs(
          targetValue -
          (selectedValue + bill.total)
        );

      // Add bill only if it brings us closer
      // to the target.
      if (
        newDifference < currentDifference
      ) {
        selectedBills.push(bill);
        selectedValue += bill.total;
      }

      // If extremely close, stop.
      if (
        Math.abs(targetValue - selectedValue) <= 0.01
      ) {
        break;
      }
    }

    // ------------------------------------------------------------
    // SECOND PASS:
    // Try improving the result with bills that were skipped.
    // This helps get closer to the target.
    // ------------------------------------------------------------

    let improved = true;

    while (improved) {
      improved = false;

      const selectedIds = new Set(
        selectedBills.map(
          bill => String(bill.mongoId)
        )
      );

      const remainingCandidates =
        candidates.filter(
          bill =>
            !selectedIds.has(
              String(bill.mongoId)
            )
        );

      const currentDifference =
        Math.abs(
          targetValue - selectedValue
        );

      for (const candidate of remainingCandidates) {
        // Try adding one skipped bill
        const addDifference =
          Math.abs(
            targetValue -
            (selectedValue + candidate.total)
          );

        if (addDifference < currentDifference) {
          selectedBills.push(candidate);
          selectedValue += candidate.total;
          improved = true;
          break;
        }

        // Try replacing one selected bill
        // with another bill.
        for (
          let i = 0;
          i < selectedBills.length;
          i++
        ) {
          const oldBill =
            selectedBills[i];

          const newValue =
            selectedValue -
            oldBill.total +
            candidate.total;

          const newDifference =
            Math.abs(
              targetValue - newValue
            );

          if (
            newDifference <
            currentDifference
          ) {
            selectedBills[i] = candidate;
            selectedValue = newValue;
            improved = true;
            break;
          }
        }

        if (improved) break;
      }
    }

    // ------------------------------------------------------------
    // Safety
    // ------------------------------------------------------------

    if (!selectedBills.length) {
      return res.json({
        success: true,
        updated: 0,
        deleted: 0,
        deletedValue: 0,
        totalValue,
        targetValue,
        remainingValue: totalValue,
        message:
          "Could not find suitable bills for deletion."
      });
    }

    // ------------------------------------------------------------
    // DELETE COMPLETE BILLS
    // ------------------------------------------------------------

    const idsToDelete =
      selectedBills.map(
        bill => bill.mongoId
      );

    const deleteResult =
      await Bill.deleteMany({
        _id: {
          $in: idsToDelete
        }
      });

    const deletedValue =
      +selectedValue.toFixed(2);

    const remainingValue =
      +(totalValue - deletedValue).toFixed(2);

    console.log(
      `🗑️ COMPLETE BILL DELETION`,
      `| ${percentage}%`,
      `| ${fromDate} → ${toDate}`,
      `| Total: ₹${totalValue.toFixed(2)}`,
      `| Target: ₹${targetValue.toFixed(2)}`,
      `| Deleted: ₹${deletedValue.toFixed(2)}`,
      `| Bills: ${deleteResult.deletedCount}`,
      `| Remaining: ₹${remainingValue.toFixed(2)}`
    );

    res.json({
      success: true,

      updated: deleteResult.deletedCount,
      deleted: deleteResult.deletedCount,

      deletedValue,
      totalValue: +totalValue.toFixed(2),
      targetValue: +targetValue.toFixed(2),
      remainingValue,

      percentage,
      fromDate,
      toDate
    });

  } catch (err) {
    console.error(
      "❌ COMPLETE BILL DELETION ERROR:",
      err
    );

    res.status(500).json({
      error: err.message
    });
  }
});

// ─── GET /api/bills/analytics ─────────────────────────────────────────────────
router.get("/analytics", authMiddleware, async (req, res) => {
  try {
    const cached = cache.get("bills:analytics");
    if (cached) return res.json(cached);

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

    const payload = {
      today: todayRaw[0] || { revenue: 0, profit: 0, bills: 0 },
      allTime: allTimeRaw[0] || { revenue: 0, profit: 0, bills: 0 },
      daily: dailyRaw,
      topItems: topItemsRaw,
      recent: recentRaw
    };
    cache.set("bills:analytics", payload, 60 * 1000);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ─── GET /api/bills/item-report ───────────────────────────────────────────────
router.get("/item-report", authMiddleware, async (req, res) => {
  try {
    const cacheKey = "bills:item-report:" + req.originalUrl;
    const cachedReport = cache.get(cacheKey);
    if (cachedReport) return res.json(cachedReport);

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

    cache.set(cacheKey, data, 60 * 1000);
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
router.get("/sales-summary", authMiddleware, async (req, res) => {
  try {
    const cacheKey = "bills:summary:" + req.originalUrl;
    const cachedSummary = cache.get(cacheKey);
    if (cachedSummary) return res.json(cachedSummary);

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

    const bills = await Bill.find(filter)
      .select("total profit discountAmt paymentMode")
      .lean();

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

      if (paymentMode.startsWith("SPLIT")) {
        const m = paymentMode.match(/Cash:([\d.]+)\s+UPI:([\d.]+)/i);
        cashSales += m ? Number(m[1]) : total;
        upiSales += m ? Number(m[2]) : 0;
        cashCount++;
        upiCount++;
      } else if (paymentMode === "UPI") {
        upiSales += total;
        upiCount++;
      } else {
        cashSales += total;
        cashCount++;
      }
    }

    const out = {
      totalSales,
      totalProfit,
      totalDiscount,
      billsCount: bills.length,
      cashSales,
      cashCount,
      upiSales,
      upiCount
    };
    cache.set(cacheKey, out, 30 * 1000);
    res.json(out);

  } catch (err) {
    console.error("❌ SALES SUMMARY ERROR:", err);

    res.status(500).json({
      error: err.message
    });
  }
});

// ─── PUT /api/bills/:id ───────────────────────────────────────────────────────
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const bill = await Bill.findOne({ id: req.params.id });
    if (!bill) return res.status(404).json({ error: "Bill not found" });

    const items = Array.isArray(req.body.items) ? req.body.items : bill.items;
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const cost = items.reduce((s, i) => s + i.cost * i.qty, 0);
    const keepDiscount = bill.discountApplied;
    const discountPct = keepDiscount ? bill.discountPct : (Number(req.body.discountPct) || 0);
    const discountAmt = keepDiscount ? bill.discountAmt : (subtotal * discountPct) / 100;
    const total = keepDiscount ? subtotal : subtotal - discountAmt;
    const profit = 0; // Cost is equal to selling price, profit is 0% as requested

    Object.assign(bill, { items, subtotal, discountPct, discountAmt, total, cost, profit });
    await bill.save();
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/bills/:id ────────────────────────────────────────────────────
router.delete("/:id",authMiddleware, async (req, res) => {
  try {
    await Bill.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/bills/:id ───────────────────────────────────────────────────────
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const bill = await Bill.findOne({ id: req.params.id }).lean();
    if (!bill) return res.status(404).json({ error: "Bill not found" });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;