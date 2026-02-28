const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const multer = require('multer');
// const FormData = require('form-data');
require('dotenv').config();

// ==================== MODELS ====================
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Category = require('./models/Category');
const Setting = require('./models/Setting');

const app = express();
app.use(cors());
app.use(express.json());

// ==================== MONGODB CONNECTION ====================
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// ==================== MULTER (memory storage) ====================
const upload = multer({ storage: multer.memoryStorage() });

// ==================== NODEMAILER TRANSPORTER ====================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
const otpStore = {};

// ==================== USER ROUTES ====================
app.post('/register', async (req, res) => {
    let { name, email, password } = req.body;
    email = email.toLowerCase().trim();
    try {
        const existing = await User.findOne({ email });
        if (existing) return res.json({ success: false, message: "Email already exists!" });

        const role = (email === "sabbirmolla801@gmail.com") ? "admin" : "user";
        const newUser = new User({
            name,
            email,
            password,
            role,
            loginCount: 0,
            lastLogin: null,
            orderCount: 0,
            profilePicture: "",
            defaultAddress: "",
            defaultPhone: ""
        });
        await newUser.save();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post('/login', async (req, res) => {
    let { email, password } = req.body;
    email = email.toLowerCase().trim();
    try {
        const user = await User.findOne({ email, password });
        if (!user) return res.status(401).json({ success: false, message: "Invalid email or password" });

        user.loginCount += 1;
        user.lastLogin = new Date();
        await user.save();

        const { password: pwd, ...safeUser } = user.toObject();
        res.json({ success: true, user: safeUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post('/forgot-password', async (req, res) => {
    let { email } = req.body;
    email = email.toLowerCase().trim();
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found!" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = otp;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset OTP',
            text: `Your OTP is: ${otp}`
        };
        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                console.log(error);
                return res.status(500).json({ success: false, message: "Failed to send email!" });
            }
            res.json({ success: true, message: "OTP sent to your email!" });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post('/reset-password', async (req, res) => {
    let { email, otp, newPassword } = req.body;
    email = email.toLowerCase().trim();
    try {
        if (otpStore[email] !== otp) return res.status(400).json({ success: false, message: "Invalid OTP!" });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found!" });

        user.password = newPassword;
        await user.save();
        delete otpStore[email];
        res.json({ success: true, message: "Password updated!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post('/user/sync', (req, res) => res.json({ success: true }));

// ==================== PRODUCT ROUTES ====================
app.get('/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/add-product', async (req, res) => {
    try {
        const newProduct = new Product({
            id: Date.now(),
            name: req.body.name,
            price: req.body.price,
            originalPrice: req.body.originalPrice || req.body.price,
            category: req.body.category,
            img: req.body.img,
            description: req.body.description || '',
            inStock: req.body.inStock !== undefined ? req.body.inStock : true,
            sold: req.body.sold || 0,
            type: req.body.type || 'simple',
            sizes: req.body.sizes || [],
            createdAt: new Date()
        });
        await newProduct.save();
        res.json({ success: true, product: newProduct });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/edit-product/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const product = await Product.findOne({ id });
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        Object.assign(product, req.body);
        product.type = req.body.type || product.type || 'simple';
        product.sizes = req.body.sizes || product.sizes || [];
        await product.save();
        res.json({ success: true, product });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/delete-product/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await Product.deleteOne({ id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== CATEGORIES ====================
app.get('/categories', async (req, res) => {
    try {
        let categories = await Category.find();
        if (categories.length === 0) {
            const defaultCats = ['Home', 'Cloth', 'Gadget', 'Book'];
            await Category.insertMany(defaultCats.map(name => ({ name })));
            categories = await Category.find();
        }
        res.json(categories.map(c => c.name));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/update-categories', async (req, res) => {
    try {
        const catNames = req.body;
        if (!Array.isArray(catNames)) return res.status(400).json({ success: false });

        await Category.deleteMany({});
        await Category.insertMany(catNames.map(name => ({ name })));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== ORDERS ====================
app.post('/place-order', async (req, res) => {
    try {
        const newOrder = new Order({
            id: 'ORD-' + Date.now(),
            date: new Date(),
            status: 'Pending',
            userEmail: req.body.userEmail,
            userName: req.body.userName,
            userPhone: req.body.userPhone,
            userAddress: req.body.userAddress,
            items: req.body.items,
            total: req.body.total,
            paymentMethod: req.body.paymentMethod
        });
        await newOrder.save();

        const user = await User.findOne({ email: req.body.userEmail });
        if (user) {
            user.orderCount = (user.orderCount || 0) + 1;
            await user.save();
        }
        res.json({ success: true, order: newOrder });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/admin/orders', async (req, res) => {
    try {
        const orders = await Order.find();
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/user/orders/:email', async (req, res) => {
    try {
        const orders = await Order.find({ userEmail: req.params.email });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/admin/update-order/:id', async (req, res) => {
    try {
        const order = await Order.findOne({ id: req.params.id });
        if (!order) return res.status(404).json({ success: false });
        order.status = req.body.status;
        await order.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/admin/order/:id', async (req, res) => {
    try {
        await Order.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== STATS ====================
app.get('/admin/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();
        const orders = await Order.find();
        const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
        res.json({ totalUsers, totalProducts, totalOrders, totalRevenue });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== USERS (for Admin) ====================
app.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        const orders = await Order.find();
        const usersWithOrderCount = users.map(u => {
            const userOrders = orders.filter(o => o.userEmail === u.email).length;
            return { ...u.toObject(), orderCount: u.orderCount || userOrders };
        });
        res.json(usersWithOrderCount);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/users/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        if (!user) return res.status(404).json({ success: false });
        Object.assign(user, req.body);
        await user.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/users/:email', async (req, res) => {
    try {
        await User.deleteOne({ email: req.params.email });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== SETTINGS ====================
const getSettings = async () => {
    let settings = await Setting.findOne();
    if (!settings) {
        const defaultSettings = new Setting({
            siteName: "NoboDeal",
            logoUrl: "",
            primaryColor: "#00bfff",
            secondaryColor: "#ff00f7",
            darkMode: false,
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            fontFamily: "'Poppins', sans-serif",
            animationSpeed: "0.3s",
            heroBanner: {
                imageUrl: "https://picsum.photos/id/1015/1200/400",
                title: "Big Summer Sale is Live!",
                subtitle: "Up to 70% OFF on Fashion & Gadgets",
                buttonText: "Shop Now"
            },
            footerText: "© 2026 NoboDeal - Made with ❤️ in Bangladesh",
            navbarMaxVisible: 3,
            featuredProductIds: [],
            sliderAutoPlay: true,
            sliderInterval: 4500,
            sliderShowArrows: true,
            sliderShowDots: true,
            enableReviews: true,
            enableWishlist: true,
            enableMultiCurrency: true,
            facebookUrl: "",
            twitterUrl: "",
            instagramUrl: "",
            contactEmail: "",
            contactPhone: "",
            customCSS: "",
            customJS: "",
            googleAnalyticsId: ""
        });
        await defaultSettings.save();
        return defaultSettings;
    }
    return settings;
};

app.get('/settings', async (req, res) => {
    try {
        const settings = await getSettings();
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/update-settings', async (req, res) => {
    try {
        let settings = await Setting.findOne();
        if (!settings) {
            settings = new Setting(req.body);
        } else {
            Object.assign(settings, req.body);
        }
        await settings.save();
        res.json({ success: true, settings });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== PROFILE UPDATE ====================
app.post('/update-profile', async (req, res) => {
    let { currentEmail, currentPassword, newEmail, newPassword, profilePicture, defaultAddress, defaultPhone, name } = req.body;
    if (currentEmail) currentEmail = currentEmail.toLowerCase().trim();

    try {
        const user = await User.findOne({ email: currentEmail });
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        const wantsToChangeEmail = newEmail && newEmail.toLowerCase().trim() !== currentEmail;
        const wantsToChangePassword = newPassword && newPassword.length > 0;

        if (wantsToChangeEmail || wantsToChangePassword) {
            if (!currentPassword || user.password !== currentPassword) {
                return res.status(401).json({ success: false, message: "বর্তমান পাসওয়ার্ড ভুল বা দেয়া হয়নি।" });
            }
        }

        if (wantsToChangeEmail) {
            const newEmailLower = newEmail.toLowerCase().trim();
            const existingUser = await User.findOne({ email: newEmailLower });
            if (existingUser) return res.status(400).json({ success: false, message: "এই ইমেইল ইতিমধ্যে ব্যবহৃত হচ্ছে।" });
            user.email = newEmailLower;
        }

        if (wantsToChangePassword) user.password = newPassword;

        if (name !== undefined) user.name = name;
        if (profilePicture !== undefined) user.profilePicture = profilePicture;
        if (defaultAddress !== undefined) user.defaultAddress = defaultAddress;
        if (defaultPhone !== undefined) user.defaultPhone = defaultPhone;

        await user.save();

        const { password, ...updatedUser } = user.toObject();
        res.json({ success: true, user: updatedUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ==================== PHONE LOGIN ====================
app.post('/phone-login', async (req, res) => {
    let { phone, name } = req.body;
    phone = phone.trim();
    try {
        let user = await User.findOne({ email: phone });
        if (!user) {
            const newUser = new User({
                name: name || "Phone User",
                email: phone,
                password: "",
                role: "user",
                loginCount: 1,
                lastLogin: new Date(),
                orderCount: 0,
                profilePicture: "",
                defaultAddress: "",
                defaultPhone: phone
            });
            await newUser.save();
            user = newUser;
        } else {
            user.loginCount += 1;
            user.lastLogin = new Date();
            await user.save();
        }
        const { password, ...safeUser } = user.toObject();
        res.json({ success: true, user: safeUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ==================== GOOGLE LOGIN ====================
app.post('/google-login', async (req, res) => {
    let { email, name } = req.body;
    email = email.toLowerCase().trim();

    try {
        let user = await User.findOne({ email });
        if (!user) {
            const role = (email === "sabbirmolla801@gmail.com") ? "admin" : "user";
            const newUser = new User({
                name,
                email,
                password: "",
                role,
                loginCount: 1,
                lastLogin: new Date(),
                orderCount: 0,
                profilePicture: "",
                defaultAddress: "",
                defaultPhone: ""
            });
            await newUser.save();
            user = newUser;
        } else {
            user.loginCount += 1;
            user.lastLogin = new Date();
            await user.save();
        }
        const { password, ...safeUser } = user.toObject();
        res.json({ success: true, user: safeUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ==================== UPLOAD to ImgBB ====================
app.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    try {
        const base64Image = req.file.buffer.toString('base64');
        
        // FormData এর বদলে URLSearchParams ব্যবহার করা অনেক বেশি সেইফ
        const params = new URLSearchParams(); 
        params.append('key', process.env.IMGBB_API_KEY.trim());
        params.append('image', base64Image);

        const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: params // params পাঠিয়ে দিন
        });

        const result = await response.json();

        if (result.success) {
            return res.json({ success: true, imageUrl: result.data.url });
        } else {
            console.error('ImgBB upload failed:', result);
            return res.status(500).json({ success: false, message: 'Image upload failed' });
        }
    } catch (error) {
        console.error('🔥 Upload error:', error);
        return res.status(500).json({ success: false, message: 'Server error during upload' });
    }
});

// ==================== SERVER START ====================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));





