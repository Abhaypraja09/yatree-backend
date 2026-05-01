import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const instance = axios.create({
    baseURL: API_URL,
    timeout: 30000, 
});

instance.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
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
        }
        return config;
    },
    (error) => Promise.reject(error)
);

instance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (typeof window !== 'undefined' && error.response && error.response.status === 401) {
            if (!window.location.pathname.includes('/login')) {
                localStorage.removeItem('userInfo');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default instance;
