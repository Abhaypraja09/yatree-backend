import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PremiumDateInput = ({ value, onChange, label, required = false, placeholder = "DD-MM-YYYY", align, direction = "down", disableCalendar = false, inputStyle = {} }) => {
    const [showCalendar, setShowCalendar] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [viewDate, setViewDate] = useState(new Date());
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Sync internal input value with external 'YYYY-MM-DD' value
    useEffect(() => {
        if (value) {
            const [y, m, d] = value.split('-');
            if (y && m && d) {
                setInputValue(`${d}-${m}-${y}`);
            }
        } else {
            setInputValue('');
        }
    }, [value]);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowCalendar(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Format input as user types: DD-MM-YYYY
    const handleInputChange = (e) => {
        let val = e.target.value.replace(/\D/g, ''); // Numbers only
        if (val.length > 8) val = val.slice(0, 8);

        let formatted = val;
        if (val.length > 2) {
            formatted = val.slice(0, 2) + '-' + val.slice(2);
        }
        if (val.length > 4) {
            formatted = formatted.slice(0, 5) + '-' + formatted.slice(5);
        }

        setInputValue(formatted);

        // If complete, trigger onChange
        if (val.length === 8) {
            const d = val.slice(0, 2);
            const m = val.slice(2, 4);
            const y = val.slice(4, 8);
            onChange(`${y}-${m}-${d}`);
        }
    };

    const selectDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        onChange(`${y}-${m}-${d}`);
        setShowCalendar(false);
    };

    const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

    const renderCalendar = () => {
        const month = viewDate.getMonth();
        const year = viewDate.getFullYear();
        const days = daysInMonth(month, year);
        const firstDay = firstDayOfMonth(month, year);

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        const calendarDays = [];
        // Empty slots for first week
        for (let i = 0; i < firstDay; i++) {
            calendarDays.push(<div key={`empty-${i}`} style={{ width: '14.28%', height: '35px' }}></div>);
        }
        // Actual days
        for (let d = 1; d <= days; d++) {
            const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
            const isSelected = value === `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

            calendarDays.push(
                <div
                    key={d}
                    onClick={() => selectDate(new Date(year, month, d))}
                    style={{
                        width: '14.28%',
                        height: '35px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        color: isSelected ? 'black' : 'white',
                        background: isSelected ? 'var(--primary, #fbbf24)' : (isToday ? 'rgba(251, 191, 36, 0.1)' : 'transparent'),
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => !isSelected && (e.target.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={e => !isSelected && (e.target.style.background = isToday ? 'rgba(251, 191, 36, 0.1)' : 'transparent')}
                >
                    {d}
                </div>
            );
        }

        return (
            <>
                <div className="show-mobile" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, backdropFilter: 'blur(4px)' }} onClick={() => setShowCalendar(false)} />
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="calendar-dropdown"
                    style={{
                        position: 'absolute',
                        top: direction === 'up' ? 'auto' : '100%',
                        bottom: direction === 'up' ? 'calc(100% + 12px)' : 'auto',
                        left: align === 'right' ? 'auto' : (label ? '0' : (align === 'left' ? '0' : '50%')),
                        right: align === 'right' ? 0 : 'auto',
                        transform: (label || align === 'left' || align === 'right') ? 'none' : 'translateX(-50%)',
                        zIndex: 10001,
                        marginTop: direction === 'up' ? '0' : '12px',
                        width: '300px',
                        background: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '24px',
                        padding: '20px',
                        boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
                        color: 'white'
                    }}
                >
                    <div className="show-mobile" style={{ position: 'absolute', top: '-15px', right: '10px' }}>
                         <button onClick={() => setShowCalendar(false)} style={{ background: '#f43f5e', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 5px 15px rgba(244,63,94,0.3)' }}><X size={14} /></button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronLeft size={18} /></button>
                        <span style={{ fontWeight: '900', fontSize: '15px', letterSpacing: '0.5px' }}>{monthNames[month]} {year}</span>
                        <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronRight size={18} /></button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '8px' }}>
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                            <div key={d} style={{ width: '14.28%', textAlign: 'center', fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', marginBottom: '5px' }}>{d}</div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                        {calendarDays}
                    </div>

                    <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center' }}>
                        <button
                            type="button"
                            onClick={() => selectDate(new Date())}
                            style={{ width: '100%', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)', color: 'var(--primary, #fbbf24)', padding: '12px', borderRadius: '12px', fontSize: '12px', fontWeight: '900', cursor: 'pointer', transition: '0.2s' }}
                        >
                            SELECT TODAY
                        </button>
                    </div>
                </motion.div>

                <style>{`
                    @media (max-width: 480px) {
                        .calendar-dropdown {
                            position: fixed !important;
                            top: 50% !important;
                            left: 50% !important;
                            transform: translate(-50%, -50%) !important;
                            width: calc(100vw - 40px) !important;
                            max-width: 320px !important;
                            margin-top: 0 !important;
                        }
                    }
                `}</style>
            </>
        );
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            {label && <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '10px', display: 'block' }}>{label}</label>}
            <div style={{ 
                position: 'relative',
                height: '60px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '18px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center'
            }}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    required={required}
                    inputMode="numeric"
                    style={{
                        height: '100%',
                        background: 'transparent',
                        border: 'none',
                        fontSize: label ? '15px' : 'inherit',
                        width: '100%',
                        color: 'white',
                        padding: label ? '0 45px 0 15px' : '0 15px',
                        outline: 'none',
                        transition: 'all 0.3s',
                        textAlign: label ? 'left' : 'center',
                        fontWeight: 'inherit',
                        ...inputStyle
                    }}
                    onFocus={e => {
                        e.target.style.borderColor = 'var(--primary, #fbbf24)';
                        if (!disableCalendar) setShowCalendar(true);
                    }}
                    onClick={() => !disableCalendar && setShowCalendar(true)}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
                />
                {!disableCalendar && (
                    <div
                        onClick={() => !disableCalendar && setShowCalendar(!showCalendar)}
                        style={{
                            position: 'absolute',
                            right: label ? '15px' : '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'rgba(255,255,255,0.3)',
                            cursor: 'pointer',
                            padding: '5px'
                        }}
                    >
                        <CalendarIcon size={20} />
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showCalendar && renderCalendar()}
            </AnimatePresence>
        </div>
    );
};

export default PremiumDateInput;
