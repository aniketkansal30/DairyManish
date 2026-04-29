const mongoose = require("mongoose");

const billItemSchema = new mongoose.Schema(
  {
    id:       String,
    name:     String,
    category: String,
    price:    Number,
    cost:     Number,
    unit:     String,
    qty:      Number, 
    total:    Number,
  },
  { _id: false }
);

const billSchema = new mongoose.Schema(
  {
    id:          { type: String, required: true, unique: true }, // "MD<timestamp>"
    date:        { type: Date,   required: true, default: Date.now },
    items:       [billItemSchema],
    subtotal:    { type: Number, required: true },
    discountPct: { type: Number, default: 0 },
    discountAmt: { type: Number, default: 0 },
    total:       { type: Number, required: true },
    cost:        { type: Number, required: true },
    profit:      { type: Number, required: true },
    discountApplied: { type: Boolean, default: false },
    customer: {
      name:  { type: String, default: "" },
      phone: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

// Index for fast date-based queries (analytics, today's sales)
billSchema.index({ date: -1 });
billSchema.index({ "customer.phone": 1 });

module.exports = mongoose.model("Bill", billSchema);
