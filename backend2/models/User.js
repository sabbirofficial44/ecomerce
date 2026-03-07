const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: String,
  role: { type: String, default: "user" },
  loginCount: { type: Number, default: 0 },
  lastLogin: Date,
  lastIp: String, // ← নতুন
  latitude: Number, // ← নতুন
  longitude: Number, // ← নতুন
  browserInfo: {
    // ← নতুন (অবজেক্ট)
    userAgent: String,
    language: String,
    screenWidth: Number,
    screenHeight: Number,
    timezone: String,
  },
  notificationPermission: { type: String, default: "default" }, // ← নতুন
  orderCount: { type: Number, default: 0 },
  profilePicture: String,
  defaultAddress: String,
  defaultPhone: String,
});

module.exports = mongoose.model("User", userSchema);
