const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const buildPath = path.join(__dirname, 'client/build');
app.use(express.static(buildPath));
const app = express();

// সকল অরিজিন থেকে এক্সেস দেওয়ার জন্য (Firebase ফ্রন্টএন্ডের জন্য জরুরি)
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
        user: 'tempmail2071@gmail.com',
        pass: 'vaox seep gxtd ovnt' 
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
('/products', (req, res) => res.json(readData(DB_PATH)));

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

// --- হোস্টিংয়ের জন্য প্রয়োজনীয় অংশ ---

// ১. রিঅ্যাক্ট বিল্ড ফোল্ডার কানেক্ট করা
app.use(express.static(path.join(__dirname, 'client/build')));

// ২. ফ্রন্টএন্ড রুট হ্যান্ডেল করা (Firebase-এর জন্য API চেক রুট যোগ করা হয়েছে)
// কোনো রুট না মিললে এটি এপিআই রানিং কি না তা চেক করবে
app.get('*', (req, res) => {
    const indexPath = path.join(buildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send("Frontend build not found. Please run 'npm run build' in client folder.");
    }
});

// Express 5 এর এরর এড়াতে ওয়াইল্ডকার্ডের পরিবর্তে এই মিডলওয়্যারটি ব্যবহার করা হয়েছে
app.use((req, res, next) => {
    const indexPath = path.join(__dirname, 'client/build', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        // যদি বিল্ড ফোল্ডার না থাকে, তবে ৪০৪ না দিয়ে একটি মেসেজ দিবে
        next();
    }
});

// ৩. পোর্ট সেটিংস (Render এর জন্য process.env.PORT)
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

