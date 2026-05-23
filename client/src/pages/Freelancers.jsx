
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../api/axios';
import { Plus, Search, Trash2, User as UserIcon, Users, X, CheckCircle, AlertCircle, LogIn, LogOut, Car, Filter, Download, Phone, Edit2, IndianRupee, Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Camera, Image as ImageIcon, Eye, TrendingUp, History, Fuel, MapPin, FileText, RefreshCw, ZapOff, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import AttendanceModal from '../components/reports/AttendanceModal';
import PremiumDateInput from '../components/common/PremiumDateInput';
import { todayIST, toISTDateString, formatDateIST, nowISTDateTimeString, toISTDateTimeString, firstDayOfMonthIST, nowIST } from '../utils/istUtils';

// Sub-components for cleaner code
const Modal = ({ title, onClose, children }) => (
    <div className="modal-overlay">
        <div
            className="modal-content-wrapper"
            style={{ maxWidth: '650px', padding: 'clamp(20px, 5vw, 35px)' }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ color: 'white', fontSize: 'clamp(20px, 4vw, 24px)', margin: 0, fontWeight: '900', letterSpacing: '-0.5px' }}>{title}</h2>
                <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', height: '40px', width: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                    <X size={22} />
                </button>
            </div>
            {children}
        </div>
    </div>
);

const Field = ({ label, value, onChange, type = "text", required = false, autoComplete = "off", placeholder = "", inputMode = "text" }) => {
    if (type === 'date') {
        return (
            <div style={{ marginBottom: '20px' }}>
                <PremiumDateInput
                    label={label}
                    value={value}
                    onChange={onChange}
                    required={required}
                />
            </div>
        );
    }
    return (
        <div style={{ marginBottom: '20px' }}>
            <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '10px', display: 'block' }}>{label}</label>
            <input
                type={type}
                className="input-field"
                required={required}
                value={(value === 0 || value) ? value : ''}
                onChange={e => onChange(e.target.value)}
                autoComplete={autoComplete}
                placeholder={placeholder}
                inputMode={inputMode}
                style={{
                    height: '52px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '14px',
                    fontSize: '15px'
                }}
            />
        </div>
    );
};

const SubmitButton = ({ disabled, text, message }) => (
    <div style={{ marginTop: '25px' }}>
        {message?.text && (
            <div
                style={{ padding: '15px', borderRadius: '16px', fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)', color: message.type === 'success' ? '#10b981' : '#f43f5e', border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)'}` }}
            >
                {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                <span style={{ fontWeight: '600' }}>{message.text}</span>
            </div>
        )}
        <button
            type="submit"
            disabled={disabled}
            className="btn-primary"
            style={{
                width: '100%',
                height: '58px',
                borderRadius: '16px',
                fontSize: '16px',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
            }}
        >
            {disabled ? <div className="spinner" style={{ width: '20px', height: '20px', borderTopColor: 'white' }}></div> : text}
        </button>
    </div>
);

const PhotoUpload = ({ label, icon: Icon, onFileSelect, previewFile }) => {
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        if (previewFile) {
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(previewFile);
        } else {
            setPreview(null);
        }
    }, [previewFile]);

    return (
        <div style={{ position: 'relative' }}>
            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>{label}</label>
            <label style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(255,255,255,0.1)',
                borderRadius: '16px',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'all 0.3s'
            }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
            >
                {preview ? (
                    <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <>
                        <Icon size={24} style={{ color: 'rgba(255,255,255,0.2)', marginBottom: '8px' }} />
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>CLICK TO UPLOAD</span>
                    </>
                )}
                <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                        const file = e.target.files[0];
                        if (file) onFileSelect(file);
                    }}
                />
            </label>
        </div>
    );
};


