import React, { createContext, useState, useContext, useEffect } from 'react';

const RefreshContext = createContext();

export const RefreshProvider = ({ children }) => {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);

    const triggerRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    const toggleAutoRefresh = () => {
        setIsAutoRefreshEnabled(prev => !prev);
    };

    useEffect(() => {
        if (!isAutoRefreshEnabled) return;

        // Auto refresh every 60 seconds
        const interval = setInterval(() => {
            triggerRefresh();
        }, 60000);

        return () => clearInterval(interval);
    }, [isAutoRefreshEnabled]);

    return (
        <RefreshContext.Provider value={{ refreshTrigger, triggerRefresh, isAutoRefreshEnabled, toggleAutoRefresh }}>
            {children}
        </RefreshContext.Provider>
    );
};

export const useRefresh = () => useContext(RefreshContext);
