const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

const readData = (file) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
const saveData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

if (!fs.existsSync(USERS_FILE)) saveData(USERS_FILE, []);
if (!fs.existsSync(PRODUCTS_FILE)) saveData(PRODUCTS_FILE, []);
if (!fs.existsSync(ORDERS_FILE)) saveData(ORDERS_FILE, []);

let tempOTP = {}; // OTP Store
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'tempmail2071@gmail.com', pass: 'vaox seep gxtd ovnt' }
});

// =======================
// 🛍️ PRODUCTS & ORDERS API
// =======================
app.get('/products', (req, res) => res.json(readData(PRODUCTS_FILE)));

app.post('/add-product', (req, res) => {
    const products = readData(PRODUCTS_FILE);
    const newP = { ...req.body, id: Date.now(), reviews: [], rating: 0 };
    products.push(newP);
    saveData(PRODUCTS_FILE, products);
    res.json({ success: true, product: newP });
});

app.delete('/delete-product/:id', (req, res) => {
    saveData(PRODUCTS_FILE, readData(PRODUCTS_FILE).filter(p => p.id != req.params.id));
    res.json({ success: true, message: 'Product Deleted' });
});

app.post('/place-order', (req, res) => {
    const { userEmail, items, total, address, phone, paymentMethod } = req.body;
    const orders = readData(ORDERS_FILE);
    const newOrder = { id: 'ORD' + Date.now(), userEmail, items, total, address, phone, paymentMethod, status: 'Pending', date: new Date() };
    orders.push(newOrder);
    saveData(ORDERS_FILE, orders);
    res.json({ success: true, orderId: newOrder.id });
});

app.get('/admin/orders', (req, res) => res.json(readData(ORDERS_FILE)));
app.put('/admin/update-order/:id', (req, res) => {
    const orders = readData(ORDERS_FILE);
    const idx = orders.findIndex(o => o.id === req.params.id);
    if (idx !== -1) { orders[idx].status = req.body.status; saveData(ORDERS_FILE, orders); res.json({ success: true }); } 
    else res.json({ success: false });
});

app.get('/admin/stats', (req, res) => {
    const orders = readData(ORDERS_FILE);
    res.json({
        totalUsers: readData(USERS_FILE).length,
        totalProducts: readData(PRODUCTS_FILE).length,
        totalOrders: orders.length,
        totalRevenue: orders.filter(o => o.status === 'Delivered').reduce((sum, o) => sum + o.total, 0)
    });
});
// ... ager sob code thakbe ...

// 📦 USER-ER NIJER ORDER DEKHAR API
app.get('/user/orders/:email', (req, res) => {
    const orders = readData(ORDERS_FILE);
    const userOrders = orders.filter(o => o.userEmail === req.params.email);
    res.json(userOrders);
});

// ... baki sob code (admin orders, login, etc.) thakbe ...
// =======================
// 🔐 AUTH & USERS API
// =======================
app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    let users = readData(USERS_FILE);
    if (users.find(u => u.email === email)) return res.json({ success: false, message: "Email already exists" });
    const newUser = { id: Date.now(), name, email, password, role: 'user', cart: [], wishlist: [] };
    users.push(newUser); saveData(USERS_FILE, users);
    res.json({ success: true, user: newUser });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = readData(USERS_FILE).find(u => u.email === email && u.password === password);
    if (user) res.json({ success: true, user: { ...user, cart: user.cart || [], wishlist: user.wishlist || [] } });
    else res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// 🔄 FORGOT PASSWORD API
app.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    tempOTP[email] = otp;
    transporter.sendMail({
        from: 'tempmail2071@gmail.com', to: email, subject: 'Password Reset OTP', text: `Your OTP is: ${otp}`
    }, (err) => res.json({ success: !err, message: err ? "Failed to send OTP" : "OTP Sent to your email!" }));
});

app.post('/reset-password', (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (tempOTP[email] && tempOTP[email] === String(otp).trim()) {
        let users = readData(USERS_FILE);
        const idx = users.findIndex(u => u.email === email);
        if (idx !== -1) {
            users[idx].password = newPassword;
            saveData(USERS_FILE, users);
            delete tempOTP[email];
            return res.json({ success: true, message: "Password updated successfully!" });
        }
    }
    res.json({ success: false, message: "Invalid OTP or Email" });
});

app.post('/user/sync', (req, res) => {
    const { email, cart, wishlist } = req.body;
    let users = readData(USERS_FILE);
    const idx = users.findIndex(u => u.email === email);
    if (idx !== -1) { users[idx].cart = cart; users[idx].wishlist = wishlist; saveData(USERS_FILE, users); return res.json({ success: true }); }
    res.json({ success: false });
});

app.listen(5000, () => console.log("🚀 Backend Running on Port 5000"));