const Freelancers = () => {
    const { theme } = useTheme();
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .freelancers-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 40px;
                padding-top: 40px;
                gap: 20px;
            }
            .freelancers-tabs {
                display: flex;
                gap: 15px;
                margin-bottom: 30px;
                overflow-x: auto;
                padding-bottom: 5px;
                -webkit-overflow-scrolling: touch;
            }
            .freelancer-tab-btn {
                padding: 12px 24px;
                border-radius: 14px;
                font-weight: 800;
                font-size: 13px;
                cursor: pointer;
                white-space: nowrap;
                transition: all 0.3s;
                border: 1px solid rgba(255,255,255,0.05);
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            .search-bar-row {
                display: flex;
                gap: 20px;
                margin-bottom: 30px;
                align-items: center;
            }
            .hide-mobile { display: block; }
            .show-mobile { display: none; }

            @media (max-width: 1024px) {
                .freelancers-header {
                    flex-direction: column;
                    align-items: flex-start;
                }
                .search-bar-row {
                    flex-direction: column;
                    align-items: stretch;
                }
            }

            @media (max-width: 768px) {
                .stats-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
                .hide-mobile { display: none !important; }
                .show-mobile { display: block !important; }
            }

            @media (max-width: 480px) {
                .stats-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);
    const { selectedCompany } = useCompany();
    const [drivers, setDrivers] = useState([]);
    const [allDrivers, setAllDrivers] = useState([]); // Includes both regular and freelancers
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [vehicleSearch, setVehicleSearch] = useState('');
    const [searchTerm, setSearchTerm] = useState(''); // Added search for drivers


    // Modals State
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPunchInModal, setShowPunchInModal] = useState(false);
    const [showPunchOutModal, setShowPunchOutModal] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [editingDriver, setEditingDriver] = useState(null);
    const [driverFilter, setDriverFilter] = useState('All');
    const [attendance, setAttendance] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [advances, setAdvances] = useState([]);
    const [vehicleFilter, setVehicleFilter] = useState('All');
    const [showAdvanceModal, setShowAdvanceModal] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [showQuickExpenseModal, setShowQuickExpenseModal] = useState(false);
    const [quickExpenseType, setQuickExpenseType] = useState('fuel'); // 'fuel' or 'parking'
    const [settlementDriverFilter, setSettlementDriverFilter] = useState('All');
    const [quickExpenseData, setQuickExpenseData] = useState({
        amount: '',
        date: '',
        vehicleId: '',
        location: '',
        remark: '',
        slipPhoto: '',
        fuelType: 'Diesel',
        quantity: '',
        rate: '',
        odometer: '',
        stationName: '',
        paymentMode: 'Cash',
        paymentSource: 'Office'
    });
    const [documentForm, setDocumentForm] = useState({ documentType: 'Driving License', expiryDate: '' });
    const [documentFile, setDocumentFile] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTabState] = useState(() => {
        const urlTab = searchParams.get('tab');
        if (urlTab) return urlTab;
        return localStorage.getItem('freelancerActiveTab') || 'personnel';
    });

    const setActiveTab = (tab) => {
        setActiveTabState(tab);
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.set('tab', tab);
            return newParams;
        });
        localStorage.setItem('freelancerActiveTab', tab);
    };
    const [expandedLedger, setExpandedLedger] = useState(null);

    // Form States
    const [formData, setFormData] = useState({ name: '', mobile: '', licenseNumber: '', dailyWage: '' });
    const [editForm, setEditForm] = useState({ name: '', mobile: '', licenseNumber: '', dailyWage: '', nightStayBonus: '500', sameDayReturnBonus: '100', sameDayReturnEnabled: false });
    const [punchInData, setPunchInData] = useState({
        vehicleId: '',
        km: '',
        dailyWage: '',
        date: '',
        time: nowISTDateTimeString(),
        pickUpLocation: ''
    });
    const [punchOutData, setPunchOutData] = useState({ km: '', time: nowISTDateTimeString(), fuelAmount: '0', parkingAmount: '0', allowanceTA: '0', nightStayAmount: '0', parkingPaidBy: 'Self', review: '', dailyWage: '', dropLocation: '', parkingSlipPhoto: null, parkings: [{ id: Date.now(), amount: '', photo: null }] });
    const [advanceData, setAdvanceData] = useState({ amount: '', remark: '', date: '', advanceType: 'Office', givenBy: 'Office' });
    const [manualData, setManualData] = useState({
        driverId: '',
        vehicleId: '',
        date: '',
        punchInKM: '',
        punchOutKM: '',
        punchInTime: todayIST() + 'T08:00',
        punchOutTime: todayIST() + 'T20:00',
        pickUpLocation: '',
        dropLocation: '',
        fuelAmount: '0',
        parkingAmount: '0',
        allowanceTA: '0',
        nightStayAmount: '0',
        otherBonus: '0',
        dailyWage: '',
        review: '',
        eventId: ''
    });

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedDay, setSelectedDay] = useState(new Date().getDate().toString());
    const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'range'
    const [monthlySummaries, setMonthlySummaries] = useState([]);
    const [summaryLoading, setSummaryLoading] = useState(false);

    const [events, setEvents] = useState([]);
    const [punchInPhotos, setPunchInPhotos] = useState({ kmPhoto: null });
    const [punchOutPhotos, setPunchOutPhotos] = useState({ kmPhoto: null });

    const [showEditDutyModal, setShowEditDutyModal] = useState(false);
    const [editingDuty, setEditingDuty] = useState(null);
    const [editDutyForm, setEditDutyForm] = useState({
        date: '',
        driverId: '',
        vehicleId: '',
        vehicleNumber: '',
        startKm: '',
        endKm: '',
        punchInTime: '',
        punchOutTime: '',
        pickUpLocation: '',
        dropLocation: '',
        fuelAmount: '0',
        parkingAmount: '0',
        parkingPaidBy: 'Self',
        allowanceTA: 0,
        nightStayAmount: 0,
        bonusAmount: '0',
        dailyWage: '',
        remarks: '',
        dutyType: ''
    });

    // Date utility helpers removed in favor of istUtils.js


    // ── AI AGENT SEARCH INTEGRATION ──
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const searchParam = params.get('search') || params.get('name') || params.get('freelancer');
        const tabParam = params.get('tab');
        const monthParam = params.get('month');
        const yearParam = params.get('year');
        const dayParam = params.get('day');

        if (searchParam) setSearchTerm(searchParam);
        if (tabParam) setActiveTab(tabParam);
        if (monthParam) setSelectedMonth(parseInt(monthParam) - 1); // 0-indexed
        if (yearParam) setSelectedYear(parseInt(yearParam));
        if (dayParam) setSelectedDay(dayParam);
    }, [location.search]);

    useEffect(() => {
        setSearchTerm('');
        setShowAddModal(false);
        setShowEditModal(false);
        setShowPunchInModal(false);
        setShowPunchOutModal(false);
        setShowAdvanceModal(false);
        setShowManualModal(false);
        setShowDocumentModal(false);
        setShowQuickExpenseModal(false);
        setFormData({ name: '', mobile: '', licenseNumber: '', dailyWage: '' });
        setPunchInData({
            vehicleId: '',
            km: '',
            dailyWage: '',
            date: '',
            time: nowISTDateTimeString(),
            pickUpLocation: ''
        });
        setPunchOutData({ km: '', time: nowISTDateTimeString(), fuelAmount: '0', parkingAmount: '0', allowanceTA: '0', nightStayAmount: '0', parkingPaidBy: 'Self', review: '', dailyWage: '', dropLocation: '', parkingSlipPhoto: null, parkings: [{ id: Date.now(), amount: '', photo: null }] });
        setManualData({
            driverId: '',
            vehicleId: '',
            date: '',
            punchInKM: '',
            punchOutKM: '',
            punchInTime: todayIST() + 'T08:00',
            punchOutTime: todayIST() + 'T20:00',
            pickUpLocation: '',
            dropLocation: '',
            fuelAmount: '0',
            parkingAmount: '0',
            allowanceTA: '0',
            nightStayAmount: '0',
            otherBonus: '0',
            dailyWage: '',
            review: '',
            eventId: ''
        });
        setAdvanceData({ amount: '', remark: '', date: '', advanceType: 'Office', givenBy: 'Office' });
        setQuickExpenseData({
            amount: '',
            date: '',
            vehicleId: '',
            location: '',
            remark: '',
            slipPhoto: '',
            fuelType: 'Diesel',
            quantity: '',
            rate: '',
            odometer: '',
            stationName: '',
            paymentMode: 'Cash',
            paymentSource: 'Office'
        });
        const now = new Date();
        setSelectedMonth(now.getMonth());
        setSelectedYear(now.getFullYear());
        setSelectedDay(now.getDate().toString());
    }, [location.pathname, location.key]);

    // Unified date defaults handled in initial state.
    useEffect(() => {
    }, []);

    useEffect(() => {
        if (quickExpenseData.amount && quickExpenseData.quantity) {
            const calculatedRate = (Number(quickExpenseData.amount) / Number(quickExpenseData.quantity)).toFixed(2);
            if (quickExpenseData.rate !== calculatedRate) {
                setQuickExpenseData(prev => ({ ...prev, rate: calculatedRate }));
            }
        }
    }, [quickExpenseData.amount, quickExpenseData.quantity]);

    const getOneEightyDaysAgo = () => {
        const d = nowIST();
        d.setUTCDate(d.getUTCDate() - 180);
        return toISTDateString(d);
    };

    const getToday = () => todayIST();

    const [isRange, setIsRange] = useState(false);
    const [fromDate, setFromDate] = useState(todayIST());
    const [toDate, setToDate] = useState(todayIST());

    useEffect(() => {
        if (selectedDay === 'All') {
            const start = toISTDateString(new Date(selectedYear, selectedMonth, 1));
            const end = toISTDateString(new Date(selectedYear, selectedMonth + 1, 0));
            setFromDate(start);
            setToDate(end);
        } else {
            const d = toISTDateString(new Date(selectedYear, selectedMonth, parseInt(selectedDay)));
            setFromDate(d);
            setToDate(d);
        }
    }, [selectedMonth, selectedYear, selectedDay]);



    /* navigate dates */
    const shiftDays = (n) => {
        let baseDate;
        if (selectedDay === 'All') {
            const today = new Date();
            // If the selected month/year is the current one, start navigation from TODAY
            if (selectedMonth === today.getMonth() && selectedYear === today.getFullYear()) {
                baseDate = today;
            } else {
                // Otherwise start from the 1st of that month
                baseDate = new Date(selectedYear, selectedMonth, 1);
            }
        } else {
            baseDate = new Date(selectedYear, selectedMonth, parseInt(selectedDay));
        }
        baseDate.setDate(baseDate.getDate() + n);
        setSelectedYear(baseDate.getFullYear());
        setSelectedMonth(baseDate.getMonth());
        setSelectedDay(baseDate.getDate().toString());
    };

    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [loans, setLoans] = useState([]);
    const [loansLoading, setLoansLoading] = useState(false);
    const [showLoanModal, setShowLoanModal] = useState(false);
    const [loanFormData, setLoanFormData] = useState({
        driverId: '',
        totalAmount: '',
        monthlyEMI: '',
        remarks: '',
        startDate: ''
    });
    const [submittingLoan, setSubmittingLoan] = useState(false);

    // Filter Hub State
    const fetchAttendance = useCallback(async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/reports/${selectedCompany._id}?from=${fromDate}&to=${toDate}&bypassCache=true&_t=${Date.now()}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            // Filter attendance for freelancers
            const freelancerAttendance = (data.attendance || []).filter(a =>
                a.isFreelancer || a.driver?.isFreelancer || a.driver?.name?.includes('(F)')
            );
            setAttendance(freelancerAttendance);
        } catch (err) { console.error('fetchAttendance error:', err?.response?.status, err?.response?.config?.url || err.message); }
    }, [selectedCompany, fromDate, toDate]);

    const fetchAdvances = useCallback(async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            // Added from/to to ensure consistency even if called directly
            const { data } = await axios.get(`/api/admin/advances/${selectedCompany._id}?isFreelancer=true&from=${fromDate}&to=${toDate}&bypassCache=true&_t=${Date.now()}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setAdvances(data || []);
        } catch (err) { console.error('fetchAdvances error:', err?.response?.status, err?.response?.config?.url || err.message); }
    }, [selectedCompany, fromDate, toDate]);

    const fetchMonthlySummaries = useCallback(async () => {
        if (!selectedCompany?._id || activeTab !== 'accounts') return;
        setSummaryLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/salary-summary/${selectedCompany._id}?month=${selectedMonth + 1}&year=${selectedYear}&isFreelancer=true`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setMonthlySummaries(data || []);
        } catch (err) {
            console.error('fetchMonthlySummaries error:', err);
        } finally {
            setSummaryLoading(false);
        }
    }, [selectedCompany, selectedMonth, selectedYear, activeTab]);

    useEffect(() => {
        if (activeTab === 'accounts' && viewMode === 'monthly') {
            fetchMonthlySummaries();
        }
    }, [fetchMonthlySummaries, activeTab, viewMode]);

    const handleDeleteDuty = async (duty) => {
        if (!window.confirm('Are you sure you want to delete this duty record?')) return;

        try {
            setSubmitting(true);
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const id = duty._id;

            // Check if it's a regular attendance or an outside car voucher
            const isVoucher = duty.entryType === 'voucher' || duty.isOutsideCar;
            const endpoint = isVoucher ? `/api/admin/vehicles/${id}` : `/api/admin/attendance/${id}`;

            console.log(`[DEBUG] Deleting duty: ${id}, isVoucher: ${isVoucher}, endpoint: ${endpoint}`);

            await axios.delete(endpoint, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });

            // forced delay for DB propagation
            await new Promise(r => setTimeout(r, 300));

            // Refresh all relevant data
            await Promise.all([
                fetchAttendance(),
                fetchFreelancers(),
                fetchVehicles(),
                fetchAdvances()
            ]);

            setMessage({ type: 'success', text: 'Duty record deleted successfully' });
            setTimeout(() => setMessage({ type: '', text: '' }), 1500);
        } catch (error) {
            console.error('[DELETE_ERROR]', error);
            alert(error.response?.data?.message || 'Error deleting duty record');
        } finally {
            setSubmitting(false);
        }
    };

    const fetchFreelancers = useCallback(async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            // Fetch Freelancers
            const resF = await axios.get(`/api/admin/drivers/${selectedCompany._id}?isFreelancer=true&usePagination=false`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setDrivers(resF.data.drivers || []);

            // Fetch All Drivers (for manual entry)
            const resA = await axios.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setAllDrivers(resA.data.drivers || []);
        } catch (err) { console.error('fetchFreelancers error:', err?.response?.status, err?.response?.config?.url || err.message); }
        finally { setLoading(false); }
    }, [selectedCompany]);

    const fetchLoans = useCallback(async () => {
        if (!selectedCompany?._id) return;
        setLoansLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/loans/${selectedCompany._id}?isFreelancer=true`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setLoans(data || []);
        } catch (err) {
            console.error('Err fetchLoans:', err);
        } finally {
            setLoansLoading(false);
        }
    }, [selectedCompany]);

    const fetchVehicles = useCallback(async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setVehicles(data.vehicles || []);
        } catch (err) { console.error('fetchVehicles error:', err?.response?.status, err?.response?.config?.url || err.message); }
    }, [selectedCompany]);

    const fetchEvents = useCallback(async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/events/${selectedCompany._id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setEvents(data || []);
        } catch (err) { console.error('Fetch events error:', err); }
    }, [selectedCompany]);

    // Master Data Effect (Company change only)
    useEffect(() => {
        if (selectedCompany) {
            fetchFreelancers();
            fetchVehicles();
            fetchEvents();
        }
    }, [selectedCompany, fetchFreelancers, fetchVehicles, fetchEvents]);

    // Filtered Data Effect (Company or Date changes)
    useEffect(() => {
        if (selectedCompany) {
            fetchAttendance();
            fetchAdvances();
        }
    }, [selectedCompany, fromDate, toDate, fetchAttendance, fetchAdvances, activeTab]);


    const handleQuickExpenseSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            let uploadedImageUrl = '';

            if (quickExpenseData.slipPhoto && typeof quickExpenseData.slipPhoto !== 'string') {
                const uploadData = new FormData();
                uploadData.append('file', quickExpenseData.slipPhoto);
                const uploadRes = await axios.post('/api/admin/upload', uploadData, {
                    headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${userInfo.token}` }
                });
                uploadedImageUrl = uploadRes.data.url;
            } else if (typeof quickExpenseData.slipPhoto === 'string') {
                uploadedImageUrl = quickExpenseData.slipPhoto;
            }

            const payload = {
                driverId: selectedDriver._id,
                driver: selectedDriver.name,
                amount: quickExpenseData.amount,
                date: quickExpenseData.date,
                companyId: selectedCompany._id,
                vehicleId: quickExpenseData.vehicleId,
                remark: quickExpenseData.remark || '',
                type: quickExpenseType,
                slipPhoto: uploadedImageUrl
            };

            if (quickExpenseType === 'fuel') {
                payload.fuelType = quickExpenseData.fuelType;
                payload.quantity = quickExpenseData.quantity;
                payload.rate = quickExpenseData.rate;
                payload.odometer = quickExpenseData.odometer;
                payload.stationName = quickExpenseData.stationName;
                payload.paymentMode = quickExpenseData.paymentMode;
                payload.paymentSource = quickExpenseData.paymentSource;
            }

            if (quickExpenseData.location) payload.location = quickExpenseData.location;

            const endpoint = '/api/admin/expenses/pending';
            await axios.post(endpoint, payload, {
                headers: {
                    Authorization: `Bearer ${userInfo.token}`
                }
            });

            setMessage({ type: 'success', text: `${quickExpenseType.toUpperCase()} sent for approval!` });
            setTimeout(() => {
                setShowQuickExpenseModal(false);
                setQuickExpenseData({
                    amount: '',
                    date: '',
                    vehicleId: '',
                    location: '',
                    remark: '',
                    slipPhoto: '',
                    fuelType: 'Diesel',
                    quantity: '',
                    rate: '',
                    odometer: '',
                    stationName: '',
                    paymentMode: 'Cash',
                    paymentSource: 'Office'
                });
                setMessage({ type: '', text: '' });
                fetchAttendance(); // Refresh to show if needed
            }, 1000);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save' });
        } finally { setSubmitting(false); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.post('/api/admin/drivers', { ...formData, companyId: selectedCompany._id, isFreelancer: true }, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setMessage({ type: 'success', text: 'Freelancer added successfully!' });
            setTimeout(() => {
                setShowAddModal(false);
                setFormData({ name: '', mobile: '', licenseNumber: '', dailyWage: '' });
                setMessage({ type: '', text: '' });
                fetchFreelancers();
            }, 1000);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed' });
        } finally { setSubmitting(false); }
    };

    const handleRecordLoan = async (e) => {
        e.preventDefault();
        setSubmittingLoan(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.post('/api/admin/loans', {
                ...loanFormData,
                companyId: selectedCompany._id
            }, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setShowLoanModal(false);
            setLoanFormData({
                driverId: '',
                totalAmount: '',
                monthlyEMI: '',
                remarks: '',
                startDate: ''
            });
            fetchLoans();
            if (typeof fetchSalarySummary === 'function') fetchSalarySummary();
            alert('Loan recorded successfully');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to record loan');
        } finally {
            setSubmittingLoan(false);
        }
    };

    const handleDeleteLoan = async (id) => {
        if (!window.confirm('Are you sure you want to delete this loan record?')) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.delete(`/api/admin/loans/${id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            fetchLoans();
            alert('Loan removed');
        } catch (err) {
            alert('Failed to remove loan');
        }
    };

    const handleLoanRepayment = async (loanId, amount) => {
        if (!window.confirm(`Mark ₹${amount} EMI as paid for ${new Date(0, selectedMonth).toLocaleString('default', { month: 'long' })}?`)) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.post('/api/admin/loans/repayment', {
                loanId,
                amount,
                month: selectedMonth + 1,
                year: selectedYear
            }, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            fetchLoans();
            if (typeof fetchSalarySummary === 'function') fetchSalarySummary();
            alert('Repayment recorded');
        } catch (err) {
            alert('Failed to record repayment');
        }
    };

    const handlePunchIn = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const fd = new FormData();
            Object.keys(punchInData).forEach(key => {
                let val = punchInData[key];
                if (key === 'time' && val && !val.includes('+')) {
                    val = `${val}:00+05:30`;
                }
                fd.append(key, val);
            });
            fd.append('driverId', selectedDriver._id);
            if (selectedCompany?._id) fd.append('companyId', selectedCompany._id);
            if (punchInPhotos.kmPhoto) fd.append('kmPhoto', punchInPhotos.kmPhoto);

            await axios.post('/api/admin/freelancers/punch-in', fd, {
                headers: {
                    Authorization: `Bearer ${userInfo.token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setShowPunchInModal(false);
            setVehicleSearch('');
            setPunchInPhotos({ kmPhoto: null });
            setPunchInData({
                vehicleId: '',
                km: '',
                dailyWage: '',
                date: '',
                time: nowISTDateTimeString(),
                pickUpLocation: ''
            });
            await Promise.all([
                fetchFreelancers(),
                fetchVehicles(),
                fetchAttendance()
            ]);
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
        finally { setSubmitting(false); }
    };

    const handlePunchOut = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const fd = new FormData();

            // Calculate total parking amount
            const totalParking = punchOutData.parkings.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

            Object.keys(punchOutData).forEach(key => {
                let val = punchOutData[key];
                if (key === 'time' && val && !val.includes('+')) {
                    val = `${val}:00+05:30`;
                }
                // Skip special handling fields
                if (key !== 'parkingSlipPhoto' && key !== 'parkings' && key !== 'parkingAmount') {
                    fd.append(key, val);
                }
            });

            // Append total for legacy compatibility
            fd.append('parkingAmount', totalParking.toString());
            fd.append('driverId', selectedDriver._id);

            if (punchOutPhotos.kmPhoto) fd.append('kmPhoto', punchOutPhotos.kmPhoto);

            // Append multiple parkings
            const parkingMetaData = [];
            punchOutData.parkings.forEach((p, index) => {
                if (Number(p.amount) > 0 || p.photo) {
                    parkingMetaData.push({ amount: p.amount, index });
                    if (p.photo) fd.append('parkingPhotos', p.photo);
                }
            });
            fd.append('parkingsJson', JSON.stringify(parkingMetaData));

            await axios.post('/api/admin/freelancers/punch-out', fd, {
                headers: {
                    Authorization: `Bearer ${userInfo.token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setShowPunchOutModal(false);
            setPunchOutPhotos({ kmPhoto: null });
            setPunchOutData({
                km: '',
                time: nowISTDateTimeString(),
                fuelAmount: '0',
                parkingAmount: '0',
                allowanceTA: '0',
                nightStayAmount: '0',
                parkingPaidBy: 'Self',
                review: '',
                dailyWage: '',
                dropLocation: '',
                parkingSlipPhoto: null,
                parkings: [{ id: Date.now(), amount: '', photo: null }]
            });
            await Promise.all([
                fetchFreelancers(),
                fetchVehicles(),
                fetchAttendance()
            ]);
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
        finally { setSubmitting(false); }
    };

    const handleUploadDocument = async (e) => {
        e.preventDefault();
        if (!documentFile) return alert('Please select a file');
        setSubmitting(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const formData = new FormData();
            formData.append('document', documentFile);
            formData.append('documentType', documentForm.documentType);
            if (documentForm.expiryDate) formData.append('expiryDate', documentForm.expiryDate);

            await axios.post(`/api/admin/drivers/${selectedDriver._id}/documents`, formData, {
                headers: {
                    Authorization: `Bearer ${userInfo.token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setMessage({ type: 'success', text: 'Document uploaded!' });
            fetchFreelancers();
            setDocumentForm({ documentType: 'Driving License', expiryDate: '' });
            setDocumentFile(null);
            setTimeout(() => setMessage({ type: '', text: '' }), 2000);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Upload failed' });
        } finally { setSubmitting(false); }
    };

    const handleDeleteAdvance = async (id) => {
        if (!window.confirm('Are you sure you want to delete this transaction record?')) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.delete(`/api/admin/advances/${id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            fetchAdvances();
            setMessage({ type: 'success', text: 'Transaction deleted successfully' });
            setTimeout(() => setMessage({ type: '', text: '' }), 2000);
        } catch (err) {
            alert(err.response?.data?.message || 'Error deleting transaction');
        }
    };

    const handleAddAdvance = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.post('/api/admin/advances', {
                ...advanceData,
                driverId: selectedDriver._id,
                companyId: selectedCompany._id
            }, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setShowAdvanceModal(false);
            setAdvanceData({ amount: '', remark: '', date: '', advanceType: 'Office', givenBy: 'Office' });
            fetchAdvances();
            setMessage({ type: 'success', text: 'Advance payment recorded!' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to add advance');
        } finally { setSubmitting(false); }
    };

    const handleManualEntry = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.post('/api/admin/manual-duty', {
                ...manualData,
                punchInTime: manualData.punchInTime ? `${manualData.punchInTime}:00+05:30` : undefined,
                punchOutTime: manualData.punchOutTime ? `${manualData.punchOutTime}:00+05:30` : undefined,
                companyId: selectedCompany._id
            }, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setShowManualModal(false);
            setManualData({
                driverId: '', vehicleId: '', date: todayIST(),
                punchInKM: '', punchOutKM: '', punchInTime: todayIST() + 'T08:00', punchOutTime: todayIST() + 'T20:00',
                pickUpLocation: '', dropLocation: '', fuelAmount: '0', parkingAmount: '0',
                dailyWage: '', review: '', eventId: ''
            });
            fetchAttendance();
            fetchFreelancers();
            setMessage({ type: 'success', text: 'Duty recorded successfully!' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to record manual duty');
        } finally { setSubmitting(false); }
    };

    const handleUpdateDuty = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const isVoucher = editingDuty.entryType === 'voucher';

            // Prepare payload
            const payload = {
                ...editDutyForm,
                punchInTime: editDutyForm.punchInTime ? `${editDutyForm.punchInTime}:00+05:30` : undefined,
                punchOutTime: editDutyForm.punchOutTime ? `${editDutyForm.punchOutTime}:00+05:30` : undefined,
                startKm: Number(editDutyForm.startKm) || 0,
                endKm: Number(editDutyForm.endKm) || 0,
                parkingAmount: Number(editDutyForm.parkingAmount) || 0,
                allowanceTA: Number(editDutyForm.allowanceTA) || 0,
                nightStayAmount: Number(editDutyForm.nightStayAmount) || 0,
                dailyWage: Number(editDutyForm.dailyWage) || 0,
                fuelAmount: Number(editDutyForm.fuelAmount) || 0
            };

            if (isVoucher) {
                await axios.put(`/api/admin/vehicles/${editingDuty._id}`, {
                    carNumber: payload.vehicleNumber || editingDuty.vehicleNumber || editingDuty.carNumber,
                    dutyAmount: payload.dailyWage,
                    dutyType: payload.pickUpLocation,
                    dropLocation: payload.dropLocation,
                    driverName: drivers.find(d => d._id === payload.driverId)?.name || editingDuty.driverName || editingDuty.driver?.name,
                    tollParkingAmount: payload.parkingAmount
                }, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });
            } else {
                await axios.put(`/api/admin/attendance/${editingDuty._id}`, payload, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });
            }

            setShowEditDutyModal(false);
            setMessage({ type: 'success', text: 'Duty record updated successfully' });
            fetchAttendance();
            setTimeout(() => setMessage({ type: '', text: '' }), 2000);
        } catch (err) {
            console.error('[UPDATE_ERROR]', err);
            alert(err.response?.data?.message || 'Update failed');
        } finally { setSubmitting(false); }
    };

    const openEditDutyModal = (duty) => {
        setEditingDuty(duty);
        const fallbackWage = duty.isOutsideCar ? (Number(duty.dutyAmount) || 0) : (Number(duty.driver?.dailyWage) || 0);

        // Debug log to trace what data we are loading into the modal
        console.log('[DEBUG] Opening Edit Modal for Duty:', {
            id: duty._id,
            wage: duty.dailyWage,
            parking: duty.punchOut?.tollParkingAmount,
            paidBy: duty.punchOut?.parkingPaidBy
        });

        setEditDutyForm({
            date: duty.date,
            driverId: duty.driver?._id || duty.driver || '',
            vehicleId: duty.vehicle?._id || duty.vehicle || '',
            vehicleNumber: duty.vehicle?.carNumber || duty.vehicleNumber || duty.carNumber || '',
            startKm: duty.punchIn?.km ?? 0,
            endKm: duty.punchOut?.km ?? 0,
            punchInTime: duty.punchIn?.time ? toISTDateTimeString(duty.punchIn.time) : '',
            punchOutTime: duty.punchOut?.time ? toISTDateTimeString(duty.punchOut.time) : nowISTDateTimeString(),
            pickUpLocation: duty.pickUpLocation || '',
            dropLocation: duty.dropLocation || '',
            fuelAmount: duty.fuel?.amount ?? 0,
            parkingAmount: duty.punchOut?.tollParkingAmount ?? 0,
            parkingPaidBy: duty.punchOut?.parkingPaidBy || 'Self',
            allowanceTA: duty.punchOut?.allowanceTA ?? 0,
            nightStayAmount: duty.punchOut?.nightStayAmount ?? 0,
            dailyWage: (duty.dailyWage !== undefined && duty.dailyWage !== null) ? duty.dailyWage : fallbackWage,
            remarks: duty.punchOut?.remarks || duty.punchOut?.otherRemarks || '',
            dutyType: duty.pickUpLocation || ''
        });
        setShowEditDutyModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.put(`/api/admin/drivers/${editingDriver._id}`, editForm, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setMessage({ type: 'success', text: 'Freelancer updated successfully!' });
            setTimeout(() => {
                setShowEditModal(false);
                setEditingDriver(null);
                setMessage({ type: '', text: '' });
                fetchFreelancers();
            }, 1000);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Update failed' });
        } finally { setSubmitting(false); }
    };

    const openEditModal = (driver) => {
        setEditingDriver(driver);
        setEditForm({
            name: driver.name,
            mobile: driver.mobile,
            licenseNumber: driver.licenseNumber || '',
            dailyWage: driver.dailyWage || '',
            nightStayBonus: driver.nightStayBonus !== undefined && driver.nightStayBonus !== null ? String(driver.nightStayBonus) : '500',
            sameDayReturnBonus: driver.sameDayReturnBonus !== undefined && driver.sameDayReturnBonus !== null ? String(driver.sameDayReturnBonus) : '100',
            sameDayReturnEnabled: driver.sameDayReturnEnabled || false
        });
        setShowEditModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this freelancer?')) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.delete(`/api/admin/drivers/${id}`, { headers: { Authorization: `Bearer ${userInfo.token}` } });
            fetchFreelancers();
        } catch (error) {
            console.error(error);
            alert('Error deleting');
        }
    };

    const baseDrivers = drivers.filter(d => {
        const matchesFilter = driverFilter === 'All' || d._id === driverFilter;
        const matchesSearch = !searchTerm || d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.mobile?.includes(searchTerm);
        return matchesFilter && matchesSearch;
    });

    const onDutyDrivers = baseDrivers.filter(d => d.tripStatus === 'active');
    const availableDrivers = baseDrivers.filter(d => d.tripStatus !== 'active');

    const filteredAttendance = attendance.filter(a => {
        const matchesDriver = driverFilter === 'All' || a.driver?._id === driverFilter || a.driver === driverFilter;
        const matchesVehicle = vehicleFilter === 'All' || a.vehicle?._id === vehicleFilter || a.vehicle?.carNumber?.split('#')[0] === vehicleFilter;
        const driverName = a.driver?.name || drivers.find(d => d._id === (a.driver?._id || a.driver))?.name || '';
        const matchesSearch = !searchTerm || driverName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesDriver && matchesVehicle && matchesSearch;
    });

    const totalLogisticsAmount = filteredAttendance.reduce((sum, a) => {
        const rowTotal = (Number(a.dailyWage) || Number(a.driver?.dailyWage) || 0) +
            (Number(a.punchOut?.tollParkingAmount) || 0) +
            (Number(a.punchOut?.allowanceTA) || 0) + 
            (Number(a.punchOut?.nightStayAmount) || 0);
        return sum + rowTotal;
    }, 0);

    const settlementByDriverDate = filteredAttendance.reduce((acc, a) => {
        if (a.status !== 'completed' && !a.punchOut?.time) return acc;

        const driverId = a.driver?._id || a.driver;
        const date = a.date || (a.punchIn?.time ? toISTDateString(a.punchIn.time) : 'Unknown');
        const key = `${driverId}_${date}`;

        if (!acc[key]) {
            acc[key] = { wage: 0, parking: 0 };
        }

        const wage = Number(a.dailyWage) || 0;
        acc[key].wage = Math.max(acc[key].wage, wage);

        const parking = a.punchOut?.parkingPaidBy !== 'Office' ? (Number(a.punchOut?.tollParkingAmount) || 0) : 0;
        const ta = Number(a.punchOut?.allowanceTA) || 0;
        const nightStay = Number(a.punchOut?.nightStayAmount) || 0;

        acc[key].parking += parking + ta + nightStay;

        return acc;
    }, {});

    const totalSettlement = Object.values(settlementByDriverDate).reduce((sum, item) => {
        return sum + item.wage + item.parking;
    }, 0);    // Stats calculation for display
    const currentStats = viewMode === 'monthly' ? monthlySummaries :
        baseDrivers.map(driver => {
            const dAttendance = attendance.filter(a => a.driver?._id === driver._id || a.driver === driver._id);
            const dAdvances = advances.filter(adv => adv.driver?._id === driver._id || adv.driver === driver._id);
            const dLoans = loans.filter(loan => loan.driver?._id === driver._id || loan.driver === driver._id);

            const dEarnedByDate = dAttendance.reduce((acc, a) => {
                if (a.status !== 'completed' && !a.punchOut?.time) return acc;
                const date = a.date || (a.punchIn?.time ? new Date(a.punchIn.time).toISOString().split('T')[0] : 'Unknown');
                if (!acc[date]) acc[date] = { wage: 0, extra: 0 };
                if (acc[date].wage === 0) acc[date].wage = Number(a.dailyWage) || 0;
                const parking = a.punchOut?.parkingPaidBy !== 'Office' ? (Number(a.punchOut?.tollParkingAmount) || 0) : 0;
                const ta = Number(a.punchOut?.allowanceTA) || 0;
                const nightStay = Number(a.punchOut?.nightStayAmount) || 0;
                acc[date].extra += parking + ta + nightStay;
                return acc;
            }, {});
            const totalEarned = Object.values(dEarnedByDate).reduce((sum, d) => sum + d.wage + d.extra, 0);
            const totalAdvances = dAdvances.reduce((s, adv) => s + adv.amount, 0);
            const totalEMI = dLoans.filter(loan => loan.status === 'Active' && loan.remainingAmount > 0).reduce((sum, loan) => {
                const repayment = (loan.repayments || []).find(r => r.month === (selectedMonth + 1) && r.year === selectedYear);
                return sum + (repayment ? Number(repayment.amount) : Number(loan.monthlyEMI));
            }, 0);

            return {
                driverId: driver._id,
                name: driver.name,
                totalEarned,
                totalAdvances,
                totalEMI,
                netPayable: totalEarned - totalAdvances - totalEMI,
                activeLoans: dLoans.filter(loan => loan.status === 'Active' && loan.remainingAmount > 0).map(loan => ({
                    loanId: loan._id,
                    emi: loan.monthlyEMI,
                    isPaid: (loan.repayments || []).some(r => r.month === (selectedMonth + 1) && r.year === selectedYear)
                }))
            };
        }).filter(s => s.totalEarned > 0 || s.totalAdvances > 0 || s.totalEMI > 0);

    const totalEarned = currentStats.reduce((sum, s) => sum + (s.totalEarned || 0), 0);
    const totalAdvances = currentStats.reduce((sum, s) => sum + (s.totalAdvances || 0), 0);
    const totalEMI = currentStats.reduce((sum, s) => sum + (s.totalEMI || 0), 0);
    const totalPayable = totalEarned - totalAdvances - totalEMI;

    const filterDriverName = driverFilter === 'All' ? 'Select Freelancer' : drivers.find(d => d._id === driverFilter)?.name;

    // Extract unique locations and vehicles for suggestions
    const uniquePickups = [...new Set(attendance.map(a => a.pickUpLocation).filter(Boolean))].sort();
    const uniqueDrops = [...new Set(attendance.map(a => a.dropLocation).filter(Boolean))].sort();


    const handleDownloadExcel = () => {
        if (filteredAttendance.length === 0) return alert('No data to download');

        const data = filteredAttendance.map(a => ({
            'Date': a.date,
            'Driver Name': a.driver?.name || 'N/A',
            'Car': a.vehicle?.carNumber ? a.vehicle.carNumber.slice(-4) : 'N/A',
            'In Time': a.punchIn?.time ? new Date(a.punchIn.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-',
            'Out Time': a.punchOut?.time ? new Date(a.punchOut.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-',
            'Total KM': (a.punchOut?.km - a.punchIn?.km) || 0,
            'Pick-up': a.pickUpLocation || '-',
            'Drop': a.dropLocation || '-',
            'Salary': a.dailyWage || 0,
            'Fuel': a.fuel?.amount || 0,
            'Parking/Toll': a.punchOut?.tollParkingAmount || 0,
            'T/A': a.punchOut?.allowanceTA || 0,
            'Night Stay': a.punchOut?.nightStayAmount || 0,
            'Remarks': a.punchOut?.remarks || ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Freelancer Duties");
        XLSX.writeFile(wb, `Freelancer_Report_${new Date().toLocaleDateString()}.xlsx`);
    };

    return (
        <div key={location.key} className="container-fluid freelancer-root" style={{ paddingBottom: '40px' }}>
            <SEO title="Freelancer Fleet Network" description="Onboard and manage freelance drivers for temporary duties and peak demand management." />

            {/* Header with Search and Stats */}
            <header className="freelancers-header">
                <div className="flex-resp" style={{ justifyContent: 'space-between', width: '100%', gap: '20px', alignItems: 'center' }}>
                    <div className="header-logo-section">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 3vw, 15px)' }}>
                            <div style={{
                                background: 'linear-gradient(135deg, white, #f8fafc)',
                                borderRadius: '16px',
                                padding: 'clamp(6px, 1.5vw, 8px)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                boxShadow: `0 10px 25px ${theme.primary}30`,
                                flexShrink: 0
                            }}>
                                <Users size={24} color={theme.primary} />
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: theme.primary, boxShadow: `0 0 8px ${theme.primary}` }}></div>
                                    <span style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase' }}>External Workforce</span>
                                </div>
                                <h1 style={{ color: 'white', fontWeight: '900', margin: 0, letterSpacing: '-1.5px', fontSize: 'clamp(20px, 5vw, 32px)' }}>
                                    Freelancers <span style={{ 
                                        background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent'
                                    }}>Hub</span>
                                </h1>
                            </div>
                        </div>
                    </div>

                    <div className="flex-resp" style={{
                        gap: '12px',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        flex: 1,
                        maxWidth: '550px'
                    }}>
                        <div className="search-bar-row">
                    <div style={{ position: 'relative', width: 'clamp(200px, 30vw, 300px)' }}>
                        <Search size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'rgba(255,255,255,0.3)' }} />
                        <input 
                            type="text" 
                            placeholder="Search names..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ width: '100%', height: '48px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '0 15px 0 45px', color: 'white', fontSize: '13px', outline: 'none' }}
                        />
                    </div>
                    {activeTab !== 'accounts' && (
                        <button 
                            onClick={() => setShowAddModal(true)}
                            className="btn-primary"
                            style={{ height: '48px', padding: '0 25px', borderRadius: '14px', fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Plus size={18} /> <span className="hide-mobile">ONBOARD DRIVER</span><span className="show-mobile">ADD</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    </header>

            {/* Premium Filter Hub */}
            <div className="glass-card" style={{
                padding: '12px',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.05)',
                marginBottom: '20px',
                background: 'rgba(15, 23, 42, 0.4)'
            }}>
                <div className="flex-resp" style={{ gap: '15px', alignItems: 'center', justifyContent: 'space-between' }}>

                    {/* Modern Tab Navigation */}
                    <nav className="freelancers-tabs" style={{ margin: 0, background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        {[
                            { id: 'personnel', label: 'Drivers', icon: <UserIcon size={14} /> },
                            { id: 'logistics', label: 'Dutys', icon: <Car size={14} /> },
                            { id: 'accounts', label: 'Salaries', icon: <IndianRupee size={14} /> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className="freelancer-tab-btn"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 16px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: activeTab === tab.id ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
                                    color: activeTab === tab.id ? 'var(--primary)' : 'rgba(255,255,255,0.4)'
                                }}
                            >
                                {tab.icon}
                                <span style={{ fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{tab.label}</span>
                            </button>
                        ))}
                    </nav>

                    {/* Filter Controls */}
                    {activeTab !== 'personnel' && (
                        <div className="flex-resp" style={{ alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'flex-end' }}>

                            {/* PREMIUM DAY NAV PILL (FROM OUTSIDE) */}
                            {activeTab !== 'accounts' && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: 'rgba(0,0,0,0.4)',
                                    padding: '4px',
                                    borderRadius: '20px',
                                    border: '1px solid rgba(255,255,255,0.06)'
                                }}>
                                    <button onClick={() => shiftDays(-1)} style={{
                                        width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}> <ChevronLeft size={16} /> </button>

                                    <div
                                        onClick={(e) => { const i = e.currentTarget.querySelector('input'); if (i.showPicker) i.showPicker(); else i.click(); }}
                                        style={{ height: '32px', minWidth: '110px', background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.15)', borderRadius: '10px', padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', margin: '0 4px' }}
                                    >
                                        <span style={{ fontSize: '11px', fontWeight: '950', color: 'white', whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>
                                            {selectedDay === 'All' ?
                                                `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][selectedMonth]} ${selectedYear}` :
                                                formatDateIST(toISTDateString(new Date(selectedYear, selectedMonth, parseInt(selectedDay)))).toUpperCase()}
                                        </span>
                                        <input
                                            type="date"
                                            value={toISTDateString(new Date(selectedYear, selectedMonth, selectedDay === 'All' ? 1 : parseInt(selectedDay)))}
                                            onChange={e => {
                                                const d = new Date(e.target.value);
                                                setSelectedYear(d.getFullYear());
                                                setSelectedMonth(d.getMonth());
                                                setSelectedDay(d.getDate().toString());
                                            }}
                                            style={{ position: 'absolute', inset: 0, opacity: 0 }}
                                        />
                                    </div>

                                    <button onClick={() => shiftDays(1)} style={{
                                        width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}> <ChevronRight size={16} /> </button>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '8px' }}>
                                {selectedDay !== 'All' && (
                                    <button
                                        onClick={() => setSelectedDay('All')}
                                        style={{
                                            height: '40px',
                                            padding: '0 12px',
                                            borderRadius: '12px',
                                            background: 'rgba(251, 191, 36, 0.1)',
                                            border: '1px solid rgba(251, 191, 36, 0.2)',
                                            color: 'var(--primary)',
                                            fontSize: '10px',
                                            fontWeight: '950',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}
                                    >
                                        <Calendar size={12} /> Full Month
                                    </button>
                                )}

                                <select
                                    value={selectedMonth}
                                    onChange={e => {
                                        setSelectedMonth(Number(e.target.value));
                                        setSelectedDay('All');
                                    }}
                                    style={{ height: '40px', padding: '0 8px', fontSize: '11px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontWeight: '800', width: '70px', outline: 'none' }}
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
                                    style={{ height: '40px', padding: '0 8px', fontSize: '11px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontWeight: '800', width: '70px', outline: 'none' }}
                                >
                                    {[2024, 2025, 2026, 2027].map(y => (
                                        <option key={y} value={y} style={{ background: '#0f172a' }}>{y}</option>
                                    ))}
                                </select>
                            </div>

                            <button onClick={() => { fetchAttendance(); fetchAdvances(); fetchFreelancers(); }}
                                style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', color: '#818cf8', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                title="Refresh Data">
                                <RefreshCw size={18} className={loading || summaryLoading ? 'animate-spin' : ''} />
                            </button>
                            <button onClick={handleDownloadExcel}
                                style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                title="Export Excel">
                                <Download size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Tabs */}
            <div style={{ position: 'relative', minHeight: '600px' }}>
                {/* PERSONNEL TAB */}
                {
                    activeTab === 'personnel' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ animation: 'fadeIn 0.5s ease' }}>
                            {/* Driver Table View */}
                            <div style={{ borderRadius: '24px', overflow: 'hidden', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div className="table-responsive-wrapper" style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <th style={{ padding: '18px 25px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Freelancer</th>
                                                <th style={{ padding: '18px 25px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Status</th>
                                                <th style={{ padding: '18px 25px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Duties</th>
                                                <th style={{ padding: '18px 25px', textAlign: 'right', color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="5" style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading drivers...</td></tr>
                                            ) : (availableDrivers.length === 0 && onDutyDrivers.length === 0) ? (
                                                <tr>
                                                    <td colSpan="5" style={{ padding: '80px 40px', textAlign: 'center' }}>
                                                        <UserIcon size={40} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: '20px' }} />
                                                        <h3 style={{ color: 'white', fontWeight: '800' }}>No Freelancers Found</h3>
                                                        <p style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '30px' }}>Add drivers to your network to see them here.</p>
                                                    </td>
                                                </tr>
                                            ) : [...onDutyDrivers.sort((a, b) => a.name.localeCompare(b.name)), ...availableDrivers.sort((a, b) => a.name.localeCompare(b.name))]
                                                .filter(d =>
                                                    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    d.mobile?.includes(searchTerm)
                                                )
                                                .length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>
                                                        No drivers match your search query.
                                                    </td>
                                                </tr>
                                            ) : [...onDutyDrivers.sort((a, b) => a.name.localeCompare(b.name)), ...availableDrivers.sort((a, b) => a.name.localeCompare(b.name))]
                                                .filter(d =>
                                                    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    d.mobile?.includes(searchTerm)
                                                )
                                                .map(d => {
                                                    const dayAttendance = attendance.filter(a => a.driver?._id === d._id || a.driver === d._id);
                                                    const isOnDuty = d.tripStatus === 'active' || dayAttendance.some(a => a.status === 'incomplete');
                                                    const dutyCount = attendance.filter(a => a.driver?._id === d._id || a.driver === d._id).length;
                                                    return (
                                                        <tr key={d._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.3s' }} className="ledger-row">
                                                            <td style={{ padding: '15px 25px' }}>
                                                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                                                    <div style={{
                                                                        width: '40px', height: '40px', borderRadius: '12px',
                                                                        background: isOnDuty ? 'rgba(244, 63, 94, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                                                                        display: 'flex', justifyContent: 'center', alignItems: 'center'
                                                                    }}>
                                                                        <UserIcon size={18} style={{ color: isOnDuty ? '#f43f5e' : '#818cf8' }} />
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ color: 'white', fontWeight: '800', fontSize: '14px' }}>{d.name.split(' (F)')[0]}</div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                                                                            <a href={`tel:${d.mobile}`} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                <Phone size={10} /> {d.mobile}
                                                                            </a>
                                                                            {d.licenseNumber && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>• {d.licenseNumber}</span>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '15px 25px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnDuty ? '#f43f5e' : '#10b981' }}></div>
                                                                    <span style={{ fontSize: '11px', color: isOnDuty ? '#f43f5e' : '#10b981', fontWeight: '900', textTransform: 'uppercase' }}>
                                                                        {isOnDuty ? 'ON DUTY' : 'AVAILABLE'}
                                                                    </span>
                                                                </div>
                                                                {isOnDuty && d.assignedVehicle && (
                                                                    <div style={{ color: 'rgba(14,165,233,0.7)', fontSize: '10px', fontWeight: '800', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                        <Car size={10} /> {d.assignedVehicle?.carNumber?.split('#')[0]}
                                                                    </div>
                                                                )}
                                                            </td>

                                                            <td style={{ padding: '15px 25px', textAlign: 'center' }}>
                                                                <div style={{ display: 'inline-block', background: 'rgba(99, 102, 241, 0.1)', padding: '4px 12px', borderRadius: '100px', border: '1px solid rgba(99,102,241,0.1)' }}>
                                                                    <span style={{ color: '#818cf8', fontWeight: '900', fontSize: '13px' }}>{dutyCount}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '15px 25px', textAlign: 'right' }}>
                                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                                    {isOnDuty ? (
                                                                        <div style={{ display: 'flex', gap: '5px' }}>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setSelectedDriver(d);
                                                                                    const viewTime = nowISTDateTimeString();
                                                                                    setPunchOutData({
                                                                                        ...punchOutData,
                                                                                        km: '',
                                                                                        time: viewTime,
                                                                                        nightStayAmount: '0' || ''
                                                                                    });
                                                                                    setShowPunchOutModal(true);
                                                                                }}
                                                                                style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '8px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}
                                                                            >FINISH</button>

                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedDriver(d);
                                                                                const viewDate = toDate || getToday();
                                                                                const viewTime = viewDate + 'T' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                                                                                setPunchInData({
                                                                                    ...punchInData,
                                                                                    time: viewTime,
                                                                                    date: viewDate,
                                                                                    dailyWage: d.dailyWage || ''
                                                                                });
                                                                                setShowPunchInModal(true);
                                                                            }}
                                                                            style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '8px 15px', borderRadius: '10px', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}
                                                                        >START</button>
                                                                    )}
                                                                    {/* Fuel option removed as per request */}
                                                                    <button
                                                                        onClick={() => { setSelectedDriver(d); setQuickExpenseType('parking'); setShowQuickExpenseModal(true); }}
                                                                        title="Add Parking"
                                                                        style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
                                                                    >
                                                                        <MapPin size={13} />
                                                                    </button>

                                                                    <button onClick={() => openEditModal(d)} title="Edit Profile" style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}>
                                                                        <Edit2 size={13} />
                                                                    </button>

                                                                    <button onClick={() => {
                                                                        if (isOnDuty) {
                                                                            const activeDuty = dayAttendance.find(a => a.status === 'incomplete');
                                                                            if (activeDuty) {
                                                                                handleDeleteDuty(activeDuty);
                                                                            } else {
                                                                                alert('Cannot find the active duty in the current date view. Please select the date range when the duty started to delete it.');
                                                                            }
                                                                        } else {
                                                                            handleDelete(d._id);
                                                                        }
                                                                    }} title={isOnDuty ? "Delete Duty" : "Delete Freelancer"} style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(244,63,94,0.05)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}>
                                                                        <Trash2 size={13} />
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
                        </motion.div>
                    )
                }

                {/* ACCOUNTS TAB */}
                {
                    activeTab === 'accounts' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ animation: 'fadeIn 0.5s ease' }}>
                            <div style={{ marginBottom: '32px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                    <div style={{ width: '4px', height: '24px', background: 'linear-gradient(to bottom, var(--primary), #a855f7)', borderRadius: '4px' }}></div>
                                    <h4 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '900', letterSpacing: '-0.5px' }}>{viewMode === 'monthly' ? 'Monthly Settlement Summary' : 'Date Range Settlement'}</h4>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {!summaryLoading && (
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                            gap: '15px',
                                            marginBottom: '10px'
                                        }}>
                                            <div className="premium-glass" style={{ padding: '20px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(16, 185, 129, 0.05)' }}>
                                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Total Earned</div>
                                                <div style={{ color: '#10b981', fontSize: '24px', fontWeight: '900' }}>₹{totalEarned.toLocaleString()}</div>
                                            </div>
                                            <div className="premium-glass" style={{ padding: '20px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(244, 63, 94, 0.05)' }}>
                                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Total Advance</div>
                                                <div style={{ color: '#f43f5e', fontSize: '24px', fontWeight: '900' }}>₹{totalAdvances.toLocaleString()}</div>
                                            </div>
                                            <div className="premium-glass" style={{ padding: '20px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(56, 189, 248, 0.05)' }}>
                                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Net Company Owed</div>
                                                <div style={{ color: '#38bdf8', fontSize: '24px', fontWeight: '900' }}>₹{totalPayable.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    )}
                                    {summaryLoading ? (
                                        <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner"></div></div>
                                    ) : currentStats.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '50px', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>No settlement data found for selected filters.</div>
                                    ) : (
                                        currentStats
                                            .filter(s => !searchTerm || s.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                                            .map(summary => (
                                                <div
                                                    key={summary.driverId}
                                                    onClick={() => navigate(`/admin/freelancers/${summary.driverId}?month=${selectedMonth + 1}&year=${selectedYear}`)}
                                                    style={{
                                                        background: 'rgba(15,23,42,0.6)',
                                                        border: '1px solid rgba(255,255,255,0.07)',
                                                        borderRadius: '16px',
                                                        padding: '14px 18px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '14px',
                                                        cursor: 'pointer',
                                                        transition: 'border-color 0.2s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
                                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
                                                >
                                                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <UserIcon size={16} color="#818cf8" />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ color: 'white', fontWeight: '800', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{summary.name}</div>
                                                        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginTop: '1px' }}>{summary.workingDays || summary.dAttendance?.length || 0} days worked</div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexShrink: 0 }}>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>Earned</div>
                                                            <div style={{ color: '#10b981', fontWeight: '900', fontSize: '14px' }}>₹{summary.totalEarned.toLocaleString()}</div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>Advance</div>
                                                            <div style={{ color: '#f87171', fontWeight: '900', fontSize: '14px' }}>₹{summary.totalAdvances.toLocaleString()}</div>
                                                        </div>
                                                        <div style={{ textAlign: 'right', minWidth: '80px' }}>
                                                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>Net Payable</div>
                                                            <div style={{ color: summary.netPayable >= 0 ? '#34d399' : '#f43f5e', fontWeight: '900', fontSize: '16px' }}>₹{Math.abs(summary.netPayable).toLocaleString()}</div>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={15} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0 }} />
                                                </div>
                                            ))
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )
                }

                {/* LOGISTICS TAB */}
                {
                    activeTab === 'logistics' && (
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={{ animation: 'fadeIn 0.5s ease' }}>
                            {/* Duties Summary Header */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                <div className="premium-glass" style={{ padding: '18px 24px', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.1)', background: 'rgba(16, 185, 129, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Total Duties</div>
                                        <div style={{ color: 'white', fontSize: '24px', fontWeight: '950' }}>{filteredAttendance.length}</div>
                                    </div>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Car size={20} color="#10b981" />
                                    </div>
                                </div>
                                <div className="premium-glass" style={{ padding: '18px 24px', borderRadius: '20px', border: '1px solid rgba(251, 191, 36, 0.15)', background: 'rgba(251, 191, 36, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Total Payout</div>
                                        <div style={{ color: 'var(--primary)', fontSize: '24px', fontWeight: '950' }}>₹{totalLogisticsAmount.toLocaleString()}</div>
                                    </div>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(251,191,36,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <IndianRupee size={20} color="var(--primary)" />
                                    </div>
                                </div>
                            </div>

                            {/* Duty Table View */}
                            {filteredAttendance.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '20px' }}>
                                    <Car size={40} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: '16px' }} />
                                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', fontWeight: '700' }}>No duty records found for selected period</p>
                                    <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', marginTop: '6px' }}>Try changing the date range, driver filter, or search term</p>
                                </div>
                            ) : (
                                <div style={{ borderRadius: '24px', overflow: 'hidden', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div className="scroll-x">
                                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px' }}>
                                            <thead>
                                                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <th style={{ padding: '18px 25px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Date</th>
                                                    <th style={{ padding: '18px 25px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Driver</th>
                                                    <th style={{ padding: '18px 25px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Vehicle</th>
                                                    <th style={{ padding: '18px 25px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Route Details</th>
                                                    <th style={{ padding: '18px 25px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Timing & KM</th>
                                                    <th style={{ padding: '18px 25px', textAlign: 'right', color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Financials (+ Parking)</th>
                                                    <th style={{ padding: '18px 25px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredAttendance.map((a) => {
                                                    const punchInDate = a.date || (a.punchIn?.time ? new Date(a.punchIn.time).toISOString().split('T')[0] : null);
                                                    const punchInTime = a.punchIn?.time ? new Date(a.punchIn.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
                                                    const punchOutTime = a.punchOut?.time ? new Date(a.punchOut.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;
                                                    const totalKM = Math.max(0, a.totalKM || (a.punchOut?.km && a.punchIn?.km ? a.punchOut.km - a.punchIn.km : 0));
                                                    const isCompleted = a.status === 'completed' || !!a.punchOut?.time;

                                                    return (
                                                        <tr key={a._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.3s' }} className="ledger-row">
                                                            <td style={{ padding: '15px 25px' }}>
                                                                <div style={{ color: 'white', fontWeight: '800', fontSize: '13px' }}>{punchInDate ? new Date(punchInDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '---'}</div>
                                                                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: '700', marginTop: '2px' }}>{punchInDate ? new Date(punchInDate).getFullYear() : ''}</div>
                                                            </td>
                                                            <td style={{ padding: '15px 25px' }}>
                                                                <div style={{ color: 'white', fontWeight: '800', fontSize: '14px' }}>{a.driver?.name || '---'}</div>
                                                                <span style={{
                                                                    fontSize: '8px', padding: '2px 8px', borderRadius: '100px', fontWeight: '900', marginTop: '4px', display: 'inline-block',
                                                                    background: isCompleted ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                                                    color: isCompleted ? '#10b981' : 'var(--primary)',
                                                                    border: `1px solid ${isCompleted ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)'}`
                                                                }}>
                                                                    {isCompleted ? 'COMPLETED' : 'ON DUTY'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '15px 25px' }}>
                                                                <div style={{ background: 'rgba(14,165,233,0.1)', padding: '5px 12px', borderRadius: '8px', display: 'inline-block' }}>
                                                                    <span style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: '900' }}>{a.vehicle?.carNumber?.split('#')[0] || 'N/A'}</span>
                                                                </div>
                                                                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: '700', marginTop: '4px' }}>{a.vehicle?.model?.split(' ').slice(0, 2).join(' ') || ''}</div>
                                                            </td>
                                                            <td style={{ padding: '15px 25px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                                                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
                                                                        <div style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.1)' }} />
                                                                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f43f5e' }} />
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: '600' }}>{a.pickUpLocation || 'Start'}</div>
                                                                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '600', marginTop: '4px' }}>{a.dropLocation || (isCompleted ? 'N/A' : 'Pending')}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '15px 25px' }}>
                                                                <div style={{ color: 'white', fontSize: '12px', fontWeight: '700' }}>{punchInTime} - {punchOutTime || 'Active'}</div>
                                                                <div style={{ color: '#818cf8', fontSize: '11px', fontWeight: '900', marginTop: '4px' }}>{totalKM} KM Run</div>
                                                            </td>
                                                            <td style={{ padding: '15px 25px', textAlign: 'right' }}>
                                                                <div style={{ color: '#10b981', fontSize: '16px', fontWeight: '900', marginBottom: '4px' }}>
                                                                    ₹{(Number(a.dailyWage) || Number(a.driver?.dailyWage) || 0) + (Number(a.punchOut?.tollParkingAmount) || 0) + (Number(a.punchOut?.allowanceTA) || 0) + (Number(a.punchOut?.nightStayAmount) || 0)}
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                                                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: '700' }}>
                                                                        W: ₹{a.dailyWage || a.driver?.dailyWage || 0}
                                                                    </div>
                                                                    {a.punchOut?.tollParkingAmount > 0 && (
                                                                        <span style={{
                                                                            color: a.punchOut?.parkingPaidBy === 'Office' ? 'rgba(255,255,255,0.3)' : '#8b5cf6',
                                                                            fontSize: '9px', fontWeight: '900',
                                                                            textDecoration: a.punchOut?.parkingPaidBy === 'Office' ? 'line-through' : 'none'
                                                                        }}>
                                                                            P: ₹{a.punchOut.tollParkingAmount}{a.punchOut?.parkingPaidBy === 'Office' ? ' (O)' : ' (S)'}
                                                                        </span>
                                                                    )}
                                                                    {Number(a.punchOut?.allowanceTA) > 0 && (
                                                                        <span style={{ color: 'var(--primary)', fontSize: '9px', fontWeight: '900' }}>
                                                                            T/A: ₹{a.punchOut.allowanceTA}
                                                                        </span>
                                                                    )}
                                                                    {Number(a.punchOut?.nightStayAmount) > 0 && (
                                                                        <span style={{ color: '#ca8a04', fontSize: '9px', fontWeight: '900' }}>
                                                                            NS: ₹{a.punchOut.nightStayAmount}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '15px 25px', textAlign: 'center' }}>
                                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                                    <button
                                                                        onClick={() => setSelectedItem({ ...a, entryType: 'attendance' })}
                                                                        style={{ background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.2)', color: 'var(--primary)', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                        title="View Proof"
                                                                    >
                                                                        <Eye size={14} />
                                                                    </button>
                                                                    {isCompleted && (
                                                                        <button
                                                                            onClick={() => openEditDutyModal(a)}
                                                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                            title="Edit"
                                                                        >
                                                                            <Edit2 size={14} />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleDeleteDuty(a)}
                                                                        disabled={submitting}
                                                                        style={{
                                                                            background: 'rgba(244, 63, 94, 0.05)',
                                                                            border: '1px solid rgba(244, 63, 94, 0.1)',
                                                                            color: '#f43f5e',
                                                                            borderRadius: '8px',
                                                                            padding: '6px',
                                                                            cursor: submitting ? 'not-allowed' : 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            opacity: submitting ? 0.5 : 1
                                                                        }}
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 size={14} />
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
                        </motion.div>
                    )
                }
            </div>

            {/* Modals Implementation */}
            <div>
                {/* Add Freelancer Modal */}
                {
                    showAddModal && (
                        <Modal title="Add New Freelancer" onClose={() => setShowAddModal(false)}>
                            <form onSubmit={handleCreate} style={{ display: 'grid', gap: '20px' }}>
                                <Field label="Full Name *" value={formData.name} onChange={v => setFormData({ ...formData, name: v })} required />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <Field label="Mobile Number *" value={formData.mobile} onChange={v => setFormData({ ...formData, mobile: v })} required />
                                    <Field label="Daily Wage (Salary)" type="number" value={formData.dailyWage} onChange={v => setFormData({ ...formData, dailyWage: v })} />
                                </div>
                                <Field label="License Number" value={formData.licenseNumber} onChange={v => setFormData({ ...formData, licenseNumber: v })} />

                                <SubmitButton disabled={submitting} text="Register Freelancer" message={message} />
                            </form>
                        </Modal>
                    )
                }

                {/* Edit Freelancer Modal */}
                {
                    showEditModal && (
                        <Modal title={`Edit Freelancer: ${editingDriver?.name}`} onClose={() => setShowEditModal(false)}>
                            <form onSubmit={handleUpdate} style={{ display: 'grid', gap: '20px' }}>
                                <Field label="Full Name *" value={editForm.name} onChange={v => setEditForm({ ...editForm, name: v })} required />
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                                    <Field label="Mobile Number *" value={editForm.mobile} onChange={v => setEditForm({ ...editForm, mobile: v })} required />
                                    <Field label="License Number" value={editForm.licenseNumber} onChange={v => setEditForm({ ...editForm, licenseNumber: v })} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                                    <Field label="Daily Wage" type="number" value={editForm.dailyWage} onChange={v => setEditForm({ ...editForm, dailyWage: v })} />
                                    <Field label="Night Stay" type="number" value={editForm.nightStayBonus} onChange={v => setEditForm({ ...editForm, nightStayBonus: v })} />
                                </div>
                                <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ color: 'white', fontSize: '13px', fontWeight: '800' }}>Same Day Return</div>
                                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginTop: '2px' }}>Enable SDR bonus for this driver</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input 
                                            type="number" 
                                            value={editForm.sameDayReturnBonus} 
                                            onChange={e => setEditForm({...editForm, sameDayReturnBonus: e.target.value})}
                                            style={{ width: '70px', height: '36px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', textAlign: 'center', fontSize: '12px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setEditForm({ ...editForm, sameDayReturnEnabled: !editForm.sameDayReturnEnabled })}
                                            style={{
                                                background: editForm.sameDayReturnEnabled ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                                color: 'white', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '10px', fontWeight: '900', cursor: 'pointer'
                                            }}
                                        >
                                            {editForm.sameDayReturnEnabled ? 'ENABLED' : 'DISABLED'}
                                        </button>
                                    </div>
                                </div>

                                <SubmitButton disabled={submitting} text="Update Freelancer" message={message} />
                            </form>
                        </Modal>
                    )
                }

                {/* Punch In Modal */}
                {showPunchInModal && (
                    <Modal title={`Assign Duty: ${selectedDriver?.name}`} onClose={() => { setShowPunchInModal(false); setVehicleSearch(''); }}>
                        <form onSubmit={handlePunchIn} style={{ display: 'grid', gap: '25px' }}>
                            <div>
                                <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Select Vehicle *</label>
                                <input
                                    type="text"
                                    list="vehicle-list"
                                    className="input-field"
                                    placeholder="Type car number..."
                                    required
                                    value={vehicleSearch}
                                    onChange={e => {
                                        setVehicleSearch(e.target.value);
                                        const found = vehicles.find(v => v.carNumber?.split('#')[0]?.toUpperCase() === e.target.value.toUpperCase());
                                        if (found) {
                                            setPunchInData({
                                                ...punchInData,
                                                vehicleId: found._id,
                                                km: found.lastOdometer || ''
                                            });
                                        }
                                    }}
                                />
                                <datalist id="vehicle-list">
                                    {vehicles.filter(v => punchInData.date !== getToday() || !v.currentDriver).map(v => (
                                        <option key={v._id} value={v.carNumber?.split('#')[0]}>
                                            {v.model} (Last KM: {v.lastOdometer || 0})
                                        </option>
                                    ))}
                                </datalist>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                                <Field label="Duty Date *" type="date" value={punchInData.date} onChange={v => setPunchInData({ ...punchInData, date: v })} required />
                                <Field label="Punch-In Time *" type="datetime-local" value={punchInData.time} onChange={v => setPunchInData({ ...punchInData, time: v })} required />
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '15px', alignItems: 'end' }}>
                                <div style={{ position: 'relative' }}>
                                    <Field label="Starting KM *" type="number" value={punchInData.km} onChange={v => setPunchInData({ ...punchInData, km: v })} required />
                                    {punchInData.vehicleId && (
                                        <div style={{ position: 'absolute', top: '0', right: '0', fontSize: '10px', color: 'var(--primary)', fontWeight: '800' }}>
                                            LAST: {vehicles.find(v => v._id === punchInData.vehicleId)?.lastOdometer || 0}
                                        </div>
                                    )}
                                </div>
                                <div style={{ marginBottom: '20px' }}>
                                    <PhotoUpload
                                        label="Initial KM Photo"
                                        icon={Camera}
                                        onFileSelect={(file) => setPunchInPhotos({ ...punchInPhotos, kmPhoto: file })}
                                        previewFile={punchInPhotos.kmPhoto}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <Field label="Duty Salary (₹) *" type="text" inputMode="decimal" value={punchInData.dailyWage} onChange={v => {
                                    const cleaned = v.replace(/[^0-9.]/g, '');
                                    setPunchInData({ ...punchInData, dailyWage: cleaned });
                                }} required />
                                <Field label="Pick-up Location" value={punchInData.pickUpLocation} onChange={v => setPunchInData({ ...punchInData, pickUpLocation: v })} />
                            </div>

                            <SubmitButton disabled={submitting} text="Start Duty" />
                        </form>
                    </Modal>
                )}

                {/* Manual Duty Entry Modal */}
                <AnimatePresence>
                    {showManualModal && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '15px', overflowY: 'auto' }}>
                            <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 50, opacity: 0 }}
                                className="premium-glass"
                                style={{ width: '100%', maxWidth: '600px', padding: '0', border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a', overflow: 'visible', margin: 'auto', borderRadius: '24px' }}
                            >
                                <div style={{ padding: '24px 30px', background: 'linear-gradient(to right, #1e293b, #0f172a)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, borderTopLeftRadius: 'inherit', borderTopRightRadius: 'inherit' }}>
                                    <div>
                                        <h2 style={{ color: 'white', fontSize: '20px', margin: 0, fontWeight: '800' }}>Manual Duty Entry</h2>
                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', margin: '4px 0 0' }}>Record Past Trip</p>
                                    </div>
                                    <button onClick={() => setShowManualModal(false)} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', borderRadius: '50%', padding: '10px', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
                                </div>

                                <form onSubmit={handleManualEntry} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                                        <div>
                                            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Freelancer *</label>
                                            <select
                                                className="input-field"
                                                required
                                                value={manualData.driverId}
                                                onChange={e => {
                                                    const d = allDrivers.find(drv => drv._id === e.target.value);
                                                    setManualData({
                                                        ...manualData,
                                                        driverId: e.target.value,
                                                        dailyWage: d?.dailyWage || d?.salary || '',
                                                        nightStayAmount: d?.nightStayBonus || ''
                                                    });
                                                }}
                                                style={{ width: '100%', height: '52px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', color: 'white', padding: '0 15px' }}
                                            >
                                                <option value="" style={{ background: '#0f172a', color: 'white' }}>Select Driver</option>
                                                {allDrivers
                                                    .sort((a, b) => a.name.localeCompare(b.name))
                                                    .map(d => (
                                                        <option key={d._id} value={d._id} style={{ background: '#0f172a', color: 'white' }}>
                                                            {d.name.split(' (F)')[0]} {d.isFreelancer ? '(F)' : '(C)'}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Vehicle *</label>
                                            <select
                                                className="input-field"
                                                required
                                                value={manualData.vehicleId}
                                                onChange={e => setManualData({ ...manualData, vehicleId: e.target.value })}
                                                style={{ width: '100%', height: '52px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', color: 'white', padding: '0 15px' }}
                                            >
                                                <option value="" style={{ background: '#0f172a', color: 'white' }}>Select Car</option>
                                                {vehicles.map(v => <option key={v._id} value={v._id} style={{ background: '#0f172a', color: 'white' }}>{v.carNumber?.split('#')[0]} - {v.model}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                                        <Field label="Duty Date *" type="date" value={manualData.date} onChange={v => setManualData({ ...manualData, date: v })} required />
                                        <div>
                                            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Event Assignment (Optional)</label>
                                            <select
                                                className="input-field"
                                                value={manualData.eventId}
                                                onChange={e => setManualData({ ...manualData, eventId: e.target.value })}
                                                style={{ width: '100%', height: '52px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', color: 'white', padding: '0 15px' }}
                                            >
                                                <option value="" style={{ background: '#0f172a', color: 'white' }}>Independent Duty</option>
                                                {/* Note: This assumes 'events' array is available or fetched in Freelancers.jsx */}
                                                {typeof events !== 'undefined' && events.map(e => <option key={e._id} value={e._id} style={{ background: '#0f172a', color: 'white' }}>{e.name} ({e.client})</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
                                        <Field label="Punch-In Time *" type="datetime-local" value={manualData.punchInTime} onChange={v => setManualData({ ...manualData, punchInTime: v })} required />
                                        <Field label="Punch-Out Time *" type="datetime-local" value={manualData.punchOutTime} onChange={v => setManualData({ ...manualData, punchOutTime: v })} required />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
                                        <Field label="Starting KM *" type="number" value={manualData.punchInKM} onChange={v => setManualData({ ...manualData, punchInKM: v })} required />
                                        <Field label="Closing KM *" type="number" value={manualData.punchOutKM} onChange={v => setManualData({ ...manualData, punchOutKM: v })} required />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
                                        <Field label="Pick-up Location" value={manualData.pickUpLocation} onChange={v => setManualData({ ...manualData, pickUpLocation: v })} />
                                        <Field label="Drop Location" value={manualData.dropLocation} onChange={v => setManualData({ ...manualData, dropLocation: v })} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                                        <Field label="Parking/Toll (₹)" type="text" inputMode="decimal" value={manualData.parkingAmount} onChange={v => {
                                            const cleaned = v.replace(/[^0-9.]/g, '');
                                            setManualData({ ...manualData, parkingAmount: cleaned });
                                        }} />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <Field label="Daily Wage (Salary) *" type="text" inputMode="decimal" value={manualData.dailyWage} onChange={v => {
                                            const cleaned = v.replace(/[^0-9.]/g, '');
                                            setManualData({ ...manualData, dailyWage: cleaned });
                                        }} required />
                                        <Field label="T/A (₹)" type="text" inputMode="decimal" value={manualData.allowanceTA} onChange={v => {
                                            const cleaned = v.replace(/[^0-9.]/g, '');
                                            setManualData({ ...manualData, allowanceTA: cleaned });
                                        }} />
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
                                            letterSpacing: '1px',
                                            marginTop: '10px'
                                        }}
                                    >
                                        {submitting ? 'Saving...' : 'Record Duty'}
                                    </button>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Punch Out Modal */}
                {showPunchOutModal && (() => {
                    const activeRecord = attendance.find(a => a.driver?._id === selectedDriver?._id && a.status === 'incomplete');
                    return (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,8,15,0.92)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', backdropFilter: 'blur(16px)' }}>
                            <div className="premium-glass" style={{ width: '100%', maxWidth: '520px', borderRadius: '28px', overflow: 'hidden', maxHeight: '92vh', overflowY: 'auto' }}>
                                {/* Header Banner */}
                                <div style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.2) 0%, rgba(239,68,68,0.05) 100%)', padding: '24px 28px', borderBottom: '1px solid rgba(244,63,94,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <LogOut size={20} color="#f43f5e" />
                                        </div>
                                        <div>
                                            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Duty Completion</div>
                                            <div style={{ color: 'white', fontSize: '18px', fontWeight: '900', marginTop: '1px' }}>{selectedDriver?.name?.split(' (F)')[0]}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowPunchOutModal(false)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <X size={18} />
                                    </button>
                                </div>

                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px 28px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <div style={{ display: 'flex', gap: '20px' }}>
                                        <div>
                                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', display: 'block' }}>Initial KM</span>
                                            <span style={{ color: '#818cf8', fontWeight: '800', fontSize: '14px' }}>{activeRecord?.startKm || 0}</span>
                                        </div>
                                        <div>
                                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', display: 'block' }}>Vehicle</span>
                                            <span style={{ color: 'white', fontWeight: '800', fontSize: '14px' }}>
                                                {activeRecord?.vehicle?.carNumber || activeRecord?.vehicleNumber || selectedDriver?.assignedVehicle?.carNumber || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(16,185,129,0.08)', padding: '12px 28px', borderBottom: '1px solid rgba(16,185,129,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'rgba(16,185,129,0.8)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>Current Duty Total</span>
                                    <span style={{ color: '#10b981', fontSize: '20px', fontWeight: '950' }}>₹{((Number(activeRecord?.dailyWage) || 0) + (punchOutData.parkings?.reduce((s, p) => s + (Number(p.amount) || 0), 0) || 0) + (Number(punchOutData.allowanceTA) || 0) + (Number(punchOutData.nightStayAmount) || 0)).toLocaleString()}</span>
                                </div>

                            {/* Form */}
                            <form onSubmit={handlePunchOut} style={{ padding: '24px 28px', display: 'grid', gap: '20px' }}>
                                {/* Row 1: End KM + KM Photo */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '14px', alignItems: 'end' }}>
                                    <Field label="Closing KM *" type="number" value={punchOutData.km} onChange={v => setPunchOutData({ ...punchOutData, km: v })} required />
                                    <div style={{ marginBottom: '20px' }}>
                                        <PhotoUpload label="Closing KM Photo" icon={Camera} onFileSelect={f => setPunchOutPhotos({ ...punchOutPhotos, kmPhoto: f })} previewFile={punchOutPhotos.kmPhoto} />
                                    </div>
                                </div>

                                {/* Row 2: Punch-Out Time + Drop Location */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <Field label="Punch-Out Time *" type="datetime-local" value={punchOutData.time} onChange={v => setPunchOutData({ ...punchOutData, time: v })} required />
                                    <Field label="Drop Location" value={punchOutData.dropLocation} onChange={v => setPunchOutData({ ...punchOutData, dropLocation: v })} />
                                </div>

                                {/* Multi-Parking Section */}
                                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '24px', padding: '24px', border: '1px solid rgba(251, 191, 36, 0.1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <MapPin size={16} color="var(--primary)" />
                                            <label style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Parking & Tolls</label>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setPunchOutData(p => ({ ...p, parkings: [...p.parkings, { id: Date.now(), amount: '', photo: null }] }))}
                                            style={{ background: 'rgba(251,191,36,0.1)', color: 'var(--primary)', border: '1px solid rgba(251,191,36,0.2)', padding: '6px 14px', borderRadius: '10px', fontSize: '10px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                        >
                                            <Plus size={12} /> ADD RECEIPT
                                        </button>
                                    </div>

                                    <div style={{ display: 'grid', gap: '15px' }}>
                                        {punchOutData.parkings.map((pkg, idx) => (
                                            <div key={pkg.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr auto', gap: '12px', alignItems: 'end', background: 'rgba(5,8,15,0.3)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                                <Field
                                                    label={`Amount ₹`}
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={pkg.amount}
                                                    onChange={v => {
                                                        const newParkings = [...punchOutData.parkings];
                                                        newParkings[idx].amount = v.replace(/[^0-9.]/g, '');
                                                        setPunchOutData({ ...punchOutData, parkings: newParkings });
                                                    }}
                                                />
                                                <PhotoUpload
                                                    label="Receipt Photo"
                                                    icon={ImageIcon}
                                                    onFileSelect={f => {
                                                        const newParkings = [...punchOutData.parkings];
                                                        newParkings[idx].photo = f;
                                                        setPunchOutData({ ...punchOutData, parkings: newParkings });
                                                    }}
                                                    previewFile={pkg.photo}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setPunchOutData(p => ({ ...p, parkings: p.parkings.filter((_, i) => i !== idx) }))}
                                                    style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(244,63,94,0.08)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: '20px' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {(() => {
                                        const total = punchOutData.parkings.reduce((s, p) => s + (Number(p.amount) || 0), 0);
                                        if (total <= 0) return null;
                                        return (
                                            <div style={{ marginTop: '18px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: '8px' }}>
                                                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: '800' }}>TOTAL PARKING:</span>
                                                <span style={{ color: 'var(--primary)', fontSize: '16px', fontWeight: '900' }}>₹{total.toLocaleString()}</span>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Others section */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <Field label="T/A (₹)" type="text" inputMode="decimal" value={punchOutData.allowanceTA} onChange={v => {
                                        const cleaned = v.replace(/[^0-9.]/g, '');
                                        setPunchOutData({ ...punchOutData, allowanceTA: cleaned });
                                    }} />
                                    <Field label="Night Stay (₹)" type="text" inputMode="decimal" value={punchOutData.nightStayAmount} onChange={v => {
                                        const cleaned = v.replace(/[^0-9.]/g, '');
                                        setPunchOutData({ ...punchOutData, nightStayAmount: cleaned });
                                    }} />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <Field label="Daily Wage Override" type="text" inputMode="decimal" value={punchOutData.dailyWage} onChange={v => {
                                        const cleaned = v.replace(/[^0-9.]/g, '');
                                        setPunchOutData({ ...punchOutData, dailyWage: cleaned });
                                    }} placeholder={activeRecord?.dailyWage || '0'} />
                                    <Field label="Duty Remarks/Notes" value={punchOutData.review} onChange={v => setPunchOutData({ ...punchOutData, review: v })} />
                                </div>

                                {/* Submit button */}
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        height: '60px', background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                                        border: 'none', borderRadius: '18px', color: 'white',
                                        fontSize: '15px', fontWeight: '900', textTransform: 'uppercase',
                                        letterSpacing: '1px', cursor: submitting ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 12px 28px -8px rgba(244,63,94,0.5)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                        transition: 'all 0.3s', marginTop: '10px'
                                    }}
                                >
                                    {submitting ? <div className="spinner" style={{ width: '24px', height: '24px', borderTopColor: 'white' }}></div> : <><LogOut size={18} /> COMPLETE DUTY</>}
                                </button>
                            </form>
                        </div>
                    </div>
                );
            })()}

                {/* Enhanced Advance Payment Modal */}
                {
                    showAdvanceModal && (
                        <Modal title="Financial Disbursement" onClose={() => setShowAdvanceModal(false)}>
                            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                                <div style={{
                                    width: '70px', height: '70px', borderRadius: '24px', background: 'rgba(16, 185, 129, 0.1)',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 15px',
                                    border: '1px solid rgba(16, 185, 129, 0.2)'
                                }}>
                                    <Download size={32} style={{ color: '#10b981', transform: 'rotate(180deg)' }} />
                                </div>
                                <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '900', margin: '0 0 5px 0' }}>Disburse Advance</h3>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Processing payment for <span style={{ color: 'var(--primary)', fontWeight: '800' }}>{selectedDriver?.name?.split(' (F)')[0]}</span></p>
                            </div>

                            <form onSubmit={handleAddAdvance} style={{ display: 'grid', gap: '25px' }}>
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Payment Amount (₹) *</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontSize: '20px', fontWeight: '900' }}>₹</span>
                                        <input
                                            type="number"
                                            className="input-field"
                                            required
                                            value={advanceData.amount}
                                            onChange={v => setAdvanceData({ ...advanceData, amount: v.target.value })}
                                            placeholder="0.00"
                                            style={{
                                                paddingLeft: '45px', fontSize: '24px', fontWeight: '900', height: '70px',
                                                background: 'rgba(5, 8, 15, 0.4)', border: '1px solid rgba(255,255,255,0.1)',
                                                color: 'white', borderRadius: '20px'
                                            }}
                                        />
                                    </div>

                                    {/* Quick Amounts */}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                                        {[500, 1000, 2000, 5000].map(amt => (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => setAdvanceData({ ...advanceData, amount: amt.toString() })}
                                                style={{
                                                    flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)',
                                                    background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.6)',
                                                    fontSize: '11px', fontWeight: '900', cursor: 'pointer', transition: 'all 0.3s'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.border = '1px solid rgba(16, 185, 129, 0.3)'}
                                                onMouseLeave={e => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.05)'}
                                            >
                                                +₹{amt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                                    <Field label="Value Date *" type="date" value={advanceData.date} onChange={v => setAdvanceData({ ...advanceData, date: v })} required />
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '15px' }}>Classification</p>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {['Office', 'Staff'].map(type => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setAdvanceData({ ...advanceData, advanceType: type })}
                                                style={{
                                                    flex: 1, padding: '12px', borderRadius: '14px',
                                                    background: advanceData.advanceType === type ? 'rgba(99, 102, 241, 0.15)' : 'rgba(5, 8, 15, 0.3)',
                                                    color: advanceData.advanceType === type ? '#818cf8' : 'rgba(255,255,255,0.3)',
                                                    fontWeight: '900', fontSize: '12px', cursor: 'pointer',
                                                    border: advanceData.advanceType === type ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255,255,255,0.02)'
                                                }}
                                            >
                                                {type.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <Field label="Transaction Reference / Remark" placeholder="e.g. Fuel Advance, Emergency..." value={advanceData.remark} onChange={v => setAdvanceData({ ...advanceData, remark: v })} />

                                <SubmitButton disabled={submitting} text="DISBURSE FUNDS" message={message} />
                            </form>
                        </Modal>
                    )
                }

                {/* Document Modal */}
                {
                    showDocumentModal && (
                        <Modal title={`Documents: ${selectedDriver?.name}`} onClose={() => setShowDocumentModal(false)}>
                            <div style={{ display: 'grid', gap: '25px' }}>
                                {selectedDriver?.documents?.map((doc, i) => (
                                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                        <div>
                                            <p style={{ color: 'white', fontWeight: '700', margin: 0 }}>{doc.documentType}</p>
                                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', margin: 0 }}>{doc.expiryDate ? `Expires: ${new Date(doc.expiryDate).toLocaleDateString()}` : 'Lifetime'}</p>
                                        </div>
                                        <a href={doc.imageUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: '800' }}>VIEW</a>
                                    </div>
                                ))}
                                <form onSubmit={handleUploadDocument} style={{ display: 'grid', gap: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <Field label="Type" value={documentForm.documentType} onChange={v => setDocumentForm({ ...documentForm, documentType: v })} />
                                        <Field label="Expiry" type="date" value={documentForm.expiryDate} onChange={v => setDocumentForm({ ...documentForm, expiryDate: v })} />
                                    </div>
                                    <input type="file" onChange={e => setDocumentFile(e.target.files[0])} className="input-field" style={{ height: '48px', paddingTop: '10px' }} />
                                    <SubmitButton disabled={submitting} text="Upload" message={message} />
                                </form>
                            </div>
                        </Modal>
                    )
                }

                {showEditDutyModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5, 8, 15, 0.9)', zIndex: 12000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', backdropFilter: 'blur(12px)' }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="premium-glass"
                            style={{ width: '100%', maxWidth: '650px', maxHeight: '95vh', overflowY: 'auto', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            {/* Header Section */}
                            <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)', padding: '25px 35px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ width: '45px', height: '45px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Edit2 size={20} color="#818cf8" />
                                    </div>
                                    <div>
                                        <h2 style={{ color: 'white', fontSize: '22px', margin: 0, fontWeight: '900', letterSpacing: '-0.5px' }}>Edit Duty Record</h2>
                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>FOR {drivers.find(d => d._id === editDutyForm.driverId)?.name?.split(' (F)')[0]}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowEditDutyModal(false)} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', height: '40px', width: '40px', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
                            </div>

                            <form onSubmit={handleUpdateDuty} style={{ padding: '35px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px' }}>
                                    <Field label="Duty Date *" type="date" value={editDutyForm.date} onChange={v => setEditDutyForm({ ...editDutyForm, date: v })} required />
                                    <div>
                                        <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>
                                            {editingDuty?.entryType === 'voucher' || editingDuty?.isOutsideCar ? 'Vehicle Plate (Outside) *' : 'Assigned Fleet *'}
                                        </label>
                                        {(editingDuty?.entryType === 'voucher' || editingDuty?.isOutsideCar) ? (
                                            <input
                                                type="text"
                                                className="input-field"
                                                value={editDutyForm.vehicleNumber}
                                                onChange={e => setEditDutyForm({ ...editDutyForm, vehicleNumber: e.target.value })}
                                                placeholder="e.g. DL1CA1234"
                                                required
                                                style={{ width: '100%', height: '52px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', color: 'white', padding: '0 15px', fontSize: '15px' }}
                                            />
                                        ) : (
                                            <select
                                                className="input-field"
                                                required
                                                value={editDutyForm.vehicleId}
                                                onChange={e => setEditDutyForm({ ...editDutyForm, vehicleId: e.target.value })}
                                                style={{ width: '100%', height: '52px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', color: 'white', padding: '0 15px' }}
                                            >
                                                {vehicles.map(v => <option key={v._id} value={v._id} style={{ background: '#0f172a' }}>{v.carNumber?.split('#')[0]} ({v.model})</option>)}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                {/* Financials & Rates */}
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                        <IndianRupee size={14} color="#10b981" />
                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }}>Financial Adjustments</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                                        <Field label="Daily Wage (₹)" type="number" value={editDutyForm.dailyWage} onChange={v => setEditDutyForm({ ...editDutyForm, dailyWage: v })} />
                                        <Field label="Parking (₹)" type="number" value={editDutyForm.parkingAmount} onChange={v => setEditDutyForm({ ...editDutyForm, parkingAmount: v })} />
                                        <Field label="T/A Allowance" type="number" value={editDutyForm.allowanceTA} onChange={v => setEditDutyForm({ ...editDutyForm, allowanceTA: v })} />
                                        <Field label="Night Stay (₹)" type="number" value={editDutyForm.nightStayAmount} onChange={v => setEditDutyForm({ ...editDutyForm, nightStayAmount: v })} />
                                    </div>
                                </div>

                                {/* Logistics Row */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px' }}>
                                    <div style={{ display: 'grid', gap: '15px' }}>
                                        <Field label="Starting KM" type="number" value={editDutyForm.startKm} onChange={v => setEditDutyForm({ ...editDutyForm, startKm: v })} />
                                        <Field label="Closing KM" type="number" value={editDutyForm.endKm} onChange={v => setEditDutyForm({ ...editDutyForm, endKm: v })} />
                                    </div>
                                    <div style={{ display: 'grid', gap: '15px' }}>
                                        <Field label="Punch-In Time" type="datetime-local" value={editDutyForm.punchInTime} onChange={v => setEditDutyForm({ ...editDutyForm, punchInTime: v })} />
                                        <Field label="Punch-Out Time" type="datetime-local" value={editDutyForm.punchOutTime} onChange={v => setEditDutyForm({ ...editDutyForm, punchOutTime: v })} />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <Field label="Pickup Location" value={editDutyForm.pickUpLocation} onChange={v => setEditDutyForm({ ...editDutyForm, pickUpLocation: v })} />
                                    <Field label="Drop Location" value={editDutyForm.dropLocation} onChange={v => setEditDutyForm({ ...editDutyForm, dropLocation: v })} />
                                </div>

                                <Field label="Notes / Remarks" placeholder="Add any trip notes here..." value={editDutyForm.remarks} onChange={v => setEditDutyForm({ ...editDutyForm, remarks: v })} />

                                <div style={{ marginTop: '10px' }}>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        style={{
                                            width: '100%', height: '60px', borderRadius: '18px',
                                            background: 'linear-gradient(135deg, var(--primary), #4f46e5)',
                                            color: 'white', fontSize: '16px', fontWeight: '900',
                                            border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                            boxShadow: '0 10px 30px -10px rgba(79, 70, 229, 0.5)',
                                            textTransform: 'uppercase', letterSpacing: '1px'
                                        }}
                                    >
                                        {submitting ? 'Updating...' : <><Save size={18} /> Update Record</>}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                <AnimatePresence>
                    {selectedItem && (
                        <AttendanceModal
                            item={selectedItem}
                            onClose={() => setSelectedItem(null)}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showQuickExpenseModal && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5, 8, 15, 0.9)', zIndex: 11000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', backdropFilter: 'blur(12px)' }}>
                            <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 50, opacity: 0 }}
                                className="premium-glass"
                                style={{ width: '100%', maxWidth: '600px', padding: '35px', maxHeight: '95vh', overflowY: 'auto', borderRadius: '32px' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                    <div>
                                        <h2 style={{ color: 'white', fontSize: '24px', margin: 0, fontWeight: '900', letterSpacing: '-0.5px' }}>
                                            Add {quickExpenseType === 'fuel' ? 'Fuel' : 'Parking'}
                                        </h2>
                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: '800', marginTop: '4px', textTransform: 'uppercase' }}>
                                            FOR {selectedDriver?.name.split(' (F)')[0]}
                                        </p>
                                    </div>
                                    <button onClick={() => setShowQuickExpenseModal(false)} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', height: '40px', width: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
                                </div>

                                <form onSubmit={handleQuickExpenseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {quickExpenseType === 'fuel' ? (
                                        <>
                                            <motion.div
                                                className="livefeed-cards-grid"
                                                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 350px), 1fr))', gap: '20px' }}
                                            >
                                                <div>
                                                    <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Vehicle Number *</label>
                                                    <select
                                                        className="input-field"
                                                        value={quickExpenseData.vehicleId}
                                                        required
                                                        onChange={(e) => setQuickExpenseData({ ...quickExpenseData, vehicleId: e.target.value })}
                                                        style={{ width: '100%', height: '52px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', color: 'white', padding: '0 15px' }}
                                                    >
                                                        <option value="" style={{ background: '#0f172a' }}>-- Select Car --</option>
                                                        {vehicles.map(v => <option key={v._id} value={v._id} style={{ background: '#0f172a' }}>{v.carNumber} ({v.model})</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Fuel Type</label>
                                                    <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '5px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', height: '52px' }}>
                                                        {['Diesel', 'Petrol', 'CNG'].map((t) => (
                                                            <button
                                                                key={t}
                                                                type="button"
                                                                onClick={() => setQuickExpenseData({ ...quickExpenseData, fuelType: t })}
                                                                style={{
                                                                    flex: 1,
                                                                    border: 'none',
                                                                    borderRadius: '10px',
                                                                    fontSize: '12px',
                                                                    fontWeight: '800',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.3s',
                                                                    background: quickExpenseData.fuelType === t ? 'linear-gradient(135deg, var(--primary) 0%, #d97706 100%)' : 'transparent',
                                                                    color: quickExpenseData.fuelType === t ? 'white' : 'rgba(255,255,255,0.4)',
                                                                    boxShadow: quickExpenseData.fuelType === t ? '0 4px 12px rgba(245, 158, 11, 0.2)' : 'none'
                                                                }}
                                                            >
                                                                {t}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                                <Field label="Amount (₹) *" value={quickExpenseData.amount} onChange={v => setQuickExpenseData({ ...quickExpenseData, amount: v })} type="number" required placeholder="e.g. 5000" />
                                                <Field label="Volume (L) *" value={quickExpenseData.quantity} onChange={v => setQuickExpenseData({ ...quickExpenseData, quantity: v })} type="number" required placeholder="e.g. 50" />
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                                <Field label="Rate (₹/Volume)" value={quickExpenseData.rate} onChange={v => setQuickExpenseData({ ...quickExpenseData, rate: v })} placeholder="Auto-calculated" readOnly />
                                                <Field label="Date *" value={quickExpenseData.date} onChange={v => setQuickExpenseData({ ...quickExpenseData, date: v })} type="date" required />
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                                <Field label="Odometer (KM) *" value={quickExpenseData.odometer} onChange={v => setQuickExpenseData({ ...quickExpenseData, odometer: v })} type="number" required placeholder="Current Reading" />
                                                <div>
                                                    <label style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Payment Source</label>
                                                    <select
                                                        className="input-field"
                                                        value={quickExpenseData.paymentSource}
                                                        onChange={(e) => setQuickExpenseData({ ...quickExpenseData, paymentSource: e.target.value })}
                                                        style={{ width: '100%', height: '52px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', color: 'white', padding: '0 15px' }}
                                                    >
                                                        <option value="Office" style={{ background: '#0f172a' }}>Office</option>
                                                        <option value="Guest" style={{ background: '#0f172a' }}>Guest</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <Field label="Fuel Station Name" value={quickExpenseData.stationName} onChange={v => setQuickExpenseData({ ...quickExpenseData, stationName: v })} placeholder="e.g. HP Petrol Pump" />
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                                <Field label="Amount (₹) *" value={quickExpenseData.amount} onChange={v => setQuickExpenseData({ ...quickExpenseData, amount: v })} type="number" required />
                                                <Field label="Date *" value={quickExpenseData.date} onChange={v => setQuickExpenseData({ ...quickExpenseData, date: v })} type="date" required />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <label style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Vehicle *</label>
                                                <select
                                                    className="input-field"
                                                    required
                                                    value={quickExpenseData.vehicleId}
                                                    onChange={e => setQuickExpenseData({ ...quickExpenseData, vehicleId: e.target.value })}
                                                    style={{ height: '52px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '0 15px', color: 'white' }}
                                                >
                                                    <option value="" style={{ background: '#0f172a' }}>Select Vehicle</option>
                                                    {vehicles.map(v => <option key={v._id} value={v._id} style={{ background: '#0f172a' }}>{v.carNumber}</option>)}
                                                </select>
                                            </div>
                                            <Field label="Location" value={quickExpenseData.location} onChange={v => setQuickExpenseData({ ...quickExpenseData, location: v })} placeholder="Enter location" />
                                        </>
                                    )}

                                    <Field label="Remarks" value={quickExpenseData.remark} onChange={v => setQuickExpenseData({ ...quickExpenseData, remark: v })} placeholder="Optional remarks" />

                                    <div style={{ padding: '25px', background: 'rgba(255,255,255,0.01)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '15px' }}>
                                            {quickExpenseType === 'fuel' ? 'FUEL SLIP / RECEIPT PHOTO' : 'PARKING RECEIPT PHOTO'}
                                        </p>
                                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                            {quickExpenseData.slipPhoto ? (
                                                <div style={{ position: 'relative' }}>
                                                    <img src={URL.createObjectURL(quickExpenseData.slipPhoto)} alt="Slip" style={{ width: '100px', height: '100px', borderRadius: '16px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} />
                                                    <button type="button" onClick={() => setQuickExpenseData({ ...quickExpenseData, slipPhoto: '' })} style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#f43f5e', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>×</button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '15px' }}>
                                                    <label style={{ width: '90px', height: '90px', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', transition: 'all 0.3s' }}>
                                                        <Camera size={24} color="rgba(255,255,255,0.2)" />
                                                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', marginTop: '8px' }}>CAMERA</span>
                                                        <input type="file" hidden accept="image/*" capture="environment" onChange={e => { if (e.target.files[0]) setQuickExpenseData({ ...quickExpenseData, slipPhoto: e.target.files[0] }) }} />
                                                    </label>
                                                    <label style={{ width: '90px', height: '90px', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', transition: 'all 0.3s' }}>
                                                        <Plus size={24} color="rgba(255,255,255,0.2)" />
                                                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', marginTop: '8px' }}>UPLOAD</span>
                                                        <input type="file" hidden accept="image/*" onChange={e => { if (e.target.files[0]) setQuickExpenseData({ ...quickExpenseData, slipPhoto: e.target.files[0] }) }} />
                                                    </label>
                                                </div>
                                            )}
                                            <div style={{ flex: 1 }}>
                                                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: 0, fontWeight: '600', lineHeight: '1.4' }}>
                                                    Snap a photo or upload fuel bill.<br />
                                                    <span style={{ fontSize: '10px' }}>Max size: 5MB (JPG, PNG)</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <SubmitButton disabled={submitting} text={`SAVE ${quickExpenseType.toUpperCase()} ENTRY`} message={message} />
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .hide-mobile {
                        display: none !important;
                    }
                    .show-mobile {
                        display: grid !important; /* or block, flex, etc., depending on desired layout */
                    }
                    .settlement-row-header {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        text-align: left !important;
                    }
                    .settlement-stats-grid {
                        width: 100% !important;
                        justify-content: space-between !important;
                        gap: 15px !important;
                        margin: 10px 0 !important;
                        padding: 15px 0 !important;
                        border-top: 1px solid rgba(255,255,255,0.05) !important;
                        border-bottom: 1px solid rgba(255,255,255,0.05) !important;
                    }
                    .settlement-stats-grid > div {
                        flex: 1 !important;
                        text-align: left !important;
                    }
                    .header-actions {
                        width: 100% !important;
                        justify-content: space-between !important;
                        margin-top: 15px !important;
                    }
                    .header-actions > div {
                        flex: 1 !important;
                    }
                    .mobile-stack {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                    }
                }
                .premium-row:hover {
                    background: rgba(30, 41, 59, 0.7) !important;
                    border-color: rgba(99, 102, 241, 0.2) !important;
                    transform: translateY(-2px);
                    box-shadow: 0 12px 30px rgba(0,0,0,0.3);
                }
                .premium-row {
                    transition: all 0.3s ease !important;
                }
            `}</style>
        </div>
    );
};

export default Freelancers;
