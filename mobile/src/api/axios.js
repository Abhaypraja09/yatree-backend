import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Using your production URL for universal accessibility on mobile
const API_URL = 'https://driver.yatreedestination.com'; 

const instance = axios.create({
    baseURL: API_URL,
    timeout: 30000,
});

instance.interceptors.request.use(
    async (config) => {
        try {
            const userInfo = await AsyncStorage.getItem('userInfo');
            const companyInfo = await AsyncStorage.getItem('selectedCompany');
            
            if (userInfo) {
                const parsed = JSON.parse(userInfo);
                if (parsed && parsed.token) {
                    config.headers.Authorization = `Bearer ${parsed.token}`;
                }
            }

            // Sync with web's tenant isolation logic
            if (companyInfo) {
                const company = JSON.parse(companyInfo);
                if (company && company._id) {
                    config.headers['X-Company-ID'] = company._id;
                    // Also append to query params if it's a GET request, as some routes expect it there
                    if (config.method === 'get') {
                        config.params = { ...config.params, companyId: company._id };
                    }
                }
            }
        } catch (e) {
            console.error('Error in request interceptor', e);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

instance.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response && error.response.status === 401) {
            // Handle global logout or redirect to login screen
            await AsyncStorage.removeItem('userInfo');
            // Logic to navigate to Login will be handled in the app navigator
        }
        return Promise.reject(error);
    }
);

export default instance;
