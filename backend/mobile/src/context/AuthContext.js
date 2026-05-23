import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStoredUser = async () => {
            try {
                const storedUser = await AsyncStorage.getItem('userInfo');
                if (storedUser) {
                    const parsed = JSON.parse(storedUser);
                    setUser(parsed);
                    // Optionally sync profile like web does
                    if (parsed.token) {
                        try {
                            const { data } = await api.get('/api/auth/profile');
                            const updatedInfo = { ...data, token: parsed.token };
                            await AsyncStorage.setItem('userInfo', JSON.stringify(updatedInfo));
                            setUser(updatedInfo);
                        } catch (err) {
                            console.error('Mobile Auth Sync Failed', err);
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to load user from storage', e);
            } finally {
                setLoading(false);
            }
        };

        loadStoredUser();
    }, []);

    const login = async (credential, password) => {
        // Back to exactly what the backend expects (mobile)
        const { data } = await api.post('/api/auth/login', { 
            mobile: credential, // Reverted to 'mobile' to stop the 500 error
            password 
        });
        await AsyncStorage.setItem('userInfo', JSON.stringify(data));
        setUser(data);
        return data;
    };

    const logout = async () => {
        await AsyncStorage.multiRemove(['userInfo', 'selectedCompany']);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
