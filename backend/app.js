const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const multer = require('multer');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
// No need to serve static uploads if using Firebase

// Initialize Firebase Admin
let serviceAccount;
try {
    serviceAccount = require('./serviceAccountKey.json');
} catch (e) {
    console.warn('serviceAccountKey.json not found. Firebase Storage will not work.');
    serviceAccount = null;
}

if (serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'e-commerce-shop-site.firebasestorage.app'
    });
} else {
    console.warn('Firebase Admin not initialized. Uploads will fail.');
}

const bucket = admin.storage ? admin.storage().bucket() : null;

// File paths
const SETTINGS_PATH = path.join(__dirname, 'settings.json');
const CAT_PATH = path.join(__dirname, 'categories.json');
const DB_PATH = path.join(__dirname, 'products.json');
const USER_PATH = path.join(__dirname, 'users.json');
const ORDER_PATH = path.join(__dirname, 'orders.json');

const readData = (file) => {
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify([]));
    return JSON.parse(fs.readFileSync(file));
};
const writeData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// Email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const otpStore = {};

// ==================== USER ROUTES ====================
app.post('/register', (req, res) => {
    let { name, email, password } = req.body;
    email = email.toLowerCase().trim();
    let users = readData(USER_PATH);
    if (users.find(u => u.email === email))
        return res.json({ success: false, message: "Email already exists!" });

    const role = (email === "sabbirmolla801@gmail.com") ? "admin" : "user";
    const newUser = {
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
    };
    users.push(newUser);
    writeData(USER_PATH, users);
    res.json({ success: true });
});

app.post('/login', (req, res) => {
    let { email, password } = req.body;
    email = email.toLowerCase().trim();
    let users = readData(USER_PATH);
    const userIndex = users.findIndex(u => u.email === email && u.password === password);
    if (userIndex !== -1) {
        users[userIndex].loginCount = (users[userIndex].loginCount || 0) + 1;
        users[userIndex].lastLogin = new Date().toISOString();
        writeData(USER_PATH, users);
        const { password, ...user } = users[userIndex];
        res.json({ success: true, user });
    } else {
        res.status(401).json({ success: false, message: "Invalid email or password" });
    }
});

app.post('/forgot-password', (req, res) => {
    let { email } = req.body;
    email = email.toLowerCase().trim();
    let users = readData(USER_PATH);
    const userExists = users.find(u => u.email === email);
    if (userExists) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = otp;
        const mailOptions = {
            from: 'tempmail2071@gmail.com',
            to: email,
            subject: 'Password Reset OTP',
            text: `Your OTP is: ${otp}`
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                return res.status(500).json({ success: false, message: "Failed to send email!" });
            }
            res.json({ success: true, message: "OTP sent to your email!" });
        });
    } else {
        res.status(404).json({ success: false, message: "User not found!" });
    }
});

app.post('/reset-password', (req, res) => {
    let { email, otp, newPassword } = req.body;
    email = email.toLowerCase().trim();
    let users = readData(USER_PATH);
    if (otpStore[email] && otpStore[email] === otp) {
        const userIndex = users.findIndex(u => u.email === email);
        if (userIndex !== -1) {
            users[userIndex].password = newPassword;
            writeData(USER_PATH, users);
            delete otpStore[email];
            res.json({ success: true, message: "Password updated!" });
        } else {
            res.status(404).json({ success: false, message: "User not found!" });
        }
    } else {
        res.status(400).json({ success: false, message: "Invalid OTP!" });
    }
});

app.post('/user/sync', (req, res) => res.json({ success: true }));

// ==================== PRODUCT ROUTES ====================
app.get('/products', (req, res) => res.json(readData(DB_PATH)));

app.post('/add-product', (req, res) => {
    const products = readData(DB_PATH);
    const newProduct = {
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
        createdAt: new Date().toISOString()
    };
    products.push(newProduct);
    writeData(DB_PATH, products);
    res.json({ success: true, product: newProduct });
});

app.put('/edit-product/:id', (req, res) => {
    let products = readData(DB_PATH);
    const id = parseInt(req.params.id);
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
        products[index] = {
            ...products[index],
            ...req.body,
            id: products[index].id,
            type: req.body.type || products[index].type || 'simple',
            sizes: req.body.sizes || products[index].sizes || []
        };
        writeData(DB_PATH, products);
        res.json({ success: true, product: products[index] });
    } else {
        res.status(404).json({ success: false, message: "Product not found" });
    }
});

