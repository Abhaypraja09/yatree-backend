import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import api from '../api/axios';

const CompanyContext = createContext();

export const CompanyProvider = ({ children }) => {
    const { user } = useAuth();
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchCompanies();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchCompanies = async () => {
        try {
            const { data } = await api.get('/api/auth/companies');
            setCompanies(data);

            // AUTO-SYNC COMPANY
            // Logic: Pick the company assigned to the user profile or the first one in the list
            const userCompanyId = typeof user?.company === 'string' ? user.company : (user?.company?._id || user?.company);
            const found = data.find(c => c._id === userCompanyId);
            
            if (found) {
                setSelectedCompany(found);
                await AsyncStorage.setItem('selectedCompany', JSON.stringify(found));
            } else if (data.length > 0) {
                setSelectedCompany(data[0]);
                await AsyncStorage.setItem('selectedCompany', JSON.stringify(data[0]));
            }
        } catch (err) {
            console.error('Mobile Company Fetch Failed', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <CompanyContext.Provider value={{
            companies,
            selectedCompany,
            setSelectedCompany: (c) => {
                setSelectedCompany(c);
                AsyncStorage.setItem('selectedCompany', JSON.stringify(c));
            },
            loading
        }}>
            {children}
        </CompanyContext.Provider>
    );
};

export const useCompany = () => useContext(CompanyContext);
