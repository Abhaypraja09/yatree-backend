import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const instance = axios.create({
    baseURL: API_URL,
    timeout: 30000, 
});


const pendingRequests = new Map();

instance.interceptors.request.use(
    (config) => {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            try {
                const parsed = JSON.parse(userInfo);
                if (parsed && parsed.token) {
                    config.headers.Authorization = `Bearer ${parsed.token}`;
                }
            } catch (e) {
                console.error('Error parsing userInfo from localStorage', e);
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

instance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            if (!window.location.pathname.includes('/login')) {
                localStorage.removeItem('userInfo');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default instance;
