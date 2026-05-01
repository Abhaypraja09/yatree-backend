'use client';

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const logout = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('userInfo');
            localStorage.removeItem('selectedCompany');
            localStorage.removeItem('selectedDate');
            sessionStorage.removeItem('activeSession');
        }
        setUser(null);
        if (pathname !== '/login') {
            router.push('/login');
        }
    }, [pathname, router]);

    // 🕒 INACTIVITY TIMER (15 Minutes)
    useEffect(() => {
        if (!user || typeof window === 'undefined') return;

        let timeout;
        const INACTIVITY_LIMIT = 15 * 60 * 1000;

        const resetTimer = () => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
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
                if (err.response?.status === 401) logout();
            } finally {
                setLoading(false);
            }
        };

        if (typeof window !== 'undefined') {
            const isNewSession = !sessionStorage.getItem('activeSession');
            if (isNewSession) {
                localStorage.removeItem('userInfo');
                setLoading(false);
            } else {
                const storedUser = localStorage.getItem('userInfo');
                if (storedUser) {
                    try {
                        const parsed = JSON.parse(storedUser);
                        setUser(parsed);
                        if (parsed.token) {
                            fetchLatestProfile(parsed.token);
                        } else {
                            setLoading(false);
                        }
                    } catch (e) {
                        setLoading(false);
                    }
                } else {
                    setLoading(false);
                }
            }
            sessionStorage.setItem('activeSession', 'true');
        }
    }, [logout]);

    const login = async (mobile, password) => {
        const { data } = await axios.post('/api/auth/login', { mobile, password });
        localStorage.setItem('userInfo', JSON.stringify(data));
        sessionStorage.setItem('activeSession', 'true');
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
