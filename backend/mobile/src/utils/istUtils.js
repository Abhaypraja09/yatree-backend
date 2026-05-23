/**
 * IST (Indian Standard Time) Utility Functions
 * Optimized for React Native & Web Parity
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export const todayIST = () => {
    return new Date(Date.now() + IST_OFFSET_MS).toISOString().split('T')[0];
};

export const toISTDateString = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return new Date(d.getTime() + IST_OFFSET_MS).toISOString().split('T')[0];
};

export const formatTimeIST = (dateOrStr) => {
    if (!dateOrStr) return '--:--';
    const d = new Date(dateOrStr);
    try {
        return d.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata'
        });
    } catch (e) {
        return '--:--';
    }
};

export const formatDateIST = (dateOrStr) => {
    if (!dateOrStr) return '--';
    const d = new Date(dateOrStr);
    try {
        return d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone: 'Asia/Kolkata'
        });
    } catch (e) {
        return '--';
    }
};

export const nowISTDateTimeString = () => {
    return new Date(Date.now() + IST_OFFSET_MS).toISOString();
};

export const formatDateTimeIST = (dateOrStr) => {
    if (!dateOrStr) return '--';
    const d = new Date(dateOrStr);
    try {
        const datePart = d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone: 'Asia/Kolkata'
        });
        const timePart = d.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata'
        });
        return `${datePart} ${timePart}`;
    } catch (e) {
        return '--';
    }
};

// Also export as a combined object for legacy support if needed
const istUtils = {
    todayIST,
    toISTDateString,
    formatTimeIST,
    formatDateIST,
    nowISTDateTimeString,
    formatDateTimeIST
};

export default istUtils;
