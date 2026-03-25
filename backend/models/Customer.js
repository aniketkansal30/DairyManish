const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    name:  { type: String, default: "" },
    bills: [{ type: String }], // array of bill IDs like ["MD123", "MD456"]
  },
  { timestamps: true }
);

customerSchema.index({ name: "text" }); // for text search

module.exports = mongoose.model("Customer", customerSchema);
