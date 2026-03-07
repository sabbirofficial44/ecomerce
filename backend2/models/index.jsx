const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const SECRET_KEY = "my_secret_key_123"; // এটা আপনার গোপন কোড

// ডামি অ্যাডমিন ডাটা (অ্যাসাইনমেন্টের জন্য)
const adminUser = {
    email: "admin@gmail.com",
    password: "123" 
};

// লগইন রুট
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (email === adminUser.email && password === adminUser.password) {
        // যদি ইমেইল ও পাসওয়ার্ড মিলে যায়, তবে একটি টোকেন তৈরি হবে
        const token = jwt.sign({ email: adminUser.email, role: 'admin' }, SECRET_KEY, { expiresIn: '1h' });
        return res.json({ success: true, token });
    } else {
        return res.status(401).json({ success: false, message: "ভুল ইমেইল বা পাসওয়ার্ড!" });
    }
});

app.listen(5000, () => console.log("সার্ভার চলছে পোর্ট ৫০০০-এ"));