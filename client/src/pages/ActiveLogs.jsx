import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../api/axios';
import {
    AlertTriangle,
    Plus,
    Search,
    Trash2,
    CheckCircle2,
    XCircle,
    Clock,
    MapPin,
    Calendar,
    User,
    Car,
    FileText,
    Camera,
    IndianRupee
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompany } from '../context/CompanyContext';
import SEO from '../components/SEO';
import { todayIST, toISTDateString, formatDateIST, nowIST } from '../utils/istUtils';
import { ChevronLeft, ChevronRight, ShoppingCart, TrendingUp } from 'lucide-react';
import PremiumDateInput from '../components/common/PremiumDateInput';

const ActiveLogs = () => {
    const { selectedCompany } = useCompany();
    const location = useLocation();
    const [logs, setLogs] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterVehicle, setFilterVehicle] = useState('All');
    const [filterDriver, setFilterDriver] = useState('All');
    const [viewPhoto, setViewPhoto] = useState(null);

    // Modern Date Navigation States
    const [selectedMonth, setSelectedMonth] = useState('All');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Financial Year Logic: April to March
    useEffect(() => {
        if (selectedMonth === 'All') {
            // Full Financial Year: April 1st to March 31st (of next year)
            const start = `${selectedYear}-04-01`;
            const end = `${selectedYear + 1}-03-31`;
            setFromDate(start);
            setToDate(end);
        } else {
            const m = parseInt(selectedMonth); // 1-12
            // If month is Jan(1)-Mar(3), it belongs to the next calendar year
            const calendarYear = (m >= 1 && m <= 3) ? selectedYear + 1 : selectedYear;
            const start = toISTDateString(new Date(calendarYear, m - 1, 1));
            const end = toISTDateString(new Date(calendarYear, m, 0));
            setFromDate(start);
            setToDate(end);
        }
    }, [selectedMonth, selectedYear]);


    const getLocalYYYYMMDD = () => todayIST();

    // ── AI AGENT SEARCH INTEGRATION ──
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const searchParam = params.get('search') || params.get('name') || params.get('log');
        const vehicleParam = params.get('vehicle');
        const driverParam = params.get('driver');
        const monthParam = params.get('month');
        const yearParam = params.get('year');

        if (searchParam) setSearchTerm(searchParam);
        if (vehicleParam) setFilterVehicle(vehicleParam);
        if (driverParam) setFilterDriver(driverParam);
        if (monthParam) setSelectedMonth(Number(monthParam) - 1); // 0-indexed
        if (yearParam) setSelectedYear(parseInt(yearParam));
    }, [location.search]);

    // Form State
    const [formData, setFormData] = useState({
        vehicleId: '',
        driverId: '',
        date: '',
        location: '',
        description: '',
        amount: '',
        status: 'Pending'
    });
    const [photos, setPhotos] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (selectedCompany && fromDate && toDate) {
            fetchLogs();
            fetchVehiclesAndDrivers();
        }
    }, [selectedCompany, fromDate, toDate]);


    const fetchLogs = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/accident-logs/${selectedCompany._id}?from=${fromDate}&to=${toDate}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setLogs(data || []);
        } catch (err) {

            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchVehiclesAndDrivers = async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));

            const [vRes, dRes] = await Promise.all([
                axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=fleet`, { headers: { Authorization: `Bearer ${userInfo.token}` } }),
                axios.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false&isFreelancer=false`, { headers: { Authorization: `Bearer ${userInfo.token}` } })
            ]);

            setVehicles(vRes.data.vehicles || []);
            setDrivers(dRes.data.drivers || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const fd = new FormData();
            Object.keys(formData).forEach(key => fd.append(key, formData[key]));
            fd.append('companyId', selectedCompany._id);

            Array.from(photos).forEach(file => {
                fd.append('photos', file);
            });

            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.post('/api/admin/accident-logs', fd, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${userInfo.token}`
                }
            });

            setShowModal(false);
            resetForm();
            fetchLogs();
            alert('Incident report logged successfully');
        } catch (err) {
            console.error(err);
            alert('Failed to log incident');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this log?')) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.delete(`/api/admin/accident-logs/${id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            fetchLogs();
        } catch (err) {
            console.error(err);
        }
    };

    const resetForm = () => {
        setFormData({
            vehicleId: '',
            driverId: '',
            date: '',
            location: '',
            description: '',
            amount: '',
            status: 'Pending'
        });
        setPhotos([]);
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = (
            log.vehicle?.carNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const matchesStatus = filterStatus === 'All' || log.status === filterStatus;
        const matchesVehicle = filterVehicle === 'All' || log.vehicle?._id === filterVehicle;
        const matchesDriver = filterDriver === 'All' || log.driver?._id === filterDriver;
        return matchesSearch && matchesStatus && matchesVehicle && matchesDriver;
    });


    const totalEstLoss = filteredLogs.reduce((sum, log) => sum + (Number(log.amount) || 0), 0);
    const resolvedCount = filteredLogs.filter(l => l.status === 'Resolved').length;

    // Helper to render status badge
    const StatusBadge = ({ status }) => {
        const getStyles = () => {
            switch (status) {
                case 'Resolved': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'rgba(16, 185, 129, 0.2)' };
                case 'In Repair': return { bg: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.2)' };
                default: return { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--primary)', border: 'rgba(245, 158, 11, 0.2)' };
            }
        };
        const styles = getStyles();
        return (
            <span style={{
                fontSize: '10px',
                backgroundColor: styles.bg,
                color: styles.color,
                border: `1px solid ${styles.border}`,
                padding: '4px 10px',
                borderRadius: '8px',
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
            }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: styles.color }}></span>
                {status}
            </span>
        );
    };

    return (
        <div className="container-fluid" style={{ paddingBottom: '60px', paddingTop: '20px' }}>
            <SEO title="Active Incident Logs" description="Track and manage vehicle accidents and incidents with precision." />

            {/* Premium Header */}
            <header style={{ marginBottom: '40px' }}>
                <div className="flex-resp" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                        <motion.div
                            initial={{ rotate: -10, scale: 0.9 }}
                            animate={{ rotate: 0, scale: 1 }}
                            style={{
                                width: '60px',
                                height: '60px',
                                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)',
                                borderRadius: '18px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                boxShadow: '0 10px 30px rgba(251, 191, 36, 0.3)',
                                flexShrink: 0
                            }}
                        >
                            <AlertTriangle size={32} color="#0f172a" />
                        </motion.div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)' }}></span>
                                <span style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Safety & Compliance</span>
                            </div>
                            <h1 style={{ color: 'white', fontSize: 'clamp(28px, 5vw, 36px)', fontWeight: '900', margin: 0, letterSpacing: '-1.5px' }}>
                                Active <span className="text-gradient-yellow">Incident Logs</span>
                            </h1>
                        </div>
                    </div>

                    <div className="flex-resp" style={{ gap: '12px' }}>
                        <button
                            className="btn-primary"
                            onClick={() => setShowModal(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                height: '54px',
                                padding: '0 28px',
                                borderRadius: '16px',
                                fontWeight: '900',
                                fontSize: '14px',
                                letterSpacing: '0.5px'
                            }}
                        >
                            <Plus size={22} strokeWidth={3} />
                            <span>NEW INCIDENT</span>
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex-resp" style={{ marginTop: '35px', gap: '15px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1', minWidth: 'min(100%, 350px)' }}>
                        <Search size={20} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                        <input
                            type="text"
                            placeholder="Search vehicle number, driver name, or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field"
                            style={{ paddingLeft: '55px', height: '54px', borderRadius: '18px', fontSize: '15px' }}
                        />
                    </div>

                    <div className="glass-card" style={{ padding: '4px', borderRadius: '20px', display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)' }}>
                        <select
                            value={filterVehicle}
                            onChange={(e) => setFilterVehicle(e.target.value)}
                            className="input-field"
                            style={{ height: '46px', border: 'none', background: 'transparent', width: '160px', fontWeight: '700', fontSize: '13px' }}
                        >
                            <option value="All" style={{ background: '#0f172a' }}>Filter Vehicles</option>
                            {vehicles.map(v => (
                                <option key={v._id} value={v._id} style={{ background: '#0f172a' }}>{v.carNumber}</option>
                            ))}
                        </select>
                        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 4px' }}></div>
                        <select
                            value={filterDriver}
                            onChange={(e) => setFilterDriver(e.target.value)}
                            className="input-field"
                            style={{ height: '46px', border: 'none', background: 'transparent', width: '160px', fontWeight: '700', fontSize: '13px' }}
                        >
                            <option value="All" style={{ background: '#0f172a' }}>Filter Drivers</option>
                            {drivers.map(d => (
                                <option key={d._id} value={d._id} style={{ background: '#0f172a' }}>{d.name}</option>
                            ))}
                        </select>
                        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 4px' }}></div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="input-field"
                            style={{ height: '46px', border: 'none', background: 'transparent', width: '140px', fontWeight: '700', fontSize: '13px' }}
                        >
                            <option value="All" style={{ background: '#0f172a' }}>All Status</option>
                            <option value="Pending" style={{ background: '#0f172a' }}>Pending</option>
                            <option value="In Repair" style={{ background: '#0f172a' }}>In Repair</option>
                            <option value="Resolved" style={{ background: '#0f172a' }}>Resolved</option>
                        </select>
                    </div>
                </div>

                <div className="flex-resp" style={{ gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '5px', borderRadius: '14px', display: 'flex', gap: '5px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'white', padding: '8px 12px', fontWeight: '800', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                            >
                                <option value="All" style={{ background: '#0f172a' }}>Full Year</option>
                                {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map(m => (
                                    <option key={m} value={m} style={{ background: '#0f172a' }}>
                                        {new Date(0, m - 1).toLocaleString('default', { month: 'short' })}
                                    </option>
                                ))}
                            </select>
                            <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', height: '20px', alignSelf: 'center' }}></div>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                style={{ background: 'transparent', border: 'none', color: 'var(--primary)', padding: '8px 12px', fontWeight: '900', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                            >
                                {[2023, 2024, 2025, 2026, 2027].map(y => (
                                    <option key={y} value={y} style={{ background: '#0f172a' }}>FY {y}-{String(y + 1).slice(-2)}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </header>

            {loading ? (
                <div style={{ padding: '100px', textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto', width: '40px', height: '40px' }}></div>
                    <p style={{ color: 'var(--text-muted)', marginTop: '20px', fontSize: '14px', fontWeight: '700', letterSpacing: '1px' }}>RETRIEVING SECURE DATA...</p>
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="glass-card" style={{ padding: '80px 40px', textAlign: 'center', borderStyle: 'dashed', borderWidth: '2px', background: 'rgba(255,255,255,0.01)' }}>
                    <div style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 25px' }}>
                        <AlertTriangle size={40} style={{ color: 'rgba(255,255,255,0.1)' }} />
                    </div>
                    <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '800' }}>No incidents recorded</h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '10px auto 0', lineHeight: '1.6' }}>The fleet is currently operating within safety parameters. Use the "New Incident" button if an event occurs.</p>
                </div>
            ) : (
                <>
                    {/* DESKTOP VIEW: PREMIUM TABLE */}
                    <div className="glass-card hide-mobile" style={{ padding: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.4)' }}>
                        <div className="table-responsive">
                            <table className="activity-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '20px 25px' }}>Incident Details</th>
                                        <th>Personnel</th>
                                        <th>Description</th>
                                        <th>Impact Cost</th>
                                        <th>Status</th>
                                        <th>Evidence</th>
                                        <th style={{ textAlign: 'right', paddingRight: '25px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.map((log, idx) => (
                                        <motion.tr
                                            key={log._id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="hover-row"
                                            style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '12px' }}
                                        >
                                            <td style={{ padding: '20px 25px', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                                                <div style={{ color: 'white', fontWeight: '800', fontSize: '14px' }}>{formatDateIST(log.date)}</div>
                                                <div style={{ color: 'rgba(251, 191, 36, 0.7)', fontSize: '11px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700' }}>
                                                    <MapPin size={12} /> {log.location || 'Not Specified'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: '800', fontSize: '13px', textTransform: 'uppercase' }}>
                                                        {log.driver?.name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div>
                                                        <div style={{ color: 'white', fontWeight: '700', fontSize: '13px' }}>{log.vehicle?.carNumber}</div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{log.driver?.name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '20px', maxWidth: '300px' }}>
                                                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', lineHeight: '1.5', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                    {log.description}
                                                </div>
                                            </td>
                                            <td style={{ padding: '20px' }}>
                                                <div style={{ color: '#f43f5e', fontWeight: '900', fontSize: '15px' }}>₹{Number(log.amount || 0).toLocaleString()}</div>
                                            </td>
                                            <td style={{ padding: '20px' }}>
                                                <StatusBadge status={log.status} />
                                            </td>
                                            <td style={{ padding: '20px' }}>
                                                {log.photos && log.photos.length > 0 ? (
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        {log.photos.slice(0, 3).map((p, i) => (
                                                            <motion.div
                                                                key={i}
                                                                whileHover={{ scale: 1.1 }}
                                                                style={{ position: 'relative', cursor: 'pointer' }}
                                                                onClick={() => setViewPhoto(p)}
                                                            >
                                                                <img
                                                                    src={p}
                                                                    style={{ width: '38px', height: '38px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
                                                                    alt="evidence"
                                                                />
                                                            </motion.div>
                                                        ))}
                                                        {log.photos.length > 3 && (
                                                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '11px', color: 'white', fontWeight: '800' }}>
                                                                +{log.photos.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontWeight: '600' }}>
                                                        <Camera size={14} /> NO EVIDENCE
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '20px 25px', textAlign: 'right', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                                                <button
                                                    onClick={() => handleDelete(log._id)}
                                                    style={{
                                                        background: 'rgba(244, 63, 94, 0.1)',
                                                        color: '#f43f5e',
                                                        border: '1px solid rgba(244, 63, 94, 0.2)',
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '10px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: '0.2s'
                                                    }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* MOBILE VIEW: ENHANCED CARDS */}
                    <div className="show-mobile">
                        <div style={{ display: 'grid', gap: '20px' }}>
                            {filteredLogs.map((log) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={log._id}
                                    className="glass-card"
                                    style={{ padding: '20px', background: 'rgba(30, 41, 59, 0.6)', borderRadius: '20px' }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <div style={{ width: '40px', height: '40px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--primary)' }}>
                                                <Car size={20} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '900', color: 'white', fontSize: '15px' }}>{log.vehicle?.carNumber || 'N/A'}</div>
                                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '600' }}>{log.driver?.name || 'Unknown Driver'}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: '#f43f5e', fontWeight: '900', fontSize: '18px' }}>₹{Number(log.amount || 0).toLocaleString()}</div>
                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', fontWeight: '700' }}>{formatDateIST(log.date)}</div>
                                        </div>
                                    </div>

                                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '15px', borderRadius: '14px', marginBottom: '18px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                                            <StatusBadge status={log.status} />
                                            <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.1)', margin: '0 5px' }}></div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--primary)', fontWeight: '700' }}>
                                                <MapPin size={12} /> {log.location || 'Unknown Loc'}
                                            </div>
                                        </div>
                                        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>{log.description}</p>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {log.photos && log.photos.slice(0, 4).map((p, i) => (
                                                <img
                                                    key={i}
                                                    src={p}
                                                    onClick={() => setViewPhoto(p)}
                                                    style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.08)' }}
                                                    alt="evidence"
                                                />
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => handleDelete(log._id)}
                                            style={{ background: 'rgba(244, 63, 94, 0.12)', color: '#f43f5e', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(244, 63, 94, 0.1)' }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* CREATE INCIDENT MODAL REFRESH */}
            <AnimatePresence>
                {showModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="glass-card modal-content"
                            style={{
                                maxWidth: '640px',
                                width: '100%',
                                maxHeight: '90vh',
                                padding: '40px',
                                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                                borderRadius: '28px',
                                border: '1px solid rgba(255,255,255,0.12)',
                                boxShadow: '0 30px 60px rgba(0,0,0,0.6)'
                            }}
                        >
                            <div className="modal-header" style={{ marginBottom: '35px', alignItems: 'flex-start' }}>
                                <div>
                                    <h2 style={{ fontSize: '28px', fontWeight: '900', color: 'white', margin: 0, letterSpacing: '-1px' }}>New Incident Report</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginTop: '6px', fontWeight: '600' }}>Comprehensive documentation for safety auditing.</p>
                                </div>
                                <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '8px', color: 'white' }}><XCircle size={24} /></button>
                            </div>

                            <form onSubmit={handleCreate}>
                                <div style={{ display: 'grid', gap: '25px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <label className="input-label" style={{ marginBottom: '10px', display: 'block' }}>Vehicle Identification</label>
                                            <select className="input-field" style={{ height: '54px', borderRadius: '15px' }} value={formData.vehicleId} onChange={e => setFormData({ ...formData, vehicleId: e.target.value })} required>
                                                <option value="" style={{ background: '#0f172a' }}>Select Vehicle</option>
                                                {vehicles.map(v => <option key={v._id} value={v._id} style={{ background: '#0f172a' }}>{v.carNumber} ({v.model})</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="input-label" style={{ marginBottom: '10px', display: 'block' }}>Personnel In-Charge</label>
                                            <select className="input-field" style={{ height: '54px', borderRadius: '15px' }} value={formData.driverId} onChange={e => setFormData({ ...formData, driverId: e.target.value })} required>
                                                <option value="" style={{ background: '#0f172a' }}>Select Driver</option>
                                                {drivers.map(d => <option key={d._id} value={d._id} style={{ background: '#0f172a' }}>{d.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <PremiumDateInput
                                                label="Incident Date"
                                                required
                                                value={formData.date}
                                                onChange={(v) => setFormData({ ...formData, date: v })}
                                            />
                                        </div>
                                        <div>
                                            <label className="input-label" style={{ marginBottom: '10px', display: 'block' }}>Estimated Recovery Cost</label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', fontWeight: '900', fontSize: '15px' }}>₹</span>
                                                <input type="number" className="input-field" style={{ height: '54px', borderRadius: '15px', paddingLeft: '35px' }} value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="input-label" style={{ marginBottom: '10px', display: 'block' }}>Precise Location</label>
                                        <div style={{ position: 'relative' }}>
                                            <MapPin size={18} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                                            <input type="text" className="input-field" style={{ height: '54px', borderRadius: '15px', paddingLeft: '50px' }} value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. NH-44, Near Toll Plaza" required />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="input-label" style={{ marginBottom: '10px', display: 'block' }}>Incident Narrative / Damage Details</label>
                                        <textarea className="input-field" style={{ minHeight: '100px', resize: 'vertical', borderRadius: '15px', paddingTop: '15px' }} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Provide a detailed description of the event and visible damages..." required />
                                    </div>

                                    <div>
                                        <label className="input-label" style={{ marginBottom: '10px', display: 'block' }}>Upload Evidence (Photos)</label>
                                        <div style={{ position: 'relative' }}>
                                            <input type="file" multiple onChange={e => setPhotos(e.target.files)} className="input-field" style={{ height: '54px', borderRadius: '15px', paddingTop: '15px', cursor: 'pointer', outline: 'none' }} />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="btn-primary"
                                        style={{ width: '100%', height: '60px', borderRadius: '18px', fontSize: '16px', fontWeight: '900', letterSpacing: '1px', marginTop: '10px', textTransform: 'uppercase' }}
                                    >
                                        {submitting ? 'PROCESSING SECURE RECORD...' : 'SUBMIT AUTHORIZED INCIDENT REPORT'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* HIGH-RES PHOTO LIGHTBOX */}
            <AnimatePresence>
                {viewPhoto && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setViewPhoto(null)}
                        style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(15px)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'zoom-out', padding: '40px' }}
                    >
                        <motion.img
                            initial={{ scale: 0.9, rotate: -2 }}
                            animate={{ scale: 1, rotate: 0 }}
                            src={viewPhoto}
                            style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '24px', boxShadow: '0 40px 100px rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}
                            alt="Incident Evidence"
                        />
                        <div style={{ position: 'absolute', top: '30px', right: '30px', background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '50%', padding: '10px' }}><XCircle size={32} /></div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ActiveLogs;
