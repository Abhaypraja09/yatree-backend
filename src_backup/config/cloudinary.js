const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'doaymwjki',
    api_key: process.env.CLOUDINARY_API_KEY || '983496744387655',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'YQBPcdPy2QQecpKwf24--1SqtB8'
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'taxi-fleet-crm/documents',
        allowed_formats: ['jpg', 'png', 'jpeg', 'pdf'],
        public_id: (req, file) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            return file.fieldname + '-' + uniqueSuffix;
        },
    },
});

module.exports = { cloudinary, storage };