app.delete('/delete-product/:id', (req, res) => {
    let products = readData(DB_PATH);
    const id = parseInt(req.params.id);
    products = products.filter(p => p.id !== id);
    writeData(DB_PATH, products);
    res.json({ success: true });
});

// ==================== CATEGORIES ====================
app.get('/categories', (req, res) => {
    let categories = readData(CAT_PATH);
    if (categories.length === 0) categories = ['Home', 'Cloth', 'Gadget', 'Book'];
    res.json(categories);
});

app.post('/update-categories', (req, res) => {
    if (Array.isArray(req.body)) {
        writeData(CAT_PATH, req.body);
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, message: "Invalid data" });
    }
});

// ==================== ORDERS ====================
app.post('/place-order', (req, res) => {
    const orders = readData(ORDER_PATH);
    const newOrder = {
        id: 'ORD-' + Date.now(),
        date: new Date().toISOString(),
        status: 'Pending',
        userEmail: req.body.userEmail,
        userName: req.body.userName,
        userPhone: req.body.userPhone,
        userAddress: req.body.userAddress,
        items: req.body.items,
        total: req.body.total,
        paymentMethod: req.body.paymentMethod
    };
    orders.push(newOrder);
    writeData(ORDER_PATH, orders);

    let users = readData(USER_PATH);
    const userIndex = users.findIndex(u => u.email === req.body.userEmail);
    if (userIndex !== -1) {
        users[userIndex].orderCount = (users[userIndex].orderCount || 0) + 1;
        writeData(USER_PATH, users);
    }
    res.json({ success: true, order: newOrder });
});

app.get('/admin/orders', (req, res) => res.json(readData(ORDER_PATH)));

app.get('/user/orders/:email', (req, res) => {
    const orders = readData(ORDER_PATH);
    const userOrders = orders.filter(o => o.userEmail === req.params.email);
    res.json(userOrders);
});

app.put('/admin/update-order/:id', (req, res) => {
    let orders = readData(ORDER_PATH);
    orders = orders.map(o => o.id === req.params.id ? { ...o, status: req.body.status } : o);
    writeData(ORDER_PATH, orders);
    res.json({ success: true });
});

app.delete('/admin/order/:id', (req, res) => {
    let orders = readData(ORDER_PATH);
    const id = req.params.id;
    orders = orders.filter(o => o.id !== id);
    writeData(ORDER_PATH, orders);
    res.json({ success: true });
});

// ==================== STATS ====================
app.get('/admin/stats', (req, res) => {
    const users = readData(USER_PATH);
    const products = readData(DB_PATH);
    const orders = readData(ORDER_PATH);
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    res.json({
        totalUsers: users.length,
        totalProducts: products.length,
        totalOrders: orders.length,
        totalRevenue
    });
});

// ==================== USERS (for Admin) ====================
app.get('/users', (req, res) => {
    const users = readData(USER_PATH);
    const orders = readData(ORDER_PATH);
    const safeUsers = users.map(({ password, ...rest }) => {
        const userOrders = orders.filter(o => o.userEmail === rest.email).length;
        return { ...rest, orderCount: rest.orderCount || userOrders };
    });
    res.json(safeUsers);
});

app.put('/users/:email', (req, res) => {
    let users = readData(USER_PATH);
    const index = users.findIndex(u => u.email === req.params.email);
    if (index === -1) return res.status(404).json({ success: false });
    users[index] = { ...users[index], ...req.body };
    writeData(USER_PATH, users);
    res.json({ success: true });
});

app.delete('/users/:email', (req, res) => {
    let users = readData(USER_PATH);
    users = users.filter(u => u.email !== req.params.email);
    writeData(USER_PATH, users);
    res.json({ success: true });
});

// ==================== SETTINGS ====================
const getSettings = () => {
    if (!fs.existsSync(SETTINGS_PATH)) {
        const defaultSettings = {
            siteName: "NoboDeal",
            logoUrl: "https://via.placeholder.com/180x50/1a1a2e/e94560?text=NoboDeal",
            primaryColor: "#e94560",
            secondaryColor: "#1a1a2e",
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
            navbarMaxVisible: 5,
            featuredProductIds: [],
            sliderAutoPlay: true,
            sliderInterval: 4500,
            sliderShowArrows: true,
            sliderShowDots: true,
            enableReviews: false,
            enableWishlist: false,
            enableMultiCurrency: false,
            facebookUrl: "",
            twitterUrl: "",
            instagramUrl: "",
            contactEmail: "",
            contactPhone: "",
            customCSS: "",
            customJS: "",
            googleAnalyticsId: ""
        };
        writeData(SETTINGS_PATH, defaultSettings);
        return defaultSettings;
    }
    return JSON.parse(fs.readFileSync(SETTINGS_PATH));
};

