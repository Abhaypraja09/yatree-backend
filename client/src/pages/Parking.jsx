import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../api/axios';
import * as XLSX from 'xlsx';
import {
    MapPin, Plus, PlusCircle, Search, Trash2, Calendar, History, Car, User, Shield, FileSpreadsheet, Edit, IndianRupee, Eye, X, Image as ImageIcon, Camera, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import SEO from '../components/SEO';
import PremiumDateInput from '../components/common/PremiumDateInput';
import { todayIST, toISTDateString, firstDayOfMonthIST, formatDateIST, nowIST, formatDateTimeIST } from '../utils/istUtils';

const CameraModal = ({ onCapture, onClose }) => {
    const videoRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    const streamRef = React.useRef(null);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        try {
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = newStream;
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
        } catch (err) {
            console.error("Camera error:", err);
            setError("Could not access camera. Please ensure permissions are granted.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const capture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                const file = new File([blob], `parking.jpg`, { type: 'image/jpeg' });
                onCapture(file, canvas.toDataURL('image/jpeg'));
                stopCamera();
                onClose();
            }, 'image/jpeg', 0.8);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '20px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ color: 'white', margin: 0 }}>Capture Parking Photo</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                </div>
                {error ? (
                    <div style={{ color: '#f43f5e', padding: '20px', textAlign: 'center' }}>{error}</div>
                ) : (
                    <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '12px', background: 'black' }} />
                )}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                {!error && (
                    <button onClick={capture} style={{ width: '100%', marginTop: '20px', padding: '15px', borderRadius: '12px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <Camera size={20} /> CAPTURE PHOTO
                    </button>
                )}
            </div>
        </div>
    );
};

