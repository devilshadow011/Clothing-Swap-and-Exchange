const mongoose = require('mongoose');

// 1. User Schema
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, { timestamps: true });

// 2. Swap Request Schema
const RequestSchema = new mongoose.Schema({
    productName: { type: String, required: true },
    requestType: { type: String, default: 'swap' },
    userEmail: { type: String, required: true }, // Jisne request bheji
    userName: { type: String, required: true },
    status: { type: String, default: 'Pending' } // Pending, Approved, Rejected
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const SwapRequest = mongoose.model('SwapRequest', RequestSchema);

module.exports = { User, SwapRequest };