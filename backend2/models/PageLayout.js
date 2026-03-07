const mongoose = require('mongoose');

const pageLayoutSchema = new mongoose.Schema({
    layout: { type: Array, default: [] }
});

module.exports = mongoose.model('PageLayout', pageLayoutSchema);