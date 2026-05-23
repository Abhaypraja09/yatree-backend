import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../api/axios';
import {
    ShieldCheck,
    Plus,
    Search,
    Trash2,
    Calendar,
    FileText,
    AlertTriangle,
    CheckCircle2,
    Car,
    Filter,
    Camera,
    ExternalLink,
    X,
    Clock,
    User,
    ChevronDown,
    Activity,
    Package,
    IndianRupee,
    Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompany } from '../context/CompanyContext';
import SEO from '../components/SEO';
import { todayIST, formatDateIST } from '../utils/istUtils';

const Warranties = () => {
    const { selectedCompany } = useCompany();
    const location = useLocation();
    const [warranties, setWarranties] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterVehicle, setFilterVehicle] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [stats, setStats] = useState({ totalActive: 0, expiringSoon: 0, expired: 0 });

    // Claim Modal State
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [selectedWarranty, setSelectedWarranty] = useState(null);
    const [claimFormData, setClaimFormData] = useState({
        claimDate: '',
        claimStatus: 'Pending',
        replacementDate: '',
        remarks: ''
    });

    // Add Warranty Form State
    const [formData, setFormData] = useState({
        vehicleId: '',
        partName: '',
        brandName: '',
        invoiceNumber: '',
        purchaseDate: '',
        warrantyStartDate: '',
        warrantyEndDate: '',
        warrantyPeriod: '',
        supplierName: '',
        cost: '',
        status: 'Active'
    });
    const [warrantyImage, setWarrantyImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // ── AI AGENT SEARCH INTEGRATION ──
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const searchParam = params.get('search') || params.get('part') || params.get('warranty');
        const vehicleParam = params.get('vehicle');
        const statusParam = params.get('status');

        if (searchParam) setSearchTerm(searchParam);
        if (vehicleParam) setFilterVehicle(vehicleParam);
        if (statusParam) setFilterStatus(statusParam);
    }, [location.search]);

    useEffect(() => {
        setSearchTerm('');
        setFilterVehicle('All');
        setFilterStatus('All');
        setShowModal(false);
        setShowClaimModal(false);
        setSelectedWarranty(null);
        setFormData({
            vehicleId: '',
            partName: '',
            brandName: '',
            invoiceNumber: '',
            purchaseDate: '',
            warrantyStartDate: '',
            warrantyEndDate: '',
            warrantyPeriod: '',
            supplierName: '',
            cost: '',
            status: 'Active'
        });
        setClaimFormData({
            claimDate: '',
            claimStatus: 'Pending',
            replacementDate: '',
            remarks: ''
        });
        setWarrantyImage(null);
        setImagePreview(null);
    }, [location.pathname, location.key]);

    useEffect(() => {
        if (selectedCompany) {
            fetchData();
        }
    }, [selectedCompany]);

    const fetchData = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const [wRes, vRes, sRes] = await Promise.all([
                axios.get(`/api/warranty/${selectedCompany._id}`, { headers: { Authorization: `Bearer ${userInfo.token}` } }),
                // Changed type=all to type=fleet to ensure we only get owned vehicles for warranty
                axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=fleet`, { headers: { Authorization: `Bearer ${userInfo.token}` } }),
                axios.get(`/api/warranty/stats/${selectedCompany._id}`, { headers: { Authorization: `Bearer ${userInfo.token}` } })
            ]);

            setWarranties(wRes.data || []);

            // Ensure vehicles are sorted consistently
            const sortedVehicles = (vRes.data.vehicles || []).sort((a, b) => a.carNumber.localeCompare(b.carNumber));
            setVehicles(sortedVehicles);

            setStats(sRes.data);
        } catch (err) {
            console.error('Fetch Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const fd = new FormData();
            Object.keys(formData).forEach(key => fd.append(key, formData[key]));
            fd.append('companyId', selectedCompany._id);
            if (warrantyImage) fd.append('warrantyCardImage', warrantyImage);

            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.post('/api/warranty', fd, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${userInfo.token}`
                }
            });

            setShowModal(false);
            resetForm();
            fetchData();
        } catch (err) {
            alert('Failed to save warranty record');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this warranty record?')) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.delete(`/api/warranty/${id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateClaim = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.put(`/api/warranty/${selectedWarranty._id}`, {
                claimDetails: claimFormData,
                status: 'Claimed'
            }, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });

            setShowClaimModal(false);
            fetchData();
        } catch (err) {
            alert('Update failed');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            vehicleId: '',
            partName: '',
            brandName: '',
            invoiceNumber: '',
            purchaseDate: '',
            warrantyStartDate: '',
            warrantyEndDate: '',
            warrantyPeriod: '',
            supplierName: '',
            cost: '',
            status: 'Active'
        });
        setWarrantyImage(null);
        setImagePreview(null);
    };

    const filteredWarranties = warranties.filter(w => {
        const matchesSearch = (
            w.partName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            w.vehicle?.carNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            w.brandName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            w.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const matchesVehicle = filterVehicle === 'All' || w.vehicle?._id === filterVehicle;
        const matchesStatus = filterStatus === 'All' || w.status === filterStatus;
        return matchesSearch && matchesVehicle && matchesStatus;
    });

    const isExpiringSoon = (date) => {
        const diff = new Date(date) - new Date();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days > 0 && days <= 30;
    };

    const isExpired = (date) => new Date(date) < new Date();

    const inputStyle = {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        color: 'white',
        padding: '12px 16px',
        width: '100%',
        outline: 'none',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s ease',
        height: '48px'
    };

    const labelStyle = {
        display: 'block',
        color: 'var(--text-muted)',
        fontSize: '12px',
        fontWeight: '600',
        marginBottom: '6px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    };

    return (
        <div className="container-fluid" style={{ paddingBottom: '40px' }}>
            <SEO title="Parts Warranty Hub" description="Track and manage vehicle part warranties, claims and renewals." />

            <header className="flex-resp" style={{
                justifyContent: 'space-between',
                padding: '30px 0',
                gap: '20px',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                        width: 'clamp(40px,10vw,50px)',
                        height: 'clamp(40px,10vw,50px)',
                        background: 'linear-gradient(135deg, white, #f8fafc)',
                        borderRadius: '16px',
                        padding: '8px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                    }}>
                        <ShieldCheck size={28} color="var(--primary)" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 8px var(--primary)' }}></div>
                            <span style={{ fontSize: 'clamp(9px,2.5vw,10px)', fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase' }}>Asset Protection</span>
                        </div>
                        <h1 style={{ color: 'white', fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: '900', margin: 0, letterSpacing: '-1px', cursor: 'pointer' }}>
                            Parts <span className="text-gradient-yellow">Warranty</span> Hub
                        </h1>
                    </div>
                </div>

                <div className="flex-resp" style={{ gap: '15px' }}>
                    <button
                        onClick={() => setShowModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '52px', padding: '0 25px', borderRadius: '14px', fontWeight: '800', background: 'linear-gradient(135deg, var(--primary) 0%, #d97706 100%)', color: 'black', border: 'none', whiteSpace: 'nowrap', flexShrink: 0, boxShadow: '0 8px 15px rgba(251, 191, 36, 0.2)' }}
                    >
                        <Plus size={20} /> <span className="hide-mobile">Add Warranty</span><span className="show-mobile">Add</span>
                    </button>
                </div>
            </header>

            {/* Stats Overview */}
            <div className="stats-grid" style={{ marginBottom: '30px' }}>
                <div className="glass-card stat-card" style={{ background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.02))', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                    <div className="stat-card-header">
                        <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}><ShieldCheck size={18} /></div>
                        <p className="stat-card-label" style={{ color: '#10b981' }}>Active Warranties</p>
                    </div>
                    <h2 className="stat-card-value">{stats.totalActive}</h2>
                </div>

                <div className="glass-card stat-card" style={{ background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.02))', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
                    <div className="stat-card-header">
                        <div className="stat-card-icon" style={{ background: 'rgba(245, 158, 11, 0.2)', color: 'var(--primary)' }}><Clock size={18} /></div>
                        <p className="stat-card-label" style={{ color: 'var(--primary)' }}>Expiring Soon</p>
                    </div>
                    <h2 className="stat-card-value">{stats.expiringSoon}</h2>
                </div>

                <div className="glass-card stat-card" style={{ background: 'linear-gradient(145deg, rgba(244, 63, 94, 0.1), rgba(244, 63, 94, 0.02))', borderColor: 'rgba(244, 63, 94, 0.2)' }}>
                    <div className="stat-card-header">
                        <div className="stat-card-icon" style={{ background: 'rgba(244, 63, 94, 0.2)', color: '#f43f5e' }}><AlertTriangle size={18} /></div>
                        <p className="stat-card-label" style={{ color: '#f43f5e' }}>Expired Parts</p>
                    </div>
                    <h2 className="stat-card-value">{stats.expired}</h2>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="glass-card" style={{ padding: '20px', marginBottom: '30px', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                    <input
                        type="text"
                        placeholder="Search part, car number, invoice..."
                        className="input-field"
                        style={{ ...inputStyle, paddingLeft: '48px', marginBottom: 0 }}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex-resp" style={{ gap: '10px' }}>
                    <div className="glass-card" style={{ padding: '0 15px', display: 'flex', alignItems: 'center', height: '48px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
                        <Car size={16} style={{ marginRight: '8px', color: 'var(--primary)' }} />
                        <select
                            value={filterVehicle}
                            onChange={(e) => setFilterVehicle(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', minWidth: '120px' }}
                        >
                            <option value="All" style={{ background: '#1e293b' }}>Filter Vehicles</option>
                            {vehicles.map(v => <option key={v._id} value={v._id} style={{ background: '#1e293b' }}>{v.carNumber}</option>)}
                        </select>
                        <ChevronDown size={14} style={{ marginLeft: '8px', opacity: 0.5 }} />
                    </div>

                    <div className="glass-card" style={{ padding: '0 15px', display: 'flex', alignItems: 'center', height: '48px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
                        <Activity size={16} style={{ marginRight: '8px', color: 'var(--primary)' }} />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', minWidth: '100px' }}
                        >
                            <option value="All" style={{ background: '#1e293b' }}>All Status</option>
                            <option value="Active" style={{ background: '#1e293b' }}>Active</option>
                            <option value="Expired" style={{ background: '#1e293b' }}>Expired</option>
                            <option value="Claimed" style={{ background: '#1e293b' }}>Claimed</option>
                        </select>
                        <ChevronDown size={14} style={{ marginLeft: '8px', opacity: 0.5 }} />
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '100px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
            ) : filteredWarranties.length === 0 ? (
                <div className="glass-card" style={{ padding: '80px', textAlign: 'center' }}>
                    <ShieldCheck size={48} style={{ opacity: 0.1, color: 'white', marginBottom: '20px' }} />
                    <h3 style={{ color: 'white', marginBottom: '8px' }}>No Warranty Records Found</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Start tracking your vehicle parts warranties today.</p>
                </div>
            ) : (
                <div className="glass-card" style={{ padding: '5px', overflow: 'hidden' }}>
                    <div className="table-responsive">
                        <table className="activity-table" style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                            <thead>
                                <tr>
                                    <th style={{ paddingLeft: '20px' }}>Part Detail</th>
                                    <th>Vehicle</th>
                                    <th>Warranty Period</th>
                                    <th>Exp. Date</th>
                                    <th>Cost</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right', paddingRight: '20px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredWarranties.map((w) => {
                                    const expired = isExpired(w.warrantyEndDate);
                                    const soon = isExpiringSoon(w.warrantyEndDate);

                                    return (
                                        <tr key={w._id} className="hover-row" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                                            <td style={{ padding: '15px 20px', borderRadius: '12px 0 0 12px' }}>
                                                <div style={{ color: 'white', fontWeight: '800', fontSize: '15px' }}>{w.partName}</div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                                    <Briefcase size={12} /> {w.brandName} <span style={{ opacity: 0.3 }}>|</span> {w.invoiceNumber}
                                                </div>
                                            </td>
                                            <td style={{ padding: '15px' }}>
                                                <div className="vehicle-badge" style={{ fontSize: '13px', padding: '6px 12px', background: 'rgba(14, 165, 233, 0.1)', color: '#38bdf8', border: '1px solid rgba(14, 165, 233, 0.2)' }}>{w.vehicle?.carNumber}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>{w.supplierName}</div>
                                            </td>
                                            <td style={{ padding: '15px' }}>
                                                <div style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>{w.warrantyPeriod}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>From: {new Date(w.warrantyStartDate).toLocaleDateString('en-GB')}</div>
                                            </td>
                                            <td style={{ padding: '15px' }}>
                                                <div style={{
                                                    color: expired ? '#f43f5e' : soon ? 'var(--primary)' : '#10b981',
                                                    fontWeight: '800',
                                                    fontSize: '14px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}>
                                                    {new Date(w.warrantyEndDate).toLocaleDateString('en-GB')}
                                                    {expired && <AlertTriangle size={14} />}
                                                </div>
                                                <div style={{ fontSize: '11px', fontWeight: '600', color: expired ? '#f43f5e' : soon ? 'var(--primary)' : 'var(--text-muted)', marginTop: '2px' }}>{expired ? 'EXPIRED' : soon ? 'EXPIRING SOON' : 'VALID'}</div>
                                            </td>
                                            <td style={{ padding: '15px' }}>
                                                <div style={{ color: 'white', fontWeight: '800', fontSize: '15px' }}>₹{Number(w.cost || 0).toLocaleString()}</div>
                                            </td>
                                            <td style={{ padding: '15px' }}>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: '800',
                                                    padding: '6px 12px',
                                                    borderRadius: '8px',
                                                    background: w.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : w.status === 'Claimed' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                                                    color: w.status === 'Active' ? '#34d399' : w.status === 'Claimed' ? '#818cf8' : '#fb7185',
                                                    border: '1px solid currentColor',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    {w.status === 'Active' && <CheckCircle2 size={12} />}
                                                    {w.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right', borderRadius: '0 12px 12px 0', paddingRight: '20px' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => { setSelectedWarranty(w); setClaimFormData(w.claimDetails || claimFormData); setShowClaimModal(true); }}
                                                        className="action-button" title="View/Claim"
                                                        style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <Activity size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(w._id)}
                                                        className="action-button" title="Delete"
                                                        style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Warranty Modal */}
            <AnimatePresence>
                {showModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '15px', overflowY: 'auto' }}>
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            className="premium-glass"
                            style={{ width: '100%', maxWidth: '800px', padding: '0', border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a', overflow: 'visible', margin: 'auto', borderRadius: '24px' }}
                        >
                            <div style={{ padding: '24px 30px', background: 'linear-gradient(to right, #1e293b, #0f172a)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, borderTopLeftRadius: 'inherit', borderTopRightRadius: 'inherit' }}>
                                <div>
                                    <h2 style={{ color: 'white', fontSize: '20px', margin: 0, fontWeight: '800' }}>New Warranty Record</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', margin: '4px 0 0' }}>Asset Registration</p>
                                </div>
                                <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', borderRadius: '50%', padding: '10px', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
                            </div>

                            <form onSubmit={handleCreate} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                                    <div className="input-field-group">
                                        <label style={labelStyle}>Select Vehicle *</label>
                                        <div style={{ position: 'relative' }}>
                                            <select
                                                className="input-field"
                                                required
                                                value={formData.vehicleId}
                                                onChange={e => setFormData({ ...formData, vehicleId: e.target.value })}
                                                style={inputStyle}
                                            >
                                                <option value="" style={{ background: '#1e293b' }}>Select Vehicle</option>
                                                {vehicles.map(v => <option key={v._id} value={v._id} style={{ background: '#1e293b' }}>{v.carNumber}</option>)}
                                            </select>
                                            <ChevronDown size={16} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: 'white', pointerEvents: 'none' }} />
                                        </div>
                                    </div>

                                    <div className="input-field-group">
                                        <label style={labelStyle}>Part Name *</label>
                                        <input type="text" style={inputStyle} placeholder="Ex: Battery, Tyre" required value={formData.partName} onChange={e => setFormData({ ...formData, partName: e.target.value })} />
                                    </div>

                                    <div className="input-field-group">
                                        <label style={labelStyle}>Brand Name *</label>
                                        <input type="text" style={inputStyle} placeholder="Ex: Exide, Apollo" required value={formData.brandName} onChange={e => setFormData({ ...formData, brandName: e.target.value })} />
                                    </div>

                                    <div className="input-field-group">
                                        <label style={labelStyle}>Invoice Number *</label>
                                        <input type="text" style={inputStyle} placeholder="INV-123..." required value={formData.invoiceNumber} onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })} />
                                    </div>

                                    <div className="input-field-group">
                                        <label style={labelStyle}>Purchase Date</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                id="purchase-date-picker"
                                                type="date"
                                                className="input-field"
                                                style={{ width: '100%', height: '48px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: 'white', padding: '0 15px' }}
                                                value={formData.purchaseDate || ''}
                                                onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                                                onClick={(e) => e.target.showPicker()}
                                            />
                                        </div>
                                    </div>

                                    <div className="input-field-group">
                                        <label style={labelStyle}>Warranty Period</label>
                                        <input type="text" style={inputStyle} placeholder="Ex: 12 Months, 2 Years" value={formData.warrantyPeriod} onChange={e => setFormData({ ...formData, warrantyPeriod: e.target.value })} />
                                    </div>

                                    <div className="input-field-group">
                                        <label style={labelStyle}>Warranty Start</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                id="warranty-start-picker"
                                                type="date"
                                                className="input-field"
                                                style={{ width: '100%', height: '48px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: 'white', padding: '0 15px' }}
                                                value={formData.warrantyStartDate || ''}
                                                onChange={e => setFormData({ ...formData, warrantyStartDate: e.target.value })}
                                                onClick={(e) => e.target.showPicker()}
                                            />
                                        </div>
                                    </div>

                                    <div className="input-field-group">
                                        <label style={labelStyle}>Warranty End *</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                id="warranty-end-picker"
                                                type="date"
                                                className="input-field"
                                                required
                                                style={{ width: '100%', height: '48px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: 'white', padding: '0 15px' }}
                                                value={formData.warrantyEndDate || ''}
                                                onChange={e => setFormData({ ...formData, warrantyEndDate: e.target.value })}
                                                onClick={(e) => e.target.showPicker()}
                                            />
                                        </div>
                                    </div>

                                    <div className="input-field-group">
                                        <label style={labelStyle}>Supplier Name</label>
                                        <input type="text" style={inputStyle} placeholder="Shop/Vendor name" value={formData.supplierName} onChange={e => setFormData({ ...formData, supplierName: e.target.value })} />
                                    </div>

                                    <div className="input-field-group">
                                        <label style={labelStyle}>Cost (₹)</label>
                                        <input type="number" style={inputStyle} placeholder="0.00" value={formData.cost} onChange={e => setFormData({ ...formData, cost: e.target.value })} />
                                    </div>
                                </div>

                                <div className="input-field-group">
                                    <label style={labelStyle}>Warranty Image</label>
                                    <div
                                        style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '2px dashed rgba(255,255,255,0.1)',
                                            borderRadius: '16px',
                                            padding: imagePreview ? '5px' : '20px',
                                            textAlign: 'center',
                                            position: 'relative',
                                            cursor: 'pointer',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <input
                                            type="file"
                                            onChange={e => {
                                                setWarrantyImage(e.target.files[0]);
                                                if (e.target.files[0]) setImagePreview(URL.createObjectURL(e.target.files[0]));
                                            }}
                                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10, width: '100%', height: '100%' }}
                                        />

                                        {imagePreview ? (
                                            <div style={{ position: 'relative', width: '100%', height: '150px', borderRadius: '12px', overflow: 'hidden' }}>
                                                <img src={imagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                                                    <div style={{ color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Camera size={20} /> Change Image
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <Camera size={24} style={{ opacity: 0.5, marginBottom: '10px' }} />
                                                <p style={{ margin: 0, fontWeight: '600', color: 'white', fontSize: '14px' }}>Click to upload</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        height: '56px',
                                        background: 'linear-gradient(135deg, var(--primary), #d97706)',
                                        borderRadius: '16px',
                                        fontWeight: '900',
                                        fontSize: '16px',
                                        color: 'black',
                                        border: 'none',
                                        boxShadow: '0 12px 24px -8px rgba(251, 191, 36, 0.5)',
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}
                                >
                                    {submitting ? 'Saving...' : 'Save Warranty'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Claim/View Modal - Re-styled */}
            <AnimatePresence>
                {showClaimModal && selectedWarranty && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="glass-card" style={{ maxWidth: '650px', width: '100%', padding: '30px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                <div>
                                    <h2 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: '800' }}>{selectedWarranty.partName} Warranty</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>Vehicle: <span style={{ color: '#38bdf8' }}>{selectedWarranty.vehicle?.carNumber}</span></p>
                                </div>
                                <button onClick={() => setShowClaimModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                                {selectedWarranty.warrantyCardImage && (
                                    <div style={{ gridColumn: '1/-1', marginBottom: '10px' }}>
                                        <img src={selectedWarranty.warrantyCardImage} style={{ width: '100%', height: '250px', objectFit: 'contain', borderRadius: '16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                    </div>
                                )}
                                <div className="glass-card" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
                                    <label style={labelStyle}>PURCHASE INFO</label>
                                    <div style={{ color: 'white', fontWeight: '600', marginBottom: '8px' }}>Date: {new Date(selectedWarranty.purchaseDate).toLocaleDateString()}</div>
                                    <div style={{ color: 'white', fontWeight: '600' }}>Supplier: {selectedWarranty.supplierName}</div>
                                </div>
                                <div className="glass-card" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
                                    <label style={labelStyle}>WARRANTY STATUS</label>
                                    <div style={{ color: isExpired(selectedWarranty.warrantyEndDate) ? '#f43f5e' : '#10b981', fontWeight: '800', fontSize: '18px', marginBottom: '5px' }}>{selectedWarranty.status}</div>
                                    <div style={{ fontSize: '13px', color: 'white' }}>Ends: {new Date(selectedWarranty.warrantyEndDate).toLocaleDateString()}</div>
                                </div>
                            </div>

                            <form onSubmit={handleUpdateClaim} style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '25px' }}>
                                <h3 style={{ color: 'white', fontSize: '16px', fontWeight: '800', marginBottom: '20px' }}>Warranty Claim Status</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                    <div className="input-field-group">
                                        <label style={labelStyle}>Claim Date</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                id="claim-date-picker"
                                                type="date"
                                                className="input-field"
                                                style={{ width: '100%', height: '48px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: 'white', padding: '0 15px' }}
                                                value={claimFormData.claimDate || ''}
                                                onChange={e => setClaimFormData({ ...claimFormData, claimDate: e.target.value })}
                                                onClick={(e) => e.target.showPicker()}
                                            />
                                        </div>
                                    </div>
                                    <div className="input-field-group">
                                        <label style={labelStyle}>Claim Status</label>
                                        <div style={{ position: 'relative' }}>
                                            <select style={inputStyle} value={claimFormData.claimStatus} onChange={e => setClaimFormData({ ...claimFormData, claimStatus: e.target.value })}>
                                                <option value="Pending" style={{ background: '#1e293b' }}>Pending</option>
                                                <option value="Approved" style={{ background: '#1e293b' }}>Approved</option>
                                                <option value="Rejected" style={{ background: '#1e293b' }}>Rejected</option>
                                            </select>
                                            <ChevronDown size={16} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: 'white', pointerEvents: 'none' }} />
                                        </div>
                                    </div>
                                    <div className="input-field-group" style={{ gridColumn: '1/-1' }}>
                                        <label style={labelStyle}>Replacement Date (if any)</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                id="replacement-date-picker"
                                                type="date"
                                                className="input-field"
                                                style={{ width: '100%', height: '48px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: 'white', padding: '0 15px' }}
                                                value={claimFormData.replacementDate || ''}
                                                onChange={e => setClaimFormData({ ...claimFormData, replacementDate: e.target.value })}
                                                onClick={(e) => e.target.showPicker()}
                                            />
                                        </div>
                                    </div>
                                    <div className="input-field-group" style={{ gridColumn: '1/-1' }}>
                                        <label style={labelStyle}>Remarks</label>
                                        <textarea style={{ ...inputStyle, minHeight: '100px', height: 'auto', paddingTop: '15px' }} value={claimFormData.remarks} onChange={e => setClaimFormData({ ...claimFormData, remarks: e.target.value })} placeholder="Add claim details or why it was rejected..." />
                                    </div>
                                </div>

                                <button type="submit" disabled={submitting} className="btn-primary" style={{ width: '100%', marginTop: '25px', height: '52px', fontWeight: '800' }}>
                                    UPDATE CLAIM INFORMATION
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default Warranties;
