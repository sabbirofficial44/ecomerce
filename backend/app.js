const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();

app.use(cors()); 
app.use(express.json());

const DB_PATH = path.join(__dirname, 'products.json');
const USER_PATH = path.join(__dirname, 'users.json');
const ORDER_PATH = path.join(__dirname, 'orders.json'); 

const readData = (file) => {
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify([]));
    return JSON.parse(fs.readFileSync(file));
};
const writeData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    } 
});

const otpStore = {};

// রেজিস্ট্রেশন
app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    let users = readData(USER_PATH);
    if (users.find(u => u.email === email)) return res.json({ success: false, message: "Email already exists!" });
    
    const role = (email === "sabbirmolla801@gmail.com") ? "admin" : "user";
    users.push({ name, email, password, role });
    writeData(USER_PATH, users);
    res.json({ success: true });
});

// লগইন
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const users = readData(USER_PATH);
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        res.json({ success: true, user });
    } else {
        res.status(401).json({ success: false, message: "Invalid email or password" });
    }
});

// OTP পাঠানো
app.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    let users = readData(USER_PATH);
    const userExists = users.find(u => u.email === email);
    
    if (userExists) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
        otpStore[email] = otp;
        
        const mailOptions = {
            from: 'tempmail2071@gmail.com',
            to: email,
            subject: 'Your Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.status(500).json({ success: false, message: "Failed to send email!" });
            } else {
                res.json({ success: true, message: "OTP sent to your email!" });
            }
        });
    } else {
        res.status(404).json({ success: false, message: "User not found!" });
    }
});

// পাসওয়ার্ড রিসেট
app.post('/reset-password', (req, res) => {
    const { email, otp, newPassword } = req.body;
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

// প্রোডাক্টস ও অন্যান্য API
app.get('/products', (req, res) => res.json(readData(DB_PATH)));

app.post('/add-product', (req, res) => {
    const products = readData(DB_PATH);
    const newProduct = { ...req.body, id: Date.now() };
    products.push(newProduct);
    writeData(DB_PATH, products);
    res.json({ success: true, product: newProduct }); 
});

app.delete('/delete-product/:id', (req, res) => {
    let products = readData(DB_PATH);
    const idToDelete = parseInt(req.params.id);
    products = products.filter(p => p.id !== idToDelete && String(p.id) !== req.params.id);
    writeData(DB_PATH, products);
    res.json({ success: true });
});

app.post('/place-order', (req, res) => {
    const orders = readData(ORDER_PATH);
    const newOrder = { id: 'ORD-' + Date.now(), date: new Date().toISOString(), status: 'Pending', ...req.body };
    orders.push(newOrder);
    writeData(ORDER_PATH, orders);
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

app.get('/admin/stats', (req, res) => {
    const users = readData(USER_PATH);
    const products = readData(DB_PATH);
    const orders = readData(ORDER_PATH);
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    res.json({ totalUsers: users.length, totalProducts: products.length, totalOrders: orders.length, totalRevenue });
});

// --- হোস্টিংয়ের জন্য প্রয়োজনীয় অংশ (Charity changes) ---

// ১. রিঅ্যাক্ট বিল্ড ফোল্ডার কানেক্ট করা
app.use(express.static(path.join(__dirname, 'client/build')));

// ২. ফ্রন্টএন্ড রুট হ্যান্ডেল করা
app.use((req, res, next) => {
    const indexPath = path.join(__dirname, 'client/build', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send("Frontend build not found!");
    }
});

// ৩. পোর্ট সেটিংস (Render এর জন্য process.env.PORT)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => 
  console.log(`Server running on port ${PORT}`)
);

