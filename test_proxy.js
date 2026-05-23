const axios = require('axios');

async function testProxy() {
    try {
        const url = 'http://localhost:4000/uploads/logo-1778242852889.png'; // One of the files
        console.log('Testing proxy for:', url);
        const response = await axios.get(`http://localhost:5005/api/admin/proxy-image?url=${encodeURIComponent(url)}`, {
            responseType: 'arraybuffer'
        });
        console.log('Proxy response status:', response.status);
        console.log('Proxy response length:', response.data.length);
    } catch (err) {
        console.error('Proxy Test Failed:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', err.response.data.toString());
        }
    }
}

testProxy();
