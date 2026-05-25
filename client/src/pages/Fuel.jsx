import React, { useState, useEffect, useRef } from 'react';
import axios from '../api/axios';
import * as XLSX from 'xlsx';
import {
    Fuel, Plus, Search, Trash2, Calendar, MapPin, Gauge, Droplets, CreditCard, History, Car, Filter, ChevronDown, User, ArrowUpRight, TrendingUp, Edit, Shield, FileSpreadsheet, Eye, X, Image as ImageIcon, Navigation, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import SEO from '../components/SEO';
import PremiumDateInput from '../components/common/PremiumDateInput';
import { todayIST, toISTDateString, firstDayOfMonthIST, formatDateIST, nowIST, formatDateTimeIST } from '../utils/istUtils';


const CameraModal = ({ onCapture, onClose }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [error, setError] = useState(null);

    useEffect(() => {
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
            setError("Could not access camera. Please allow permissions.");
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
                const file = new File([blob], "fuel_slip.jpg", { type: 'image/jpeg' });
                onCapture(file);
                stopCamera();
                onClose();
            }, 'image/jpeg', 0.8);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', width: '90%', maxWidth: '500px', position: 'relative' }}>
                <button type="button" onClick={() => { stopCamera(); onClose(); }} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                <h3 style={{ color: 'white', marginBottom: '20px', textAlign: 'center', marginTop: '10px' }}>Take Photo</h3>
                {error ? <div style={{ color: '#f43f5e', textAlign: 'center', padding: '20px' }}>{error}</div> :
                    <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '12px', background: '#000', marginBottom: '20px', maxHeight: '60vh', objectFit: 'cover' }} />}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                {!error && (
                    <button type="button" onClick={capture} style={{ width: '100%', padding: '16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                        <ImageIcon size={20} /> Capture Photo
                    </button>
                )}
            </div>
        </div>
    );
};

