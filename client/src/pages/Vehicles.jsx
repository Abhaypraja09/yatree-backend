import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../api/axios';
import { Plus, Car, AlertCircle, Trash2, Calendar, ExternalLink, Search, Wallet, Shield, MapPin, Clock, CheckCircle2, XCircle, Info, Wrench, Edit3, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SEO from '../components/SEO';
import { todayIST, formatDateIST } from '../utils/istUtils';

const Vehicles = () => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const { selectedCompany } = useCompany();
    const location = useLocation();
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [carNumber, setCarNumber] = useState('');
    const [model, setModel] = useState('');
    const [permitType, setPermitType] = useState('All India');
    const [alerts, setAlerts] = useState([]);
    const [carType, setCarType] = useState('SUV');
    const [dutyAmount, setDutyAmount] = useState('');
    const [fastagNumber, setFastagNumber] = useState('');
    const [fastagBalance, setFastagBalance] = useState('');
    const [fastagBank, setFastagBank] = useState('');
    const [seatingCapacity, setSeatingCapacity] = useState('4');
    const [remarks, setRemarks] = useState('');

    const [creating, setCreating] = useState(false);
    const [docs, setDocs] = useState({
        rc: null, insurance: null, puc: null, fitness: null, permit: null
    });
    const [docExpiries, setDocExpiries] = useState({
        rc: '', insurance: '', puc: '', fitness: '', permit: ''
    });
    const [showDocsModal, setShowDocsModal] = useState(null); // Vehicle ID for existing docs
    const [docToUpload, setDocToUpload] = useState({ type: '', file: null, expiry: '' });
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // ── AI AGENT SEARCH INTEGRATION ──
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const searchParam = params.get('search') || params.get('name') || params.get('driver') || params.get('vehicle') || params.get('plate');
        if (searchParam) setSearchTerm(searchParam);
    }, [location.search]);



    useEffect(() => {
        if (selectedCompany) {
            fetchVehicles();
            fetchDrivers();
            fetchAlerts();
        }
    }, [selectedCompany]);

    const fetchVehicles = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            if (!userInfo) return;
            // Disable pagination for management view to show all vehicles
            const { data } = await axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=fleet`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            // Handle both paginated and non-paginated responses
            const vehicleList = data.vehicles || (Array.isArray(data) ? data : []);
            console.log('Vehicles fetched:', vehicleList.length);
            setVehicles(vehicleList);
        } catch (err) { 
            console.error('Fetch Vehicles Error:', err);
            setVehicles([]);
        }
        finally { setLoading(false); }
    };

    const fetchDrivers = async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            if (!userInfo) return;
            const { data } = await axios.get(`/api/admin/drivers/${selectedCompany._id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setDrivers(data.drivers || []);
        } catch (err) { console.error(err); }
    };

    const fetchAlerts = async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/dashboard/${selectedCompany._id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            const allAlerts = data.expiringAlerts || [];
            const filteredAlerts = allAlerts.filter(alert => {
                if (user?.role === 'Admin') return true;
                if ((alert.type === 'Vehicle' || alert.type === 'Service') && !user?.permissions?.vehiclesManagement) return false;
                if (alert.type === 'Driver' && !user?.permissions?.driversService) return false;
                return true;
            }).sort((a, b) => new Date(a.expiryDate || a.date) - new Date(b.expiryDate || b.date));
            setAlerts(filteredAlerts);
        } catch (err) { console.error(err); }
    };

    const handleCreateVehicle = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            const formData = new FormData();
            formData.append('carNumber', carNumber);
            formData.append('model', model);
            formData.append('permitType', permitType);
            formData.append('companyId', selectedCompany._id);
            formData.append('carType', carType);
            formData.append('isOutsideCar', false);
            formData.append('dutyAmount', dutyAmount || 0);
            formData.append('fastagNumber', fastagNumber);
            formData.append('fastagBalance', fastagBalance || 0);
            formData.append('fastagBank', fastagBank);
            formData.append('seatingCapacity', seatingCapacity || '4');
            formData.append('remarks', remarks);

            // Add Documents
            Object.keys(docs).forEach(type => {
                if (docs[type]) {
                    formData.append(type, docs[type]);
                    if (docExpiries[type]) {
                        formData.append(`expiry_${type}`, docExpiries[type]);
                    }
                }
            });

            if (editingId) {
                await axios.put(`/api/admin/vehicles/${editingId}`, formData, {
                    headers: {
                        Authorization: `Bearer ${JSON.parse(localStorage.getItem('userInfo')).token}`
                    }
                });
                alert('Vehicle updated successfully');
            } else {
                await axios.post('/api/admin/vehicles', formData, {
                    headers: {
                        Authorization: `Bearer ${JSON.parse(localStorage.getItem('userInfo')).token}`
                    }
                });
                alert('Vehicle created successfully');
            }

            setShowModal(false);
            setCarNumber(''); setModel('');
            setCarType('SUV'); setFastagNumber(''); setFastagBalance(''); setFastagBank('');
            setSeatingCapacity('4'); setRemarks('');
            setDocs({ rc: null, insurance: null, puc: null, fitness: null, permit: null });
            setDocExpiries({ rc: '', insurance: '', puc: '', fitness: '', permit: '' });
            setEditingId(null);
            fetchVehicles();
            fetchAlerts();
        } catch (err) {
            alert(err.response?.data?.message || 'Error creating vehicle');
        } finally {
            setCreating(false);
        }
    };

    const handleUploadSingleDoc = async (vehicleId) => {
        if (!docToUpload.type || !docToUpload.file) {
            return alert('Please select document type and file');
        }
        setUploadingDoc(true);
        try {
            const formData = new FormData();
            formData.append('documentType', docToUpload.type.toUpperCase());
            formData.append('expiryDate', docToUpload.expiry);
            formData.append('document', docToUpload.file);

            await axios.post(`/api/admin/vehicles/${vehicleId}/documents`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${JSON.parse(localStorage.getItem('userInfo')).token}`
                }
            });

            setDocToUpload({ type: '', file: null, expiry: '' });
            fetchVehicles();
            fetchAlerts();
            alert('Document uploaded successfully');
        } catch (err) {
            alert(err.response?.data?.message || 'Error uploading document');
        } finally {
            setUploadingDoc(false);
        }
    };



    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this vehicle? Driver assignments will be cleared.')) return;
        try {
            await axios.delete(`/api/admin/vehicles/${id}`, {
                headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('userInfo')).token}` }
            });
            fetchVehicles();
        } catch (err) {
            alert(err.response?.data?.message || 'Error deleting vehicle');
        }
    };

    const handleToggleStatus = async (vehicle) => {
        const newStatus = vehicle.status === 'active' ? 'inactive' : 'active';
        const confirmMsg = `Are you sure you want to ${newStatus === 'inactive' ? 'BLOCK' : 'UNBLOCK'} this vehicle? ${newStatus === 'inactive' ? 'It will not be available for selection by drivers.' : ''}`;
        
        if (!window.confirm(confirmMsg)) return;

        try {
            await axios.patch(`/api/admin/vehicles/${vehicle._id}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('userInfo')).token}` }
            });
            fetchVehicles();
        } catch (err) {
            alert(err.response?.data?.message || 'Error updating status');
        }
    };


    const deduplicatedVehicles = useMemo(() => {
        const map = new Map();
        vehicles.forEach(v => {
            const plate = (v.carNumber || '').split('#')[0].trim().toUpperCase();
            if (!plate) return;
            const existing = map.get(plate);
            if (!existing || new Date(v.createdAt) > new Date(existing.createdAt)) {
                map.set(plate, v);
            }
        });
        return Array.from(map.values());
    }, [vehicles]);

    const [searchTerm, setSearchTerm] = useState('');

    const filteredVehicles = deduplicatedVehicles.filter(v =>
        v.carNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.model?.toLowerCase().includes(searchTerm.toLowerCase())
    );



    return (
        <div className="container-fluid" style={{ paddingBottom: '40px' }}>
            <SEO title="Manage Vehicles" description="Track and manage all vehicles in your fleet, including document status and assignments." />



            {alerts.length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                        <div style={{ width: '4px', height: '20px', background: '#f43f5e', borderRadius: '4px' }}></div>
                        <h2 style={{ fontSize: '14px', fontWeight: '1000', margin: 0, textTransform: 'uppercase', letterSpacing: '2px', color: 'white' }}>
                            Compliance & <span style={{ color: '#f43f5e' }}>Health Watch</span>
                        </h2>
                    </div>
                    <div className="scroll-x" style={{ display: 'flex', gap: '20px', paddingBottom: '20px' }}>
                        {alerts.filter(a => a.type !== 'Service').map((alert, idx) => {
                            const isKmAlert = !alert.expiryDate;
                            const isOverdue = alert.daysLeft <= 0;
                            const unit = isKmAlert ? 'KM' : 'days';
                            const Icon = alert.type === 'Service' ? Wrench : Shield;
                            
                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="glass-card"
                                    style={{
                                        minWidth: '320px',
                                        padding: '24px',
                                        background: isOverdue ? 'rgba(244, 63, 94, 0.08)' : 'rgba(251, 191, 36, 0.08)',
                                        border: `1.5px solid ${isOverdue ? 'rgba(244, 63, 94, 0.4)' : 'rgba(251, 191, 36, 0.4)'}`,
                                        borderRadius: '24px',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ 
                                                width: '36px', height: '36px', borderRadius: '12px', 
                                                background: isOverdue ? 'rgba(244, 63, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <Icon size={18} color={isOverdue ? '#f43f5e' : 'var(--primary)'} />
                                            </div>
                                            <span style={{ fontSize: '13px', color: 'white', fontWeight: '900', letterSpacing: '0.5px' }}>{alert.identifier}</span>
                                        </div>
                                        <div style={{ 
                                            background: isOverdue ? '#f43f5e' : 'var(--primary)', 
                                            color: 'white', 
                                            padding: '4px 10px', 
                                            borderRadius: '8px', 
                                            fontSize: '10px', 
                                            fontWeight: '900',
                                            textTransform: 'uppercase'
                                        }}>
                                            {isOverdue ? 'Critical' : 'Warning'}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '14px' }}>
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>{alert.type} Requirement</div>
                                        <div style={{ fontSize: '14px', color: 'white', fontWeight: '700', lineHeight: 1.4 }}>{alert.documentType}</div>
                                    </div>

                                    <div style={{ 
                                        padding: '12px 16px', 
                                        background: 'rgba(255,255,255,0.03)', 
                                        borderRadius: '16px',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px'
                                    }}>
                                        {isKmAlert ? (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '800' }}>SCHEDULED AT</span>
                                                    <span style={{ fontSize: '10px', color: 'white', fontWeight: '900' }}>{Number(alert.targetKm).toLocaleString()} KM</span>
                                                </div>
                                                <div style={{ fontSize: '18px', color: isOverdue ? '#f43f5e' : 'var(--primary)', fontWeight: '1000' }}>
                                                    {isOverdue ? (
                                                        <span>{Math.abs(alert.daysLeft).toLocaleString()} KM Overdue</span>
                                                    ) : (
                                                        <span>{alert.daysLeft.toLocaleString()} KM to go</span>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '800' }}>EXPIRATION DATE</span>
                                                    <span style={{ fontSize: '10px', color: 'white', fontWeight: '900' }}>{formatDateIST(alert.expiryDate)}</span>
                                                </div>
                                                <div style={{ fontSize: '18px', color: isOverdue ? '#f43f5e' : 'var(--primary)', fontWeight: '1000' }}>
                                                    {isOverdue ? (
                                                        <span>{Math.abs(alert.daysLeft)} days Overdue</span>
                                                    ) : (
                                                        <span>{alert.daysLeft} days left</span>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            <header style={{ paddingBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '30px' }}>
                <div className="flex-resp" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{
                            width: 'clamp(40px,10vw,50px)',
                            height: 'clamp(40px,10vw,50px)',
                            background: '#ffffff',
                            borderRadius: '16px',
                            padding: '8px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            boxShadow: `0 8px 20px ${theme.primary}30`,
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <Car size={28} color={theme.primary} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.primary, boxShadow: `0 0 8px ${theme.primary}` }}></div>
                                <span style={{ fontSize: 'clamp(9px,2.5vw,10px)', fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase' }}>Asset Management</span>
                            </div>
                            <h1 style={{ color: 'white', fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: '900', margin: 0, letterSpacing: '-1.5px', cursor: 'pointer' }}>
                                Vehicle <span className="theme-gradient-text">Fleet</span>
                            </h1>
                            {selectedCompany && (
                                <div style={{ fontSize: '9px', fontWeight: '950', color: 'rgba(255,255,255,0.3)', marginTop: '4px', letterSpacing: '0.5px' }}>
                                    REGISTRY: <span style={{ color: theme.primary }}>{selectedCompany.name.toUpperCase()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mobile-stack" style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: '1', justifyContent: 'flex-end', maxWidth: '700px', flexWrap: 'wrap' }}>
                        <button
                            onClick={fetchVehicles}
                            disabled={loading}
                            style={{
                                width: '40px',
                                height: '40px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '10px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                cursor: 'pointer',
                                color: 'white'
                            }}
                            title="Refresh Data"
                        >
                            <RefreshCw size={18} className={loading ? 'pulse-animation' : ''} />
                        </button>
                        <div style={{ position: 'relative', flex: '1', minWidth: '140px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-field"
                                style={{ paddingLeft: '48px', marginBottom: 0, height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', width: '100%' }}
                            />
                        </div>
                        <button className="btn-primary" onClick={() => { 
                            const internalCount = vehicles.filter(v => !v.isOutsideCar).length;
                            const limit = selectedCompany?.vehicleLimit || 10;
                            const isPrimary = selectedCompany?.isPrimary;
                            
                            if (internalCount >= limit && !isPrimary) {
                                return alert(`PLAN LIMIT REACHED: You have already added ${internalCount} vehicles (Limit: ${limit}). Please contact administration to upgrade your plan.`);
                            }

                            setEditingId(null); setCarNumber(''); setModel(''); setCarType('SUV'); 
                            setFastagNumber(''); setFastagBalance(''); setFastagBank(''); 
                            setSeatingCapacity('4'); setRemarks('');
                            setShowModal(true); 
                        }} style={{ height: '48px', padding: '0 15px', borderRadius: '12px', fontWeight: '800', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <Plus size={20} /> <span className="hide-mobile">Add Vehicle</span><span className="show-mobile">Add</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="grid-1-2-2-3" style={{ paddingBottom: '40px' }}>
                {filteredVehicles.length > 0 ? (
                    filteredVehicles.map((v, index) => (
                        <motion.div
                            key={v._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ y: -8, boxShadow: '0 12px 24px rgba(0,0,0,0.2)' }}
                            className="glass-card"
                            style={{ padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                                <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '14px', color: 'rgba(255,255,255,0.7)' }}>
                                    <Car size={24} />
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <div style={{ background: v.status === 'inactive' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '30px', border: `1px solid ${v.status === 'inactive' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)'}` }}>
                                        <span style={{ fontSize: '10px', color: v.status === 'inactive' ? '#f43f5e' : '#10b981', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{v.status === 'inactive' ? 'Blocked' : 'Active'}</span>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{v.carType || 'SUV'}</span>
                                    </div>
                                    <button
                                        onClick={() => handleToggleStatus(v)}
                                        style={{ background: v.status === 'inactive' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(244, 63, 94, 0.05)', color: v.status === 'inactive' ? '#10b981' : '#f43f5e', padding: '8px', borderRadius: '10px', border: `1px solid ${v.status === 'inactive' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)'}`, transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        title={v.status === 'inactive' ? 'Unblock Vehicle' : 'Block Vehicle'}
                                    >
                                        {v.status === 'inactive' ? <CheckCircle2 size={16} /> : <Shield size={16} />}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingId(v._id);
                                            setCarNumber(v.carNumber);
                                            setModel(v.model);
                                            setPermitType(v.permitType || 'All India');
                                            setCarType(v.carType || 'SUV');
                                            setFastagNumber(v.fastagNumber || '');
                                            setFastagBalance(v.fastagBalance || '');
                                            setFastagBank(v.fastagBank || '');
                                            setSeatingCapacity(v.seatingCapacity || '4');
                                            setRemarks(v.remarks || '');
                                            setShowModal(true);
                                        }}
                                        style={{ background: 'rgba(255,255,255,0.05)', color: 'white', padding: '8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', transition: '0.2s' }}
                                    >
                                        <Edit3 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(v._id)}
                                        style={{ background: 'rgba(244, 63, 94, 0.05)', color: '#f43f5e', padding: '8px', borderRadius: '10px', border: '1px solid rgba(244, 63, 94, 0.1)', transition: '0.2s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(244, 63, 94, 0.15)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(244, 63, 94, 0.05)'}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                                <h3 style={{ color: 'white', fontSize: '22px', fontWeight: '900', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>{v.carNumber}</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px', fontWeight: '500' }}>{v.model}</p>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '25px' }}>
                                    {['INSURANCE', 'PERMIT', 'FITNESS', 'PUC', 'RC'].map(type => {
                                        const doc = v.documents?.find(d => d.documentType === type);
                                        const expiryStr = doc ? new Date(doc.expiryDate).toISOString().split('T')[0] : null;
                                        const isExpired = doc ? expiryStr < todayIST() : true;
                                        
                                        const thirtyDaysFromNow = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                                        const isExpiringSoon = doc ? (expiryStr <= thirtyDaysFromNow && !isExpired) : false;

                                        let bgColor = 'rgba(255,255,255,0.02)';
                                        let borderColor = 'rgba(255,255,255,0.05)';
                                        let iconColor = 'rgba(255,255,255,0.1)';
                                        let Icon = Clock;

                                        if (doc) {
                                            if (isExpired) {
                                                bgColor = 'rgba(244, 63, 94, 0.05)';
                                                borderColor = 'rgba(244, 63, 94, 0.1)';
                                                iconColor = '#f43f5e';
                                                Icon = XCircle;
                                            } else if (isExpiringSoon) {
                                                bgColor = 'rgba(251, 191, 36, 0.05)';
                                                borderColor = 'rgba(251, 191, 36, 0.1)';
                                                iconColor = '#fbbf24';
                                                Icon = AlertCircle;
                                            } else {
                                                bgColor = 'rgba(16, 185, 129, 0.05)';
                                                borderColor = 'rgba(16, 185, 129, 0.1)';
                                                iconColor = '#10b981';
                                                Icon = CheckCircle2;
                                            }
                                        }

                                        return (
                                            <div key={type} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 12px',
                                                borderRadius: '12px',
                                                background: bgColor,
                                                border: `1px solid ${borderColor}`
                                            }}>
                                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '900' }}>{type}</span>
                                                <div style={{ color: iconColor }}>
                                                    <Icon size={14} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center' }}>
                                <button
                                    onClick={() => setShowDocsModal(v)}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'var(--primary)',
                                        border: '1px solid rgba(14, 165, 233, 0.2)',
                                        padding: '10px 24px',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: '900',
                                        width: '100%',
                                        transition: '0.3s',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    View Documents
                                </button>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="glass-card" style={{ gridColumn: '1/-1', padding: '80px 20px', textAlign: 'center', border: '2px dashed rgba(255,255,255,0.05)', background: 'transparent' }}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', width: '90px', height: '90px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 25px' }}>
                            <Car size={36} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                        </div>
                        <h3 style={{ color: 'white', marginBottom: '10px', fontSize: '22px', fontWeight: '800' }}>No vehicles matched your search</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '30px', maxWidth: '400px', margin: '0 auto 30px', fontSize: '15px' }}>Check for typos or add a new vehicle if it's missing from the fleet.</p>
                        <button className="btn-primary" onClick={() => {
                            const internalCount = vehicles.filter(v => !v.isOutsideCar).length;
                            const limit = selectedCompany?.vehicleLimit || 10;
                            const isPrimary = selectedCompany?.isPrimary;
                            
                            if (internalCount >= limit && !isPrimary) {
                                return alert(`PLAN LIMIT REACHED: You have already added ${internalCount} vehicles (Limit: ${limit}). Please contact administration to upgrade your plan.`);
                            }
                            setShowModal(true);
                        }} style={{ padding: '12px 30px' }}>Add New Fleet Vehicle</button>
                    </div>
                )}
            </div>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="premium-glass"
                        style={{
                            padding: 'clamp(24px, 5vw, 40px)',
                            width: '100%',
                            maxWidth: '800px',
                            background: '#111827',
                            border: '1px solid rgba(255,255,255,0.1)',
                            overflowY: 'auto',
                            maxHeight: '90vh',
                            borderRadius: '32px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', position: 'relative' }}>
                            <div>
                                <h2 style={{ color: 'white', fontSize: '28px', fontWeight: '900', margin: 0, letterSpacing: '-1px' }}>
                                    {editingId ? 'Edit Vehicle' : 'Add New'} <span style={{ color: 'var(--primary)' }}>Fleet Asset</span>
                                </h2>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', margin: '6px 0 0', letterSpacing: '1.5px' }}>Vehicle Information Management</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingId(null);
                                }}
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s ease' }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(244, 63, 94, 0.2)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            >
                                <XCircle size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateVehicle} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                            {/* Section 1: Core Details */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                                    <h3 style={{ color: 'white', fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', margin: 0, letterSpacing: '1px' }}>Core Specifications</h3>
                                </div>
                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label>Car Number *</label>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }}>
                                                <Car size={16} />
                                            </div>
                                            <input
                                                className="input-field"
                                                style={{ paddingLeft: '45px', height: '54px', fontSize: '15px', fontWeight: '700', textTransform: 'uppercase' }}
                                                placeholder="e.g. RJ-27-TA-XXXX"
                                                value={carNumber}
                                                onChange={(e) => setCarNumber(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Model Name *</label>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }}>
                                                <Info size={16} />
                                            </div>
                                            <input
                                                className="input-field"
                                                style={{ paddingLeft: '45px', height: '54px', fontSize: '15px' }}
                                                placeholder="e.g. Maruti Ciaz"
                                                value={model}
                                                onChange={(e) => setModel(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label>Permit Category</label>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }}>
                                                <MapPin size={16} />
                                            </div>
                                            <select
                                                className="input-field"
                                                style={{ paddingLeft: '45px', height: '54px', appearance: 'none', cursor: 'pointer' }}
                                                value={permitType}
                                                onChange={(e) => setPermitType(e.target.value)}
                                            >
                                                <option value="All India" style={{ background: '#0f172a' }}>All India (National)</option>
                                                <option value="State Only" style={{ background: '#0f172a' }}>State Only</option>
                                                <option value="Local" style={{ background: '#0f172a' }}>Local Trip</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Car Segment</label>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }}>
                                                <Car size={16} />
                                            </div>
                                            <select
                                                className="input-field"
                                                style={{ paddingLeft: '45px', height: '54px', appearance: 'none', cursor: 'pointer' }}
                                                value={carType}
                                                onChange={(e) => setCarType(e.target.value)}
                                            >
                                                <option value="SUV" style={{ background: '#0f172a' }}>SUV / MUV</option>
                                                <option value="Sedan" style={{ background: '#0f172a' }}>Sedan</option>
                                                <option value="Hatchback" style={{ background: '#0f172a' }}>Hatchback</option>
                                                <option value="Bus" style={{ background: '#0f172a' }}>Bus</option>
                                                <option value="Mini Bus" style={{ background: '#0f172a' }}>Mini Bus</option>
                                                <option value="Traveler" style={{ background: '#0f172a' }}>Traveler</option>
                                                <option value="Electric Vehicle" style={{ background: '#0f172a' }}>Electric Vehicle</option>
                                                <option value="Other" style={{ background: '#0f172a' }}>Luxury / Other</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Financials & Tracking */}
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                                    <h3 style={{ color: 'white', fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', margin: 0, letterSpacing: '1px' }}>Tracking Details</h3>
                                </div>
                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label>Fastag Number</label>
                                        <input className="input-field" style={{ height: '50px' }} placeholder="ID Number" value={fastagNumber} onChange={(e) => setFastagNumber(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Fastag Bank</label>
                                        <input className="input-field" style={{ height: '50px' }} placeholder="e.g. ICICI" value={fastagBank} onChange={(e) => setFastagBank(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {/* Fleet Documentation section removed - managed externally */}
                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '15px', padding: '10px 0' }}>
                                <button
                                    type="button"
                                    className="glass-card"
                                    style={{ flex: 1, padding: '16px', color: 'white', fontWeight: '800', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingId(null);
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{ flex: 2, padding: '16px', borderRadius: '18px', fontSize: '16px', fontWeight: '900', boxShadow: '0 20px 40px -10px rgba(14, 165, 233, 0.4)' }}
                                    disabled={creating}
                                >
                                    {creating ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                            <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
                                            <span>Processing...</span>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                            {editingId ? <CheckCircle2 size={20} /> : <Plus size={20} />}
                                            <span>{editingId ? 'Save Vehicle Updates' : 'Add Vehicle to Fleet'}</span>
                                        </div>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {showDocsModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(15px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        className="premium-glass"
                        style={{
                            padding: '35px',
                            width: '100%',
                            maxWidth: '950px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            background: '#0f172a',
                            borderRadius: '32px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Shield size={32} color="var(--primary)" />
                                </div>
                                <div>
                                    <h2 style={{ color: 'white', fontSize: '24px', fontWeight: '1000', margin: 0, letterSpacing: '-1px' }}>Document Vault</h2>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                                        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>{showDocsModal.carNumber}</span>
                                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }}></span>
                                        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>{showDocsModal.model}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDocsModal(null)}
                                style={{ background: 'rgba(255,255,255,0.05)', color: 'white', width: '44px', height: '44px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(244, 63, 94, 0.2)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            >
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px', marginBottom: '40px' }}>
                            {['INSURANCE', 'PERMIT', 'FITNESS', 'PUC', 'RC'].map((type) => {
                                const doc = showDocsModal.documents?.find(d => d.documentType === type);
                                const isExpired = doc ? new Date(doc.expiryDate).toISOString().split('T')[0] < todayIST() : true;

                                return (
                                    <div key={type} className="glass-card" style={{
                                        padding: '20px',
                                        background: 'rgba(255,255,255,0.02)',
                                        border: doc ? (isExpired ? '1px solid rgba(244, 63, 94, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)') : '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: '24px',
                                        transition: 'all 0.3s ease'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: !doc ? 'rgba(255,255,255,0.1)' : (isExpired ? '#f43f5e' : '#10b981') }}></div>
                                                <span style={{ fontSize: '12px', color: 'white', fontWeight: '900', letterSpacing: '1px' }}>{type}</span>
                                            </div>
                                            {!doc ? (
                                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontWeight: '800' }}>NOT UPLOADED</span>
                                            ) : (
                                                <div style={{ background: isExpired ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: isExpired ? '#f43f5e' : '#10b981', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '900' }}>
                                                    {isExpired ? 'EXPIRED' : 'VALID'}
                                                </div>
                                            )}
                                        </div>

                                        {doc ? (
                                            <>
                                                <div
                                                    style={{ height: '160px', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
                                                    onClick={() => window.open(doc.imageUrl)}
                                                >
                                                    <img src={doc.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: 0, transition: '0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={(e) => e.currentTarget.style.opacity = 1} onMouseLeave={(e) => e.currentTarget.style.opacity = 0}>
                                                        <ExternalLink size={24} color="white" />
                                                    </div>
                                                </div>
                                                <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '800' }}>EXPIRY DATE</div>
                                                        <div style={{ fontSize: '14px', color: isExpired ? '#f43f5e' : 'white', fontWeight: '900' }}>{formatDateIST(doc.expiryDate)}</div>
                                                    </div>
                                                    <a
                                                        href={`https://wa.me/${(selectedCompany?.whatsappNumber || JSON.parse(localStorage.getItem('userInfo'))?.mobile || '').replace(/[^0-9]/g, '').replace(/^(?!91)/, '91')}?text=${encodeURIComponent(`ALERT: Vehicle ${showDocsModal.carNumber} document (${type}) is expiring on ${formatDateIST(doc.expiryDate)}. Please take action.`)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ background: 'rgba(37, 211, 102, 0.1)', color: '#10b981', padding: '10px', borderRadius: '12px', border: '1px solid rgba(37, 211, 102, 0.2)' }}
                                                        title="Send WhatsApp Reminder"
                                                    >
                                                        <Shield size={16} />
                                                    </a>
                                                </div>
                                            </>
                                        ) : (
                                            <div style={{ height: '160px', borderRadius: '16px', border: '2px dashed rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                                <Plus size={32} color="rgba(255,255,255,0.1)" />
                                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', fontWeight: '700' }}>Missing Document</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '30px', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '900', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Plus size={20} color="var(--primary)" /> Add / Update Document
                            </h3>
                            <div className="quick-upload-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Type</label>
                                    <select className="input-field" value={docToUpload.type} onChange={(e) => setDocToUpload({ ...docToUpload, type: e.target.value })} style={{ height: '48px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)' }}>
                                        <option value="">Select Document</option>
                                        <option value="RC">RC (Reg. Certificate)</option>
                                        <option value="INSURANCE">Insurance Policy</option>
                                        <option value="PERMIT">Permit Document</option>
                                        <option value="FITNESS">Fitness Certificate</option>
                                        <option value="PUC">PUC Certificate</option>
                                    </select>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Expiry</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            id="doc-expiry-picker"
                                            type="date"
                                            className="input-field"
                                            style={{ height: '48px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', width: '100%' }}
                                            value={docToUpload.expiry || ''}
                                            onChange={(e) => setDocToUpload({ ...docToUpload, expiry: e.target.value })}
                                            onClick={(e) => e.target.showPicker()}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Scan / Photo</label>
                                    <input type="file" onChange={(e) => setDocToUpload({ ...docToUpload, file: e.target.files[0] })} style={{ color: 'white', fontSize: '12px', marginTop: '10px' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                    <button
                                        className="btn-primary"
                                        onClick={() => handleUploadSingleDoc(showDocsModal._id)}
                                        disabled={uploadingDoc}
                                        style={{ height: '48px', width: '100%', borderRadius: '12px', fontWeight: '900' }}
                                    >
                                        {uploadingDoc ? 'Saving Asset...' : 'Save Document'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Vehicles;
