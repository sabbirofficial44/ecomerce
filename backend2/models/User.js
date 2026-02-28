const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, lowercase: true },
    password: String,
    role: { type: String, default: 'user' },
    loginCount: { type: Number, default: 0 },
    lastLogin: Date,
    orderCount: { type: Number, default: 0 },
    profilePicture: String,
    defaultAddress: String,
    defaultPhone: String
});

module.exports = mongoose.model('User', userSchema);