import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import * as XLSX from 'xlsx';
import {
    Wrench,
    Plus,
    Search,
    Trash2,
    Calendar,
    FileText,
    Car,
    FileSpreadsheet,
    Droplets,
    AlertCircle,
    CheckCircle2,
    Clock,
    User,
    Users,
    PlusCircle,
    Upload,
    ImageIcon,
    MapPin,
    X,
    IndianRupee,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompany } from '../context/CompanyContext';
import SEO from '../components/SEO';
import { todayIST, formatDateIST, nowIST, formatDateTimeIST } from '../utils/istUtils';
import ParkingModal from '../components/ParkingModal';

const Chip = ({ label, value, color }) => (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
        <span style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
        <span style={{ fontSize: '18px', fontWeight: '950', color: color }}>{value}</span>
    </div>
);

const DriverServices = () => {
    const { selectedCompany } = useCompany();
    const [records, setRecords] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showParkingModal, setShowParkingModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('All');
    const [selectedYear, setSelectedYear] = useState(nowIST().getUTCFullYear());
    const [filterMode, setFilterMode] = useState('month'); // 'month' or 'range'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedType, setSelectedType] = useState('All'); // 'All', 'Wash', 'Puncture'
    const [selectedVehicleFilter, setSelectedVehicleFilter] = useState('All');
    const [pendingRecords, setPendingRecords] = useState([]);

    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .driver-services-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 40px;
                padding-top: 40px;
                gap: 20px;
            }
            .driver-services-controls {
                display: flex;
                gap: 12px;
                align-items: center;
            }
            .driver-services-search-bar {
                display: flex;
                gap: 20px;
                margin-bottom: 30px;
                align-items: center;
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                gap: 20px;
                margin-bottom: 25px;
            }
            .glass-card {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.08);
                backdrop-filter: blur(20px);
                border-radius: 24px;
            }
            .stat-card {
                padding: 24px;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .stat-card-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
            }
            .stat-card-icon {
                width: 42px;
                height: 42px;
                border-radius: 12px;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .stat-card-label {
                font-size: 11px;
                font-weight: 800;
                color: rgba(255, 255, 255, 0.4);
                text-transform: uppercase;
                letter-spacing: 1px;
                margin: 0;
            }
            .stat-card-value {
                font-size: 32px;
                font-weight: 950;
                color: white;
                margin: 0;
            }
            .scroll-x {
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
            }
            .form-grid-2 {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
            }
            .input-field {
                width: 100%;
                height: 52px;
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 14px;
                padding: 0 15px;
                color: white;
                font-size: 14px;
                outline: none;
            }
            .hide-mobile { display: block; }
            .show-mobile { display: none; }

            @media (max-width: 1024px) {
                .driver-services-header {
                    flex-direction: column;
                    align-items: flex-start;
                }
                .driver-services-controls {
                    width: 100%;
                    flex-wrap: wrap;
                }
            }

            @media (max-width: 768px) {
                .driver-services-search-bar {
                    flex-direction: column;
                    align-items: stretch;
                }
                .form-grid-2 {
                    grid-template-columns: 1fr;
                }
                .hide-mobile { display: none !important; }
                .show-mobile { display: block !important; }
                .stat-card-value {
                    font-size: 24px;
                }
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    useEffect(() => {
        if (selectedCompany) {
            fetchRecords();
            fetchPending();
            fetchVehicles();
            fetchDrivers();
        }
    }, [selectedCompany, selectedMonth, selectedYear, startDate, endDate, filterMode]);

    const fetchRecords = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            if (!userInfo?.token) return;

            let url = `/api/admin/maintenance/${selectedCompany._id}?type=driver_services&`;
            if (filterMode === 'range' && startDate && endDate) {
                url += `startDate=${startDate}&endDate=${endDate}`;
            } else {
                url += `month=${selectedMonth}&year=${selectedYear}`;
            }

            const { data } = await axios.get(url, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            
            const filteredData = (data || []).filter(r => {
                const cat = String(r.category || '').toLowerCase();
                const desc = String(r.description || '').toLowerCase();
                
                const isWash = cat.includes('wash') || desc.includes('wash');
                const isPuncture = cat.includes('punc') || desc.includes('punc');
                const isTissue = cat.includes('tissue') || desc.includes('tissue');
                const isWater = cat.includes('water') || desc.includes('water');
                const isOther = cat.includes('other') || desc.includes('other');
                
                return isWash || isPuncture || isTissue || isWater || isOther;
            });
            setRecords(filteredData);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchPending = async () => {
        if (!selectedCompany?._id) return;
        try {
            const { data } = await axios.get(`/api/admin/maintenance/pending/${selectedCompany._id}`);
            setPendingRecords(data || []);
        } catch (err) { console.error(err); }
    };

    // Form State for Manual Entry
    const [formData, setFormData] = useState({
        vehicleId: '',
        driverId: '',
        maintenanceType: 'Car Service',
        category: 'Car Wash',
        description: '',
        garageName: '',
        billDate: '',
        amount: '',
        paymentMode: 'Cash',
        status: 'Completed'
    });
    const [billPhoto, setBillPhoto] = useState(null);
    const [billPhotoPreview, setBillPhotoPreview] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null); // For viewing
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [message, setMessage] = useState({ text: '', type: '' });

    const serviceCategories = ['Car Wash', 'Puncture', 'Tissue Box', 'Water Bottle', 'Other details'];

    const fetchVehicles = async () => {
        if (!selectedCompany?._id) return;
        try {
            const { data } = await axios.get(`/api/admin/vehicles/${selectedCompany._id}`);
            setVehicles(data.vehicles || []);
        } catch (err) { console.error(err); }
    };

    const fetchDrivers = async () => {
        if (!selectedCompany?._id) return;
        try {
            const { data } = await axios.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false`);
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

            const fd = new FormData();
            Object.keys(formData).forEach(key => {
                fd.append(key, formData[key]);
            });
            fd.append('companyId', selectedCompany._id);
            if (billPhoto) fd.append('billPhoto', billPhoto);

            if (editingId) {
                await axios.put(`/api/admin/maintenance/${editingId}`, fd, {
                    headers: { 
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${userInfo.token}` 
                    }
                });
                setMessage({ text: 'Service record updated successfully!', type: 'success' });
            } else {
                await axios.post('/api/admin/maintenance', fd, {
                    headers: { 
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${userInfo.token}` 
                    }
                });
                setMessage({ text: 'New service record added!', type: 'success' });
            }

            setTimeout(() => {
                setShowModal(false);
                resetForm();
                fetchRecords();
                fetchPending();
                setMessage({ text: '', type: '' });
            }, 1500);
        } catch (err) {
            console.error(err);
            setMessage({ text: err.response?.data?.message || 'Error saving record', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleExport = () => {
        let exportData = [];
        let fileName = 'Export';

        if (activeTab === 'maintenance') {
            exportData = filteredRecords.map(r => ({
                Date: formatDateIST(r.billDate),
                Vehicle: r.vehicle?.carNumber || 'N/A',
                Category: r.category,
                Driver: r.driver?.name || 'Manual',
                Vendor: r.garageName,
                Amount: r.amount,
                Payment: r.paymentMode,
                Notes: r.description
            }));
            fileName = 'Driver_Services_Log';
        } else {
            const currentData = activeTab === 'duty' ? applySearch(attendance) : applySearch(freelanceAttendance);
            exportData = currentData.map(r => ({
                Date: formatDateIST(r.date),
                Vehicle: r.vehicle?.carNumber?.split('#')[0] || 'N/A',
                Driver: r.driver?.name || 'N/A',
                Status: r.isFreelancer ? 'Freelancer' : 'Staff',
                PunchIn: r.punchIn?.time ? new Date(r.punchIn.time).toLocaleTimeString() : '--',
                PunchOut: r.punchOut?.time ? new Date(r.punchOut.time).toLocaleTimeString() : '--',
                StartKM: r.startKm,
                EndKM: r.endKm,
                TotalKM: r.totalKM,
                FuelAmount: r.fuel?.amount || 0,
                ParkingAmount: r.punchOut?.tollParkingAmount || 0,
                Salary: r.dailyWage || 0
            }));
            fileName = activeTab === 'duty' ? 'Staff_Duty_Reports' : 'Freelancer_Duty_Reports';
        }

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `${fileName}_${startDate}_to_${endDate}.xlsx`);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this service record?')) return;
        try {
            await axios.delete(`/api/admin/maintenance/${id}`);
            fetchRecords();
            fetchPending();
        } catch (err) { console.error(err); }
    };

    const handleApprove = async (attendanceId, expenseId) => {
        if (!window.confirm('Approve this service?')) return;
        try {
            await axios.patch(`/api/admin/attendance/${attendanceId}/expense/${expenseId}`, { status: 'approved' });
            fetchRecords();
            fetchPending();
        } catch (err) { console.error(err); }
    };

    const handleReject = async (attendanceId, expenseId) => {
        if (!window.confirm('Reject this service?')) return;
        try {
            await axios.patch(`/api/admin/attendance/${attendanceId}/expense/${expenseId}`, { status: 'rejected' });
            fetchRecords();
            fetchPending();
        } catch (err) { console.error(err); }
    };

    const applySearch = (data) => {
        if (!searchTerm) return data;
        const s = searchTerm.toLowerCase();
        return data.filter(r => 
            (r.driver?.name || '').toLowerCase().includes(s) ||
            (r.vehicle?.carNumber || '').toLowerCase().includes(s) ||
            (r.pickUpLocation || '').toLowerCase().includes(s) ||
            (r.dropLocation || '').toLowerCase().includes(s)
        );
    };

    const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';

    const resetForm = () => {
        setFormData({
            vehicleId: '',
            driverId: '',
            maintenanceType: 'Car Service',
            category: 'Car Wash',
            description: '',
            garageName: 'Local Vendor',
            billDate: '',
            amount: '',
            paymentMode: 'Cash',
            status: 'Completed'
        });
        setBillPhoto(null);
        setBillPhotoPreview(null);
        setEditingId(null);
    };

    const filteredRecords = records.filter(r => {
        const query = searchTerm.toLowerCase();
        
        // Search Filter
        const matchesSearch = !searchTerm || (
            r.vehicle?.carNumber?.toLowerCase()?.includes(query) ||
            r.category?.toLowerCase()?.includes(query) ||
            r.description?.toLowerCase()?.includes(query) ||
            r.driver?.name?.toLowerCase()?.includes(query)
        );
        
        // Vehicle Select Filter
        const rVehicleId = r.vehicle?._id || r.vehicle;
        const matchesVehicle = selectedVehicleFilter === 'All' || rVehicleId === selectedVehicleFilter;
        
        // Category Tab Filter
        const cat = String(r.category || '').toLowerCase();
        const desc = String(r.description || '').toLowerCase();
        
        let matchesType = true;
        if (selectedType === 'Wash') {
            matchesType = cat.includes('wash') || desc.includes('wash');
        } else if (selectedType === 'Puncture') {
            matchesType = cat.includes('punc') || desc.includes('punc');
        } else if (selectedType === 'Tissue') {
            matchesType = cat.includes('tissue') || desc.includes('tissue');
        } else if (selectedType === 'Water') {
            matchesType = cat.includes('water') || desc.includes('water');
        }

        return matchesSearch && matchesVehicle && matchesType;
    });

    const totalCost = filteredRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const punctureCount = records.filter(r => {
        const cat = (r.category || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        return cat.includes('punc') || desc.includes('punc');
    }).length;

    const washCount = records.filter(r => {
        const cat = (r.category || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        const type = (r.maintenanceType || '').toLowerCase();
        
        const isWashKeyword = cat.includes('wash') || desc.includes('wash') || type.includes('wash');
        const isCarServiceGeneric = type === 'car service' || cat === 'car service (driver entry)';
        const isPuncture = cat.includes('puncture') || cat.includes('puncher') || 
                          desc.includes('puncture') || desc.includes('puncher');
        const isInterior = cat.includes('interior') || desc.includes('interior');
        
        return (isWashKeyword || isCarServiceGeneric) && !isPuncture && !isInterior;
    }).length;

    const recordsFilteredForStats = records.filter(r => {
        const text = `${r.category} ${r.description} ${r.maintenanceType}`.toLowerCase();
        return text.includes('wash') || text.includes('puncture') || text.includes('puncher');
    });

    const recentVendors = Array.from(new Set(records.map(r => r.garageName).filter(Boolean)));

    return (
        <div className="container-fluid" style={{ paddingBottom: '40px' }}>
            <SEO title="Driver Services" description="Manage car wash, puncture repairs, and other driver-related services." />

            {/* Header Screenshot Match */}
            <header className="driver-services-header">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ background: '#10b981', padding: '6px', borderRadius: '10px', display: 'flex' }}>
                            <Droplets size={14} color="white" />
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Fleet Operations</span>
                    </div>
                    <h1 style={{ color: 'white', fontWeight: '900', margin: 0, letterSpacing: '-1px', fontSize: '32px' }}>Driver Services</h1>
                </div>

                <div className="driver-services-controls">
                    {/* Toggle between Range and Month */}
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <button 
                            onClick={() => setFilterMode('month')}
                            style={{ padding: '8px 15px', borderRadius: '10px', border: 'none', background: filterMode === 'month' ? 'rgba(255,255,255,0.08)' : 'transparent', color: filterMode === 'month' ? 'white' : 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            MONTH
                        </button>
                        <button 
                            onClick={() => setFilterMode('range')}
                            style={{ padding: '8px 15px', borderRadius: '10px', border: 'none', background: filterMode === 'range' ? 'rgba(255,255,255,0.08)' : 'transparent', color: filterMode === 'range' ? 'white' : 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            RANGE
                        </button>
                    </div>

                    {filterMode === 'month' ? (
                        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <select 
                                value={selectedMonth} 
                                onChange={e => setSelectedMonth(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '12px', fontWeight: '900', outline: 'none', padding: '10px', cursor: 'pointer' }}
                            >
                                {['All', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(m => (
                                    <option key={m} value={m} style={{ background: '#0f172a' }}>
                                        {m === 'All' ? 'Full Year' : new Date(2000, m-1).toLocaleString('default', { month: 'long' })}
                                    </option>
                                ))}
                            </select>
                            <select 
                                value={selectedYear} 
                                onChange={e => setSelectedYear(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '12px', fontWeight: '900', outline: 'none', padding: '10px', cursor: 'pointer' }}
                            >
                                {[2024, 2025, 2026, 2027].map(y => (
                                    <option key={y} value={y} style={{ background: '#0f172a' }}>{y}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <button style={{ background: 'rgba(255,255,255,0.03)', border: 'none', color: 'white', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
                            <div style={{ padding: '0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <div style={{ position: 'relative' }}>
                                     <input
                                         id="driver-services-start-date"
                                         type="date"
                                         value={startDate}
                                         onChange={e => setStartDate(e.target.value)}
                                         onClick={(e) => e.target.showPicker()}
                                         style={{ colorScheme: 'dark', background: 'transparent', border: 'none', color: 'white', fontSize: '12px', fontWeight: '800', outline: 'none', cursor: 'pointer', width: '100%' }}
                                     />
                                 </div>
                                 <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: '900' }}>→</span>
                                 <div style={{ position: 'relative' }}>
                                     <input
                                         id="driver-services-end-date"
                                         type="date"
                                         value={endDate}
                                         onChange={e => setEndDate(e.target.value)}
                                         onClick={(e) => e.target.showPicker()}
                                         style={{ colorScheme: 'dark', background: 'transparent', border: 'none', color: 'white', fontSize: '12px', fontWeight: '800', outline: 'none', cursor: 'pointer', width: '100%' }}
                                     />
                                 </div>
                            </div>
                            <button style={{ background: 'rgba(255,255,255,0.03)', border: 'none', color: 'white', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}><ChevronRight size={16} /></button>
                        </div>
                    )}
                    <button onClick={handleExport} style={{ height: '42px', padding: '0 20px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontWeight: '900', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <FileSpreadsheet size={16} /> <span className="hide-mobile">EXCEL</span>
                    </button>
                </div>
            </header>

            {/* Pending Approvals Section */}
            {pendingRecords.length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></div>
                        <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '800', margin: 0 }}>Service Approvals (Awaiting)</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                        {pendingRecords.map((entry) => (
                            <motion.div
                                key={entry._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card"
                                style={{ padding: '20px', borderLeft: '4px solid #10b981', background: 'rgba(16, 185, 129, 0.05)' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        {entry.slipPhoto ? (
                                            <img
                                                src={`/${entry.slipPhoto}`}
                                                onClick={() => setSelectedImage(entry.slipPhoto)}
                                                style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}
                                            />
                                        ) : (
                                            <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                <Droplets size={24} color="rgba(255,255,255,0.1)" />
                                            </div>
                                        )}
                                        <div>
                                            <p style={{ color: 'white', fontWeight: '900', fontSize: '18px', margin: 0 }}>₹{entry.amount}</p>
                                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '4px 0 0' }}>{entry.driver || 'Driver'} • {entry.carNumber}</p>
                                        </div>
                                    </div>
                                    <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '10px', padding: '4px 10px', borderRadius: '8px', fontWeight: '900', textTransform: 'uppercase' }}>{entry.fuelType || 'Wash'}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '15px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '10px' }}>
                                    <span>{entry.km} KM</span>
                                    <span>{formatDateTimeIST(entry.date)}</span>
                                </div>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => handleApprove(entry.attendanceId, entry._id)}
                                        style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', fontSize: '13px' }}
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleReject(entry.attendanceId, entry._id)}
                                        style={{ flex: 1, background: 'rgba(255,255,255,0.03)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '12px', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', fontSize: '13px' }}
                                    >
                                        Reject
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search and Action Bar */}
            <div className="driver-services-search-bar">
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '18px', top: '18px', color: 'rgba(255,255,255,0.2)' }} />
                    <input 
                        type="text" 
                        placeholder="Search records..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ width: '100%', height: '54px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', padding: '0 20px 0 54px', color: 'white', fontSize: '14px', outline: 'none' }}
                    />
                </div>
                <button 
                    onClick={() => { resetForm(); setShowModal(true); }}
                    style={{ height: '54px', padding: '0 25px', borderRadius: '18px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: '900', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(16, 185, 129, 0.3)' }}
                >
                    <Plus size={18} /> <span className="hide-mobile">ADD RECORD</span><span className="show-mobile">ADD</span>
                </button>
            </div>

                {/* Maintenance Stats */}
                <div className="stats-grid" style={{ marginBottom: '25px' }}>
                    <div className="glass-card stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                        <div className="stat-card-header">
                            <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                                <Droplets size={20} />
                            </div>
                            <p className="stat-card-label">Total Washes</p>
                        </div>
                        <h2 className="stat-card-value">{washCount}</h2>
                    </div>
                    <div className="glass-card stat-card" style={{ borderLeft: '4px solid #f43f5e' }}>
                        <div className="stat-card-header">
                            <div className="stat-card-icon" style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' }}>
                                <AlertCircle size={20} />
                            </div>
                            <p className="stat-card-label">Punctures</p>
                        </div>
                        <h2 className="stat-card-value">{punctureCount}</h2>
                    </div>
                    <div className="glass-card stat-card" style={{ borderLeft: '4px solid #facc15' }}>
                        <div className="stat-card-header">
                            <div className="stat-card-icon" style={{ background: 'rgba(250, 204, 21, 0.1)', color: '#facc15' }}>
                                <Clock size={20} />
                            </div>
                            <p className="stat-card-label">Total Spending</p>
                        </div>
                        <h2 className="stat-card-value">₹{totalCost.toLocaleString()}</h2>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {['All', 'Wash', 'Puncture', 'Tissue', 'Water'].map(t => (
                        <button
                            key={t}
                            onClick={() => setSelectedType(t)}
                            style={{ padding: '8px 20px', borderRadius: '10px', background: selectedType === t ? '#10b981' : 'rgba(255,255,255,0.03)', border: '1px solid', borderColor: selectedType === t ? '#10b981' : 'rgba(255,255,255,0.1)', color: selectedType === t ? 'white' : 'rgba(255,255,255,0.6)', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* Premium Table Design */}
                <div className="scroll-x" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)' }}>
                    {loading ? (
                        <div style={{ padding: '100px', textAlign: 'center' }}>
                            <div className="spinner" style={{ margin: '0 auto', width: '40px', height: '40px', border: '4px solid rgba(16, 185, 129, 0.1)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            <p style={{ color: 'rgba(255,255,255,0.2)', marginTop: '20px', fontWeight: '700', letterSpacing: '1px' }}>SYNCING RECORDS...</p>
                        </div>
                    ) : filteredRecords.length === 0 ? (
                        <div style={{ padding: '100px 40px', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <Search size={32} color="rgba(255,255,255,0.1)" />
                            </div>
                            <h3 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '800' }}>No matches found</h3>
                            <p style={{ color: 'rgba(255,255,255,0.3)', margin: '10px 0 0', fontSize: '14px' }}>Try adjusting your filters or search terms.</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', minWidth: '800px' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    <th style={{ padding: '25px 30px', color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px', textAlign: 'left' }}>Date & Vehicle</th>
                                    <th style={{ padding: '25px 30px', color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px', textAlign: 'left' }}>Category</th>
                                    <th style={{ padding: '25px 30px', color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px', textAlign: 'left' }}>Driver & Vendor</th>
                                    <th style={{ padding: '25px 30px', color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px', textAlign: 'left' }}>Expense</th>
                                    <th style={{ padding: '25px 30px', color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map((r, idx) => (
                                    <tr key={r._id} style={{ transition: 'all 0.2s' }} className="table-row-hover">
                                        <td style={{ padding: '25px 30px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: '800', marginBottom: '6px' }}>{formatDateIST(r.billDate)}</div>
                                            <div style={{ color: 'white', fontSize: '16px', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Car size={14} color="#10b981" /> {r.vehicle?.carNumber}
                                            </div>
                                        </td>
                                        <td style={{ padding: '25px 30px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                            <div style={{ display: 'inline-flex', padding: '6px 14px', borderRadius: '10px', background: r.category?.toLowerCase()?.includes('wash') ? 'rgba(16,185,129,0.1)' : r.category?.toLowerCase()?.includes('punc') ? 'rgba(244,63,94,0.1)' : 'rgba(99,102,241,0.1)', color: r.category?.toLowerCase()?.includes('wash') ? '#10b981' : r.category?.toLowerCase()?.includes('punc') ? '#f43f5e' : 'var(--primary)', fontSize: '11px', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                {r.category || 'Maintenance'}
                                            </div>
                                            {r.description && <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: '600', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.description}</p>}
                                        </td>
                                        <td style={{ padding: '25px 30px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                            <div style={{ color: 'white', fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <User size={14} color="rgba(255,255,255,0.2)" /> {r.driver?.name || 'Manual Admin Entry'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '25px 30px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                            <div style={{ color: '#10b981', fontSize: '18px', fontWeight: '950' }}>₹{r.amount}</div>
                                            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', fontWeight: '800', marginTop: '4px', textTransform: 'uppercase' }}>{r.paymentMode}</div>
                                        </td>
                                        <td style={{ padding: '25px 30px', borderBottom: '1px solid rgba(255,255,255,0.03)', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                {r.billPhoto && (
                                                    <button 
                                                        onClick={() => setSelectedImage(r.billPhoto)}
                                                        style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}
                                                    >
                                                        VIEW SLIP
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => { setEditingId(r._id); setFormData({ ...r, vehicleId: r.vehicle?._id, driverId: r.driver?._id }); setShowModal(true); }}
                                                    style={{ background: 'rgba(255,255,255,0.03)', border: 'none', color: 'rgba(255,255,255,0.3)', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                    onMouseEnter={e => e.currentTarget.style.color = 'white'}
                                                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                                                >
                                                    <Wrench size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(r._id)}
                                                    style={{ background: 'rgba(244, 63, 94, 0.05)', border: 'none', color: 'rgba(244, 63, 94, 0.4)', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                    onMouseEnter={e => e.currentTarget.style.color = '#f43f5e'}
                                                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(244, 63, 94, 0.4)'}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

            {/* Modal for Add/Edit */}
            <AnimatePresence>
                {showModal && (
                    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px', overflowY: 'auto' }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: 'clamp(20px, 5vw, 30px)', margin: 'auto' }}>
                            <h2 style={{ color: 'white', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Wrench size={24} color="#10b981" /> {editingId ? 'Edit Service' : 'Add Driver Service'}
                            </h2>
                            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div className="form-grid-2">
                                    <div>
                                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '800', marginBottom: '6px' }}>SELECT VEHICLE</label>
                                        <select value={formData.vehicleId} onChange={e => setFormData({...formData, vehicleId: e.target.value})} className="input-field" required>
                                            <option value="">Choose Car</option>
                                            {vehicles.map(v => <option key={v._id} value={v._id}>{v.carNumber}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '800', marginBottom: '6px' }}>SELECT DRIVER</label>
                                        <select value={formData.driverId} onChange={e => setFormData({...formData, driverId: e.target.value})} className="input-field">
                                            <option value="">Select Driver</option>
                                            {drivers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-grid-2">
                                    <div>
                                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '800', marginBottom: '6px' }}>SERVICE CATEGORY</label>
                                        <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="input-field">
                                            {serviceCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '800', marginBottom: '6px' }}>SERVICE DATE</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                id="driver-services-bill-date"
                                                type="date"
                                                required
                                                value={formData.billDate}
                                                onChange={e => setFormData({...formData, billDate: e.target.value})}
                                                onClick={(e) => e.target.showPicker()}
                                                className="input-field"
                                                style={{ colorScheme: 'dark', width: '100%', cursor: 'pointer' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-grid-2">
                                    <div>
                                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '800', marginBottom: '6px' }}>AMOUNT (₹)</label>
                                        <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="input-field" placeholder="0.00" required />
                                    </div>
                                    <div>
                                         <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '800', marginBottom: '6px' }}>VENDOR/GARAGE</label>
                                        <div style={{ position: 'relative' }}>
                                            <input 
                                                type="text" 
                                                value={formData.garageName} 
                                                onChange={e => setFormData({...formData, garageName: e.target.value})} 
                                                className="input-field" 
                                                placeholder="e.g. Kalyan Tyre Works"
                                                list="recent-vendors"
                                            />
                                            <datalist id="recent-vendors">
                                                {recentVendors.map(v => <option key={v} value={v} />)}
                                            </datalist>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '800', marginBottom: '6px' }}>DESCRIPTION / NOTES</label>
                                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input-field" rows="2" style={{ resize: 'none' }} placeholder="Notes about the service..."></textarea>
                                </div>

                                <div>
                                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '800', marginBottom: '10px' }}>UPLOAD RECEIPT / BILL PHOTO (OPTIONAL)</label>
                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                        <label style={{ flex: 1, height: '80px', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }} className="hover-light">
                                            <Upload size={20} color="rgba(255,255,255,0.3)" />
                                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '700', marginTop: '6px' }}>CLICK TO UPLOAD</span>
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        setBillPhoto(file);
                                                        setBillPhotoPreview(URL.createObjectURL(file));
                                                    }
                                                }} 
                                                style={{ display: 'none' }} 
                                            />
                                        </label>
                                        {(billPhotoPreview || formData.billPhoto) && (
                                            <div style={{ width: '80px', height: '80px', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                                                <img src={billPhotoPreview || `/${formData.billPhoto}`} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <button type="button" onClick={() => { setBillPhoto(null); setBillPhotoPreview(null); }} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}><X size={12} /></button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer' }}>CANCEL</button>
                                    <button type="submit" disabled={submitting} style={{ flex: 2, padding: '14px', borderRadius: '12px', background: '#10b981', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer' }}>
                                        {submitting ? 'SAVING...' : editingId ? 'UPDATE SERVICE' : 'SAVE SERVICE'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Premium In-App Receipt Viewer */}
            <AnimatePresence>
                {selectedImage && (
                    <div className="modal-overlay" onClick={() => setSelectedImage(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(15px)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.8)' }}
                        >
                            <img 
                                src={selectedImage.startsWith('http') ? selectedImage : `/${selectedImage}`} 
                                alt="Service Receipt" 
                                style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '24px', border: '4px solid rgba(255,255,255,0.1)' }} 
                            />
                            <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '10px' }}>
                                <button 
                                    onClick={() => setSelectedImage(null)} 
                                    style={{ background: '#f43f5e', border: 'none', color: 'white', width: '44px', height: '44px', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }}
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div style={{ position: 'absolute', bottom: '-40px', left: '0', right: '0', textAlign: 'center' }}>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '800', letterSpacing: '1px' }}>CLICK OUTSIDE TO CLOSE</p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {showParkingModal && (
                <ParkingModal 
                    isOpen={showParkingModal} 
                    onClose={() => { setShowParkingModal(false); fetchRecords(); }} 
               />
            )}
        </div>
    );
};

export default DriverServices;
