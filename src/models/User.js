const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: false, // Optional for admin, but we'll enforce for new drivers
        unique: true,
        sparse: true // Allows null/missing values for old records while enforcing uniqueness for others
    },
    licenseNumber: {
        type: String,
        required: false
    },
    password: {
        type: String,
        required: false
    },
    freelancerReview: {
        type: String
    },
    role: {
        type: String,
        enum: ['Admin', 'Driver', 'Executive', 'Staff'],
        required: true
    },
    salary: {
        type: Number,
        default: 0
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: function () { return this.role === 'Driver'; } // Drivers must have a company
    },
    assignedVehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'blocked'],
        default: 'active'
    },
    isFreelancer: {
        type: Boolean,
        default: false
    },
    documents: [{
        documentType: {
            type: String,
            enum: ['Aadhaar Front', 'Aadhaar Back', 'Driving License', 'Address Proof', 'Offer Letter'],
            required: true
        },
        imageUrl: {
            type: String,
            required: true
        },
        expiryDate: {
            type: Date,
            required: function () {
                return this.documentType === 'Driving License';
            }
        },
        verificationStatus: {
            type: String,
            enum: ['Pending', 'Verified', 'Rejected'],
            default: 'Pending'
        }
    }],
    tripStatus: {
        type: String,
        enum: ['approved', 'active', 'completed', 'pending_approval'],
        default: 'approved'
    },
    dailyWage: {
        type: Number,
        default: 0
    },
    monthlyLeaveAllowance: {
        type: Number,
        default: 4
    },
    email: {
        type: String,
        required: false
    },
    designation: {
        type: String,
        required: false
    },
    shiftTiming: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '18:00' }
    },
    officeLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String },
        radius: { type: Number, default: 200 } // in meters
    },
    profilePhoto: {
        type: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for faster dashboard and listing queries
userSchema.index({ company: 1, role: 1 });
userSchema.index({ tripStatus: 1 });

// Virtual for document statuses (for DL)
userSchema.virtual('documentStatuses').get(function () {
    if (!this.documents) return [];

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    return this.documents.map(doc => {
        let status = 'Valid';
        if (doc.expiryDate) {
            if (doc.expiryDate < now) {
                status = 'Expired';
            } else if (doc.expiryDate <= thirtyDaysFromNow) {
                status = 'Expiring Soon';
            }
        }
        return {
            documentType: doc.documentType,
            status,
            verificationStatus: doc.verificationStatus
        };
    });
});

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
