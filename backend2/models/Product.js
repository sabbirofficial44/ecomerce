const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  name: String,
  price: mongoose.Schema.Types.Mixed,
  originalPrice: mongoose.Schema.Types.Mixed,
  category: String,
  img: String,
  images: [String], // ← এই লাইনটি আগে ছিল, এখন আছে
  description: String,
  inStock: { type: Boolean, default: true },
  sold: { type: Number, default: 0 },
  type: { type: String, default: "simple" },
  sizes: [
    {
      size: String,
      stock: Number,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Product", productSchema);