const FuelPage = () => {
    const { theme } = useTheme();
    const { selectedCompany } = useCompany();
    const getImageUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http')) {
            return path.replace(/^http:\/\//i, 'https://');
        }
        const baseUrl = import.meta.env.VITE_API_URL || '';
        return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
    };
    const [entries, setEntries] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [pendingEntries, setPendingEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [drivers, setDrivers] = useState([]);
    const [selectedPending, setSelectedPending] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterVehicle, setFilterVehicle] = useState('All');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const location = useLocation();

    useEffect(() => {
        setSearchTerm('');
        setFilterVehicle('All');
        const now = new Date();
        setSelectedMonth(now.getMonth());
        setSelectedYear(now.getFullYear());
        setShowModal(false);
        setEditingId(null);
        setFormData({
            vehicleId: '',
            fuelType: 'Diesel',
            date: '',
            amount: '',
            quantity: '',
            rate: '',
            odometer: '',
            stationName: '',
            paymentMode: 'Cash',
            paymentSource: 'Office',
            driver: '',
            slipPhoto: ''
        });
    }, [location.pathname, location.key]);

    // ── AI AGENT SEARCH INTEGRATION ──
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const searchParam = params.get('search') || params.get('driver') || params.get('name');
        const fuelTypeParam = params.get('fuelType');
        const vehicleParam = params.get('vehicleId') || params.get('vehicle');
        const monthParam = params.get('month');
        const yearParam = params.get('year');
        const dateParam = params.get('date');

        if (searchParam) setSearchTerm(searchParam);
        if (vehicleParam) setFilterVehicle(vehicleParam);

        if (monthParam) setSelectedMonth(Number(monthParam) - 1); // 0-indexed
        if (yearParam) setSelectedYear(Number(yearParam));

        if (dateParam === 'today') {
            setSelectedMonth(new Date().getMonth());
            setSelectedYear(new Date().getFullYear());
        }
    }, [location.search]);

    useEffect(() => {
        if (selectedMonth === 'All') {
            // Full Financial Year: April 1st of selectedYear to March 31st of next year
            setFromDate(`${selectedYear}-04-01`);
            setToDate(`${selectedYear + 1}-03-31`);
        } else {
            // Financial Year Smart Mapping: Jan-Mar (0,1,2) belong to internal state selectedYear + 1
            const calendarYear = (selectedMonth >= 0 && selectedMonth <= 2) ? selectedYear + 1 : selectedYear;
            const start = toISTDateString(new Date(calendarYear, selectedMonth, 1));
            const end = toISTDateString(new Date(calendarYear, selectedMonth + 1, 0));
            setFromDate(start);
            setToDate(end);
        }
    }, [selectedMonth, selectedYear]);

    const shiftMonth = (amount) => {
        let newMonth = selectedMonth + amount;
        let newYear = selectedYear;
        if (newMonth < 0) { newMonth = 11; newYear--; }
        if (newMonth > 11) { newMonth = 0; newYear++; }
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
    };

    // Form State
    const [formData, setFormData] = useState({
        vehicleId: '',
        fuelType: 'Diesel',
        date: todayIST(),
        amount: '',
        quantity: '',
        rate: '',
        odometer: '',
        stationName: '',
        paymentMode: 'Cash',
        paymentSource: 'Office',
        driver: '',
        slipPhoto: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState('');
    const [activeCamera, setActiveCamera] = useState(false);

    useEffect(() => {
        if (selectedCompany) {
            fetchEntries();
            fetchVehicles();
            fetchPendingEntries();
            fetchDrivers();
        }
    }, [selectedCompany, fromDate, toDate]);

    const fetchPendingEntries = async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            const { data } = await axios.get(`/api/admin/fuel/pending/${selectedCompany._id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setPendingEntries(data || []);
        } catch (err) { console.error(err); }
    };

    const fetchEntries = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        setEntries([]); // Clear stale data immediately to prevent wrong stats display
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            const { data } = await axios.get(`/api/admin/fuel/${selectedCompany._id}?from=${fromDate}&to=${toDate}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setEntries(data || []);
        } catch (err) {
            console.error(err);
            setEntries([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchVehicles = async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            const { data } = await axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=fleet`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setVehicles(data.vehicles || []);
        } catch (err) { console.error(err); }
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

    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            if (editingId) {
                await axios.put(`/api/admin/fuel/${editingId}`, {
                    ...formData,
                    companyId: selectedCompany._id
                }, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });
                alert('Fuel entry updated successfully');
            } else {
                await axios.post('/api/admin/fuel', {
                    ...formData,
                    companyId: selectedCompany._id
                }, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });
                alert('Fuel entry added successfully');
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

    const resetForm = () => {
        setFormData({
            vehicleId: '',
            fuelType: 'Diesel',
            date: '',
            amount: '',
            quantity: '',
            rate: '',
            odometer: '',
            stationName: '',
            paymentMode: 'Cash',
            paymentSource: 'Office',
            driver: '',
            slipPhoto: ''
        });
        setEditingId(null);
    };

    const handleEdit = (entry) => {
        setEditingId(entry._id);
        setFormData({
            vehicleId: entry.vehicle?._id || '',
            fuelType: entry.fuelType || 'Diesel',
            date: toISTDateString(entry.date),
            amount: entry.amount || '',
            quantity: entry.quantity || '',
            rate: entry.rate || '',
            odometer: entry.odometer || '',
            stationName: entry.stationName || '',
            paymentMode: entry.paymentMode || 'Cash',
            paymentSource: entry.paymentSource || 'Office',
            driver: entry.driver || '',
            slipPhoto: entry.slipPhoto || ''
        });
        setShowModal(true);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('upload_preset', 'fleet_crm'); // Generic preset

        try {
            // Using existing axios with base url? Probably better to use a dedicated upload route or direct cloudinary
            // For now, let's assume we have a generic upload endpoint or use a standard pattern
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;

            const res = await axios.post('/api/admin/upload', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${userInfo?.token}` }
            });
            console.log('File successfully uploaded, URL:', res.data.url);
            // Ensure previous state is preserved and only slipPhoto is updated.
            setFormData(prev => ({ ...prev, slipPhoto: res.data.url }));
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Image upload failed. Please try again.');
        }
    };

    const handleCameraCapture = async (file) => {
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
            console.log('Camera capture uploaded, URL:', res.data.url);
            setFormData(prev => ({ ...prev, slipPhoto: res.data.url }));
            setActiveCamera(false);
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Image upload failed. Please try again.');
            setActiveCamera(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this entry?')) return;
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            await axios.delete(`/api/admin/fuel/${id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            fetchEntries();
        } catch (err) { console.error(err); }
    };

    const openApprovalModal = (entry) => {
        setSelectedPending(entry);
        setFormData({
            ...formData,
            amount: entry.amount,
            odometer: entry.km,
            date: toISTDateString(entry.date),
            driver: entry.driver || '',
            fuelType: entry.fuelType || 'Diesel',
            paymentSource: entry.paymentSource || 'Office',
            quantity: entry.quantity ? entry.quantity : '', // Pre-fill if driver submitted
            rate: (entry.quantity && entry.amount) ? (entry.amount / entry.quantity).toFixed(2) : '',
            slipPhoto: entry.slipPhoto || ''
        });
        setShowApprovalModal(true);
    };

    const handleApproveReject = async (attendanceId, expenseId, status, extraData = {}) => {
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            await axios.patch(`/api/admin/attendance/${attendanceId}/expense/${expenseId}`,
                { status, ...extraData },
                { headers: { Authorization: `Bearer ${userInfo.token}` } }
            );
            fetchPendingEntries();
            fetchEntries();
            setShowApprovalModal(false);
            resetForm();
        } catch (err) {
            console.error('Fuel approve/reject error:', err);
            const msg = err.response?.data?.message || err.message || 'Error processing request';
            alert(`Error: ${msg}`);
        }
    };





    const downloadExcel = () => {
        const dataToExport = filteredEntries.map(e => ({
            'Date': formatDateIST(e.date),
            'Vehicle': e.vehicle?.carNumber || 'N/A',
            'Fuel Type': e.fuelType,
            'Volume (L)': e.quantity,
            'Rate (₹/Volume)': e.rate,
            'Amount (₹)': e.amount,
            'Odometer (KM)': e.odometer,
            'Distance (KM)': e.distance || 0,
            'Mileage (KM/L)': e.mileage || 0,
            'Payment Source': e.paymentSource || 'Office',
            'Payment Mode': e.paymentMode,
            'Station': e.stationName || 'N/A',
            'Driver': e.driver || 'N/A',
            'Source': e.source || 'Admin'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Fuel Logs');
        XLSX.writeFile(wb, `Fuel_Report_${selectedCompany?.name}_${todayIST()}.xlsx`);
    };

    // Auto-calculate rate if amount or quantity changes
    useEffect(() => {
        if (formData.amount && formData.quantity) {
            const calculatedRate = (Number(formData.amount) / Number(formData.quantity)).toFixed(2);
            if (formData.rate !== calculatedRate) {
                setFormData(prev => ({ ...prev, rate: calculatedRate }));
            }
        }
    }, [formData.amount, formData.quantity]);

    const filteredEntries = entries.filter(e => {
        const matchesSearch = (e.vehicle?.carNumber?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
            e.stationName?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
            e.driver?.toLowerCase()?.includes(searchTerm.toLowerCase()));
        const matchesVehicle = filterVehicle === 'All' || e.vehicle?._id === filterVehicle;
        return matchesSearch && matchesVehicle;
    }).sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return (b.odometer || 0) - (a.odometer || 0);
    });

    // Summary Statistics - Calculate high-accuracy consumed average
    const totalDistance = filteredEntries.reduce((sum, e) => sum + (e.distance || 0), 0);
    const totalAmount = filteredEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const totalLiters = filteredEntries.reduce((sum, e) => sum + (Number(e.quantity) || 0), 0);
    const avgMileage = (totalLiters > 0 && totalDistance > 0) ? (totalDistance / totalLiters).toFixed(2) : 0;

    const petrolAmount = filteredEntries.filter(e => e.fuelType === 'Petrol').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const dieselAmount = filteredEntries.filter(e => e.fuelType === 'Diesel').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return (
        <div className="container-fluid" style={{ paddingBottom: '40px' }}>
            <SEO title="Fuel Management" description="Track fuel entries, mileage, and costs for your entire fleet." />

            {/* Header Section */}
            <header className="flex-resp" style={{ justifyContent: 'space-between', padding: '30px 0', gap: '20px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                        width: '52px', height: '52px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '14px',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 8px 20px rgba(245, 158, 11, 0.3)'
                    }}>
                        <Fuel size={26} color="white" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 8px #f59e0b' }}></div>
                            <span style={{ fontSize: '10px', fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: '1.2px', textTransform: 'uppercase' }}>Fleet Operations</span>
                        </div>
                        <h1 style={{ color: 'white', fontSize: '28px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>
                            Fuel <span style={{ color: '#f59e0b' }}>Logbook</span>
                        </h1>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* SEARCH & FILTERS MOVED TO HEADER */}
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15, 23, 42, 0.6)', padding: '10 15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', height: '36px', position: 'relative' }}>
                            <Car size={13} color="#f59e0b" style={{ opacity: 0.8 }} />
                            <select
                                value={filterVehicle}
                                onChange={(e) => setFilterVehicle(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: '800', fontSize: '11px', outline: 'none', cursor: 'pointer', height: '100%', width: '100px', textTransform: 'uppercase', appearance: 'none', paddingRight: '20px' }}
                            >
                                <option value="All" style={{ background: '#0f172a' }}>All Vehicles</option>
                                {vehicles.map(v => <option key={v._id} value={v._id} style={{ background: '#0f172a' }}>{v.carNumber}</option>)}
                            </select>
                            <ChevronDown size={14} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', right: '10px', pointerEvents: 'none' }} />
                        </div>
                        <div style={{ position: 'relative', width: '220px' }}>
                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                            <input
                                type="text"
                                placeholder="Search driver/station..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '100%', height: '36px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', paddingLeft: '32px', color: 'white', fontSize: '11px', fontWeight: '600', outline: 'none' }}
                            />
                        </div>
                    </div>

                    <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 5px' }}></div>

                    {/* FINANCIAL YEAR & MONTH */}
                    <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.6)', padding: '3px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                            style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: '800', fontSize: '11px', padding: '0 8px', outline: 'none', cursor: 'pointer', height: '30px', textTransform: 'uppercase' }}
                        >
                            <option value="All" style={{ background: '#0f172a' }}>Full Year</option>
                            {[{ n: 3, m: 'Apr' }, { n: 4, m: 'May' }, { n: 5, m: 'Jun' }, { n: 6, m: 'Jul' }, { n: 7, m: 'Aug' }, { n: 8, m: 'Sep' }, { n: 9, m: 'Oct' }, { n: 10, m: 'Nov' }, { n: 11, m: 'Dec' }, { n: 0, m: 'Jan' }, { n: 1, m: 'Feb' }, { n: 2, m: 'Mar' }].map(item => (
                                <option key={item.n} value={item.n} style={{ background: '#0f172a' }}>{item.m}</option>
                            ))}
                        </select>
                        <div style={{ width: '1px', height: '15px', background: 'rgba(255,255,255,0.1)', alignSelf: 'center' }}></div>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: '800', fontSize: '11px', padding: '0 8px', outline: 'none', cursor: 'pointer', height: '30px' }}
                        >
                            {[2024, 2025, 2026, 2027].map(y => (
                                <option key={y} value={y} style={{ background: '#0f172a' }}>{y}-{String(y + 1).slice(-2)}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={downloadExcel}
                        className="btn-glass"
                        style={{ height: '36px', padding: '0 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                    >
                        <FileSpreadsheet size={16} />
                        <span style={{ fontWeight: '800', fontSize: '11px' }}>Export</span>
                    </button>

                    <button
                        className="btn-primary"
                        onClick={() => { resetForm(); setShowModal(true); }}
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', height: '36px', padding: '0 15px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '900', color: 'white', border: 'none', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.2)' }}
                    >
                        <Plus size={18} strokeWidth={3} />
                        <span style={{ fontSize: '12px' }}>New Entry</span>
                    </button>
                </div>
            </header>



            {/* Pending Approvals Section */}
            {
                pendingEntries.length > 0 && (
                    <div style={{ marginBottom: '40px' }}>
                        <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '800', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e', boxShadow: '0 0 10px #f43f5e' }}></div>
                            Driver Approvals (Awaiting)
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                            {pendingEntries.map((entry) => (
                                <motion.div
                                    key={entry._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass-card"
                                    style={{ padding: '20px', borderLeft: '4px solid #f43f5e', background: 'rgba(244, 63, 94, 0.05)' }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            {entry.slipPhoto ? (
                                                <img
                                                    src={getImageUrl(entry.slipPhoto)}
                                                    onClick={() => { setSelectedImage(entry.slipPhoto); setShowImageModal(true); }}
                                                    style={{ width: '50px', height: '50px', borderRadius: '10px', objectFit: 'cover', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}
                                                />
                                            ) : (
                                                <div
                                                    onClick={() => { setSelectedImage(''); setShowImageModal(true); }}
                                                    style={{ width: '50px', height: '50px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
                                                >
                                                    <Eye size={20} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                                                </div>
                                            )}
                                            <div>
                                                <p style={{ color: 'white', fontWeight: '800', fontSize: '16px', margin: 0 }}>₹{entry.amount}</p>
                                                <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0' }}>{entry.driver} • {entry.carNumber}</p>
                                            </div>
                                        </div>
                                        <span style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', fontSize: '10px', padding: '4px 8px', borderRadius: '6px', fontWeight: '800', textTransform: 'uppercase' }}>Pending</span>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '15px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                                        <span>{entry.km} KM Reading</span>
                                        <span>{formatDateTimeIST(entry.date)}</span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <button
                                            onClick={() => openApprovalModal(entry)}
                                            style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                                        >
                                            Review & Approve
                                        </button>
                                        <button
                                            onClick={() => handleApproveReject(entry.attendanceId, entry._id, 'rejected')}
                                            style={{ background: 'rgba(255,255,255,0.05)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '10px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )
            }



            {/* Summary Row */}
            <div className="grid-1-2-2-4" style={{ gap: '20px', marginBottom: '30px' }}>
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card" style={{ padding: '24px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', background: 'rgba(15, 23, 42, 0.4)', display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}><CreditCard size={28} /></div>
                    <div>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Total Expense</p>
                        <h2 style={{ color: 'white', fontSize: '30px', fontWeight: '950', margin: 0 }}>₹{loading ? '...' : totalAmount.toLocaleString()}</h2>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', marginTop: '4px' }}>Diesel: ₹{dieselAmount.toLocaleString()}</div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: '24px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.6))', display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}><TrendingUp size={28} /></div>
                    <div>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Efficiency Score</p>
                        <h2 style={{ color: 'white', fontSize: '30px', fontWeight: '950', margin: 0 }}>{loading ? '...' : `${avgMileage}`} <span style={{ fontSize: '14px', fontWeight: '700', color: '#10b981' }}>KM/L</span></h2>
                        <div style={{ fontSize: '10px', color: '#10b981', fontWeight: '800', marginTop: '4px' }}>Consumed Average</div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card" style={{ padding: '24px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', background: 'rgba(15, 23, 42, 0.4)', display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'rgba(14, 165, 233, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9' }}><Navigation size={28} /></div>
                    <div>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Run Distance</p>
                        <h2 style={{ color: 'white', fontSize: '30px', fontWeight: '950', margin: 0 }}>{loading ? '...' : totalDistance.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: '700' }}>KM</span></h2>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', marginTop: '4px' }}>Odometer Delta</div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card" style={{ padding: '24px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', background: 'rgba(15, 23, 42, 0.4)', display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}><Droplets size={28} /></div>
                    <div>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Fuel Volume</p>
                        <h2 style={{ color: 'white', fontSize: '30px', fontWeight: '950', margin: 0 }}>{loading ? '...' : totalLiters.toFixed(1)} <span style={{ fontSize: '14px', fontWeight: '700' }}>L</span></h2>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', marginTop: '4px' }}>Total Refills</div>
                    </div>
                </motion.div>
            </div>

            {/* Entries List */}
            <div className="table-responsive-wrapper" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                {loading ? (
                    <div style={{ padding: '100px', textAlign: 'center' }}>
                        <div className="spinner" style={{ margin: '0 auto' }}></div>
                        <p style={{ color: 'var(--text-muted)', marginTop: '20px' }}>Loading fuel logs...</p>
                    </div>
                ) : filteredEntries.length === 0 ? (
                    <div style={{ padding: '100px', textAlign: 'center' }}>
                        <Fuel size={48} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: '20px' }} />
                        <h3 style={{ color: 'white' }}>No fuel records found</h3>
                        <p style={{ color: 'var(--text-muted)' }}>Create your first fuel entry to start tracking.</p>
                    </div>
                ) : (
                    <div className="hide-mobile" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
                                    <th style={{ padding: '20px 25px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>Date & Vehicle</th>
                                    <th style={{ padding: '20px 25px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>Fuel Details</th>
                                    <th style={{ padding: '20px 25px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>Odometer & Trip</th>
                                    <th style={{ padding: '20px 25px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>Efficiency</th>
                                    <th style={{ padding: '20px 25px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>Payment Source</th>
                                    <th style={{ padding: '20px 25px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>Total Amount</th>
                                    <th style={{ padding: '20px 25px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEntries.map((e, idx) => (
                                    <motion.tr
                                        key={e._id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                                    >
                                        <td style={{ padding: '15px 25px' }}>
                                            <div style={{ color: 'white', fontWeight: '900', fontSize: '15px', letterSpacing: '0.2px' }}>
                                                {formatDateIST(e.date)}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                                                <Car size={13} color="#f59e0b" style={{ opacity: 0.8 }} />
                                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '800', textTransform: 'uppercase' }}>{e.vehicle?.carNumber}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '15px 25px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontWeight: '900', textTransform: 'uppercase', border: '1px solid rgba(245,158,11,0.1)' }}>{e.fuelType}</span>
                                                <span style={{ fontSize: '15px', color: 'white', fontWeight: '810' }}>{e.quantity} <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>LITERS</span></span>
                                            </div>
                                            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '5px', fontWeight: '700' }}>
                                                @ ₹{e.rate}/L • {e.stationName || 'Local Station'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '15px 25px' }}>
                                            <div style={{ color: 'white', fontWeight: '800', fontSize: '15px' }}>{e.odometer.toLocaleString()} <span style={{ fontSize: '10px', opacity: 0.4 }}>KM</span></div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#10b981', marginTop: '5px', fontWeight: '800' }}>
                                                <Navigation size={12} strokeWidth={3} />
                                                {e.distance || 0} KM TRIP
                                            </div>
                                        </td>
                                        <td style={{ padding: '15px 25px' }}>
                                            <div style={{
                                                color: e.mileage > 12 ? '#10b981' : '#f59e0b',
                                                fontWeight: '950',
                                                fontSize: '18px',
                                                display: 'flex',
                                                alignItems: 'baseline',
                                                gap: '4px'
                                            }}>
                                                {e.mileage || 0}
                                                <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.5 }}>KM/L</span>
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', fontWeight: '800' }}>
                                                ₹{e.costPerKm || 0}/KM COST
                                            </div>
                                        </td>
                                        <td style={{ padding: '15px 25px' }}>
                                            <div style={{
                                                color: 'white', fontWeight: '900', fontSize: '12px', padding: '4px 12px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', display: 'inline-block', textTransform: 'uppercase'
                                            }}>
                                                {e.paymentSource?.toLowerCase().includes('guest') ? 'Guest' : 'Office'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '15px 25px' }}>
                                            <div style={{ color: 'white', fontWeight: '950', fontSize: '18px' }}>₹{e.amount.toLocaleString()}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '5px', fontWeight: '800', textTransform: 'uppercase' }}>
                                                {e.source === 'Driver' ? <User size={10} color="#f59e0b" /> : <Shield size={10} color="#f59e0b" />}
                                                {e.source === 'Driver' ? 'Driver App' : 'Administrator'}
                                                <span style={{ opacity: 0.5 }}>• {e.driver}</span>
                                            </div>
                                            {e.createdBy?.name && (
                                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontWeight: '800' }}>
                                                    Approved By: {e.createdBy.name}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '20px 25px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => { setSelectedImage(e.slipPhoto || ''); setShowImageModal(true); }}
                                                    className="glass-card-hover-effect"
                                                    style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '10px',
                                                        background: e.slipPhoto ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.05)',
                                                        color: e.slipPhoto ? '#10b981' : '#f43f5e',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        opacity: e.slipPhoto ? 1 : 0.6
                                                    }}
                                                    title={e.slipPhoto ? "View Slip" : "Slip Missing"}
                                                >
                                                    <Eye size={16} style={{ opacity: e.slipPhoto ? 1 : 0.5 }} />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(e)}
                                                    className="glass-card-hover-effect"
                                                    style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(14, 165, 233, 0.1)', color: 'var(--primary)', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(e._id)}
                                                    className="glass-card-hover-effect"
                                                    style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Mobile Card View */}
            <div className="show-mobile">
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner"></div></div>
                ) : filteredEntries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                        <Fuel size={40} style={{ opacity: 0.2, marginBottom: '10px' }} />
                        <p>No fuel records found.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {filteredEntries.map((e) => (
                            <motion.div
                                key={e._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card"
                                style={{ padding: '16px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div>
                                        <div style={{ color: 'white', fontWeight: '900', fontSize: '18px', letterSpacing: '0.5px' }}>{e.vehicle?.carNumber}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                            {formatDateIST(e.date)}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: 'var(--primary)', fontWeight: '900', fontSize: '18px' }}>₹{e.amount.toLocaleString()}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{e.quantity} L @ ₹{e.rate}/Volume</div>
                                        {e.createdBy?.name && (
                                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontWeight: '800' }}>
                                                Approved By: {e.createdBy.name}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Odometer</div>
                                        <div style={{ color: 'white', fontSize: '13px', fontWeight: '700' }}>{e.odometer.toLocaleString()} KM</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Efficiency</div>
                                        <div style={{ color: e.mileage > 12 ? '#10b981' : 'var(--primary)', fontSize: '13px', fontWeight: '700' }}>{e.mileage || 0} KM/L</div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: e.fuelType === 'Diesel' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(14, 165, 233, 0.1)', color: e.fuelType === 'Diesel' ? 'var(--primary)' : 'var(--primary)', fontWeight: '800', textTransform: 'uppercase' }}>{e.fuelType}</span>
                                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>• {e.stationName || 'Local Station'}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <User size={12} color="white" />
                                        </div>
                                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>{e.driver}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => { setSelectedImage(e.slipPhoto || ''); setShowImageModal(true); }}
                                            style={{
                                                background: e.slipPhoto ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.05)',
                                                color: e.slipPhoto ? '#10b981' : '#f43f5e',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                                opacity: e.slipPhoto ? 1 : 0.6
                                            }}
                                        >
                                            <Eye size={14} style={{ opacity: e.slipPhoto ? 1 : 0.5 }} />
                                        </button>
                                        <button onClick={() => handleEdit(e)} style={{ background: 'rgba(14, 165, 233, 0.1)', color: 'var(--primary)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(14, 165, 233, 0.2)' }}><Edit size={14} /></button>
                                        <button onClick={() => handleDelete(e._id)} style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', padding: '8px', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.2)' }}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Record Modal */}
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
                                    {editingId ? 'Edit Entry' : 'Manual Fuel Entry'}
                                </h1>
                                <button className="glass-card" onClick={() => setShowModal(false)} style={{ padding: '10px', borderRadius: '50%', color: 'white' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreate} style={{ padding: 'clamp(20px, 5vw, 30px)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                    {/* Vehicle and Type Selection */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '20px' }}>
                                        <div>
                                            <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Vehicle Number *</label>
                                            <select
                                                className="input-field"
                                                value={formData.vehicleId}
                                                required
                                                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                                                style={{ width: '100%', height: '50px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: 'white', padding: '0 15px' }}
                                            >
                                                <option value="" style={{ background: '#0f172a' }}>-- Select Car --</option>
                                                {vehicles.map(v => <option key={v._id} value={v._id} style={{ background: '#0f172a' }}>{v.carNumber} ({v.model})</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Fuel Type</label>
                                            <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '5px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', height: '50px' }}>
                                                {['Diesel', 'Petrol', 'CNG'].map(t => (
                                                    <button
                                                        key={t} type="button"
                                                        onClick={() => setFormData({ ...formData, fuelType: t })}
                                                        style={{
                                                            flex: 1,
                                                            height: '100%',
                                                            borderRadius: '10px',
                                                            border: 'none',
                                                            background: formData.fuelType === t ? (t === 'Diesel' ? 'var(--primary)' : 'var(--primary)') : 'transparent',
                                                            color: formData.fuelType === t ? 'black' : 'rgba(255,255,255,0.5)',
                                                            fontWeight: '800',
                                                            fontSize: '12px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Core Transaction Details */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '15px' }}>
                                        <div>
                                            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Date *</label>
                                                <PremiumDateInput
                                                    value={formData.date}
                                                    onChange={v => setFormData({ ...formData, date: v })}
                                                    required
                                                />
                                        </div>
                                        <div>
                                            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Amount (₹) *</label>
                                            <input type="number" className="input-field" placeholder="e.g. 5000" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required style={{ width: '100%', height: '50px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: 'white', padding: '0 15px' }} />
                                        </div>
                                        <div>
                                            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Volume (L) *</label>
                                            <input type="number" step="0.01" className="input-field" placeholder="e.g. 50" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required style={{ width: '100%', height: '50px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: 'white', padding: '0 15px' }} />
                                        </div>
                                    </div>

                                    {/* Operational Details */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '15px' }}>
                                        <div>
                                            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Rate</label>
                                            <input type="number" step="0.01" className="input-field" value={formData.rate} onChange={(e) => setFormData({ ...formData, rate: e.target.value })} placeholder="Auto-calculated" style={{ width: '100%', height: '50px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: 'rgba(255,255,255,0.5)', padding: '0 15px' }} />
                                        </div>
                                        <div>
                                            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Odometer (KM) *</label>
                                            <input type="number" className="input-field" placeholder="Current Reading" value={formData.odometer} onChange={(e) => setFormData({ ...formData, odometer: e.target.value })} required style={{ width: '100%', height: '50px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: 'white', padding: '0 15px' }} />
                                        </div>
                                        <div>
                                            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Payment Source</label>
                                            <select className="input-field" value={formData.paymentSource} onChange={(e) => setFormData({ ...formData, paymentSource: e.target.value })} style={{ width: '100%', height: '50px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: 'white', padding: '0 15px' }}>
                                                <option value="Office" style={{ background: '#0f172a' }}>Office</option>
                                                <option value="Guest" style={{ background: '#0f172a' }}>Guest</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Vendor and Personnel */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '20px' }}>
                                        <div>
                                            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Fuel Station Name</label>
                                            <input className="input-field" placeholder="e.g. HP Petrol Pump" value={formData.stationName} onChange={(e) => setFormData({ ...formData, stationName: e.target.value })} style={{ width: '100%', height: '50px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: 'white', padding: '0 15px' }} />
                                        </div>
                                        <div style={{ display: 'flex', gap: '15px' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Company Driver</label>
                                                <select
                                                    className="input-field"
                                                    value={!drivers.find(d => d.name === formData.driver && d.isFreelancer) ? formData.driver : ''}
                                                    onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                                                    disabled={!!(formData.driver && drivers.find(d => d.name === formData.driver && d.isFreelancer))}
                                                    style={{ width: '100%', height: '50px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: 'white', padding: '0 10px', cursor: 'pointer', opacity: (formData.driver && drivers.find(d => d.name === formData.driver && d.isFreelancer)) ? 0.3 : 1 }}
                                                >
                                                    <option value="" style={{ background: '#1e293b' }}>Select Company</option>
                                                    {drivers.filter(d => !d.isFreelancer).map(d => (
                                                        <option key={d._id} value={d.name} style={{ background: '#1e293b' }}>{d.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Freelancer</label>
                                                <select
                                                    className="input-field"
                                                    value={drivers.find(d => d.name === formData.driver && d.isFreelancer) ? formData.driver : ''}
                                                    onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                                                    disabled={!!(formData.driver && drivers.find(d => d.name === formData.driver && !d.isFreelancer))}
                                                    style={{ width: '100%', height: '50px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: 'white', padding: '0 10px', cursor: 'pointer', opacity: (formData.driver && drivers.find(d => d.name === formData.driver && !d.isFreelancer)) ? 0.3 : 1 }}
                                                >
                                                    <option value="" style={{ background: '#1e293b' }}>Select Free.</option>
                                                    {drivers.filter(d => d.isFreelancer).map(d => (
                                                        <option key={d._id} value={d.name} style={{ background: '#1e293b' }}>{d.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Slip Upload */}
                                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '12px' }}>Fuel Slip / Receipt Photo</p>
                                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                            {formData.slipPhoto ? (
                                                <div style={{ position: 'relative' }}>
                                                    <img src={getImageUrl(formData.slipPhoto)} alt="Slip" onClick={() => { setSelectedImage(formData.slipPhoto); setShowImageModal(true); }} style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }} title="Click to view slip" />
                                                    <button type="button" onClick={() => setFormData({ ...formData, slipPhoto: '' })} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#f43f5e', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}><X size={14} /></button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <div onClick={() => setActiveCamera(true)} style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                                        <ImageIcon size={20} color="var(--text-muted)" />
                                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Camera</span>
                                                    </div>
                                                    <label style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                                        <Plus size={20} color="var(--text-muted)" />
                                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Upload</span>
                                                        <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                                                    </label>
                                                </div>
                                            )}
                                            <div style={{ flex: 1 }}>
                                                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', margin: 0 }}>Snap a photo or upload fuel bill.</p>
                                                <p style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '4px' }}>Max size: 5MB (JPG, PNG)</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Form Actions */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '15px', marginTop: '10px' }}>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="btn-primary"
                                            style={{ height: '56px', borderRadius: '14px', fontSize: '16px', fontWeight: '900', background: 'linear-gradient(135deg, var(--primary) 0%, #d97706 100%)', border: 'none', color: 'black' }}
                                        >
                                            {submitting ? 'Saving...' : (editingId ? 'Update Entry' : 'Save Fuel Entry')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            style={{ height: '56px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', fontWeight: '700', cursor: 'pointer' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )
                }
                {
                    showImageModal && (
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
                                        alt="Fuel Slip"
                                        style={{ width: '100%', height: 'auto', maxHeight: '85vh', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
                                    />
                                ) : (
                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '50px', borderRadius: '20px', textAlign: 'center', width: '100%' }}>
                                        <ImageIcon size={48} style={{ opacity: 0.2, marginBottom: '15px' }} />
                                        <p style={{ color: 'white', fontWeight: '700' }}>No slip image available.</p>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '10px' }}>To fix this: Click the Edit (Pen) icon on the entry and upload the slip manually.</p>
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
                    )
                }
            </AnimatePresence >

            {/* Approval Modal */}
            < AnimatePresence >
                {showApprovalModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card"
                            style={{ padding: '0', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                            <div style={{ padding: '25px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '800', margin: 0 }}>Review Fuel Entry</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>Verify details and slip before approving.</p>
                                </div>
                                <button onClick={() => setShowApprovalModal(false)} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer', border: 'none' }}><X size={20} /></button>
                            </div>

                            <div style={{ padding: '30px' }}>
                                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Driver</div>
                                        <div style={{ color: 'white', fontWeight: '700' }}>{selectedPending?.driver}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Vehicle</div>
                                        <div style={{ color: 'white', fontWeight: '700' }}>{selectedPending?.carNumber}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Date</div>
                                        <div style={{ color: 'white', fontWeight: '700' }}>{formatDateIST(selectedPending?.date)}</div>
                                    </div>
                                </div>

                                <div className="form-grid-2">
                                    <div>
                                        <label style={{ color: 'white', fontSize: '12px', marginBottom: '8px', display: 'block' }}>Amount (₹)</label>
                                        <input type="number" className="input-field" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} style={{ background: 'rgba(255,255,255,0.05)' }} />
                                    </div>
                                    <div>
                                        <label style={{ color: 'white', fontSize: '12px', marginBottom: '8px', display: 'block' }}>Volume (L)</label>
                                        <input type="number" step="0.01" className="input-field" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-grid-2" style={{ marginTop: '15px' }}>
                                    <div>
                                        <label style={{ color: 'white', fontSize: '12px', marginBottom: '8px', display: 'block' }}>Rate (₹/Volume)</label>
                                        <input type="number" step="0.01" className="input-field" value={formData.rate} onChange={(e) => setFormData({ ...formData, rate: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ color: 'white', fontSize: '12px', marginBottom: '8px', display: 'block' }}>Odometer</label>
                                        <input type="number" className="input-field" value={formData.odometer} onChange={(e) => setFormData({ ...formData, odometer: e.target.value })} />
                                    </div>
                                </div>

                                <div style={{ marginTop: '15px' }}>
                                    <label style={{ color: 'white', fontSize: '12px', marginBottom: '8px', display: 'block' }}>Payment Source</label>
                                    <select
                                        className="input-field"
                                        value={formData.paymentSource}
                                        onChange={(e) => setFormData({ ...formData, paymentSource: e.target.value })}
                                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)' }}
                                    >
                                        <option value="Office">Office</option>
                                        <option value="Guest">Guest</option>
                                    </select>
                                </div>

                                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)', marginTop: '20px' }}>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '12px' }}>Slip Image Verification</p>
                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                        {formData.slipPhoto ? (
                                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <img src={getImageUrl(formData.slipPhoto)} alt="Slip" onClick={() => { setSelectedImage(formData.slipPhoto); setShowImageModal(true); }} style={{ width: '100px', height: '100px', borderRadius: '12px', objectFit: 'cover', border: '2px solid rgba(16, 185, 129, 0.3)', cursor: 'pointer' }} title="Click to view slip" />
                                                    <button type="button" onClick={() => setFormData({ ...formData, slipPhoto: '' })} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#f43f5e', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }}><X size={14} /></button>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <button type="button" onClick={() => setActiveCamera(true)} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><ImageIcon size={14} /> Retake</button>
                                                    <label style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Plus size={14} /> Replace
                                                        <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                                                    </label>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <div onClick={() => setActiveCamera(true)} style={{ width: '100px', height: '100px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                                    <ImageIcon size={24} color="var(--primary)" />
                                                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px', fontWeight: '700' }}>Camera</span>
                                                </div>
                                                <label style={{ width: '100px', height: '100px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                                    <Plus size={24} color="var(--primary)" />
                                                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px', fontWeight: '700' }}>Upload</span>
                                                    <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                                                </label>
                                            </div>
                                        )}
                                        <div style={{ flex: 1 }}>
                                            {!formData.slipPhoto && <p style={{ color: 'var(--primary)', fontSize: '12px', margin: 0, fontWeight: '700' }}>⚠ No slip attached!</p>}
                                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', margin: '4px 0 0' }}>Upload the slip if it's missing or incorrect.</p>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
                                    <button
                                        onClick={() => handleApproveReject(selectedPending.attendanceId, selectedPending._id, 'approved', { amount: formData.amount, quantity: formData.quantity, rate: formData.rate, odometer: formData.odometer, slipPhoto: formData.slipPhoto, paymentSource: formData.paymentSource })}
                                        style={{ flex: 2, height: '50px', borderRadius: '12px', fontSize: '15px', fontWeight: '800', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer' }}
                                    >
                                        Confirm Approval
                                    </button>
                                    <button
                                        onClick={() => handleApproveReject(selectedPending.attendanceId, selectedPending._id, 'rejected')}
                                        style={{ flex: 1, background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence >
            {activeCamera && (
                <CameraModal
                    onCapture={handleCameraCapture}
                    onClose={() => setActiveCamera(false)}
                />
            )}
        </div >
    );
};

export default FuelPage;
