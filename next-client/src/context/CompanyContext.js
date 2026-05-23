'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '../api/axios';
import { useAuth } from './AuthContext';

const CompanyContext = createContext();

export const CompanyProvider = ({ children }) => {
    const { user } = useAuth();
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [loading, setLoading] = useState(true);

    const getTodayDate = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };
    
    const [selectedDate, setSelectedDate] = useState(getTodayDate());

    useEffect(() => {
        if (user) {
            fetchCompanies();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchCompanies = async () => {
        try {
            const { data } = await axios.get('/api/auth/companies');
            setCompanies(data);

            const storedUser = localStorage.getItem('userInfo');
            if (storedUser) {
                const userInfo = JSON.parse(storedUser);
                if (userInfo && userInfo.company) {
                    const userCompanyId = (typeof userInfo.company === 'string' ? userInfo.company : (userInfo.company._id || userInfo.company));
                    const fullCompany = data.find(c => c._id === userCompanyId);
                    
                    if (fullCompany) {
                        setSelectedCompany(fullCompany);
                        localStorage.setItem('selectedCompany', JSON.stringify(fullCompany));
                    } else if (data.length > 0) {
                        setSelectedCompany(data[0]);
                        localStorage.setItem('selectedCompany', JSON.stringify(data[0]));
                    }
                }
            } else if (data.length > 0) {
                setSelectedCompany(data[0]);
                localStorage.setItem('selectedCompany', JSON.stringify(data[0]));
            }
        } catch (err) {
            console.error('Error fetching companies', err);
            localStorage.removeItem('selectedCompany');
        } finally {
            setLoading(false);
        }
    };

    return (
        <CompanyContext.Provider value={{
            companies,
            selectedCompany,
            setSelectedCompany,
            selectedDate,
            setSelectedDate,
            loading
        }}>
            {children}
        </CompanyContext.Provider>
    );
};

export const useCompany = () => useContext(CompanyContext);
