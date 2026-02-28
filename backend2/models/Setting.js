const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    // Single document (key‑value store) – we'll keep only one document
    siteName: String,
    logoUrl: String,
    primaryColor: String,
    secondaryColor: String,
    darkMode: Boolean,
    borderRadius: String,
    boxShadow: String,
    fontFamily: String,
    animationSpeed: String,
    heroBanner: {
        imageUrl: String,
        title: String,
        subtitle: String,
        buttonText: String
    },
    footerText: String,
    navbarMaxVisible: Number,
    featuredProductIds: [Number],
    sliderAutoPlay: Boolean,
    sliderInterval: Number,
    sliderShowArrows: Boolean,
    sliderShowDots: Boolean,
    enableReviews: Boolean,
    enableWishlist: Boolean,
    enableMultiCurrency: Boolean,
    facebookUrl: String,
    twitterUrl: String,
    instagramUrl: String,
    contactEmail: String,
    contactPhone: String,
    customCSS: String,
    customJS: String,
    googleAnalyticsId: String
});

module.exports = mongoose.model('Setting', settingSchema);