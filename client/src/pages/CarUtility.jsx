import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../api/axios';
import {
    ShieldAlert, Wallet, Droplets, Car, Search, ChevronRight, ChevronLeft,
    X, Plus, CreditCard, Wrench, AlertCircle, CheckCircle2,
    Calendar, Filter, TrendingUp, Zap, Layers, Trash2, Edit3, Eye, FileText, ExternalLink, ArrowRight, Image,
    History, Activity, RefreshCw, Edit2, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompany } from '../context/CompanyContext';
import SEO from '../components/SEO';
import { todayIST, formatDateIST, nowIST, toISTDateString } from '../utils/istUtils';

const CarUtility = () => {
    const { selectedCompany } = useCompany();
    const location = useLocation();
    const [vehicles, setVehicles] = useState([]);
    const [allBorderEntries, setAllBorderEntries] = useState([]);
    const [allServiceRecords, setAllServiceRecords] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('fleet'); // 'fleet' or 'detail'
    const [detailVehicleId, setDetailVehicleId] = useState(null);
    const [selectedVehicleId, setSelectedVehicleId] = useState(null);
    const [activeUtility, setActiveUtility] = useState('fastag');
    const [searchTerm, setSearchTerm] = useState('');
    const [lowBalanceOnly, setLowBalanceOnly] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [submitting, setSubmitting] = useState(false);
    const [viewingImage, setViewingImage] = useState(null);

    const getInitialFY = () => {
        const istNow = nowIST();
        const m = istNow.getUTCMonth() + 1; // 1-12
        const y = istNow.getUTCFullYear();
        return (m >= 1 && m <= 3) ? y - 1 : y;
    };

    const [selectedMonth, setSelectedMonth] = useState(nowIST().getUTCMonth() + 1); // 1-12
    const [selectedYear, setSelectedYear] = useState(getInitialFY());

    const shiftMonth = (amount) => {
        let newMonth = selectedMonth + amount;
        let newYear = selectedYear;
        if (newMonth < 1) { newMonth = 12; newYear--; }
        if (newMonth > 12) { newMonth = 1; newYear++; }
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
    };

    useEffect(() => {
        if (selectedCompany) fetchAllData();
    }, [selectedCompany]);

    // ── AI AGENT SEARCH INTEGRATION ──
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const searchParam = params.get('search') || params.get('vehicle');
        const utilityParam = params.get('utility') || params.get('type');
        const monthParam = params.get('month');
        const yearParam = params.get('year');
        const vehicleIdParam = params.get('vehicleId');

        if (searchParam) setSearchTerm(searchParam);
        if (utilityParam) setActiveUtility(utilityParam);
        if (monthParam) setSelectedMonth(parseInt(monthParam));
        if (yearParam) setSelectedYear(parseInt(yearParam));
        if (vehicleIdParam) {
            setSelectedVehicleId(vehicleIdParam);
        }
    }, [location.search]);

    useEffect(() => {
        setSearchTerm('');
        setDetailVehicleId(null);
        setViewMode('fleet');
        setActiveUtility(null);
        const istNow = nowIST();
        setSelectedMonth(istNow.getUTCMonth() + 1);
        setSelectedYear(getInitialFY());
    }, [location.pathname, location.key]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const token = JSON.parse(localStorage.getItem('userInfo')).token;
            const headers = { Authorization: `Bearer ${token}` };
            const [vehRes, borderRes, serviceRes, dvrRes] = await Promise.all([
                axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=fleet`, { headers }),
                axios.get(`/api/admin/border-tax/${selectedCompany._id}`, { headers }),
                axios.get(`/api/admin/maintenance/${selectedCompany._id}?type=driver_services`, { headers }),
                axios.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false`, { headers })
            ]);

            const targetCompanyId = String(selectedCompany._id);
            const filteredVehs = (vehRes.data.vehicles || []).filter(v => {
                const vCompId = String(v.company?._id || v.company || '');
                return vCompId === targetCompanyId && v.isOutsideCar !== true && typeof v.carNumber === 'string' && !v.carNumber.includes('#');
            });

            setVehicles(filteredVehs);
            setAllBorderEntries(borderRes.data || []);
            setAllServiceRecords(serviceRes.data || []);
            setDrivers(dvrRes.data.drivers || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const selectedVehicle = useMemo(() => vehicles.find(v => v._id === selectedVehicleId), [vehicles, selectedVehicleId]);

    const handleRecharge = async (vId, data) => {
        const targetId = vId || selectedVehicleId;
        if (!targetId || targetId === 'new') return alert('Please select a vehicle');
        setSubmitting(true);
        try {
            const token = JSON.parse(localStorage.getItem('userInfo')).token;
            const headers = {
                Authorization: `Bearer ${token}`,
                companyid: selectedCompany._id
            };

            await axios.post(`/api/admin/vehicles/${targetId}/fastag-recharge`, data, { headers });
            setMessage({ type: 'success', text: 'Fastag Recharge Logged Successfully!' });
            setTimeout(() => { 
                setMessage({ type: '', text: '' }); 
                fetchAllData(); 
                if (selectedVehicleId === 'new') setSelectedVehicleId(null);
            }, 1500);
            return true;
        } catch (err) { 
            console.error('Recharge error:', err.response?.data || err.message);
            setMessage({ type: 'error', text: err.response?.data?.message || 'Error logging recharge' }); 
            return false;
        }
        finally { setSubmitting(false); }
    };

    const handleAddTax = async (vId, formData) => {
        const targetId = vId || selectedVehicleId;
        if (!targetId || targetId === 'new') return alert('Please select a vehicle');
        setSubmitting(true);
        try {
            const token = JSON.parse(localStorage.getItem('userInfo')).token;
            if (formData instanceof FormData && !formData.get('vehicleId')) {
                formData.append('vehicleId', targetId);
            }
            await axios.post('/api/admin/border-tax', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    companyid: selectedCompany._id
                }
            });
            setMessage({ type: 'success', text: 'Border Tax Recorded Successfully!' });
            setTimeout(() => { 
                setMessage({ type: '', text: '' }); 
                fetchAllData(); 
                if (selectedVehicleId === 'new') setSelectedVehicleId(null);
            }, 1500);
            return true;
        } catch (err) { 
            setMessage({ type: 'error', text: err.response?.data?.message || 'Error recording tax' }); 
            return false;
        }
        finally { setSubmitting(false); }
    };

    const handleAddService = async (vId, formData) => {
        const targetId = vId || selectedVehicleId;
        if (!targetId || targetId === 'new') return alert('Please select a vehicle');
        setSubmitting(true);
        try {
            const token = JSON.parse(localStorage.getItem('userInfo')).token;
            if (formData instanceof FormData && !formData.get('vehicleId')) {
                formData.append('vehicleId', targetId);
            }
            await axios.post('/api/admin/maintenance', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    companyid: selectedCompany._id
                }
            });
            setMessage({ type: 'success', text: 'Service Record Logged Successfully!' });
            setTimeout(() => { 
                setMessage({ type: '', text: '' }); 
                fetchAllData(); 
                if (selectedVehicleId === 'new') setSelectedVehicleId(null);
            }, 1500);
            return true;
        } catch (err) { 
            console.error('Service add error:', err.response?.data || err.message); 
            setMessage({ type: 'error', text: err.response?.data?.message || 'Error recording service' }); 
            return false;
        }
        finally { setSubmitting(false); }
    };

    const handleDeleteRecord = async (endpoint, id) => {
        if (!window.confirm('Delete entry?')) return;
        try {
            const token = JSON.parse(localStorage.getItem('userInfo')).token;
            const headers = {
                Authorization: `Bearer ${token}`,
                companyid: selectedCompany._id
            };
            await axios.delete(`/api/admin/${endpoint}/${id}`, { headers });
            fetchAllData();
        } catch (err) { alert('Fail'); }
    };

    const handleUpdateRecord = async (endpoint, id, data) => {
        setSubmitting(true);
        try {
            const token = JSON.parse(localStorage.getItem('userInfo')).token;
            const headers = {
                Authorization: `Bearer ${token}`,
                companyid: selectedCompany?._id
            };

            await axios.put(`/api/admin/${endpoint}/${id}`, data, { headers });
            setMessage({ type: 'success', text: 'Entry Updated Successfully' });
            setTimeout(() => { setMessage({ type: '', text: '' }); fetchAllData(); }, 1500);
            return true;
        } catch (err) {
            console.error('Update failed:', err.response?.data || err.message);
            setMessage({ type: 'error', text: err.response?.data?.message || 'Update Failed' });
            return false;
        } finally { setSubmitting(false); }
    };

    const getVehicleActivity = React.useCallback((vId) => {
        const v = vehicles.find(v => v._id === vId);
        const fHist = v ? (v.fastagHistory || []) : [];

        const getISTMonthYear = (dateInput) => {
            if (!dateInput) return { m: -1, y: -1 };
            try {
                const d = new Date(dateInput);
                if (isNaN(d.getTime())) return { m: -1, y: -1 };
                
                const formatter = new Intl.DateTimeFormat('en-GB', {
                    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata'
                });
                const parts = formatter.formatToParts(d);
                const month = parseInt(parts.find(p => p.type === 'month').value) - 1;
                const year = parseInt(parts.find(p => p.type === 'year').value);
                return { m: month, y: year };
            } catch (e) {
                console.error("Date parsing error:", e);
                return { m: -1, y: -1 };
            }
        };

        const fFilt = fHist.filter(h => {
            const { m, y } = getISTMonthYear(h.date);
            const calendarYear = (selectedMonth >= 1 && selectedMonth <= 3) ? selectedYear + 1 : selectedYear;
            return (m + 1) === selectedMonth && y === calendarYear;
        });

        const bFilt = allBorderEntries.filter(e => {
            const { m, y } = getISTMonthYear(e.date);
            const calendarYear = (selectedMonth >= 1 && selectedMonth <= 3) ? selectedYear + 1 : selectedYear;
            return (e.vehicle?._id === vId || e.vehicle === vId) && (m + 1) === selectedMonth && y === calendarYear;
        });

        const sFilt = allServiceRecords.filter(r => {
            const { m, y } = getISTMonthYear(r.billDate || r.date);
            const calendarYear = (selectedMonth >= 1 && selectedMonth <= 3) ? selectedYear + 1 : selectedYear;
            return (r.vehicle?._id === vId || r.vehicle === vId) && (m + 1) === selectedMonth && y === calendarYear;
        });

        return {
            fastag: fFilt.reduce((s, h) => s + (Number(h.amount) || 0), 0),
            border: bFilt.reduce((s, e) => s + (Number(e.amount) || 0), 0),
            service: sFilt.reduce((s, r) => s + (Number(r.amount) || 0), 0),
            total: fFilt.reduce((s, h) => s + (Number(h.amount) || 0), 0) + 
                   bFilt.reduce((s, e) => s + (Number(e.amount) || 0), 0) + 
                   sFilt.reduce((s, r) => s + (Number(r.amount) || 0), 0),
            items: { fastag: fFilt, border: bFilt, service: sFilt }
        };
    }, [vehicles, allBorderEntries, allServiceRecords, selectedMonth, selectedYear]);

    const recentActivity = useMemo(() => {
        const all = [];
        vehicles.forEach(v => {
            const act = getVehicleActivity(v._id);
            act.items.fastag.forEach(x => all.push({ ...x, type: 'Fastag', car: v.carNumber, color: '#fbbf24' }));
            act.items.border.forEach(x => all.push({ ...x, type: 'Border', car: v.carNumber, color: '#38bdf8' }));
            act.items.service.forEach(x => all.push({ ...x, type: 'Service', car: v.carNumber, color: '#a855f7' }));
        });
        return all.sort((a, b) => new Date(b.date || b.billDate) - new Date(a.date || a.billDate)).slice(0, 5);
    }, [vehicles, getVehicleActivity]);

    const globalStats = useMemo(() => {
        let f = 0, b = 0, s = 0;
        vehicles.forEach(v => {
            const act = getVehicleActivity(v._id);
            f += act.fastag; b += act.border; s += act.service;
        });
        return { 
            f, b, s, 
            t: f + b + s,
            lowBalanceCount: vehicles.filter(v => (v.fastagBalance || 0) < 500).length
        };
    }, [vehicles, allBorderEntries, allServiceRecords, selectedMonth, selectedYear]);

    const filteredVehicles = vehicles
        .filter(v => (v.carNumber + (v.model || '')).toLowerCase().includes(searchTerm.toLowerCase()))
        .filter(v => lowBalanceOnly ? (v.fastagBalance || 0) < 500 : true);

    const getImageUrl = (p) => {
        if (!p) return ''; if (p.startsWith('http')) return p;
        return `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}/${p.replace(/^\/+/, '')}`;
    };

    const detailVehicle = useMemo(() => vehicles.find(v => v._id === detailVehicleId), [vehicles, detailVehicleId]);

    return (
        <div key={location.key} style={{ minHeight: '100vh', background: 'transparent', color: '#fff', padding: '40px' }}>
            <SEO title="Car Utility" description="Fleet Accounts Hub" />

            <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
                <AnimatePresence>
                    {message.text && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            style={{
                                position: 'fixed', top: '40px', left: '50%', transform: 'translateX(-50%)',
                                zIndex: 10000, padding: '15px 30px', borderRadius: '18px',
                                background: message.type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(244, 63, 94, 0.9)',
                                color: '#fff', fontWeight: '1000', fontSize: '14px',
                                backdropFilter: 'blur(10px)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                                display: 'flex', alignItems: 'center', gap: '10px', pointerEvents: 'none'
                            }}
                        >
                            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                            {message.text.toUpperCase()}
                        </motion.div>
                    )}
                </AnimatePresence>
                <AnimatePresence mode="wait">
                    {viewMode === 'fleet' ? (
                        <motion.div
                            key="fleet-list"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', gap: '20px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ width: 'clamp(40px,10vw,50px)', height: 'clamp(40px,10vw,50px)', background: 'var(--primary)', borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 20px rgba(14, 165, 233, 0.2)' }}>
                                        <Wrench size={24} color="white" />
                                    </div>
                                    <div>
                                        <h1 style={{ margin: 0, fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: '900', letterSpacing: '-1px' }}>Fleet <span className="theme-gradient-text">Utility</span></h1>
                                        <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase' }}>Operational Maintenance & Expense</p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginLeft: 'auto' }}>
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
                                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'white', fontWeight: '900', fontSize: '14px', padding: '0 10px',
                                                height: '100%', outline: 'none', cursor: 'pointer'
                                            }}
                                        >
                                            {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map(m => (
                                                <option key={m} value={m} style={{ background: '#0f172a' }}>
                                                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

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

                                    <button onClick={() => { setSelectedVehicleId('new'); setActiveUtility('fastag'); }} className="btn-primary" style={{ padding: '12px 24px', borderRadius: '15px', fontWeight: '1000' }}>
                                        <Plus size={18} /> <span className="hide-mobile">QUICK ADD</span>
                                    </button>
                                </div>
                            </header>

                            <div className="grid-1-2-2-4" style={{ marginBottom: '40px', gap: '20px' }}>
                                <SummaryStat 
                                    label="Fastag Paid" 
                                    val={globalStats.f} 
                                    col="#38bdf8" 
                                    icon={CreditCard} 
                                    desc={`${vehicles.reduce((acc, v) => acc + (v.fastagHistory?.length || 0), 0)} Logs Found in: ${[...new Set(vehicles.flatMap(v => v.fastagHistory || []).map(h => {
                                        const str = formatDateIST(h.date);
                                        const parts = str.split('/');
                                        return parts[1] + '/' + parts[2];
                                    }))].join(', ') || 'None'}`} 
                                />
                                <SummaryStat label="Border Tax" val={globalStats.b} col="#fbbf24" icon={Shield} desc="Permit Expenses" />
                                <SummaryStat label="Service Exp" val={globalStats.s} col="#10b981" icon={Wrench} desc="Misc Services" />
                                <SummaryStat label="Month Total" val={globalStats.t} col="#a855f7" icon={TrendingUp} isDark desc="Combined Ops" />
                            </div>


                            <div style={{ position: 'relative', marginBottom: '30px' }}>
                                <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                                <input type="text" placeholder="Search by vehicle number..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-field" style={{ paddingLeft: '45px', marginBottom: 0 }} />
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                <div className="table-responsive-wrapper">
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                                <th style={{ padding: '20px 30px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Car size={14} /> Vehicle</div></th>
                                                <th style={{ padding: '20px 30px', textAlign: 'right', fontSize: '11px', fontWeight: '900', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}><CreditCard size={14} /> Fastag (M)</div></th>
                                                <th style={{ padding: '20px 30px', textAlign: 'right', fontSize: '11px', fontWeight: '900', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}><Shield size={14} /> Border (M)</div></th>
                                                <th style={{ padding: '20px 30px', textAlign: 'right', fontSize: '11px', fontWeight: '900', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}><Wrench size={14} /> Service (M)</div></th>
                                                <th style={{ padding: '20px 30px', textAlign: 'right', fontSize: '11px', fontWeight: '900', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}><TrendingUp size={14} /> Total (M)</div></th>
                                                <th style={{ padding: '20px 30px', textAlign: 'right', fontSize: '11px', fontWeight: '900', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="4" style={{ padding: '100px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></td></tr>
                                            ) : filteredVehicles.map(v => {
                                                const act = getVehicleActivity(v._id);
                                                return (
                                                    <tr key={v._id}
                                                        onClick={() => { setDetailVehicleId(v._id); setViewMode('detail'); setActiveUtility('fastag'); }}
                                                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }}
                                                        className="table-row-hover"
                                                    >
                                                        <td style={{ padding: '20px 30px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Car size={18} color="rgba(255,255,255,0.4)" /></div>
                                                                <div>
                                                                    <div style={{ fontWeight: '900', fontSize: '17px' }}>{v.carNumber}</div>
                                                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>{v.model}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '20px 30px', textAlign: 'right' }}>
                                                            <div style={{ fontSize: '14px', fontWeight: '800', color: 'rgba(255,255,255,0.7)' }}>₹{act.fastag.toLocaleString()}</div>
                                                        </td>
                                                        <td style={{ padding: '20px 30px', textAlign: 'right' }}>
                                                            <div style={{ fontSize: '14px', fontWeight: '800', color: 'rgba(255,255,255,0.7)' }}>₹{act.border.toLocaleString()}</div>
                                                        </td>
                                                        <td style={{ padding: '20px 30px', textAlign: 'right' }}>
                                                            <div style={{ fontSize: '14px', fontWeight: '800', color: 'rgba(255,255,255,0.7)' }}>₹{act.service.toLocaleString()}</div>
                                                        </td>
                                                        <td style={{ padding: '20px 30px', textAlign: 'right' }}>
                                                            <div style={{ fontSize: '15px', fontWeight: '1000', color: '#10b981' }}>₹{act.total.toLocaleString()}</div>
                                                        </td>
                                                        <td style={{ padding: '20px 30px', textAlign: 'right' }}>
                                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: '900', fontSize: '11px' }}>
                                                                VIEW <ArrowRight size={14} />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="vehicle-detail"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                        >
                            <nav style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <button onClick={() => setViewMode('fleet')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '10px 15px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '900' }}>
                                    <ChevronLeft size={18} /> BACK TO FLEET
                                </button>
                            </nav>

                            <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '35px', border: '1px solid rgba(255,255,255,0.05)', padding: '40px', marginBottom: '40px' }}>
                                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
                                        <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 15px 35px rgba(14, 165, 233, 0.3)' }}><Car size={40} color="white" /></div>
                                        <div>
                                            <h2 style={{ margin: 0, fontSize: '36px', fontWeight: '1000' }}>{detailVehicle?.carNumber}</h2>
                                            <div style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
                                                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: '800' }}>{detailVehicle?.model}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setSelectedVehicleId(detailVehicleId)}
                                        className="btn-primary"
                                        style={{ height: '50px', padding: '0 30px', borderRadius: '15px', fontWeight: '1000', gap: '10px' }}
                                    >
                                        <Plus size={18} /> ADD NEW LOG
                                    </button>
                                </header>

                                <div className="grid-1-2-2-4" style={{ marginBottom: '40px' }}>
                                    {detailVehicle && (
                                        <>
                                            <DetailStat 
                                                label="Fastag Paid" 
                                                val={getVehicleActivity(detailVehicleId).fastag} 
                                                icon={CreditCard} col="#38bdf8" 
                                                desc={`${detailVehicle.fastagHistory?.length || 0} Total Logs`}
                                            />
                                            <DetailStat 
                                                label="Border Tax" 
                                                val={getVehicleActivity(detailVehicleId).border} 
                                                icon={Shield} col="#fbbf24" 
                                                desc={`${allBorderEntries.filter(e => (e.vehicle?._id === detailVehicleId || e.vehicle === detailVehicleId)).length} Total Logs`}
                                            />
                                            <DetailStat 
                                                label="Extra Service" 
                                                val={getVehicleActivity(detailVehicleId).service} 
                                                icon={Wrench} col="#10b981" 
                                                desc={`${allServiceRecords.filter(r => (r.vehicle?._id === detailVehicleId || r.vehicle === detailVehicleId)).length} Total Logs`}
                                            />
                                            <DetailStat 
                                                label="Total Current" 
                                                val={getVehicleActivity(detailVehicleId).total} 
                                                icon={TrendingUp} col="#a855f7" isDark 
                                            />
                                        </>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '18px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    {[
                                        { id: 'fastag', label: 'Fastag Logs', icon: CreditCard, color: '#38bdf8' },
                                        { id: 'border', label: 'Border Permits', icon: Shield, color: '#fbbf24' },
                                        { id: 'services', label: 'Extra Services', icon: Wrench, color: '#10b981' }
                                    ].map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setActiveUtility(t.id)}
                                            style={{
                                                padding: '12px 25px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                                                background: activeUtility === t.id ? `${t.color}15` : 'transparent',
                                                color: activeUtility === t.id ? t.color : 'rgba(255,255,255,0.4)',
                                                fontSize: '12px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s', textTransform: 'uppercase'
                                            }}
                                        >
                                            <t.icon size={14} /> {t.label}
                                        </button>
                                    ))}
                                </div>

                                {detailVehicle && (
                                    <ManagerHub
                                        key={activeUtility}
                                        type={activeUtility}
                                        color={activeUtility === 'fastag' ? 'var(--primary)' : activeUtility === 'border' ? '#0ea5e9' : '#a855f7'}
                                        act={getVehicleActivity(detailVehicleId)}
                                        drivers={drivers}
                                        getImageUrl={getImageUrl}
                                        hideForm={true}
                                        onAdd={(vId, data, file) => activeUtility === 'fastag' ? handleRecharge(vId, data, file) : activeUtility === 'border' ? handleAddTax(vId, data, file) : handleAddService(vId, data, file)}
                                        onUpdate={(id, data) => handleUpdateRecord(activeUtility === 'fastag' ? `vehicles/${detailVehicleId}/fastag-recharge` : activeUtility === 'border' ? 'border-tax' : 'maintenance', id, data)}
                                        onDelete={id => handleDeleteRecord(activeUtility === 'fastag' ? `vehicles/${detailVehicleId}/fastag-recharge` : activeUtility === 'border' ? 'border-tax' : 'maintenance', id)}
                                        setViewingImage={setViewingImage}
                                        submitting={submitting}
                                        vehicle={detailVehicle}
                                        companyId={selectedCompany?._id}
                                        selectedMonth={selectedMonth}
                                        selectedYear={selectedYear}
                                    />
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {selectedVehicleId && (selectedVehicleId === 'new' || vehicles.find(v => v._id === selectedVehicleId)) && (
                    <div className="modal-overlay">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 15 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 15 }}
                            className="modal-content-wrapper" style={{ maxWidth: '1000px', height: '90vh', padding: '0' }}
                        >
                            <div style={{ padding: '30px 40px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                                <h3 style={{ margin: 0, fontWeight: '1000', fontSize: '22px', letterSpacing: '-0.5px' }}>
                                    {selectedVehicleId === 'new' ? 'Quick Utility Entry' : 'Manual Utility Entry'}
                                </h3>
                                <button
                                    onClick={() => setSelectedVehicleId(null)}
                                    style={{
                                        width: '40px', height: '40px', borderRadius: '14px',
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', transition: '0.2s'
                                    }}
                                    className="table-row-hover"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                                {/* Premium Tabbed Navigation */}
                                <div style={{ display: 'flex', gap: '10px', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', marginBottom: '30px', border: '1px solid rgba(255,255,255,0.06)', width: 'fit-content' }}>
                                    {[
                                        { id: 'fastag', label: 'Fastag', color: '#38bdf8', icon: CreditCard },
                                        { id: 'border', label: 'Border Tax', color: '#fbbf24', icon: Shield },
                                        { id: 'services', label: 'Other Service', color: '#10b981', icon: Wrench }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveUtility(tab.id)}
                                            style={{
                                                padding: '14px 25px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                                                background: (activeUtility || 'fastag') === tab.id ? tab.color : 'transparent',
                                                color: (activeUtility || 'fastag') === tab.id ? '#000' : 'rgba(255,255,255,0.4)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                fontWeight: '1000', fontSize: '13px', transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }}
                                        >
                                            <tab.icon size={18} /> {tab.label.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                                <ManagerHub
                                    key={activeUtility || 'fastag'}
                                    type={activeUtility || 'fastag'} color={(activeUtility || 'fastag') === 'fastag' ? '#38bdf8' : (activeUtility || 'fastag') === 'border' ? '#fbbf24' : '#10b981'}
                                    act={selectedVehicleId === 'new' ? { items: { fastag: [], border: [], service: [] } } : getVehicleActivity(selectedVehicleId)}
                                    drivers={drivers} getImageUrl={getImageUrl}
                                    onAdd={(vId, data, file) => (activeUtility || 'fastag') === 'fastag' ? handleRecharge(vId, data, file) : (activeUtility || 'fastag') === 'border' ? handleAddTax(vId, data, file) : handleAddService(vId, data, file)}
                                    onUpdate={(id, data) => handleUpdateRecord((activeUtility || 'fastag') === 'fastag' ? `vehicles/${selectedVehicleId}/fastag-recharge` : (activeUtility || 'fastag') === 'border' ? 'border-tax' : 'maintenance', id, data)}
                                    onDelete={id => handleDeleteRecord((activeUtility || 'fastag') === 'fastag' ? `vehicles/${selectedVehicleId}/fastag-recharge` : (activeUtility || 'fastag') === 'border' ? 'border-tax' : 'maintenance', id)}
                                    setViewingImage={setViewingImage} submitting={submitting} vehicle={vehicles.find(v => v._id === selectedVehicleId)} allVehicles={vehicles} companyId={selectedCompany?._id}
                                    selectedMonth={selectedMonth}
                                    selectedYear={selectedYear}
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>{viewingImage && (<div style={{ position: 'fixed', inset: 0, zIndex: 2005, background: 'rgba(0,0,0,0.95)', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setViewingImage(null)}><motion.img initial={{ scale: 0.95 }} animate={{ scale: 1 }} src={viewingImage} style={{ maxWidth: '95%', maxHeight: '95%', borderRadius: '20px' }} /></div>)}</AnimatePresence>
        </div>
    );
};

const DetailStat = ({ label, val, icon: Icon, col, isDark, desc }) => (
    <div style={{ padding: '25px', background: isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '25px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: `${col}15`, color: col, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Icon size={22} /></div>
        <div>
            <div style={{ fontSize: '11px', fontWeight: '900', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</div>
            <div style={{ fontSize: '22px', fontWeight: '1000', color: isDark ? col : '#fff' }}>₹{val.toLocaleString()}</div>
            {desc && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontWeight: '700', marginTop: '2px' }}>{desc}</div>}
        </div>
    </div>
);

const SummaryStat = ({ label, val, col, icon: Icon, isDark, desc }) => (
    <div style={{ 
        padding: '24px', 
        background: isDark ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))' : 'rgba(15, 23, 42, 0.6)', 
        border: '1px solid rgba(255, 255, 255, 0.06)', 
        borderRadius: '24px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '20px',
        backdropFilter: 'blur(10px)',
        boxShadow: isDark ? '0 10px 30px rgba(16, 185, 129, 0.1)' : 'none'
    }}>
        <div style={{ 
            width: '52px', 
            height: '52px', 
            borderRadius: '16px', 
            background: `${col}15`, 
            color: col, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            boxShadow: `0 0 20px ${col}20`
        }}><Icon size={24} /></div>
        <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
            <div style={{ fontSize: '26px', fontWeight: '1000', color: isDark ? col : '#fff', letterSpacing: '-0.5px' }}>₹{val.toLocaleString()}</div>
            {desc && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontWeight: '700', marginTop: '2px' }}>{desc}</div>}
        </div>
    </div>
);

const ManagerHub = ({ type, color, act, drivers, onAdd, onUpdate, onDelete, setViewingImage, submitting, vehicle, getImageUrl, companyId, selectedMonth, selectedYear, hideForm = false, allVehicles = [] }) => {
    const [form, setForm] = useState({ amount: '', remarks: '', borderName: '', date: '', billDate: '', driverId: '', category: 'Car Wash', vehicleId: vehicle?._id || '', paymentSource: 'Office', paymentMode: 'UPI' });
    const [file, setFile] = useState(null);
    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
        if (vehicle) setForm(prev => ({ ...prev, vehicleId: vehicle._id }));
    }, [vehicle]);

    const hist = type === 'fastag' ? act.items.fastag : type === 'border' ? act.items.border : act.items.service;

    // Reset form when type changes or editing starts/stops
    useEffect(() => {
        if (editingItem) {
            setForm({
                amount: editingItem.amount || '',
                remarks: editingItem.remarks || '',
                borderName: editingItem.borderName || '',
                date: toISTDateString(editingItem.date || editingItem.billDate || ''),
                billDate: toISTDateString(editingItem.billDate || editingItem.date || ''),
                driverId: editingItem.driver?._id || editingItem.driver || '',
                category: editingItem.category || 'Car Wash',
                paymentMode: editingItem.method || editingItem.paymentMode || 'UPI',
                vehicleId: vehicle?._id || editingItem.vehicle?._id || editingItem.vehicle || '',
                paymentSource: editingItem.paymentSource || 'Office'
            });
        } else {
            // Default to today if current month is selected, else default to 1st of selected month
            const istNow = nowIST();
            const isCurrentMonth = istNow.getUTCMonth() === selectedMonth && istNow.getUTCFullYear() === selectedYear;
            const defaultDate = isCurrentMonth ? todayIST() : `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
            
            setForm({ amount: '', remarks: '', borderName: '', date: '', billDate: '', driverId: '', category: 'Car Wash', vehicleId: vehicle?._id || '', paymentSource: 'Office', paymentMode: 'UPI' });
            setFile(null);
        }
    }, [editingItem, type, vehicle, selectedMonth, selectedYear]);

    const handleSave = async () => {
        const targetVehicleId = vehicle?._id || form.vehicleId;
        if (!targetVehicleId) return alert('Please select a vehicle');
        if (!form.amount) return alert('Amount is required');

        const fd = new FormData();
        Object.keys(form).forEach(k => {
            if (form[k] && !['date', 'billDate', 'vehicleId'].includes(k)) {
                fd.append(k, form[k]);
            }
        });

        const finalDate = form.date || form.billDate || '';
        fd.append('date', finalDate);
        fd.append('billDate', finalDate);
        if (companyId) fd.append('companyId', companyId);
        fd.append('vehicleId', targetVehicleId);

        if (file) fd.append(type === 'border' ? 'receiptPhoto' : 'billPhoto', file);

        try {
            let success = false;
            if (type === 'fastag') {
                const formData = new FormData();
                formData.append('amount', form.amount);
                formData.append('method', form.paymentMode || 'UPI');
                formData.append('remarks', form.remarks);
                formData.append('date', finalDate);
                if (file) formData.append('receiptPhoto', file);
                if (companyId) formData.append('companyId', companyId);

                if (editingItem) success = await onUpdate(editingItem._id, formData);
                else { await onAdd(targetVehicleId, formData); success = true; }
            } else {
                if (type === 'services') fd.append('maintenanceType', 'Driver Services');
                if (editingItem) success = await onUpdate(editingItem._id, fd);
                else { await onAdd(targetVehicleId, fd); success = true; }
            }

            if (success) {
                setForm({ amount: '', remarks: '', borderName: '', date: '', billDate: '', driverId: '', category: 'Car Wash', vehicleId: vehicle?._id || '', paymentSource: 'Office', paymentMode: 'UPI' });
                setFile(null);
                if (editingItem) setEditingItem(null);
            }
        } catch (err) {
            console.error('Save error:', err);
        }
    };

    return (
        <div className="manager-hub-container" style={{ color: '#fff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                <div className="entry-card premium-card" style={{ padding: '32px', borderRadius: '28px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <h3 style={{ margin: '0 0 25px 0', fontSize: '20px', fontWeight: '900', color, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Plus size={22} /> {editingItem ? 'Edit' : 'New'} {type === 'fastag' ? 'Recharge' : type === 'border' ? 'Border Tax' : 'Service Record'}
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {!vehicle && (
                            <div>
                                <label className="premium-label" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Select Vehicle</label>
                                <select
                                    value={form.vehicleId}
                                    onChange={e => setForm({ ...form, vehicleId: e.target.value })}
                                    className="premium-compact-input"
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px', color: '#fff' }}
                                >
                                    <option value="" style={{ background: '#1a1a1a' }}>Choose a car...</option>
                                    {allVehicles.map(v => (
                                        <option key={v._id} value={v._id} style={{ background: '#1a1a1a' }}>{v.carNumber} ({v.model})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label className="premium-label" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Amount (₹)</label>
                                <input
                                    type="number"
                                    value={form.amount}
                                    onChange={e => setForm({ ...form, amount: e.target.value })}
                                    className="premium-compact-input"
                                    placeholder="0.00"
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px', color: '#fff', fontSize: '18px', fontWeight: '900' }}
                                />
                            </div>
                            <div>
                                <label className="premium-label" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Payment Mode</label>
                                <select 
                                    value={form.paymentMode} 
                                    onChange={e => setForm({ ...form, paymentMode: e.target.value })} 
                                    className="premium-compact-input"
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px', color: '#fff' }}
                                >
                                    <option value="UPI">UPI</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="premium-label" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Date</label>
                            <div className="dual-date-input-container" style={{ position: 'relative' }}>
                                <input
                                    id="utility-date-picker"
                                    type="date"
                                    value={form.date}
                                    onChange={e => setForm({ ...form, date: e.target.value })}
                                    onClick={(e) => e.target.showPicker()}
                                    className="premium-compact-input"
                                    style={{ colorScheme: 'dark', width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px', color: '#fff', cursor: 'pointer' }}
                                />
                                <Calendar size={18} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none' }} />
                            </div>
                        </div>

                        {type === 'border' && (
                            <div>
                                <label className="premium-label" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Border Name</label>
                                <input
                                    type="text"
                                    value={form.borderName}
                                    onChange={e => setForm({ ...form, borderName: e.target.value })}
                                    className="premium-compact-input"
                                    placeholder="e.g. Delhi-Haryana"
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px', color: '#fff' }}
                                />
                            </div>
                        )}

                        {type === 'services' && (
                            <div>
                                <label className="premium-label" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Service Category</label>
                                <select 
                                    value={form.category} 
                                    onChange={e => setForm({ ...form, category: e.target.value })} 
                                    className="premium-compact-input"
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px', color: '#fff' }}
                                >
                                    <option>Car Wash</option>
                                    <option>Puncture / Tyre</option>
                                    <option>Cleaning Supplies</option>
                                    <option>Periodic Service</option>
                                    <option>Other Misc</option>
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="premium-label" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Remarks / Notes</label>
                            <textarea
                                value={form.remarks}
                                onChange={e => setForm({ ...form, remarks: e.target.value })}
                                className="premium-compact-input"
                                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px', color: '#fff', height: '80px', resize: 'none' }}
                                placeholder="Add any specific details..."
                            />
                        </div>

                        <div>
                            <label className="premium-label" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Attachment (Receipt/Bill)</label>
                            <div 
                                className="upload-zone"
                                onClick={() => document.getElementById('file-upload').click()}
                                style={{ 
                                    border: '2px dashed rgba(255,255,255,0.1)', 
                                    borderRadius: '18px', 
                                    padding: '20px', 
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    background: file ? `${color}10` : 'transparent',
                                    transition: '0.3s'
                                }}
                            >
                                <input id="file-upload" type="file" hidden onChange={e => setFile(e.target.files[0])} />
                                <Image size={24} style={{ color: file ? color : 'rgba(255,255,255,0.2)', marginBottom: '8px' }} />
                                <div style={{ fontSize: '12px', fontWeight: '700', color: file ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                                    {file ? file.name : 'Click to upload image'}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleSave} 
                            disabled={submitting}
                            className="btn-primary"
                            style={{ background: color, color: '#000', padding: '16px', borderRadius: '18px', fontWeight: '1000', fontSize: '15px', marginTop: '10px', width: '100%', border: 'none', cursor: 'pointer' }}
                        >
                            {submitting ? 'PROCESSING...' : editingItem ? 'UPDATE RECORD' : 'SAVE ENTRY'}
                        </button>
                        {editingItem && (
                            <button 
                                onClick={() => {
                                    setEditingItem(null);
                                    setForm({ amount: '', remarks: '', borderName: '', date: '', billDate: '', driverId: '', category: 'Car Wash', vehicleId: vehicle?._id || '', paymentSource: 'Office', paymentMode: 'UPI' });
                                }}
                                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '12px', borderRadius: '15px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                            >
                                CANCEL EDIT
                            </button>
                        )}
                    </div>
                </div>

                <div className="history-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h4 style={{ margin: '0', fontSize: '16px', fontWeight: '900', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <History size={18} /> RECENT LOGS
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px', overflowY: 'auto', paddingRight: '5px' }}>
                        {hist.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div style={{ opacity: 0.2, marginBottom: '10px' }}><History size={32} /></div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>No records found for this car in selected month</div>
                            </div>
                        ) : hist.sort((a,b) => new Date(b.date || b.billDate) - new Date(a.date || a.billDate)).map(item => (
                            <div key={item._id} className="history-item premium-card" style={{ padding: '20px', borderRadius: '22px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: '1000', color: '#fff' }}>₹{Number(item.amount).toLocaleString()}</div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginTop: '2px' }}>
                                        {formatDateIST(item.date || item.billDate)} • {item.method || item.paymentMode || 'Manual'}
                                    </div>
                                    {item.remarks && <div style={{ fontSize: '10px', color: color, fontWeight: '700', marginTop: '6px', opacity: 0.8 }}>{item.remarks}</div>}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {(item.receiptPhoto || item.billPhoto) && (
                                        <button onClick={() => setViewingImage(getImageUrl(item.receiptPhoto || item.billPhoto))} className="icon-btn-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}>
                                            <Image size={14} />
                                        </button>
                                    )}
                                    <button onClick={() => {
                                        setEditingItem(item);
                                    }} className="icon-btn-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#fbbf24', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}>
                                        <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => onDelete(item._id)} className="icon-btn-sm" style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CarUtility;