app.get('/settings', (req, res) => res.json(getSettings()));

app.post('/update-settings', (req, res) => {
    writeData(SETTINGS_PATH, req.body);
    res.json({ success: true, settings: req.body });
});

// ==================== PROFILE UPDATE ====================
app.post('/update-profile', (req, res) => {
    let { currentEmail, currentPassword, newEmail, newPassword, profilePicture, defaultAddress, defaultPhone, name } = req.body;
    
    if (currentEmail) currentEmail = currentEmail.toLowerCase().trim();
    console.log('Update profile requested for email:', currentEmail);
    
    let users = readData(USER_PATH);
    const userIndex = users.findIndex(u => u.email === currentEmail);
    console.log('User index found:', userIndex);
    
    if (userIndex === -1) {
        console.log('User not found!');
        return res.status(404).json({ success: false, message: "User not found." });
    }

    const user = users[userIndex];
    const wantsToChangeEmail = newEmail && newEmail.toLowerCase().trim() !== currentEmail;
    const wantsToChangePassword = newPassword && newPassword.length > 0;

    if (wantsToChangeEmail || wantsToChangePassword) {
        if (!currentPassword || user.password !== currentPassword) {
            return res.status(401).json({ success: false, message: "বর্তমান পাসওয়ার্ড ভুল বা দেয়া হয়নি।" });
        }
    }

    if (wantsToChangeEmail) {
        const newEmailLower = newEmail.toLowerCase().trim();
        const existingUser = users.find(u => u.email === newEmailLower);
        if (existingUser) return res.status(400).json({ success: false, message: "এই ইমেইল ইতিমধ্যে ব্যবহৃত হচ্ছে।" });
        user.email = newEmailLower;
    }

    if (wantsToChangePassword) user.password = newPassword;

    if (name !== undefined) user.name = name;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;
    if (defaultAddress !== undefined) user.defaultAddress = defaultAddress;
    if (defaultPhone !== undefined) user.defaultPhone = defaultPhone;

    writeData(USER_PATH, users);
    const { password, ...updatedUser } = user;
    res.json({ success: true, user: updatedUser });
});

// ==================== PHONE LOGIN ====================
app.post('/phone-login', (req, res) => {
    let { phone, name } = req.body;
    phone = phone.trim();
    let users = readData(USER_PATH);
    let user = users.find(u => u.email === phone);

    if (!user) {
        const newUser = {
            name: name || "Phone User",
            email: phone,
            password: "",
            role: "user",
            loginCount: 1,
            lastLogin: new Date().toISOString(),
            orderCount: 0,
            profilePicture: "",
            defaultAddress: "",
            defaultPhone: phone
        };
        users.push(newUser);
        writeData(USER_PATH, users);
        user = newUser;
    } else {
        user.loginCount = (user.loginCount || 0) + 1;
        user.lastLogin = new Date().toISOString();
        writeData(USER_PATH, users);
    }

    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
});

// ==================== GOOGLE LOGIN ====================
app.post('/google-login', (req, res) => {
    let { email, name } = req.body;
    email = email.toLowerCase().trim();
    console.log('Google login attempt for email:', email);

    let users = readData(USER_PATH);
    let user = users.find(u => u.email === email);
    
    if (!user) {
        console.log('User not found, creating new user');
        const role = (email === "sabbirmolla801@gmail.com") ? "admin" : "user";
        const newUser = {
            name,
            email,
            password: "",
            role,
            loginCount: 1,
            lastLogin: new Date().toISOString(),
            orderCount: 0,
            profilePicture: "",
            defaultAddress: "",
            defaultPhone: ""
        };
        users.push(newUser);
        writeData(USER_PATH, users);
        user = newUser;
    } else {
        console.log('User found, updating login count');
        user.loginCount = (user.loginCount || 0) + 1;
        user.lastLogin = new Date().toISOString();
        writeData(USER_PATH, users);
    }
    
    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
});

// ==================== UPLOAD to Firebase Storage ====================
const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    if (!bucket) return res.status(500).json({ success: false, message: 'Firebase Storage not configured' });

    try {
        const fileName = `products/${Date.now()}_${req.file.originalname}`;
        const file = bucket.file(fileName);

        await file.save(req.file.buffer, {
            metadata: { contentType: req.file.mimetype }
        });

        await file.makePublic();

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        res.json({ success: true, imageUrl: publicUrl });
    } catch (error) {
        console.error('Firebase upload error:', error);
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
});

// ==================== SERVER ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
