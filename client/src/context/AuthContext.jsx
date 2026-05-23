import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('selectedCompany');
        localStorage.removeItem('selectedDate');
        sessionStorage.removeItem('activeSession');
        setUser(null);
        // Force redirect to login if not already there
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }, []);

    // 🕒 INACTIVITY TIMER (15 Minutes)
    useEffect(() => {
        if (!user) return;

        let timeout;
        const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes

        const resetTimer = () => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                console.log('[AUTH] Inactivity timeout reached. Logging out...');
                logout();
            }, INACTIVITY_LIMIT);
        };

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        events.forEach(event => document.addEventListener(event, resetTimer));

        resetTimer();

        return () => {
            if (timeout) clearTimeout(timeout);
            events.forEach(event => document.removeEventListener(event, resetTimer));
        };
    }, [user, logout]);

    useEffect(() => {
        const fetchLatestProfile = async (token) => {
            try {
                const { data } = await axios.get('/api/auth/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const updatedInfo = { ...data, token };
                localStorage.setItem('userInfo', JSON.stringify(updatedInfo));
                setUser(updatedInfo);
            } catch (err) {
                console.error('Failed to sync permissions');
                if (err.response?.status === 401) logout();
            } finally {
                setLoading(false);
            }
        };

        // 🔒 SESSION-ONLY CHECK
        // If session marker is missing, clear localStorage to force re-login on browser restart
        const isNewSession = !sessionStorage.getItem('activeSession');
        if (isNewSession) {
            localStorage.removeItem('userInfo');
            setLoading(false);
        } else {
            const storedUser = localStorage.getItem('userInfo');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
                if (parsed.token) {
                    fetchLatestProfile(parsed.token);
                } else {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        }
        
        // Mark session as active
        sessionStorage.setItem('activeSession', 'true');
    }, [logout]);

    const login = async (mobile, password) => {
        const { data } = await axios.post('/api/auth/login', { mobile, password });
        localStorage.setItem('userInfo', JSON.stringify(data));
        sessionStorage.setItem('activeSession', 'true'); // Set session on login
        setUser(data);
        return data;
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
