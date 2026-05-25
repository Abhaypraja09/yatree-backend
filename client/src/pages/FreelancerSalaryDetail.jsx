import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../api/axios';
import { ArrowLeft, Car, ParkingSquare, Wallet, TrendingDown, IndianRupee, Plus, X, User, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import { useCompany } from '../context/CompanyContext';
import { formatDateIST, toISTDateString, todayIST } from '../utils/istUtils';

const FreelancerSalaryDetail = () => {
    const { driverId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { selectedCompany } = useCompany();

    const urlMonth = parseInt(searchParams.get('month')) || new Date().getMonth() + 1;
    const urlYear = parseInt(searchParams.get('year')) || new Date().getFullYear();
    const urlFrom = searchParams.get('from') || '';
    const urlTo = searchParams.get('to') || '';

    const [month, setMonth] = useState(urlMonth);
    const [year, setYear] = useState(urlYear);
    const [fromDate, setFromDate] = useState(urlFrom);
    const [toDate, setToDate] = useState(urlTo);
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);

    // Advance form
    const [showAdvanceModal, setShowAdvanceModal] = useState(false);
    const [editingAdvance, setEditingAdvance] = useState(null);
    const [advanceData, setAdvanceData] = useState({ amount: '', remark: '', date: todayIST() });
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            let endpoint = `/api/admin/salary-details/${driverId}?`;
            if (fromDate && toDate) {
                endpoint += `from=${fromDate}&to=${toDate}`;
            } else {
                endpoint += `month=${month}&year=${year}`;
            }
            const { data } = await axios.get(endpoint, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setDetails(data);
        } catch (err) {
            console.error('Error fetching freelancer salary details:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (driverId) fetchDetails();
    }, [driverId, month, year, fromDate, toDate]);

    const handleSaveAdvance = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            if (editingAdvance) {
                // Update
                await axios.put(`/api/admin/advances/${editingAdvance._id}`, {
                    ...advanceData
                }, { headers: { Authorization: `Bearer ${userInfo.token}` } });
                setMessage({ type: 'success', text: 'Payment updated!' });
            } else {
                // Create
                await axios.post('/api/admin/advances', {
                    ...advanceData,
                    driverId,
                    companyId: selectedCompany?._id
                }, { headers: { Authorization: `Bearer ${userInfo.token}` } });
                setMessage({ type: 'success', text: 'Payment recorded!' });
            }
            
            setTimeout(() => {
                setShowAdvanceModal(false);
                setEditingAdvance(null);
                setAdvanceData({ amount: '', remark: '', date: todayIST() });
                setMessage({ type: '', text: '' });
                fetchDetails();
            }, 1200);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save payment' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAdvance = async (advId) => {
        if (!window.confirm('Are you sure you want to delete this payment record?')) return;
        
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.delete(`/api/admin/advances/${advId}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            fetchDetails();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete payment');
        }
    };

    const openEditModal = (adv) => {
        setEditingAdvance(adv);
        setAdvanceData({
            amount: adv.amount,
            remark: adv.remark,
            date: toISTDateString(adv.date)
        });
        setShowAdvanceModal(true);
    };

    const det = details;
    const driverName = det?.driver?.name || '';
    const summary = det?.summary || {};
    const totalWages = summary.totalWages || 0;
    const parkingTotal = summary.parkingTotal || 0;
    const totalBonuses = summary.totalBonuses || 0;
    const totalAdvances = summary.totalAdvances || 0;
    const grandTotal = summary.grandTotal || 0;
    const netPayable = summary.netPayable || 0;

    return (
        <div className="container-fluid" style={{ paddingBottom: '60px' }}>
            <SEO title={`${driverName} · Salary Detail`} description="Freelancer salary breakdown" />

            {/* Header */}
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', padding: '30px 0 20px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={() => navigate(`/admin/freelancers?tab=accounts`, { state: { from: fromDate, to: toDate } })}
                        style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.05))', borderRadius: '14px', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={22} color="#818cf8" />
                    </div>
                    <div>
                        <div style={{ fontSize: '10px', fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '2px' }}>
                            {fromDate && toDate ? `${formatDateIST(fromDate)} TO ${formatDateIST(toDate)}` : `Freelancer · Salary Report`}
                        </div>
                        <h1 style={{ color: 'white', fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>
                            {driverName || 'Loading...'}
                        </h1>
                    </div>
                </div>

                {/* Month/Year Selects + Add Payment */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: 'white', fontWeight: '800', fontSize: '13px', padding: '0 14px', height: '42px', borderRadius: '14px', outline: 'none', cursor: 'pointer' }}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m} style={{ background: '#0f172a' }}>
                                {new Date(0, m - 1).toLocaleString('default', { month: 'long' })}
                            </option>
                        ))}
                    </select>
                    <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: 'white', fontWeight: '800', fontSize: '13px', padding: '0 14px', height: '42px', borderRadius: '14px', outline: 'none', cursor: 'pointer' }}>
                        {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y} style={{ background: '#0f172a' }}>{y}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowAdvanceModal(true)}
                        className="btn-primary"
                        style={{ height: '42px', padding: '0 20px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '900' }}
                    >
                        <Plus size={16} /> RECORD PAYMENT
                    </button>
                </div>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '80px', color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>Loading salary data...</div>
            ) : !det ? (
                <div style={{ textAlign: 'center', padding: '80px', color: 'rgba(255,255,255,0.4)' }}>No data found for this period.</div>
            ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '16px', marginBottom: '30px' }}>
                        {[
                            { icon: Car, color: '#38bdf8', borderColor: 'rgba(14,165,233,0.2)', bg: 'rgba(14,165,233,0.08)', label: 'WAGES', value: `₹${totalWages.toLocaleString()}`, sub: `${summary.workingDays || 0} duty days` },
                            { icon: IndianRupee, color: '#a855f7', borderColor: 'rgba(168,85,247,0.2)', bg: 'rgba(168,85,247,0.08)', label: 'BONUSES', value: `₹${totalBonuses.toLocaleString()}`, sub: `T/A + Night Stay` },
                            { icon: ParkingSquare, color: 'var(--primary)', borderColor: 'rgba(245,158,11,0.2)', bg: 'rgba(245,158,11,0.08)', label: 'PARKING', value: `₹${parkingTotal.toLocaleString()}`, sub: `${det?.parkingEntries?.length || 0} entries` },
                            { icon: Wallet, color: '#10b981', borderColor: 'rgba(16,185,129,0.2)', bg: 'rgba(16,185,129,0.08)', label: 'GROSS EARNED', value: `₹${grandTotal.toLocaleString()}`, sub: 'Wages + Bonuses + Parking' },
                            { icon: TrendingDown, color: '#f43f5e', borderColor: 'rgba(244,63,94,0.2)', bg: 'rgba(244,63,94,0.08)', label: 'PAID / ADVANCE', value: `₹${totalAdvances.toLocaleString()}`, sub: `${det?.advances?.length || 0} payments` },
                        ].map(({ icon: Icon, color, borderColor, bg, label, value, sub }) => (
                            <div key={label} style={{ background: bg, border: `1px solid ${borderColor}`, borderRadius: '20px', padding: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <Icon size={15} color={color} />
                                    <span style={{ fontSize: '10px', color, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                                </div>
                                <div style={{ color: 'white', fontWeight: '900', fontSize: '22px' }}>{value}</div>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '3px' }}>{sub}</div>
                            </div>
                        ))}
                    </div>

                    {/* Net Payable Banner */}
                    <div style={{
                        background: netPayable >= 0 ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))' : 'linear-gradient(135deg, rgba(244,63,94,0.12), rgba(244,63,94,0.04))',
                        border: `1px solid ${netPayable >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
                        borderRadius: '20px', padding: '20px 28px', marginBottom: '30px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'
                    }}>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: '900', color: netPayable >= 0 ? '#10b981' : '#f43f5e', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                                Net Payable — {fromDate && toDate ? `${formatDateIST(fromDate)} to ${formatDateIST(toDate)}` : `${new Date(0, month - 1).toLocaleString('default', { month: 'long' })} ${year}`}
                            </div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                                ₹{grandTotal.toLocaleString()} earned &minus; ₹{totalAdvances.toLocaleString()} paid
                            </div>
                        </div>
                        <div style={{ color: netPayable >= 0 ? '#10b981' : '#f43f5e', fontWeight: '900', fontSize: '32px', letterSpacing: '-1px' }}>
                            ₹{Math.abs(netPayable).toLocaleString()}
                        </div>
                    </div>

                    {/* Duty Breakdown Table */}
                    <h3 style={{ fontSize: '14px', color: 'white', marginBottom: '16px', borderLeft: '3px solid #818cf8', paddingLeft: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Duty Calendar — Earnings
                    </h3>
                    <div style={{ overflowX: 'auto', marginBottom: '36px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '700px' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    {['Date', 'WAGES', 'T/A', 'Night Stay', 'Parking', 'Total'].map(h => (
                                        <th key={h} style={{ padding: '14px 18px', textAlign: h === 'Date' ? 'left' : 'right', color: h === 'Total' ? '#10b981' : 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.8px', width: (h === 'Total' || h === 'Parking' || h === 'T/A' || h === 'Night Stay') ? '110px' : 'auto' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {det?.breakdown?.map((day, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td style={{ padding: '14px 18px', color: 'white' }}>
                                            {formatDateIST(day.date)}
                                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{day.type || 'Duty'}</div>
                                            {day.remarks && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>{day.remarks}</div>}
                                        </td>
                                        <td style={{ padding: '14px 18px', textAlign: 'right', color: 'rgba(255,255,255,0.7)' }}>₹{day.wage || 0}</td>
                                        <td style={{ padding: '14px 18px', textAlign: 'right', color: 'var(--primary)', fontWeight: '600' }}>₹{day.sameDayReturn || 0}</td>
                                        <td style={{ padding: '14px 18px', textAlign: 'right', color: '#ca8a04', fontWeight: '600' }}>₹{day.nightStay || 0}</td>
                                        <td style={{ padding: '14px 18px', textAlign: 'right', color: 'var(--primary)', fontWeight: '800' }}>₹{day.parking || 0}</td>
                                        <td style={{ padding: '14px 18px', textAlign: 'right', color: '#10b981', fontWeight: '800' }}>₹{(day.total || 0).toLocaleString()}</td>
                                    </tr>
                                ))}
                                {/* Standalone Parking (no attendance) */}
                                {det?.parkingEntries?.filter(p => {
                                    const pDateStr = toISTDateString(p.date);
                                    return !det?.breakdown?.some(d => d.date === pDateStr);
                                }).map((p, idx) => (
                                    <tr key={`p-${idx}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(245,158,11,0.02)' }}>
                                        <td style={{ padding: '14px 18px', color: 'white' }}>
                                            {formatDateIST(p.date)}
                                            <div style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: '800', marginTop: '2px' }}>STANDALONE PARKING</div>
                                        </td>
                                        <td style={{ padding: '14px 18px', textAlign: 'right', color: 'rgba(255,255,255,0.3)' }}>—</td>
                                        <td style={{ padding: '14px 18px', textAlign: 'right', color: 'rgba(255,255,255,0.3)' }}>—</td>
                                        <td style={{ padding: '14px 18px', textAlign: 'right', color: 'rgba(255,255,255,0.3)' }}>—</td>
                                        <td style={{ padding: '14px 18px', textAlign: 'right', color: 'var(--primary)', fontWeight: '800' }}>₹{(p.amount || 0).toLocaleString()}</td>
                                        <td style={{ padding: '14px 18px', textAlign: 'right', color: '#10b981', fontWeight: '800' }}>₹{(p.amount || 0).toLocaleString()}</td>
                                    </tr>
                                ))}
                                {det?.breakdown?.length === 0 && (
                                    <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No completed duties found this month.</td></tr>
                                )}
                                {/* Grand Total Row */}
                                {det?.breakdown?.length > 0 && (
                                    <tr style={{ background: 'rgba(16,185,129,0.05)', borderTop: '2px solid rgba(16,185,129,0.15)' }}>
                                        <td colSpan="5" style={{ padding: '16px 18px', color: '#10b981', fontWeight: '900', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Grand Total (Wages + Bonuses + Parking)</td>
                                        <td style={{ padding: '16px 18px', textAlign: 'right', color: '#10b981', fontWeight: '900', fontSize: '16px' }}>₹{grandTotal.toLocaleString()}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Advances / Payments Table */}
                    <h3 style={{ fontSize: '14px', color: 'white', marginBottom: '16px', borderLeft: '3px solid #f43f5e', paddingLeft: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Payments Issued — This Month
                    </h3>
                    <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <th style={{ padding: '14px 18px', textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Date</th>
                                    <th style={{ padding: '14px 18px', textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Remark</th>
                                    <th style={{ padding: '14px 18px', textAlign: 'right', color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Amount</th>
                                    <th style={{ padding: '14px 18px', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.8px', width: '100px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {det?.advances?.map((adv, idx) => (
                                    <tr key={adv._id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td style={{ padding: '14px 18px', color: 'white' }}>{formatDateIST(adv.date)}</td>
                                        <td style={{ padding: '14px 18px', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>{adv.remark || '—'}</td>
                                        <td style={{ padding: '14px 18px', textAlign: 'right', color: '#f43f5e', fontWeight: '800' }}>₹{adv.amount?.toLocaleString()}</td>
                                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                                <button onClick={() => openEditModal(adv)} style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '4px' }} title="Edit"><Edit2 size={14} /></button>
                                                <button onClick={() => handleDeleteAdvance(adv._id)} style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '4px' }} title="Delete"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {det?.advances?.length === 0 && (
                                    <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No payments recorded this month.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* Record Payment Modal */}
            <AnimatePresence>
                {showAdvanceModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                            className="glass-card" style={{ width: '100%', maxWidth: '460px', padding: '40px', border: '1px solid rgba(255,255,255,0.1)', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '28px' }}>
                                <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '900', margin: 0 }}>{editingAdvance ? 'Edit Payment' : 'Record Payment'}</h2>
                                <button onClick={() => { setShowAdvanceModal(false); setEditingAdvance(null); setAdvanceData({ amount: '', remark: '', date: todayIST() }); setMessage({ type: '', text: '' }); }} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSaveAdvance} style={{ display: 'grid', gap: '18px' }}>
                                <div>
                                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Amount (₹)</label>
                                    <input type="number" className="input-field" required value={advanceData.amount} onChange={(e) => setAdvanceData({ ...advanceData, amount: e.target.value })} style={{ width: '100%', height: '50px' }} placeholder="₹ 0" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Date</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            readOnly
                                            className="input-field"
                                            value={advanceData.date ? formatDateIST(advanceData.date) : ''}
                                            onClick={() => document.getElementById('payment-date-picker').showPicker()}
                                            style={{ width: '100%', height: '50px', cursor: 'pointer' }}
                                        />
                                        <input
                                            id="payment-date-picker"
                                            type="date"
                                            className="input-field"
                                            required
                                            value={advanceData.date}
                                            onChange={(e) => setAdvanceData({ ...advanceData, date: e.target.value })}
                                            onClick={(e) => e.target.showPicker()}
                                            style={{ position: 'absolute', opacity: 0, inset: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Remark</label>
                                    <input type="text" className="input-field" value={advanceData.remark} onChange={(e) => setAdvanceData({ ...advanceData, remark: e.target.value })} style={{ width: '100%', height: '50px' }} placeholder="e.g. Daily payment, Advance..." />
                                </div>
                                {message.text && (
                                    <div style={{ padding: '12px', borderRadius: '10px', background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', color: message.type === 'success' ? '#10b981' : '#f43f5e', border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`, fontSize: '13px', fontWeight: '700' }}>
                                        {message.text}
                                    </div>
                                )}
                                <button type="submit" disabled={submitting} className="btn-primary" style={{ height: '50px', fontWeight: '900', fontSize: '15px' }}>
                                    {submitting ? 'SAVING...' : (editingAdvance ? 'UPDATE PAYMENT' : 'CONFIRM PAYMENT')}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FreelancerSalaryDetail;
