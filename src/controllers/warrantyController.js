const PartsWarranty = require('../models/PartsWarranty');
const Vehicle = require('../models/Vehicle');
const mongoose = require('mongoose');

// @desc    Get all warranties
// @route   GET /api/admin/warranties/:companyId
// @access  Private/Admin
exports.getWarranties = async (req, res) => {
    try {
        const { companyId } = req.params;

        // Auto-expire warranties
        await PartsWarranty.updateMany(
            {
                company: companyId,
                status: 'Active',
                warrantyEndDate: { $lt: new Date() }
            },
            { $set: { status: 'Expired' } }
        );

        const warranties = await PartsWarranty.find({ company: companyId })
            .populate('vehicle', 'carNumber model')
            .sort({ warrantyEndDate: 1 });
        res.json(warranties);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Add new warranty
// @route   POST /api/admin/warranties
// @access  Private/Admin
exports.addWarranty = async (req, res) => {
    try {
        const {
            vehicleId,
            partName,
            brandName,
            invoiceNumber,
            purchaseDate,
            warrantyStartDate,
            warrantyEndDate,
            warrantyPeriod,
            supplierName,
            cost,
            companyId
        } = req.body;

        const warrantyCardImage = req.file ? req.file.path : null;

        const warranty = await PartsWarranty.create({
            vehicle: vehicleId,
            partName,
            brandName,
            invoiceNumber,
            purchaseDate,
            warrantyStartDate,
            warrantyEndDate,
            warrantyPeriod,
            supplierName,
            cost,
            warrantyCardImage,
            company: companyId
        });

        res.status(201).json(warranty);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Update warranty status / Claim details
// @route   PUT /api/admin/warranties/:id
// @access  Private/Admin
exports.updateWarranty = async (req, res) => {
    try {
        const warranty = await PartsWarranty.findById(req.params.id);
        if (!warranty) return res.status(404).json({ message: 'Warranty not found' });

        const updated = await PartsWarranty.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );

        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Delete warranty
// @route   DELETE /api/admin/warranties/:id
// @access  Private/Admin
exports.deleteWarranty = async (req, res) => {
    try {
        const warranty = await PartsWarranty.findById(req.params.id);
        if (!warranty) return res.status(404).json({ message: 'Warranty not found' });

        await warranty.deleteOne();
        res.json({ message: 'Warranty record removed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get warranty dashboard stats
// @route   GET /api/admin/warranties/stats/:companyId
// @access  Private/Admin
exports.getWarrantyStats = async (req, res) => {
    try {
        const { companyId } = req.params;
        const now = new Date();
        const soon = new Date();
        soon.setDate(soon.getDate() + 30); // 30 days window for expiring soon

        const stats = await PartsWarranty.aggregate([
            { $match: { company: new mongoose.Types.ObjectId(companyId) } },
            {
                $group: {
                    _id: null,
                    totalActive: {
                        $sum: { $cond: [{ $and: [{ $eq: ["$status", "Active"] }, { $gt: ["$warrantyEndDate", now] }] }, 1, 0] }
                    },
                    expiringSoon: {
                        $sum: { $cond: [{ $and: [{ $eq: ["$status", "Active"] }, { $gt: ["$warrantyEndDate", now] }, { $lte: ["$warrantyEndDate", soon] }] }, 1, 0] }
                    },
                    expired: {
                        $sum: { $cond: [{ $or: [{ $eq: ["$status", "Expired"] }, { $lte: ["$warrantyEndDate", now] }] }, 1, 0] }
                    }
                }
            }
        ]);

        res.json(stats[0] || { totalActive: 0, expiringSoon: 0, expired: 0 });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
