const mongoose = require('mongoose');

const aiChatSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    message: String,
    response: String,
    contextUsed: Object
}, { timestamps: true });

module.exports = mongoose.model('AIChat', aiChatSchema);