const ParkingPage = () => {
    const { theme } = useTheme();
    const { selectedCompany } = useCompany();
    const location = useLocation();
    const getImageUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const baseUrl = import.meta.env.VITE_API_URL || '';
        return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
    };
    const [entries, setEntries] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [pendingEntries, setPendingEntries] = useState([]);
    const [rejectedEntries, setRejectedEntries] = useState([]);
    const [showRejected, setShowRejected] = useState(false);
    const [activeTab, setActiveTab] = useState('parking');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [vehicles, setVehicles] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDriver, setFilterDriver] = useState('All');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedDay, setSelectedDay] = useState(new Date().getDate().toString());
    const [isRange, setIsRange] = useState(false);
    const [fromDate, setFromDate] = useState(firstDayOfMonthIST()); // Start from 1st of month
    const [toDate, setToDate] = useState(todayIST());

    const shiftDays = (n) => {
        if (selectedDay === 'All') {
            // Shift Month
            let nm = selectedMonth + n;
            let ny = selectedYear;
            if (nm < 0) { nm = 11; ny--; }
            if (nm > 11) { nm = 0; ny++; }
            setSelectedMonth(nm);
            setSelectedYear(ny);
        } else {
            // Shift Day
            const baseDate = new Date(selectedYear, selectedMonth, parseInt(selectedDay));
            baseDate.setDate(baseDate.getDate() + n);
            setSelectedYear(baseDate.getFullYear());
            setSelectedMonth(baseDate.getMonth());
            setSelectedDay(baseDate.getDate().toString());
        }
    };

    const isCurrentMonth = selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear();

    // Form State
    const [formData, setFormData] = useState({
        vehicleId: '',
        driverId: '',
        driver: '', // Will start storing name here too for legacy/display
        amount: '',
        date: '',
        receiptPhoto: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState('');
    const [showCamera, setShowCamera] = useState(false);
    const [lastSeenPendingParking, setLastSeenPendingParking] = useState(0);

    useEffect(() => {
        setSearchTerm('');
        setFilterDriver('All');
        const now = new Date();
        setSelectedMonth(now.getMonth());
        setSelectedYear(now.getFullYear());
        setSelectedDay(now.getDate().toString());
        setShowModal(false);
        setEditingId(null);
        setFormData({
            vehicleId: '',
            driverId: '',
            driver: '',
            amount: '',
            date: '',
            receiptPhoto: ''
        });
    }, [location.pathname, location.key]);

    // ── AI AGENT SEARCH INTEGRATION ──
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const searchParam = params.get('search') || params.get('name') || params.get('driver') || params.get('vehicle');
        const monthParam = params.get('month');
        const yearParam = params.get('year');
        const dayParam = params.get('day');

        if (searchParam) setSearchTerm(searchParam);
        if (monthParam) setSelectedMonth(Number(monthParam) - 1); // 0-indexed month
        if (yearParam) setSelectedYear(Number(yearParam));
        if (dayParam) setSelectedDay(dayParam);
    }, [location.search]);

    useEffect(() => {
        // Correctly set from/to based on selected month/year
        const start = toISTDateString(new Date(selectedYear, selectedMonth, 1));
        const end = toISTDateString(new Date(selectedYear, selectedMonth + 1, 0));
        setFromDate(start);
        setToDate(end);
    }, [selectedMonth, selectedYear]);

    useEffect(() => {
        if (selectedCompany) {
            fetchEntries();
            fetchPendingEntries();
            fetchRejectedEntries();
            fetchDrivers();
            fetchVehicles();
        }
    }, [selectedCompany, fromDate, toDate]);

    useEffect(() => {
        if (activeTab === 'parking') {
            setLastSeenPendingParking(pendingEntries.filter(e => e.type === 'parking').length);
        }
    }, [activeTab, pendingEntries]);

    const fetchPendingEntries = async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            const { data } = await axios.get(`/api/admin/parking/pending/${selectedCompany._id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            // Filter to show ONLY parking entries in this page
            const parkingOnly = (data || []).filter(e => e.type === 'parking');
            setPendingEntries(parkingOnly);
        } catch (err) { console.error(err); }
    };

    const fetchRejectedEntries = async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            const { data } = await axios.get(`/api/admin/parking/pending/${selectedCompany._id}?status=rejected`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            // Filter to show ONLY parking entries in this page
            const parkingOnly = (data || []).filter(e => e.type === 'parking');
            setRejectedEntries(parkingOnly);
        } catch (err) { console.error(err); }
    };

    const fetchEntries = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            const { data } = await axios.get(`/api/admin/parking/${selectedCompany._id}?from=${fromDate}&to=${toDate}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setEntries(data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchDrivers = async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            const { data } = await axios.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setDrivers(data.drivers || []);
        } catch (err) { console.error(err); }
    };

    const fetchVehicles = async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            const { data } = await axios.get(`/api/admin/vehicles/${selectedCompany._id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setVehicles(data.vehicles || []);
        } catch (err) { console.error(err); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            const finalPayload = {
                ...formData,
                companyId: selectedCompany._id
            };

            // Enhanced date logic: If today is selected, preserve current hour/min
            if (formData.date === todayIST()) {
                const now = new Date();
                const d = new Date(formData.date);
                d.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
                finalPayload.date = d;
            }

            if (editingId) {
                await axios.put(`/api/admin/parking/${editingId}`, finalPayload, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });
                alert('Parking entry updated successfully');
            } else {
                await axios.post('/api/admin/parking', finalPayload, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });
                alert('Parking entry added successfully');
            }

            setShowModal(false);
            resetForm();
            fetchEntries();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Error saving entry');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this entry?')) return;
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            await axios.delete(`/api/admin/parking/${id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            fetchEntries();
        } catch (err) { console.error(err); }
    };

    const handleApproveReject = async (attendanceId, expenseId, status) => {
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            await axios.patch(`/api/admin/attendance/${attendanceId}/expense/${expenseId}`,
                { status },
                { headers: { Authorization: `Bearer ${userInfo.token}` } }
            );
            fetchPendingEntries();
            fetchRejectedEntries();
            fetchEntries();
        } catch (err) {
            console.error(err);
            alert('Error processing request');
        }
    };

    const handleEdit = (entry) => {
        setEditingId(entry._id);
        setFormData({
            vehicleId: entry.vehicle?._id || '',
            driverId: entry.driverId?._id || '',
            driver: entry.driver || '',
            amount: entry.amount || '',
            date: toISTDateString(entry.date),
            receiptPhoto: entry.receiptPhoto || ''
        });
        setShowModal(true);
    };

    const handleFileUpload = async (e) => {
        const file = e.type === 'change' ? e.target.files[0] : e;
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('upload_preset', 'fleet_crm');

        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;

            const res = await axios.post('/api/admin/upload', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${userInfo?.token}` }
            });
            setFormData({ ...formData, receiptPhoto: res.data.url });
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Image upload failed. Please try again.');
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            vehicleId: '',
            driverId: '',
            driver: '',
            amount: '',
            date: '',
            receiptPhoto: ''
        });
    };

    const downloadExcel = () => {
        const dataToExport = filteredEntries.map(e => ({
            'Date': formatDateIST(e.date),
            'Vehicle': e.vehicle?.carNumber || 'N/A',
            'Driver': e.driver || 'N/A',
            'Amount (₹)': e.amount,
            'Source': e.source || 'Admin'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Parking Logs');
        XLSX.writeFile(wb, `Parking_Report_${selectedCompany?.name}_${todayIST()}.xlsx`);
    };

    const filteredEntries = entries.filter(e => {
        const carNum = e.vehicle?.carNumber || '';
        const drvName = e.driver || '';

        const matchesSearch = (carNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
            drvName.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesDriver = filterDriver === 'All' || (e.driverId?._id === filterDriver) || (e.driver === filterDriver);

        let matchesDay = true;
        if (selectedDay !== 'All') {
            const entryDate = toISTDateString(e.date);
            const targetDate = toISTDateString(new Date(selectedYear, selectedMonth, parseInt(selectedDay)));
            matchesDay = (entryDate === targetDate);
        }

        return matchesSearch && matchesDriver && matchesDay;
    });

    const totalAmount = filteredEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const driverAmount = filteredEntries.filter(e => e.source === 'Driver').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const officeAmount = filteredEntries.filter(e => e.source === 'Admin').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const pendingParking = pendingEntries.filter(e => e.type === 'parking');

    const unreadParking = Math.max(0, pendingParking.length - (activeTab === 'parking' ? pendingParking.length : lastSeenPendingParking));

    return (
        <div className="container-fluid" style={{ paddingBottom: '40px' }}>
            <SEO title="Parking Management" description="Track parking expenses, driver payments, and office costs." />

            <header style={{ padding: '30px 0 25px' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '20px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{
                            width: '50px',
                            height: '50px',
                            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(251, 191, 36, 0.05))',
                            borderRadius: '16px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            border: '1px solid rgba(251, 191, 36, 0.2)',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                        }}>
                            <MapPin size={24} color="var(--primary)" />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)' }}></div>
                                <span style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: '1.2px', textTransform: 'uppercase' }}>Fleet Operations</span>
                            </div>
                            <h1 style={{ color: 'white', fontSize: '28px', fontWeight: '950', margin: 0, letterSpacing: '-1px' }}>
                                Parking <span className="text-gradient-yellow">Management</span>
                            </h1>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            onClick={downloadExcel}
                            style={{
                                height: '42px', padding: '0 18px', borderRadius: '12px',
                                background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.08)',
                                color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                transition: 'all 0.3s'
                            }}
                        >
                            <FileSpreadsheet size={16} /> EXPORT
                        </button>
                        <button
                            onClick={() => { resetForm(); setShowModal(true); }}
                            className="btn-primary"
                            style={{
                                height: '42px', padding: '0 20px', borderRadius: '12px',
                                fontSize: '12px', fontWeight: '900', gap: '8px'
                            }}
                        >
                            <Plus size={18} /> NEW ENTRY
                        </button>
                    </div>
                </div>

                <div style={{
                    marginTop: '20px',
                    padding: '12px 20px',
                    borderRadius: '20px',
                    background: 'rgba(15, 23, 42, 0.4)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '15px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Premium Modern Calendar UI */}
                        <div style={{
                            display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '14px',
                            border: '1px solid rgba(255,255,255,0.06)'
                        }}>
                                <PremiumDateInput
                                    value={toISTDateString(new Date(selectedYear, selectedMonth, selectedDay === 'All' ? 1 : parseInt(selectedDay)))}
                                    onChange={v => {
                                        const d = new Date(v);
                                        setSelectedYear(d.getFullYear());
                                        setSelectedMonth(d.getMonth());
                                        setSelectedDay(d.getDate().toString());
                                    }}
                                />
                        </div>

                        {selectedDay !== 'All' && (
                            <motion.button
                                whileHover={{ background: 'rgba(251,191,36,0.2)' }}
                                onClick={() => setSelectedDay('All')}
                                style={{
                                    padding: '0 12px',
                                    height: '32px',
                                    borderRadius: '10px',
                                    background: 'rgba(251,191,36,0.1)',
                                    border: 'none',
                                    color: 'var(--primary)',
                                    fontSize: '11px',
                                    fontWeight: '950',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginRight: '8px'
                                }}
                            >
                                <Calendar size={14} /> Full Month
                            </motion.button>
                        )}
                        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <select
                                value={selectedMonth}
                                onChange={e => {
                                    setSelectedMonth(Number(e.target.value));
                                    setSelectedDay('All');
                                }}
                                style={{ height: '32px', padding: '0 8px', fontSize: '11px', borderRadius: '10px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', fontWeight: '800', outline: 'none', cursor: 'pointer' }}
                            >
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
                                    <option key={m} value={idx} style={{ background: '#0f172a' }}>{m.toUpperCase()}</option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={e => {
                                    setSelectedYear(Number(e.target.value));
                                    setSelectedDay('All');
                                }}
                                style={{ height: '32px', padding: '0 8px', fontSize: '11px', borderRadius: '10px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', fontWeight: '800', outline: 'none', cursor: 'pointer' }}
                            >
                                {[2024, 2025, 2026, 2027].map(y => (
                                    <option key={y} value={y} style={{ background: '#0f172a' }}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1', maxWidth: '400px' }}>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                            <input 
                                type="text"
                                placeholder="Search driver or car number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    height: '40px',
                                    borderRadius: '14px',
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    paddingLeft: '42px',
                                    color: 'white',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px', 
                            background: 'rgba(255,255,255,0.03)', 
                            padding: '0 15px', 
                            borderRadius: '14px', 
                            border: '1px solid rgba(255,255,255,0.08)', 
                            minWidth: '180px',
                            height: '40px'
                        }}>
                            <User size={14} style={{ color: 'var(--primary)', opacity: 0.8 }} />
                            <select
                                value={filterDriver}
                                onChange={(e) => setFilterDriver(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '11px', fontWeight: '900', cursor: 'pointer', width: '100%', height: '100%', textTransform: 'uppercase' }}
                            >
                                <option value="All" style={{ background: '#1e293b' }}>ALL DRIVERS</option>
                                {drivers.map(d => (
                                    <option key={d._id} value={d._id} style={{ background: '#1e293b' }}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </header>

            {/* SLEEK NAVIGATION & SUMMARY */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', marginBottom: '30px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                    <div 
                        onClick={() => setActiveTab('parking')}
                        className={`glass-card ${activeTab === 'parking' ? 'active-nav-card' : 'glass-card-hover-effect'}`} 
                        style={{ 
                            padding: '24px', 
                            cursor: 'pointer',
                            background: activeTab === 'parking' 
                                ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.05))' 
                                : 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                            border: `1px solid ${activeTab === 'parking' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255,255,255,0.05)'}`,
                            borderRadius: '24px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div style={{ pading: '10px', borderRadius: '12px', background: activeTab === 'parking' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.05)', color: 'var(--primary)', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Car size={20} />
                            </div>
                            <span style={{ fontSize: '10px', fontWeight: '900', color: activeTab === 'parking' ? 'var(--primary)' : 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fleet Logs</span>
                        </div>
                        <h2 style={{ fontSize: '28px', fontWeight: '950', color: 'white', margin: '0 0 4px' }}>₹{totalAmount.toLocaleString()}</h2>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0, fontWeight: '700' }}>TOTAL PARKING SETTLEMENTS</p>
                    </div>

                    <div 
                        className="glass-card" 
                        style={{ 
                            padding: '24px', 
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.02))',
                            border: '1px solid rgba(16, 185, 129, 0.15)',
                            borderRadius: '24px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div style={{ pading: '10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <History size={20} />
                            </div>
                            <span style={{ fontSize: '10px', fontWeight: '900', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Driver App</span>
                        </div>
                        <h2 style={{ fontSize: '28px', fontWeight: '950', color: 'white', margin: '0 0 4px' }}>₹{driverAmount.toLocaleString()}</h2>
                        <p style={{ fontSize: '11px', color: 'rgba(16, 185, 129, 0.6)', margin: 0, fontWeight: '700' }}>SUBMITTED VIA MOBILE APP</p>
                    </div>

                    <div 
                        className="glass-card" 
                        style={{ 
                            padding: '24px', 
                            background: 'linear-gradient(135deg, rgba(129, 140, 248, 0.08), rgba(129, 140, 248, 0.02))',
                            border: '1px solid rgba(129, 140, 248, 0.15)',
                            borderRadius: '24px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div style={{ pading: '10px', borderRadius: '12px', background: 'rgba(129, 140, 248, 0.1)', color: '#818cf8', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Edit size={20} />
                            </div>
                            <span style={{ fontSize: '10px', fontWeight: '900', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Office Manual</span>
                        </div>
                        <h2 style={{ fontSize: '28px', fontWeight: '950', color: 'white', margin: '0 0 4px' }}>₹{officeAmount.toLocaleString()}</h2>
                        <p style={{ fontSize: '11px', color: 'rgba(129, 140, 248, 0.6)', margin: 0, fontWeight: '700' }}>ADMIN PORTAL ENTRIES</p>
                    </div>

                    <div 
                        onClick={() => setActiveTab('rejected')}
                        className={`glass-card ${activeTab === 'rejected' ? 'active-nav-card' : 'glass-card-hover-effect'}`} 
                        style={{ 
                            padding: '24px', 
                            cursor: 'pointer',
                            background: activeTab === 'rejected' 
                                ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.15), rgba(244, 63, 94, 0.05))' 
                                : 'linear-gradient(135deg, rgba(244, 63, 94, 0.08), rgba(244, 63, 94, 0.03))',
                            border: `1px solid ${activeTab === 'rejected' ? 'rgba(244, 63, 94, 0.3)' : 'rgba(244, 63, 94, 0.15)'}`,
                            borderRadius: '24px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div style={{ pading: '10px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Shield size={20} />
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '10px', fontWeight: '900', color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Review Hub</span>
                                {rejectedEntries.filter(e => e.type === 'parking').length > 0 && (
                                    <div style={{ background: '#f43f5e', color: 'white', fontSize: '9px', fontWeight: '900', padding: '1px 6px', borderRadius: '6px', marginTop: '4px' }}>
                                        {rejectedEntries.filter(e => e.type === 'parking').length} REJECTED
                                    </div>
                                )}
                            </div>
                        </div>
                        <h2 style={{ fontSize: '28px', fontWeight: '950', color: 'white', margin: '0 0 4px' }}>₹{rejectedEntries.filter(e => e.type === 'parking').reduce((s, e) => s + (Number(e.amount) || 0), 0).toLocaleString()}</h2>
                        <p style={{ fontSize: '11px', color: 'rgba(244, 63, 94, 0.6)', margin: 0, fontWeight: '700' }}>REJECTED / ACTION NEEDED</p>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════
                CAR SERVICES SECTION (Car Wash / Puncture)
               ══════════════════════════════════════════ */}

            {/* ── PENDING APPROVALS SECTION ── */}
            {pendingParking.length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: 'rgba(251, 191, 36, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--primary)'
                        }}>
                            <Shield size={20} />
                        </div>
                        <div>
                            <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '800', margin: 0 }}>Pending Approvals</h3>
                            <p style={{
                                color: 'rgba(251, 191, 36, 0.6)',
                                fontSize: '11px',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                margin: 0
                            }}>
                                {pendingParking.length} Parking Requests
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                        {pendingParking.map((entry) => (
                            <motion.div
                                key={entry._id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="glass-card"
                                style={{
                                    padding: '24px',
                                    border: '1px solid rgba(251, 191, 36, 0.25)',
                                    background: 'linear-gradient(145deg, rgba(251, 191, 36, 0.08), rgba(15, 23, 42, 0.6))',
                                    borderRadius: '24px',
                                    boxShadow: '0 12px 30px rgba(0,0,0,0.2)'
                                }}
                            >
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                                    {entry.slipPhoto ? (
                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                            <img
                                                src={getImageUrl(entry.slipPhoto)}
                                                onClick={() => { setSelectedImage(entry.slipPhoto); setShowImageModal(true); }}
                                                style={{ width: '80px', height: '80px', borderRadius: '18px', objectFit: 'cover', cursor: 'pointer', border: '2px solid rgba(251, 191, 36, 0.3)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
                                            />
                                            <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--primary)', color: 'black', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '950', border: '3px solid #1a2233' }}>
                                                <ImageIcon size={12} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            style={{ width: '80px', height: '80px', borderRadius: '18px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '2px dashed rgba(255,255,255,0.08)', flexShrink: 0, gap: '4px' }}
                                        >
                                            <Eye size={24} color="rgba(255,255,255,0.15)" />
                                            <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)', fontWeight: '900' }}>NO SLIP</span>
                                        </div>
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                                            <h4 style={{ color: 'white', fontWeight: '900', fontSize: '22px', margin: 0 }}>₹{entry.amount}</h4>
                                            <span style={{
                                                background: 'rgba(251, 191, 36, 0.1)',
                                                color: 'var(--primary)',
                                                fontSize: '9px',
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                fontWeight: '800',
                                                textTransform: 'uppercase',
                                                border: '1px solid rgba(251, 191, 36, 0.2)'
                                            }}>Reviewing</span>
                                        </div>
                                        <span style={{
                                            display: 'inline-block',
                                            background: 'rgba(245, 158, 11, 0.1)',
                                            color: 'var(--primary)',
                                            fontSize: '10px',
                                            padding: '2px 10px',
                                            borderRadius: '6px',
                                            fontWeight: '800',
                                            border: '1px solid rgba(245, 158, 11, 0.2)',
                                            marginTop: '6px',
                                            marginBottom: '2px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                            PARKING
                                        </span>
                                        <p style={{ color: 'white', fontSize: '16px', fontWeight: '900', margin: '4px 0 2px' }}>{entry.driver}</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: '700' }}>#{entry.carNumber}</span>
                                            {entry.date && (
                                                <span style={{ background: 'rgba(251, 191, 36, 0.08)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', border: '1px solid rgba(251, 191, 36, 0.1)' }}>
                                                 {formatDateTimeIST(entry.date)}
                                                 </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => handleApproveReject(entry.attendanceId, entry._id, 'approved')}
                                        style={{
                                            flex: 1.5,
                                            background: '#10b981',
                                            color: 'white',
                                            border: 'none',
                                            padding: '12px',
                                            borderRadius: '16px',
                                            fontWeight: '950',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            boxShadow: '0 8px 20px rgba(16, 185, 129, 0.25)',
                                            transition: '0.3s',
                                            letterSpacing: '0.5px'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        ✓ APPROVE
                                    </button>
                                    <button
                                        onClick={() => handleApproveReject(entry.attendanceId, entry._id, 'rejected')}
                                        style={{ 
                                            flex: 1, 
                                            background: 'rgba(244, 63, 94, 0.08)', 
                                            color: '#f43f5e', 
                                            border: '1px solid rgba(244, 63, 94, 0.2)', 
                                            padding: '12px', 
                                            borderRadius: '16px', 
                                            fontWeight: '900', 
                                            fontSize: '13px', 
                                            cursor: 'pointer',
                                            transition: '0.3s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.15)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(244, 63, 94, 0.08)'}
                                    >
                                        REJECT
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}


            {/* ══════════════════════════════════════════
                REJECTED REQUESTS TAB
               ══════════════════════════════════════════ */}
            {activeTab === 'rejected' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                    {/* Header Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                        {[
                            {
                                label: 'Total Rejected',
                                value: rejectedEntries.filter(e => e.type === 'parking').length,
                                icon: '🚫', color: '#f43f5e', bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.2)'
                            },
                            {
                                label: 'Total Amount',
                                value: `₹${rejectedEntries.filter(e => e.type === 'parking').reduce((s, e) => s + (Number(e.amount) || 0), 0).toLocaleString()}`,
                                icon: '💰', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)'
                            }
                        ].map((stat, i) => (
                            <motion.div key={i} whileHover={{ y: -4 }} className="glass-card" style={{ padding: '20px 24px', background: stat.bg, border: `1px solid ${stat.border}`, borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <span style={{ fontSize: '28px' }}>{stat.icon}</span>
                                <div>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', margin: '0 0 4px', letterSpacing: '1px' }}>{stat.label}</p>
                                    <h2 style={{ color: stat.color, fontSize: '24px', fontWeight: '900', margin: 0 }}>{stat.value}</h2>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Rejected Entries Grid */}
                    {rejectedEntries.filter(e => e.type === 'parking').length === 0 ? (
                        <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: '24px', border: '1px solid rgba(244,63,94,0.1)' }}>
                            <span style={{ fontSize: '56px', display: 'block', marginBottom: '16px' }}>✅</span>
                            <h3 style={{ color: 'white', fontWeight: '800', margin: '0 0 8px' }}>No Rejected Parking</h3>
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', margin: 0 }}>All parking requests have been approved or are pending review</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                                {rejectedEntries.filter(e => e.type === 'parking').map((entry) => {
                                    const typeLabel = 'Parking';
                                    const typeColor = '#818cf8';
                                    const typeBg = 'rgba(129,140,248,0.1)';
                                    const typeBorder = 'rgba(129,140,248,0.2)';
                                    return (
                                        <motion.div
                                            key={entry._id}
                                            initial={{ opacity: 0, scale: 0.97 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(244,63,94,0.15)' }}
                                            style={{
                                                border: '1px solid rgba(244,63,94,0.15)',
                                                background: 'linear-gradient(145deg, rgba(244,63,94,0.05), rgba(15,23,42,0.7))',
                                                borderRadius: '20px',
                                                overflow: 'hidden',
                                                transition: 'box-shadow 0.3s'
                                            }}
                                        >
                                            {/* Top accent stripe */}
                                            <div style={{ height: '3px', background: 'linear-gradient(90deg, #f43f5e 0%, var(--primary) 50%, transparent 100%)' }} />

                                            <div style={{ padding: '20px' }}>
                                                {/* Header: Photo + Amount + Badges */}
                                                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '16px' }}>
                                                    {/* Slip Photo */}
                                                    {entry.slipPhoto ? (
                                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                                            <img
                                                                src={getImageUrl(entry.slipPhoto)}
                                                                onClick={() => { setSelectedImage(entry.slipPhoto); setShowImageModal(true); }}
                                                                style={{ width: '64px', height: '64px', borderRadius: '14px', objectFit: 'cover', cursor: 'pointer', border: '2px solid rgba(244,63,94,0.25)', filter: 'grayscale(10%)' }}
                                                                alt="slip"
                                                            />
                                                            <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#f43f5e', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(244,63,94,0.5)' }}>
                                                                <X size={11} color="white" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ width: '64px', height: '64px', borderRadius: '14px', background: 'rgba(244,63,94,0.07)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '2px dashed rgba(244,63,94,0.2)', flexShrink: 0, gap: '4px' }}>
                                                            <Eye size={22} color="rgba(244,63,94,0.35)" />
                                                            <span style={{ color: 'rgba(244,63,94,0.35)', fontSize: '8px', fontWeight: '800' }}>NO SLIP</span>
                                                        </div>
                                                    )}

                                                    {/* Amount + Badges */}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ color: '#cbd5e1', fontWeight: '900', fontSize: '24px', letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '8px' }}>
                                                            ₹{(Number(entry.amount) || 0).toLocaleString()}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                            <span style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e', padding: '3px 9px', borderRadius: '8px', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', border: '1px solid rgba(244,63,94,0.22)', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>✕ REJECTED</span>
                                                            <span style={{ background: typeBg, color: typeColor, padding: '3px 9px', borderRadius: '8px', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', border: `1px solid ${typeBorder}`, whiteSpace: 'nowrap' }}>{typeLabel}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Info Card */}
                                                <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '14px', padding: '14px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <User size={14} color="#818cf8" />
                                                            </div>
                                                            <span style={{ color: 'white', fontWeight: '800', fontSize: '14px' }}>{entry.driver || 'Unknown Driver'}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Car size={12} color="#64748b" />
                                                            <span style={{ color: '#64748b', fontWeight: '700', fontSize: '12px' }}>{entry.carNumber || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                    {entry.date && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                                            <Calendar size={12} color="#64748b" />
                                                            <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '600' }}>
                                                                {formatDateTimeIST(entry.date)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action Buttons */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                    <button
                                                        onClick={() => handleApproveReject(entry.attendanceId, entry._id, 'approved')}
                                                        style={{
                                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '12px 10px',
                                                            borderRadius: '12px',
                                                            fontWeight: '800',
                                                            fontSize: '12px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px',
                                                            boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
                                                            transition: 'all 0.2s',
                                                            letterSpacing: '0.3px'
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(16,185,129,0.4)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.25)'; }}
                                                    >
                                                        ✓ Re-Approve
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm('Permanently delete this rejected entry? This action cannot be undone.')) {
                                                                handleApproveReject(entry.attendanceId, entry._id, 'deleted');
                                                            }
                                                        }}
                                                        style={{
                                                            background: 'rgba(244,63,94,0.08)',
                                                            color: '#f43f5e',
                                                            border: '1px solid rgba(244,63,94,0.25)',
                                                            padding: '12px 10px',
                                                            borderRadius: '12px',
                                                            fontWeight: '800',
                                                            fontSize: '12px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px',
                                                            transition: 'all 0.2s',
                                                            letterSpacing: '0.3px'
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.18)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                                    >
                                                        🗑 Delete Forever
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </motion.div>
            )}

            {/* ══ PARKING TAB CONTENT ══ */}
            {activeTab === 'parking' && (
                <>
                    {/* Modal Standardization */}
                    <AnimatePresence>
                        {showModal && (
                            <div className="modal-overlay">
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0, y: 10 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.9, opacity: 0, y: 10 }}
                                    className="modal-content-wrapper"
                                    style={{ maxWidth: '800px', padding: 'clamp(20px, 5vw, 40px)' }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                        <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'white', margin: 0 }}>
                                            {editingId ? 'Edit Entry' : 'Manual Parking Entry'}
                                        </h1>
                                        <button className="glass-card" onClick={() => setShowModal(false)} style={{ padding: '10px', borderRadius: '50%', color: 'white' }}>
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <form onSubmit={handleCreate}>
                                        <div className="modal-form-grid">
                                            {/* Form fields would go here */}
                                            <button className="btn-primary" type="submit" disabled={submitting} style={{ height: '56px', fontWeight: '900' }}>
                                                {submitting ? 'Thinking...' : (editingId ? 'Update Entry' : 'Add Entry')}
                                            </button>
                                            <button className="glass-card" type="button" onClick={() => setShowModal(false)} style={{ height: '56px', fontWeight: '800' }}>Cancel</button>
                                        </div>
                                    </form>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* SECTION TITLE FOR PENDING IF NECESSARY OR SPACER */}
                    {activeTab === 'parking' && pendingParking.length > 0 && <div style={{ height: '20px' }}></div>}


                    {/* Entries List */}
                    <div className="table-responsive-wrapper" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {loading ? (
                            <div style={{ padding: '100px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
                        ) : filteredEntries.length === 0 ? (
                            <div style={{ padding: '100px', textAlign: 'center' }}>
                                <MapPin size={48} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: '20px' }} />
                                <h3 style={{ color: 'white', opacity: 0.6 }}>No parking records found</h3>
                            </div>
                        ) : (
                            <>
                                <div className="hide-mobile" style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', minWidth: '900px' }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left' }}>
                                                <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Date & Timeline</th>
                                                <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Car & Driver</th>
                                                <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Parking Amount</th>
                                                <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Origin</th>
                                                <th style={{ padding: '15px 25px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', textAlign: 'right', letterSpacing: '1px' }}>Management</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredEntries.map((e) => (
                                                <tr key={e._id} className="glass-card-hover-effect" style={{ background: 'rgba(30,41,59,0.3)', borderRadius: '12px' }}>
                                                    <td style={{ padding: '15px 25px', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                                                        <div style={{ color: 'white', fontWeight: '800', fontSize: '14px' }}>{formatDateIST(e.date)}</div>
                                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '700' }}>SUCCESSFUL ENTRY</div>
                                                    </td>
                                                    <td style={{ padding: '15px 25px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(251, 191, 36, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: '900' }}>
                                                                {e.driver?.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div style={{ color: 'white', fontWeight: '800', fontSize: '14px' }}>{e.driver}</div>
                                                                {e.vehicle && (
                                                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', fontWeight: '700', textTransform: 'uppercase' }}>
                                                                        #{e.vehicle.carNumber}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '15px 25px' }}>
                                                        <div style={{ color: '#34d399', fontWeight: '950', fontSize: '18px' }}>₹{e.amount}</div>
                                                    </td>
                                                    <td style={{ padding: '15px 25px' }}>
                                                        <span style={{
                                                            fontSize: '9px',
                                                            padding: '4px 10px',
                                                            borderRadius: '8px',
                                                            background: e.source === 'Admin' ? 'rgba(129, 140, 248, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                            color: e.source === 'Admin' ? '#818cf8' : '#10b981',
                                                            fontWeight: '900',
                                                            border: `1px solid ${e.source === 'Admin' ? 'rgba(129, 140, 248, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                                                            textTransform: 'uppercase',
                                                            display: 'inline-block'
                                                        }}>
                                                            {e.source === 'Admin' ? 'OFFICE' : 'DRIVER APP'}
                                                        </span>
                                                        {e.createdBy?.name && (
                                                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontWeight: '800' }}>
                                                                Approved By: {e.createdBy.name}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '15px 25px', textAlign: 'right', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                            <button
                                                                onClick={() => { setSelectedImage(e.receiptPhoto || ''); setShowImageModal(true); }}
                                                                className="btn-glass"
                                                                style={{ padding: '8px', borderRadius: '8px', background: e.receiptPhoto ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)' }}
                                                            >
                                                                <Eye size={16} color={e.receiptPhoto ? '#10b981' : 'rgba(255,255,255,0.2)'} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleEdit(e)}
                                                                className="btn-glass"
                                                                style={{ padding: '8px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.1)' }}
                                                            >
                                                                <Edit size={16} color="#38bdf8" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(e._id)}
                                                                className="btn-glass"
                                                                style={{ padding: '8px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.1)' }}
                                                            >
                                                                <Trash2 size={16} color="#f43f5e" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="show-mobile" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {filteredEntries.map((e) => (
                                        <motion.div
                                            key={e._id}
                                            initial={{ opacity: 0, y: 10 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            style={{
                                                background: 'rgba(255,255,255,0.02)',
                                                borderRadius: '20px',
                                                padding: '20px',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '6px',
                                                height: '100%',
                                                background: e.source === 'Admin' ? '#818cf8' : '#34d399',
                                                opacity: 0.8
                                            }}></div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                                                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                                                    <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(251, 191, 36, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: '950', fontSize: '20px' }}>
                                                        {e.driver?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div style={{ color: 'white', fontWeight: '900', fontSize: '17px', letterSpacing: '0.2px' }}>{e.driver}</div>
                                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
                                                            {formatDateIST(e.date)}
                                                            {e.vehicle && <span style={{ color: 'var(--primary)', opacity: 0.8 }}>• #{e.vehicle.carNumber}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ color: '#34d399', fontWeight: '950', fontSize: '22px' }}>₹{e.amount}</div>
                                                    <span style={{
                                                        fontSize: '9px',
                                                        padding: '3px 10px',
                                                        borderRadius: '10px',
                                                        background: e.source === 'Admin' ? 'rgba(129, 140, 248, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                        color: e.source === 'Admin' ? '#818cf8' : '#10b981',
                                                        fontWeight: '950',
                                                        textTransform: 'uppercase',
                                                        border: '1px solid rgba(255,255,255,0.05)',
                                                        display: 'inline-block'
                                                    }}>{e.source === 'Admin' ? 'OFFICE' : 'MOBILE APP'}</span>
                                                    {e.createdBy?.name && (
                                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontWeight: '800', textAlign: 'right' }}>
                                                            Approved By: {e.createdBy.name}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr',
                                                gap: '12px',
                                                marginBottom: '16px',
                                                padding: '12px',
                                                background: 'rgba(0,0,0,0.2)',
                                                borderRadius: '14px',
                                                border: '1px solid rgba(255,255,255,0.03)'
                                            }}>
                                                <div>
                                                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: '800', marginBottom: '2px' }}>Location</div>
                                                    <div style={{ color: 'white', fontSize: '13px', fontWeight: '700' }}>{e.location || 'Not Specified'}</div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{
                                                    color: 'rgba(255,255,255,0.4)',
                                                    fontSize: '11px',
                                                    fontStyle: 'italic',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}>
                                                    <History size={12} /> {e.remark || 'No additional remarks'}
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    {e.receiptPhoto && (
                                                        <button
                                                            onClick={() => { setSelectedImage(e.receiptPhoto); setShowImageModal(true); }}
                                                            style={{
                                                                width: '32px',
                                                                height: '32px',
                                                                borderRadius: '8px',
                                                                background: 'rgba(16, 185, 129, 0.1)',
                                                                color: '#10b981',
                                                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(e._id)}
                                                        style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '8px',
                                                            background: 'rgba(244,63,94,0.1)',
                                                            color: '#f43f5e',
                                                            border: '1px solid rgba(244,63,94,0.2)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Modal */}
                    <AnimatePresence>
                        {showModal && (
                            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '15px', overflowY: 'auto' }}>
                                <motion.div
                                    initial={{ y: 50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 50, opacity: 0 }}
                                    className="premium-glass"
                                    style={{ width: '100%', maxWidth: '500px', padding: '0', border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a', overflow: 'visible', margin: 'auto', borderRadius: '24px' }}
                                >
                                    <div style={{ padding: '24px 30px', background: 'linear-gradient(to right, #1e293b, #0f172a)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, borderTopLeftRadius: 'inherit', borderTopRightRadius: 'inherit' }}>
                                        <div>
                                            <h2 style={{ color: 'white', fontSize: '20px', margin: 0, fontWeight: '800' }}>{editingId ? 'Edit Entry' : 'Manual Entry'}</h2>
                                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', margin: '4px 0 0' }}>Parking Record</p>
                                        </div>
                                        <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', borderRadius: '50%', padding: '10px', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
                                    </div>

                                    <form onSubmit={handleCreate} style={{ padding: 'clamp(20px, 5vw, 30px)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

                                            {/* Vehicle and Driver */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '20px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Vehicle *</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <Car size={18} style={{ position: 'absolute', left: '15px', top: '16px', color: 'var(--primary)' }} />
                                                        <select
                                                            className="input-field"
                                                            style={{ height: '52px', borderRadius: '14px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', padding: '0 15px 0 45px', width: '100%', outline: 'none', cursor: 'pointer' }}
                                                            value={formData.vehicleId || ''}
                                                            onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                                                            required
                                                        >
                                                            <option value="" style={{ background: '#0f172a' }}>Select Vehicle</option>
                                                            {vehicles.map(v => (
                                                                <option key={v._id} value={v._id} style={{ background: '#0f172a' }}>{v.carNumber}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Driver (Company / Freelancer)</label>
                                                    <div style={{ display: 'flex', gap: '12px' }}>
                                                        <div style={{ flex: 1, position: 'relative' }}>
                                                            <User size={14} style={{ position: 'absolute', left: '12px', top: '16px', color: 'rgba(255,255,255,0.2)' }} />
                                                            <select
                                                                className="input-field"
                                                                style={{ height: '48px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', padding: '0 10px 0 35px', width: '100%', outline: 'none', cursor: 'pointer', fontSize: '12px', opacity: (formData.driverId && drivers.find(d => d._id === formData.driverId && d.isFreelancer)) ? 0.3 : 1 }}
                                                                value={!drivers.find(d => d._id === formData.driverId && d.isFreelancer) ? formData.driverId : ''}
                                                                onChange={(e) => {
                                                                    const selected = drivers.find(d => d._id === e.target.value);
                                                                    setFormData({ ...formData, driverId: e.target.value, driver: selected ? selected.name : '' });
                                                                }}
                                                                disabled={!!(formData.driverId && drivers.find(d => d._id === formData.driverId && d.isFreelancer))}
                                                            >
                                                                <option value="" style={{ background: '#0f172a' }}>Co. Driver</option>
                                                                {drivers.filter(d => !d.isFreelancer).map(d => (
                                                                    <option key={d._id} value={d._id} style={{ background: '#0f172a' }}>{d.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div style={{ flex: 1, position: 'relative' }}>
                                                            <User size={14} style={{ position: 'absolute', left: '12px', top: '16px', color: 'rgba(255,255,255,0.2)' }} />
                                                            <select
                                                                className="input-field"
                                                                style={{ height: '48px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', padding: '0 10px 0 35px', width: '100%', outline: 'none', cursor: 'pointer', fontSize: '12px', opacity: (formData.driverId && drivers.find(d => d._id === formData.driverId && !d.isFreelancer)) ? 0.3 : 1 }}
                                                                value={drivers.find(d => d._id === formData.driverId && d.isFreelancer) ? formData.driverId : ''}
                                                                onChange={(e) => {
                                                                    const selected = drivers.find(d => d._id === e.target.value);
                                                                    setFormData({ ...formData, driverId: e.target.value, driver: selected ? selected.name : '' });
                                                                }}
                                                                disabled={!!(formData.driverId && drivers.find(d => d._id === formData.driverId && !d.isFreelancer))}
                                                            >
                                                                <option value="" style={{ background: '#0f172a' }}>Freelancer</option>
                                                                {drivers.filter(d => d.isFreelancer).map(d => (
                                                                    <option key={d._id} value={d._id} style={{ background: '#0f172a' }}>{d.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Amount and Date */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '20px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Amount (₹) *</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <span style={{ position: 'absolute', left: '15px', top: '16px', color: '#34d399', fontWeight: '900' }}>₹</span>
                                                        <input
                                                            type="number"
                                                            placeholder="0.00"
                                                            className="input-field"
                                                            style={{ height: '52px', borderRadius: '14px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', padding: '0 15px 0 32px', width: '100%', outline: 'none' }}
                                                            value={formData.amount}
                                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Date *</label>
                                                    <PremiumDateInput
                                                        value={formData.date}
                                                        onChange={v => setFormData({ ...formData, date: v })}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            {/* Photo Upload */}
                                            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                                <p style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '12px' }}>Parking Receipt Photo</p>
                                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    {formData.receiptPhoto ? (
                                                        <div style={{ position: 'relative' }}>
                                                            <img src={getImageUrl(formData.receiptPhoto)} alt="Receipt" style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                            <button type="button" onClick={() => setFormData({ ...formData, receiptPhoto: '' })} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#f43f5e', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                            <div
                                                                onClick={() => setShowCamera(true)}
                                                                style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: '1px dashed rgba(255,255,255,0.1)', transition: 'all 0.3s ease' }}
                                                            >
                                                                <Camera size={20} color="var(--text-muted)" />
                                                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Camera</span>
                                                            </div>
                                                            <label style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: '1px dashed rgba(255,255,255,0.1)', transition: 'all 0.3s ease' }}>
                                                                <ImageIcon size={20} color="var(--text-muted)" />
                                                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Gallery</span>
                                                                <input type="file" hidden onChange={handleFileUpload} accept="image/*" />
                                                            </label>
                                                        </div>
                                                    )}
                                                    <div style={{ flex: '1 1 200px' }}>
                                                        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Upload or capture a photo of the parking receipt.</p>
                                                        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '10px' }}>Max size: 5MB (JPG, PNG)</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Form Actions */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                                                <button
                                                    type="submit"
                                                    disabled={submitting}
                                                    className="btn-primary"
                                                    style={{
                                                        height: '56px',
                                                        borderRadius: '14px',
                                                        fontWeight: '900',
                                                        fontSize: '16px',
                                                        background: 'linear-gradient(135deg, var(--primary) 0%, #d97706 100%)',
                                                        color: 'black',
                                                        border: 'none'
                                                    }}
                                                >
                                                    {submitting ? 'Saving...' : (editingId ? 'Update Record' : 'Save Record')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowModal(false)}
                                                    style={{
                                                        height: '56px',
                                                        background: 'rgba(255,255,255,0.05)',
                                                        color: 'white',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        borderRadius: '14px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </motion.div>
                            </div>
                        )}
                        {showImageModal && (
                            <div
                                style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.95)', backdropFilter: 'blur(20px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}
                                onClick={() => setShowImageModal(false)}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    style={{ position: 'relative', maxWidth: 'min(700px, 90vw)', width: '100%', display: 'flex', justifyContent: 'center' }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {selectedImage ? (
                                        <img
                                            src={getImageUrl(selectedImage)}
                                            alt="Parking Photo"
                                            style={{ width: '100%', height: 'auto', maxHeight: '85vh', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
                                        />
                                    ) : (
                                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '50px', borderRadius: '20px', textAlign: 'center', width: '100%' }}>
                                            <ImageIcon size={48} style={{ opacity: 0.2, marginBottom: '15px' }} />
                                            <p style={{ color: 'white', fontWeight: '700' }}>No receipt image available.</p>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '10px' }}>To fix this: Click the Edit (Pen) icon on the entry and upload the receipt manually.</p>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setShowImageModal(false)}
                                        style={{ position: 'absolute', top: '-15px', right: '-15px', background: '#f43f5e', color: 'white', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 15px rgba(244, 63, 94, 0.4)', zIndex: 100 }}
                                    >
                                        <X size={20} />
                                    </button>
                                </motion.div>
                            </div>
                        )}
                        {showCamera && (
                            <CameraModal
                                onClose={() => setShowCamera(false)}
                                onCapture={(file) => handleFileUpload(file)}
                            />
                        )}
                    </AnimatePresence>
                </>
            )}
        </div>
    );
};

export default ParkingPage;
