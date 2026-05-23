import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { ShieldAlert, Upload, CheckCircle, AlertCircle, Calendar as CalendarIcon, Search, ChevronDown, ChevronRight, Car, Plus, Trash2, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompany } from '../context/CompanyContext';
import { useLocation } from 'react-router-dom';
import SEO from '../components/SEO';
import PremiumDateInput from '../components/common/PremiumDateInput';
import { todayIST, nowIST, formatDateIST } from '../utils/istUtils';

const BorderTax = () => {
    const { selectedCompany } = useCompany();
    const location = useLocation();
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [formData, setFormData] = useState({
        vehicleId: '',
        borderName: '',
        amount: '',
        date: '',
        remarks: '',
        driverId: ''
    });
    const [receiptPhoto, setReceiptPhoto] = useState(null);
    const [preview, setPreview] = useState(null);
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [searchTerm, setSearchTerm] = useState('');
    
    const [expandedVehicle, setExpandedVehicle] = useState(null); // Current vehicle being viewed in detail
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [viewingReceipt, setViewingReceipt] = useState(null); // For image modal

    useEffect(() => {
        setSearchTerm('');
        setExpandedVehicle(null);
        const now = new Date();
        setSelectedMonth(now.getMonth());
        setSelectedYear(now.getFullYear());
        setFormData({
            vehicleId: '',
            borderName: '',
            amount: '',
            date: '',
            remarks: '',
            driverId: ''
        });
        setReceiptPhoto(null);
        setPreview(null);
        setMessage({ type: '', text: '' });
    }, [location.pathname, location.key]);

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    const shiftMonth = (amount) => {
        let newMonth = selectedMonth + amount;
        let newYear = selectedYear;
        if (newMonth < 0) { newMonth = 11; newYear--; }
        if (newMonth > 11) { newMonth = 0; newYear++; }
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
    };

    useEffect(() => {
        if (selectedCompany) {
            fetchData();
            fetchEntries();
        }
    }, [selectedCompany]);

    const fetchData = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo')).token;
            const vehRes = await axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const dvrRes = await axios.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter out temporary duty cars (which have '#' in their carNumber)
            const cleanVehicles = (vehRes.data.vehicles || []).filter(v => typeof v.carNumber === 'string' && !v.carNumber.includes('#'));
            setVehicles(cleanVehicles);
            setDrivers(dvrRes.data.drivers || []);
        } catch (err) {
            console.error('Error fetching data', err);
        }
    };

    const fetchEntries = async () => {
        setLoading(true);
        try {
            const token = JSON.parse(localStorage.getItem('userInfo')).token;
            const { data } = await axios.get(`/api/admin/border-tax/${selectedCompany._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEntries(data);
        } catch (err) {
            console.error('Error fetching border tax entries', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setReceiptPhoto(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage({ type: '', text: '' });

        try {
            const token = JSON.parse(localStorage.getItem('userInfo')).token;
            const data = new FormData();
            Object.keys(formData).forEach(key => data.append(key, formData[key]));
            data.append('companyId', selectedCompany._id);
            if (receiptPhoto) data.append('receiptPhoto', receiptPhoto);

            await axios.post('/api/admin/border-tax', data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setMessage({ type: 'success', text: 'Border Tax recorded successfully!' });
            setFormData({
                vehicleId: formData.vehicleId, // Keep current vehicleId
                borderName: '',
                amount: '',
                date: '',
                remarks: '',
                driverId: formData.driverId // Keep current driverId
            });
            setReceiptPhoto(null);
            setPreview(null);
            fetchEntries();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to record entry' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this entry?')) return;
        try {
            const token = JSON.parse(localStorage.getItem('userInfo')).token;
            await axios.delete(`/api/admin/border-tax/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage({ type: 'success', text: 'Entry deleted successfully' });
            fetchEntries();
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to delete entry' });
        }
    };

    const totalMonthPaid = entries.filter(e => {
        const d = nowIST(e.date);
        return d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear;
    }).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const filteredVehicles = vehicles.filter(v =>
        v.carNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.model?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container-fluid" style={{ paddingBottom: '80px' }}>
            <SEO title="Border Tax Manager" description="Manage fleet state permits and border taxes." />

            {/* Premium Header */}
            <header className="flex-resp" style={{ 
                padding: '30px 0', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                gap: '24px' 
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(251, 191, 36, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShieldAlert color="var(--primary)" size={24} />
                    </div>
                    <div>
                        <h1 style={{ color: 'white', fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: '900', margin: 0, letterSpacing: '-1px' }}>
                            Border <span style={{ color: 'var(--primary)' }}>Tax</span>
                        </h1>
                        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase' }}>Permits & State Taxes</p>
                    </div>
                </div>

                <div style={{
                    padding: '10px 20px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px',
                    textAlign: 'right',
                    minWidth: '160px'
                }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', display: 'block' }}>{months[selectedMonth]} Total</span>
                    <span style={{ fontSize: '20px', fontWeight: '950', color: 'var(--primary)' }}>₹ {totalMonthPaid.toLocaleString()}</span>
                </div>
            </header>

            {/* Search & Filter Bar - Only in list view */}
            {/* Search & Filter Bar */}
            {!expandedVehicle && (
                <div className="flex-resp" style={{ marginBottom: '30px', gap: '15px' }}>
                    <div style={{ position: 'relative', flex: 2 }}>
                        <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                        <input
                            type="text"
                            placeholder="Search vehicle..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field"
                            style={{ paddingLeft: '45px', marginBottom: 0 }}
                        />
                    </div>

                    <div className="modal-form-grid" style={{ gap: '10px', flex: 1.5, alignItems: 'center', justifyContent: 'flex-end', display: 'flex' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <button
                                onClick={() => shiftMonth(-1)}
                                style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="input-field"
                                    style={{ height: '38px', fontSize: '12px', padding: '0 10px', width: '100px', background: 'transparent', border: 'none', marginBottom: 0 }}
                                >
                                    {months.map((m, idx) => <option key={m} value={idx} style={{ background: '#111' }}>{m}</option>)}
                                </select>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="input-field"
                                    style={{ height: '38px', fontSize: '12px', padding: '0 10px', width: '80px', background: 'transparent', border: 'none', marginBottom: 0 }}
                                >
                                    {years.map(y => <option key={y} value={y} style={{ background: '#111' }}>{y}</option>)}
                                </select>
                            </div>
                            <button
                                onClick={() => shiftMonth(1)}
                                style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <AnimatePresence mode="wait">
                {!expandedVehicle ? (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
                    >
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '100px', color: 'rgba(255,255,255,0.2)' }}>
                                <div className="spinner"></div>
                                <p style={{ marginTop: '20px', fontWeight: '700' }}>Fetching tax data...</p>
                            </div>
                        ) : filteredVehicles.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '100px', background: 'rgba(255,255,255,0.05)', borderRadius: '30px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                <Car size={40} color="rgba(255,255,255,0.1)" />
                                <p style={{ color: 'rgba(255,255,255,0.3)', marginTop: '15px', fontWeight: '600' }}>No vehicles found matching your search.</p>
                            </div>
                        ) : (
                            filteredVehicles.map(v => {
                                const vehicleMonthEntries = entries.filter(e => {
                                    const d = nowIST(e.date);
                                    return e.vehicle?._id === v._id && d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear;
                                });
                                const vehicleMonthTotal = vehicleMonthEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

                                return (
                                    <motion.div
                                        key={v._id}
                                        layout
                                        onClick={() => {
                                            setExpandedVehicle(v._id);
                                            setFormData(prev => ({ 
                                                ...prev, 
                                                vehicleId: v._id,
                                                driverId: v.currentDriver?._id || ''
                                            }));
                                            setMessage({ type: '', text: '' });
                                        }}
                                        style={{
                                            background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '24px',
                                            padding: '20px clamp(15px, 4vw, 30px)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: '20px',
                                            transition: 'all 0.3s ease'
                                        }}
                                        whileHover={{ background: 'rgba(255,255,255,0.08)', transform: 'translateY(-2px)' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1.2 }}>
                                            <div style={{
                                                width: '45px',
                                                height: '45px',
                                                borderRadius: '14px',
                                                background: 'rgba(255,255,255,0.05)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <Car size={22} color="rgba(255,255,255,0.4)" />
                                            </div>
                                            <div>
                                                <h3 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '900' }}>{v.carNumber}</h3>
                                                <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>{v.model || 'Standard Model'}</p>
                                            </div>
                                        </div>

                                        <div style={{ flex: 1 }} className="hide-mobile">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <Wallet size={12} color="rgba(255,255,255,0.3)" />
                                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase' }}>{months[selectedMonth]} Total</span>
                                            </div>
                                            <span style={{ fontSize: '22px', fontWeight: '900', color: vehicleMonthTotal > 0 ? '#10b981' : 'rgba(255,255,255,0.1)' }}>
                                                ₹ {vehicleMonthTotal.toLocaleString()}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                            <span className="hide-mobile" style={{
                                                fontSize: '10px',
                                                fontWeight: '800',
                                                padding: '6px 14px',
                                                borderRadius: '10px',
                                                background: 'rgba(255,255,255,0.05)',
                                                color: 'rgba(255,255,255,0.4)',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {vehicleMonthEntries.length} RECORDS
                                            </span>
                                            <div style={{ color: 'rgba(255,255,255,0.2)' }}>
                                                <ChevronRight size={24} />
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </motion.div>
                ) : (
                    /* Detailed View (The "New Page") */
                    <motion.div
                        key="detail"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                    >
                        {/* Detail Header / Breadcrumb */}
                        <div className="flex-resp" style={{ marginBottom: '30px', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                            <button 
                                onClick={() => setExpandedVehicle(null)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    padding: '12px 20px',
                                    color: 'white',
                                    fontWeight: '800',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    width: 'fit-content'
                                }}
                            >
                                <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /> BACK
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', textAlign: 'right' }}>
                                <div>
                                    <h2 style={{ color: 'white', margin: 0, fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: '900' }}>
                                        {vehicles.find(v => v._id === expandedVehicle)?.carNumber}
                                    </h2>
                                    <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase' }}>
                                        {vehicles.find(v => v._id === expandedVehicle)?.model}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                            {/* Entry Form Card */}
                            <div className="glass-card" style={{ 
                                padding: 'clamp(20px, 4vw, 30px)', 
                                background: 'rgba(251, 191, 36, 0.03)', 
                                border: '1px solid rgba(251, 191, 36, 0.1)',
                                borderRadius: '30px',
                                boxShadow: '0 20px 40px -20px rgba(0,0,0,0.5)'
                            }}>
                                <h4 style={{ color: 'white', fontSize: '14px', fontWeight: '900', marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Plus size={18} color="black" />
                                    </div>
                                    New Tax Entry
                                </h4>
                                <form onSubmit={handleSubmit} className="form-grid-2" style={{ gap: '20px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', letterSpacing: '0.5px' }}>LOCATION / BORDER</label>
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="Location name..."
                                            value={formData.borderName}
                                            onChange={e => setFormData({...formData, borderName: e.target.value})}
                                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', height: '52px', padding: '0 18px', color: 'white', outline: 'none', fontSize: '15px' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', letterSpacing: '0.5px' }}>ASSIGNED DRIVER</label>
                                        <select 
                                            value={formData.driverId}
                                            onChange={e => setFormData({...formData, driverId: e.target.value})}
                                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', height: '52px', padding: '0 18px', color: 'white', outline: 'none', fontSize: '15px', appearance: 'none' }}
                                        >
                                            <option value="">Select Driver</option>
                                            {drivers.map(d => <option key={d._id} value={d._id} style={{ background: '#111' }}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', letterSpacing: '0.5px' }}>AMOUNT PAID (₹)</label>
                                        <input 
                                            type="number" 
                                            required
                                            placeholder="0"
                                            value={formData.amount}
                                            onChange={e => setFormData({...formData, amount: e.target.value})}
                                            style={{ background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '14px', height: '52px', padding: '0 18px', color: 'var(--primary)', fontWeight: '900', outline: 'none', fontSize: '20px' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', letterSpacing: '0.5px' }}>TAX DATE</label>
                                        <PremiumDateInput
                                            value={formData.date}
                                            onChange={v => setFormData({ ...formData, date: v })}
                                            required
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', letterSpacing: '0.5px' }}>RECEIPT PHOTO</label>
                                        <div style={{ position: 'relative', height: '52px' }}>
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', cursor: 'pointer', zIndex: 2 }}
                                            />
                                            <div style={{ height: '100%', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                                                <Upload size={16} /> {receiptPhoto ? 'File Selected' : 'Tap to Upload'}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                        <button 
                                            type="submit"
                                            disabled={submitting}
                                            style={{ 
                                                width: '100%', 
                                                height: '52px', 
                                                background: 'var(--primary)', 
                                                color: 'black', 
                                                border: 'none', 
                                                borderRadius: '14px', 
                                                fontWeight: '950', 
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                boxShadow: '0 10px 20px -5px rgba(251, 191, 36, 0.3)',
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            {submitting ? 'PROCESSING...' : 'SAVE RECORD'}
                                        </button>
                                    </div>
                                </form>
                                {message.text && (
                                    <div style={{ marginTop: '20px', padding: '15px', borderRadius: '12px', background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)', color: message.type === 'success' ? '#10b981' : '#f43f5e', fontSize: '13px', fontWeight: '700', textAlign: 'center' }}>
                                        {message.text}
                                    </div>
                                )}
                            </div>

                            {/* History List Section */}
                            <div>
                                <h4 style={{ color: 'white', margin: '0 0 25px 0', fontSize: '15px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <CalendarIcon size={18} color="var(--primary)" /> 
                                    Recent Taxes
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {entries.filter(e => {
                                        const d = nowIST(e.date);
                                        return e.vehicle?._id === expandedVehicle && d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear;
                                    }).length === 0 ? (
                                        <div style={{ padding: '60px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '24px' }}>
                                            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', fontWeight: '700', margin: 0 }}>No records found for this period.</p>
                                        </div>
                                    ) : (
                                        entries.filter(e => {
                                            const d = nowIST(e.date);
                                            return e.vehicle?._id === expandedVehicle && d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear;
                                        }).map((entry, idx) => (
                                            <div key={idx} style={{
                                                padding: '20px',
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                borderRadius: '20px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: '15px',
                                                flexWrap: 'wrap'
                                            }}>
                                                <div style={{ flex: 1, minWidth: '150px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '18px', fontWeight: '950', color: 'var(--primary)' }}>₹{entry.amount}</span>
                                                        <span style={{ fontSize: '11px', fontWeight: '800', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '6px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{entry.borderName}</span>
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>
                                                        {formatDateIST(entry.date)} {entry.remarks && `• ${entry.remarks}`}
                                                    </div>
                                                </div>
                                                
                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                    {entry.receiptPhoto && (
                                                        <button 
                                                            onClick={() => setViewingReceipt(entry.receiptPhoto)}
                                                            className="glass-card"
                                                            style={{ padding: '8px 15px', fontSize: '10px', fontWeight: '900', color: '#14b8a6', border: '1px solid rgba(20,184,166,0.2)' }}
                                                        >
                                                            RECEIPT
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDelete(entry._id)} style={{ color: '#f43f5e', padding: '10px', background: 'rgba(244,63,94,0.1)', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Receipt Modal (In-App) */}
            <AnimatePresence>
                {viewingReceipt && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setViewingReceipt(null)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 1000,
                            background: 'rgba(0,0,0,0.9)',
                            backdropFilter: 'blur(10px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '40px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                position: 'relative',
                                maxWidth: '100%',
                                maxHeight: '100%',
                                boxShadow: '0 50px 100px -20px rgba(0,0,0,0.8)'
                            }}
                        >
                            <img 
                                src={viewingReceipt} 
                                alt="Receipt" 
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '90vh',
                                    borderRadius: '20px',
                                    border: '4px solid rgba(255,255,255,0.1)'
                                }} 
                            />
                            <button 
                                onClick={() => setViewingReceipt(null)}
                                style={{
                                    position: 'absolute',
                                    top: '-20px',
                                    right: '-20px',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: '#f43f5e',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 10px 20px rgba(0,0,0,0.5)'
                                }}
                            >
                                <Plus style={{ transform: 'rotate(45deg)' }} size={24} />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BorderTax;
