const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './backend/.env' });

async function checkDB() {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db();
        const companies = await db.collection('companies').find({}).toArray();
        console.log('Companies:', JSON.stringify(companies, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

checkDB();
