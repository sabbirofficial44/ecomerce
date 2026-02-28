const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    id: { type: String, unique: true }, // e.g. ORD-123456
    date: { type: Date, default: Date.now },
    status: { type: String, default: 'Pending' },
    userEmail: String,
    userName: String,
    userPhone: String,
    userAddress: String,
    items: [{
        product: mongoose.Schema.Types.Mixed,
        size: String,
        quantity: Number
    }],
    total: Number,
    paymentMethod: String
});

module.exports = mongoose.model('Order', orderSchema);