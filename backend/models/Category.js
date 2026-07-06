const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
}, { timestamps: true });

const model = mongoose.model("Category", CategorySchema);
module.exports = require("../utils/inMemoryDb").wrapModel("Category", model);