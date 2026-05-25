import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../api/axios';
import { Search, CreditCard, Plus, X, CheckCircle, AlertCircle, Download, History, Zap, Car, Filter, ArrowUpRight, ArrowDownLeft, ChevronDown, Calendar as CalendarIcon, ChevronRight, Wallet, Edit2, Trash2 } from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import * as XLSX from 'xlsx-js-style';
import { todayIST, formatDateIST, nowIST } from '../utils/istUtils';

const Fastag = () => {
    const { selectedCompany } = useCompany();
    const location = useLocation();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedVehicle, setExpandedVehicle] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        setSearchTerm('');
        const now = new Date();
        setSelectedMonth(now.getMonth());
        setSelectedYear(now.getFullYear());
        setExpandedVehicle(null);
        setShowModal(false);
        setIsEditing(false);
        setEditingEntryId(null);
        setRechargeData({ amount: '', method: 'UPI', remarks: '', date: '' });
    }, [location.pathname, location.key]);

    const shiftMonth = (amount) => {
        let newMonth = selectedMonth + amount;
        let newYear = selectedYear;
        if (newMonth < 0) { newMonth = 11; newYear--; }
        if (newMonth > 11) { newMonth = 0; newYear++; }
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
    };

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    // Recharge Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [rechargeData, setRechargeData] = useState({
        amount: '',
        method: 'UPI',
        remarks: '',
        date: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState(null);

    useEffect(() => {
        if (selectedCompany) {
            fetchVehicles();
        }
    }, [selectedCompany]);

    const fetchVehicles = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=all`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            const fetchedVehicles = data.vehicles || [];

            const cleanedVehicles = fetchedVehicles
                .filter(v => v.isOutsideCar !== true)
                .map(v => ({
                    ...v,
                    displayCarNumber: v.carNumber ? v.carNumber.split('#')[0] : 'Unknown',
                    // Sort history inside vehicle
                    fastagHistory: (v.fastagHistory || []).sort((a, b) => nowIST(b.date) - nowIST(a.date))
                }));

            setVehicles(cleanedVehicles);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleRecharge = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage({ type: '', text: '' });

        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            if (isEditing) {
                await axios.put(`/api/admin/vehicles/${selectedVehicle._id}/fastag-recharge/${editingEntryId}`, rechargeData, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });
                setMessage({ type: 'success', text: 'Update Successful!' });
            } else {
                await axios.post(`/api/admin/vehicles/${selectedVehicle._id}/fastag-recharge`, rechargeData, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });
                setMessage({ type: 'success', text: 'Recharge Successful!' });
            }

            setTimeout(() => {
                closeModal();
                fetchVehicles();
            }, 1000);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to process request' });
        } finally {
            setSubmitting(false);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setIsEditing(false);
        setEditingEntryId(null);
        setRechargeData({ amount: '', method: 'UPI', remarks: '', date: '' });
        setMessage({ type: '', text: '' });
    };

    const openEditModal = (vehicle, history) => {
        setSelectedVehicle(vehicle);
        setEditingEntryId(history._id);
        const histDate = history.date ? (typeof history.date === 'string' ? history.date.split('T')[0] : new Date(history.date).toISOString().split('T')[0]) : todayIST();
        setRechargeData({
            amount: history.amount,
            method: history.method || 'Manual',
            remarks: history.remarks || '',
            date: histDate
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = async (vehicleId, historyId) => {
        if (!window.confirm('Are you sure you want to delete this entry? This will also adjust the vehicle balance.')) return;
        
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.delete(`/api/admin/vehicles/${vehicleId}/fastag-recharge/${historyId}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            fetchVehicles();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete');
        }
    };

    const filteredVehicles = vehicles.filter(v =>
        v.displayCarNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.fastagNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalFleetBalance = vehicles.reduce((sum, v) => sum + (v.fastagBalance || 0), 0);

    return (
        <div className="container-fluid" style={{ paddingBottom: '80px' }}>
            <SEO title="Fastag Wallet" description="Manage fleet Fastag balances and history." />

            {/* Premium Header */}
            <header className="flex-resp" style={{ 
                padding: '40px 0', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                gap: '24px' 
            }}>
                <div className="flex-resp" style={{ gap: '15px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Wallet color="var(--primary)" size={20} />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(251, 191, 36, 0.8)', letterSpacing: '2px', textTransform: 'uppercase' }}>Fleet Wallet</span>
                    </div>
                    <h1 style={{ color: 'white', fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: '900', margin: 0, letterSpacing: '-1.5px' }}>
                        Fastag <span style={{ color: 'var(--primary)' }}>Manager</span>
                    </h1>
                </div>

                <div className="flex-resp" style={{ gap: '15px', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {(() => {
                        const totalCompanyMonth = vehicles.reduce((sum, v) => {
                            const monthTotal = (v.fastagHistory || []).filter(h => {
                                const d = nowIST(h.date);
                                return d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear;
                            }).reduce((s, h) => s + (Number(h.amount) || 0), 0);
                            return sum + monthTotal;
                        }, 0);
                        return (
                            <div style={{
                                padding: '12px 24px',
                                background: 'rgba(251, 191, 36, 0.05)',
                                border: '1px solid rgba(251, 191, 36, 0.15)',
                                borderRadius: '20px',
                                display: 'flex',
                                flexDirection: 'column',
                                textAlign: 'right',
                                backdropFilter: 'blur(10px)',
                                minWidth: '160px'
                            }}>
                                <span style={{ fontSize: '9px', color: 'rgba(251, 191, 36, 0.5)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>{months[selectedMonth]} Total Spent</span>
                                <span style={{ fontSize: '22px', fontWeight: '900', color: 'var(--primary)', textShadow: '0 0 20px rgba(251, 191, 36, 0.2)' }}>₹ {totalCompanyMonth.toLocaleString()}</span>
                            </div>
                        );
                    })()}

                    <button
                        onClick={() => { setSelectedVehicle(null); setIsEditing(false); setShowModal(true); }}
                        style={{
                            padding: '16px 28px',
                            background: 'var(--primary)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '18px',
                            fontWeight: '900',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            boxShadow: '0 15px 30px -10px rgba(251, 191, 36, 0.4)',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <Plus size={18} />
                        <span className="hide-mobile">New Recharge</span><span className="show-mobile">Recharge</span>
                    </button>
                </div>
            </header>

            {/* Search & Filter Bar */}
            <div className="flex-resp" style={{
                marginBottom: '30px',
                background: 'rgba(255,255,255,0.05)',
                padding: '10px',
                borderRadius: '22px',
                border: '1px solid rgba(255,255,255,0.05)',
                gap: '10px'
            }}>
                <div style={{ position: 'relative', flex: 1.5, minWidth: '220px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                    <input
                        type="text"
                        placeholder="Search vehicle number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            height: '56px',
                            background: 'transparent',
                            border: 'none',
                            paddingLeft: '55px',
                            color: 'white',
                            fontSize: '15px',
                            fontWeight: '600',
                            outline: 'none'
                        }}
                    />
                </div>

                <div className="modal-form-grid" style={{ gap: '10px', flex: 1, minWidth: '380px', alignItems: 'center', justifyContent: 'flex-end', display: 'flex' }}>
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
                                style={{ height: '38px', fontSize: '12px', padding: '0 10px', width: '100px', background: 'transparent', border: 'none' }}
                            >
                                {months.map((m, idx) => <option key={m} value={idx} style={{ background: '#111', color: 'white' }}>{m}</option>)}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="input-field"
                                style={{ height: '38px', fontSize: '12px', padding: '0 10px', width: '80px', background: 'transparent', border: 'none' }}
                            >
                                {years.map(y => <option key={y} value={y} style={{ background: '#111', color: 'white' }}>{y}</option>)}
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

            {/* Vehicle List Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px', color: 'rgba(255,255,255,0.2)' }}>
                        <div className="spinner"></div>
                        <p style={{ marginTop: '20px', fontWeight: '700' }}>Fetching wallet data...</p>
                    </div>
                ) : filteredVehicles.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '100px', background: 'rgba(255,255,255,0.05)', borderRadius: '30px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <Car size={40} color="rgba(255,255,255,0.1)" />
                        <p style={{ color: 'rgba(255,255,255,0.3)', marginTop: '15px', fontWeight: '600' }}>No vehicles found matching your search.</p>
                    </div>
                ) : (
                    filteredVehicles.map(v => {
                        const monthUsage = (v.fastagHistory || []).filter(h => {
                            const d = nowIST(h.date);
                            return d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear;
                        }).reduce((sum, h) => sum + (Number(h.amount) || 0), 0);

                        return (
                            <div key={v._id} style={{ display: 'flex', flexDirection: 'column' }}>
                                <motion.div
                                    layout
                                    onClick={() => setExpandedVehicle(expandedVehicle === v._id ? null : v._id)}
                                    className="fastag-row"
                                    style={{
                                        background: expandedVehicle === v._id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: expandedVehicle === v._id ? '28px 28px 0 0' : '24px',
                                        padding: '20px clamp(15px, 4vw, 30px)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '20px',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
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
                                            <h3 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '900' }}>{v.displayCarNumber}</h3>
                                            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>{v.model || 'Unknown Model'}</p>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right', flex: 1 }} className="hide-mobile">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', justifyContent: 'flex-end' }}>
                                            <Zap size={12} color="var(--primary)" />
                                            <span style={{ fontSize: '10px', color: 'rgba(251, 191, 36, 0.6)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>{months[selectedMonth]} Added</span>
                                        </div>
                                        <span style={{ fontSize: '24px', fontWeight: '950', color: monthUsage > 0 ? 'white' : 'rgba(255,255,255,0.05)' }}>
                                            ₹ {monthUsage.toLocaleString()}
                                        </span>
                                    </div>

                                    <div style={{ color: 'rgba(255,255,255,0.2)', marginLeft: '10px' }}>
                                        <ChevronRight size={24} style={{ transform: expandedVehicle === v._id ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.3s' }} />
                                    </div>
                                </motion.div>

                                <AnimatePresence>
                                    {expandedVehicle === v._id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            style={{
                                                overflow: 'hidden',
                                                background: 'rgba(255,255,255,0.015)',
                                                borderRadius: '0 0 28px 28px',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                borderTop: 'none'
                                            }}
                                        >
                                            <div style={{ padding: '25px clamp(15px, 4vw, 30px)' }}>
                                                <div className="flex-resp" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                    <div style={{ display: 'flex', gap: 'clamp(15px, 4vw, 30px)' }}>
                                                        <div>
                                                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>Balance</div>
                                                            <div style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>₹ {(v.fastagBalance || 0).toLocaleString()}</div>
                                                        </div>
                                                        <div className="hide-mobile">
                                                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>Transactions</div>
                                                            <div style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>{(v.fastagHistory || []).filter(h => {
                                                                const d = nowIST(h.date);
                                                                return d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear;
                                                            }).length}</div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setSelectedVehicle(v); setShowModal(true); }}
                                                        style={{
                                                            padding: '10px 20px',
                                                            background: 'rgba(251, 191, 36, 0.1)',
                                                            color: 'var(--primary)',
                                                            border: '1px solid rgba(251, 191, 36, 0.2)',
                                                            borderRadius: '12px',
                                                            fontSize: '12px',
                                                            fontWeight: '800',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            width: '100%',
                                                            maxWidth: '200px',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        <Plus size={14} /> RECHARGE
                                                    </button>
                                                </div>

                                                <h4 style={{ color: 'rgba(255,255,255,0.4)', margin: '0 0 15px 0', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                    Payment History
                                                </h4>

                                                <div className="scroll-x">
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '600px' }}>
                                                {(() => {
                                                    const filteredHistory = (v.fastagHistory || []).filter(h => {
                                                        const d = nowIST(h.date);
                                                        return d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear;
                                                    });

                                                    if (filteredHistory.length === 0) {
                                                        return (
                                                            <div style={{ padding: '30px', textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '13px', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '15px', minWidth: 'auto' }}>
                                                                No history found for {months[selectedMonth]}.
                                                            </div>
                                                        );
                                                    }

                                                    return filteredHistory.map((h, idx) => (
                                                        <div key={idx} style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: 'minmax(100px, 120px) 100px 1fr 100px',
                                                            padding: '15px 20px',
                                                            background: 'rgba(255,255,255,0.02)',
                                                            borderRadius: '14px',
                                                            alignItems: 'center',
                                                            gap: '15px'
                                                        }}>
                                                            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '700' }}>
                                                                {formatDateIST(h.date)}
                                                            </div>
                                                            <div style={{ color: '#10b981', fontSize: '14px', fontWeight: '900' }}>
                                                                +₹ {h.amount}
                                                            </div>
                                                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                                {h.remarks || 'Wallet Recharge'}
                                                            </div>
                                                            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                                                                <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', color: 'rgba(255,255,255,0.4)', fontWeight: '800' }}>
                                                                    {h.method}
                                                                </span>
                                                                <button 
                                                                    onClick={() => openEditModal(v, h)}
                                                                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.3)', width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                >
                                                                    <Edit2 size={12} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDelete(v._id, h._id)}
                                                                    style={{ background: 'rgba(244, 63, 94, 0.05)', border: 'none', color: '#f43f5e', width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ));
                                                })()}
                                                </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal Standardization */}
            <AnimatePresence>
                {showModal && (
                    <div className="modal-overlay">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 10 }}
                            className="modal-content-wrapper"
                            style={{ maxWidth: '520px', padding: 'clamp(20px, 5vw, 40px)' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                <div>
                                    <h2 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: '900' }}>
                                        {isEditing ? 'Edit Recharge' : 'New Recharge'}
                                    </h2>
                                    {selectedVehicle && (
                                        <p style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '12px', margin: '4px 0 0' }}>
                                            {selectedVehicle.displayCarNumber}
                                        </p>
                                    )}
                                </div>
                                <button className="glass-card" onClick={closeModal} style={{ padding: '10px', borderRadius: '50%', color: 'white' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleRecharge}>
                                <div className="modal-form-grid">
                                    {!selectedVehicle && (
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label className="input-label">Select Vehicle</label>
                                            <select
                                                required
                                                className="input-field"
                                                value={selectedVehicle?._id || ''}
                                                onChange={(e) => setSelectedVehicle(vehicles.find(v => v._id === e.target.value))}
                                            >
                                                <option value="">Choose vehicle...</option>
                                                {vehicles.map(v => (
                                                    <option key={v._id} value={v._id}>{v.displayCarNumber}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label className="input-label">Recharge Amount (₹)</label>
                                        <input
                                            type="number"
                                            required
                                            className="input-field"
                                            placeholder="0.00"
                                            value={rechargeData.amount}
                                            onChange={(e) => setRechargeData({ ...rechargeData, amount: e.target.value })}
                                            style={{ fontSize: '20px', fontWeight: '900', color: 'var(--primary)' }}
                                        />
                                    </div>

                                    <div>
                                        <label className="input-label">Payment Method</label>
                                        <select
                                            className="input-field"
                                            value={rechargeData.method}
                                            onChange={(e) => setRechargeData({ ...rechargeData, method: e.target.value })}
                                        >
                                            <option value="UPI">UPI</option>
                                            <option value="Cash">Cash</option>
                                            <option value="Bank">Bank</option>
                                            <option value="Card">Card</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="input-label">Date</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                id="fastag-recharge-date-picker"
                                                type="date"
                                                required
                                                className="input-field"
                                                value={rechargeData.date}
                                                onChange={(e) => setRechargeData({ ...rechargeData, date: e.target.value })}
                                                onClick={(e) => e.target.showPicker()}
                                                style={{ width: '100%', height: '56px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: 'white', padding: '0 15px', cursor: 'pointer', outline: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label className="input-label">Remarks</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="Optional note..."
                                            value={rechargeData.remarks}
                                            onChange={(e) => setRechargeData({ ...rechargeData, remarks: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {message.text && (
                                    <div style={{ marginTop: '20px', padding: '15px', borderRadius: '12px', background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)', color: message.type === 'success' ? '#10b981' : '#f43f5e', fontSize: '13px', fontWeight: '700' }}>
                                        {message.text}
                                    </div>
                                )}

                                <div className="modal-form-grid" style={{ marginTop: '30px' }}>
                                    <button className="btn-primary" type="submit" disabled={submitting} style={{ height: '56px', fontWeight: '900' }}>
                                        {submitting ? 'Processing...' : (isEditing ? 'Update Entry' : 'Confirm Recharge')}
                                    </button>
                                    <button className="glass-card" type="button" onClick={closeModal} style={{ height: '56px', fontWeight: '800' }}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Fastag;
