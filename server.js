const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path'); // HTML files serve karne ke liye zaroori hai
require('dotenv').config();

const dns = require('dns');           //test

dns.setServers(['8.8.8.8', '8.8.4.4']);

dns.resolveSrv('_mongodb._tcp.cluster0.tjout2a.mongodb.net', (err, addresses) => {
    console.log('GOOGLE DNS TEST:', err || addresses);
});                        //add

const { User, SwapRequest } = require('./models');

const app = express();

// ============================================
// MIDDLEWARES
// ============================================
app.use(cors());
app.use(express.json());

// ⚠️ IMPORTANT: Agar aapki HTML/CSS files kisi folder me hain (jaise 'public' ya 'views')
// toh server ko batana padta hai. Niche di gayi line se server static files load karega.
app.use(express.static(path.join(__dirname, 'public')));


// ============================================
// DATABASE CONNECTION
// ============================================
console.log("MONGO_URI =", process.env.MONGO_URI);      //add new thing
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🎉 MongoDB Cloud Cluster Connected Successfully!'))
    .catch(err => console.error('🔴 Database Connection Error:', err));


// Auth Middleware (Tokens check karne ke liye)
const authMiddleware = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ msg: 'No token, authorization denied' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ msg: 'Token formatting error' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// ============================================
// WEB ROUTES (Page Loading Ke Liye)
// ============================================

// 1. MAIN HOMEPAGE ROUTE
// Jab koi main url pe aayega, toh aapki homepage ki HTML file load hogi
app.get('/', (req, res) => {
    // Agar aapki main homepage file public folder me 'home.html' naam se hai:
    res.sendFile(path.join(__dirname, 'public', 'home.html')); 
    
    // NOTE: Agar aapke paas abhi alag se home.html nahi hai, toh aap niche wali line chalane ke liye 
    // upar wali line ko comment (//) kar sakte hain:
    // res.send("<h1>Welcome to Homepage!</h1><p>Backend connect ho gaya hai.</p>");
});

// 2. AUTHENTICATION PAGE ROUTE (Login/Signup Page)
app.get('/auth', (req, res) => {
    // Jo glassmorphism wala code maine upar diya tha, use 'index.html' naam se save karke public folder me rakhna
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// ============================================
// API ROUTES (Data Handle Karne Ke Liye)
// ============================================

// 1. SIGNUP API
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User already exists, please login!' });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({ name, email, password: hashedPassword });
        await user.save();

        res.status(201).json({ msg: 'User registered successfully!' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
});

// 2. LOGIN API
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'User does not exist' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials password' });

        // Generate JWT Token
        const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
});

// 3. ACTION: SUBMIT SWAP REQUEST API
app.post('/api/requests/action', authMiddleware, async (req, res) => {
    try {
        const { productName, requestType } = req.body;

        const newRequest = new SwapRequest({
            productName,
            requestType,
            userEmail: req.user.email,
            userName: req.user.name
        });

        await newRequest.save();
        res.status(201).json({ msg: 'Swap request submitted to DB successfully!', data: newRequest });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to process swap request' });
    }
});

// 4. PROFILE / REQUESTS HISTORY API
app.get('/api/requests/profile', authMiddleware, async (req, res) => {
    try {
        const history = await SwapRequest.find({ userEmail: req.user.email });
        res.json({ history });
    } catch (err) {
        res.status(500).json({ msg: 'Error retrieving history' });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running smoothly on port ${PORT}`));
