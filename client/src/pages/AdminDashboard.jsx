
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import {
    Activity, Users, Car, CreditCard, AlertTriangle, ShieldAlert,
    TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Clock,
    ChevronLeft, ChevronRight, Filter, Search, MoreHorizontal,
    Plus, Download, Wrench, Briefcase, Fuel, Calendar, X, IndianRupee, Camera, ShieldCheck, Shield, LogIn, Droplets
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompany } from '../context/CompanyContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SEO from '../components/SEO';
import { todayIST, formatDateIST, firstDayOfMonthIST, nowIST, toISTDateString } from '../utils/istUtils';

const StatCard = ({ icon: Icon, label, value, color, loading, trend, onClick, subValue }) => (
    <motion.div
        whileHover={{ y: -8, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`stat-card glass-card ${loading ? 'stale-card' : ''}`}
        style={{
            background: `linear-gradient(145deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.9) 100%)`,
            border: '1px solid rgba(255,255,255,0.08)',
            position: 'relative',
            overflow: 'hidden',
            padding: 'clamp(15px, 2.5vw, 24px)',
            cursor: 'pointer',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
            borderRadius: '24px'
        }}
    >
        <div style={{
            position: 'absolute',
            top: '-20%',
            left: '-10%',
            width: '140px',
            height: '140px',
            background: color,
            filter: 'blur(70px)',
            opacity: 0.1,
            pointerEvents: 'none'
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', position: 'relative', zIndex: 1 }}>
            <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: `linear-gradient(135deg, ${color}30, ${color}10)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${color}40`,
                color: color,
                boxShadow: `0 8px 16px -4px ${color}30`
            }}>
                <Icon size={22} strokeWidth={2.5} />
            </div>
            <div>
                <p style={{
                    fontSize: '10px',
                    fontWeight: '900',
                    color: 'rgba(255,255,255,0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '1.8px',
                    marginBottom: '6px'
                }}>{label}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <h3 style={{
                        fontSize: 'clamp(22px, 3vw, 28px)',
                        fontWeight: '900',
                        color: 'white',
                        letterSpacing: '-1px',
                        margin: 0,
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}>
                        {loading ? '...' : value || 0}
                    </h3>
                    {trend && (
                        <span style={{
                            fontSize: '9px',
                            color: '#10b981',
                            background: 'rgba(16, 185, 129, 0.1)',
                            padding: '2px 8px',
                            borderRadius: '20px',
                            fontWeight: '900',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}>
                            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 5px #10b981' }}></div>
                            {trend}
                        </span>
                    )}
                </div>
                {subValue && (
                    <div style={{
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.5)',
                        fontWeight: '800',
                        marginTop: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                    }}>
                        {subValue}
                    </div>
                )}
            </div>
        </div>
    </motion.div>
);

const AdminDashboard = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { language, setLanguage, t } = useLanguage();
    const { selectedCompany, selectedDate, setSelectedDate } = useCompany();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [viewMode, setViewMode] = useState('monthly');
    const spokenAlertsRef = useRef(new Set());
    const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

    const shiftMonth = (amount) => {
        if (viewMode === 'monthly') {
            let newMonth = selectedMonth + amount;
            let newYear = selectedYear;
            if (newMonth < 1) { newMonth = 12; newYear--; }
            if (newMonth > 12) { newMonth = 1; newYear++; }
            setSelectedMonth(newMonth);
            setSelectedYear(newYear);
        } else {
            setSelectedYear(prev => prev + amount);
        }
    };

    const fetchStats = async () => {
        const userInfoRaw = localStorage.getItem('userInfo');
        if (!userInfoRaw || !selectedCompany) return;

        setLoading(true);
        try {
            const userInfo = JSON.parse(userInfoRaw);
            let params = `companyId=${selectedCompany._id}`;

            if (selectedMonth !== 'All') {
                // Monthly View within Financial Year context
                const calendarYear = (selectedMonth >= 1 && selectedMonth <= 3) ? selectedYear + 1 : selectedYear;
                const fromDate = toISTDateString(new Date(calendarYear, selectedMonth - 1, 1));
                const toDate = toISTDateString(new Date(calendarYear, selectedMonth, 0));
                params += `&from=${fromDate}&to=${toDate}`;
            } else {
                // Full Financial Year View: April 1st to March 31st
                const fromDate = `${selectedYear}-04-01`;
                const toDate = `${selectedYear + 1}-03-31`;
                params += `&from=${fromDate}&to=${toDate}`;
            }

            const { data } = await axios.get(`/api/admin/dashboard/${selectedCompany._id}?${params}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setStats(data);
        } catch (err) {
            console.error('Error fetching stats', err);
        } finally {
            setLoading(false);
        }
    };

    const userRole = user?.role?.toLowerCase() || '';
    const isAdmin = userRole === 'admin' || userRole === 'superadmin' || (userRole.includes('admin') && userRole !== 'executive');

    const canAccess = (module, subKey = null) => {
        if (isAdmin) return true;
        const perm = user?.permissions?.[module];
        if (!perm) return false;
        if (typeof perm === 'object') {
            if (perm.all === true) return true;
            if (subKey) return perm[subKey] === true;
            return Object.values(perm).some(v => v === true);
        }
        return perm === true;
    };

    useEffect(() => {
        fetchStats();
        let interval = setInterval(fetchStats, 5 * 60 * 1000); // Refresh every 5 min

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                fetchStats();
                interval = setInterval(fetchStats, 5 * 60 * 1000);
            } else {
                clearInterval(interval);
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [selectedCompany, selectedMonth, selectedYear]);

    useEffect(() => {
        if (stats?.expiringAlerts && stats.expiringAlerts.length > 0) {
            const currentAlerts = stats.expiringAlerts.filter(alert => {
                if (user?.role === 'Admin') return true;
                if ((alert.type === 'Vehicle' || alert.type === 'Service') && !user?.permissions?.vehiclesManagement) return false;
                if (alert.type === 'Driver' && !user?.permissions?.driversService) return false;
                return true;
            });

            const newAlerts = currentAlerts.filter(alert =>
                !spokenAlertsRef.current.has(`${alert.identifier}-${alert.documentType}-${alert.expiryDate}`)
            );

            if (newAlerts.length > 0) {
                if (audioRef.current) {
                    audioRef.current.currentTime = 0;
                    audioRef.current.volume = 0.4;
                    audioRef.current.play().catch(e => console.log("Audio play blocked", e));
                }

                newAlerts.forEach(alert =>
                    spokenAlertsRef.current.add(`${alert.identifier}-${alert.documentType}-${alert.expiryDate}`)
                );
            }
        }
    }, [stats?.expiringAlerts, user]);

    return (
        <div className="admin-dashboard-container" style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(14, 165, 233, 0.08) 0%, transparent 60%), radial-gradient(circle at 0% 100%, rgba(99, 102, 241, 0.05) 0%, transparent 40%)',
            minHeight: '100vh',
            padding: 'clamp(15px, 4vw, 40px)',
            color: 'white'
        }}>
            <SEO title="Admin Dashboard" description="Overview of fleet operations, driver attendance, and financial metrics." />

            <style>{`
                .admin-dashboard-container { overflow-x: hidden; }
                .glass-card {
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    box-shadow: 0 10px 30px -5px rgba(0,0,0,0.3);
                }
                .status-pill { border-radius: 20px; letter-spacing: 0.5px; }
                .vehicle-badge { letter-spacing: 0.5px; }
            `}</style>

            <div className="glass-card dashboard-header" style={{
                background: 'rgba(30, 41, 59, 0.4)',
                borderRadius: '32px',
                padding: 'clamp(20px, 4vw, 32px)',
                border: '1px solid rgba(255,255,255,0.08)',
                marginBottom: '40px',
                width: '100%',
                boxSizing: 'border-box'
            }}>
                <header className="mobile-stack" style={{
                    justifyContent: 'space-between',
                    width: '100%'
                }}>
                    <div className="header-logo-section">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div className="header-logo-container" style={{
                                background: 'linear-gradient(135deg, white, #f8fafc)',
                                borderRadius: '16px',
                                padding: '8px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                boxShadow: `0 10px 25px ${theme.primary}30`
                            }}>
                                <Shield size={28} color={theme.primary} />
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.primary, boxShadow: `0 0 8px ${theme.primary}` }}></div>
                                    <span style={{ fontSize: 'clamp(9px,2.5vw,10px)', fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('fleet_control_center')}</span>
                                </div>
                                <h1 className="header-title" style={{ color: 'white', fontWeight: '900', margin: 0, letterSpacing: '-1.5px' }}>
                                    {t('executive_dashboard').split(' ')[0]} <span className="theme-gradient-text">{t('executive_dashboard').split(' ')[1]}</span>
                                </h1>
                            </div>
                        </div>
                    </div>

                    <div className="date-selector-wrapper" style={{ flexShrink: 0, display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            flexWrap: 'wrap'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: 'rgba(15, 23, 42, 0.4)',
                                borderRadius: '16px',
                                padding: '4px 8px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                height: '48px'
                            }}>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'white', fontWeight: '900', fontSize: '14px', padding: '0 10px',
                                        height: '100%', outline: 'none', cursor: 'pointer'
                                    }}
                                >
                                    <option value="All" style={{ background: '#0f172a' }}>Full Year</option>
                                    {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map(m => (
                                        <option key={m} value={m} style={{ background: '#0f172a' }}>
                                            {t('month_' + m)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* FINANCIAL YEAR SELECTOR */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: 'rgba(15, 23, 42, 0.4)',
                                borderRadius: '16px',
                                padding: '4px 15px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                height: '48px',
                                gap: '8px'
                            }}>
                                <span style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>FY</span>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'white', fontWeight: '900', fontSize: '14px',
                                        outline: 'none', cursor: 'pointer'
                                    }}
                                >
                                    {[2023, 2024, 2025, 2026, 2027].map(y => (
                                        <option key={y} value={y} style={{ background: '#0f172a' }}>
                                            {y}-{y + 1}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </header>
            </div>

            <div style={{ position: 'relative', minHeight: '600px' }}>
                <AnimatePresence>
                    {loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(15, 23, 42, 0.4)',
                                backdropFilter: 'blur(4px)',
                                zIndex: 10,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                borderRadius: '16px',
                                pointerEvents: 'none'
                            }}
                        >
                            <div className="spinner"></div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {stats && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="dashboard-main-container"
                    >
                        <div className="stats-grid">
                        {/* Drivers Service Related */}
                        {canAccess('driversService') && (
                            <>
                                {canAccess('driversService', 'payroll') && (
                                    <>
                                        <StatCard
                                            icon={Wallet}
                                            label={t('monthly_payroll')}
                                            value={`₹${(stats.monthlyRegularSalaryTotal || 0).toLocaleString()}`}
                                            color={theme.primary}
                                            loading={loading}
                                            onClick={() => navigate('/admin/driver-salaries?tab=payroll')}
                                        />
                                        <StatCard
                                            icon={IndianRupee}
                                            label={t('total_driver_advance')}
                                            value={`₹${(stats.monthlyRegularAdvanceTotal || 0).toLocaleString()}`}
                                            color={theme.primary}
                                            loading={loading}
                                            onClick={() => navigate('/admin/driver-salaries?tab=advances')}
                                        />
                                    </>
                                )}
                                {canAccess('driversService', 'freelancers') && (
                                    <StatCard icon={Users} label={t('freelancers_monthly')} value={`₹${(stats.monthlyFreelancerSalaryTotal || 0).toLocaleString()}`} color={theme.primary} loading={loading} onClick={() => navigate('/admin/freelancers')} />
                                )}
                                {canAccess('driversService', 'parking') && (
                                    <StatCard icon={CreditCard} label={t('parking_monthly')} value={`₹${stats.monthlyParkingAmount?.toLocaleString() || 0}`} color={theme.primary} loading={loading} onClick={() => navigate('/admin/parking')} />
                                )}
                            </>
                        )}

                        {/* Fleet Operations Related */}
                        {canAccess('fleetOperations') && (
                            <>
                                {canAccess('fleetOperations', 'fuel') && (
                                    <StatCard
                                        icon={Fuel}
                                        label={t('fuel_monthly')}
                                        value={`₹${stats.monthlyFuelAmount?.toLocaleString() || 0}`}
                                        color={theme.primary}
                                        loading={loading}
                                        onClick={() => navigate('/admin/fuel')}
                                    />
                                )}
                                {canAccess('fleetOperations', 'carUtility') && (
                                    <>
                                        <StatCard icon={IndianRupee} label={t('fastag_recharge_monthly')} value={`₹${(stats.monthlyFastagTotal || 0).toLocaleString()}`} color={theme.primary} loading={loading} onClick={() => navigate('/admin/car-utility')} />
                                        <StatCard icon={Droplets} label={t('driver_services_monthly')} value={`₹${stats.monthlyDriverServicesAmount?.toLocaleString() || 0}`} color={theme.primary} loading={loading} onClick={() => navigate('/admin/car-utility')} />
                                    </>
                                )}
                            </>
                        )}

                        {/* Buy/Sell Related (Outside & Events) */}
                        {canAccess('buySell') && (
                            <>
                                {canAccess('buySell', 'outsideCars') && (
                                    <StatCard
                                        icon={TrendingUp}
                                        label={t('outside_cars_monthly')}
                                        value={`₹${(stats.monthlyOutsideCarsTotal || 0).toLocaleString()}`}
                                        color="#8b5cf6"
                                        loading={loading}
                                        onClick={() => navigate('/admin/outside-cars')}
                                    />
                                )}
                                {canAccess('buySell', 'eventManagement') && (
                                    <StatCard
                                        icon={Calendar}
                                        label={t('event_management_m')}
                                        value={`₹${(stats.monthlyEventTotal || 0).toLocaleString()}`}
                                        color="#ec4899"
                                        loading={loading}
                                        onClick={() => navigate('/admin/event-management')}
                                    />
                                )}
                            </>
                        )}

                        {/* Vehicles Life Related */}
                        {canAccess('vehiclesManagement') && (
                            <>
                                {canAccess('vehiclesManagement', 'maintenance') && (
                                    <StatCard icon={Wrench} label={t('maintenance_monthly')} value={`₹${stats.monthlyMaintenanceAmount?.toLocaleString() || 0}`} color="#f43f5e" loading={loading} onClick={() => navigate('/admin/maintenance')} />
                                )}
                                {canAccess('vehiclesManagement', 'accidentLogs') && (
                                    <StatCard icon={AlertTriangle} label={t('accident_cost_yearly')} value={`₹${(stats.yearlyAccidentAmount || 0).toLocaleString()}`} color="#f43f5e" loading={loading} onClick={() => navigate('/admin/accident-logs')} />
                                )}
                                {canAccess('vehiclesManagement', 'vehiclesMgt') && (
                                    <StatCard
                                        icon={Car}
                                        label={t('fleet_size_label')}
                                        value={stats.totalInternalVehicles || 0}
                                        color="#8b5cf6"
                                        loading={loading}
                                        onClick={() => navigate(user?.role === 'Executive' ? '/admin/outside-cars' : '/admin/vehicles')}
                                    />
                                )}
                            </>
                        )}
                    </div>








                        {/* Expiry Alerts */}
                        {stats.expiringAlerts && stats.expiringAlerts.filter(alert => {
                            if (user?.role === 'Admin') return true;
                            if ((alert.type === 'Vehicle' || alert.type === 'Service') && !user?.permissions?.vehiclesManagement) return false;
                            if (alert.type === 'Driver' && !user?.permissions?.driversService) return false;
                            return true;
                        }).length > 0 && (
                                <div className="glass-card" style={{
                                    border: '1px solid rgba(244, 63, 114, 0.2)',
                                    background: 'linear-gradient(145deg, rgba(244, 63, 114, 0.05), rgba(15, 23, 42, 0.2))',
                                    marginBottom: 'clamp(20px, 4vw, 30px)',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        marginBottom: 'clamp(16px, 3.5vw, 20px)',
                                        flexWrap: 'wrap'
                                    }}>
                                        <ShieldAlert color="#f43f5e" size={20} />
                                        <h3 style={{
                                            fontSize: 'clamp(13px, 3.2vw, 16px)',
                                            fontWeight: '700',
                                            color: 'white',
                                            margin: 0,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                            {t('expiry_alerts')}
                                        </h3>
                                    </div>
                                    <div className="expiry-alerts-grid">
                                        {stats.expiringAlerts.filter(alert => {
                                            if (user?.role === 'Admin') return true;
                                            if ((alert.type === 'Vehicle' || alert.type === 'Service') && !user?.permissions?.vehiclesManagement) return false;
                                            if (alert.type === 'Driver' && !user?.permissions?.driversService) return false;
                                            return true;
                                        }).sort((a, b) => new Date(a.expiryDate || a.date) - new Date(b.expiryDate || b.date)).map((alert, index) => (
                                            <div
                                                key={index}
                                                className="alert-card glass-card-hover-effect"
                                                style={{
                                                    background: alert.status === 'Expired'
                                                        ? 'rgba(244, 63, 94, 0.1)'
                                                        : 'rgba(245, 158, 11, 0.1)',
                                                    border: `1px solid ${alert.status === 'Expired'
                                                        ? 'rgba(244, 63, 94, 0.2)'
                                                        : 'rgba(245, 158, 11, 0.2)'}`,
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    marginBottom: '10px',
                                                    gap: '8px'
                                                }}>
                                                    <span className="alert-identifier" style={{
                                                        color: 'rgba(255,255,255,0.9)',
                                                        textTransform: 'uppercase',
                                                        flex: 1,
                                                        fontWeight: '700'
                                                    }}>
                                                        {alert.identifier}
                                                    </span>
                                                    <span style={{
                                                        fontSize: 'clamp(9px, 2vw, 10px)',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        background: alert.daysLeft < 0
                                                            ? '#f43f5e'
                                                            : (alert.daysLeft === 0 ? 'var(--primary)' : 'var(--primary)'),
                                                        color: 'white',
                                                        fontWeight: '800',
                                                        flexShrink: 0,
                                                        whiteSpace: 'nowrap',
                                                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                                    }}>
                                                        {alert.type === 'Service'
                                                            ? (alert.daysLeft <= 0 ? `${Math.abs(alert.daysLeft)} ${t('km_overdue')}` : `${alert.daysLeft} ${t('km_due')}`)
                                                            : (alert.daysLeft < 0 ? `${Math.abs(alert.daysLeft)}d ${t('overdue')}` : (alert.daysLeft === 0 ? t('today_label') : `${alert.daysLeft}d ${t('days_left_label')}`))}
                                                    </span>
                                                </div>
                                                <div className="alert-type" style={{ color: 'white', marginBottom: '8px' }}>
                                                    {alert.documentType}
                                                </div>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-end',
                                                    flexWrap: 'wrap',
                                                    gap: '8px'
                                                }}>
                                                    <div className="alert-date" style={{
                                                        color: 'rgba(255,255,255,0.6)',
                                                        fontWeight: '500',
                                                        fontSize: 'clamp(10px, 2.5vw, 12px)'
                                                    }}>
                                                        Exp: <span style={{ color: 'white', fontWeight: '700' }}>
                                                            {formatDateIST(alert.expiryDate)}
                                                        </span>
                                                    </div>

                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
