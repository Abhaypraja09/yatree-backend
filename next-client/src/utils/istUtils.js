const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export const todayIST = () => {
    return new Date(Date.now() + IST_OFFSET_MS).toISOString().split('T')[0];
};

export const firstDayOfMonthIST = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date(d.getTime() + IST_OFFSET_MS);
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
};

export const toISTDateString = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return new Date(d.getTime() + IST_OFFSET_MS).toISOString().split('T')[0];
};

export const toISTDateTimeString = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 16);
};

export const formatTimeIST = (dateOrStr) => {
    if (!dateOrStr) return '--:--';
    const d = new Date(dateOrStr);
    return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    });
};

export const formatDateIST = (dateOrStr) => {
    if (!dateOrStr) return '--';
    const d = new Date(dateOrStr);
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
    });
};

export const formatDateTimeIST = (dateOrStr) => {
    if (!dateOrStr) return '--';
    const d = new Date(dateOrStr);
    return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    });
};

export const currentTimeIST = () => {
    return new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata'
    });
};

export const nowISTDateTimeString = () => {
    return toISTDateTimeString(new Date());
};

export const nowIST = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date(date);
    return new Date(d.getTime() + IST_OFFSET_MS);
};

const istUtils = {
    todayIST,
    firstDayOfMonthIST,
    toISTDateString,
    toISTDateTimeString,
    formatTimeIST,
    formatDateIST,
    formatDateTimeIST,
    currentTimeIST,
    nowISTDateTimeString,
    nowIST,
};

export default istUtils;
