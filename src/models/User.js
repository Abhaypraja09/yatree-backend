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
        enum: ['Admin', 'Driver'],
        required: true
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
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

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
