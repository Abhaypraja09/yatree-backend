/**
 * IST (Indian Standard Time) Utility Functions
 * =============================================
 * IST = UTC + 5:30 (offset = 330 minutes)
 *
 * Problem: JavaScript's `new Date().toISOString()` always returns UTC time.
 * In India when it's 11:30 PM IST, UTC is 6:00 PM — the DATE is different!
 * This causes wrong date defaults in forms and filters.
 *
 * Solution: Always correct for the IST offset before calling .toISOString().
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in ms

/**
 * Returns today's date string in IST as "YYYY-MM-DD".
 * Use this everywhere instead of: new Date().toISOString().split('T')[0]
 */
export const todayIST = () => {
    return new Date(Date.now() + IST_OFFSET_MS).toISOString().split('T')[0];
};

/**
 * Returns the first day of the current month in IST as "YYYY-MM-DD".
 * Use this instead of: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
 */
export const firstDayOfMonthIST = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date(d.getTime() + IST_OFFSET_MS);
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
};

/**
 * Converts a Date object to IST date string "YYYY-MM-DD".
 * Use this instead of: someDate.toISOString().split('T')[0]
 */
export const toISTDateString = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return new Date(d.getTime() + IST_OFFSET_MS).toISOString().split('T')[0];
};

/**
 * Converts a timestamp/Date to IST datetime string "YYYY-MM-DDTHH:MM".
 * Use this for datetime-local inputs.
 */
export const toISTDateTimeString = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 16);
};

/**
 * Formats a date/timestamp to IST time string like "10:30 AM".
 * Use this instead of: new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
 */
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

/**
 * Formats a date/timestamp to IST date string like "11/03/2026".
 */
export const formatDateIST = (dateOrStr) => {
    if (!dateOrStr) return '--';
    const d = new Date(dateOrStr);
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
    });
};

/**
 * Formats a date/timestamp to IST date + time string like "11/03/2026, 10:30 AM".
 */
export const formatDateTimeIST = (dateOrStr) => {
    if (!dateOrStr) return '--';
    const d = new Date(dateOrStr);
    return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    });
};

/**
 * Returns the current IST time as "HH:MM" string (24-hour format).
 * Useful for default time values in forms.
 */
export const currentTimeIST = () => {
    return new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata'
    });
};

/**
 * Returns full current IST datetime as "YYYY-MM-DDTHH:MM" string.
 * Use for datetime-local input defaults.
 */
export const nowISTDateTimeString = () => {
    return toISTDateTimeString(new Date());
};

/**
 * Returns a New Date object that is normalized to IST.
 * When you use .getUTC* methods on this date, you get IST values.
 */
export const nowIST = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date(date);
    return new Date(d.getTime() + IST_OFFSET_MS);
};

export default {
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
