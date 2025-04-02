const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
    name: { type: String, required: true },
    address:{ type: String },
    phone: { type: String },
    powerUserId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    licenseType: { 
        type: String, 
        enum: ['FREE', 'PAID'], 
        default: 'FREE' 
    },
    maxUsers: { 
        type: Number, 
        default: 3 // 3 users for FREE license (1 power user + 2 regular users)
    },
    currentUserCount: {
        type: Number,
        default: 1 // Start with 1 (the power user)
    }
}, { timestamps: true });

module.exports = mongoose.model('Company', CompanySchema);