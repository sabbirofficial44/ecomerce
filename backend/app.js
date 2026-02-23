const express = require('express');
require('dotenv').config();
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer'); // নতুন যোগ করা হয়েছে

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

// ১. ইমেইল পাঠানোর ট্রান্সপোর্টার সেটআপ (আপনার জিমেইল ব্যবহার করে)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // এনভায়রনমেন্ট ভেরিয়েবল
        pass: process.env.EMAIL_PASS  // এনভায়রনমেন্ট ভেরিয়েবল
    }
});

// OTP সাময়িকভাবে সেভ রাখার জন্য একটি অবজেক্ট
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

// ১. OTP পাঠানোর API (Forgot Password - এখন সরাসরি ইমেইল যাবে)
app.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    let users = readData(USER_PATH);
    
    const userExists = users.find(u => u.email === email);
    
    if (userExists) {
        // ৬ ডিজিটের একটি র‍্যান্ডম OTP তৈরি
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
        otpStore[email] = otp;
        
        // ইমেইল পাঠানোর অপশন
        const mailOptions = {
            from: 'tempmail2071@gmail.com',
            to: email,
            subject: 'Your Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}. Do not share this with anyone.`
        };

        // ইমেইল পাঠানো হচ্ছে
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                return res.status(500).json({ success: false, message: "Failed to send email!" });
            } else {
                console.log('Email sent: ' + info.response);
                res.json({ success: true, message: "OTP sent to your email!" });
            }
        });
        
    } else {
        res.status(404).json({ success: false, message: "User not found with this email!" });
    }
});

// ২. পাসওয়ার্ড রিসেট করার API (OTP ভেরিফাই করে)
app.post('/reset-password', (req, res) => {
    const { email, otp, newPassword } = req.body;
    let users = readData(USER_PATH);
    
    // OTP মিলছে কিনা চেক করা হচ্ছে
    if (otpStore[email] && otpStore[email] === otp) {
        const userIndex = users.findIndex(u => u.email === email);
        if (userIndex !== -1) {
            users[userIndex].password = newPassword; // পাসওয়ার্ড আপডেট
            writeData(USER_PATH, users);
            delete otpStore[email]; // কাজ শেষ, তাই OTP ডিলিট করে দিলাম
            res.json({ success: true, message: "Password updated successfully!" });
        } else {
            res.status(404).json({ success: false, message: "User not found!" });
        }
    } else {
        res.status(400).json({ success: false, message: "Invalid OTP!" });
    }
});

// ইউজার সিঙ্ক 
app.post('/user/sync', (req, res) => {
    res.json({ success: true });
});

// প্রোডাক্টস
app.get('/products', (req, res) => res.json(readData(DB_PATH)));

app.post('/add-product', (req, res) => {
    const products = readData(DB_PATH);
    const newProduct = { ...req.body, id: Date.now() };
    products.push(newProduct);
    writeData(DB_PATH, products);
    res.json({ success: true, product: newProduct }); 
});

// প্রোডাক্ট ডিলিট API
app.delete('/delete-product/:id', (req, res) => {
    let products = readData(DB_PATH);
    const idToDelete = parseInt(req.params.id);
    products = products.filter(p => p.id !== idToDelete && String(p.id) !== req.params.id);
    writeData(DB_PATH, products);
    res.json({ success: true });
});

// অর্ডার প্লেস করা
app.post('/place-order', (req, res) => {
    const orders = readData(ORDER_PATH);
    const newOrder = {
        id: 'ORD-' + Date.now(),
        date: new Date().toISOString(),
        status: 'Pending',
        ...req.body
    };
    orders.push(newOrder);
    writeData(ORDER_PATH, orders);
    res.json({ success: true, order: newOrder });
});

// অ্যাডমিন প্যানেলে অর্ডার শো করানো
app.get('/admin/orders', (req, res) => {
    res.json(readData(ORDER_PATH));
});

// ইউজারের মাই অর্ডার পেজে অর্ডার শো করানো
app.get('/user/orders/:email', (req, res) => {
    const orders = readData(ORDER_PATH);
    const userOrders = orders.filter(o => o.userEmail === req.params.email);
    res.json(userOrders);
});

// অ্যাডমিন প্যানেল থেকে অর্ডার স্ট্যাটাস আপডেট করা
app.put('/admin/update-order/:id', (req, res) => {
    let orders = readData(ORDER_PATH);
    orders = orders.map(o => o.id === req.params.id ? { ...o, status: req.body.status } : o);
    writeData(ORDER_PATH, orders);
    res.json({ success: true });
});

// অ্যাডমিন ড্যাশবোর্ডের স্ট্যাটিস্টিক্স
app.get('/admin/stats', (req, res) => {
    const users = readData(USER_PATH);
    const products = readData(DB_PATH);
    const orders = readData(ORDER_PATH);
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    
    res.json({
        totalUsers: users.length,
        totalProducts: products.length,
        totalOrders: orders.length,
        totalRevenue: totalRevenue
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => 
  console.log(`Server running on port ${PORT}`)

);
