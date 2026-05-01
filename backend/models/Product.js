const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    id:       { type: String, required: true, unique: true },
    name:     { type: String, required: true },
    category: { type: String, required: true },
    price:    { type: Number, required: true },
    cost:     { type: Number, required: true },
    unit:     { type: String, required: true, enum: ["kg", "litre", "piece"] },

    // --- HALF / FULL VARIATION ---
    hasVariation: { type: Boolean, default: false },
    halfPrice:    { type: Number, default: 0 },
    fullPrice:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);