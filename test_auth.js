const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');

const tenantSchema = new mongoose.Schema({
    adminEmail: { type: String },
    adminPassword: { type: String }
});

const Tenant = mongoose.models.Tenant || mongoose.model('Tenant', tenantSchema, 'tenants');

const testLogin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const search = 'abhay.superx@texi.com'.trim();
        const user = await User.findOne({ username: search });

        if (!user) {
            console.log('User not found in Main DB (users collection)');
            process.exit(1);
        }

        const tenant = await Tenant.findOne({ adminEmail: search });
        if (tenant) {
            console.log('Found Tenant record.');
            console.log('Stored Expected Password:', tenant.adminPassword);
            console.log('Current Hashed Password:', user.password);
            
            const isMatch = await user.matchPassword(tenant.adminPassword);
            console.log('Final Verfication Result (Match?):', isMatch);
            
            if (!isMatch) {
                console.log('!!! PASSWORD MISMATCH !!!');
                // Let's try to see if the plain text password from tenant matches if we hash it now
                const salt = await bcrypt.genSalt(10);
                const newHash = await bcrypt.hash(tenant.adminPassword, salt);
                console.log('If we hash it now, it looks like:', newHash.substring(0, 10) + '...');
            }
        } else {
            console.log('Tenant record not found in tenants collection.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

testLogin();
