const axios = require('axios');

const testRealLogin = async () => {
    try {
        console.log('Attempting REAL login to localhost:5005...');
        const response = await axios.post('http://localhost:5005/api/auth/login', {
            mobile: 'abhay.superx@texi.com',
            password: 'abhay123'
        });
        console.log('LOGIN SUCCESS!');
        console.log('Token:', response.data.token.substring(0, 20) + '...');
    } catch (err) {
        console.log('LOGIN FAILED');
        if (err.response) {
            console.log('Status:', err.response.status);
            console.log('Message:', err.response.data.message);
        } else {
            console.log('Error:', err.message);
        }
    }
};

testRealLogin();
