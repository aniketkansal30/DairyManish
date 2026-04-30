const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    id:       { type: String, required: true, unique: true }, // "p1", "p2" ...
    name:     { type: String, required: true },
    category: { type: String, required: true },
    price:    { type: Number, required: true },
    cost:     { type: Number, required: true },
    unit:     { type: String, required: true, enum: ["kg", "litre", "piece"] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
