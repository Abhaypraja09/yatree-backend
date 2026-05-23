import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../api/axios';
import { Plus, Minus, Search, Filter, MoreVertical, Trash2, Edit2, ShieldAlert, User as UserIcon, Users, Clock, FileText, CheckCircle, XCircle, Briefcase, IndianRupee, Eye, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import SEO from '../components/SEO';
import {
    todayIST,
    toISTDateString,
    toISTDateTimeString,
    nowISTDateTimeString,
    formatDateIST,
    formatTimeIST,
    formatDateTimeIST
} from '../utils/istUtils';

const Drivers = ({ isSubComponent = false }) => {
    const { theme } = useTheme();
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .drivers-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding: 30px 0;
                gap: 20px;
            }
            .mobile-search-row {
                display: flex;
                gap: 10px;
                flex: 1;
                justify-content: flex-end;
                flex-wrap: wrap;
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            .glass-card {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.08);
                backdrop-filter: blur(20px);
                border-radius: 24px;
            }
            .hide-mobile { display: block; }
            .show-mobile { display: none; }

            @media (max-width: 900px) {
                .drivers-header {
                    flex-direction: column;
                    align-items: flex-start;
                }
                .mobile-search-row {
                    width: 100%;
                    flex-direction: column;
                    align-items: stretch;
                }
                .mobile-search-row > div {
                    max-width: 100% !important;
                }
                .stats-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
            }

            @media (max-width: 600px) {
                .stats-grid {
                    grid-template-columns: 1fr;
                }
                .hide-mobile { display: none !important; }
                .show-mobile { display: block !important; }
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);
    const navigate = useNavigate();
    const location = useLocation();
    const { selectedCompany } = useCompany();
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [dailyWage, setDailyWage] = useState('');
    const [nightStayBonus, setNightStayBonus] = useState('');
    const [sameDayReturnBonus, setSameDayReturnBonus] = useState('');
    const [sameDayReturnEnabled, setSameDayReturnEnabled] = useState(false);
    const [isFreelancer, setIsFreelancer] = useState(false);

    // Documentation & Overtime States
    const [docs, setDocs] = useState({
        aadharCard: null,
        drivingLicense: null,
        offerLetter: null
    });
    const [overtime, setOvertime] = useState({
        enabled: false,
        threshold: 9,
        rate: 0
    });

    const [showEditModal, setShowEditModal] = useState(false);
    const [editingDriver, setEditingDriver] = useState(null);
    const [editForm, setEditForm] = useState({
        name: '',
        mobile: '',
        username: '',
        password: '',
        confirmPassword: '',
        licenseNumber: '',
        dailyWage: '',
        nightStayBonus: '',
        sameDayReturnBonus: '',
        sameDayReturnEnabled: false,
        overtimeEnabled: false,
        overtimeThreshold: 9,
        overtimeRate: 0
    });
    const [driverTypeFilter, setDriverTypeFilter] = useState('All');
    const [onlyOnDuty, setOnlyOnDuty] = useState(false);
    const [showCompletedOnly, setShowCompletedOnly] = useState(false);
    const [backendStats, setBackendStats] = useState({ total: 0, active: 0, blocked: 0 });

    // Manual Duty State
    const [showManualModal, setShowManualModal] = useState(false);
    const [selectedDriverForManual, setSelectedDriverForManual] = useState(null);
    const [vehicles, setVehicles] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [manualDutyForm, setManualDutyForm] = useState({
        date: '',
        vehicleId: '',
        punchInKM: '',
        punchOutKM: '',
        parkingAmount: '',
        allowanceTA: false,
        nightStayAmount: false,
        otherBonus: '',
        review: ''
    });

    // Admin Punch In/Out State
    const [showPunchInModal, setShowPunchInModal] = useState(false);
    const [showPunchOutModal, setShowPunchOutModal] = useState(false);
    const [viewingDriver, setViewingDriver] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewingDocUrl, setViewingDocUrl] = useState(null);
    const [showDocViewer, setShowDocViewer] = useState(false);
    const getLocalYYYYMMDDHHMM = (date = new Date()) => {
        return toISTDateTimeString(date);
    };

    const [punchInForm, setPunchInForm] = useState({
        vehicleId: '',
        km: '',
        date: getLocalYYYYMMDDHHMM(), // datetime-local format
        pickUpLocation: 'Office'
    });
    const [punchOutForm, setPunchOutForm] = useState({
        km: '',
        date: getLocalYYYYMMDDHHMM(), // datetime-local format
        fuelAmount: '',
        parkingAmount: '',
        review: '',
        dropLocation: 'Office',
        parkingPaidBy: 'Self'
    });

    const getLocalYYYYMMDD = (date = new Date()) => {
        return toISTDateString(date);
    };

    const getToday = () => getLocalYYYYMMDD();

    const fetchVehicles = async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=fleet`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setVehicles(data.vehicles || []);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (showManualModal || showPunchInModal) fetchVehicles();
    }, [showManualModal, showPunchInModal]);

    // Pre-populate Punch In form when modal opens and vehicles are loaded
    useEffect(() => {
        if (showPunchInModal && selectedDriverForManual && vehicles.length > 0) {
            const assignedVId = selectedDriverForManual.assignedVehicle?._id || selectedDriverForManual.assignedVehicle;
            if (assignedVId && !punchInForm.vehicleId) {
                const v = vehicles.find(v => v._id === assignedVId.toString());
                if (v) {
                    setPunchInForm(prev => ({
                        ...prev,
                        vehicleId: v._id,
                        km: v.lastOdometer || ''
                    }));
                }
            }
        }
    }, [showPunchInModal, selectedDriverForManual, vehicles]);

    const handleManualDutySubmission = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.post('/api/admin/manual-duty', {
                ...manualDutyForm,
                driverId: selectedDriverForManual._id,
                companyId: selectedCompany._id
            }, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setShowManualModal(false);
            setManualDutyForm({
                date: '',
                vehicleId: '',
                punchInKM: '',
                punchOutKM: '',
                parkingAmount: '',
                allowanceTA: false,
                nightStayAmount: false,
                otherBonus: '',
                review: ''
            });
            alert('Manual duty entry added successfully');
            fetchDrivers();
        } catch (err) {
            alert(err.response?.data?.message || 'Error adding manual duty');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAdminPunchIn = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.post('/api/admin/punch-in', {
                ...punchInForm,
                date: punchInForm.date.split('T')[0],
                time: punchInForm.date,
                driverId: selectedDriverForManual._id,
                companyId: selectedCompany._id
            }, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setShowPunchInModal(false);
            setPunchInForm({ vehicleId: '', km: '', date: getLocalYYYYMMDDHHMM(), pickUpLocation: 'Office' });
            alert('Driver Punched In successfully');
            fetchDrivers();
        } catch (err) {
            alert(err.response?.data?.message || 'Error punching in');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAdminPunchOut = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.post('/api/admin/punch-out', {
                ...punchOutForm,
                date: punchOutForm.date.split('T')[0],
                time: punchOutForm.date,
                driverId: selectedDriverForManual._id
            }, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setShowPunchOutModal(false);
            setPunchOutForm({ km: '', date: getLocalYYYYMMDDHHMM(), fuelAmount: '', parkingAmount: '', review: '', dropLocation: 'Office', parkingPaidBy: 'Self' });
            alert('Driver Punched Out successfully');
            fetchDrivers();
        } catch (err) {
            alert(err.response?.data?.message || 'Error punching out');
        } finally {
            setSubmitting(false);
        }
    };

    const openManualDutyModal = (driver) => {
        setSelectedDriverForManual(driver);
        setManualDutyForm(prev => ({
            ...prev,
            date: ''
        }));
        setShowManualModal(true);
    };



    useEffect(() => {
        if (selectedCompany) {
            fetchDrivers();
        }
    }, [selectedCompany]);

    // ── AI AGENT SEARCH INTEGRATION ──
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const searchParam = params.get('search') || params.get('name') || params.get('driver');
        if (searchParam) setSearchTerm(searchParam);
    }, [location.search]);

    useEffect(() => {
        const resetAll = () => {
            setSearchTerm('');
            setShowModal(false);
            setShowEditModal(false);
            setShowManualModal(false);
            setShowPunchInModal(false);
            setShowPunchOutModal(false);
            setName('');
            setMobile('');
            setUsername('');
            setPassword('');
            setLicenseNumber('');
            setDailyWage('');
            setNightStayBonus('');
            setSameDayReturnBonus('');
            setSameDayReturnEnabled(false);
            setDocs({ aadharCard: null, drivingLicense: null, offerLetter: null });
            setOvertime({ enabled: false, threshold: 9, rate: 0 });
            setManualDutyForm({
                date: '',
                vehicleId: '',
                punchInKM: '',
                punchOutKM: '',
                parkingAmount: '',
                allowanceTA: false,
                nightStayAmount: false,
                otherBonus: '',
                review: ''
            });
            setPunchInForm({ vehicleId: '', km: '', date: nowISTDateTimeString(), pickUpLocation: 'Office' });
            setPunchOutForm({ km: '', date: nowISTDateTimeString(), fuelAmount: '', parkingAmount: '', review: '', dropLocation: 'Office', parkingPaidBy: 'Self' });
        };

        resetAll();
        return () => resetAll();
    }, [location.pathname, location.key]);

    const fetchDrivers = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            if (!userInfo) return;
            const { data } = await axios.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false&isFreelancer=false`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setDrivers(data.drivers || []);
            if (data.stats) setBackendStats(data.stats);
            console.log('Fetched Drivers:', data.drivers, data.stats);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleCreateDriver = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('mobile', mobile);
            formData.append('username', username);
            formData.append('password', password);
            formData.append('licenseNumber', licenseNumber);
            formData.append('companyId', selectedCompany._id);
            formData.append('isFreelancer', isFreelancer);
            formData.append('dailyWage', dailyWage);
            formData.append('salary', dailyWage);
            formData.append('nightStayBonus', nightStayBonus);
            formData.append('sameDayReturnBonus', sameDayReturnBonus);
            formData.append('sameDayReturnEnabled', sameDayReturnEnabled);

            // Overtime
            formData.append('overtimeEnabled', overtime.enabled);
            formData.append('overtimeThreshold', overtime.threshold);
            formData.append('overtimeRate', overtime.rate);

            // Documents
            if (docs.aadharCard) formData.append('aadharCard', docs.aadharCard);
            if (docs.drivingLicense) formData.append('drivingLicense', docs.drivingLicense);
            if (docs.offerLetter) formData.append('offerLetter', docs.offerLetter);

            await axios.post('/api/admin/drivers', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${JSON.parse(localStorage.getItem('userInfo')).token}`
                }
            });
            setShowModal(false);
            setName(''); setMobile(''); setUsername(''); setPassword(''); setLicenseNumber(''); setIsFreelancer(false); setDailyWage(''); setNightStayBonus(''); setSameDayReturnBonus('');
            setDocs({ aadharCard: null, drivingLicense: null, offerLetter: null });
            setOvertime({ enabled: false, threshold: 9, rate: 0 });
            fetchDrivers();
            alert('Driver registered successfully');
        } catch (err) {
            alert(err.response?.data?.message || 'Error creating driver');
        } finally { setSubmitting(false); }
    };

    const toggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
        try {
            await axios.patch(`/api/admin/drivers/${id}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('userInfo')).token}` }
            });
            fetchDrivers();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this driver? All assignments will be cleared.')) return;
        try {
            await axios.delete(`/api/admin/drivers/${id}`, {
                headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('userInfo')).token}` }
            });
            fetchDrivers();
        } catch (err) {
            alert(err.response?.data?.message || 'Error deleting driver');
        }
    };

    const handleUpdateDriver = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('name', editForm.name);
            formData.append('mobile', editForm.mobile);
            formData.append('username', editForm.username);
            formData.append('licenseNumber', editForm.licenseNumber);
            formData.append('dailyWage', editForm.dailyWage);
            formData.append('salary', editForm.dailyWage);
            formData.append('nightStayBonus', editForm.nightStayBonus);
            formData.append('sameDayReturnBonus', editForm.sameDayReturnBonus);
            formData.append('sameDayReturnEnabled', editForm.sameDayReturnEnabled);
            formData.append('isFreelancer', editForm.isFreelancer);

            // Overtime
            formData.append('overtimeEnabled', editForm.overtimeEnabled);
            formData.append('overtimeThreshold', editForm.overtimeThreshold);
            formData.append('overtimeRate', editForm.overtimeRate);

            if (editForm.password) {
                formData.append('password', editForm.password);
            }
            if (editForm.oldPassword) {
                formData.append('oldPassword', editForm.oldPassword);
            }

            // Documents
            if (docs.aadharCard) formData.append('aadharCard', docs.aadharCard);
            if (docs.drivingLicense) formData.append('drivingLicense', docs.drivingLicense);
            if (docs.offerLetter) formData.append('offerLetter', docs.offerLetter);

            await axios.put(`/api/admin/drivers/${editingDriver._id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${JSON.parse(localStorage.getItem('userInfo')).token}`
                }
            });
            setShowEditModal(false);
            setEditingDriver(null);
            setEditForm({ name: '', mobile: '', username: '', password: '', licenseNumber: '', dailyWage: '', nightStayBonus: '', sameDayReturnBonus: '', sameDayReturnEnabled: false, isFreelancer: false, overtimeEnabled: false, overtimeThreshold: 9, overtimeRate: 0 });
            setDocs({ aadharCard: null, drivingLicense: null, offerLetter: null });
            fetchDrivers();
            alert('Driver updated successfully');
        } catch (err) {
            alert(err.response?.data?.message || 'Error updating driver');
        } finally { setSubmitting(false); }
    };

    const openEditModal = (driver) => {
        setEditingDriver(driver);
        setEditForm({
            name: driver.name,
            mobile: driver.mobile,
            username: driver.username || '',
            licenseNumber: driver.licenseNumber || '',
            dailyWage: driver.dailyWage || '',
            nightStayBonus: driver.nightStayBonus !== undefined && driver.nightStayBonus !== null ? String(driver.nightStayBonus) : '',
            sameDayReturnBonus: driver.sameDayReturnBonus !== undefined && driver.sameDayReturnBonus !== null ? String(driver.sameDayReturnBonus) : '',
            sameDayReturnEnabled: driver.sameDayReturnEnabled || false,
            isFreelancer: driver.isFreelancer || false,
            password: '',
            oldPassword: '',
            overtimeEnabled: driver.overtime?.enabled || false,
            overtimeThreshold: driver.overtime?.thresholdHours || 9,
            overtimeRate: driver.overtime?.ratePerHour || 0
        });
        setDocs({ aadharCard: null, drivingLicense: null, offerLetter: null });
        setShowEditModal(true);
    };

    const handleVerifyDoc = async (driverId, docId, status) => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const response = await axios.patch(`/api/admin/drivers/${driverId}/documents/${docId}/verify`, { status }, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            
            if (response.data.driver) {
                setEditingDriver(response.data.driver);
            }
            
            fetchDrivers();
            toast.success(`Document ${status} successfully`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error verifying document');
        }
    };


    const [searchTerm, setSearchTerm] = useState('');

    const filteredDrivers = drivers.filter(d => {
        const matchesSearch = d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.mobile?.includes(searchTerm) ||
            d.username?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesOnDuty = onlyOnDuty ? !!d.activeAttendance : true;
        const matchesCompleted = showCompletedOnly ? !!d.dutyCompletedToday : true;

        return !d.isFreelancer && matchesSearch && matchesOnDuty && matchesCompleted;
    });

    const staffDriversList = drivers.filter(d => !d.isFreelancer);

    // Stats from backend are more reliable because they are company-wide (not affected by browser pagination)
    const totalDrivers = backendStats.total || staffDriversList.length;
    const activeDrivers = backendStats.active || staffDriversList.filter(d => d.status === 'active').length;
    const blockedDrivers = backendStats.blocked || staffDriversList.filter(d => d.status === 'blocked').length;

    return (
        <div key={location.key} className={isSubComponent ? "sub-component" : "container-fluid"} style={{ paddingBottom: '40px' }}>
            {!isSubComponent && <SEO title="Manage Drivers" description="View and manage all registered drivers in your fleet management system." />}

            {/* Header Section */}
            {!isSubComponent && (
                <header className="drivers-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{
                            width: 'clamp(40px, 10vw, 50px)',
                            height: 'clamp(40px, 10vw, 50px)',
                            background: 'linear-gradient(135deg, white, #f8fafc)',
                            borderRadius: '16px',
                            padding: '8px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            boxShadow: `0 10px 25px ${theme.primary}30`
                        }}>
                            <Users size={28} color={theme.primary} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.primary, boxShadow: `0 0 8px ${theme.primary}` }}></div>
                                <span style={{ fontSize: 'clamp(9px,2.5vw,10px)', fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase' }}>Fleet Operations</span>
                            </div>
                            <h1 style={{ color: 'white', fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: '900', margin: 0, letterSpacing: '-1.5px', cursor: 'pointer' }}>
                                Staff <span className="theme-gradient-text">Drivers</span>
                            </h1>
                        </div>
                    </div>
                    <div className="mobile-search-row" style={{ display: 'flex', gap: '10px', flex: '1', justifyContent: 'flex-end', flexWrap: 'wrap' }}>

                        <div className="glass-card" style={{ padding: '0', display: 'flex', alignItems: 'center', width: '100%', maxWidth: '380px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', flex: '1 1 auto' }}>
                            <Search size={18} style={{ margin: '0 15px', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                            <input
                                type="text"
                                placeholder="Search drivers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    height: '52px',
                                    width: '100%',
                                    outline: 'none',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    minWidth: 0
                                }}
                            />
                        </div>
                        <button
                            className="glass-card-hover-effect btn-primary"
                            onClick={() => setShowModal(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                height: '52px',
                                padding: '0 25px',
                                borderRadius: '14px',
                                fontWeight: '800',
                                fontSize: '14px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                            }}
                        >
                            <Plus size={20} /> <span className="hide-mobile">Register</span><span className="show-mobile">Add</span>
                        </button>
                    </div>
                </header>
            )}

            {/* Sub-component quick header (Search and Add) */}
            {isSubComponent && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 style={{ color: 'white', fontSize: '18px', fontWeight: '800', margin: 0 }}>Driver List</h2>
                        <span style={{ padding: '4px 8px', borderRadius: '6px', background: `${theme.primary}15`, color: theme.primary, fontSize: '11px', fontWeight: '800' }}>{filteredDrivers.length} TOTAL</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div className="glass-card" style={{ padding: '0', display: 'flex', alignItems: 'center', width: '220px', borderRadius: '10px', height: '40px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <Search size={16} style={{ margin: '0 10px', color: 'rgba(255,255,255,0.4)' }} />
                            <input type="text" placeholder="Quick search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '12px', outline: 'none', width: '100%' }} />
                        </div>
                        <button onClick={() => setShowModal(true)} className="btn-primary" style={{ height: '40px', padding: '0 15px', borderRadius: '10px', fontSize: '12px', gap: '6px', display: 'flex', alignItems: 'center' }}>
                            <Plus size={16} /> ADD NEW
                        </button>
                    </div>
                </div>
            )}

            <div className="stats-grid">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card" style={{ padding: 'clamp(15px, 2.5vw, 20px)', display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.03)', cursor: 'default' }}>
                    <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><UserIcon size={22} /></div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', margin: 0 }}>Total Workforce</p>
                        <h3 style={{ color: 'white', fontSize: '24px', fontWeight: '900', margin: '4px 0 0' }}>{totalDrivers}</h3>
                    </div>
                </motion.div>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card" style={{ padding: 'clamp(15px, 2.5vw, 20px)', display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.03)', cursor: 'default' }}>
                    <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '50%' }}></div></div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', margin: 0 }}>Active Logins</p>
                        <h3 style={{ color: 'white', fontSize: '24px', fontWeight: '900', margin: '4px 0 0' }}>{activeDrivers}</h3>
                    </div>
                </motion.div>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card" style={{ padding: 'clamp(15px, 2.5vw, 20px)', display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.03)', cursor: 'default' }}>
                    <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><ShieldAlert size={22} /></div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', margin: 0 }}>Blocked / Inactive</p>
                        <h3 style={{ color: 'white', fontSize: '24px', fontWeight: '900', margin: '4px 0 0' }}>{blockedDrivers}</h3>
                    </div>
                </motion.div>
            </div>

            {/* Desktop Table */}
            <div className="glass-card hide-mobile" style={{ padding: '0', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)', background: 'transparent' }}>
                <div className="table-responsive-wrapper">
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 12px' }}>
                        <thead>
                            <tr style={{ textAlign: 'left' }}>
                                <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Personnel Profile</th>
                                {!(onlyOnDuty || showCompletedOnly) && (
                                    <>
                                        <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Contact Info</th>
                                        <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Credentials</th>
                                    </>
                                )}
                                <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
                                <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {filteredDrivers.length === 0 ? (
                                    <tr><td colSpan={onlyOnDuty || showCompletedOnly ? 3 : 5} style={{ textAlign: 'center', padding: '80px 0' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.02)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px' }}>
                                            <Search size={32} style={{ opacity: 0.3, color: 'white' }} />
                                        </div>
                                        <h3 style={{ color: 'white', fontWeight: '800', margin: '0 0 5px' }}>No Personnel Found</h3>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Try adjusting your search criteria or add a new driver.</p>
                                    </td></tr>
                                ) : (
                                    filteredDrivers.map((driver, idx) => (
                                        <motion.tr
                                            key={driver._id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="glass-card-hover-effect"
                                            style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '12px' }}
                                        >
                                            <td style={{ padding: '20px 25px', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <div style={{
                                                        width: '40px', height: '40px', borderRadius: '10px',
                                                        background: driver.isFreelancer ? 'linear-gradient(135deg, #8b5cf6, #d8b4fe)' : 'linear-gradient(135deg, var(--primary), #93c5fd)',
                                                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                                                        color: 'white', fontWeight: '800', fontSize: '16px'
                                                    }}>
                                                        {driver.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ color: 'white', fontWeight: '800', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {driver.name}
                                                        </div>
                                                        {!(onlyOnDuty || showCompletedOnly) && (
                                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>@{driver.username || 'no-username'}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            {!(onlyOnDuty || showCompletedOnly) && (
                                                <>
                                                    <td style={{ padding: '20px 25px' }}>
                                                        <div style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>{driver.mobile}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mobile Number</div>
                                                    </td>
                                                    <td style={{ padding: '20px 25px' }}>
                                                        <div style={{ color: 'white', fontSize: '13px', fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>{driver.licenseNumber || 'NOT PROVIDED'}</div>
                                                    </td>
                                                </>
                                            )}
                                            <td style={{ padding: '20px 25px' }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '6px 14px',
                                                    borderRadius: '20px',
                                                    fontSize: '11px',
                                                    fontWeight: '800',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    background: driver.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                                                    color: driver.status === 'active' ? '#10b981' : '#f43f5e',
                                                    border: driver.status === 'active' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(244, 63, 94, 0.2)'
                                                }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 5px currentColor' }}></span>
                                                    {driver.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '20px 25px', textAlign: 'right', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => navigate(`/admin/drivers-panel?tab=settlement&driver=${driver.name}`)}
                                                        className="glass-card-hover-effect"
                                                        style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', width: '36px', height: '36px', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
                                                        title="View Salary/Settlement"
                                                    >
                                                        <IndianRupee size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(driver)}
                                                        className="glass-card-hover-effect"
                                                        style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', width: '36px', height: '36px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
                                                        title="Edit Profile"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => toggleStatus(driver._id, driver.status)}
                                                        className="glass-card-hover-effect"
                                                        style={{
                                                            background: driver.status === 'active' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                            color: driver.status === 'active' ? 'var(--primary)' : '#10b981',
                                                            width: '36px', height: '36px',
                                                            borderRadius: '8px',
                                                            border: `1px solid ${driver.status === 'active' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                                                            display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer'
                                                        }}
                                                        title={driver.status === 'active' ? 'Block Access' : 'Activate Access'}
                                                    >
                                                        <ShieldAlert size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setSelectedDriverForManual(driver); setShowPunchInModal(true); }}
                                                        className="glass-card-hover-effect"
                                                        style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: '36px', height: '36px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
                                                        title="Punch In (Duty +)"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setSelectedDriverForManual(driver); setShowPunchOutModal(true); }}
                                                        className="glass-card-hover-effect"
                                                        style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', width: '36px', height: '36px', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
                                                        title="Punch Out (Duty -)"
                                                    >
                                                        <Minus size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(driver._id)}
                                                        className="glass-card-hover-effect"
                                                        style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', width: '36px', height: '36px', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
                                                        title="Delete Record"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="show-mobile">
                <AnimatePresence>
                    {filteredDrivers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 15px' }}>
                                <Search size={24} style={{ opacity: 0.3, color: 'white' }} />
                            </div>
                            <h3 style={{ color: 'white', fontWeight: '800', margin: '0 0 5px', fontSize: '16px' }}>No Drivers Found</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Try adjusting your search criteria.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {filteredDrivers.map((driver, idx) => (
                                <motion.div
                                    key={driver._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass-card"
                                    style={{ padding: '20px', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                            <div style={{
                                                width: '48px', height: '48px', borderRadius: '12px',
                                                background: driver.isFreelancer ? 'linear-gradient(135deg, #8b5cf6, #d8b4fe)' : 'linear-gradient(135deg, var(--primary), #93c5fd)',
                                                display: 'flex', justifyContent: 'center', alignItems: 'center',
                                                color: 'white', fontWeight: '800', fontSize: '18px'
                                            }}>
                                                {driver.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ color: 'white', fontWeight: '800', fontSize: '16px' }}>{driver.name}</div>
                                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>@{driver.username || 'no-username'}</div>
                                            </div>
                                        </div>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '10px',
                                            fontWeight: '800',
                                            textTransform: 'uppercase',
                                            background: driver.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                                            color: driver.status === 'active' ? '#10b981' : '#f43f5e',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                            {driver.status}
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px' }}>
                                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.5px' }}>MOBILE</div>
                                            <div style={{ color: 'white', fontWeight: '600', fontSize: '14px' }}>{driver.mobile}</div>
                                        </div>
                                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px' }}>
                                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.5px' }}>LICENSE</div>
                                            <div style={{ color: 'white', fontWeight: '600', fontSize: '14px', fontFamily: 'monospace' }}>{driver.licenseNumber || 'N/A'}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                                        <button onClick={() => { setViewingDriver(driver); setShowViewModal(true); }} style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="View Profile"><Eye size={16} /></button>
                                        <button onClick={() => navigate(`/admin/drivers-panel?tab=settlement&driver=${driver.name}`)} style={{ padding: '10px', borderRadius: '8px', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.2)', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Salary</button>
                                        <button onClick={() => openEditModal(driver)} style={{ padding: '10px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Edit</button>
                                        <button onClick={() => toggleStatus(driver._id, driver.status)} style={{ padding: '10px', borderRadius: '8px', background: driver.status === 'active' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: driver.status === 'active' ? '#f59e0b' : '#10b981', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>{driver.status === 'active' ? 'Block' : 'Active'}</button>
                                        <button onClick={() => { setSelectedDriverForManual(driver); setShowPunchInModal(true); }} style={{ padding: '10px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>In</button>
                                        <button onClick={() => { setSelectedDriverForManual(driver); setShowPunchOutModal(true); }} style={{ padding: '10px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Out</button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Add Driver Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="modal-overlay">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="modal-content-wrapper"
                            style={{ maxWidth: '800px', padding: 'clamp(20px, 5vw, 40px)' }}
                        >
                            <div style={{ padding: '25px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, rgba(255,255,255,0.02), transparent)' }}>
                                <div>
                                    <h2 style={{ color: 'white', fontSize: '18px', fontWeight: '800', margin: 0 }}>Onboard New Driver</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0 0' }}>Enter personnel details to generate profile credential.</p>
                                </div>
                                <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer', border: 'none' }}><Plus size={20} style={{ transform: 'rotate(45deg)' }} /></button>
                            </div>

                            <form onSubmit={handleCreateDriver} style={{ padding: '25px' }}>
                                <div style={{ marginBottom: '20px' }}>
                                    <p style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>Identity & Access</p>
                                    <div className="modal-form-grid">
                                        <div className="form-group">
                                            <label>Full Name *</label>
                                            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Mobile Number *</label>
                                            <input className="input-field" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
                                        </div>
                                        <div className="form-group">
                                            <label>System Username</label>
                                            <input className="input-field" value={username} onChange={(e) => setUsername(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>Password *</label>
                                            <input 
                                                type="password" 
                                                name="driver-password"
                                                autoComplete="new-password"
                                                className="input-field" 
                                                value={password} 
                                                onChange={(e) => setPassword(e.target.value)} 
                                                required={!isFreelancer} 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '25px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <p style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>Contract & Details</p>

                                    <div className="modal-form-grid" style={{ marginBottom: '15px' }}>
                                        <div className="form-group">
                                            <label>Daily Wage (Salary)</label>
                                            <input type="number" className="input-field" value={dailyWage} onChange={(e) => setDailyWage(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>Driving License Number</label>
                                            <input className="input-field" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>Night Stay Bonus</label>
                                            <input type="number" className="input-field" value={nightStayBonus} onChange={(e) => setNightStayBonus(e.target.value)} />
                                        </div>
                                        {sameDayReturnEnabled && (
                                            <div className="form-group">
                                                <label>Same Day Return Bonus (₹)</label>
                                                <input type="number" className="input-field" value={sameDayReturnBonus} onChange={(e) => setSameDayReturnBonus(e.target.value)} placeholder="Enter amount" />
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ marginTop: '10px', padding: '15px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.1)', marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <p style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <IndianRupee size={14} /> Same Day Return Policy
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setSameDayReturnEnabled(!sameDayReturnEnabled)}
                                                style={{
                                                    background: sameDayReturnEnabled ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '4px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '10px',
                                                    fontWeight: '800',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {sameDayReturnEnabled ? 'ENABLED' : 'DISABLED'}
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '20px' }}>
                                        <p style={{ color: '#8b5cf6', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <FileText size={14} /> Documentation (Uploads)
                                        </p>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                                            {[
                                                { label: 'Aadhar Card', key: 'aadharCard' },
                                                { label: 'License Copy', key: 'drivingLicense' },
                                                { label: 'Offer Letter', key: 'offerLetter' }
                                            ].map(item => (
                                                <label key={item.key} style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '12px',
                                                    background: docs[item.key] ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.03)',
                                                    borderRadius: '12px',
                                                    border: docs[item.key] ? '1px dashed #8b5cf6' : '1px dashed rgba(255,255,255,0.1)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease'
                                                }}>
                                                    <div style={{ color: docs[item.key] ? '#8b5cf6' : 'rgba(255,255,255,0.4)' }}>
                                                        {docs[item.key] ? <CheckCircle size={20} /> : <Plus size={20} />}
                                                    </div>
                                                    <span style={{ fontSize: '10px', color: docs[item.key] ? '#8b5cf6' : 'white', fontWeight: '700', textAlign: 'center' }}>{docs[item.key] ? docs[item.key].name.substring(0, 15) + '...' : item.label}</span>
                                                    <input type="file" hidden onChange={(e) => setDocs({ ...docs, [item.key]: e.target.files[0] })} />
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '25px', padding: '15px', background: 'rgba(244, 63, 94, 0.05)', borderRadius: '12px', border: '1px solid rgba(244, 63, 94, 0.1)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                            <p style={{ color: '#f43f5e', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Clock size={14} /> Overtime (O/T) Settings
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setOvertime({ ...overtime, enabled: !overtime.enabled })}
                                                style={{
                                                    background: overtime.enabled ? '#f43f5e' : 'rgba(255,255,255,0.05)',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '4px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '10px',
                                                    fontWeight: '800',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {overtime.enabled ? 'ENABLED' : 'DISABLED'}
                                            </button>
                                        </div>

                                        {overtime.enabled && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="modal-form-grid">
                                                <div className="form-group">
                                                    <label>Threshold (Hours)</label>
                                                    <input type="number" className="input-field" value={overtime.threshold} onChange={(e) => setOvertime({ ...overtime, threshold: e.target.value })} />
                                                </div>
                                                <div className="form-group">
                                                    <label>O/T Rate (Per Hour)</label>
                                                    <input type="number" className="input-field" value={overtime.rate} onChange={(e) => setOvertime({ ...overtime, rate: e.target.value })} />
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <button
                                        type="button"
                                        className="glass-card-hover-effect"
                                        style={{ flex: '1', padding: '14px', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: '700', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
                                        onClick={() => setShowModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="glass-card-hover-effect"
                                        style={{
                                            flex: '2',
                                            padding: '14px',
                                            background: 'linear-gradient(135deg, var(--secondary), var(--primary))',
                                            color: 'white',
                                            fontWeight: '800',
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Create Profile
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Driver Modal */}
            <AnimatePresence>
                {showEditModal && (
                    <div className="modal-overlay">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="modal-content-wrapper"
                            style={{ maxWidth: '800px', padding: 'clamp(20px, 5vw, 40px)' }}
                        >
                            <div style={{ padding: '25px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, rgba(255,255,255,0.02), transparent)' }}>
                                <div>
                                    <h2 style={{ color: 'white', fontSize: '18px', fontWeight: '800', margin: 0 }}>Update Profile</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0 0' }}>Editing details for <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{editingDriver?.name}</span></p>
                                </div>
                                <button onClick={() => { setShowEditModal(false); setEditingDriver(null); }} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer', border: 'none' }}><Plus size={20} style={{ transform: 'rotate(45deg)' }} /></button>
                            </div>
                            <form onSubmit={handleUpdateDriver} style={{ padding: '25px' }}>
                                    <div style={{ marginBottom: '20px' }}>
                                        <p style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>Identity & Access</p>
                                        <div style={{ marginBottom: '15px' }}>
                                            <label className="input-label" style={{ marginBottom: '6px' }}>Username</label>
                                            <input className="input-field" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} style={{ background: 'rgba(0,0,0,0.2)' }} />
                                        </div>
                                        <div style={{ marginBottom: '15px' }}>
                                            <label className="input-label" style={{ marginBottom: '6px' }}>Password</label>
                                            <input 
                                                type="password" 
                                                name="edit-driver-password" 
                                                autoComplete="new-password"
                                                className="input-field" 
                                                value={editForm.password} 
                                                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} 
                                                placeholder="Enter new password" 
                                                style={{ background: 'rgba(0,0,0,0.2)' }} 
                                            />
                                        </div>
                                    </div>

                                <div style={{ marginBottom: '25px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <p style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>Contract & Details</p>

                                    <div className="form-grid-2" style={{ marginBottom: '15px' }}>
                                        <div>
                                            <label className="input-label" style={{ marginBottom: '6px' }}>Daily Wage (Salary)</label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>₹</span>
                                                <input type="number" className="input-field" value={editForm.dailyWage} onChange={(e) => setEditForm({ ...editForm, dailyWage: e.target.value })} style={{ background: 'rgba(0,0,0,0.2)', paddingLeft: '28px' }} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="input-label" style={{ marginBottom: '6px' }}>License Number</label>
                                            <input className="input-field" value={editForm.licenseNumber} onChange={(e) => setEditForm({ ...editForm, licenseNumber: e.target.value })} style={{ background: 'rgba(0,0,0,0.2)' }} />
                                        </div>
                                    </div>

                                    <div className="form-grid-2" style={{ marginBottom: '15px' }}>
                                        <div>
                                            <label className="input-label" style={{ marginBottom: '6px' }}>Night Stay Bonus</label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>₹</span>
                                                <input type="number" className="input-field" value={editForm.nightStayBonus} onChange={(e) => setEditForm({ ...editForm, nightStayBonus: e.target.value })} style={{ background: 'rgba(0,0,0,0.2)', paddingLeft: '28px' }} />
                                            </div>
                                        </div>
                                    {editForm.sameDayReturnEnabled && (
                                        <div className="form-grid-1" style={{ marginBottom: '15px' }}>
                                            <div>
                                                <label className="input-label" style={{ marginBottom: '6px' }}>Same Day Return Bonus</label>
                                                <div style={{ position: 'relative' }}>
                                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>₹</span>
                                                    <input type="number" className="input-field" value={editForm.sameDayReturnBonus} onChange={(e) => setEditForm({ ...editForm, sameDayReturnBonus: e.target.value })} style={{ background: 'rgba(0,0,0,0.2)', paddingLeft: '28px' }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    </div>

                                    <div style={{ marginTop: '10px', padding: '15px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.1)', marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <p style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <IndianRupee size={14} /> Same Day Return Policy
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setEditForm({ ...editForm, sameDayReturnEnabled: !editForm.sameDayReturnEnabled })}
                                                style={{
                                                    background: editForm.sameDayReturnEnabled ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '4px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '10px',
                                                    fontWeight: '800',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {editForm.sameDayReturnEnabled ? 'ENABLED' : 'DISABLED'}
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '20px' }}>
                                        <p style={{ color: '#8b5cf6', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <FileText size={14} /> Documentation Status
                                        </p>

                                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '15px' }}>
                                            {editingDriver.documents && editingDriver.documents.length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {editingDriver.documents.map(doc => (
                                                        <div key={doc._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '6px', borderRadius: '6px' }}><FileText size={14} /></div>
                                                                <div>
                                                                    <div style={{ fontSize: '12px', color: 'white', fontWeight: '700' }}>{doc.documentType}</div>
                                                                    <div style={{ fontSize: '10px', color: doc.verificationStatus === 'Verified' ? '#10b981' : doc.verificationStatus === 'Rejected' ? '#f43f5e' : 'var(--primary)', fontWeight: '800', textTransform: 'uppercase' }}>
                                                                        {doc.verificationStatus === 'Pending' ? 'UPLOADED (AWAITING VERIFICATION)' : doc.verificationStatus}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                                <button type="button" onClick={() => { setViewingDocUrl(doc.imageUrl); setShowDocViewer(true); }} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', padding: '6px', borderRadius: '6px', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center' }} title="View Document"><Eye size={14} /></button>
                                                                {doc.verificationStatus !== 'Verified' && (
                                                                    <button type="button" onClick={() => handleVerifyDoc(editingDriver._id, doc._id, 'Verified')} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}><CheckCircle size={14} /></button>
                                                                )}
                                                                {doc.verificationStatus !== 'Rejected' && (
                                                                    <button type="button" onClick={() => handleVerifyDoc(editingDriver._id, doc._id, 'Rejected')} style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}><XCircle size={14} /></button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '10px' }}>No documents uploaded yet.</div>
                                            )}

                                            <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                                                <label className="input-label" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', display: 'block' }}>Update Documents</label>
                                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                    {[
                                                        { label: '+ Aadhaar', key: 'aadharCard' },
                                                        { label: '+ License', key: 'drivingLicense' },
                                                        { label: '+ Offer Letter', key: 'offerLetter' }
                                                    ].map(item => (
                                                        <label key={item.key} style={{
                                                            padding: '6px 12px',
                                                            background: docs[item.key] ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                                            borderRadius: '8px',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            fontSize: '10px',
                                                            color: docs[item.key] ? '#a78bfa' : 'white',
                                                            cursor: 'pointer',
                                                            fontWeight: '700'
                                                        }}>
                                                            {docs[item.key] ? 'File Ready' : item.label}
                                                            <input type="file" hidden onChange={(e) => setDocs({ ...docs, [item.key]: e.target.files[0] })} />
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '25px', padding: '15px', background: 'rgba(244, 63, 94, 0.05)', borderRadius: '12px', border: '1px solid rgba(244, 63, 94, 0.1)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                            <p style={{ color: '#f43f5e', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Clock size={14} /> Overtime (O/T) Settings
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setEditForm({ ...editForm, overtimeEnabled: !editForm.overtimeEnabled })}
                                                style={{
                                                    background: editForm.overtimeEnabled ? '#f43f5e' : 'rgba(255,255,255,0.05)',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '4px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '10px',
                                                    fontWeight: '800',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {editForm.overtimeEnabled ? 'ENABLED' : 'DISABLED'}
                                            </button>
                                        </div>

                                        {editForm.overtimeEnabled && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="form-grid-2">
                                                <div>
                                                    <label className="input-label" style={{ fontSize: '10px' }}>Threshold (Hours)</label>
                                                    <input type="number" className="input-field" value={editForm.overtimeThreshold} onChange={(e) => setEditForm({ ...editForm, overtimeThreshold: e.target.value })} placeholder="e.g. 9" style={{ background: 'rgba(0,0,0,0.2)', height: '36px', fontSize: '13px' }} />
                                                </div>
                                                <div>
                                                    <label className="input-label" style={{ fontSize: '10px' }}>O/T Rate (Per Hour)</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>₹</span>
                                                        <input type="number" className="input-field" value={editForm.overtimeRate} onChange={(e) => setEditForm({ ...editForm, overtimeRate: e.target.value })} placeholder="0" style={{ background: 'rgba(0,0,0,0.2)', paddingLeft: '24px', height: '36px', fontSize: '13px' }} />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <button
                                        type="button"
                                        className="glass-card-hover-effect"
                                        style={{ flex: '1', padding: '14px', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: '700', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
                                        onClick={() => { setShowEditModal(false); setEditingDriver(null); }}
                                    >
                                        Discard
                                    </button>
                                    <button
                                        type="submit"
                                        className="glass-card-hover-effect"
                                        style={{
                                            flex: '2',
                                            padding: '14px',
                                            background: 'linear-gradient(135deg, var(--secondary), var(--primary))',
                                            color: 'white',
                                            fontWeight: '800',
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Manual Duty Entry Modal */}
            <AnimatePresence>
                {showManualModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="glass-card"
                            style={{ padding: '0', width: '100%', maxWidth: '600px', maxHeight: '95vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a' }}
                        >
                            <div style={{ padding: '25px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, rgba(139, 92, 246, 0.05), transparent)' }}>
                                <div>
                                    <h2 style={{ color: 'white', fontSize: '18px', fontWeight: '800', margin: 0 }}>Insert Past Duty Record</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0 0' }}>Manually adding duty for <span style={{ color: '#a78bfa', fontWeight: '700' }}>{selectedDriverForManual?.name}</span></p>
                                </div>
                                <button onClick={() => setShowManualModal(false)} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer', border: 'none' }}><Plus size={20} style={{ transform: 'rotate(45deg)' }} /></button>
                            </div>

                            <form onSubmit={handleManualDutySubmission} style={{ padding: '25px' }}>
                                <div className="form-grid-2" style={{ marginBottom: '20px' }}>
                                    <div>
                                        <label className="input-label">Duty Date *</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                id="manual-duty-picker"
                                                type="date"
                                                className="input-field"
                                                value={manualDutyForm.date}
                                                onChange={(e) => setManualDutyForm({ ...manualDutyForm, date: e.target.value })}
                                                required
                                                onClick={(e) => e.target.showPicker()}
                                                style={{ colorScheme: 'dark', background: 'rgba(0,0,0,0.2)', cursor: 'pointer', width: '100%' }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="input-label">Vehicle *</label>
                                        <select className="input-field" value={manualDutyForm.vehicleId} onChange={(e) => setManualDutyForm({ ...manualDutyForm, vehicleId: e.target.value })} required style={{ appearance: 'auto' }}>
                                            <option value="" style={{ background: '#1e293b', color: 'white' }}>Select Vehicle</option>
                                            {vehicles.map(v => (
                                                <option key={v._id} value={v._id} style={{ background: '#1e293b', color: 'white' }}>{v.carNumber} ({v.model})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <p style={{ color: '#a78bfa', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>Kilometer Tracking</p>
                                    <div className="form-grid-2">
                                        <div>
                                            <label className="input-label">Punch-In KM</label>
                                            <input type="number" className="input-field" value={manualDutyForm.punchInKM} onChange={(e) => setManualDutyForm({ ...manualDutyForm, punchInKM: e.target.value })} placeholder="Opening KM" />
                                        </div>
                                        <div>
                                            <label className="input-label">Punch-Out KM</label>
                                            <input type="number" className="input-field" value={manualDutyForm.punchOutKM} onChange={(e) => setManualDutyForm({ ...manualDutyForm, punchOutKM: e.target.value })} placeholder="Closing KM" />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <p style={{ color: '#10b981', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>Expenses & Bonuses</p>
                                    <div className="form-grid-3" style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                                        <div>
                                            <label className="input-label">Parking Amount (₹)</label>
                                            <input type="number" className="input-field" value={manualDutyForm.parkingAmount} onChange={(e) => setManualDutyForm({ ...manualDutyForm, parkingAmount: e.target.value })} placeholder="0" />
                                        </div>
                                        <div>
                                            <label className="input-label">Extra Bonus (₹)</label>
                                            <input type="number" className="input-field" value={manualDutyForm.otherBonus} onChange={(e) => setManualDutyForm({ ...manualDutyForm, otherBonus: e.target.value })} placeholder="0" />
                                        </div>
                                        <div>
                                            <label className="input-label">Duty Type / Remark</label>
                                            <input type="text" className="input-field" value={manualDutyForm.review} onChange={(e) => setManualDutyForm({ ...manualDutyForm, review: e.target.value })} placeholder="e.g. Local" />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', border: manualDutyForm.allowanceTA ? '1px solid #10b981' : '1px solid transparent' }} onClick={() => setManualDutyForm({ ...manualDutyForm, allowanceTA: !manualDutyForm.allowanceTA })}>
                                            <input type="checkbox" checked={manualDutyForm.allowanceTA} readOnly style={{ width: '18px', height: '18px' }} />
                                            <div>
                                                <div style={{ color: 'white', fontSize: '13px', fontWeight: '700' }}>Day Bonus</div>
                                                <div style={{ color: '#10b981', fontSize: '11px', fontWeight: '800' }}>+ ₹100</div>
                                            </div>
                                        </div>
                                        <div style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', border: manualDutyForm.nightStayAmount ? '1px solid var(--primary)' : '1px solid transparent' }} onClick={() => setManualDutyForm({ ...manualDutyForm, nightStayAmount: !manualDutyForm.nightStayAmount })}>
                                            <input type="checkbox" checked={manualDutyForm.nightStayAmount} readOnly style={{ width: '18px', height: '18px' }} />
                                            <div>
                                                <div style={{ color: 'white', fontSize: '13px', fontWeight: '700' }}>Night Bonus</div>
                                                <div style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: '800' }}>+ ₹500</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <button type="button" className="glass-card-hover-effect" style={{ flex: '1', padding: '14px', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: '700', borderRadius: '12px', border: 'none', cursor: 'pointer' }} onClick={() => setShowManualModal(false)}>Cancel</button>
                                    <button type="submit" disabled={submitting} className="glass-card-hover-effect" style={{ flex: '2', padding: '14px', background: 'linear-gradient(135deg, #8b5cf6, var(--primary))', color: 'white', fontWeight: '800', borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>{submitting ? 'Saving Record...' : 'Save Duty Record'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showPunchInModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(15px)' }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '32px', width: '100%', maxWidth: '500px', overflow: 'hidden', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.8)' }}>
                            <div style={{ padding: '30px', background: 'linear-gradient(to bottom right, rgba(16, 185, 129, 0.1), transparent)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                        <Plus color="#10b981" size={24} />
                                    </div>
                                    <div>
                                        <h2 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: '900', letterSpacing: '-0.5px' }}>Initialize Shift</h2>
                                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>Recording Start for {selectedDriverForManual?.name}</div>
                                    </div>
                                </div>
                                <button onClick={() => setShowPunchInModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                            </div>

                            <form onSubmit={handleAdminPunchIn} style={{ padding: '30px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Assign Vehicle</label>
                                        <select
                                            required
                                            value={punchInForm.vehicleId}
                                            onChange={(e) => {
                                                const vId = e.target.value;
                                                const selectedV = vehicles.find(v => v._id === vId);
                                                setPunchInForm({ ...punchInForm, vehicleId: vId, km: selectedV?.lastOdometer || '' });
                                            }}
                                            style={{ width: '100%', height: '54px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '0 20px', color: 'white', outline: 'none', fontSize: '14px', fontWeight: '600', transition: 'all 0.3s' }}
                                        >
                                            <option value="" style={{ background: '#0a0a0c' }}>Choose Vehicle</option>
                                            {vehicles.filter(v => {
                                                const isToday = punchInForm.date?.split('T')[0] === getToday();
                                                if (!isToday) return true;

                                                // Allow if no driver assigned
                                                if (!v.currentDriver) return true;

                                                // Allow if the assigned driver is same as the one we are punching in
                                                const currentDriverId = (v.currentDriver._id || v.currentDriver).toString();
                                                return currentDriverId === selectedDriverForManual?._id.toString();
                                            }).map(v => (
                                                <option key={v._id} value={v._id} style={{ background: '#0a0a0c' }}>{v.carNumber} - {v.model}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div>
                                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Starting KM</label>
                                            <input
                                                type="number"
                                                required
                                                value={punchInForm.km}
                                                onChange={(e) => setPunchInForm({ ...punchInForm, km: e.target.value })}
                                                style={{ width: '100%', height: '54px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '0 20px', color: 'white', outline: 'none', fontSize: '14px', fontWeight: '600' }}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Pickup Location</label>
                                            <input
                                                type="text"
                                                value={punchInForm.pickUpLocation}
                                                onChange={(e) => setPunchInForm({ ...punchInForm, pickUpLocation: e.target.value })}
                                                style={{ width: '100%', height: '54px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '0 20px', color: 'white', outline: 'none', fontSize: '14px', fontWeight: '600' }}
                                                placeholder="e.g. Office"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Punch-In Time</label>
                                        <div style={{ position: 'relative' }}>
                                            <Clock size={18} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', zIndex: 1 }} />
                                            <input
                                                id="admin-punch-in-date"
                                                type="datetime-local"
                                                required
                                                value={punchInForm.date}
                                                onChange={(e) => setPunchInForm({ ...punchInForm, date: e.target.value })}
                                                onClick={(e) => e.target.showPicker()}
                                                style={{ colorScheme: 'dark', width: '100%', height: '54px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '0 20px 0 50px', color: 'white', outline: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '18px', height: '58px', marginTop: '30px', fontWeight: '900', fontSize: '15px', cursor: submitting ? 'not-allowed' : 'pointer', letterSpacing: '0.5px', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)' }}
                                >
                                    {submitting ? 'PROCESSING...' : 'CONFIRM PUNCH IN'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showPunchOutModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(15px)' }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '32px', width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.8)' }}>
                            <div style={{ padding: '30px', background: 'linear-gradient(to bottom right, rgba(244, 63, 94, 0.1), #0a0a0c)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 11 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                                        <Minus color="#f43f5e" size={24} />
                                    </div>
                                    <div>
                                        <h2 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: '900', letterSpacing: '-0.5px' }}>Finalize Duty</h2>
                                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>Recording End for {selectedDriverForManual?.name}</div>
                                    </div>
                                </div>
                                <button onClick={() => setShowPunchOutModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                            </div>

                            <form onSubmit={handleAdminPunchOut} style={{ padding: '30px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div>
                                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Closing KM</label>
                                            <input
                                                type="number"
                                                required
                                                value={punchOutForm.km}
                                                onChange={(e) => setPunchOutForm({ ...punchOutForm, km: e.target.value })}
                                                style={{ width: '100%', height: '54px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '0 20px', color: 'white', outline: 'none', fontSize: '14px', fontWeight: '600' }}
                                                placeholder="End Odo"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Drop Location</label>
                                            <input
                                                type="text"
                                                value={punchOutForm.dropLocation}
                                                onChange={(e) => setPunchOutForm({ ...punchOutForm, dropLocation: e.target.value })}
                                                style={{ width: '100%', height: '54px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '0 20px', color: 'white', outline: 'none', fontSize: '14px', fontWeight: '600' }}
                                                placeholder="e.g. Office"
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div>
                                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Toll / Parking (₹)</label>
                                            <input
                                                type="number"
                                                value={punchOutForm.parkingAmount}
                                                onChange={(e) => setPunchOutForm({ ...punchOutForm, parkingAmount: e.target.value })}
                                                style={{ width: '100%', height: '54px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '0 20px', color: 'white', outline: 'none', fontSize: '14px', fontWeight: '600' }}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Fuel Expense (₹)</label>
                                            <input
                                                type="number"
                                                value={punchOutForm.fuelAmount}
                                                onChange={(e) => setPunchOutForm({ ...punchOutForm, fuelAmount: e.target.value })}
                                                style={{ width: '100%', height: '54px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '0 20px', color: 'white', outline: 'none', fontSize: '14px', fontWeight: '600' }}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Work Review / Remarks</label>
                                        <textarea
                                            value={punchOutForm.review}
                                            onChange={(e) => setPunchOutForm({ ...punchOutForm, review: e.target.value })}
                                            placeholder="Enter any duty notes here..."
                                            style={{ width: '100%', height: '100px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '15px 20px', color: 'white', outline: 'none', fontSize: '14px', fontWeight: '600', resize: 'none' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Punch-Out Time</label>
                                        <div style={{ position: 'relative' }}>
                                            <Clock size={18} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', zIndex: 1 }} />
                                            <input
                                                id="admin-punch-out-date"
                                                type="datetime-local"
                                                required
                                                value={punchOutForm.date}
                                                onChange={(e) => setPunchOutForm({ ...punchOutForm, date: e.target.value })}
                                                onClick={(e) => e.target.showPicker()}
                                                style={{ colorScheme: 'dark', width: '100%', height: '54px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '0 20px 0 50px', color: 'white', outline: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{ width: '100%', background: 'linear-gradient(135deg, #f43f5e, #e11d48)', color: 'white', border: 'none', borderRadius: '18px', height: '58px', marginTop: '30px', fontWeight: '900', fontSize: '15px', cursor: submitting ? 'not-allowed' : 'pointer', letterSpacing: '0.5px', boxShadow: '0 10px 25px -5px rgba(244, 63, 94, 0.4)' }}
                                >
                                    {submitting ? 'PROCESSING...' : 'FINALIZE DUTY'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showViewModal && viewingDriver && (
                    <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)' }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="modal-content-wrapper"
                            style={{ maxWidth: '800px', background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}
                        >
                            {/* Header Section */}
                            <div style={{ padding: '35px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), transparent)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(99, 102, 241, 0.3)' }}>
                                        <User color="white" size={40} />
                                    </div>
                                    <div>
                                        <h2 style={{ color: 'white', fontSize: '28px', fontWeight: '900', margin: 0, letterSpacing: '-1px' }}>{viewingDriver.name}</h2>
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                            <span style={{ padding: '4px 12px', background: viewingDriver.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)', color: viewingDriver.status === 'active' ? '#10b981' : '#f43f5e', borderRadius: '100px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.05)' }}>{viewingDriver.status}</span>
                                            <span style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', borderRadius: '100px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.05)' }}>ID: {viewingDriver._id.slice(-6).toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setShowViewModal(false)} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', padding: '10px', borderRadius: '50%', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
                            </div>

                            <div style={{ padding: '35px', maxHeight: '70vh', overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '30px' }}>
                                    {/* Column 1: Info */}
                                    <div>
                                        <div style={{ marginBottom: '25px' }}>
                                            <p style={{ color: '#6366f1', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '15px' }}>Access Details</p>
                                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Username</span>
                                                    <span style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>{viewingDriver.username || 'N/A'}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Mobile</span>
                                                    <span style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>{viewingDriver.mobile}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>License No.</span>
                                                    <span style={{ color: 'white', fontWeight: '700', fontSize: '14px', fontFamily: 'monospace' }}>{viewingDriver.licenseNumber || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <p style={{ color: '#10b981', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '15px' }}>Remuneration</p>
                                            <div style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Daily Wage</span>
                                                    <span style={{ color: '#10b981', fontWeight: '900', fontSize: '18px' }}>₹{viewingDriver.dailyWage || 0}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Night Bonus</span>
                                                    <span style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>₹{viewingDriver.nightStayBonus || 0}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>SD Return Policy</span>
                                                    <span style={{ padding: '4px 10px', background: viewingDriver.sameDayReturnEnabled ? '#10b981' : 'rgba(255,255,255,0.05)', color: viewingDriver.sameDayReturnEnabled ? 'black' : 'rgba(255,255,255,0.4)', borderRadius: '8px', fontSize: '9px', fontWeight: '900' }}>{viewingDriver.sameDayReturnEnabled ? 'ENABLED' : 'DISABLED'}</span>
                                                </div>
                                                {viewingDriver.sameDayReturnEnabled && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>SD Bonus Amount</span>
                                                        <span style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>₹{viewingDriver.sameDayReturnBonus || 0}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2: Docs & Settings */}
                                    <div>
                                        <div style={{ marginBottom: '25px' }}>
                                            <p style={{ color: '#a855f7', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '15px' }}>Compliance Documents</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {viewingDriver.documents && viewingDriver.documents.length > 0 ? (
                                                    viewingDriver.documents.map(doc => (
                                                        <div key={doc._id} style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <FileText size={18} color="#a855f7" />
                                                                <div>
                                                                    <div style={{ fontSize: '13px', color: 'white', fontWeight: '700' }}>{doc.documentType}</div>
                                                                    <div style={{ fontSize: '10px', color: doc.verificationStatus === 'Verified' ? '#10b981' : '#f59e0b', fontWeight: '800' }}>{doc.verificationStatus.toUpperCase()}</div>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                                <button type="button" onClick={() => { setViewingDocUrl(doc.imageUrl); setShowDocViewer(true); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Preview"><Eye size={16} /></button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '15px' }}>No documents on file.</div>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <p style={{ color: '#f43f5e', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '15px' }}>Operational Settings</p>
                                            <div style={{ background: 'rgba(244, 63, 94, 0.03)', border: '1px solid rgba(244, 63, 94, 0.1)', borderRadius: '20px', padding: '20px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Overtime Calculation</span>
                                                    <span style={{ padding: '4px 10px', background: viewingDriver.overtime?.enabled ? '#f43f5e' : 'rgba(255,255,255,0.05)', color: viewingDriver.overtime?.enabled ? 'white' : 'rgba(255,255,255,0.4)', borderRadius: '8px', fontSize: '9px', fontWeight: '900' }}>{viewingDriver.overtime?.enabled ? 'ACTIVE' : 'INACTIVE'}</span>
                                                </div>
                                                {viewingDriver.overtime?.enabled && (
                                                    <>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>OT Threshold</span>
                                                            <span style={{ color: 'white', fontWeight: '700' }}>{viewingDriver.overtime.thresholdHours} Hours</span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>OT Hourly Rate</span>
                                                            <span style={{ color: 'white', fontWeight: '700' }}>₹{viewingDriver.overtime.ratePerHour}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '25px 35px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '15px' }}>
                                <button onClick={() => setShowViewModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '15px', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: '800', border: 'none', cursor: 'pointer' }}>Back to Fleet</button>
                                <button onClick={() => { setShowViewModal(false); openEditModal(viewingDriver); }} style={{ flex: 1, padding: '14px', borderRadius: '15px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white', fontWeight: '800', border: 'none', cursor: 'pointer', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)' }}>Edit Profile</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showDocViewer && viewingDocUrl && (
                    <div className="modal-overlay" style={{ zIndex: 3000, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)' }} onClick={() => setShowDocViewer(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button 
                                onClick={() => setShowDocViewer(false)}
                                style={{ position: 'absolute', top: '-40px', right: '-40px', background: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}
                            >
                                <X size={20} color="black" />
                            </button>
                            <img 
                                src={viewingDocUrl} 
                                alt="Document Preview" 
                                style={{ width: '100%', height: 'auto', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }} 
                            />
                            <div style={{ marginTop: '15px', textAlign: 'center' }}>
                                <a href={viewingDocUrl} download target="_blank" rel="noopener noreferrer" style={{ color: 'white', background: 'rgba(255,255,255,0.1)', padding: '8px 20px', borderRadius: '20px', textDecoration: 'none', fontSize: '12px', fontWeight: '700', border: '1px solid rgba(255,255,255,0.2)' }}>Download Original</a>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Drivers;
